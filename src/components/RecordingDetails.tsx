
import { useState, useEffect, useRef } from "react";
import { Recording, useRecordings } from "@/context/RecordingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { FileText, Edit, Trash2, Save, X, Globe, Folder, MessageSquare, Sparkles, Search, PaintBucket } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGroq } from "@/lib/groq";
import { sendToWebhook } from "@/lib/webhook";
import { extractWebhookOutput } from "@/lib/transcription-service";
import { AudioPlayer } from "@/components/AudioPlayer";
import { loadAudioFromStorage, saveAudioToStorage } from "@/lib/storage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface RecordingDetailsProps {
  recording: Recording;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface TextHighlight {
  id: string;
  text: string;
  color: string;
  startPosition: number;
  endPosition: number;
}

const WEBHOOK_URL = "https://ssn8nss.maettiai.tech/webhook-test/8e34aca2-3111-488c-8ee8-a0a2c63fc9e4";

// Highlight color options
const highlightColors = [
  { label: "Amarillo", value: "#FEF7CD" },
  { label: "Verde", value: "#F2FCE2" },
  { label: "Naranja", value: "#FEC6A1" },
  { label: "Azul", value: "#D3E4FD" },
  { label: "Rosa", value: "#FFDEE2" },
  { label: "Morado", value: "#E5DEFF" },
];

export function RecordingDetails({
  recording,
  isOpen: propIsOpen,
  onOpenChange
}: RecordingDetailsProps) {
  const {
    updateRecording,
    deleteRecording,
    folders
  } = useRecordings();
  
  const { llama3, isLoading: isGroqLoading } = useGroq();
  
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(recording.name);
  const [isOpen, setIsOpenState] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(recording.folderId);
  const [isEditingOutput, setIsEditingOutput] = useState(false);
  const [editedOutput, setEditedOutput] = useState(recording.output || "");
  const [isGeneratingOutput, setIsGeneratingOutput] = useState(false);
  const [activeTab, setActiveTab] = useState("webhook");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const transcriptionRef = useRef<HTMLPreElement>(null);
  
  // Highlighting functionality
  const [highlights, setHighlights] = useState<TextHighlight[]>(recording.highlights || []);
  const [selectedText, setSelectedText] = useState("");
  const [selectedColor, setSelectedColor] = useState(highlightColors[0].value);
  const [selectionRange, setSelectionRange] = useState<{start: number, end: number} | null>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [highlightMenuPosition, setHighlightMenuPosition] = useState({ x: 0, y: 0 });
  const selectionRef = useRef<Selection | null>(null);

  const dialogOpen = propIsOpen !== undefined ? propIsOpen : isOpen;
  const setDialogOpen = onOpenChange || setIsOpenState;
  
  const folder = folders.find(f => f.id === recording.folderId) || folders[0];
  
  // Load audio blob from storage when component mounts
  useEffect(() => {
    const loadAudio = async () => {
      try {
        const blob = await loadAudioFromStorage(recording.id);
        if (blob) {
          setAudioBlob(blob);
        }
      } catch (error) {
        console.error("Error loading audio from storage:", error);
      }
    };
    
    loadAudio();
  }, [recording.id]);
  
  // Save audio blob to storage if it's available from URL
  useEffect(() => {
    const saveAudio = async () => {
      if (recording.audioUrl && !audioBlob) {
        try {
          const response = await fetch(recording.audioUrl);
          if (response.ok) {
            const blob = await response.blob();
            await saveAudioToStorage(recording.id, blob);
            setAudioBlob(blob);
          }
        } catch (error) {
          console.error("Error saving audio to storage:", error);
        }
      }
    };
    
    saveAudio();
  }, [recording.audioUrl, recording.id, audioBlob]);
  
  // Search functionality
  const handleSearch = () => {
    if (!searchQuery.trim() || !recording.output) return;
    
    const query = searchQuery.toLowerCase();
    const text = recording.output.toLowerCase();
    const results: number[] = [];
    let position = -1;
    
    while ((position = text.indexOf(query, position + 1)) !== -1) {
      results.push(position);
    }
    
    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
    
    if (results.length === 0) {
      toast.info("No se encontraron resultados");
    } else {
      scrollToHighlight(results[0]);
    }
  };
  
  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    
    setCurrentSearchIndex(newIndex);
    scrollToHighlight(searchResults[newIndex]);
  };
  
  const scrollToHighlight = (position: number) => {
    if (!transcriptionRef.current) return;
    
    // Create a range to highlight and scroll to
    const range = document.createRange();
    const textNodes = getTextNodesIn(transcriptionRef.current);
    let currentPosition = 0;
    let targetNode = null;
    let targetOffset = 0;
    
    // Find the text node containing the position
    for (const node of textNodes) {
      if (currentPosition + node.textContent!.length > position) {
        targetNode = node;
        targetOffset = position - currentPosition;
        break;
      }
      currentPosition += node.textContent!.length;
    }
    
    if (targetNode) {
      // Set the range
      range.setStart(targetNode, targetOffset);
      range.setEnd(targetNode, targetOffset + searchQuery.length);
      
      // Clear any existing selection
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Scroll to the position
      targetNode.parentElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };
  
  // Helper function to get all text nodes in an element
  const getTextNodesIn = (node: Node): Text[] => {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      node, 
      NodeFilter.SHOW_TEXT, 
      null
    );
    
    let n: Node | null;
    while(n = walker.nextNode()) {
      textNodes.push(n as Text);
    }
    
    return textNodes;
  };
  
  // Highlight functionality
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === "") {
      setSelectedText("");
      setSelectionRange(null);
      setShowHighlightMenu(false);
      return;
    }
    
    if (transcriptionRef.current && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!transcriptionRef.current.contains(range.commonAncestorContainer)) {
        return;
      }
      
      // Get selected text
      const text = selection.toString().trim();
      setSelectedText(text);
      
      // Calculate selection position relative to the transcript text
      const textContent = recording.output || "";
      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(transcriptionRef.current);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const startPosition = preSelectionRange.toString().length;
      
      setSelectionRange({
        start: startPosition,
        end: startPosition + text.length
      });
      
      // Store selection for later use
      selectionRef.current = selection;
      
      // Show highlight menu
      const rect = range.getBoundingClientRect();
      setHighlightMenuPosition({
        x: rect.left + (rect.width / 2),
        y: rect.top - 10
      });
      setShowHighlightMenu(true);
    }
  };
  
  const applyHighlight = (color: string) => {
    if (!selectionRange || !selectedText) return;
    
    const newHighlight: TextHighlight = {
      id: crypto.randomUUID(),
      text: selectedText,
      color,
      startPosition: selectionRange.start,
      endPosition: selectionRange.end
    };
    
    const updatedHighlights = [...highlights, newHighlight];
    setHighlights(updatedHighlights);
    
    // Save highlights to recording
    updateRecording(recording.id, {
      highlights: updatedHighlights
    });
    
    // Clear selection
    setSelectedText("");
    setSelectionRange(null);
    setShowHighlightMenu(false);
    window.getSelection()?.removeAllRanges();
    
    toast.success("Texto resaltado guardado");
  };
  
  const removeHighlight = (highlightId: string) => {
    const updatedHighlights = highlights.filter(h => h.id !== highlightId);
    setHighlights(updatedHighlights);
    
    // Save updated highlights to recording
    updateRecording(recording.id, {
      highlights: updatedHighlights
    });
    
    toast.success("Resaltado eliminado");
  };
  
  // Render transcription with highlights
  const renderHighlightedText = () => {
    if (!recording.output) return null;
    
    const text = recording.output;
    const sortedHighlights = [...highlights].sort((a, b) => a.startPosition - b.startPosition);
    
    const segments: JSX.Element[] = [];
    let currentPosition = 0;
    
    // Process each highlight in order
    for (const highlight of sortedHighlights) {
      // Add unhighlighted text before this highlight
      if (highlight.startPosition > currentPosition) {
        segments.push(
          <span key={`text-${currentPosition}`}>
            {text.substring(currentPosition, highlight.startPosition)}
          </span>
        );
      }
      
      // Add the highlighted text
      segments.push(
        <mark 
          key={highlight.id}
          style={{ backgroundColor: highlight.color, position: 'relative', borderRadius: '2px' }}
          onDoubleClick={() => removeHighlight(highlight.id)}
          title="Doble clic para eliminar el resaltado"
        >
          {text.substring(highlight.startPosition, highlight.endPosition)}
        </mark>
      );
      
      currentPosition = highlight.endPosition;
    }
    
    // Add remaining text
    if (currentPosition < text.length) {
      segments.push(
        <span key={`text-end`}>
          {text.substring(currentPosition)}
        </span>
      );
    }
    
    return segments;
  };
  
  const getLanguageDisplay = (code?: string) => {
    const languages: Record<string, string> = {
      es: "Español",
      en: "English",
      fr: "Français"
    };
    return code ? languages[code] || code.toUpperCase() : "Español";
  };
  
  const handleSaveRename = () => {
    if (newName.trim() === "") {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    updateRecording(recording.id, {
      name: newName
    });
    setIsRenaming(false);
    toast.success("Nombre actualizado");
  };
  
  const handleCancelRename = () => {
    setNewName(recording.name);
    setIsRenaming(false);
  };
  
  const handleDelete = () => {
    deleteRecording(recording.id);
    setDialogOpen(false);
    toast.success("Grabación eliminada");
  };
  
  const handleFolderChange = (folderId: string) => {
    setSelectedFolder(folderId);
    updateRecording(recording.id, {
      folderId
    });
    toast.success("Carpeta actualizada");
  };

  const formatWebhookResponse = () => {
    if (!recording.webhookData) {
      return "No hay resumen y puntos fuertes disponibles";
    }
    
    try {
      if (typeof recording.webhookData === 'string') {
        return recording.webhookData;
      }
      
      return JSON.stringify(recording.webhookData, null, 2);
    } catch (error) {
      console.error("Error al formatear resumen:", error);
      return "Error al formatear el resumen y puntos fuertes";
    }
  };
  
  const handleSaveOutput = async () => {
    await sendToWebhook(WEBHOOK_URL, {
      type: "output_update",
      recordingId: recording.id,
      output: editedOutput,
      timestamp: new Date().toISOString()
    });
    
    updateRecording(recording.id, {
      output: editedOutput
    });
    setIsEditingOutput(false);
    toast.success("Contenido actualizado");
  };
  
  const handleCancelOutputEdit = () => {
    setEditedOutput(recording.output || "");
    setIsEditingOutput(false);
  };

  const generateOutputWithGroq = async () => {
    try {
      setIsGeneratingOutput(true);
      toast.info("Generando contenido con IA...");

      await sendToWebhook(WEBHOOK_URL, {
        type: "generating_output",
        recordingId: recording.id,
        audioUrl: recording.audioUrl,
        timestamp: new Date().toISOString()
      });

      const prompt = `Genera un análisis del siguiente audio. Destaca los puntos principales, las fechas importantes si las hay, y organiza la información de forma clara y coherente. Si hay temas educativos, enfócate en explicarlos de manera didáctica.

Por favor proporciona un análisis bien estructurado de aproximadamente 5-10 oraciones.`;

      const response = await llama3({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      if (response && response.choices && response.choices[0]?.message?.content) {
        const output = response.choices[0].message.content;
        
        await sendToWebhook(WEBHOOK_URL, {
          type: "generated_output",
          recordingId: recording.id,
          output: output,
          timestamp: new Date().toISOString()
        });
        
        updateRecording(recording.id, {
          output: output
        });
        
        setEditedOutput(output);
        
        toast.success("Contenido generado exitosamente");
      } else {
        const simpleOutput = `Contenido generado localmente: Este es un análisis básico de la grabación "${recording.name}" que contiene aproximadamente ${recording.audioData.length} caracteres.`;
        
        await sendToWebhook(WEBHOOK_URL, {
          type: "fallback_output",
          recordingId: recording.id,
          output: simpleOutput,
          error: "No se pudo obtener respuesta de la API",
          timestamp: new Date().toISOString()
        });
        
        updateRecording(recording.id, {
          output: simpleOutput
        });
        
        setEditedOutput(simpleOutput);
        
        toast.warning("Se generó un contenido básico debido a problemas con la API");
      }
    } catch (error) {
      console.error("Error al generar el contenido:", error);
      
      await sendToWebhook(WEBHOOK_URL, {
        type: "output_generation_error",
        recordingId: recording.id,
        error: String(error),
        timestamp: new Date().toISOString()
      });
      
      toast.error("Error al generar el contenido");
      
      const errorOutput = "No se pudo generar un análisis automático. Por favor, intente más tarde o edite manualmente el contenido.";
      setEditedOutput(errorOutput);
      updateRecording(recording.id, {
        output: errorOutput
      });
    } finally {
      setIsGeneratingOutput(false);
    }
  };

  const hasWebhookData = !!recording.webhookData;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-3xl w-[95vw] md:w-auto max-h-[90vh] flex flex-col dark:bg-[#001A29] dark:border-custom-secondary">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex-1 max-w-[calc(100%-40px)]">
              {isRenaming ? (
                <div className="flex items-center gap-2">
                  <Input 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    className="h-8 max-w-[200px]" 
                    autoFocus 
                  />
                  <Button variant="ghost" size="icon" onClick={handleSaveRename} className="h-7 w-7 p-0">
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleCancelRename} className="h-7 w-7 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[#005c5f] dark:text-[#f1f2f6] truncate">{recording.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => setIsRenaming(true)} className="h-7 w-7 p-0 flex-shrink-0">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive h-7 w-7 p-0 flex-shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="dark:bg-[#001A29] dark:border-custom-secondary max-w-[95vw] md:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar esta grabación?</AlertDialogTitle>
                  <AlertDialogDescription className="dark:text-gray-300">
                    Esta acción no se puede deshacer. Se eliminará permanentemente esta grabación.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="dark:bg-custom-secondary/40 dark:text-white dark:hover:bg-custom-secondary/60">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Detalles de la grabación y datos procesados
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-wrap items-center gap-2 mt-2 mb-2">
          <div className="flex items-center gap-2 w-full">
            <Label htmlFor="folder-select" className="min-w-20 flex items-center">
              <div 
                className="h-6 w-6 rounded-full flex items-center justify-center mr-2" 
                style={{ backgroundColor: folder.color }}
              >
                <Folder className="h-3 w-3 text-white" />
              </div>
              <span>Carpeta:</span>
            </Label>
            
            <Select 
              value={selectedFolder} 
              onValueChange={handleFolderChange}
            >
              <SelectTrigger 
                id="folder-select"
                className="h-9 w-full min-w-[200px] flex-1 dark:bg-custom-secondary/40 dark:border-custom-secondary"
              >
                <SelectValue placeholder="Seleccionar carpeta" />
              </SelectTrigger>
              <SelectContent className="dark:bg-[#001A29] dark:border-custom-secondary max-h-[300px]">
                {folders.map(f => (
                  <SelectItem key={f.id} value={f.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: f.color }}
                      />
                      <span className="truncate">{f.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {recording.subject && (
            <div className="flex items-center gap-1 ml-auto text-xs bg-muted px-2 py-1 rounded-full dark:bg-custom-secondary/40 dark:text-white">
              <Globe className="h-3 w-3" />
              <span>{recording.subject}</span>
            </div>
          )}
        </div>
        
        <Separator className="my-2 dark:bg-custom-secondary/40" />
        
        {/* Audio Player Section */}
        <div className="my-2">
          <AudioPlayer 
            audioUrl={recording.audioUrl} 
            audioBlob={audioBlob || undefined}
            initialDuration={recording.duration}
          />
        </div>
        
        <div className="flex-1 overflow-hidden pt-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="mb-4">
              <TabsTrigger value="webhook" className="flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                <span>Resumen y puntos fuertes</span>
                {hasWebhookData && (
                  <span className="bg-green-500 h-2 w-2 rounded-full ml-1"></span>
                )}
              </TabsTrigger>
              <TabsTrigger value="transcription" className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>Transcripción</span>
              </TabsTrigger>
            </TabsList>
            
            <ScrollArea className="flex-1 h-[60vh] md:h-[50vh] pr-2 overflow-y-auto">
              <div className="px-4 pb-16">
                <TabsContent value="webhook" className="h-full mt-0">
                  <div className="mb-4">
                    <h3 className="font-medium mb-2 dark:text-custom-accent text-[#005c5f] dark:text-[#f1f2f6]">
                      Resumen y puntos fuertes
                    </h3>
                    
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {hasWebhookData ? (
                        <pre className="whitespace-pre-wrap text-sm bg-muted/30 p-4 rounded-md dark:bg-custom-secondary/20 dark:text-white/90 overflow-x-auto max-h-[50vh] overflow-y-auto">
                          {formatWebhookResponse()}
                        </pre>
                      ) : (
                        <div className="bg-amber-50 text-amber-800 p-4 rounded-md text-sm">
                          <p>No hay resumen y puntos fuertes disponibles para esta grabación.</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {recording.suggestedEvents && recording.suggestedEvents.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-medium mb-2 dark:text-custom-accent">Eventos sugeridos</h3>
                      <ul className="space-y-1 ml-5 list-disc dark:text-white/90">
                        {recording.suggestedEvents.map((event, index) => (
                          <li key={index}>
                            <strong>{event.title}</strong>: {event.description}
                            {event.date && <span className="text-sm text-muted-foreground ml-2">({event.date})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="transcription" className="h-full mt-0">
                  <div className="mb-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="font-medium mb-2 dark:text-custom-accent text-[#005c5f] dark:text-[#f1f2f6]">
                        Transcripción del Audio
                      </h3>
                      <div className="flex gap-1 flex-wrap">
                        {isEditingOutput ? (
                          <>
                            <Button variant="ghost" size="sm" onClick={handleSaveOutput} className="h-7 py-0">
                              <Save className="h-3.5 w-3.5 mr-1" /> Guardar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleCancelOutputEdit} className="h-7 py-0">
                              <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setIsEditingOutput(true)} 
                              className="h-7 py-0"
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={generateOutputWithGroq}
                              disabled={isGeneratingOutput || isGroqLoading}
                              className="h-7 py-0"
                            >
                              {isGeneratingOutput ? 'Generando...' : 'Generar con IA'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Search functionality */}
                    <div className="flex items-center space-x-2 bg-muted/20 p-2 rounded-md mb-3">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Buscar en la transcripción..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-8 flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <Button size="sm" onClick={handleSearch} className="h-7 py-0 px-2">
                        Buscar
                      </Button>
                      {searchResults.length > 0 && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigateSearch('prev')} 
                            className="h-7 w-7 p-0"
                          >
                            &#8593;
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigateSearch('next')} 
                            className="h-7 w-7 p-0"
                          >
                            &#8595;
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            {currentSearchIndex + 1} de {searchResults.length}
                          </span>
                        </>
                      )}
                    </div>
                    
                    <div className="prose prose-sm dark:prose-invert max-w-none relative">
                      {isEditingOutput ? (
                        <Textarea 
                          value={editedOutput} 
                          onChange={e => setEditedOutput(e.target.value)}
                          className="min-h-[250px] whitespace-pre-wrap text-sm bg-muted/30 p-4 rounded-md dark:bg-custom-secondary/20 dark:text-white/90"
                        />
                      ) : (
                        <pre 
                          ref={transcriptionRef}
                          className="whitespace-pre-wrap text-sm bg-muted/30 p-4 rounded-md dark:bg-custom-secondary/20 dark:text-white/90 overflow-x-auto max-h-[50vh] overflow-y-auto"
                          onMouseUp={handleTextSelection}
                          onDoubleClick={handleTextSelection}
                        >
                          {recording.output ? renderHighlightedText() : "No hay transcripción disponible. Edita o genera contenido con IA."}
                        </pre>
                      )}
                      
                      {/* Color picker for highlighting */}
                      {showHighlightMenu && selectionRange && (
                        <div 
                          className="absolute z-50 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 p-2"
                          style={{
                            top: `${highlightMenuPosition.y}px`,
                            left: `${highlightMenuPosition.x}px`,
                            transform: 'translate(-50%, -100%)'
                          }}
                        >
                          <div className="text-xs mb-1 font-medium text-center">Resaltar texto</div>
                          <div className="flex gap-1 justify-center">
                            {highlightColors.map(color => (
                              <button
                                key={color.value}
                                className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                                style={{ backgroundColor: color.value }}
                                onClick={() => applyHighlight(color.value)}
                                title={color.label}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
        
        <DialogFooter>
          <Button onClick={() => setDialogOpen(false)} className="dark:bg-custom-primary dark:text-white dark:hover:bg-custom-primary/90 text-white">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
