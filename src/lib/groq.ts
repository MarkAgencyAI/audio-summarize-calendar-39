import { sendToWebhook } from "./webhook";
import { useState, useCallback } from "react";
import { GROQ_API, WEBHOOK } from './api-config';

// Interface para la respuesta de transcripción
interface TranscriptionResult {
  transcript: string;
  summary?: string;
  keyPoints?: string[];
  language?: string;
  subject?: string;
  translation?: string;
  speakerMode?: 'single' | 'multiple';
  suggestedEvents?: Array<{
    title: string;
    description: string;
    date?: string;
  }>;
  webhookResponse?: any;
  errors?: string[];
  duration?: number;
  processingTime?: number;
}

// Interface para la respuesta de GROQ API
interface GroqApiResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Interface para la respuesta de GROQ Audio API
interface GroqAudioResponse {
  text: string;
}

/**
 * Procesar audio para reducción de ruido y separación de voz
 * Nota: Esto es un preprocesamiento cliente antes de enviar a GROQ
 */
async function preprocessAudio(audioBlob: Blob, speakerMode: 'single' | 'multiple' = 'single'): Promise<Blob> {
  try {
    console.log(`Preprocesando audio para modo de orador: ${speakerMode}...`);
    
    // Convert blob to AudioBuffer para procesamiento
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Crear contexto offline para procesamiento
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    // Crear fuente desde buffer
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Crear filtros basados en el modo de orador
    const lowPassFilter = offlineContext.createBiquadFilter();
    const highPassFilter = offlineContext.createBiquadFilter();
    const compressor = offlineContext.createDynamicsCompressor();
    
    if (speakerMode === 'single') {
      // Para un solo orador: Foco más en el rango de frecuencia principal de la voz
      lowPassFilter.type = "lowpass";
      lowPassFilter.frequency.value = 4500; // Rango de frecuencia más estrecho para un solo orador
      
      highPassFilter.type = "highpass";
      highPassFilter.frequency.value = 100; // Umbral más alto para reducir el ruido de fondo
      
      // Comprimidor más agresivo para un solo orador para enfatizar la voz principal
      compressor.threshold.value = -45;
      compressor.knee.value = 35;
      compressor.ratio.value = 12;
      compressor.attack.value = 0;
      compressor.release.value = 0.2;
    } else {
      // Para múltiples oradores: Rango de frecuencia más amplio y menos compresión
      lowPassFilter.type = "lowpass";
      lowPassFilter.frequency.value = 6000; // Rango de frecuencia más amplio para capturar diferentes voces
      
      highPassFilter.type = "highpass";
      highPassFilter.frequency.value = 70; // Umbral más bajo para incluir más voces variadas
      
      // Comprimidor menos agresivo para múltiples oradores
      compressor.threshold.value = -55;
      compressor.knee.value = 40;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
    }
    
    // Conectar la gráfica de procesamiento de audio
    source.connect(highPassFilter);
    highPassFilter.connect(lowPassFilter);
    lowPassFilter.connect(compressor);
    compressor.connect(offlineContext.destination);
    
    // Iniciar fuente de audio
    source.start(0);
    
    // Renderizar audio
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convertir buffer de vuelta a blob
    const processedWav = await audioBufferToWav(renderedBuffer);
    
    console.log(`Audio preprocesado completado para modo de orador: ${speakerMode}`);
    return new Blob([processedWav], { type: 'audio/wav' });
  } catch (error) {
    console.error("Error preprocesando audio:", error);
    // Si el preprocesamiento falla, devolver audio original
    return audioBlob;
  }
}

/**
 * Función auxiliar para convertir AudioBuffer a formato WAV
 */
function audioBufferToWav(buffer: AudioBuffer): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // Formato PCM
    const bitDepth = 16;
    
    // Calcular tamaño del buffer
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * blockAlign;
    const headerSize = 44;
    const wavSize = headerSize + dataSize;
    
    // Crear encabezado WAV
    const wav = new ArrayBuffer(wavSize);
    const view = new DataView(wav);
    
    // Escribir encabezado "RIFF"
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    
    // Escribir encabezado "fmt "
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    
    // Escribir encabezado "data"
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Escribir datos de audio
    const offset = headerSize;
    const bufferData = new Float32Array(buffer.length * numberOfChannels);
    
    // Intercalar canales
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < buffer.length; i++) {
        bufferData[i * numberOfChannels + channel] = channelData[i];
      }
    }
    
    // Convertir y escribir datos de audio
    let index = 0;
    const volume = 0.9; // Evitar sobrecalentamiento
    for (let i = 0; i < bufferData.length; i++) {
      const sample = Math.max(-1, Math.min(1, bufferData[i])) * volume;
      view.setInt16(offset + index, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      index += 2;
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
 * Transcribir audio usando GROQ API - enfocarse en transcripción exacta
 */
export async function transcribeAudio(
  audioBlob: Blob, 
  subject?: string, 
  speakerMode: 'single' | 'multiple' = 'single'
): Promise<TranscriptionResult> {
  try {
    console.log(`Procesando audio con GROQ API en modo: ${speakerMode}...`);
    
    // Preprocesar audio con el modo de orador especificado
    const processedAudio = await preprocessAudio(audioBlob, speakerMode);
    
    // Analizar audio para verificar si contiene contenido real
    const audioBuffer = await processedAudio.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioData = await audioContext.decodeAudioData(audioBuffer);
    
    // Obtener muestras de audio para análisis
    const samples = audioData.getChannelData(0).slice(0, 4000);
    const hasAudioContent = samples.some(sample => Math.abs(sample) > 0.01);
    
    if (!hasAudioContent) {
      throw new Error("El audio no contiene suficiente contenido para transcribir");
    }
    
    // Variables para almacenar el tiempo de procesamiento y la duración
    const startTime = Date.now();
    const audioDuration = audioData.duration;
    
    // Paso 1: Crear formulario de datos para la API de transcripción de audio GROQ
    const formData = new FormData();
    formData.append("file", processedAudio, "audio.wav");
    formData.append("model", GROQ_API.MODELS.TRANSCRIPTION);
    formData.append("response_format", "verbose_json");
    
    // Crear un prompt basado en el modo de orador
    let prompt = "";
    if (speakerMode === 'single') {
      prompt = `Esta es una grabación con un solo orador principal, enfócate en capturar claramente la voz predominante`;
      if (subject) {
        prompt += ` sobre la materia ${subject}. Prioriza la claridad del discurso principal.`;
      }
    } else {
      prompt = `Esta es una grabación con múltiples oradores, intenta distinguir entre las diferentes voces`;
      if (subject) {
        prompt += ` que hablan sobre ${subject}. Identifica cuando cambia la persona que habla si es posible.`;
      }
    }
    
    formData.append("prompt", prompt);
    
    // Establecer explícitamente el idioma a español
    formData.append("language", "es");
    
    // Hacer la solicitud a la API de GROQ Audio para la transcripción - usando clave API centralizada
    console.log("Haciendo solicitud a la API de GROQ Audio Transcripción...");
    const transcriptResponse = await fetch(GROQ_API.TRANSCRIPTION_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API.KEY}`
      },
      body: formData
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error("GROQ API error response:", errorText);
      throw new Error(`GROQ API error: ${transcriptResponse.status} - ${errorText}`);
    }

    const transcriptData = await transcriptResponse.json();
    console.log("Respuesta de transcripción:", transcriptData);
    
    if (!transcriptData.text) {
      throw new Error("Invalid response from GROQ Audio API");
    }
    
    const transcript = transcriptData.text.trim();
    
    // Siempre establecer el idioma a español para este caso particular
    const language = "es"; 
    
    // Paso 2: Enviar la transcripción al webhook con metadatos del tema y modo de orador
    console.log("Enviando transcripción al webhook para procesamiento adicional...");
    const webhookResponseData = await sendToWebhook(WEBHOOK.URL, {
      transcript: transcript,
      language: language,
      subject: subject || "No subject specified",
      speakerMode: speakerMode,
      processed: true
    });
    
    console.log("Respuesta del webhook recibida:", webhookResponseData);
    
    // Calcular tiempo de procesamiento
    const processingTime = Date.now() - startTime;
    
    // Paso 3: Comprobar si la respuesta del webhook es válida
    let analysisResult = { summary: "", keyPoints: [], suggestedEvents: [] };
    
    if (webhookResponseData) {
      try {
        // Intentar extraer el análisis de la respuesta del webhook
        if (typeof webhookResponseData === 'string') {
          try {
            const parsed = JSON.parse(webhookResponseData);
            if (parsed.summary || parsed.keyPoints || parsed.suggestedEvents) {
              analysisResult = parsed;
            }
          } catch (e) {
            console.error("Error al parsear la respuesta del webhook:", e);
          }
        } else if (typeof webhookResponseData === 'object') {
          // Si ya es un objeto, verificar si tiene las propiedades esperadas
          if (webhookResponseData.summary || webhookResponseData.keyPoints || webhookResponseData.suggestedEvents) {
            analysisResult = webhookResponseData;
          } else if (webhookResponseData.output && typeof webhookResponseData.output === 'object') {
            // A veces el resultado está dentro de una propiedad 'output'
            if (webhookResponseData.output.summary || webhookResponseData.output.keyPoints || webhookResponseData.output.suggestedEvents) {
              analysisResult = webhookResponseData.output;
            }
          }
        }
      } catch (error) {
        console.error("Error procesando la respuesta del webhook:", error);
      }
    } else {
      console.warn("No se recibió respuesta del webhook o formato no reconocido.");
    }
    
    // Devolver resultado final
    return {
      transcript,
      summary: analysisResult.summary,
      keyPoints: analysisResult.keyPoints,
      suggestedEvents: analysisResult.suggestedEvents,
      language,
      subject,
      speakerMode,
      webhookResponse: webhookResponseData,
      duration: audioDuration,
      processingTime
    };
  } catch (error) {
    console.error("Error en transcribeAudio:", error);
    throw error;
  }
}

/**
 * Traducir la transcripción al idioma objetivo
 */
async function translateTranscript(text: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
  try {
    const systemPrompt = `
      You are a professional translator specializing in educational content.
      Translate the following text from ${sourceLanguage} to ${targetLanguage}.
      Maintain the educational tone and accurately translate technical terms.
      Only return the translated text, no explanations or notes.
    `;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: LLAMA3_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        max_tokens: 1500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      console.error(`Translation API error: ${response.status}`);
      return ""; // Devolver cadena vacía en caso de error
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
      return "";
    }
    
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error translating transcript:", error);
    return "";
  }
}

/**
 * Detectar el idioma de la transcripción de texto
 */
async function detectLanguage(text: string): Promise<string> {
  try {
    const systemPrompt = `
      You are a language detection assistant. Your task is to detect the language of the given text.
      Respond ONLY with the ISO 639-1 two-letter language code (e.g., "en" for English, "es" for Spanish, "fr" for French).
      Do not include any other text or explanation.
    `;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: LLAMA3_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Detect the language of this text: "${text.substring(0, 500)}..."` }
        ],
        max_tokens: 10,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      console.error(`Language detection API error: ${response.status}`);
      return "es"; // Default to Spanish on error
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
      return "es"; // Default to Spanish on error
    }
    
    // Extraer el código de idioma (debe ser solo "en", "es", etc.)
    const languageCode = data.choices[0].message.content.trim().toLowerCase();
    
    // Solo devolver si es un código de idioma de 2 letras válido
    if (/^[a-z]{2}$/.test(languageCode)) {
      return languageCode;
    }
    
    return "es"; // Default to Spanish if we can't parse the response
  } catch (error) {
    console.error("Error detecting language:", error);
    return "es"; // Default to Spanish on error
  }
}

/**
 * Generar un resumen y puntos clave a partir de la transcripción
 */
async function generateAnalysis(
  transcript: string, 
  language: string,
  speakerMode: 'single' | 'multiple' = 'single'
): Promise<{
  summary: string;
  keyPoints: string[];
  suggestedEvents: Array<{
    title: string;
    description: string;
    date?: string;
  }>;
}> {
  try {
    // Ajustar el prompt del sistema basado en el idioma detectado y el modo de orador
    let systemPrompt = "";
    
    if (language === "en") {
      systemPrompt = `You are an AI assistant that helps summarize educational content.
         Analyze the following transcript from an educational audio recording ${speakerMode === 'multiple' ? 'with multiple speakers' : 'with a single main speaker'}.
         ${speakerMode === 'multiple' ? 'Try to identify key points from different speakers if possible.' : 'Focus on the main speaker\'s key messages.'}
         Return your response as plain JSON with the following schema:
         {
           "summary": "detailed summary here (2-3 paragraphs)",
           "keyPoints": ["key point 1", "key point 2", "key point 3", "key point 4", "key point 5"],
           "suggestedEvents": [
             {
               "title": "Event Title",
               "description": "Event Description", 
               "date": "Date if mentioned (optional)"
             }
           ]
         }`;
    } else {
      systemPrompt = `Eres un asistente de IA que ayuda a resumir contenido educativo.
         Analiza la siguiente transcripción de una grabación de audio educativa ${speakerMode === 'multiple' ? 'con múltiples oradores' : 'con un solo orador principal'}.
         ${speakerMode === 'multiple' ? 'Intenta identificar puntos clave de los diferentes oradores si es posible.' : 'Concéntrate en los mensajes clave del orador principal.'}
         Devuelve tu respuesta como JSON plano con el siguiente esquema:
         {
           "summary": "resumen detallado aquí (2-3 párrafos)",
           "keyPoints": ["punto clave 1", "punto clave 2", "punto clave 3", "punto clave 4", "punto clave 5"],
           "suggestedEvents": [
             {
               "title": "Título del Evento",
               "description": "Descripción del Evento",
               "date": "Fecha si se menciona (opcional)"
             }
           ]
         }`;
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: LLAMA3_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript }
        ],
        max_tokens: 1000,
        temperature: 0.5,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`Analysis API error: ${response.status}`);
    }

    const analysisData = await response.json();
    
    if (!analysisData.choices || analysisData.choices.length === 0) {
      throw new Error("Invalid response from analysis API");
    }
    
    // Parsear el JSON de la respuesta
    try {
      const content = analysisData.choices[0].message.content;
      const result = JSON.parse(content);
      
      return {
        summary: result.summary || (language === "en" ? "Summary not available" : "Resumen no disponible"),
        keyPoints: result.keyPoints || [(language === "en" ? "No key points extracted" : "No se pudieron extraer puntos clave")],
        suggestedEvents: result.suggestedEvents || []
      };
    } catch (error) {
      console.error("Error parsing analysis response:", error);
      
      // Devolver valores de fallback en caso de error
      return {
        summary: language === "en" ? "Error generating summary" : "Error al generar resumen",
        keyPoints: [language === "en" ? "Error processing analysis" : "Error al procesar análisis"],
        suggestedEvents: []
      };
    }
  } catch (error) {
    console.error("Error generating analysis:", error);
    
    // Devolver valores de fallback en caso de error
    return {
      summary: "Error al generar análisis",
      keyPoints: ["Error al procesar la transcripción"],
      suggestedEvents: []
    };
  }
}

// Convertir un Blob a cadena base64 (función auxiliar)
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Hook para usar GROQ API en componentes React
export function useGroq() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para generar contenido usando el modelo llama3
  const llama3 = useCallback(async ({ 
    messages, 
    temperature = 0.7, 
    max_tokens = 800 
  }: { 
    messages: Array<{role: string, content: string}>,
    temperature?: number,
    max_tokens?: number
  }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(GROQ_API.CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API.KEY}`
        },
        body: JSON.stringify({
          model: GROQ_API.MODELS.CHAT,
          messages,
          max_tokens,
          temperature
        })
      });
      
      if (!response.ok) {
        throw new Error(`GROQ API error: ${response.status}`);
      }
      
      const data: GroqApiResponse = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error("Error in GROQ API call:", errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    llama3,
    isLoading,
    error
  };
}
