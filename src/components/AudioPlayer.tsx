
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, AudioWaveform, Scissors } from "lucide-react";
import { formatTime } from "@/lib/audio-utils";
import { toast } from "sonner";

export interface AudioPlayerHandle {
  seekTo: (time: number) => void;
}

interface AudioPlayerProps {
  audioUrl: string;
  audioBlob?: Blob;
  initialDuration?: number;
  autoplay?: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onAddChapter?: (startTime: number, endTime: number) => void;
}

export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(({
  audioUrl,
  audioBlob,
  initialDuration = 0,
  autoplay = false,
  onEnded,
  onTimeUpdate,
  onDurationChange,
  onAddChapter
}, ref) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  
  // Selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  
  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (!audioRef.current) return;
      
      const newTime = Math.max(0, Math.min(time, duration));
      if (!isNaN(newTime) && isFinite(newTime)) {
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    }
  }));
  
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    
    audio.preload = "metadata";
    audio.volume = volume;
    audio.playbackRate = playbackRate;
    
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", () => setIsLoading(false));
    audio.addEventListener("waiting", () => setIsLoading(true));
    audio.addEventListener("playing", () => setIsLoading(false));
    audio.addEventListener("timeupdate", handleTimeUpdate);
    
    return () => {
      if (audioRef.current) {
        const audio = audioRef.current;
        
        audio.pause();
        
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("canplay", () => setIsLoading(false));
        audio.removeEventListener("waiting", () => setIsLoading(true));
        audio.removeEventListener("playing", () => setIsLoading(false));
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
      }
    };
  }, []);
  
  useEffect(() => {
    if (!audioRef.current) return;
    
    setIsLoading(true);
    
    if (audioBlob instanceof Blob) {
      const objectUrl = URL.createObjectURL(audioBlob);
      audioRef.current.src = objectUrl;
    } else if (audioUrl) {
      audioRef.current.src = audioUrl;
    }
    
    if (autoplay) {
      playAudio();
    }
  }, [audioUrl, audioBlob]);
  
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);
  
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);
  
  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    
    const audioDuration = audioRef.current.duration;
    
    if (audioDuration && !isNaN(audioDuration) && isFinite(audioDuration)) {
      setDuration(audioDuration);
      if (onDurationChange) {
        onDurationChange(audioDuration);
      }
    } else if (initialDuration && initialDuration > 0) {
      setDuration(initialDuration);
      if (onDurationChange) {
        onDurationChange(initialDuration);
      }
    } else {
      setDuration(100);
      if (onDurationChange) {
        onDurationChange(100);
      }
    }
    
    setIsLoading(false);
  };
  
  const handleTimeUpdate = () => {
    if (!audioRef.current || isDragging) return;
    
    const newTime = audioRef.current.currentTime;
    if (!isNaN(newTime) && isFinite(newTime)) {
      setCurrentTime(newTime);
      if (onTimeUpdate) {
        onTimeUpdate(newTime);
      }
    }
  };
  
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    
    if (onEnded) {
      onEnded();
    }
  };
  
  const playAudio = () => {
    if (!audioRef.current) return;
    
    audioRef.current.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(error => {
        console.error("Error playing audio:", error);
        toast.error("Error al reproducir el audio");
      });
  };
  
  const pauseAudio = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setIsPlaying(false);
  };
  
  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };
  
  const skipForward = () => {
    if (!audioRef.current) return;
    
    const newTime = Math.min(audioRef.current.currentTime + 10, duration);
    if (!isNaN(newTime) && isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      if (onTimeUpdate) {
        onTimeUpdate(newTime);
      }
    }
  };
  
  const skipBackward = () => {
    if (!audioRef.current) return;
    
    const newTime = Math.max(audioRef.current.currentTime - 10, 0);
    if (!isNaN(newTime) && isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      if (onTimeUpdate) {
        onTimeUpdate(newTime);
      }
    }
  };
  
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    
    const newTime = value[0];
    if (!isNaN(newTime) && isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      if (onTimeUpdate) {
        onTimeUpdate(newTime);
      }
    }
  };
  
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
  };
  
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current || !audioRef.current) return;
    
    const rect = waveformRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percentage = offsetX / rect.width;
    const newTime = percentage * duration;
    
    if (!isNaN(newTime) && isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      if (onTimeUpdate) {
        onTimeUpdate(newTime);
      }
    }
  };
  
  const handleWaveformMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current) return;
    
    const rect = waveformRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const percentage = relativeX / rect.width;
    const timeValue = percentage * duration;
    
    setIsSelecting(true);
    setSelectionStart(timeValue);
    setSelectionEnd(null);
  };
  
  const handleWaveformMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !waveformRef.current) return;
    
    const rect = waveformRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const percentage = relativeX / rect.width;
    const timeValue = percentage * duration;
    
    setSelectionEnd(timeValue);
  };
  
  const handleWaveformMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
  };
  
  const handleAddChapter = () => {
    if (onAddChapter && selectionStart !== null && selectionEnd !== null) {
      // Ensure start time is always less than end time
      const startTime = Math.min(selectionStart, selectionEnd);
      const endTime = Math.max(selectionStart, selectionEnd);
      
      onAddChapter(startTime, endTime);
      
      // Clear selection after adding chapter
      clearSelection();
    } else {
      toast.error("Primero selecciona un fragmento de audio");
    }
  };
  
  const clearSelection = () => {
    setSelectionStart(null);
    setSelectionEnd(null);
  };
  
  const validDuration = duration > 0 && isFinite(duration) ? duration : 100;
  
  // Calculate selection position and width as percentage
  const selectionStartPercent = selectionStart !== null ? (selectionStart / validDuration) * 100 : null;
  const selectionEndPercent = selectionEnd !== null ? (selectionEnd / validDuration) * 100 : null;
  
  const selectionLeftPercent = selectionStartPercent !== null && selectionEndPercent !== null
    ? Math.min(selectionStartPercent, selectionEndPercent)
    : null;
    
  const selectionWidthPercent = selectionStartPercent !== null && selectionEndPercent !== null
    ? Math.abs(selectionEndPercent - selectionStartPercent)
    : null;
  
  return (
    <div className="w-full max-w-full bg-background border rounded-md p-3 shadow-sm overflow-hidden">
      <div className="space-y-3 max-w-full">
        {/* Waveform visualization */}
        <div 
          ref={waveformRef}
          className="relative w-full h-16 bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
          onClick={handleWaveformClick}
          onMouseDown={handleWaveformMouseDown}
          onMouseMove={handleWaveformMouseMove}
          onMouseUp={handleWaveformMouseUp}
          onMouseLeave={handleWaveformMouseUp}
        >
          {/* Full waveform background */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
              <path 
                d="M 0,25 Q 10,20 20,25 T 40,25 T 60,25 T 80,25 T 100,25" 
                stroke="rgba(209, 213, 219, 0.8)" 
                strokeWidth="1" 
                fill="none"
              />
              <path 
                d="M 0,25 Q 10,30 20,25 T 40,25 T 60,25 T 80,25 T 100,25" 
                stroke="rgba(209, 213, 219, 0.8)" 
                strokeWidth="1" 
                fill="none"
              />
            </svg>
          </div>
          
          {/* Played portion of waveform */}
          <div 
            className="absolute top-0 bottom-0 left-0 flex items-center overflow-hidden"
            style={{ width: `${(currentTime / validDuration) * 100}%` }}
          >
            <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
              <path 
                d="M 0,25 Q 10,20 20,25 T 40,25 T 60,25 T 80,25 T 100,25" 
                stroke="var(--color-primary, #0085FF)" 
                strokeWidth="1.5" 
                fill="none"
              />
              <path 
                d="M 0,25 Q 10,30 20,25 T 40,25 T 60,25 T 80,25 T 100,25" 
                stroke="var(--color-primary, #0085FF)" 
                strokeWidth="1.5" 
                fill="none"
              />
            </svg>
          </div>
          
          {/* Selected region */}
          {selectionLeftPercent !== null && selectionWidthPercent !== null && (
            <div 
              className="absolute h-full bg-blue-500/30 border-l border-r border-blue-500 pointer-events-none"
              style={{ 
                left: `${selectionLeftPercent}%`, 
                width: `${selectionWidthPercent}%`
              }}
            />
          )}
          
          {/* Current time indicator */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500"
            style={{ 
              left: `${(currentTime / validDuration) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="w-2 h-2 rounded-full bg-red-500 absolute -top-1 left-1/2 transform -translate-x-1/2"></div>
          </div>
          
          {/* Time markers */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[10px] text-gray-500">
            <span>{formatTime(0)}</span>
            <span>{formatTime(Math.floor(validDuration / 2))}</span>
            <span>{formatTime(Math.floor(validDuration))}</span>
          </div>
        </div>
        
        {/* Time slider */}
        <div className="w-full space-y-1">
          <Slider 
            value={[currentTime]} 
            min={0} 
            max={validDuration} 
            step={0.1}
            onValueChange={handleSeek}
            onValueCommit={() => setIsDragging(false)}
            onPointerDown={() => setIsDragging(true)}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(Math.floor(currentTime))}</span>
            <span>{formatTime(Math.floor(validDuration))}</span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-3">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={skipBackward}
              aria-label="Retroceder 10 segundos"
              className="h-8 w-8"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={togglePlayPause}
              className="h-9 w-9"
              disabled={isLoading}
              aria-label={isPlaying ? "Pausar" : "Reproducir"}
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={skipForward}
              aria-label="Avanzar 10 segundos"
              className="h-8 w-8"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
            {/* Selection controls */}
            {(selectionStart !== null && selectionEnd !== null) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddChapter}
                className="h-7 text-xs flex items-center gap-1"
              >
                <Scissors className="h-3 w-3" />
                <span>Crear capítulo</span>
              </Button>
            )}
            
            {/* Playback speed */}
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => changePlaybackRate(1)}
                className={`h-6 px-2 text-xs ${playbackRate === 1 ? 'bg-primary/20' : ''}`}
              >
                1x
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => changePlaybackRate(1.5)}
                className={`h-6 px-2 text-xs ${playbackRate === 1.5 ? 'bg-primary/20' : ''}`}
              >
                1.5x
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => changePlaybackRate(2)}
                className={`h-6 px-2 text-xs ${playbackRate === 2 ? 'bg-primary/20' : ''}`}
              >
                2x
              </Button>
            </div>
            
            {/* Volume control */}
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleMute}
                className="h-7 w-7"
                aria-label={isMuted ? "Activar sonido" : "Silenciar"}
              >
                {isMuted ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </Button>
              
              <Slider
                value={[isMuted ? 0 : volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-[60px]"
                aria-label="Volumen"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

AudioPlayer.displayName = "AudioPlayer";
