
import React, { useState } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WeeklyEventWithTemp } from "./WeeklyScheduleGrid";
import { MobileTimeSlot } from "./MobileTimeSlot";
import { WeeklyEventDialog } from "./WeeklyEventDialog";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Folder } from "@/context/RecordingsContext";

interface DailyViewProps {
  initialDate: Date;
  events: WeeklyEventWithTemp[];
  onAddEvent: (event: WeeklyEventWithTemp) => void;
  onDeleteEvent: (tempId: string) => void;
  folders: Folder[];
  onBack: () => void;
}

export function DailyView({ 
  initialDate, 
  events, 
  onAddEvent, 
  onDeleteEvent, 
  folders,
  onBack 
}: DailyViewProps) {
  const weekStart = startOfWeek(initialDate, { weekStartsOn: 1 });
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  
  // Generate hours from 7am to 8pm
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);
  
  // Current day being viewed
  const currentDay = addDays(weekStart, currentDayIndex);
  const dayName = format(currentDay, "EEEE", { locale: es });
  
  const handlePrevDay = () => {
    setCurrentDayIndex(prev => (prev - 1 + 7) % 7);
  };

  const handleNextDay = () => {
    setCurrentDayIndex(prev => (prev + 1) % 7);
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

  const handleAddEvent = (hour: number) => {
    setSelectedHour(hour);
    
    const eventDate = new Date(currentDay);
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
      day: format(currentDay, "EEEE", { locale: es }).toLowerCase(),
      type: "class",
      folderId: "",
      tempId: uuidv4()
    });
    
    setShowDialog(true);
  };

  const handleSaveEvent = (event: WeeklyEventWithTemp & { day: string }) => {
    const { day, ...eventWithoutDay } = event;
    
    const [hours, minutes] = event.date.split(":").map(Number);
    const [endHours, endMinutes] = event.endDate.split(":").map(Number);
    
    const startDate = new Date(currentDay);
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(currentDay);
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
    
    onAddEvent(newEventWithDates);
    setShowDialog(false);
    toast.success("Evento agregado al cronograma");
  };

  const getFolderName = (folderId: string): string => {
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : "Sin materia";
  };

  const getEventForTimeSlot = (hour: number) => {
    const dayName = format(currentDay, "EEEE", { locale: es }).toLowerCase();
    
    return events.find(event => {
      try {
        const eventDate = new Date(event.date);
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
    <div className="space-y-4 w-full">
      <Card className="overflow-hidden border border-border w-full">
        <CardHeader className="p-3">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={onBack} className="h-8 px-2">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Semana
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevDay} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-base font-medium capitalize">
                {dayName}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleNextDay} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="w-16"></div> {/* Spacer for balance */}
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="flex flex-col">
            <div className="grid grid-cols-[80px_1fr] sticky top-0 z-10 bg-background border-b text-xs">
              <div className="h-10 flex items-center justify-center text-center font-medium text-muted-foreground">
                Hora
              </div>
              <div className="h-10 flex flex-col items-center justify-center text-xs border-l border-border">
                <span className="font-medium">Actividades</span>
              </div>
            </div>
            
            <ScrollArea className="h-[calc(100vh-260px)]">
              <div className="w-full">
                {hours.map(hour => (
                  <div key={hour} className="grid grid-cols-[80px_1fr]">
                    <div className="h-16 flex items-center justify-center text-xs text-muted-foreground border-b border-border">
                      {hour}:00
                    </div>
                    <div 
                      className="h-16 border-l border-b border-border p-0.5 cursor-pointer transition-colors hover:bg-accent/20 relative"
                      onClick={() => !getEventForTimeSlot(hour) && handleAddEvent(hour)}
                    >
                      {getEventForTimeSlot(hour) ? (
                        <MobileTimeSlot
                          event={getEventForTimeSlot(hour)}
                          onClick={() => {}}
                          onDelete={onDeleteEvent}
                          getFolderName={getFolderName}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full opacity-30 hover:opacity-100">
                          <PlusCircle className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
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

// Helper function to check date validity
function isValid(date: Date): boolean {
  return !isNaN(date.getTime());
}
