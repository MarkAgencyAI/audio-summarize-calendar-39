import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FileImage, Upload, ScanText, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { sendToWebhook } from "@/lib/webhook";
import { MathRenderer } from "@/components/MathRenderer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function MathScanner() {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [mathResult, setMathResult] = useState<string | null>(null);
  const [mathExplanation, setMathExplanation] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [mathMethod, setMathMethod] = useState("");
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPreviewUrl(fileReader.result as string);
        setShowDialog(true);
      };
      fileReader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error("Por favor, selecciona una imagen");
      return;
    }

    setIsUploading(true);
    setMathResult(null);
    setMathExplanation(null);
    setIsExplanationOpen(false);
    
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      
      const uploadResponse = await fetch("https://api.imgbb.com/1/upload?key=64830e69bc992ce600bf9f50588eeaa9", {
        method: "POST",
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Error response:", errorText);
        throw new Error(`Error al subir la imagen: ${errorText}`);
      }
      
      const uploadData = await uploadResponse.json();
      
      if (!uploadData.success) {
        console.error("Upload failed:", uploadData);
        throw new Error("Error en la respuesta del servicio de alojamiento de imágenes");
      }
      
      const imageUrl = uploadData.data.url;
      console.log("Imagen subida exitosamente a:", imageUrl);
      
      const webhookData = {
        imageUrl: imageUrl,
        mathMethod: mathMethod.trim() || "No especificado"
      };
      
      toast.loading("Analizando expresión matemática...", { id: "analyzing-math" });
      
      const handleWebhookMessage = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.type === 'webhook_analysis') {
          console.log("Received webhook response:", customEvent.detail);
          
          const result = customEvent.detail?.data?.result || "";
          const explanation = customEvent.detail?.data?.explanation || "";
          
          setMathResult(result);
          setMathExplanation(explanation);
          
          setShowDialog(false);
          setShowResult(true);
          
          toast.success("Análisis completado", { id: "analyzing-math" });
          
          window.removeEventListener('webhookMessage', handleWebhookMessage);
        }
      };
      
      window.addEventListener('webhookMessage', handleWebhookMessage);
      
      await sendToWebhook("https://sswebhookss.maettiai.tech/webhook/a517fa5f-7575-41aa-8a03-823ad23fa55f", webhookData);
      
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Error al analizar la imagen: " + (error instanceof Error ? error.message : "Error desconocido"));
      setShowDialog(false);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex flex-col items-center gap-2">
            <Button 
              variant="outline" 
              className="w-full flex items-center gap-2" 
              onClick={triggerFileInput}
            >
              <ScanText className="w-4 h-4" />
              Analizar Matemáticas
            </Button>
            <Input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
              ref={fileInputRef}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear Expresión Matemática</DialogTitle>
            <DialogDescription>
              Confirma la imagen que contiene la expresión matemática para analizar.
            </DialogDescription>
          </DialogHeader>
          
          {previewUrl && (
            <div className="flex justify-center mb-4">
              <img 
                src={previewUrl} 
                alt="Vista previa" 
                className="max-h-[200px] rounded-md object-contain"
              />
            </div>
          )}
          
          <div className="space-y-4 mb-4">
            <div>
              <label htmlFor="mathMethod" className="text-sm font-medium">
                Método matemático utilizado (opcional)
              </label>
              <Textarea
                id="mathMethod"
                placeholder="Describe el método que estás utilizando para resolver este problema..."
                value={mathMethod}
                onChange={(e) => setMathMethod(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDialog(false);
                setSelectedFile(null);
                setPreviewUrl(null);
                setMathMethod("");
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isUploading}
            >
              {isUploading ? "Analizando..." : "Analizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resultado del Análisis</DialogTitle>
            <DialogDescription>
              Aquí está el resultado del análisis matemático.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-secondary/50 p-4 rounded-md overflow-x-auto">
              {mathResult ? (
                <MathRenderer 
                  content={mathResult} 
                  className="whitespace-pre-wrap break-words font-medium text-lg"
                />
              ) : (
                <p className="text-muted-foreground text-center">Cargando resultados...</p>
              )}
            </div>
            
            {mathExplanation && (
              <Collapsible
                open={isExplanationOpen}
                onOpenChange={setIsExplanationOpen}
                className="border rounded-md"
              >
                <div className="px-4 py-3 flex items-center justify-between bg-muted/40">
                  <h3 className="font-medium">Ver explicación detallada</h3>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-7 w-7">
                      {isExplanationOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="sr-only">Toggle explanation</span>
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="px-4 py-3 bg-secondary/30 border-t">
                  <div className="max-h-64 overflow-y-auto">
                    <MathRenderer
                      content={mathExplanation}
                      className="whitespace-pre-wrap break-words text-sm"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowResult(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
