
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WeeklyEventWithTemp } from "./WeeklyScheduleGrid";

interface FolderRecord {
  id: string;
  name: string;
}

interface WeeklyEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: WeeklyEventWithTemp & { day: string };
  onSave: (event: WeeklyEventWithTemp & { day: string }) => void;
  folders: FolderRecord[];
}

export function WeeklyEventDialog({
  open,
  onOpenChange,
  event,
  onSave,
  folders
}: WeeklyEventDialogProps) {
  const [localEvent, setLocalEvent] = React.useState(event);

  React.useEffect(() => {
    setLocalEvent(event);
  }, [event]);

  const handleSave = () => {
    onSave(localEvent);
  };

  const days = [
    { value: "lunes", label: "Lunes" },
    { value: "martes", label: "Martes" },
    { value: "miércoles", label: "Miércoles" },
    { value: "jueves", label: "Jueves" },
    { value: "viernes", label: "Viernes" },
    { value: "sábado", label: "Sábado" },
    { value: "domingo", label: "Domingo" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Evento del cronograma</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={localEvent.title}
              onChange={(e) => setLocalEvent({ ...localEvent, title: e.target.value })}
              placeholder="Ej: Clase de Matemáticas"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="day">Día</Label>
            <Select
              value={localEvent.day}
              onValueChange={(value) => setLocalEvent({ ...localEvent, day: value })}
            >
              <SelectTrigger id="day">
                <SelectValue placeholder="Selecciona un día" />
              </SelectTrigger>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startTime">Hora inicio</Label>
              <Input
                id="startTime"
                type="time"
                value={localEvent.date}
                onChange={(e) => setLocalEvent({ ...localEvent, date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endTime">Hora fin</Label>
              <Input
                id="endTime"
                type="time"
                value={localEvent.endDate}
                onChange={(e) => setLocalEvent({ ...localEvent, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="folder">Materia</Label>
            <Select
              value={localEvent.folderId || "_empty"}
              onValueChange={(value) => setLocalEvent({ ...localEvent, folderId: value === "_empty" ? "" : value })}
            >
              <SelectTrigger id="folder">
                <SelectValue placeholder="Selecciona una materia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_empty">Sin materia</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={localEvent.description || ""}
              onChange={(e) => setLocalEvent({ ...localEvent, description: e.target.value })}
              placeholder="Agrega una descripción"
              className="min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!localEvent.title || !localEvent.day || !localEvent.date || !localEvent.endDate}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
