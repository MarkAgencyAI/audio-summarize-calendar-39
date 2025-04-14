
/**
 * Get the duration of an audio blob in seconds
 */
export async function getAudioDuration(audioBlob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audioElement = new Audio();
    audioElement.src = URL.createObjectURL(audioBlob);
    
    audioElement.onloadedmetadata = () => {
      const duration = audioElement.duration;
      URL.revokeObjectURL(audioElement.src);
      resolve(duration);
    };
    
    audioElement.onerror = () => {
      console.error("Error loading audio for duration calculation");
      URL.revokeObjectURL(audioElement.src);
      // Return a default duration if we can't determine it
      resolve(0);
    };
  });
}

/**
 * Split an audio blob into multiple chunks of specified maximum duration
 */
export async function splitAudioIntoChunks(
  audioBlob: Blob, 
  maxChunkDurationSeconds: number
): Promise<{ blob: Blob; startTime: number; endTime: number }[]> {
  const totalDuration = await getAudioDuration(audioBlob);
  const chunks = [];
  
  // If the audio is shorter than the max chunk duration, return it as is
  if (totalDuration <= maxChunkDurationSeconds) {
    chunks.push({
      blob: audioBlob,
      startTime: 0,
      endTime: totalDuration
    });
    return chunks;
  }
  
  // TODO: Implement actual audio chunking if needed
  // Since this is complex and requires audio manipulation libraries,
  // we'll just return the full blob for now
  console.warn("Audio chunking not implemented yet, returning the full audio");
  chunks.push({
    blob: audioBlob,
    startTime: 0,
    endTime: totalDuration
  });
  
  return chunks;
}

/**
 * Compress an audio blob to optimize for speech
 */
export async function compressAudioBlob(audioBlob: Blob): Promise<Blob> {
  // TODO: Implement audio compression if needed
  // Since this requires additional libraries, we'll just return the original blob for now
  console.warn("Audio compression not implemented yet, returning the original audio");
  return audioBlob;
}
