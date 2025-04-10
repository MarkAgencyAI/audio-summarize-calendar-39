
import { useState, useEffect } from "react";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, isSameDay, parseISO, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  RotateCcw
} from "lucide-react";
import { DailyView } from "@/components/DailyView";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklySchedule } from "@/components/WeeklySchedule";

// Define the interface for calendar events
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  folderId?: string;
  eventType?: string;
  repeat?: "none" | "daily" | "weekly" | "monthly";
}

// Define event type colors
export const eventTypeColors: Record<string, string> = {
  "Clase Especial": "#0ea5e9", // sky blue
  "Examen": "#f43f5e", // red
  "Entrega": "#f97316", // orange
  "Cronograma": "#8b5cf6", // violet
  "Actividad": "#10b981", // emerald
  "Cumpleaños": "#ec4899", // pink
  "Feriado": "#6366f1", // indigo
  "Evento Importante": "#ef4444", // red
  "otro": "#6b7280" // gray
};

interface CalendarProps {
  events: CalendarEvent[];
  onAddEvent: (event: Omit<CalendarEvent, "id">) => void;
  onDeleteEvent: (id: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export function Calendar({
  events,
  onAddEvent,
  onDeleteEvent,
  activeFilter,
  onFilterChange
}: CalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [displayMode, setDisplayMode] = useState<"month" | "day" | "schedule">("month");
  const [displayMonth, setDisplayMonth] = useState(new Date());
  
  const filteredEvents = activeFilter === "all" 
    ? events
    : activeFilter === "cronograma"
      ? events.filter(event => event.eventType === "Cronograma" && event.repeat === "weekly")
      : events.filter(event => event.eventType === activeFilter || (!event.eventType && activeFilter === "otro"));
  
  const eventsByDate = filteredEvents.reduce((acc, event) => {
    const dateStr = format(parseISO(event.date), "yyyy-MM-dd");
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);
  
  // Get all the dates in the current month
  const startDate = startOfMonth(displayMonth);
  const endDate = endOfMonth(displayMonth);
  
  const handlePrevMonth = () => {
    setDisplayMonth(subMonths(displayMonth, 1));
  };
  
  const handleNextMonth = () => {
    setDisplayMonth(addMonths(displayMonth, 1));
  };
  
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setDisplayMode("day");
  };
  
  const handleTimeSelect = (time: Date) => {
    handleShowAddEventDialog(time);
  };
  
  const handleShowAddEventDialog = (date: Date) => {
    const newEvent: Omit<CalendarEvent, "id"> = {
      title: "",
      description: "",
      date: format(date, "yyyy-MM-dd'T'HH:mm"),
      eventType: activeFilter !== "all" && activeFilter !== "cronograma" ? activeFilter : undefined
    };
    
    // Use prompt for quick add (could be replaced with a dialog in the future)
    const title = prompt("Título del evento");
    if (!title) return;
    
    newEvent.title = title;
    const description = prompt("Descripción (opcional)");
    if (description) {
      newEvent.description = description;
    }
    
    onAddEvent(newEvent);
  };
  
  const handleEventClick = (event: CalendarEvent) => {
    if (confirm(`¿Desea eliminar el evento "${event.title}"?`)) {
      onDeleteEvent(event.id);
    }
  };
  
  const handleBackToMonth = () => {
    setDisplayMode("month");
  };
  
  const hasExistingSchedule = filteredEvents.some(event => 
    event.eventType === "Cronograma" && event.repeat === "weekly"
  );
  
  const handleSaveSchedule = (scheduleEvents: Omit<CalendarEvent, "id">[]) => {
    scheduleEvents.forEach(event => {
      onAddEvent({
        ...event,
        eventType: "Cronograma",
        repeat: "weekly"
      });
    });
    
    setDisplayMode("month");
  };
  
  return (
    <div className="w-full">
      {displayMode === "month" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-6 w-6 text-custom-primary dark:text-custom-accent" />
              <h2 className="text-xl font-bold">
                {format(displayMonth, "MMMM yyyy", { locale: es })}
              </h2>
            </div>
            
            <div className="flex items-center space-x-2">
              <Tabs 
                value={activeFilter} 
                onValueChange={onFilterChange}
                className="hidden md:block"
              >
                <TabsList>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="Clase Especial">Clases</TabsTrigger>
                  <TabsTrigger value="Examen">Exámenes</TabsTrigger>
                  <TabsTrigger value="Entrega">Entregas</TabsTrigger>
                  <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {activeFilter === "cronograma" && (
            <div className="flex justify-end">
              <Button 
                onClick={() => setDisplayMode("schedule")}
                className="flex items-center gap-2"
              >
                {hasExistingSchedule ? (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Editar cronograma
                  </>
                ) : (
                  <>
                    Crear cronograma semanal
                  </>
                )}
              </Button>
            </div>
          )}
          
          <div className="grid grid-cols-7 gap-4 text-center">
            <div>Domingo</div>
            <div>Lunes</div>
            <div>Martes</div>
            <div>Miércoles</div>
            <div>Jueves</div>
            <div>Viernes</div>
            <div>Sábado</div>
          </div>
          
          <CalendarUI
            mode="multiple"
            selected={[]}
            onDayClick={handleDayClick}
            month={displayMonth}
            locale={es}
            className="rounded-md border border-muted shadow-sm"
            classNames={{
              day_selected: "bg-custom-primary text-primary-foreground hover:bg-custom-primary hover:text-primary-foreground focus:bg-custom-primary focus:text-primary-foreground dark:bg-custom-accent dark:text-primary-foreground",
              day_today: "bg-muted text-foreground",
            }}
            components={{
              Day: ({ day, displayMonth }) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate[dateStr] || [];
                const isCurrentMonth = day.getMonth() === displayMonth.getMonth();
                
                if (!isCurrentMonth) {
                  return <div className="p-2 opacity-30">{format(day, "d")}</div>;
                }
                
                return (
                  <div 
                    className="w-full h-full min-h-20 p-1 cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDayClick(day);
                    }}
                  >
                    <div className="text-right p-1">
                      {isSameDay(day, new Date()) ? (
                        <div className="h-6 w-6 rounded-full bg-custom-primary dark:bg-custom-accent text-white flex items-center justify-center mx-auto">
                          {format(day, "d")}
                        </div>
                      ) : (
                        <div className="font-medium">{format(day, "d")}</div>
                      )}
                    </div>
                    
                    <ScrollArea className="h-16 w-full">
                      <div className="space-y-1">
                        {dayEvents.map((event) => (
                          <div
                            key={event.id}
                            className="text-xs p-1 rounded truncate dark:text-black"
                            style={{ 
                              backgroundColor: `${eventTypeColors[event.eventType || "otro"]}30`,
                              borderLeft: `2px solid ${eventTypeColors[event.eventType || "otro"]}`,
                              color: eventTypeColors[event.eventType || "otro"]
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                          >
                            {event.title}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                );
              }
            }}
          />
          
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(eventTypeColors).map(([type, color]) => (
              <Badge 
                key={type}
                className="cursor-pointer"
                style={{ 
                  backgroundColor: `${color}20`, 
                  color: color,
                  borderColor: color,
                }}
                variant="outline"
                onClick={() => onFilterChange(type === "otro" ? "otro" : type)}
              >
                {type === "otro" ? "Otro" : type}
              </Badge>
            ))}
            <Badge 
              className="cursor-pointer"
              variant="outline"
              onClick={() => onFilterChange("all")}
            >
              Todos
            </Badge>
          </div>
        </div>
      )}
      
      {displayMode === "day" && (
        <DailyView 
          date={selectedDate}
          events={filteredEvents}
          onBack={handleBackToMonth}
          onTimeSelect={handleTimeSelect}
          onEventClick={handleEventClick}
          activeFilter={activeFilter}
        />
      )}
      
      {displayMode === "schedule" && (
        <WeeklySchedule 
          date={new Date()}
          onSave={handleSaveSchedule}
          onCancel={handleBackToMonth}
          hasExistingSchedule={hasExistingSchedule}
          existingEvents={filteredEvents}
        />
      )}
    </div>
  );
}
