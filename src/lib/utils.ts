

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Format time from seconds to display as minutes:seconds
export function formatTimeFromSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Format duration in seconds to a human-readable string
export function formatDuration(durationInSeconds: number): string {
  if (!durationInSeconds && durationInSeconds !== 0) return "0:00";
  
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = Math.floor(durationInSeconds % 60);
  
  if (minutes < 60) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Add a formatDate function with robust safety checks and flexibility for arguments
export function formatDate(date: Date | string | number | undefined | null, options?: Intl.DateTimeFormatOptions): string {
  // If the input is null, undefined, or invalid, return a fallback string
  if (date === null || date === undefined || date === "") return "Fecha desconocida";
  
  try {
    // Create a valid Date object
    let validDate: Date;
    
    if (typeof date === 'string') {
      // Check if the string is a valid date format
      const timestamp = Date.parse(date);
      if (isNaN(timestamp)) {
        return "Fecha inválida";
      }
      validDate = new Date(timestamp);
    } else if (typeof date === 'number') {
      validDate = new Date(date);
    } else if (date instanceof Date) {
      validDate = date;
    } else {
      return "Fecha inválida";
    }
    
    // Additional check if the date is valid
    if (isNaN(validDate.getTime())) {
      return "Fecha inválida";
    }
    
    const defaultOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    } as Intl.DateTimeFormatOptions;
    
    // Use provided options or defaults
    const formatOptions = options || defaultOptions;
    
    return new Intl.DateTimeFormat('es', formatOptions).format(validDate);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Fecha inválida";
  }
}

// Add the cn utility function used by UI components
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
