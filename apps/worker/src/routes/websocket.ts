import type { FastifyInstance } from 'fastify';
import { ConversationManager } from '../services/conversation.js';
import { sessionStore } from '../services/session-store.js';
import { supabaseAdmin } from '../services/supabase.js';
import { callQueue } from '../services/queue.js';
import { extractAndSaveMemories } from '../services/memory-extractor.js';
import { releaseNumber } from '../services/call-manager.js';
import type { ConversationRelayMessage } from '../types/index.js';

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
              fastify.log.info(
                `Conversation initialized for call ${callId} to ${callData.businessName}`
              );
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

        if (callId) {
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
      });
    });
  });
}
