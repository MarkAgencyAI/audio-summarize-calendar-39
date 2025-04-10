import { useState, useRef, useEffect } from "react";
import { Mic, X, Play, Pause, Loader2, Square, User, Users, Upload, AlertCircle } from "lucide-react";
import { useRecordings } from "@/context/RecordingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { formatTime } from "@/lib/audio-utils";
import { useTranscription } from "@/lib/transcription";

type RecordingState = "idle" | "recording" | "paused";
type SpeakerMode = "single" | "multiple";

// URL fija del webhook
const WEBHOOK_URL = "https://sswebhookss.maettiai.tech/webhook/8e34aca2-3111-488c-8ee8-a0a2c63fc9e4";

export function AudioRecorderV2() {
  const { addRecording, folders } = useRecordings();
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingName, setRecordingName] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [subject, setSubject] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("default");
  const [speakerMode, setSpeakerMode] = useState<SpeakerMode>("single");
  const [hasPermission, setHasPermission] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  
  const { 
    transcribeAudio, 
    isTranscribing, 
    progress, 
    transcript,
    error,
    errors 
  } = useTranscription({ 
    speakerMode,
    subject,
    webhookUrl: WEBHOOK_URL,
    maxChunkDuration: 420 
  });

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
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

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
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
      };
      
      window.dispatchEvent(new CustomEvent('audioRecorderMessage', {
        detail: { type: 'recordingStarted' }
      }));
      
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
      
      if (!recordingName) {
        setRecordingName(`Grabación ${formatDate(new Date())}`);
      }
    }
  };

  const clearRecording = () => {
    setAudioBlob(null);
    setRecordingName("");
    
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

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

    if (!file.type.startsWith('audio/')) {
      toast.error("Por favor, sube solo archivos de audio");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    
    audio.onloadedmetadata = () => {
      const durationInSeconds = Math.floor(audio.duration);
      setRecordingDuration(durationInSeconds);
      setAudioBlob(file);
      
      setRecordingName(file.name.replace(/\.[^/.]+$/, ""));
      
      if (durationInSeconds > 600) {
        toast.info("El archivo es mayor a 10 minutos, se dividirá en partes para procesarlo");
      }
      
      URL.revokeObjectURL(audio.src);
    };

    audio.onerror = () => {
      toast.error("Error al cargar el archivo de audio");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
  };

  const processAndSaveRecording = async () => {
    if (!audioBlob) return;
    
    try {
      toast.info("Procesando grabación...");
      
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      audioUrlRef.current = URL.createObjectURL(audioBlob);
      
      const fileSizeMB = (audioBlob.size / (1024 * 1024)).toFixed(2);
      console.log(`Procesando archivo de audio: ${fileSizeMB}MB, tipo: ${audioBlob.type}, duración: ${recordingDuration}s`);
      
      if (audioBlob.size > 20 * 1024 * 1024) {
        toast.warning("El archivo de audio es muy grande, la transcripción puede tardar más tiempo");
      }
      
      if (recordingDuration > 180) {
        toast.info(`El audio dura más de 3 minutos (${Math.floor(recordingDuration / 60)} minutos). Se dividirá en segmentos para procesarlo.`);
      }
      
      const result = await transcribeAudio(audioBlob);
      
      let webhookData = null;
      let suggestedEvents = [];
      
      if (result.webhookResponse) {
        toast.success("Respuesta del webhook recibida");
        webhookData = result.webhookResponse;
        
        if (webhookData && typeof webhookData === 'object') {
          if (webhookData.suggestedEvents) {
            suggestedEvents = webhookData.suggestedEvents;
          } else if (Array.isArray(webhookData) && webhookData.length > 0) {
            const firstItem = webhookData[0];
            if (firstItem && firstItem.suggestedEvents) {
              suggestedEvents = firstItem.suggestedEvents;
            }
          }
        }
      }
      
      if (result.transcript) {
        const transcriptLength = result.transcript.length;
        console.log(`Transcripción completada: ${transcriptLength} caracteres`);
        
        if (transcriptLength < 10) {
          toast.warning("La transcripción es muy corta, es posible que el audio no se haya procesado correctamente");
        }
      } else {
        toast.error("No se obtuvo texto de la transcripción");
      }
      
      if (result.errors && result.errors.length > 0) {
        toast.warning(`Se completó con ${result.errors.length} errores en algunas partes`);
        console.error("Errores durante la transcripción:", result.errors);
      }
      
      const recordingData = {
        name: recordingName || `Grabación ${formatDate(new Date())}`,
        audioUrl: audioUrlRef.current,
        audioData: audioUrlRef.current,
        output: result.transcript,
        folderId: selectedFolder,
        duration: recordingDuration,
        subject: subject,
        speakerMode: speakerMode,
        suggestedEvents: suggestedEvents,
        webhookData: webhookData,
      };
      
      const finalRecordingData = result.errors && result.errors.length > 0
        ? { ...recordingData, errors: result.errors }
        : recordingData;
      
      addRecording(finalRecordingData);
      
      setAudioBlob(null);
      setRecordingName('');
      setSubject('');
      setRecordingDuration(0);
      
      toast.success('Grabación guardada correctamente');
      
    } catch (error) {
      console.error('Error procesando y guardando grabación:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Ocurrió un error desconocido";
      
      toast.error(`Error al procesar la grabación: ${errorMessage}`);
      
      if (errorMessage.includes("GROQ") || errorMessage.includes("api.groq.com")) {
        toast.error("Error de conexión con el servicio de transcripción. Intenta de nuevo más tarde.", {
          duration: 5000
        });
      }
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
                  disabled={isTranscribing || !subject.trim()} 
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
                    disabled={isTranscribing || !subject.trim()}
                  />
                  <Button
                    type="button"
                    disabled={isTranscribing || !subject.trim()}
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
                <Button onClick={pauseRecording} disabled={isTranscribing} className="bg-custom-accent hover:bg-custom-accent/90 text-white">
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </Button>
                <Button onClick={stopRecording} disabled={isTranscribing} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  Detener
                </Button>
              </>
            )}
            
            {recordingState === "paused" && (
              <>
                <Button onClick={resumeRecording} disabled={isTranscribing} className="bg-custom-accent hover:bg-custom-accent/90 text-white">
                  <Play className="h-4 w-4 mr-2" />
                  Reanudar
                </Button>
                <Button onClick={stopRecording} disabled={isTranscribing} variant="destructive">
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
              onClick={processAndSaveRecording}
              disabled={isTranscribing}
              className="bg-custom-primary hover:bg-custom-primary/90 text-white"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando... {progress}%
                </>
              ) : (
                "Guardar grabación"
              )}
            </Button>
          </div>
        )}
        
        {error && (
          <div className="p-2 bg-red-100 text-red-800 rounded-md text-sm mt-2">
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Error principal:</p>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        {errors && errors.length > 0 && (
          <div className="p-2 bg-amber-50 text-amber-800 rounded-md text-sm mt-2">
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Errores en partes específicas:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {errors.map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
