
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
  // Añadir los campos faltantes que se utilizan en AudioRecorderV2
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
