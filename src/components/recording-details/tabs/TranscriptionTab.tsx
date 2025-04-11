
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Search, PaintBucket, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TranscriptionTabProps, highlightColors } from "../types";
import { useSearch } from "../hooks/useSearch";
import { useHighlights } from "../hooks/useHighlights";
import { useRecordings } from "@/context/RecordingsContext";
import { useGroq } from "@/lib/groq";
import { sendToWebhook } from "@/lib/webhook";

const WEBHOOK_URL = "https://ssn8nss.maettiai.tech/webhook-test/8e34aca2-3111-488c-8ee8-a0a2c63fc9e4";

export function TranscriptionTab({
  data,
  onTextSelection
}: TranscriptionTabProps) {
  const { updateRecording } = useRecordings();
  const { llama3 } = useGroq();
  const [isEditingOutput, setIsEditingOutput] = useState(false);
  const [editedOutput, setEditedOutput] = useState(data.recording.output || "");
  const [isGeneratingOutput, setIsGeneratingOutput] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [highlightMenuPosition, setHighlightMenuPosition] = useState({ x: 0, y: 0 });
  const [customColor, setCustomColor] = useState("#ffffff");
  
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    currentSearchIndex,
    transcriptionRef,
    handleSearch,
    navigateSearch
  } = useSearch(data.recording.output);
  
  const {
    highlights,
    selectedText,
    selectionRange,
    removeHighlightAtSelection,
    applyHighlight,
    renderHighlightedText
  } = useHighlights(data.recording, updateRecording);
  
  useEffect(() => {
    if (showHighlightMenu && !selectedText) {
      setShowHighlightMenu(false);
    }
  }, [selectedText, showHighlightMenu]);
  
  const toggleHighlightMode = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() !== "") {
      onTextSelection();
    } else {
      toast.info("Selecciona texto para resaltar");
    }
  };
  
  const handleSaveOutput = async () => {
    await sendToWebhook(WEBHOOK_URL, {
      type: "output_update",
      recordingId: data.recording.id,
      output: editedOutput,
      timestamp: new Date().toISOString()
    });
    
    updateRecording(data.recording.id, {
      output: editedOutput
    });
    setIsEditingOutput(false);
    toast.success("Contenido actualizado");
  };
  
  const handleCancelOutputEdit = () => {
    setEditedOutput(data.recording.output || "");
    setIsEditingOutput(false);
  };
  
  const generateOutputWithGroq = async () => {
    try {
      setIsGeneratingOutput(true);
      toast.info("Generando contenido con IA...");

      await sendToWebhook(WEBHOOK_URL, {
        type: "generating_output",
        recordingId: data.recording.id,
        audioUrl: data.recording.audioUrl,
        timestamp: new Date().toISOString()
      });

      const prompt = `Genera un análisis del siguiente audio. Destaca los puntos principales, las fechas importantes si las hay, y organiza la información de forma clara y coherente. Si hay temas educativos, enfócate en explicarlos de manera didáctica.

Por favor proporciona un análisis bien estructurado de aproximadamente 5-10 oraciones.`;

      const response = await llama3({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      if (response && response.choices && response.choices[0]?.message?.content) {
        const output = response.choices[0].message.content;
        
        await sendToWebhook(WEBHOOK_URL, {
          type: "generated_output",
          recordingId: data.recording.id,
          output: output,
          timestamp: new Date().toISOString()
        });
        
        updateRecording(data.recording.id, {
          output: output
        });
        
        setEditedOutput(output);
        
        toast.success("Contenido generado exitosamente");
      } else {
        const simpleOutput = `Contenido generado localmente: Este es un análisis básico de la grabación "${data.recording.name}" que contiene aproximadamente ${data.recording.audioData.length} caracteres.`;
        
        await sendToWebhook(WEBHOOK_URL, {
          type: "fallback_output",
          recordingId: data.recording.id,
          output: simpleOutput,
          error: "No se pudo obtener respuesta de la API",
          timestamp: new Date().toISOString()
        });
        
        updateRecording(data.recording.id, {
          output: simpleOutput
        });
        
        setEditedOutput(simpleOutput);
        
        toast.warning("Se generó un contenido básico debido a problemas con la API");
      }
    } catch (error) {
      console.error("Error al generar el contenido:", error);
      
      await sendToWebhook(WEBHOOK_URL, {
        type: "output_generation_error",
        recordingId: data.recording.id,
        error: String(error),
        timestamp: new Date().toISOString()
      });
      
      toast.error("Error al generar el contenido");
      
      const errorOutput = "No se pudo generar un análisis automático. Por favor, intente más tarde o edite manualmente el contenido.";
      setEditedOutput(errorOutput);
      updateRecording(data.recording.id, {
        output: errorOutput
      });
    } finally {
      setIsGeneratingOutput(false);
    }
  };
  
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value);
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/20 rounded-md">
        <div className="flex-1 flex items-center gap-2 min-w-[200px]">
          <Input 
            placeholder="Buscar en la transcripción..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            className="h-9"
          />
          <Button onClick={handleSearch} variant="secondary" size="sm" className="h-9">
            <Search className="h-4 w-4 mr-1" />
            Buscar
          </Button>
        </div>
        
        {searchResults.length > 0 && (
          <div className="flex items-center gap-1">
            <Button 
              onClick={() => navigateSearch('prev')} 
              variant="outline" 
              size="sm"
              className="h-8 px-2"
            >
              Anterior
            </Button>
            <span className="text-xs">
              {currentSearchIndex + 1}/{searchResults.length}
            </span>
            <Button 
              onClick={() => navigateSearch('next')} 
              variant="outline" 
              size="sm"
              className="h-8 px-2"
            >
              Siguiente
            </Button>
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <Button 
            onClick={toggleHighlightMode} 
            variant="ghost" 
            size="sm"
            className="h-9 flex items-center gap-1"
          >
            <PaintBucket className="h-4 w-4" />
            <span>Resaltar</span>
          </Button>
        </div>
      </div>
      
      <div className="relative">
        {showHighlightMenu && selectionRange && (
          <div 
            className="absolute z-10 bg-white dark:bg-slate-800 shadow-md rounded-md p-2 flex flex-col gap-2"
            style={{
              left: `${highlightMenuPosition.x}px`,
              top: `${highlightMenuPosition.y - 130}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="grid grid-cols-4 gap-1">
              {highlightColors.map(color => (
                <button
                  key={color.value}
                  onClick={() => applyHighlight(color.value)}
                  className="w-6 h-6 rounded-full border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
            
            <div className="flex justify-between mt-1">
              <input 
                type="color" 
                value={customColor} 
                onChange={handleCustomColorChange}
                className="w-8 h-8 cursor-pointer"
              />
              <button 
                onClick={() => applyHighlight(customColor)}
                className="text-xs bg-primary text-white px-2 py-1 rounded"
              >
                Aplicar
              </button>
              <button
                onClick={removeHighlightAtSelection}
                className="text-xs bg-destructive text-white px-2 py-1 rounded"
              >
                Quitar
              </button>
            </div>
          </div>
        )}
        
        <ScrollArea className="h-[40vh] p-4 bg-muted/20 rounded-md">
          <div className="max-w-full">
            {isEditingOutput ? (
              <div className="space-y-4">
                <Textarea 
                  value={editedOutput}
                  onChange={e => setEditedOutput(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancelOutputEdit}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveOutput}>
                    Guardar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative max-w-full">
                <pre 
                  ref={transcriptionRef} 
                  className="whitespace-pre-wrap text-sm break-words max-w-full" 
                  onMouseUp={onTextSelection}
                >
                  {renderHighlightedText()}
                </pre>
                
                {!data.recording.output && (
                  <div className="flex flex-col items-center justify-center py-10 space-y-4">
                    <p className="text-muted-foreground text-center">
                      No hay transcripción disponible para esta grabación.
                    </p>
                    <Button 
                      onClick={generateOutputWithGroq} 
                      disabled={isGeneratingOutput}
                    >
                      {isGeneratingOutput ? (
                        <>
                          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generar con IA
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                {data.recording.output && (
                  <div className="flex justify-end mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditingOutput(true)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
