
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bookmark, MessageSquare, Sparkles } from "lucide-react";
import { RecordingTabsProps } from "./types";
import { TranscriptionTab } from "./tabs/TranscriptionTab";
import { WebhookTab } from "./tabs/WebhookTab";
import { ChaptersTab } from "./tabs/ChaptersTab";

export function RecordingTabs({
  data,
  onTabChange,
  onTextSelection,
  onEditChapter,
  onDeleteChapter
}: RecordingTabsProps) {
  const hasWebhookData = !!data.recording.webhookData;
  
  return (
    <Tabs value={data.activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="mb-4 sm:mb-6 grid grid-cols-3 gap-1 w-full">
        <TabsTrigger value="webhook" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-1 h-auto">
          <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="truncate">Resumen</span>
          {hasWebhookData && (
            <span className="bg-green-500 h-2 w-2 rounded-full ml-1 flex-shrink-0"></span>
          )}
        </TabsTrigger>
        <TabsTrigger value="transcription" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-1 h-auto">
          <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="truncate">Transcripción</span>
        </TabsTrigger>
        <TabsTrigger value="chapters" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-1 h-auto">
          <Bookmark className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="truncate">Capítulos</span>
          <span className="bg-blue-500 text-xs text-white rounded-full h-4 w-4 flex items-center justify-center ml-1 flex-shrink-0">
            {data.chapters.length}
          </span>
        </TabsTrigger>
      </TabsList>
      
      <div className="relative w-full">
        <div className="max-h-[50vh] overflow-hidden w-full">
          <TabsContent value="webhook" className="h-full mt-0 w-full">
            <WebhookTab data={data} />
          </TabsContent>
          
          <TabsContent value="transcription" className="h-full mt-0 w-full">
            <TranscriptionTab 
              data={data} 
              onTextSelection={onTextSelection} 
            />
          </TabsContent>
          
          <TabsContent value="chapters" className="h-full mt-0 w-full">
            <ChaptersTab 
              data={data}
              onEditChapter={onEditChapter}
              onDeleteChapter={onDeleteChapter}
            />
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
