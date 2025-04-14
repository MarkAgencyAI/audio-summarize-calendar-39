import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { LiveTranscriptionSheet } from "./LiveTranscriptionSheet";
import { useRecordings } from "@/context/RecordingsContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mic, Square, Loader2 } from "lucide-react";
import { saveAudioToStorage } from "@/lib/storage";

interface AudioRecorderProps {
  onTranscriptionComplete?: (data: any) => void;
}

export function AudioRecorderV2({ onTranscriptionComplete }: AudioRecorderProps = {}) {
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingName, setRecordingName] = useState("");
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [transcriptionOutput, setTranscriptionOutput] = useState<string | null>(null);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [finalDuration, setFinalDuration] = useState(0);
  const [webhookResponse, setWebhookResponse] = useState<any>(null);
  const { addRecording } = useRecordings();
  const { user } = useAuth();
  
  useEffect(() => {
    const resetRecording = () => {
      audioChunks.current = [];
      setTranscriptionOutput(null);
      setTranscriptionProgress(0);
      setIsTranscribing(false);
      setFinalDuration(0);
      setWebhookResponse(null);
    };
    
    if (!isRecording) {
      resetRecording();
    }
  }, [isRecording]);
  
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
        
        // Upload audio and get transcription
        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "recording.webm");
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transcribe`, {
            method: "POST",
            body: formData,
          });
          
          if (!response.ok) {
            console.error("Transcription failed:", response.statusText);
            toast.error("La transcripción falló. Por favor, inténtalo de nuevo.");
            setIsTranscribing(false);
            return;
          }
          
          const reader = response.body?.getReader();
          if (!reader) {
            console.error("Failed to get reader from response body");
            toast.error("Error al leer la respuesta del servidor.");
            setIsTranscribing(false);
            return;
          }
          
          let receivedLength = 0;
          let chunks: Uint8Array[] = [];
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              break;
            }
            
            if (value) {
              chunks.push(value);
              receivedLength += value.length;
              
              // Calculate progress
              const progress = response.headers.get('x-progress') ? parseFloat(response.headers.get('x-progress')!) : 0;
              setTranscriptionProgress(progress);
            }
          }
          
          let responseText = new TextDecoder().decode(new Uint8Array(chunks.flatMap(chunk => Array.from(chunk))));
          
          try {
            const parsedResponse = JSON.parse(responseText);
            setTranscriptionOutput(parsedResponse.output);
            setWebhookResponse(parsedResponse);
            
            // Notify parent component about transcription completion
            if (onTranscriptionComplete) {
              onTranscriptionComplete({
                output: parsedResponse.output,
                duration: duration,
                webhookResponse: parsedResponse,
                id: recordingId
              });
            }
          } catch (e) {
            console.error("Error parsing JSON response:", e);
            console.log("Raw response text:", responseText);
            toast.error("Error al procesar la respuesta del servidor.");
          } finally {
            setIsTranscribing(false);
          }
        } catch (error) {
          console.error("Error during transcription:", error);
          toast.error("Error al procesar la transcripción. Por favor, inténtalo de nuevo.");
          setIsTranscribing(false);
        }
        
        // Save recording if user is authenticated
        handleRecordingComplete(audioBlob);
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
    if (!user) {
      toast.error("Debes iniciar sesión para guardar grabaciones");
      return;
    }

    const recordingData = {
      name: recordingName || `Transcripción ${new Date().toLocaleString()}`,
      date: new Date().toISOString(),
      duration: finalDuration,
      folderId: null,
      output: "",
      language: "es",
      subject: "",
      webhookData: null,
      speakerMode: "single" as "single" | "multiple",
      understood: false,
      audioData: ""
    };

    try {
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
      }
    } catch (error) {
      console.error("Error saving recording:", error);
      toast.error("Error al guardar la grabación");
    }
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
      <div className="flex items-center space-x-4">
        <Input
          type="text"
          placeholder="Nombre de la grabación"
          value={recordingName}
          onChange={(e) => setRecordingName(e.target.value)}
          className="w-full max-w-sm"
        />
        
        {isRecording ? (
          <Button variant="destructive" onClick={stopRecording} disabled={isTranscribing}>
            <Square className="w-4 h-4 mr-2" />
            Detener
          </Button>
        ) : (
          <Button onClick={startRecording} disabled={isTranscribing}>
            <Mic className="w-4 h-4 mr-2" />
            Grabar
          </Button>
        )}
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
