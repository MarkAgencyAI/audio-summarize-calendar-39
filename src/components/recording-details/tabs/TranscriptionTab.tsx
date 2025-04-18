
import React, { useState } from "react";
import { TranscriptionTabProps } from "../types";
import { FileText, Search, Copy, Highlighter, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useHighlighting } from "../hooks/useHighlighting";
import { HighlightMenu } from "../HighlightMenu";
import { v4 as uuidv4 } from "uuid";
import { TextHighlight } from "@/context/RecordingsContext";

export function TranscriptionTab({
  data,
  onTextSelection
}: TranscriptionTabProps) {
  // UI control states
  const [searchTerm, setSearchTerm] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  
  const handleSaveHighlight = (highlight: Omit<TextHighlight, "id">) => {
    const newHighlight = {
      ...highlight,
      id: uuidv4()
    };
    
    const updatedHighlights = [...(data.highlights || []), newHighlight];
    data.updateRecording(data.recording.id, {
      highlights: updatedHighlights
    });
  };
  
  const handleRemoveHighlight = (highlightId: string) => {
    const updatedHighlights = data.highlights.filter(h => h.id !== highlightId);
    data.updateRecording(data.recording.id, {
      highlights: updatedHighlights
    });
  };
  
  const {
    selectedText,
    contentRef,
    highlightMenuPosition,
    isHighlightMenuOpen,
    handleTextSelection,
    closeHighlightMenu,
    applyHighlight,
    copySelectedText,
    removeHighlightAtSelection,
    renderHighlightedText
  } = useHighlighting({
    highlights: data.highlights || [],
    onSaveHighlight: handleSaveHighlight,
    onRemoveHighlight: handleRemoveHighlight,
    recordingId: data.recording.id
  });
  
  // Function to render transcription content
  const renderTranscriptionContent = () => {
    const transcription = data.recording.output || "";
    
    // If no transcription available
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
    
    // If active search, highlight results
    if (searchTerm.trim()) {
      const regex = new RegExp(`(${searchTerm})`, 'gi');
      const parts = transcription.split(regex);
      
      return (
        <div className="whitespace-pre-wrap" style={{ fontSize: `${fontSize}px` }}>
          {parts.map((part, i) => 
            part.toLowerCase() === searchTerm.toLowerCase() ? (
              <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded">
                {part}
              </mark>
            ) : (
              <React.Fragment key={i}>{part}</React.Fragment>
            )
          )}
        </div>
      );
    }
    
    // Render with highlights
    return (
      <div style={{ fontSize: `${fontSize}px` }}>
        {renderHighlightedText(transcription)}
      </div>
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
          
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "h-8 gap-1.5",
              isHighlightMenuOpen ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" : ""
            )}
            onClick={() => handleTextSelection()}
          >
            <Highlighter className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:inline-block">Resaltar</span>
          </Button>
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
          ref={contentRef}
          onMouseUp={handleTextSelection}
          className="text-sm leading-relaxed text-slate-700 dark:text-slate-300"
        >
          {(() => {
            const transcription = data.recording.output || "";
            
            // If no transcription available
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
            
            // If active search, highlight results
            if (searchTerm.trim()) {
              const regex = new RegExp(`(${searchTerm})`, 'gi');
              const parts = transcription.split(regex);
              
              return (
                <div className="whitespace-pre-wrap" style={{ fontSize: `${fontSize}px` }}>
                  {parts.map((part, i) => 
                    part.toLowerCase() === searchTerm.toLowerCase() ? (
                      <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded">
                        {part}
                      </mark>
                    ) : (
                      <React.Fragment key={i}>{part}</React.Fragment>
                    )
                  )}
                </div>
              );
            }
            
            // Render with highlights
            return (
              <div style={{ fontSize: `${fontSize}px` }}>
                {renderHighlightedText(transcription)}
              </div>
            );
          })()}
        </div>
      </div>
      
      {/* Highlight menu */}
      {isHighlightMenuOpen && (
        <HighlightMenu
          position={highlightMenuPosition}
          isOpen={isHighlightMenuOpen}
          onClose={closeHighlightMenu}
          onApply={applyHighlight}
          onRemove={removeHighlightAtSelection}
          onCopy={copySelectedText}
          selectedText={selectedText}
        />
      )}
    </div>
  );
}

// Local TextHighlight interface
interface TextHighlight {
  id: string;
  text: string;
  color: string;
  startPosition: number;
  endPosition: number;
  recording_id: string;
}
