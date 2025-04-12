
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { 
  Play, Pause, SkipBack, SkipForward, 
  Volume2, VolumeX, Waveform, Scissors, 
  Rewind, FastForward
} from "lucide-react";
import { formatTime } from "@/lib/audio-utils";
import { toast } from "sonner";
import { AudioPlayerHandle } from "./types";
import { useIsMobile } from "@/hooks/use-mobile";

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

export const AudioPlayerV2 = forwardRef<AudioPlayerHandle, AudioPlayerProps>(({
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const isMobile = useIsMobile();

  // Selection state for chapters
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

  // Initialize audio element
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

  // Set audio source
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
  }, [audioUrl, audioBlob, autoplay]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Update playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Draw waveform
  useEffect(() => {
    const drawWaveform = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Get canvas dimensions
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Generate placeholder waveform
      const centerY = height / 2;
      const barCount = Math.max(20, Math.floor(width / 15));
      const barSpacing = width / barCount;
      const barMaxHeight = height * 0.6;
      
      // Draw placeholder waveform
      ctx.lineWidth = 2;
      
      // Draw background waveform
      ctx.strokeStyle = isDarkMode() ? '#334155' : '#e2e8f0';
      drawWaveformPath(ctx, width, height, centerY, barCount, barSpacing, barMaxHeight);
      ctx.stroke();
      
      // Draw played portion
      const progressWidth = (currentTime / duration) * width;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, progressWidth, height);
      ctx.clip();
      ctx.strokeStyle = isDarkMode() ? '#60a5fa' : '#3b82f6';
      drawWaveformPath(ctx, width, height, centerY, barCount, barSpacing, barMaxHeight);
      ctx.stroke();
      ctx.restore();
      
      // Draw selection if active
      if (selectionStart !== null && selectionEnd !== null) {
        const startX = (Math.min(selectionStart, selectionEnd) / duration) * width;
        const endX = (Math.max(selectionStart, selectionEnd) / duration) * width;
        const selectionWidth = endX - startX;
        
        ctx.fillStyle = isDarkMode() ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.3)';
        ctx.fillRect(startX, 0, selectionWidth, height);
        
        // Draw selection borders
        ctx.strokeStyle = isDarkMode() ? '#60a5fa' : '#3b82f6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX, height);
        ctx.moveTo(endX, 0);
        ctx.lineTo(endX, height);
        ctx.stroke();
      }
      
      // Draw playhead
      const playheadX = (currentTime / duration) * width;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
      
      // Draw playhead handle
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(playheadX, 5, 4, 0, 2 * Math.PI);
      ctx.fill();
    };
    
    const drawWaveformPath = (
      ctx: CanvasRenderingContext2D, 
      width: number, 
      height: number, 
      centerY: number, 
      barCount: number, 
      barSpacing: number, 
      barMaxHeight: number
    ) => {
      ctx.beginPath();
      
      // Top wave
      for (let i = 0; i < barCount; i++) {
        const x = i * barSpacing;
        // Use a sine wave with random variation for a natural look
        const barHeight = (Math.sin(i * 0.2) + 1) * 0.5 * barMaxHeight * (0.5 + Math.random() * 0.5);
        
        if (i === 0) {
          ctx.moveTo(x, centerY - barHeight);
        } else {
          ctx.lineTo(x, centerY - barHeight);
        }
      }
      
      // Bottom wave (mirror of top)
      for (let i = barCount - 1; i >= 0; i--) {
        const x = i * barSpacing;
        // Use the same pattern as the top wave but inverted
        const barHeight = (Math.sin(i * 0.2) + 1) * 0.5 * barMaxHeight * (0.5 + Math.random() * 0.5);
        
        ctx.lineTo(x, centerY + barHeight);
      }
      
      ctx.closePath();
    };
    
    const isDarkMode = () => {
      return document.documentElement.classList.contains('dark');
    };
    
    // Resize canvas to match container
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      
      canvas.width = container.clientWidth;
      canvas.height = 60;
      
      drawWaveform();
    };
    
    // Initialize canvas size
    resizeCanvas();
    
    // Redraw on window resize
    window.addEventListener('resize', resizeCanvas);
    
    // Animation frame for continuous drawing
    let animationFrameId: number;
    
    const animate = () => {
      drawWaveform();
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [currentTime, duration, selectionStart, selectionEnd]);

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
    
    audioRef.current.play().then(() => {
      setIsPlaying(true);
    }).catch(error => {
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

  const skipForward = (seconds = 10) => {
    if (!audioRef.current) return;
    const newTime = Math.min(audioRef.current.currentTime + seconds, duration);
    
    if (!isNaN(newTime) && isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      
      if (onTimeUpdate) {
        onTimeUpdate(newTime);
      }
    }
  };

  const skipBackward = (seconds = 10) => {
    if (!audioRef.current) return;
    const newTime = Math.max(audioRef.current.currentTime - seconds, 0);
    
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

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioRef.current) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickPosition = x / canvas.width;
    
    const newTime = clickPosition * duration;
    if (!isNaN(newTime) && isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      
      if (onTimeUpdate) {
        onTimeUpdate(newTime);
      }
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickPosition = x / canvas.width;
    
    const timeValue = clickPosition * duration;
    setIsSelecting(true);
    setSelectionStart(timeValue);
    setSelectionEnd(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickPosition = x / canvasRef.current.width;
    
    const timeValue = clickPosition * duration;
    setSelectionEnd(timeValue);
  };

  const handleCanvasMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
  };

  const handleCanvasMouseLeave = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
  };

  const handleAddChapter = () => {
    if (onAddChapter && selectionStart !== null && selectionEnd !== null) {
      // Ensure start time is always less than end time
      const startTime = Math.min(selectionStart, selectionEnd);
      const endTime = Math.max(selectionStart, selectionEnd);
      
      if (endTime - startTime < 0.5) {
        toast.error("La selección debe ser de al menos 0.5 segundos");
        return;
      }
      
      onAddChapter(startTime, endTime);
      clearSelection();
      toast.success("Capítulo creado correctamente");
    } else {
      toast.info("Selecciona un fragmento de audio para crear un capítulo");
    }
  };

  const clearSelection = () => {
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const validDuration = duration > 0 && isFinite(duration) ? duration : 100;

  return (
    <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="space-y-2 w-full p-3">
        {/* Waveform visualization */}
        <div 
          ref={containerRef}
          className="relative w-full h-16 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-700/30"
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-pointer"
            onClick={handleCanvasClick}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseLeave}
          />
          
          {/* Time indicators */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 py-1 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80">
            <span>{formatTime(0)}</span>
            <span>{formatTime(Math.floor(validDuration / 2))}</span>
            <span>{formatTime(Math.floor(validDuration))}</span>
          </div>
        </div>
        
        {/* Time Display */}
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{formatTime(Math.floor(currentTime))}</span>
          <span>-{formatTime(Math.floor(validDuration - currentTime))}</span>
        </div>
        
        {/* Seek slider */}
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
        
        {/* Primary Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center justify-center">
            {/* Jump backwards */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => skipBackward()} 
              className="h-9 w-9 rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700"
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            
            {/* Play/Pause */}
            <Button 
              variant="default" 
              size="icon" 
              onClick={togglePlayPause} 
              className="h-11 w-11 rounded-full mx-1 bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            
            {/* Jump forward */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => skipForward()} 
              className="h-9 w-9 rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Secondary Controls */}
          <div className="flex flex-wrap items-center gap-1 ml-auto">
            {/* Chapter creation button - only show when selection exists */}
            {selectionStart !== null && selectionEnd !== null && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddChapter} 
                className="h-8 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/40"
              >
                <Scissors className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Crear capítulo</span>
              </Button>
            )}
            
            {/* Speed control */}
            <div className="flex items-center space-x-1">
              {!isMobile && (
                <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Velocidad:</span>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => changePlaybackRate(1)} 
                className={`h-7 px-2.5 text-xs rounded-full ${playbackRate === 1 ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
              >
                1x
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => changePlaybackRate(1.5)} 
                className={`h-7 px-2.5 text-xs rounded-full ${playbackRate === 1.5 ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
              >
                1.5x
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => changePlaybackRate(2)} 
                className={`h-7 px-2.5 text-xs rounded-full ${playbackRate === 2 ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
              >
                2x
              </Button>
            </div>
            
            {/* Volume control */}
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleMute}
                onMouseEnter={() => setShowVolumeControl(true)}
                className="h-8 w-8 rounded-full"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              
              {showVolumeControl && (
                <div 
                  className="absolute bottom-full right-0 mb-2 p-3 rounded-lg bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 w-[120px]"
                  onMouseEnter={() => setShowVolumeControl(true)}
                  onMouseLeave={() => setShowVolumeControl(false)}
                >
                  <Slider 
                    value={[isMuted ? 0 : volume]} 
                    min={0} 
                    max={1} 
                    step={0.01} 
                    onValueChange={handleVolumeChange} 
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

AudioPlayerV2.displayName = "AudioPlayerV2";
