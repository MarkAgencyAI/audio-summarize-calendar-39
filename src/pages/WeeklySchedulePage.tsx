
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { useRecordings } from "@/context/RecordingsContext";
import { WeeklyScheduleGrid } from "@/components/weekly-schedule/WeeklyScheduleGrid";
import { RecordingService } from "@/lib/services/recording-service";
import { CalendarEvent } from "@/components/Calendar";

export default function WeeklySchedulePage() {
  const navigate = useNavigate();
  const { refreshData } = useRecordings();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get existing events from the calendar
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  
  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const events = await RecordingService.loadCalendarEvents();
        setEvents(events.map(event => ({
          id: event.id!,
          title: event.title,
          description: event.description,
          date: event.date,
          endDate: event.endDate,
          type: event.type,
          folderId: event.folderId,
          repeat: event.repeat
        })));
      } catch (error) {
        console.error("Error loading events:", error);
        toast.error("Error al cargar eventos");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadEvents();
  }, []);
  
  const handleSaveEvents = async (newEvents: Omit<CalendarEvent, "id">[]) => {
    setIsLoading(true);
    try {
      for (const event of newEvents) {
        await RecordingService.saveCalendarEvent({
          title: event.title,
          description: event.description,
          date: event.date,
          endDate: event.endDate,
          type: event.type,
          folderId: event.folderId,
          repeat: event.repeat
        });
      }
      
      toast.success("Cronograma guardado correctamente");
      refreshData();
      navigate("/calendar");
    } catch (error) {
      console.error("Error saving events:", error);
      toast.error("Error al guardar el cronograma");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="space-y-4 pb-20">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/calendar")}
            className="p-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span>Volver</span>
          </Button>
          
          <h1 className="text-xl font-bold text-custom-primary dark:text-white">
            Cronograma Semanal
          </h1>
          
          <div className="w-10"></div> {/* Spacer for balance */}
        </div>
        
        <div className="w-full overflow-hidden">
          <WeeklyScheduleGrid
            date={new Date()}
            onSave={handleSaveEvents}
            onCancel={() => navigate("/calendar")}
            hasExistingSchedule={events.length > 0}
            existingEvents={events}
          />
        </div>
      </div>
    </Layout>
  );
}
