
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
    <Tabs value={data.activeTab} onValueChange={onTabChange}>
      <TabsList className="mb-6">
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
            {data.chapters.length}
          </span>
        </TabsTrigger>
      </TabsList>
      
      <div>
        <div className="max-h-[50vh]">
          <TabsContent value="webhook" className="h-full">
            <WebhookTab data={data} />
          </TabsContent>
          
          <TabsContent value="transcription" className="h-full">
            <TranscriptionTab 
              data={data} 
              onTextSelection={onTextSelection} 
            />
          </TabsContent>
          
          <TabsContent value="chapters" className="h-full">
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
