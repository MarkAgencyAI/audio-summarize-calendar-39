
// Este archivo proporciona compatibilidad con código antiguo que use las funciones anteriores
import { processAudio } from './transcription';
import { WEBHOOK, TRANSCRIPTION_CONFIG } from './api-config';

export async function processAudioForTranscription(
  audioBlob: Blob,
  subject?: string,
  onTranscriptionProgress?: (data: any) => void,
  speakerMode: 'single' | 'multiple' = 'single'
) {
  // Utiliza la nueva implementación modularizada con configuración centralizada
  return processAudio(
    audioBlob, 
    {
      subject,
      speakerMode,
      maxChunkDuration: TRANSCRIPTION_CONFIG.MAX_CHUNK_DURATION,
      webhookUrl: WEBHOOK.URL
    },
    onTranscriptionProgress
  );
}
