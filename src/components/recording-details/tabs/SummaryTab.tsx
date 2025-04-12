
import { WebhookTabProps } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sparkles, CheckSquare, Info, Lightbulb, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

export function SummaryTab({ data }: WebhookTabProps) {
  const isMobile = useIsMobile();
  const [summaryContent, setSummaryContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    setIsLoading(true);
    
    if (!data.recording.webhookData) {
      setSummaryContent(null);
      setIsLoading(false);
      return;
    }
    
    try {
      if (typeof data.recording.webhookData === 'string') {
        setSummaryContent(data.recording.webhookData);
      } else {
        setSummaryContent(JSON.stringify(data.recording.webhookData, null, 2));
      }
    } catch (error) {
      console.error("Error al formatear resumen:", error);
      setSummaryContent("Error al formatear el resumen de la grabación");
    } finally {
      setIsLoading(false);
    }
  }, [data.recording.webhookData]);

  // Renderiza secciones del resumen con iconos visuales
  const renderSummaryWithFormatting = (text: string) => {
    if (!text) return null;
    
    // Simple formatting for key points - this could be enhanced with actual parser logic
    return text.split('\n').map((line, index) => {
      // Identify different types of content based on prefixes or keywords
      const isKeyPoint = line.includes("Punto clave") || line.includes("Key point");
      const isImportant = line.includes("Importante") || line.includes("Important");
      const isTitle = line.length < 50 && (line.endsWith(':') || line.startsWith('#'));
      
      if (isTitle) {
        return (
          <h3 key={index} className="text-base font-medium text-slate-800 dark:text-slate-200 mt-4 mb-2">
            {line}
          </h3>
        );
      } else if (isKeyPoint) {
        return (
          <div key={index} className="flex items-start gap-2 mb-2 pb-2 border-b border-dashed border-slate-200 dark:border-slate-700">
            <CheckSquare className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
            <p className="text-sm text-slate-700 dark:text-slate-300">{line}</p>
          </div>
        );
      } else if (isImportant) {
        return (
          <div key={index} className="flex items-start gap-2 mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-1 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">{line}</p>
          </div>
        );
      } else if (line.trim() === '') {
        return <div key={index} className="h-2" />;
      } else {
        return (
          <div key={index} className="flex items-start gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-blue-500 mt-1 opacity-70 flex-shrink-0" />
            <p className="text-sm text-slate-700 dark:text-slate-300">{line}</p>
          </div>
        );
      }
    });
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
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse text-center p-8">
                <Sparkles className="h-10 w-10 mx-auto mb-4 text-amber-400/50" />
                <p className="text-slate-400 dark:text-slate-500">Cargando resumen...</p>
              </div>
            </div>
          ) : !summaryContent ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Info className="h-8 w-8 text-amber-500 dark:text-amber-400" />
              </div>
              <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">No hay resumen disponible</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
                El resumen se genera automáticamente a partir del análisis de la transcripción.
              </p>
            </div>
          ) : (
            <div className="p-5 max-w-full">
              <div className="prose prose-slate dark:prose-invert prose-sm max-w-none">
                {renderSummaryWithFormatting(summaryContent)}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
