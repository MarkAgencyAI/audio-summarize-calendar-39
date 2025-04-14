
import { Recording, TextHighlight, AudioChapter } from "@/context/RecordingsContext";
import React from "react";

export interface SelectionRange {
  start: number;
  end: number;
}

export interface HighlightMenuPosition {
  x: number;
  y: number;
}

export interface AudioPlayerHandle {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getDuration: () => number;
  getCurrentTime: () => number;
}

export interface RecordingDetails {
  recording: Recording;
  highlights: TextHighlight[];
  chapters: AudioChapter[];
  activeChapterId?: string;
  currentAudioTime: number;
  audioDuration: number;
  activeTab?: string;
  renderHighlightedText?: () => React.ReactNode;
  updateRecording: (id: string, data: Partial<Recording>) => void;
  onDeleteEvent?: (eventId: string) => void;
}

export interface RecordingTabsProps {
  data: RecordingDetails;
  onTabChange?: (value: string) => void;
  onTextSelection?: () => void;
  onEditChapter?: (chapter: AudioChapter) => void;
  onDeleteChapter?: (chapterId: string) => void;
}

export interface TranscriptionTabProps {
  data: RecordingDetails;
  onTextSelection?: () => void;
}

export interface SummaryTabProps {
  data: RecordingDetails;
}

// Add the WebhookTabProps which is used in SummaryTab.tsx
export interface WebhookTabProps {
  data: RecordingDetails;
}

export interface ChaptersTabProps {
  data: RecordingDetails;
  onEditChapter?: (chapter: AudioChapter) => void;
  onDeleteChapter?: (chapterId: string) => void;
}

export interface ChapterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentChapter: AudioChapter | null;
  chapters: AudioChapter[];
  title: string;
  setTitle: (title: string) => void;
  color: string;
  setColor: (color: string) => void;
  onSave: () => void;
  currentTime: number;
}

// Add colors for chapters
export const chapterColors = [
  "#3b82f6", // blue-500
  "#ef4444", // red-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500
  "#84cc16", // lime-500
];

// Explicitly export the chapterColors array
export { chapterColors };
