
import { useState, useEffect, useRef } from "react";
import { Recording, useRecordings } from "@/context/RecordingsContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { loadAudioFromStorage, saveAudioToStorage } from "@/lib/storage";
import { RecordingHeader } from "./RecordingHeader";
import { RecordingDetails as RecordingDetailsType } from "./types";
import { useAudioChapters } from "./hooks/useAudioChapters";
import { useHighlights } from "./hooks/useHighlights";
import { RecordingTabs } from "./RecordingTabs";
import { ChapterDialog } from "./ChapterDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { AudioPlayerV2 } from "./AudioPlayerV2";
import { AudioChaptersTimeline } from "@/components/AudioChapter";
import { AudioPlayerHandle } from "./types";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";

interface RecordingDetailsProps {
  recording: Recording;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RecordingDetails({
  recording,
  isOpen: propIsOpen,
  onOpenChange
}: RecordingDetailsProps) {
  const { updateRecording } = useRecordings();
  const [isOpen, setIsOpenState] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [activeTab, setActiveTab] = useState("transcription");
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(recording.duration || 0);
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);
  const isMobile = useIsMobile();

  // Custom hooks for chapters and highlights
  const {
    chapters,
    activeChapterId,
    setActiveChapterId,
    showChapterDialog,
    setShowChapterDialog,
    currentChapter,
    handleAddChapter,
    handleEditChapter,
    handleDeleteChapter,
    handleSaveChapter,
    handleChapterClick,
    newChapterTitle,
    setNewChapterTitle,
    newChapterColor,
    setNewChapterColor
  } = useAudioChapters(recording, updateRecording, audioPlayerRef);
  
  const {
    highlights,
    handleTextSelection,
    renderHighlightedText
  } = useHighlights(recording, updateRecording);

  // Dialog control
  const dialogOpen = propIsOpen !== undefined ? propIsOpen : isOpen;
  const setDialogOpen = onOpenChange || setIsOpenState;

  // Debug para verificar si hay datos
  useEffect(() => {
    console.log("Recording details:", {
      id: recording.id,
      chapters: recording.chapters || [],
      output: recording.output ? recording.output.substring(0, 100) + "..." : "No output",
      highlights: recording.highlights || [],
      audioUrl: recording.audioUrl || "No URL"
    });
  }, [recording]);

  // Load audio from storage
  useEffect(() => {
    const loadAudio = async () => {
      try {
        const blob = await loadAudioFromStorage(recording.id);
        if (blob) {
          setAudioBlob(blob);
        }
      } catch (error) {
        console.error("Error loading audio from storage:", error);
      }
    };
    loadAudio();
  }, [recording.id]);

  // Save audio to storage if not already there
  useEffect(() => {
    const saveAudio = async () => {
      if (recording.audioUrl && !audioBlob) {
        try {
          const response = await fetch(recording.audioUrl);
          if (response.ok) {
            const blob = await response.blob();
            await saveAudioToStorage(recording.id, blob);
            setAudioBlob(blob);
          }
        } catch (error) {
          console.error("Error saving audio to storage:", error);
        }
      }
    };
    saveAudio();
  }, [recording.audioUrl, recording.id, audioBlob]);

  // Handle audio time updates
  const handleTimeUpdate = (time: number) => {
    setCurrentAudioTime(time);

    // Update active chapter based on current time
    const activeChapter = chapters.find(chapter => 
      time >= chapter.startTime && (!chapter.endTime || time <= chapter.endTime)
    );
    
    if (activeChapter && activeChapter.id !== activeChapterId) {
      setActiveChapterId(activeChapter.id);
    } else if (!activeChapter && activeChapterId) {
      setActiveChapterId(undefined);
    }
  };

  // Create a wrapper function for adding chapters
  const handleAddChapterFromPlayer = (startTime: number, endTime?: number) => {
    handleAddChapter(startTime, endTime);
    toast.success("Fragmento seleccionado para crear capítulo");
  };

  // Make sure we have the chapters from the recording if they exist
  useEffect(() => {
    if (recording.chapters && recording.chapters.length > 0) {
      console.log("Loading saved chapters:", recording.chapters);
    }
  }, [recording.chapters]);

  // Prepare data for child components
  const recordingDetailsData: RecordingDetailsType = {
    recording,
    highlights: highlights || [],
    chapters: chapters || [],
    activeChapterId,
    currentAudioTime,
    audioDuration,
    activeTab,
    renderHighlightedText,
    updateRecording
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="p-0 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg w-[95vw] md:w-[90vw] lg:w-[80vw] max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Adding DialogTitle for accessibility but visually hidden */}
        <VisuallyHidden>
          <DialogTitle>Detalles de grabación</DialogTitle>
        </VisuallyHidden>
        
        <div className="flex flex-col w-full h-full">
          {/* Header Area */}
          <div className="p-5 pb-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
            <RecordingHeader recording={recording} />
          </div>
          
          {/* Audio Player Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 flex-shrink-0">
            <AudioPlayerV2 
              audioUrl={recording.audioUrl} 
              audioBlob={audioBlob || undefined}
              initialDuration={recording.duration} 
              onTimeUpdate={handleTimeUpdate} 
              ref={audioPlayerRef}
              onDurationChange={setAudioDuration}
              onAddChapter={handleAddChapterFromPlayer}
            />
            
            {chapters && chapters.length > 0 && (
              <div className="mt-3 max-w-full overflow-hidden">
                <AudioChaptersTimeline 
                  chapters={chapters} 
                  duration={audioDuration} 
                  currentTime={currentAudioTime} 
                  onChapterClick={handleChapterClick}
                />
              </div>
            )}
          </div>
          
          {/* Content Area */}
          <div className="flex-grow overflow-hidden min-h-0">
            <RecordingTabs 
              data={recordingDetailsData} 
              onTabChange={setActiveTab} 
              onTextSelection={handleTextSelection} 
              onEditChapter={handleEditChapter} 
              onDeleteChapter={handleDeleteChapter} 
            />
          </div>
        </div>
      </DialogContent>
      
      <ChapterDialog 
        isOpen={showChapterDialog} 
        onOpenChange={setShowChapterDialog} 
        currentChapter={currentChapter} 
        chapters={chapters} 
        title={newChapterTitle} 
        setTitle={setNewChapterTitle} 
        color={newChapterColor} 
        setColor={setNewChapterColor} 
        onSave={handleSaveChapter} 
        currentTime={currentAudioTime} 
      />
    </Dialog>
  );
}
