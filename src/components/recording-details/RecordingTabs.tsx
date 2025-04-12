
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, FileText, Bookmark } from "lucide-react";
import { RecordingTabsProps } from "./types";
import { TranscriptionTab } from "./tabs/TranscriptionTab";
import { WebhookTab } from "./tabs/WebhookTab";
import { ChaptersTab } from "./tabs/ChaptersTab";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect } from "react";

export function RecordingTabs({
  data,
  onTabChange,
  onTextSelection,
  onEditChapter,
  onDeleteChapter
}: RecordingTabsProps) {
  const hasWebhookData = !!data.recording.webhookData;
  const isMobile = useIsMobile();
  
  // Ensure chapters is initialized
  const chapters = data.chapters || [];
  
  // Debug para verificar si los datos están llegando correctamente
  useEffect(() => {
    console.log("RecordingTabs data:", {
      activeTab: data.activeTab,
      chapters: chapters.length,
      hasOutput: !!data.recording.output,
      hasWebhookData: hasWebhookData
    });
  }, [data, chapters, hasWebhookData]);
  
  return (
    <Tabs value={data.activeTab} onValueChange={onTabChange} className="h-full flex flex-col">
      <div className="px-4 pt-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <TabsList className="grid grid-cols-3 gap-1 w-full bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
          <TabsTrigger 
            value="webhook" 
            className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm rounded-md"
          >
            <Sparkles className="h-4 w-4" />
            <span className="truncate text-sm">Resumen</span>
            {hasWebhookData && (
              <span className="bg-green-500 h-2 w-2 rounded-full ml-1 flex-shrink-0"></span>
            )}
          </TabsTrigger>
          
          <TabsTrigger 
            value="transcription" 
            className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm rounded-md"
          >
            <FileText className="h-4 w-4" />
            <span className="truncate text-sm">Transcripción</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="chapters" 
            className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm rounded-md"
          >
            <Bookmark className="h-4 w-4" />
            <span className="truncate text-sm">Capítulos</span>
            <span className="text-xs text-white rounded-full h-5 w-5 flex items-center justify-center bg-blue-500">
              {chapters.length}
            </span>
          </TabsTrigger>
        </TabsList>
      </div>
      
      <div className="flex-grow overflow-hidden min-h-0">
        <TabsContent value="webhook" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
          <WebhookTab data={data} />
        </TabsContent>
        
        <TabsContent value="transcription" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
          <TranscriptionTab 
            data={data} 
            onTextSelection={onTextSelection} 
          />
        </TabsContent>
        
        <TabsContent value="chapters" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
          <ChaptersTab 
            data={data}
            onEditChapter={onEditChapter}
            onDeleteChapter={onDeleteChapter}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
