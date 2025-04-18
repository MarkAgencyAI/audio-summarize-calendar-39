
export interface AudioChapter {
  id: string;
  title: string;
  startTime: number;
  endTime?: number;
  color: string;
  recording_id: string;
}

export const defaultChapterColors = [
  "#3b82f6", // blue-500
  "#ef4444", // red-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
];
