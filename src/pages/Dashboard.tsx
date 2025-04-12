import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRecordings } from "@/context/RecordingsContext";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import { RecordingItem } from "@/components/RecordingItem";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, Mic, FileText, Search, Calendar, Bell, BookOpen, Filter, Check, X } from "lucide-react";
import { toast } from "sonner";
import { parseISO, format, isWithinInterval, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { loadFromStorage } from "@/lib/storage";
import { useIsMobile } from "@/hooks/use-mobile";
import { ToolsCarousel } from "@/components/ToolsCarousel";
import { NotesSection } from "@/components/NotesSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveTranscriptionSheet } from "@/components/LiveTranscriptionSheet";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AudioRecorderV2 } from "@/components/AudioRecorderV2";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  description?: string;
}

function UpcomingEvents({
  events
}: {
  events: CalendarEvent[];
}) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  return <Card className={isMobile ? "mb-6" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-orange-500" />
          Próximos Recordatorios
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? <div className="text-center text-muted-foreground py-2">
            <p>No hay recordatorios próximos</p>
            <p className="text-xs mt-1">Tus eventos aparecerán aquí</p>
          </div> : <div className="space-y-2">
            {events.slice(0, 5).map(event => <div key={event.id} className="p-2 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors cursor-pointer" onClick={() => navigate("/calendar")}>
                <div className="font-medium text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4 text-orange-500" />
                  {event.title}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {format(parseISO(event.date), "PPPp", {
              locale: es
            })}
                </div>
              </div>)}

            {events.length > 5 && <Button variant="link" className="w-full text-sm" onClick={() => navigate("/calendar")}>
                Ver todos los eventos ({events.length})
              </Button>}
          </div>}
      </CardContent>
    </Card>;
}

function Transcriptions() {
  const {
    recordings,
    deleteRecording
  } = useRecordings();
  const [searchQuery, setSearchQuery] = useState("");
  const [understandingFilter, setUnderstandingFilter] = useState<"all" | "understood" | "not-understood">("all");
  const navigate = useNavigate();
  const filteredRecordings = recordings.filter(recording => {
    const matchesSearch = (recording.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (understandingFilter === "all") {
      return matchesSearch;
    } else if (understandingFilter === "understood") {
      return matchesSearch && recording.understood === true;
    } else {
      return matchesSearch && recording.understood !== true;
    }
  });
  const handleAddToCalendar = (recording: any) => {
    console.log("Add to calendar:", recording);
    toast.info("Funcionalidad en desarrollo");
  };
  return <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-500" />
          Transcripciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
          <div className="flex items-center flex-1 w-full">
            <Search className="h-4 w-4 text-muted-foreground mr-2" />
            <Input type="search" placeholder="Buscar transcripciones..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1 px-3">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filtrar</span>
                  {understandingFilter !== "all" && (
                    <Badge className="ml-1 h-5 px-1 bg-primary/20 text-primary" variant="outline">
                      {understandingFilter === "understood" ? "Entendidas" : "No entendidas"}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem 
                  className="flex items-center gap-2 cursor-pointer" 
                  onClick={() => setUnderstandingFilter("all")}>
                  <div className="w-4 h-4 flex items-center justify-center">
                    {understandingFilter === "all" && <Check className="h-4 w-4" />}
                  </div>
                  <span>Todas</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="flex items-center gap-2 cursor-pointer" 
                  onClick={() => setUnderstandingFilter("understood")}>
                  <div className="w-4 h-4 flex items-center justify-center text-green-600">
                    {understandingFilter === "understood" ? <Check className="h-4 w-4" /> : <Check className="h-4 w-4 opacity-0" />}
                  </div>
                  <span>Entendidas</span>
                  <Check className="h-3 w-3 ml-auto text-green-600" />
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="flex items-center gap-2 cursor-pointer" 
                  onClick={() => setUnderstandingFilter("not-understood")}>
                  <div className="w-4 h-4 flex items-center justify-center text-amber-600">
                    {understandingFilter === "not-understood" ? <Check className="h-4 w-4" /> : <Check className="h-4 w-4 opacity-0" />}
                  </div>
                  <span>No entendidas</span>
                  <X className="h-3 w-3 ml-auto text-amber-600" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="divide-y divide-border">
          {filteredRecordings.map(recording => <RecordingItem key={recording.id} recording={recording} onAddToCalendar={handleAddToCalendar} />)}
          {filteredRecordings.length === 0 && <div className="text-center text-muted-foreground py-4">
              <p>No se encontraron transcripciones</p>
            </div>}
        </div>
      </CardContent>
    </Card>;
}

function AudioTranscriptionTool() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionOutput, setTranscriptionOutput] = useState("");
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [transcriptionOpen, setTranscriptionOpen] = useState(false);
  
  useEffect(() => {
    const handleAudioRecorderMessage = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.type === 'recordingStarted') {
        setIsRecording(true);
      } else if (customEvent.detail?.type === 'recordingStopped') {
        setIsRecording(false);
      } else if (customEvent.detail?.type === 'transcriptionStarted') {
        setIsTranscribing(true);
        setTranscriptionOutput("");
        setTranscriptionProgress(0);
        setTranscriptionOpen(true);
      } else if (customEvent.detail?.type === 'transcriptionComplete' || customEvent.detail?.type === 'transcriptionStopped') {
        setIsTranscribing(false);
        setTranscriptionProgress(100);
      } else if (customEvent.detail?.type === 'transcriptionUpdate') {
        if (customEvent.detail.data) {
          if (customEvent.detail.data.output) {
            setTranscriptionOutput(customEvent.detail.data.output);
          }
          if (customEvent.detail.data.progress !== undefined) {
            setTranscriptionProgress(customEvent.detail.data.progress);
          }
        }
      }
    };
    window.addEventListener('audioRecorderMessage', handleAudioRecorderMessage);
    return () => {
      window.removeEventListener('audioRecorderMessage', handleAudioRecorderMessage);
    };
  }, []);
  
  return <div className="space-y-4">
      <AudioRecorderV2 />
      
      {(isRecording || isTranscribing || transcriptionOutput) && <Button variant="outline" className="w-full" onClick={() => setTranscriptionOpen(true)}>
          {isTranscribing ? "Ver transcripción en vivo" : "Ver transcripción"}
        </Button>}
      
      <LiveTranscriptionSheet isTranscribing={isTranscribing} output={transcriptionOutput} progress={transcriptionProgress} open={transcriptionOpen} onOpenChange={setTranscriptionOpen} />
    </div>;
}

export default function Dashboard() {
  const {
    user
  } = useAuth();
  const {
    recordings,
    addRecording
  } = useRecordings();
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("transcriptions");
  
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionOutput, setTranscriptionOutput] = useState("");
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [transcriptionOpen, setTranscriptionOpen] = useState(false);
  
  const handleAddToCalendar = (recording: any) => {
    console.log("Add to calendar:", recording);
    toast.info("Funcionalidad en desarrollo");
  };
  
  useEffect(() => {
    const loadEvents = () => {
      const storedEvents = loadFromStorage<CalendarEvent[]>("calendarEvents") || [];
      const now = new Date();
      const filteredEvents = storedEvents.filter((event: CalendarEvent) => {
        try {
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
      filteredEvents.sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      setUpcomingEvents(filteredEvents);
    };
    loadEvents();
    const intervalId = setInterval(loadEvents, 60000);
    return () => clearInterval(intervalId);
  }, []);
  
  useEffect(() => {
    const handleWebhookResponse = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.type === 'webhookResponse' && customEvent.detail?.data) {
        localStorage.setItem("lastWebhookData", JSON.stringify(customEvent.detail.data));
        setActiveTab("notes");
        toast.success("¡Imagen recibida! Creando nuevo apunte...");
      }
    };
    window.addEventListener('webhookResponse', handleWebhookResponse);
    return () => {
      window.removeEventListener('webhookResponse', handleWebhookResponse);
    };
  }, []);
  
  useEffect(() => {
    const handleAudioRecorderMessage = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.type === 'recordingStarted') {
        setIsRecording(true);
      } else if (customEvent.detail?.type === 'recordingStopped') {
        setIsRecording(false);
      } else if (customEvent.detail?.type === 'transcriptionStarted') {
        setIsTranscribing(true);
        setTranscriptionOutput("");
        setTranscriptionProgress(0);
        setTranscriptionOpen(true);
      } else if (customEvent.detail?.type === 'transcriptionComplete' || customEvent.detail?.type === 'transcriptionStopped') {
        setIsTranscribing(false);
        setTranscriptionProgress(100);
      } else if (customEvent.detail?.type === 'transcriptionUpdate') {
        if (customEvent.detail.data) {
          if (customEvent.detail.data.output) {
            setTranscriptionOutput(customEvent.detail.data.output);
          }
          if (customEvent.detail.data.progress !== undefined) {
            setTranscriptionProgress(customEvent.detail.data.progress);
          }
        }
      }
    };
    window.addEventListener('audioRecorderMessage', handleAudioRecorderMessage);
    return () => {
      window.removeEventListener('audioRecorderMessage', handleAudioRecorderMessage);
    };
  }, []);
  
  return <Layout>
      <div className="space-y-6 max-w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-custom-primary dark:text-white">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.role === "teacher" ? "Gestiona tus transcripciones" : "Gestiona tus recursos"}
            </p>
          </div>
        </div>

        {isMobile && <div className="grid grid-cols-1 gap-4">
            <UpcomingEvents events={upcomingEvents} />
            
            <ToolsCarousel 
              showTranscriptionOptions={isTranscribing || !!transcriptionOutput}
              isTranscribing={isTranscribing}
              transcriptionOutput={transcriptionOutput}
              transcriptionOpen={transcriptionOpen}
              setTranscriptionOpen={setTranscriptionOpen}
              transcriptionProgress={transcriptionProgress}
            />
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transcriptions" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Transcripciones</span>
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>Apuntes</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="transcriptions">
                <Transcriptions />
              </TabsContent>
              <TabsContent value="notes">
                <NotesSection />
              </TabsContent>
            </Tabs>
          </div>}

        {!isMobile && <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            <div className="md:col-span-4 space-y-6">
              <ToolsCarousel 
                showTranscriptionOptions={isTranscribing || !!transcriptionOutput}
                isTranscribing={isTranscribing}
                transcriptionOutput={transcriptionOutput}
                transcriptionOpen={transcriptionOpen}
                setTranscriptionOpen={setTranscriptionOpen}
                transcriptionProgress={transcriptionProgress}
              />
              <UpcomingEvents events={upcomingEvents} />
              <NotesSection />
            </div>
            <div className="md:col-span-2">
              <Transcriptions />
            </div>
          </div>}
      </div>
    </Layout>;
}
