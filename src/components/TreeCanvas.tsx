import React, { useRef, useEffect, useCallback } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { TreeRenderer } from '../tree/TreeRenderer';
import { storageAdapter } from '../services/storage/LocalStorageAdapter';
import { ZoomIn, ZoomOut, Compass } from 'lucide-react';

export const TreeCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<TreeRenderer | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragDistanceRef = useRef<number>(0);
  const saveCameraTimerRef = useRef<number | null>(null);
  const initialFrameDoneRef = useRef<boolean>(false);

  const { tasks, selectedTaskId, setSelectedTaskId, cameraController } = useTaskContext();

  // Initialize Canvas and Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new TreeRenderer(canvas, cameraController);
    rendererRef.current = renderer;
    renderer.start();

    // Resize and initial camera setup
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
      }
      renderer.render();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Camera change subscription with debounced save to storage
    const unsubscribeCamera = cameraController.subscribe(() => {
      renderer.render();
      if (saveCameraTimerRef.current) {
        window.clearTimeout(saveCameraTimerRef.current);
      }
      saveCameraTimerRef.current = window.setTimeout(() => {
        storageAdapter.saveCameraState(cameraController.getState());
      }, 350);
    });

    // Restore camera state from storage or fit to bounds
    const initCamera = async () => {
      const savedCamera = await storageAdapter.getCameraState();
      if (savedCamera && typeof savedCamera.panX === 'number' && typeof savedCamera.zoom === 'number') {
        cameraController.setState(savedCamera);
      } else {
        // First session: fit entire tree within view with generous padding
        const bounds = renderer.getTreeBounds();
        cameraController.fitToBounds(bounds, window.innerWidth, window.innerHeight, 90, false);
      }
      initialFrameDoneRef.current = true;
    };
    initCamera();

    return () => {
      renderer.stop();
      window.removeEventListener('resize', resizeCanvas);
      unsubscribeCamera();
      if (saveCameraTimerRef.current) {
        window.clearTimeout(saveCameraTimerRef.current);
      }
    };
  }, [cameraController]);

  // Keep renderer nodes in sync with tasks state
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateNodes(tasks);
      rendererRef.current.render();

      // If initial camera has not been framed yet and no saved state exists, frame now
      if (!initialFrameDoneRef.current && tasks.length > 0) {
        storageAdapter.getCameraState().then(saved => {
          if (!saved && rendererRef.current) {
            const bounds = rendererRef.current.getTreeBounds();
            cameraController.fitToBounds(bounds, window.innerWidth, window.innerHeight, 90, false);
            initialFrameDoneRef.current = true;
          }
        });
      }
    }
  }, [tasks, cameraController]);

  // Keep selection in sync and persist selectedTaskId
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setSelectedTask(selectedTaskId);
      rendererRef.current.render();
    }
    storageAdapter.saveSelectedTaskId(selectedTaskId);
  }, [selectedTaskId]);

  // Restore selected task on initial tasks load if exists
  useEffect(() => {
    if (tasks.length > 0 && selectedTaskId === null) {
      storageAdapter.getSelectedTaskId().then(savedId => {
        if (savedId && tasks.some(t => t.id === savedId)) {
          setSelectedTaskId(savedId);
        }
      });
    }
  }, [tasks, selectedTaskId, setSelectedTaskId]);

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

      // If clicked without significant dragging, perform hit test
      if (dragDistanceRef.current < 15 && rendererRef.current) {
        const worldPos = cameraController.screenToWorld(e.clientX, e.clientY);
        const clickedTaskId = rendererRef.current.hitTest(worldPos.x, worldPos.y);
        setSelectedTaskId(clickedTaskId);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    cameraController.smoothZoom(e.deltaY, { x: e.clientX, y: e.clientY });
  };

  const handleZoomIn = useCallback(() => {
    cameraController.zoomIn({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }, [cameraController]);

  const handleZoomOut = useCallback(() => {
    cameraController.zoomOut({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }, [cameraController]);

  const handleResetCamera = useCallback(() => {
    if (rendererRef.current) {
      const bounds = rendererRef.current.getTreeBounds();
      cameraController.fitToBounds(bounds, window.innerWidth, window.innerHeight, 90, true, 550);
    } else {
      cameraController.flyTo(0, -100, window.innerWidth, window.innerHeight, 1.0, 500);
    }
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
      <div className="absolute right-6 bottom-24 flex flex-col gap-2 bg-white/85 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-emerald-900/10 transition-all z-20">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2 text-[#526358] hover:bg-emerald-50 hover:text-[#105b38] rounded-xl transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2 text-[#526358] hover:bg-emerald-50 hover:text-[#105b38] rounded-xl transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-px bg-emerald-900/10 mx-1" />
        <button
          onClick={handleResetCamera}
          title="Fit Tree to View"
          className="p-2 text-[#526358] hover:bg-emerald-50 hover:text-[#105b38] rounded-xl transition-colors cursor-pointer"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
