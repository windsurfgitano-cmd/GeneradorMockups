

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    generateMockup, 
    generateImageFromText, 
    generateBranding, 
    generateSocialPostIdeas, 
    generateCampaignIdeas, 
    generateScripts,
    generateVideo,
    getVideoOperationStatus,
    analyzeImage,
    generateCopywriting,
    generatePersonas,
    generateSeoIdeas,
    generateNamesAndSlogans,
} from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

// Types
type Page = 'mockups' | 'logos' | 'branding' | 'social' | 'campaign' | 'scripts' | 'video' | 'analyzer' | 'copywriting' | 'personas' | 'seo' | 'names';
type Status = 'idle' | 'loading' | 'success' | 'error';

interface ResultItem {
  id: number;
  status: Status;
  error?: string;
  imageUrl?: string;
  data?: any; 
}

// Helper Components
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;
const RegenerateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.667 0l3.181-3.183m-3.181-4.991-3.181-3.183a8.25 8.25 0 0 0-11.667 0L2.985 15.653Z" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>;
const Loader = () => <div className="loader"></div>;

// Main App Component
function App() {
  const [page, setPage] = useState<Page>('mockups');

  const pageConfig = {
    mockups: { title: 'Generador de Mockups', description: 'Sube tu logo y obtén 10 mockups profesionales generados por IA al instante.' },
    logos: { title: 'Generador de Logos', description: 'Describe el logo que imaginas y la IA creará 10 conceptos con diferentes estilos.' },
    branding: { title: 'Asistente de Branding', description: 'Define la esencia de una marca y recibe 10 propuestas completas de identidad visual.' },
    copywriting: { title: 'Asistente de Copywriting', description: 'Crea 10 variantes de textos publicitarios de alto impacto para diferentes formatos.' },
    social: { title: 'Posts para Redes', description: 'Describe tu objetivo y la IA generará 10 pares de imagen y texto listos para publicar.' },
    campaign: { title: 'Ideas de Campaña', description: 'Detalla tu producto y objetivo para recibir 10 conceptos de campañas de marketing.' },
    scripts: { title: 'Guiones para Reels', description: 'Dale un tema a la IA y obtén 10 guiones estructurados para videos cortos virales.' },
    video: { title: 'Generador de Videos', description: 'Crea videos cortos a partir de una imagen y una descripción usando IA generativa.' },
    analyzer: { title: 'Analizador de Imágenes', description: 'Sube una imagen y recibe un análisis experto desde una perspectiva de marketing.' },
    personas: { title: 'Creador de Personas', description: 'Convierte la descripción de tu público en 10 perfiles de "Buyer Persona" detallados.' },
    seo: { title: 'Asistente SEO', description: 'Introduce un tema y obtén 10 ideas de contenido optimizado para motores de búsqueda.' },
    names: { title: 'Nombres y Slogans', description: 'Supera el bloqueo creativo generando 10 nombres y slogans para tu nueva marca.' },
  };

  const renderPage = () => {
    switch (page) {
      case 'mockups': return <MockupGenerator />;
      case 'logos': return <LogoGenerator />;
      case 'branding': return <BrandingAssistant />;
      case 'social': return <SocialPostGenerator />;
      case 'campaign': return <CampaignIdeaGenerator />;
      case 'scripts': return <ScriptGenerator />;
      case 'video': return <VideoGenerator />;
      case 'analyzer': return <ImageAnalyzer />;
      case 'copywriting': return <CopywritingAssistant />;
      case 'personas': return <PersonaGenerator />;
      case 'seo': return <SeoAssistant />;
      case 'names': return <NameSloganGenerator />;
      default: return <MockupGenerator />;
    }
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-super-title">EL REY DE LAS PAGINAS</h2>
          <h1 className="sidebar-title">Suite Creativa</h1>
          <p className="sidebar-subtitle">Potenciada por IA</p>
        </div>
        <nav className="nav-tabs">
          {(Object.keys(pageConfig) as Page[]).map(p => (
            <button key={p} className={`nav-tab ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>
              {pageConfig[p].title}
            </button>
          ))}
        </nav>
      </aside>
      <main className="main-container">
        <header className="page-header">
          <h2 className="page-title">{pageConfig[page].title}</h2>
          <p className="page-description">{pageConfig[page].description}</p>
        </header>
        {renderPage()}
      </main>
    </div>
  );
}

// --- Tool Components ---
const GenericGenerator = ({
    inputs,
    buttonText,
    onGenerate,
    results,
    CardComponent,
    grid = true
}: {
    inputs: React.ReactNode;
    buttonText: string;
    onGenerate: (id?: number) => void;
    results: ResultItem[];
    CardComponent: React.FC<any>;
    grid?: boolean;
}) => {
    const isGenerating = results.some(r => r.status === 'loading');
    
    const handleGenerate = () => {
        onGenerate();
    };

    return (
        <>
            <div className="control-panel">
                {inputs}
                <button className="generate-button" onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? 'Generando...' : buttonText}
                </button>
            </div>
            {grid ? (
                <div className="results-grid">
                    {(results.length > 0 ? results : Array(10).fill({ status: 'idle' })).map((item, index) => (
                        <CardComponent key={index} item={item} onRegenerate={() => onGenerate(item.id)} />
                    ))}
                </div>
            ) : (
                // Non-grid layout for single-result tools
                results.map((item, index) => <CardComponent key={index} item={item} />)
            )}
        </>
    );
};


const CopywritingAssistant = () => {
    const [product, setProduct] = useState('');
    const [audience, setAudience] = useState('');
    const [tone, setTone] = useState('');
    const [format, setFormat] = useState('Anuncio de Facebook');
    const [results, setResults] = useState<ResultItem[]>([]);

    const handleGenerate = useCallback(async (regenerateId?: number) => {
        const fullPrompt = `Producto: ${product}\nPúblico: ${audience}\nTono: ${tone}\nFormato: ${format}`;
        if (!product || !audience || !tone) return;
        
        const isMainGeneration = typeof regenerateId === 'undefined';
        const isGenerating = results.some(r => r.status === 'loading');
        if (isGenerating && isMainGeneration) return;

        if (isMainGeneration) {
            setResults(Array(10).fill(null).map((_, i) => ({ id: i, status: 'loading' })));
        } else {
            setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'loading' } : r));
        }

        try {
            const data = await generateCopywriting(fullPrompt, isMainGeneration ? 10 : 1);
            if (isMainGeneration) {
                setResults(data.map((item, i) => ({ id: i, status: 'success', data: item })));
            } else {
                setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'success', data: data[0] } : r));
            }
        } catch (e: any) {
            const errorUpdater = (item: ResultItem) => ({ ...item, status: 'error' as Status, error: e.message });
            if (isMainGeneration) {
                setResults(prev => prev.map(errorUpdater));
            } else {
                setResults(prev => prev.map(r => r.id === regenerateId ? errorUpdater(r) : r));
            }
        }
    }, [product, audience, tone, format, results]);
    
    const inputs = (
        <>
            <div className="control-section">
                <label className="control-label">Producto / Servicio</label>
                <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Ej: Curso online de finanzas personales" />
            </div>
            <div className="control-section">
                <label className="control-label">Público Objetivo</label>
                <input type="text" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Ej: Millennials que quieren empezar a invertir" />
            </div>
            <div className="control-section">
                <label className="control-label">Tono de Voz</label>
                <input type="text" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Ej: Educativo, motivador y sin jerga" />
            </div>
             <div className="control-section">
                <label className="control-label">Formato</label>
                <select value={format} onChange={(e) => setFormat(e.target.value)}>
                    <option>Anuncio de Facebook</option>
                    <option>Título para Google Ads</option>
                    <option>Asunto de Email</option>
                    <option>Descripción de Producto</option>
                </select>
            </div>
        </>
    );

    return <GenericGenerator inputs={inputs} buttonText={`Generar 10 Copys`} onGenerate={handleGenerate} results={results} CardComponent={CopywritingCard} />;
};


const PersonaGenerator = () => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);

    const handleGenerate = useCallback(async (regenerateId?: number) => {
        if (!prompt) return;
        const isMainGeneration = typeof regenerateId === 'undefined';
        const isGenerating = results.some(r => r.status === 'loading');
        if (isGenerating && isMainGeneration) return;

        if (isMainGeneration) setResults(Array(10).fill(null).map((_, i) => ({ id: i, status: 'loading' })));
        else setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'loading' } : r));

        try {
            const data = await generatePersonas(prompt, isMainGeneration ? 10 : 1);
            if (isMainGeneration) setResults(data.map((item, i) => ({ id: i, status: 'success', data: item })));
            else setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'success', data: data[0] } : r));
        } catch (e: any) {
            const errorUpdater = (item: ResultItem) => ({ ...item, status: 'error' as Status, error: e.message });
            if (isMainGeneration) setResults(prev => prev.map(errorUpdater));
            else setResults(prev => prev.map(r => r.id === regenerateId ? errorUpdater(r) : r));
        }
    }, [prompt, results]);

    const inputs = (
        <div className="control-section">
            <label className="control-label">Describe tu producto y tu cliente ideal</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Ej: Una marca de café de especialidad, sostenible, para conocedores que trabajan desde casa"></textarea>
        </div>
    );
    
    return <GenericGenerator inputs={inputs} buttonText="Generar 10 Personas" onGenerate={handleGenerate} results={results} CardComponent={PersonaCard} />;
};


const SeoAssistant = () => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);

    const handleGenerate = useCallback(async (regenerateId?: number) => {
        if (!prompt) return;
        const isMainGeneration = typeof regenerateId === 'undefined';
        const isGenerating = results.some(r => r.status === 'loading');
        if (isGenerating && isMainGeneration) return;

        if (isMainGeneration) setResults(Array(10).fill(null).map((_, i) => ({ id: i, status: 'loading' })));
        else setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'loading' } : r));

        try {
            const data = await generateSeoIdeas(prompt, isMainGeneration ? 10 : 1);
            if (isMainGeneration) setResults(data.map((item, i) => ({ id: i, status: 'success', data: item })));
            else setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'success', data: data[0] } : r));
        } catch (e: any) {
            const errorUpdater = (item: ResultItem) => ({ ...item, status: 'error' as Status, error: e.message });
            if (isMainGeneration) setResults(prev => prev.map(errorUpdater));
            else setResults(prev => prev.map(r => r.id === regenerateId ? errorUpdater(r) : r));
        }
    }, [prompt, results]);

    const inputs = (
        <div className="control-section">
            <label className="control-label">Tema o Palabra Clave Principal</label>
            <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ej: cómo empezar a invertir en criptomonedas" />
        </div>
    );

    return <GenericGenerator inputs={inputs} buttonText="Generar 10 Ideas SEO" onGenerate={handleGenerate} results={results} CardComponent={SeoCard} />;
};


const NameSloganGenerator = () => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);

    const handleGenerate = useCallback(async (regenerateId?: number) => {
        if (!prompt) return;
        const isMainGeneration = typeof regenerateId === 'undefined';
        const isGenerating = results.some(r => r.status === 'loading');
        if (isGenerating && isMainGeneration) return;

        if (isMainGeneration) setResults(Array(10).fill(null).map((_, i) => ({ id: i, status: 'loading' })));
        else setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'loading' } : r));

        try {
            const data = await generateNamesAndSlogans(prompt, isMainGeneration ? 10 : 1);
            if (isMainGeneration) setResults(data.map((item, i) => ({ id: i, status: 'success', data: item })));
            else setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'success', data: data[0] } : r));
        } catch (e: any) {
            const errorUpdater = (item: ResultItem) => ({ ...item, status: 'error' as Status, error: e.message });
            if (isMainGeneration) setResults(prev => prev.map(errorUpdater));
            else setResults(prev => prev.map(r => r.id === regenerateId ? errorUpdater(r) : r));
        }
    }, [prompt, results]);

    const inputs = (
        <div className="control-section">
            <label className="control-label">Describe la esencia de tu negocio o producto</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Ej: Una app de delivery que solo entrega comida local y saludable"></textarea>
        </div>
    );
    
    return <GenericGenerator inputs={inputs} buttonText="Generar 10 Ideas" onGenerate={handleGenerate} results={results} CardComponent={NameSloganCard} />;
};


// --- Existing Components (Minor adjustments if needed) ---
const VideoGenerator = () => {
    const [apiKeyReady, setApiKeyReady] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [isGenerating, setIsGenerating] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState('');
    const operationRef = useRef<any>(null);

    const checkApiKey = async () => {
        if ((window as any).aistudio) {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            setApiKeyReady(hasKey);
        }
    };

    useEffect(() => {
        checkApiKey();
    }, []);

    const handleSelectKey = async () => {
        await (window as any).aistudio.openSelectKey();
        await checkApiKey();
        setApiKeyReady(true); 
    };

    const pollOperation = useCallback(async () => {
        if (!operationRef.current) return;
        
        try {
            const updatedOperation = await getVideoOperationStatus(operationRef.current);
            operationRef.current = updatedOperation;

            if (updatedOperation.done) {
                const downloadLink = updatedOperation.response?.generatedVideos?.[0]?.video?.uri;
                if (downloadLink) {
                    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    setVideoUrl(url);
                    setProgressMessage('¡Video generado con éxito!');
                } else {
                    throw new Error(updatedOperation.error?.message || 'La operación finalizó pero no se encontró el video.');
                }
                setIsGenerating(false);
                operationRef.current = null;
            } else {
                setTimeout(pollOperation, 10000);
            }
        } catch (e: unknown) {
            // Fix: Safely handle the caught exception by checking if it's an instance of Error before accessing its message property to avoid type errors.
            const message = e instanceof Error ? e.message : 'Error al verificar el estado del video.';
            setError(message);
            if (message.includes("Requested entity was not found")) {
                setError("La clave de API no es válida o no tiene permisos. Por favor, selecciona una nueva.");
                setApiKeyReady(false);
            }
            setIsGenerating(false);
            operationRef.current = null;
        }
    }, []);

    const handleGenerate = async () => {
        if (!imageFile || !prompt || isGenerating) return;

        setIsGenerating(true);
        setError(null);
        setVideoUrl(null);
        setProgressMessage('Iniciando generación de video...');

        try {
            const base64Image = await fileToBase64(imageFile);
            const mimeType = imageFile.type;
            
            setProgressMessage('Enviando solicitud a la IA... (Esto puede tardar unos minutos)');
            const initialOperation = await generateVideo({
                base64Image,
                mimeType,
                prompt,
                aspectRatio
            });

            operationRef.current = initialOperation;
            setProgressMessage('Procesando video... por favor espera.');
            setTimeout(pollOperation, 10000);

        } catch (e: any) {
            setError(e.message || 'Error al iniciar la generación de video.');
            if (e.message.includes("API key not valid")) {
                setError("La clave de API no es válida. Por favor, selecciona una nueva.");
                setApiKeyReady(false);
            }
            setIsGenerating(false);
        }
    };

    if (!(window as any).aistudio) {
        return <div className="control-panel">La funcionalidad de video no está disponible en este entorno.</div>;
    }

    if (!apiKeyReady) {
        return (
            <div className="control-panel" style={{textAlign: 'center'}}>
                <p style={{marginBottom: '1rem'}}>Esta herramienta requiere una clave de API de un proyecto con facturación habilitada. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer">Más información</a>.</p>
                <button className="generate-button" onClick={handleSelectKey}>Seleccionar Clave de API</button>
                 {error && <p style={{ color: 'var(--error-color)', marginTop: '1rem' }}>{error}</p>}
            </div>
        );
    }
    
    return (
        <>
            <div className="control-panel">
                <div className="control-section">
                    <label className="control-label">1. Sube una imagen de inicio</label>
                    <div className="file-input-wrapper">
                        <p>{imageFile ? imageFile.name : 'Haz clic o arrastra tu archivo aquí'}</p>
                        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} />
                    </div>
                </div>
                <div className="control-section">
                    <label className="control-label">2. Describe qué debe pasar en el video</label>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Ej: un dron vuela lentamente hacia adelante, revelando un paisaje montañoso al amanecer"></textarea>
                </div>
                <div className="control-section">
                     <label className="control-label">3. Elige el formato del video</label>
                     <div className="aspect-ratio-selector">
                        <button className={`aspect-ratio-btn ${aspectRatio === '16:9' ? 'active' : ''}`} onClick={() => setAspectRatio('16:9')}>16:9 (Horizontal)</button>
                        <button className={`aspect-ratio-btn ${aspectRatio === '9:16' ? 'active' : ''}`} onClick={() => setAspectRatio('9:16')}>9:16 (Vertical)</button>
                     </div>
                </div>
                <button className="generate-button" onClick={handleGenerate} disabled={!imageFile || !prompt || isGenerating}>
                    {isGenerating ? 'Generando...' : 'Generar Video'}
                </button>
            </div>
            
            {isGenerating && <div className="video-result-container" style={{textAlign: 'center'}}><Loader /><p>{progressMessage}</p></div>}
            {error && <div className="video-result-container" style={{textAlign: 'center', color: 'var(--error-color)'}}><p><strong>Error:</strong> {error}</p></div>}
            {videoUrl && (
                <div className="video-result-container">
                    <video className="video-player" src={videoUrl} controls autoPlay loop />
                </div>
            )}
        </>
    );
};

const ImageAnalyzer = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
            setAnalysis(null);
            setError(null);
        }
    };

    const handleAnalyze = async () => {
        if (!imageFile || isLoading) return;
        setIsLoading(true);
        setAnalysis(null);
        setError(null);

        try {
            const base64Image = await fileToBase64(imageFile);
            const mimeType = imageFile.type;
            const result = await analyzeImage({ base64Image, mimeType });
            setAnalysis(result);
        } catch (e: any) {
            setError(e.message || "Error al analizar la imagen.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="control-panel">
                <div className="control-section">
                    <label className="control-label">Sube una imagen para analizar</label>
                    <div className="file-input-wrapper">
                        <p>{imageFile ? imageFile.name : 'Haz clic o arrastra tu archivo aquí'}</p>
                        <input type="file" accept="image/*" onChange={handleFileChange} />
                    </div>
                </div>
                <button className="generate-button" onClick={handleAnalyze} disabled={!imageFile || isLoading}>
                    {isLoading ? 'Analizando...' : 'Analizar Imagen'}
                </button>
            </div>
            
            {(isLoading || error || analysis || imageUrl) && (
                <div className="analyzer-layout">
                    {imageUrl && (
                        <div className="analyzer-image-container">
                             <img src={imageUrl} alt="Uploaded for analysis" />
                        </div>
                    )}
                    <div className="analyzer-text-container">
                        {isLoading && <div style={{display: 'flex', justifyContent: 'center'}}><Loader /></div>}
                        {error && <p style={{color: 'var(--error-color)'}}><strong>Error:</strong> {error}</p>}
                        {analysis && <p>{analysis}</p>}
                    </div>
                </div>
            )}
        </>
    );
};

const MockupGenerator = () => {
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [brandContext, setBrandContext] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);
    
    const handleGenerate = useCallback(async (regenerateId?: number) => {
        if (!logoFile) return;

        const isMainGeneration = typeof regenerateId === 'undefined';
        const isGenerating = results.some(r => r.status === 'loading');
        if (isGenerating && isMainGeneration) return;

        if (isMainGeneration) {
            setResults(Array(10).fill(null).map((_, i) => ({ id: i, status: 'loading' })));
        } else {
            setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'loading' } : r));
        }

        try {
            const base64Logo = await fileToBase64(logoFile);
            const mimeType = logoFile.type;

            if (isMainGeneration) {
                const promises = Array(10).fill(null).map((_, i) => 
                    generateMockup({ base64Logo, mimeType, brandContext })
                        .then(data => ({ id: i, status: 'success' as Status, imageUrl: `data:${data.mimeType};base64,${data.base64Image}` }))
                        .catch(e => ({ id: i, status: 'error' as Status, error: e.message }))
                );
                
                for (const promise of promises) {
                    const result = await promise;
                    setResults(prev => prev.map(r => r.id === result.id ? result : r));
                }
            } else {
                 const data = await generateMockup({ base64Logo, mimeType, brandContext });
                 setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'success', imageUrl: `data:${data.mimeType};base64,${data.base64Image}` } : r));
            }
        } catch (e: any) {
             const errorUpdater = (item: ResultItem) => ({ ...item, status: 'error' as Status, error: e.message });
            if (isMainGeneration) {
                setResults(prev => prev.map(errorUpdater));
            } else {
                setResults(prev => prev.map(r => r.id === regenerateId ? errorUpdater(r) : r));
            }
        }
    }, [logoFile, brandContext, results]);

    const inputs = (
         <>
             <div className="control-section">
                <label className="control-label">1. Sube tu Logo <span>(PNG con transparencia funciona mejor)</span></label>
                <div className="file-input-wrapper">
                    <p>{logoFile ? logoFile.name : 'Haz clic o arrastra tu archivo aquí'}</p>
                    <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)} />
                </div>
             </div>
             <div className="control-section">
                <label className="control-label">2. Contexto de la Marca <span>(Opcional)</span></label>
                <textarea value={brandContext} onChange={(e) => setBrandContext(e.target.value)} rows={3} placeholder="Ej: Una marca de café artesanal y ecológica"></textarea>
             </div>
         </>
    );

    return <GenericGenerator inputs={inputs} buttonText="Generar 10 Mockups" onGenerate={handleGenerate} results={results} CardComponent={ImageCard} />;
};

const LogoGenerator = () => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);

    const handleGenerate = useCallback(async (regenerateId?: number) => {
        if (!prompt) return;
        const isMainGeneration = typeof regenerateId === 'undefined';
        const isGenerating = results.some(r => r.status === 'loading');
        if (isGenerating && isMainGeneration) return;

        const generateSingle = async (id: number) => {
            try {
                const data = await generateImageFromText(prompt);
                setResults(prev => prev.map(r => r.id === id ? { id, status: 'success', imageUrl: `data:${data.mimeType};base64,${data.base64Image}`, data: { style: data.style } } : r));
            } catch (e: any) {
                setResults(prev => prev.map(r => r.id === id ? { id, status: 'error', error: e.message } : r));
            }
        };

        if (isMainGeneration) {
            setResults(Array(10).fill(null).map((_, i) => ({ id: i, status: 'loading' })));
            Array(10).fill(null).forEach((_, i) => generateSingle(i));
        } else if (typeof regenerateId !== 'undefined') {
            setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'loading' } : r));
            generateSingle(regenerateId);
        }
    }, [prompt, results]);

    const inputs = (
        <div className="control-section">
            <label className="control-label">Describe el logo que imaginas</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Ej: Un zorro astuto leyendo un libro para una librería"></textarea>
        </div>
    );
    
    return <GenericGenerator inputs={inputs} buttonText="Generar 10 Logos" onGenerate={handleGenerate} results={results} CardComponent={ImageCard} />;
};

const BrandingAssistant = () => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);

    const handleGenerate = useCallback(async (regenerateId?: number) => {
        if (!prompt) return;
        const isMainGeneration = typeof regenerateId === 'undefined';
        const isGenerating = results.some(r => r.status === 'loading');
        if (isGenerating && isMainGeneration) return;

        if (isMainGeneration) {
            setResults(Array(10).fill(null).map((_, i) => ({ id: i, status: 'loading' })));
        } else {
            setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'loading' } : r));
        }

        try {
            const data = await generateBranding(prompt, isMainGeneration ? 10 : 1);
            if (isMainGeneration) {
                setResults(data.map((item, i) => ({ id: i, status: 'success', data: item })));
            } else {
                setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'success', data: data[0] } : r));
            }
        } catch (e: any) {
             const errorUpdater = (item: ResultItem) => ({ ...item, status: 'error' as Status, error: e.message });
            if (isMainGeneration) {
                setResults(prev => prev.map(errorUpdater));
            } else {
                setResults(prev => prev.map(r => r.id === regenerateId ? errorUpdater(r) : r));
            }
        }
    }, [prompt, results]);
    
    const inputs = (
        <div className="control-section">
            <label className="control-label">Describe la esencia de la marca</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Ej: Una marca de cuidado de la piel, vegana y natural"></textarea>
        </div>
    );

    return <GenericGenerator inputs={inputs} buttonText="Generar 10 Ideas" onGenerate={handleGenerate} results={results} CardComponent={BrandingCard} />;
};

const SocialPostGenerator = () => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);

    const handleGenerate = useCallback(async (regenerateId?: number) => {
        if (!prompt) return;

        const isMainGeneration = typeof regenerateId === 'undefined';
        const isGenerating = results.some(r => r.status === 'loading');
        if (isGenerating && isMainGeneration) return;
        
        if (isMainGeneration) {
            setResults(Array(10).fill(null).map((_, i) => ({ id: i, status: 'loading' })));
            try {
                const concepts = await generateSocialPostIdeas(prompt);
                setResults(concepts.map((concept, i) => ({ id: i, status: 'loading', data: concept })));
                
                concepts.forEach(async (concept, i) => {
                    try {
                        const imageData = await generateImageFromText(concept.imagePrompt, true);
                        setResults(prev => prev.map(r => r.id === i ? { ...r, status: 'success', imageUrl: `data:${imageData.mimeType};base64,${imageData.base64Image}` } : r));
                    } catch (e: any) {
                         setResults(prev => prev.map(r => r.id === i ? { ...r, status: 'error', error: e.message } : r));
                    }
                });
            } catch (e: any) {
                setResults(Array(10).fill(null).map((_, i) => ({ id: i, status: 'error', error: e.message })));
            }
        } else {
            // Regenerate only the image for an existing concept
            const currentItem = results.find(r => r.id === regenerateId);
            if (!currentItem || !currentItem.data) return;

            setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'loading' } : r));
            try {
                const imageData = await generateImageFromText(currentItem.data.imagePrompt, true);
                setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'success', imageUrl: `data:${imageData.mimeType};base64,${imageData.base64Image}` } : r));
            } catch (e: any) {
                setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'error', error: e.message } : r));
            }
        }
    }, [prompt, results]);

    const inputs = (
        <div className="control-section">
            <label className="control-label">Describe el objetivo de tu post</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Ej: Promocionar un descuento del 20% en nuestro café de origen colombiano"></textarea>
        </div>
    );
    return <GenericGenerator inputs={inputs} buttonText="Generar 10 Posts" onGenerate={handleGenerate} results={results} CardComponent={SocialPostCard} />;
};

const CampaignIdeaGenerator = () => {
    const [product, setProduct] = useState('');
    const [objective, setObjective] = useState('');
    const [audience, setAudience] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);
    
    const handleGenerate = useCallback(async (regenerateId?: number) => {
        const fullPrompt = `Producto: ${product}\nObjetivo: ${objective}\nPúblico: ${audience}`;
        if (!product || !objective || !audience) return;

        const isMainGeneration = typeof regenerateId === 'undefined';
        const isGenerating = results.some(r => r.status === 'loading');
        if (isGenerating && isMainGeneration) return;

        if (isMainGeneration) {
            setResults(Array(10).fill(null).map((_, i) => ({ id: i, status: 'loading' })));
        } else {
            setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'loading' } : r));
        }

        try {
            const data = await generateCampaignIdeas(fullPrompt, isMainGeneration ? 10 : 1);
            if (isMainGeneration) {
                setResults(data.map((item, i) => ({ id: i, status: 'success', data: item })));
            } else {
                setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'success', data: data[0] } : r));
            }
        } catch (e: any) {
             const errorUpdater = (item: ResultItem) => ({ ...item, status: 'error' as Status, error: e.message });
            if (isMainGeneration) {
                setResults(prev => prev.map(errorUpdater));
            } else {
                setResults(prev => prev.map(r => r.id === regenerateId ? errorUpdater(r) : r));
            }
        }
    }, [product, objective, audience, results]);

    const inputs = (
        <>
            <div className="control-section">
                <label className="control-label">Producto / Servicio</label>
                <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Ej: App de meditación" />
            </div>
            <div className="control-section">
                <label className="control-label">Objetivo Principal</label>
                <input type="text" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ej: Conseguir 10,000 nuevos usuarios" />
            </div>
            <div className="control-section">
                <label className="control-label">Público Objetivo</label>
                <input type="text" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Ej: Jóvenes profesionales con estrés" />
            </div>
        </>
    );

    return <GenericGenerator inputs={inputs} buttonText="Generar 10 Ideas" onGenerate={handleGenerate} results={results} CardComponent={CampaignCard} />;
};

const ScriptGenerator = () => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);
    
    const handleGenerate = useCallback(async (regenerateId?: number) => {
        if (!prompt) return;

        const isMainGeneration = typeof regenerateId === 'undefined';
        const isGenerating = results.some(r => r.status === 'loading');
        if (isGenerating && isMainGeneration) return;

        if (isMainGeneration) {
            setResults(Array(10).fill(null).map((_, i) => ({ id: i, status: 'loading' })));
        } else {
            setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'loading' } : r));
        }

        try {
            const data = await generateScripts(prompt, isMainGeneration ? 10 : 1);
            if (isMainGeneration) {
                setResults(data.map((item, i) => ({ id: i, status: 'success', data: item })));
            } else {
                setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'success', data: data[0] } : r));
            }
        } catch (e: any) {
             const errorUpdater = (item: ResultItem) => ({ ...item, status: 'error' as Status, error: e.message });
            if (isMainGeneration) {
                setResults(prev => prev.map(errorUpdater));
            } else {
                setResults(prev => prev.map(r => r.id === regenerateId ? errorUpdater(r) : r));
            }
        }
    }, [prompt, results]);

    const inputs = (
         <div className="control-section">
            <label className="control-label">Tema o mensaje clave del video</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Ej: Un tip rápido para mejorar la productividad por la mañana"></textarea>
        </div>
    );

    return <GenericGenerator inputs={inputs} buttonText="Generar 10 Guiones" onGenerate={handleGenerate} results={results} CardComponent={ScriptCard} />;
};

// --- Card Components ---
const CardBase = ({ item, onRegenerate, children }: { item: ResultItem, onRegenerate: () => void, children: React.ReactNode }) => {
    if (item.status === 'idle') {
        return <div className="card card-placeholder"></div>;
    }
    if (item.status === 'loading') {
        return <div className="card card-placeholder"><Loader /></div>;
    }
    if (item.status === 'error') {
        return (
            <div className="card card-error">
                <p><strong>Error:</strong> {item.error}</p>
                <button className="card-button" onClick={onRegenerate} style={{position: 'static', opacity: 1, marginTop: '1rem'}}><RegenerateIcon /></button>
            </div>
        );
    }
    return <div className="card">{children}</div>;
};

const ImageCard = ({ item, onRegenerate }: { item: ResultItem, onRegenerate: () => void }) => {
    const handleDownload = () => {
        if (!item.imageUrl) return;
        const link = document.createElement('a');
        link.href = item.imageUrl;
        link.download = `logo-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <CardBase item={item} onRegenerate={onRegenerate}>
            <div className="card-image-wrapper">
                <img src={item.imageUrl} alt="Generated content" className="card-image" />
                 <div className="card-actions">
                    <button className="card-button" onClick={handleDownload}><DownloadIcon /></button>
                    <button className="card-button" onClick={onRegenerate}><RegenerateIcon /></button>
                </div>
            </div>
            {item.data?.style && (
                <div className="card-content">
                    <p className="card-title">{item.data.style}</p>
                </div>
            )}
        </CardBase>
    );
};

const BrandingCard = ({ item, onRegenerate }: { item: ResultItem, onRegenerate: () => void }) => (
    <CardBase item={item} onRegenerate={onRegenerate}>
        <div className="card-content branding-card">
            <div>
                <h3 className="card-section-title">Paleta de Colores</h3>
                <div className="palette">
                    {item.data?.colors?.map((color: string) => <div key={color} className="color-swatch" style={{ background: color }}></div>)}
                </div>
            </div>
            <div className="branding-details">
                <h3 className="card-section-title">Tipografía</h3>
                <p><strong>Sugerencia:</strong> {item.data?.typography?.fontPairing}</p>
            </div>
             <div className="branding-details">
                <h3 className="card-section-title">Tono de Voz</h3>
                <p>{item.data?.toneOfVoice?.description}</p>
            </div>
            <div className="card-actions" style={{opacity: 1, position: 'static', alignSelf: 'flex-end'}}>
                 <button className="card-button" onClick={onRegenerate}><RegenerateIcon /></button>
            </div>
        </div>
    </CardBase>
);

const SocialPostCard = ({ item, onRegenerate }: { item: ResultItem, onRegenerate: () => void }) => {
     const handleCopy = () => navigator.clipboard.writeText(item.data?.copy);
     const handleDownload = () => {
        if (!item.imageUrl) return;
        const link = document.createElement('a');
        link.href = item.imageUrl;
        link.download = `social-post-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <CardBase item={item} onRegenerate={onRegenerate}>
             <div className="card-image-wrapper">
                {item.imageUrl && <img src={item.imageUrl} alt="Generated social post" className="card-image" />}
                <div className="card-actions">
                    <button className="card-button" onClick={handleDownload}><DownloadIcon /></button>
                    <button className="card-button" onClick={onRegenerate}><RegenerateIcon /></button>
                </div>
            </div>
            <div className="card-content social-post-card">
                <p className="card-copy-text">{item.data?.copy}</p>
                <button className="copy-button" onClick={handleCopy}>Copiar Texto</button>
            </div>
        </CardBase>
    );
};

const CampaignCard = ({ item, onRegenerate }: { item: ResultItem, onRegenerate: () => void }) => {
    const textToCopy = `Concepto: ${item.data?.concept}\n\nResumen: ${item.data?.summary}\n\nAcciones Clave:\n- ${item.data?.keyActions?.join('\n- ')}`;
    const handleCopy = () => navigator.clipboard.writeText(textToCopy);

    return (
        <CardBase item={item} onRegenerate={onRegenerate}>
             <div className="card-content">
                <div>
                    <h3 className="card-section-title">{item.data?.concept}</h3>
                    <p className="card-text-block">{item.data?.summary}</p>
                </div>
                 <div>
                    <h3 className="card-section-title" style={{marginTop: '1rem'}}>Acciones Clave</h3>
                    <div className="card-text-block">
                        <ul>
                           {item.data?.keyActions?.map((action: string, i: number) => <li key={i}>{action}</li>)}
                        </ul>
                    </div>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem'}}>
                     <button className="copy-button" onClick={handleCopy} style={{width: 'auto', flexGrow: 1, marginRight: '1rem'}}>Copiar Concepto</button>
                     <button className="card-button" onClick={onRegenerate} style={{position: 'static', opacity: 1}}><RegenerateIcon /></button>
                </div>
            </div>
        </CardBase>
    );
};

const ScriptCard = ({ item, onRegenerate }: { item: ResultItem, onRegenerate: () => void }) => {
    const textToCopy = `Concepto: ${item.data?.concept}\n\nGuion:\n${item.data?.script}`;
    const handleCopy = () => navigator.clipboard.writeText(textToCopy);

    return (
        <CardBase item={item} onRegenerate={onRegenerate}>
             <div className="card-content">
                <div>
                    <h3 className="card-section-title">{item.data?.concept}</h3>
                    <p className="card-text-block">{item.data?.script}</p>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem'}}>
                     <button className="copy-button" onClick={handleCopy} style={{width: 'auto', flexGrow: 1, marginRight: '1rem'}}>Copiar Guion</button>
                     <button className="card-button" onClick={onRegenerate} style={{position: 'static', opacity: 1}}><RegenerateIcon /></button>
                </div>
            </div>
        </CardBase>
    );
};

const CopywritingCard = ({ item, onRegenerate }: { item: ResultItem, onRegenerate: () => void }) => {
    const handleCopy = () => navigator.clipboard.writeText(item.data?.copy);

    return (
        <CardBase item={item} onRegenerate={onRegenerate}>
            <div className="card-content">
                <p className="card-text-block" style={{maxHeight: '250px'}}>{item.data?.copy}</p>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem'}}>
                     <button className="copy-button" onClick={handleCopy} style={{width: 'auto', flexGrow: 1, marginRight: '1rem'}}>Copiar Texto</button>
                     <button className="card-button" onClick={onRegenerate} style={{position: 'static', opacity: 1}}><RegenerateIcon /></button>
                </div>
            </div>
        </CardBase>
    );
};

const PersonaCard = ({ item, onRegenerate }: { item: ResultItem, onRegenerate: () => void }) => (
    <CardBase item={item} onRegenerate={onRegenerate}>
        <div className="card-content persona-card">
            <div className="persona-header">
                <h3 className="persona-name">{item.data?.name}, {item.data?.age}</h3>
                <p className="card-title">{item.data?.occupation}</p>
            </div>
            <p className="card-text-block">{item.data?.bio}</p>
            <div>
                <h4 className="card-section-title">Metas</h4>
                <p className="card-text-block" style={{maxHeight: '60px'}}>{item.data?.goals}</p>
            </div>
             <div>
                <h4 className="card-section-title">Puntos de Dolor</h4>
                <p className="card-text-block" style={{maxHeight: '60px'}}>{item.data?.painPoints}</p>
            </div>
            <div className="card-actions" style={{opacity: 1, position: 'static', alignSelf: 'flex-end', marginTop: '1rem'}}>
                <button className="card-button" onClick={onRegenerate}><RegenerateIcon /></button>
            </div>
        </div>
    </CardBase>
);

const SeoCard = ({ item, onRegenerate }: { item: ResultItem, onRegenerate: () => void }) => {
    const getTag = (type: string) => {
        if (type === 'title') return <span className="card-tag tag-title">Título de Blog</span>;
        if (type === 'faq') return <span className="card-tag tag-faq">Pregunta Frecuente</span>;
        if (type === 'meta') return <span className="card-tag tag-meta">Meta Descripción</span>;
        return null;
    };
    const handleCopy = () => navigator.clipboard.writeText(item.data?.content);

    return (
        <CardBase item={item} onRegenerate={onRegenerate}>
            <div className="card-content seo-card">
                {getTag(item.data?.type)}
                <p className="card-text-block">{item.data?.content}</p>
                 <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem'}}>
                     <button className="copy-button" onClick={handleCopy} style={{width: 'auto', flexGrow: 1, marginRight: '1rem'}}>Copiar</button>
                     <button className="card-button" onClick={onRegenerate} style={{position: 'static', opacity: 1}}><RegenerateIcon /></button>
                </div>
            </div>
        </CardBase>
    );
};


const NameSloganCard = ({ item, onRegenerate }: { item: ResultItem, onRegenerate: () => void }) => {
    const getTag = (type: string) => {
        if (type === 'name') return <span className="card-tag tag-name">Nombre</span>;
        if (type === 'slogan') return <span className="card-tag tag-slogan">Slogan</span>;
        return null;
    };
    const handleCopy = () => navigator.clipboard.writeText(item.data?.suggestion);
    
    return (
        <CardBase item={item} onRegenerate={onRegenerate}>
            <div className="card-content name-slogan-card">
                {getTag(item.data?.type)}
                <h3 style={{fontSize: '1.2rem', color: 'var(--text-color)'}}>{item.data?.suggestion}</h3>
                <p className="card-text-block">{item.data?.justification}</p>
                 <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem'}}>
                     <button className="copy-button" onClick={handleCopy} style={{width: 'auto', flexGrow: 1, marginRight: '1rem'}}>Copiar</button>
                     <button className="card-button" onClick={onRegenerate} style={{position: 'static', opacity: 1}}><RegenerateIcon /></button>
                </div>
            </div>
        </CardBase>
    );
};

export default App;