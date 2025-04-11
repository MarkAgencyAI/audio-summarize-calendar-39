
import { useState } from "react";
import { useRecordings } from "@/context/RecordingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Save, X, Globe, Folder, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RecordingHeaderProps } from "./types";
import { useIsMobile } from "@/hooks/use-mobile";

export function RecordingHeader({ recording }: RecordingHeaderProps) {
  const { updateRecording, deleteRecording, folders } = useRecordings();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(recording.name);
  const [selectedFolder, setSelectedFolder] = useState(recording.folderId);
  const isMobile = useIsMobile();
  
  const folder = folders.find(f => f.id === recording.folderId) || folders[0];
  
  const handleSaveRename = () => {
    if (newName.trim() === "") {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    updateRecording(recording.id, {
      name: newName
    });
    setIsRenaming(false);
    toast.success("Nombre actualizado");
  };
  
  const handleCancelRename = () => {
    setNewName(recording.name);
    setIsRenaming(false);
  };
  
  const handleDelete = () => {
    deleteRecording(recording.id);
    toast.success("Grabación eliminada");
  };
  
  const handleFolderChange = (folderId: string) => {
    setSelectedFolder(folderId);
    updateRecording(recording.id, {
      folderId
    });
    toast.success("Carpeta actualizada");
  };

  return (
    <>
      <div className="flex-1 max-w-[calc(100%-40px)]">
        {isRenaming ? (
          <div className="flex items-center gap-2">
            <Input 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              className="h-8 max-w-[200px]" 
              autoFocus 
            />
            <Button variant="ghost" size="icon" onClick={handleSaveRename} className="h-7 w-7 p-0">
              <Save className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCancelRename} className="h-7 w-7 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[#005c5f] dark:text-[#f1f2f6] truncate">{recording.name}</span>
            <Button variant="ghost" size="icon" onClick={() => setIsRenaming(true)} className="h-7 w-7 p-0 flex-shrink-0">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="text-destructive h-7 w-7 p-0 flex-shrink-0">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="dark:bg-[#001A29] dark:border-custom-secondary max-w-[95vw] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta grabación?</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-300">
              Esta acción no se puede deshacer. Se eliminará permanentemente esta grabación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-custom-secondary/40 dark:text-white dark:hover:bg-custom-secondary/60">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="flex flex-wrap items-center gap-2 mt-2 mb-2 w-full">
        <div className="flex items-center gap-2 w-full">
          <Label htmlFor="folder-select" className="min-w-20 flex items-center">
            <div 
              className="h-6 w-6 rounded-full flex items-center justify-center mr-2" 
              style={{ backgroundColor: folder.color }}
            >
              <Folder className="h-3 w-3 text-white" />
            </div>
            <span>Carpeta:</span>
          </Label>
          
          <Select 
            value={selectedFolder} 
            onValueChange={handleFolderChange}
          >
            <SelectTrigger 
              id="folder-select"
              className="h-9 w-full min-w-[200px] flex-1 dark:bg-custom-secondary/40 dark:border-custom-secondary"
            >
              <SelectValue placeholder="Seleccionar carpeta" />
            </SelectTrigger>
            <SelectContent className="dark:bg-[#001A29] dark:border-custom-secondary max-h-[300px]">
              {folders.map(f => (
                <SelectItem key={f.id} value={f.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: f.color }}
                    />
                    <span className="truncate">{f.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {recording.subject && (
          <div className="flex items-center gap-1 ml-auto text-xs bg-muted px-2 py-1 rounded-full dark:bg-custom-secondary/40 dark:text-white">
            <Globe className="h-3 w-3" />
            <span>{recording.subject}</span>
          </div>
        )}
      </div>
    </>
  );
}
