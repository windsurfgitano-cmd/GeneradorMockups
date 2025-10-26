import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// FIX: Added an interface for the return type for better type safety.
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
): Promise<MockupResult | null> { // FIX: Updated return type to be more descriptive.
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
        // FIX: Return an object containing both the base64 data and the mimeType.
        return {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        };
      }
    }

    // If no image is found in the response, check for safety ratings or other issues
    const safetyRatings = response.candidates?.[0]?.safetyRatings;
    if (safetyRatings && safetyRatings.some(rating => rating.probability !== 'NEGLIGIBLE')) {
        console.warn("Image generation may have been blocked due to safety settings.", safetyRatings);
        throw new Error("The image could not be generated due to safety policies.");
    }
    
    console.warn("No image data found in Gemini response.", response);
    throw new Error("Gemini did not return an image for this mockup prompt.");

  } catch (error) {
    console.error(`Error calling Gemini API for prompt "${prompt}":`, error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate mockup: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
}
