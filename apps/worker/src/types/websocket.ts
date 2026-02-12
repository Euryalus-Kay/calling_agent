export interface SetupMessage {
  type: 'setup';
  sessionId: string;
  callSid: string;
  accountSid: string;
  from: string;
  to: string;
  direction: string;
  callStatus: string;
  customParameters?: Record<string, string>;
}

export interface PromptMessage {
  type: 'prompt';
  voicePrompt: string;
  lang: string;
  last: boolean;
}

export interface InterruptMessage {
  type: 'interrupt';
  utteranceUntilInterrupt: string;
  durationUntilInterruptMs: number;
}

export interface DtmfMessage {
  type: 'dtmf';
  digit: string;
}

export interface ErrorMessage {
  type: 'error';
  description: string;
}

export type ConversationRelayMessage =
  | SetupMessage
  | PromptMessage
  | InterruptMessage
  | DtmfMessage
  | ErrorMessage;

export interface TextResponse {
  type: 'text';
  token: string;
  last: boolean;
}

export interface EndResponse {
  type: 'end';
  handoffData?: string;
}
