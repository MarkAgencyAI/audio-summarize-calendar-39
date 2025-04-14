
import React from "react";
import { WeeklyScheduleGrid } from "./WeeklyScheduleGrid";
import { CalendarEvent } from "@/components/Calendar";

interface WeeklyScheduleProps {
  date: Date;
  events: CalendarEvent[];
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  onCancel: () => void;
  hasExistingSchedule: boolean;
  existingEvents: CalendarEvent[];
  onSave: (events: Omit<CalendarEvent, "id">[]) => void;
  onAddEvent?: () => void;
}

export function WeeklySchedule(props: WeeklyScheduleProps) {
  return (
    <WeeklyScheduleGrid
      date={props.date}
      onSave={props.onSave}
      onCancel={props.onCancel}
      hasExistingSchedule={props.hasExistingSchedule}
      existingEvents={props.existingEvents}
    />
  );
}
