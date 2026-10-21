import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Grid,
  Plus,
  Lock,
} from 'lucide-react';
import type { MeshPoint, Dimensions, GlobalEngineSettings } from '../types/mesh';
import { WebGLMeshRenderer } from '../engine/webgl-renderer';
import { getRandomColor } from '../engine/color-utils';

interface CanvasWorkspaceProps {
  points: MeshPoint[];
  dimensions: Dimensions;
  settings: GlobalEngineSettings;
  selectedPointIds: string[];
  onSelectPoint: (id: string, multiSelect?: boolean) => void;
  onClearSelection: () => void;
  onUpdatePointPosition: (id: string, x: number, y: number) => void;
  onAddPointAt: (x: number, y: number, color?: string) => void;
  cleanPreview: boolean;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  points,
  dimensions,
  settings,
  selectedPointIds,
  onSelectPoint,
  onClearSelection,
  onUpdatePointPosition,
  onAddPointAt,
  cleanPreview,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLMeshRenderer | null>(null);

  // Viewport Pan and Zoom state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showMeshLines, setShowMeshLines] = useState<boolean>(true);

  // Dragging control points state
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const isSpacePressed = useRef<boolean>(false);

  // Initialize WebGL Renderer
  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new WebGLMeshRenderer(canvasRef.current);
    rendererRef.current = renderer;

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  // Real-time render loop
  useEffect(() => {
    let animId: number;
    const renderLoop = () => {
      if (rendererRef.current) {
        // Internal canvas resolution matches document dimensions
        rendererRef.current.render(points, settings, dimensions.width, dimensions.height);
      }
    };
    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [points, settings, dimensions.width, dimensions.height]);

  // Auto-fit canvas to viewport on initial load or dimension change
  const fitToViewport = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 80;
    const containerHeight = containerRef.current.clientHeight - 80;

    if (containerWidth <= 0 || containerHeight <= 0) return;

    const scaleX = containerWidth / dimensions.width;
    const scaleY = containerHeight / dimensions.height;
    const autoScale = Math.min(scaleX, scaleY, 1.0);

    setZoom(Math.max(0.15, Math.min(2.0, autoScale)));
    setPan({ x: 0, y: 0 });
  }, [dimensions.width, dimensions.height]);

  useEffect(() => {
    fitToViewport();
  }, [fitToViewport]);

  // Keyboard space key listener for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && (e.target as HTMLElement).tagName !== 'INPUT') {
        isSpacePressed.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressed.current = false;
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.max(0.1, Math.min(5.0, prev * zoomFactor)));
  };

  // Convert client pointer coordinate to normalized [0, 1] relative to the mesh canvas
  const clientToCanvasNorm = (clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
  };

  // Pointer down on canvas background (panning or clicking)
  const handleContainerPointerDown = (e: React.PointerEvent) => {
    if (isSpacePressed.current || e.button === 1) {
      // Space+Drag or Middle mouse button
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'CANVAS') {
      onClearSelection();
    }
  };

  const handleContainerPointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (draggingPointId) {
      const norm = clientToCanvasNorm(e.clientX, e.clientY);
      if (norm) {
        onUpdatePointPosition(draggingPointId, Math.round(norm.x * 1000) / 1000, Math.round(norm.y * 1000) / 1000);
      }
    }
  };

  const handleContainerPointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture fallback
      }
    }
    if (draggingPointId) {
      setDraggingPointId(null);
    }
  };

  // Double click canvas to add point at exact coordinate
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (cleanPreview) return;
    const norm = clientToCanvasNorm(e.clientX, e.clientY);
    if (norm) {
      onAddPointAt(Math.round(norm.x * 1000) / 1000, Math.round(norm.y * 1000) / 1000, getRandomColor());
    }
  };

  // Point handle pointer down
  const handlePointPointerDown = (e: React.PointerEvent, pt: MeshPoint) => {
    e.stopPropagation();
    if (pt.locked) {
      onSelectPoint(pt.id, e.shiftKey);
      return;
    }
    onSelectPoint(pt.id, e.shiftKey);
    setDraggingPointId(pt.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointPointerUp = (e: React.PointerEvent) => {
    if (draggingPointId) {
      setDraggingPointId(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // safe release
      }
    }
  };

  // Simple mesh Delaunay/proximity lines generator for topological feedback
  const renderMeshLines = () => {
    if (!showMeshLines || cleanPreview || points.length < 2) return null;

    // Connect closest neighbors (K-nearest or threshold distance)
    const lines: Array<{ id: string; x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const p1 = points[i];
        const p2 = points[j];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        // Draw lines between reasonably close points
        if (dist < 0.65 || points.length <= 6) {
          lines.push({
            id: `line-${p1.id}-${p2.id}`,
            x1: p1.x * dimensions.width,
            y1: p1.y * dimensions.height,
            x2: p2.x * dimensions.width,
            y2: p2.y * dimensions.height,
          });
        }
      }
    }

    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      >
        {lines.map((l) => (
          <line
            key={l.id}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
        ))}
      </svg>
    );
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handleContainerPointerDown}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
      onDoubleClick={handleDoubleClick}
      className={`relative flex-1 h-full overflow-hidden bg-zinc-100/70 flex items-center justify-center select-none ${
        isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
    >
      {/* Background checkerboard for transparency preview */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `linear-gradient(45deg, #e4e4e7 25%, transparent 25%), 
                            linear-gradient(-45deg, #e4e4e7 25%, transparent 25%), 
                            linear-gradient(45deg, transparent 75%, #e4e4e7 75%), 
                            linear-gradient(-45deg, transparent 75%, #e4e4e7 75%)`,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }}
      />

      {/* Scaled & Translated Document Container */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          width: dimensions.width,
          height: dimensions.height,
          transition: isPanning || draggingPointId ? 'none' : 'transform 0.08s ease-out',
        }}
        className="relative shrink-0 shadow-2xl rounded-sm border border-zinc-300"
      >
        {/* WebGL Canvas */}
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full block rounded-sm pointer-events-auto"
        />

        {/* Mesh Structural Connection Lines */}
        {renderMeshLines()}

        {/* Control Points Overlay */}
        {!cleanPreview &&
          points.map((pt) => {
            const isSelected = selectedPointIds.includes(pt.id);
            const isDragging = draggingPointId === pt.id;

            return (
              <div
                key={pt.id}
                onPointerDown={(e) => handlePointPointerDown(e, pt)}
                onPointerUp={handlePointPointerUp}
                style={{
                  left: `${pt.x * 100}%`,
                  top: `${pt.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`group absolute z-20 cursor-grab active:cursor-grabbing p-2 -m-2 touch-none select-none`}
              >
                {/* Visual Point Disc */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                    isDragging ? 'scale-125' : isSelected ? 'scale-115' : 'hover:scale-110'
                  }`}
                  style={{
                    backgroundColor: pt.color,
                    boxShadow: isSelected
                      ? `0 0 0 3px #4F46E5, 0 0 16px 3px ${pt.color}88, 0 4px 10px rgba(0,0,0,0.3)`
                      : `0 0 0 2px #FFFFFF, 0 2px 6px rgba(0,0,0,0.25)`,
                  }}
                >
                  {pt.locked && (
                    <Lock className="w-3.5 h-3.5 text-zinc-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]" />
                  )}
                  {!pt.locked && isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                  )}
                </div>

                {/* Floating Coordinate Badge */}
                {(isSelected || isDragging) && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-0.5 bg-zinc-900/90 border border-zinc-800 rounded-md text-[10px] font-mono text-zinc-100 whitespace-nowrap shadow-xl pointer-events-none backdrop-blur-sm z-30">
                    {Math.round(pt.x * 100)}%, {Math.round(pt.y * 100)}%
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Floating Canvas Controls Toolbar (Bottom Right) */}
      <div className="absolute bottom-5 right-5 z-20 flex items-center gap-1.5 bg-white/90 border border-zinc-200/90 rounded-2xl p-1.5 shadow-xl backdrop-blur-md text-zinc-700">
        <button
          onClick={() => setZoom((prev) => Math.max(0.1, prev - 0.15))}
          className="p-1.5 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          title="Diminuir Zoom"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="text-[11px] font-mono font-semibold px-1.5 text-zinc-800 min-w-[42px] text-center">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => setZoom((prev) => Math.min(5.0, prev + 0.15))}
          className="p-1.5 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          title="Aumentar Zoom"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-zinc-200 mx-0.5" />

        <button
          onClick={fitToViewport}
          className="p-1.5 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          title="Ajustar à Tela"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1.5 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          title="Zoom 100%"
        >
          <Minimize2 className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-zinc-200 mx-0.5" />

        <button
          onClick={() => setShowMeshLines(!showMeshLines)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            showMeshLines ? 'text-indigo-600 bg-indigo-50' : 'text-zinc-400 hover:text-zinc-700'
          }`}
          title="Alternar Linhas da Malha"
        >
          <Grid className="w-4 h-4" />
        </button>

        <button
          onClick={() => onAddPointAt(0.5, 0.5, getRandomColor())}
          className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          title="Adicionar Novo Ponto no Centro"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[11px]">Ponto</span>
        </button>
      </div>

      {/* Floating Canvas Info Badge (Bottom Left) */}
      <div className="absolute bottom-5 left-5 z-20 flex items-center gap-2 bg-white/85 border border-zinc-200/90 rounded-xl px-3 py-1.5 shadow-md backdrop-blur text-[11px] text-zinc-600 font-mono">
        <span>{dimensions.width} × {dimensions.height} px</span>
        <span>•</span>
        <span>{points.length} pontos de cor</span>
        {cleanPreview && (
          <>
            <span>•</span>
            <span className="text-amber-600 font-sans font-semibold">Modo Apresentação (H)</span>
          </>
        )}
      </div>
    </div>
  );
};
