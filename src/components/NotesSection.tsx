
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, BookOpen, PenLine, Image, Upload, Loader } from "lucide-react";
import { useRecordings } from "@/context/RecordingsContext";
import { NoteItem } from "@/components/NoteItem";
import { toast } from "sonner";

interface NotesSectionProps {
  folderId?: string;
  sectionTitle?: string;
}

export function NotesSection({ folderId, sectionTitle = "Apuntes" }: NotesSectionProps) {
  const { 
    addNote, 
    getFolderNotes, 
    updateNote, 
    deleteNote,
    isLoading
  } = useRecordings();
  
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteImage, setNoteImage] = useState<File | null>(null);
  const [noteImagePreview, setNoteImagePreview] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [currentFolder, setCurrentFolder] = useState(folderId || "");
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNoteImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setNoteImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  const handleCreateNote = async () => {
    if (!noteTitle.trim()) {
      toast.error("El título no puede estar vacío");
      return;
    }
    
    setIsSaving(true);
    
    try {
      let imageUrl = "";
      
      // If there's an image, convert it to base64
      if (noteImage) {
        const reader = new FileReader();
        imageUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(noteImage);
        });
      }
      
      // Add the note with all content
      const result = await addNote({
        title: noteTitle,
        content: noteContent,
        folderId: currentFolder,
        imageUrl: imageUrl,
        updatedAt: new Date().toISOString()
      });
      
      if (result) {
        // Reset the form
        resetForm();
        setShowNoteDialog(false);
        toast.success("Apunte creado correctamente");
      }
    } catch (error) {
      console.error("Error al crear el apunte:", error);
      toast.error("Error al crear el apunte");
    } finally {
      setIsSaving(false);
    }
  };
  
  const resetForm = () => {
    setNoteTitle("");
    setNoteContent("");
    setNoteImage(null);
    setNoteImagePreview(null);
    setEditingNote(null);
  };
  
  const handleEditNote = async (note: any) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteImagePreview(note.imageUrl);
    setShowNoteDialog(true);
  };
  
  const handleUpdateNote = async () => {
    if (!editingNote || !noteTitle.trim()) {
      toast.error("El título no puede estar vacío");
      return;
    }
    
    setIsSaving(true);
    
    try {
      let imageUrl = editingNote.imageUrl;
      
      // If there's a new image, update it
      if (noteImage) {
        const reader = new FileReader();
        imageUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(noteImage);
        });
      }
      
      await updateNote(editingNote.id, {
        title: noteTitle,
        content: noteContent,
        imageUrl: imageUrl,
        updatedAt: new Date().toISOString()
      });
      
      resetForm();
      setShowNoteDialog(false);
      toast.success("Apunte actualizado correctamente");
    } catch (error) {
      console.error("Error al actualizar el apunte:", error);
      toast.error("Error al actualizar el apunte");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      toast.success("Apunte eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar el apunte:", error);
      toast.error("Error al eliminar el apunte");
    }
  };
  
  const removeImage = () => {
    setNoteImage(null);
    setNoteImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const renderNotes = () => {
    const folderNotes = getFolderNotes(currentFolder);
    
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (folderNotes.length === 0) {
      return (
        <div className="text-center p-8 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <h4 className="text-lg font-medium mb-2 text-slate-700 dark:text-slate-300">No hay apuntes todavía</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Crea tu primer apunte para esta grabación
          </p>
          <Button onClick={() => setShowNoteDialog(true)} variant="default">
            <PenLine className="h-4 w-4 mr-2" />
            Crear apunte
          </Button>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {folderNotes.map((note) => (
          <NoteItem 
            key={note.id}
            id={note.id}
            title={note.title}
            content={note.content}
            folderId={note.folderId}
            imageUrl={note.imageUrl}
            createdAt={new Date(note.createdAt).getTime()}
            updatedAt={new Date(note.updatedAt).getTime()}
            onEdit={() => handleEditNote(note)}
            onDelete={() => handleDeleteNote(note.id)}
          />
        ))}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-md">
            <PenLine className="h-5 w-5 text-emerald-500" />
          </div>
          <h2 className="text-lg font-medium text-slate-800 dark:text-slate-200">{sectionTitle}</h2>
        </div>
        <Button onClick={() => setShowNoteDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo apunte
        </Button>
      </div>
      
      {renderNotes()}
      
      <Dialog open={showNoteDialog} onOpenChange={(open) => {
        setShowNoteDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Editar apunte" : "Nuevo apunte"}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input 
                id="title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Título del apunte"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">Contenido</Label>
              <Textarea 
                id="content"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Escribe el contenido de tu apunte"
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Imagen (opcional)</span>
                {noteImagePreview && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={removeImage}
                    className="h-8 text-red-500 hover:text-red-600"
                  >
                    Eliminar
                  </Button>
                )}
              </Label>
              
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              
              {!noteImagePreview ? (
                <div 
                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-md p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={triggerFileInput}
                >
                  <Image className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Haz clic para subir una imagen
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Formatos: JPG, PNG, GIF
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <img 
                    src={noteImagePreview} 
                    alt="Vista previa" 
                    className="w-full rounded-md max-h-[200px] object-contain border border-slate-200 dark:border-slate-700"
                  />
                  <p className="text-xs text-center text-slate-500 mt-1">
                    Haz clic en "Eliminar" si deseas cambiar la imagen
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNoteDialog(false);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={editingNote ? handleUpdateNote : handleCreateNote} 
              disabled={!noteTitle.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  {editingNote ? "Actualizando..." : "Guardando..."}
                </>
              ) : editingNote ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
