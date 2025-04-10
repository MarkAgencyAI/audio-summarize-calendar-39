
import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveToStorage, loadFromStorage } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';

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

// Context type definition
interface RecordingsContextType {
  recordings: Recording[];
  folders: Folder[];
  addRecording: (recording: Recording) => void;
  updateRecording: (id: string, updates: Partial<Recording>) => void;
  deleteRecording: (id: string) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
}

// Create the context
const RecordingsContext = createContext<RecordingsContextType | undefined>(undefined);

// Provider component
export const RecordingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
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
    
    setRecordings(savedRecordings);
    
    if (savedFolders) {
      setFolders(savedFolders);
    }
  }, [user]);

  // Save recordings to local storage whenever they change
  useEffect(() => {
    const userId = user?.id || 'guest';
    saveToStorage(`recordings-${userId}`, recordings);
  }, [recordings, user]);

  // Save folders to local storage whenever they change
  useEffect(() => {
    const userId = user?.id || 'guest';
    saveToStorage(`folders-${userId}`, folders);
  }, [folders, user]);

  // Add a new recording
  const addRecording = (recording: Recording) => {
    setRecordings(prev => [recording, ...prev]);
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
    
    // Remove the folder
    setFolders(prev => prev.filter(folder => folder.id !== id));
  };

  return (
    <RecordingsContext.Provider value={{
      recordings,
      folders,
      addRecording,
      updateRecording,
      deleteRecording,
      addFolder,
      updateFolder,
      deleteFolder
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
