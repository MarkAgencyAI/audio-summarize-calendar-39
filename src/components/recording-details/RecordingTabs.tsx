
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, FileText, Bookmark, Clock } from "lucide-react";
import { RecordingTabsProps } from "./types";
import { TranscriptionTab } from "./tabs/TranscriptionTab";
import { SummaryTab } from "./tabs/SummaryTab";
import { ChaptersTab } from "./tabs/ChaptersTab";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";

export function RecordingTabs({
  data,
  onTabChange,
  onTextSelection,
  onEditChapter,
  onDeleteChapter
}: RecordingTabsProps) {
  const hasSummaryData = !!data.recording.webhookData;
  const hasTranscription = !!data.recording.output && data.recording.output.trim().length > 0;
  const isMobile = useIsMobile();

  // Ensure chapters is initialized
  const chapters = data.chapters || [];
  
  return (
    <Tabs value={data.activeTab} onValueChange={onTabChange} className="h-full flex flex-col">
      <div className="px-4 pt-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <TabsList className="grid grid-cols-3 gap-1 w-full bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
          <TabsTrigger value="webhook" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm rounded-md">
            <Sparkles className="h-4 w-4" />
            <span className="truncate text-sm">Resumen</span>
            {hasSummaryData && <Badge variant="outline" className="h-4 min-w-4 p-0 flex items-center justify-center text-[10px] bg-green-500 text-white border-0">
                ✓
              </Badge>}
          </TabsTrigger>
          
          <TabsTrigger value="transcription" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm rounded-md">
            <FileText className="h-4 w-4" />
            <span className="truncate text-sm">Transcripción</span>
            {hasTranscription && <Badge variant="outline" className="h-4 min-w-4 p-0 flex items-center justify-center text-[10px] bg-blue-500 text-white border-0">
                ✓
              </Badge>}
          </TabsTrigger>
          
          <TabsTrigger value="chapters" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm rounded-md">
            <Bookmark className="h-4 w-4" />
            <span className="truncate text-sm">Capítulos</span>
            {chapters.length > 0 && <Badge variant="outline" className="h-5 min-w-5 p-0 flex items-center justify-center text-xs bg-emerald-500 text-white border-0">
                {chapters.length}
              </Badge>}
          </TabsTrigger>
        </TabsList>
      </div>
      
      <div className="flex-grow overflow-hidden min-h-0">
        {data.activeTab === 'webhook' && (
          <SummaryTab data={data} />
        )}
        
        {data.activeTab === 'transcription' && (
          <TranscriptionTab data={data} onTextSelection={onTextSelection} />
        )}
        
        {data.activeTab === 'chapters' && (
          <ChaptersTab data={data} onEditChapter={onEditChapter} onDeleteChapter={onDeleteChapter} />
        )}
      </div>
    </Tabs>
  );
}
