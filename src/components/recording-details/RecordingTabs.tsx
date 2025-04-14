
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, FileText } from "lucide-react";
import { RecordingTabsProps } from "./types";
import { TranscriptionTab } from "./tabs/TranscriptionTab";
import { SummaryTab } from "./tabs/SummaryTab";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";

export function RecordingTabs({
  data,
  onTabChange,
  onTextSelection,
  onEditChapter,
  onDeleteChapter
}: RecordingTabsProps) {
  const hasSummaryData = !!data.recording.webhookData;
  const hasTranscription = !!data.recording.output && data.recording.output.trim().length > 0;
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    if (onTabChange) {
      onTabChange(value);
    }
  };
  
  // Set initial tab
  useEffect(() => {
    if (data.activeTab) {
      handleTabChange(data.activeTab);
    }
  }, []);
  
  return (
    <Tabs 
      defaultValue={data.activeTab} 
      onValueChange={handleTabChange}
      className="flex flex-col flex-grow"
    >
      <div className="px-4 pt-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <TabsList className="grid grid-cols-2 gap-1 w-full bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
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
        </TabsList>
      </div>
      
      <div className="flex-grow overflow-auto p-4">
        <TabsContent value="webhook" className="mt-0 h-full">
          <SummaryTab data={data} />
        </TabsContent>
        
        <TabsContent value="transcription" className="mt-0 h-full">
          <TranscriptionTab data={data} onTextSelection={onTextSelection} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
