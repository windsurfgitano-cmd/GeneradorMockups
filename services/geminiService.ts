import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface MockupResult {
  base64: string;
  mimeType: string;
}

/**
 * Generates a mockup image using a base image (logo) and a text prompt.
 * @param base64ImageData The base64 encoded string of the logo.
 * @param mimeType The MIME type of the logo (e.g., 'image/png').
 * @param prompt The text prompt describing the desired mockup scene.
 * @returns A promise that resolves to an object containing the base64 encoded string and mimeType of the generated mockup.
 */
export async function generateMockup(
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<MockupResult | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    // Find the image part in the response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        };
      }
    }
    
    // If no image is found, provide a more specific error based on the finish reason.
    const finishReason = response.candidates?.[0]?.finishReason;
    console.warn(`Image generation failed for prompt "${prompt}". Finish reason: ${finishReason}`, response);
    
    if (finishReason === 'NO_IMAGE') {
      throw new Error("La IA no pudo crear una imagen. Intenta regenerar.");
    }
    if (finishReason === 'SAFETY') {
      throw new Error("Bloqueado por políticas de seguridad.");
    }
    
    throw new Error("La IA no devolvió una imagen. Intenta de nuevo.");

  } catch (error) {
    console.error(`Error calling Gemini API for prompt "${prompt}":`, error);
    if (error instanceof Error) {
        // Re-throw the specific error message from the try block or a generic one.
        throw error;
    }
    throw new Error("Error de comunicación con la API de Gemini.");
  }
}