
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";
import { saveAudioToStorage } from "../storage";
import { supabase } from "@/integrations/supabase/client";
import { extractWebhookOutput } from "../transcription-service";

// Interface to represent recording data
export interface RecordingData {
  id?: string;
  name: string;
  date: string;
  duration: number;
  audioBlob?: Blob;
  output?: string;
  folderId?: string | null;
  language?: string;
  subject?: string;
  webhookData?: any;
  speakerMode?: 'single' | 'multiple';
  understood?: boolean;
}

// Interface for calendar events
export interface CalendarEventData {
  id?: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  type?: 'exam' | 'assignment' | 'study' | 'class' | 'meeting' | 'other';
  folderId?: string | null;
  repeat?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
  };
}

/**
 * Service for managing recordings with optimized saving logic
 */
export class RecordingService {
  // Track recordings that are currently being processed to prevent duplicates
  private static processingIds = new Set<string>();
  
  /**
   * Save a recording with all its associated data
   * @param recordingData The recording data to save
   * @returns The ID of the saved recording
   */
  public static async saveRecording(recordingData: RecordingData): Promise<string | null> {
    try {
      // Generate a unique ID for the recording if it doesn't already have one
      const recordingId = recordingData.id || uuidv4();
      
      // Check if this recording is already being processed
      if (this.processingIds.has(recordingId)) {
        console.log(`Recording ${recordingId} is already being processed. Skipping.`);
        return recordingId;
      }

      // Mark this recording as being processed
      this.processingIds.add(recordingId);
      
      console.log(`Saving recording ${recordingId} to database...`, recordingData);
      
      // Process webhook data if available
      let processedWebhookData = recordingData.webhookData;
      if (processedWebhookData) {
        processedWebhookData = extractWebhookOutput(processedWebhookData);
      }
      
      // Get current user information
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No authenticated user found");
      }
      
      // Save recording metadata to database
      const { data, error } = await supabase
        .from('recordings')
        .upsert({
          id: recordingId,
          name: recordingData.name,
          date: recordingData.date,
          duration: recordingData.duration,
          folder_id: recordingData.folderId,
          language: recordingData.language || 'es',
          subject: recordingData.subject || '',
          webhook_data: processedWebhookData,
          speaker_mode: recordingData.speakerMode || 'single',
          understood: recordingData.understood || false,
          output: recordingData.output || '',
          user_id: user.id // Include the user_id field which is required by the database
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving recording to database:", error);
        throw error;
      }
      
      // Save audio blob to local storage if available
      if (recordingData.audioBlob) {
        console.log(`Saving audio blob for recording ${recordingId} to local storage...`);
        await saveAudioToStorage(recordingId, recordingData.audioBlob);
      }
      
      console.log(`Recording ${recordingId} saved successfully.`);
      return recordingId;
      
    } catch (error) {
      console.error("Error in saveRecording:", error);
      toast.error("Error al guardar la grabación");
      return null;
    } finally {
      // Clean up - remove from processing set when done
      if (recordingData.id) {
        this.processingIds.delete(recordingData.id);
      }
    }
  }
  
  /**
   * Update an existing recording
   * @param id The ID of the recording to update
   * @param updateData The data to update
   * @returns Success status
   */
  public static async updateRecording(id: string, updateData: Partial<RecordingData>): Promise<boolean> {
    try {
      console.log(`Updating recording ${id}...`, updateData);
      
      // Process webhook data if available
      let processedWebhookData = updateData.webhookData;
      if (processedWebhookData) {
        processedWebhookData = extractWebhookOutput(processedWebhookData);
      }
      
      // Prepare the update data for Supabase (converting from camelCase to snake_case)
      const dbUpdateData: any = {};
      
      if (updateData.name !== undefined) dbUpdateData.name = updateData.name;
      if (updateData.duration !== undefined) dbUpdateData.duration = updateData.duration;
      if (updateData.output !== undefined) dbUpdateData.output = updateData.output;
      if (updateData.folderId !== undefined) dbUpdateData.folder_id = updateData.folderId;
      if (updateData.language !== undefined) dbUpdateData.language = updateData.language;
      if (updateData.subject !== undefined) dbUpdateData.subject = updateData.subject;
      if (processedWebhookData !== undefined) dbUpdateData.webhook_data = processedWebhookData;
      if (updateData.speakerMode !== undefined) dbUpdateData.speaker_mode = updateData.speakerMode;
      if (updateData.understood !== undefined) dbUpdateData.understood = updateData.understood;
      
      // Update the recording in the database
      const { error } = await supabase
        .from('recordings')
        .update(dbUpdateData)
        .eq('id', id);

      if (error) {
        console.error("Error updating recording:", error);
        throw error;
      }
      
      // Save audio blob to local storage if available
      if (updateData.audioBlob) {
        console.log(`Updating audio blob for recording ${id}...`);
        await saveAudioToStorage(id, updateData.audioBlob);
      }
      
      console.log(`Recording ${id} updated successfully.`);
      return true;
      
    } catch (error) {
      console.error("Error in updateRecording:", error);
      toast.error("Error al actualizar la grabación");
      return false;
    }
  }
  
  /**
   * Save a calendar event to the database
   * @param eventData The event data to save
   * @returns The ID of the saved event or null if an error occurred
   */
  public static async saveCalendarEvent(eventData: CalendarEventData): Promise<string | null> {
    try {
      // Generate a unique ID for the event if it doesn't already have one
      const eventId = eventData.id || uuidv4();
      
      console.log(`Saving calendar event ${eventId} to database...`, eventData);
      
      // Get current user information
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No authenticated user found");
      }
      
      // Convert the repeat object to JSON for storage
      const repeatData = eventData.repeat ? {
        frequency: eventData.repeat.frequency,
        interval: eventData.repeat.interval
      } : null;
      
      // Save event to database
      const { data, error } = await supabase
        .from('events')
        .upsert({
          id: eventId,
          title: eventData.title,
          description: eventData.description || '',
          date: eventData.date,
          end_date: eventData.endDate || null,
          type: eventData.type,
          folder_id: eventData.folderId || null,
          repeat_data: repeatData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving event to database:", error);
        throw error;
      }
      
      console.log(`Event ${eventId} saved successfully.`, data);
      return eventId;
      
    } catch (error) {
      console.error("Error in saveCalendarEvent:", error);
      toast.error("Error al guardar el evento");
      return null;
    }
  }
  
  /**
   * Delete a calendar event from the database
   * @param eventId The ID of the event to delete
   * @returns Success status
   */
  public static async deleteCalendarEvent(eventId: string): Promise<boolean> {
    try {
      console.log(`Deleting calendar event ${eventId}...`);
      
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
        
      if (error) {
        console.error("Error deleting event from database:", error);
        throw error;
      }
      
      console.log(`Event ${eventId} deleted successfully.`);
      return true;
      
    } catch (error) {
      console.error("Error in deleteCalendarEvent:", error);
      toast.error("Error al eliminar el evento");
      return false;
    }
  }
  
  /**
   * Delete a recording from the database
   * @param recordingId The ID of the recording to delete
   * @returns Success status
   */
  public static async deleteRecording(recordingId: string): Promise<boolean> {
    try {
      console.log(`Deleting recording ${recordingId}...`);
      
      if (!recordingId) {
        console.error("Cannot delete recording: Invalid ID");
        return false;
      }
      
      // Get current user information to ensure we're deleting our own recordings
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("Cannot delete recording: No authenticated user found");
        return false;
      }
      
      const { error } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recordingId)
        .eq('user_id', user.id);
        
      if (error) {
        console.error("Error deleting recording from database:", error);
        throw error;
      }
      
      console.log(`Recording ${recordingId} deleted successfully.`);
      return true;
      
    } catch (error) {
      console.error("Error in deleteRecording:", error);
      toast.error("Error al eliminar la grabación");
      return false;
    }
  }
  
  /**
   * Load all calendar events from the database for the current user
   * @returns Array of calendar events or empty array if an error occurred
   */
  public static async loadCalendarEvents(): Promise<CalendarEventData[]> {
    try {
      console.log("Loading calendar events from database...");
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });
        
      if (error) {
        console.error("Error loading events from database:", error);
        throw error;
      }
      
      // Map the database response to CalendarEventData objects, handling missing columns
      const events = data.map(event => {
        // Create a base event with required fields
        const calendarEvent: CalendarEventData = {
          id: event.id,
          title: event.title,
          description: event.description || '',
          date: event.date,
          type: ((event as any).type as 'exam' | 'assignment' | 'study' | 'class' | 'meeting' | 'other') || 'other'
        };
        
        // Add optional fields if they exist in the database response
        if ('end_date' in event) {
          calendarEvent.endDate = (event as any).end_date as string;
        }
        
        if ('folder_id' in event) {
          calendarEvent.folderId = (event as any).folder_id as string;
        }
        
        // Handle repeat data if it exists
        if ('repeat_data' in event && (event as any).repeat_data) {
          try {
            const repeatData = (event as any).repeat_data;
            if (repeatData && typeof repeatData === 'object' && 
                'frequency' in repeatData && 'interval' in repeatData) {
              calendarEvent.repeat = {
                frequency: repeatData.frequency as 'daily' | 'weekly' | 'monthly',
                interval: Number(repeatData.interval)
              };
            }
          } catch (e) {
            console.error("Error parsing repeat data:", e);
          }
        }
        
        return calendarEvent;
      });
      
      console.log(`Loaded ${events.length} events successfully.`);
      return events;
      
    } catch (error) {
      console.error("Error in loadCalendarEvents:", error);
      toast.error("Error al cargar los eventos");
      return [];
    }
  }
  
  /**
   * Check if a recording is currently being processed
   * @param id The ID of the recording to check
   * @returns True if the recording is being processed, false otherwise
   */
  public static isProcessing(id: string): boolean {
    return this.processingIds.has(id);
  }
}
