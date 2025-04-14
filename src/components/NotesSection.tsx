
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Plus, BookOpen, PenLine } from "lucide-react";
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
        <div className="text-center p-8 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <h4 className="text-lg font-medium mb-2 text-slate-700 dark:text-slate-300">No hay apuntes todavía</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Crea tu primer apunte para esta grabación
          </p>
          <Button onClick={() => setShowNewNoteDialog(true)} variant="default">
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
        <Button onClick={() => setShowNewNoteDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo apunte
        </Button>
      </div>
      
      {renderNotes()}
      
      <Dialog open={showNewNoteDialog} onOpenChange={setShowNewNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo apunte</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="title">Título</Label>
            <Input 
              id="title"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Título del apunte"
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
