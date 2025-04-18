
import React from "react";
import { addDays, startOfWeek } from "date-fns";
import { WeeklyEventWithTemp } from "./WeeklyScheduleGrid";
import { DailyScheduleCard } from "./DailyScheduleCard";

interface WeeklyGridDesktopProps {
  date: Date;
  events: WeeklyEventWithTemp[];
  onDayClick: (dayIndex: number) => void;
  onDeleteEvent: (tempId: string) => void;
  getFolderName: (folderId: string) => string;
}

export function WeeklyGridDesktop({ 
  date, 
  events, 
  onDayClick, 
  onDeleteEvent,
  getFolderName
}: WeeklyGridDesktopProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  
  // Generate week days from weekStart (Monday to Sunday)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 p-4">
      {weekDays.map((day, index) => (
        <DailyScheduleCard
          key={day.toString()}
          day={day}
          events={events}
          onDayClick={() => onDayClick(index)}
          onDeleteEvent={onDeleteEvent}
          getFolderName={getFolderName}
        />
      ))}
    </div>
  );
}
