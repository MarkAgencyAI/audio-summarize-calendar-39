
import { WebhookTabProps } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function WebhookTab({ data }: WebhookTabProps) {
  const isMobile = useIsMobile();
  
  const formatWebhookResponse = () => {
    if (!data.recording.webhookData) {
      return "No hay resumen disponible para esta grabación. El resumen se genera automáticamente a partir del análisis de la transcripción.";
    }
    
    try {
      if (typeof data.recording.webhookData === 'string') {
        return data.recording.webhookData;
      }
      
      return JSON.stringify(data.recording.webhookData, null, 2);
    } catch (error) {
      console.error("Error al formatear resumen:", error);
      return "Error al formatear el resumen de la grabación";
    }
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">Resumen y puntos clave</h3>
        <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">
          IA
        </Badge>
      </div>
      
      <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
        <ScrollArea className="h-full w-full p-4">
          <div className="max-w-full">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300 break-words">
              {formatWebhookResponse()}
            </pre>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
