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
import { AudioPlayerHandle } from "./types";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Headphones, FileText, PenLine } from "lucide-react";
import { NotesSection } from "../NotesSection";

interface RecordingDetailsProps {
  recording: Recording;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDeleteEvent?: (eventId: string) => void;
}

export function RecordingDetails({
  recording,
  isOpen: propIsOpen,
  onOpenChange,
  onDeleteEvent
}: RecordingDetailsProps) {
  const { updateRecording } = useRecordings();
  const [isOpen, setIsOpenState] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [activeTab, setActiveTab] = useState("transcription");
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(recording.duration || 0);
  const [mainView, setMainView] = useState<"content" | "notes" | "player">("content");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);
  const isMobile = useIsMobile();
  const hasLoadedAudioRef = useRef(false);
  const isLoadingAudioRef = useRef(false);

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

  // Esta función se encarga de cargar el audio, ya sea desde la caché o descargándolo de la URL
  const loadAudio = async () => {
    try {
      if (hasLoadedAudioRef.current || !recording.id || isLoadingAudioRef.current) return;
      
      isLoadingAudioRef.current = true;
      console.log("Intentando cargar audio para:", recording.id);
      
      try {
        // Primero intentamos cargar desde IndexedDB
        const blob = await loadAudioFromStorage(recording.id);
        if (blob) {
          console.log("Audio cargado desde IndexedDB");
          setAudioBlob(blob);
          hasLoadedAudioRef.current = true;
          isLoadingAudioRef.current = false;
          return;
        }
      } catch (storageError) {
        console.warn("Error al cargar desde IndexedDB:", storageError);
      }
      
      // Si no está en IndexedDB y tenemos una URL, lo descargamos
      if (recording.audioUrl) {
        console.log("Descargando audio desde URL:", recording.audioUrl);
        try {
          const response = await fetch(recording.audioUrl);
          if (response.ok) {
            const blob = await response.blob();
            // Guardamos en IndexedDB para la próxima vez
            await saveAudioToStorage(recording.id, blob);
            setAudioBlob(blob);
            hasLoadedAudioRef.current = true;
            console.log("Audio descargado y guardado correctamente");
          } else {
            console.error("Error al descargar audio:", response.status);
            toast.error("Error al cargar el audio. Por favor, intenta de nuevo.");
          }
        } catch (fetchError) {
          console.error("Error al descargar audio:", fetchError);
          toast.error("Error de conexión al cargar el audio.");
        }
      } else {
        console.warn("No se encontró audio para la grabación");
      }
    } catch (error) {
      console.error("Error cargando audio:", error);
    } finally {
      isLoadingAudioRef.current = false;
    }
  };
  
  // Usamos un efecto para cargar el audio cuando el componente se monta o cambia la grabación
  useEffect(() => {
    // Reiniciamos los flags cuando cambia la grabación
    if (recording.id) {
      hasLoadedAudioRef.current = false;
      isLoadingAudioRef.current = false;
      setAudioBlob(null);
      loadAudio();
    }
    
    return () => {
      // Limpieza al desmontar
      if (audioBlob) {
        URL.revokeObjectURL(URL.createObjectURL(audioBlob));
      }
    };
  }, [recording.id, recording.audioUrl]);

  // Efecto adicional que se asegura de que el audio se cargue cuando se abre el diálogo
  useEffect(() => {
    if (dialogOpen && !hasLoadedAudioRef.current && !isLoadingAudioRef.current) {
      loadAudio();
    }
  }, [dialogOpen]);

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
    console.log("Adding chapter from player:", { startTime, endTime });
    handleAddChapter(startTime, endTime);
    toast.success("Fragmento seleccionado para crear capítulo");
    setIsSelectionMode(false);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (!isSelectionMode) {
      toast.info("Selecciona una sección de audio para crear un capítulo");
    }
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
    updateRecording,
    onDeleteEvent
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="p-0 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg w-[95vw] md:w-[90vw] lg:w-[80vw] max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <div className="flex flex-col w-full h-full">
          <div className="p-5 pb-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
            <RecordingHeader recording={recording} onDeleteEvent={onDeleteEvent} />
          </div>
          
          {/* Main tabs - Content, Notes, Player */}
          <Tabs 
            value={mainView} 
            onValueChange={(value) => setMainView(value as "content" | "notes" | "player")} 
            className="flex-grow overflow-hidden flex flex-col"
          >
            <div className="px-4 pt-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <TabsList className="grid grid-cols-3 w-full bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
                <TabsTrigger value="content" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                  <FileText className="h-4 w-4" />
                  <span>Contenido</span>
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                  <PenLine className="h-4 w-4" />
                  <span>Apuntes</span>
                </TabsTrigger>
                <TabsTrigger value="player" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                  <Headphones className="h-4 w-4" />
                  <span>Reproductor</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-grow overflow-auto">
              <TabsContent value="content" className="m-0 p-0 h-full">
                <RecordingTabs 
                  data={recordingDetailsData} 
                  onTabChange={setActiveTab} 
                  onTextSelection={handleTextSelection} 
                  onEditChapter={handleEditChapter} 
                  onDeleteChapter={handleDeleteChapter} 
                />
              </TabsContent>

              <TabsContent value="notes" className="m-0 p-0 h-full">
                <NotesSection 
                  folderId={recording.folderId} 
                  sectionTitle="Apuntes de esta grabación" 
                />
              </TabsContent>
              
              <TabsContent value="player" className="m-0 p-4 h-full overflow-y-auto">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Reproductor de Audio</h2>
                  <AudioPlayerV2 
                    audioUrl={recording.audioUrl} 
                    audioBlob={audioBlob || undefined}
                    initialDuration={recording.duration} 
                    onTimeUpdate={handleTimeUpdate} 
                    ref={audioPlayerRef}
                    onDurationChange={setAudioDuration}
                    onAddChapter={handleAddChapterFromPlayer}
                    chapters={chapters}
                    isSelectionMode={isSelectionMode}
                    onChapterClick={handleChapterClick}
                    onToggleSelectionMode={toggleSelectionMode}
                  />
                </div>
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
