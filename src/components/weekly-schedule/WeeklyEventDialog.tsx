
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { WeeklyEventWithTemp } from "./WeeklyScheduleGrid";
import { Folder } from "@/context/RecordingsContext";

interface WeeklyEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: WeeklyEventWithTemp & { day: string };
  onSave: (event: WeeklyEventWithTemp & { day: string }) => void;
  folders: Folder[];
}

export function WeeklyEventDialog({ 
  open, 
  onOpenChange, 
  event, 
  onSave,
  folders 
}: WeeklyEventDialogProps) {
  const [editedEvent, setEditedEvent] = useState<WeeklyEventWithTemp & { day: string }>(event);
  
  // Update the local state when the incoming event changes
  useEffect(() => {
    setEditedEvent(event);
  }, [event, open]);

  const handleSave = () => {
    if (!editedEvent.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    
    // Validate time format
    const startTimeParts = editedEvent.date.split(":").map(Number);
    const endTimeParts = editedEvent.endDate.split(":").map(Number);
    
    if (startTimeParts.length !== 2 || endTimeParts.length !== 2) {
      toast.error("Formato de hora inválido");
      return;
    }
    
    const [startHours, startMinutes] = startTimeParts;
    const [endHours, endMinutes] = endTimeParts;
    
    if (
      isNaN(startHours) || isNaN(startMinutes) || 
      isNaN(endHours) || isNaN(endMinutes)
    ) {
      toast.error("Hora inválida");
      return;
    }
    
    // Check if end time is after start time
    if (endHours < startHours || (endHours === startHours && endMinutes <= startMinutes)) {
      toast.error("La hora de finalización debe ser posterior a la hora de inicio");
      return;
    }
    
    onSave(editedEvent);
    onOpenChange(false); // Close dialog after saving
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Agregar evento al cronograma</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input 
              id="title" 
              value={editedEvent.title} 
              onChange={e => setEditedEvent({
                ...editedEvent,
                title: e.target.value
              })} 
              placeholder="Ej: Clase de Matemáticas"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="folder">Materia</Label>
            <Select
              value={editedEvent.folderId || "_empty"}
              onValueChange={(value) => setEditedEvent({
                ...editedEvent,
                folderId: value === "_empty" ? "" : value
              })}
            >
              <SelectTrigger id="folder">
                <SelectValue placeholder="Selecciona una materia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_empty">Sin materia</SelectItem>
                {folders.map(folder => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea 
              id="description" 
              value={editedEvent.description} 
              onChange={e => setEditedEvent({
                ...editedEvent,
                description: e.target.value
              })} 
            />
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startTime">Hora de inicio</Label>
              <Input 
                id="startTime" 
                type="time" 
                value={editedEvent.date} 
                onChange={e => {
                  setEditedEvent({
                    ...editedEvent,
                    date: e.target.value
                  });
                }} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endTime">Hora de finalización</Label>
              <Input 
                id="endTime" 
                type="time" 
                value={editedEvent.endDate} 
                onChange={e => {
                  setEditedEvent({
                    ...editedEvent,
                    endDate: e.target.value
                  });
                }} 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select 
              value={editedEvent.type} 
              onValueChange={(value: "exam" | "assignment" | "study" | "class" | "meeting" | "other") => 
                setEditedEvent({
                  ...editedEvent,
                  type: value
                })
              }
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Selecciona un tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="class">Clase</SelectItem>
                <SelectItem value="exam">Examen</SelectItem>
                <SelectItem value="assignment">Tarea</SelectItem>
                <SelectItem value="study">Estudio</SelectItem>
                <SelectItem value="meeting">Reunión</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Agregar al cronograma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
