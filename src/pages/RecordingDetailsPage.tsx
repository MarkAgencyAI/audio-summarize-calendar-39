import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useRecordings } from "@/context/RecordingsContext";
import { RecordingDetails } from "@/components/recording-details";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeft, Check, X, Clock, Loader2, Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { loadAudioFromStorage } from "@/lib/storage";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RecordingService } from "@/lib/services/recording-service";

export default function RecordingDetailsPage() {
  const { recordingId } = useParams<{ recordingId: string }>();
  const navigate = useNavigate();
  const { recordings, updateRecording, deleteRecording, refreshData, isLoading } = useRecordings();
  const [isOpen, setIsOpen] = useState(true);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [refreshAttempt, setRefreshAttempt] = useState(0);
  const [loadingTimeout, setLoadingTimeout] = useState<number | null>(null);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isPageLoading) {
        setIsPageLoading(false);
        console.log("Forced loading to complete after timeout");
      }
    }, 5000);
    
    setLoadingTimeout(timeout);
    
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [isPageLoading]);
  
  // Single data fetch effect
  useEffect(() => {
    if (!recordingId || hasLoadedData) return;

    const loadData = async () => {
      try {
        console.log("Cargando datos una sola vez para grabación:", recordingId);
        await refreshData();
        setHasLoadedData(true);
        setIsPageLoading(false);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        toast.error("Error al cargar los datos más recientes");
        if (refreshAttempt < 2) {
          setRefreshAttempt(prev => prev + 1);
        }
        setIsPageLoading(false);
      }
    };
    
    loadData();
  }, [recordingId]);
  
  const recording = recordings.find(r => r.id === recordingId);
  
  useEffect(() => {
    if (!recording && !isLoading) {
      if (refreshAttempt < 2) {
        console.log("Grabación no encontrada, intentando recargar datos");
        const retryLoad = async () => {
          try {
            await refreshData();
            setRefreshAttempt(prev => prev + 1);
          } catch (error) {
            console.error("Error al recargar datos:", error);
            navigate("/dashboard");
          }
        };
        retryLoad();
      } else {
        console.log("Grabación no encontrada después de varios intentos, redirigiendo al dashboard");
        toast.error("No se pudo encontrar la grabación solicitada");
        navigate("/dashboard");
      }
      return;
    }

    if (recording) {
      setIsPageLoading(false);
    }
  }, [recording, navigate, isLoading, refreshAttempt, refreshData]);
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      navigate("/dashboard");
    }
  };
  
  useEffect(() => {
    if (recording) {
      const preloadAudio = async () => {
        try {
          const audioBlob = await loadAudioFromStorage(recording.id);
          if (!audioBlob && recording.audioUrl) {
            const response = await fetch(recording.audioUrl);
            if (response.ok) {
              setIsAudioLoaded(true);
            } else {
              toast.error("No se pudo cargar el audio");
            }
          } else if (audioBlob) {
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
      RecordingService.updateRecording(recording.id, { understood });
      toast.success(understood ? "Marcada como entendida" : "Marcada como no entendida");
    }
  };
  
  const handleDeleteRecording = () => {
    if (recording) {
      deleteRecording(recording.id);
      toast.success("Grabación eliminada");
      navigate("/dashboard");
    }
  };
  
  const handleDeleteEvent = (eventId: string) => {
    if (recording) {
      const currentEvents = (recording.events as any[] || []);
      const updatedEvents = currentEvents.filter(event => event.id !== eventId);
      
      RecordingService.updateRecording(recording.id, { 
        events: updatedEvents 
      } as any);
      
      toast.success("Evento eliminado");
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
  
  const handleManualRefresh = async () => {
    setIsPageLoading(true);
    try {
      await refreshData();
      toast.success("Datos actualizados correctamente");
    } catch (error) {
      console.error("Error al actualizar datos:", error);
      toast.error("Error al actualizar los datos");
    } finally {
      setIsPageLoading(false);
    }
  };
  
  const hasMissingData = recording && 
    (!recording.output || recording.output.trim() === "" || 
     !recording.webhookData);
  
  if (isPageLoading || isLoading || !recording) {
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

  // Reset hasLoadedData when recordingId changes
  useEffect(() => {
    setHasLoadedData(false);
  }, [recordingId]);
  
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              className="flex items-center gap-1"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center mr-2">
              <Clock className="h-3.5 w-3.5 mr-1" />
              <span>{getRelativeTime(recording.createdAt || recording.date)}</span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-1 border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Eliminar</span>
            </Button>
            
            <ToggleGroup 
              type="single" 
              value={recording.understood ? "understood" : "not-understood"}
              onValueChange={(value) => {
                if (value) {
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
        
        {hasMissingData && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Datos incompletos</AlertTitle>
            <AlertDescription>
              Esta grabación puede tener datos incompletos. Si falta la transcripción o el resumen, prueba a actualizar la página.
            </AlertDescription>
          </Alert>
        )}
        
        <RecordingDetails 
          recording={recording} 
          isOpen={isOpen} 
          onOpenChange={handleOpenChange}
          onDeleteEvent={handleDeleteEvent} 
        />
      </div>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar grabación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar esta grabación? Esta acción no puede deshacerse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecording} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
