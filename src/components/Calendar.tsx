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

// Add a formatDate function with safety checks and flexibility for arguments
export function formatDate(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  // If the input is null, undefined, or invalid, return a fallback string
  if (!date) return "Fecha desconocida";
  
  try {
    // Create a valid Date object
    const validDate = new Date(date);
    
    // Check if the date is valid
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
