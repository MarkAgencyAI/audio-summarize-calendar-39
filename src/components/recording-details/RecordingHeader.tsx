
import React, { useState } from "react";
import { Recording } from "@/context/RecordingsContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit, Check, Trash2, Folder } from "lucide-react";
import { toast } from "sonner";
import { useRecordings } from "@/context/RecordingsContext";
import { cn } from "@/lib/utils";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { 
  Dialog,
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecordingService } from "@/lib/services/recording-service";

interface RecordingHeaderProps {
  recording: Recording;
  onDeleteEvent?: (eventId: string) => void;
}

export function RecordingHeader({ recording, onDeleteEvent }: RecordingHeaderProps) {
  const { updateRecording, folders } = useRecordings();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(recording.name);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showDeleteEventDialog, setShowDeleteEventDialog] = useState(false);
  const [showAssignFolderDialog, setShowAssignFolderDialog] = useState(false);
  
  const handleSaveName = () => {
    if (newName.trim()) {
      updateRecording(recording.id, { name: newName.trim() });
      setIsEditing(false);
      toast.success("Nombre actualizado");
    }
  };
  
  const handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const handleDeleteEventClick = () => {
    setShowDeleteEventDialog(true);
  };

  const confirmDeleteEvent = () => {
    if (selectedEventId && onDeleteEvent) {
      onDeleteEvent(selectedEventId);
      setSelectedEventId(null);
      setShowDeleteEventDialog(false);
    }
  };
  
  const handleAssignFolder = async (folderId: string | null) => {
    try {
      await RecordingService.updateRecording(recording.id, { folderId });
      await updateRecording(recording.id, { folderId });
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
  
  // Check if recording has events property and it's an array
  const events = recording.events as any[] || [];
  const hasEvents = events && events.length > 0;
  
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex-1">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="max-w-sm text-lg font-semibold border-slate-300 dark:border-slate-700"
              autoFocus
            />
            <Button size="sm" onClick={handleSaveName}>
              <Check className="h-4 w-4 mr-1" />
              <span>Guardar</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              {recording.name}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-3.5 w-3.5" />
                <span className="sr-only">Editar nombre</span>
              </Button>
            </h2>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAssignFolderDialog(true)}
              className="h-7 flex items-center gap-1.5 text-xs"
            >
              <Folder className="h-3.5 w-3.5" />
              {recording.folderId ? (
                <div 
                  className="flex items-center gap-1"
                  style={{ 
                    color: getFolderColor()
                  }}
                >
                  <span>{getFolderName()}</span>
                </div>
              ) : (
                <span>Asignar carpeta</span>
              )}
            </Button>
          </div>
        )}
        
        {hasEvents && (
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Eventos: </span>
            {events.map((event) => (
              <Popover key={event.id}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 py-0 px-2 text-xs border-slate-200 dark:border-slate-700",
                      selectedEventId === event.id && "ring-2 ring-blue-500 dark:ring-blue-400"
                    )}
                    onClick={() => handleEventClick(event.id)}
                  >
                    {event.title}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    {event.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">{event.description}</p>
                    )}
                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteEventClick}
                        className="h-8 text-xs mt-2"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        <span>Eliminar evento</span>
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ))}
          </div>
        )}
      </div>
      
      <AlertDialog open={showDeleteEventDialog} onOpenChange={setShowDeleteEventDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar evento</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar este evento? Esta acción no puede deshacerse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEvent} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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
