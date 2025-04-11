import { Recording, AudioChapter, TextHighlight } from "@/context/RecordingsContext";

export interface RecordingDetails {
  recording: Recording;
  highlights: TextHighlight[];
  chapters: AudioChapter[];
  activeChapterId?: string;
  currentAudioTime: number;
  audioDuration: number;
  activeTab: string;
  renderHighlightedText: () => React.ReactNode;
}

export interface HighlightMenuPosition {
  x: number;
  y: number;
}

export interface SelectionRange {
  start: number;
  end: number;
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

export interface RecordingHeaderProps {
  recording: Recording;
}

export interface RecordingTabsProps {
  data: RecordingDetails;
  onTabChange: (tab: string) => void;
  onTextSelection: () => void;
  onEditChapter: (chapter: AudioChapter) => void;
  onDeleteChapter: (id: string) => void;
}

export interface TranscriptionTabProps {
  data: RecordingDetails;
  onTextSelection: () => void;
}

export interface ChaptersTabProps {
  data: RecordingDetails;
  onEditChapter: (chapter: AudioChapter) => void;
  onDeleteChapter: (id: string) => void;
}

export interface WebhookTabProps {
  data: RecordingDetails;
}

export const highlightColors = [
  { label: "Amarillo", value: "#FEF7CD" },
  { label: "Verde", value: "#F2FCE2" },
  { label: "Naranja", value: "#FEC6A1" },
  { label: "Azul", value: "#D3E4FD" },
  { label: "Rosa", value: "#FFDEE2" },
  { label: "Morado", value: "#E5DEFF" },
  { label: "Melocotón", value: "#FDE1D3" },
  { label: "Lavanda", value: "#D6BCFA" },
  { label: "Menta", value: "#B9E4C9" },
  { label: "Beige", value: "#FEEBC8" },
  { label: "Celeste", value: "#BEE3F8" },
];

export const chapterColors = [
  "#FEF7CD", // Amarillo
  "#F2FCE2", // Verde
  "#FEC6A1", // Naranja
  "#D3E4FD", // Azul
  "#FFDEE2", // Rosa
  "#E5DEFF", // Morado
  "#FDE1D3", // Melocotón
  "#D6BCFA", // Lavanda
  "#B9E4C9", // Menta
  "#FEEBC8", // Beige
  "#BEE3F8", // Celeste
];
