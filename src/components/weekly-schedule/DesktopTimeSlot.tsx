
import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { eventTypeColors } from "@/components/Calendar";
import { WeeklyEventWithTemp } from "./WeeklyScheduleGrid";
import { parseISO, differenceInMinutes } from "date-fns";

interface DesktopTimeSlotProps {
  event: WeeklyEventWithTemp | undefined;
  onClick: () => void;
  onDelete: (tempId: string) => void;
  getFolderName: (folderId: string) => string;
}

export function DesktopTimeSlot({ event, onClick, onDelete, getFolderName }: DesktopTimeSlotProps) {
  const getEventHeight = () => {
    if (!event || !event.endDate) return 80;
    
    try {
      const startTime = parseISO(event.date);
      const endTime = parseISO(event.endDate);
      const durationInMinutes = differenceInMinutes(endTime, startTime);
      const hourHeight = 80;
      return (durationInMinutes / 60) * hourHeight;
    } catch (e) {
      return 80;
    }
  };

  return (
    <div 
      className="border-r border-b border-border p-0.5 cursor-pointer transition-colors hover:bg-accent/20 relative min-h-[80px]"
      onClick={() => !event && onClick()}
    >
      {event ? (
        <div 
          className="absolute left-0 right-0 mx-0.5 rounded-sm overflow-hidden z-10"
          style={{ 
            backgroundColor: `${eventTypeColors[event.type]}20`,
            borderLeft: `2px solid ${eventTypeColors[event.type]}`,
            color: eventTypeColors[event.type],
            height: `${getEventHeight()}px`,
            top: '2px'
          }}
        >
          <div className="flex justify-between items-start p-1">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-xs truncate">{event.title}</p>
              {event.folderId && (
                <p className="text-[10px] opacity-80 truncate">{getFolderName(event.folderId)}</p>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-4 w-4 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(event.tempId);
              }}
            >
              <Trash2 className="h-2 w-2" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
