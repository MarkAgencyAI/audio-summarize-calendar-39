import React, { useState, useRef, useEffect } from "react";
import { TranscriptionTabProps, HighlightMenuPosition, SelectionRange } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { 
  PlayCircle, PauseCircle, Copy, Highlighter, FileText, 
  Info, CheckCircle, Bookmark, Search, Settings, AlignJustify
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { highlightColors } from "../types";
import { cn } from "@/lib/utils";

export function TranscriptionTab({
  data,
  onTextSelection
}: TranscriptionTabProps) {
  const [selectedText, setSelectedText] = useState("");
  const [highlightMenuPosition, setHighlightMenuPosition] = useState<HighlightMenuPosition | null>(null);
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(highlightColors[0].value);
  const [transcriptionSpeed, setTranscriptionSpeed] = useState(1);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  
  const transcriptionRef = useRef<HTMLDivElement>(null);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
  
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
  
    return debouncedValue;
  }
  
  useEffect(() => {
    console.log("Transcription data loaded:", {
      hasOutput: !!data.recording.output,
      outputLength: data.recording.output?.length || 0,
      hasHighlights: data.highlights?.length > 0
    });
  }, [data.recording.output, data.highlights]);
  
  const toggleAudioPlayback = () => {
    setIsAudioPlaying(!isAudioPlaying);
  };
  
  const handleSpeedChange = (value: number[]) => {
    setTranscriptionSpeed(value[0]);
  };
  
  const handleTextSelect = () => {
    const selection = window.getSelection();
    if (!selection) return;
    
    const text = selection.toString().trim();
    if (text && text.length > 0) {
      setSelectedText(text);
      
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      if (transcriptionRef.current) {
        const transcriptionRect = transcriptionRef.current.getBoundingClientRect();
        setHighlightMenuPosition({
          x: rect.left + rect.width / 2 - transcriptionRect.left,
          y: rect.top - transcriptionRect.top - 10
        });
        
        const content = data.recording.output || "";
        const startPos = content.indexOf(text);
        if (startPos !== -1) {
          setSelectionRange({
            start: startPos,
            end: startPos + text.length
          });
          setIsPopoverOpen(true);
        }
      }
    } else {
      clearSelection();
    }
  };
  
  const clearSelection = () => {
    setSelectedText("");
    setHighlightMenuPosition(null);
    setSelectionRange(null);
    setIsPopoverOpen(false);
  };
  
  const handleHighlight = () => {
    if (selectionRange && selectedText) {
      data.updateRecording(data.recording.id, {
        highlights: [
          ...(data.highlights || []),
          {
            id: Date.now().toString(),
            text: selectedText,
            color: selectedColor,
            startPosition: selectionRange.start,
            endPosition: selectionRange.end,
          },
        ],
      });
      
      setIsPopoverOpen(false);
      clearSelection();
      toast.success("Texto resaltado correctamente");
    }
  };
  
  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };
  
  const handleCopy = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      toast.success("Texto copiado al portapapeles");
    }
  };
  
  const clearHighlight = (highlightId: string) => {
    data.updateRecording(data.recording.id, {
      highlights: data.highlights.filter((h) => h.id !== highlightId),
    });
    toast.success("Resaltado eliminado");
  };
  
  const renderHighlightedText = () => {
    let transcription = data.recording.output || "";
    const highlights = data.highlights || [];
    
    if (!transcription || transcription.trim() === "") {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <FileText className="h-8 w-8 text-blue-500 dark:text-blue-400" />
          </div>
          <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">No hay transcripción</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
            La transcripción se generará automáticamente cuando proceses audio.
          </p>
        </div>
      );
    }
    
    if (highlights.length === 0) {
      if (debouncedSearchTerm) {
        return highlightSearchMatches(transcription, debouncedSearchTerm);
      }
      
      return <p className="whitespace-pre-wrap">{transcription}</p>;
    }
    
    const sortedHighlights = [...highlights].sort((a, b) => a.startPosition - b.startPosition);
    
    let parts = [];
    let lastIndex = 0;
    
    for (const highlight of sortedHighlights) {
      if (highlight.startPosition > lastIndex) {
        const textBefore = transcription.substring(lastIndex, highlight.startPosition);
        
        if (debouncedSearchTerm) {
          parts.push(
            <React.Fragment key={`before-${lastIndex}`}>
              {highlightSearchMatches(textBefore, debouncedSearchTerm)}
            </React.Fragment>
          );
        } else {
          parts.push(<span key={`text-${lastIndex}`}>{textBefore}</span>);
        }
      }
      
      const highlightText = transcription.substring(highlight.startPosition, highlight.endPosition);
      parts.push(
        <mark
          key={highlight.id}
          style={{ backgroundColor: highlight.color }}
          className="relative px-1 py-0.5 rounded group"
        >
          {highlightText}
          <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              size="icon"
              variant="secondary"
              className="h-5 w-5 rounded-full border border-white shadow-sm"
              onClick={() => clearHighlight(highlight.id)}
            >
              <span className="sr-only">Eliminar resaltado</span>
              ×
            </Button>
          </span>
        </mark>
      );
      
      lastIndex = highlight.endPosition;
    }
    
    if (lastIndex < transcription.length) {
      const remainingText = transcription.substring(lastIndex);
      
      if (debouncedSearchTerm) {
        parts.push(
          <React.Fragment key={`after-${lastIndex}`}>
            {highlightSearchMatches(remainingText, debouncedSearchTerm)}
          </React.Fragment>
        );
      } else {
        parts.push(<span key={`text-${lastIndex}`}>{remainingText}</span>);
      }
    }
    
    return <div className="whitespace-pre-wrap">{parts}</div>;
  };
  
  const highlightSearchMatches = (text: string, searchTerm: string) => {
    if (!searchTerm) return <span>{text}</span>;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    
    return (
      <>
        {parts.map((part, index) => {
          const isMatch = part.toLowerCase() === searchTerm.toLowerCase();
          return isMatch ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-700 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          );
        })}
      </>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-md">
            <FileText className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">Transcripción</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {data.recording.output 
                ? `${data.recording.output.length} caracteres` 
                : "Sin contenido disponible"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 pr-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded-md w-32 sm:w-40 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-200"
            />
            {searchTerm && (
              <button 
                className="absolute inset-y-0 right-2 flex items-center"
                onClick={() => setSearchTerm("")}
              >
                <span className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">×</span>
              </button>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 border-slate-200 dark:border-slate-700"
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Opciones</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setShowSettings(!showSettings)}>
                <AlignJustify className="h-4 w-4 mr-2" />
                <span>Opciones de vista</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={toggleAudioPlayback}>
                {isAudioPlaying ? <PauseCircle className="h-4 w-4 mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                <span>{isAudioPlaying ? "Pausar" : "Reproducir"}</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => {
                  if (data.recording.output) {
                    navigator.clipboard.writeText(data.recording.output);
                    toast.success("Transcripción copiada al portapapeles");
                  }
                }}
                disabled={!data.recording.output}
              >
                <Copy className="h-4 w-4 mr-2" />
                <span>Copiar todo</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className={cn(
                  "h-8 w-8 border-slate-200 dark:border-slate-700",
                  selectedText ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : ""
                )}
                disabled={!selectedText}
              >
                <Highlighter className="h-4 w-4" />
                <span className="sr-only">Resaltar</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <h4 className="text-sm font-medium mb-2">Resaltar texto seleccionado</h4>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {highlightColors.map((color) => (
                  <button
                    key={color.value}
                    className={cn(
                      "h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700",
                      selectedColor === color.value ? "ring-2 ring-offset-2 ring-blue-500" : ""
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => handleColorSelect(color.value)}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  variant="outline" 
                  onClick={handleCopy}
                >
                  Copiar
                </Button>
                <Button className="flex-1" onClick={handleHighlight}>
                  Resaltar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {showSettings && (
        <div className="mb-4 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/30 flex flex-col gap-2">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Opciones de reproducción</h4>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Velocidad</span>
                <span>{transcriptionSpeed}x</span>
              </div>
              <Slider 
                value={[transcriptionSpeed]} 
                min={0.5} 
                max={2} 
                step={0.1} 
                onValueChange={handleSpeedChange} 
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8"
              onClick={toggleAudioPlayback}
            >
              {isAudioPlaying ? 
                <PauseCircle className="h-4 w-4" /> : 
                <PlayCircle className="h-4 w-4" />
              }
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-hidden min-h-0 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/30">
        <ScrollArea className="h-full w-full">
          <div 
            className="p-4 md:p-5"
            ref={transcriptionRef}
            onMouseUp={handleTextSelect}
          >
            <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {renderHighlightedText()}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
