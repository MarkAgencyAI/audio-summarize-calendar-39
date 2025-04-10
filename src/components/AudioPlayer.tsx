
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
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
}

export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(({
  audioUrl,
  audioBlob,
  initialDuration = 0,
  autoplay = false,
  onEnded,
  onTimeUpdate,
  onDurationChange
}, ref) => {
  // Audio element ref
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // State variables
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  
  // Timer for updating current time
  const timeUpdateIntervalRef = useRef<number | null>(null);

  // Expose methods to parent component
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
  
  // Initialize audio element
  useEffect(() => {
    // Create new audio element
    const audio = new Audio();
    audioRef.current = audio;
    
    // Configure audio element
    audio.preload = "metadata";
    audio.volume = volume;
    audio.playbackRate = playbackRate;
    
    // Set up event listeners
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", () => setIsLoading(false));
    audio.addEventListener("waiting", () => setIsLoading(true));
    audio.addEventListener("playing", () => setIsLoading(false));
    audio.addEventListener("timeupdate", handleTimeUpdate);
    
    // Clean up on unmount
    return () => {
      if (audioRef.current) {
        const audio = audioRef.current;
        
        // Stop playback
        audio.pause();
        
        // Remove event listeners
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("canplay", () => setIsLoading(false));
        audio.removeEventListener("waiting", () => setIsLoading(true));
        audio.removeEventListener("playing", () => setIsLoading(false));
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        
        // Clear interval if it exists
        if (timeUpdateIntervalRef.current) {
          window.clearInterval(timeUpdateIntervalRef.current);
        }
        
        // Revoke object URL if needed
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
      }
    };
  }, []);
  
  // Update audio source when audioUrl or audioBlob changes
  useEffect(() => {
    if (!audioRef.current) return;
    
    setIsLoading(true);
    
    // Use audioBlob if available, otherwise use audioUrl
    if (audioBlob instanceof Blob) {
      const objectUrl = URL.createObjectURL(audioBlob);
      audioRef.current.src = objectUrl;
    } else if (audioUrl) {
      audioRef.current.src = audioUrl;
    }
    
    // Autoplay if requested
    if (autoplay) {
      playAudio();
    }
  }, [audioUrl, audioBlob]);
  
  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);
  
  // Update playback rate when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);
  
  // Handle metadata loaded event - get audio duration
  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    
    const audioDuration = audioRef.current.duration;
    
    // Update duration if it's a valid number
    if (audioDuration && !isNaN(audioDuration) && isFinite(audioDuration)) {
      setDuration(audioDuration);
      if (onDurationChange) {
        onDurationChange(audioDuration);
      }
    } else if (initialDuration && initialDuration > 0) {
      // Fall back to initialDuration if available
      setDuration(initialDuration);
      if (onDurationChange) {
        onDurationChange(initialDuration);
      }
    } else {
      // Use a default duration if all else fails
      setDuration(100);
      if (onDurationChange) {
        onDurationChange(100);
      }
    }
    
    setIsLoading(false);
  };
  
  // Handle time update event - update current time
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
  
  // Handle ended event
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    
    if (onEnded) {
      onEnded();
    }
  };
  
  // Play audio
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
  
  // Pause audio
  const pauseAudio = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setIsPlaying(false);
  };
  
  // Toggle play/pause
  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };
  
  // Skip forward 10 seconds
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
  
  // Skip backward 10 seconds
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
  
  // Seek to a specific position
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
  
  // Change volume
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };
  
  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  // Change playback rate
  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
  };
  
  // Calculate progress for the progress bar
  const calculateProgress = () => {
    if (duration <= 0) return 0;
    return (currentTime / duration) * 100;
  };
  
  // Validate and ensure duration is a positive number
  const validDuration = duration > 0 && isFinite(duration) ? duration : 100;
  
  return (
    <div className="w-full bg-background border rounded-md p-4 shadow-sm">
      <div className="space-y-4">
        {/* Timeline seeker */}
        <div className="w-full space-y-1">
          <div className="relative">
            <Slider 
              value={[currentTime]} 
              min={0} 
              max={validDuration} 
              step={0.01}
              onValueChange={handleSeek}
              onValueCommit={() => setIsDragging(false)}
              onPointerDown={() => setIsDragging(true)}
              className="cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(Math.floor(currentTime))}</span>
            <span>{formatTime(Math.floor(validDuration))}</span>
          </div>
        </div>
        
        {/* Controls - Improved layout */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={skipBackward}
              aria-label="Retroceder 10 segundos"
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={togglePlayPause}
              className="h-10 w-10"
              disabled={isLoading}
              aria-label={isPlaying ? "Pausar" : "Reproducir"}
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={skipForward}
              aria-label="Avanzar 10 segundos"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => changePlaybackRate(1)}
                className={`h-6 px-2 ${playbackRate === 1 ? 'bg-primary/20' : ''}`}
              >
                1x
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => changePlaybackRate(1.5)}
                className={`h-6 px-2 ${playbackRate === 1.5 ? 'bg-primary/20' : ''}`}
              >
                1.5x
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => changePlaybackRate(2)}
                className={`h-6 px-2 ${playbackRate === 2 ? 'bg-primary/20' : ''}`}
              >
                2x
              </Button>
            </div>
            
            <div className="flex items-center gap-1 ml-1">
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
                className="w-[60px] sm:w-[80px]"
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
