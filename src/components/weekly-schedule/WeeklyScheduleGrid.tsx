import React, { useState, useEffect } from "react";
import { format, addDays, startOfWeek, parseISO, isValid } from "date-fns";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MobileTimeSlot } from "./MobileTimeSlot";
import { DesktopTimeSlot } from "./DesktopTimeSlot";

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
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [events, setEvents] = useState<WeeklyEventWithTemp[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(date, { weekStartsOn: 1 }));
  const [showDialog, setShowDialog] = useState(false);

  // Generate week days from weekStart (Monday to Sunday)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Generate hours from 7am to 8pm
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  useEffect(() => {
    const savedEvents = loadFromStorage<WeeklyEventWithTemp[]>("weeklyScheduleEvents");
    
    if (savedEvents && savedEvents.length > 0) {
      setEvents(savedEvents);
    } else {
      const existingWeeklyEvents: WeeklyEventWithTemp[] = existingEvents
        .filter(event => {
          try {
            const eventDate = parseISO(event.date);
            const eventHour = eventDate.getHours();
            
            return isValid(eventDate) && 
                   eventHour >= 7 && 
                   eventHour <= 20 && 
                   event.repeat?.frequency === "weekly";
          } catch (e) {
            return false;
          }
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

  const handlePrevWeek = () => {
    setWeekStart(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setWeekStart(prev => addDays(prev, 7));
  };

  const handleAddEvent = (day: Date, hour: number) => {
    setSelectedDay(day);
    setSelectedHour(hour);
    
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
      try {
        const eventDate = parseISO(event.date);
        if (!isValid(eventDate)) return false;
        
        const eventHour = eventDate.getHours();
        const eventDay = format(eventDate, "EEEE", { locale: es }).toLowerCase();
        
        return eventDay === dayName && eventHour === hour;
      } catch (e) {
        return false;
      }
    });
  };

  return (
    <div className="space-y-4 w-full max-w-[100vw] px-2">
      <Card className="overflow-hidden border border-border w-full">
        <CardHeader className="p-2">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handlePrevWeek} className="h-7 w-7 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-sm font-medium">
              Cronograma semanal
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleNextWeek} className="h-7 w-7 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="flex flex-col">
            <div className="grid grid-cols-[50px_repeat(7,1fr)] sticky top-0 z-10 bg-background border-b text-xs">
              <div className="h-10 flex items-center justify-center text-center font-medium text-muted-foreground">
                Hora
              </div>
              {weekDays.map((day) => (
                <div 
                  key={day.toString()} 
                  className="h-10 flex flex-col items-center justify-center text-xs border-l border-border min-w-[40px]"
                >
                  <span className="font-medium capitalize">
                    {format(day, "E", { locale: es })}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(day, "d")}
                  </span>
                </div>
              ))}
            </div>
            
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="min-w-full">
                {hours.map(hour => (
                  <div key={hour} className="grid grid-cols-[50px_repeat(7,1fr)]">
                    <div className="h-14 flex items-center justify-center text-xs text-muted-foreground border-b border-border">
                      {hour}:00
                    </div>
                    {weekDays.map(day => (
                      <MobileTimeSlot
                        key={`${day.toString()}-${hour}`}
                        event={getEventForTimeSlot(day, hour)}
                        onClick={() => handleAddEvent(day, hour)}
                        onDelete={handleDeleteEvent}
                        getFolderName={getFolderName}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between p-2 border-t">
          <Button variant="outline" onClick={onCancel} size="sm" className="h-8">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSaveSchedule} size="sm" className="h-8">
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </CardFooter>
      </Card>
      
      <div className="fixed bottom-6 right-6">
        <Button 
          onClick={() => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentDay = weekDays.find(d => format(d, "EEEE", { locale: es }) === format(now, "EEEE", { locale: es })) || weekDays[0];
            handleAddEvent(currentDay, currentHour >= 7 && currentHour <= 20 ? currentHour : 8);
          }} 
          size="icon" 
          className="rounded-full h-12 w-12 shadow-lg"
        >
          <PlusCircle className="h-6 w-6" />
        </Button>
      </div>
      
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
