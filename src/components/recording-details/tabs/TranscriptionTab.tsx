
import React, { useState, useRef, useEffect } from "react";
import { TranscriptionTabProps, HighlightMenuPosition, SelectionRange } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, Search, Copy, Highlighter, Info, 
  Settings, Play, Pause, Settings2, Check, X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { HexColorPicker } from "react-colorful";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Define available highlight colors
const DEFAULT_HIGHLIGHT_COLORS = [
  { name: "Amarillo", value: "#FEF7CD" },
  { name: "Verde", value: "#F2FCE2" },
  { name: "Azul", value: "#D3E4FD" },
  { name: "Naranja", value: "#FEC6A1" },
  { name: "Rosa", value: "#FFDEE2" },
  { name: "Lila", value: "#E5DEFF" },
  { name: "Durazno", value: "#FDE1D3" },
  { name: "Gris", value: "#F1F0FB" },
];

export function TranscriptionTab({
  data,
  onTextSelection
}: TranscriptionTabProps) {
  const [selectedText, setSelectedText] = useState("");
  const [highlightMenuPosition, setHighlightMenuPosition] = useState<HighlightMenuPosition | null>(null);
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_HIGHLIGHT_COLORS[0].value);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [customColor, setCustomColor] = useState("#FEF7CD");
  
  const transcriptionRef = useRef<HTMLDivElement>(null);
  const selectionTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Log transcription data for debugging
  useEffect(() => {
    console.log("Transcription data:", {
      hasOutput: !!data.recording.output,
      outputLength: data.recording.output?.length || 0,
      firstChars: data.recording.output?.substring(0, 50),
      highlights: data.highlights?.length || 0
    });
  }, [data]);

  useEffect(() => {
    // Clean up timeout on unmount
    return () => {
      if (selectionTimeout.current) {
        clearTimeout(selectionTimeout.current);
      }
    };
  }, []);

  const handleTextSelect = () => {
    // Clear any existing timeout
    if (selectionTimeout.current) {
      clearTimeout(selectionTimeout.current);
    }
    
    // Set a small delay to handle selection properly
    selectionTimeout.current = setTimeout(() => {
      const selection = window.getSelection();
      if (!selection) return;
      
      const text = selection.toString().trim();
      
      if (text && text.length > 0) {
        setSelectedText(text);
        
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          
          // Check if selection is within our transcription element
          if (transcriptionRef.current && transcriptionRef.current.contains(range.commonAncestorContainer)) {
            const rect = range.getBoundingClientRect();
            const transcriptionRect = transcriptionRef.current.getBoundingClientRect();
            
            // Calculate position for the highlight menu
            setHighlightMenuPosition({
              x: rect.left + rect.width / 2 - transcriptionRect.left,
              y: rect.top - transcriptionRect.top - 10
            });
            
            // Calculate selection range within text
            const content = data.recording.output || "";
            const preSelectionRange = range.cloneRange();
            preSelectionRange.selectNodeContents(transcriptionRef.current);
            preSelectionRange.setEnd(range.startContainer, range.startOffset);
            const startPos = preSelectionRange.toString().length;
            
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
    }, 100);
  };
  
  const clearSelection = () => {
    setSelectedText("");
    setHighlightMenuPosition(null);
    setSelectionRange(null);
    setIsPopoverOpen(false);
  };
  
  const handleHighlight = () => {
    if (selectionRange && selectedText) {
      const color = colorPickerOpen ? customColor : selectedColor;
      
      data.updateRecording(data.recording.id, {
        highlights: [
          ...(data.highlights || []),
          {
            id: crypto.randomUUID(),
            text: selectedText,
            color: color,
            startPosition: selectionRange.start,
            endPosition: selectionRange.end,
          },
        ],
      });
      
      setIsPopoverOpen(false);
      clearSelection();
      window.getSelection()?.removeAllRanges();
      toast.success("Texto resaltado correctamente");
    }
  };
  
  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setColorPickerOpen(false);
  };
  
  const handleCopy = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      toast.success("Texto copiado al portapapeles");
      setIsPopoverOpen(false);
    }
  };
  
  const clearHighlight = (highlightId: string) => {
    data.updateRecording(data.recording.id, {
      highlights: data.highlights.filter((h) => h.id !== highlightId),
    });
    toast.success("Resaltado eliminado");
  };

  const renderTranscriptionContent = () => {
    const transcription = data.recording.output || "";
    
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
    
    // If we have transcription content but no highlights
    if (!data.highlights || data.highlights.length === 0) {
      // Search functionality
      if (searchTerm.trim()) {
        return highlightSearchMatches(transcription, searchTerm);
      }
      return <p className="whitespace-pre-wrap" style={{ fontSize: `${fontSize}px` }}>{transcription}</p>;
    }
    
    // With highlights
    const sortedHighlights = [...data.highlights].sort((a, b) => a.startPosition - b.startPosition);
    let parts = [];
    let lastIndex = 0;
    
    for (const highlight of sortedHighlights) {
      if (highlight.startPosition > lastIndex) {
        const textBefore = transcription.substring(lastIndex, highlight.startPosition);
        if (searchTerm.trim()) {
          parts.push(
            <React.Fragment key={`before-${lastIndex}`}>
              {highlightSearchMatches(textBefore, searchTerm)}
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
              <X className="h-3 w-3" />
            </Button>
          </span>
        </mark>
      );
      
      lastIndex = highlight.endPosition;
    }
    
    if (lastIndex < transcription.length) {
      const remainingText = transcription.substring(lastIndex);
      if (searchTerm.trim()) {
        parts.push(
          <React.Fragment key={`after-${lastIndex}`}>
            {highlightSearchMatches(remainingText, searchTerm)}
          </React.Fragment>
        );
      } else {
        parts.push(<span key={`text-${lastIndex}`}>{remainingText}</span>);
      }
    }
    
    return <div className="whitespace-pre-wrap" style={{ fontSize: `${fontSize}px` }}>{parts}</div>;
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

  // Create the highlight menu popup
  const renderHighlightMenu = () => {
    if (!highlightMenuPosition) return null;
    
    return (
      <div
        className="absolute bg-white dark:bg-slate-800 rounded-lg shadow-lg p-3 border border-slate-200 dark:border-slate-700 transform -translate-x-1/2 -translate-y-full z-50 min-w-[160px]"
        style={{
          left: `${highlightMenuPosition.x}px`,
          top: `${highlightMenuPosition.y}px`,
        }}
      >
        <div className="flex gap-2 mb-2">
          <Button size="sm" variant="outline" onClick={handleCopy} className="flex-1">
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copiar
          </Button>
          <Button size="sm" onClick={handleHighlight} className="flex-1">
            <Highlighter className="h-3.5 w-3.5 mr-1.5" />
            Resaltar
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {DEFAULT_HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.value}
              className={cn(
                "h-6 w-6 rounded-full border",
                selectedColor === color.value
                  ? "ring-2 ring-blue-500 ring-offset-1"
                  : "border-slate-200 dark:border-slate-700"
              )}
              style={{ backgroundColor: color.value }}
              onClick={() => handleColorSelect(color.value)}
              title={color.name}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
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
          
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:inline-block">Opciones</span>
          </Button>
          
          {data.recording.output && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(data.recording.output || "");
                toast.success("Transcripción copiada al portapapeles");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:inline-block">Copiar</span>
            </Button>
          )}
          
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "h-8 gap-1.5",
                  selectedText ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : ""
                )}
                disabled={!selectedText}
              >
                <Highlighter className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:inline-block">Resaltar</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4">
              <h4 className="text-sm font-medium mb-3">Resaltar texto seleccionado</h4>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  {!colorPickerOpen ? (
                    <>
                      <Label className="text-xs">Colores predefinidos</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {DEFAULT_HIGHLIGHT_COLORS.map((color) => (
                          <button
                            key={color.value}
                            className={cn(
                              "h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700",
                              selectedColor === color.value ? "ring-2 ring-offset-2 ring-blue-500" : ""
                            )}
                            style={{ backgroundColor: color.value }}
                            onClick={() => handleColorSelect(color.value)}
                            title={color.name}
                          />
                        ))}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-1 text-xs py-1 h-auto"
                        onClick={() => setColorPickerOpen(true)}
                      >
                        Personalizar color
                      </Button>
                    </>
                  ) : (
                    <>
                      <Label className="text-xs">Color personalizado</Label>
                      <div className="flex flex-col items-center">
                        <HexColorPicker 
                          color={customColor}
                          onChange={setCustomColor}
                          className="mb-2"
                        />
                        <Input
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          className="mb-2"
                        />
                        <div className="flex gap-2 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setColorPickerOpen(false)}
                          >
                            <X className="h-3.5 w-3.5 mr-1.5" />
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleHighlight()}
                          >
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            Aplicar
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {!colorPickerOpen && (
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      variant="outline" 
                      onClick={handleCopy}
                    >
                      Copiar
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={handleHighlight}
                    >
                      Resaltar
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {showSettings && (
        <div className="mb-4 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/30">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Tamaño de texto</span>
                <span>{fontSize}px</span>
              </div>
              <Slider 
                value={[fontSize]} 
                min={12} 
                max={24} 
                step={1} 
                onValueChange={(value) => setFontSize(value[0])} 
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-hidden min-h-0 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/30 relative">
        <ScrollArea className="h-full w-full">
          <div 
            className="p-4 md:p-5"
            ref={transcriptionRef}
            onMouseUp={handleTextSelect}
          >
            <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {renderTranscriptionContent()}
            </div>
          </div>
        </ScrollArea>
        
        {/* Floating highlight menu when text is selected */}
        {isPopoverOpen && highlightMenuPosition && renderHighlightMenu()}
      </div>
    </div>
  );
}
