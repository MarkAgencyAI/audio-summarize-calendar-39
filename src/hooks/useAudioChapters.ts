import { useState, useEffect } from 'react';
import { AudioChapter, defaultChapterColors } from '@/types/audio-chapter';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

// Map database fields (snake_case) to our interface fields (camelCase)
const mapDbToAudioChapter = (chapter: any): AudioChapter => ({
  id: chapter.id,
  title: chapter.title,
  startTime: chapter.start_time,
  endTime: chapter.end_time || undefined,
  color: chapter.color,
  recording_id: chapter.recording_id
});

// Map our interface fields (camelCase) to database fields (snake_case)
const mapAudioChapterToDb = (chapter: AudioChapter) => ({
  id: chapter.id,
  title: chapter.title,
  start_time: chapter.startTime,
  end_time: chapter.endTime,
  color: chapter.color,
  recording_id: chapter.recording_id
});

export function useAudioChapters(recording: Recording, updateRecording: (id: string, data: Partial<Recording>) => void, audioPlayerRef: RefObject<AudioPlayerHandle>) {
  const [chapters, setChapters] = useState<AudioChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showChapterDialog, setShowChapterDialog] = useState(false);
  const [currentChapter, setCurrentChapter] = useState<AudioChapter | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterColor, setNewChapterColor] = useState('');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

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

        if (error) throw error;

        // Map database fields to our interface fields
        const mappedChapters = (data || []).map(mapDbToAudioChapter);
        console.log("Loaded chapters:", mappedChapters);
        
        setChapters(mappedChapters);
        
        // Update recording context with the loaded chapters
        updateRecording(recording.id, {
          chapters: mappedChapters
        });

      } catch (error) {
        console.error('Error loading chapters:', error);
        toast.error('Error al cargar los capítulos');
      } finally {
        setIsLoading(false);
      }
    };

    if (recording.id) {
      loadChapters();
    }
  }, [recording.id]);

  const handleAddChapter = async (startTime: number, endTime?: number) => {
    try {
      const newChapter: AudioChapter = {
        id: uuidv4(),
        title: `Capítulo ${chapters.length + 1}`,
        startTime,
        endTime,
        color: defaultChapterColors[chapters.length % defaultChapterColors.length],
        recording_id: recording.id
      };

      // Map our interface fields to database fields
      const dbChapter = mapAudioChapterToDb(newChapter);

      const { error } = await supabase
        .from('audio_chapters')
        .insert(dbChapter);

      if (error) throw error;

      setChapters(prev => [...prev, newChapter]);
      
      // Update recording context with the new chapter
      updateRecording(recording.id, {
        chapters: [...chapters, newChapter]
      });
      
      toast.success('Capítulo creado correctamente');
      return newChapter;
    } catch (error) {
      console.error('Error creating chapter:', error);
      toast.error('Error al crear el capítulo');
      return null;
    }
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
      const updatedChapter: AudioChapter = {
        ...currentChapter,
        title: newChapterTitle,
        color: newChapterColor
      };
      
      console.log("Guardando capítulo:", updatedChapter);
      
      // Map our interface fields to database fields before sending to Supabase
      const dbChapter = mapAudioChapterToDb(updatedChapter);
      const isExistingChapter = chapters.some(ch => ch.id === updatedChapter.id);
      
      if (isExistingChapter) {
        // Update existing chapter
        const { error } = await supabase
          .from('audio_chapters')
          .update({
            title: dbChapter.title,
            color: dbChapter.color,
            start_time: dbChapter.start_time,
            end_time: dbChapter.end_time
          })
          .eq('id', dbChapter.id);
        
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
        // Insert new chapter
        const { error } = await supabase
          .from('audio_chapters')
          .insert(dbChapter);
        
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

  const handleEditChapter = async (chapterId: string) => {
    const chapter = chapters.find(ch => ch.id === chapterId);
    if (chapter) {
      setCurrentChapter(chapter);
      setShowChapterDialog(true);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    try {
      const { error } = await supabase
        .from('audio_chapters')
        .delete()
        .eq('id', chapterId);

      if (error) throw error;

      setChapters(prev => prev.filter(ch => ch.id !== chapterId));
      toast.success('Capítulo eliminado');
      return true;
    } catch (error) {
      console.error('Error deleting chapter:', error);
      toast.error('Error al eliminar el capítulo');
      return false;
    }
  };

  const handleChapterClick = (chapterId: string) => {
    setActiveChapterId(chapterId);
  };

  return {
    chapters,
    isLoading,
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
