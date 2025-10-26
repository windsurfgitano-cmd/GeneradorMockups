import { GoogleGenAI, Modality, Type } from "@google/genai";

// --- Service Setup ---
// Use a function to get a new instance, ensuring the latest API key from the Veo flow is used.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY! });

const allPrompts = [
    "Logo on a black t-shirt, worn by a person in a cafe.", "Logo on a white ceramic coffee mug, held by someone.", "Logo on a storefront window of a modern boutique.", "Logo on a business card, placed on a wooden desk.", "Logo on the side of a corporate delivery van.", "Logo on a laptop screen in a co-working space.", "Logo on a tote bag, carried over the shoulder.", "Logo on a billboard in a bustling city square at dusk.", "Logo embroidered on a baseball cap.", "Logo on a smartphone screen, showing the app splash page.", "Logo printed on a reusable water bottle.", "Logo on the wall of a modern office reception area.", "Logo on a piece of stationery, like a letterhead.", "Logo on a flag waving against a clear blue sky.", "Logo on a frosted glass office door.", "Logo on a product package box.",
];

const logoStyles = [
    "minimalist line art", "vintage and rustic", "geometric and abstract", "hand-drawn and sketchy", "corporate and clean", "3D and glossy", "watercolor and artistic", "neon and vibrant", "typographic and bold", "mascot and character-based"
];

const handleError = (error: unknown, context: string): never => {
    console.error(`Error in ${context}:`, error);
    if (error instanceof Error) {
        // Attempt to parse Gemini-specific error details
        const geminiErrorPrefix = '[GoogleGenerativeAI Error]: ';
        if (error.message.startsWith(geminiErrorPrefix)) {
            const details = error.message.substring(geminiErrorPrefix.length);
            throw new Error(details);
        }
        throw new Error(`${error.message}`);
    }
    throw new Error(`An unknown error occurred in ${context}.`);
};

const parseJsonResponse = (text: string) => {
    try {
        const jsonString = text.replace(/^```json\s*|```$/g, '').trim();
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON response:", text);
        throw new Error("La IA devolvió una respuesta con formato inválido.");
    }
};

// --- Service Functions ---

export const generateVideo = async ({ base64Image, mimeType, prompt, aspectRatio }: { base64Image: string; mimeType: string; prompt: string; aspectRatio: '16:9' | '9:16' }) => {
    try {
        const ai = getAiClient();
        const operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: { imageBytes: base64Image, mimeType: mimeType },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio
            }
        });
        return operation;
    } catch (error) {
        handleError(error, 'generateVideo');
    }
};

export const getVideoOperationStatus = async (operation: any) => {
    try {
        const ai = getAiClient();
        const updatedOperation = await ai.operations.getVideosOperation({ operation });
        return updatedOperation;
    } catch (error) {
        handleError(error, 'getVideoOperationStatus');
    }
};

export const analyzeImage = async ({ base64Image, mimeType }: { base64Image: string; mimeType: string; }) => {
    try {
        const ai = getAiClient();
        const prompt = "Analyze this image from the perspective of a senior digital marketing strategist. Provide a detailed analysis covering:\n1.  **First Impression & Emotional Impact:** What is the immediate feeling or message conveyed?\n2.  **Composition & Visual Hierarchy:** What elements draw the eye? Is it balanced? How does it guide the viewer?\n3.  **Color Palette & Branding:** How do the colors influence mood? Are they consistent with a potential brand identity?\n4.  **Target Audience:** Who would this image most likely appeal to and why?\n5.  **Marketing Opportunities & Improvements:** Suggest 3 concrete ways this image could be used in a marketing campaign or improved for better performance.";
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: base64Image, mimeType } },
                    { text: prompt },
                ],
            },
        });
        return response.text;
    } catch (error) {
        handleError(error, 'analyzeImage');
    }
};


export const generateMockup = async (
    { base64Logo, mimeType, brandContext }: { base64Logo: string; mimeType: string; brandContext: string }
) => {
    try {
        const ai = getAiClient();
        const randomPrompt = allPrompts[Math.floor(Math.random() * allPrompts.length)];
        const fullPrompt = brandContext ? `For a brand that is ${brandContext}, create a mockup of this logo on a ${randomPrompt}` : `Create a mockup of this logo on a ${randomPrompt}`;

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
        const ai = getAiClient();
        const style = isForPost ? '' : logoStyles[Math.floor(Math.random() * logoStyles.length)];
        const fullPrompt = isForPost ? prompt : `A logo for ${prompt}, ${style}`;

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
        const ai = getAiClient();
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
                        }, required: ['colors', 'typography', 'toneOfVoice']
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
        const ai = getAiClient();
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
                        }, required: ['copy', 'imagePrompt']
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
        const ai = getAiClient();
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
                        }, required: ['concept', 'summary', 'keyActions']
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
        const ai = getAiClient();
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
                        }, required: ['concept', 'script']
                    },
                },
            },
        });
        return parseJsonResponse(response.text);
    } catch (error) {
        handleError(error, 'generateScripts');
    }
};

export const generateCopywriting = async (prompt: string, count: number) => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate ${count} distinct pieces of advertising copy based on this brief:\n${prompt}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            copy: { type: Type.STRING, description: "The full ad copy text." },
                        }, required: ['copy']
                    },
                },
            },
        });
        return parseJsonResponse(response.text);
    } catch (error) {
        handleError(error, 'generateCopywriting');
    }
};

export const generatePersonas = async (prompt: string, count: number) => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate ${count} detailed buyer personas for this product/client: "${prompt}".`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            age: { type: Type.NUMBER },
                            occupation: { type: Type.STRING },
                            bio: { type: Type.STRING, description: "A short paragraph bringing the persona to life." },
                            goals: { type: Type.STRING, description: "Primary goals related to the product." },
                            painPoints: { type: Type.STRING, description: "Key challenges or frustrations." },
                        }, required: ['name', 'age', 'occupation', 'bio', 'goals', 'painPoints']
                    },
                },
            },
        });
        return parseJsonResponse(response.text);
    } catch (error) {
        handleError(error, 'generatePersonas');
    }
};

export const generateSeoIdeas = async (prompt: string, count: number) => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a mix of ${count} SEO content ideas for the keyword "${prompt}". Include blog post titles, frequently asked questions, and meta descriptions.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING, description: "Can be 'title', 'faq', or 'meta'." },
                            content: { type: Type.STRING },
                        }, required: ['type', 'content']
                    },
                },
            },
        });
        return parseJsonResponse(response.text);
    } catch (error) {
        handleError(error, 'generateSeoIdeas');
    }
};

export const generateNamesAndSlogans = async (prompt: string, count: number) => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a mix of ${count} brand names and slogans for a business with this essence: "${prompt}". For each, provide a justification.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING, description: "Can be 'name' or 'slogan'." },
                            suggestion: { type: Type.STRING },
                            justification: { type: Type.STRING },
                        }, required: ['type', 'suggestion', 'justification']
                    },
                },
            },
        });
        return parseJsonResponse(response.text);
    } catch (error) {
        handleError(error, 'generateNamesAndSlogans');
    }
};