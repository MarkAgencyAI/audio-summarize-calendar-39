
// Export all components and types from the transcription module
export * from './types';
export * from './transcription-service';
export * from './audio-buffer-utils';

// Export the processAudio function from the transcription service
export { processAudio } from './transcription-service';

// Re-export the transcription service as the default export
import { TranscriptionService } from './transcription-service';
export default TranscriptionService;
