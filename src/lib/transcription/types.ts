
/**
 * Tipos para el módulo de transcripción
 */

/**
 * Opciones para el servicio de transcripción
 */
export interface TranscriptionOptions {
  maxChunkDuration: number;
  speakerMode: 'single' | 'multiple';
  subject?: string;
  webhookUrl?: string;
  
  // Opciones avanzadas
  optimizeForVoice?: boolean;   // Aplicar filtros optimizados para voz humana
  compressAudio?: boolean;      // Aplicar compresión adicional para reducir tamaño
  useTimeMarkers?: boolean;     // Incluir marcadores de tiempo en la transcripción
  retryAttempts?: number;       // Número de intentos en caso de error
}

/**
 * Información de progreso de la transcripción
 */
export interface TranscriptionProgress {
  output: string;
  progress: number;
}

/**
 * Resultado de la transcripción
 */
export interface TranscriptionResult {
  transcript: string;
  language?: string;
  webhookResponse?: any;
  errors?: string[];
  duration?: number;          // Duración total del audio procesado
  segmentCount?: number;      // Número de segmentos procesados
  processingTime?: number;    // Tiempo total de procesamiento en ms
  summary?: string;           // Resumen de la transcripción
  keyPoints?: string[];       // Puntos clave de la transcripción
  suggestedEvents?: Array<{   // Eventos sugeridos basados en la transcripción
    title: string;
    description: string;
    date?: string;
  }>;
}

/**
 * Segmento de audio
 */
export interface AudioChunk {
  blob: Blob;
  startTime: number;
  endTime: number;
  url: string;             // URL para acceder al segmento
  transcript?: string;     // Transcripción de este segmento particular
  isProcessed?: boolean;   // Indicador de si el segmento ya fue procesado
  error?: string;          // Error específico de este segmento
}

/**
 * Respuesta de la API de transcripción
 */
export interface TranscriptionApiResponse {
  text: string;            // Texto transcrito
  language?: string;       // Idioma detectado
  words?: WordTiming[];    // Información de timing por palabra
  segments?: Segment[];    // Información de segmentos
}

/**
 * Información de tiempo por palabra
 */
export interface WordTiming {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

/**
 * Información de segmentos de la transcripción
 */
export interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
}
