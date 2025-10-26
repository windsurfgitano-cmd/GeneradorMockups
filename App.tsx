import React, { useState, useCallback } from 'react';
import { generateMockup, MockupResult } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

// Interfaz para el estado de cada mockup
interface MockupState {
  id: number;
  prompt: string;
  src: string | null;
  isLoading: boolean;
  error: string | null;
}

// Prompts predefinidos en español
const MOCKUP_PROMPTS = [
  "Logo en una valla publicitaria gigante en una ciudad concurrida al atardecer, estilo fotorrealista.",
  "Logo grabado con láser en una taza de café de cerámica negra mate, sobre un escritorio de madera.",
  "Logo bordado en el pecho de una chaqueta de mezclilla de alta calidad, con detalles de costura visibles.",
  "Logo en la pantalla de un smartphone sostenido por una persona, con un fondo de oficina moderno y desenfocado.",
  "Logo impreso en una bolsa de tela de algodón orgánico, colgada en el hombro de una persona en un mercado.",
  "Logo como un letrero de neón brillante en una pared de ladrillos oscuros en un callejón urbano.",
  "Logo en la portada de un cuaderno de cuero de lujo junto a una pluma estilográfica.",
  "Logo estampado en una patineta de madera de arce, con un estilo de fotografía de producto profesional.",
  "Logo en una tarjeta de presentación de papel texturizado grueso, con un efecto de relieve sutil.",
  "Logo en el lateral de una furgoneta de reparto corporativa, estacionada frente a un edificio de oficinas de vidrio.",
];

const App: React.FC = () => {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [mockups, setMockups] = useState<MockupState[]>([]);
  const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setGlobalError(null);
      setMockups([]); // Limpiar mockups anteriores al cambiar el logo
    } else {
      setLogoFile(null);
      setLogoPreview(null);
    }
  };

  const runGeneration = useCallback(async (base64ImageData: string, mimeType: string, mockupState: MockupState) => {
    try {
      const result = await generateMockup(base64ImageData, mimeType, mockupState.prompt);
      if (result) {
        return { ...mockupState, src: `data:${result.mimeType};base64,${result.base64}`, isLoading: false, error: null };
      }
      return { ...mockupState, error: 'La IA no devolvió una imagen.', isLoading: false };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido.';
      return { ...mockupState, error: errorMessage, isLoading: false };
    }
  }, []);

  const handleGenerateAllClick = useCallback(async () => {
    if (!logoFile) {
      setGlobalError('Por favor, selecciona una imagen de logo para comenzar.');
      return;
    }
    
    setIsGeneratingAll(true);
    setGlobalError(null);

    const initialMockupStates = MOCKUP_PROMPTS.map((prompt, index) => ({
      id: index,
      prompt,
      src: null,
      isLoading: true,
      error: null,
    }));
    setMockups(initialMockupStates);

    try {
      const base64ImageData = await fileToBase64(logoFile);
      const mimeType = logoFile.type;

      const generationPromises = initialMockupStates.map(state => runGeneration(base64ImageData, mimeType, state));

      // Actualizar en tiempo real a medida que cada promesa se resuelve
      for (const promise of generationPromises) {
        promise.then(updatedState => {
          setMockups(prev => prev.map(m => m.id === updatedState.id ? updatedState : m));
        });
      }

      await Promise.allSettled(generationPromises);

    } catch (err) {
        const message = err instanceof Error ? err.message : "Ocurrió un error al preparar la generación.";
        setGlobalError(message);
        setMockups([]);
    } finally {
        setIsGeneratingAll(false);
    }
  }, [logoFile, runGeneration]);

  const handleRegenerateClick = useCallback(async (id: number) => {
    if (!logoFile) return;

    setMockups(prev => prev.map(m => m.id === id ? { ...m, isLoading: true, error: null } : m));
    
    try {
        const base64ImageData = await fileToBase64(logoFile);
        const mimeType = logoFile.type;
        const mockupToRegenerate = mockups.find(m => m.id === id);

        if (mockupToRegenerate) {
            const updatedState = await runGeneration(base64ImageData, mimeType, mockupToRegenerate);
            setMockups(prev => prev.map(m => m.id === id ? updatedState : m));
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al regenerar.';
        setMockups(prev => prev.map(m => m.id === id ? { ...m, isLoading: false, error: errorMessage } : m));
    }
  }, [logoFile, mockups, runGeneration]);

  const handleDownloadClick = (src: string | null) => {
    if (!src) return;
    const link = document.createElement('a');
    link.href = src;
    link.download = `mockup-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  );

  const RegenerateIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
  );

  return (
    <div>
      <header className="app-header">
        <h1>Generador de Mockups con IA</h1>
        <p>Sube tu logo y obtén 10 mockups profesionales al instante para visualizar tu marca en el mundo real.</p>
      </header>
      <main className="main-content">
        <aside className="controls-panel">
          <div className="control-group">
            <label htmlFor="logo-upload">1. Sube tu Logo</label>
            <div className="logo-preview-container">
              {logoPreview ? <img src={logoPreview} alt="Vista previa del logo" /> : <span>Vista Previa</span>}
            </div>
            <input className="file-input" type="file" id="logo-upload" accept="image/*" onChange={handleFileChange} />
          </div>

          <div className="suggestions">
             <h4>Consejo Profesional</h4>
             <p>Para mejores resultados, utiliza un logo con fondo transparente (formato .PNG).</p>
          </div>

          <button
            className="generate-button"
            onClick={handleGenerateAllClick}
            disabled={isGeneratingAll || !logoFile}
          >
            {isGeneratingAll ? 'Generando...' : '2. Generar 10 Mockups'}
          </button>
          {globalError && <div className="global-error">{globalError}</div>}
        </aside>
        
        <section className="results-grid">
          {(mockups.length === 0 && !isGeneratingAll) &&
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="mockup-card">
                 <div className="card-placeholder">Mockup {i + 1}</div>
              </div>
            ))
          }
          {mockups.map((mockup) => (
            <div key={mockup.id} className="mockup-card">
              {mockup.isLoading ? (
                <div className="card-overlay">
                  <div className="card-loader"></div>
                </div>
              ) : mockup.error ? (
                <div className="card-overlay">
                  <p className="card-error">{mockup.error}</p>
                </div>
              ) : mockup.src ? (
                <>
                  <img src={mockup.src} alt={`Mockup de: ${mockup.prompt}`} />
                  <div className="card-actions">
                    <button className="action-button" title="Descargar" onClick={() => handleDownloadClick(mockup.src)}>
                      <DownloadIcon />
                    </button>
                    <button className="action-button" title="Regenerar" onClick={() => handleRegenerateClick(mockup.id)}>
                      <RegenerateIcon />
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default App;
