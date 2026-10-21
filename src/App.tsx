import React, { useState, useEffect } from 'react';
import { ChromalabProvider, useChromalab } from './context/ChromalabContext';
import { ChromalabHub } from './hub/ChromalabHub';
import { MeshGradientStudio } from './tools/mesh-gradient/MeshGradientStudio';
import { ColorPaletteStudio } from './tools/color-palette/ColorPaletteStudio';
import { PatternShapeStudio } from './tools/pattern-shape/PatternShapeStudio';
import { TextureLabStudio } from './tools/texture-lab/TextureLabStudio';
import { TypeSystemStudio } from './tools/type-system/TypeSystemStudio';
import { GlassStudio } from './tools/glass-studio/GlassStudio';
import { CommandPalette } from './components/CommandPalette';
import { AboutModal } from './components/AboutModal';

const MainShell: React.FC = () => {
  const { currentTool } = useChromalab();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Global keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderCurrentTool = () => {
    switch (currentTool) {
      case 'mesh':
        return <MeshGradientStudio />;
      case 'palette':
        return <ColorPaletteStudio />;
      case 'pattern':
        return <PatternShapeStudio />;
      case 'texture':
        return <TextureLabStudio />;
      case 'type':
        return <TypeSystemStudio />;
      case 'glass':
        return <GlassStudio />;
      case 'hub':
      default:
        return <ChromalabHub onOpenAbout={() => setIsAboutOpen(true)} onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />;
    }
  };

  return (
    <>
      {renderCurrentTool()}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenAbout={() => setIsAboutOpen(true)}
      />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <ChromalabProvider>
      <MainShell />
    </ChromalabProvider>
  );
};

export default App;
