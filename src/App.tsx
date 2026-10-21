import React from 'react';
import { ChromalabProvider, useChromalab } from './context/ChromalabContext';
import { ChromalabHub } from './hub/ChromalabHub';
import { MeshGradientStudio } from './tools/mesh-gradient/MeshGradientStudio';
import { ColorPaletteStudio } from './tools/color-palette/ColorPaletteStudio';
import { PatternShapeStudio } from './tools/pattern-shape/PatternShapeStudio';
import { TextureLabStudio } from './tools/texture-lab/TextureLabStudio';
import { TypeSystemStudio } from './tools/type-system/TypeSystemStudio';
import { GlassStudio } from './tools/glass-studio/GlassStudio';

const ToolRouter: React.FC = () => {
  const { currentTool } = useChromalab();

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
      return <ChromalabHub />;
  }
};

export const App: React.FC = () => {
  return (
    <ChromalabProvider>
      <ToolRouter />
    </ChromalabProvider>
  );
};

export default App;
