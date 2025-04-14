
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

export interface ChaptersTabProps {
  data: RecordingDetails;
  onEditChapter?: (chapter: AudioChapter) => void;
  onDeleteChapter?: (chapterId: string) => void;
}
