
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Folder, MoreHorizontal, Pencil, Trash2, CalendarPlus, Calendar, Check, X } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecordings } from "@/context/RecordingsContext";
import { RecordingService } from "@/lib/services/recording-service";
import { toast } from "sonner";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface RecordingHeaderProps {
  recording: any;
  onDeleteEvent?: (eventId: string) => void;
}

export function RecordingHeader({ recording, onDeleteEvent }: RecordingHeaderProps) {
  const { updateRecording, folders, refreshData } = useRecordings();
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(recording.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignFolderDialog, setShowAssignFolderDialog] = useState(false);
  
  const handleSaveName = async () => {
    if (nameInput.trim() === "") {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    
    try {
      await RecordingService.updateRecording(recording.id, { name: nameInput });
      toast.success("Nombre actualizado");
      setIsRenaming(false);
      refreshData();
    } catch (error) {
      console.error("Error updating recording name:", error);
      toast.error("Error al actualizar el nombre");
    }
  };
  
  const handleAddToCalendar = () => {
    // This would be implemented based on your calendar functionality
    toast.info("Función de agregar al calendario");
  };

  const handleAssignFolder = async (folderId: string | null) => {
    try {
      await RecordingService.updateRecording(recording.id, { folderId });
      await refreshData();
      const folderName = folderId 
        ? folders.find(f => f.id === folderId)?.name || 'la carpeta' 
        : 'Sin carpeta';
      toast.success(`Transcripción asignada a ${folderName}`);
      setShowAssignFolderDialog(false);
    } catch (error) {
      console.error('Error asignando carpeta:', error);
      toast.error('Error al asignar la carpeta');
    }
  };

  const getFolderName = () => {
    if (!recording.folderId) return null;
    const folder = folders.find(f => f.id === recording.folderId);
    return folder ? folder.name : null;
  };

  const getFolderColor = () => {
    if (!recording.folderId) return null;
    const folder = folders.find(f => f.id === recording.folderId);
    return folder ? folder.color : null;
  };
  
  const handleUnderstoodChange = (understood: boolean) => {
    if (recording) {
      RecordingService.updateRecording(recording.id, { understood });
      toast.success(understood ? "Marcada como entendida" : "Marcada como no entendida");
    }
  };

  return (
    <div className="flex justify-between items-start">
      <div className="space-y-1">
        {isRenaming ? (
          <div className="flex items-center gap-2">
            <Input 
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="h-9 min-w-[260px]"
              autoFocus
            />
            <Button onClick={handleSaveName} size="sm" variant="ghost">
              <Check className="h-4 w-4" />
            </Button>
            <Button onClick={() => setIsRenaming(false)} size="sm" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <h2 className="text-xl font-semibold">{recording.name}</h2>
        )}
        
        <div className="flex items-center flex-wrap gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{new Date(recording.createdAt || recording.date).toLocaleDateString()}</span>
          </div>
          
          {recording.duration && (
            <div>
              <span>·</span>
              <span className="ml-1">
                {Math.floor(recording.duration / 60)}:{(recording.duration % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
          
          {recording.folderId && (
            <div 
              className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
              style={{ 
                backgroundColor: `${getFolderColor()}20`,
                color: getFolderColor()
              }}
            >
              <Folder className="h-3 w-3" />
              <span>{getFolderName()}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <ToggleGroup 
          type="single" 
          value={recording.understood ? "understood" : "not-understood"}
          onValueChange={(value) => {
            if (value) {
              handleUnderstoodChange(value === "understood");
            }
          }}
          className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm"
        >
          <ToggleGroupItem 
            value="understood" 
            aria-label="Entendida" 
            className={`${recording.understood ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50' : ''} 
              flex items-center gap-1 px-3 py-1.5 h-9 rounded-l-md data-[state=on]:border-green-500`}
          >
            <Check className="h-4 w-4" />
            <span className="text-sm">Entendida</span>
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="not-understood" 
            aria-label="No entendida" 
            className={`${!recording.understood ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50' : ''} 
              flex items-center gap-1 px-3 py-1.5 h-9 rounded-r-md data-[state=on]:border-amber-500`}
          >
            <X className="h-4 w-4" />
            <span className="text-sm">No entendida</span>
          </ToggleGroupItem>
        </ToggleGroup>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Más opciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Renombrar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowAssignFolderDialog(true)}>
              <Folder className="h-4 w-4 mr-2" />
              Asignar a carpeta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleAddToCalendar}>
              <CalendarPlus className="h-4 w-4 mr-2" />
              Añadir al calendario
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar grabación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta grabación? Esta acción no puede ser deshecha.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
            <Button variant="destructive">Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showAssignFolderDialog} onOpenChange={setShowAssignFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar a carpeta</DialogTitle>
            <DialogDescription>
              Selecciona la carpeta donde deseas guardar esta transcripción
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-select">Carpeta</Label>
              <Select 
                defaultValue={recording.folderId || ""}
                onValueChange={(value) => handleAssignFolder(value === "" ? null : value)}
              >
                <SelectTrigger id="folder-select">
                  <SelectValue placeholder="Seleccionar carpeta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin carpeta</SelectItem>
                  {folders.map(folder => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: folder.color }}
                        ></div>
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignFolderDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
