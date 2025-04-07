
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Calendar, CalendarEvent } from "@/components/Calendar";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { loadFromStorage, saveToStorage } from "@/lib/storage";

export default function CalendarPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    const loadedEvents = loadFromStorage<CalendarEvent[]>("calendarEvents") || [];
    setEvents(loadedEvents);
  }, []);

  useEffect(() => {
    saveToStorage("calendarEvents", events);
  }, [events]);

  useEffect(() => {
    if (location.state?.recording) {
      const recording = location.state.recording;
      if (recording.keyPoints?.length > 0) {
        const dialog = document.createElement("dialog");
        dialog.className = "fixed inset-0 flex items-center justify-center bg-black/50 z-50";
        dialog.innerHTML = `
          <div class="bg-background dark:bg-custom-secondary/20 dark:border-custom-secondary/40 dark:text-white rounded-lg p-6 max-w-md w-full">
            <h2 class="text-xl font-bold mb-4 dark:text-white">Eventos sugeridos</h2>
            <p class="text-sm text-muted-foreground dark:text-white/60 mb-4">
              Se encontraron los siguientes eventos en la grabación. 
              ¿Deseas agregarlos al calendario?
            </p>
            <div class="space-y-2 max-h-60 overflow-y-auto" id="suggested-events"></div>
            <div class="flex justify-end space-x-2 mt-6">
              <button class="px-4 py-2 bg-secondary text-secondary-foreground dark:bg-custom-secondary/40 dark:text-white rounded-lg" id="cancel-button">
                Cancelar
              </button>
              <button class="px-4 py-2 bg-primary text-primary-foreground dark:bg-custom-accent dark:text-white rounded-lg" id="add-button">
                Agregar seleccionados
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(dialog);
        dialog.showModal();
        const suggestedEventsContainer = dialog.querySelector("#suggested-events");

        recording.keyPoints.forEach((point, index) => {
          const now = new Date();
          const eventDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (index + 1));
          const eventEl = document.createElement("div");
          eventEl.className = "flex items-center space-x-2";
          eventEl.innerHTML = `
            <input type="checkbox" id="event-${index}" class="h-4 w-4" checked />
            <label for="event-${index}" class="flex-1 dark:text-white">
              <div class="font-medium">${point}</div>
              <div class="text-xs text-muted-foreground dark:text-white/60">
                ${format(eventDate, "PPP")}
              </div>
            </label>
          `;
          suggestedEventsContainer.appendChild(eventEl);
        });

        const cancelButton = dialog.querySelector("#cancel-button");
        const addButton = dialog.querySelector("#add-button");
        if (cancelButton) {
          cancelButton.addEventListener("click", () => {
            dialog.close();
            dialog.remove();
          });
        }
        if (addButton) {
          addButton.addEventListener("click", () => {
            const checkboxes = dialog.querySelectorAll("input[type=checkbox]:checked");
            const newEvents: CalendarEvent[] = [];
            
            checkboxes.forEach((checkbox, index) => {
              const now = new Date();
              const eventDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (index + 1));
              const newEvent: CalendarEvent = {
                id: crypto.randomUUID(),
                title: recording.keyPoints[index],
                description: `Evento basado en la grabación: ${recording.name}`,
                date: eventDate.toISOString(),
                folderId: recording.folderId // Associate with the recording's folder
              };
              newEvents.push(newEvent);
            });
            
            setEvents(prev => {
              const updatedEvents = [...prev, ...newEvents];
              saveToStorage("calendarEvents", updatedEvents);
              return updatedEvents;
            });
            
            toast.success("Eventos agregados al calendario");
            dialog.close();
            dialog.remove();
          });
        }
      }

      navigate("/calendar", {
        replace: true
      });
    }
  }, [location.state, navigate]);

  const handleAddEvent = (event: Omit<CalendarEvent, "id">) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: crypto.randomUUID()
    };
    setEvents(prev => {
      const updatedEvents = [...prev, newEvent];
      saveToStorage("calendarEvents", updatedEvents);
      return updatedEvents;
    });
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => {
      const updatedEvents = prev.filter(event => event.id !== id);
      saveToStorage("calendarEvents", updatedEvents);
      return updatedEvents;
    });
  };

  const updateEventWithGoogleId = (eventId: string, googleEventId: string) => {
    setEvents(prev => {
      const updatedEvents = prev.map(event => 
        event.id === eventId 
          ? { ...event, googleEventId } 
          : event
      );
      saveToStorage("calendarEvents", updatedEvents);
      return updatedEvents;
    });
  };

  const handleEventsSynced = () => {
    // This function will be called after events are synced with Google Calendar
    toast.success("Eventos sincronizados con Google Calendar");
    
    // We might update Google event IDs here if needed
    // This would be implemented if we want to track which events are already synced
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-full">
        <h1 className="text-2xl md:text-3xl font-bold text-custom-primary dark:text-custom-accent dark:text-white">Calendario</h1>
        
        <div className="glassmorphism rounded-xl p-3 md:p-6 shadow-lg dark:bg-custom-secondary/20 dark:border-custom-secondary/40 w-full">
          <div className="w-full overflow-hidden">
            <Calendar 
              events={events} 
              onAddEvent={handleAddEvent} 
              onDeleteEvent={handleDeleteEvent} 
              onEventsSynced={handleEventsSynced}
              updateEventWithGoogleId={updateEventWithGoogleId}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
