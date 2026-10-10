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

  private animationFrameId: number | null = null;

  constructor(initialPanX: number = 0, initialPanY: number = 0, initialZoom: number = 1.0) {
    this.panX = initialPanX;
    this.panY = initialPanY;
    this.zoom = initialZoom;
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

  public handleZoom(delta: number, screenCenter: Point): void {
    this.cancelAnimation();
    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * zoomFactor));

    if (newZoom === this.zoom) return;

    // Zoom centered on the cursor
    const mouseWorldX = (screenCenter.x - this.panX) / this.zoom;
    const mouseWorldY = (screenCenter.y - this.panY) / this.zoom;

    this.zoom = newZoom;
    this.panX = screenCenter.x - mouseWorldX * this.zoom;
    this.panY = screenCenter.y - mouseWorldY * this.zoom;

    this.notify();
  }

  public setCenter(worldX: number, worldY: number, screenWidth: number, screenHeight: number, targetZoom?: number): void {
    this.cancelAnimation();
    if (targetZoom !== undefined) {
      this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, targetZoom));
    }
    this.panX = screenWidth / 2 - worldX * this.zoom;
    this.panY = screenHeight / 2 - worldY * this.zoom;
    this.notify();
  }

  public flyTo(
    targetWorldX: number,
    targetWorldY: number,
    screenWidth: number,
    screenHeight: number,
    targetZoom: number = 1.0,
    durationMs: number = 600,
    onComplete?: () => void
  ): void {
    this.cancelAnimation();

    const startPanX = this.panX;
    const startPanY = this.panY;
    const startZoom = this.zoom;

    const endPanX = screenWidth / 2 - targetWorldX * targetZoom;
    const endPanY = screenHeight / 2 - targetWorldY * targetZoom;
    const endZoom = Math.min(this.maxZoom, Math.max(this.minZoom, targetZoom));

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
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
        if (onComplete) onComplete();
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  public cancelAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public getState(): CameraState {
    return {
      panX: this.panX,
      panY: this.panY,
      zoom: this.zoom
    };
  }
}
