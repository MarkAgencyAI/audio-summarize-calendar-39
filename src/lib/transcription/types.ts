
export interface TranscriptionOptions {
  maxChunkDuration: number;
  speakerMode: 'single' | 'multiple';
  subject?: string;
  webhookUrl?: string;
  optimizeForVoice?: boolean;
  compressAudio?: boolean;
  useTimeMarkers?: boolean;
  retryAttempts?: number;
}

export interface TranscriptionProgress {
  output: string;
  progress: number;
}

export interface TranscriptionResult {
  transcript: string;
  duration?: number;
  segmentCount?: number;
  processingTime?: number;
  webhookResponse?: any;
  errors?: string[];
  // Added fields that are used in AudioRecorderV2
  summary?: string;
  keyPoints?: string[];
  language?: string;
  subject?: string;
  translation?: string;
  speakerMode?: 'single' | 'multiple';
  suggestedEvents?: Array<{
    title: string;
    description: string;
    date?: string;
  }>;
}

export interface AudioChunk {
  blob: Blob;
  startTime: number;
  endTime: number;
  isProcessed?: boolean;
  transcript?: string;
  error?: string;
}

export interface TranscriptionApiResponse {
  id: string;
  text: string;
  status: string;
  created_at: string;
  completed_at?: string;
  error?: string;
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
  words?: WordTiming[];
  speaker?: string;
}
