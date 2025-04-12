
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, Mic, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AudioRecorderV2 } from "@/components/AudioRecorderV2";
import { PdfUploader } from "@/components/PdfUploader";
import { ImageUploader } from "@/components/ImageUploader";
import { MathScanner } from "@/components/MathScanner";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { LiveTranscriptionSheet } from "@/components/LiveTranscriptionSheet";
import { Input } from "@/components/ui/input";

interface ToolsCarouselProps {
  showTranscriptionOptions: boolean;
  isTranscribing: boolean;
  transcriptionOutput: string;
  transcriptionOpen: boolean;
  setTranscriptionOpen: (open: boolean) => void;
  transcriptionProgress?: number;
}

export function ToolsCarousel({
  showTranscriptionOptions,
  isTranscribing,
  transcriptionOutput,
  transcriptionOpen,
  setTranscriptionOpen,
  transcriptionProgress = 0
}: ToolsCarouselProps) {
  const { user } = useAuth();

  return (
    <Card className="h-auto">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Folder className="h-5 w-5 text-blue-500" />
          Herramientas
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Materia"
            className="w-32 h-8 text-xs mr-2"
          />
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 px-2 mr-1"
          >
            <Mic className="h-4 w-4 mr-1" /> Grabar
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 px-2"
          >
            <Upload className="h-4 w-4 mr-1" /> Subir
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent>
            {/* Herramienta: Grabación de Audio */}
            <CarouselItem className="basis-full">
              <div className="p-1">
                <div className="text-center mb-2">
                  <span className="text-sm font-medium">Grabación</span>
                </div>
                <AudioRecorderV2 />
                
                {showTranscriptionOptions && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-2" 
                    onClick={() => setTranscriptionOpen(true)}
                  >
                    {isTranscribing ? "Ver transcripción en vivo" : "Ver transcripción"}
                  </Button>
                )}
                
                <LiveTranscriptionSheet
                  isTranscribing={isTranscribing}
                  output={transcriptionOutput}
                  progress={transcriptionProgress}
                  open={transcriptionOpen}
                  onOpenChange={setTranscriptionOpen}
                />
              </div>
            </CarouselItem>
            
            {/* Herramienta: Math Scanner */}
            <CarouselItem className="basis-full">
              <div className="p-1">
                <div className="text-center mb-2">
                  <span className="text-sm font-medium">Math Scan</span>
                </div>
                <MathScanner />
              </div>
            </CarouselItem>
            
            {/* Herramienta: Subir Imágenes */}
            <CarouselItem className="basis-full">
              <div className="p-1">
                <div className="text-center mb-2">
                  <span className="text-sm font-medium">Subir Imagen</span>
                </div>
                <ImageUploader />
              </div>
            </CarouselItem>
            
            {/* Herramienta: Subir PDF (solo para profesores) */}
            {user?.role === "teacher" && (
              <CarouselItem className="basis-full">
                <div className="p-1">
                  <div className="text-center mb-2">
                    <span className="text-sm font-medium">Subir PDF</span>
                  </div>
                  <PdfUploader />
                </div>
              </CarouselItem>
            )}
          </CarouselContent>
          <div className="flex justify-center mt-2">
            <CarouselPrevious className="static translate-y-0 -translate-x-4" />
            <CarouselNext className="static translate-y-0 translate-x-4" />
          </div>
        </Carousel>
      </CardContent>
    </Card>
  );
}
