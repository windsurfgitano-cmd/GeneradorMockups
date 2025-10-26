import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const allPrompts = [
    // Mockup Prompts
    "Logo on a black t-shirt, worn by a person in a cafe.", "Logo on a white ceramic coffee mug, held by someone.", "Logo on a storefront window of a modern boutique.", "Logo on a business card, placed on a wooden desk.", "Logo on the side of a corporate delivery van.", "Logo on a laptop screen in a co-working space.", "Logo on a tote bag, carried over the shoulder.", "Logo on a billboard in a bustling city square at dusk.", "Logo embroidered on a baseball cap.", "Logo on a smartphone screen, showing the app splash page.", "Logo printed on a reusable water bottle.", "Logo on the wall of a modern office reception area.", "Logo on a piece of stationery, like a letterhead.", "Logo on a flag waving against a clear blue sky.", "Logo on a frosted glass office door.", "Logo on a product package box.",
];

const logoStyles = [
    "minimalist line art", "vintage and rustic", "geometric and abstract", "hand-drawn and sketchy", "corporate and clean", "3D and glossy", "watercolor and artistic", "neon and vibrant", "typographic and bold", "mascot and character-based"
];


const handleError = (error: unknown, context: string): never => {
    console.error(`Error in ${context}:`, error);
    if (error instanceof Error) {
        throw new Error(`[${context}] ${error.message}`);
    }
    throw new Error(`An unknown error occurred in ${context}.`);
};

const parseJsonResponse = (text: string) => {
    try {
        // The API might return the JSON wrapped in markdown-style code blocks.
        const jsonString = text.replace(/^```json\s*|```$/g, '').trim();
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON response:", text);
        throw new Error("La IA devolvió una respuesta con formato inválido.");
    }
};

// --- Service Functions ---

export const generateMockup = async (
    { base64Logo, mimeType, brandContext }: { base64Logo: string; mimeType: string; brandContext: string }
) => {
    try {
        const randomPrompt = allPrompts[Math.floor(Math.random() * allPrompts.length)];
        const fullPrompt = brandContext ? `${brandContext}. ${randomPrompt}` : randomPrompt;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64Logo, mimeType } },
                    { text: fullPrompt },
                ],
            },
            config: { responseModalities: [Modality.IMAGE] },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData) {
            return {
                base64Image: part.inlineData.data,
                mimeType: part.inlineData.mimeType,
            };
        }
        const reason = response.candidates?.[0]?.finishReason || 'NO_DATA';
        throw new Error(`La IA no devolvió una imagen. Razón: ${reason}`);
    } catch (error) {
        handleError(error, 'generateMockup');
    }
};

export const generateImageFromText = async (prompt: string, isForPost = false) => {
    try {
        const style = isForPost ? '' : logoStyles[Math.floor(Math.random() * logoStyles.length)];
        const fullPrompt = isForPost ? prompt : `${prompt}, ${style} logo`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: fullPrompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        });
        
        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData) {
            return {
                base64Image: part.inlineData.data,
                mimeType: part.inlineData.mimeType,
                prompt: fullPrompt,
                style: style
            };
        }
        const reason = response.candidates?.[0]?.finishReason || 'NO_DATA';
        throw new Error(`La IA no devolvió una imagen. Razón: ${reason}`);
    } catch (error) {
        handleError(error, 'generateImageFromText');
    }
};


export const generateBranding = async (prompt: string, count: number) => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate ${count} distinct branding concepts for the following idea: "${prompt}". For each concept, provide a color palette of 5 hex codes, a font pairing suggestion, and a brief description of the tone of voice.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                            typography: { type: Type.OBJECT, properties: { fontPairing: { type: Type.STRING } } },
                            toneOfVoice: { type: Type.OBJECT, properties: { description: { type: Type.STRING } } },
                        },
                    },
                },
            },
        });
        return parseJsonResponse(response.text);
    } catch (error) {
        handleError(error, 'generateBranding');
    }
};


export const generateSocialPostIdeas = async (prompt: string) => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate 10 unique social media post concepts for the following objective: "${prompt}". For each concept, provide a short, engaging "copy" for the post and a detailed, descriptive "imagePrompt" for an AI image generator to create a compelling visual.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            copy: { type: Type.STRING },
                            imagePrompt: { type: Type.STRING },
                        },
                    },
                },
            },
        });
        return parseJsonResponse(response.text);
    } catch (error) {
        handleError(error, 'generateSocialPostIdeas');
    }
};


export const generateCampaignIdeas = async (prompt: string, count: number) => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate ${count} distinct marketing campaign concepts based on this brief: "${prompt}". For each concept, provide a catchy "concept" name, a brief "summary" of the idea, and a list of 3-4 "keyActions" to execute it.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            concept: { type: Type.STRING },
                            summary: { type: Type.STRING },
                            keyActions: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                    },
                },
            },
        });
        return parseJsonResponse(response.text);
    } catch (error) {
        handleError(error, 'generateCampaignIdeas');
    }
};


export const generateScripts = async (prompt: string, count: number) => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate ${count} short video script concepts (for Reels/TikTok) for the following topic: "${prompt}". For each, provide a "concept" name and a structured "script" detailing the hook, scenes, and call to action, keeping it under 15 seconds.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            concept: { type: Type.STRING },
                            script: { type: Type.STRING },
                        },
                    },
                },
            },
        });
        return parseJsonResponse(response.text);
    } catch (error) {
        handleError(error, 'generateScripts');
    }
};
