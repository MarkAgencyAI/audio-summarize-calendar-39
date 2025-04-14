
import React, { useState, useEffect } from "react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from "date-fns";
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
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    day: Date;
    hour: number;
  } | null>(null);
  const [events, setEvents] = useState<WeeklyEventWithTemp[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(date, { weekStartsOn: 1 }));
  const [showDialog, setShowDialog] = useState(false);

  // Generate array of days for the current week
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 })
  });

  // Hours for the day
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

  // Load existing events that match the weekly pattern
  useEffect(() => {
    const existingWeeklyEvents: WeeklyEventWithTemp[] = existingEvents
      .filter(event => {
        const eventDate = parseISO(event.date);
        const eventDay = eventDate.getDay();
        const eventHour = eventDate.getHours();
        
        // Only include events within our schedule hours (7am-8pm)
        return eventHour >= 7 && eventHour <= 20 && event.repeat?.frequency === "weekly";
      })
      .map(event => ({
        ...event,
        tempId: uuidv4()
      }));

    setEvents(existingWeeklyEvents);
  }, [existingEvents]);

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
    
    // Create a new date representing this time slot
    const eventDate = new Date(day);
    eventDate.setHours(hour, 0, 0, 0);
    
    // End date is 1 hour later
    const endDate = new Date(eventDate);
    endDate.setHours(hour + 1, 0, 0, 0);
    
    // Initialize new event with these dates
    setNewEvent({
      title: "",
      description: "",
      date: format(eventDate, "HH:mm"),
      endDate: format(endDate, "HH:mm"),
      day: format(day, "EEEE", { locale: es }).toLowerCase(),
      type: "class",
      folderId: "",
      tempId: uuidv4()
    });
    
    setShowDialog(true);
  };

  const handleDeleteEvent = (tempId: string) => {
    setEvents(prev => prev.filter(event => event.tempId !== tempId));
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
    
    // Find the corresponding day in our week
    const dayDate = weekDays.find(d => 
      format(d, "EEEE", { locale: es }).toLowerCase() === day
    );
    
    if (!dayDate) return;
    
    // Extract hours and minutes
    const [hours, minutes] = event.date.split(":").map(Number);
    const [endHours, endMinutes] = event.endDate.split(":").map(Number);
    
    // Create new Date objects for the start and end times
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
    
    setEvents(prev => [...prev, newEventWithDates]);
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

  // Find event for a specific time slot
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
      <Card>
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base md:text-lg font-medium">
              Cronograma semanal
            </CardTitle>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 pt-0">
          <div className="overflow-x-auto">
            <div className="grid grid-cols-8 min-w-[700px]">
              {/* Time column */}
              <div className="col-span-1">
                <div className="h-10 flex items-center justify-center font-medium">Hora</div>
                {hours.map(hour => (
                  <div key={hour} className="h-20 flex items-center justify-center border-t border-border">
                    {hour}:00
                  </div>
                ))}
              </div>
              
              {/* Day columns */}
              {weekDays.map(day => (
                <div key={day.toString()} className="col-span-1">
                  <div className="h-10 flex items-center justify-center font-medium capitalize">
                    {format(day, "EEE", { locale: es })}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {format(day, "d")}
                    </span>
                  </div>
                  {hours.map(hour => (
                    <TimeSlot 
                      key={generateTimeSlotKey(day, hour)}
                      event={getEventForTimeSlot(day, hour)}
                      onClick={() => handleAddEvent(day, hour)}
                      onDelete={handleDeleteEvent}
                      getFolderName={getFolderName}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between p-4 pt-0">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSaveSchedule}>
            <Save className="h-4 w-4 mr-2" />
            Guardar cronograma
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
