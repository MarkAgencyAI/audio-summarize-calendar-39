
// Update the addNote call to include updatedAt property
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
