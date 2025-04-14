import React, { useState, useRef, useEffect } from "react";
import { TranscriptionTabProps } from "../types";
import { FileText, Search, Copy, Highlighter, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { HexColorPicker } from "react-colorful";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TranscriptionTab({
  data,
  onTextSelection
}: TranscriptionTabProps) {
  // State for text selection and highlighting
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{start: number, end: number} | null>(null);
  const [highlightColor, setHighlightColor] = useState("#FFEB3B");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isHighlightMenuOpen, setIsHighlightMenuOpen] = useState(false);
  const [preventAutoClose, setPreventAutoClose] = useState(false);
  
  // State for UI controls
  const [searchTerm, setSearchTerm] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  
  // References
  const transcriptionRef = useRef<HTMLDivElement>(null);

  // Setup highlights from recording data
  const highlights = data.highlights || [];
  
  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === "") {
      clearSelection();
      return;
    }
    
    // Get the selected text
    const text = selection.toString().trim();
    if (text.length === 0) {
      clearSelection();
      return;
    }
    
    // Make sure selection is within our component
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!transcriptionRef.current?.contains(range.commonAncestorContainer)) {
        clearSelection();
        return;
      }
      
      // Get the selection range in the text
      const fullText = data.recording.output || "";
      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(transcriptionRef.current);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const startPos = preSelectionRange.toString().length;
      
      // Set the selected text and range
      setSelectedText(text);
      setSelectionRange({
        start: startPos,
        end: startPos + text.length
      });
      
      // Open the highlight popup
      setIsHighlightMenuOpen(true);
    }
  };
  
  // Clear the current selection
  const clearSelection = () => {
    if (!preventAutoClose) {
      setSelectedText("");
      setSelectionRange(null);
      setIsHighlightMenuOpen(false);
    }
  };

  // Handle popover interactions
  useEffect(() => {
    if (!isHighlightMenuOpen) {
      setPreventAutoClose(false);
      setIsColorPickerOpen(false);
    }
  }, [isHighlightMenuOpen]);

  // Reset preventAutoClose when color picker is closed
  useEffect(() => {
    if (!isColorPickerOpen) {
      setPreventAutoClose(false);
    }
  }, [isColorPickerOpen]);
  
  // Apply highlight to selected text
  const applyHighlight = () => {
    if (!selectionRange || !selectedText) return;
    
    // Create a new highlight
    const newHighlight = {
      id: crypto.randomUUID(),
      text: selectedText,
      color: highlightColor,
      startPosition: selectionRange.start,
      endPosition: selectionRange.end
    };
    
    // Update recording with new highlight
    data.updateRecording(data.recording.id, {
      highlights: [...highlights, newHighlight]
    });
    
    // Clean up selection
    clearSelection();
    window.getSelection()?.removeAllRanges();
    toast.success("Texto resaltado correctamente");
  };
  
  // Handle copying text to clipboard
  const handleCopy = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      toast.success("Texto copiado al portapapeles");
      clearSelection();
    }
  };
  
  // Remove a highlight
  const removeHighlight = (highlightId: string) => {
    data.updateRecording(data.recording.id, {
      highlights: highlights.filter(h => h.id !== highlightId)
    });
    toast.success("Resaltado eliminado");
  };

  // Toggle color picker
  const handleColorPickerToggle = () => {
    setPreventAutoClose(true);
    setIsColorPickerOpen(!isColorPickerOpen);
  };

  // Handle color selection
  const handleColorSelect = (color: string) => {
    setHighlightColor(color);
  };

  // Render the transcription content with highlights
  const renderTranscriptionContent = () => {
    const transcription = data.recording.output || "";
    
    // If no transcription is available
    if (!transcription || transcription.trim() === "") {
      return (
        <div className="text-center p-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <FileText className="h-8 w-8 text-blue-500 dark:text-blue-400" />
          </div>
          <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">No hay transcripción</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            La transcripción se generará automáticamente cuando proceses audio.
          </p>
        </div>
      );
    }
    
    // If searching, just highlight search results
    if (searchTerm.trim() && (!highlights || highlights.length === 0)) {
      return highlightSearchMatches(transcription, searchTerm);
    }
    
    // If no highlights, just show the text
    if (!highlights || highlights.length === 0) {
      return <p className="whitespace-pre-wrap" style={{ fontSize: `${fontSize}px` }}>{transcription}</p>;
    }
    
    // Render text with highlights
    const sortedHighlights = [...highlights].sort((a, b) => a.startPosition - b.startPosition);
    let parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    for (const highlight of sortedHighlights) {
      // Add text before the highlight
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
      
      // Add the highlighted text
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
              onClick={() => removeHighlight(highlight.id)}
            >
              <span className="sr-only">Eliminar resaltado</span>
              <X className="h-3 w-3" />
            </Button>
          </span>
        </mark>
      );
      
      lastIndex = highlight.endPosition;
    }
    
    // Add text after the last highlight
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
  
  // Highlight search matches in text
  const highlightSearchMatches = (text: string, term: string) => {
    if (!term.trim()) return <span>{text}</span>;
    
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    
    return (
      <>
        {parts.map((part, index) => {
          const isMatch = part.toLowerCase() === term.toLowerCase();
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
          
          <Popover 
            open={isHighlightMenuOpen} 
            onOpenChange={(open) => {
              if (!preventAutoClose) {
                setIsHighlightMenuOpen(open);
              }
            }}
          >
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
            <PopoverContent className="w-64 p-4 z-50">
              <h4 className="text-sm font-medium mb-3">Resaltar texto seleccionado</h4>
              
              <div className="space-y-4">
                {!isColorPickerOpen ? (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      Selecciona un color para el resaltado:
                    </p>
                    
                    <div className="mb-3">
                      <div 
                        className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 mb-2"
                        style={{ backgroundColor: highlightColor }}
                      />
                      
                      <div className="grid grid-cols-6 gap-2">
                        {["#FFEB3B", "#FFC107", "#FF9800", "#4CAF50", "#2196F3", "#9C27B0", 
                          "#F44336", "#E91E63", "#CDDC39", "#009688", "#673AB7", "#3F51B5"
                        ].map(color => (
                          <button
                            key={color}
                            type="button"
                            className={cn(
                              "w-8 h-8 rounded-full border",
                              highlightColor === color ? "ring-2 ring-blue-500 ring-offset-2" : "border-slate-200 dark:border-slate-700"
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => handleColorSelect(color)}
                          />
                        ))}
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-2 text-xs py-1 h-auto"
                        onClick={handleColorPickerToggle}
                      >
                        Personalizar color
                      </Button>
                    </div>
                    
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
                        onClick={applyHighlight}
                      >
                        Resaltar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs mb-2 block">Color personalizado</Label>
                    <HexColorPicker 
                      color={highlightColor}
                      onChange={setHighlightColor}
                      className="mb-2 w-full"
                    />
                    
                    <div className="mb-2">
                      <Input
                        value={highlightColor}
                        onChange={(e) => setHighlightColor(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={handleColorPickerToggle}
                      >
                        Volver
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={applyHighlight}
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {showSettings && (
        <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/30">
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
      
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/30 p-5">
        <div
          ref={transcriptionRef}
          onMouseUp={handleTextSelection}
          className="text-sm leading-relaxed text-slate-700 dark:text-slate-300"
        >
          {renderTranscriptionContent()}
        </div>
      </div>
    </div>
  );
}
