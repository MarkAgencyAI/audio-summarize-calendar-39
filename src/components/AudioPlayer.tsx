
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Waveform, Trash2, Plus, Scissors } from "lucide-react";
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
  onAddChapter?: (time: number) => void;
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
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [showWaveform, setShowWaveform] = useState(true);
  
  const timeUpdateIntervalRef = useRef<number | null>(null);

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
        
        if (timeUpdateIntervalRef.current) {
          window.clearInterval(timeUpdateIntervalRef.current);
        }
        
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
  
  const toggleWaveform = () => {
    setShowWaveform(!showWaveform);
  };
  
  const handleAddChapter = () => {
    if (onAddChapter) {
      onAddChapter(currentTime);
    }
  };
  
  const calculateProgress = () => {
    if (duration <= 0) return 0;
    return (currentTime / duration) * 100;
  };
  
  const validDuration = duration > 0 && isFinite(duration) ? duration : 100;
  
  const formattedCurrentTime = formatTime(Math.floor(currentTime));
  
  return (
    <div className="w-full bg-background border rounded-md p-4 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleWaveform}
            className="text-xs h-8 flex items-center gap-1"
          >
            <WaveformIcon className="h-4 w-4" />
            {showWaveform ? "Hide waveform" : "Show waveform"}
          </Button>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-8 flex items-center gap-1 text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
              Delete selection
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddChapter}
              className="text-xs h-8 flex items-center gap-1 bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200"
            >
              <Scissors className="h-4 w-4" />
              Add chapter at {formattedCurrentTime}
            </Button>
          </div>
        </div>
        
        <div className="relative w-full h-24 bg-gray-100 rounded-lg overflow-hidden mb-2">
          <div className="absolute inset-0 flex items-center justify-start">
            <div className="h-full w-1/3 bg-blue-500/30 border-r-2 border-blue-500 flex items-center justify-center">
              <div className="w-full h-16 px-4">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                  <path 
                    d="M 0,50 Q 10,40 20,50 T 40,50 T 60,50 T 80,50 T 100,50" 
                    stroke="rgb(59, 130, 246)" 
                    strokeWidth="2" 
                    fill="none"
                  />
                  <path 
                    d="M 0,50 Q 10,60 20,50 T 40,50 T 60,50 T 80,50 T 100,50" 
                    stroke="rgb(59, 130, 246)" 
                    strokeWidth="2" 
                    fill="none"
                  />
                </svg>
              </div>
            </div>
            <div className="h-full flex-1 flex items-center justify-center">
              <div className="w-full h-10 px-4">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                  <path 
                    d="M 0,50 Q 10,45 20,50 T 40,50 T 60,50 T 80,50 T 100,50" 
                    stroke="rgb(156, 163, 175)" 
                    strokeWidth="1.5" 
                    fill="none"
                  />
                  <path 
                    d="M 0,50 Q 10,55 20,50 T 40,50 T 60,50 T 80,50 T 100,50" 
                    stroke="rgb(156, 163, 175)" 
                    strokeWidth="1.5" 
                    fill="none"
                  />
                </svg>
              </div>
            </div>
            
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-red-500"
              style={{ 
                left: `${(currentTime / validDuration) * 100}%`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="w-3 h-3 rounded-full bg-red-500 absolute -top-1.5 left-1/2 transform -translate-x-1/2"></div>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-gray-500">
            <span>0:00</span>
            <span>0:30</span>
            <span>1:00</span>
            <span>1:30</span>
            <span>2:00</span>
            <span>2:30</span>
            <span>3:00</span>
            <span>{formatTime(Math.floor(validDuration))}</span>
          </div>
        </div>
        
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
