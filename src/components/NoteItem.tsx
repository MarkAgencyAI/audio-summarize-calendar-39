
import React, { useState } from "react";
import { useRecordings } from "@/context/RecordingsContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Pencil, Trash2, FileText, Save, X, Folder, Image } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export interface NoteItemProps {
  id: string;
  title: string;
  content: string;
  folderId: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function NoteItem({ 
  id, 
  title, 
  content, 
  folderId, 
  imageUrl, 
  createdAt, 
  updatedAt, 
  onEdit, 
  onDelete 
}: NoteItemProps) {
  const { folders, updateNote, deleteNote } = useRecordings();
  const [isEditing, setIsEditing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [editedContent, setEditedContent] = useState(content);
  const [selectedFolder, setSelectedFolder] = useState(folderId);
  
  const folderName = folders.find(f => f.id === folderId)?.name || "Sin materia";
  const folderColor = folders.find(f => f.id === folderId)?.color || "#888888";
  
  const handleSave = () => {
    if (!editedTitle.trim()) {
      toast.error("El título no puede estar vacío");
      return;
    }
    
    updateNote(id, {
      title: editedTitle,
      content: editedContent,
      folderId: selectedFolder,
      updatedAt: new Date().toISOString()
    });
    
    setIsEditing(false);
    toast.success("Apunte actualizado");
  };
  
  const handleCancel = () => {
    setEditedTitle(title);
    setEditedContent(content);
    setSelectedFolder(folderId);
    setIsEditing(false);
  };
  
  const handleDelete = () => {
    deleteNote(id);
    setShowDetails(false);
    onDelete();
    toast.success("Apunte eliminado");
  };
  
  return (
    <>
      <Card className="border-custom-primary/10 overflow-hidden hover:shadow-md transition-shadow bg-card">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between gap-2">
          <div className="flex-1 overflow-hidden">
            <CardTitle className="text-base truncate">{title}</CardTitle>
            <CardDescription className="flex items-center gap-1 text-xs">
              {formatDate(new Date(updatedAt || Date.now()))}
            </CardDescription>
          </div>
          
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8" 
            onClick={() => setShowDetails(true)}
          >
            <FileText className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="p-4 pt-2">
          <div className="flex items-center gap-1 mb-2">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: folderColor }}
            />
            <span className="text-xs text-muted-foreground">{folderName}</span>
          </div>
          
          <p className="text-xs line-clamp-2 text-muted-foreground mb-2">
            {content || "Sin contenido"}
          </p>
          
          {imageUrl && (
            <div className="mt-2 w-full">
              <img 
                src={imageUrl} 
                alt={title} 
                className="w-full h-32 object-cover rounded-md"
              />
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar apunte" : title}
            </DialogTitle>
          </DialogHeader>
          
          {isEditing ? (
            <div className="space-y-4 my-2">
              <div className="space-y-2">
                <Label htmlFor="note-title">Título</Label>
                <Input
                  id="note-title"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  placeholder="Título del apunte"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="note-content">Contenido</Label>
                <Textarea
                  id="note-content"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  placeholder="Contenido del apunte"
                  className="min-h-[200px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="note-folder">Materia</Label>
                <Select
                  value={selectedFolder}
                  onValueChange={setSelectedFolder}
                >
                  <SelectTrigger id="note-folder">
                    <SelectValue placeholder="Seleccionar materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map(folder => (
                      <SelectItem key={folder.id} value={folder.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full" 
                            style={{ backgroundColor: folder.color }}
                          />
                          <span>{folder.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {imageUrl && (
                <div className="space-y-2">
                  <Label>Imagen</Label>
                  <div className="bg-muted/30 p-2 rounded-md">
                    <img 
                      src={imageUrl} 
                      alt={title} 
                      className="w-full h-auto max-h-[200px] object-contain rounded-md" 
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 my-2 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: folderColor }}
                />
                <span className="text-muted-foreground">{folderName}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDate(new Date(updatedAt || Date.now()))}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="bg-muted/30 p-3 rounded-md">
                  <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-[30vh]">
                    {content || "Sin contenido"}
                  </pre>
                </div>
              </div>
              
              {imageUrl && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Image className="h-4 w-4" />
                    <h3 className="text-sm font-medium">Imagen adjunta:</h3>
                  </div>
                  <img 
                    src={imageUrl} 
                    alt={title} 
                    className="w-full h-auto max-h-[200px] object-contain rounded-md" 
                  />
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex justify-between">
            {isEditing ? (
              <div className="flex gap-2 w-full">
                <Button variant="default" onClick={handleSave} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
                <Button variant="outline" onClick={handleCancel} className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            ) : (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. El apunte será eliminado permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button variant="default" onClick={() => setShowDetails(false)}>
                    Cerrar
                  </Button>
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
