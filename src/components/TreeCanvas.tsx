import React, { useRef, useEffect, useCallback } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { TreeRenderer } from '../tree/TreeRenderer';
import { ZoomIn, ZoomOut, Compass } from 'lucide-react';

export const TreeCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<TreeRenderer | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragDistanceRef = useRef<number>(0);

  const { tasks, selectedTaskId, setSelectedTaskId, cameraController } = useTaskContext();

  // Initialize Canvas and Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new TreeRenderer(canvas, cameraController);
    rendererRef.current = renderer;
    renderer.start();

    // Handle initial camera center
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = window.innerWidth;
      const displayHeight = window.innerHeight;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.resetTransform?.();
          ctx.scale(dpr, dpr);
        }

        // Center on seedling trunk (0, -100) if initial
        if (cameraController.panX === 0 && cameraController.panY === 0) {
          cameraController.setCenter(0, -100, displayWidth, displayHeight, 1.0);
        }
      }
      renderer.render();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const unsubscribeCamera = cameraController.subscribe(() => {
      renderer.render();
    });

    return () => {
      renderer.stop();
      window.removeEventListener('resize', resizeCanvas);
      unsubscribeCamera();
    };
  }, [cameraController]);

  // Keep renderer nodes in sync with tasks state
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateNodes(tasks);
      rendererRef.current.render();
    }
  }, [tasks]);

  // Keep selection in sync
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setSelectedTask(selectedTaskId);
      rendererRef.current.render();
    }
  }, [selectedTaskId]);

  // Mouse / Touch Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    cameraController.startDrag(e.clientX, e.clientY);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      dragDistanceRef.current += Math.abs(e.movementX) + Math.abs(e.movementY);
      cameraController.onDrag(e.clientX, e.clientY);
    } else if (rendererRef.current) {
      // Hover hit-testing
      const worldPos = cameraController.screenToWorld(e.clientX, e.clientY);
      const hitTaskId = rendererRef.current.hitTest(worldPos.x, worldPos.y);
      rendererRef.current.setHoveredTask(hitTaskId);
      rendererRef.current.render();
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hitTaskId ? 'pointer' : 'default';
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      cameraController.endDrag();
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

      // If user clicked without significant dragging, perform hit test
      if (dragDistanceRef.current < 15 && rendererRef.current) {
        const worldPos = cameraController.screenToWorld(e.clientX, e.clientY);
        const clickedTaskId = rendererRef.current.hitTest(worldPos.x, worldPos.y);
        setSelectedTaskId(clickedTaskId);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    cameraController.handleZoom(e.deltaY, { x: e.clientX, y: e.clientY });
  };

  const handleZoomIn = useCallback(() => {
    cameraController.handleZoom(-100, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }, [cameraController]);

  const handleZoomOut = useCallback(() => {
    cameraController.handleZoom(100, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }, [cameraController]);

  const handleResetCamera = useCallback(() => {
    cameraController.flyTo(0, -100, window.innerWidth, window.innerHeight, 1.0, 500);
  }, [cameraController]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* Floating Viewport Controls */}
      <div className="absolute right-6 bottom-24 flex flex-col gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-botanical-border transition-all">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2 text-botanical-charcoal hover:bg-botanical-focus hover:text-botanical-branch rounded-xl transition-colors"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2 text-botanical-charcoal hover:bg-botanical-focus hover:text-botanical-branch rounded-xl transition-colors"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <div className="h-px bg-botanical-border mx-1" />
        <button
          onClick={handleResetCamera}
          title="Recenter Tree"
          className="p-2 text-botanical-charcoal hover:bg-botanical-focus hover:text-botanical-branch rounded-xl transition-colors"
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
