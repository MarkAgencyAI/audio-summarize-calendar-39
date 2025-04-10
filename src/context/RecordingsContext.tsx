
import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveToStorage, loadFromStorage } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { v4 as uuidv4 } from 'uuid';

// Define the Recording interface for TypeScript
export interface Recording {
  id: string;
  name: string;
  audioUrl?: string; // URL for the audio file
  audioData?: string; // Base64 encoded audio data
  output?: string; // Transcript or other output
  folderId: string;
  date?: string;
  duration?: number;
  subject?: string;
  language?: string;
  speakerMode?: 'single' | 'multiple';
  suggestedEvents?: any[];
  webhookData?: any;
  errors?: string[];
  highlights?: {
    id: string;
    text: string;
    color: string;
    startPosition: number;
    endPosition: number;
  }[];
}

// Define a folder interface
export interface Folder {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

// Define Note interface
export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

// Define Grade interface
export interface Grade {
  id: string;
  name: string;
  score: number;
  folderId: string;
  createdAt: number;
}

// Context type definition
interface RecordingsContextType {
  recordings: Recording[];
  folders: Folder[];
  notes: Note[];
  addRecording: (recording: Omit<Recording, "id">) => void;
  updateRecording: (id: string, updates: Partial<Recording>) => void;
  deleteRecording: (id: string) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  // Note methods
  addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  getFolderNotes: (folderId: string) => Note[];
  // Grade methods
  getFolderGrades: (folderId: string) => Grade[];
  calculateFolderAverage: (folderId: string) => number;
  addGrade: (folderId: string, name: string, score: number) => void;
  deleteGrade: (id: string) => void;
}

// Create the context
const RecordingsContext = createContext<RecordingsContextType | undefined>(undefined);

// Provider component
export const RecordingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [folders, setFolders] = useState<Folder[]>([
    { id: 'default', name: 'General', color: '#6E59A5' },
    { id: 'important', name: 'Importante', color: '#F97316' },
    { id: 'work', name: 'Trabajo', color: '#0EA5E9' },
    { id: 'personal', name: 'Personal', color: '#D946EF' },
  ]);

  // Load data from local storage on mount and when user changes
  useEffect(() => {
    const userId = user?.id || 'guest';
    const savedRecordings = loadFromStorage<Recording[]>(`recordings-${userId}`) || [];
    const savedFolders = loadFromStorage<Folder[]>(`folders-${userId}`);
    const savedNotes = loadFromStorage<Note[]>(`notes-${userId}`) || [];
    const savedGrades = loadFromStorage<Grade[]>(`grades-${userId}`) || [];
    
    setRecordings(savedRecordings);
    setNotes(savedNotes);
    setGrades(savedGrades);
    
    if (savedFolders) {
      setFolders(savedFolders);
    }
  }, [user]);

  // Save recordings to local storage whenever they change
  useEffect(() => {
    const userId = user?.id || 'guest';
    saveToStorage(`recordings-${userId}`, recordings);
  }, [recordings, user]);

  // Save notes to local storage whenever they change
  useEffect(() => {
    const userId = user?.id || 'guest';
    saveToStorage(`notes-${userId}`, notes);
  }, [notes, user]);

  // Save grades to local storage whenever they change
  useEffect(() => {
    const userId = user?.id || 'guest';
    saveToStorage(`grades-${userId}`, grades);
  }, [grades, user]);

  // Save folders to local storage whenever they change
  useEffect(() => {
    const userId = user?.id || 'guest';
    saveToStorage(`folders-${userId}`, folders);
  }, [folders, user]);

  // Add a new recording
  const addRecording = (recordingData: Omit<Recording, "id">) => {
    const newRecording: Recording = {
      id: uuidv4(),
      ...recordingData
    };
    setRecordings(prev => [newRecording, ...prev]);
  };

  // Update an existing recording
  const updateRecording = (id: string, updates: Partial<Recording>) => {
    setRecordings(prev => 
      prev.map(recording => 
        recording.id === id ? { ...recording, ...updates } : recording
      )
    );
  };

  // Delete a recording
  const deleteRecording = (id: string) => {
    setRecordings(prev => prev.filter(recording => recording.id !== id));
  };

  // Add a new folder
  const addFolder = (folder: Folder) => {
    setFolders(prev => [...prev, folder]);
  };

  // Update an existing folder
  const updateFolder = (id: string, updates: Partial<Folder>) => {
    setFolders(prev => 
      prev.map(folder => 
        folder.id === id ? { ...folder, ...updates } : folder
      )
    );
  };

  // Delete a folder and move its recordings to default
  const deleteFolder = (id: string) => {
    if (id === 'default') return; // Prevent deleting the default folder
    
    // Move recordings in this folder to the default folder
    setRecordings(prev => 
      prev.map(recording => 
        recording.folderId === id ? { ...recording, folderId: 'default' } : recording
      )
    );
    
    // Move notes in this folder to the default folder
    setNotes(prev => 
      prev.map(note => 
        note.folderId === id ? { ...note, folderId: 'default' } : note
      )
    );
    
    // Remove the folder
    setFolders(prev => prev.filter(folder => folder.id !== id));
  };

  // Note functions
  const addNote = (noteData: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
    const now = Date.now();
    const newNote: Note = {
      id: uuidv4(),
      ...noteData,
      createdAt: now,
      updatedAt: now
    };
    setNotes(prev => [newNote, ...prev]);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => 
      prev.map(note => 
        note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note
      )
    );
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  const getFolderNotes = (folderId: string) => {
    return notes.filter(note => note.folderId === folderId);
  };

  // Grade functions
  const getFolderGrades = (folderId: string) => {
    return grades.filter(grade => grade.folderId === folderId);
  };

  const calculateFolderAverage = (folderId: string) => {
    const folderGrades = getFolderGrades(folderId);
    if (folderGrades.length === 0) return 0;
    
    const sum = folderGrades.reduce((acc, grade) => acc + grade.score, 0);
    return sum / folderGrades.length;
  };

  const addGrade = (folderId: string, name: string, score: number) => {
    const newGrade: Grade = {
      id: uuidv4(),
      name,
      score,
      folderId,
      createdAt: Date.now()
    };
    setGrades(prev => [...prev, newGrade]);
  };

  const deleteGrade = (id: string) => {
    setGrades(prev => prev.filter(grade => grade.id !== id));
  };

  return (
    <RecordingsContext.Provider value={{
      recordings,
      folders,
      notes,
      addRecording,
      updateRecording,
      deleteRecording,
      addFolder,
      updateFolder,
      deleteFolder,
      addNote,
      updateNote,
      deleteNote,
      getFolderNotes,
      getFolderGrades,
      calculateFolderAverage,
      addGrade,
      deleteGrade
    }}>
      {children}
    </RecordingsContext.Provider>
  );
};

// Custom hook to use the recordings context
export const useRecordings = () => {
  const context = useContext(RecordingsContext);
  if (context === undefined) {
    throw new Error('useRecordings must be used within a RecordingsProvider');
  }
  return context;
};
