
import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { eventTypeColors } from "@/components/Calendar";
import { WeeklyEventWithTemp } from "./WeeklyScheduleGrid";
import { parseISO, differenceInMinutes } from "date-fns";

interface TimeSlotProps {
  event: WeeklyEventWithTemp | undefined;
  onClick: () => void;
  onDelete: (tempId: string) => void;
  getFolderName: (folderId: string) => string;
  rowHeight?: number;
}

export function TimeSlot({ event, onClick, onDelete, getFolderName, rowHeight = 80 }: TimeSlotProps) {
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
      className="border-l border-r border-border p-1 cursor-pointer min-h-[80px] transition-colors hover:bg-accent/20 weekly-time-slot relative"
      onClick={() => !event && onClick()}
    >
      {event ? (
        <div 
          className="absolute left-0 right-0 mx-1 rounded-md overflow-hidden weekly-event z-10"
          style={{ 
            backgroundColor: `${eventTypeColors[event.type]}20`,
            borderLeft: `3px solid ${eventTypeColors[event.type]}`,
            color: eventTypeColors[event.type],
            height: `${getEventHeight()}px`,
            top: '4px'
          }}
        >
          <div className="flex justify-between items-start p-2">
            <div>
              <p className="font-medium text-sm">{event.title}</p>
              {event.folderId && (
                <p className="text-xs opacity-80">{getFolderName(event.folderId)}</p>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(event.tempId);
              }}
            >
              <Trash2 className="h-3 w-3" />
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
