import { useState, useEffect, useRef } from "react";
import { Recording, useRecordings, AudioChapter, TextHighlight } from "@/context/RecordingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { FileText, Edit, Trash2, Save, X, Globe, Folder, MessageSquare, Sparkles, Search, PaintBucket, Bookmark, Clock, Plus, Scissors } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGroq } from "@/lib/groq";
import { sendToWebhook } from "@/lib/webhook";
import { extractWebhookOutput } from "@/lib/transcription-service";
import { AudioPlayer, AudioPlayerHandle } from "@/components/AudioPlayer";
import { loadAudioFromStorage, saveAudioToStorage } from "@/lib/storage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AudioChaptersList, AudioChaptersTimeline } from "./AudioChapter";
import { v4 as uuidv4 } from "uuid";
import { formatTime } from "@/lib/audio-utils";

interface RecordingDetailsProps {
  recording: Recording;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const chapterColors = [
  "#FEF7CD", // Amarillo
  "#F2FCE2", // Verde
  "#FEC6A1", // Naranja
  "#D3E4FD", // Azul
  "#FFDEE2", // Rosa
  "#E5DEFF", // Morado
];

const highlightColors = [
  { label: "Amarillo", value: "#FEF7CD" },
  { label: "Verde", value: "#F2FCE2" },
  { label: "Naranja", value: "#FEC6A1" },
  { label: "Azul", value: "#D3E4FD" },
  { label: "Rosa", value: "#FFDEE2" },
];

const WEBHOOK_URL = "https://ssn8nss.maettiai.tech/webhook-test/8e34aca2-3111-488c-8ee8-a0a2c63fc9e4";

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
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const transcriptionRef = useRef<HTMLPreElement>(null);
  
  const [highlights, setHighlights] = useState<TextHighlight[]>(recording.highlights || []);
  const [selectedText, setSelectedText] = useState("");
  const [selectedColor, setSelectedColor] = useState(highlightColors[0].value);
  const [selectionRange, setSelectionRange] = useState<{start: number, end: number} | null>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [highlightMenuPosition, setHighlightMenuPosition] = useState({ x: 0, y: 0 });
  const selectionRef = useRef<Selection | null>(null);
  
  const [chapters, setChapters] = useState<AudioChapter[]>(recording.chapters || []);
  const [showChapterDialog, setShowChapterDialog] = useState(false);
  const [currentChapter, setCurrentChapter] = useState<AudioChapter | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterColor, setNewChapterColor] = useState(chapterColors[0]);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(recording.duration || 0);
  const [activeChapterId, setActiveChapterId] = useState<string | undefined>(undefined);
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);
  
  const dialogOpen = propIsOpen !== undefined ? propIsOpen : isOpen;
  const setDialogOpen = onOpenChange || setIsOpenState;
  
  const folder = folders.find(f => f.id === recording.folderId) || folders[0];
  
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
      setTimeout(() => scrollToHighlight(results[0], false), 100);
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
    setTimeout(() => scrollToHighlight(searchResults[newIndex], false), 100);
  };
  
  const scrollToHighlight = (position: number, shouldScroll = true) => {
    if (!transcriptionRef.current) return;
    
    const range = document.createRange();
    const textNodes = getTextNodesIn(transcriptionRef.current);
    let currentPosition = 0;
    let targetNode = null;
    let targetOffset = 0;
    
    for (const node of textNodes) {
      if (currentPosition + node.textContent!.length > position) {
        targetNode = node;
        targetOffset = position - currentPosition;
        break;
      }
      currentPosition += node.textContent!.length;
    }
    
    if (targetNode) {
      range.setStart(targetNode, targetOffset);
      range.setEnd(targetNode, targetOffset + searchQuery.length);
      
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      if (shouldScroll) {
        const parentElement = targetNode.parentElement;
        if (parentElement) {
          const container = transcriptionRef.current.closest('.overflow-y-auto');
          if (container) {
            const nodeRect = parentElement.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            const scrollTop = parentElement.offsetTop - (container.clientHeight / 2) + (nodeRect.height / 2);
            container.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });
          }
        }
      }
    }
  };
  
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
  
  const getHighlightAtPosition = (position: number): TextHighlight | null => {
    return highlights.find(h => 
      position >= h.startPosition && position <= h.endPosition
    ) || null;
  };
  
  const getOverlappingHighlights = (start: number, end: number): TextHighlight[] => {
    return highlights.filter(h => 
      (start <= h.endPosition && end >= h.startPosition)
    );
  };
  
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
      
      const text = selection.toString().trim();
      setSelectedText(text);
      
      const textContent = recording.output || "";
      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(transcriptionRef.current);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const startPosition = preSelectionRange.toString().length;
      
      setSelectionRange({
        start: startPosition,
        end: startPosition + text.length
      });
      
      selectionRef.current = selection;
      
      const existingHighlight = getHighlightAtPosition(startPosition);
      
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
    
    const overlappingHighlights = getOverlappingHighlights(selectionRange.start, selectionRange.end);
    let updatedHighlights = [...highlights];
    
    if (overlappingHighlights.length > 0) {
      updatedHighlights = updatedHighlights.filter(
        highlight => !overlappingHighlights.some(oh => oh.id === highlight.id)
      );
    }
    
    const newHighlight: TextHighlight = {
      id: crypto.randomUUID(),
      text: selectedText,
      color,
      startPosition: selectionRange.start,
      endPosition: selectionRange.end
    };
    
    updatedHighlights.push(newHighlight);
    setHighlights(updatedHighlights);
    
    updateRecording(recording.id, {
      highlights: updatedHighlights
    });
    
    setSelectedText("");
    setSelectionRange(null);
    setShowHighlightMenu(false);
    window.getSelection()?.removeAllRanges();
    
    toast.success("Texto resaltado guardado");
  };
  
  const removeHighlight = (highlightId: string) => {
    const updatedHighlights = highlights.filter(h => h.id !== highlightId);
    setHighlights(updatedHighlights);
    
    updateRecording(recording.id, {
      highlights: updatedHighlights
    });
    
    toast.success("Resaltado eliminado");
  };
  
  const removeHighlightAtSelection = () => {
    if (!selectionRange) return;
    
    const overlappingHighlights = getOverlappingHighlights(selectionRange.start, selectionRange.end);
    
    if (overlappingHighlights.length > 0) {
      const updatedHighlights = highlights.filter(
        highlight => !overlappingHighlights.some(oh => oh.id === highlight.id)
      );
      
      setHighlights(updatedHighlights);
      updateRecording(recording.id, {
        highlights: updatedHighlights
      });
      
      toast.success("Resaltado eliminado");
    }
    
    setSelectedText("");
    setSelectionRange(null);
    setShowHighlightMenu(false);
    window.getSelection()?.removeAllRanges();
  };
  
  const renderHighlightedText = () => {
    if (!recording.output) return null;
    
    const text = recording.output;
    const sortedHighlights = [...highlights].sort((a, b) => a.startPosition - b.startPosition);
    
    const nonOverlappingHighlights = sortedHighlights.reduce((acc: TextHighlight[], highlight, index) => {
      const overlapsWithPrevious = acc.some(h => 
        (highlight.startPosition <= h.endPosition && highlight.endPosition >= h.startPosition)
      );
      
      if (!overlapsWithPrevious) {
        acc.push(highlight);
      }
      return acc;
    }, []);
    
    const segments: JSX.Element[] = [];
    let currentPosition = 0;
    
    for (const highlight of nonOverlappingHighlights) {
      if (highlight.startPosition > currentPosition) {
        segments.push(
          <span key={`text-${currentPosition}`}>
            {text.substring(currentPosition, highlight.startPosition)}
          </span>
        );
      }
      
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

  const toggleHighlightMode = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() !== "") {
      handleTextSelection();
    } else {
      toast.info("Selecciona texto para resaltar");
    }
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentAudioTime(time);
    
    const activeChapter = chapters.find(
      chapter => time >= chapter.startTime && (!chapter.endTime || time <= chapter.endTime)
    );
    
    if (activeChapter && activeChapter.id !== activeChapterId) {
      setActiveChapterId(activeChapter.id);
    } else if (!activeChapter && activeChapterId) {
      setActiveChapterId(undefined);
    }
  };

  const handleAddChapter = (startTime: number, endTime: number) => {
    setNewChapterTitle(`Capítulo ${chapters.length + 1}`);
    setNewChapterColor(chapterColors[chapters.length % chapterColors.length]);
    setCurrentChapter({
      id: uuidv4(),
      title: `Capítulo ${chapters.length + 1}`,
      startTime: startTime,
      endTime: endTime,
      color: chapterColors[chapters.length % chapterColors.length]
    });
    setShowChapterDialog(true);
  };

  const handleEditChapter = (chapter: AudioChapter) => {
    setCurrentChapter(chapter);
    setNewChapterTitle(chapter.title);
    setNewChapterColor(chapter.color);
    setShowChapterDialog(true);
  };

  const handleDeleteChapter = (id: string) => {
    const updatedChapters = chapters.filter(chapter => chapter.id !== id);
    setChapters(updatedChapters);
    
    updateRecording(recording.id, {
      chapters: updatedChapters
    });
    
    toast.success("Capítulo eliminado");
  };

  const handleSaveChapter = () => {
    if (!newChapterTitle.trim()) {
      toast.error("El título no puede estar vacío");
      return;
    }
    
    let updatedChapters: AudioChapter[];
    
    if (currentChapter) {
      if (chapters.some(ch => ch.id === currentChapter.id)) {
        // Editing existing chapter
        updatedChapters = chapters.map(chapter => 
          chapter.id === currentChapter.id 
            ? { 
                ...chapter, 
                title: newChapterTitle, 
                color: newChapterColor,
                startTime: currentChapter.startTime,
                endTime: currentChapter.endTime
              }
            : chapter
        );
      } else {
        // Adding new chapter with predefined start and end times
        updatedChapters = [...chapters, {
          ...currentChapter,
          title: newChapterTitle,
          color: newChapterColor
        }];
      }
    } else {
      // Legacy handling for button click (not fragment selection)
      const newChapter: AudioChapter = {
        id: uuidv4(),
        title: newChapterTitle,
        startTime: currentAudioTime,
        color: newChapterColor
      };
      
      if (chapters.length > 0) {
        updatedChapters = [...chapters];
        const lastChapterIndex = chapters.length - 1;
        updatedChapters[lastChapterIndex] = {
          ...updatedChapters[lastChapterIndex],
          endTime: currentAudioTime
        };
        updatedChapters.push(newChapter);
      } else {
        updatedChapters = [newChapter];
      }
    }
    
    updatedChapters.sort((a, b) => a.startTime - b.startTime);
    
    setChapters(updatedChapters);
    
    updateRecording(recording.id, {
      chapters: updatedChapters
    });
    
    setShowChapterDialog(false);
    toast.success(currentChapter && chapters.some(ch => ch.id === currentChapter.id) 
      ? "Capítulo actualizado" 
      : "Capítulo creado");
  };

  const handleChapterClick = (chapter: AudioChapter) => {
    if (audioPlayerRef.current && audioPlayerRef.current.seekTo) {
      audioPlayerRef.current.seekTo(chapter.startTime);
      setActiveChapterId(chapter.id);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-4xl w-[95vw] md:w-auto max-h-[90vh] flex flex-col dark:bg-[#001A29] dark:border-custom-secondary">
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
        
        <div className="my-2">
          <AudioPlayer 
            audioUrl={recording.audioUrl} 
            audioBlob={audioBlob || undefined}
            initialDuration={recording.duration}
            onTimeUpdate={handleTimeUpdate}
            ref={audioPlayerRef}
            onDurationChange={setAudioDuration}
            onAddChapter={handleAddChapter}
          />
          
          <AudioChaptersTimeline 
            chapters={chapters}
            duration={audioDuration}
            currentTime={currentAudioTime}
            onChapterClick={handleChapterClick}
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
              <TabsTrigger value="chapters" className="flex items-center gap-1">
                <Bookmark className="h-4 w-4" />
                <span>Capítulos</span>
                <span className="bg-blue-500 text-xs text-white rounded-full h-5 w-5 flex items-center justify-center ml-1">
                  {chapters.length}
                </span>
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden">
              <div className="h-[60vh] md:h-[50vh] overflow-hidden">
                <TabsContent value="webhook" className="h-full mt-0 overflow-hidden">
                  <div className="h-full overflow-hidden">
                    <div className="mb-4">
                      <h3 className="font-medium mb-2 dark:text-custom-accent text-[#005c5f] dark:text-[#f1f2f6]">
                        Resumen y puntos fuertes
                      </h3>
                      
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {hasWebhookData ? (
                          <ScrollArea className="bg-muted/30 p-4 rounded-md dark:bg-custom-secondary/20 dark:text-white/90 h-[40vh] overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-sm">{formatWebhookResponse()}</pre>
                          </ScrollArea>
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
                        <ScrollArea className="max-h-[15vh] overflow-y-auto">
                          <ul className="space-y-1 ml-5 list-disc dark:text-white/90">
                            {recording.suggestedEvents.map((event, index) => (
                              <li key={index}>
                                <strong>{event.title}</strong>: {event.description}
                                {event.date && <span className="text-sm text-muted-foreground ml-2">({event.date})</span>}
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="transcription" className="h-full mt-0 overflow-hidden">
                  <div className="h-full overflow-hidden">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium dark:text-custom-accent text-[#005c5f] dark:text-[#f1f2f6]">
                          Transcripción del Audio
                        </h3>
                        
                        <div className="flex gap-2">
                          {isEditingOutput ? (
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleSaveOutput} 
                                className="h-8 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
                              >
                                <Save className="h-4 w-4 mr-1.5" />
                                <span>Guardar</span>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleCancelOutputEdit} 
                                className="h-8"
                              >
                                <X className="h-4 w-4 mr-1.5" />
                                <span>Cancelar</span>
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setIsEditingOutput(true)} 
                                className="h-8"
                              >
                                <Edit className="h-4 w-4 mr-1.5" />
                                <span>Editar</span>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={generateOutputWithGroq}
                                disabled={isGeneratingOutput}
                                className="h-8 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400"
                              >
                                <Sparkles className="h-4 w-4 mr-1.5" />
                                <span>{isGeneratingOutput ? "Generando..." : "Generar con IA"}</span>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={toggleHighlightMode}
                                className="h-8 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400"
                              >
                                <PaintBucket className="h-4 w-4 mr-1.5" />
                                <span>Resaltar</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-custom-secondary/10 rounded-md p-2">
                          <div className="flex-1 relative">
                            <Input
                              placeholder="Buscar en la transcripción..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                              className="pr-10"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleSearch}
                              className="h-8 w-8 absolute right-0.5 top-0.5"
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {searchResults.length > 0 && (
                            <div className="flex items-center gap-1 bg-white dark:bg-custom-secondary/20 rounded-md px-2 py-1 border">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigateSearch('prev')}
                                className="h-7 w-7 p-0"
                              >
                                &lt;
                              </Button>
                              <span className="text-sm">
                                {currentSearchIndex + 1} de {searchResults.length}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigateSearch('next')}
                                className="h-7 w-7 p-0"
                              >
                                &gt;
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {isEditingOutput ? (
                          <Textarea
                            value={editedOutput}
                            onChange={(e) => setEditedOutput(e.target.value)}
                            className="min-h-[40vh] font-mono text-sm resize-none"
                            placeholder="Escribe la transcripción aquí..."
                          />
                        ) : (
                          <div className="bg-white dark:bg-custom-secondary/10 border rounded-md shadow-sm">
                            <ScrollArea className="h-[40vh] p-4 overflow-y-auto">
                              {recording.output ? (
                                <pre
                                  ref={transcriptionRef}
                                  className="whitespace-pre-wrap text-sm font-sans"
                                  onMouseUp={handleTextSelection}
                                >
                                  {renderHighlightedText()}
                                </pre>
                              ) : (
                                <div className="text-center text-muted-foreground py-8">
                                  <p className="mb-4">No hay transcripción disponible para esta grabación.</p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={generateOutputWithGroq}
                                    className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400"
                                    disabled={isGeneratingOutput}
                                  >
                                    <Sparkles className="h-4 w-4 mr-1.5" />
                                    {isGeneratingOutput ? "Generando..." : "Generar con IA"}
                                  </Button>
                                </div>
                              )}
                            </ScrollArea>
                            
                            {recording.output && recording.output.length > 0 && (
                              <div className="border-t px-4 py-2 flex justify-between items-center text-xs text-muted-foreground">
                                <span>{recording.output.length} caracteres</span>
                                <span>Última actualización: {new Date(recording.updatedAt || recording.createdAt || recording.date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {showHighlightMenu && (
                        <div
                          className="absolute bg-white dark:bg-[#002a42] border border-border rounded-md shadow-lg p-2 z-50 flex gap-2"
                          style={{
                            left: `${highlightMenuPosition.x}px`,
                            top: `${highlightMenuPosition.y - 40}px`,
                            transform: "translateX(-50%)"
                          }}
                        >
                          {highlightColors.map((color) => (
                            <button
                              key={color.value}
                              onClick={() => applyHighlight(color.value)}
                              className="w-6 h-6 rounded-full cursor-pointer border border-gray-300"
                              style={{ backgroundColor: color.value }}
                              title={color.label}
                            />
                          ))}
                          <button
                            onClick={removeHighlightAtSelection}
                            className="w-6 h-6 rounded-full cursor-pointer border border-gray-300 flex items-center justify-center bg-white dark:bg-[#001a29] dark:text-white"
                            title="Eliminar resaltado"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="chapters" className="h-full mt-0 overflow-hidden">
                  <div className="h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium dark:text-custom-accent text-[#005c5f] dark:text-[#f1f2f6]">
                        Capítulos
                      </h3>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toast.info("Selecciona un fragmento en la forma de onda y luego haz clic en 'Crear capítulo con selección'")}
                          className="flex items-center h-8"
                        >
                          <Scissors className="h-4 w-4 mr-1.5" />
                          <span>Instrucciones</span>
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-custom-secondary/10 border rounded-md shadow-sm">
                      <ScrollArea className="h-[40vh] p-4 overflow-y-auto">
                        <AudioChaptersList
                          chapters={chapters}
                          currentTime={currentAudioTime}
                          duration={audioDuration}
                          onChapterClick={handleChapterClick}
                          onChapterEdit={handleEditChapter}
                          onChapterDelete={handleDeleteChapter}
                          activeChapterId={activeChapterId}
                        />
                      </ScrollArea>
                      
                      {chapters.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                          <p className="mb-4">Aún no hay capítulos definidos para esta grabación.</p>
                          <p className="text-sm">Para crear un capítulo, selecciona un fragmento en la forma de onda y luego haz clic en "Crear capítulo con selección".</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
        
        {showChapterDialog && (
          <Dialog open={showChapterDialog} onOpenChange={setShowChapterDialog}>
            <DialogContent className="dark:bg-[#001A29] dark:border-custom-secondary max-w-[95vw] md:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {currentChapter && chapters.some(ch => ch.id === currentChapter.id) ? "Editar capítulo" : "Nuevo capítulo"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="chapter-title">Título</Label>
                  <Input
                    id="chapter-title"
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {chapterColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewChapterColor(color)}
                        className={`w-8 h-8 rounded-full cursor-pointer ${
                          newChapterColor === color ? "ring-2 ring-offset-2 ring-primary" : "border border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Tiempo de inicio</Label>
                  <div className="text-base font-mono bg-muted/50 p-2 rounded-md text-center dark:bg-custom-secondary/40">
                    {formatTime(currentChapter ? currentChapter.startTime : currentAudioTime)}
                  </div>
                </div>
                
                {currentChapter && currentChapter.endTime && (
                  <div className="space-y-2">
                    <Label>Tiempo de fin</Label>
                    <div className="text-base font-mono bg-muted/50 p-2 rounded-md text-center dark:bg-custom-secondary/40">
                      {formatTime(currentChapter.endTime)}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowChapterDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveChapter}>
                  {currentChapter && chapters.some(ch => ch.id === currentChapter.id) ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
