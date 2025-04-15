
/**
 * Configuración centralizada para APIs
 * Este archivo proporciona una forma unificada de acceder a las configuraciones de las APIs
 */

// API de GROQ para transcripción
export const GROQ_API = {
  KEY: "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",
  TRANSCRIPTION_URL: "https://api.groq.com/openai/v1/audio/transcriptions",
  CHAT_URL: "https://api.groq.com/openai/v1/chat/completions",
  MODELS: {
    TRANSCRIPTION: "whisper-large-v3-turbo",
    CHAT: "llama3-70b-8192"
  }
};

// Webhook para procesar transcripciones
export const WEBHOOK = {
  URL: "https://sswebhookss.maettiai.tech/webhook/8e34aca2-3111-488c-8ee8-a0a2c63fc9e4"
};

// Configuración global de transcripción
export const TRANSCRIPTION_CONFIG = {
  MAX_CHUNK_DURATION: 60, // Duración máxima de segmento en segundos
  RETRY_ATTEMPTS: 2,      // Número de intentos de reintento para transcripciones fallidas
  COMPRESS_AUDIO: true,   // Si se debe comprimir el audio antes de enviarlo
  USE_TIME_MARKERS: true  // Si se deben incluir marcadores de tiempo en la transcripción
};
