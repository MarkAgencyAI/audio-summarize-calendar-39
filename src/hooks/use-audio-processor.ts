
import { useState, useRef, useCallback } from "react";
import { transcribeAudio } from "@/lib/groq";
import { sendToWebhook } from "@/lib/webhook";
import { splitAudioFile } from "@/lib/audio-splitter";

export function useAudioProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const processingIntervalRef = useRef<number | null>(null);
  
  const setupAudioProcessing = useCallback((stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
    
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    dataArrayRef.current = dataArray;
    
    const source = audioContext.createMediaStreamSource(stream);
    streamSourceRef.current = source;
    source.connect(analyser);
    
    return {
      audioContext,
      analyser,
      dataArray,
      bufferLength
    };
  }, []);
  
  const processAudioStream = useCallback((
    onUpdate: (data: { 
      hasVoice: boolean; 
      noiseLevel: number;
      frequencyData: Uint8Array;
    }) => void
  ) => {
    if (!analyserRef.current || !dataArrayRef.current) return;
    
    processingIntervalRef.current = window.setInterval(() => {
      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;
      
      if (!analyser || !dataArray) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avgLevel = sum / dataArray.length;
      
      const voiceFreqStart = Math.floor(300 * dataArray.length / (analyser.context.sampleRate / 2));
      const voiceFreqEnd = Math.floor(3000 * dataArray.length / (analyser.context.sampleRate / 2));
      
      let voiceSum = 0;
      for (let i = voiceFreqStart; i < voiceFreqEnd; i++) {
        voiceSum += dataArray[i];
      }
      const voiceAvg = voiceSum / (voiceFreqEnd - voiceFreqStart);
      
      const hasVoice = voiceAvg > 20 && voiceAvg > avgLevel * 1.5;
      
      onUpdate({
        hasVoice,
        noiseLevel: avgLevel,
        frequencyData: new Uint8Array(dataArray)
      });
    }, 100);
    
    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
        processingIntervalRef.current = null;
      }
    };
  }, []);
  
  const cleanupAudioProcessing = useCallback(() => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
    
    if (streamSourceRef.current) {
      streamSourceRef.current.disconnect();
      streamSourceRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    dataArrayRef.current = null;
  }, []);
  
  const processAudioFile = async (
    audioBlob: Blob,
    subject?: string,
    onTranscriptionProgress?: (data: any) => void,
    speakerMode: 'single' | 'multiple' = 'single'
  ) => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      let progressInterval: number | null = null;
      if (onTranscriptionProgress) {
        progressInterval = window.setInterval(() => {
          setProgress((prev) => {
            const newProgress = Math.min(prev + 5, 90);
            
            if (newProgress > 10 && newProgress % 20 === 0) {
              onTranscriptionProgress({
                output: "Transcribiendo audio..."
              });
            }
            
            return newProgress;
          });
        }, 500);
      }

      // Get audio duration to check if we need to split
      const audioDuration = await getAudioDuration(audioBlob);
      const MAX_CHUNK_DURATION = 600; // 10 minutes in seconds
      
      let transcriptionResult;
      let fullTranscript = "";
      
      if (audioDuration > MAX_CHUNK_DURATION) {
        // Audio is longer than 10 minutes, split it
        if (onTranscriptionProgress) {
          onTranscriptionProgress({
            output: "El audio es largo, dividiendo en partes para procesarlo..."
          });
        }
        
        try {
          const audioChunks = await splitAudioFile(audioBlob);
          let totalChunks = audioChunks.length;
          
          if (onTranscriptionProgress) {
            onTranscriptionProgress({
              output: `Dividido en ${totalChunks} partes. Procesando cada parte...`
            });
          }
          
          // Process each chunk separately
          for (let i = 0; i < audioChunks.length; i++) {
            const chunk = audioChunks[i];
            
            if (onTranscriptionProgress) {
              onTranscriptionProgress({
                output: `Transcribiendo parte ${i + 1} de ${totalChunks}...`
              });
            }
            
            // Transcribe the current chunk
            const chunkResult = await transcribeAudio(chunk.blob, subject, speakerMode);
            
            // Add timestamp marker and append to full transcript
            const startMinutes = Math.floor(chunk.startTime / 60);
            const startSeconds = chunk.startTime % 60;
            
            if (i > 0) {
              fullTranscript += `\n\n[Continuación - ${startMinutes}:${startSeconds.toString().padStart(2, '0')}]\n`;
            }
            
            fullTranscript += chunkResult.transcript;
            
            // Update progress for this chunk
            setProgress(Math.min(50 + (i / totalChunks * 40), 90));
          }
          
          // Create a combined result object
          transcriptionResult = {
            transcript: fullTranscript,
            language: "es"
          };
          
        } catch (splitError) {
          console.error("Error splitting audio:", splitError);
          
          // Fallback to processing the entire file if splitting fails
          if (onTranscriptionProgress) {
            onTranscriptionProgress({
              output: "Error al dividir el audio. Intentando procesar completo (puede fallar)..."
            });
          }
          
          transcriptionResult = await transcribeAudio(audioBlob, subject, speakerMode);
        }
      } else {
        // Audio is short enough, process normally
        transcriptionResult = await transcribeAudio(audioBlob, subject, speakerMode);
      }
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      setProgress(95);
      
      // Prepare data for webhook
      const webhookData = {
        transcript: transcriptionResult.transcript,
        language: transcriptionResult.language || "es",
        subject: subject || "Sin materia",
        speakerMode: speakerMode,
        processed: true
      };
      
      // Notify that we're waiting for webhook
      if (onTranscriptionProgress) {
        onTranscriptionProgress({
          output: "Esperando respuesta del webhook..."
        });
      }
      
      try {
        // Send data to webhook - use the constant URL
        const WEBHOOK_URL = "https://sswebhookss.maettiai.tech/webhook/8e34aca2-3111-488c-8ee8-a0a2c63fc9e4";
        console.log("Iniciando envío a webhook");
        await sendToWebhook(WEBHOOK_URL, webhookData);
        console.log("Webhook completado correctamente");
      } catch (webhookError) {
        console.error("Error con el webhook pero continuando con el proceso:", webhookError);
        
        // If webhook fails, we'll still return the transcription
        if (onTranscriptionProgress) {
          onTranscriptionProgress({
            output: transcriptionResult.transcript + "\n\n(Error al procesar con el webhook)"
          });
        }
      }
      
      setProgress(100);
      
      // Return the Groq transcription result as a fallback
      return transcriptionResult;
    } catch (error) {
      console.error("Error processing audio:", error);
      
      // Notify about the error
      if (onTranscriptionProgress) {
        onTranscriptionProgress({
          output: "Error al procesar el audio: " + (error.message || "Error desconocido")
        });
      }
      
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to get audio duration
  const getAudioDuration = async (audioBlob: Blob): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(audioBlob);
      
      audio.onloadedmetadata = () => {
        const duration = Math.floor(audio.duration);
        URL.revokeObjectURL(audio.src);
        resolve(duration);
      };
      
      audio.onerror = (error) => {
        URL.revokeObjectURL(audio.src);
        reject(error);
      };
    });
  };
  
  return {
    isProcessing,
    progress,
    setupAudioProcessing,
    processAudioStream,
    processAudioFile,
    cleanupAudioProcessing
  };
}
