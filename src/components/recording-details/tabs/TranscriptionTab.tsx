
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { TranscriptionTabProps } from "../types";
import { useSearch } from "../hooks/useSearch";
import { useGroq } from "@/lib/groq";
import { sendToWebhook } from "@/lib/webhook";
import { OutputEditor } from "./transcription/OutputEditor";
import { SearchBar } from "./transcription/SearchBar";
import { TranscriptionContent } from "./transcription/TranscriptionContent";

const WEBHOOK_URL = "https://ssn8nss.maettiai.tech/webhook-test/8e34aca2-3111-488c-8ee8-a0a2c63fc9e4";

export function TranscriptionTab({
  data,
  onTextSelection
}: TranscriptionTabProps) {
  const { updateRecording } = data.updateRecording;
  const { llama3 } = useGroq();
  const [isEditingOutput, setIsEditingOutput] = useState(false);
  const [editedOutput, setEditedOutput] = useState(data.recording.output || "");
  const [isGeneratingOutput, setIsGeneratingOutput] = useState(false);
  
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    currentSearchIndex,
    transcriptionRef,
    handleSearch,
    navigateSearch
  } = useSearch(data.recording.output);
  
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

  return (
    <div className="grid gap-4 w-full">
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        toggleHighlightMode={toggleHighlightMode}
        searchResults={searchResults}
        currentSearchIndex={currentSearchIndex}
        navigateSearch={navigateSearch}
      />
      
      <div className="p-4 bg-muted/20 rounded-md w-full">
        <ScrollArea className="h-[40vh] overflow-y-auto w-full custom-scrollbar">
          <div className="pr-2 max-w-full overflow-x-hidden">
            {isEditingOutput ? (
              <OutputEditor
                editedOutput={editedOutput}
                setEditedOutput={setEditedOutput}
                handleSaveOutput={handleSaveOutput}
                handleCancelOutputEdit={handleCancelOutputEdit}
              />
            ) : (
              <div className="relative max-w-full overflow-x-hidden">
                <TranscriptionContent
                  output={data.recording.output}
                  transcriptionRef={transcriptionRef}
                  onTextSelection={onTextSelection}
                  renderHighlightedText={data.renderHighlightedText}
                  isEditingOutput={isEditingOutput}
                  setIsEditingOutput={setIsEditingOutput}
                  generateOutputWithGroq={generateOutputWithGroq}
                  isGeneratingOutput={isGeneratingOutput}
                />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
