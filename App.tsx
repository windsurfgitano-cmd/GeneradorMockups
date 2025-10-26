import React, { useState, useEffect } from 'react';
import { generateMockup, generateLogo } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

// --- PROMPT DATABASE (English for better AI results) ---
const MOCKUP_PROMPTS = [
    // Corporativos y de Oficina
    "Logo on a frosted glass wall of a modern office reception area.",
    "Logo engraved on a premium metal business card on a dark wooden desk.",
    "Logo on the screen of a laptop in a busy co-working space.",
    "Logo printed on a folder during a professional business meeting.",
    "Logo on a building's main entrance sign, made of brushed steel.",
    "Logo on a coffee mug on a clean, minimalist desk setup.",
    "Logo on the wall behind the reception desk in a bright, airy office.",
    "Logo on a tote bag carried by a person walking in a financial district.",
    "Logo on a polo shirt worn by a staff member at a corporate event.",
    "Logo on a window decal of a high-rise office building.",

    // Ropa y Accesorios
    "Logo embroidered on the front of a black baseball cap.",
    "Logo printed on the chest of a high-quality cotton t-shirt.",
    "Logo on a woven label stitched onto the cuff of a beanie.",
    "Logo embossed on a leather patch on a denim jacket.",
    "Logo on a canvas tote bag hanging in a trendy boutique.",
    "Logo as a small, subtle print on a pair of sneakers.",
    "Logo on the buckle of a leather belt.",
    "Logo on a fabric tag of a hoodie.",

    // Productos y Embalajes
    "Logo on the label of a craft beer bottle with condensation.",
    "Logo on a paper coffee cup held by a person walking down a city street.",
    "Logo on a luxury product box with a satin ribbon.",
    "Logo printed on a brown paper bag from a gourmet deli.",
    "Logo on the side of a sleek, modern cosmetic bottle.",
    "Logo on a gourmet chocolate bar wrapper.",
    "Logo on a wine bottle label, placed on a rustic wooden table.",

    // Exteriores y Señalización
    "Logo painted as a large mural on a brick wall in an urban alley.",
    "Logo on a rustic wooden sign hanging outside a cafe.",
    "Logo on a flag waving in front of a modern building.",
    "Logo on a storefront window with reflections of the street.",
    "Logo on the side of a corporate delivery van in motion.",
    "Logo on a surfboard leaning against a beach hut.",
    "Logo on a banner at an outdoor music festival.",

    // Digital y Tecnología
    "Logo on the loading screen of a mobile app on a smartphone.",
    "Logo displayed on a large screen during a tech conference.",
    "Logo on a tablet screen, being used in a coffee shop.",
    "Logo as a watermark on a professional photograph.",
];

const LOGO_STYLES = [
    "minimalist line art, monochrome",
    "vintage, hand-drawn, with rustic textures",
    "futuristic, neon, glowing, cyberpunk style",
    "corporate, clean, geometric, blue and grey palette",
    "watercolor, organic, soft edges, pastel colors",
    "90s retro, bold, colorful, pop-art inspired",
    "luxury, elegant, gold foil, serif font",
    "mascot, cartoon character, playful and vibrant",
    "abstract, geometric shapes, bold and modern",
    "calligraphy, elegant script, ink-like",
];


// --- TYPES ---
interface GenerationState {
    id: number;
    prompt: string;
    style?: string; // Storing style explicitly for logos
    status: 'idle' | 'loading' | 'success' | 'error';
    imageUrl?: string;
    error?: string;
}

// --- HELPER FUNCTIONS ---
const shuffleAndPick = (arr: string[], num: number) => {
    return [...arr].sort(() => 0.5 - Math.random()).slice(0, num);
};

// --- MOCKUP GENERATOR COMPONENT ---
const MockupGenerator = () => {
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [brandContext, setBrandContext] = useState('');
    const [mockups, setMockups] = useState<GenerationState[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setLogoFile(e.target.files[0]);
        }
    };

    const generateSingleMockup = async (id: number, prompt: string, file: File, context: string) => {
        setMockups(prev => prev.map(m => m.id === id ? { ...m, status: 'loading' } : m));
        try {
            const base64 = await fileToBase64(file);
            const fullPrompt = `${context ? `Context: ${context}. ` : ''}${prompt}`;
            const result = await generateMockup(fullPrompt, { mimeType: file.type, data: base64 });

            if (result.base64Image) {
                 setMockups(prev => prev.map(m => m.id === id ? { ...m, status: 'success', imageUrl: `data:${result.mimeType};base64,${result.base64Image}` } : m));
            } else {
                throw new Error("Gemini did not return an image.");
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error(`Error for prompt "${prompt}":`, errorMessage);
            setMockups(prev => prev.map(m => m.id === id ? { ...m, status: 'error', error: errorMessage } : m));
        }
    };
    
    const handleGenerateAllClick = async () => {
        if (!logoFile) return;
        setIsGenerating(true);
        const selectedPrompts = shuffleAndPick(MOCKUP_PROMPTS, 10);
        const initialMockups = selectedPrompts.map((prompt, i) => ({ id: i, prompt, status: 'idle' as const }));
        setMockups(initialMockups);

        const generationPromises = initialMockups.map(mockup =>
            generateSingleMockup(mockup.id, mockup.prompt, logoFile, brandContext)
        );
        
        await Promise.all(generationPromises);
        setIsGenerating(false);
    };

    const handleRegenerateClick = (id: number, prompt: string) => {
        if (!logoFile || isGenerating) return;
        generateSingleMockup(id, prompt, logoFile, brandContext);
    };

    const handleDownloadClick = (imageUrl?: string) => {
        if (!imageUrl) return;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `mockup-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div className="control-panel">
                 <div className="input-section">
                    <label>1. Sube tu Logo</label>
                    <div className="file-input-wrapper">
                        <input type="file" accept="image/*" onChange={handleFileChange} />
                        <span className="file-input-text">
                            {logoFile ? <span className="file-name">{logoFile.name}</span> : 'Haz clic o arrastra un archivo aquí'}
                        </span>
                    </div>
                </div>
                <div className="input-section">
                    <label>2. Contexto de la Marca (Opcional)</label>
                    <textarea
                        className="context-textarea"
                        placeholder="Ej: una marca de café artesanal y ecológica..."
                        value={brandContext}
                        onChange={(e) => setBrandContext(e.target.value)}
                    />
                </div>
                <button className="generate-button" onClick={handleGenerateAllClick} disabled={!logoFile || isGenerating}>
                    {isGenerating ? 'Generando...' : 'Generar 10 Mockups'}
                </button>
            </div>

            {mockups.length > 0 && (
                <div className="mockups-grid">
                    {mockups.map(({ id, prompt, status, imageUrl, error }) => (
                        <div className="mockup-card" key={id}>
                            {status === 'loading' && <div className="loader">Generando...</div>}
                            {status === 'error' && <div className="error-message">{error}</div>}
                            {status === 'success' && imageUrl && <img src={imageUrl} alt={prompt} />}
                            
                            {(status === 'success' || status === 'error') && (
                                <div className="overlay">
                                    <p>{prompt}</p>
                                    <div className="actions">
                                        {status === 'success' && imageUrl && <button className="action-button" onClick={() => handleDownloadClick(imageUrl)}>Descargar</button>}
                                        <button className="action-button" onClick={() => handleRegenerateClick(id, prompt)}>Regenerar</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

// --- LOGO GENERATOR COMPONENT ---
const LogoGenerator = () => {
    const [logoDescription, setLogoDescription] = useState('');
    const [logos, setLogos] = useState<GenerationState[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const generateSingleLogo = async (id: number, prompt: string) => {
        setLogos(prev => prev.map(l => l.id === id ? { ...l, status: 'loading' } : l));
        try {
            const result = await generateLogo(prompt);

            if (result.base64Image) {
                setLogos(prev => prev.map(l => l.id === id ? { ...l, status: 'success', imageUrl: `data:${result.mimeType};base64,${result.base64Image}` } : l));
            } else {
                throw new Error("Gemini did not return an image.");
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error(`Error for prompt "${prompt}":`, errorMessage);
            setLogos(prev => prev.map(l => l.id === id ? { ...l, status: 'error', error: errorMessage } : l));
        }
    };
    
    const handleGenerateAllClick = async () => {
        if (!logoDescription) return;
        setIsGenerating(true);
        const initialLogos = LOGO_STYLES.map((style, i) => ({
            id: i,
            prompt: `${logoDescription}, in the style of ${style}`,
            style: style,
            status: 'idle' as const
        })).slice(0, 10);

        setLogos(initialLogos);

        const generationPromises = initialLogos.map(logo =>
            generateSingleLogo(logo.id, logo.prompt)
        );
        
        await Promise.all(generationPromises);
        setIsGenerating(false);
    };

    const handleRegenerateClick = (id: number, prompt: string) => {
        if (isGenerating) return;
        generateSingleLogo(id, prompt);
    };

    const handleDownloadClick = (imageUrl?: string) => {
        if (!imageUrl) return;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `logo-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div className="control-panel">
                <div className="input-section">
                    <label>1. Describe el logo que imaginas</label>
                    <textarea
                        className="context-textarea"
                        placeholder="Ej: Un zorro astuto leyendo un libro para una librería llamada 'El Rincón del Lector'"
                        value={logoDescription}
                        onChange={(e) => setLogoDescription(e.target.value)}
                    />
                </div>
                <button className="generate-button" onClick={handleGenerateAllClick} disabled={!logoDescription || isGenerating}>
                    {isGenerating ? 'Generando...' : 'Generar 10 Logos'}
                </button>
            </div>

            {logos.length > 0 && (
                <div className="mockups-grid">
                    {logos.map(({ id, prompt, style, status, imageUrl, error }) => {
                        // Using the explicitly stored 'style' is safer than splitting the prompt.
                        const styleText = style || prompt;

                        return (
                            <div className="mockup-card" key={id}>
                                {status === 'loading' && <div className="loader">Generando...</div>}
                                {status === 'error' && <div className="error-message">{error}</div>}
                                {status === 'success' && imageUrl && <img src={imageUrl} alt={prompt} />}
                                
                                {(status === 'success' || status === 'error') && (
                                    <div className="overlay">
                                        <p>{styleText}</p>
                                        <div className="actions">
                                            {status === 'success' && imageUrl && <button className="action-button" onClick={() => handleDownloadClick(imageUrl)}>Descargar</button>}
                                            <button className="action-button" onClick={() => handleRegenerateClick(id, prompt)}>Regenerar</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};


// --- MAIN APP COMPONENT ---
function App() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState<'mockups' | 'logos'>('mockups');
    
    useEffect(() => {
        document.body.style.overflow = isMenuOpen ? 'hidden' : 'auto';
    }, [isMenuOpen]);

    const navigate = (page: 'mockups' | 'logos') => {
        setCurrentPage(page);
        setIsMenuOpen(false);
    };

    const pageTitle = currentPage === 'mockups' ? 'Generador de Mockups con IA' : 'Generador de Logos con IA';
    
    return (
        <>
            <div className={`overlay-bg ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
            <nav className={`mobile-nav ${isMenuOpen ? 'open' : ''}`}>
                <ul className="nav-links">
                    <li><a href="#" onClick={() => navigate('mockups')}>Generador de mockups con IA</a></li>
                    <li><a href="#" onClick={() => navigate('logos')}>Generador de logos <span className="new-badge">Nuevo</span></a></li>
                </ul>
            </nav>
            
            <header className="header">
                 <h1>{pageTitle}</h1>
                 <button className={`hamburger-menu ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
                    <div className="bar"></div>
                    <div className="bar"></div>
                    <div className="bar"></div>
                </button>
            </header>
            
            <main className="main-container">
                {currentPage === 'mockups' ? <MockupGenerator /> : <LogoGenerator />}
            </main>
        </>
    );
}

export default App;