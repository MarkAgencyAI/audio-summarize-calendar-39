import { useState, useRef, useEffect } from "react";
import { Mic, X, Play, Pause, Loader2, Square, User, Users, Upload } from "lucide-react";
import { useRecordings } from "@/context/RecordingsContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { transcribeAudio, blobToBase64 } from "@/lib/groq";
import { useAudioProcessor } from "@/hooks/use-audio-processor";

type RecordingState = "idle" | "recording" | "paused";
type SpeakerMode = "single" | "multiple";

export function AudioRecorder() {
  const { addRecording, folders } = useRecordings();
  const { user } = useAuth();
  const { processAudioFile } = useAudioProcessor();
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingName, setRecordingName] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState("default");
  const [subject, setSubject] = useState("");
  const [hasPermission, setHasPermission] = useState(false);
  const [webhookOutput, setWebhookOutput] = useState("");
  const [speakerMode, setSpeakerMode] = useState<SpeakerMode>("single");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const subjectRef = useRef(subject);
  const audioUrlRef = useRef<string | null>(null);
  const audioDataRef = useRef<string | null>(null);
  const speakerModeRef = useRef(speakerMode);
  
  useEffect(() => {
    subjectRef.current = subject;
  }, [subject]);
  
  useEffect(() => {
    speakerModeRef.current = speakerMode;
  }, [speakerMode]);
  
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasPermission(true);
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error("Error getting microphone permission:", error);
        setHasPermission(false);
      }
    };
    
    checkPermissions();
  }, []);
  
  useEffect(() => {
    const handleWebhookMessage = (event: Event) => {
      const customEvent = event as CustomEvent;
      
      if (customEvent.detail?.type === 'webhook_analysis') {
        console.log("AudioRecorder received webhook message:", customEvent.detail);
        
        if (customEvent.detail?.data?.output) {
          setWebhookOutput(customEvent.detail.data.output);
          
          if (isProcessing && audioUrlRef.current && audioDataRef.current) {
            saveRecordingWithOutput(customEvent.detail.data.output);
          }
        }
      }
    };
    
    window.addEventListener('webhookMessage', handleWebhookMessage);
    
    return () => {
      window.removeEventListener('webhookMessage', handleWebhookMessage);
    };
  }, [isProcessing]);
  
  const saveRecordingWithOutput = (output: string) => {
    if (!audioUrlRef.current || !audioDataRef.current) return;
    
    addRecording({
      name: recordingName || `Grabación ${formatDate(new Date())}`,
      audioUrl: audioUrlRef.current,
      audioData: audioDataRef.current,
      output: output,
      folderId: selectedFolder,
      duration: recordingDuration,
      subject: subjectRef.current || "Sin materia especificada",
      speakerMode: speakerModeRef.current,
      suggestedEvents: [],
      createdAt: new Date().toISOString()
    });
    
    setIsProcessing(false);
    setRecordingState('idle');
    setRecordingName('');
    setSubject('');
    setAudioBlob(null);
    setRecordingDuration(0);
    setWebhookOutput("");
    audioUrlRef.current = null;
    audioDataRef.current = null;
    
    toast.success('Grabación guardada correctamente');
  };
  
  const startRecording = async () => {
    if (!hasPermission) {
      toast.error("Por favor, permite el acceso al micrófono");
      return;
    }
    
    if (!subject.trim()) {
      toast.error("Por favor, ingresa la materia antes de grabar");
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };
      
      mediaRecorder.current.onstop = () => {
        const fullBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        setAudioBlob(fullBlob);
      };
      
      mediaRecorder.current.start();
      setRecordingState("recording");
      startTimer();
      
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Error al iniciar la grabación");
    }
  };
  
  const pauseRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.pause();
      setRecordingState("paused");
      pauseTimer();
    }
  };
  
  const resumeRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "paused") {
      mediaRecorder.current.resume();
      setRecordingState("recording");
      startTimer();
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
      setRecordingState("idle");
      stopTimer();
      
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };
  
  const clearRecording = () => {
    setAudioBlob(null);
    setRecordingName("");
  };
  
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  
  const startTimer = () => {
    timerInterval.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000) as unknown as NodeJS.Timeout;
  };
  
  const pauseTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }
  };
  
  const stopTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }
  };
  
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const dispatchTranscriptionUpdate = (data: any) => {
    const event = new CustomEvent('audioRecorderMessage', {
      detail: {
        type: 'transcriptionUpdate',
        data
      }
    });
    window.dispatchEvent(event);
  };
  
  const dispatchTranscriptionComplete = (data: any) => {
    const event = new CustomEvent('audioRecorderMessage', {
      detail: {
        type: 'transcriptionComplete',
        data
      }
    });
    window.dispatchEvent(event);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!subject.trim()) {
      toast.error("Por favor, ingresa la materia antes de subir un audio");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

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

    // Get audio duration for display
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    
    audio.onloadedmetadata = () => {
      const durationInSeconds = Math.floor(audio.duration);
      setRecordingDuration(durationInSeconds);
      setAudioBlob(file);
      
      // Set file name without extension as recording name
      setRecordingName(file.name.replace(/\.[^/.]+$/, ""));
      
      // Check if file is over 10 minutes and show a toast notification
      if (durationInSeconds > 600) { // 10 minutes in seconds
        toast.info("El archivo es mayor a 10 minutos, se dividirá en partes para procesarlo");
      }
      
      // Release the object URL
      URL.revokeObjectURL(audio.src);
    };

    audio.onerror = () => {
      toast.error("Error al cargar el archivo de audio");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
  };
  
  const saveRecording = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      toast.info("Procesando grabación...");
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const base64AudioData = await blobToBase64(audioBlob);
      
      audioUrlRef.current = audioUrl;
      audioDataRef.current = base64AudioData as string;
      
      dispatchTranscriptionUpdate({
        output: "Iniciando transcripción..."
      });
      
      let transcriptionResult;
      try {
        transcriptionResult = await processAudioFile(
          audioBlob, 
          subjectRef.current,
          (progressData) => dispatchTranscriptionUpdate(progressData),
          speakerModeRef.current
        );
        
        toast.success("Audio transcrito correctamente");
        
        if (transcriptionResult?.output) {
          dispatchTranscriptionUpdate({ output: transcriptionResult.output });
          dispatchTranscriptionComplete({ output: transcriptionResult.output });
        }
        
        const timeoutId = setTimeout(() => {
          if (isProcessing) {
            console.log("Webhook timeout - saving with existing data");
            
            saveRecordingWithOutput(webhookOutput || transcriptionResult?.output || "No se recibió respuesta del webhook en el tiempo esperado.");
          }
        }, 10000) as unknown as NodeJS.Timeout;
      
      } catch (error) {
        console.error("Error transcribing audio:", error);
        toast.error("Error al transcribir el audio. No se pudo procesar.");
        throw error;
      }
      
    } catch (error) {
      console.error('Error saving recording:', error);
      setIsProcessing(false);
      toast.error('Error al guardar la grabación');
    }
  };
  
  return (
    <div className="glassmorphism rounded-xl p-4 md:p-6 shadow-lg bg-white/5 dark:bg-black/20 backdrop-blur-xl border border-white/10 dark:border-white/5">
      <h2 className="text-xl font-semibold mb-4 text-custom-primary">Nueva grabación</h2>
      
      <div className="space-y-4">
        {recordingState === "idle" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-custom-text">Materia *</Label>
              <Input
                id="subject"
                placeholder="Ingresa la materia (ej: Matemáticas, Historia, etc.)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="border-custom-primary/20 focus:border-custom-primary focus:ring-custom-primary"
                required
              />
              {recordingState === "idle" && !subject.trim() && (
                <p className="text-xs text-amber-500">Debes ingresar la materia antes de grabar</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-custom-text">Modo de grabación</Label>
              <RadioGroup 
                value={speakerMode}
                onValueChange={(value) => setSpeakerMode(value as SpeakerMode)}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2 p-2 rounded-md">
                  <RadioGroupItem value="single" id="single-speaker" />
                  <Label htmlFor="single-speaker" className="flex items-center cursor-pointer">
                    <User className="h-4 w-4 mr-2" />
                    <div>
                      <span className="font-medium">Un solo orador (Modo Clase)</span>
                      <p className="text-xs text-muted-foreground">Para captar principalmente la voz del profesor</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded-md">
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
            </div>
          </>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {recordingState === "idle" && !audioBlob && (
              <>
                <Button 
                  onClick={startRecording} 
                  disabled={isProcessing || !subject.trim()} 
                  className={`bg-custom-primary hover:bg-custom-primary/90 text-white ${!subject.trim() ? 'opacity-70' : ''}`}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Grabar
                </Button>
                
                <div className="relative">
                  <input
                    type="file"
                    id="audio-upload"
                    ref={fileInputRef}
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    disabled={isProcessing || !subject.trim()}
                  />
                  <Button
                    type="button"
                    disabled={isProcessing || !subject.trim()}
                    className={`bg-custom-accent hover:bg-custom-accent/90 text-white ${!subject.trim() ? 'opacity-70' : ''}`}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Audio
                  </Button>
                </div>
              </>
            )}
            
            {recordingState === "recording" && (
              <>
                <Button onClick={pauseRecording} disabled={isProcessing} className="bg-custom-accent hover:bg-custom-accent/90 text-white">
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </Button>
                <Button onClick={stopRecording} disabled={isProcessing} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  Detener
                </Button>
              </>
            )}
            
            {recordingState === "paused" && (
              <>
                <Button onClick={resumeRecording} disabled={isProcessing} className="bg-custom-accent hover:bg-custom-accent/90 text-white">
                  <Play className="h-4 w-4 mr-2" />
                  Reanudar
                </Button>
                <Button onClick={stopRecording} disabled={isProcessing} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  Detener
                </Button>
              </>
            )}
          </div>
          
          <span className="text-custom-text">{formatTime(recordingDuration)}</span>
        </div>
        
        {audioBlob === null ? null : (
          <>
            <div className="space-y-2">
              <Label htmlFor="recording-name" className="text-custom-text">Nombre de la grabación</Label>
              <Input
                id="recording-name"
                placeholder="Nombre de la grabación"
                value={recordingName}
                onChange={(e) => setRecordingName(e.target.value)}
                className="border-custom-primary/20 focus:border-custom-primary focus:ring-custom-primary"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="folder" className="text-custom-text">Carpeta</Label>
              <select
                id="folder"
                className="w-full h-10 px-3 py-2 bg-background text-custom-text border border-custom-primary/20 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-primary focus:border-custom-primary"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
              >
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        
        {audioBlob && (
          <div className="flex justify-between gap-4">
            <Button variant="ghost" onClick={clearRecording} className="text-custom-primary hover:bg-custom-primary/10">
              <X className="h-4 w-4 mr-2" />
              Borrar
            </Button>
            
            <Button
              onClick={() => saveRecording(audioBlob)}
              disabled={isProcessing}
              className="bg-custom-primary hover:bg-custom-primary/90 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Guardar grabación"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
