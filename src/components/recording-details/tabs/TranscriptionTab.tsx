
import React, { useState, useRef, useEffect } from "react";
import { TranscriptionTabProps, HighlightMenuPosition, SelectionRange } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { PlayCircle, PauseCircle, Rewind, Forward, Copy, Highlighter, Edit, Trash2, ChevronsUpDown, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { highlightColors } from "../types";
import { toast } from "sonner";

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const transcriptionRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  const toggleAudioPlayback = () => {
    setIsAudioPlaying(!isAudioPlaying);
  };
  
  const handleSpeedChange = (value: number[]) => {
    setTranscriptionSpeed(value[0]);
  };
  
  const handleTextSelect = () => {
    const selection = window.getSelection();
    if (!selection) return;
    
    const text = selection.toString();
    if (text && text.length > 0) {
      setSelectedText(text);
      
      const range = selection.getRangeAt(0);
      const { startOffset, endOffset } = range;
      
      // Calculate the start and end indices based on the current transcription content
      if (transcriptionRef.current) {
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;
        
        let startIndex = 0;
        let endIndex = 0;
        
        // Function to traverse nodes and calculate the index
        const calculateIndex = (node: Node, offset: number): number => {
          let index = 0;
          let currentNode: Node | null = transcriptionRef.current;
          
          while (currentNode) {
            if (currentNode === node) {
              return index + offset;
            }
            
            if (currentNode.textContent) {
              index += currentNode.textContent.length;
            }
            
            currentNode = currentNode.nextSibling;
          }
          
          return -1; // Should not happen if the node is within the transcriptionRef
        };
        
        startIndex = calculateIndex(startContainer, startOffset);
        endIndex = calculateIndex(endContainer, endOffset);
        
        if (startIndex !== -1 && endIndex !== -1) {
          setSelectionRange({ start: startIndex, end: endIndex });
          
          // Get the coordinates of the selected text
          const rect = range.getBoundingClientRect();
          setHighlightMenuPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + window.scrollY - 10, // Position above the text
          });
          setIsPopoverOpen(true);
          onTextSelection();
        }
      }
    } else {
      // Clear selection
      setSelectedText("");
      setHighlightMenuPosition(null);
      setSelectionRange(null);
      setIsPopoverOpen(false);
    }
  };
  
  const handleHighlight = () => {
    if (selectionRange) {
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
      setSelectedText("");
      setSelectionRange(null);
      toast.success("Texto resaltado");
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
  };
  
  const getHighlightStyle = (highlight: any) => {
    return {
      backgroundColor: highlight.color,
      borderRadius: "0.25rem",
      padding: "0.125rem 0.25rem",
      margin: "0 -0.25rem",
      display: "inline",
    };
  };
  
  const renderHighlightedText = () => {
    let transcription = data.recording.output || "";
    let highlights = data.highlights || [];
    let parts = [];
    let lastIndex = 0;
    
    // Sort highlights by start index
    highlights.sort((a, b) => a.startPosition - b.startPosition);
    
    for (const highlight of highlights) {
      if (highlight.endPosition <= lastIndex) {
        // Skip overlapping highlights
        continue;
      }
      
      // Add the text before the highlight
      if (highlight.startPosition > lastIndex) {
        parts.push(
          <React.Fragment key={`text-${lastIndex}`}>
            {transcription.substring(lastIndex, highlight.startPosition)}
          </React.Fragment>
        );
      }
      
      // Add the highlighted text
      const highlightText = transcription.substring(highlight.startPosition, highlight.endPosition);
      parts.push(
        <mark
          key={highlight.id}
          style={getHighlightStyle(highlight)}
          className="highlighted-text relative"
        >
          {highlightText}
          <div className="absolute top-0 left-0 w-full h-full opacity-0 hover:opacity-100 transition-opacity">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded shadow-md p-2 flex gap-1 items-center">
              <button onClick={() => clearHighlight(highlight.id)} className="hover:bg-slate-700 dark:hover:bg-slate-300 p-1 rounded">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </mark>
      );
      
      lastIndex = highlight.endPosition;
    }
    
    // Add the remaining text after the last highlight
    if (lastIndex < transcription.length) {
      parts.push(
        <React.Fragment key={`text-${lastIndex}`}>
          {transcription.substring(lastIndex)}
        </React.Fragment>
      );
    }
    
    return parts;
  };
  
  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
          Transcripción
        </h3>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/70"
            onClick={toggleAudioPlayback}
          >
            {isAudioPlaying ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
            <span className="sr-only">{isAudioPlaying ? 'Pause' : 'Play'}</span>
          </Button>
          
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/70"
                disabled={!selectedText}
              >
                <Highlighter className="h-4 w-4" />
                <span className="sr-only">Resaltar</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <p className="text-sm font-medium">Selecciona un color</p>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {highlightColors.map((color) => (
                  <button
                    key={color.value}
                    className={`h-6 w-6 rounded-full border border-slate-300 dark:border-slate-600 shadow-sm`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => handleColorSelect(color.value)}
                  />
                ))}
              </div>
              <Button className="w-full mt-3" onClick={handleHighlight}>
                Resaltar
              </Button>
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/70"
            disabled={!selectedText}
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4" />
            <span className="sr-only">Copiar</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/70"
            onClick={toggleExpanded}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="sr-only">{isExpanded ? 'Contraer' : 'Expandir'}</span>
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800/30">
        {isExpanded && (
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Velocidad de reproducción
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {transcriptionSpeed}x
              </div>
            </div>
            <Slider 
              defaultValue={[1]} 
              max={2} 
              min={0.5} 
              step={0.1} 
              onValueChange={handleSpeedChange} 
            />
          </div>
        )}
        
        <ScrollArea className="flex-1 h-full">
          <div 
            className="p-4 flex-1 overflow-wrap-anywhere transcription-text"
            ref={transcriptionRef}
            onMouseUp={handleTextSelect}
          >
            {data.recording.output ? (
              renderHighlightedText()
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 dark:bg-slate-900/30 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-slate-500 dark:text-slate-400" />
                </div>
                <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">No hay transcripción</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
                  La transcripción se generará automáticamente.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
