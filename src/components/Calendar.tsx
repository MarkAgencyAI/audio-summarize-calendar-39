
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Search
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRecordings } from '@/context/RecordingsContext';
import { DailyView } from '@/components/DailyView';
import { WeeklySchedule } from '@/components/WeeklySchedule';
import { v4 as uuidv4 } from 'uuid';
import { saveToStorage, loadFromStorage } from '@/lib/storage';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  type: 'exam' | 'assignment' | 'study' | 'class' | 'meeting' | 'other';
  completed?: boolean;
  folderId?: string;
  startTime?: string;
  endTime?: string;
  repeat?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    until?: string;
  };
}

export const eventTypeColors = {
  exam: 'bg-red-500',
  assignment: 'bg-blue-500',
  study: 'bg-green-500',
  class: 'bg-purple-500',
  meeting: 'bg-orange-500',
  other: 'bg-gray-500'
};

interface CalendarProps {
  initialDate?: Date;
}

export function Calendar({ initialDate = new Date() }: CalendarProps) {
  const { folders } = useRecordings();

  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [newEvent, setNewEvent] = useState<Omit<CalendarEvent, 'id'>>({
    title: '',
    description: '',
    date: format(selectedDate, 'yyyy-MM-dd'),
    type: 'other'
  });
  const [view, setView] = useState<'month' | 'day' | 'week'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [deleteAllRecurring, setDeleteAllRecurring] = useState(false);

  // Load events from storage
  useEffect(() => {
    const storedEvents = loadFromStorage<CalendarEvent[]>('calendarEvents') || [];
    setEvents(storedEvents);
  }, []);

  // Save events to storage
  useEffect(() => {
    if (events.length > 0) {
      saveToStorage('calendarEvents', events);
    }
  }, [events]);

  // Filter events based on search query
  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Events for the current month view
  const currentMonthEvents = filteredEvents.filter(event => {
    const eventDate = parseISO(event.date);
    return isSameMonth(eventDate, currentDate);
  });

  // Events for the selected day
  const selectedDayEvents = filteredEvents.filter(event => {
    const eventDate = parseISO(event.date);
    return isSameDay(eventDate, selectedDate);
  });

  const addEvent = (event: Omit<CalendarEvent, 'id'>) => {
    const newEventWithId = {
      ...event,
      id: uuidv4()
    };
    setEvents(prev => [...prev, newEventWithId]);
    setNewEvent({
      title: '',
      description: '',
      date: format(selectedDate, 'yyyy-MM-dd'),
      type: 'other'
    });
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEvents(prev => prev.map(e => e.id === event.id ? event : e));
  };

  const handleDeleteEvent = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    
    if (event && event.repeat && event.repeat.frequency) {
      setEventToDelete(event);
      setShowDeleteConfirmDialog(true);
    } else {
      deleteEvent(eventId);
    }
  };

  const confirmDelete = () => {
    if (!eventToDelete) return;

    if (deleteAllRecurring && eventToDelete.repeat && eventToDelete.repeat.frequency) {
      // Delete all recurring events with the same pattern
      const eventDate = eventToDelete.date;
      const eventTitle = eventToDelete.title;
      const eventType = eventToDelete.type;
      
      setEvents(prev => prev.filter(e => 
        !(e.title === eventTitle && e.type === eventType && 
          e.date.substring(0, 10) === eventDate.substring(0, 10) && 
          e.repeat && e.repeat.frequency === eventToDelete.repeat?.frequency)
      ));
    } else {
      // Delete just this event
      deleteEvent(eventToDelete.id);
    }
    
    setShowDeleteConfirmDialog(false);
    setEventToDelete(null);
    setDeleteAllRecurring(false);
  };

  const deleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (view === 'month') {
      setView('day');
    }
  };

  const renderMonthView = () => {
    const days = getDaysInMonth();
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-1 text-center">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-sm font-medium">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const dayEvents = currentMonthEvents.filter(event => 
              isSameDay(parseISO(event.date), day)
            );
            
            return (
              <Button
                key={day.toString()}
                variant="ghost"
                className={`h-16 flex flex-col items-center justify-start p-1 hover:bg-accent relative ${
                  isSameDay(day, new Date()) ? 'bg-secondary' : ''
                } ${
                  isSameDay(day, selectedDate) ? 'border-2 border-primary' : ''
                }`}
                onClick={() => handleDateClick(day)}
              >
                <span className="text-sm font-medium">
                  {format(day, 'd')}
                </span>
                <div className="mt-1 flex flex-wrap justify-center gap-1">
                  {dayEvents.slice(0, 3).map((event, index) => (
                    <div 
                      key={event.id} 
                      className={`w-2 h-2 rounded-full ${eventTypeColors[event.type]}`}
                      title={event.title}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-xs">+{dayEvents.length - 3}</span>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('month')}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Mes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('week')}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Semana
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('day')}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Día
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar eventos..."
              className="w-full rounded-md pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowEventDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo evento
          </Button>
        </div>
      </div>
      
      {view === 'month' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-bold capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h2>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {renderMonthView()}
          </CardContent>
        </Card>
      )}
      
      {view === 'week' && (
        <WeeklySchedule
          selectedDate={selectedDate}
          events={filteredEvents}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      )}
      
      {view === 'day' && (
        <DailyView
          date={selectedDate}
          events={selectedDayEvents}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      )}
      
      {/* New Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nuevo evento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                placeholder="Título del evento"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={newEvent.description || ''}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                placeholder="Descripción (opcional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                value={newEvent.type}
                onChange={(e) => setNewEvent({...newEvent, type: e.target.value as any})}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="exam">Examen</option>
                <option value="assignment">Tarea</option>
                <option value="study">Estudio</option>
                <option value="class">Clase</option>
                <option value="meeting">Reunión</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="folder">Materia</Label>
              <select
                id="folder"
                value={newEvent.folderId || ''}
                onChange={(e) => setNewEvent({...newEvent, folderId: e.target.value || undefined})}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Sin materia</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => {
                addEvent(newEvent);
                setShowEventDialog(false);
              }}
              disabled={!newEvent.title || !newEvent.date}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Eliminar evento</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>¿Estás seguro de que deseas eliminar este evento?</p>
            {eventToDelete?.repeat && eventToDelete.repeat.frequency && (
              <div className="mt-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="delete-all"
                    checked={deleteAllRecurring}
                    onChange={(e) => setDeleteAllRecurring(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="delete-all">
                    Eliminar todos los eventos recurrentes de esta serie
                  </Label>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteConfirmDialog(false);
              setEventToDelete(null);
              setDeleteAllRecurring(false);
            }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
