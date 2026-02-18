import type { FastifyInstance } from 'fastify';
import { ConversationManager } from '../services/conversation.js';
import { sessionStore } from '../services/session-store.js';
import { supabaseAdmin } from '../services/supabase.js';
import { callQueue } from '../services/queue.js';
import { extractAndSaveMemories } from '../services/memory-extractor.js';
import { releaseNumber } from '../services/call-manager.js';
import type { ConversationRelayMessage } from '../types/index.js';

// In-memory map of active call conversations (for user responses and hangup)
const activeConversations = new Map<string, { conversation: ConversationManager; socket: import('ws').WebSocket }>();

export function getActiveConversation(callId: string) {
  return activeConversations.get(callId);
}

export async function websocketRoute(fastify: FastifyInstance) {
  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (socket, request) => {
      const url = new URL(
        request.url,
        `https://${request.headers.host}`
      );
      const callId = url.searchParams.get('callId');

      let conversation: ConversationManager | null = null;
      let holdTimer: ReturnType<typeof setInterval> | null = null;
      let durationWarningTimer: ReturnType<typeof setTimeout> | null = null;
      let durationLimitTimer: ReturnType<typeof setTimeout> | null = null;

      // Call duration limits per tier (seconds)
      const TIER_DURATION_LIMITS: Record<string, number> = {
        free: 300,     // 5 min
        pro: 600,      // 10 min
        unlimited: 900, // 15 min
      };

      fastify.log.info(`WebSocket connected for call ${callId}`);

      async function logSystemEvent(eventType: string, content: string) {
        if (!callId) return;
        try {
          await supabaseAdmin.from('transcript_entries').insert({
            call_id: callId,
            speaker: 'system',
            content,
            event_type: eventType,
          });
        } catch (err) {
          fastify.log.error(`Failed to log system event: ${err}`);
        }
      }

      async function updateCallStatus(status: string, extra: Record<string, unknown> = {}) {
        if (!callId) return;
        try {
          await supabaseAdmin
            .from('calls')
            .update({ status, ...extra })
            .eq('id', callId);
        } catch (err) {
          fastify.log.error(`Failed to update call status: ${err}`);
        }
      }

      function startHoldTimer() {
        if (holdTimer) return;
        const holdStart = Date.now();
        holdTimer = setInterval(async () => {
          const elapsed = Math.round((Date.now() - holdStart) / 1000);
          await updateCallStatus('on_hold', {
            status_detail: `On hold for ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`,
          });
        }, 10000);
      }

      function stopHoldTimer() {
        if (holdTimer) {
          clearInterval(holdTimer);
          holdTimer = null;
        }
      }

      socket.on('message', async (data: Buffer) => {
        try {
          const message: ConversationRelayMessage = JSON.parse(
            data.toString()
          );

          switch (message.type) {
            case 'setup': {
              const callData = callId ? sessionStore.get(callId) : undefined;
              if (!callData || !callId) {
                fastify.log.error(`No session data for call ${callId}`);
                socket.send(
                  JSON.stringify({
                    type: 'text',
                    token:
                      'I apologize, there seems to be a technical issue. Goodbye.',
                    last: true,
                  })
                );
                setTimeout(() => {
                  socket.send(JSON.stringify({ type: 'end' }));
                }, 1500);
                return;
              }

              await supabaseAdmin
                .from('calls')
                .update({
                  twilio_call_sid: message.callSid,
                  status: 'in_progress',
                  started_at: new Date().toISOString(),
                  status_detail: 'Connected',
                })
                .eq('id', callId);

              conversation = new ConversationManager(callId, callData);
              activeConversations.set(callId, { conversation, socket });
              fastify.log.info(
                `Conversation initialized for call ${callId} to ${callData.businessName}`
              );

              // Log the welcome greeting as the first transcript entry
              // The greeting was spoken via TwiML welcomeGreeting before the WS connected
              const profile = callData.userProfile as Record<string, unknown>;
              const greetingUserName = String(profile?.full_name || '').trim();
              const greetingPurpose = callData.purpose || '';
              const shortPurpose = greetingPurpose.length > 80 ? greetingPurpose.slice(0, 77) + '...' : greetingPurpose;

              let greeting: string;
              if (greetingUserName && callData.businessName) {
                greeting = `Hi, is this ${callData.businessName}? Just so you know, this is not a real person. I am an AI assistant calling on behalf of ${greetingUserName}. ${greetingUserName} wanted to ask about ${shortPurpose}. Do you have a moment?`;
              } else if (greetingUserName) {
                greeting = `Hello. Just so you know, this is not a real person. I am an AI assistant calling on behalf of ${greetingUserName}. ${greetingUserName} wanted to ask about ${shortPurpose}. Do you have a moment?`;
              } else {
                greeting = `Hello. Just so you know, this is not a real person. I am an AI assistant calling about ${shortPurpose}. Do you have a moment?`;
              }

              await supabaseAdmin.from('transcript_entries').insert({
                call_id: callId,
                speaker: 'agent',
                content: greeting,
              });

              // Start call duration timer based on user's tier
              const tier = callData.accountTier || 'free';
              const maxDuration = TIER_DURATION_LIMITS[tier] || 300;

              // At 80% of limit: warn the AI to wrap up
              const warningAt = Math.floor(maxDuration * 0.8) * 1000;
              durationWarningTimer = setTimeout(() => {
                if (conversation) {
                  const minLeft = Math.ceil((maxDuration - maxDuration * 0.8) / 60);
                  conversation.injectSystemMessage(
                    `IMPORTANT: You have approximately ${minLeft} minute${minLeft !== 1 ? 's' : ''} left on this call due to the call duration limit. Please wrap up the conversation quickly and get any final information.`
                  );
                  fastify.log.info(`[Duration] Call ${callId}: wrap-up warning sent (${tier} tier, ${maxDuration}s limit)`);
                }
              }, warningAt);

              // At 100% of limit: force end the call
              durationLimitTimer = setTimeout(async () => {
                fastify.log.info(`[Duration] Call ${callId}: duration limit reached (${maxDuration}s, ${tier} tier). Ending call.`);
                await logSystemEvent('duration_limit', `Call duration limit reached (${Math.floor(maxDuration / 60)} min ${tier} tier limit)`);

                // Tell the AI to say goodbye
                socket.send(JSON.stringify({
                  type: 'text',
                  token: "I apologize, but I've reached the maximum call duration. Thank you for your time, goodbye!",
                  last: true,
                }));

                // End the call after a short delay for TTS
                setTimeout(() => {
                  try {
                    socket.send(JSON.stringify({ type: 'end' }));
                  } catch { /* socket may already be closed */ }
                }, 3000);
              }, maxDuration * 1000);

              break;
            }

            case 'prompt': {
              if (!conversation || !callId) return;

              // Store human utterance
              await supabaseAdmin.from('transcript_entries').insert({
                call_id: callId,
                speaker: 'human',
                content: message.voicePrompt,
              });

              // Get AI response
              const response = await conversation.respond(
                message.voicePrompt
              );

              // Process events from the response
              const events = conversation.getEvents();
              for (const event of events) {
                switch (event.type) {
                  case 'on_hold':
                    await updateCallStatus('on_hold', {
                      status_detail: 'Placed on hold by business',
                      hold_started_at: new Date().toISOString(),
                    });
                    await logSystemEvent('hold_start', 'Placed on hold');
                    startHoldTimer();
                    break;

                  case 'off_hold':
                    stopHoldTimer();
                    await updateCallStatus('in_progress', {
                      status_detail: 'Back from hold',
                      hold_started_at: null,
                    });
                    await logSystemEvent('hold_end', 'Hold ended');
                    break;

                  case 'transfer':
                    await updateCallStatus('transferred', {
                      status_detail: 'Being transferred',
                    });
                    await logSystemEvent('transfer', 'Call being transferred');
                    break;

                  case 'voicemail':
                    await updateCallStatus('voicemail', {
                      status_detail: 'Reached voicemail',
                    });
                    await logSystemEvent('voicemail', 'Reached voicemail');
                    break;

                  case 'dtmf':
                    socket.send(JSON.stringify({
                      type: 'dtmf',
                      digits: event.digit,
                    }));
                    await updateCallStatus('navigating_menu', {
                      status_detail: `Pressing ${event.digit}`,
                    });
                    await logSystemEvent('dtmf', `Pressed ${event.digit}`);
                    break;

                  case 'answer':
                    await logSystemEvent('answer_captured', `${event.question}: ${event.value}`);
                    break;

                  case 'retry_needed':
                    await logSystemEvent('retry_needed', `Retry needed: ${event.reason}`);
                    break;

                  case 'need_info':
                    await updateCallStatus('in_progress', {
                      status_detail: `Waiting for info: ${event.question}`,
                    });
                    await logSystemEvent('need_info', event.question);
                    // Insert a notification row so the web UI can display the question
                    await supabaseAdmin.from('transcript_entries').insert({
                      call_id: callId,
                      speaker: 'system',
                      content: event.question,
                      event_type: 'need_info',
                    });
                    break;
                }
              }

              // Store agent utterance
              await supabaseAdmin.from('transcript_entries').insert({
                call_id: callId,
                speaker: 'agent',
                content: response,
              });

              // Send response back for TTS
              socket.send(
                JSON.stringify({
                  type: 'text',
                  token: response,
                  last: true,
                })
              );

              // Check if conversation should end
              if (conversation.shouldEnd()) {
                const result = conversation.getResult();
                const transcript = conversation.getTranscript();
                await supabaseAdmin
                  .from('calls')
                  .update({
                    status: 'completed',
                    ended_at: new Date().toISOString(),
                    result: result.structured,
                    result_summary: result.summary,
                    status_detail: null,
                  })
                  .eq('id', callId);

                // Fire-and-forget: extract memories and save contacts from this call
                const sessionData = sessionStore.get(callId);
                if (sessionData) {
                  extractAndSaveMemories({
                    callId,
                    userId: sessionData.userId,
                    businessName: sessionData.businessName,
                    purpose: sessionData.purpose,
                    transcript,
                    userProfile: sessionData.userProfile,
                  }).catch((err) => fastify.log.error(`Memory extraction error: ${err}`));
                }

                // Check if retry was requested
                const retryReason = conversation.retryReason();
                if (retryReason && sessionData && (sessionData.retryCount || 0) < 2) {
                  const retryCount = (sessionData.retryCount || 0) + 1;
                  await supabaseAdmin
                    .from('calls')
                    .update({
                      status: 'retrying',
                      retry_count: retryCount,
                      status_detail: `Retrying: ${retryReason}`,
                    })
                    .eq('id', callId);

                  await callQueue.add('make-call', {
                    callId,
                    taskId: sessionData.taskId,
                    userId: sessionData.userId,
                    businessName: sessionData.businessName,
                    phoneNumber: '',
                    purpose: sessionData.purpose,
                    questions: sessionData.questions,
                    context: sessionData.context,
                    userProfile: sessionData.userProfile,
                    retryCount,
                    previousAttemptNotes: retryReason,
                  }, { delay: 5000 });
                }

                setTimeout(() => {
                  socket.send(JSON.stringify({ type: 'end' }));
                }, 2000);
              }
              break;
            }

            case 'interrupt': {
              if (conversation) {
                conversation.handleInterrupt(
                  message.utteranceUntilInterrupt
                );
              }
              break;
            }

            case 'dtmf': {
              fastify.log.info(`DTMF received: ${message.digit}`);
              await logSystemEvent('dtmf_received', `Received DTMF: ${message.digit}`);
              break;
            }

            case 'error': {
              fastify.log.error(
                `Call ${callId} error: ${message.description}`
              );
              if (callId) {
                await supabaseAdmin
                  .from('calls')
                  .update({
                    status: 'failed',
                    error: message.description,
                    ended_at: new Date().toISOString(),
                    status_detail: null,
                  })
                  .eq('id', callId);
              }
              break;
            }
          }
        } catch (err) {
          fastify.log.error(`WebSocket message error: ${err}`);
        }
      });

      socket.on('close', async () => {
        fastify.log.info(`WebSocket closed for call ${callId}`);
        stopHoldTimer();
        if (durationWarningTimer) { clearTimeout(durationWarningTimer); durationWarningTimer = null; }
        if (durationLimitTimer) { clearTimeout(durationLimitTimer); durationLimitTimer = null; }

        if (callId) {
          // Remove from active conversations
          activeConversations.delete(callId);
          // Release the phone number back to the pool
          releaseNumber(callId);

          const sessionData = sessionStore.get(callId);
          sessionStore.delete(callId);

          const { data: call } = await supabaseAdmin
            .from('calls')
            .select('status')
            .eq('id', callId)
            .single();

          if (call && ['in_progress', 'on_hold', 'transferred', 'navigating_menu'].includes(call.status)) {
            const result = conversation?.getResult();
            const transcript = conversation?.getTranscript() || '';
            await supabaseAdmin
              .from('calls')
              .update({
                status: 'completed',
                ended_at: new Date().toISOString(),
                result: result?.structured || null,
                result_summary:
                  result?.summary || 'Call ended unexpectedly',
                status_detail: null,
              })
              .eq('id', callId);

            // Fire-and-forget: extract memories from this call
            if (sessionData && transcript.length > 50) {
              extractAndSaveMemories({
                callId,
                userId: sessionData.userId,
                businessName: sessionData.businessName,
                purpose: sessionData.purpose,
                transcript,
                userProfile: sessionData.userProfile,
              }).catch((err) => fastify.log.error(`Memory extraction error (close): ${err}`));
            }

            // Auto-retry if disconnected while on hold
            if (sessionData && call.status === 'on_hold' && (sessionData.retryCount || 0) < 2) {
              const retryCount = (sessionData.retryCount || 0) + 1;
              await supabaseAdmin
                .from('calls')
                .update({
                  status: 'retrying',
                  retry_count: retryCount,
                  status_detail: 'Disconnected on hold, retrying...',
                })
                .eq('id', callId);

              await callQueue.add('make-call', {
                callId,
                taskId: sessionData.taskId,
                userId: sessionData.userId,
                businessName: sessionData.businessName,
                phoneNumber: '',
                purpose: sessionData.purpose,
                questions: sessionData.questions,
                context: sessionData.context,
                userProfile: sessionData.userProfile,
                retryCount,
                previousAttemptNotes: 'Previous call disconnected while on hold',
              }, { delay: 3000 });
            }
          }
        }
      });

      socket.on('error', (err) => {
        fastify.log.error(`WebSocket error for call ${callId}: ${err}`);
        stopHoldTimer();
        if (durationWarningTimer) { clearTimeout(durationWarningTimer); durationWarningTimer = null; }
        if (durationLimitTimer) { clearTimeout(durationLimitTimer); durationLimitTimer = null; }
      });
    });
  });
}
