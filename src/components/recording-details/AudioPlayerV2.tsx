
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
  Clock,
  Bookmark,
  Scissors,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AudioPlayerHandle } from "./types";
import { toast } from "sonner";

interface AudioPlayerProps {
  audioUrl?: string;
  audioBlob?: Blob;
  initialDuration?: number;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onAddChapter?: (startTime: number, endTime: number) => void;
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
    },
    ref
  ) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [duration, setDuration] = useState(initialDuration);
    const audioRef = useRef<HTMLAudioElement>(null);
    
    // Wave selection state
    const [selectionStart, setSelectionStart] = useState<number | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const waveformRef = useRef<HTMLDivElement>(null);

    // Imperative handle to control the audio player from parent components
    useImperativeHandle(ref, () => ({
      seekTo: (time: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
        }
      },
    }));

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
      if (!waveformRef.current) return;
      
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
    
    const handleWaveClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!waveformRef.current || isSelecting) return;
      
      const rect = waveformRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const percentage = offsetX / rect.width;
      const newTime = percentage * duration;
      
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
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
    
    // Calculamos posición y ancho de la selección para el render
    const selectionStartPercent = selectionStart !== null ? (selectionStart / duration) * 100 : null;
    const selectionEndPercent = selectionEnd !== null ? (selectionEnd / duration) * 100 : null;
    const selectionLeftPercent = selectionStartPercent !== null && selectionEndPercent !== null 
      ? Math.min(selectionStartPercent, selectionEndPercent) 
      : null;
    const selectionWidthPercent = selectionStartPercent !== null && selectionEndPercent !== null 
      ? Math.abs(selectionEndPercent - selectionStartPercent) 
      : null;

    // Generate audio wave bars for visualization
    const renderAudioWave = () => {
      const bars = [];
      const barCount = 40;
      
      for (let i = 0; i < barCount; i++) {
        // Create a dynamic height for each bar based on a sine wave pattern
        const height = 12 + Math.sin(i / (barCount / 6) * Math.PI) * 10;
        bars.push(
          <div 
            key={i} 
            className={`audio-wave-bar w-0.5 mx-0.5 rounded-t-full bg-blue-500 ${isPlaying ? '' : ''}`}
            style={{ 
              height: `${height}px`,
              opacity: isPlaying ? 0.8 : 0.4,
              animationDelay: `${i * 0.05}s`
            }}
          />
        );
      }
      
      return (
        <div className="relative h-16 bg-slate-50 dark:bg-slate-800/30 rounded-lg p-1 cursor-pointer overflow-hidden border border-slate-200 dark:border-slate-700"
             ref={waveformRef}
             onMouseDown={handleWaveMouseDown}
             onMouseMove={handleWaveMouseMove}
             onMouseUp={handleWaveMouseUp}
             onMouseLeave={handleWaveMouseUp}
             onClick={handleWaveClick}
        >
          {/* Wave visualization */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center h-12 px-2">
            {bars}
          </div>
          
          {/* Played portion overlay */}
          <div 
            className="absolute bottom-0 left-0 h-12 bg-blue-500/10 pointer-events-none" 
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          
          {/* Selected region */}
          {selectionLeftPercent !== null && selectionWidthPercent !== null && (
            <div 
              className="absolute bottom-0 h-12 bg-blue-500/30 border-l border-r border-blue-500 pointer-events-none" 
              style={{
                left: `${selectionLeftPercent}%`,
                width: `${selectionWidthPercent}%`
              }}
            />
          )}
          
          {/* Current position indicator */}
          <div 
            className="absolute bottom-0 h-12 w-0.5 bg-red-500 pointer-events-none" 
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

    return (
      <div className="flex flex-col">
        <audio ref={audioRef} preload="metadata" />

        {/* Audio wave visualization */}
        <div className="mb-2">
          {renderAudioWave()}
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

            <span className="text-sm text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration || 0)}
            </span>
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
          
          {selectionStart !== null && selectionEnd !== null && (
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
          
          {!(selectionStart !== null && selectionEnd !== null) && onAddChapter && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => toast.info("Selecciona una sección de audio para crear un capítulo")}
              className="flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/70"
            >
              <Bookmark className="h-4 w-4" />
              <span>Crear capítulo</span>
            </Button>
          )}
        </div>
      </div>
    );
  }
);

AudioPlayerV2.displayName = "AudioPlayerV2";
