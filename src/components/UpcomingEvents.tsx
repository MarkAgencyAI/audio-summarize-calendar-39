
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Check, X } from 'lucide-react';
import { parseISO, format, isWithinInterval, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { RecordingService } from '@/lib/services/recording-service';
import { Badge } from '@/components/ui/badge';
import { useRecordings } from '@/context/RecordingsContext';

interface Event {
  id: string;
  title: string;
  date: string;
  description?: string;
  folderId?: string | null;
  type?: string;
  endDate?: string;
}

interface UpcomingEventsProps {
  showHeader?: boolean;
  limit?: number;
  folderId?: string | null;
}

export function UpcomingEvents({ showHeader = true, limit = 5, folderId }: UpcomingEventsProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { folders } = useRecordings();

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      // Fetch events from the database using RecordingService
      const allEvents = await RecordingService.loadCalendarEvents();
      
      // Filter events to show only upcoming ones (next 14 days)
      const now = new Date();
      const filteredEvents = allEvents.filter((event: any) => {
        try {
          // Filter by folder if specified
          if (folderId !== undefined && folderId !== null) {
            if (event.folderId !== folderId) {
              return false;
            }
          }
          
          const eventDate = parseISO(event.date);
          return isWithinInterval(eventDate, {
            start: now,
            end: addDays(now, 14)
          });
        } catch (error) {
          console.error("Error parsing date for event:", event);
          return false;
        }
      });
      
      // Sort by date
      filteredEvents.sort((a: any, b: any) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      setEvents(filteredEvents);
      console.info("Loaded upcoming events:", filteredEvents.length);
    } catch (error) {
      console.error("Error loading events:", error);
      toast.error("Error al cargar los eventos");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadEvents();
    
    // Set up interval to refresh events every minute
    const intervalId = setInterval(loadEvents, 60000);
    return () => clearInterval(intervalId);
  }, [folderId]);
  
  const getFolderName = (id: string | null | undefined) => {
    if (!id) return null;
    const folder = folders.find(f => f.id === id);
    return folder ? folder.name : null;
  };
  
  const getFolderColor = (id: string | null | undefined) => {
    if (!id) return null;
    const folder = folders.find(f => f.id === id);
    return folder ? folder.color : null;
  };
  
  const getEventTypeLabel = (type: string = 'other') => {
    const types: Record<string, string> = {
      'exam': 'Examen',
      'assignment': 'Tarea',
      'study': 'Estudio',
      'class': 'Clase',
      'meeting': 'Reunión',
      'other': 'Otro'
    };
    return types[type] || 'Otro';
  };
  
  const getEventTypeColor = (type: string = 'other') => {
    const colors: Record<string, string> = {
      'exam': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'assignment': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      'study': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'class': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'meeting': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'other': 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
    };
    return colors[type] || colors.other;
  };

  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-500" />
            Próximos Recordatorios
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-2">
            <p>Cargando recordatorios...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center text-muted-foreground py-2">
            <p>No hay recordatorios próximos</p>
            <p className="text-xs mt-1">Tus eventos aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.slice(0, limit).map(event => (
              <div 
                key={event.id} 
                className="p-2 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors cursor-pointer" 
                onClick={() => navigate("/calendar")}
              >
                <div className="font-medium text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-orange-500" />
                    {event.title}
                  </div>
                  
                  {event.type && (
                    <Badge variant="outline" className={`text-xs ${getEventTypeColor(event.type)}`}>
                      {getEventTypeLabel(event.type)}
                    </Badge>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground mt-1">
                  {format(parseISO(event.date), "PPPp", { locale: es })}
                </div>
                
                {event.description && (
                  <div className="text-xs mt-1 truncate">
                    {event.description}
                  </div>
                )}
                
                {event.folderId && (
                  <div 
                    className="text-xs mt-1 flex items-center gap-1"
                    style={{ color: getFolderColor(event.folderId) }}
                  >
                    <span>Carpeta: {getFolderName(event.folderId)}</span>
                  </div>
                )}
              </div>
            ))}

            {events.length > limit && (
              <Button variant="link" className="w-full text-sm" onClick={() => navigate("/calendar")}>
                Ver todos los eventos ({events.length})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
