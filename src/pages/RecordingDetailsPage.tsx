
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useRecordings } from "@/context/RecordingsContext";
import { RecordingDetails } from "@/components/recording-details";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeft, Check, X, Clock, Loader2 } from "lucide-react";
import { loadAudioFromStorage } from "@/lib/storage";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function RecordingDetailsPage() {
  const { recordingId } = useParams<{ recordingId: string }>();
  const navigate = useNavigate();
  const { recordings, updateRecording } = useRecordings();
  const [isOpen, setIsOpen] = useState(true);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  
  // Find the recording
  const recording = recordings.find(r => r.id === recordingId);
  
  // If recording not found, redirect to dashboard
  useEffect(() => {
    if (!recording) {
      navigate("/dashboard");
      return;
    }
    
    // Set loading state
    setIsLoading(true);
    
    // Simulate loading (combine with actual loading logic)
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    
    return () => clearTimeout(loadingTimer);
  }, [recording, navigate]);
  
  // Log para depuración - verificar si la grabación tiene datos
  useEffect(() => {
    if (recording) {
      console.log("Grabación cargada:", {
        id: recording.id,
        name: recording.name,
        chapters: recording.chapters?.length || 0,
        hasOutput: !!recording.output,
        outputLength: recording.output?.length || 0,
        hasWebhookData: !!recording.webhookData
      });
    }
  }, [recording]);
  
  // Handle closing the dialog
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      navigate("/dashboard");
    }
  };
  
  // Preload audio from storage when page loads
  useEffect(() => {
    if (recording) {
      const preloadAudio = async () => {
        try {
          const audioBlob = await loadAudioFromStorage(recording.id);
          if (!audioBlob && recording.audioUrl) {
            // If not in storage, try to fetch from URL
            const response = await fetch(recording.audioUrl);
            if (response.ok) {
              // Audio loaded successfully
              setIsAudioLoaded(true);
            } else {
              toast.error("No se pudo cargar el audio");
            }
          } else if (audioBlob) {
            // Audio loaded from IndexedDB
            setIsAudioLoaded(true);
          }
        } catch (error) {
          console.error("Error preloading audio:", error);
          toast.error("Error al cargar el audio");
        }
      };
      
      preloadAudio();
    }
  }, [recording]);
  
  const handleUnderstoodChange = (understood: boolean) => {
    if (recording) {
      updateRecording(recording.id, { understood });
      toast.success(understood ? "Marcada como entendida" : "Marcada como no entendida");
    }
  };
  
  const getRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: es
      });
    } catch (e) {
      return "hace algún tiempo";
    }
  };
  
  if (isLoading || !recording) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            <h2 className="text-xl font-medium text-slate-800 dark:text-slate-200">Cargando grabación...</h2>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Button 
            variant="outline" 
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/70"
          >
            <ArrowLeft className="h-4 w-4" /> 
            <span>Volver</span>
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center mr-2">
              <Clock className="h-3.5 w-3.5 mr-1" />
              <span>{getRelativeTime(recording.createdAt || recording.date)}</span>
            </div>
            
            <ToggleGroup 
              type="single" 
              value={recording.understood ? "understood" : "not-understood"}
              onValueChange={(value) => {
                if (value) { // Only update if a value is selected (prevents deselection)
                  handleUnderstoodChange(value === "understood");
                }
              }}
              className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm"
            >
              <ToggleGroupItem 
                value="understood" 
                aria-label="Entendida" 
                className={`${recording.understood ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50' : ''} 
                  flex items-center gap-1 px-3 py-1.5 h-9 rounded-l-md data-[state=on]:border-green-500`}
              >
                <Check className="h-4 w-4" />
                <span className="text-sm">Entendida</span>
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="not-understood" 
                aria-label="No entendida" 
                className={`${!recording.understood ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50' : ''} 
                  flex items-center gap-1 px-3 py-1.5 h-9 rounded-r-md data-[state=on]:border-amber-500`}
              >
                <X className="h-4 w-4" />
                <span className="text-sm">No entendida</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        
        <RecordingDetails 
          recording={recording} 
          isOpen={isOpen} 
          onOpenChange={handleOpenChange} 
        />
      </div>
    </Layout>
  );
}
