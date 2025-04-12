
import { useState, useEffect, useRef } from "react";
import { Recording, useRecordings } from "@/context/RecordingsContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Headphones, FileText, PenLine } from "lucide-react";
import { NotesSection } from "../NotesSection";

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
  const [mainView, setMainView] = useState<"player" | "content" | "notes">("content");
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);
  const isMobile = useIsMobile();

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

  const dialogOpen = propIsOpen !== undefined ? propIsOpen : isOpen;
  const setDialogOpen = onOpenChange || setIsOpenState;

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

  const handleTimeUpdate = (time: number) => {
    setCurrentAudioTime(time);

    const activeChapter = chapters.find(chapter => 
      time >= chapter.startTime && (!chapter.endTime || time <= chapter.endTime)
    );
    
    if (activeChapter && activeChapter.id !== activeChapterId) {
      setActiveChapterId(activeChapter.id);
    } else if (!activeChapter && activeChapterId) {
      setActiveChapterId(undefined);
    }
  };

  const handleAddChapterFromPlayer = (startTime: number, endTime?: number) => {
    handleAddChapter(startTime, endTime);
    toast.success("Fragmento seleccionado para crear capítulo");
  };

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

  const renderPlayerContent = () => (
    <div className="p-4 flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Reproductor de Audio</h3>
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
          <h4 className="text-sm font-medium mb-2">Capítulos</h4>
          <AudioChaptersTimeline 
            chapters={chapters} 
            duration={audioDuration} 
            currentTime={currentAudioTime} 
            onChapterClick={handleChapterClick}
          />
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="p-0 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg w-[95vw] md:w-[90vw] lg:w-[80vw] max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <div className="flex flex-col w-full h-full">
          <div className="p-5 pb-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
            <RecordingHeader recording={recording} />
          </div>
          
          <Tabs 
            value={mainView} 
            onValueChange={(value) => setMainView(value as "player" | "content" | "notes")} 
            className="flex-grow overflow-hidden flex flex-col"
          >
            <div className="px-4 pt-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <TabsList className="grid grid-cols-3 w-full bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
                <TabsTrigger value="player" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                  <Headphones className="h-4 w-4" />
                  <span>Reproductor</span>
                </TabsTrigger>
                <TabsTrigger value="content" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                  <FileText className="h-4 w-4" />
                  <span>Contenido</span>
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                  <PenLine className="h-4 w-4" />
                  <span>Apuntes</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-grow overflow-auto">
              <TabsContent value="player" className="m-0 p-0">
                {renderPlayerContent()}
              </TabsContent>
              
              <TabsContent value="content" className="m-0 p-0">
                <RecordingTabs 
                  data={recordingDetailsData} 
                  onTabChange={setActiveTab} 
                  onTextSelection={handleTextSelection} 
                  onEditChapter={handleEditChapter} 
                  onDeleteChapter={handleDeleteChapter} 
                />
              </TabsContent>

              <TabsContent value="notes" className="m-0 p-0">
                <NotesSection 
                  folderId={recording.folderId} 
                  sectionTitle="Apuntes de esta grabación" 
                />
              </TabsContent>
            </div>
          </Tabs>
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
