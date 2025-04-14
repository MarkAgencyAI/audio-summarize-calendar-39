
import React, { createContext, useContext, useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";
import { loadFromStorage, saveToStorage } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export interface AudioChapter {
  id: string;
  title: string;
  startTime: number; // en segundos
  endTime?: number; // en segundos (opcional)
  color: string;
}

export interface TextHighlight {
  id: string;
  text: string;
  color: string;
  startPosition: number;
  endPosition: number;
}

export interface SuggestedEvent {
  title: string;
  description: string;
  date?: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date?: string;
}

export interface Recording {
  id: string;
  name: string;
  date: string;
  duration: number;
  audioUrl?: string;
  audioData: string; // Change from Uint8Array to string for compatibility
  output?: string;
  folderId: string;
  language?: string;
  subject?: string;
  webhookData?: any;
  highlights?: TextHighlight[];
  suggestedEvents?: SuggestedEvent[];
  chapters?: AudioChapter[];
  speakerMode?: 'single' | 'multiple';
  createdAt?: string;
  updatedAt?: string;
  understood?: boolean;
  events?: Event[];
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Grade {
  id: string;
  name: string;
  score: number;
  folderId: string;
  createdAt: string;
}

export interface RecordingsContextType {
  recordings: Recording[];
  folders: Folder[];
  addRecording: (recording: Omit<Recording, "id">) => void;
  addFolder: (folder: Omit<Folder, "id">) => void;
  updateFolder: (id: string, data: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  updateRecording: (id: string, data: Partial<Recording>) => void;
  deleteRecording: (id: string) => void;
  notes: Note[];
  addNote: (note: Omit<Note, "id" | "createdAt">) => void;
  updateNote: (id: string, data: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  getFolderNotes: (folderId: string) => Note[];
  getFolderGrades: (folderId: string) => Grade[];
  calculateFolderAverage: (folderId: string) => number;
  addGrade: (folderId: string, name: string, score: number) => void;
  deleteGrade: (id: string) => void;
  addEvent: (event: Omit<Event, "id">) => Promise<void>;
  updateEvent: (id: string, data: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEvents: () => Event[];
  refreshData: () => Promise<void>;
  isLoading: boolean;
}

const RecordingsContext = createContext<RecordingsContextType | undefined>(undefined);

export const useRecordings = () => {
  const context = useContext(RecordingsContext);
  if (!context) {
    throw new Error("useRecordings must be used within a RecordingsProvider");
  }
  return context;
};

export const RecordingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Función para cargar todos los datos desde Supabase
  const loadUserData = async () => {
    if (!user) {
      // Limpiar datos si no hay usuario
      setRecordings([]);
      setFolders([]);
      setNotes([]);
      setGrades([]);
      setEvents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Cargar carpetas
      const { data: foldersData, error: foldersError } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: true });

      if (foldersError) throw foldersError;
      
      // Convertir el formato de Supabase al formato de la aplicación
      const formattedFolders: Folder[] = (foldersData || []).map(folder => ({
        id: folder.id,
        name: folder.name,
        color: folder.color,
        icon: folder.icon,
        createdAt: folder.created_at
      }));
      
      setFolders(formattedFolders);

      // Cargar grabaciones
      const { data: recordingsData, error: recordingsError } = await supabase
        .from('recordings')
        .select('*')
        .order('created_at', { ascending: false });

      if (recordingsError) throw recordingsError;
      
      // Convertir el formato de Supabase al formato de la aplicación
      const formattedRecordings: Recording[] = (recordingsData || []).map(recording => ({
        id: recording.id,
        name: recording.name,
        date: recording.date,
        duration: recording.duration,
        audioData: "", // Necesario porque no se almacena en Supabase
        folderId: recording.folder_id,
        output: recording.output,
        language: recording.language,
        subject: recording.subject,
        webhookData: recording.webhook_data,
        speakerMode: recording.speaker_mode as 'single' | 'multiple',
        understood: recording.understood || false,
        createdAt: recording.created_at,
        updatedAt: recording.updated_at
      }));
      
      setRecordings(formattedRecordings);

      // Cargar notas
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;
      
      // Convertir el formato de Supabase al formato de la aplicación
      const formattedNotes: Note[] = (notesData || []).map(note => ({
        id: note.id,
        title: note.title,
        content: note.content,
        folderId: note.folder_id,
        imageUrl: note.image_url,
        createdAt: note.created_at,
        updatedAt: note.updated_at
      }));
      
      setNotes(formattedNotes);

      // Cargar calificaciones
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .order('created_at', { ascending: false });

      if (gradesError) throw gradesError;
      
      // Convertir el formato de Supabase al formato de la aplicación
      const formattedGrades: Grade[] = (gradesData || []).map(grade => ({
        id: grade.id,
        name: grade.name,
        score: grade.score,
        folderId: grade.folder_id,
        createdAt: grade.created_at
      }));
      
      setGrades(formattedGrades);

      // Cargar eventos
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;
      
      // Convertir el formato de Supabase al formato de la aplicación
      const formattedEvents: Event[] = (eventsData || []).map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date
      }));
      
      setEvents(formattedEvents);

      console.log('Todos los datos cargados correctamente');
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  // Función pública para recargar datos
  const refreshData = async () => {
    await loadUserData();
    toast.success('Datos actualizados');
  };

  // Cargar datos cuando el usuario inicia sesión o cambia
  useEffect(() => {
    loadUserData();
  }, [user]);

  // Configurar actualización automática con Supabase Realtime
  useEffect(() => {
    if (!user) return;

    // Suscribirse a cambios en la tabla recordings
    const recordingsChannel = supabase
      .channel('public:recordings')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'recordings'
      }, () => {
        loadUserData();
      })
      .subscribe();

    // Suscribirse a cambios en la tabla folders
    const foldersChannel = supabase
      .channel('public:folders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'folders'
      }, () => {
        loadUserData();
      })
      .subscribe();

    // Suscribirse a cambios en la tabla notes
    const notesChannel = supabase
      .channel('public:notes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notes'
      }, () => {
        loadUserData();
      })
      .subscribe();

    // Suscribirse a cambios en la tabla grades
    const gradesChannel = supabase
      .channel('public:grades')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'grades'
      }, () => {
        loadUserData();
      })
      .subscribe();

    // Suscribirse a cambios en la tabla events
    const eventsChannel = supabase
      .channel('public:events')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'events'
      }, () => {
        loadUserData();
      })
      .subscribe();

    // Limpiar suscripciones al desmontar
    return () => {
      supabase.removeChannel(recordingsChannel);
      supabase.removeChannel(foldersChannel);
      supabase.removeChannel(notesChannel);
      supabase.removeChannel(gradesChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [user]);

  const addRecording = async (recording: Omit<Recording, "id">) => {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .insert({
          name: recording.name,
          date: recording.date,
          duration: recording.duration,
          folder_id: recording.folderId,
          language: recording.language,
          subject: recording.subject,
          webhook_data: recording.webhookData,
          speaker_mode: recording.speakerMode,
          understood: recording.understood || false,
          output: recording.output,
          user_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      const newRecording: Recording = {
        id: data.id,
        name: data.name,
        date: data.date,
        duration: data.duration,
        audioData: recording.audioData, // No se almacena en Supabase
        folderId: data.folder_id,
        language: data.language,
        subject: data.subject,
        webhookData: data.webhook_data,
        speakerMode: data.speaker_mode as 'single' | 'multiple',
        understood: data.understood || false,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        output: data.output
      };

      setRecordings(prev => [...prev, newRecording]);
      toast.success('Grabación guardada correctamente');
      
      return data.id;
    } catch (error) {
      console.error('Error al guardar la grabación:', error);
      toast.error('Error al guardar la grabación');
      return null;
    }
  };

  const updateRecording = async (id: string, data: Partial<Recording>) => {
    try {
      const { error } = await supabase
        .from('recordings')
        .update({
          name: data.name,
          output: data.output,
          language: data.language,
          subject: data.subject,
          understood: data.understood,
          webhook_data: data.webhookData,
          speaker_mode: data.speakerMode,
          folder_id: data.folderId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setRecordings(prev =>
        prev.map(recording =>
          recording.id === id ? { 
            ...recording, 
            ...data,
            updatedAt: new Date().toISOString()
          } : recording
        )
      );
      toast.success('Grabación actualizada correctamente');
    } catch (error) {
      console.error('Error al actualizar la grabación:', error);
      toast.error('Error al actualizar la grabación');
    }
  };

  const deleteRecording = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recordings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRecordings(prev => prev.filter(recording => recording.id !== id));
      toast.success('Grabación eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar la grabación:', error);
      toast.error('Error al eliminar la grabación');
    }
  };

  const addFolder = async (folder: Omit<Folder, "id">) => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .insert({
          name: folder.name,
          color: folder.color,
          icon: folder.icon,
          user_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      const newFolder: Folder = {
        id: data.id,
        name: data.name,
        color: data.color,
        icon: data.icon,
        createdAt: data.created_at
      };

      setFolders(prev => [...prev, newFolder]);
      toast.success('Carpeta creada correctamente');
    } catch (error) {
      console.error('Error al crear la carpeta:', error);
      toast.error('Error al crear la carpeta');
    }
  };

  const updateFolder = async (id: string, data: Partial<Folder>) => {
    try {
      const { error } = await supabase
        .from('folders')
        .update({
          name: data.name,
          color: data.color,
          icon: data.icon
        })
        .eq('id', id);

      if (error) throw error;

      setFolders(prev =>
        prev.map(folder =>
          folder.id === id ? { ...folder, ...data } : folder
        )
      );
      toast.success('Carpeta actualizada correctamente');
    } catch (error) {
      console.error('Error al actualizar la carpeta:', error);
      toast.error('Error al actualizar la carpeta');
    }
  };

  const deleteFolder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRecordings(prev =>
        prev.map(recording =>
          recording.folderId === id
            ? { ...recording, folderId: "default" }
            : recording
        )
      );

      setNotes(prev =>
        prev.map(note =>
          note.folderId === id
            ? { ...note, folderId: "default" }
            : note
        )
      );

      setGrades(prev => prev.filter(grade => grade.folderId !== id));
      setFolders(prev => prev.filter(folder => folder.id !== id));
      toast.success('Carpeta eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar la carpeta:', error);
      toast.error('Error al eliminar la carpeta');
    }
  };

  const addNote = async (note: Omit<Note, "id" | "createdAt">) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          title: note.title,
          content: note.content,
          folder_id: note.folderId,
          image_url: note.imageUrl,
          user_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      const newNote: Note = {
        id: data.id,
        title: data.title,
        content: data.content,
        folderId: data.folder_id,
        imageUrl: data.image_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      setNotes(prev => [...prev, newNote]);
      toast.success('Nota creada correctamente');
      return newNote;
    } catch (error) {
      console.error('Error al crear la nota:', error);
      toast.error('Error al crear la nota');
      return null;
    }
  };

  const updateNote = async (id: string, data: Partial<Note>) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: data.title,
          content: data.content,
          folder_id: data.folderId,
          image_url: data.imageUrl
        })
        .eq('id', id);

      if (error) throw error;

      setNotes(prev =>
        prev.map(note =>
          note.id === id ? { ...note, ...data } : note
        )
      );
      toast.success('Nota actualizada correctamente');
    } catch (error) {
      console.error('Error al actualizar la nota:', error);
      toast.error('Error al actualizar la nota');
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotes(prev => prev.filter(note => note.id !== id));
      toast.success('Nota eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar la nota:', error);
      toast.error('Error al eliminar la nota');
    }
  };

  const addGrade = async (folderId: string, name: string, score: number) => {
    try {
      const { data, error } = await supabase
        .from('grades')
        .insert({
          name,
          score,
          folder_id: folderId,
          user_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      const newGrade: Grade = {
        id: data.id,
        name: data.name,
        score: data.score,
        folderId: data.folder_id,
        createdAt: data.created_at
      };

      setGrades(prev => [...prev, newGrade]);
      toast.success('Calificación agregada correctamente');
    } catch (error) {
      console.error('Error al agregar la calificación:', error);
      toast.error('Error al agregar la calificación');
    }
  };

  const deleteGrade = async (id: string) => {
    try {
      const { error } = await supabase
        .from('grades')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGrades(prev => prev.filter(grade => grade.id !== id));
      toast.success('Calificación eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar la calificación:', error);
      toast.error('Error al eliminar la calificación');
    }
  };

  // NUEVOS MÉTODOS PARA MANEJAR EVENTOS
  
  const addEvent = async (event: Omit<Event, "id">) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: event.title,
          description: event.description,
          date: event.date,
          user_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      const newEvent: Event = {
        id: data.id,
        title: data.title,
        description: data.description,
        date: data.date
      };

      setEvents(prev => [...prev, newEvent]);
      toast.success('Evento creado correctamente');
    } catch (error) {
      console.error('Error al crear el evento:', error);
      toast.error('Error al crear el evento');
    }
  };

  const updateEvent = async (id: string, data: Partial<Event>) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: data.title,
          description: data.description,
          date: data.date
        })
        .eq('id', id);

      if (error) throw error;

      setEvents(prev =>
        prev.map(event =>
          event.id === id ? { ...event, ...data } : event
        )
      );
      toast.success('Evento actualizado correctamente');
    } catch (error) {
      console.error('Error al actualizar el evento:', error);
      toast.error('Error al actualizar el evento');
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEvents(prev => prev.filter(event => event.id !== id));
      toast.success('Evento eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar el evento:', error);
      toast.error('Error al eliminar el evento');
    }
  };

  const getEvents = () => {
    return events;
  };

  const getFolderNotes = (folderId: string) => {
    return notes.filter(note => note.folderId === folderId);
  };

  const getFolderGrades = (folderId: string) => {
    return grades.filter(grade => grade.folderId === folderId);
  };

  const calculateFolderAverage = (folderId: string) => {
    const folderGrades = getFolderGrades(folderId);
    if (folderGrades.length === 0) return 0;
    
    const sum = folderGrades.reduce((acc, grade) => acc + grade.score, 0);
    return sum / folderGrades.length;
  };

  const value = {
    recordings,
    folders,
    addRecording,
    updateRecording,
    deleteRecording,
    addFolder,
    updateFolder,
    deleteFolder,
    notes,
    addNote,
    updateNote,
    deleteNote,
    getFolderNotes,
    getFolderGrades,
    calculateFolderAverage,
    addGrade,
    deleteGrade,
    addEvent,
    updateEvent,
    deleteEvent,
    getEvents,
    refreshData,
    isLoading
  };

  return (
    <RecordingsContext.Provider value={value}>
      {children}
    </RecordingsContext.Provider>
  );
};
