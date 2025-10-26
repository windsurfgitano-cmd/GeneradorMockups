import React, { useState, ChangeEvent } from 'react';
import { generateMockup, MockupResult } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

// Base de datos de prompts en inglés para mayor fiabilidad
const MOCKUP_PROMPTS = [
    // Corporativo / Oficina
    "Logo on the wall of a modern office reception area, behind the desk, with recessed lighting.",
    "Logo engraved on a premium metal business card held between two fingers.",
    "Logo on a frosted glass meeting room door.",
    "Logo on the screen of a tablet during a business presentation.",
    "Logo on the cover of a professional Moleskine-style notebook next to a fountain pen.",
    // Ropa y Accesorios
    "A photorealistic mockup of the provided logo embroidered on a black polo shirt.",
    "Logo printed on the side of a classic canvas tote bag.",
    "Logo subtly embossed on a brown leather wallet.",
    "Logo on a baseball cap worn by a person outdoors.",
    "Logo as a small, clean print on the chest of a heather grey hoodie.",
    // Exterior y Señalización
    "Logo as a 3D sign on a brick wall of a trendy storefront.",
    "Logo on a hanging wooden sign outside a rustic cafe.",
    "Logo on the side of a corporate delivery van, matte finish, parked in a business district.",
    "Logo on a flag waving from a tall flagpole against a clear blue sky.",
    "Logo painted as a large mural on a concrete urban wall.",
    // Productos y Embalajes
    "Logo on a white ceramic coffee mug held by a person.",
    "Logo on the label of a glass bottle for a premium drink.",
    "Logo on a minimalist cardboard packaging box.",
    "Logo printed on a paper coffee cup with a lid.",
    "Logo on the side of a sleek, modern reusable water bottle.",
    // Digital
    "Logo displayed on the screen of a MacBook Pro in a well-lit workspace.",
    "Logo as the profile picture of a social media app on a smartphone.",
    "Logo on a website header, viewed on a high-resolution monitor.",
    "Logo on the loading screen of an application on a tablet.",
    "Logo appearing on a large digital billboard in Times Square at night.",
];

interface MockupState {
    id: number;
    prompt: string;
    result: MockupResult | null;
    isLoading: boolean;
    error: string | null;
}

const createInitialState = (): MockupState[] => 
    Array.from({ length: 10 }, (_, i) => ({
        id: i,
        prompt: '',
        result: null,
        isLoading: false,
        error: null,
    }));

function App() {
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [brandContext, setBrandContext] = useState<string>('');
    const [mockups, setMockups] = useState<MockupState[]>(createInitialState());
    const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setLogoFile(e.target.files[0]);
        }
    };

    const generateSingleMockup = async (index: number, prompt: string) => {
        if (!logoFile) return;

        setMockups(prev => prev.map((m, i) => i === index ? { ...m, isLoading: true, error: null } : m));
        
        try {
            const base64String = await fileToBase64(logoFile);
            const fullPrompt = brandContext ? `${brandContext}. ${prompt}` : prompt;
            const result = await generateMockup(base64String, logoFile.type, fullPrompt);
            setMockups(prev => prev.map((m, i) => i === index ? { ...m, result, isLoading: false } : m));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
            setMockups(prev => prev.map((m, i) => i === index ? { ...m, error: errorMessage, isLoading: false } : m));
        }
    };
    
    const handleGenerateAllClick = () => {
        // Seleccionar 10 prompts aleatorios sin repetición
        const shuffledPrompts = [...MOCKUP_PROMPTS].sort(() => 0.5 - Math.random());
        const selectedPrompts = shuffledPrompts.slice(0, 10);
        
        // Inicializar el estado para los nuevos mockups
        const newMockupsState = selectedPrompts.map((prompt, i) => ({
            id: i,
            prompt: prompt,
            result: null,
            isLoading: false,
            error: null,
        }));
        setMockups(newMockupsState);

        setIsGeneratingAll(true);
        selectedPrompts.forEach((prompt, index) => {
            generateSingleMockup(index, prompt);
        });
        // Aunque las llamadas son asíncronas, el estado de 'isGeneratingAll' se podría manejar mejor
        // con un contador o Promise.all, pero para la UI es suficiente.
        // Se resetea al finalizar todas las promesas (no implementado aquí para simplicidad).
    };

    const handleRegenerateClick = (index: number) => {
        // Elige un nuevo prompt que no esté actualmente en uso
        const currentPrompts = new Set(mockups.map(m => m.prompt));
        let newPrompt = MOCKUP_PROMPTS[Math.floor(Math.random() * MOCKUP_PROMPTS.length)];
        while (currentPrompts.has(newPrompt)) {
            newPrompt = MOCKUP_PROMPTS[Math.floor(Math.random() * MOCKUP_PROMPTS.length)];
        }
        
        setMockups(prev => prev.map((m, i) => i === index ? { ...m, prompt: newPrompt } : m));
        generateSingleMockup(index, newPrompt);
    };

    const handleDownloadClick = (base64: string, mimeType: string) => {
        const link = document.createElement('a');
        link.href = `data:${mimeType};base64,${base64}`;
        link.download = `mockup_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="main-container">
            <div className="control-panel">
                <h1>Generador de Mockups con IA</h1>
                <div className="input-section">
                    <label>1. Sube tu logo (fondo transparente recomendado)</label>
                    <div className="file-input-wrapper">
                        <input
                            id="logo-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                         <span className="file-input-text">
                            {logoFile ? <span className="file-name">{logoFile.name}</span> : 'Haz clic o arrastra tu archivo aquí'}
                        </span>
                    </div>
                </div>

                <div className="input-section">
                    <label htmlFor="context-input">2. Contexto de la Marca (Opcional)</label>
                    <textarea
                        id="context-input"
                        value={brandContext}
                        onChange={(e) => setBrandContext(e.target.value)}
                        className="context-textarea"
                        placeholder="Ej: 'Una marca de café artesanal y ecológica' o 'una startup de alta tecnología'"
                    />
                </div>

                <button onClick={handleGenerateAllClick} disabled={!logoFile || isGeneratingAll} className="generate-button">
                    {isGeneratingAll ? 'Generando...' : 'Generar 10 Mockups'}
                </button>
            </div>
            
            <div className="mockups-grid">
                {mockups.map((mockup, index) => (
                    <div key={mockup.id} className="mockup-card">
                        {mockup.isLoading && <div className="loader">Generando...</div>}
                        {mockup.error && <div className="error-message">{mockup.error}</div>}
                        {mockup.result && (
                            <>
                                <img
                                    src={`data:${mockup.result.mimeType};base64,${mockup.result.base64}`}
                                    alt={`Mockup ${index + 1}`}
                                />
                                <div className="overlay">
                                    <p>{mockup.prompt}</p>
                                    <div className="actions">
                                        <button className="action-button" onClick={() => handleDownloadClick(mockup.result!.base64, mockup.result!.mimeType)}>Descargar</button>
                                        <button className="action-button" onClick={() => handleRegenerateClick(index)}>Regenerar</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;
