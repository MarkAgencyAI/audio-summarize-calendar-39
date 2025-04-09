
import { useState } from "react";
import { format, addHours, startOfDay, isSameHour, parseISO, isWithinInterval, addMinutes, differenceInMinutes, isBefore, isAfter, setMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "@/components/Calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

interface DailyViewProps {
  date: Date;
  events: CalendarEvent[];
  onBack: () => void;
  onTimeSelect: (time: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  activeFilter: string;
}

export function DailyView({
  date,
  events,
  onBack,
  onTimeSelect,
  onEventClick,
  activeFilter
}: DailyViewProps) {
  const isMobile = useIsMobile();
  
  // Filter events based on the active filter
  const filteredEvents = activeFilter === "all" 
    ? events
    : events.filter(event => event.eventType === activeFilter || (!event.eventType && activeFilter === "otro"));
  
  const dayEvents = filteredEvents.filter(event => 
    format(parseISO(event.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
  );
  
  // Generate time slots from 7:00 AM to 9:00 PM
  const startTime = 7; // 7 AM
  const endTime = 21; // 9 PM
  
  const timeSlots = Array.from({ length: endTime - startTime + 1 }, (_, i) => {
    const slotTime = addHours(startOfDay(date), startTime + i);
    return { time: slotTime };
  });

  // Process events for proper positioning in time slots
  const processedEvents = dayEvents.map(event => {
    const eventStart = parseISO(event.date);
    const eventEnd = event.endDate ? parseISO(event.endDate) : addHours(eventStart, 1);
    
    // Calculate position relative to the timeline
    const hourHeight = 64; // height of each hour slot in pixels
    
    // Calculate start position (hours from startTime + minutes offset)
    const startHourOffset = eventStart.getHours() - startTime;
    const startMinuteOffset = eventStart.getMinutes() / 60;
    const topPosition = (startHourOffset + startMinuteOffset) * hourHeight;
    
    // Calculate height based on duration
    const durationInHours = differenceInMinutes(eventEnd, eventStart) / 60;
    const height = Math.max(durationInHours * hourHeight, 20); // minimum height of 20px
    
    return {
      ...event,
      topPosition,
      height,
      startTime: eventStart,
      endTime: eventEnd
    };
  });

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
          <h2 className="text-xl font-semibold text-[#005c5f] dark:text-white">
            {format(date, "EEEE d 'de' MMMM", { locale: es })}
          </h2>
        </div>
      </div>
      
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-0 relative">
          {timeSlots.map((slot, index) => (
            <div 
              key={index}
              className="flex items-start border-t border-primary/20 pl-2 py-2 group hover:bg-primary/5 rounded-r-md"
              style={{ height: '64px' }}
            >
              <div className="w-16 flex-shrink-0 text-sm text-muted-foreground">
                {format(slot.time, "HH:mm")}
              </div>
              
              <div className="flex-1 h-full relative">
                <div 
                  className="w-full h-full cursor-pointer flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onTimeSelect(slot.time)}
                >
                  <Button variant="ghost" size="sm" className="h-6">
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar evento
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Render events as absolute positioned elements */}
          <div className="absolute left-0 right-0 top-0 bottom-0 pointer-events-none">
            {processedEvents.map(event => (
              <div 
                key={event.id}
                className="absolute left-20 right-4 bg-primary/10 text-primary p-2 rounded-md cursor-pointer hover:bg-primary/20 transition-colors overflow-hidden pointer-events-auto"
                style={{ 
                  top: `${event.topPosition}px`,
                  height: `${event.height}px`,
                  zIndex: 10
                }}
                onClick={() => onEventClick(event)}
              >
                <p className="font-medium truncate">{event.title}</p>
                <p className="text-xs truncate">
                  {format(event.startTime, "HH:mm")} - {format(event.endTime, "HH:mm")}
                </p>
                {event.description && event.height > 80 && (
                  <p className="text-xs mt-1 line-clamp-2">{event.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
