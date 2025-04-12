
import { WebhookTabProps } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

export function WebhookTab({ data }: WebhookTabProps) {
  const isMobile = useIsMobile();
  
  const formatWebhookResponse = () => {
    if (!data.recording.webhookData) {
      return "No hay resumen y puntos fuertes disponibles";
    }
    
    try {
      if (typeof data.recording.webhookData === 'string') {
        return data.recording.webhookData;
      }
      
      return JSON.stringify(data.recording.webhookData, null, 2);
    } catch (error) {
      console.error("Error al formatear resumen:", error);
      return "Error al formatear el resumen y puntos fuertes";
    }
  };

  return (
    <div className={`p-2 ${isMobile ? 'p-2' : 'p-4'} bg-muted/20 rounded-md w-full`}>
      <ScrollArea className={`${isMobile ? 'h-[35vh]' : 'h-[40vh]'} overflow-y-auto w-full custom-scrollbar`}>
        <div className="pr-2 max-w-full overflow-x-hidden">
          <pre className="whitespace-pre-wrap text-sm break-words overflow-x-hidden max-w-full transcription-text">
            {formatWebhookResponse()}
          </pre>
        </div>
      </ScrollArea>
    </div>
  );
}
