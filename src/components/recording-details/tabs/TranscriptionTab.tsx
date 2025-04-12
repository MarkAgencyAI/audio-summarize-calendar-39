
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
import { FileText, Edit, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

const WEBHOOK_URL = "https://ssn8nss.maettiai.tech/webhook-test/8e34aca2-3111-488c-8ee8-a0a2c63fc9e4";

export function TranscriptionTab({
  data,
  onTextSelection
}: TranscriptionTabProps) {
  const { updateRecording } = data;
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
    <div className="h-full flex flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-violet-500" />
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
            Transcripción
          </h3>
        </div>
        
        {!isEditingOutput && data.recording.output && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditingOutput(true)}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs">Editar</span>
          </Button>
        )}
      </div>
      
      <div className="mb-3">
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSearch={handleSearch}
          toggleHighlightMode={toggleHighlightMode}
          searchResults={searchResults}
          currentSearchIndex={currentSearchIndex}
          navigateSearch={navigateSearch}
        />
      </div>
      
      <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30">
        <ScrollArea className="h-full w-full p-4">
          {isEditingOutput ? (
            <OutputEditor
              editedOutput={editedOutput}
              setEditedOutput={setEditedOutput}
              handleSaveOutput={handleSaveOutput}
              handleCancelOutputEdit={handleCancelOutputEdit}
            />
          ) : !data.recording.output ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 mb-4 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Bot className="h-8 w-8 text-violet-500 dark:text-violet-400" />
              </div>
              <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">
                No hay transcripción disponible
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
                Puedes generar una transcripción automática utilizando inteligencia artificial
              </p>
              <Button
                onClick={generateOutputWithGroq}
                disabled={isGeneratingOutput}
                className="bg-violet-500 hover:bg-violet-600 text-white"
              >
                {isGeneratingOutput ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Bot className="h-4 w-4 mr-2" />
                    Generar con IA
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="max-w-full">
              <pre 
                ref={transcriptionRef} 
                className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300 break-words" 
                onMouseUp={onTextSelection}
              >
                {data.renderHighlightedText()}
              </pre>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
