
import { WebhookTabProps } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Info, Lightbulb, AlertCircle, CheckSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function SummaryTab({ data }: WebhookTabProps) {
  const [summaryContent, setSummaryContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    setIsLoading(true);
    
    setTimeout(() => {
      try {
        if (!data.recording.webhookData) {
          setSummaryContent(null);
        } else if (typeof data.recording.webhookData === 'string') {
          setSummaryContent(data.recording.webhookData);
        } else {
          setSummaryContent(JSON.stringify(data.recording.webhookData, null, 2));
        }
      } catch (error) {
        console.error("Error processing summary:", error);
        setSummaryContent("Error al procesar el resumen");
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, [data.recording.webhookData]);

  const renderSummaryContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-center p-8">
            <Sparkles className="h-10 w-10 mx-auto mb-4 text-amber-400/50" />
            <p className="text-slate-400 dark:text-slate-500">Cargando resumen...</p>
          </div>
        </div>
      );
    }
    
    if (!summaryContent) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Info className="h-8 w-8 text-amber-500 dark:text-amber-400" />
          </div>
          <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">No hay resumen disponible</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
            El resumen se genera automáticamente cuando se procesa la grabación con IA.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => console.log("Request summary generation")}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generar resumen
          </Button>
        </div>
      );
    }
    
    // Format the summary content for better readability
    return formatSummaryContent(summaryContent);
  };
  
  const formatSummaryContent = (content: string) => {
    const lines = content.split('\n');
    
    return (
      <div className="space-y-4">
        {lines.map((line, index) => {
          // Empty lines
          if (!line.trim()) return <div key={index} className="h-2" />;
          
          // Headings (lines ending with colon or starting with # or ##)
          if (line.trim().endsWith(':') || /^#+\s/.test(line)) {
            return (
              <h3 key={index} className="text-base font-medium text-slate-800 dark:text-slate-200 mt-6 mb-2 flex items-center">
                <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                {line}
              </h3>
            );
          }
          
          // Key points or important information
          if (line.toLowerCase().includes('punto clave') || 
              line.toLowerCase().includes('key point') ||
              line.toLowerCase().includes('importante')) {
            return (
              <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
                <CheckSquare className="h-4 w-4 text-amber-500 mt-1 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300">{line}</p>
              </div>
            );
          }
          
          // Regular content
          return (
            <div key={index} className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-slate-400 mt-1 flex-shrink-0" />
              <p className="text-sm text-slate-700 dark:text-slate-300">{line}</p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="mb-4 flex flex-col gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-md">
            <Sparkles className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">Resumen y puntos clave</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Información procesada automáticamente mediante IA
            </p>
          </div>
          <Badge variant="outline" className="ml-auto bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800">
            IA
          </Badge>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 min-h-0">
        <ScrollArea className="h-full w-full">
          <div className="p-5 max-w-full">
            {renderSummaryContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
