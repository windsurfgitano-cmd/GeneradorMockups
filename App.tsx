import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as geminiService from './services/geminiService';
import { fileToBase64, exportResultsAsTxt } from './utils/fileUtils';

// --- Helper Components ---

const LoadingSpinner = () => <div className="loader">Cargando...</div>;
const ErrorMessage = ({ message }: { message: string }) => <div className="error-message">{message}</div>;
const RegenerateButton = ({ onClick }: { onClick: () => void }) => <button onClick={onClick}>Regenerar</button>;

// --- Tool Components (Restored one by one) ---

// 1. Mockup Generator
const MockupGenerator = () => {
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [brandContext, setBrandContext] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const generateMockups = useCallback(async (count: number, startIndex = -1) => {
        if (!logoFile) {
            alert("Por favor, sube un logo.");
            return;
        }
        
        if (startIndex === -1) {
            setIsLoading(true);
            setResults(Array(count).fill({ status: 'loading' }));
        }

        const { base64, mimeType } = await fileToBase64(logoFile);

        const promises = Array(count).fill(0).map(() => 
            geminiService.generateMockup({ base64Logo: base64, mimeType, brandContext })
                .then(result => ({ status: 'success', data: result }))
                .catch(error => ({ status: 'error', message: error.message }))
        );

        promises.forEach((promise, index) => {
            promise.then(res => {
                setResults(prev => {
                    const updated = [...prev];
                    updated[startIndex === -1 ? index : startIndex] = res;
                    return updated;
                });
            });
        });
        
        await Promise.allSettled(promises);
        setIsLoading(false);

    }, [logoFile, brandContext]);

    const handleRegenerate = (index: number) => {
        setResults(prev => {
            const updated = [...prev];
            updated[index] = { status: 'loading' };
            return updated;
        });
        generateMockups(1, index); 
    };
    
    const handleExport = () => {
        const content = results
            .filter(r => r.status === 'success')
            .map((r, i) => `Mockup ${i + 1}:\nPrompt: ${r.data.prompt}\n(Imagen generada)\n\n---\n\n`)
            .join('');
        exportResultsAsTxt(content, 'mockups_export.txt');
    };

    return (
        <>
            <div className="control-panel">
                 <div className="input-group">
                    <label htmlFor="logo-upload">1. Sube tu Logo (fondo transparente recomendado)</label>
                    <input type="file" id="logo-upload" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                </div>
                <div className="input-group">
                    <label htmlFor="brand-context">2. Contexto de la Marca (Opcional)</label>
                    <textarea id="brand-context" value={brandContext} onChange={e => setBrandContext(e.target.value)} placeholder="Ej: una marca de café artesanal y ecológica..." />
                </div>
                <div className="button-group">
                    <button className="generate-button" onClick={() => generateMockups(10)} disabled={isLoading || !logoFile}>
                        {isLoading ? 'Generando...' : 'Generar 10 Mockups'}
                    </button>
                    <button className="export-button" onClick={handleExport} disabled={results.every(r => r.status !== 'success')}>Exportar</button>
                </div>
            </div>
            <div className="results-grid">
                {results.map((res, i) => (
                    <div className="card" key={i}>
                        {res.status === 'loading' && <LoadingSpinner />}
                        {res.status === 'error' && <ErrorMessage message={res.message} />}
                        {res.status === 'success' && (
                            <>
                                <img src={`data:${res.data.mimeType};base64,${res.data.base64Image}`} alt={`Mockup ${i + 1}`} className="card-image" />
                                <div className="card-overlay">
                                    <p className="card-prompt">{res.data.prompt}</p>
                                    <div className="card-overlay-actions">
                                        <a href={`data:${res.data.mimeType};base64,${res.data.base64Image}`} download={`mockup-${i + 1}.png`}>Descargar</a>
                                        <RegenerateButton onClick={() => handleRegenerate(i)} />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
};

// 2. Logo Generator
const LogoGenerator = () => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const generateLogos = useCallback(async (count: number, startIndex = -1) => {
        if (!prompt) {
            alert("Por favor, describe el logo que quieres crear.");
            return;
        }
        if(startIndex === -1) setIsLoading(true);
        if (startIndex === -1) setResults(Array(count).fill({ status: 'loading' }));

        const promises = Array(count).fill(0).map(() => 
            geminiService.generateImageFromText(prompt)
                .then(result => ({ status: 'success', data: result }))
                .catch(error => ({ status: 'error', message: error.message }))
        );

        promises.forEach((promise, index) => {
            promise.then(res => {
                setResults(prev => {
                    const updated = [...prev];
                    updated[startIndex === -1 ? index : startIndex] = res;
                    return updated;
                });
            });
        });
        
        await Promise.allSettled(promises);
        if(startIndex === -1) setIsLoading(false);
    }, [prompt]);

    const handleRegenerate = (index: number) => {
        setResults(prev => {
            const updated = [...prev];
            updated[index] = { status: 'loading' };
            return updated;
        });
        generateLogos(1, index);
    };

    const handleExport = () => {
        const content = results
            .filter(r => r.status === 'success')
            .map((r, i) => `Logo ${i + 1}:\nPrompt Completo: ${r.data.prompt}\n(Imagen generada)\n\n---\n\n`)
            .join('');
        exportResultsAsTxt(content, 'logos_export.txt');
    };

    return (
        <>
            <div className="control-panel">
                <div className="input-group">
                    <label htmlFor="logo-prompt">Describe el logo que imaginas</label>
                    <textarea id="logo-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ej: Un zorro astuto leyendo un libro para una librería..." />
                </div>
                <div className="button-group">
                    <button className="generate-button" onClick={() => generateLogos(10)} disabled={isLoading || !prompt}>
                        {isLoading ? 'Generando...' : 'Generar 10 Logos'}
                    </button>
                    <button className="export-button" onClick={handleExport} disabled={results.every(r => r.status !== 'success')}>Exportar</button>
                </div>
            </div>
            <div className="results-grid">
                {results.map((res, i) => (
                    <div className="card" key={i}>
                        {res.status === 'loading' && <LoadingSpinner />}
                        {res.status === 'error' && <ErrorMessage message={res.message} />}
                        {res.status === 'success' && (
                            <>
                                <img src={`data:${res.data.mimeType};base64,${res.data.base64Image}`} alt={`Logo ${i + 1}`} className="card-image" />
                                <div className="card-overlay">
                                    <p className="card-prompt">{res.data.style}</p>
                                    <div className="card-overlay-actions">
                                        <a href={`data:${res.data.mimeType};base64,${res.data.base64Image}`} download={`logo-${i + 1}.png`}>Descargar</a>
                                        <RegenerateButton onClick={() => handleRegenerate(i)} />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
};

// 3. Branding Assistant
const BrandingAssistant = () => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const generateBranding = useCallback(async (count: number, startIndex = -1) => {
        if (!prompt) {
            alert("Por favor, describe la esencia de tu marca.");
            return;
        }
        if(startIndex === -1) {
            setIsLoading(true);
            setResults(Array(count).fill({ status: 'loading' }));
            try {
                const brandingConcepts = await geminiService.generateBranding(prompt, count);
                setResults(brandingConcepts.map((data: any) => ({ status: 'success', data })));
            } catch (error: any) {
                setResults(Array(count).fill({ status: 'error', message: error.message }));
            } finally {
                setIsLoading(false);
            }
        } else {
             try {
                const brandingConcepts = await geminiService.generateBranding(prompt, 1);
                setResults(prev => {
                    const updated = [...prev];
                    updated[startIndex] = { status: 'success', data: brandingConcepts[0] };
                    return updated;
                });
            } catch (error: any) {
                setResults(prev => {
                    const updated = [...prev];
                    updated[startIndex] = { status: 'error', message: error.message };
                    return updated;
                });
            }
        }
    }, [prompt]);

    const handleRegenerate = (index: number) => {
        setResults(prev => {
            const updated = [...prev];
            updated[index] = { status: 'loading' };
            return updated;
        });
        generateBranding(1, index);
    };

    const handleExport = () => {
        const content = results
            .filter(r => r.status === 'success')
            .map((r, i) => 
`Concepto de Branding ${i + 1}:
Paleta de Colores: ${r.data.colors.join(', ')}
Tipografía: ${r.data.typography.fontPairing}
Tono de Voz: ${r.data.toneOfVoice.description}
\n---\n\n`
            )
            .join('');
        exportResultsAsTxt(content, 'branding_export.txt');
    };

    return (
        <>
            <div className="control-panel">
                <div className="input-group">
                    <label htmlFor="brand-prompt">Describe la esencia de la marca</label>
                    <textarea id="brand-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ej: Una marca de cuidado de la piel, vegana y natural..." />
                </div>
                 <div className="button-group">
                    <button className="generate-button" onClick={() => generateBranding(10)} disabled={isLoading || !prompt}>
                        {isLoading ? 'Generando...' : 'Generar 10 Ideas'}
                    </button>
                    <button className="export-button" onClick={handleExport} disabled={results.every(r => r.status !== 'success')}>Exportar</button>
                </div>
            </div>
            <div className="results-grid">
                {results.map((res, i) => (
                    <div className="card branding-card" key={i}>
                        {res.status === 'loading' && <LoadingSpinner />}
                        {res.status === 'error' && <ErrorMessage message={res.message} />}
                        {res.status === 'success' && (
                            <div>
                                <h3>Concepto {i+1}</h3>
                                <p><strong>Paleta de Colores:</strong></p>
                                <div className="palette">
                                    {res.data.colors.map((color: string) => <div key={color} className="color-swatch" style={{backgroundColor: color}} title={color}></div>)}
                                </div>
                                <p><strong>Tipografía:</strong> {res.data.typography.fontPairing}</p>
                                <p><strong>Tono de Voz:</strong> {res.data.toneOfVoice.description}</p>
                                <div className="card-overlay">
                                    <div className="card-overlay-actions">
                                        <RegenerateButton onClick={() => handleRegenerate(i)} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
};

// 4. Social Post Generator
const SocialPostGenerator = () => {
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const generatePosts = useCallback(async () => {
        if (!prompt) {
            alert("Por favor, describe el objetivo del post.");
            return;
        }
        setIsLoading(true);
        setResults(Array(10).fill({ status: 'loading' }));

        try {
            const ideas = await geminiService.generateSocialPostIdeas(prompt);
            setResults(ideas.map((idea: any) => ({ status: 'generating_image', data: idea })));

            const imagePromises = ideas.map((idea: any) => 
                geminiService.generateImageFromText(idea.imagePrompt, true)
            );

            imagePromises.forEach((promise, index) => {
                promise.then(imageResult => {
                    setResults(prev => {
                        const updated = [...prev];
                        updated[index] = { status: 'success', data: { ...updated[index].data, image: imageResult } };
                        return updated;
                    });
                }).catch(error => {
                     setResults(prev => {
                        const updated = [...prev];
                        updated[index] = { status: 'error', message: error.message, data: updated[index].data };
                        return updated;
                    });
                });
            });
            await Promise.allSettled(imagePromises);
        } catch (error: any) {
             setResults(Array(10).fill({ status: 'error', message: error.message }));
        } finally {
            setIsLoading(false);
        }
    }, [prompt]);
    
    const handleRegenerate = async (index: number) => {
        const originalData = results[index].data;
        setResults(prev => {
            const updated = [...prev];
            updated[index] = { status: 'generating_image', data: originalData };
            return updated;
        });
        try {
            const imageResult = await geminiService.generateImageFromText(originalData.imagePrompt, true);
            setResults(prev => {
                const updated = [...prev];
                updated[index] = { status: 'success', data: { ...originalData, image: imageResult } };
                return updated;
            });
        } catch (error: any) {
            setResults(prev => {
                const updated = [...prev];
                updated[index] = { status: 'error', message: error.message, data: originalData };
                return updated;
            });
        }
    };
    
    const handleExport = () => {
        const content = results
            .filter(r => r.status === 'success')
            .map((r, i) => 
`Post ${i + 1}:
Copy:
${r.data.copy}

Prompt de Imagen:
${r.data.imagePrompt}
\n---\n\n`
            )
            .join('');
        exportResultsAsTxt(content, 'social_posts_export.txt');
    };

    return (
         <>
            <div className="control-panel">
                <div className="input-group">
                    <label htmlFor="post-prompt">Describe el objetivo de tu post</label>
                    <textarea id="post-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ej: Lanzamiento de zapatillas eco-friendly para corredores urbanos..." />
                </div>
                 <div className="button-group">
                    <button className="generate-button" onClick={generatePosts} disabled={isLoading || !prompt}>
                        {isLoading ? 'Generando...' : 'Generar 10 Posts'}
                    </button>
                    <button className="export-button" onClick={handleExport} disabled={results.every(r => r.status !== 'success')}>Exportar</button>
                </div>
            </div>
            <div className="results-grid">
                {results.map((res, i) => (
                    <div className="card" key={i}>
                        {res.status === 'loading' && <LoadingSpinner />}
                        {res.status === 'generating_image' && <div><LoadingSpinner /><p>Generando imagen...</p></div>}
                        {res.status === 'error' && <ErrorMessage message={res.message} />}
                        {res.status === 'success' && (
                            <>
                                <img src={`data:${res.data.image.mimeType};base64,${res.data.image.base64Image}`} alt={`Post ${i + 1}`} className="card-image" />
                                <div className="card-overlay">
                                    <p className="card-prompt" title={res.data.copy}>{res.data.copy}</p>
                                    <div className="card-overlay-actions">
                                         <button onClick={() => navigator.clipboard.writeText(res.data.copy)}>Copiar Texto</button>
                                         <a href={`data:${res.data.image.mimeType};base64,${res.data.image.base64Image}`} download={`post-${i + 1}.png`}>Descargar</a>
                                         <RegenerateButton onClick={() => handleRegenerate(i)} />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
};

// --- Generic Text-based Generator Component Factory ---
const createTextGenerator = (config: {
    toolName: string;
    serviceFn: (prompt: string, count: number) => Promise<any[]>;
    promptLabel: string;
    promptPlaceholder: string;
    CardComponent: React.FC<{ result: any, index: number, onRegenerate: (index: number) => void }>;
    formatExport: (results: any[]) => string;
    inputs?: Array<{id: string, label: string, placeholder: string}>;
}) => {
    return () => {
        const [inputs, setInputs] = useState<Record<string, string>>(
            config.inputs ? config.inputs.reduce((acc, cur) => ({ ...acc, [cur.id]: '' }), {}) : { prompt: '' }
        );
        const [results, setResults] = useState<any[]>([]);
        const [isLoading, setIsLoading] = useState(false);

        const getFullPrompt = () => {
             if (!config.inputs) return inputs.prompt;
             return config.inputs.map(i => `${i.label}: ${inputs[i.id]}`).join('\n');
        }

        const generate = useCallback(async (count: number, startIndex = -1) => {
            const fullPrompt = getFullPrompt();
            if (!fullPrompt.trim() || Object.values(inputs).some(val => !val)) {
                alert("Por favor, completa todos los campos.");
                return;
            }
            if(startIndex === -1) {
                setIsLoading(true);
                setResults(Array(count).fill({ status: 'loading' }));
                try {
                    const data = await config.serviceFn(fullPrompt, count);
                    setResults(data.map((item: any) => ({ status: 'success', data: item })));
                } catch (error: any) {
                    setResults(Array(count).fill({ status: 'error', message: error.message }));
                } finally {
                    setIsLoading(false);
                }
            } else {
                 try {
                    const data = await config.serviceFn(fullPrompt, 1);
                    setResults(prev => {
                        const updated = [...prev];
                        updated[startIndex] = { status: 'success', data: data[0] };
                        return updated;
                    });
                } catch (error: any) {
                    setResults(prev => {
                        const updated = [...prev];
                        updated[startIndex] = { status: 'error', message: error.message };
                        return updated;
                    });
                }
            }
        }, [inputs]);

        const handleRegenerate = (index: number) => {
            setResults(prev => {
                const updated = [...prev];
                updated[index] = { status: 'loading' };
                return updated;
            });
            generate(1, index);
        };
        
        const handleInputChange = (id: string, value: string) => {
            setInputs(prev => ({...prev, [id]: value}));
        }

        const handleExport = () => {
            exportResultsAsTxt(config.formatExport(results), `${config.toolName.toLowerCase().replace(' ', '_')}_export.txt`);
        };

        return (
            <>
                <div className="control-panel">
                    {config.inputs ? (
                        config.inputs.map(input => (
                            <div className="input-group" key={input.id}>
                                <label htmlFor={input.id}>{input.label}</label>
                                <textarea id={input.id} value={inputs[input.id]} onChange={e => handleInputChange(input.id, e.target.value)} placeholder={input.placeholder} />
                            </div>
                        ))
                    ) : (
                         <div className="input-group">
                            <label htmlFor="prompt">{config.promptLabel}</label>
                            <textarea id="prompt" value={inputs.prompt} onChange={e => handleInputChange('prompt', e.target.value)} placeholder={config.promptPlaceholder} />
                        </div>
                    )}
                     <div className="button-group">
                        <button className="generate-button" onClick={() => generate(10)} disabled={isLoading || Object.values(inputs).some(val => !val)}>
                            {isLoading ? 'Generando...' : 'Generar 10 Ideas'}
                        </button>
                        <button className="export-button" onClick={handleExport} disabled={results.every(r => r.status !== 'success')}>Exportar</button>
                    </div>
                </div>
                <div className="results-grid">
                    {results.map((res, i) => (
                        <div className={`card ${config.toolName.toLowerCase()}-card`} key={i}>
                            {res.status === 'loading' && <LoadingSpinner />}
                            {res.status === 'error' && <ErrorMessage message={res.message} />}
                            {res.status === 'success' && <config.CardComponent result={res} index={i} onRegenerate={handleRegenerate} />}
                        </div>
                    ))}
                </div>
            </>
        );
    }
};

// --- Card Components for Text Generators ---
const CampaignIdeaCard = ({ result, index, onRegenerate }: any) => (
    <div>
        <h3>{result.data.concept}</h3>
        <p>{result.data.summary}</p>
        <ul>{result.data.keyActions.map((action: string, i: number) => <li key={i}>{action}</li>)}</ul>
        <div className="card-overlay"><div className="card-overlay-actions"><RegenerateButton onClick={() => onRegenerate(index)} /></div></div>
    </div>
);
const ScriptCard = ({ result, index, onRegenerate }: any) => (
    <div>
        <h3>{result.data.concept}</h3>
        <p className="script-card">{result.data.script}</p>
        <div className="card-overlay"><div className="card-overlay-actions"><RegenerateButton onClick={() => onRegenerate(index)} /></div></div>
    </div>
);
const CopywritingCard = ({ result, index, onRegenerate }: any) => (
    <div>
        <h3>Variante de Copy {index + 1}</h3>
        <p className="copywriting-card">{result.data.copy}</p>
        <div className="card-overlay"><div className="card-overlay-actions"><button onClick={() => navigator.clipboard.writeText(result.data.copy)}>Copiar</button><RegenerateButton onClick={() => onRegenerate(index)} /></div></div>
    </div>
);
const PersonaCard = ({ result, index, onRegenerate }: any) => (
    <div>
        <h3>{result.data.name}, {result.data.age}</h3>
        <p><strong>Ocupación:</strong> {result.data.occupation}</p>
        <p><strong>Bio:</strong> {result.data.bio}</p>
        <p><strong>Metas:</strong> {result.data.goals}</p>
        <p><strong>Puntos de Dolor:</strong> {result.data.painPoints}</p>
        <div className="card-overlay"><div className="card-overlay-actions"><RegenerateButton onClick={() => onRegenerate(index)} /></div></div>
    </div>
);
const SeoCard = ({ result, index, onRegenerate }: any) => (
    <div>
        <h3>Idea de SEO ({result.data.type})</h3>
        <p>{result.data.content}</p>
        <div className="card-overlay"><div className="card-overlay-actions"><RegenerateButton onClick={() => onRegenerate(index)} /></div></div>
    </div>
);
const NameSloganCard = ({ result, index, onRegenerate }: any) => (
    <div>
        <h3>Sugerencia ({result.data.type})</h3>
        <h4>{result.data.suggestion}</h4>
        <p><em>{result.data.justification}</em></p>
        <div className="card-overlay"><div className="card-overlay-actions"><RegenerateButton onClick={() => onRegenerate(index)} /></div></div>
    </div>
);


// 5. Campaign Idea Generator
const CampaignIdeaGenerator = createTextGenerator({
    toolName: "CampaignIdea",
    serviceFn: (prompt, count) => geminiService.generateCampaignIdeas(prompt, count),
    inputs: [
        {id: 'product', label: 'Producto/Servicio', placeholder: 'Ej: App de meditación'},
        {id: 'objective', label: 'Objetivo Principal', placeholder: 'Ej: Conseguir 10,000 nuevos usuarios'},
        {id: 'audience', label: 'Público Objetivo', placeholder: 'Ej: Jóvenes profesionales con estrés'}
    ],
    promptLabel: '', promptPlaceholder: '', // Not used
    CardComponent: CampaignIdeaCard,
    formatExport: results => results.filter(r => r.status === 'success').map((r, i) => `Campaña ${i+1}: ${r.data.concept}\nResumen: ${r.data.summary}\nAcciones: ${r.data.keyActions.join(', ')}\n\n---\n\n`).join('')
});

// 6. Script Generator
const ScriptGenerator = createTextGenerator({
    toolName: "Script",
    serviceFn: (prompt, count) => geminiService.generateScripts(prompt, count),
    promptLabel: "Tema o mensaje clave del video",
    promptPlaceholder: "Ej: Un tip rápido para mejorar la productividad por la mañana",
    CardComponent: ScriptCard,
    formatExport: results => results.filter(r => r.status === 'success').map((r, i) => `Guion ${i+1}: ${r.data.concept}\n${r.data.script}\n\n---\n\n`).join('')
});

// 7. Video Generator
const VideoGenerator = () => {
    const [apiKeySelected, setApiKeySelected] = useState(true); // Assume true initially, check on mount
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState('');
    
    useEffect(() => {
        window.aistudio.hasSelectedApiKey().then((hasKey: boolean) => setApiKeySelected(hasKey));
    }, []);

    const pollOperation = async (operation: any) => {
        setProgress('Iniciando generación de video... Esto puede tardar varios minutos.');
        let isDone = false;
        while (!isDone) {
            try {
                await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10s
                const updatedOp = await geminiService.getVideoOperationStatus(operation);
                if (updatedOp.done) {
                    isDone = true;
                    const uri = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
                    if (uri) {
                        const videoResponse = await fetch(`${uri}&key=${process.env.API_KEY}`);
                        const blob = await videoResponse.blob();
                        setVideoUrl(URL.createObjectURL(blob));
                        setProgress('¡Video generado con éxito!');
                    } else {
                        throw new Error("La operación finalizó pero no se encontró la URL del video.");
                    }
                } else {
                     setProgress('El video se está procesando en los servidores de Google...');
                }
            } catch (e: unknown) {
                isDone = true;
                let errorMessage = "Ocurrió un error al procesar el video.";
                if (e instanceof Error) {
                     if (e.message.includes("Requested entity was not found")) {
                        errorMessage = "La clave de API no es válida o no tiene acceso a Veo. Por favor, selecciona una clave diferente.";
                        setApiKeySelected(false);
                     } else {
                        errorMessage = e.message;
                     }
                }
                setError(errorMessage);
            }
        }
        setIsLoading(false);
    };

    const handleGenerate = async () => {
        if (!imageFile || !prompt) {
            alert("Por favor, sube una imagen y escribe un prompt.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setVideoUrl(null);
        setProgress('');
        try {
            const { base64, mimeType } = await fileToBase64(imageFile);
            const operation = await geminiService.generateVideo({ base64Image: base64, mimeType, prompt, aspectRatio });
            await pollOperation(operation);
        } catch (e: any) {
            setError(e.message);
            setIsLoading(false);
        }
    };

    if (!apiKeySelected) {
        return (
            <div className="control-panel">
                <h3>Acción Requerida</h3>
                <p>Para usar el Generador de Videos (Veo), debes seleccionar una API Key de un proyecto con facturación habilitada.</p>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer">Más información sobre facturación.</a>
                <button className="generate-button" onClick={() => window.aistudio.openSelectKey().then(() => setApiKeySelected(true))}>
                    Seleccionar Clave de API
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="control-panel">
                <div className="input-group">
                    <label>1. Sube una imagen de inicio</label>
                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                </div>
                <div className="input-group">
                    <label>2. Describe qué quieres que suceda en el video</label>
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ej: un dron vuela lentamente hacia adelante..." />
                </div>
                 <div className="input-group">
                    <label>3. Elige el formato del video</label>
                    <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)}>
                        <option value="16:9">16:9 (Horizontal)</option>
                        <option value="9:16">9:16 (Vertical)</option>
                    </select>
                </div>
                <button className="generate-button" onClick={handleGenerate} disabled={isLoading || !imageFile || !prompt}>
                    {isLoading ? 'Generando Video...' : 'Generar Video'}
                </button>
            </div>
            <div className="results-grid">
                {isLoading && <div className="card"><LoadingSpinner /><p>{progress}</p></div>}
                {error && <div className="card"><ErrorMessage message={error} /></div>}
                {videoUrl && <div className="card"><video src={videoUrl} controls className="card-video" /></div>}
            </div>
        </>
    );
};

// 8. Image Analyzer
const ImageAnalyzer = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));
            setResult(null); // Clear previous results
            setError(null);
        }
    };
    
    const handleAnalyze = async () => {
        if (!imageFile) {
            alert("Por favor, sube una imagen.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const { base64, mimeType } = await fileToBase64(imageFile);
            const analysis = await geminiService.analyzeImage({ base64Image: base64, mimeType });
            setResult(analysis);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
             <div className="control-panel">
                <div className="input-group">
                    <label>Sube una imagen para analizar</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                </div>
                <button className="generate-button" onClick={handleAnalyze} disabled={isLoading || !imageFile}>
                    {isLoading ? 'Analizando...' : 'Analizar Imagen'}
                </button>
            </div>
            {(imageUrl || isLoading || error) && (
                <div className="analyzer-layout">
                    <div className="analyzer-image-container">
                        {imageUrl && <img src={imageUrl} alt="Imagen para analizar" />}
                    </div>
                    <div className="analyzer-results-container">
                        {isLoading && <LoadingSpinner />}
                        {error && <ErrorMessage message={error} />}
                        {result && (
                            <>
                                <div className="button-group" style={{marginBottom: '1rem'}}>
                                    <button className="copy-button" onClick={() => navigator.clipboard.writeText(result)}>Copiar Análisis</button>
                                    <button className="export-button" onClick={() => exportResultsAsTxt(result, 'analisis_imagen.txt')}>Descargar</button>
                                </div>
                                <p className="analyzer-results">{result}</p>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

// 9. Copywriting Assistant
const CopywritingAssistant = createTextGenerator({
    toolName: "Copywriting",
    serviceFn: (prompt, count) => geminiService.generateCopywriting(prompt, count),
    inputs: [
        {id: 'product', label: 'Producto/Servicio', placeholder: 'Ej: Curso online de finanzas personales'},
        {id: 'audience', label: 'Público Objetivo', placeholder: 'Ej: Millennials que quieren empezar a invertir'},
        {id: 'tone', label: 'Tono de Voz', placeholder: 'Ej: Educativo, motivador y sin jerga'},
        {id: 'format', label: 'Formato', placeholder: 'Ej: Anuncio de Facebook, Asunto de Email...'}
    ],
    promptLabel: '', promptPlaceholder: '',
    CardComponent: CopywritingCard,
    formatExport: results => results.filter(r => r.status === 'success').map((r, i) => `Variante ${i+1}:\n${r.data.copy}\n\n---\n\n`).join('')
});

// 10. Persona Generator
const PersonaGenerator = createTextGenerator({
    toolName: "Persona",
    serviceFn: (prompt, count) => geminiService.generatePersonas(prompt, count),
    promptLabel: "Describe tu producto y tu cliente ideal",
    promptPlaceholder: "Ej: Una marca de café de especialidad, sostenible, para conocedores que trabajan desde casa...",
    CardComponent: PersonaCard,
    formatExport: results => results.filter(r => r.status === 'success').map((r, i) => 
`Persona ${i+1}: ${r.data.name}, ${r.data.age}
Ocupación: ${r.data.occupation}
Bio: ${r.data.bio}
Metas: ${r.data.goals}
Puntos de Dolor: ${r.data.painPoints}
\n---\n\n`).join('')
});

// 11. SEO Assistant
const SeoAssistant = createTextGenerator({
    toolName: "SEO",
    serviceFn: (prompt, count) => geminiService.generateSeoIdeas(prompt, count),
    promptLabel: "Tema o Palabra Clave Principal",
    promptPlaceholder: "Ej: cómo empezar a invertir en criptomonedas",
    CardComponent: SeoCard,
    formatExport: results => results.filter(r => r.status === 'success').map((r, i) => `Idea SEO ${i+1} (${r.data.type}):\n${r.data.content}\n\n---\n\n`).join('')
});

// 12. Name & Slogan Generator
const NameSloganGenerator = createTextGenerator({
    toolName: "NameSlogan",
    serviceFn: (prompt, count) => geminiService.generateNamesAndSlogans(prompt, count),
    promptLabel: "Describe la esencia de tu negocio o producto",
    promptPlaceholder: "Ej: Una app de delivery que solo entrega comida local y saludable en menos de 30 minutos...",
    CardComponent: NameSloganCard,
    formatExport: results => results.filter(r => r.status === 'success').map((r, i) => `Sugerencia ${i+1} (${r.data.type}): ${r.data.suggestion}\nJustificación: ${r.data.justification}\n\n---\n\n`).join('')
});


// --- Main App Component ---

const toolComponentMap: Record<string, React.FC> = {
    MockupGenerator,
    LogoGenerator,
    BrandingAssistant,
    SocialPostGenerator,
    CampaignIdeaGenerator,
    ScriptGenerator,
    VideoGenerator,
    ImageAnalyzer,
    CopywritingAssistant,
    PersonaGenerator,
    SeoAssistant,
    NameSloganGenerator,
};

const toolDetails: Record<string, {name: string, description: string}> = {
    PersonaGenerator: { name: "Creador de Personas", description: "Define a tu cliente ideal creando perfiles de 'Buyer Persona' detallados." },
    BrandingAssistant: { name: "Asistente de Branding", description: "Genera conceptos de identidad de marca, incluyendo paletas de colores, tipografías y tono de voz." },
    NameSloganGenerator: { name: "Nombres y Slogans", description: "Supera el bloqueo creativo con sugerencias de nombres y slogans para nuevas marcas." },
    LogoGenerator: { name: "Generador de Logos", description: "Crea conceptos de logos únicos a partir de una descripción y diferentes estilos artísticos." },
    MockupGenerator: { name: "Generador de Mockups", description: "Visualiza tu logo en escenas del mundo real para presentaciones impactantes." },
    SocialPostGenerator: { name: "Posts para Redes", description: "Crea pares de imagen + copy listos para publicar en tus redes sociales." },
    ScriptGenerator: { name: "Guiones para Reels", description: "Genera guiones estructurados para videos cortos en formato Reels o TikTok." },
    VideoGenerator: { name: "Generador de Videos", description: "Crea videos cortos a partir de una imagen y una descripción usando el modelo Veo." },
    CopywritingAssistant: { name: "Asistente de Copywriting", description: "Escribe textos publicitarios de alto impacto para diferentes formatos y A/B testing." },
    CampaignIdeaGenerator: { name: "Ideas de Campaña", description: "Obtén conceptos de campañas de marketing estructuradas a partir de un brief." },
    SeoAssistant: { name: "Asistente SEO", description: "Agiliza tu estrategia de contenidos con ideas de títulos, FAQs y meta descripciones." },
    ImageAnalyzer: { name: "Analizador de Imágenes", description: "Obtén un análisis de marketing experto sobre cualquier imagen (composición, colores, etc.)." },
};

const toolGroups = {
    "Estrategia y Fundación de Marca": ["PersonaGenerator", "BrandingAssistant", "NameSloganGenerator", "LogoGenerator"],
    "Producción Creativa y Contenido": ["MockupGenerator", "SocialPostGenerator", "ScriptGenerator", "VideoGenerator"],
    "Ejecución y Optimización": ["CopywritingAssistant", "CampaignIdeaGenerator", "SeoAssistant", "ImageAnalyzer"],
};


const App: React.FC = () => {
    const [selectedTool, setSelectedTool] = useState<string>("PersonaGenerator");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const CurrentToolComponent = toolComponentMap[selectedTool];
    const details = toolDetails[selectedTool];

    const handleSelectTool = (tool: string) => {
        setSelectedTool(tool);
        setIsMobileMenuOpen(false);
    }
    
    return (
        <div className="app-container">
            <button className="mobile-menu-button" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                 <div className="hamburger-icon" />
            </button>
            <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>
            <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                 <div className="sidebar-header">
                    <h1 className="sidebar-super-title">EL REY DE LAS PAGINas</h1>
                    <h2 className="sidebar-title">Suite Creativa</h2>
                    <p className="sidebar-subtitle">Potenciada por IA</p>
                </div>
                <nav>
                    {Object.entries(toolGroups).map(([groupName, tools]) => (
                        <div className="nav-group" key={groupName}>
                            <h3 className="nav-group-title">{groupName}</h3>
                            {tools.map(toolKey => (
                                <a 
                                    key={toolKey} 
                                    className={`nav-link ${selectedTool === toolKey ? 'active' : ''}`}
                                    onClick={() => handleSelectTool(toolKey)}
                                >
                                    {toolDetails[toolKey].name}
                                </a>
                            ))}
                        </div>
                    ))}
                </nav>
            </aside>
            <main className="main-container">
                <header className="page-header">
                    <h1>{details.name}</h1>
                    <p>{details.description}</p>
                </header>
                <CurrentToolComponent />
            </main>
        </div>
    );
};

export default App;
