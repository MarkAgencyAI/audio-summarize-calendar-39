
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
import { RecordingService } from "@/lib/services/recording-service";
import { v4 as uuidv4 } from "uuid";

interface AudioRecorderProps {
  onTranscriptionComplete?: (data: any) => void;
}

export function AudioRecorderV2({ onTranscriptionComplete }: AudioRecorderProps = {}) {
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSubject, setRecordingSubject] = useState("");
  const recordingSubjectRef = useRef(recordingSubject);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [transcriptionOutput, setTranscriptionOutput] = useState<string | null>(null);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [finalDuration, setFinalDuration] = useState(0);
  const [webhookResponse, setWebhookResponse] = useState<any>(null);
  const { addRecording } = useRecordings();
  const { user } = useAuth();
  const [speakerMode, setSpeakerMode] = useState<"single" | "multiple">("single");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transcriptionServiceRef = useRef<TranscriptionService | null>(null);
  const temporaryIdRef = useRef<string>(uuidv4());

  useEffect(() => {
    recordingSubjectRef.current = recordingSubject;
  }, [recordingSubject]);
  
  useEffect(() => {
    const resetRecording = () => {
      audioChunks.current = [];
      setTranscriptionOutput(null);
      setTranscriptionProgress(0);
      setIsTranscribing(false);
      setFinalDuration(0);
      setWebhookResponse(null);
      temporaryIdRef.current = uuidv4();
      setRecordingId(null);
    };
    
    if (!isRecording) {
      resetRecording();
    }

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
        
        try {
          if (!transcriptionServiceRef.current) {
            transcriptionServiceRef.current = new TranscriptionService({
              speakerMode: speakerMode,
              maxChunkDuration: TRANSCRIPTION_CONFIG.MAX_CHUNK_DURATION,
              webhookUrl: WEBHOOK.URL
            });
          }

          const result = await transcriptionServiceRef.current.processAudio(
            audioBlob,
            (progressData) => {
              setTranscriptionProgress(progressData.progress);
              setTranscriptionOutput(progressData.output);
            }
          );
          
          // Make sure we're setting the full transcript output
          setTranscriptionOutput(result.transcript);
          setWebhookResponse(result.webhookResponse);
          
          if (onTranscriptionComplete) {
            onTranscriptionComplete({
              output: result.transcript,
              duration: duration,
              webhookResponse: result.webhookResponse,
              id: temporaryIdRef.current
            });
          }

          const event = new CustomEvent('audioRecorderMessage', {
            detail: {
              type: 'transcriptionComplete',
              data: {
                output: result.transcript,
                duration: duration,
                webhookResponse: result.webhookResponse,
                id: temporaryIdRef.current
              }
            }
          });
          window.dispatchEvent(event);
          
          handleRecordingComplete(audioBlob, result.transcript);
          
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

  const handleRecordingComplete = async (audioBlob: Blob, transcript: string) => {
    if (!user) {
      toast.error("Debes iniciar sesión para guardar grabaciones");
      return;
    }

    try {
      const tempId = temporaryIdRef.current;
      
      if (RecordingService.isProcessing(tempId)) {
        console.log("Skipping save - already being processed:", tempId);
        return;
      }
      
      // Generate a name based on subject and timestamp if subject is provided
      const recordingName = recordingSubjectRef.current 
        ? `${recordingSubjectRef.current} - ${new Date().toLocaleString()}`
        : `Transcripción ${new Date().toLocaleString()}`;
      
      const recordingData = {
        id: tempId,
        name: recordingName,
        date: new Date().toISOString(),
        duration: finalDuration,
        audioBlob: audioBlob,
        output: transcript, // Ensure the transcript is saved here
        folderId: null,
        language: "es",
        subject: recordingSubjectRef.current || "",
        webhookData: webhookResponse,
        speakerMode: speakerMode,
        understood: false
      };

      console.log("Saving recording with transcript:", transcript ? transcript.substring(0, 100) + "..." : "No transcript");
      
      const savedId = await RecordingService.saveRecording(recordingData);

      if (savedId) {
        setRecordingId(savedId);
        console.log("Recording saved with ID:", savedId);
        toast.success("Grabación guardada correctamente");
      } else {
        console.error("Error: Failed to save recording");
        toast.error("Error al guardar la grabación");
      }
    } catch (error) {
      console.error("Error saving recording:", error);
      toast.error("Error al guardar la grabación");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error("Por favor, sube solo archivos de audio");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const fileName = file.name.replace(/\.[^/.]+$/, "");

    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    
    audio.onloadedmetadata = async () => {
      const durationInSeconds = Math.floor(audio.duration);
      setFinalDuration(durationInSeconds);
      
      setIsTranscribing(true);
      
      try {
        temporaryIdRef.current = uuidv4();
        
        if (!transcriptionServiceRef.current) {
          transcriptionServiceRef.current = new TranscriptionService({
            speakerMode: speakerMode,
            maxChunkDuration: TRANSCRIPTION_CONFIG.MAX_CHUNK_DURATION,
            webhookUrl: WEBHOOK.URL
          });
        }
        
        const result = await transcriptionServiceRef.current.processAudio(
          file,
          (progressData) => {
            setTranscriptionProgress(progressData.progress);
            setTranscriptionOutput(progressData.output);
          }
        );
        
        // Make sure we're setting the full transcript
        setTranscriptionOutput(result.transcript);
        setWebhookResponse(result.webhookResponse);
        
        const event = new CustomEvent('audioRecorderMessage', {
          detail: {
            type: 'transcriptionComplete',
            data: {
              output: result.transcript,
              duration: durationInSeconds,
              webhookResponse: result.webhookResponse,
              id: temporaryIdRef.current
            }
          }
        });
        window.dispatchEvent(event);
        
        handleRecordingComplete(file, result.transcript);
        
      } catch (error) {
        console.error("Error processing uploaded audio:", error);
        toast.error("Error al procesar el archivo de audio.");
      } finally {
        setIsTranscribing(false);
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
          placeholder="Materia (ej. Matemáticas, Historia, Física...)"
          value={recordingSubject}
          onChange={(e) => setRecordingSubject(e.target.value)}
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
