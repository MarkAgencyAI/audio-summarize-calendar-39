import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, List, LayoutGrid } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, addHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRecordings } from '@/context/RecordingsContext';
import { DailyView } from '@/components/DailyView';
import { WeeklySchedule } from '@/components/WeeklySchedule';
import { v4 as uuidv4 } from 'uuid';
import { saveToStorage, loadFromStorage } from '@/lib/storage';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

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

export const eventTypeColors: Record<string, string> = {
  exam: '#ef4444',
  assignment: '#3b82f6',
  study: '#22c55e',
  class: '#a855f7',
  meeting: '#f97316',
  other: '#6b7280'
};

interface CalendarProps {
  initialDate?: Date;
  events?: CalendarEvent[];
  onAddEvent?: () => void;
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
}

export function Calendar({
  initialDate = new Date(),
  events: externalEvents,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  activeFilter: externalActiveFilter,
  onFilterChange
}: CalendarProps) {
  const {
    folders
  } = useRecordings();
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [newEvent, setNewEvent] = useState<Omit<CalendarEvent, 'id'>>({
    title: '',
    description: '',
    date: format(selectedDate, 'yyyy-MM-dd\'T\'HH:mm'),
    endDate: format(addHours(selectedDate, 1), 'yyyy-MM-dd\'T\'HH:mm'),
    type: 'other',
    folderId: ''
  });
  const [view, setView] = useState<'month' | 'day' | 'week'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [deleteAllRecurring, setDeleteAllRecurring] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [repeatOption, setRepeatOption] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');

  useEffect(() => {
    if (externalEvents) {
      setEvents(externalEvents);
    } else {
      const storedEvents = loadFromStorage<CalendarEvent[]>('calendarEvents') || [];
      setEvents(storedEvents);
    }
  }, [externalEvents]);

  useEffect(() => {
    if (externalActiveFilter) {
      setActiveFilter(externalActiveFilter);
    }
  }, [externalActiveFilter]);

  useEffect(() => {
    if (!externalEvents && events.length > 0) {
      saveToStorage('calendarEvents', events);
    }
  }, [events, externalEvents]);

  const filteredEvents = events.filter(event => event.title.toLowerCase().includes(searchQuery.toLowerCase()) || event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));

  const currentMonthEvents = filteredEvents.filter(event => {
    const eventDate = parseISO(event.date);
    return isSameMonth(eventDate, currentDate);
  });

  const selectedDayEvents = filteredEvents.filter(event => {
    const eventDate = parseISO(event.date);
    return isSameDay(eventDate, selectedDate);
  });

  const openNewEventDialog = (date?: Date) => {
    setEventToEdit(null);
    setRepeatOption('none');
    setNewEvent({
      title: '',
      description: '',
      date: format(date || selectedDate, 'yyyy-MM-dd\'T\'HH:mm'),
      endDate: format(addHours(date || selectedDate, 1), 'yyyy-MM-dd\'T\'HH:mm'),
      type: 'other',
      folderId: ''
    });
    setShowEventDialog(true);
  };

  const openEditEventDialog = (event: CalendarEvent) => {
    setEventToEdit(event);
    setRepeatOption(event.repeat?.frequency || 'none');
    setNewEvent({
      title: event.title,
      description: event.description || '',
      date: event.date,
      endDate: event.endDate || format(addHours(new Date(event.date), 1), 'yyyy-MM-dd\'T\'HH:mm'),
      type: event.type,
      folderId: event.folderId || '',
      repeat: event.repeat
    });
    setShowEventDialog(true);
  };

  const addEvent = (event: Omit<CalendarEvent, 'id'>) => {
    const newEventWithId = {
      ...event,
      id: uuidv4()
    };
    if (onAddEvent && onEditEvent) {
      onEditEvent(newEventWithId);
    } else {
      setEvents(prev => [...prev, newEventWithId]);
    }
    setNewEvent({
      title: '',
      description: '',
      date: format(selectedDate, 'yyyy-MM-dd\'T\'HH:mm'),
      endDate: format(addHours(selectedDate, 1), 'yyyy-MM-dd\'T\'HH:mm'),
      type: 'other',
      folderId: ''
    });
  };

  const handleEditEvent = (event: CalendarEvent) => {
    if (onEditEvent) {
      onEditEvent(event);
    } else {
      setEvents(prev => prev.map(e => e.id === event.id ? event : e));
    }
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
      const eventDate = eventToDelete.date;
      const eventTitle = eventToDelete.title;
      const eventType = eventToDelete.type;
      if (onDeleteEvent) {
        onDeleteEvent(eventToDelete.id);
      } else {
        setEvents(prev => prev.filter(e => !(e.title === eventTitle && e.type === eventType && e.date.substring(0, 10) === eventDate.substring(0, 10) && e.repeat && e.repeat.frequency === eventToDelete.repeat?.frequency)));
      }
    } else {
      deleteEvent(eventToDelete.id);
    }
    setShowDeleteConfirmDialog(false);
    setEventToDelete(null);
    setDeleteAllRecurring(false);
  };

  const deleteEvent = (eventId: string) => {
    if (onDeleteEvent) {
      onDeleteEvent(eventId);
    } else {
      setEvents(prev => prev.filter(e => e.id !== eventId));
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({
      start,
      end
    });
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

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    if (onFilterChange) {
      onFilterChange(filter);
    }
  };

  const handleSaveEvent = () => {
    if (!newEvent.title || !newEvent.date) return;

    const eventWithRepeat = {
      ...newEvent,
      repeat: repeatOption !== 'none' ? {
        frequency: repeatOption,
        interval: 1
      } : undefined
    };

    if (eventToEdit) {
      handleEditEvent({
        ...eventWithRepeat,
        id: eventToEdit.id
      });
    } else {
      addEvent(eventWithRepeat);

      if (repeatOption !== 'none') {
        const startDate = new Date(newEvent.date);
        const endDate = newEvent.endDate ? new Date(newEvent.endDate) : undefined;
        const duration = endDate ? endDate.getTime() - startDate.getTime() : 3600000;
        
        for (let i = 1; i <= 10; i++) {
          let nextDate = new Date(startDate);
          
          if (repeatOption === "daily") {
            nextDate.setDate(nextDate.getDate() + i);
          } else if (repeatOption === "weekly") {
            nextDate.setDate(nextDate.getDate() + (i * 7));
          } else if (repeatOption === "monthly") {
            nextDate.setMonth(nextDate.getMonth() + i);
          }
          
          const nextEndDate = endDate ? new Date(nextDate.getTime() + duration) : undefined;
          
          addEvent({
            ...eventWithRepeat,
            date: nextDate.toISOString(),
            endDate: nextEndDate?.toISOString()
          });
        }
      }
    }

    setShowEventDialog(false);
    setEventToEdit(null);
    setRepeatOption('none');
  };

  // Get the folder name for an event
  const getFolderName = (folderId: string | undefined) => {
    if (!folderId) return "";
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : "";
  };

  const renderMonthView = () => {
    const days = getDaysInMonth();
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-1 text-center">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-sm font-medium border-b border-border">
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
                className={cn(
                  "h-24 flex flex-col items-start justify-start p-1 hover:bg-accent relative border border-border rounded-none", 
                  isSameDay(day, new Date()) ? 'bg-secondary/50' : '',
                  isSameDay(day, selectedDate) ? 'border-2 border-primary' : ''
                )}
                onClick={() => handleDateClick(day)}
              >
                <span className="text-sm font-medium self-center mb-1">
                  {format(day, 'd')}
                </span>
                
                <div className="w-full flex flex-col gap-0.5 overflow-y-auto max-h-16 px-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div 
                      key={event.id} 
                      className="text-xs truncate px-1 rounded flex justify-between items-center"
                      style={{ 
                        backgroundColor: `${eventTypeColors[event.type]}20`,
                        borderLeft: `2px solid ${eventTypeColors[event.type]}`,
                      }}
                    >
                      <span className="truncate block">{event.title}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(event.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-center text-muted-foreground">
                      +{dayEvents.length - 3} más
                    </div>
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
          <Button variant="outline" size="sm" onClick={() => setView('month')}>
            <LayoutGrid className="h-4 w-4 mr-1" />
            Mes
          </Button>
          <Button variant="outline" size="sm" onClick={() => setView('week')}>
            <List className="h-4 w-4 mr-1" />
            Semana
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Filtrar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Tipos de eventos</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleFilterChange('all')}>
                Todos
                {activeFilter === 'all' && <span className="ml-2">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('exam')}>
                <span className="w-2 h-2 rounded-full mr-2" style={{ background: eventTypeColors.exam }}></span>
                Exámenes
                {activeFilter === 'exam' && <span className="ml-2">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('assignment')}>
                <span className="w-2 h-2 rounded-full mr-2" style={{ background: eventTypeColors.assignment }}></span>
                Tareas
                {activeFilter === 'assignment' && <span className="ml-2">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('study')}>
                <span className="w-2 h-2 rounded-full mr-2" style={{ background: eventTypeColors.study }}></span>
                Estudio
                {activeFilter === 'study' && <span className="ml-2">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('class')}>
                <span className="w-2 h-2 rounded-full mr-2" style={{ background: eventTypeColors.class }}></span>
                Clases
                {activeFilter === 'class' && <span className="ml-2">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('meeting')}>
                <span className="w-2 h-2 rounded-full mr-2" style={{ background: eventTypeColors.meeting }}></span>
                Reuniones
                {activeFilter === 'meeting' && <span className="ml-2">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('other')}>
                <span className="w-2 h-2 rounded-full mr-2" style={{ background: eventTypeColors.other }}></span>
                Otros
                {activeFilter === 'other' && <span className="ml-2">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                {format(currentDate, 'MMMM yyyy', {
                  locale: es
                })}
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
          date={selectedDate} 
          events={filteredEvents} 
          onEdit={handleEditEvent} 
          onDelete={handleDeleteEvent} 
          onCancel={() => setView('month')} 
          hasExistingSchedule={true} 
          existingEvents={filteredEvents} 
          onAddEvent={openNewEventDialog}
          onSave={newEvents => {
            newEvents.forEach(event => {
              addEvent({
                ...event,
                repeat: {
                  frequency: 'weekly',
                  interval: 1
                }
              });
            });
            setView('month');
          }} 
        />
      )}
      
      {view === 'day' && (
        <DailyView 
          date={selectedDate} 
          events={selectedDayEvents} 
          onBack={() => setView('month')} 
          onTimeSelect={time => {
            openNewEventDialog(time);
          }} 
          onEventClick={openEditEventDialog} 
          onEditEvent={handleEditEvent} 
          onDeleteEvent={handleDeleteEvent} 
          activeFilter={activeFilter} 
        />
      )}
      
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{eventToEdit ? 'Editar evento' : 'Nuevo evento'}</DialogTitle>
            <DialogDescription>
              {eventToEdit ? 'Modifica los detalles del evento' : 'Completa la información para crear un nuevo evento'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input 
                id="title" 
                value={newEvent.title} 
                onChange={e => setNewEvent({
                  ...newEvent,
                  title: e.target.value
                })} 
                placeholder="Título del evento" 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea 
                id="description" 
                value={newEvent.description || ''} 
                onChange={e => setNewEvent({
                  ...newEvent,
                  description: e.target.value
                })} 
                placeholder="Descripción (opcional)" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Fecha y hora de inicio</Label>
                <Input 
                  id="date" 
                  type="datetime-local" 
                  value={newEvent.date} 
                  onChange={e => setNewEvent({
                    ...newEvent,
                    date: e.target.value
                  })} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">Fecha y hora de fin</Label>
                <Input 
                  id="endDate" 
                  type="datetime-local" 
                  value={newEvent.endDate || ''} 
                  onChange={e => setNewEvent({
                    ...newEvent,
                    endDate: e.target.value
                  })} 
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo</Label>
              <Select 
                value={newEvent.type} 
                onValueChange={(value: 'exam' | 'assignment' | 'study' | 'class' | 'meeting' | 'other') => setNewEvent({
                  ...newEvent,
                  type: value
                })}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecciona un tipo de evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exam">Examen</SelectItem>
                  <SelectItem value="assignment">Tarea</SelectItem>
                  <SelectItem value="study">Estudio</SelectItem>
                  <SelectItem value="class">Clase</SelectItem>
                  <SelectItem value="meeting">Reunión</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="folder">Materia</Label>
              <Select 
                value={newEvent.folderId || "_empty"}
                onValueChange={(value) => setNewEvent({
                  ...newEvent,
                  folderId: value === "_empty" ? undefined : value
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
            <div className="grid gap-2">
              <Label>Repetición</Label>
              <RadioGroup 
                value={repeatOption} 
                onValueChange={(value: 'none' | 'daily' | 'weekly' | 'monthly') => setRepeatOption(value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="r-none" />
                  <Label htmlFor="r-none">Sin repetición</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily" id="r-daily" />
                  <Label htmlFor="r-daily">Todos los días</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="r-weekly" />
                  <Label htmlFor="r-weekly">Todas las semanas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="r-monthly" />
                  <Label htmlFor="r-monthly">Todos los meses</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEvent} disabled={!newEvent.title || !newEvent.date}>
              {eventToEdit ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
                    onChange={e => setDeleteAllRecurring(e.target.checked)} 
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
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteConfirmDialog(false);
                setEventToDelete(null);
                setDeleteAllRecurring(false);
              }}
            >
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
