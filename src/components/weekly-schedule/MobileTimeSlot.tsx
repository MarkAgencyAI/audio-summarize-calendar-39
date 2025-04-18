
import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { eventTypeColors } from "@/components/Calendar";
import { WeeklyEventWithTemp } from "./WeeklyScheduleGrid";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MobileTimeSlotProps {
  event: WeeklyEventWithTemp | undefined;
  onClick: () => void;
  onDelete: (tempId: string) => void;
  getFolderName: (folderId: string) => string;
}

export function MobileTimeSlot({ event, onClick, onDelete, getFolderName }: MobileTimeSlotProps) {
  return (
    <div 
      className="h-14 border-l border-b border-border p-0.5 cursor-pointer transition-colors hover:bg-accent/20 relative"
      onClick={() => !event && onClick()}
    >
      {event ? (
        <div 
          className="absolute inset-0 mx-0.5 my-0.5 rounded-sm overflow-hidden"
          style={{ 
            backgroundColor: `${eventTypeColors[event.type]}15`,
            borderLeft: `2px solid ${eventTypeColors[event.type]}`,
          }}
        >
          <div className="flex justify-between items-start p-0.5 h-full">
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="font-medium text-[9px] truncate" style={{ color: eventTypeColors[event.type] }}>
                {event.title}
              </p>
              {event.folderId && (
                <p className="text-[7px] opacity-80 truncate" style={{ color: eventTypeColors[event.type] }}>
                  {getFolderName(event.folderId)}
                </p>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 opacity-50 hover:opacity-100 p-0 m-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(event.tempId);
                    }}
                  >
                    <Trash2 className="h-3 w-3" style={{ color: eventTypeColors[event.type] }} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Eliminar evento</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      ) : null}
    </div>
  );
}
