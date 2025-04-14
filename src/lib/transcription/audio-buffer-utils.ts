/**
 * Utilidades para trabajar con buffers de audio en el navegador
 */
import { AudioChunk } from './types';

/**
 * Obtiene la duración de un blob de audio
 */
export async function getAudioDuration(audioBlob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      URL.revokeObjectURL(audioUrl);
      resolve(duration);
    };
    
    audio.onerror = (error) => {
      URL.revokeObjectURL(audioUrl);
      reject(error);
    };
  });
}

/**
 * Divide un blob de audio en segmentos de duración máxima especificada
 * Versión mejorada que maneja audios más pesados de manera más eficiente
 */
export async function splitAudioIntoChunks(audioBlob: Blob, maxChunkDuration: number): Promise<AudioChunk[]> {
  try {
    console.log(`Dividiendo audio de ${(audioBlob.size / (1024 * 1024)).toFixed(2)}MB en segmentos de ${maxChunkDuration} segundos...`);
    
    // Convertir el blob a ArrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Crear un AudioContext para decodificar el audio
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Decodificar el audio completo
    console.log("Decodificando audio completo...");
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const sampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const duration = audioBuffer.duration;
    
    console.log(`Audio decodificado: ${duration.toFixed(2)} segundos, ${sampleRate}Hz, ${numberOfChannels} canales`);
    
    // Calcular número de chunks
    const numChunks = Math.ceil(duration / maxChunkDuration);
    console.log(`Dividiendo en ${numChunks} partes...`);
    
    const chunks: AudioChunk[] = [];
    
    // Procesamiento en bloques más pequeños para reducir uso de memoria
    for (let i = 0; i < numChunks; i++) {
      const startTime = i * maxChunkDuration;
      const endTime = Math.min((i + 1) * maxChunkDuration, duration);
      const chunkDuration = endTime - startTime;
      
      console.log(`Creando parte ${i + 1}/${numChunks}: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s (${chunkDuration.toFixed(2)}s)`);
      
      // Crear un nuevo buffer para el chunk con tamaño exacto
      const chunkSamples = Math.ceil(chunkDuration * sampleRate);
      const chunkBuffer = audioContext.createBuffer(
        numberOfChannels,
        chunkSamples,
        sampleRate
      );
      
      // Copiar los datos de cada canal, optimizado para memoria
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sourceData = audioBuffer.getChannelData(channel);
        const chunkData = chunkBuffer.getChannelData(channel);
        
        const startSample = Math.floor(startTime * sampleRate);
        
        // Usar transferencia directa de datos para optimizar memoria
        for (let j = 0; j < chunkSamples; j++) {
          if (startSample + j < sourceData.length) {
            chunkData[j] = sourceData[startSample + j];
          }
        }
      }
      
      // Compresión y optimización para reducir el tamaño del chunk
      let wavArrayBuffer: ArrayBuffer;
      try {
        // Usar opciones de compresión para WAV
        wavArrayBuffer = await bufferToWav(chunkBuffer, {
          float32: false,  // Usar int16 en lugar de float32 para reducir tamaño
          bitDepth: 16     // Profundidad de bits estándar
        });
      } catch (wavError) {
        console.error("Error en conversión WAV, usando método alternativo:", wavError);
        wavArrayBuffer = await bufferToWav(chunkBuffer);
      }
      
      // Crear blob y URL
      const chunkBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
      const chunkUrl = URL.createObjectURL(chunkBlob);
      
      console.log(`Parte ${i + 1} creada: ${(chunkBlob.size / 1024).toFixed(2)}KB, URL: ${chunkUrl}`);
      
      chunks.push({
        blob: chunkBlob,
        startTime,
        endTime
      });
      
      // Pequeña pausa para permitir recolección de basura
      if (i < numChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    console.log(`Segmentación completada: ${chunks.length} partes generadas`);
    return chunks;
  } catch (error) {
    console.error("Error crítico al dividir el audio:", error);
    throw error;
  }
}

/**
 * Convierte un AudioBuffer a formato WAV con opciones de compresión
 */
export function bufferToWav(
  buffer: AudioBuffer, 
  options: { float32?: boolean; bitDepth?: number } = {}
): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM format
    const bitDepth = options.bitDepth || 16;
    
    // Calcular tamaño del buffer
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * blockAlign;
    const headerSize = 44;
    const wavSize = headerSize + dataSize;
    
    // Crear cabecera WAV
    const wav = new ArrayBuffer(wavSize);
    const view = new DataView(wav);
    
    // Escribir cabecera "RIFF"
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    
    // Escribir chunk "fmt "
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    
    // Escribir chunk "data"
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Optimización: procesar por bloques para reducir uso de memoria
    const offset = headerSize;
    const chunkSize = 1024; // Procesar en bloques de 1024 muestras
    
    // Variable para seguir la posición actual en el buffer de salida
    let position = 0;
    
    // Procesar el audio en bloques
    for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex += chunkSize) {
      // Determinar el tamaño del bloque actual
      const currentChunkSize = Math.min(chunkSize, buffer.length - sampleIndex);
      
      // Procesar cada muestra en el bloque actual
      for (let i = 0; i < currentChunkSize; i++) {
        // Entrelazar los canales para formato WAV
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sample = buffer.getChannelData(channel)[sampleIndex + i];
          
          // Normalizar y aplicar un ligero volumen para evitar clipping
          const normalizedSample = Math.max(-1, Math.min(1, sample)) * 0.9;
          
          if (options.float32) {
            // Si se solicita float32, guardar como flotante (no estándar, pero útil para debugging)
            view.setFloat32(offset + position, normalizedSample, true);
            position += 4;
          } else {
            // Conversión estándar a formato PCM de 16 bits
            const int16Sample = normalizedSample < 0 
              ? normalizedSample * 0x8000 
              : normalizedSample * 0x7FFF;
            
            view.setInt16(offset + position, int16Sample, true);
            position += 2;
          }
        }
      }
    }
    
    resolve(wav);
  });
  
  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

/**
 * Comprime un blob de audio para optimizar su tamaño antes de enviarlo a la API
 */
export async function compressAudioBlob(audioBlob: Blob, options: {
  targetSampleRate?: number; 
  targetChannels?: number;
} = {}): Promise<Blob> {
  try {
    // Valores por defecto
    const targetSampleRate = options.targetSampleRate || 16000; // 16kHz es bueno para voz
    const targetChannels = options.targetChannels || 1; // Mono es suficiente para voz
    
    // Convertir blob a arrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Crear un AudioContext
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Decodificar el audio
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Si el audio ya está en el formato deseado, devolver el blob original
    if (audioBuffer.sampleRate === targetSampleRate && 
        audioBuffer.numberOfChannels === targetChannels) {
      return audioBlob;
    }
    
    // Crear un nuevo buffer con la configuración deseada
    const offlineContext = new OfflineAudioContext(
      targetChannels,
      audioBuffer.duration * targetSampleRate,
      targetSampleRate
    );
    
    // Crear un source desde el buffer original
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Aplicar un filtro lowpass para reducir ruido de alta frecuencia
    const lowpass = offlineContext.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 8000; // Frecuencia de corte para voz
    
    // Aplicar un compresor para nivelar volumen
    const compressor = offlineContext.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    
    // Conectar los nodos
    source.connect(lowpass);
    lowpass.connect(compressor);
    compressor.connect(offlineContext.destination);
    
    // Iniciar la fuente
    source.start(0);
    
    // Renderizar audio
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convertir el buffer procesado a WAV
    const wavArrayBuffer = await bufferToWav(renderedBuffer, { bitDepth: 16 });
    
    // Crear el blob comprimido
    const compressedBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
    
    console.log(`Audio comprimido: ${(audioBlob.size / 1024).toFixed(2)}KB -> ${(compressedBlob.size / 1024).toFixed(2)}KB (${Math.round((compressedBlob.size / audioBlob.size) * 100)}%)`);
    
    return compressedBlob;
  } catch (error) {
    console.error("Error comprimiendo audio:", error);
    // En caso de error, devolver el original
    return audioBlob;
  }
}
