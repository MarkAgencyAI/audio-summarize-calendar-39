
import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { eventTypeColors } from "@/components/Calendar";
import { WeeklyEventWithTemp } from "./WeeklyScheduleGrid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Trash2 } from "lucide-react";

interface DailyScheduleCardProps {
  day: Date;
  events: WeeklyEventWithTemp[];
  onDayClick: () => void;
  onDeleteEvent: (tempId: string) => void;
  getFolderName: (folderId: string) => string;
}

export function DailyScheduleCard({ 
  day, 
  events, 
  onDayClick,
  onDeleteEvent,
  getFolderName
}: DailyScheduleCardProps) {
  const dayEvents = events.filter(event => {
    try {
      const eventDate = new Date(event.date);
      if (isNaN(eventDate.getTime())) return false;
      
      const eventDay = format(eventDate, "EEEE", { locale: es }).toLowerCase();
      const currentDay = format(day, "EEEE", { locale: es }).toLowerCase();
      
      return eventDay === currentDay;
    } catch (e) {
      return false;
    }
  }).sort((a, b) => {
    const timeA = new Date(a.date).getHours();
    const timeB = new Date(b.date).getHours();
    return timeA - timeB;
  });
  
  return (
    <Card className="overflow-hidden h-full">
      <div className="p-3 border-b bg-muted/20">
        <h3 className="font-medium text-center capitalize">
          {format(day, "EEEE", { locale: es })}
        </h3>
      </div>
      <div className="p-2 space-y-2 h-[300px] overflow-auto">
        {dayEvents.length > 0 ? (
          dayEvents.map(event => {
            const startTime = format(new Date(event.date), "HH:mm");
            const endTime = format(new Date(event.endDate), "HH:mm");
            
            return (
              <div 
                key={event.tempId} 
                className="p-2 rounded-md text-xs relative"
                style={{ 
                  backgroundColor: `${eventTypeColors[event.type]}15`,
                  borderLeft: `2px solid ${eventTypeColors[event.type]}`,
                }}
              >
                <div className="flex justify-between">
                  <h4 className="font-medium" style={{ color: eventTypeColors[event.type] }}>
                    {event.title}
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 opacity-50 hover:opacity-100 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteEvent(event.tempId);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center text-[10px] mt-1 text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{startTime} - {endTime}</span>
                </div>
                {event.folderId && (
                  <p className="text-[10px] mt-1 opacity-80">
                    {getFolderName(event.folderId)}
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            No hay eventos
          </div>
        )}
      </div>
      <div className="p-2 border-t">
        <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={onDayClick}>
          <span>Ver detalle</span>
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </Card>
  );
}

// Helper function to check date validity
function isValid(date: Date): boolean {
  return !isNaN(date.getTime());
}
