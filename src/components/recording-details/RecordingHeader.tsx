
import React, { useState } from "react";
import { Recording } from "@/context/RecordingsContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit, Check, Trash2 } from "lucide-react";
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

interface RecordingHeaderProps {
  recording: Recording;
  onDeleteEvent?: (eventId: string) => void;
}

export function RecordingHeader({ recording, onDeleteEvent }: RecordingHeaderProps) {
  const { updateRecording } = useRecordings();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(recording.name);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showDeleteEventDialog, setShowDeleteEventDialog] = useState(false);
  
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
        )}
        
        {recording.events && recording.events.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Eventos: </span>
            {recording.events.map((event) => (
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
    </div>
  );
}
