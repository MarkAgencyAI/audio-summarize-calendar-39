import React, { useState, useEffect } from "react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, addHours } from "date-fns";
import { es } from "date-fns/locale";
import { v4 as uuidv4 } from "uuid";
import { TimeSlot } from "./TimeSlot";
import { Button } from "@/components/ui/button";
import { WeeklyEventDialog } from "./WeeklyEventDialog";
import { CalendarEvent } from "@/components/Calendar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Save, X } from "lucide-react";
import { useRecordings } from "@/context/RecordingsContext";
import { toast } from "sonner";
import { loadFromStorage, saveToStorage } from "@/lib/storage";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface WeeklyEventWithTemp extends Omit<CalendarEvent, "id"> {
  tempId: string;
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
  const isMobile = useIsMobile();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    day: Date;
    hour: number;
  } | null>(null);
  const [events, setEvents] = useState<WeeklyEventWithTemp[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(date, { weekStartsOn: 1 }));
  const [showDialog, setShowDialog] = useState(false);

  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 })
  });

  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  useEffect(() => {
    const savedEvents = loadFromStorage<WeeklyEventWithTemp[]>("weeklyScheduleEvents");
    
    if (savedEvents && savedEvents.length > 0) {
      setEvents(savedEvents);
    } else {
      const existingWeeklyEvents: WeeklyEventWithTemp[] = existingEvents
        .filter(event => {
          const eventDate = parseISO(event.date);
          const eventHour = eventDate.getHours();
          
          return eventHour >= 7 && eventHour <= 20 && event.repeat?.frequency === "weekly";
        })
        .map(event => ({
          ...event,
          tempId: uuidv4()
        }));

      setEvents(existingWeeklyEvents);
    }
  }, [existingEvents]);

  useEffect(() => {
    if (events.length > 0) {
      saveToStorage("weeklyScheduleEvents", events);
    }
  }, [events]);

  const generateTimeSlotKey = (day: Date, hour: number) => {
    return `${format(day, 'EEEE', { locale: es })}-${hour}`;
  };

  const handlePrevWeek = () => {
    setWeekStart(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setWeekStart(prev => addDays(prev, 7));
  };

  const handleAddEvent = (day: Date, hour: number) => {
    setSelectedTimeSlot({ day, hour });
    
    const eventDate = new Date(day);
    eventDate.setHours(hour, 0, 0, 0);
    
    const endDate = new Date(eventDate);
    endDate.setHours(hour + 1, 0, 0, 0);
    
    const formattedStartTime = `${hour.toString().padStart(2, '0')}:00`;
    const formattedEndTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
    
    setNewEvent({
      title: "",
      description: "",
      date: formattedStartTime,
      endDate: formattedEndTime,
      day: format(day, "EEEE", { locale: es }).toLowerCase(),
      type: "class",
      folderId: "",
      tempId: uuidv4()
    });
    
    setShowDialog(true);
  };

  const handleDeleteEvent = (tempId: string) => {
    setEvents(prev => prev.filter(event => event.tempId !== tempId));
    saveToStorage("weeklyScheduleEvents", events.filter(event => event.tempId !== tempId));
    toast.success("Evento eliminado del cronograma");
  };

  const [newEvent, setNewEvent] = useState<WeeklyEventWithTemp & { day: string }>({
    title: "",
    description: "",
    date: "",
    endDate: "",
    day: "",
    type: "class",
    folderId: "",
    tempId: uuidv4()
  });

  const handleSaveEvent = (event: WeeklyEventWithTemp & { day: string }) => {
    const { day, ...eventWithoutDay } = event;
    
    const dayDate = weekDays.find(d => 
      format(d, "EEEE", { locale: es }).toLowerCase() === day
    );
    
    if (!dayDate) return;
    
    const [hours, minutes] = event.date.split(":").map(Number);
    const [endHours, endMinutes] = event.endDate.split(":").map(Number);
    
    const startDate = new Date(dayDate);
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(dayDate);
    endDate.setHours(endHours, endMinutes, 0, 0);
    
    const newEventWithDates: WeeklyEventWithTemp = {
      ...eventWithoutDay,
      date: format(startDate, "yyyy-MM-dd'T'HH:mm"),
      endDate: format(endDate, "yyyy-MM-dd'T'HH:mm"),
      repeat: {
        frequency: "weekly",
        interval: 1
      }
    };
    
    const updatedEvents = [...events, newEventWithDates];
    setEvents(updatedEvents);
    saveToStorage("weeklyScheduleEvents", updatedEvents);
    setShowDialog(false);
    toast.success("Evento agregado al cronograma");
  };

  const handleSaveSchedule = () => {
    if (events.length === 0) {
      toast.error("No hay eventos en el cronograma");
      return;
    }
    
    onSave(events);
    toast.success("Cronograma guardado correctamente");
  };

  const getFolderName = (folderId: string): string => {
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : "Sin materia";
  };

  const getEventForTimeSlot = (day: Date, hour: number) => {
    const dayName = format(day, "EEEE", { locale: es }).toLowerCase();
    
    return events.find(event => {
      const eventDate = parseISO(event.date);
      const eventHour = eventDate.getHours();
      const eventDay = format(eventDate, "EEEE", { locale: es }).toLowerCase();
      
      return eventDay === dayName && eventHour === hour;
    });
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={handlePrevWeek} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-sm md:text-base font-medium">
              Cronograma semanal
            </CardTitle>
            <Button variant="outline" size="icon" onClick={handleNextWeek} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                <div className="sticky top-0 z-10 bg-background border-b">
                  <div className="h-12" />
                </div>
                {weekDays.map(day => (
                  <div key={day.toString()} className="sticky top-0 z-10 bg-background border-b px-1">
                    <div className="h-12 flex flex-col items-center justify-center">
                      <span className="text-xs font-medium capitalize">
                        {format(day, "EEE", { locale: es })}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(day, "d")}
                      </span>
                    </div>
                  </div>
                ))}

                {hours.map(hour => (
                  <React.Fragment key={hour}>
                    <div className="sticky left-0 bg-background border-r h-20 flex items-center justify-center text-xs text-muted-foreground">
                      {hour}:00
                    </div>
                    {weekDays.map(day => (
                      <TimeSlot
                        key={generateTimeSlotKey(day, hour)}
                        event={getEventForTimeSlot(day, hour)}
                        onClick={() => handleAddEvent(day, hour)}
                        onDelete={handleDeleteEvent}
                        getFolderName={getFolderName}
                        rowHeight={80}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="flex justify-between p-4 border-t">
          <Button variant="outline" onClick={onCancel} size="sm">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSaveSchedule} size="sm">
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </CardFooter>
      </Card>
      
      <WeeklyEventDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        event={newEvent}
        onSave={handleSaveEvent}
        folders={folders}
      />
    </div>
  );
}
