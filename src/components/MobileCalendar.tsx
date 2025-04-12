
import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CalendarEvent, eventTypeColors } from '@/components/Calendar';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileCalendarProps {
  initialDate?: Date;
  events?: CalendarEvent[];
  onAddEvent?: () => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
}

export function MobileCalendar({
  initialDate = new Date(),
  events = [],
  onAddEvent,
  onEventClick,
  onEditEvent,
  onDeleteEvent,
  activeFilter = 'all',
  onFilterChange
}: MobileCalendarProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [showDayView, setShowDayView] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const isMobile = useIsMobile();
  
  // Helper function to safely parse dates
  const safeParseISO = (dateString: string): Date | null => {
    try {
      if (!dateString) return null;
      const date = parseISO(dateString);
      return isValid(date) ? date : null;
    } catch (e) {
      console.error("Error parsing date:", dateString, e);
      return null;
    }
  };
  
  // Filter events based on search query
  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Events for the current month
  const currentMonthEvents = filteredEvents.filter(event => {
    const eventDate = safeParseISO(event.date);
    return eventDate ? isSameMonth(eventDate, currentDate) : false;
  });
  
  // Events for the selected day
  const selectedDayEvents = filteredEvents.filter(event => {
    const eventDate = safeParseISO(event.date);
    return eventDate ? isSameDay(eventDate, selectedDate) : false;
  }).sort((a, b) => {
    const dateA = safeParseISO(a.date);
    const dateB = safeParseISO(b.date);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });
  
  const filterTypes = [
    { id: 'all', label: 'Todos', color: '#6b7280' },
    { id: 'exam', label: 'Exámenes', color: eventTypeColors.exam },
    { id: 'assignment', label: 'Tareas', color: eventTypeColors.assignment },
    { id: 'study', label: 'Estudio', color: eventTypeColors.study },
    { id: 'class', label: 'Clases', color: eventTypeColors.class },
    { id: 'meeting', label: 'Reuniones', color: eventTypeColors.meeting },
    { id: 'other', label: 'Otros', color: eventTypeColors.other }
  ];
  
  const handlePrevMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowDayView(true);
  };
  
  const handleFilterChange = (filter: string) => {
    if (onFilterChange) {
      onFilterChange(filter);
    }
    setShowFilters(false);
  };
  
  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };
  
  // Safely format date with fallback
  const safeFormat = (date: Date | string | null, formatString: string, options = {}): string => {
    try {
      if (!date) return '';
      const dateObj = typeof date === 'string' ? safeParseISO(date) : date;
      if (!dateObj || !isValid(dateObj)) return '';
      return format(dateObj, formatString, options);
    } catch (e) {
      console.error("Error formatting date:", date, e);
      return '';
    }
  };
  
  const renderCalendarGrid = () => {
    const days = getDaysInMonth();
    const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-7 gap-1 text-center">
          {dayNames.map(day => (
            <div key={day} className="text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const dayEvents = currentMonthEvents.filter(event => {
              const eventDate = safeParseISO(event.date);
              return eventDate ? isSameDay(eventDate, day) : false;
            });
            
            return (
              <Button
                key={day.toString()}
                variant="ghost"
                className={`h-10 p-0 flex flex-col items-center justify-center hover:bg-accent relative ${
                  isSameDay(day, new Date()) ? 'bg-secondary/50' : ''
                } ${
                  isSameDay(day, selectedDate) ? 'border border-primary' : ''
                }`}
                onClick={() => handleDateClick(day)}
              >
                <span className="text-xs">{format(day, 'd')}</span>
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-0.5 flex space-x-0.5">
                    {dayEvents.length <= 3 ? (
                      dayEvents.slice(0, 3).map((event, idx) => (
                        <span 
                          key={idx} 
                          className="w-1 h-1 rounded-full"
                          style={{ backgroundColor: eventTypeColors[event.type] }}
                        />
                      ))
                    ) : (
                      <>
                        <span 
                          className="w-1 h-1 rounded-full"
                          style={{ backgroundColor: dayEvents[0].type ? eventTypeColors[dayEvents[0].type] : '#6b7280' }}
                        />
                        <span className="text-[8px] leading-none">+{dayEvents.length}</span>
                      </>
                    )}
                  </div>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowFilters(true)}
          >
            <Filter className="h-4 w-4" />
          </Button>
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar"
              className="h-8 w-24 pl-7 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <Card className="p-3">
        {renderCalendarGrid()}
      </Card>
      
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Próximos eventos</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onAddEvent}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <ScrollArea className="h-[calc(100vh-380px)]">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <CalendarIcon className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No hay eventos</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={onAddEvent}
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar evento
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents
                .filter(event => {
                  if (activeFilter === 'all') return true;
                  return event.type === activeFilter;
                })
                .sort((a, b) => {
                  const dateA = safeParseISO(a.date);
                  const dateB = safeParseISO(b.date);
                  if (!dateA || !dateB) return 0;
                  return dateA.getTime() - dateB.getTime();
                })
                .slice(0, 30)
                .map(event => (
                  <div 
                    key={event.id}
                    className="p-2 rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => onEventClick?.(event)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {safeFormat(event.date, 'PPP • HH:mm', { locale: es })}
                        </p>
                      </div>
                      <div 
                        className="w-3 h-3 rounded-full mt-1"
                        style={{ backgroundColor: eventTypeColors[event.type] }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </ScrollArea>
      </div>
      
      {/* Day View Sheet */}
      <Sheet open={showDayView} onOpenChange={setShowDayView}>
        <SheetContent side="bottom" className="h-[80vh] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-center">
              {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(80vh-64px)]">
            <div className="p-4">
              {selectedDayEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <CalendarIcon className="h-10 w-10 mb-2 opacity-50" />
                  <p>No hay eventos para este día</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={onAddEvent}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar evento
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map(event => (
                    <div 
                      key={event.id} 
                      className="p-3 rounded-md cursor-pointer transition-colors"
                      style={{ 
                        backgroundColor: `${eventTypeColors[event.type]}10`,
                        borderLeft: `3px solid ${eventTypeColors[event.type]}`
                      }}
                      onClick={() => onEventClick?.(event)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {safeFormat(event.date, 'HH:mm', { locale: es })}
                            {event.endDate && safeFormat(event.endDate, ' - HH:mm')}
                          </p>
                          {event.description && (
                            <p className="mt-1 text-sm">{event.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditEvent?.(event);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteEvent?.(event.id);
                            }}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      
      {/* Filter Sheet */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side="right" className="w-[250px]">
          <SheetHeader className="mb-4">
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-2">
            {filterTypes.map(filter => (
              <Button
                key={filter.id}
                variant={activeFilter === filter.id ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => handleFilterChange(filter.id)}
              >
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: filter.color }}
                />
                {filter.label}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
