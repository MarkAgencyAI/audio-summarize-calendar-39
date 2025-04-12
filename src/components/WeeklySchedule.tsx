
import { useState, useEffect } from "react";
import { format, addDays, startOfWeek, setHours, setMinutes, addMinutes, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarEvent, eventTypeColors } from "@/components/Calendar";
import { useRecordings } from "@/context/RecordingsContext";

interface WeeklyScheduleProps {
  date: Date;
  events: CalendarEvent[];
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  onCancel: () => void;
  hasExistingSchedule: boolean;
  existingEvents: CalendarEvent[];
  onSave: (events: Omit<CalendarEvent, "id">[]) => void;
  onAddEvent?: () => void;
}

type WeeklyEventWithTemp = Omit<CalendarEvent, "id"> & { tempId: string };

export function WeeklySchedule({
  date,
  onSave,
  onCancel,
  hasExistingSchedule,
  existingEvents,
  onEdit,
  onDelete,
  events,
  onAddEvent
}: WeeklyScheduleProps) {
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
    type: "class", // Set default type
    tempId: "",
    folderId: ""
  });
  
  // Days of the week - start from Monday (1) instead of Sunday (0)
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Time slots from 7:00 AM to 9:00 PM
  const timeSlots = Array.from({ length: 15 }, (_, i) => {
    const hour = i + 7;
    return format(setHours(date, hour), "HH:mm");
  });
  
  // Load existing schedule if available
  useEffect(() => {
    if (hasExistingSchedule) {
      const scheduleItems = existingEvents.filter(event => 
        event.type === "class" && event.repeat && typeof event.repeat === 'object' && event.repeat.frequency === "weekly"
      );
      
      // Group by day of week to avoid duplicates
      const uniqueByDayAndTime: Record<string, CalendarEvent> = {};
      
      scheduleItems.forEach(event => {
        try {
          const eventDate = new Date(event.date);
          // Check if the date is valid before proceeding
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
      
      // Convert to array format needed for the schedule
      const loadedEvents = Object.values(uniqueByDayAndTime).map(event => {
        try {
          const eventDate = new Date(event.date);
          let eventEnd;
          let endDateStr;
          
          // Check if the date is valid before proceeding
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
  
  const handleAddTimeSlot = (dayIndex: number, time: string) => {
    if (onAddEvent) {
      // If we have an external event handler, use it instead
      onAddEvent();
      return;
    }
    
    const selectedDate = weekDays[dayIndex];
    const [hours, minutes] = time.split(":").map(Number);
    
    const startTime = setMinutes(setHours(selectedDate, hours), minutes);
    const endTime = addMinutes(startTime, 60);
    
    setSelectedDay(dayIndex);
    setSelectedTime(time);
    setNewEvent({
      title: "",
      description: "",
      date: format(startTime, "yyyy-MM-dd'T'HH:mm"),
      endDate: format(endTime, "yyyy-MM-dd'T'HH:mm"),
      folderId: "",
      type: "class", // Default type
      tempId: crypto.randomUUID()
    });
    
    setShowEventDialog(true);
  };
  
  const handleSaveEvent = () => {
    if (!newEvent.title.trim()) {
      return;
    }
    
    setScheduleEvents(prev => [...prev, newEvent]);
    setShowEventDialog(false);
  };
  
  const handleDeleteEvent = (tempId: string) => {
    setScheduleEvents(prev => prev.filter(event => event.tempId !== tempId));
  };
  
  const handleSaveSchedule = () => {
    // Convert schedule events to calendar events
    const calendarEvents = scheduleEvents.map(({ tempId, ...event }) => ({
      ...event,
      type: event.type || "class" // Ensure type is set
    }));
    onSave(calendarEvents);
  };
  
  // Safe format function to handle potential invalid dates
  const safeFormat = (dateStr: string | undefined, formatStr: string): string => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (!isValid(date)) return "";
      return format(date, formatStr);
    } catch (e) {
      console.error("Error formatting date:", e);
      return "";
    }
  };
  
  const getEventAtTimeSlot = (dayIndex: number, time: string) => {
    const day = weekDays[dayIndex];
    const [hours, minutes] = time.split(":").map(Number);
    const slotTime = setMinutes(setHours(day, hours), minutes);
    
    return scheduleEvents.find(event => {
      try {
        const eventStart = new Date(event.date);
        
        // Skip invalid dates
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
          {/* Header row with day names */}
          <div className="weekly-schedule-header">
            <div className="weekly-time-column"></div>
            {weekDays.map((day, index) => (
              <div key={index} className="weekly-day-column">
                <div className="text-center font-medium py-2">
                  {format(day, "EEE", { locale: es })}
                  <div className="text-sm text-muted-foreground">
                    {format(day, "d MMM", { locale: es })}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Time slots */}
          <div className="weekly-schedule-body">
            {timeSlots.map((time, timeIndex) => (
              <div key={timeIndex} className="weekly-time-row">
                <div className="weekly-time-label">
                  {time}
                </div>
                
                {weekDays.map((_, dayIndex) => {
                  const event = getEventAtTimeSlot(dayIndex, time);
                  
                  return (
                    <div 
                      key={dayIndex} 
                      className="weekly-time-slot"
                      onClick={() => !event && handleAddTimeSlot(dayIndex, time)}
                    >
                      {event ? (
                        <div 
                          className="weekly-event"
                          style={{ 
                            backgroundColor: `${eventTypeColors[event.title.includes("Clase") ? "class" : "meeting"]}20`,
                            borderLeft: `3px solid ${eventTypeColors[event.title.includes("Clase") ? "class" : "meeting"]}`,
                            color: eventTypeColors[event.title.includes("Clase") ? "class" : "meeting"]
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{event.title}</p>
                              {event.folderId && (
                                <p className="text-xs opacity-80">{getFolderName(event.folderId)}</p>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 opacity-50 hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvent(event.tempId);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="weekly-add-slot">
                          <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
      
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Agregar evento al cronograma</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input 
                id="title" 
                value={newEvent.title} 
                onChange={e => setNewEvent({
                  ...newEvent,
                  title: e.target.value
                })} 
                placeholder="Ej: Clase de Matemáticas"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="folder">Materia</Label>
              <Select
                value={newEvent.folderId || "_empty"}
                onValueChange={(value) => setNewEvent({
                  ...newEvent,
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
                value={newEvent.description} 
                onChange={e => setNewEvent({
                  ...newEvent,
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
                  value={safeFormat(newEvent.date, "HH:mm")} 
                  onChange={e => {
                    const [hours, minutes] = e.target.value.split(":").map(Number);
                    const day = weekDays[selectedDay];
                    const newDate = setMinutes(setHours(day, hours), minutes);
                    setNewEvent({
                      ...newEvent,
                      date: format(newDate, "yyyy-MM-dd'T'HH:mm")
                    });
                  }} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endTime">Hora de finalización</Label>
                <Input 
                  id="endTime" 
                  type="time" 
                  value={safeFormat(newEvent.endDate, "HH:mm")} 
                  onChange={e => {
                    const [hours, minutes] = e.target.value.split(":").map(Number);
                    const day = weekDays[selectedDay];
                    const newDate = setMinutes(setHours(day, hours), minutes);
                    setNewEvent({
                      ...newEvent,
                      endDate: format(newDate, "yyyy-MM-dd'T'HH:mm")
                    });
                  }} 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEvent}>
              Agregar al cronograma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
        
        .weekly-time-slot {
          border-left: 1px solid var(--border-light, rgba(0,0,0,0.1));
          padding: 4px;
          cursor: pointer;
          min-height: 80px;
        }
        
        .weekly-time-slot:hover {
          background-color: var(--accent-light, rgba(0,0,0,0.05));
        }
        
        .weekly-event {
          height: 100%;
          padding: 8px;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .weekly-add-slot {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        `}
      </style>
    </div>
  );
}
