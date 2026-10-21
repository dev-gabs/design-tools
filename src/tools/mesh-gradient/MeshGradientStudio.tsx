import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  MeshPoint,
  Dimensions,
  GlobalEngineSettings,
  MeshGradientDocument,
  Preset,
  HistorySnapshot,
} from '../../types/mesh';
import { GRADIENT_PRESETS } from '../../presets/gradient-presets';
import { Navbar } from '../../components/Navbar';
import { CanvasWorkspace } from '../../components/CanvasWorkspace';
import { LeftSidebar } from '../../components/LeftSidebar';
import { RightSidebar } from '../../components/RightSidebar';
import { ExportModal } from '../../components/ExportModal';
import { ProjectsModal } from '../../components/ProjectsModal';
import { ShortcutsModal } from '../../components/ShortcutsModal';
import { useChromalab } from '../../context/ChromalabContext';

const CURRENT_DOC_KEY = 'mesh_gradient_studio_current_doc';

const defaultPreset = GRADIENT_PRESETS[0];

const createInitialDocument = (): MeshGradientDocument => {
  return {
    id: `project-${Date.now()}`,
    name: 'Aurora Boreal',
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    dimensions: {
      width: 1080,
      height: 1080,
      lockAspectRatio: true,
      presetName: 'Quadrado 1:1',
    },
    points: defaultPreset.points.map((p, idx) => ({
      ...p,
      id: `pt-${Date.now()}-${idx}`,
    })),
    settings: {
      smoothness: defaultPreset.settings?.smoothness ?? 2.4,
      colorSpace: (defaultPreset.settings?.colorSpace as 'oklab' | 'linear' | 'srgb') ?? 'oklab',
      contrast: defaultPreset.settings?.contrast ?? 1.1,
      saturation: defaultPreset.settings?.saturation ?? 1.25,
      brightness: 1.0,
      hueShift: 0,
      noiseIntensity: defaultPreset.settings?.noiseIntensity ?? 0.08,
      noiseScale: defaultPreset.settings?.noiseScale ?? 1.8,
      vignetteIntensity: 0.0,
      vignetteRadius: 0.8,
      backgroundColor: '#000000',
      transparentBackground: false,
      seed: 42,
    },
    presetOrigin: defaultPreset.id,
  };
};

export const MeshGradientStudio: React.FC = () => {
  const { navigateToTool, consumePendingMeshPalette, showToast } = useChromalab();

  // Load saved document or create default
  const [document, setDocument] = useState<MeshGradientDocument>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_DOC_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.points) && parsed.points.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not restore saved project from localStorage:', e);
    }
    return createInitialDocument();
  });

  // Selected control points
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>(() => {
    return document.points.length > 0 ? [document.points[0].id] : [];
  });

  // View & UI states
  const [cleanPreview, setCleanPreview] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  // Modals
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // History stack for Undo/Redo
  const [history, setHistory] = useState<HistorySnapshot[]>([
    {
      points: document.points,
      dimensions: document.dimensions,
      settings: document.settings,
      timestamp: Date.now(),
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoAction = useRef(false);

  // Check incoming palette from Color Palette Studio
  useEffect(() => {
    const incoming = consumePendingMeshPalette();
    if (incoming && incoming.length > 0) {
      setDocument((prev) => {
        const updatedPoints = prev.points.map((p, idx) => ({
          ...p,
          color: incoming[idx % incoming.length],
        }));
        return { ...prev, points: updatedPoints, updatedAt: Date.now() };
      });
    }
  }, [consumePendingMeshPalette]);

  // Push to history stack
  const pushHistory = useCallback(
    (newPoints: MeshPoint[], newDims: Dimensions, newSettings: GlobalEngineSettings) => {
      if (isUndoRedoAction.current) {
        isUndoRedoAction.current = false;
        return;
      }
      setHistory((prev) => {
        const currentSlice = prev.slice(0, historyIndex + 1);
        const newSnapshot: HistorySnapshot = {
          points: newPoints,
          dimensions: newDims,
          settings: newSettings,
          timestamp: Date.now(),
        };
        const updated = [...currentSlice, newSnapshot];
        if (updated.length > 50) updated.shift();
        return updated;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    },
    [historyIndex]
  );

  // Autosave to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CURRENT_DOC_KEY, JSON.stringify(document));
    } catch (e) {
      console.warn('Failed to autosave project:', e);
    }
  }, [document]);

  // Undo action
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const targetIndex = historyIndex - 1;
      const targetState = history[targetIndex];
      setHistoryIndex(targetIndex);
      setDocument((prev) => ({
        ...prev,
        points: targetState.points,
        dimensions: targetState.dimensions,
        settings: targetState.settings,
        updatedAt: Date.now(),
      }));
      showToast('info', 'Desfeito', 'Ação anterior restaurada.');
    }
  }, [history, historyIndex, showToast]);

  // Redo action
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const targetIndex = historyIndex + 1;
      const targetState = history[targetIndex];
      setHistoryIndex(targetIndex);
      setDocument((prev) => ({
        ...prev,
        points: targetState.points,
        dimensions: targetState.dimensions,
        settings: targetState.settings,
        updatedAt: Date.now(),
      }));
      showToast('info', 'Refeito', 'Ação restaurada.');
    }
  }, [history, historyIndex, showToast]);

  // Document update helpers
  const updatePoints = useCallback(
    (newPoints: MeshPoint[]) => {
      setDocument((prev) => {
        const updated = { ...prev, points: newPoints, updatedAt: Date.now() };
        pushHistory(newPoints, prev.dimensions, prev.settings);
        return updated;
      });
    },
    [pushHistory]
  );

  const updateSettings = useCallback(
    (newSettingsPartial: Partial<GlobalEngineSettings>) => {
      setDocument((prev) => {
        const updatedSettings = { ...prev.settings, ...newSettingsPartial };
        const updated = { ...prev, settings: updatedSettings, updatedAt: Date.now() };
        pushHistory(prev.points, prev.dimensions, updatedSettings);
        return updated;
      });
    },
    [pushHistory]
  );

  const updateDimensions = useCallback(
    (newDimsPartial: Partial<Dimensions>) => {
      setDocument((prev) => {
        const updatedDims = { ...prev.dimensions, ...newDimsPartial };
        const updated = { ...prev, dimensions: updatedDims, updatedAt: Date.now() };
        pushHistory(prev.points, updatedDims, prev.settings);
        return updated;
      });
    },
    [pushHistory]
  );

  const updateProjectName = (name: string) => {
    setDocument((prev) => ({ ...prev, name, updatedAt: Date.now() }));
    showToast('info', 'Nome do Projeto Atualizado');
  };

  const handleSelectPoint = (id: string, multiSelect = false) => {
    if (multiSelect) {
      setSelectedPointIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setSelectedPointIds([id]);
    }
  };

  const handleClearSelection = () => {
    setSelectedPointIds([]);
  };

  const handleUpdatePointPosition = (id: string, x: number, y: number) => {
    setDocument((prev) => {
      const updated = prev.points.map((pt) => (pt.id === id ? { ...pt, x, y } : pt));
      return { ...prev, points: updated, updatedAt: Date.now() };
    });
  };

  const handleUpdatePoint = (id: string, updates: Partial<MeshPoint>) => {
    setDocument((prev) => {
      const updated = prev.points.map((pt) => (pt.id === id ? { ...pt, ...updates } : pt));
      pushHistory(updated, prev.dimensions, prev.settings);
      return { ...prev, points: updated, updatedAt: Date.now() };
    });
  };

  const handleUpdateMultiplePoints = (ids: string[], updates: Partial<MeshPoint>) => {
    setDocument((prev) => {
      const updated = prev.points.map((pt) => (ids.includes(pt.id) ? { ...pt, ...updates } : pt));
      pushHistory(updated, prev.dimensions, prev.settings);
      return { ...prev, points: updated, updatedAt: Date.now() };
    });
  };

  const handleAddPointAt = (x: number, y: number, color?: string) => {
    const newPoint: MeshPoint = {
      id: `pt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      x: Math.max(0.02, Math.min(0.98, x)),
      y: Math.max(0.02, Math.min(0.98, y)),
      color: color || '#6366F1',
      alpha: 1,
      radius: 1.0,
      intensity: 1.0,
      locked: false,
    };

    setDocument((prev) => {
      const updated = [...prev.points, newPoint];
      pushHistory(updated, prev.dimensions, prev.settings);
      return { ...prev, points: updated, updatedAt: Date.now() };
    });

    setSelectedPointIds([newPoint.id]);
    showToast('success', 'Novo Ponto Adicionado');
  };

  const handleDeletePoint = useCallback(
    (id: string) => {
      if (document.points.length <= 1) {
        showToast('error', 'Limite Mínimo', 'A malha precisa de pelo menos 1 ponto.');
        return;
      }

      setDocument((prev) => {
        const updated = prev.points.filter((pt) => pt.id !== id);
        pushHistory(updated, prev.dimensions, prev.settings);
        return { ...prev, points: updated, updatedAt: Date.now() };
      });

      setSelectedPointIds((prev) => prev.filter((item) => item !== id));
      showToast('info', 'Ponto Removido');
    },
    [document.points.length, pushHistory, showToast]
  );

  const handleDuplicatePoint = useCallback(
    (id: string) => {
      const target = document.points.find((pt) => pt.id === id);
      if (!target) return;

      const duplicate: MeshPoint = {
        ...target,
        id: `pt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        x: Math.min(0.96, target.x + 0.04),
        y: Math.min(0.96, target.y + 0.04),
        locked: false,
      };

      setDocument((prev) => {
        const updated = [...prev.points, duplicate];
        pushHistory(updated, prev.dimensions, prev.settings);
        return { ...prev, points: updated, updatedAt: Date.now() };
      });

      setSelectedPointIds([duplicate.id]);
      showToast('success', 'Ponto Duplicado');
    },
    [document.points, pushHistory, showToast]
  );

  const handleToggleLockPoint = (id: string) => {
    setDocument((prev) => {
      const updated = prev.points.map((pt) => (pt.id === id ? { ...pt, locked: !pt.locked } : pt));
      return { ...prev, points: updated };
    });
  };

  const handleApplyPreset = (preset: Preset) => {
    const newPoints = preset.points.map((p, idx) => ({
      ...p,
      id: `pt-${Date.now()}-${idx}`,
    }));

    const newSettings = {
      ...document.settings,
      smoothness: preset.settings?.smoothness ?? document.settings.smoothness,
      colorSpace: (preset.settings?.colorSpace as 'oklab' | 'linear' | 'srgb') ?? document.settings.colorSpace,
      contrast: preset.settings?.contrast ?? document.settings.contrast,
      saturation: preset.settings?.saturation ?? document.settings.saturation,
      noiseIntensity: preset.settings?.noiseIntensity ?? document.settings.noiseIntensity,
      noiseScale: preset.settings?.noiseScale ?? document.settings.noiseScale,
      vignetteIntensity: preset.settings?.vignetteIntensity ?? document.settings.vignetteIntensity,
    };

    setDocument((prev) => {
      pushHistory(newPoints, prev.dimensions, newSettings);
      return {
        ...prev,
        points: newPoints,
        settings: newSettings,
        presetOrigin: preset.id,
        updatedAt: Date.now(),
      };
    });

    if (newPoints.length > 0) {
      setSelectedPointIds([newPoints[0].id]);
    }

    showToast('success', `Estilo Aplicado: ${preset.name}`, preset.description);
  };

  const handleLoadProject = (loadedDoc: MeshGradientDocument) => {
    setDocument(loadedDoc);
    pushHistory(loadedDoc.points, loadedDoc.dimensions, loadedDoc.settings);
    if (loadedDoc.points.length > 0) {
      setSelectedPointIds([loadedDoc.points[0].id]);
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          return;
        }

        if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
          return;
        }

        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          setIsProjectsOpen(true);
          return;
        }

        if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          setIsExportOpen(true);
          return;
        }

        if (e.key.toLowerCase() === 'd' && !isInput && selectedPointIds.length > 0) {
          e.preventDefault();
          handleDuplicatePoint(selectedPointIds[0]);
          return;
        }
      }

      if (!isInput) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedPointIds.length > 0) {
            e.preventDefault();
            selectedPointIds.forEach((id) => handleDeletePoint(id));
          }
          return;
        }

        if (e.key.toLowerCase() === 'h') {
          e.preventDefault();
          setCleanPreview((prev) => !prev);
          return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          setSelectedPointIds([]);
          setIsExportOpen(false);
          setIsProjectsOpen(false);
          setIsShortcutsOpen(false);
          return;
        }

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedPointIds.length > 0) {
          e.preventDefault();
          const stepPx = e.shiftKey ? 10 : 1;
          const stepX = stepPx / document.dimensions.width;
          const stepY = stepPx / document.dimensions.height;

          const dx = e.key === 'ArrowLeft' ? -stepX : e.key === 'ArrowRight' ? stepX : 0;
          const dy = e.key === 'ArrowUp' ? -stepY : e.key === 'ArrowDown' ? stepY : 0;

          setDocument((prev) => {
            const updated = prev.points.map((pt) => {
              if (selectedPointIds.includes(pt.id) && !pt.locked) {
                return {
                  ...pt,
                  x: Math.max(0, Math.min(1, pt.x + dx)),
                  y: Math.max(0, Math.min(1, pt.y + dy)),
                };
              }
              return pt;
            });
            return { ...prev, points: updated, updatedAt: Date.now() };
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleUndo,
    handleRedo,
    handleDuplicatePoint,
    handleDeletePoint,
    selectedPointIds,
    document.dimensions.width,
    document.dimensions.height,
  ]);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-zinc-50 text-zinc-900 select-none">
      {/* Top Navbar */}
      <Navbar
        onBackToHub={() => navigateToTool('hub')}
        projectName={document.name}
        onUpdateProjectName={updateProjectName}
        dimensions={document.dimensions}
        onUpdateDimensions={updateDimensions}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        cleanPreview={cleanPreview}
        onToggleCleanPreview={() => setCleanPreview((prev) => !prev)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenProjects={() => setIsProjectsOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={() => setShowLeftSidebar((prev) => !prev)}
        showRightSidebar={showRightSidebar}
        onToggleRightSidebar={() => setShowRightSidebar((prev) => !prev)}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex overflow-hidden relative">
        <LeftSidebar
          points={document.points}
          settings={document.settings}
          selectedPointIds={selectedPointIds}
          onApplyPreset={handleApplyPreset}
          onUpdatePoints={updatePoints}
          onUpdateSettings={updateSettings}
          onSelectPoint={handleSelectPoint}
          onDeletePoint={handleDeletePoint}
          onDuplicatePoint={handleDuplicatePoint}
          onToggleLockPoint={handleToggleLockPoint}
          onAddPoint={() => handleAddPointAt(0.5, 0.5)}
          isOpen={showLeftSidebar && !cleanPreview}
          onClose={() => setShowLeftSidebar(false)}
          onShowToast={showToast}
        />

        <CanvasWorkspace
          points={document.points}
          dimensions={document.dimensions}
          settings={document.settings}
          selectedPointIds={selectedPointIds}
          onSelectPoint={handleSelectPoint}
          onClearSelection={handleClearSelection}
          onUpdatePointPosition={handleUpdatePointPosition}
          onAddPointAt={handleAddPointAt}
          cleanPreview={cleanPreview}
        />

        <RightSidebar
          points={document.points}
          selectedPointIds={selectedPointIds}
          dimensions={document.dimensions}
          settings={document.settings}
          onUpdatePoint={handleUpdatePoint}
          onUpdateMultiplePoints={handleUpdateMultiplePoints}
          onUpdateSettings={updateSettings}
          onDuplicatePoint={handleDuplicatePoint}
          onDeletePoint={handleDeletePoint}
          isOpen={showRightSidebar && !cleanPreview}
          onClose={() => setShowRightSidebar(false)}
        />
      </main>

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        points={document.points}
        settings={document.settings}
        docWidth={document.dimensions.width}
        docHeight={document.dimensions.height}
        projectName={document.name}
        onShowToast={showToast}
      />

      <ProjectsModal
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
        currentDocument={document}
        onLoadProject={handleLoadProject}
        onShowToast={showToast}
      />

      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </div>
  );
};
