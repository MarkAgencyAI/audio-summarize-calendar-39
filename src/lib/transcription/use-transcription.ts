
import React from 'react';
import { toast } from "sonner";
import { TranscriptionService } from './transcription-service';
import { TranscriptionOptions, TranscriptionResult } from './types';

/**
 * Hook personalizado para usar el servicio de transcripción en componentes de React
 */
export function useTranscription(options?: Partial<TranscriptionOptions>) {
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [transcript, setTranscript] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);
  
  // Referencia al servicio de transcripción
  const transcriptionServiceRef = React.useRef<TranscriptionService | null>(null);
  
  // Inicializar el servicio de transcripción
  React.useEffect(() => {
    // Asegurarnos de que maxChunkDuration no exceda los 7 minutos
    const safeOptions: Partial<TranscriptionOptions> = options ? {
      ...options,
      maxChunkDuration: options.maxChunkDuration && options.maxChunkDuration <= 420
        ? options.maxChunkDuration
        : 420,
      // Ensure speakerMode is explicitly typed as 'single' | 'multiple'
      speakerMode: (options.speakerMode === 'single' || options.speakerMode === 'multiple') 
        ? options.speakerMode 
        : 'single'
    } : { maxChunkDuration: 420, speakerMode: 'single' as const };
    
    transcriptionServiceRef.current = new TranscriptionService(safeOptions);
    
    return () => {
      // Limpiar recursos si es necesario
      transcriptionServiceRef.current = null;
    };
  }, [options]);
  
  /**
   * Transcribe un archivo de audio
   */
  const transcribeAudio = React.useCallback(async (audioBlob: Blob) => {
    if (!audioBlob) {
      toast.error("No se proporcionó un archivo de audio válido");
      return;
    }
    
    if (!transcriptionServiceRef.current) {
      transcriptionServiceRef.current = new TranscriptionService(options);
    }
    
    setIsTranscribing(true);
    setProgress(0);
    setError(null);
    setErrors([]);
    
    try {
      // Notificar que comienza la transcripción
      const startEvent = new CustomEvent('audioRecorderMessage', {
        detail: {
          type: 'transcriptionStarted',
          data: { output: "Iniciando transcripción...", progress: 0 }
        }
      });
      window.dispatchEvent(startEvent);
      
      console.log(`Iniciando transcripción de audio: ${(audioBlob.size / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`Tipo: ${audioBlob.type}`);
      
      // Procesar el audio
      const result = await transcriptionServiceRef.current.processAudio(audioBlob, (progressData) => {
        setProgress(progressData.progress);
        setTranscript(progressData.output);
        
        // Emitir evento para actualizar otros componentes
        const updateEvent = new CustomEvent('audioRecorderMessage', {
          detail: {
            type: 'transcriptionUpdate',
            data: progressData
          }
        });
        window.dispatchEvent(updateEvent);
      });
      
      // Guardar errores si los hay
      if (result.errors && result.errors.length > 0) {
        setErrors(result.errors);
        // Mostrar toast para cada error
        result.errors.forEach(err => {
          toast.error(err);
        });
      }
      
      // Notificar que terminó la transcripción
      const completeEvent = new CustomEvent('audioRecorderMessage', {
        detail: {
          type: 'transcriptionComplete',
          data: { 
            output: result.transcript, 
            progress: 100,
            webhookResponse: result.webhookResponse,
            errors: result.errors
          }
        }
      });
      window.dispatchEvent(completeEvent);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      
      // Notificar el error
      const errorEvent = new CustomEvent('audioRecorderMessage', {
        detail: {
          type: 'transcriptionError',
          data: { output: `Error: ${errorMessage}`, progress: 0 }
        }
      });
      window.dispatchEvent(errorEvent);
      
      throw err;
    } finally {
      setIsTranscribing(false);
    }
  }, [options]);
  
  return {
    transcribeAudio,
    isTranscribing,
    progress,
    transcript,
    error,
    errors
  };
}
