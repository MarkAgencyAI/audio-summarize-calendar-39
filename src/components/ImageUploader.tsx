
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Image, Upload } from "lucide-react";
import { useRecordings } from "@/context/RecordingsContext";

export function ImageUploader() {
  const { folders, addNote } = useRecordings();
  
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };
  
  const handleSaveNote = () => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        addNote({
          title: noteTitle, 
          content: noteContent,
          folderId: selectedFolder,
          imageUrl: e.target?.result as string,
          updatedAt: new Date().toISOString()
        });
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };
  
  const onClose = () => {
    setShowImageDialog(false);
    setFile(null);
    setNoteTitle("");
    setNoteContent("");
    setSelectedFolder("");
    setPreviewUrl(null);
  };
  
  return (
    <div className="space-y-2">
      <Button 
        onClick={() => setShowImageDialog(true)} 
        variant="outline" 
        className="w-full flex items-center justify-center gap-2"
      >
        <Upload className="h-4 w-4" />
        <span>Subir imagen</span>
      </Button>
      
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subir imagen</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="image-upload">Imagen</Label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:bg-secondary/50 transition-colors">
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="image-upload" className="cursor-pointer w-full h-full block">
                  {previewUrl ? (
                    <div className="space-y-2">
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="max-h-[200px] mx-auto object-contain"
                      />
                      <p className="text-xs text-muted-foreground">Haz clic para cambiar la imagen</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <Image className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm font-medium">Haz clic para seleccionar una imagen</span>
                      <span className="text-xs text-muted-foreground">JPG, PNG, GIF</span>
                    </div>
                  )}
                </label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="image-title">Título</Label>
              <Input
                id="image-title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Título de la nota"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="note-content">Descripción</Label>
              <Textarea
                id="note-content"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Agrega una descripción (opcional)"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="folder-select">Carpeta</Label>
              <select
                id="folder-select"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>Seleccionar carpeta</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveNote}
              disabled={!file || !noteTitle || !selectedFolder}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
