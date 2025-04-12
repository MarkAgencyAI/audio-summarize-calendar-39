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
  Activity,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AudioPlayerHandle } from "./types";

interface AudioPlayerProps {
  audioUrl?: string;
  audioBlob?: Blob;
  initialDuration?: number;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onAddChapter?: () => void;
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

    // Format time
    const formatTime = (time: number): string => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    };

    return (
      <div className="flex flex-col">
        <audio ref={audioRef} preload="metadata" />

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
          
          {onAddChapter && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onAddChapter}
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
