
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useRecordings } from "@/context/RecordingsContext";
import { RecordingDetails } from "@/components/RecordingDetails";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="understood" 
                checked={recording.understood || false}
                onCheckedChange={(checked) => handleUnderstoodChange(checked as boolean)}
              />
              <label
                htmlFor="understood"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
              >
                {recording.understood ? (
                  <>
                    <span className="text-green-600 font-medium">Entendida</span>
                    <Check className="h-4 w-4 text-green-600" />
                  </>
                ) : (
                  <>
                    <span className="text-amber-600 font-medium">No entendida</span>
                    <X className="h-4 w-4 text-amber-600" />
                  </>
                )}
              </label>
            </div>
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
