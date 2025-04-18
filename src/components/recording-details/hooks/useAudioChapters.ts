import { useState, useEffect, RefObject } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { AudioChapter, Recording } from "@/context/RecordingsContext";
import { AudioPlayerHandle, chapterColors } from "../types";
import { supabase } from "@/integrations/supabase/client";

// Type for database response with snake_case
interface AudioChapterDB {
  id: string;
  title: string;
  start_time: number;
  end_time?: number;
  color: string;
  recording_id: string;
  created_at?: string;
}

// Convert from DB format (snake_case) to app format (camelCase)
const mapDBToAudioChapter = (chapter: AudioChapterDB): AudioChapter => ({
  id: chapter.id,
  title: chapter.title,
  startTime: chapter.start_time,
  endTime: chapter.end_time,
  color: chapter.color,
  recording_id: chapter.recording_id
});

// Convert from app format (camelCase) to DB format (snake_case)
const mapAudioChapterToDB = (chapter: AudioChapter): Omit<AudioChapterDB, 'created_at'> => ({
  id: chapter.id,
  title: chapter.title,
  start_time: chapter.startTime,
  end_time: chapter.endTime,
  color: chapter.color,
  recording_id: chapter.recording_id
});

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
  
  // Load chapters from database
  useEffect(() => {
    const loadChapters = async () => {
      try {
        console.log("Loading chapters for recording ID:", recording.id);
        const { data, error } = await supabase
          .from('audio_chapters')
          .select('*')
          .eq('recording_id', recording.id)
          .order('start_time', { ascending: true });
        
        if (error) {
          throw error;
        }
        
        if (data) {
          // Convert from DB snake_case to app camelCase
          const mappedChapters = data.map(mapDBToAudioChapter);
          setChapters(mappedChapters);
          console.log("Loaded chapters from database:", mappedChapters);
          
          // Also update the recording context with these chapters
          updateRecording(recording.id, {
            chapters: mappedChapters
          });
        }
      } catch (error) {
        console.error('Error loading chapters:', error);
        toast.error('Error al cargar los capítulos');
      }
    };

    if (recording.id) {
      loadChapters();
    }
  }, [recording.id, updateRecording]);
  
  const handleAddChapter = (startTime: number, endTime?: number) => {
    console.log("Adding chapter:", { startTime, endTime });
    const newChapterTitle = `Capítulo ${chapters.length + 1}`;
    const newChapterColor = chapterColors[chapters.length % chapterColors.length];
    
    const newChapter: AudioChapter = {
      id: uuidv4(),
      title: newChapterTitle,
      startTime: startTime,
      endTime: endTime,
      color: newChapterColor,
      recording_id: recording.id
    };

    setCurrentChapter(newChapter);
    setNewChapterTitle(newChapterTitle);
    setNewChapterColor(newChapterColor);
    setShowChapterDialog(true);
  };

  const handleSaveChapter = async () => {
    if (!newChapterTitle.trim()) {
      toast.error("El título no puede estar vacío");
      return;
    }
    
    if (!currentChapter) {
      toast.error("Error al crear el capítulo: falta información");
      return;
    }
    
    try {
      const updatedChapter = {
        ...currentChapter,
        title: newChapterTitle,
        color: newChapterColor
      };
      
      console.log("Guardando capítulo:", updatedChapter);
      
      const isExistingChapter = chapters.some(ch => ch.id === updatedChapter.id);
      
      if (isExistingChapter) {
        const { error } = await supabase
          .from('audio_chapters')
          .update({
            title: updatedChapter.title,
            color: updatedChapter.color,
            start_time: updatedChapter.startTime,
            end_time: updatedChapter.endTime
          })
          .eq('id', updatedChapter.id);
        
        if (error) throw error;
        
        const updatedChapters = chapters.map(ch => 
          ch.id === updatedChapter.id ? updatedChapter : ch
        );
        
        setChapters(updatedChapters);
        updateRecording(recording.id, {
          chapters: updatedChapters
        });
        
        toast.success("Capítulo actualizado");
      } else {
        const { error } = await supabase
          .from('audio_chapters')
          .insert({
            id: updatedChapter.id,
            title: updatedChapter.title,
            start_time: updatedChapter.startTime,
            end_time: updatedChapter.endTime,
            color: updatedChapter.color,
            recording_id: updatedChapter.recording_id
          });
        
        if (error) throw error;
        
        const updatedChapters = [...chapters, updatedChapter];
        setChapters(updatedChapters);
        updateRecording(recording.id, {
          chapters: updatedChapters
        });
        
        toast.success("Capítulo creado");
      }
      
      setShowChapterDialog(false);
      
    } catch (error) {
      console.error('Error saving chapter:', error);
      const errorMessage = chapters.some(ch => ch.id === currentChapter.id) 
        ? 'Error al actualizar el capítulo' 
        : 'Error al crear el capítulo';
      toast.error(errorMessage);
    }
  };

  const handleEditChapter = (chapter: AudioChapter) => {
    setCurrentChapter(chapter);
    setNewChapterTitle(chapter.title);
    setNewChapterColor(chapter.color);
    setShowChapterDialog(true);
  };

  const handleDeleteChapter = async (id: string) => {
    try {
      console.log("Deleting chapter with ID:", id);
      const { error } = await supabase
        .from('audio_chapters')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      const updatedChapters = chapters.filter(chapter => chapter.id !== id);
      setChapters(updatedChapters);
      
      // Update the recording context with the updated chapters
      updateRecording(recording.id, {
        chapters: updatedChapters
      });
      
      toast.success("Capítulo eliminado");
    } catch (error) {
      console.error('Error deleting chapter:', error);
      toast.error('Error al eliminar el capítulo');
    }
  };

  const handleChapterClick = (chapter: AudioChapter) => {
    if (audioPlayerRef.current) {
      // Seek to the start of the chapter
      audioPlayerRef.current.seek(chapter.startTime);
      setActiveChapterId(chapter.id);
      
      // Start playback
      audioPlayerRef.current.play();
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
