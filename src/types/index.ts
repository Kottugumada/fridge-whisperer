export type TranscriptResult = {
  transcript: string;
  confidence?: number;
  durationMs?: number;
};

export type VoiceSessionState = 'idle' | 'listening' | 'processing' | 'error';

export type RecipeSummary = {
  id: number;
  title: string;
  image?: string;
  description?: string;
};

