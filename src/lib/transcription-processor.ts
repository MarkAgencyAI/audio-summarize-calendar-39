
// Este archivo proporciona compatibilidad con código antiguo que use las funciones anteriores
import { processAudio } from './transcription';

export async function processAudioForTranscription(
  audioBlob: Blob,
  subject?: string,
  onTranscriptionProgress?: (data: any) => void,
  speakerMode: 'single' | 'multiple' = 'single'
) {
  // Utiliza la nueva implementación modularizada
  return processAudio(
    audioBlob, 
    {
      subject,
      speakerMode,
      maxChunkDuration: 60, // 1 minuto, más seguro para API
      webhookUrl: "https://sswebhookss.maettiai.tech/webhook/8e34aca2-3111-488c-8ee8-a0a2c63fc9e4"
    },
    onTranscriptionProgress  // Pass the callback directly as the third parameter
  );
}
