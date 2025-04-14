import React, {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Bookmark,
  Scissors,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { AudioPlayerHandle } from "./types";
import { toast } from "sonner";
import { AudioChapter } from "@/context/RecordingsContext";

interface AudioPlayerProps {
  audioUrl?: string;
  audioBlob?: Blob;
  initialDuration?: number;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onAddChapter?: (startTime: number, endTime: number) => void;
  chapters?: AudioChapter[];
  isSelectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  onChapterClick?: (chapter: AudioChapter) => void;
}

export const AudioPlayerV2 = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  (
    {
      audioUrl,
      audioBlob,
      initialDuration = 0,
      onTimeUpdate,
      onDurationChange,
      onAddChapter,
      chapters = [],
      isSelectionMode = false,
      onToggleSelectionMode,
      onChapterClick
    },
    ref
  ) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [duration, setDuration] = useState(initialDuration);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverChapter, setHoverChapter] = useState<AudioChapter | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    
    // Wave selection state
    const [selectionStart, setSelectionStart] = useState<number | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const waveformRef = useRef<HTMLDivElement>(null);

    // Imperative handle to control the audio player from parent components
    useImperativeHandle(ref, () => ({
      play: () => {
        if (audioRef.current) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      },
      pause: () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      },
      seek: (time: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
        }
      },
      getDuration: () => {
        return duration;
      },
      getCurrentTime: () => {
        return currentTime;
      }
    }));

    // Reset selection state when selection mode is toggled off
    useEffect(() => {
      if (!isSelectionMode) {
        clearSelection();
      }
    }, [isSelectionMode]);

    // Load audio source
    useEffect(() => {
      if (!audioRef.current) return;

      const audioElement = audioRef.current;

      const handleLoadedMetadata = () => {
        if (audioElement) {
          setDuration(audioElement.duration);
          onDurationChange?.(audioElement.duration);
        }
      };

      const handleTimeUpdate = () => {
        if (audioElement) {
          setCurrentTime(audioElement.currentTime);
          onTimeUpdate?.(audioElement.currentTime);
        }
      };

      audioElement.addEventListener("loadedmetadata", handleLoadedMetadata);
      audioElement.addEventListener("timeupdate", handleTimeUpdate);

      return () => {
        audioElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audioElement.removeEventListener("timeupdate", handleTimeUpdate);
      };
    }, [audioUrl, audioBlob, onDurationChange, onTimeUpdate]);

    useEffect(() => {
      if (!audioRef.current) return;

      if (audioBlob) {
        const url = URL.createObjectURL(audioBlob);
        audioRef.current.src = url;
      } else if (audioUrl) {
        audioRef.current.src = audioUrl;
      }

      audioRef.current.load();

      return () => {
        URL.revokeObjectURL(audioRef.current?.src || "");
      };
    }, [audioUrl, audioBlob]);

    // Play/Pause
    const togglePlay = () => {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
      }
    };

    // Volume control
    const handleVolumeChange = (value: number[]) => {
      const newVolume = value[0] / 100;
      setVolume(newVolume);
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
      }
    };

    // Mute control
    const toggleMute = () => {
      setIsMuted(!isMuted);
      if (audioRef.current) {
        audioRef.current.muted = !isMuted;
      }
    };

    // Seek control
    const handleSeek = (value: number[]) => {
      if (audioRef.current) {
        const newTime = (value[0] / 100) * duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    };

    // Skip back/forward
    const skip = (seconds: number) => {
      if (audioRef.current) {
        const newTime = audioRef.current.currentTime + seconds;
        if (newTime >= 0 && newTime <= duration) {
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      }
    };
    
    // Wave selection handlers
    const handleWaveMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!waveformRef.current || !isSelectionMode) return;
      
      const rect = waveformRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const percentage = offsetX / rect.width;
      const newTime = percentage * duration;
      
      setIsSelecting(true);
      setSelectionStart(newTime);
      setSelectionEnd(null);
    };
    
    const handleWaveMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isSelecting || !waveformRef.current) return;
      
      const rect = waveformRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const percentage = offsetX / rect.width;
      const newTime = percentage * duration;
      
      setSelectionEnd(newTime);
    };
    
    const handleWaveMouseUp = () => {
      setIsSelecting(false);
    };
    
    const handleTimelineHover = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current || duration <= 0) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const percentage = offsetX / rect.width;
      const hoverTimeValue = percentage * duration;
      
      setHoverTime(hoverTimeValue);
      
      // Find chapter at hover position
      const chapter = sortedChapters.find(
        chapter => hoverTimeValue >= chapter.startTime && 
        (!chapter.endTime || hoverTimeValue <= chapter.endTime)
      );
      
      setHoverChapter(chapter || null);
    };
    
    const handleTimelineLeave = () => {
      setHoverTime(null);
      setHoverChapter(null);
    };
    
    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const percentage = offsetX / rect.width;
      const newTime = percentage * duration;
      
      // Check if clicking on a chapter
      const clickedChapter = sortedChapters.find(
        chapter => newTime >= chapter.startTime && 
        (!chapter.endTime || newTime <= chapter.endTime)
      );
      
      if (clickedChapter && onChapterClick) {
        // If clicking on a chapter, start playing from chapter start
        onChapterClick(clickedChapter);
      } else {
        // Otherwise just seek to the clicked position
        if (audioRef.current) {
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      }
    };
    
    const handleWaveClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!waveformRef.current || isSelecting || isSelectionMode) return;
      
      const rect = waveformRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const percentage = offsetX / rect.width;
      const newTime = percentage * duration;
      
      // Check if clicking on a chapter
      const clickedChapter = sortedChapters.find(
        chapter => newTime >= chapter.startTime && 
        (!chapter.endTime || newTime <= chapter.endTime)
      );
      
      if (clickedChapter && onChapterClick) {
        // If clicking on a chapter, start playing from chapter start
        onChapterClick(clickedChapter);
      } else {
        // Otherwise just seek to the clicked position
        if (audioRef.current) {
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      }
    };
    
    const clearSelection = () => {
      setSelectionStart(null);
      setSelectionEnd(null);
    };
    
    const handleAddChapter = () => {
      if (onAddChapter && selectionStart !== null && selectionEnd !== null) {
        // Ensure start time is always less than end time
        const startTime = Math.min(selectionStart, selectionEnd);
        const endTime = Math.max(selectionStart, selectionEnd);
        
        onAddChapter(startTime, endTime);
        clearSelection();
        toast.success("Nuevo capítulo creado");
      } else {
        toast.error("Selecciona una sección de audio primero");
      }
    };

    // Format time
    const formatTime = (time: number): string => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    };
    
    // Calculate position and width for selection visual
    const selectionStartPercent = selectionStart !== null ? (selectionStart / duration) * 100 : null;
    const selectionEndPercent = selectionEnd !== null ? (selectionEnd / duration) * 100 : null;
    const selectionLeftPercent = selectionStartPercent !== null && selectionEndPercent !== null 
      ? Math.min(selectionStartPercent, selectionEndPercent) 
      : null;
    const selectionWidthPercent = selectionStartPercent !== null && selectionEndPercent !== null 
      ? Math.abs(selectionEndPercent - selectionStartPercent) 
      : null;

    // Sort chapters by start time to ensure they render in correct order
    const sortedChapters = [...chapters].sort((a, b) => a.startTime - b.startTime);

    // Find the active chapter based on current time
    const activeChapter = sortedChapters.find(
      chapter => currentTime >= chapter.startTime && 
      (!chapter.endTime || currentTime <= chapter.endTime)
    );

    // Generate chapters for visualization in YouTube-style timeline
    const renderChaptersTimeline = () => {
      if (sortedChapters.length === 0) return null;
      
      return (
        <div 
          className="relative w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1 cursor-pointer"
          ref={timelineRef}
          onMouseMove={handleTimelineHover}
          onMouseLeave={handleTimelineLeave}
          onClick={handleTimelineClick}
        >
          {sortedChapters.map((chapter, index) => {
            const startPercent = (chapter.startTime / duration) * 100;
            const endPercent = chapter.endTime 
              ? (chapter.endTime / duration) * 100 
              : (index < sortedChapters.length - 1 
                ? (sortedChapters[index + 1].startTime / duration) * 100 
                : 100);
            const width = endPercent - startPercent;
            
            return (
              <div
                key={chapter.id}
                className="absolute top-0 h-full"
                style={{
                  left: `${startPercent}%`,
                  width: `${width}%`,
                  backgroundColor: chapter.color,
                  borderLeft: index > 0 ? `1px solid rgba(255,255,255,0.5)` : 'none',
                }}
                title={chapter.title}
              />
            );
          })}
          
          {/* Current position indicator */}
          <div 
            className="absolute top-0 h-full w-1 bg-white shadow-md z-10 pointer-events-none" 
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
          
          {/* Played portion overlay */}
          <div 
            className="absolute top-0 left-0 h-full bg-white/20 pointer-events-none" 
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          
          {/* Hover chapter tooltip */}
          {hoverTime !== null && hoverChapter && (
            <div 
              className="absolute top-0 transform -translate-y-full -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap z-20 shadow-lg"
              style={{ left: `${(hoverTime / duration) * 100}%` }}
            >
              {hoverChapter.title}
              <div className="text-[10px] text-gray-300">
                {formatTime(hoverTime)}
              </div>
            </div>
          )}
        </div>
      );
    };

    // Generate audio wave bars for visualization
    const renderAudioWave = () => {
      // Create a dynamic height for each bar based on a sine wave pattern
      return (
        <div className={`relative h-16 bg-slate-50 dark:bg-slate-800/30 rounded-lg p-1 overflow-hidden border border-slate-200 dark:border-slate-700 ${isSelectionMode ? 'cursor-crosshair' : 'cursor-pointer'}`}
             ref={waveformRef}
             onMouseDown={handleWaveMouseDown}
             onMouseMove={handleWaveMouseMove}
             onMouseUp={handleWaveMouseUp}
             onMouseLeave={handleWaveMouseUp}
             onClick={handleWaveClick}
        >
          {/* Chapter visualization - render colored sections for each chapter */}
          {sortedChapters.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-12 flex">
              {sortedChapters.map((chapter, index) => {
                const startPercent = (chapter.startTime / duration) * 100;
                const endPercent = chapter.endTime 
                  ? (chapter.endTime / duration) * 100 
                  : (index < sortedChapters.length - 1 
                    ? (sortedChapters[index + 1].startTime / duration) * 100 
                    : 100);
                const width = endPercent - startPercent;
                
                return (
                  <div 
                    key={chapter.id}
                    className="h-full flex flex-col items-center justify-end overflow-hidden relative"
                    style={{ 
                      width: `${width}%`, 
                      marginLeft: index === 0 ? `${startPercent}%` : 0,
                      background: `${chapter.color}40`, // Add transparency
                      borderLeft: index > 0 ? `1px solid ${chapter.color}` : '',
                    }}
                    title={chapter.title}
                  >
                    {/* Chapter title indicator on top */}
                    {width > 10 && (
                      <div 
                        className="absolute -top-1 left-2 text-xs truncate max-w-[90%] px-1 rounded"
                        style={{ backgroundColor: `${chapter.color}80`, color: '#333' }}
                      >
                        {chapter.title}
                      </div>
                    )}
                    
                    {/* Audio wave visualization */}
                    <div className="flex items-end justify-center h-10 w-full">
                      {Array.from({ length: Math.max(3, Math.floor(width / 3)) }).map((_, i) => {
                        // Bar height based on position within chapter
                        const barHeight = 8 + Math.sin(i / (width / 10) * Math.PI) * 5;
                        return (
                          <div
                            key={i}
                            className="audio-wave-bar w-0.5 mx-0.5 rounded-t-full"
                            style={{
                              height: `${barHeight}px`,
                              backgroundColor: chapter.color,
                              opacity: isPlaying ? 0.9 : 0.5,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Base audio wave when no chapters */}
          {sortedChapters.length === 0 && (
            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center h-12 px-2">
              {Array.from({ length: 40 }).map((_, i) => {
                // Bar height based on sine wave pattern for base visualization
                const height = 12 + Math.sin(i / (40 / 6) * Math.PI) * 10;
                return (
                  <div 
                    key={i} 
                    className="audio-wave-bar w-0.5 mx-0.5 rounded-t-full bg-blue-500"
                    style={{ 
                      height: `${height}px`,
                      opacity: isPlaying ? 0.8 : 0.4,
                      animationDelay: `${i * 0.05}s`
                    }}
                  />
                );
              })}
            </div>
          )}
          
          {/* Played portion overlay */}
          <div 
            className="absolute bottom-0 left-0 h-12 bg-blue-500/10 pointer-events-none" 
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          
          {/* Selected region - only shown in selection mode */}
          {isSelectionMode && selectionLeftPercent !== null && selectionWidthPercent !== null && (
            <div 
              className="absolute bottom-0 h-12 bg-blue-500/30 border-l border-r border-blue-500 pointer-events-none" 
              style={{
                left: `${selectionLeftPercent}%`,
                width: `${selectionWidthPercent}%`,
                zIndex: 5
              }}
            />
          )}
          
          {/* Current position indicator */}
          <div 
            className="absolute bottom-0 h-12 w-0.5 bg-red-500 pointer-events-none z-10" 
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div className="w-2 h-2 rounded-full bg-red-500 absolute -top-1 left-1/2 transform -translate-x-1/2"></div>
          </div>
          
          {/* Time markers */}
          <div className="absolute top-0 left-0 right-0 flex justify-between px-2 text-[10px] text-gray-500">
            <span>{formatTime(0)}</span>
            <span>{formatTime(Math.floor(duration / 2))}</span>
            <span>{formatTime(Math.floor(duration))}</span>
          </div>
        </div>
      );
    };

    // Render chapter badge/indicator for active chapter
    const renderActiveChapter = () => {
      if (!activeChapter) return null;

      return (
        <div className="flex items-center h-6 px-3 rounded-md" style={{ backgroundColor: `${activeChapter.color}20`, borderLeft: `3px solid ${activeChapter.color}` }}>
          <span className="text-sm font-medium truncate text-gray-800 dark:text-gray-200">
            {activeChapter.title}
          </span>
          <span className="ml-2 text-xs text-gray-500">{formatTime(currentTime)}</span>
        </div>
      );
    };

    return (
      <div className="flex flex-col">
        <audio ref={audioRef} preload="metadata" />

        {/* Current chapter indicator */}
        {activeChapter && (
          <div className="mb-3 flex items-center justify-center">
            {renderActiveChapter()}
          </div>
        )}

        {/* Audio wave visualization */}
        <div className="mb-2">
          {renderAudioWave()}
        </div>
        
        {/* YouTube-style chapters timeline */}
        {renderChaptersTimeline()}

        {/* Time display */}
        <div className="flex justify-between text-xs text-muted-foreground mt-1 mb-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="h-9 w-9"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => skip(-10)}
            aria-label="Skip Back 10 seconds"
            className="h-9 w-9"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => skip(10)}
            aria-label="Skip Forward 10 seconds"
            className="h-9 w-9"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <div className="flex-1 flex items-center gap-2">
            <Slider
              defaultValue={[0]}
              max={100}
              step={0.1}
              aria-label="Seek"
              onValueChange={handleSeek}
              value={[(currentTime / duration) * 100 || 0]}
              className="flex-1"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="h-9 w-9"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          <Slider
            defaultValue={[100]}
            max={100}
            step={1}
            aria-label="Volume"
            onValueChange={handleVolumeChange}
            value={[volume * 100]}
            className="w-24"
          />
          
          {isSelectionMode && selectionStart !== null && selectionEnd !== null && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleAddChapter}
              className="flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/70"
            >
              <Scissors className="h-4 w-4" />
              <span>Crear capítulo</span>
            </Button>
          )}
          
          {onAddChapter && (
            <Button 
              variant={isSelectionMode ? "default" : "outline"}
              size="sm"
              onClick={onToggleSelectionMode}
              className={`flex items-center gap-2 ${isSelectionMode ? 'bg-blue-500 text-white hover:bg-blue-600' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/70'}`}
            >
              <Bookmark className="h-4 w-4" />
              <span>{isSelectionMode ? "Cancelar selección" : "Crear capítulo"}</span>
            </Button>
          )}
        </div>
      </div>
    );
  }
);

AudioPlayerV2.displayName = "AudioPlayerV2";
