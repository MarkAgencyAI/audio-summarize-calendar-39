
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
   * Check if a recording is currently being processed
   * @param id The ID of the recording to check
   * @returns True if the recording is being processed, false otherwise
   */
  public static isProcessing(id: string): boolean {
    return this.processingIds.has(id);
  }
}
