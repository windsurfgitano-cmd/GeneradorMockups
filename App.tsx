import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    generateMockup, generateImageFromText, generateBranding, 
    generateSocialPostIdeas, generateCampaignIdeas, generateScripts, 
    generateVideo, getVideoOperationStatus, analyzeImage,
    generateCopywriting, generatePersonas, generateSeoIdeas,
    generateNamesAndSlogans
} from './services/geminiService';
import { fileToBase64, exportResultsAsTxt } from './utils/fileUtils';

// --- Types ---
type Page = 
    | 'mockups' | 'logos' | 'branding' | 'social' | 'campaigns' 
    | 'scripts' | 'video' | 'analyzer' | 'copywriting' | 'personas'
    | 'seo' | 'names';
    
type Status = 'idle' | 'loading' | 'success' | 'error';

interface Result {
    id: number;
    status: Status;
    data?: any;
    error?: string;
    prompt?: string;
    style?: string;
}

// --- Main App Component ---
const App: React.FC = () => {
    const [page, setPage] = useState<Page>('mockups');

    const pages: Record<Page, { title: string; description: string; component: React.FC }> = {
        mockups: { title: 'Generador de Mockups', description: 'Sube tu logo y crea 10 mockups realistas al instante.', component: MockupGenerator },
        logos: { title: 'Generador de Logos', description: 'Describe tu marca y obtén 10 conceptos de logo con estilos variados.', component: LogoGenerator },
        branding: { title: 'Asistente de Branding', description: 'Define la esencia de una marca y recibe 10 propuestas de identidad visual.', component: BrandingAssistant },
        social: { title: 'Posts para Redes', description: 'Genera 10 pares de imagen + copy listos para publicar en redes sociales.', component: SocialPostGenerator },
        campaigns: { title: 'Ideas de Campaña', description: 'Obtén 10 conceptos de campaña de marketing a partir de tus objetivos.', component: CampaignIdeaGenerator },
        scripts: { title: 'Guiones para Reels', description: 'Crea 10 guiones estructurados para videos cortos (Reels/TikTok).', component: ScriptGenerator },
        video: { title: 'Generador de Videos', description: 'Crea un video corto a partir de una imagen usando el modelo Veo de IA.', component: VideoGenerator },
        analyzer: { title: 'Analizador de Imágenes', description: 'Sube una imagen y obtén un análisis de marketing experto.', component: ImageAnalyzer },
        copywriting: { title: 'Asistente de Copywriting', description: 'Genera 10 variantes de textos publicitarios para distintos formatos.', component: CopywritingAssistant },
        personas: { title: 'Creador de Personas', description: 'Crea 10 perfiles de "Buyer Persona" para entender a tu audiencia.', component: PersonaGenerator },
        seo: { title: 'Asistente SEO', description: 'Obtén ideas de contenido optimizado para motores de búsqueda.', component: SeoAssistant },
        names: { title: 'Nombres y Slogans', description: 'Genera nombres y slogans creativos para tu nueva marca o producto.', component: NameSloganGenerator },
    };

    const CurrentPage = pages[page].component;

    return (
        <>
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1 className="sidebar-super-title">EL REY DE LAS PAGINAS</h1>
                    <h2 className="sidebar-title">Suite Creativa</h2>
                    <p className="sidebar-subtitle">Potenciada por IA</p>
                </div>
                <nav className="sidebar-nav">
                    {Object.keys(pages).map(p => (
                        <a key={p} className={`nav-tab ${page === p ? 'active' : ''}`} onClick={() => setPage(p as Page)}>
                            {pages[p as Page].title}
                        </a>
                    ))}
                </nav>
            </aside>
            <main className="main-container">
                <header className="page-header">
                    <h1 className="page-title">{pages[page].title}</h1>
                    <p className="page-description">{pages[page].description}</p>
                </header>
                <CurrentPage />
            </main>
        </>
    );
};

// --- Helper Components & Hooks ---
const useGenerator = <T,>(apiCall: (params: T, index: number) => Promise<any>, resultCount: number = 10) => {
    const [results, setResults] = useState<Result[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const generate = async (params: T) => {
        setIsLoading(true);
        const initialResults: Result[] = Array.from({ length: resultCount }, (_, i) => ({ id: i, status: 'loading' }));
        setResults(initialResults);

        const promises = initialResults.map((_, i) =>
            apiCall(params, i).then(
                data => ({ id: i, status: 'success' as Status, data }),
                error => ({ id: i, status: 'error' as Status, error: error.message })
            )
        );

        for (const promise of promises) {
            const result = await promise;
            setResults(prev => prev.map(r => r.id === result.id ? { ...r, ...result } : r));
        }
        setIsLoading(false);
    };

    const regenerate = async (index: number, params: T) => {
        setResults(prev => prev.map((r, i) => i === index ? { ...r, status: 'loading' } : r));
        try {
            const data = await apiCall(params, index);
            setResults(prev => prev.map((r, i) => i === index ? { ...r, status: 'success', data, error: undefined } : r));
        } catch (error: any) {
            setResults(prev => prev.map((r, i) => i === index ? { ...r, status: 'error', error: error.message } : r));
        }
    };
    
    return { results, isLoading, generate, regenerate, setResults };
};

const ResultCard: React.FC<{ children: React.ReactNode; result: Result; onRegenerate: () => void; showRegenerate: boolean; }> = 
({ children, result, onRegenerate, showRegenerate }) => (
    <div className="card">
        {result.status === 'loading' && <div className="card-image-placeholder"><div className="spinner" /></div>}
        {result.status === 'error' && <div className="card-image-placeholder"><p className="error-message">{result.error}</p></div>}
        {result.status === 'success' && children}
        {showRegenerate && (
            <div className="card-actions">
                <button onClick={onRegenerate} disabled={result.status === 'loading'}>Regenerar</button>
            </div>
        )}
    </div>
);

// --- Tool Components ---

const MockupGenerator: React.FC = () => {
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [brandContext, setBrandContext] = useState('');
    const { results, isLoading, generate, regenerate } = useGenerator(
        (params: { base64Logo: string; mimeType: string; brandContext: string; }) => generateMockup(params)
    );

    const handleGenerate = async () => {
        if (!logoFile) return;
        const { base64, mimeType } = await fileToBase64(logoFile);
        generate({ base64Logo: base64, mimeType, brandContext });
    };

    const handleRegenerate = async (index: number) => {
        if (!logoFile) return;
        const { base64, mimeType } = await fileToBase64(logoFile);
        regenerate(index, { base64Logo: base64, mimeType, brandContext });
    };
    
    const handleExport = () => exportResultsAsTxt(
      results.filter(r => r.status === 'success').map((r, i) => `Mockup ${i + 1}:\nPrompt: ${r.data.prompt}\n(Imagen generada)`).join('\n\n'),
      'mockup_results.txt'
    );


    return (
        <div>
            <div className="control-panel">
                <div className="input-group">
                    <label>1. Sube tu logo</label>
                    <label htmlFor="logo-upload" className="file-input-label">Seleccionar archivo</label>
                    <input id="logo-upload" type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="file-input" />
                    {logoFile && <span className="file-name">{logoFile.name}</span>}
                </div>
                <div className="input-group">
                    <label>2. Contexto de la Marca (Opcional)</label>
                    <textarea value={brandContext} onChange={(e) => setBrandContext(e.target.value)} placeholder="Ej: una marca de café artesanal y ecológica" />
                </div>
                 <div className="button-group">
                    <button onClick={handleGenerate} disabled={!logoFile || isLoading}>
                        {isLoading ? 'Generando...' : 'Generar 10 Mockups'}
                    </button>
                     {results.some(r => r.status === 'success') && <button onClick={handleExport} className="export-button">Exportar Resultados</button>}
                </div>
            </div>
            <div className="results-grid">
                {results.map((result, i) => (
                    <ResultCard key={i} result={result} onRegenerate={() => handleRegenerate(i)} showRegenerate={result.status !== 'idle'}>
                        <img src={`data:${result.data?.mimeType};base64,${result.data?.base64Image}`} alt="Generated mockup" />
                    </ResultCard>
                ))}
            </div>
        </div>
    );
};

const LogoGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const { results, isLoading, generate, regenerate } = useGenerator(
        (params: { prompt: string }) => generateImageFromText(params.prompt)
    );
    
     const handleExport = () => exportResultsAsTxt(
        results.filter(r => r.status === 'success').map(r => `Logo Idea:\nPrompt: ${r.data.prompt}`).join('\n\n'),
        'logo_results.txt'
    );

    return (
        <div>
            <div className="control-panel">
                <div className="input-group">
                    <label>Describe el logo que imaginas</label>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ej: Un zorro astuto leyendo un libro para una librería" />
                </div>
                <div className="button-group">
                    <button onClick={() => generate({ prompt })} disabled={!prompt || isLoading}>
                        {isLoading ? 'Generando...' : 'Generar 10 Logos'}
                    </button>
                    {results.some(r => r.status === 'success') && <button onClick={handleExport} className="export-button">Exportar Resultados</button>}
                </div>
            </div>
            <div className="results-grid">
                {results.map((result, i) => (
                    <ResultCard key={i} result={result} onRegenerate={() => regenerate(i, { prompt })} showRegenerate={result.status !== 'idle'}>
                         <h3 className="card-title">{result.data?.style}</h3>
                         <img src={`data:${result.data?.mimeType};base64,${result.data?.base64Image}`} alt={result.data?.prompt} />
                    </ResultCard>
                ))}
            </div>
        </div>
    );
};

const BrandingAssistant: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const { results, isLoading, generate, regenerate } = useGenerator(
        (params: { prompt: string }) => generateBranding(params.prompt, 1)
    );
    
    const formatExport = (data: any) => {
      const palette = data.colors.join(', ');
      return `Paleta de Colores: ${palette}\nTipografía: ${data.typography.fontPairing}\nTono de Voz: ${data.toneOfVoice.description}`;
    };

    const handleExport = () => exportResultsAsTxt(
        results.filter(r => r.status === 'success').map((r, i) => `Concepto de Branding ${i + 1}:\n${formatExport(r.data[0])}`).join('\n\n---\n\n'),
        'branding_results.txt'
    );

    return (
        <div>
            <div className="control-panel">
                <div className="input-group">
                    <label>Describe la esencia de la marca</label>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ej: Una marca de cuidado de la piel, vegana y natural" />
                </div>
                <div className="button-group">
                    <button onClick={() => generate({ prompt })} disabled={!prompt || isLoading}>
                        {isLoading ? 'Generando...' : 'Generar 10 Ideas'}
                    </button>
                    {results.some(r => r.status === 'success') && <button onClick={handleExport} className="export-button">Exportar Resultados</button>}
                </div>
            </div>
            <div className="results-grid">
                {results.map((result, i) => (
                    <ResultCard key={i} result={result} onRegenerate={() => regenerate(i, { prompt })} showRegenerate={result.status !== 'idle'}>
                        <div className="card-content branding-card">
                           <div className="branding-details">
                               <h4>Paleta de Colores</h4>
                               <div className="palette">
                                   {result.data?.[0]?.colors.map((color: string) => <div key={color} className="color-swatch" style={{ backgroundColor: color }}></div>)}
                               </div>
                           </div>
                           <div className="branding-details">
                               <h4>Tipografía</h4>
                               <p>{result.data?.[0]?.typography.fontPairing}</p>
                           </div>
                           <div className="branding-details">
                               <h4>Tono de Voz</h4>
                               <p>{result.data?.[0]?.toneOfVoice.description}</p>
                           </div>
                        </div>
                    </ResultCard>
                ))}
            </div>
        </div>
    );
};

const SocialPostGenerator: React.FC = () => {
    const { results, isLoading, generate, regenerate, setResults } = useGenerator<{ prompt: string }>(
        async (params, index) => {
            // Step 1: Get the text idea first (only for initial generation)
            if (!results[index]?.data?.copy) {
                const ideas = await generateSocialPostIdeas(params.prompt);
                // For regeneration, we stick to the old idea. For new, we get a new one.
                const idea = ideas[index] || ideas[0]; 
                // Step 2: Generate image from the idea's imagePrompt
                const imageData = await generateImageFromText(idea.imagePrompt, true);
                return { ...idea, ...imageData };
            } else {
                 // On regenerate, just get a new image for the existing copy
                 const imageData = await generateImageFromText(results[index].data.imagePrompt, true);
                 return { ...results[index].data, ...imageData };
            }
        }
    );
     const [prompt, setPrompt] = useState('');

    const handleGenerate = () => {
        setResults([]); // Clear previous results before starting
        generate({ prompt });
    };
    
    const handleExport = () => exportResultsAsTxt(
        results.filter(r => r.status === 'success').map((r, i) => `Post ${i + 1}:\nCopy: ${r.data.copy}\nPrompt de Imagen: ${r.data.imagePrompt}`).join('\n\n---\n\n'),
        'social_posts_results.txt'
    );

    return (
        <div>
            <div className="control-panel">
                <div className="input-group">
                    <label>¿Cuál es el objetivo del post?</label>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ej: Promocionar un descuento del 20% en nuestro café de origen colombiano." />
                </div>
                 <div className="button-group">
                    <button onClick={handleGenerate} disabled={!prompt || isLoading}>
                        {isLoading ? 'Generando...' : 'Generar 10 Posts'}
                    </button>
                    {results.some(r => r.status === 'success') && <button onClick={handleExport} className="export-button">Exportar Resultados</button>}
                </div>
            </div>
            <div className="results-grid">
                {results.map((result, i) => (
                    <ResultCard key={i} result={result} onRegenerate={() => regenerate(i, { prompt })} showRegenerate={result.status !== 'idle'}>
                         <img src={`data:${result.data?.mimeType};base64,${result.data?.base64Image}`} alt={result.data?.imagePrompt} />
                         <div className="card-content social-post-card">
                            <p className="card-copy-text">{result.data?.copy}</p>
                            <button className="copy-button" onClick={() => navigator.clipboard.writeText(result.data?.copy)}>Copiar Texto</button>
                         </div>
                    </ResultCard>
                ))}
            </div>
        </div>
    );
};

const CampaignIdeaGenerator: React.FC = () => {
    const [product, setProduct] = useState('');
    const [objective, setObjective] = useState('');
    const [audience, setAudience] = useState('');

    const { results, isLoading, generate, regenerate } = useGenerator(
        (params: { fullPrompt: string }) => generateCampaignIdeas(params.fullPrompt, 1)
    );

    const handleGenerate = () => {
        const fullPrompt = `Producto: ${product}. Objetivo: ${objective}. Público: ${audience}.`;
        generate({ fullPrompt });
    };
    
    const formatExport = (data: any) => {
        const actions = data.keyActions.map((action: string) => `- ${action}`).join('\n');
        return `Concepto: ${data.concept}\nResumen: ${data.summary}\nAcciones Clave:\n${actions}`;
    };
    
    const handleExport = () => exportResultsAsTxt(
        results.filter(r => r.status === 'success').map((r, i) => `Idea de Campaña ${i + 1}:\n${formatExport(r.data[0])}`).join('\n\n---\n\n'),
        'campaign_ideas.txt'
    );

    return (
        <div>
            <div className="control-panel">
                 <div className="input-group">
                    <label>Producto/Servicio</label>
                    <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Ej: App de meditación" />
                </div>
                <div className="input-group">
                    <label>Objetivo Principal</label>
                    <input type="text" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ej: Conseguir 10,000 nuevos usuarios" />
                </div>
                <div className="input-group">
                    <label>Público Objetivo</label>
                    <input type="text" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Ej: Jóvenes profesionales con estrés" />
                </div>
                <div className="button-group">
                    <button onClick={handleGenerate} disabled={!product || !objective || !audience || isLoading}>
                        {isLoading ? 'Generando...' : 'Generar 10 Ideas'}
                    </button>
                    {results.some(r => r.status === 'success') && <button onClick={handleExport} className="export-button">Exportar Resultados</button>}
                </div>
            </div>
            <div className="results-grid">
                {results.map((result, i) => (
                    <ResultCard key={i} result={result} onRegenerate={() => regenerate(i, { fullPrompt: `Producto: ${product}. Objetivo: ${objective}. Público: ${audience}.` })} showRegenerate={result.status !== 'idle'}>
                        <div className="card-content campaign-card">
                           <h3>{result.data?.[0]?.concept}</h3>
                           <p>{result.data?.[0]?.summary}</p>
                           <h4>Acciones Clave:</h4>
                           <ul>
                            {result.data?.[0]?.keyActions.map((action: string) => <li key={action}>{action}</li>)}
                           </ul>
                        </div>
                    </ResultCard>
                ))}
            </div>
        </div>
    );
};

const ScriptGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const { results, isLoading, generate, regenerate } = useGenerator(
        (params: { prompt: string }) => generateScripts(params.prompt, 1)
    );
    
    const formatExport = (data: any) => `Concepto: ${data.concept}\nGuion:\n${data.script}`;

    const handleExport = () => exportResultsAsTxt(
        results.filter(r => r.status === 'success').map((r, i) => `Guion ${i + 1}:\n${formatExport(r.data[0])}`).join('\n\n---\n\n'),
        'script_results.txt'
    );

    return (
         <div>
            <div className="control-panel">
                <div className="input-group">
                    <label>Tema o mensaje clave del video</label>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ej: Un tip rápido para mejorar la productividad por la mañana" />
                </div>
                <div className="button-group">
                    <button onClick={() => generate({ prompt })} disabled={!prompt || isLoading}>
                        {isLoading ? 'Generando...' : 'Generar 10 Guiones'}
                    </button>
                    {results.some(r => r.status === 'success') && <button onClick={handleExport} className="export-button">Exportar Resultados</button>}
                </div>
            </div>
            <div className="results-grid">
                {results.map((result, i) => (
                    <ResultCard key={i} result={result} onRegenerate={() => regenerate(i, { prompt })} showRegenerate={result.status !== 'idle'}>
                       <div className="card-content script-card">
                           <h3>{result.data?.[0]?.concept}</h3>
                           <p>{result.data?.[0]?.script}</p>
                       </div>
                    </ResultCard>
                ))}
            </div>
        </div>
    );
};

const VideoGenerator: React.FC = () => {
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const operationRef = useRef<any>(null);

    useEffect(() => {
        window.aistudio?.hasSelectedApiKey().then(selected => setApiKeySelected(selected));
    }, []);

    const pollOperation = useCallback(async (op: any) => {
        setIsLoading(true);
        setError(null);
        try {
            let currentOp = op;
            while (!currentOp.done) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                const status = await getVideoOperationStatus(currentOp);
                if (status) {
                    currentOp = status;
                } else {
                    throw new Error("Failed to get operation status.");
                }
            }
            operationRef.current = currentOp;
            const uri = currentOp.response?.generatedVideos?.[0]?.video?.uri;
            if (uri) {
                const videoResponse = await fetch(`${uri}&key=${process.env.API_KEY}`);
                const blob = await videoResponse.blob();
                setVideoUrl(URL.createObjectURL(blob));
            } else {
                throw new Error("Video generation completed, but no URI was found.");
            }
        } catch (e: unknown) {
            let message = "An unknown error occurred during video processing.";
            if (e instanceof Error) {
                message = e.message;
                if (message.includes("Requested entity was not found")) {
                    message = "Error de API. Por favor, selecciona tu clave de API de nuevo.";
                    setApiKeySelected(false);
                }
            }
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);


    const handleGenerate = async () => {
        if (!imageFile || !prompt) return;
        setIsLoading(true);
        setError(null);
        setVideoUrl(null);
        try {
            const { base64, mimeType } = await fileToBase64(imageFile);
            const initialOp = await generateVideo({ base64Image: base64, mimeType, prompt, aspectRatio });
            if (initialOp) {
                pollOperation(initialOp);
            }
        } catch (e: any) {
            setError(e.message);
            setIsLoading(false);
        }
    };

    const handleSelectKey = async () => {
        await window.aistudio?.openSelectKey();
        setApiKeySelected(true); // Assume success to avoid race condition
    };

    if (!apiKeySelected) {
        return (
            <div className="control-panel">
                <p>Para usar el generador de videos, debes seleccionar una clave de API de un proyecto con facturación habilitada.</p>
                <button onClick={handleSelectKey}>Seleccionar Clave de API</button>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer">Más información sobre facturación</a>
            </div>
        );
    }

    return (
        <div>
            <div className="control-panel">
                 <div className="input-group">
                    <label>1. Sube una imagen de inicio</label>
                    <label htmlFor="video-img-upload" className="file-input-label">Seleccionar archivo</label>
                    <input id="video-img-upload" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="file-input" />
                    {imageFile && <span className="file-name">{imageFile.name}</span>}
                </div>
                <div className="input-group">
                    <label>2. Describe qué sucede en el video</label>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ej: un dron vuela lentamente hacia adelante..." />
                </div>
                 <div className="input-group aspect-ratio-selector">
                    <label>3. Formato del Video</label>
                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16')}>
                        <option value="16:9">Horizontal (16:9)</option>
                        <option value="9:16">Vertical (9:16)</option>
                    </select>
                </div>
                <button onClick={handleGenerate} disabled={!imageFile || !prompt || isLoading}>
                    {isLoading ? 'Generando video (puede tardar unos minutos)...' : 'Generar Video'}
                </button>
            </div>
            {error && <p className="error-message">{error}</p>}
             {videoUrl && (
                <div className="video-player">
                    <video src={videoUrl} controls autoPlay loop style={{maxWidth: '100%', borderRadius: '12px'}}/>
                    <a href={videoUrl} download="generated-video.mp4">
                        <button style={{marginTop: '1rem'}}>Descargar Video</button>
                    </a>
                </div>
            )}
        </div>
    );
};

const ImageAnalyzer: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    const handleAnalyze = async () => {
        if (!imageFile) return;
        setIsLoading(true);
        setError(null);
        setAnalysis('');
        try {
            const { base64, mimeType } = await fileToBase64(imageFile);
            const result = await analyzeImage({ base64Image: base64, mimeType });
            setAnalysis(result || "No se pudo obtener un análisis.");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };
    
     const handleExport = () => exportResultsAsTxt(analysis, 'image_analysis.txt');

    return (
        <div>
            <div className="control-panel">
                <div className="input-group">
                    <label>Sube una imagen para analizar</label>
                    <label htmlFor="analyze-upload" className="file-input-label">Seleccionar archivo</label>
                    <input id="analyze-upload" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="file-input" />
                    {imageFile && <span className="file-name">{imageFile.name}</span>}
                </div>
                <button onClick={handleAnalyze} disabled={!imageFile || isLoading}>
                    {isLoading ? 'Analizando...' : 'Analizar Imagen'}
                </button>
            </div>
             {error && <p className="error-message">{error}</p>}
             {analysis && (
                <div className="analyzer-layout">
                    <div className="analyzer-image-container">
                        <img src={URL.createObjectURL(imageFile!)} alt="Imagen para analizar"/>
                    </div>
                    <div>
                         <div className="button-group" style={{marginBottom: '1rem'}}>
                            <button onClick={() => navigator.clipboard.writeText(analysis)} className="export-button">Copiar Análisis</button>
                            <button onClick={handleExport} className="export-button">Descargar Análisis</button>
                        </div>
                        <p className="analyzer-text">{analysis}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const CopywritingAssistant: React.FC = () => {
    const [product, setProduct] = useState('');
    const [audience, setAudience] = useState('');
    const [tone, setTone] = useState('');
    const [format, setFormat] = useState('Anuncio de Facebook');

    const { results, isLoading, generate, regenerate } = useGenerator(
        (params: { fullPrompt: string }) => generateCopywriting(params.fullPrompt, 1)
    );

    const handleGenerate = () => {
        const fullPrompt = `Producto/Servicio: ${product}\nPúblico Objetivo: ${audience}\nTono de Voz: ${tone}\nFormato: ${format}`;
        generate({ fullPrompt });
    };
    
    const handleExport = () => exportResultsAsTxt(
        results.filter(r => r.status === 'success').map((r, i) => `Variante de Copy ${i + 1}:\n${r.data[0].copy}`).join('\n\n---\n\n'),
        'copywriting_results.txt'
    );

    return (
        <div>
            <div className="control-panel">
                <div className="input-group">
                    <label>Producto/Servicio</label>
                    <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Ej: Curso online de finanzas personales" />
                </div>
                <div className="input-group">
                    <label>Público Objetivo</label>
                    <input type="text" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Ej: Millennials que quieren empezar a invertir" />
                </div>
                 <div className="input-group">
                    <label>Tono de Voz</label>
                    <input type="text" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Ej: Educativo, motivador y sin jerga" />
                </div>
                 <div className="input-group">
                    <label>Formato</label>
                    <select value={format} onChange={(e) => setFormat(e.target.value)}>
                        <option>Anuncio de Facebook</option>
                        <option>Título para Google Ads</option>
                        <option>Asunto de Email</option>
                        <option>Descripción de Producto</option>
                    </select>
                </div>
                <div className="button-group">
                    <button onClick={handleGenerate} disabled={!product || !audience || !tone || isLoading}>
                        {isLoading ? 'Generando...' : 'Generar 10 Variantes'}
                    </button>
                     {results.some(r => r.status === 'success') && <button onClick={handleExport} className="export-button">Exportar Resultados</button>}
                </div>
            </div>
             <div className="results-grid">
                {results.map((result, i) => (
                    <ResultCard key={i} result={result} onRegenerate={() => regenerate(i, { fullPrompt: `Producto/Servicio: ${product}\nPúblico Objetivo: ${audience}\nTono de Voz: ${tone}\nFormato: ${format}` })} showRegenerate={result.status !== 'idle'}>
                       <div className="card-content script-card">
                           <h3>Variante {i + 1}</h3>
                           <p>{result.data?.[0]?.copy}</p>
                       </div>
                    </ResultCard>
                ))}
            </div>
        </div>
    );
};

const PersonaGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const { results, isLoading, generate, regenerate } = useGenerator(
        (params: { prompt: string }) => generatePersonas(params.prompt, 1)
    );
    
     const formatExport = (data: any) => {
        return `Nombre: ${data.name}, ${data.age} años\nOcupación: ${data.occupation}\nBio: ${data.bio}\nMetas: ${data.goals}\nPuntos de Dolor: ${data.painPoints}`;
    };

    const handleExport = () => exportResultsAsTxt(
        results.filter(r => r.status === 'success').map((r, i) => `Persona ${i + 1}:\n${formatExport(r.data[0])}`).join('\n\n---\n\n'),
        'personas_results.txt'
    );

    return (
        <div>
            <div className="control-panel">
                <div className="input-group">
                    <label>Describe tu producto y tu cliente ideal</label>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ej: Una marca de café de especialidad, sostenible, para conocedores que trabajan desde casa" />
                </div>
                <div className="button-group">
                    <button onClick={() => generate({ prompt })} disabled={!prompt || isLoading}>
                        {isLoading ? 'Generando...' : 'Crear 10 Personas'}
                    </button>
                     {results.some(r => r.status === 'success') && <button onClick={handleExport} className="export-button">Exportar Resultados</button>}
                </div>
            </div>
             <div className="results-grid">
                {results.map((result, i) => (
                    <ResultCard key={i} result={result} onRegenerate={() => regenerate(i, { prompt })} showRegenerate={result.status !== 'idle'}>
                       <div className="card-content persona-card">
                           <h3>{result.data?.[0]?.name}, {result.data?.[0]?.age}</h3>
                           <p><strong>Ocupación:</strong> {result.data?.[0]?.occupation}</p>
                           <p><strong>Bio:</strong> {result.data?.[0]?.bio}</p>
                           <p><strong>Metas:</strong> {result.data?.[0]?.goals}</p>
                           <p><strong>Puntos de Dolor:</strong> {result.data?.[0]?.painPoints}</p>
                       </div>
                    </ResultCard>
                ))}
            </div>
        </div>
    );
};

const SeoAssistant: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const { results, isLoading, generate, regenerate } = useGenerator(
        (params: { prompt: string }) => generateSeoIdeas(params.prompt, 1)
    );
    
     const formatExport = (data: any) => `Tipo: ${data.type}\nContenido: ${data.content}`;

    const handleExport = () => exportResultsAsTxt(
        results.filter(r => r.status === 'success').map((r, i) => `Idea SEO ${i + 1}:\n${formatExport(r.data[0])}`).join('\n\n---\n\n'),
        'seo_ideas.txt'
    );

    return (
        <div>
            <div className="control-panel">
                <div className="input-group">
                    <label>Tema o Palabra Clave Principal</label>
                    <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ej: cómo empezar a invertir en criptomonedas" />
                </div>
                 <div className="button-group">
                    <button onClick={() => generate({ prompt })} disabled={!prompt || isLoading}>
                        {isLoading ? 'Generando...' : 'Generar 10 Ideas'}
                    </button>
                    {results.some(r => r.status === 'success') && <button onClick={handleExport} className="export-button">Exportar Resultados</button>}
                </div>
            </div>
             <div className="results-grid">
                {results.map((result, i) => (
                    <ResultCard key={i} result={result} onRegenerate={() => regenerate(i, { prompt })} showRegenerate={result.status !== 'idle'}>
                       <div className="card-content">
                           <h4>{result.data?.[0]?.type.toUpperCase()}</h4>
                           <p>{result.data?.[0]?.content}</p>
                       </div>
                    </ResultCard>
                ))}
            </div>
        </div>
    );
};

const NameSloganGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const { results, isLoading, generate, regenerate } = useGenerator(
        (params: { prompt: string }) => generateNamesAndSlogans(params.prompt, 1)
    );
    
    const formatExport = (data: any) => `Tipo: ${data.type}\nSugerencia: ${data.suggestion}\nJustificación: ${data.justification}`;

    const handleExport = () => exportResultsAsTxt(
        results.filter(r => r.status === 'success').map((r, i) => `Idea ${i + 1}:\n${formatExport(r.data[0])}`).join('\n\n---\n\n'),
        'names_slogans.txt'
    );

    return (
        <div>
            <div className="control-panel">
                <div className="input-group">
                    <label>Describe la esencia de tu negocio</label>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ej: Una app de delivery que solo entrega comida local y saludable en menos de 30 minutos" />
                </div>
                <div className="button-group">
                    <button onClick={() => generate({ prompt })} disabled={!prompt || isLoading}>
                        {isLoading ? 'Generando...' : 'Generar 10 Ideas'}
                    </button>
                    {results.some(r => r.status === 'success') && <button onClick={handleExport} className="export-button">Exportar Resultados</button>}
                </div>
            </div>
            <div className="results-grid">
                {results.map((result, i) => (
                    <ResultCard key={i} result={result} onRegenerate={() => regenerate(i, { prompt })} showRegenerate={result.status !== 'idle'}>
                       <div className="card-content">
                           <h4>{result.data?.[0]?.type.toUpperCase()}: {result.data?.[0]?.suggestion}</h4>
                           <p>{result.data?.[0]?.justification}</p>
                       </div>
                    </ResultCard>
                ))}
            </div>
        </div>
    );
};


export default App;
