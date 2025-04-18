import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Calendar, CalendarEvent } from "@/components/Calendar";
import { MobileCalendar } from "@/components/MobileCalendar";
import { useAuth } from "@/context/AuthContext";
import { format, addHours } from "date-fns";
import { toast } from "sonner";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRecordings } from "@/context/RecordingsContext";
import { CalendarEventData, RecordingService } from "@/lib/services/recording-service";
import { saveToStorage, loadFromStorage } from "@/lib/storage";

export default function CalendarPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { folders } = useRecordings();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showAddEventDialog, setShowAddEventDialog] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [deleteAllRecurring, setDeleteAllRecurring] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endDate: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
    folderId: "",
    type: "other" as "exam" | "assignment" | "study" | "class" | "meeting" | "other",
    repeat: "none" as "none" | "daily" | "weekly" | "monthly"
  });
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    const loadEvents = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const dbEvents = await RecordingService.loadCalendarEvents();
        const formattedEvents: CalendarEvent[] = dbEvents.map(event => ({
          id: event.id!,
          title: event.title,
          description: event.description,
          date: event.date,
          endDate: event.endDate,
          type: event.type,
          folderId: event.folderId,
          repeat: event.repeat
        }));
        
        setEvents(formattedEvents);
        console.log('Loaded events from database:', formattedEvents);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [user]);

  useEffect(() => {
    if (location.state?.recording) {
      const recording = location.state.recording;
      if (recording.keyPoints?.length > 0) {
        const dialog = document.createElement("dialog");
        dialog.className = "fixed inset-0 flex items-center justify-center bg-black/50 z-50";
        dialog.innerHTML = `
          <div class="bg-background dark:bg-custom-secondary/20 dark:border-custom-secondary/40 dark:text-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
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
              <div class="font-medium text-sm break-words">${point}</div>
              <div class="text-xs text-muted-foreground dark:text-white/60">
                ${format(eventDate, "PPP")}
              </div>
            </label>
          `;
          suggestedEventsContainer?.appendChild(eventEl);
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
                folderId: recording.folderId,
                type: "other"
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

  const handleAddEvent = async (event: Omit<CalendarEvent, "id">) => {
    try {
      const eventData: CalendarEventData = {
        title: event.title,
        description: event.description,
        date: event.date,
        endDate: event.endDate,
        type: event.type,
        folderId: event.folderId,
        repeat: event.repeat
      };
      
      const eventId = await RecordingService.saveCalendarEvent(eventData);
      
      if (eventId) {
        const newEvent: CalendarEvent = {
          ...event,
          id: eventId
        };
        
        setEvents(prev => [...prev, newEvent]);
        toast.success("Evento guardado correctamente");
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error("Error al guardar el evento");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const eventToDelete = events.find(event => event.id === id);
    if (eventToDelete && eventToDelete.repeat && typeof eventToDelete.repeat === 'object' && eventToDelete.repeat.frequency) {
      setEventToDelete(eventToDelete);
      setShowDeleteConfirmDialog(true);
    } else {
      await deleteEvent(id);
    }
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    
    if (deleteAllRecurring) {
      const eventsToDelete = events.filter(event => 
        event.title === eventToDelete.title && 
        event.type === eventToDelete.type && 
        event.repeat && 
        typeof event.repeat === 'object' && 
        event.repeat.frequency === eventToDelete.repeat?.frequency
      );
      
      for (const event of eventsToDelete) {
        await RecordingService.deleteCalendarEvent(event.id);
      }
      
      setEvents(prev => prev.filter(event => !(
        event.title === eventToDelete.title && 
        event.type === eventToDelete.type && 
        event.repeat && 
        typeof event.repeat === 'object' && 
        event.repeat.frequency === eventToDelete.repeat?.frequency
      )));
      
      toast.success("Se eliminaron todos los eventos recurrentes");
    } else {
      await deleteEvent(eventToDelete.id);
    }
    
    setShowDeleteConfirmDialog(false);
    setEventToDelete(null);
    setDeleteAllRecurring(false);
  };

  const deleteEvent = async (eventId: string) => {
    const success = await RecordingService.deleteCalendarEvent(eventId);
    
    if (success) {
      setEvents(prev => prev.filter(e => e.id !== eventId));
      toast.success("Evento eliminado");
    }
  };

  const handleQuickAddEvent = () => {
    if (!newEvent.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    
    if (newEvent.endDate && new Date(newEvent.endDate) <= new Date(newEvent.date)) {
      toast.error("La hora de finalización debe ser posterior a la hora de inicio");
      return;
    }
    
    if (newEvent.repeat === "none") {
      handleAddEvent({
        title: newEvent.title,
        description: newEvent.description,
        date: newEvent.date,
        endDate: newEvent.endDate || undefined,
        folderId: newEvent.folderId || undefined,
        type: newEvent.type,
        repeat: undefined
      });
    } else {
      createRepeatingEvents();
    }
    
    setNewEvent({
      title: "",
      description: "",
      date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endDate: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
      folderId: "",
      type: "other",
      repeat: "none"
    });
    
    setShowAddEventDialog(false);
  };

  const createRepeatingEvents = async () => {
    const repeat = newEvent.repeat !== "none" ? {
      frequency: newEvent.repeat as "daily" | "weekly" | "monthly",
      interval: 1
    } : undefined;
    
    const baseEvent = {
      title: newEvent.title,
      description: newEvent.description,
      folderId: newEvent.folderId || undefined,
      type: newEvent.type,
      repeat
    };
    
    await handleAddEvent({
      ...baseEvent,
      date: newEvent.date,
      endDate: newEvent.endDate || undefined
    });
    
    const startDate = new Date(newEvent.date);
    const endDate = newEvent.endDate ? new Date(newEvent.endDate) : undefined;
    const duration = endDate ? endDate.getTime() - startDate.getTime() : 3600000;
    
    for (let i = 1; i <= 10; i++) {
      let nextDate = new Date(startDate);
      
      if (newEvent.repeat === "daily") {
        nextDate.setDate(nextDate.getDate() + i);
      } else if (newEvent.repeat === "weekly") {
        nextDate.setDate(nextDate.getDate() + i * 7);
      } else if (newEvent.repeat === "monthly") {
        nextDate.setMonth(nextDate.getMonth() + i);
      }
      
      const nextEndDate = endDate ? new Date(nextDate.getTime() + duration) : undefined;
      
      await handleAddEvent({
        ...baseEvent,
        date: nextDate.toISOString(),
        endDate: nextEndDate?.toISOString()
      });
    }
    
    toast.success(`Se han creado eventos repetitivos (${newEvent.repeat})`);
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    if (filter === "all") {
      toast.info("Mostrando todos los eventos");
    } else if (filter === "cronograma") {
      toast.info("Mostrando el cronograma semanal");
    } else {
      toast.info(`Mostrando eventos de tipo: ${filter}`);
    }
  };

  const openAddEventDialog = () => {
    setShowAddEventDialog(true);
    setNewEvent({
      title: "",
      description: "",
      date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endDate: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
      folderId: "",
      type: "other",
      repeat: "none"
    });
  };

  return <Layout>
      <div className="space-y-4 sm:space-y-6 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-custom-primary dark:text-custom-accent dark:text-white">
            Calendario
          </h1>
          
          <Button 
            variant="outline" 
            onClick={() => navigate("/weekly-schedule")}
            className="flex items-center gap-1"
          >
            <CalendarIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Cronograma Semanal</span>
            <span className="sm:hidden">Cronograma</span>
          </Button>
        </div>
        
        <div className="glassmorphism rounded-xl p-3 md:p-6 shadow-lg dark:bg-custom-secondary/20 dark:border-custom-secondary/40 w-full overflow-hidden">
          <div className="w-full overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <p>Cargando eventos...</p>
              </div>
            ) : isMobile ? (
              <MobileCalendar 
                events={events} 
                onAddEvent={openAddEventDialog} 
                onEventClick={event => {
                  setNewEvent({
                    title: event.title,
                    description: event.description || "",
                    date: event.date,
                    endDate: event.endDate || format(addHours(new Date(event.date), 1), "yyyy-MM-dd'T'HH:mm"),
                    folderId: event.folderId || "",
                    type: event.type,
                    repeat: "none"
                  });
                  setShowAddEventDialog(true);
                }} 
                onEditEvent={event => handleAddEvent(event)} 
                onDeleteEvent={handleDeleteEvent} 
                activeFilter={activeFilter} 
                onFilterChange={handleFilterChange} 
              />
            ) : (
              <Calendar 
                events={events} 
                onAddEvent={openAddEventDialog} 
                onEditEvent={event => handleAddEvent(event)} 
                onDeleteEvent={handleDeleteEvent} 
                activeFilter={activeFilter} 
                onFilterChange={handleFilterChange} 
              />
            )}
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-6 right-6">
        <Button onClick={openAddEventDialog} className="rounded-full shadow-lg w-14 h-14 p-4 mb-20">
          <Plus className="h-6 w-6" />
        </Button>
      </div>
      
      <Dialog open={showAddEventDialog} onOpenChange={setShowAddEventDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Agregar evento</DialogTitle>
            <DialogDescription>Completa los datos para agregar un nuevo evento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" value={newEvent.title} onChange={e => setNewEvent({
              ...newEvent,
              title: e.target.value
            })} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" value={newEvent.description} onChange={e => setNewEvent({
              ...newEvent,
              description: e.target.value
            })} />
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Hora de inicio</Label>
                <Input id="startDate" type="datetime-local" value={newEvent.date} onChange={e => setNewEvent({
                ...newEvent,
                date: e.target.value
              })} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">Hora de finalización</Label>
                <Input id="endDate" type="datetime-local" value={newEvent.endDate} onChange={e => setNewEvent({
                ...newEvent,
                endDate: e.target.value
              })} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={newEvent.type} onValueChange={(value: "exam" | "assignment" | "study" | "class" | "meeting" | "other") => setNewEvent({
              ...newEvent,
              type: value
            })}>
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
            
            <div className="space-y-2">
              <Label htmlFor="folder">Materia</Label>
              <Select value={newEvent.folderId || "_empty"} onValueChange={value => setNewEvent({
              ...newEvent,
              folderId: value === "_empty" ? "" : value
            })}>
                <SelectTrigger id="folder">
                  <SelectValue placeholder="Selecciona una materia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_empty">Sin materia</SelectItem>
                  {folders.map(folder => <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Repetición</Label>
              <RadioGroup value={newEvent.repeat} onValueChange={(value: "none" | "daily" | "weekly" | "monthly") => setNewEvent({
              ...newEvent,
              repeat: value
            })} className="flex flex-col space-y-1">
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
            <Button onClick={handleQuickAddEvent}>Guardar evento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Eliminar evento recurrente</DialogTitle>
            <DialogDescription>
              Este es un evento que se repite. ¿Desea eliminar solo esta instancia o todos los eventos de la serie?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={deleteAllRecurring ? "all" : "single"} onValueChange={value => setDeleteAllRecurring(value === "all")} className="flex flex-col space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="delete-single" />
                <Label htmlFor="delete-single">Solo esta instancia</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="delete-all" />
                <Label htmlFor="delete-all">Todos los eventos recurrentes</Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => {
            setShowDeleteConfirmDialog(false);
            setEventToDelete(null);
            setDeleteAllRecurring(false);
          }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteEvent}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>;
}
