
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
): Promise<{ blob: Blob; startTime: number; endTime: number; isProcessed?: boolean; transcript?: string; error?: string }[]> {
  const totalDuration = await getAudioDuration(audioBlob);
  
  // If the audio is shorter than the max chunk duration, return it as is
  if (totalDuration <= maxChunkDurationSeconds) {
    return [{
      blob: audioBlob,
      startTime: 0,
      endTime: totalDuration,
      isProcessed: false
    }];
  }
  
  // Calculate number of chunks needed
  const numberOfChunks = Math.ceil(totalDuration / maxChunkDurationSeconds);
  const chunks = [];
  
  // Create chunks of specified duration
  for (let i = 0; i < numberOfChunks; i++) {
    const startTime = i * maxChunkDurationSeconds;
    const endTime = Math.min(startTime + maxChunkDurationSeconds, totalDuration);
    
    chunks.push({
      blob: audioBlob.slice(i * (audioBlob.size / numberOfChunks), (i + 1) * (audioBlob.size / numberOfChunks)),
      startTime,
      endTime,
      isProcessed: false
    });
  }
  
  return chunks;
}

/**
 * Compress an audio blob to optimize for voice
 */
export async function compressAudioBlob(audioBlob: Blob): Promise<Blob> {
  // Por ahora devolvemos el blob original, la compresión se implementará después
  return audioBlob;
}
