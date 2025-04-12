
import { useState } from "react";
import { Clock, Bookmark, Search, Plus, Edit, Trash2, Info } from "lucide-react";
import { ChaptersTabProps } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function ChaptersTab({
  data,
  onEditChapter,
  onDeleteChapter
}: ChaptersTabProps) {
  // State for chapter filtering
  const [searchTerm, setSearchTerm] = useState("");
  
  // Ensure chapters are available
  const allChapters = data.chapters || [];
  
  // Filter chapters based on search term
  const filteredChapters = searchTerm 
    ? allChapters.filter(chapter => 
        chapter.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allChapters;
  
  // Helper to format time without milliseconds
  const formatTimeNoMs = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  // Debug log to verify chapter data
  console.log("Chapters tab data:", {
    allChapters: allChapters.length,
    filteredChapters: filteredChapters.length,
    activeChapterId: data.activeChapterId,
    firstChapter: allChapters[0]
  });

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* Header with chapter info */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-md">
            <Bookmark className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
              Capítulos de audio
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {allChapters.length} {allChapters.length === 1 ? 'capítulo' : 'capítulos'} | 
              Duración total: {formatTimeNoMs(data.audioDuration)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
            <Clock className="h-3.5 w-3.5 mr-1" />
            <span>{formatTimeNoMs(data.currentAudioTime)}</span>
          </div>
        </div>
      </div>
      
      {/* Search and filters */}
      <div className="mb-4 flex gap-2 items-center flex-shrink-0">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            type="text"
            placeholder="Buscar capítulos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-slate-50 dark:bg-slate-800/50"
          />
          {searchTerm && (
            <button 
              className="absolute inset-y-0 right-3 flex items-center"
              onClick={() => setSearchTerm("")}
            >
              <span className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">×</span>
            </button>
          )}
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-1 h-9 border-dashed"
          onClick={() => {/* Will be handled by RecordingDetails component */}}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Crear</span>
        </Button>
      </div>
      
      {/* Chapter list */}
      <div className="flex-1 overflow-hidden min-h-0">
        {allChapters.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/30">
            <div className="w-16 h-16 mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Bookmark className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
            </div>
            <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">No hay capítulos</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
              Crea capítulos seleccionando fragmentos de audio en el reproductor 
              y utilizando el botón <span className="font-medium">Crear capítulo</span>.
            </p>
          </div>
        ) : filteredChapters.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/30">
            <Search className="h-8 w-8 text-slate-400 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              No se encontraron capítulos para "<span className="font-medium">{searchTerm}</span>"
            </p>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => setSearchTerm("")}
              className="mt-2"
            >
              Mostrar todos los capítulos
            </Button>
          </div>
        ) : (
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/30 h-full overflow-hidden">
            <ScrollArea className="h-full w-full p-1">
              <div className="space-y-2 p-2">
                {filteredChapters.map((chapter) => (
                  <div 
                    key={chapter.id}
                    className={cn(
                      "group relative p-3 rounded-md border border-slate-200 dark:border-slate-700 transition-colors",
                      chapter.id === data.activeChapterId ? 
                        "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50" : 
                        "hover:bg-slate-50 dark:hover:bg-slate-800/70"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Chapter color indicator */}
                      <div 
                        className="h-10 w-10 rounded-md flex-shrink-0 mt-1"
                        style={{ backgroundColor: chapter.color }}
                      />
                      
                      {/* Chapter details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-1 truncate pr-16">
                          {chapter.title}
                        </h4>
                        
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 space-x-3">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>
                              {formatTime(chapter.startTime)} - {chapter.endTime ? formatTime(chapter.endTime) : formatTime(data.audioDuration)}
                            </span>
                          </div>
                          
                          <div className="text-slate-400 dark:text-slate-500">
                            {formatTimeNoMs(chapter.endTime ? chapter.endTime - chapter.startTime : data.audioDuration - chapter.startTime)} duración
                          </div>
                        </div>
                      </div>
                      
                      {/* Controls */}
                      <div className="absolute top-3 right-3 flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditChapter(chapter);
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChapter(chapter.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
