
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useRecordings } from "@/context/RecordingsContext";
import { RecordingDetails } from "@/components/RecordingDetails";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeft, Check, X } from "lucide-react";
import { loadAudioFromStorage } from "@/lib/storage";
import { toast } from "sonner";

export default function RecordingDetailsPage() {
  const { recordingId } = useParams<{ recordingId: string }>();
  const navigate = useNavigate();
  const { recordings, updateRecording } = useRecordings();
  const [isOpen, setIsOpen] = useState(true);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  
  // Find the recording
  const recording = recordings.find(r => r.id === recordingId);
  
  // If recording not found, redirect to dashboard
  useEffect(() => {
    if (!recording) {
      navigate("/dashboard");
    }
  }, [recording, navigate]);
  
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
  
  if (!recording) {
    return null;
  }
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
          </Button>
          
          <div className="flex items-center gap-4">
            <ToggleGroup 
              type="single" 
              value={recording.understood ? "understood" : "not-understood"}
              onValueChange={(value) => {
                if (value) { // Only update if a value is selected (prevents deselection)
                  handleUnderstoodChange(value === "understood");
                }
              }}
              className="border rounded-md overflow-hidden"
            >
              <ToggleGroupItem 
                value="understood" 
                aria-label="Entendida" 
                className={`${recording.understood ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50' : ''} 
                  flex items-center gap-1 px-3 py-1 rounded-l-md h-9 data-[state=on]:border-green-500`}
              >
                <Check className="h-4 w-4" />
                <span className="text-sm">Entendida</span>
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="not-understood" 
                aria-label="No entendida" 
                className={`${!recording.understood ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50' : ''} 
                  flex items-center gap-1 px-3 py-1 rounded-r-md h-9 data-[state=on]:border-amber-500`}
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
