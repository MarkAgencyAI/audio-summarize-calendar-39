
import { useState, useEffect, useRef } from "react";
import { Recording, useRecordings } from "@/context/RecordingsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AudioPlayer, AudioPlayerHandle } from "@/components/AudioPlayer";
import { loadAudioFromStorage, saveAudioToStorage } from "@/lib/storage";
import { RecordingHeader } from "./RecordingHeader";
import { RecordingDetails as RecordingDetailsType } from "./types";
import { useAudioChapters } from "./hooks/useAudioChapters";
import { useHighlights } from "./hooks/useHighlights";
import { RecordingTabs } from "./RecordingTabs";
import { AudioChaptersTimeline } from "@/components/AudioChapter";
import { ChapterDialog } from "./ChapterDialog";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [activeTab, setActiveTab] = useState("webhook");
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
    const activeChapter = chapters.find(
      chapter => time >= chapter.startTime && (!chapter.endTime || time <= chapter.endTime)
    );
    
    if (activeChapter && activeChapter.id !== activeChapterId) {
      setActiveChapterId(activeChapter.id);
    } else if (!activeChapter && activeChapterId) {
      setActiveChapterId(undefined);
    }
  };

  // Prepare data for child components
  const recordingDetailsData: RecordingDetailsType = {
    recording,
    highlights,
    chapters,
    activeChapterId,
    currentAudioTime,
    audioDuration,
    activeTab,
    renderHighlightedText,
    updateRecording
  };

  // Responsive layout classes
  const dialogSizeClass = isMobile 
    ? "w-[95vw]" 
    : "max-w-4xl md:w-auto";
  
  const contentPaddingClass = isMobile
    ? "px-2 py-3"
    : "px-2 sm:px-4 py-4";

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={`${dialogSizeClass} h-[90vh] flex flex-col dark:bg-[#001A29] dark:border-custom-secondary overflow-hidden`}>
          <ScrollArea className="flex-1 w-full pr-2 custom-scrollbar">
            <div className={`${contentPaddingClass} w-full recording-content`}>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <RecordingHeader recording={recording} />
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Detalles de la grabación y datos procesados
                </DialogDescription>
              </DialogHeader>
              
              <Separator className="my-2 dark:bg-custom-secondary/40" />
              
              <div className="my-4 w-full max-w-full overflow-hidden">
                <AudioPlayer 
                  audioUrl={recording.audioUrl} 
                  audioBlob={audioBlob || undefined}
                  initialDuration={recording.duration}
                  onTimeUpdate={handleTimeUpdate}
                  ref={audioPlayerRef}
                  onDurationChange={setAudioDuration}
                  onAddChapter={handleAddChapter}
                />
                
                <div className="mt-2 max-w-full overflow-hidden">
                  <AudioChaptersTimeline 
                    chapters={chapters}
                    duration={audioDuration}
                    currentTime={currentAudioTime}
                    onChapterClick={handleChapterClick}
                  />
                </div>
              </div>
              
              <div className="pt-2 sm:pt-4 w-full max-w-full overflow-hidden">
                <RecordingTabs 
                  data={recordingDetailsData}
                  onTabChange={setActiveTab}
                  onTextSelection={handleTextSelection}
                  onEditChapter={handleEditChapter}
                  onDeleteChapter={handleDeleteChapter}
                />
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
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
    </>
  );
}
