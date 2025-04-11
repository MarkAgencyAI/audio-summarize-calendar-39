
import { Clock, Plus } from "lucide-react";
import { AudioChaptersList } from "@/components/AudioChapter";
import { ChaptersTabProps } from "../types";

export function ChaptersTab({
  data,
  onEditChapter,
  onDeleteChapter
}: ChaptersTabProps) {
  const formatTimeNoMs = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between p-2 bg-muted/20 rounded-md">
        <h3 className="text-sm font-medium">Capítulos de audio</h3>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">
            <Clock className="h-3 w-3 inline mr-1" />
            {formatTimeNoMs(data.currentAudioTime)} / {formatTimeNoMs(data.audioDuration)}
          </div>
        </div>
      </div>
      
      <div className="h-[40vh] overflow-y-auto bg-muted/20 rounded-md p-4">
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
    </div>
  );
}
