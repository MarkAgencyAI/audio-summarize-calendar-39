
import { useState, useEffect, RefObject } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { AudioChapter, Recording } from "@/context/RecordingsContext";
import { chapterColors } from "../types";
import { AudioPlayerHandle } from "../types";

export function useAudioChapters(
  recording: Recording,
  updateRecording: (id: string, data: Partial<Recording>) => void,
  audioPlayerRef: RefObject<AudioPlayerHandle>
) {
  // Initialize with chapters from recording if available
  const [chapters, setChapters] = useState<AudioChapter[]>(recording.chapters || []);
  const [showChapterDialog, setShowChapterDialog] = useState(false);
  const [currentChapter, setCurrentChapter] = useState<AudioChapter | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterColor, setNewChapterColor] = useState(chapterColors[0]);
  const [activeChapterId, setActiveChapterId] = useState<string | undefined>(undefined);
  
  // Effect to sync chapters from recording to local state
  useEffect(() => {
    if (recording.chapters && recording.chapters.length > 0) {
      setChapters(recording.chapters);
      console.log("Loaded chapters from recording:", recording.chapters);
    }
  }, [recording.id, recording.chapters]);
  
  const handleAddChapter = (startTime: number, endTime?: number) => {
    setNewChapterTitle(`Capítulo ${chapters.length + 1}`);
    setNewChapterColor(chapterColors[chapters.length % chapterColors.length]);
    setCurrentChapter({
      id: uuidv4(),
      title: `Capítulo ${chapters.length + 1}`,
      startTime: startTime,
      endTime: endTime,
      color: chapterColors[chapters.length % chapterColors.length]
    });
    setShowChapterDialog(true);
  };

  const handleEditChapter = (chapter: AudioChapter) => {
    setCurrentChapter(chapter);
    setNewChapterTitle(chapter.title);
    setNewChapterColor(chapter.color);
    setShowChapterDialog(true);
  };

  const handleDeleteChapter = (id: string) => {
    const updatedChapters = chapters.filter(chapter => chapter.id !== id);
    setChapters(updatedChapters);
    
    updateRecording(recording.id, {
      chapters: updatedChapters
    });
    
    toast.success("Capítulo eliminado");
  };

  const handleSaveChapter = () => {
    if (!newChapterTitle.trim()) {
      toast.error("El título no puede estar vacío");
      return;
    }
    
    let updatedChapters: AudioChapter[];
    
    if (currentChapter) {
      if (chapters.some(ch => ch.id === currentChapter.id)) {
        // Editing existing chapter
        updatedChapters = chapters.map(chapter => 
          chapter.id === currentChapter.id 
            ? { 
                ...chapter, 
                title: newChapterTitle, 
                color: newChapterColor,
                startTime: currentChapter.startTime,
                endTime: currentChapter.endTime
              }
            : chapter
        );
      } else {
        // Adding new chapter with predefined start and end times
        updatedChapters = [...chapters, {
          ...currentChapter,
          title: newChapterTitle,
          color: newChapterColor
        }];
      }
    } else {
      // Legacy handling for button click (not fragment selection)
      const newChapter: AudioChapter = {
        id: uuidv4(),
        title: newChapterTitle,
        startTime: 0, // This will be updated by the component that calls handleSaveChapter
        color: newChapterColor
      };
      
      if (chapters.length > 0) {
        updatedChapters = [...chapters];
        const lastChapterIndex = chapters.length - 1;
        updatedChapters[lastChapterIndex] = {
          ...updatedChapters[lastChapterIndex],
          endTime: 0 // This will be updated by the component that calls handleSaveChapter
        };
        updatedChapters.push(newChapter);
      } else {
        updatedChapters = [newChapter];
      }
    }
    
    // Sort chapters by start time
    updatedChapters.sort((a, b) => a.startTime - b.startTime);
    
    setChapters(updatedChapters);
    
    updateRecording(recording.id, {
      chapters: updatedChapters
    });
    
    setShowChapterDialog(false);
    toast.success(currentChapter && chapters.some(ch => ch.id === currentChapter.id) 
      ? "Capítulo actualizado" 
      : "Capítulo creado");
  };

  const handleChapterClick = (chapter: AudioChapter) => {
    if (audioPlayerRef.current && audioPlayerRef.current.seekTo) {
      audioPlayerRef.current.seekTo(chapter.startTime);
      setActiveChapterId(chapter.id);
    }
  };

  return {
    chapters,
    setChapters,
    showChapterDialog,
    setShowChapterDialog,
    currentChapter,
    setCurrentChapter,
    newChapterTitle,
    setNewChapterTitle,
    newChapterColor,
    setNewChapterColor,
    activeChapterId,
    setActiveChapterId,
    handleAddChapter,
    handleEditChapter,
    handleDeleteChapter,
    handleSaveChapter,
    handleChapterClick
  };
}
