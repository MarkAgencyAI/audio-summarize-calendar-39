
export interface AudioChunk {
  blob: Blob;
  startTime: number;
  endTime: number;
  isProcessed?: boolean;
  transcript?: string;
  error?: string;
}

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
  duration: number;
  segmentCount: number;
  processingTime: number;
  errors?: string[];
  webhookResponse?: any;
}
