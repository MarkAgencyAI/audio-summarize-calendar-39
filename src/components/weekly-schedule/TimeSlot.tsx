import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { eventTypeColors } from "@/components/Calendar";
import { WeeklyEventWithTemp } from "./WeeklyScheduleGrid";
import { parseISO, differenceInMinutes } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

interface TimeSlotProps {
  event: WeeklyEventWithTemp | undefined;
  onClick: () => void;
  onDelete: (tempId: string) => void;
  getFolderName: (folderId: string) => string;
  rowHeight?: number;
}

export function TimeSlot({ event, onClick, onDelete, getFolderName, rowHeight = 80 }: TimeSlotProps) {
  const isMobile = useIsMobile();
  
  const getEventHeight = () => {
    if (!event || !event.endDate) return rowHeight;
    
    const startTime = parseISO(event.date);
    const endTime = parseISO(event.endDate);
    const durationInMinutes = differenceInMinutes(endTime, startTime);
    const hourHeight = rowHeight;
    return (durationInMinutes / 60) * hourHeight;
  };

  return (
    <div 
      className="border-l border-r border-border p-0.5 sm:p-1 cursor-pointer min-h-[80px] transition-colors hover:bg-accent/20 weekly-time-slot relative"
      onClick={() => !event && onClick()}
    >
      {event ? (
        <div 
          className="absolute left-0 right-0 mx-0.5 sm:mx-1 rounded-md overflow-hidden weekly-event z-10"
          style={{ 
            backgroundColor: `${eventTypeColors[event.type]}20`,
            borderLeft: `3px solid ${eventTypeColors[event.type]}`,
            color: eventTypeColors[event.type],
            height: `${getEventHeight()}px`,
            top: '4px'
          }}
        >
          <div className="flex justify-between items-start p-1 sm:p-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-xs sm:text-sm truncate">{event.title}</p>
              {event.folderId && !isMobile && (
                <p className="text-[10px] sm:text-xs opacity-80 truncate">{getFolderName(event.folderId)}</p>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-4 w-4 sm:h-6 sm:w-6 opacity-50 hover:opacity-100 ml-1"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(event.tempId);
              }}
            >
              <Trash2 className="h-2 w-2 sm:h-3 sm:w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="h-full weekly-add-slot">
          {/* Empty slot */}
        </div>
      )}
    </div>
  );
}
