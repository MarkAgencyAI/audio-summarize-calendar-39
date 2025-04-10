
import React, { createContext, useContext, useState, useEffect } from "react";
import { loadFromStorage, saveToStorage } from "@/lib/storage";

export interface Recording {
  id: string;
  name: string;
  audioUrl: string;
  audioData: string;
  output: string;
  folderId: string;
  duration: number;
  subject?: string;
  speakerMode?: "single" | "multi";
  suggestedEvents?: {
    title: string;
    description: string;
    date?: string;
  }[];
  keyPoints?: string[];
  highlights?: {
    id: string;
    text: string;
    color: string;
    startPosition: number;
    endPosition: number;
  }[];
  webhookData?: any;
  createdAt: string;
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

  // Load data from localStorage on initial render
  useEffect(() => {
    const loadedRecordings = loadFromStorage<Recording[]>("recordings") || [];
    const loadedFolders = loadFromStorage<Folder[]>("folders") || [];
    const loadedNotes = loadFromStorage<Note[]>("notes") || [];
    const loadedGrades = loadFromStorage<Grade[]>("grades") || [];

    // Ensure default folder exists
    if (loadedFolders.length === 0) {
      const defaultFolder: Folder = {
        id: "default",
        name: "General",
        color: "#4f46e5",
        createdAt: new Date().toISOString()
      };
      loadedFolders.push(defaultFolder);
      saveToStorage("folders", loadedFolders);
    }

    setRecordings(loadedRecordings);
    setFolders(loadedFolders);
    setNotes(loadedNotes);
    setGrades(loadedGrades);
  }, []);

  // Save recordings to localStorage whenever they change
  useEffect(() => {
    saveToStorage("recordings", recordings);
  }, [recordings]);

  // Save folders to localStorage whenever they change
  useEffect(() => {
    saveToStorage("folders", folders);
  }, [folders]);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    saveToStorage("notes", notes);
  }, [notes]);

  // Save grades to localStorage whenever they change
  useEffect(() => {
    saveToStorage("grades", grades);
  }, [grades]);

  const addRecording = (recording: Omit<Recording, "id">) => {
    const newRecording: Recording = {
      ...recording,
      id: crypto.randomUUID()
    };
    setRecordings(prev => [...prev, newRecording]);
  };

  const updateRecording = (id: string, data: Partial<Recording>) => {
    setRecordings(prev =>
      prev.map(recording =>
        recording.id === id ? { ...recording, ...data } : recording
      )
    );
  };

  const deleteRecording = (id: string) => {
    setRecordings(prev => prev.filter(recording => recording.id !== id));
  };

  const addFolder = (folder: Omit<Folder, "id">) => {
    const newFolder: Folder = {
      ...folder,
      id: crypto.randomUUID()
    };
    setFolders(prev => [...prev, newFolder]);
  };

  const updateFolder = (id: string, data: Partial<Folder>) => {
    setFolders(prev =>
      prev.map(folder =>
        folder.id === id ? { ...folder, ...data } : folder
      )
    );
  };

  const deleteFolder = (id: string) => {
    // Move recordings to default folder
    setRecordings(prev =>
      prev.map(recording =>
        recording.folderId === id
          ? { ...recording, folderId: "default" }
          : recording
      )
    );

    // Move notes to default folder
    setNotes(prev =>
      prev.map(note =>
        note.folderId === id
          ? { ...note, folderId: "default" }
          : note
      )
    );

    // Delete grades associated with the folder
    setGrades(prev => prev.filter(grade => grade.folderId !== id));

    // Delete the folder
    setFolders(prev => prev.filter(folder => folder.id !== id));
  };

  const addNote = (note: Omit<Note, "id" | "createdAt">) => {
    const newNote: Note = {
      ...note,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    setNotes(prev => [...prev, newNote]);
  };

  const updateNote = (id: string, data: Partial<Note>) => {
    setNotes(prev =>
      prev.map(note =>
        note.id === id ? { ...note, ...data } : note
      )
    );
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  const getFolderNotes = (folderId: string) => {
    return notes.filter(note => note.folderId === folderId);
  };

  const addGrade = (folderId: string, name: string, score: number) => {
    const newGrade: Grade = {
      id: crypto.randomUUID(),
      name,
      score,
      folderId,
      createdAt: new Date().toISOString()
    };
    setGrades(prev => [...prev, newGrade]);
  };

  const deleteGrade = (id: string) => {
    setGrades(prev => prev.filter(grade => grade.id !== id));
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
    deleteGrade
  };

  return (
    <RecordingsContext.Provider value={value}>
      {children}
    </RecordingsContext.Provider>
  );
};
