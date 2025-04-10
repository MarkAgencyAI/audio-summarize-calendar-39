
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/lib/utils";
import { MoreVertical, Calendar, FileText, Download, Trash2, User, Users, Headphones } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useRecordings } from "@/context/RecordingsContext";
import { toast } from "sonner";
import { formatTime } from "@/lib/audio-utils";
import { AudioPlayer } from "@/components/AudioPlayer";
import { loadAudioFromStorage } from "@/lib/storage";

// Extend or recreate the component by adding the display of speaker mode icons
export function RecordingItem({ recording, onAddToCalendar }) {
  const navigate = useNavigate();
  const { deleteRecording } = useRecordings();
  const [isOpen, setIsOpen] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const handleOpenDetails = () => {
    navigate(`/recordings/${recording.id}`);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    
    try {
      const link = document.createElement('a');
      link.href = recording.audioUrl;
      link.download = `${recording.name || 'recording'}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Grabación descargada correctamente');
    } catch (error) {
      console.error('Error downloading recording:', error);
      toast.error('Error al descargar la grabación');
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que quieres eliminar esta grabación?')) {
      deleteRecording(recording.id);
      toast.success('Grabación eliminada correctamente');
    }
  };

  const handleAddToCalendar = (e) => {
    e.stopPropagation();
    onAddToCalendar(recording);
  };

  const toggleAudioPlayer = async (e) => {
    e.stopPropagation();
    
    if (!showPlayer) {
      setIsLoadingAudio(true);
      try {
        // Try to load audio from IndexedDB storage first
        const storedAudio = await loadAudioFromStorage(recording.id);
        
        if (storedAudio) {
          setAudioBlob(storedAudio);
        } else {
          // If not in storage, try to fetch from URL
          const response = await fetch(recording.audioUrl);
          if (response.ok) {
            const blob = await response.blob();
            setAudioBlob(blob);
          } else {
            throw new Error("No se pudo cargar el audio");
          }
        }
      } catch (error) {
        console.error("Error loading audio:", error);
        toast.error("Error al cargar el audio");
      } finally {
        setIsLoadingAudio(false);
      }
    }
    
    setShowPlayer(!showPlayer);
  };

  // Determine icon based on speaker mode
  const speakerIcon = recording.speakerMode === 'multiple' 
    ? <Users className="h-4 w-4 text-blue-500" /> 
    : <User className="h-4 w-4 text-green-500" />;
  
  const speakerLabel = recording.speakerMode === 'multiple' 
    ? "Múltiples oradores" 
    : "Un orador";

  // Safely format the date (recording.date or recording.createdAt might be undefined or invalid)
  const formattedDate = recording.date 
    ? formatDate(recording.date) 
    : (recording.createdAt ? formatDate(recording.createdAt) : "Fecha desconocida");

  return (
    <div className="border-b last:border-b-0 dark:border-gray-700">
      <div 
        className="py-3 hover:bg-secondary/10 transition-colors cursor-pointer"
        onClick={handleOpenDetails}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {speakerIcon}
              <h3 className="text-base font-medium truncate">{recording.name || "Sin nombre"}</h3>
            </div>
            
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{formattedDate}</span>
              <span>•</span>
              <span>{formatTime(recording.duration || 0)}</span>
              <span>•</span>
              <span>{recording.subject || "Sin materia"}</span>
              <span>•</span>
              <span>{speakerLabel}</span>
            </div>
            
            {recording.output && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {recording.output}
              </p>
            )}
          </div>

          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleAudioPlayer}
              aria-label={showPlayer ? "Ocultar reproductor" : "Mostrar reproductor"}
              className="h-8 w-8"
            >
              {isLoadingAudio ? (
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Headphones className="h-4 w-4" />
              )}
            </Button>
            
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Opciones</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleOpenDetails}>
                  <FileText className="h-4 w-4 mr-2" />
                  Ver detalles
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAddToCalendar}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Añadir al calendario
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar audio
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {showPlayer && (
        <div className="p-3 bg-secondary/5 rounded-b-md">
          <AudioPlayer 
            audioUrl={recording.audioUrl} 
            audioBlob={audioBlob || undefined}
            initialDuration={recording.duration}
          />
        </div>
      )}
    </div>
  );
}
