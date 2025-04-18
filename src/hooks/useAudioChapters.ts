
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
const mapAudioChapterToDb = (chapter: AudioChapter): any => ({
  id: chapter.id,
  title: chapter.title,
  start_time: chapter.startTime,
  end_time: chapter.endTime,
  color: chapter.color,
  recording_id: chapter.recording_id
});

export function useAudioChapters(recordingId: string) {
  const [chapters, setChapters] = useState<AudioChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load chapters from database
  useEffect(() => {
    const loadChapters = async () => {
      try {
        const { data, error } = await supabase
          .from('audio_chapters')
          .select('*')
          .eq('recording_id', recordingId)
          .order('start_time', { ascending: true });

        if (error) throw error;

        // Map database fields to our interface fields
        const mappedChapters: AudioChapter[] = (data || []).map(mapDbToAudioChapter);

        setChapters(mappedChapters);
      } catch (error) {
        console.error('Error loading chapters:', error);
        toast.error('Error al cargar los capítulos');
      } finally {
        setIsLoading(false);
      }
    };

    if (recordingId) {
      loadChapters();
    }
  }, [recordingId]);

  const createChapter = async (startTime: number, endTime: number, title?: string) => {
    try {
      const newChapter: AudioChapter = {
        id: uuidv4(),
        title: title || `Capítulo ${chapters.length + 1}`,
        startTime,
        endTime,
        color: defaultChapterColors[chapters.length % defaultChapterColors.length],
        recording_id: recordingId
      };

      // Map our interface fields to database fields
      const dbChapter = mapAudioChapterToDb(newChapter);

      const { error } = await supabase
        .from('audio_chapters')
        .insert(dbChapter);

      if (error) throw error;

      setChapters(prev => [...prev, newChapter]);
      toast.success('Capítulo creado correctamente');
      
      return newChapter;
    } catch (error) {
      console.error('Error creating chapter:', error);
      toast.error('Error al crear el capítulo');
      return null;
    }
  };

  const updateChapter = async (chapterId: string, updates: Partial<AudioChapter>) => {
    try {
      // Map our interface fields to database fields
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
      if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
      if (updates.color !== undefined) dbUpdates.color = updates.color;

      const { error } = await supabase
        .from('audio_chapters')
        .update(dbUpdates)
        .eq('id', chapterId);

      if (error) throw error;

      setChapters(prev => prev.map(ch => 
        ch.id === chapterId ? { ...ch, ...updates } : ch
      ));
      
      toast.success('Capítulo actualizado');
      return true;
    } catch (error) {
      console.error('Error updating chapter:', error);
      toast.error('Error al actualizar el capítulo');
      return false;
    }
  };

  const deleteChapter = async (chapterId: string) => {
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

  return {
    chapters,
    isLoading,
    createChapter,
    updateChapter,
    deleteChapter
  };
}
