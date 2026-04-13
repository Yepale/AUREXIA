
import { GoogleGenAI, Type } from "@google/genai";
import { IdentificationResult, CoinData } from "../types";

const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || "";
      const isQuotaError = errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED");
      const isServiceError = errorMessage.includes("500") || errorMessage.includes("503");
      
      if ((isQuotaError || isServiceError) && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 2000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export interface PhysicalEstimate {
  weight: number;
  diameter: number;
  material: string;
}

const stripBase64Prefix = (base64: string) => {
  if (base64.startsWith('data:')) {
    return base64.split(',')[1];
  }
  return base64;
};

/**
 * Estimates physical properties using Gemini 3 Flash Vision.
 */
export const estimatePhysicalProperties = async (
  obverseBase64: string,
  reverseBase64: string
): Promise<PhysicalEstimate> => {
  return withRetry(async () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    
    const obverseData = stripBase64Prefix(obverseBase64);
    const reverseData = stripBase64Prefix(reverseBase64);
    
    const prompt = `Analiza estas imágenes de una moneda antigua (Anverso y Reverso). 
    Basándote en el desgaste, la pátina, el estilo iconográfico y el tipo de ceca probable, estima:
    1. Diámetro aproximado en milímetros (mm).
    2. Peso aproximado en gramos (g).
    3. Material predominante (Plata, Bronce, Oro, Vellón, Auricalco).
    
    Sé lo más preciso posible dentro de los rangos numismáticos históricos.
    Devuelve solo JSON con este formato: {"weight": number, "diameter": number, "material": string}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: obverseData } },
          { inlineData: { mimeType: 'image/png', data: reverseData } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weight: { type: Type.NUMBER },
            diameter: { type: Type.NUMBER },
            material: { type: Type.STRING }
          },
          required: ["weight", "diameter", "material"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data received from AI");
    return JSON.parse(text) as PhysicalEstimate;
  });
};

/**
 * Identifies the coin with maximum precision using Gemini 3 Pro.
 */
export const identifyCoin = async (
  obverseBase64: string,
  reverseBase64: string,
  weight?: number,
  diameter?: number,
  material?: string
): Promise<IdentificationResult> => {
  return withRetry(async () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    
    const obverseData = stripBase64Prefix(obverseBase64);
    const reverseData = stripBase64Prefix(reverseBase64);
    
    const systemPrompt = `Eres AUREXIA, el experto numismático de clase mundial especializado en moneda Antigua Ibérica y Romana.
    Analiza las imágenes para identificar la pieza con precisión absoluta.
    Responde SIEMPRE en ESPAÑOL.
    
    Criterios:
    1. Iconografía detallada.
    2. Leyenda (latín, ibérico).
    3. Ceca exacta.
    4. Referencias (OCRE, RIC, RPC, CNH).
    5. Valoración de mercado en EUR.
    
    IMPORTANTE: Devuelve ÚNICAMENTE un objeto JSON válido.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: obverseData } },
          { inlineData: { mimeType: 'image/png', data: reverseData } },
          { text: `Identifica esta moneda. Metrología: Peso: ${weight || 'N/A'}g, Diámetro: ${diameter || 'N/A'}mm, Material: ${material || 'N/A'}.` }
        ]
      },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bestMatch: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                civilization: { type: Type.STRING },
                period: { type: Type.STRING },
                material: { type: Type.STRING },
                denomination: { type: Type.STRING },
                description: { type: Type.STRING },
                estimatedValue: { type: Type.STRING },
                referenceCodes: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["name", "civilization", "period", "description", "estimatedValue"]
            },
            alternatives: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING }
                }
              }
            },
            confidence: { type: Type.NUMBER }
          },
          required: ["bestMatch", "confidence"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No hay respuesta de la IA");
    return JSON.parse(text) as IdentificationResult;
  });
};

/**
 * Generates an epic historical chronicle for the coin.
 */
export const expandCoinDescription = async (
  coin: Partial<CoinData>,
  lang: string = 'ES'
): Promise<string> => {
  return withRetry(async () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Como arqueólogo e historiador premium de AUREXIA, expande la descripción de esta moneda: ${coin.name}. 
    Periodo: ${coin.period}. Civilización: ${coin.civilization}.
    
    Proporciona una crónica inmersiva que incluya:
    1. El contexto sociopolítico del gobernante o la ciudad de acuñación en su apogeo.
    2. Curiosidades técnicas sobre su acuñación o anécdotas de su circulación.
    3. Simbolismo profundo oculto en sus artes de anverso y reverso.
    
    Usa un tono épico pero académico. Divide el texto en párrafos cortos y elegantes. Idioma: Español.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "";
  });
};

/**
 * Generates a cinematic historical scene using Gemini 2.5 Flash Image.
 */
export const generateHistoricalScene = async (
  coin: Partial<CoinData>
): Promise<string> => {
  return withRetry(async () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `A cinematic, ultra-detailed historical reconstruction of the ancient environment of ${coin.civilization} during the ${coin.period}. The scene should evoke the atmosphere where the ${coin.name} was used. 16:9, masterwork, highly atmospheric.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: '16:9' } }
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Imagen no generada.");
  });
};

/**
 * Generates a cinematic video animation of the coin using Veo.
 */
export const generateCoinVideo = async (
  coin: Partial<CoinData>,
  obverseBase64: string,
  onStatusUpdate?: (msg: string) => void
): Promise<string> => {
  return withRetry(async () => {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    
    const obverseData = stripBase64Prefix(obverseBase64);
    
    onStatusUpdate?.("Iniciando reconstrucción cinematográfica...");
    
    const prompt = `Cinematic 3D slow-motion rotation of a rare ${coin.civilization} coin (${coin.name}) in a museum-lit environment. Particles of dust floating in a warm golden light beam. Cinematic orchestral ambiance. 1080p, masterpiece.`;
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: obverseData,
        mimeType: 'image/png'
      },
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    });

    const statusMessages = [
      "Forjando la luz...",
      "Renderizando texturas milenarias...",
      "Capturando la esencia del metal...",
      "Casi listo para el archivo imperial..."
    ];
    let msgIdx = 0;

    while (!operation.done) {
      onStatusUpdate?.(statusMessages[msgIdx % statusMessages.length]);
      msgIdx++;
      await new Promise(resolve => setTimeout(resolve, 8000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed");
    
    const response = await fetch(`${downloadLink}&key=${apiKey}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  });
};
