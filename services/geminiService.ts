import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash';
const imageModel = 'gemini-2.5-flash-image';

interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

interface GeneratedImage {
    base64Data: string;
    mimeType: string;
}

export interface BrandingConcept {
    colorPalette: string[];
    typographySuggestion: string;
    toneOfVoice: string;
}

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return "An unknown error occurred.";
};

const handleApiError = (response: any, defaultMessage: string): string => {
    const finishReason = response?.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY') {
        return "La generación fue bloqueada por políticas de seguridad. Intenta con un prompt diferente.";
    }
    if (finishReason === 'NO_IMAGE') {
        return "La IA no pudo generar una imagen para este prompt. Intenta regenerar o cambiar el texto.";
    }
    return defaultMessage;
};


export async function generateMockup(prompt: string, brandContext: string, image: ImagePart): Promise<GeneratedImage> {
  try {
    const fullPrompt = `${brandContext ? `Brand context: ${brandContext}.` : ''} Place the provided logo onto this scene: ${prompt}.`;
    
    const response = await ai.models.generateContent({
      model: imageModel,
      contents: { parts: [image, { text: fullPrompt }] },
      config: { responseModalities: ['IMAGE'] }
    });

    const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (imageData?.data && imageData?.mimeType) {
        return { base64Data: imageData.data, mimeType: imageData.mimeType };
    } else {
        throw new Error(handleApiError(response, "La respuesta de la IA no contenía datos de imagen."));
    }
  } catch (error) {
    console.error("Error generating mockup:", error);
    throw new Error(getErrorMessage(error));
  }
}

export async function generateLogo(description: string, style: string): Promise<GeneratedImage> {
    try {
        const prompt = `A logo for a brand described as "${description}". The logo should be in a ${style} style, on a clean white background, vector style.`;
        
        const response = await ai.models.generateContent({
            model: imageModel,
            contents: { parts: [{ text: prompt }] },
            config: { responseModalities: ['IMAGE'] }
        });

        const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (imageData?.data && imageData?.mimeType) {
            return { base64Data: imageData.data, mimeType: imageData.mimeType };
        } else {
            throw new Error(handleApiError(response, "La respuesta de la IA no contenía datos de imagen."));
        }
    } catch (error) {
        console.error("Error generating logo:", error);
        throw new Error(getErrorMessage(error));
    }
}


export async function generateBranding(description: string): Promise<BrandingConcept[]> {
    try {
        const prompt = `Generate 10 distinct branding concepts for a brand described as: "${description}". For each concept, provide a color palette of 5 hex codes, a typography suggestion (e.g., "Pair a modern sans-serif like Montserrat with an elegant serif like Playfair Display"), and a short tone of voice description.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            colorPalette: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description: "An array of 5 hex color codes."
                            },
                            typographySuggestion: {
                                type: Type.STRING,
                                description: "A suggestion for font pairings."
                            },
                            toneOfVoice: {
                                type: Type.STRING,
                                description: "A brief description of the brand's communication style."
                            }
                        }
                    }
                }
            }
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);

        if (Array.isArray(parsedJson)) {
            return parsedJson;
        } else {
            throw new Error("La respuesta de la IA no tenía el formato esperado.");
        }
    } catch (error) {
        console.error("Error generating branding:", error);
        throw new Error(getErrorMessage(error));
    }
}
