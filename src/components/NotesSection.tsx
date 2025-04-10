
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Plus } from "lucide-react";
import { useRecordings } from "@/context/RecordingsContext";
import { NoteItem } from "@/components/NoteItem";

interface NotesSectionProps {
  folderId?: string;
  sectionTitle?: string;
}

export function NotesSection({ folderId, sectionTitle = "Apuntes" }: NotesSectionProps) {
  const { 
    addNote, 
    getFolderNotes, 
    updateNote, 
    deleteNote 
  } = useRecordings();
  
  const [showNewNoteDialog, setShowNewNoteDialog] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [editingNote, setEditingNote] = useState<any>(null);
  const [currentFolder, setCurrentFolder] = useState(folderId || "");
  
  const handleCreateNote = () => {
    addNote({
      title: newNoteTitle,
      content: '',
      folderId: currentFolder,
      imageUrl: '',
      updatedAt: new Date().toISOString()
    });
    setShowNewNoteDialog(false);
    setNewNoteTitle('');
  };
  
  const handleEditNote = (note: any) => {
    setEditingNote(note);
  };
  
  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
  };
  
  const renderNotes = () => {
    const folderNotes = getFolderNotes(currentFolder);
    
    if (folderNotes.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p>No hay notas en esta carpeta</p>
          <Button onClick={() => setShowNewNoteDialog(true)} className="mt-4" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Nueva nota
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">{sectionTitle}</h2>
        <Button onClick={() => setShowNewNoteDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nueva nota
        </Button>
      </div>
      
      {renderNotes()}
      
      <Dialog open={showNewNoteDialog} onOpenChange={setShowNewNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva nota</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="title">Título</Label>
            <Input 
              id="title"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Título de la nota"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewNoteDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateNote} disabled={!newNoteTitle.trim()}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
