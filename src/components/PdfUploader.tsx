
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Upload } from "lucide-react";
import { useRecordings } from "@/context/RecordingsContext";
import { toast } from "sonner";
import { extractTextFromPdf } from "@/lib/pdf-utils";

export function PdfUploader() {
  const { folders, addRecording } = useRecordings();
  
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    
    if (selectedFile && selectedFile.type === "application/pdf") {
      setPdfFile(selectedFile);
    } else if (selectedFile) {
      toast.error("Solo se permiten archivos PDF");
      e.target.value = "";
    }
  };
  
  const handleProcessPdf = async (file: File) => {
    try {
      setIsProcessing(true);
      
      // Extract text from PDF
      const extractedText = await extractTextFromPdf(file);
      
      // Generate audio URL
      const audioBlob = new Blob([], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Add recording
      addRecording({
        name: file.name.replace('.pdf', ''),
        audioUrl: audioUrl,
        audioData: audioUrl,
        output: extractedText,
        folderId: selectedFolder,
        duration: 0,
        suggestedEvents: [],
        createdAt: new Date().toISOString()
      });
      
      setIsProcessing(false);
      setShowPdfDialog(false);
      toast.success('PDF procesado correctamente');
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      setIsProcessing(false);
      toast.error('Error al procesar el PDF');
    }
  };
  
  const resetForm = () => {
    setPdfFile(null);
    setSelectedFolder("");
  };
  
  return (
    <div className="space-y-2">
      <Button 
        onClick={() => setShowPdfDialog(true)} 
        variant="outline" 
        className="w-full flex items-center justify-center gap-2"
      >
        <FileText className="h-4 w-4" />
        <span>Subir PDF</span>
      </Button>
      
      <Dialog open={showPdfDialog} onOpenChange={(open) => {
        setShowPdfDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subir PDF</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pdf-upload">Archivo PDF</Label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:bg-secondary/50 transition-colors">
                <Input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isProcessing}
                />
                <label htmlFor="pdf-upload" className="cursor-pointer w-full h-full block">
                  {pdfFile ? (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div className="text-left">
                        <p className="text-sm font-medium truncate max-w-[200px]">{pdfFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm font-medium">Haz clic para seleccionar un PDF</span>
                      <span className="text-xs text-muted-foreground">Máximo 20MB</span>
                    </div>
                  )}
                </label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="folder-select">Carpeta</Label>
              <select
                id="folder-select"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isProcessing}
              >
                <option value="" disabled>Seleccionar carpeta</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfDialog(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button 
              onClick={() => pdfFile && handleProcessPdf(pdfFile)}
              disabled={!pdfFile || !selectedFolder || isProcessing}
              className="gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Procesar PDF</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
