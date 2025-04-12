
import { useState } from "react";
import { useRecordings } from "@/context/RecordingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pencil, Save, X, FolderOpen, Trash2, Globe, Clock, Tag } from "lucide-react";
import { toast } from "sonner";
import { RecordingHeaderProps } from "./types";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

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
    updateRecording(recording.id, { name: newName });
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
    updateRecording(recording.id, { folderId });
    toast.success("Carpeta actualizada");
  };
  
  const getRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: es
      });
    } catch (e) {
      return "fecha desconocida";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Title area */}
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <div className="flex items-center gap-2">
              <Input 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                className="h-9 max-w-md" 
                autoFocus 
              />
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSaveRename} 
                  className="h-9 w-9 rounded-full bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleCancelRename} 
                  className="h-9 w-9 rounded-full bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 truncate">
                {recording.name}
              </h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsRenaming(true)} 
                className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          
          {/* Time and badges */}
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{getRelativeTime(recording.createdAt || recording.date)}</span>
            </div>
            
            {recording.subject && (
              <Badge variant="outline" className="flex items-center gap-1 px-2 py-0 h-5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                <Tag className="h-3 w-3" />
                <span className="text-xs">{recording.subject}</span>
              </Badge>
            )}
            
            <Badge 
              variant={recording.understood ? "default" : "secondary"}
              className={recording.understood 
                ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50" 
                : "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50"
              }
            >
              {recording.understood ? "Entendida" : "No entendida"}
            </Badge>
          </div>
        </div>
        
        {/* Actions area */}
        <div className="flex items-center">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                <span className={isMobile ? "sr-only" : ""}>Eliminar</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="dark:bg-slate-900 dark:border-slate-800 max-w-[95vw] md:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar esta grabación?</AlertDialogTitle>
                <AlertDialogDescription className="dark:text-slate-400">
                  Esta acción no se puede deshacer. Se eliminará permanentemente esta grabación.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete} 
                  className="bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-700"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {/* Folder selection */}
      <div className="flex items-center gap-2 max-w-md bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: folder.color }}>
            <FolderOpen className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="whitespace-nowrap">Carpeta:</span>
        </div>
        
        <Select value={selectedFolder} onValueChange={handleFolderChange}>
          <SelectTrigger 
            className="h-8 flex-1 min-w-[120px] text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          >
            <SelectValue placeholder="Seleccionar carpeta" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-900 dark:border-slate-800 max-h-[300px]">
            {folders.map(f => (
              <SelectItem key={f.id} value={f.id}>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: f.color }} />
                  <span className="truncate">{f.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
