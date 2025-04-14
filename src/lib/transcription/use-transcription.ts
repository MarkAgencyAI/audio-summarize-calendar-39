
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
    // Asegurarnos de que las opciones son válidas
    const safeOptions: Partial<TranscriptionOptions> = options ? {
      ...options,
      // Asegurar que maxChunkDuration tiene un valor razonable
      maxChunkDuration: options.maxChunkDuration && options.maxChunkDuration <= 300
        ? options.maxChunkDuration
        : 60,
      // Asegurar que speakerMode es del tipo correcto
      speakerMode: (options.speakerMode === 'single' || options.speakerMode === 'multiple') 
        ? options.speakerMode 
        : 'single'
    } : { maxChunkDuration: 60, speakerMode: 'single' as const };
    
    transcriptionServiceRef.current = new TranscriptionService(safeOptions);
    
    return () => {
      // Limpiar recursos si es necesario
      transcriptionServiceRef.current = null;
    };
  }, [options]);
  
  /**
   * Transcribe un archivo de audio
   */
  const transcribeAudio = React.useCallback(async (audioBlob: Blob): Promise<TranscriptionResult> => {
    if (!audioBlob) {
      toast.error("No se proporcionó un archivo de audio válido");
      return { 
        transcript: "", 
        errors: ["No se proporcionó un archivo de audio válido"],
        duration: 0,
        segmentCount: 0,
        processingTime: 0
      };
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
        // Mostrar toast para errores importantes
        if (result.errors.length > 2) {
          toast.warning(`Se completó con ${result.errors.length} errores en algunas partes`);
        } else {
          // Mostrar solo los primeros errores específicos
          result.errors.slice(0, 2).forEach(err => {
            toast.error(err);
          });
        }
      }
      
      // Notificar que terminó la transcripción
      const completeEvent = new CustomEvent('audioRecorderMessage', {
        detail: {
          type: 'transcriptionComplete',
          data: { 
            output: result.transcript, 
            progress: 100,
            webhookResponse: result.webhookResponse,
            errors: result.errors,
            processingStats: {
              duration: result.duration,
              segmentCount: result.segmentCount,
              processingTime: result.processingTime
            }
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
      
      // Return a properly formatted TranscriptionResult even in case of error
      return {
        transcript: "",
        duration: 0,
        segmentCount: 0,
        processingTime: 0,
        errors: [errorMessage]
      };
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
