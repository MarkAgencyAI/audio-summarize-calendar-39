
import React, { useState } from 'react';
import { Calendar as CalendarPrimitive } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { DailyView } from './DailyView';
import { WeeklySchedule } from './WeeklySchedule';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;  // Changed from Date to string for compatibility
  startTime?: string;
  endTime?: string;
  type: 'exam' | 'assignment' | 'study' | 'class' | 'meeting' | 'other';
  completed?: boolean;
  // Add the missing properties used in various components
  eventType?: string;
  repeat?: "none" | "daily" | "weekly" | "monthly";
  endDate?: string;
  folderId?: string;
}

export const eventTypeColors = {
  exam: '#ef4444',
  assignment: '#f97316',
  study: '#3b82f6', 
  class: '#10b981',
  meeting: '#8b5cf6',
  other: '#6b7280'
};

interface DayProps {
  date: Date;
  events: CalendarEvent[];
  onClick?: (date: Date) => void;
  day?: number; // Add the missing property
}

const Day: React.FC<DayProps> = ({ date, events, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(date);
    }
  };

  return (
    <div 
      className="p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
      onClick={handleClick}
    >
      <div className="text-center font-medium">{date.getDate()}</div>
      {events.length > 0 && (
        <div className="mt-1 space-y-1">
          {events.slice(0, 2).map((event) => (
            <div 
              key={event.id}
              className="text-xs truncate px-1 py-0.5 rounded-sm"
              style={{ backgroundColor: eventTypeColors[event.type] + '20', color: eventTypeColors[event.type] }}
            >
              {event.title}
            </div>
          ))}
          {events.length > 2 && (
            <div className="text-xs text-center text-gray-500">+{events.length - 2} más</div>
          )}
        </div>
      )}
    </div>
  );
};

interface CalendarProps {
  events: CalendarEvent[];
  onAddEvent?: () => void;
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
}

export const Calendar: React.FC<CalendarProps> = ({
  events,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  activeFilter = "all",
  onFilterChange
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [activeView, setActiveView] = useState<'month' | 'week' | 'day'>('month');

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setActiveView('day');
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const getDailyEvents = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getWeeklyEvents = () => {
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(selectedDate.getDate() - day);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= startOfWeek && eventDate <= endOfWeek;
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Calendario Académico</CardTitle>
          <Button onClick={onAddEvent} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Añadir evento
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'month' | 'week' | 'day')}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold">
                {formatDate(currentMonth, { month: 'long', year: 'numeric' })}
              </h3>
              <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <TabsList>
              <TabsTrigger value="month">Mes</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="day">Día</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="month" className="mt-2">
            <div className="grid grid-cols-7 gap-2">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="text-center font-medium text-sm py-1">
                  {day}
                </div>
              ))}
              {Array.from({ length: 35 }).map((_, i) => {
                const date = new Date(currentMonth);
                date.setDate(1);
                const firstDayOfMonth = date.getDay();
                date.setDate(i - firstDayOfMonth + 1);
                
                const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                const isToday = date.toDateString() === new Date().toDateString();
                
                if (!isCurrentMonth) {
                  return <div key={i} className="opacity-30">
                    <Day date={date} events={getDailyEvents(date)} onClick={handleDayClick} />
                  </div>;
                }
                
                return (
                  <div key={i} className={isToday ? 'ring-2 ring-primary rounded-md' : ''}>
                    <Day date={date} events={getDailyEvents(date)} onClick={handleDayClick} />
                  </div>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="week" className="mt-2">
            <WeeklySchedule 
              date={selectedDate}
              events={getWeeklyEvents()}
              onEdit={onEditEvent}
              onDelete={onDeleteEvent}
              onCancel={() => setActiveView('month')}
              hasExistingSchedule={true}
              existingEvents={events}
              onSave={() => {}}
            />
          </TabsContent>
          
          <TabsContent value="day" className="mt-2">
            <DailyView 
              date={selectedDate}
              events={getDailyEvents(selectedDate)}
              onBack={() => setActiveView('month')}
              onTimeSelect={() => {}}
              onEventClick={onEditEvent || (() => {})}
              activeFilter={activeFilter}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
