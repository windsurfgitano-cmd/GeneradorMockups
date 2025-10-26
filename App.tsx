
import React, { useState, useCallback } from 'react';
import { generateLogo, generateMockup } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

type Page = 'mockups' | 'logos';

interface ImageState {
  id: number;
  src: string | null;
  isLoading: boolean;
  error: string | null;
  prompt: string;
  style?: string;
}

// --- MOCKUP PROMPTS (ENGLISH) ---
const mockupPrompts: string[] = [
    "Logo on a classic black t-shirt, worn by a person in a cafe.",
    "Logo engraved on a rustic wooden plaque hanging on a brick wall.",
    "Logo on a sleek, modern storefront window with city reflections.",
    "Logo printed on a white ceramic coffee mug, held in two hands.",
    "Logo embossed on a leather-bound journal cover.",
    "Logo on the side of a corporate delivery van, matte finish, parked in a business district.",
    "Logo on a large billboard in a bustling city square at dusk.",
    "Logo on a premium shopping bag held by a stylish person.",
    "Logo on the screen of a laptop in a modern office setting.",
    "Logo as a watermark on a professional photograph.",
    "Logo on a frosted glass office door.",
    "Logo embroidered on a baseball cap.",
    "Logo on a business card, close-up shot with textured paper.",
    "Logo on a metal water bottle placed on a yoga mat.",
    "Logo on a flag waving on a tall flagpole with a clear blue sky background.",
];

// --- LOGO STYLES (ENGLISH) ---
const logoStyles: string[] = [
    "minimalist logo, clean lines, geometric",
    "vintage logo, hand-drawn, distressed texture",
    "watercolor logo, soft edges, pastel colors",
    "neon logo, glowing, vibrant, on a dark brick wall",
    "3D logo, metallic, chrome finish",
    "origami logo, folded paper style, geometric",
    "gradient logo, smooth color transition, modern",
    "flat icon logo, simple shapes, bold colors",
    "line art logo, single continuous line, elegant",
    "mascot logo, cartoon character, friendly",
    "calligraphy logo, elegant script, flowing lines",
    "abstract logo, organic shapes, conceptual",
];

// --- HELPER FUNCTIONS ---
const getRandomItems = <T,>(arr: T[], num: number): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, num);
};

// --- COMPONENTS ---

const MockupGenerator: React.FC = () => {
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [brandContext, setBrandContext] = useState('');
    const [images, setImages] = useState<ImageState[]>([]);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);

    const generateImage = useCallback(async (id: number, prompt: string) => {
        if (!logoFile) return;

        setImages(prev => prev.map(img => img.id === id ? { ...img, isLoading: true, error: null } : img));
        
        try {
            const base64Logo = await fileToBase64(logoFile);
            const fullPrompt = brandContext ? `${brandContext}. ${prompt}` : prompt;
            const result = await generateMockup(fullPrompt, {
                mimeType: logoFile.type,
                data: base64Logo,
            });
            setImages(prev => prev.map(img => img.id === id ? { ...img, src: `data:${result.mimeType};base64,${result.base64Image}`, isLoading: false } : img));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setImages(prev => prev.map(img => img.id === id ? { ...img, isLoading: false, error: errorMessage } : img));
        }
    }, [logoFile, brandContext]);
    
    const handleGenerateAllClick = async () => {
        if (!logoFile) {
            alert("Por favor, sube un logo primero.");
            return;
        }
        setIsGeneratingAll(true);
        const selectedPrompts = getRandomItems(mockupPrompts, 10);
        const initialImages = selectedPrompts.map((prompt, i) => ({ id: i, src: null, isLoading: false, error: null, prompt }));
        setImages(initialImages);

        await Promise.all(initialImages.map(img => generateImage(img.id, img.prompt)));
        setIsGeneratingAll(false);
    };

    const handleRegenerateClick = (id: number, prompt: string) => {
        generateImage(id, prompt);
    };
    
    return (
        <>
            <div className="page-header">
                <h2>Generador de Mockups</h2>
                <p>Visualiza tu marca en escenarios realistas con un solo clic.</p>
            </div>
            <div className="control-panel">
                 <div className="step">
                    <label className="step-label"><span>1</span>Sube tu logo</label>
                    <div className="file-input-wrapper">
                        <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                        <p className="file-input-text">
                           {logoFile ? logoFile.name : <><span>Haz clic para subir</span> o arrastra y suelta</>}
                        </p>
                    </div>
                </div>
                <div className="step">
                    <label className="step-label"><span>2</span>Contexto de la Marca (Opcional)</label>
                    <textarea value={brandContext} onChange={(e) => setBrandContext(e.target.value)} placeholder="Ej: una marca de café artesanal y ecológica..." />
                </div>
                <button className="generate-button" onClick={handleGenerateAllClick} disabled={!logoFile || isGeneratingAll}>
                    {isGeneratingAll && <div className="spinner" style={{width: '20px', height: '20px', border:'3px solid rgba(0,0,0,0.2)', borderTopColor: '#111827'}}></div>}
                    Generar 10 Mockups
                </button>
            </div>
            <div className="results-grid">
                {images.map(img => <ImageCard key={img.id} image={img} onRegenerate={handleRegenerateClick} />)}
            </div>
        </>
    );
};

const LogoGenerator: React.FC = () => {
    const [logoDescription, setLogoDescription] = useState('');
    const [images, setImages] = useState<ImageState[]>([]);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);

    const generateImage = useCallback(async (id: number, prompt: string, style: string) => {
        setImages(prev => prev.map(img => img.id === id ? { ...img, src: null, isLoading: true, error: null } : img));
        
        try {
            const fullPrompt = `${logoDescription}, ${style}`;
            const result = await generateLogo(fullPrompt);
            setImages(prev => prev.map(img => img.id === id ? { ...img, src: `data:${result.mimeType};base64,${result.base64Image}`, isLoading: false } : img));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setImages(prev => prev.map(img => img.id === id ? { ...img, isLoading: false, error: errorMessage } : img));
        }
    }, [logoDescription]);

    const handleGenerateAllClick = async () => {
        if (!logoDescription) {
            alert("Por favor, describe el logo que quieres crear.");
            return;
        }
        setIsGeneratingAll(true);
        const selectedStyles = getRandomItems(logoStyles, 10);
        const initialImages = selectedStyles.map((style, i) => ({
            id: i,
            src: null,
            isLoading: false,
            error: null,
            prompt: `${logoDescription}, ${style}`,
            style: style,
        }));
        setImages(initialImages);

        await Promise.all(initialImages.map(img => generateImage(img.id, img.prompt, img.style!)));
        setIsGeneratingAll(false);
    };

    const handleRegenerateClick = (id: number, prompt: string, style?: string) => {
        if (style) {
            generateImage(id, prompt, style);
        }
    };

    return (
        <>
            <div className="page-header">
                <h2>Generador de Logos</h2>
                <p>Crea conceptos de logos únicos a partir de tus ideas.</p>
            </div>
            <div className="control-panel">
                <div className="step">
                    <label className="step-label"><span>1</span>Describe tu logo ideal</label>
                    <textarea value={logoDescription} onChange={(e) => setLogoDescription(e.target.value)} placeholder="Ej: un zorro astuto leyendo un libro para una librería..." />
                </div>
                <button className="generate-button" onClick={handleGenerateAllClick} disabled={!logoDescription || isGeneratingAll}>
                    {isGeneratingAll && <div className="spinner" style={{width: '20px', height: '20px', border:'3px solid rgba(0,0,0,0.2)', borderTopColor: '#111827'}}></div>}
                    Generar 10 Logos
                </button>
            </div>
            <div className="results-grid">
                {images.map(img => <ImageCard key={img.id} image={img} onRegenerate={(id, prompt, style) => handleRegenerateClick(id, prompt, style)} />)}
            </div>
        </>
    );
};

interface ImageCardProps {
  image: ImageState;
  onRegenerate: (id: number, prompt: string, style?: string) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, onRegenerate }) => {
    const handleDownload = () => {
        if (image.src) {
            const link = document.createElement('a');
            link.href = image.src;
            link.download = `generated-image-${image.id}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const styleText = image.style ? image.style.split(',')[0] : image.prompt.slice(0, 30) + '...';

    return (
        <div className="card">
            {image.isLoading ? (
                <div className="card-status">
                    <div className="spinner"></div>
                    <p className="card-status-prompt">Generando "{styleText}"</p>
                </div>
            ) : image.error ? (
                <div className="card-status">
                     <p className="error-message">{image.error}</p>
                     <p className="card-status-prompt">Prompt: "{styleText}"</p>
                </div>
            ) : image.src ? (
                <>
                    <img src={image.src} alt={image.prompt} className="card-image" />
                    <div className="card-overlay">
                        <div className="card-actions">
                            <button className="card-button" onClick={handleDownload} title="Descargar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </button>
                            <button className="card-button" onClick={() => onRegenerate(image.id, image.prompt, image.style)} title="Regenerar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                            </button>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
};

function App() {
  const [activePage, setActivePage] = useState<Page>('mockups');

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>CreativeIA<span>.</span></h1>
        </div>
        <nav>
          <div className={`nav-tab ${activePage === 'mockups' ? 'active' : ''}`} onClick={() => setActivePage('mockups')}>
            Generador de Mockups
          </div>
          <div className={`nav-tab ${activePage === 'logos' ? 'active' : ''}`} onClick={() => setActivePage('logos')}>
            Generador de Logos
          </div>
        </nav>
      </aside>
      <main className="main-container">
        {activePage === 'mockups' ? <MockupGenerator /> : <LogoGenerator />}
      </main>
    </>
  );
}

export default App;
