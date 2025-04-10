
// Fix the addFolder call by removing the id property and adding a createdAt property
const handleCreateFolder = (name: string, color: string) => {
  addFolder({
    name, 
    color,
    createdAt: new Date().toISOString()
  });
  setShowNewFolderDialog(false);
  setNewFolderName('');
};
