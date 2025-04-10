
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bookmark, X, Edit, Clock } from "lucide-react";
import { formatTime } from "@/lib/utils";

export interface AudioChapter {
  id: string;
  title: string;
  startTime: number; // en segundos
  endTime?: number; // en segundos (opcional)
  color: string;
}

interface AudioChapterProps {
  chapter: AudioChapter;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onEdit: () => void;
  currentTime: number;
  duration: number;
}

export function AudioChapterItem({
  chapter,
  isActive,
  onClick,
  onDelete,
  onEdit,
  currentTime,
  duration,
}: AudioChapterProps) {
  const startTimeFormatted = formatTime(chapter.startTime);
  const endTimeFormatted = chapter.endTime ? formatTime(chapter.endTime) : formatTime(duration);
  
  const percentStart = (chapter.startTime / duration) * 100;
  const percentEnd = chapter.endTime ? (chapter.endTime / duration) * 100 : 100;
  const chapterWidth = percentEnd - percentStart;
  
  return (
    <div 
      className={`group p-2 rounded-md mb-2 flex items-center transition-colors ${
        isActive ? 'bg-muted/60' : 'hover:bg-muted/40'
      }`}
      onClick={onClick}
    >
      <div 
        className="h-4 w-4 rounded-full mr-2 flex-shrink-0" 
        style={{ backgroundColor: chapter.color }}
      />
      
      <div className="flex-1 mr-2">
        <div className="font-medium text-sm truncate">{chapter.title}</div>
        <div className="text-xs text-muted-foreground flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          {startTimeFormatted} - {endTimeFormatted}
        </div>
      </div>
      
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"  
          className="h-7 w-7 text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface AudioChaptersListProps {
  chapters: AudioChapter[];
  currentTime: number;
  duration: number;
  onChapterClick: (chapter: AudioChapter) => void;
  onChapterDelete: (id: string) => void;
  onChapterEdit: (chapter: AudioChapter) => void;
  activeChapterId?: string;
}

export function AudioChaptersList({
  chapters,
  currentTime,
  duration,
  onChapterClick,
  onChapterDelete,
  onChapterEdit,
  activeChapterId
}: AudioChaptersListProps) {
  return (
    <div className="space-y-1">
      {chapters.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground p-4">
          No hay capítulos creados
        </div>
      ) : (
        chapters.map((chapter) => (
          <AudioChapterItem
            key={chapter.id}
            chapter={chapter}
            isActive={chapter.id === activeChapterId}
            onClick={() => onChapterClick(chapter)}
            onDelete={() => onChapterDelete(chapter.id)}
            onEdit={() => onChapterEdit(chapter)}
            currentTime={currentTime}
            duration={duration}
          />
        ))
      )}
    </div>
  );
}

interface AudioChaptersTimelineProps {
  chapters: AudioChapter[];
  duration: number;
  currentTime: number;
  onChapterClick: (chapter: AudioChapter) => void;
}

export function AudioChaptersTimeline({
  chapters,
  duration,
  currentTime,
  onChapterClick
}: AudioChaptersTimelineProps) {
  if (duration <= 0) return null;
  
  return (
    <div className="w-full h-6 relative mt-2 bg-muted/20 rounded-full overflow-hidden">
      {chapters.map((chapter) => {
        const startPercent = (chapter.startTime / duration) * 100;
        const endPercent = chapter.endTime 
          ? (chapter.endTime / duration) * 100 
          : 100;
        const width = endPercent - startPercent;
        
        return (
          <div
            key={chapter.id}
            className="absolute top-0 h-full cursor-pointer hover:opacity-80 transition-opacity"
            style={{
              left: `${startPercent}%`,
              width: `${width}%`,
              backgroundColor: chapter.color
            }}
            onClick={() => onChapterClick(chapter)}
            title={chapter.title}
          />
        );
      })}
      
      {/* Current time indicator */}
      <div 
        className="absolute top-0 h-full w-0.5 bg-white z-10"
        style={{ left: `${(currentTime / duration) * 100}%` }}
      />
    </div>
  );
}
