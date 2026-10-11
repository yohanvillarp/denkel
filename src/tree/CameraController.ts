export interface CameraState {
  panX: number;
  panY: number;
  zoom: number;
}

export interface Point {
  x: number;
  y: number;
}

export class CameraController {
  public panX: number = 0;
  public panY: number = 0;
  public zoom: number = 1.0;

  public minZoom: number = 0.25;
  public maxZoom: number = 3.0;

  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;

  private onChangeCallbacks: Set<() => void> = new Set();

  // Flight animation (flyTo) frame ID
  private flightAnimationId: number | null = null;

  // Smooth continuous zoom animation state
  private targetZoom: number = 1.0;
  private zoomAnchorScreen: Point = { x: 0, y: 0 };
  private zoomAnchorWorld: Point = { x: 0, y: 0 };
  private zoomAnimationId: number | null = null;
  private lastZoomTime: number = 0;

  constructor(initialPanX: number = 0, initialPanY: number = 0, initialZoom: number = 1.0) {
    this.panX = initialPanX;
    this.panY = initialPanY;
    this.zoom = initialZoom;
    this.targetZoom = initialZoom;
  }

  public subscribe(cb: () => void): () => void {
    this.onChangeCallbacks.add(cb);
    return () => this.onChangeCallbacks.delete(cb);
  }

  private notify(): void {
    this.onChangeCallbacks.forEach(cb => cb());
  }

  public screenToWorld(screenX: number, screenY: number): Point {
    return {
      x: (screenX - this.panX) / this.zoom,
      y: (screenY - this.panY) / this.zoom
    };
  }

  public worldToScreen(worldX: number, worldY: number): Point {
    return {
      x: worldX * this.zoom + this.panX,
      y: worldY * this.zoom + this.panY
    };
  }

  public startDrag(screenX: number, screenY: number): void {
    this.cancelAnimation();
    this.isDragging = true;
    this.dragStartX = screenX;
    this.dragStartY = screenY;
    this.cameraStartX = this.panX;
    this.cameraStartY = this.panY;
  }

  public onDrag(screenX: number, screenY: number): boolean {
    if (!this.isDragging) return false;
    const dx = screenX - this.dragStartX;
    const dy = screenY - this.dragStartY;
    this.panX = this.cameraStartX + dx;
    this.panY = this.cameraStartY + dy;
    this.notify();
    return true;
  }

  public endDrag(): void {
    this.isDragging = false;
  }

  /**
   * Smooth cursor-anchored zoom animation.
   * Keeps the world coordinate underneath screenPoint visually stationary.
   * Repeated scrolling or consecutive clicks continuously update targetZoom
   * without restarting the animation or causing jumps.
   */
  public smoothZoom(delta: number, screenPoint: Point): void {
    // Stop flight animations if active
    if (this.flightAnimationId !== null) {
      cancelAnimationFrame(this.flightAnimationId);
      this.flightAnimationId = null;
    }

    // Normalized zoom factor: responsive and proportional
    const normalizedDelta = Math.max(-140, Math.min(140, delta));
    const factor = Math.pow(0.9984, normalizedDelta);

    // Anchor the zoom to the exact point underneath the cursor/screenPoint
    this.zoomAnchorScreen = { x: screenPoint.x, y: screenPoint.y };
    this.zoomAnchorWorld = this.screenToWorld(screenPoint.x, screenPoint.y);

    // Continuously accumulate the target zoom
    const baseTarget = this.zoomAnimationId !== null ? this.targetZoom : this.zoom;
    this.targetZoom = Math.min(this.maxZoom, Math.max(this.minZoom, baseTarget * factor));

    if (this.zoomAnimationId === null) {
      this.lastZoomTime = performance.now();
      this.runZoomAnimation();
    }
  }

  // Backward compatibility alias for smoothZoom
  public handleZoom(delta: number, screenCenter: Point): void {
    this.smoothZoom(delta, screenCenter);
  }

  /**
   * Smooth zoom-in toward viewport center
   */
  public zoomIn(viewportCenter: Point): void {
    this.smoothZoom(-80, viewportCenter);
  }

  /**
   * Smooth zoom-out toward viewport center
   */
  public zoomOut(viewportCenter: Point): void {
    this.smoothZoom(80, viewportCenter);
  }

  private runZoomAnimation = (): void => {
    const now = performance.now();
    const dt = Math.min(32, Math.max(1, now - this.lastZoomTime));
    this.lastZoomTime = now;

    // Snappy, critically-damped exponential step (~180ms to settle)
    const step = 1 - Math.exp(-dt * 0.016);
    const diff = this.targetZoom - this.zoom;

    if (Math.abs(diff) < 0.0008) {
      this.zoom = this.targetZoom;
      this.panX = this.zoomAnchorScreen.x - this.zoomAnchorWorld.x * this.zoom;
      this.panY = this.zoomAnchorScreen.y - this.zoomAnchorWorld.y * this.zoom;
      this.zoomAnimationId = null;
      this.notify();
      return;
    }

    this.zoom += diff * step;
    // Keep the anchored world coordinate strictly under the screen point
    this.panX = this.zoomAnchorScreen.x - this.zoomAnchorWorld.x * this.zoom;
    this.panY = this.zoomAnchorScreen.y - this.zoomAnchorWorld.y * this.zoom;
    this.notify();

    this.zoomAnimationId = requestAnimationFrame(this.runZoomAnimation);
  };

  public setCenter(worldX: number, worldY: number, screenWidth: number, screenHeight: number, targetZoom?: number): void {
    this.cancelAnimation();
    if (targetZoom !== undefined) {
      this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, targetZoom));
      this.targetZoom = this.zoom;
    }
    this.panX = screenWidth / 2 - worldX * this.zoom;
    this.panY = screenHeight / 2 - worldY * this.zoom;
    this.notify();
  }

  public fitToBounds(
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    screenWidth: number,
    screenHeight: number,
    padding: number = 90,
    animate: boolean = false,
    durationMs: number = 600,
    onComplete?: () => void,
    targetScreenX?: number,
    targetScreenY?: number,
    availWidth?: number,
    availHeight?: number,
    customCenterWorldX?: number,
    customCenterWorldY?: number
  ): void {
    const effectiveWidth = Math.max(120, (availWidth !== undefined ? availWidth : screenWidth) - padding * 2);
    const effectiveHeight = Math.max(120, (availHeight !== undefined ? availHeight : screenHeight) - padding * 2);

    const centerWorldX = customCenterWorldX !== undefined ? customCenterWorldX : (bounds.minX + bounds.maxX) / 2;
    const centerWorldY = customCenterWorldY !== undefined ? customCenterWorldY : (bounds.minY + bounds.maxY) / 2;

    // Measure maximum distance from center to bounds edges so all children and labels fit comfortably
    const maxDistX = Math.max(Math.abs(centerWorldX - bounds.minX), Math.abs(bounds.maxX - centerWorldX));
    const maxDistY = Math.max(Math.abs(centerWorldY - bounds.minY), Math.abs(bounds.maxY - centerWorldY));

    const fitZoomX = (effectiveWidth / 2) / Math.max(60, maxDistX);
    const fitZoomY = (effectiveHeight / 2) / Math.max(60, maxDistY);

    const fitZoom = Math.min(
      1.15,
      Math.max(this.minZoom, Math.min(fitZoomX, fitZoomY))
    );

    if (animate) {
      this.flyTo(
        centerWorldX,
        centerWorldY,
        screenWidth,
        screenHeight,
        fitZoom,
        durationMs,
        onComplete,
        targetScreenX,
        targetScreenY
      );
    } else {
      const screenCenterX = targetScreenX !== undefined ? targetScreenX : screenWidth / 2;
      const screenCenterY = targetScreenY !== undefined ? targetScreenY : screenHeight / 2;
      this.cancelAnimation();
      this.zoom = fitZoom;
      this.targetZoom = fitZoom;
      this.panX = screenCenterX - centerWorldX * fitZoom;
      this.panY = screenCenterY - centerWorldY * fitZoom;
      this.notify();
    }
  }

  public flyTo(
    targetWorldX: number,
    targetWorldY: number,
    screenWidth: number,
    screenHeight: number,
    targetZoom: number = 1.0,
    durationMs: number = 600,
    onComplete?: () => void,
    targetScreenX?: number,
    targetScreenY?: number
  ): void {
    this.cancelAnimation();

    const startPanX = this.panX;
    const startPanY = this.panY;
    const startZoom = this.zoom;

    const screenCenterX = targetScreenX !== undefined ? targetScreenX : screenWidth / 2;
    const screenCenterY = targetScreenY !== undefined ? targetScreenY : screenHeight / 2;

    const endZoom = Math.min(this.maxZoom, Math.max(this.minZoom, targetZoom));
    const endPanX = screenCenterX - targetWorldX * endZoom;
    const endPanY = screenCenterY - targetWorldY * endZoom;

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // Smooth cubic bezier easing: t * t * (3 - 2 * t)
      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.panX = startPanX + (endPanX - startPanX) * ease;
      this.panY = startPanY + (endPanY - startPanY) * ease;
      this.zoom = startZoom + (endZoom - startZoom) * ease;

      this.notify();

      if (progress < 1) {
        this.flightAnimationId = requestAnimationFrame(animate);
      } else {
        this.flightAnimationId = null;
        this.targetZoom = this.zoom;
        if (onComplete) onComplete();
      }
    };

    this.flightAnimationId = requestAnimationFrame(animate);
  }

  public cancelAnimation(): void {
    if (this.flightAnimationId !== null) {
      cancelAnimationFrame(this.flightAnimationId);
      this.flightAnimationId = null;
    }
    if (this.zoomAnimationId !== null) {
      cancelAnimationFrame(this.zoomAnimationId);
      this.zoomAnimationId = null;
    }
    this.targetZoom = this.zoom;
  }

  public getState(): CameraState {
    return {
      panX: this.panX,
      panY: this.panY,
      zoom: this.zoom
    };
  }

  public setState(state: CameraState): void {
    this.cancelAnimation();
    this.panX = state.panX;
    this.panY = state.panY;
    this.zoom = state.zoom;
    this.targetZoom = state.zoom;
    this.notify();
  }
}
