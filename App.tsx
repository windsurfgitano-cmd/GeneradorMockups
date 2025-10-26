import React, { useState, useCallback } from 'react';
import { generateMockup, generateImageFromText, generateBranding, generateSocialPostIdeas, generateCampaignIdeas, generateScripts } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

// Types
type Page = 'mockups' | 'logos' | 'branding' | 'social' | 'campaign' | 'scripts';
type Status = 'idle' | 'loading' | 'success' | 'error';

interface ResultItem {
  id: number;
  status: Status;
  error?: string;
  imageUrl?: string;
  data?: any; // For structured data like branding, posts, etc.
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
    social: { title: 'Posts para Redes', description: 'Describe tu objetivo y la IA generará 10 pares de imagen y texto listos para publicar.' },
    campaign: { title: 'Ideas de Campaña', description: 'Detalla tu producto y objetivo para recibir 10 conceptos de campañas de marketing.' },
    scripts: { title: 'Guiones para Reels', description: 'Dale un tema a la IA y obtén 10 guiones estructurados para videos cortos virales.' },
  };

  const renderPage = () => {
    switch (page) {
      case 'mockups': return <MockupGenerator />;
      case 'logos': return <LogoGenerator />;
      case 'branding': return <BrandingAssistant />;
      case 'social': return <SocialPostGenerator />;
      case 'campaign': return <CampaignIdeaGenerator />;
      case 'scripts': return <ScriptGenerator />;
      default: return <MockupGenerator />;
    }
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
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

// Tool Components
const MockupGenerator = () => {
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [brandContext, setBrandContext] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!logoFile || isGenerating) return;
        setIsGenerating(true);
        const initialResults: ResultItem[] = Array(10).fill(null).map((_, i) => ({ id: i, status: 'loading' }));
        setResults(initialResults);

        try {
            const base64Logo = await fileToBase64(logoFile);
            const mimeType = logoFile.type;
            
            const promises = initialResults.map(item =>
                generateMockup({ base64Logo, mimeType, brandContext })
                    .then(data => ({ ...item, status: 'success' as Status, imageUrl: `data:${data.mimeType};base64,${data.base64Image}` }))
                    .catch(e => ({ ...item, status: 'error' as Status, error: e.message }))
            );

            for (const promise of promises) {
                const result = await promise;
                setResults(prev => prev.map(r => r.id === result.id ? result : r));
            }
        } catch (e: any) {
            setResults(initialResults.map(item => ({ ...item, status: 'error', error: e.message || 'Failed to process image.' })));
        } finally {
            setIsGenerating(false);
        }
    };
    
    // In MockupGenerator
    const handleRegenerate = async (id: number) => {
        if (!logoFile || isGenerating) return;
        setIsGenerating(true);
        setResults(prev => prev.map(r => r.id === id ? { ...r, status: 'loading', error: undefined } : r));

        try {
            const base64Logo = await fileToBase64(logoFile);
            const mimeType = logoFile.type;
            const data = await generateMockup({ base64Logo, mimeType, brandContext });
            setResults(prev => prev.map(r => r.id === id ? { ...r, status: 'success', imageUrl: `data:${data.mimeType};base64,${data.base64Image}` } : r));
        } catch (e: any) {
             setResults(prev => prev.map(r => r.id === id ? { ...r, status: 'error', error: e.message } : r));
        } finally {
            // Check if any other items are still loading before re-enabling the main button
            setResults(prevResults => {
                if (!prevResults.some(r => r.status === 'loading')) {
                    setIsGenerating(false);
                }
                return prevResults;
            });
        }
    };


    return (
        <>
            <div className="control-panel">
                 <div className="control-section">
                    <label className="control-label">1. Sube tu Logo <span>(PNG con transparencia funciona mejor)</span></label>
                    <div className="file-input-wrapper">
                        <p>{logoFile ? logoFile.name : 'Haz clic o arrastra tu archivo aquí'}</p>
                        <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)} />
                    </div>
                 </div>
                 <div className="control-section">
                    <label className="control-label">2. Contexto de la Marca <span>(Opcional)</span></label>
                    <textarea value={brandContext} onChange={(e) => setBrandContext(e.target.value)} rows={2} placeholder="Ej: una marca de café artesanal y ecológica"></textarea>
                 </div>
                 <button className="generate-button" onClick={handleGenerate} disabled={!logoFile || isGenerating}>
                    {isGenerating ? 'Generando...' : 'Generar 10 Mockups'}
                 </button>
            </div>
            <div className="results-grid">
                {(results.length > 0 ? results : Array(10).fill({ status: 'idle' })).map((item, index) => (
                    <ImageCard key={index} item={item} onRegenerate={() => handleRegenerate(item.id)} />
                ))}
            </div>
        </>
    );
};

const LogoGenerator = () => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!prompt || isGenerating) return;
        setIsGenerating(true);
        const initialResults: ResultItem[] = Array(10).fill(null).map((_, i) => ({ id: i, status: 'loading' }));
        setResults(initialResults);

        try {
            const promises = initialResults.map(item =>
                generateImageFromText(prompt)
                    .then(data => ({ ...item, status: 'success' as Status, imageUrl: `data:${data.mimeType};base64,${data.base64Image}`, data: { prompt: data.prompt, style: data.style } }))
                    .catch(e => ({ ...item, status: 'error' as Status, error: e.message }))
            );

            for (const promise of promises) {
                const result = await promise;
                setResults(prev => prev.map(r => r.id === result.id ? result : r));
            }
        } catch (e: any) {
            setResults(initialResults.map(item => ({ ...item, status: 'error', error: e.message })));
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleRegenerate = async (id: number) => {
        if (!prompt || isGenerating) return;
        setIsGenerating(true);
        setResults(prev => prev.map(r => r.id === id ? { ...r, status: 'loading', error: undefined } : r));

        try {
            const data = await generateImageFromText(prompt);
            setResults(prev => prev.map(r => r.id === id ? { ...r, status: 'success', imageUrl: `data:${data.mimeType};base64,${data.base64Image}`, data: { prompt: data.prompt, style: data.style } } : r));
        } catch (e: any) {
             setResults(prev => prev.map(r => r.id === id ? { ...r, status: 'error', error: e.message } : r));
        } finally {
            setResults(prevResults => {
                if (!prevResults.some(r => r.status === 'loading')) {
                    setIsGenerating(false);
                }
                return prevResults;
            });
        }
    };

    return (
        <>
            <div className="control-panel">
                 <div className="control-section">
                    <label className="control-label">Describe el logo que imaginas</label>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Ej: Un zorro astuto leyendo un libro para una librería..."></textarea>
                 </div>
                 <button className="generate-button" onClick={handleGenerate} disabled={!prompt || isGenerating}>
                    {isGenerating ? 'Generando...' : 'Generar 10 Logos'}
                 </button>
            </div>
            <div className="results-grid">
                {(results.length > 0 ? results : Array(10).fill({ status: 'idle' })).map((item, index) => (
                    <ImageCard key={index} item={item} title={item.data?.style} onRegenerate={() => handleRegenerate(item.id)} />
                ))}
            </div>
        </>
    );
};

const BrandingAssistant = () => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = useCallback(async (regenerateId?: number) => {
        if (!prompt) return;
        
        const isMainGeneration = typeof regenerateId === 'undefined';
        if(isGenerating && isMainGeneration) return;

        setIsGenerating(true);
        if (isMainGeneration) {
            const initialResults: ResultItem[] = Array(10).fill(null).map((_, i) => ({ id: i, status: 'loading' }));
            setResults(initialResults);
        } else {
            setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'loading', error: undefined } : r));
        }

        try {
            const brandingData = await generateBranding(prompt, isMainGeneration ? 10 : 1);
            if (isMainGeneration) {
                const newResults = brandingData.map((data, i) => ({ id: i, status: 'success' as Status, data }));
                setResults(newResults);
            } else {
                setResults(prev => prev.map(r => r.id === regenerateId ? { id: r.id, status: 'success', data: brandingData[0] } : r));
            }
        } catch (e: any) {
            if (isMainGeneration) {
                 setResults(results.map(item => ({ ...item, status: 'error', error: e.message })));
            } else {
                 setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'error', error: e.message } : r));
            }
        } finally {
            setIsGenerating(false);
        }
    }, [prompt, isGenerating, results]);


    return (
        <>
            <div className="control-panel">
                 <div className="control-section">
                    <label className="control-label">Describe la esencia de la marca</label>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Ej: Una marca de cuidado de la piel, vegana y natural"></textarea>
                 </div>
                 <button className="generate-button" onClick={() => handleGenerate()} disabled={!prompt || isGenerating}>
                    {isGenerating ? 'Generando...' : 'Generar 10 Ideas'}
                 </button>
            </div>
            <div className="results-grid">
                {(results.length > 0 ? results : Array(10).fill({ status: 'idle' })).map((item, index) => (
                    <BrandingCard key={index} item={item} onRegenerate={() => handleGenerate(item.id)} />
                ))}
            </div>
        </>
    );
};

const SocialPostGenerator = () => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!prompt || isGenerating) return;
        setIsGenerating(true);
        let initialResults: ResultItem[] = Array(10).fill(null).map((_, i) => ({ id: i, status: 'loading' }));
        setResults(initialResults);

        try {
            // Step 1: Get post ideas (text + image prompts)
            const postIdeas = await generateSocialPostIdeas(prompt);
            initialResults = postIdeas.map((idea, i) => ({ id: i, status: 'loading', data: idea }));
            setResults(initialResults);

            // Step 2: Generate images for each idea
            const imagePromises = initialResults.map(item =>
                generateImageFromText(item.data.imagePrompt, true)
                    .then(imgData => ({ ...item, status: 'success' as Status, imageUrl: `data:${imgData.mimeType};base64,${imgData.base64Image}` }))
                    .catch(e => ({ ...item, status: 'error' as Status, error: e.message }))
            );
            
            for (const promise of imagePromises) {
                const result = await promise;
                setResults(prev => prev.map(r => r.id === result.id ? result : r));
            }

        } catch (e: any) {
            setResults(initialResults.map(item => ({ ...item, status: 'error', error: e.message })));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegenerate = async (id: number) => {
        const itemToRegen = results.find(r => r.id === id);
        if (!itemToRegen?.data?.imagePrompt || isGenerating) return;
        
        setIsGenerating(true);
        setResults(prev => prev.map(r => r.id === id ? { ...r, status: 'loading', imageUrl: undefined, error: undefined } : r));

        try {
            const imgData = await generateImageFromText(itemToRegen.data.imagePrompt, true);
            setResults(prev => prev.map(r => r.id === id ? { ...r, status: 'success', imageUrl: `data:${imgData.mimeType};base64,${imgData.base64Image}` } : r));
        } catch (e: any) {
             setResults(prev => prev.map(r => r.id === id ? { ...r, status: 'error', error: e.message } : r));
        } finally {
            setResults(prevResults => {
                if (!prevResults.some(r => r.status === 'loading')) {
                    setIsGenerating(false);
                }
                return prevResults;
            });
        }
    };
    
    return (
        <>
            <div className="control-panel">
                 <div className="control-section">
                    <label className="control-label">Describe el objetivo de tu post</label>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Ej: Promocionar un descuento del 20% en nuestro café de origen colombiano"></textarea>
                 </div>
                 <button className="generate-button" onClick={handleGenerate} disabled={!prompt || isGenerating}>
                    {isGenerating ? 'Generando...' : 'Generar 10 Posts'}
                 </button>
            </div>
            <div className="results-grid">
                {(results.length > 0 ? results : Array(10).fill({ status: 'idle' })).map((item, index) => (
                    <SocialPostCard key={index} item={item} onRegenerate={() => handleRegenerate(item.id)} />
                ))}
            </div>
        </>
    );
};

const CampaignIdeaGenerator = () => {
    const [product, setProduct] = useState('');
    const [objective, setObjective] = useState('');
    const [audience, setAudience] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = useCallback(async (regenerateId?: number) => {
        const fullPrompt = `Producto: ${product}\nObjetivo: ${objective}\nPúblico: ${audience}`;
        if (!product || !objective || !audience) return;

        const isMainGeneration = typeof regenerateId === 'undefined';
        if (isGenerating && isMainGeneration) return;

        setIsGenerating(true);
        if (isMainGeneration) {
            const initialResults: ResultItem[] = Array(10).fill(null).map((_, i) => ({ id: i, status: 'loading' }));
            setResults(initialResults);
        } else {
            setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'loading', error: undefined } : r));
        }

        try {
            const campaignData = await generateCampaignIdeas(fullPrompt, isMainGeneration ? 10 : 1);
            if (isMainGeneration) {
                setResults(campaignData.map((data, i) => ({ id: i, status: 'success', data })));
            } else {
                setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'success', data: campaignData[0] } : r));
            }
        } catch (e: any) {
            if (isMainGeneration) {
                setResults(results.map(item => ({...item, status: 'error', error: e.message })));
            } else {
                 setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'error', error: e.message } : r));
            }
        } finally {
            setIsGenerating(false);
        }
    }, [product, objective, audience, isGenerating, results]);


    return (
        <>
            <div className="control-panel">
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
                 <button className="generate-button" onClick={() => handleGenerate()} disabled={!product || !objective || !audience || isGenerating}>
                    {isGenerating ? 'Generando...' : 'Generar 10 Ideas'}
                 </button>
            </div>
            <div className="results-grid">
                {(results.length > 0 ? results : Array(10).fill({ status: 'idle' })).map((item, index) => (
                    <CampaignCard key={index} item={item} onRegenerate={() => handleGenerate(item.id)} />
                ))}
            </div>
        </>
    );
};


const ScriptGenerator = () => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = useCallback(async (regenerateId?: number) => {
        if (!prompt) return;

        const isMainGeneration = typeof regenerateId === 'undefined';
        if (isGenerating && isMainGeneration) return;

        setIsGenerating(true);
        if (isMainGeneration) {
            const initialResults: ResultItem[] = Array(10).fill(null).map((_, i) => ({ id: i, status: 'loading' }));
            setResults(initialResults);
        } else {
            setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'loading', error: undefined } : r));
        }

        try {
            const scriptData = await generateScripts(prompt, isMainGeneration ? 10 : 1);
            if (isMainGeneration) {
                setResults(scriptData.map((data, i) => ({ id: i, status: 'success', data })));
            } else {
                setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'success', data: scriptData[0] } : r));
            }
        } catch (e: any) {
            if (isMainGeneration) {
                setResults(results.map(item => ({...item, status: 'error', error: e.message })));
            } else {
                 setResults(prev => prev.map(r => r.id === regenerateId ? { ...r, status: 'error', error: e.message } : r));
            }
        } finally {
            setIsGenerating(false);
        }
    }, [prompt, isGenerating, results]);

    return (
        <>
            <div className="control-panel">
                 <div className="control-section">
                    <label className="control-label">Describe el tema o mensaje clave de tu video</label>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Ej: Un tip rápido para mejorar la productividad por la mañana"></textarea>
                 </div>
                 <button className="generate-button" onClick={() => handleGenerate()} disabled={!prompt || isGenerating}>
                    {isGenerating ? 'Generando...' : 'Generar 10 Guiones'}
                 </button>
            </div>
            <div className="results-grid">
                {(results.length > 0 ? results : Array(10).fill({ status: 'idle' })).map((item, index) => (
                    <ScriptCard key={index} item={item} onRegenerate={() => handleGenerate(item.id)} />
                ))}
            </div>
        </>
    );
};

// Card Components
const ImageCard = ({ item, title, onRegenerate }: { item: ResultItem, title?: string, onRegenerate: () => void }) => {
    const handleDownload = () => {
        if (!item.imageUrl) return;
        const link = document.createElement('a');
        link.href = item.imageUrl;
        link.download = `${title || 'generated-image'}-${item.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="card">
            {item.status === 'idle' && <div className="card-placeholder">Esperando para generar...</div>}
            {item.status === 'loading' && <div className="card-placeholder"><Loader /></div>}
            {item.status === 'error' && <div className="card-error"><p><strong>Error:</strong> {item.error}</p><button className="card-button" onClick={onRegenerate} title="Regenerar"><RegenerateIcon /></button></div>}
            {item.status === 'success' && item.imageUrl && (
                <>
                    <div className="card-image-wrapper">
                        <img src={item.imageUrl} alt={title || 'Generated content'} className="card-image" />
                         <div className="card-actions">
                            <button className="card-button" title="Descargar" onClick={handleDownload}><DownloadIcon /></button>
                            <button className="card-button" title="Regenerar" onClick={onRegenerate}><RegenerateIcon /></button>
                        </div>
                    </div>
                    {title && <div className="card-content"><h3 className="card-title">{title}</h3></div>}
                </>
            )}
        </div>
    );
};

const BrandingCard = ({ item, onRegenerate }: { item: ResultItem, onRegenerate: () => void }) => {
    const { data } = item;
    return (
        <div className="card branding-card">
            {item.status === 'idle' && <div className="card-placeholder">Esperando para generar...</div>}
            {item.status === 'loading' && <div className="card-placeholder"><Loader /></div>}
            {item.status === 'error' && <div className="card-error"><p><strong>Error:</strong> {item.error}</p><button className="card-button" onClick={onRegenerate} title="Regenerar"><RegenerateIcon /></button></div>}
            {item.status === 'success' && data && (
                 <>
                    <div className="card-actions">
                        <button className="card-button" title="Regenerar" onClick={onRegenerate}><RegenerateIcon /></button>
                    </div>
                    <div className="card-content">
                        <div>
                            <h4 className="card-section-title">Paleta de Colores</h4>
                            <div className="palette">
                                {data.colors?.map((color: string) => <div key={color} className="color-swatch" style={{ backgroundColor: color }}></div>)}
                            </div>
                        </div>
                        <div className="branding-details">
                           <h4 className="card-section-title">Tipografía</h4>
                           <p><strong>{data.typography?.fontPairing}</strong></p>
                        </div>
                         <div className="branding-details">
                           <h4 className="card-section-title">Tono de Voz</h4>
                           <p>{data.toneOfVoice?.description}</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const SocialPostCard = ({ item, onRegenerate }: { item: ResultItem, onRegenerate: () => void }) => {
    const [copyStatus, setCopyStatus] = useState('Copiar Texto');
    
    const handleCopy = () => {
        if (!item.data?.copy) return;
        navigator.clipboard.writeText(item.data.copy).then(() => {
            setCopyStatus('¡Copiado!');
            setTimeout(() => setCopyStatus('Copiar Texto'), 2000);
        });
    };
    
    return (
         <div className="card social-post-card">
            {item.status === 'idle' && <div className="card-placeholder">Esperando para generar...</div>}
            {item.status === 'loading' && <div className="card-placeholder"><Loader /></div>}
            {item.status === 'error' && <div className="card-error"><p><strong>Error:</strong> {item.error}</p><button className="card-button" onClick={onRegenerate} title="Regenerar"><RegenerateIcon /></button></div>}
            {item.status === 'success' && item.imageUrl && item.data && (
                <>
                    <ImageCard item={item} onRegenerate={onRegenerate} />
                    <div className="card-content">
                        <div className="card-copy-text">{item.data.copy}</div>
                        <button className="copy-button" onClick={handleCopy}>{copyStatus}</button>
                    </div>
                </>
            )}
        </div>
    );
};

const CampaignCard = ({ item, onRegenerate }: { item: ResultItem, onRegenerate: () => void }) => {
     const handleCopy = () => {
        if (!item.data) return;
        const textToCopy = `Concepto: ${item.data.concept}\n\nResumen: ${item.data.summary}\n\nAcciones Clave:\n- ${item.data.keyActions.join('\n- ')}`;
        navigator.clipboard.writeText(textToCopy);
    };

    return (
        <div className="card campaign-card">
            {item.status === 'idle' && <div className="card-placeholder">Esperando para generar...</div>}
            {item.status === 'loading' && <div className="card-placeholder"><Loader /></div>}
            {item.status === 'error' && <div className="card-error"><p><strong>Error:</strong> {item.error}</p><button className="card-button" onClick={onRegenerate} title="Regenerar"><RegenerateIcon /></button></div>}
            {item.status === 'success' && item.data && (
                 <>
                    <div className="card-actions">
                         <button className="card-button" title="Copiar Concepto" onClick={handleCopy}><CopyIcon /></button>
                         <button className="card-button" title="Regenerar" onClick={onRegenerate}><RegenerateIcon /></button>
                    </div>
                    <div className="card-content">
                       <h3 className="card-title" style={{textTransform: 'none'}}>{item.data.concept}</h3>
                       <div>
                           <h4 className="card-section-title">Resumen</h4>
                           <p className="card-text-block">{item.data.summary}</p>
                       </div>
                        <div>
                           <h4 className="card-section-title">Acciones Clave</h4>
                           <div className="card-text-block">
                               <ul>{item.data.keyActions.map((action: string, i: number) => <li key={i}>{action}</li>)}</ul>
                           </div>
                       </div>
                    </div>
                </>
            )}
        </div>
    );
};

const ScriptCard = ({ item, onRegenerate }: { item: ResultItem, onRegenerate: () => void }) => {
    const handleCopy = () => {
        if (!item.data) return;
        const textToCopy = `Concepto: ${item.data.concept}\n\nGuion:\n${item.data.script}`;
        navigator.clipboard.writeText(textToCopy);
    };

    return (
        <div className="card script-card">
            {item.status === 'idle' && <div className="card-placeholder">Esperando para generar...</div>}
            {item.status === 'loading' && <div className="card-placeholder"><Loader /></div>}
            {item.status === 'error' && <div className="card-error"><p><strong>Error:</strong> {item.error}</p><button className="card-button" onClick={onRegenerate} title="Regenerar"><RegenerateIcon /></button></div>}
            {item.status === 'success' && item.data && (
                 <>
                    <div className="card-actions">
                         <button className="card-button" title="Copiar Guion" onClick={handleCopy}><CopyIcon /></button>
                         <button className="card-button" title="Regenerar" onClick={onRegenerate}><RegenerateIcon /></button>
                    </div>
                    <div className="card-content">
                       <h3 className="card-title" style={{textTransform: 'none'}}>{item.data.concept}</h3>
                       <div>
                           <h4 className="card-section-title">Guion</h4>
                           <p className="card-text-block">{item.data.script}</p>
                       </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default App;
