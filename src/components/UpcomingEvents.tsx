
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, ArrowUpRight } from 'lucide-react';
import { formatDistanceToNow, addDays, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRecordings } from '@/context/RecordingsContext';
import { Event } from '@/context/RecordingsContext';
import { useNavigate } from 'react-router-dom';

interface UpcomingEventsProps {
  folderId?: string;
  limit?: number;
  showHeader?: boolean;
}

export function UpcomingEvents({ folderId, limit = 5, showHeader = true }: UpcomingEventsProps) {
  const { getEvents, refreshData, folders } = useRecordings();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    const loadEvents = async () => {
      try {
        // Get all events without refreshing data to avoid infinite loops
        const allEvents = getEvents();
        
        // Filter events that are within the next 14 days
        const now = new Date();
        const futureDate = addDays(now, 14);
        
        let filteredEvents = allEvents.filter(event => {
          const eventDate = event.date ? new Date(event.date) : null;
          if (!eventDate) return false;
          
          return isWithinInterval(eventDate, {
            start: now,
            end: futureDate
          });
        });
        
        // If folderId is provided, filter events for that folder
        if (folderId) {
          filteredEvents = filteredEvents.filter(event => 
            'folderId' in event && event.folderId === folderId
          );
        }
        
        // Sort by date (closest first)
        filteredEvents.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateA - dateB;
        });
        
        // Limit the number of events shown
        setUpcomingEvents(filteredEvents.slice(0, limit));
        
        console.log("Loaded upcoming events:", filteredEvents.length);
      } catch (error) {
        console.error("Error loading upcoming events:", error);
      }
    };
    
    loadEvents();
  }, [getEvents, folderId, limit]);
  
  const navigateToCalendar = () => {
    navigate('/calendar');
  };
  
  const getFolderName = (id: string) => {
    const folder = folders.find(f => f.id === id);
    return folder ? folder.name : 'Sin carpeta';
  };
  
  const getFolderColor = (id: string) => {
    const folder = folders.find(f => f.id === id);
    return folder ? folder.color : '#6b7280';
  };
  
  const formatRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: es
      });
    } catch (e) {
      return 'Fecha inválida';
    }
  };
  
  if (upcomingEvents.length === 0) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <CalendarDays className="mr-2 h-5 w-5" />
              Recordatorios
            </CardTitle>
            <CardDescription>Próximos 14 días</CardDescription>
          </CardHeader>
        )}
        <CardContent className="text-center py-6">
          <p className="text-sm text-muted-foreground">No hay recordatorios próximos</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={navigateToCalendar}
          >
            Ir al calendario
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <CalendarDays className="mr-2 h-5 w-5" />
            Recordatorios
          </CardTitle>
          <CardDescription>Próximos 14 días</CardDescription>
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-4">
          {upcomingEvents.map(event => (
            <div 
              key={event.id} 
              className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="flex-shrink-0 mt-1">
                <div 
                  className="h-8 w-8 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: 'folderId' in event && event.folderId ? `${getFolderColor(event.folderId)}30` : '#e5e7eb',
                    color: 'folderId' in event && event.folderId ? getFolderColor(event.folderId) : '#6b7280'
                  }}
                >
                  <CalendarDays className="h-4 w-4" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{event.title}</h4>
                {event.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                )}
                <div className="flex items-center mt-1 gap-2">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {event.date && formatRelativeTime(event.date)}
                  </div>
                  {'folderId' in event && event.folderId && (
                    <div className="text-xs px-1.5 py-0.5 rounded-full" style={{
                      backgroundColor: `${getFolderColor(event.folderId)}20`,
                      color: getFolderColor(event.folderId)
                    }}>
                      {getFolderName(event.folderId)}
                    </div>
                  )}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-shrink-0 h-8 w-8 p-0"
                onClick={navigateToCalendar}
              >
                <ArrowUpRight className="h-4 w-4" />
                <span className="sr-only">Ver detalles</span>
              </Button>
            </div>
          ))}
          
          {upcomingEvents.length > 0 && (
            <Button 
              variant="outline" 
              className="w-full mt-2" 
              size="sm"
              onClick={navigateToCalendar}
            >
              Ver todos los eventos
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
