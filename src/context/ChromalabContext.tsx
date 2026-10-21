import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ToolId, SavedPalette } from '../types/chromalab';
import { ToastContainer, type ToastMessage } from '../components/Toast';

interface ChromalabContextType {
  currentTool: ToolId | 'hub';
  navigateToTool: (tool: ToolId | 'hub') => void;
  activePalette: string[];
  setActivePalette: (colors: string[]) => void;
  savedPalettes: SavedPalette[];
  savePalette: (name: string, colors: string[]) => void;
  deletePalette: (id: string) => void;
  sendPaletteToMesh: (colors: string[]) => void;
  sendPaletteToPattern: (colors: string[]) => void;
  pendingMeshPalette: string[] | null;
  consumePendingMeshPalette: () => string[] | null;
  pendingPatternColors: { primary: string; secondary: string; background: string } | null;
  consumePendingPatternColors: () => { primary: string; secondary: string; background: string } | null;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  isInstallable: boolean;
  promptInstall: () => void;
}

const DEFAULT_PALETTE = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EC4899'];
const PALETTES_STORAGE_KEY = 'chromalab_saved_palettes';
const ACTIVE_PALETTE_STORAGE_KEY = 'chromalab_active_palette';

const ChromalabContext = createContext<ChromalabContextType | null>(null);

export const ChromalabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Sync tool from URL hash if available (e.g. #/mesh or #/palette)
  const [currentTool, setCurrentTool] = useState<ToolId | 'hub'>(() => {
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    const validTools: ToolId[] = ['mesh', 'palette', 'pattern', 'texture', 'type', 'glass'];
    if (validTools.includes(hash as ToolId)) {
      return hash as ToolId;
    }
    return 'hub';
  });

  const [activePalette, setActivePaletteState] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_PALETTE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PALETTE;
    } catch {
      return DEFAULT_PALETTE;
    }
  });

  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>(() => {
    try {
      const saved = localStorage.getItem(PALETTES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [pendingMeshPalette, setPendingMeshPalette] = useState<string[] | null>(null);
  const [pendingPatternColors, setPendingPatternColors] = useState<{
    primary: string;
    secondary: string;
    background: string;
  } | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Update hash when tool changes
  const navigateToTool = useCallback((tool: ToolId | 'hub') => {
    setCurrentTool(tool);
    window.location.hash = tool === 'hub' ? '' : `/${tool}`;
  }, []);

  // Listen to hash change (back/forward button)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      const validTools: ToolId[] = ['mesh', 'palette', 'pattern', 'texture', 'type', 'glass'];
      if (validTools.includes(hash as ToolId)) {
        setCurrentTool(hash as ToolId);
      } else {
        setCurrentTool('hub');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const setActivePalette = useCallback((colors: string[]) => {
    setActivePaletteState(colors);
    try {
      localStorage.setItem(ACTIVE_PALETTE_STORAGE_KEY, JSON.stringify(colors));
    } catch (e) {
      console.warn('Could not persist active palette:', e);
    }
  }, []);

  const showToast = useCallback((type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const savePalette = useCallback((name: string, colors: string[]) => {
    const newPalette: SavedPalette = {
      id: `pal-${Date.now()}`,
      name: name.trim() || 'Minha Paleta',
      colors: [...colors],
      createdAt: Date.now(),
    };
    setSavedPalettes((prev) => {
      const updated = [newPalette, ...prev];
      try {
        localStorage.setItem(PALETTES_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not persist palettes:', e);
      }
      return updated;
    });
    showToast('success', 'Paleta Salva', `"${newPalette.name}" foi guardada na sua coleção.`);
  }, [showToast]);

  const deletePalette = useCallback((id: string) => {
    setSavedPalettes((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(PALETTES_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not update saved palettes:', e);
      }
      return updated;
    });
    showToast('info', 'Paleta Removida');
  }, [showToast]);

  const sendPaletteToMesh = useCallback((colors: string[]) => {
    setPendingMeshPalette([...colors]);
    setActivePalette(colors);
    navigateToTool('mesh');
    showToast('success', 'Paleta Enviada ao Mesh Lab', `${colors.length} cores aplicadas à malha.`);
  }, [navigateToTool, setActivePalette, showToast]);

  const sendPaletteToPattern = useCallback((colors: string[]) => {
    const bg = colors[0] || '#FFFFFF';
    const primary = colors[1] || '#4F46E5';
    const secondary = colors[2] || '#06B6D4';
    setPendingPatternColors({ background: bg, primary, secondary });
    setActivePalette(colors);
    navigateToTool('pattern');
    showToast('success', 'Paleta Enviada ao Pattern Studio', 'Cores aplicadas ao padrão.');
  }, [navigateToTool, setActivePalette, showToast]);

  const consumePendingMeshPalette = useCallback(() => {
    if (!pendingMeshPalette) return null;
    const colors = [...pendingMeshPalette];
    setPendingMeshPalette(null);
    return colors;
  }, [pendingMeshPalette]);

  const consumePendingPatternColors = useCallback(() => {
    if (!pendingPatternColors) return null;
    const colors = { ...pendingPatternColors };
    setPendingPatternColors(null);
    return colors;
  }, [pendingPatternColors]);

  // PWA beforeinstallprompt handler
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const promptInstall = useCallback(() => {
    if (!installPrompt) {
      showToast('info', 'Instalação PWA', 'Abra o menu do seu navegador ou a barra de endereços para instalar o Chromalab.');
      return;
    }
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        showToast('success', 'App Instalado com Sucesso!', 'Chromalab agora está disponível na sua área de trabalho.');
        setIsInstallable(false);
      }
      setInstallPrompt(null);
    });
  }, [installPrompt, showToast]);

  return (
    <ChromalabContext.Provider
      value={{
        currentTool,
        navigateToTool,
        activePalette,
        setActivePalette,
        savedPalettes,
        savePalette,
        deletePalette,
        sendPaletteToMesh,
        sendPaletteToPattern,
        pendingMeshPalette,
        consumePendingMeshPalette,
        pendingPatternColors,
        consumePendingPatternColors,
        showToast,
        isInstallable,
        promptInstall,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ChromalabContext.Provider>
  );
};

export const useChromalab = () => {
  const context = useContext(ChromalabContext);
  if (!context) {
    throw new Error('useChromalab must be used within a ChromalabProvider');
  }
  return context;
};
