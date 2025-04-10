
import React, { useState } from "react";
import { useRecordings, Note } from "@/context/RecordingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NoteItem } from "@/components/NoteItem";
import { FileText, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NotesSectionProps {
  folderId?: string;
  sectionTitle?: string;
}

export function NotesSection({
  folderId,
  sectionTitle = "Apuntes"
}: NotesSectionProps) {
  const {
    notes,
    folders,
    addNote,
    getFolderNotes
  } = useRecordings();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(folderId || "default");
  const [webhookData, setWebhookData] = useState<{
    description: string;
    imageUrl: string;
    content?: string;
  } | null>(null);

  // Get filtered notes based on the folderId prop (if provided)
  const filteredNotes = folderId 
    ? getFolderNotes(folderId).filter(note => note.title.toLowerCase().includes(searchQuery.toLowerCase())) 
    : notes.filter(note => note.title.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const handleAddNote = () => {
    if (!newNoteTitle.trim()) {
      toast.error("El título no puede estar vacío");
      return;
    }
    
    addNote({
      title: newNoteTitle,
      content: newNoteContent,
      folderId: selectedFolder,
      imageUrl: webhookData?.imageUrl,
      updatedAt: new Date().toISOString()
    });
    
    setNewNoteTitle("");
    setNewNoteContent("");
    setSelectedFolder(folderId || "default");
    setWebhookData(null);
    setShowAddNoteDialog(false);
    toast.success("Apunte creado correctamente");
  };
  
  const handleCloseDialog = () => {
    setNewNoteTitle("");
    setNewNoteContent("");
    setSelectedFolder(folderId || "default");
    setWebhookData(null);
    setShowAddNoteDialog(false);
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          {sectionTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center space-x-2">
          <div className="flex items-center flex-1 space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Buscar apuntes..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="flex-1" 
            />
          </div>
          
          <Button 
            onClick={() => {
              setWebhookData(null); // Clear any existing webhook data
              setNewNoteTitle("");
              setNewNoteContent("");
              setSelectedFolder(folderId || "default");
              setShowAddNoteDialog(true);
            }} 
            size="sm" 
            className="whitespace-nowrap text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo apunte
          </Button>
        </div>
        
        {filteredNotes.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            <p>No hay apuntes disponibles</p>
            <p className="text-xs mt-1">
              Crea un nuevo apunte o sube una imagen para comenzar
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map(note => (
              <NoteItem key={note.id} note={note} />
            ))}
          </div>
        )}
      </CardContent>
      
      {/* Add Note Dialog */}
      <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo apunte</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 my-2">
            <div className="space-y-2">
              <Label htmlFor="new-note-title">Título</Label>
              <Input 
                id="new-note-title" 
                value={newNoteTitle} 
                onChange={e => setNewNoteTitle(e.target.value)} 
                placeholder="Título del apunte" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-note-content">Contenido</Label>
              <Textarea 
                id="new-note-content" 
                value={newNoteContent} 
                onChange={e => setNewNoteContent(e.target.value)} 
                placeholder="Contenido del apunte" 
                className="min-h-[150px]" 
              />
            </div>
            
            {/* Always show folder selection regardless of folderId */}
            <div className="space-y-2">
              <Label htmlFor="new-note-folder">Materia</Label>
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger id="new-note-folder">
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
            
            {webhookData?.imageUrl && (
              <div className="space-y-2">
                <Label>Imagen adjunta</Label>
                <div className="bg-muted/30 p-2 rounded-md">
                  <img 
                    src={webhookData.imageUrl} 
                    alt="Imagen adjunta" 
                    className="w-full h-auto max-h-[200px] object-contain rounded-md" 
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleAddNote}>
              Crear apunte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
