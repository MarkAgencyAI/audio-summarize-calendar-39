
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
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
      className="weekly-time-slot"
      onClick={() => !event && onClick()}
    >
      {event ? (
        <div 
          className="weekly-event"
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
        <div className="weekly-add-slot">
          <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100" />
        </div>
      )}

      <style jsx>{`
        .weekly-time-slot {
          border-left: 1px solid var(--border);
          border-right: 1px solid var(--border);
          padding: 4px;
          cursor: pointer;
          min-height: 80px;
          transition: background-color 0.2s;
        }
        
        .weekly-time-slot:hover {
          background-color: var(--accent-light, rgba(0,0,0,0.05));
        }
        
        .weekly-event {
          height: 100%;
          padding: 8px;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .weekly-add-slot {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
