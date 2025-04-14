
import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TranscriptionPanel } from "./TranscriptionPanel";
import { Mic, X, Play, Pause, Loader2, Square, User, Users, Upload, FileJson, MessageSquare, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { extractWebhookOutput } from "@/lib/transcription-service";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRecordings } from "@/context/RecordingsContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { loadAudioFromStorage } from "@/lib/storage";

interface LiveTranscriptionSheetProps {
  isTranscribing: boolean;
  output: string | {
    output: string;
  } | any;
  progress?: number;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  webhookResponse?: any;
}

export function LiveTranscriptionSheet({
  isTranscribing,
  output,
  progress = 0,
  children,
  open,
  onOpenChange,
  webhookResponse
}: LiveTranscriptionSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [userClosed, setUserClosed] = useState(false);
  const [activeTab, setActiveTab] = useState("transcription");
  const [processedWebhookResponse, setProcessedWebhookResponse] = useState<any>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [loadedAudio, setLoadedAudio] = useState<Blob | null>(null);
  const saveProcessedRef = useRef(false);
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const isMobile = useIsMobile();
  const { addRecording, updateRecording } = useRecordings();
  const { user } = useAuth();
  
  const handleOpenChange = (newOpen: boolean) => {
    if (isControlled) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
    if (!newOpen) {
      setUserClosed(true);
    }
  };
  
  useEffect(() => {
    if (isTranscribing && !isOpen && !userClosed) {
      handleOpenChange(true);
    }
    if (!isTranscribing) {
      setUserClosed(false);
    }
  }, [isTranscribing, isOpen, userClosed]);
  
  useEffect(() => {
    if (webhookResponse && recordingId) {
      const extracted = extractWebhookOutput(webhookResponse);
      setProcessedWebhookResponse(extracted);
      
      console.log("Actualizando grabación con respuesta de webhook:", recordingId);
      updateRecording(recordingId, {
        webhookData: extracted
      });
    }
  }, [webhookResponse, recordingId, updateRecording]);
  
  useEffect(() => {
    const loadAudio = async () => {
      if (recordingId) {
        try {
          const audioBlob = await loadAudioFromStorage(recordingId);
          if (audioBlob) {
            console.log("Audio loaded from storage for ID:", recordingId);
            setLoadedAudio(audioBlob);
          } else {
            console.log("No audio found in storage for ID:", recordingId);
          }
        } catch (error) {
          console.error("Error loading audio from storage:", error);
        }
      }
    };

    loadAudio();
  }, [recordingId]);
  
  useEffect(() => {
    const handleTranscriptionComplete = async (event: CustomEvent) => {
      if (!event.detail?.data || userClosed || saveProcessedRef.current) {
        return;
      }
      
      handleOpenChange(true);
      
      // Check if this recording was already saved
      if (event.detail.data.id) {
        console.log("This recording was already saved with ID:", event.detail.data.id);
        setRecordingId(event.detail.data.id);
        
        if (event.detail.data.webhookResponse) {
          setActiveTab("webhook");
          const extracted = extractWebhookOutput(event.detail.data.webhookResponse);
          setProcessedWebhookResponse(extracted);
          
          // Update the recording with webhook data if it doesn't have it yet
          updateRecording(event.detail.data.id, {
            webhookData: extracted
          });
        }
        
        return;
      }
      
      // Save the recording only if it hasn't been saved already and user is authenticated
      if (event.detail.data.output && user && !saveProcessedRef.current) {
        console.log("Saving new transcription to database");
        saveProcessedRef.current = true;
        
        const transcriptionData = {
          name: `Transcripción ${new Date().toLocaleString()}`,
          date: new Date().toISOString(),
          duration: event.detail.data.duration || 0,
          audioData: "",
          folderId: null,
          output: event.detail.data.output,
          language: "es",
          subject: "",
          webhookData: event.detail.data.webhookResponse || null,
          speakerMode: "single" as "single" | "multiple",
          understood: false
        };
        
        try {
          const newRecordingId = await addRecording(transcriptionData);
          
          if (typeof newRecordingId === 'string') {
            setRecordingId(newRecordingId);
            console.log("Recording saved with ID:", newRecordingId);
            toast.success("Grabación guardada correctamente");
            
            // If we have webhook response, update the recording
            if (event.detail.data.webhookResponse) {
              setActiveTab("webhook");
              const extracted = extractWebhookOutput(event.detail.data.webhookResponse);
              setProcessedWebhookResponse(extracted);
              
              updateRecording(newRecordingId, {
                webhookData: extracted
              });
            }
          } else {
            console.error("Error: No valid ID received when saving recording");
            toast.error("Error al guardar la grabación");
            saveProcessedRef.current = false;
          }
        } catch (error) {
          console.error("Error saving recording:", error);
          toast.error("Error al guardar la grabación");
          saveProcessedRef.current = false;
        }
      }
    };
    
    const handleEvent = (e: Event) => {
      if ((e as CustomEvent).detail?.type === 'transcriptionComplete') {
        handleTranscriptionComplete(e as CustomEvent);
      }
    };
    
    window.addEventListener('audioRecorderMessage', handleEvent);
    return () => {
      window.removeEventListener('audioRecorderMessage', handleEvent);
    };
  }, [userClosed, addRecording, updateRecording, user]);
  
  // Reset the processed flag when transcribing starts
  useEffect(() => {
    if (isTranscribing) {
      saveProcessedRef.current = false;
    }
    
    return () => {
      if (!isTranscribing) {
        // Wait a bit before allowing a new save
        setTimeout(() => {
          saveProcessedRef.current = false;
        }, 2000);
      }
    };
  }, [isTranscribing]);
  
  const handleClose = () => {
    handleOpenChange(false);
    setUserClosed(true);
  };
  
  const safeOutput = (() => {
    try {
      if (output === null || output === undefined) {
        return "";
      }
      if (typeof output === 'string') {
        return output;
      }
      if (typeof output === 'object') {
        if ('output' in output && typeof output.output === 'string') {
          return output.output;
        }
        return JSON.stringify(output, null, 2);
      }
      return String(output);
    } catch (error) {
      console.error("Error processing output:", error);
      return "Error: No se pudo procesar el formato de salida";
    }
  })();
  
  const hasWebhookResponse = processedWebhookResponse || typeof output === 'object' && output && 'webhookResponse' in output;
  
  const webhookContent = (() => {
    if (processedWebhookResponse) {
      return typeof processedWebhookResponse === 'string' ? processedWebhookResponse : JSON.stringify(processedWebhookResponse, null, 2);
    }
    if (typeof output === 'object' && output && 'webhookResponse' in output) {
      const extractedResponse = extractWebhookOutput(output.webhookResponse);
      return typeof extractedResponse === 'string' ? extractedResponse : JSON.stringify(extractedResponse, null, 2);
    }
    return "Esperando resumen y puntos fuertes...";
  })();
  
  const sheetSizeClass = isMobile ? "w-[95vw] max-w-full" : "sm:max-w-md md:max-w-xl lg:max-w-2xl";
  
  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      {children ? (
        <SheetTrigger asChild>
          {children}
        </SheetTrigger>
      ) : (
        <SheetTrigger asChild>
          {/* Empty trigger - triggered programmatically */}
        </SheetTrigger>
      )}
      
      <SheetContent side="right" className={`${sheetSizeClass} p-0 flex flex-col overflow-hidden`}>
        <SheetHeader className="p-3 sm:p-4 border-b flex flex-row justify-between items-center">
          <div>
            <SheetTitle className="text-base sm:text-lg">Transcripción en proceso</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm">
              {isTranscribing ? "Visualiza la transcripción en tiempo real" : "Resultados del procesamiento de audio"}
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenChange(false)}>
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </SheetClose>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="bg-muted/30 p-1 mx-2 sm:mx-4 my-2 grid grid-cols-2 gap-1">
              <TabsTrigger value="transcription" className="flex items-center gap-1 text-xs sm:text-sm py-1">
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="truncate">Transcripción</span>
              </TabsTrigger>
              <TabsTrigger value="webhook" className="flex items-center gap-1 text-xs sm:text-sm py-1">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="truncate">Resumen</span>
                {hasWebhookResponse && <span className="bg-green-500 h-2 w-2 rounded-full ml-1"></span>}
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-grow overflow-auto">
              <TabsContent value="transcription" className="flex-1 overflow-hidden mt-0">
                <div className="p-2 sm:p-4 pb-2">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                    {isTranscribing ? "Transcribiendo audio en tiempo real..." : "Transcripción completada"}
                  </div>
                </div>
                
                <div className="px-2 sm:px-4 h-[calc(100vh-220px)] overflow-hidden">
                  <ScrollArea className="h-full overflow-y-auto">
                    <div className="pr-2 sm:pr-4 max-w-full overflow-x-hidden">
                      <TranscriptionPanel 
                        output={safeOutput} 
                        isLoading={isTranscribing && !safeOutput} 
                        showProgress={isTranscribing} 
                        progress={progress} 
                      />
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
              
              <TabsContent value="webhook" className="flex-1 overflow-hidden mt-0">
                <div className="p-2 sm:p-4 pb-2">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                    {hasWebhookResponse ? "Resumen y puntos fuertes (datos procesados)" : "Esperando procesamiento de la transcripción..."}
                  </div>
                </div>
                
                <div className="px-2 sm:px-4 h-[calc(100vh-220px)] overflow-hidden">
                  <ScrollArea className="h-full overflow-y-auto">
                    <div className="pr-2 sm:pr-4 max-w-full overflow-x-hidden">
                      <TranscriptionPanel 
                        output={webhookContent} 
                        isLoading={isTranscribing && !hasWebhookResponse} 
                        showProgress={false} 
                      />
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
