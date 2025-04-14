
import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { eventTypeColors } from "@/components/Calendar";
import { WeeklyEventWithTemp } from "./WeeklyScheduleGrid";

interface TimeSlotProps {
  event: WeeklyEventWithTemp | undefined;
  onClick: () => void;
  onDelete: (tempId: string) => void;
  getFolderName: (folderId: string) => string;
}

export function TimeSlot({ event, onClick, onDelete, getFolderName }: TimeSlotProps) {
  return (
    <div 
      className="border-l border-r border-border p-1 cursor-pointer min-h-[80px] transition-colors hover:bg-accent/20 weekly-time-slot"
      onClick={() => !event && onClick()}
    >
      {event ? (
        <div 
          className="h-full p-2 rounded-md overflow-hidden weekly-event"
          style={{ 
            backgroundColor: `${eventTypeColors[event.type]}20`,
            borderLeft: `3px solid ${eventTypeColors[event.type]}`,
            color: eventTypeColors[event.type]
          }}
        >
          <div className="flex justify-between items-start">
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
          {/* Se ha eliminado el icono de Plus */}
        </div>
      )}
    </div>
  );
}
