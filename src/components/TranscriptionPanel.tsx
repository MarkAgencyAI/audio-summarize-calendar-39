
import React from "react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Globe, BookOpen, Clock, AlertCircle, Loader2, Sparkles, Check, X } from "lucide-react";

interface TranscriptionPanelProps {
  output: string | object | null | undefined;
  isLoading?: boolean;
  progress?: number;
  showProgress?: boolean;
  understood?: boolean;
  onUnderstoodChange?: (understood: boolean) => void;
}

export function TranscriptionPanel({
  output,
  isLoading = false,
  progress = 0,
  showProgress = false,
  understood = false,
  onUnderstoodChange
}: TranscriptionPanelProps) {
  // Process output to ensure it's always a safe string for rendering
  const displayOutput = React.useMemo(() => {
    try {
      // Handle null or undefined
      if (output === null || output === undefined) {
        return '';
      }
      
      // If already a string, return it directly
      if (typeof output === 'string') {
        return output;
      }
      
      // Handle objects (including error objects)
      if (typeof output === 'object') {
        // If it has an 'output' property that's a string, use it
        if ('output' in output && typeof (output as any).output === 'string') {
          return (output as any).output;
        }
        
        // If it has a 'message' property (error object), show the message
        if ('message' in output && typeof (output as any).message === 'string') {
          return `Error: ${(output as any).message}`;
        }
        
        // Si no, intentar convertirlo a JSON
        return JSON.stringify(output, null, 2);
      }
      
      // Fallback for any other unexpected type
      return String(output);
    } catch (error) {
      // Last resort in case of error processing the output
      console.error("Error processing output:", error);
      return "Error: No se pudo procesar la información de salida";
    }
  }, [output]);
    
  return (
    <div className="w-full h-full flex flex-col bg-card rounded-lg border shadow-sm overflow-hidden">
      <Tabs defaultValue="output" className="w-full h-full flex flex-col">
        <div className="border-b px-4 py-2 bg-muted/40 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Información recibida</h3>
          
          {onUnderstoodChange && (
            <div className="flex items-center gap-2">
              <Checkbox 
                id="understood-checkbox"
                checked={understood}
                onCheckedChange={(checked) => onUnderstoodChange(checked as boolean)}
                className="data-[state=checked]:bg-green-600 h-5 w-5"
              />
              <label 
                htmlFor="understood-checkbox" 
                className="text-sm flex items-center cursor-pointer select-none"
              >
                {understood ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <Check className="h-4 w-4" />
                    Entendida
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1">
                    <X className="h-4 w-4" />
                    No entendida
                  </span>
                )}
              </label>
            </div>
          )}
        </div>
        
        <TabsList className="bg-muted/30 p-1 mx-4 my-2 grid grid-cols-1">
          <TabsTrigger value="output">Información procesada</TabsTrigger>
        </TabsList>
        
        {showProgress && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Progreso de transcripción</span>
              <span className="text-xs font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        <div className="flex-1 overflow-hidden p-4">
          {isLoading && !displayOutput ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="h-12 w-12 text-muted-foreground/40" />
                </div>
                <div className="text-center text-muted-foreground">
                  Procesando audio...
                </div>
              </div>
            </div>
          ) : (
            <TabsContent value="output" className="mt-0 h-full relative">
              <ScrollArea className="h-full max-h-[60vh] rounded-md overflow-y-auto">
                <div className="bg-muted/20 rounded-md p-4">
                  {displayOutput ? (
                    <pre className="whitespace-pre-wrap font-sans text-sm">{displayOutput}</pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[200px] text-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-muted-foreground">No hay información disponible</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
