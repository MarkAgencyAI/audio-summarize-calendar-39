
import { useState } from "react";
import { format, addHours, startOfDay, isSameHour, parseISO, isWithinInterval, addMinutes, differenceInMinutes, isBefore, isAfter, setMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarEvent, eventTypeColors } from "@/components/Calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

interface DailyViewProps {
  date: Date;
  events: CalendarEvent[];
  onBack: () => void;
  onTimeSelect: (time: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  activeFilter: string;
}

export function DailyView({
  date,
  events,
  onBack,
  onTimeSelect,
  onEventClick,
  onEditEvent,
  onDeleteEvent,
  activeFilter
}: DailyViewProps) {
  const isMobile = useIsMobile();
  
  // Filter events based on the active filter
  const filteredEvents = activeFilter === "all" 
    ? events
    : events.filter(event => event.type === activeFilter || (!event.type && activeFilter === "otro"));
  
  const dayEvents = filteredEvents.filter(event => 
    format(new Date(event.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
  );
  
  // Generate time slots from 7:00 AM to 9:00 PM
  const startTime = 7; // 7 AM
  const endTime = 21; // 9 PM
  
  const timeSlots = Array.from({ length: endTime - startTime + 1 }, (_, i) => {
    const slotTime = addHours(startOfDay(date), startTime + i);
    return { time: slotTime };
  });

  // Process events for proper positioning in time slots with collision detection
  const processedEvents = (() => {
    const events = dayEvents.map(event => {
      const eventStart = new Date(event.date);
      const eventEnd = event.endDate ? new Date(event.endDate) : addHours(eventStart, 1);
      
      // Calculate position relative to the timeline
      const hourHeight = 64; // height of each hour slot in pixels
      
      // Calculate start position (hours from startTime + minutes offset)
      const startHourOffset = eventStart.getHours() - startTime;
      const startMinuteOffset = eventStart.getMinutes() / 60;
      const topPosition = (startHourOffset + startMinuteOffset) * hourHeight;
      
      // Calculate height based on duration
      const durationInHours = differenceInMinutes(eventEnd, eventStart) / 60;
      const height = Math.max(durationInHours * hourHeight, 20); // minimum height of 20px
      
      // Get event color based on event type
      const eventColor = event.type 
        ? eventTypeColors[event.type] || "#6b7280" 
        : "#6b7280";
      
      return {
        ...event,
        topPosition,
        height,
        startTimeDate: eventStart, // Renamed to avoid type conflict
        endTimeDate: eventEnd, // Renamed to avoid type conflict
        color: eventColor,
        columnPosition: 0, // Will be set during collision detection
        columnSpan: 1, // Will be set during collision detection
        level: 0 // Initialize level for overlap detection
      };
    });

    // Sort events by start time
    events.sort((a, b) => a.startTimeDate.getTime() - b.startTimeDate.getTime());

    // Handle overlapping events
    const timeSlotMap: Record<number, Array<{
      event: typeof events[0];
      columnCount: number;
    }>> = {};

    // Group events by overlapping time
    events.forEach(event => {
      const startMinute = event.startTimeDate.getHours() * 60 + event.startTimeDate.getMinutes();
      const endMinute = event.endTimeDate.getHours() * 60 + event.endTimeDate.getMinutes();
      
      // Check all minutes between start and end to find overlaps
      for (let minute = startMinute; minute < endMinute; minute++) {
        if (!timeSlotMap[minute]) {
          timeSlotMap[minute] = [];
        }
        timeSlotMap[minute].push({ event, columnCount: 0 });
      }
    });

    // Assign column positions based on overlaps
    events.forEach(event => {
      const startMinute = event.startTimeDate.getHours() * 60 + event.startTimeDate.getMinutes();
      const endMinute = event.endTimeDate.getHours() * 60 + event.endTimeDate.getMinutes();
      
      // Find all events that overlap with this one
      const overlappingEvents = new Set<typeof events[0]>();
      
      for (let minute = startMinute; minute < endMinute; minute++) {
        if (timeSlotMap[minute]) {
          timeSlotMap[minute].forEach(item => {
            if (item.event.id !== event.id) {
              overlappingEvents.add(item.event);
            }
          });
        }
      }
      
      // Find the first available column
      let column = 0;
      const usedColumns = new Set<number>();
      
      overlappingEvents.forEach(otherEvent => {
        if (otherEvent.columnPosition >= 0) {
          usedColumns.add(otherEvent.columnPosition);
        }
      });
      
      while (usedColumns.has(column)) {
        column++;
      }
      
      event.columnPosition = column;
      
      // Update max column count for all minutes this event spans
      for (let minute = startMinute; minute < endMinute; minute++) {
        if (timeSlotMap[minute]) {
          const columnCount = Math.max(...Array.from(timeSlotMap[minute].map(e => e.event.columnPosition))) + 1;
          timeSlotMap[minute].forEach(item => {
            item.columnCount = Math.max(item.columnCount, columnCount);
          });
        }
      }
    });

    // Set column spans for each event
    events.forEach(event => {
      const startMinute = event.startTimeDate.getHours() * 60 + event.startTimeDate.getMinutes();
      const endMinute = event.endTimeDate.getHours() * 60 + event.endTimeDate.getMinutes();
      
      let maxColumns = 1;
      for (let minute = startMinute; minute < endMinute; minute++) {
        if (timeSlotMap[minute]) {
          maxColumns = Math.max(maxColumns, Math.max(...timeSlotMap[minute].map(e => e.columnCount)));
        }
      }
      
      event.columnSpan = maxColumns;
    });

    return events;
  })();

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
          
          {/* Render events as absolute positioned elements with improved overlap handling */}
          <div className="absolute left-0 right-0 top-0 bottom-0 pointer-events-none">
            {processedEvents.map(event => {
              // Calculate width based on column position and span
              const totalColumns = event.columnSpan; 
              const columnWidth = 100 / totalColumns;
              const leftPosition = 20 + (event.columnPosition * columnWidth);
              const width = columnWidth;
              
              return (
                <div 
                  key={event.id}
                  className="absolute p-2 rounded-md cursor-pointer hover:brightness-95 transition-all overflow-hidden pointer-events-auto"
                  style={{ 
                    top: `${event.topPosition}px`,
                    height: `${event.height}px`,
                    left: `${leftPosition}%`,
                    width: `${width}%`,
                    backgroundColor: `${event.color}20`,
                    color: event.color,
                    borderLeft: `3px solid ${event.color}`,
                    zIndex: 10
                  }}
                  onClick={() => onEventClick(event)}
                >
                  <div className="flex items-center gap-1">
                    {event.repeat && typeof event.repeat === 'object' && (
                      <RotateCcw className="h-3 w-3 flex-shrink-0" />
                    )}
                    <p className="font-medium truncate">{event.title}</p>
                  </div>
                  <p className="text-xs truncate">
                    {format(event.startTimeDate, "HH:mm")} - {format(event.endTimeDate, "HH:mm")}
                  </p>
                  {event.description && event.height > 80 && (
                    <p className="text-xs mt-1 line-clamp-2">{event.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
