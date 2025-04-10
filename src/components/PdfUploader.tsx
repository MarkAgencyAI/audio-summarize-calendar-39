import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRecordings } from "@/context/RecordingsContext";
import { Upload, File, Loader2, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { extractTextFromPdf } from "@/lib/pdf-utils";
import { sendToWebhook } from "@/lib/webhook";

const WEBHOOK_URL = "https://ssn8nss.maettiai.tech/webhook-test/8e34aca2-3111-488c-8ee8-a0a2c63fc9e4";

export function PdfUploader() {
  const { addRecording, folders } = useRecordings();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [recordingName, setRecordingName] = useState("");
  const [transcriptionText, setTranscriptionText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState("default");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioDuration, setAudioDuration] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error("Por favor, sube solo archivos PDF");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setPdfFile(file);
    setRecordingName(file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleClearFile = () => {
    setPdfFile(null);
    setRecordingName("");
    setTranscriptionText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExtractText = async () => {
    if (!pdfFile) {
      toast.error("Por favor, sube un archivo PDF primero");
      return;
    }

    setIsLoading(true);
    try {
      const text = await extractTextFromPdf(pdfFile);
      setTranscriptionText(text);
      toast.success("Texto extraído exitosamente");
    } catch (error) {
      console.error("Error al extraer el texto:", error);
      toast.error("Error al extraer el texto del PDF");
      setTranscriptionText("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAudioUrl(event.target.value);
  };

  const handleAudioDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const duration = parseInt(event.target.value, 10);
    setAudioDuration(isNaN(duration) ? 0 : duration);
  };

  const handleSaveRecording = () => {
    if (!recordingName.trim()) {
      toast.error("El nombre de la grabación no puede estar vacío");
      return;
    }

    if (!audioUrl.trim()) {
      toast.error("La URL del audio no puede estar vacía");
      return;
    }

    if (!transcriptionText.trim()) {
      toast.error("La transcripción no puede estar vacía");
      return;
    }

    // Simulate suggested events
    const suggestedEvents = [
      { title: "Evento 1", description: "Descripción del evento 1" },
      { title: "Evento 2", description: "Descripción del evento 2" }
    ];

    addRecording({
      name: recordingName.trim(),
      audioUrl: audioUrl,
      audioData: audioUrl,
      output: transcriptionText,
      folderId: selectedFolder,
      duration: audioDuration,
      suggestedEvents: suggestedEvents,
      createdAt: new Date().toISOString()
    });

    setPdfFile(null);
    setRecordingName("");
    setTranscriptionText("");
    setAudioUrl("");
    setAudioDuration(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success("Grabación guardada exitosamente");
  };

  return (
    <div className="glassmorphism rounded-xl p-4 md:p-6 shadow-lg bg-white/5 dark:bg-black/20 backdrop-blur-xl border border-white/10 dark:border-white/5">
      <h2 className="text-xl font-semibold mb-4 text-custom-primary">Subir PDF y guardar grabación</h2>

      <div className="space-y-4">
        <div>
          <Label htmlFor="pdf-upload" className="text-custom-text">Archivo PDF</Label>
          <div className="relative mt-1">
            <input
              type="file"
              id="pdf-upload"
              ref={fileInputRef}
              accept="application/pdf"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
            <Button asChild variant="secondary" className="w-full">
              <Label htmlFor="pdf-upload" className="cursor-pointer flex items-center justify-center">
                <Upload className="h-4 w-4 mr-2" />
                {pdfFile ? pdfFile.name : "Subir PDF"}
              </Label>
            </Button>
          </div>
          {pdfFile && (
            <Button variant="ghost" size="sm" onClick={handleClearFile} className="mt-2 text-custom-primary hover:bg-custom-primary/10">
              <X className="h-4 w-4 mr-2" />
              Borrar PDF
            </Button>
          )}
        </div>

        <div>
          <Label htmlFor="recording-name" className="text-custom-text">Nombre de la grabación</Label>
          <Input
            id="recording-name"
            placeholder="Nombre de la grabación"
            value={recordingName}
            onChange={(e) => setRecordingName(e.target.value)}
            className="border-custom-primary/20 focus:border-custom-primary focus:ring-custom-primary"
            disabled={!pdfFile}
          />
        </div>

        <div>
          <Label htmlFor="audio-url" className="text-custom-text">URL del audio</Label>
          <Input
            id="audio-url"
            placeholder="URL del audio"
            value={audioUrl}
            onChange={handleAudioUrlChange}
            className="border-custom-primary/20 focus:border-custom-primary focus:ring-custom-primary"
            disabled={!pdfFile}
          />
        </div>

        <div>
          <Label htmlFor="audio-duration" className="text-custom-text">Duración del audio (segundos)</Label>
          <Input
            type="number"
            id="audio-duration"
            placeholder="Duración del audio en segundos"
            value={audioDuration === 0 ? "" : audioDuration.toString()}
            onChange={handleAudioDurationChange}
            className="border-custom-primary/20 focus:border-custom-primary focus:ring-custom-primary"
            disabled={!pdfFile}
          />
        </div>

        <div>
          <Label htmlFor="folder" className="text-custom-text">Carpeta</Label>
          <Select
            value={selectedFolder}
            onValueChange={(value) => setSelectedFolder(value)}
            disabled={!pdfFile}
          >
            <SelectTrigger id="folder" className="border-custom-primary/20 focus:border-custom-primary focus:ring-custom-primary">
              <SelectValue placeholder="Seleccionar carpeta" />
            </SelectTrigger>
            <SelectContent>
              {folders.map(folder => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="transcription" className="text-custom-text">Transcripción</Label>
          <div className="flex items-center justify-between">
            <Button
              onClick={handleExtractText}
              disabled={isLoading || !pdfFile}
              className="bg-custom-accent hover:bg-custom-accent/90 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extrayendo...
                </>
              ) : (
                <>
                  <File className="h-4 w-4 mr-2" />
                  Extraer texto del PDF
                </>
              )}
            </Button>
          </div>
          <Textarea
            id="transcription"
            placeholder="Transcripción del PDF"
            value={transcriptionText}
            readOnly
            className="border-custom-primary/20 focus:border-custom-primary focus:ring-custom-primary mt-2 min-h-[150px]"
          />
        </div>

        <Button
          onClick={handleSaveRecording}
          disabled={!pdfFile}
          className="bg-custom-primary hover:bg-custom-primary/90 text-white"
        >
          Guardar grabación
        </Button>
      </div>
    </div>
  );
}
