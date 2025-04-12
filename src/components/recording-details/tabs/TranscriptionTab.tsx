
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Search, PaintBucket, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { TranscriptionTabProps, highlightColors } from "../types";
import { useSearch } from "../hooks/useSearch";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();
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
  
  useEffect(() => {
    if (showHighlightMenu && !data.highlights) {
      setShowHighlightMenu(false);
    }
  }, [data.highlights, showHighlightMenu]);
  
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

  const searchControlsClass = isMobile ? "flex-col w-full" : "flex-row items-center";
  const searchActionButtonsClass = isMobile ? "mt-2 grid grid-cols-2 gap-1" : "flex gap-1 ml-2";
  const highlightMenuPositionY = isMobile ? -80 : -130;

  return (
    <div className="grid gap-4 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 bg-muted/20 rounded-md">
        <div className={`flex ${searchControlsClass} gap-2 flex-1 min-w-[200px]`}>
          <Input 
            placeholder="Buscar en la transcripción..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            className="h-9 flex-1"
          />
          <div className={searchActionButtonsClass}>
            <Button onClick={handleSearch} variant="secondary" size="sm" className="h-9">
              <Search className="h-4 w-4 mr-1" />
              <span className="whitespace-nowrap">Buscar</span>
            </Button>
            
            <Button 
              onClick={toggleHighlightMode} 
              variant="ghost" 
              size="sm"
              className="h-9 flex items-center gap-1"
            >
              <PaintBucket className="h-4 w-4" />
              <span className="whitespace-nowrap">Resaltar</span>
            </Button>
          </div>
        </div>
        
        {searchResults.length > 0 && (
          <div className="flex items-center gap-1 w-full sm:w-auto mt-2 sm:mt-0">
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
      </div>
      
      <div className="p-4 bg-muted/20 rounded-md w-full">
        <ScrollArea className="h-[40vh] overflow-y-auto w-full custom-scrollbar">
          <div className="pr-2 max-w-full overflow-x-hidden">
            {isEditingOutput ? (
              <div className="space-y-4 w-full">
                <Textarea 
                  value={editedOutput}
                  onChange={e => setEditedOutput(e.target.value)}
                  className="min-h-[200px] sm:min-h-[300px] font-mono text-sm w-full resize-y"
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
              <div className="relative max-w-full overflow-x-hidden">
                <pre 
                  ref={transcriptionRef} 
                  className="whitespace-pre-wrap text-sm break-words max-w-full overflow-x-hidden overflow-wrap-anywhere transcription-text" 
                  onMouseUp={onTextSelection}
                >
                  {data.recording.output ? (
                    data.renderHighlightedText()
                  ) : (
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
                </pre>
                
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
