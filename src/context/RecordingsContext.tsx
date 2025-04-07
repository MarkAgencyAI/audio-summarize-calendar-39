
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { saveToStorage, loadFromStorage } from "@/lib/storage";

// Define types
export interface Recording {
  id: string;
  name: string;
  date: string;
  duration: number;
  audioUrl: string;
  audioData: string;
  output: string;
  folderId: string;
  subject?: string;
  speakerMode?: 'single' | 'multiple';
  suggestedEvents?: Array<{
    title: string;
    description: string;
    date?: string;
  }>;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
}

export interface Grade {
  id: string;
  folderId: string;
  name: string;
  score: number;
  createdAt: string;
}

interface RecordingsContextType {
  recordings: Recording[];
  folders: Folder[];
  notes: Note[];
  grades: Grade[];
  addRecording: (recording: Partial<Recording>) => void;
  updateRecording: (id: string, updates: Partial<Recording>) => void;
  deleteRecording: (id: string) => void;
  addFolder: (name: string, color: string) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  addNote: (note: Partial<Note>) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  getFolderNotes: (folderId: string) => Note[];
  getFolderGrades: (folderId: string) => Grade[];
  calculateFolderAverage: (folderId: string) => number;
  addGrade: (folderId: string, name: string, score: number) => void;
  deleteGrade: (id: string) => void;
}

const RecordingsContext = createContext<RecordingsContextType | undefined>(undefined);

export const useRecordings = () => {
  const context = useContext(RecordingsContext);
  if (!context) {
    throw new Error("useRecordings must be used within a RecordingsProvider");
  }
  return context;
};

interface RecordingsProviderProps {
  children: ReactNode;
}

export const RecordingsProvider: React.FC<RecordingsProviderProps> = ({ children }) => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  // Load data from storage on mount
  useEffect(() => {
    const loadedRecordings = loadFromStorage<Recording[]>("recordings") || [];
    const loadedFolders = loadFromStorage<Folder[]>("folders") || [];
    const loadedNotes = loadFromStorage<Note[]>("notes") || [];
    const loadedGrades = loadFromStorage<Grade[]>("grades") || [];
    
    // Ensure we have a default folder
    if (loadedFolders.length === 0) {
      const defaultFolders = [
        {
          id: "default",
          name: "General",
          color: "#4f46e5",
          createdAt: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: "Matemáticas",
          color: "#10b981",
          createdAt: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: "Historia",
          color: "#f59e0b",
          createdAt: new Date().toISOString()
        }
      ];
      setFolders(defaultFolders);
      saveToStorage("folders", defaultFolders);
    } else {
      setFolders(loadedFolders);
    }
    
    setRecordings(loadedRecordings);
    setNotes(loadedNotes);
    setGrades(loadedGrades);
  }, []);

  // Save to storage whenever our data changes
  useEffect(() => {
    saveToStorage("recordings", recordings);
  }, [recordings]);

  useEffect(() => {
    saveToStorage("folders", folders);
  }, [folders]);

  useEffect(() => {
    saveToStorage("notes", notes);
  }, [notes]);

  useEffect(() => {
    saveToStorage("grades", grades);
  }, [grades]);

  // Recordings functions
  const addRecording = (recording: Partial<Recording>) => {
    const newRecording: Recording = {
      id: uuidv4(),
      name: recording.name || "Grabación sin título",
      date: new Date().toISOString(),
      duration: recording.duration || 0,
      audioUrl: recording.audioUrl || "",
      audioData: recording.audioData || "",
      output: recording.output || "",
      folderId: recording.folderId || "default",
      speakerMode: recording.speakerMode || "single",
      subject: recording.subject,
      suggestedEvents: recording.suggestedEvents
    };
    
    setRecordings(prev => [newRecording, ...prev]);
  };

  const updateRecording = (id: string, updates: Partial<Recording>) => {
    setRecordings(prevRecordings => 
      prevRecordings.map(recording => 
        recording.id === id ? { ...recording, ...updates } : recording
      )
    );
  };

  const deleteRecording = (id: string) => {
    setRecordings(prevRecordings => 
      prevRecordings.filter(recording => recording.id !== id)
    );
  };

  // Folder functions
  const addFolder = (name: string, color: string) => {
    const newFolder: Folder = {
      id: uuidv4(),
      name,
      color,
      createdAt: new Date().toISOString()
    };
    
    setFolders(prev => [...prev, newFolder]);
  };

  const updateFolder = (id: string, updates: Partial<Folder>) => {
    setFolders(prevFolders => 
      prevFolders.map(folder => 
        folder.id === id ? { ...folder, ...updates } : folder
      )
    );
  };

  const deleteFolder = (id: string) => {
    // Don't allow deleting the default folder
    if (id === "default") return;
    
    setFolders(prevFolders => 
      prevFolders.filter(folder => folder.id !== id)
    );
    
    // Move all recordings from this folder to default
    setRecordings(prevRecordings => 
      prevRecordings.map(recording => 
        recording.folderId === id ? { ...recording, folderId: "default" } : recording
      )
    );
    
    // Move all notes from this folder to default
    setNotes(prevNotes => 
      prevNotes.map(note => 
        note.folderId === id ? { ...note, folderId: "default" } : note
      )
    );
    
    // Delete grades associated with this folder
    setGrades(prevGrades => 
      prevGrades.filter(grade => grade.folderId !== id)
    );
  };

  // Notes functions
  const addNote = (note: Partial<Note>) => {
    const newNote: Note = {
      id: uuidv4(),
      title: note.title || "Nota sin título",
      content: note.content || "",
      folderId: note.folderId || "default",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      imageUrl: note.imageUrl
    };
    
    setNotes(prev => [newNote, ...prev]);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prevNotes => 
      prevNotes.map(note => 
        note.id === id ? { 
          ...note, 
          ...updates, 
          updatedAt: new Date().toISOString() 
        } : note
      )
    );
  };

  const deleteNote = (id: string) => {
    setNotes(prevNotes => 
      prevNotes.filter(note => note.id !== id)
    );
  };

  const getFolderNotes = (folderId: string) => {
    return notes.filter(note => note.folderId === folderId);
  };

  // Grades functions
  const addGrade = (folderId: string, name: string, score: number) => {
    const newGrade: Grade = {
      id: uuidv4(),
      folderId,
      name,
      score,
      createdAt: new Date().toISOString()
    };
    
    setGrades(prev => [...prev, newGrade]);
  };

  const deleteGrade = (id: string) => {
    setGrades(prevGrades => 
      prevGrades.filter(grade => grade.id !== id)
    );
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

  return (
    <RecordingsContext.Provider
      value={{
        recordings,
        folders,
        notes,
        grades,
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
      }}
    >
      {children}
    </RecordingsContext.Provider>
  );
};
