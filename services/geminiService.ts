import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash-image';

interface ImageData {
    mimeType: string;
    data: string; // base64
}

interface GenerationResult {
    base64Image: string;
    mimeType: string;
}

/**
 * Handles error responses from the Gemini API.
 * @param response The raw response from the API.
 * @returns A specific error message based on the finish reason.
 */
const getErrorFromResponse = (response: any): string => {
    const finishReason = response?.candidates?.[0]?.finishReason;
    if (finishReason === 'NO_IMAGE') {
        return "La IA no pudo crear una imagen para este prompt. Intenta regenerar.";
    }
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION' || finishReason === 'OTHER') {
        return `Generación bloqueada por políticas de seguridad (${finishReason}).`;
    }
    return "Gemini no devolvió una imagen para este prompt.";
};

/**
 * Generates a mockup image using a base logo and a text prompt.
 * @param prompt The text prompt describing the mockup.
 * @param logo The base logo image data.
 * @returns A promise resolving to the generated image data.
 */
export async function generateMockup(prompt: string, logo: ImageData): Promise<GenerationResult> {
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { mimeType: logo.mimeType, data: logo.data } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

        if (imagePart?.inlineData) {
            return {
                base64Image: imagePart.inlineData.data,
                mimeType: imagePart.inlineData.mimeType,
            };
        } else {
             throw new Error(getErrorFromResponse(response));
        }
    } catch (error) {
        console.error("Error calling Gemini API for mockup:", error);
        throw new Error(error instanceof Error ? error.message : "An unknown API error occurred");
    }
}

/**
 * Generates a logo image from a text prompt.
 * @param prompt The text prompt describing the logo.
 * @returns A promise resolving to the generated image data.
 */
export async function generateLogo(prompt: string): Promise<GenerationResult> {
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [{ text: prompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

        if (imagePart?.inlineData) {
            return {
                base64Image: imagePart.inlineData.data,
                mimeType: imagePart.inlineData.mimeType,
            };
        } else {
            throw new Error(getErrorFromResponse(response));
        }
    } catch (error) {
        console.error("Error calling Gemini API for logo:", error);
        throw new Error(error instanceof Error ? error.message : "An unknown API error occurred");
    }
}
