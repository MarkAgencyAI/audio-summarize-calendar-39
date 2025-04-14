
import React, { useState, useEffect } from "react";
import { format, addDays, startOfWeek, setHours, setMinutes, addMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarEvent } from "@/components/Calendar";
import { useRecordings } from "@/context/RecordingsContext";
import { TimeSlot } from "./TimeSlot";
import { WeeklyEventDialog } from "./WeeklyEventDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export type WeeklyEventWithTemp = Omit<CalendarEvent, "id"> & { tempId: string };

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
  const [scheduleEvents, setScheduleEvents] = useState<WeeklyEventWithTemp[]>([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [newEvent, setNewEvent] = useState<WeeklyEventWithTemp>({
    title: "",
    description: "",
    date: "",
    endDate: "",
    type: "class",
    tempId: "",
    folderId: ""
  });
  
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Generate time slots from 7:00 to 22:00
  const timeSlots = Array.from({ length: 16 }, (_, i) => {
    const hour = i + 7;
    return `${hour.toString().padStart(2, '0')}:00`;
  });
  
  useEffect(() => {
    const storedSchedule = localStorage.getItem('weeklySchedule');
    if (storedSchedule) {
      try {
        const parsedSchedule = JSON.parse(storedSchedule) as WeeklyEventWithTemp[];
        setScheduleEvents(parsedSchedule);
      } catch (e) {
        console.error("Error parsing stored schedule:", e);
      }
    } else if (hasExistingSchedule) {
      const scheduleItems = existingEvents.filter(event => 
        event.type === "class" && event.repeat && typeof event.repeat === 'object' && event.repeat.frequency === "weekly"
      );
      
      const uniqueByDayAndTime: Record<string, CalendarEvent> = {};
      
      scheduleItems.forEach(event => {
        try {
          const eventDate = new Date(event.date);
          if (isValid(eventDate)) {
            const dayOfWeek = eventDate.getDay();
            const timeKey = format(eventDate, "HH:mm");
            const key = `${dayOfWeek}-${timeKey}`;
            
            if (!uniqueByDayAndTime[key]) {
              uniqueByDayAndTime[key] = event;
            }
          }
        } catch (e) {
          console.error("Invalid event date:", event.date);
        }
      });
      
      const loadedEvents = Object.values(uniqueByDayAndTime).map(event => {
        try {
          const eventDate = new Date(event.date);
          let eventEnd;
          let endDateStr;
          
          if (isValid(eventDate)) {
            eventEnd = event.endDate ? new Date(event.endDate) : addMinutes(eventDate, 60);
            endDateStr = isValid(eventEnd) ? format(eventEnd, "yyyy-MM-dd'T'HH:mm") : "";
          } else {
            endDateStr = "";
          }
          
          return {
            title: event.title,
            description: event.description || "",
            date: event.date,
            endDate: event.endDate || endDateStr,
            folderId: event.folderId || "",
            type: event.type,
            tempId: crypto.randomUUID()
          };
        } catch (e) {
          console.error("Error formatting event:", e);
          return {
            title: event.title,
            description: event.description || "",
            date: event.date,
            endDate: event.endDate || "",
            folderId: event.folderId || "",
            type: event.type,
            tempId: crypto.randomUUID()
          };
        }
      });
      
      setScheduleEvents(loadedEvents);
    }
  }, [hasExistingSchedule, existingEvents]);
  
  useEffect(() => {
    if (scheduleEvents.length > 0) {
      localStorage.setItem('weeklySchedule', JSON.stringify(scheduleEvents));
    }
  }, [scheduleEvents]);
  
  const handleAddTimeSlot = (dayIndex: number, time: string) => {
    const selectedDate = weekDays[dayIndex];
    const [hours, minutes] = time.split(":").map(Number);
    
    const startTime = setMinutes(setHours(selectedDate, hours), minutes);
    const endTime = addMinutes(startTime, 60);
    
    setSelectedDay(dayIndex);
    setSelectedTime(time);
    
    setNewEvent({
      title: "",
      description: "",
      date: format(startTime, "HH:mm"),
      endDate: format(endTime, "HH:mm"),
      folderId: "",
      type: "class",
      tempId: crypto.randomUUID()
    });
    
    setShowEventDialog(true);
  };

  const handleSaveEvent = (updatedEvent: WeeklyEventWithTemp) => {
    const day = weekDays[selectedDay];
    const [startHours, startMinutes] = updatedEvent.date.split(":").map(Number);
    const [endHours, endMinutes] = updatedEvent.endDate.split(":").map(Number);
    
    const startDateTime = setMinutes(setHours(day, startHours), startMinutes);
    const endDateTime = setMinutes(setHours(day, endHours), endMinutes);
    
    const finalEvent: WeeklyEventWithTemp = {
      ...updatedEvent,
      date: format(startDateTime, "yyyy-MM-dd'T'HH:mm"),
      endDate: format(endDateTime, "yyyy-MM-dd'T'HH:mm"),
      repeat: {
        frequency: "weekly" as "weekly",
        interval: 1
      }
    };
    
    setScheduleEvents(prev => [...prev, finalEvent]);
    setShowEventDialog(false);
    toast.success("Evento agregado al cronograma");
  };
  
  const handleDeleteEvent = (tempId: string) => {
    setScheduleEvents(prev => prev.filter(event => event.tempId !== tempId));
    toast.success("Evento eliminado del cronograma");
  };
  
  const handleSaveSchedule = () => {
    const calendarEvents = scheduleEvents.map(({ tempId, ...event }) => ({
      ...event,
      type: event.type || "class"
    }));
    onSave(calendarEvents);
    toast.success("Cronograma guardado correctamente");
  };
  
  const getEventAtTimeSlot = (dayIndex: number, time: string) => {
    const day = weekDays[dayIndex];
    const [hours, minutes] = time.split(":").map(Number);
    const slotTime = setMinutes(setHours(day, hours), minutes);
    
    return scheduleEvents.find(event => {
      try {
        const eventStart = new Date(event.date);
        
        if (!isValid(eventStart)) return false;
        
        const eventEnd = event.endDate && isValid(new Date(event.endDate)) 
          ? new Date(event.endDate) 
          : addMinutes(eventStart, 60);
        
        const slotStart = slotTime;
        const slotEnd = addMinutes(slotTime, 59);
        
        return (
          eventStart <= slotEnd && eventEnd > slotStart &&
          eventStart.getDay() === day.getDay()
        );
      } catch (e) {
        console.error("Error comparing event dates:", e);
        return false;
      }
    });
  };
  
  const getFolderName = (folderId: string) => {
    if (!folderId) return "";
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : "";
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
          <h2 className="text-xl font-semibold text-[#005c5f] dark:text-white">
            Cronograma Semanal
          </h2>
        </div>
        
        <Button onClick={handleSaveSchedule}>
          Guardar Cronograma
        </Button>
      </div>
      
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="weekly-schedule-grid">
          {/* Header with day names */}
          <div className="weekly-schedule-header">
            <div className="weekly-time-column"></div>
            {weekDays.map((day, index) => (
              <div key={index} className="weekly-day-column">
                <div className="text-center font-medium py-2">
                  {format(day, "EEE", { locale: es })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Time slots grid */}
          <div className="weekly-schedule-body">
            {timeSlots.map((time, timeIndex) => (
              <div key={timeIndex} className="weekly-time-row">
                <div className="weekly-time-label">
                  {time}
                </div>
                
                {weekDays.map((_, dayIndex) => (
                  <TimeSlot
                    key={dayIndex}
                    event={getEventAtTimeSlot(dayIndex, time)}
                    onClick={() => handleAddTimeSlot(dayIndex, time)}
                    onDelete={handleDeleteEvent}
                    getFolderName={getFolderName}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
      
      {showEventDialog && (
        <WeeklyEventDialog
          open={showEventDialog}
          onOpenChange={setShowEventDialog}
          event={newEvent}
          onSave={handleSaveEvent}
          folders={folders}
        />
      )}
      
      <style>
        {`
        .weekly-schedule-grid {
          display: grid;
          grid-template-rows: auto 1fr;
          min-width: 800px;
        }
        
        .weekly-schedule-header {
          display: grid;
          grid-template-columns: 80px repeat(7, 1fr);
          border-bottom: 1px solid var(--border);
        }
        
        .weekly-schedule-body {
          display: grid;
          grid-template-rows: repeat(${timeSlots.length}, 80px);
        }
        
        .weekly-time-row {
          display: grid;
          grid-template-columns: 80px repeat(7, 1fr);
          border-bottom: 1px solid var(--border-light, rgba(0,0,0,0.1));
        }
        
        .weekly-time-label {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 8px;
          font-size: 0.875rem;
          color: var(--muted-foreground);
        }

        .dark .weekly-time-slot {
          border-left: 1px solid hsl(215, 27.9%, 16.9%);
          border-right: 1px solid hsl(215, 27.9%, 16.9%);
        }

        .dark .weekly-time-row {
          border-bottom: 1px solid hsl(215, 27.9%, 16.9%);
        }

        .dark .weekly-schedule-header {
          border-bottom: 1px solid hsl(215, 27.9%, 16.9%);
        }
        `}
      </style>
    </div>
  );
}

function isValid(date: Date): boolean {
  return !isNaN(date.getTime());
}
