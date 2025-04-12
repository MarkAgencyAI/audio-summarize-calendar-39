
import { Clock, Bookmark, PlayCircle } from "lucide-react";
import { AudioChaptersList } from "@/components/AudioChapter";
import { ChaptersTabProps } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

export function ChaptersTab({
  data,
  onEditChapter,
  onDeleteChapter
}: ChaptersTabProps) {
  const isMobile = useIsMobile();
  
  const formatTimeNoMs = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
            Capítulos de audio
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({data.chapters.length})
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {formatTimeNoMs(data.currentAudioTime)} / {formatTimeNoMs(data.audioDuration)}
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {data.chapters.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/30">
            <div className="w-16 h-16 mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Bookmark className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">No hay capítulos</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
              Crea capítulos seleccionando fragmentos de audio en el reproductor 
              y utilizando el botón <span className="font-medium">Crear capítulo</span>.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/30">
            <div className="p-2">
              <AudioChaptersList 
                chapters={data.chapters}
                currentTime={data.currentAudioTime}
                duration={data.audioDuration}
                onChapterClick={() => {}}
                onChapterDelete={onDeleteChapter}
                onChapterEdit={onEditChapter}
                activeChapterId={data.activeChapterId}
              />
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
