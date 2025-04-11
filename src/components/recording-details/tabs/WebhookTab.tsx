
import { WebhookTabProps } from "../types";

export function WebhookTab({ data }: WebhookTabProps) {
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
    <div className="p-4 bg-muted/20 rounded-md">
      <div className="overflow-y-auto">
        <pre className="whitespace-pre-wrap text-sm">
          {formatWebhookResponse()}
        </pre>
      </div>
    </div>
  );
}
