
import { getAudioDuration, splitAudioIntoChunks, compressAudioBlob } from './audio-buffer-utils';
import type { TranscriptionOptions, TranscriptionProgress, TranscriptionResult, AudioChunk } from './types';

/**
 * Servicio de transcripción modularizado
 */
export class TranscriptionService {
  private options: TranscriptionOptions;
  private apiUrl = 'https://api.transcribe.io/v1/transcribe'; // Replace with your real API endpoint
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

      for (let i = 0; i < this.chunks.length; i++) {
        const chunk = this.chunks[i];
        
        try {
          // If compression is enabled, compress the audio
          let processedBlob = chunk.blob;
          if (this.options.compressAudio) {
            processedBlob = await compressAudioBlob(chunk.blob);
          }
          
          // In a real implementation, send to API and get response
          // For now, just simulate with placeholder
          const chunkText = `Transcripción del segmento ${i + 1}`;
          
          // Update current output and notify progress
          this.currentOutput += chunkText + ' ';
          progress = (i + 1) / this.chunks.length;
          
          if (onProgress) {
            onProgress({
              output: this.currentOutput,
              progress: progress * 100
            });
          }
          
          results.push({
            text: chunkText,
            startTime: chunk.startTime,
            endTime: chunk.endTime
          });
          
          // Mark chunk as processed
          chunk.isProcessed = true;
          chunk.transcript = chunkText;
        } catch (error) {
          console.error(`Error procesando fragmento ${i}:`, error);
          chunk.error = error instanceof Error ? error.message : 'Error desconocido';
          
          // Retry logic would go here in a real implementation
        }
      }

      // Final result
      const processingTime = Date.now() - this.processingStartTime;
      
      return {
        transcript: this.currentOutput.trim(),
        duration: this.totalDuration,
        segmentCount: this.chunks.length,
        processingTime,
        webhookResponse: null // En una implementación real, se obtendría del webhook
      };
    } finally {
      this.isProcessing = false;
    }
  }
}
