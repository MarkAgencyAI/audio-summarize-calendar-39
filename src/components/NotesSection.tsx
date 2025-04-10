
// Update the addNote call to include updatedAt
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

// Fix the mapping between Note and NoteProps in renderNotes
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
