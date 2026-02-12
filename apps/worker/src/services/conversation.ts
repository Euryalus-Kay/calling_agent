import Anthropic from '@anthropic-ai/sdk';
import { CALL_SYSTEM_PROMPT } from '../prompts/call-system.js';
import type { CallSessionData } from './session-store.js';

export type CallEvent =
  | { type: 'end_call' }
  | { type: 'transfer' }
  | { type: 'on_hold' }
  | { type: 'off_hold' }
  | { type: 'voicemail' }
  | { type: 'dtmf'; digit: string }
  | { type: 'retry_needed'; reason: string }
  | { type: 'answer'; question: string; value: string };

interface ConversationResult {
  structured: Record<string, unknown>;
  summary: string;
}

export class ConversationManager {
  private callId: string;
  private callData: CallSessionData;
  private messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  private anthropic: Anthropic;
  private _shouldEnd: boolean;
  private _transferring: boolean;
  private _onHold: boolean;
  private _isVoicemail: boolean;
  private _retryReason: string | null;
  private answeredQuestions: Map<string, string>;
  private _events: CallEvent[];

  constructor(callId: string, callData: CallSessionData) {
    this.callId = callId;
    this.callData = callData;
    this.messages = [];
    this.anthropic = new Anthropic();
    this._shouldEnd = false;
    this._transferring = false;
    this._onHold = false;
    this._isVoicemail = false;
    this._retryReason = null;
    this.answeredQuestions = new Map();
    this._events = [];
  }

  async respond(userSpeech: string): Promise<string> {
    this.messages.push({ role: 'user', content: userSpeech });
    this._events = [];

    const systemPrompt = this.buildSystemPrompt();

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: this.messages,
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    const { cleanText, shouldEnd, isTransfer, isOnHold, isOffHold, isVoicemail, retryReason, answers } =
      this.parseResponse(text);

    this._shouldEnd = shouldEnd;
    this._transferring = isTransfer;
    this._isVoicemail = isVoicemail;
    this._retryReason = retryReason;

    if (isOnHold) this._onHold = true;
    if (isOffHold) this._onHold = false;

    for (const [q, a] of Object.entries(answers)) {
      this.answeredQuestions.set(q, a);
    }

    this.messages.push({ role: 'assistant', content: cleanText });
    return cleanText;
  }

  shouldEnd(): boolean {
    return this._shouldEnd;
  }

  isTransferring(): boolean {
    return this._transferring;
  }

  isOnHold(): boolean {
    return this._onHold;
  }

  isVoicemail(): boolean {
    return this._isVoicemail;
  }

  retryReason(): string | null {
    return this._retryReason;
  }

  getEvents(): CallEvent[] {
    return this._events;
  }

  handleInterrupt(utteranceBeforeInterrupt: string): void {
    if (this.messages.length > 0) {
      const lastMsg = this.messages[this.messages.length - 1];
      if (lastMsg.role === 'assistant') {
        lastMsg.content = utteranceBeforeInterrupt;
      }
    }
  }

  getResult(): ConversationResult {
    return {
      structured: {
        business: this.callData.businessName,
        answers: Object.fromEntries(this.answeredQuestions),
        conversationLength: this.messages.length,
        wasTransferred: this._transferring,
        wasVoicemail: this._isVoicemail,
      },
      summary: this.generateSummary(),
    };
  }

  getTranscript(): string {
    return this.messages
      .map((m) => `${m.role === 'user' ? 'Business' : 'Agent'}: ${m.content}`)
      .join('\n');
  }

  private buildSystemPrompt(): string {
    const profile = this.callData.userProfile as Record<string, unknown>;
    const userName = String(profile?.full_name || 'a customer');
    const callbackNumber = String(profile?.phone_number || 'the number on file');

    const userInfoParts: string[] = [];
    if (profile?.full_name) userInfoParts.push(`Name: ${profile.full_name}`);
    if (profile?.phone_number) userInfoParts.push(`Callback number: ${profile.phone_number}`);
    if (profile?.insurance_provider) userInfoParts.push(`Insurance: ${profile.insurance_provider}`);
    if (profile?.insurance_member_id) userInfoParts.push(`Member ID: ${profile.insurance_member_id}`);
    if (profile?.address) {
      const addr = [profile.address, profile.city, profile.state, profile.zip_code].filter(Boolean).join(', ');
      userInfoParts.push(`Address: ${addr}`);
    }

    let prompt = CALL_SYSTEM_PROMPT
      .replace(/\{\{BUSINESS_NAME\}\}/g, this.callData.businessName)
      .replace('{{PURPOSE}}', this.callData.purpose)
      .replace(
        '{{QUESTIONS}}',
        this.callData.questions
          .map((q, i) => `${i + 1}. ${q}`)
          .join('\n')
      )
      .replace('{{CONTEXT}}', this.callData.context || 'None')
      .replace(/\{\{USER_NAME\}\}/g, userName)
      .replace(/\{\{CALLBACK_NUMBER\}\}/g, callbackNumber)
      .replace(
        '{{USER_INFO}}',
        userInfoParts.length > 0 ? userInfoParts.join('\n') : 'No additional info available.'
      );

    if (this.callData.previousAttemptNotes) {
      prompt += `\n\nPREVIOUS ATTEMPT NOTES: ${this.callData.previousAttemptNotes}`;
    }

    return prompt;
  }

  private parseResponse(text: string): {
    cleanText: string;
    shouldEnd: boolean;
    isTransfer: boolean;
    isOnHold: boolean;
    isOffHold: boolean;
    isVoicemail: boolean;
    dtmfDigits: string[];
    retryReason: string | null;
    answers: Record<string, string>;
  } {
    let shouldEnd = false;
    let isTransfer = false;
    let isOnHold = false;
    let isOffHold = false;
    let isVoicemail = false;
    let retryReason: string | null = null;
    const dtmfDigits: string[] = [];
    const answers: Record<string, string> = {};
    let cleanText = text;

    if (text.includes('[END_CALL]')) {
      shouldEnd = true;
      cleanText = cleanText.replace(/\[END_CALL\]/g, '').trim();
      this._events.push({ type: 'end_call' });
    }

    if (text.includes('[TRANSFER]')) {
      isTransfer = true;
      cleanText = cleanText.replace(/\[TRANSFER\]/g, '').trim();
      this._events.push({ type: 'transfer' });
    }

    if (text.includes('[ON_HOLD]')) {
      isOnHold = true;
      cleanText = cleanText.replace(/\[ON_HOLD\]/g, '').trim();
      this._events.push({ type: 'on_hold' });
    }

    if (text.includes('[OFF_HOLD]')) {
      isOffHold = true;
      cleanText = cleanText.replace(/\[OFF_HOLD\]/g, '').trim();
      this._events.push({ type: 'off_hold' });
    }

    if (text.includes('[VOICEMAIL]')) {
      isVoicemail = true;
      cleanText = cleanText.replace(/\[VOICEMAIL\]/g, '').trim();
      this._events.push({ type: 'voicemail' });
    }

    const dtmfRegex = /\[DTMF:([0-9*#]+)\]/g;
    let dtmfMatch;
    while ((dtmfMatch = dtmfRegex.exec(text)) !== null) {
      dtmfDigits.push(dtmfMatch[1]);
      cleanText = cleanText.replace(dtmfMatch[0], '').trim();
      this._events.push({ type: 'dtmf', digit: dtmfMatch[1] });
    }

    const retryMatch = text.match(/\[RETRY_NEEDED:(.+?)\]/);
    if (retryMatch) {
      retryReason = retryMatch[1];
      cleanText = cleanText.replace(retryMatch[0], '').trim();
      this._events.push({ type: 'retry_needed', reason: retryReason });
    }

    const answerRegex = /\[ANSWER:(.+?)=(.+?)\]/g;
    let match;
    while ((match = answerRegex.exec(text)) !== null) {
      answers[match[1]] = match[2];
      cleanText = cleanText.replace(match[0], '').trim();
      this._events.push({ type: 'answer', question: match[1], value: match[2] });
    }

    return { cleanText, shouldEnd, isTransfer, isOnHold, isOffHold, isVoicemail, dtmfDigits, retryReason, answers };
  }

  private generateSummary(): string {
    if (this._isVoicemail) {
      return `Called ${this.callData.businessName} — reached voicemail and left a message.`;
    }
    if (this.answeredQuestions.size === 0) {
      return `Called ${this.callData.businessName}. No specific answers were obtained.`;
    }
    const answerLines = Array.from(this.answeredQuestions.entries())
      .map(([q, a]) => `- ${q}: ${a}`)
      .join('\n');
    return `Called ${this.callData.businessName}.\n\nFindings:\n${answerLines}`;
  }
}
