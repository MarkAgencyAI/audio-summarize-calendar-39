
import { getAudioDuration, splitAudioIntoChunks, compressAudioBlob } from './audio-buffer-utils';
import { sendToWebhook } from '../webhook';
import { transcribeAudio as groqTranscribeAudio } from '../groq';
import type { TranscriptionOptions, TranscriptionProgress, TranscriptionResult, AudioChunk } from './types';

/**
 * Servicio de transcripción modularizado
 */
export class TranscriptionService {
  private options: TranscriptionOptions;
  private apiUrl = 'https://api.groq.com/openai/v1/audio/transcriptions'; // API real de GROQ
  private chunks: AudioChunk[] = [];
  private currentOutput = '';
  private totalDuration = 0;
  private isProcessing = false;
  private processingStartTime = 0;

  constructor(options: Partial<TranscriptionOptions> = {}) {
    // Default options
    this.options = {
      maxChunkDuration: options.maxChunkDuration || 60,
      speakerMode: options.speakerMode || 'single',
      subject: options.subject,
      webhookUrl: options.webhookUrl,
      optimizeForVoice: options.optimizeForVoice !== false,
      compressAudio: options.compressAudio !== false,
      useTimeMarkers: options.useTimeMarkers !== false,
      retryAttempts: options.retryAttempts || 2
    };
  }

  /**
   * Procesa un blob de audio para transcripción
   */
  async processAudio(
    audioBlob: Blob,
    onProgress?: (progress: TranscriptionProgress) => void
  ): Promise<TranscriptionResult> {
    if (this.isProcessing) {
      throw new Error('Ya hay un proceso de transcripción en curso');
    }

    try {
      this.isProcessing = true;
      this.processingStartTime = Date.now();
      this.currentOutput = '';
      this.chunks = [];

      // Get audio duration
      this.totalDuration = await getAudioDuration(audioBlob);
      console.log(`Duración total del audio: ${this.totalDuration}s`);

      // Split into chunks if needed
      this.chunks = await splitAudioIntoChunks(audioBlob, this.options.maxChunkDuration);
      console.log(`Audio dividido en ${this.chunks.length} segmentos`);

      // Process each chunk
      const results = [];
      let progress = 0;
      let combinedTranscript = '';
      const errors: string[] = [];

      for (let i = 0; i < this.chunks.length; i++) {
        const chunk = this.chunks[i];
        
        try {
          // Utilizar la función de transcripción real de GROQ
          console.log(`Procesando segmento ${i + 1} de ${this.chunks.length}...`);
          
          // Actualizar el progreso al inicio del procesamiento del segmento
          if (onProgress) {
            progress = ((i / this.chunks.length) * 100);
            onProgress({
              output: `Transcribiendo segmento ${i + 1} de ${this.chunks.length}...`,
              progress: progress
            });
          }
          
          // Si compression is enabled, compress the audio
          let processedBlob = chunk.blob;
          if (this.options.compressAudio) {
            processedBlob = await compressAudioBlob(chunk.blob);
          }
          
          // Usar la API real de GROQ para transcribir
          const transcriptionResult = await groqTranscribeAudio(
            processedBlob, 
            this.options.subject, 
            this.options.speakerMode
          );
          
          if (!transcriptionResult.transcript) {
            throw new Error(`No se obtuvo transcripción del segmento ${i + 1}`);
          }
          
          const chunkText = transcriptionResult.transcript;
          
          // Update current output and notify progress
          combinedTranscript += chunkText + ' ';
          this.currentOutput = combinedTranscript;
          
          // Actualizar el progreso después de procesar el segmento
          progress = ((i + 1) / this.chunks.length) * 100;
          
          if (onProgress) {
            onProgress({
              output: this.currentOutput,
              progress: progress
            });
          }
          
          results.push({
            text: chunkText,
            startTime: chunk.startTime,
            endTime: chunk.endTime,
            webhookResponse: transcriptionResult.webhookResponse
          });
          
          // Mark chunk as processed
          chunk.isProcessed = true;
          chunk.transcript = chunkText;
        } catch (error) {
          console.error(`Error procesando fragmento ${i + 1}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          chunk.error = errorMessage;
          errors.push(`Error en segmento ${i + 1}: ${errorMessage}`);
          
          // Try to continue with other chunks
        }
      }

      // Final processing - get combined results
      const processingTime = Date.now() - this.processingStartTime;
      
      // Intentar enviar los resultados completos al webhook si no se ha hecho por segmento
      let webhookResponse = null;
      if (this.options.webhookUrl && combinedTranscript) {
        try {
          console.log("Enviando transcripción completa al webhook para procesamiento...");
          webhookResponse = await sendToWebhook(this.options.webhookUrl, {
            transcript: combinedTranscript.trim(),
            language: "es",
            subject: this.options.subject || "No especificado",
            speakerMode: this.options.speakerMode,
            processed: true,
            totalDuration: this.totalDuration,
            processingTime
          });
          console.log("Respuesta del webhook recibida:", webhookResponse);
        } catch (webhookError) {
          console.error("Error enviando datos al webhook:", webhookError);
        }
      }
      
      // Obtener la última respuesta del webhook si está disponible
      const lastWebhookResponse = results.length > 0 ? 
        results[results.length - 1].webhookResponse : webhookResponse;
      
      return {
        transcript: combinedTranscript.trim(),
        duration: this.totalDuration,
        segmentCount: this.chunks.length,
        processingTime,
        errors: errors.length > 0 ? errors : undefined,
        webhookResponse: webhookResponse || lastWebhookResponse
      };
    } finally {
      this.isProcessing = false;
    }
  }
}
