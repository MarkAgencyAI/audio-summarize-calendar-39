import { useState, useEffect, RefObject } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { AudioChapter, Recording } from "@/context/RecordingsContext";
import { AudioPlayerHandle, chapterColors } from "../types";
import { supabase } from "@/integrations/supabase/client";

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
          setChapters(data);
          console.log("Loaded chapters from database:", data);
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
      start_time: startTime,
      end_time: endTime,
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
          const { error } = await supabase
            .from('audio_chapters')
            .update({
              title: newChapterTitle,
              color: newChapterColor,
              start_time: currentChapter.start_time,
              end_time: currentChapter.end_time
            })
            .eq('id', currentChapter.id);
          
          if (error) throw error;
          
          updatedChapters = chapters.map(chapter => 
            chapter.id === currentChapter.id 
              ? { 
                  ...chapter, 
                  title: newChapterTitle, 
                  color: newChapterColor,
                  start_time: currentChapter.start_time,
                  end_time: currentChapter.end_time
                }
              : chapter
          );
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
          const { error } = await supabase
            .from('audio_chapters')
            .insert(newChapter);
          
          if (error) throw error;
          
          updatedChapters = [...chapters, newChapter];
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
        start_time: 0,
        color: newChapterColor,
        recording_id: recording.id
      };
      
      try {
        const { error } = await supabase
          .from('audio_chapters')
          .insert(newChapter);
        
        if (error) throw error;
        
        if (chapters.length > 0) {
          const lastChapter = chapters[chapters.length - 1];
          
          // Update end time of previous chapter
          await supabase
            .from('audio_chapters')
            .update({ end_time: 0 })
            .eq('id', lastChapter.id);
            
          updatedChapters = [...chapters];
          updatedChapters[chapters.length - 1] = {
            ...lastChapter,
            end_time: 0
          };
          updatedChapters.push(newChapter);
        } else {
          updatedChapters = [newChapter];
        }
      } catch (error) {
        console.error('Error creating chapter:', error);
        toast.error('Error al crear el capítulo');
        return;
      }
    }
    
    // Sort chapters by start time
    updatedChapters.sort((a, b) => a.start_time - b.start_time);
    setChapters(updatedChapters);
    setShowChapterDialog(false);
    
    toast.success(currentChapter && chapters.some(ch => ch.id === currentChapter.id) 
      ? "Capítulo actualizado" 
      : "Capítulo creado");
  };

  const handleChapterClick = (chapter: AudioChapter) => {
    if (audioPlayerRef.current) {
      // Seek to the start of the chapter
      audioPlayerRef.current.seek(chapter.start_time);
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
