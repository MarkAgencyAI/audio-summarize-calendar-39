import React, { useState, useEffect, useRef } from "react";
import { format, addDays, startOfWeek, parseISO, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { WeeklyEventDialog } from "./WeeklyEventDialog";
import { CalendarEvent } from "@/components/Calendar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Save, X, PlusCircle } from "lucide-react";
import { useRecordings } from "@/context/RecordingsContext";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

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
  const { folders } = useRecordings();
  const { user } = useAuth();
  const [events, setEvents] = useState<WeeklyEventWithTemp[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("lunes");
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

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

  useEffect(() => {
    const loadEvents = async () => {
      if (!user) return;

      try {
        const { data: weeklyEvents, error } = await supabase
          .from('weekly_schedule_events')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;

        const formattedEvents = weeklyEvents.map(event => ({
          tempId: event.id,
          title: event.title,
          description: event.description || "",
          date: event.start_time,
          endDate: event.end_time,
          type: event.type as "class" | "meeting",
          folderId: event.folder_id || "",
          day: event.day
        }));

        setEvents(formattedEvents);
      } catch (error) {
        console.error("Error loading weekly events:", error);
        toast.error("Error al cargar los eventos del cronograma");
      }
    };

    loadEvents();
  }, [user]);

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
        setSelectedDay(days[currentIndex - 1].value);
      } else if (swipeDistance < 0 && currentIndex < days.length - 1) {
        setSelectedDay(days[currentIndex + 1].value);
      }
    }
  };

  const hasOverlappingEvent = (day: string, startTime: string, endTime: string, excludeEventId?: string) => {
    return events.some(event => {
      if (event.tempId === excludeEventId) return false;
      if (event.day !== day) return false;

      const [newStartHour, newStartMinute] = startTime.split(':').map(Number);
      const [newEndHour, newEndMinute] = endTime.split(':').map(Number);
      const [existingStartHour, existingStartMinute] = event.date.split(':').map(Number);
      const [existingEndHour, existingEndMinute] = event.endDate.split(':').map(Number);

      const newStart = newStartHour * 60 + newStartMinute;
      const newEnd = newEndHour * 60 + newEndMinute;
      const existingStart = existingStartHour * 60 + existingStartMinute;
      const existingEnd = existingEndHour * 60 + existingEndMinute;

      return (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );
    });
  };

  const handleAddEvent = (hour: number) => {
    const formattedStartTime = `${hour.toString().padStart(2, '0')}:00`;
    const formattedEndTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

    if (hasOverlappingEvent(selectedDay, formattedStartTime, formattedEndTime)) {
      toast.error("Ya existe un evento en este horario");
      return;
    }

    setSelectedHour(hour);
    const newEvent: WeeklyEventWithTemp & {
      day: string;
    } = {
      title: "",
      description: "",
      date: formattedStartTime,
      endDate: formattedEndTime,
      day: selectedDay,
      type: "class",
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
    folderId: "",
    tempId: uuidv4()
  });

  const handleSaveEvent = async (event: WeeklyEventWithTemp & { day: string }) => {
    if (hasOverlappingEvent(event.day, event.date, event.endDate)) {
      toast.error("El horario se superpone con otro evento existente");
      return;
    }

    if (!user) {
      toast.error("Debes iniciar sesión para guardar eventos");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('weekly_schedule_events')
        .insert({
          title: event.title,
          description: event.description,
          day: event.day,
          start_time: event.date,
          end_time: event.endDate,
          folder_id: event.folderId || null,
          type: event.type,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      const newEvent: WeeklyEventWithTemp = {
        ...event,
        tempId: data.id
      };

      setEvents(prev => [...prev, newEvent]);
      setShowDialog(false);
      toast.success("Evento agregado al cronograma");
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Error al guardar el evento");
    }
  };

  const handleDeleteEvent = async (tempId: string) => {
    try {
      const { error } = await supabase
        .from('weekly_schedule_events')
        .delete()
        .eq('id', tempId);

      if (error) throw error;

      setEvents(prev => prev.filter(event => event.tempId !== tempId));
      toast.success("Evento eliminado del cronograma");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Error al eliminar el evento");
    }
  };

  const handleSaveSchedule = () => {
    if (events.length === 0) {
      toast.error("No hay eventos en el cronograma");
      return;
    }

    const calendarEvents = events.map(({ tempId, day, ...event }) => ({
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

  const getEventStyles = (event: WeeklyEventWithTemp) => {
    try {
      const [startHour, startMinute] = event.date.split(':').map(Number);
      const [endHour, endMinute] = event.endDate.split(':').map(Number);
      
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;
      
      const durationInMinutes = endTimeInMinutes - startTimeInMinutes;
      
      const startFromGridInMinutes = startTimeInMinutes - (7 * 60);
      const topPosition = (startFromGridInMinutes / 60) * 64;
      
      const height = (durationInMinutes / 60) * 64;
      
      return {
        top: `${topPosition}px`,
        height: `${height}px`,
      };
    } catch (e) {
      return { top: '0px', height: '64px' };
    }
  };

  const hasEventStartingAtHour = (hour: number, day: string) => {
    return events.some(event => {
      const [eventHour] = event.date.split(':').map(Number);
      return eventHour === hour && event.day === day;
    });
  };

  const hasEventInTimeSlot = (hour: number, day: string) => {
    return events.some(event => {
      const [startHour, startMinute] = event.date.split(':').map(Number);
      const [endHour, endMinute] = event.endDate.split(':').map(Number);
      
      const slotStart = hour * 60;
      const slotEnd = (hour + 1) * 60;
      const eventStart = startHour * 60 + startMinute;
      const eventEnd = endHour * 60 + endMinute;
      
      return event.day === day && 
        ((eventStart < slotEnd && eventEnd > slotStart) || 
         (eventStart === slotStart));
    });
  };

  return (
    <div className="space-y-4 w-full max-w-[100vw] px-2">
      <Card className="overflow-hidden border border-border w-full max-w-4xl mx-auto" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <CardHeader className="p-3">
          <div className="flex items-center justify-between max-w-72 gap-2">
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
            <Button onClick={handleSaveSchedule} size="sm" className="w-10">
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="w-full">
              {hours.map(hour => {
                const hasEvent = hasEventInTimeSlot(hour, selectedDay);
                const hourEvents = getEventsForHourSlot(hour, selectedDay);
                
                return (
                  <div key={hour} className="grid grid-cols-[80px_1fr] border-t border-border">
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {hour}:00
                    </div>
                    <div 
                      className="border-l border-border p-2 min-h-[64px] hover:bg-accent/10 transition-colors relative" 
                      onClick={() => !hasEvent && handleAddEvent(hour)}
                    >
                      {hourEvents.map(event => {
                        const [eventHour] = event.date.split(':').map(Number);
                        if (eventHour !== hour) return null;
                        
                        const styles = getEventStyles(event);
                        
                        return (
                          <div 
                            key={event.tempId} 
                            className="absolute left-0 right-0 mx-2 rounded-sm p-2 z-10"
                            style={{
                              backgroundColor: `${event.type === "class" ? "#4CAF50" : "#2196F3"}15`,
                              borderLeft: `3px solid ${event.type === "class" ? "#4CAF50" : "#2196F3"}`,
                              top: styles.top,
                              height: styles.height,
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <div className="overflow-hidden">
                                <p className="font-medium text-sm truncate">{event.title}</p>
                                {event.folderId && <p className="text-xs opacity-80 truncate">{getFolderName(event.folderId)}</p>}
                                <p className="text-xs text-muted-foreground">
                                  {event.date} - {event.endDate}
                                </p>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 shrink-0"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDeleteEvent(event.tempId);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {!hasEvent && (
                        <div className="flex items-center justify-center h-full opacity-30 hover:opacity-60 cursor-pointer">
                          <PlusCircle className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      <WeeklyEventDialog 
        open={showDialog} 
        onOpenChange={setShowDialog} 
        event={newEvent} 
        onSave={handleSaveEvent} 
        folders={folders} 
        onCheckOverlap={(day, startTime, endTime) => hasOverlappingEvent(day, startTime, endTime)}
      />
    </div>
  );
}
