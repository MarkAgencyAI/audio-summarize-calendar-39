import React, { useState, useEffect, useRef } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { WeeklyEventDialog } from "./WeeklyEventDialog";
import { CalendarEvent } from "@/components/Calendar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Save, X, PlusCircle } from "lucide-react";
import { useRecordings } from "@/context/RecordingsContext";
import { toast } from "sonner";
import { loadFromStorage, saveToStorage } from "@/lib/storage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Updated type definition to include day property
export interface WeeklyEventWithTemp extends Omit<CalendarEvent, "id"> {
  tempId: string;
  day?: string;
}
interface WeeklyScheduleGridProps {
  date: Date;
  onSave: (events: Omit<CalendarEvent, "id">[]) => void;
  onCancel: () => void;
  hasExistingSchedule: boolean;
  existingEvents: CalendarEvent[];
}
export function WeeklyScheduleGrid({
  date,
  onSave,
  onCancel,
  hasExistingSchedule,
  existingEvents
}: WeeklyScheduleGridProps) {
  const {
    folders
  } = useRecordings();
  const [events, setEvents] = useState<WeeklyEventWithTemp[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("lunes");
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Generate hours from 7am to 9pm
  const hours = Array.from({
    length: 15
  }, (_, i) => i + 7);
  const days = [{
    value: "lunes",
    label: "Lunes"
  }, {
    value: "martes",
    label: "Martes"
  }, {
    value: "miércoles",
    label: "Miércoles"
  }, {
    value: "jueves",
    label: "Jueves"
  }, {
    value: "viernes",
    label: "Viernes"
  }, {
    value: "sábado",
    label: "Sábado"
  }, {
    value: "domingo",
    label: "Domingo"
  }];
  const handleDayChange = (value: string) => {
    setSelectedDay(value);
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const swipeThreshold = 50;
    const swipeDistance = touchEndX.current - touchStartX.current;
    if (Math.abs(swipeDistance) > swipeThreshold) {
      const currentIndex = days.findIndex(d => d.value === selectedDay);
      if (swipeDistance > 0 && currentIndex > 0) {
        // Swipe right - previous day
        setSelectedDay(days[currentIndex - 1].value);
      } else if (swipeDistance < 0 && currentIndex < days.length - 1) {
        // Swipe left - next day
        setSelectedDay(days[currentIndex + 1].value);
      }
    }
  };
  useEffect(() => {
    const savedEvents = loadFromStorage<WeeklyEventWithTemp[]>("weeklyScheduleEvents");
    if (savedEvents && savedEvents.length > 0) {
      setEvents(savedEvents);
    }
  }, []);
  const handleAddEvent = (hour: number) => {
    setSelectedHour(hour);
    const formattedStartTime = `${hour.toString().padStart(2, '0')}:00`;
    const formattedEndTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
    const newEvent: WeeklyEventWithTemp & {
      day: string;
    } = {
      title: "",
      description: "",
      date: formattedStartTime,
      endDate: formattedEndTime,
      day: selectedDay,
      type: "class",
      // Explicitly typed as one of the allowed values
      folderId: "",
      tempId: uuidv4()
    };
    setNewEvent(newEvent);
    setShowDialog(true);
  };
  const [newEvent, setNewEvent] = useState<WeeklyEventWithTemp & {
    day: string;
  }>({
    title: "",
    description: "",
    date: "",
    endDate: "",
    day: selectedDay,
    type: "class",
    // Explicitly typed as one of the allowed values
    folderId: "",
    tempId: uuidv4()
  });
  const handleSaveEvent = (event: WeeklyEventWithTemp & {
    day: string;
  }) => {
    const {
      day,
      ...eventWithoutDay
    } = event;
    const updatedEvent: WeeklyEventWithTemp = {
      ...eventWithoutDay,
      day,
      tempId: uuidv4(),
      repeat: {
        frequency: "weekly" as const,
        // Explicitly typed as one of the allowed values
        interval: 1
      }
    };
    const updatedEvents = [...events, updatedEvent];
    setEvents(updatedEvents);
    saveToStorage("weeklyScheduleEvents", updatedEvents);
    setShowDialog(false);
    toast.success("Evento agregado al cronograma");
  };
  const handleDeleteEvent = (tempId: string) => {
    const updatedEvents = events.filter(event => event.tempId !== tempId);
    setEvents(updatedEvents);
    saveToStorage("weeklyScheduleEvents", updatedEvents);
    toast.success("Evento eliminado del cronograma");
  };
  const handleSaveSchedule = () => {
    if (events.length === 0) {
      toast.error("No hay eventos en el cronograma");
      return;
    }
    const calendarEvents = events.map(({
      tempId,
      day,
      ...event
    }) => ({
      ...event,
      type: event.type || "class"
    }));
    onSave(calendarEvents);
  };
  const getFolderName = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : "Sin materia";
  };
  const getEventsForDay = (day: string) => {
    return events.filter(event => event.day === day);
  };
  return <div className="space-y-4 w-full max-w-[100vw] px-2">
      <Card className="overflow-hidden border border-border w-full max-w-4xl mx-auto" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <CardHeader className="p-3">
          <div className="flex items-center justify-between w-full gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
            
            <Select value={selectedDay} onValueChange={handleDayChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar día" />
              </SelectTrigger>
              <SelectContent>
                {days.map(day => <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>)}
              </SelectContent>
            </Select>

            <Button onClick={handleSaveSchedule} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="w-full">
              {hours.map(hour => {
              const dayEvents = getEventsForDay(selectedDay).filter(event => {
                const [eventHour] = event.date.split(":").map(Number);
                return eventHour === hour;
              });
              return <div key={hour} className="grid grid-cols-[80px_1fr] border-t border-border">
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {hour}:00
                    </div>
                    <div className="border-l border-border p-2 min-h-[64px] hover:bg-accent/10 transition-colors cursor-pointer relative" onClick={() => events.length === 0 && handleAddEvent(hour)}>
                      {dayEvents.map(event => <div key={event.tempId} className="absolute inset-1 rounded-sm p-2" style={{
                    backgroundColor: `${event.type === "class" ? "#4CAF50" : "#2196F3"}15`,
                    borderLeft: `3px solid ${event.type === "class" ? "#4CAF50" : "#2196F3"}`
                  }}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{event.title}</p>
                              {event.folderId && <p className="text-xs opacity-80">{getFolderName(event.folderId)}</p>}
                              <p className="text-xs text-muted-foreground">
                                {event.date} - {event.endDate}
                              </p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => {
                        e.stopPropagation();
                        handleDeleteEvent(event.tempId);
                      }}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>)}
                      {events.length === 0 && <div className="flex items-center justify-center h-full opacity-30 group-hover:opacity-100">
                          <PlusCircle className="h-5 w-5" />
                        </div>}
                    </div>
                  </div>;
            })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <WeeklyEventDialog open={showDialog} onOpenChange={setShowDialog} event={newEvent} onSave={handleSaveEvent} folders={folders} />
    </div>;
}