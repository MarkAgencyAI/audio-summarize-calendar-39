import { useEffect, useRef, useState } from "react";
import { LiveTranscriptionSheet } from "./LiveTranscriptionSheet";
import { useRecordings } from "@/context/RecordingsContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mic, Square, Loader2, Upload, User, Users } from "lucide-react";
import { saveAudioToStorage } from "@/lib/storage";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { TranscriptionService } from "@/lib/transcription/transcription-service";
import { WEBHOOK, TRANSCRIPTION_CONFIG } from "@/lib/api-config";

interface AudioRecorderProps {
  onTranscriptionComplete?: (data: any) => void;
}

export function AudioRecorderV2({ onTranscriptionComplete }: AudioRecorderProps = {}) {
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingName, setRecordingName] = useState("");
  const recordingNameRef = useRef(recordingName);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [transcriptionOutput, setTranscriptionOutput] = useState<string | null>(null);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [finalDuration, setFinalDuration] = useState(0);
  const [webhookResponse, setWebhookResponse] = useState<any>(null);
  const { addRecording } = useRecordings();
  const { user } = useAuth();
  const [speakerMode, setSpeakerMode] = useState<"single" | "multiple">("single");
  const isProcessingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transcriptionServiceRef = useRef<TranscriptionService | null>(null);

  useEffect(() => {
    recordingNameRef.current = recordingName;
  }, [recordingName]);
  
  useEffect(() => {
    const resetRecording = () => {
      audioChunks.current = [];
      setTranscriptionOutput(null);
      setTranscriptionProgress(0);
      setIsTranscribing(false);
      setFinalDuration(0);
      setWebhookResponse(null);
      setRecordingId(null); // Reset recording ID to prevent duplicate saves
    };
    
    if (!isRecording) {
      resetRecording();
    }

    // Initialize transcription service when needed
    if (!transcriptionServiceRef.current) {
      transcriptionServiceRef.current = new TranscriptionService({
        speakerMode: speakerMode,
        maxChunkDuration: TRANSCRIPTION_CONFIG.MAX_CHUNK_DURATION,
        webhookUrl: WEBHOOK.URL
      });
    }
  }, [isRecording, speakerMode]);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const duration = await getBlobDuration(audioBlob);
        
        setFinalDuration(duration);
        setIsTranscribing(true);
        
        // Process audio and get transcription
        try {
          if (!transcriptionServiceRef.current) {
            transcriptionServiceRef.current = new TranscriptionService({
              speakerMode: speakerMode,
              maxChunkDuration: TRANSCRIPTION_CONFIG.MAX_CHUNK_DURATION,
              webhookUrl: WEBHOOK.URL
            });
          }

          // Process the audio using transcription service
          const result = await transcriptionServiceRef.current.processAudio(
            audioBlob,
            (progressData) => {
              setTranscriptionProgress(progressData.progress);
              setTranscriptionOutput(progressData.output);
            }
          );
          
          setTranscriptionOutput(result.transcript);
          setWebhookResponse(result.webhookResponse);
          
          // Notify parent component about transcription completion
          if (onTranscriptionComplete) {
            onTranscriptionComplete({
              output: result.transcript,
              duration: duration,
              webhookResponse: result.webhookResponse,
              id: recordingId
            });
          }

          // Dispatch event for LiveTranscriptionSheet
          const event = new CustomEvent('audioRecorderMessage', {
            detail: {
              type: 'transcriptionComplete',
              data: {
                output: result.transcript,
                duration: duration,
                webhookResponse: result.webhookResponse,
                id: recordingId
              }
            }
          });
          window.dispatchEvent(event);
          
          // Save recording if user is authenticated
          handleRecordingComplete(audioBlob);
          
        } catch (error) {
          console.error("Error during transcription:", error);
          toast.error("Error al procesar la transcripción. Por favor, inténtalo de nuevo.");
        } finally {
          setIsTranscribing(false);
        }
      };
      
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error: any) {
      console.error("Error starting recording:", error);
      toast.error("Error al iniciar la grabación: " + error.message);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    // Prevent duplicate saves
    if (isProcessingRef.current || recordingId) {
      console.log("Skipping save - already processed or has ID:", recordingId);
      return;
    }

    if (!user) {
      toast.error("Debes iniciar sesión para guardar grabaciones");
      return;
    }

    try {
      // Mark as processing to prevent duplicate saves
      isProcessingRef.current = true;
      
      const recordingData = {
        name: recordingNameRef.current || `Transcripción ${new Date().toLocaleString()}`,
        date: new Date().toISOString(),
        duration: finalDuration,
        folderId: null,
        output: transcriptionOutput || "",
        language: "es",
        subject: "",
        webhookData: webhookResponse,
        speakerMode: speakerMode,
        understood: false,
        audioData: ""
      };

      const newRecordingId = await addRecording(recordingData);

      if (typeof newRecordingId === 'string') {
        setRecordingId(newRecordingId);

        // Save audio to IndexedDB
        await saveAudioToStorage(newRecordingId, audioBlob);
        console.log("Audio saved to storage with ID:", newRecordingId);

        toast.success("Grabación guardada correctamente");
      } else {
        console.error("Error: No valid ID received when saving recording");
        toast.error("Error al guardar la grabación");
        isProcessingRef.current = false;
      }
    } catch (error) {
      console.error("Error saving recording:", error);
      toast.error("Error al guardar la grabación");
      isProcessingRef.current = false;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if the file is an audio file
    if (!file.type.startsWith('audio/')) {
      toast.error("Por favor, sube solo archivos de audio");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (!recordingNameRef.current) {
      // Set file name without extension as recording name
      setRecordingName(file.name.replace(/\.[^/.]+$/, ""));
    }

    // Get audio duration
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    
    audio.onloadedmetadata = async () => {
      const durationInSeconds = Math.floor(audio.duration);
      setFinalDuration(durationInSeconds);
      
      // Start transcription process
      setIsTranscribing(true);
      
      try {
        // Reset recording ID to prevent duplicate saves
        setRecordingId(null);
        isProcessingRef.current = false;
        
        if (!transcriptionServiceRef.current) {
          transcriptionServiceRef.current = new TranscriptionService({
            speakerMode: speakerMode,
            maxChunkDuration: TRANSCRIPTION_CONFIG.MAX_CHUNK_DURATION,
            webhookUrl: WEBHOOK.URL
          });
        }
        
        // Process the audio file
        const result = await transcriptionServiceRef.current.processAudio(
          file,
          (progressData) => {
            setTranscriptionProgress(progressData.progress);
            setTranscriptionOutput(progressData.output);
          }
        );
        
        setTranscriptionOutput(result.transcript);
        setWebhookResponse(result.webhookResponse);
        
        // Dispatch event for LiveTranscriptionSheet
        const event = new CustomEvent('audioRecorderMessage', {
          detail: {
            type: 'transcriptionComplete',
            data: {
              output: result.transcript,
              duration: durationInSeconds,
              webhookResponse: result.webhookResponse
            }
          }
        });
        window.dispatchEvent(event);
        
        // Save recording
        handleRecordingComplete(file);
        
      } catch (error) {
        console.error("Error processing uploaded audio:", error);
        toast.error("Error al procesar el archivo de audio.");
      } finally {
        setIsTranscribing(false);
        // Release the object URL
        URL.revokeObjectURL(audio.src);
      }
    };

    audio.onerror = () => {
      toast.error("Error al cargar el archivo de audio");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
  };

  const getBlobDuration = (blob: Blob): Promise<number> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function() {
        const audioContext = new AudioContext();
        audioContext.decodeAudioData(reader.result as ArrayBuffer,
          (buffer) => {
            resolve(buffer.duration);
          },
          (error) => {
            console.error("Error decoding audio data", error);
            resolve(0);
          }
        );
      };
      reader.readAsArrayBuffer(blob);
    });
  };

  return (
    <div>
      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Nombre de la grabación"
          value={recordingName}
          onChange={(e) => setRecordingName(e.target.value)}
          className="w-full"
        />

        <RadioGroup 
          value={speakerMode} 
          onValueChange={(value) => setSpeakerMode(value as "single" | "multiple")}
          className="flex flex-col space-y-2 mb-4"
        >
          <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary/50">
            <RadioGroupItem value="single" id="single-speaker" />
            <Label htmlFor="single-speaker" className="flex items-center cursor-pointer">
              <User className="h-4 w-4 mr-2" />
              <div>
                <span className="font-medium">Un solo orador (Modo Clase)</span>
                <p className="text-xs text-muted-foreground">Para captar principalmente la voz del profesor</p>
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary/50">
            <RadioGroupItem value="multiple" id="multiple-speaker" />
            <Label htmlFor="multiple-speaker" className="flex items-center cursor-pointer">
              <Users className="h-4 w-4 mr-2" />
              <div>
                <span className="font-medium">Múltiples oradores (Debates)</span>
                <p className="text-xs text-muted-foreground">Para captar la información de varias personas</p>
              </div>
            </Label>
          </div>
        </RadioGroup>

        <div className="flex items-center gap-2">
          {isRecording ? (
            <Button variant="destructive" onClick={stopRecording} disabled={isTranscribing} className="flex-1">
              <Square className="w-4 h-4 mr-2" />
              Detener
            </Button>
          ) : (
            <>
              <Button onClick={startRecording} disabled={isTranscribing} className="flex-1">
                <Mic className="w-4 h-4 mr-2" />
                Grabar
              </Button>
              
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  disabled={isTranscribing}
                />
                <Button
                  type="button"
                  disabled={isTranscribing}
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Audio
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      
      <LiveTranscriptionSheet
        isTranscribing={isTranscribing}
        output={transcriptionOutput}
        progress={transcriptionProgress}
        webhookResponse={webhookResponse}
      />
    </div>
  );
}
