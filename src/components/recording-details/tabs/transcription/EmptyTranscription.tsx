
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface EmptyTranscriptionProps {
  generateOutputWithGroq: () => void;
  isGeneratingOutput: boolean;
}

export function EmptyTranscription({
  generateOutputWithGroq,
  isGeneratingOutput
}: EmptyTranscriptionProps) {
  return (
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
  );
}
