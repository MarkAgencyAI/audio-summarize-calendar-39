
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
const mapAudioChapterToDB = (chapter: AudioChapter): AudioChapterDB => ({
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
        }
      } catch (error) {
        console.error('Error loading chapters:', error);
        toast.error('Error al cargar los capítulos');
      }
    };

    if (recording.id) {
      loadChapters();
    }
  }, [recording.id]);
  
  const handleAddChapter = (startTime: number, endTime?: number) => {
    setNewChapterTitle(`Capítulo ${chapters.length + 1}`);
    setNewChapterColor(chapterColors[chapters.length % chapterColors.length]);
    setCurrentChapter({
      id: uuidv4(),
      title: `Capítulo ${chapters.length + 1}`,
      startTime: startTime,
      endTime: endTime,
      color: chapterColors[chapters.length % chapterColors.length],
      recording_id: recording.id
    });
    setShowChapterDialog(true);
  };

  const handleEditChapter = (chapter: AudioChapter) => {
    setCurrentChapter(chapter);
    setNewChapterTitle(chapter.title);
    setNewChapterColor(chapter.color);
    setShowChapterDialog(true);
  };

  const handleDeleteChapter = async (id: string) => {
    try {
      const { error } = await supabase
        .from('audio_chapters')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      const updatedChapters = chapters.filter(chapter => chapter.id !== id);
      setChapters(updatedChapters);
      
      toast.success("Capítulo eliminado");
    } catch (error) {
      console.error('Error deleting chapter:', error);
      toast.error('Error al eliminar el capítulo');
    }
  };

  const handleSaveChapter = async () => {
    if (!newChapterTitle.trim()) {
      toast.error("El título no puede estar vacío");
      return;
    }
    
    let updatedChapters: AudioChapter[];
    
    if (currentChapter) {
      if (chapters.some(ch => ch.id === currentChapter.id)) {
        // Editing existing chapter
        try {
          // Convert to DB format for update
          const dbChapter = {
            title: newChapterTitle,
            color: newChapterColor,
            start_time: currentChapter.startTime,
            end_time: currentChapter.endTime
          };
          
          const { error } = await supabase
            .from('audio_chapters')
            .update(dbChapter)
            .eq('id', currentChapter.id);
          
          if (error) throw error;
          
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
          
          console.log("Updated chapter in database:", currentChapter.id);
        } catch (error) {
          console.error('Error updating chapter:', error);
          toast.error('Error al actualizar el capítulo');
          return;
        }
      } else {
        // Adding new chapter
        const newChapter: AudioChapter = {
          ...currentChapter,
          title: newChapterTitle,
          color: newChapterColor
        };
        
        try {
          // Convert to DB format for insert
          const dbChapter = mapAudioChapterToDB(newChapter);
          
          // Ensure we're saving to the database
          const { error } = await supabase
            .from('audio_chapters')
            .insert(dbChapter);
          
          if (error) throw error;
          
          updatedChapters = [...chapters, newChapter];
          console.log("Added new chapter to database:", newChapter.id);
        } catch (error) {
          console.error('Error creating chapter:', error);
          toast.error('Error al crear el capítulo');
          return;
        }
      }
    } else {
      // Legacy handling for button click (not fragment selection)
      const newChapter: AudioChapter = {
        id: uuidv4(),
        title: newChapterTitle,
        startTime: 0,
        color: newChapterColor,
        recording_id: recording.id
      };
      
      try {
        // Convert to DB format for insert
        const dbChapter = mapAudioChapterToDB(newChapter);
        
        // Save to database
        const { error } = await supabase
          .from('audio_chapters')
          .insert(dbChapter);
        
        if (error) throw error;
        
        if (chapters.length > 0) {
          const lastChapter = chapters[chapters.length - 1];
          
          // Update end time of previous chapter in DB
          await supabase
            .from('audio_chapters')
            .update({ end_time: 0 })
            .eq('id', lastChapter.id);
            
          updatedChapters = [...chapters];
          updatedChapters[chapters.length - 1] = {
            ...lastChapter,
            endTime: 0
          };
          updatedChapters.push(newChapter);
        } else {
          updatedChapters = [newChapter];
        }
        
        console.log("Created chapter in database:", newChapter.id);
      } catch (error) {
        console.error('Error creating chapter:', error);
        toast.error('Error al crear el capítulo');
        return;
      }
    }
    
    // Sort chapters by start time
    updatedChapters.sort((a, b) => a.startTime - b.startTime);
    setChapters(updatedChapters);
    setShowChapterDialog(false);
    
    // Update the recording's chapters in context
    updateRecording(recording.id, {
      chapters: updatedChapters
    });
    
    toast.success(currentChapter && chapters.some(ch => ch.id === currentChapter.id) 
      ? "Capítulo actualizado" 
      : "Capítulo creado");
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
