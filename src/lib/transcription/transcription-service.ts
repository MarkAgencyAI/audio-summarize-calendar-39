
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

      // Get audio duration and split into chunks
      this.totalDuration = await getAudioDuration(audioBlob);
      console.log(`Duración total del audio: ${this.totalDuration}s`);

      // Split into chunks for processing
      this.chunks = await splitAudioIntoChunks(audioBlob, this.options.maxChunkDuration);
      console.log(`Audio dividido en ${this.chunks.length} segmentos`);

      // Process each chunk
      const results = [];
      let progress = 0;
      let combinedTranscript = '';
      const errors: string[] = [];
      const webhookResponses = [];

      for (let i = 0; i < this.chunks.length; i++) {
        const chunk = this.chunks[i];
        
        try {
          // Update progress at start of chunk processing
          if (onProgress) {
            progress = ((i / this.chunks.length) * 100);
            onProgress({
              output: `Transcribiendo segmento ${i + 1} de ${this.chunks.length}...`,
              progress: progress
            });
          }

          // Compress audio if enabled
          let processedBlob = chunk.blob;
          if (this.options.compressAudio) {
            processedBlob = await compressAudioBlob(chunk.blob);
          }

          // Use GROQ API for transcription
          const transcriptionResult = await groqTranscribeAudio(
            processedBlob, 
            this.options.subject, 
            this.options.speakerMode
          );

          if (!transcriptionResult.transcript) {
            throw new Error(`No se obtuvo transcripción del segmento ${i + 1}`);
          }

          const chunkText = transcriptionResult.transcript;
          combinedTranscript += chunkText + ' ';
          
          // Send chunk to webhook for processing if URL is provided
          let webhookResponse = null;
          if (this.options.webhookUrl) {
            try {
              webhookResponse = await sendToWebhook(this.options.webhookUrl, {
                transcript: chunkText,
                language: "es",
                subject: this.options.subject || "No especificado",
                speakerMode: this.options.speakerMode,
                isChunk: true,
                chunkIndex: i,
                totalChunks: this.chunks.length,
                startTime: chunk.startTime,
                endTime: chunk.endTime
              });
              webhookResponses.push(webhookResponse);
            } catch (webhookError) {
              console.error(`Error enviando chunk ${i + 1} al webhook:`, webhookError);
            }
          }

          // Update progress and notify
          progress = ((i + 1) / this.chunks.length) * 100;
          if (onProgress) {
            onProgress({
              output: combinedTranscript.trim(),
              progress: progress
            });
          }

          // Store chunk results
          results.push({
            text: chunkText,
            startTime: chunk.startTime,
            endTime: chunk.endTime,
            webhookResponse
          });

          chunk.isProcessed = true;
          chunk.transcript = chunkText;

        } catch (error) {
          console.error(`Error procesando fragmento ${i + 1}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          chunk.error = errorMessage;
          errors.push(`Error en segmento ${i + 1}: ${errorMessage}`);
        }
      }

      // Process complete transcript with webhook if needed
      const processingTime = Date.now() - this.processingStartTime;
      let finalWebhookResponse = null;

      if (this.options.webhookUrl && combinedTranscript) {
        try {
          console.log("Enviando transcripción completa al webhook...");
          finalWebhookResponse = await sendToWebhook(this.options.webhookUrl, {
            transcript: combinedTranscript.trim(),
            language: "es",
            subject: this.options.subject || "No especificado",
            speakerMode: this.options.speakerMode,
            processed: true,
            totalDuration: this.totalDuration,
            processingTime,
            chunkResponses: webhookResponses
          });
        } catch (webhookError) {
          console.error("Error enviando transcripción completa al webhook:", webhookError);
        }
      }

      return {
        transcript: combinedTranscript.trim(),
        duration: this.totalDuration,
        segmentCount: this.chunks.length,
        processingTime,
        errors: errors.length > 0 ? errors : undefined,
        webhookResponse: finalWebhookResponse || webhookResponses[webhookResponses.length - 1]
      };

    } finally {
      this.isProcessing = false;
    }
  }
}

// Add a separate processAudio function that can be used directly
export async function processAudio(
  audioBlob: Blob, 
  options: Partial<TranscriptionOptions> = {},
  onProgress?: (progress: TranscriptionProgress) => void
): Promise<TranscriptionResult> {
  const service = new TranscriptionService(options);
  return service.processAudio(audioBlob, onProgress);
}
