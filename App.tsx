import React, { useState, ChangeEvent, useCallback } from 'react';
import { generateMockup, generateLogo, generateBranding, BrandingConcept } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

type Page = 'mockups' | 'logos' | 'branding';

interface ImageState {
  id: number;
  isLoading: boolean;
  error: string | null;
  imageData: { url: string; mimeType: string; } | null;
  prompt: string;
  style?: string; // For logos
}

interface BrandingState {
  id: number;
  isLoading: boolean;
  error: string | null;
  concept: BrandingConcept | null;
}

// --- Helper Components ---

const Spinner = () => <div className="spinner"></div>;

const ResultCard = ({ 
    state, 
    onRegenerate, 
    children 
}: { 
    state: ImageState | BrandingState, 
    onRegenerate: () => void, 
    children: React.ReactNode 
}) => {
  return (
    <div className="result-card">
      {state.isLoading && <Spinner />}
      {state.error && !state.isLoading && <div className="error-message">{state.error}</div>}
      {!state.isLoading && !state.error && children}
      <div className="card-overlay">
        <button onClick={onRegenerate} className="card-button" disabled={state.isLoading}>Regenerar</button>
        {'imageData' in state && state.imageData && (
             <a href={state.imageData.url} download={`generated-image-${state.id}.png`} className="card-button">Descargar</a>
        )}
      </div>
    </div>
  );
};


// --- Generator Components ---

const MockupGenerator = () => {
    const [file, setFile] = useState<File | null>(null);
    const [brandContext, setBrandContext] = useState('');
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [mockups, setMockups] = useState<ImageState[]>([]);

    const MOCKUP_PROMPTS = [
      "Logo on a classic black t-shirt, worn by a person in a cafe.",
      "Logo on a frosted glass office door.",
      "Logo on a white ceramic coffee mug on a wooden desk.",
      "Logo on a luxury shopping bag held by a person.",
      "Logo embroidered on a baseball cap.",
      "Logo on the side of a corporate delivery van.",
      "Logo on a modern smartphone screen, held in hand.",
      "Logo on a large outdoor billboard in a bustling city square.",
      "Logo printed on a stack of business cards.",
      "Logo as a watermark on a professional photograph.",
      "Logo on a reusable canvas tote bag.",
      "Logo engraved on a metal water bottle.",
      "Logo on a storefront window.",
      "Logo on a laptop lid in a co-working space.",
      "Logo on the sail of a sailboat."
    ];
    
    const getRandomPrompts = useCallback(() => {
        const shuffled = [...MOCKUP_PROMPTS].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 10);
    }, []);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setFile(event.target.files[0]);
        }
    };

    const runGeneration = async (prompt: string, index: number) => {
        if (!file) return;

        setMockups(prev => {
            const newMockups = [...prev];
            newMockups[index] = { ...newMockups[index], isLoading: true, error: null };
            return newMockups;
        });

        try {
            const base64Data = await fileToBase64(file);
            const imagePart = { inlineData: { data: base64Data, mimeType: file.type } };
            const result = await generateMockup(prompt, brandContext, imagePart);
            const url = `data:${result.mimeType};base64,${result.base64Data}`;
            
            setMockups(prev => {
                const newMockups = [...prev];
                newMockups[index] = { ...newMockups[index], isLoading: false, imageData: { url, mimeType: result.mimeType } };
                return newMockups;
            });

        } catch (e: any) {
            setMockups(prev => {
                const newMockups = [...prev];
                newMockups[index] = { ...newMockups[index], isLoading: false, error: e.message };
                return newMockups;
            });
        }
    };

    const handleGenerateAllClick = async () => {
        if (!file) {
            alert("Por favor, sube un logo primero.");
            return;
        }
        setIsGeneratingAll(true);
        const selectedPrompts = getRandomPrompts();
        const initialStates: ImageState[] = selectedPrompts.map((prompt, i) => ({
            id: i,
            isLoading: false,
            error: null,
            imageData: null,
            prompt: prompt,
        }));
        setMockups(initialStates);
        
        await Promise.all(selectedPrompts.map((prompt, i) => runGeneration(prompt, i)));
        setIsGeneratingAll(false);
    };
    
    const handleRegenerateClick = (index: number) => {
        const prompt = mockups[index].prompt;
        runGeneration(prompt, index);
    };

    return (
        <>
            <div className="page-header">
                <h1>Generador de Mockups con IA</h1>
                <p>Visualiza tu marca al instante. Sube tu logo, dale contexto y observa cómo la IA lo aplica a 10 escenarios realistas.</p>
            </div>
            <div className="control-panel">
                 <div className="control-step">
                    <h2>1. Sube tu logo (preferiblemente PNG transparente)</h2>
                    <label htmlFor="file-upload" className={`file-upload-area ${file ? 'has-file' : ''}`}>
                      <p>{file ? 'Archivo seleccionado:' : 'Haz clic o arrastra un archivo aquí'}</p>
                      {file && <span className="file-name">{file.name}</span>}
                    </label>
                    <input id="file-upload" type="file" onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                </div>
                 <div className="control-step">
                    <h2>2. Contexto de la Marca (Opcional)</h2>
                    <textarea value={brandContext} onChange={(e) => setBrandContext(e.target.value)} placeholder="Ej: una marca de café artesanal y ecológica..." />
                </div>
                <button onClick={handleGenerateAllClick} disabled={isGeneratingAll || !file} className="generate-button">
                    {isGeneratingAll ? 'Generando...' : 'Generar 10 Mockups'}
                </button>
            </div>
            <div className="results-grid">
                {mockups.map((mockup, index) => (
                    <ResultCard key={mockup.id} state={mockup} onRegenerate={() => handleRegenerateClick(index)}>
                      <div className="card-content">
                        <div className="card-image-container">
                           {mockup.imageData && <img src={mockup.imageData.url} alt={`Mockup ${mockup.prompt}`} className="card-image" />}
                        </div>
                        <div className="card-footer">
                            <p className="card-prompt-text">{mockup.prompt}</p>
                        </div>
                      </div>
                    </ResultCard>
                ))}
            </div>
        </>
    );
};

const LogoGenerator = () => {
    const [description, setDescription] = useState('');
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [logos, setLogos] = useState<ImageState[]>([]);

    const LOGO_STYLES = ["Minimalist", "Vintage", "Watercolor", "Geometric", "3D", "Neon", "Hand-drawn", "Abstract", "Modern", "Corporate"];

    const runGeneration = async (style: string, index: number) => {
        setLogos(prev => {
            const newLogos = [...prev];
            newLogos[index] = { ...newLogos[index], isLoading: true, error: null };
            return newLogos;
        });

        try {
            const result = await generateLogo(description, style);
            const url = `data:${result.mimeType};base64,${result.base64Data}`;
            
             setLogos(prev => {
                const newLogos = [...prev];
                const updatedLogo = { ...newLogos[index], isLoading: false, imageData: { url, mimeType: result.mimeType } };
                return Object.assign([], prev, { [index]: updatedLogo });
            });
        } catch (e: any) {
             setLogos(prev => {
                const newLogos = [...prev];
                const updatedLogo = { ...newLogos[index], isLoading: false, error: e.message };
                return Object.assign([], prev, { [index]: updatedLogo });
            });
        }
    };
    
    const handleGenerateAllClick = async () => {
        if (!description) {
            alert("Por favor, describe el logo que quieres crear.");
            return;
        }
        setIsGeneratingAll(true);
        const initialStates: ImageState[] = LOGO_STYLES.map((style, i) => ({
            id: i,
            isLoading: false,
            error: null,
            imageData: null,
            prompt: description,
            style: style,
        }));
        setLogos(initialStates);
        
        await Promise.all(LOGO_STYLES.map((style, i) => runGeneration(style, i)));
        setIsGeneratingAll(false);
    };

    const handleRegenerateClick = (index: number) => {
        const style = logos[index].style;
        if (style) {
            runGeneration(style, index);
        }
    };

    return (
        <>
            <div className="page-header">
                <h1>Generador de Logos con IA</h1>
                <p>Transforma tus ideas en logos. Describe tu concepto y la IA te dará 10 variaciones en diferentes estilos artísticos.</p>
            </div>
            <div className="control-panel">
                <div className="control-step">
                    <h2>1. Describe el logo que imaginas</h2>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Un zorro astuto leyendo un libro para una librería..." />
                </div>
                <button onClick={handleGenerateAllClick} disabled={isGeneratingAll || !description} className="generate-button">
                    {isGeneratingAll ? 'Generando...' : 'Generar 10 Logos'}
                </button>
            </div>
            <div className="results-grid">
                {logos.map((logo, index) => (
                     <ResultCard key={logo.id} state={logo} onRegenerate={() => handleRegenerateClick(index)}>
                       <div className="card-content">
                         <div className="card-image-container">
                            {logo.imageData && <img src={logo.imageData.url} alt={`Logo idea: ${logo.prompt}`} className="card-image" />}
                         </div>
                         <div className="card-footer">
                             <p className="card-prompt-text">Estilo: <span>{logo.style || 'Desconocido'}</span></p>
                         </div>
                       </div>
                     </ResultCard>
                ))}
            </div>
        </>
    );
};


const BrandingAssistant = () => {
    const [description, setDescription] = useState('');
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [concepts, setConcepts] = useState<BrandingState[]>([]);

    const runGeneration = async (index: number) => {
        setConcepts(prev => {
            const newConcepts = [...prev];
            newConcepts[index] = { ...newConcepts[index], isLoading: true, error: null };
            return newConcepts;
        });

        try {
            // We call the main function once and distribute the results
            const results = await generateBranding(description);
            if (results.length > index) {
                setConcepts(prev => {
                    const newConcepts = [...prev];
                    newConcepts[index] = { ...newConcepts[index], isLoading: false, concept: results[index] };
                    return newConcepts;
                });
            } else {
                 throw new Error("No se recibió un concepto para este índice.");
            }
        } catch (e: any) {
            setConcepts(prev => {
                const newConcepts = [...prev];
                newConcepts[index] = { ...newConcepts[index], isLoading: false, error: e.message };
                return newConcepts;
            });
        }
    };
    
    const handleGenerateAllClick = async () => {
        if (!description) {
            alert("Por favor, describe la esencia de la marca.");
            return;
        }
        setIsGeneratingAll(true);
        const initialStates: BrandingState[] = Array.from({ length: 10 }, (_, i) => ({
            id: i,
            isLoading: true,
            error: null,
            concept: null,
        }));
        setConcepts(initialStates);

        try {
            const results = await generateBranding(description);
            setConcepts(results.map((concept, i) => ({
                id: i,
                isLoading: false,
                error: null,
                concept: concept
            })));
        } catch (e: any) {
             setConcepts(initialStates.map(s => ({...s, isLoading: false, error: e.message})));
        } finally {
            setIsGeneratingAll(false);
        }
    };

    const handleRegenerateClick = (index: number) => {
        // This is tricky as we get all 10 at once.
        // A simple approach is to re-run the whole batch and replace just one.
        // A better approach for a single regen would need a more complex API call.
        // For now, let's just show an alert.
        alert("La regeneración individual para conceptos de branding se implementará pronto. Por ahora, puedes generar un nuevo lote completo.");
    };

    return (
        <>
            <div className="page-header">
                <h1>Asistente de Branding con IA</h1>
                <p>Define la identidad de una marca. Describe su esencia y obtén 10 conceptos completos con paletas de colores, tipografías y tono de voz.</p>
            </div>
             <div className="control-panel">
                <div className="control-step">
                    <h2>1. Describe la esencia de la marca</h2>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Lujo, exclusividad y tradición para una marca de relojes..." />
                </div>
                <button onClick={handleGenerateAllClick} disabled={isGeneratingAll || !description} className="generate-button">
                    {isGeneratingAll ? 'Generando...' : 'Generar 10 Ideas'}
                </button>
            </div>
            <div className="results-grid">
                {concepts.map((conceptState, index) => (
                    <ResultCard key={conceptState.id} state={conceptState} onRegenerate={() => handleRegenerateClick(index)}>
                        {conceptState.concept && (
                            <div className="branding-card">
                                <div className="branding-section">
                                    <h4>Paleta de Colores</h4>
                                    <div className="palette">
                                        {conceptState.concept.colorPalette.map(color => (
                                            <div key={color} className="color-swatch" style={{ backgroundColor: color }} title={color}>
                                                <span>{color}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="branding-section">
                                    <h4>Tipografía</h4>
                                    <p>{conceptState.concept.typographySuggestion}</p>
                                </div>
                                <div className="branding-section">
                                    <h4>Tono de Voz</h4>
                                    <p>{conceptState.concept.toneOfVoice}</p>
                                </div>
                                <div className="branding-footer">
                                    {/* Footer content can go here if needed */}
                                </div>
                            </div>
                        )}
                    </ResultCard>
                ))}
            </div>
        </>
    );
};

// --- Main App Component ---

function App() {
  const [page, setPage] = useState<Page>('mockups');

  const renderPage = () => {
    switch(page) {
      case 'mockups':
        return <MockupGenerator />;
      case 'logos':
        return <LogoGenerator />;
      case 'branding':
        return <BrandingAssistant />;
      default:
        return <MockupGenerator />;
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          Suite Creativa <span>IA</span>
        </div>
        <nav className="sidebar-nav">
          <div className={`nav-tab ${page === 'mockups' ? 'active' : ''}`} onClick={() => setPage('mockups')}>
            Generador de Mockups
          </div>
          <div className={`nav-tab ${page === 'logos' ? 'active' : ''}`} onClick={() => setPage('logos')}>
            Generador de Logos
          </div>
           <div className={`nav-tab ${page === 'branding' ? 'active' : ''}`} onClick={() => setPage('branding')}>
            Asistente de Branding
          </div>
        </nav>
      </aside>
      <main className="main-container">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
