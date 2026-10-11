import { TaskNode } from '../types/task';
import { CameraController } from './CameraController';
import { ITreeLayoutEngine } from './ITreeLayoutEngine';
import { D3TreeLayoutEngine } from './D3TreeLayoutEngine';

export interface RenderNode {
  id: string;
  title: string;
  parentId: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  type: 'category' | 'project' | 'task';
  directMinutes: number;
  totalMinutes: number;
  
  // Coordinates in world space
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  
  // Origin along the trunk or parent
  originX: number;
  originY: number;

  // Staggered label positioning
  labelPlacement: 'top' | 'bottom' | 'left' | 'right';

  // Animation state
  radius: number;
  sproutProgress: number; // 0 to 1

  // Migration states for reparenting
  isMigrating: boolean;
  migrationProgress: number; // 0 to 1
  previousOriginX: number;
  previousOriginY: number;
}

export class TreeRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: CameraController;
  private layoutEngine: ITreeLayoutEngine;
  private nodes: Map<string, RenderNode> = new Map();
  private selectedTaskId: string | null = null;
  private hoveredTaskId: string | null = null;

  private isRunning: boolean = false;
  private animationId: number | null = null;
  private lastTime: number = 0;

  // Zen Botanical Palette from Stitch
  private readonly COLOR_BG = '#fbfcf9';
  private readonly COLOR_TRUNK_BASE = '#064e3b';
  private readonly COLOR_TRUNK_TOP = '#105b38';
  private readonly COLOR_BRANCH = '#1b7a4d';
  private readonly COLOR_BRANCH_TENDER = '#2d9f67';
  private readonly COLOR_LEAF = '#10b981';
  private readonly COLOR_BUD = '#d97706';
  private readonly COLOR_BUD_AURA = 'rgba(217, 119, 6, 0.2)';
  private readonly COLOR_TEXT = '#14231b';
  private readonly COLOR_TEXT_CATEGORY = '#1b4d3e';
  private readonly COLOR_TEXT_MUTED = '#526358';

  constructor(canvas: HTMLCanvasElement, camera: CameraController, layoutEngine?: ITreeLayoutEngine) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D canvas context');
    }
    this.ctx = context;
    this.camera = camera;
    this.layoutEngine = layoutEngine || new D3TreeLayoutEngine();
  }

  public setSelectedTask(taskId: string | null): void {
    this.selectedTaskId = taskId;
  }

  public setHoveredTask(taskId: string | null): void {
    this.hoveredTaskId = taskId;
  }

  public updateNodes(taskList: TaskNode[]): void {
    const existingIds = new Set<string>();

    // Compute total minutes for each node
    const childrenMap = new Map<string, string[]>();
    taskList.forEach(t => {
      if (t.parentId) {
        const arr = childrenMap.get(t.parentId) || [];
        arr.push(t.id);
        childrenMap.set(t.parentId, arr);
      }
    });

    const computeTotalMinutes = (id: string): number => {
      const task = taskList.find(t => t.id === id);
      if (!task) return 0;
      let total = task.directMinutes || 0;
      const children = childrenMap.get(id) || [];
      children.forEach(childId => {
        total += computeTotalMinutes(childId);
      });
      return total;
    };

    // Calculate natural, non-overlapping organic layout positions using D3 engine
    const positions = this.layoutEngine.calculateLayout(taskList);

    taskList.forEach(task => {
      existingIds.add(task.id);
      const computed = positions.get(task.id) || {
        x: 0,
        y: -140,
        originX: 0,
        originY: -100,
        placement: 'top' as const
      };
      const totalMinutes = computeTotalMinutes(task.id);

      if (this.nodes.has(task.id)) {
        const node = this.nodes.get(task.id)!;

        // Detect reparenting: trigger organic migration animation
        if (node.parentId !== task.parentId) {
          node.isMigrating = true;
          node.migrationProgress = 0;
          if (node.parentId && this.nodes.has(node.parentId)) {
            const oldParent = this.nodes.get(node.parentId)!;
            node.previousOriginX = oldParent.currentX;
            node.previousOriginY = oldParent.currentY;
          } else {
            node.previousOriginX = node.originX;
            node.previousOriginY = node.originY;
          }
        }

        node.title = task.title;
        node.parentId = task.parentId;
        node.status = task.status;
        node.type = task.type;
        node.directMinutes = task.directMinutes || 0;
        node.totalMinutes = totalMinutes;
        node.targetX = computed.x;
        node.targetY = computed.y;
        node.originX = computed.originX;
        node.originY = computed.originY;
        node.labelPlacement = computed.placement;
      } else {
        // New node sprouting smoothly from its origin
        this.nodes.set(task.id, {
          id: task.id,
          title: task.title,
          parentId: task.parentId,
          status: task.status,
          type: task.type,
          directMinutes: task.directMinutes || 0,
          totalMinutes: totalMinutes,
          currentX: computed.originX,
          currentY: computed.originY,
          targetX: computed.x,
          targetY: computed.y,
          originX: computed.originX,
          originY: computed.originY,
          labelPlacement: computed.placement,
          radius: task.type === 'category' ? 5 : 6,
          sproutProgress: 0,
          isMigrating: false,
          migrationProgress: 1,
          previousOriginX: computed.originX,
          previousOriginY: computed.originY
        });
      }
    });

    // Remove deleted nodes
    for (const id of Array.from(this.nodes.keys())) {
      if (!existingIds.has(id)) {
        this.nodes.delete(id);
      }
    }
  }

  public getTreeBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    let minX = -130;
    let maxX = 130;
    let minY = -210;
    let maxY = 35; // base soil

    this.nodes.forEach(node => {
      const isCategory = node.type === 'category';
      const pillWidth = isCategory
        ? Math.max(80, node.title.length * 8 + 24)
        : Math.max(70, node.title.length * 8.2 + 45);
      const halfPill = pillWidth / 2 + 15;

      minX = Math.min(minX, node.currentX - halfPill, node.targetX - halfPill);
      maxX = Math.max(maxX, node.currentX + halfPill, node.targetX + halfPill);
      minY = Math.min(minY, node.currentY - 35, node.targetY - 35);
      maxY = Math.max(maxY, node.currentY + 30, node.targetY + 30);
    });

    return { minX, maxX, minY, maxY };
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop = (time: number): void => {
    if (!this.isRunning) return;
    const dt = Math.min(64, time - this.lastTime);
    this.lastTime = time;

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    const lerpSpeed = 0.08 * (dt / 16.6);

    this.nodes.forEach(node => {
      node.currentX += (node.targetX - node.currentX) * lerpSpeed;
      node.currentY += (node.targetY - node.currentY) * lerpSpeed;

      if (node.sproutProgress < 1) {
        node.sproutProgress = Math.min(1, node.sproutProgress + 0.05 * (dt / 16.6));
      }

      if (node.isMigrating) {
        node.migrationProgress = Math.min(1, node.migrationProgress + 0.04 * (dt / 16.6));
        if (node.migrationProgress >= 1) {
          node.isMigrating = false;
        }
      }
    });
  }

  public render(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    // Clear background with Zen porcelain tone
    ctx.fillStyle = this.COLOR_BG;
    ctx.fillRect(0, 0, width, height);

    // Apply camera transformation
    ctx.save();
    ctx.translate(this.camera.panX, this.camera.panY);
    ctx.scale(this.camera.zoom, this.camera.zoom);

    // Subtle soft earth base
    this.renderSoilBase(ctx);

    // Organic tapered trunk
    this.renderTrunk(ctx);

    // Curved botanical branches (with migration disconnect/reconnect transitions)
    this.renderBranches(ctx);

    // Interactive nodes (differentiated: category streams vs actionable tasks)
    this.renderNodes(ctx);

    ctx.restore();
  }

  private renderSoilBase(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = '#eaf2ec';
    ctx.beginPath();
    ctx.ellipse(0, 12, 140, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d8e8dc';
    ctx.beginPath();
    ctx.ellipse(0, 14, 85, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderTrunk(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const trunkGradient = ctx.createLinearGradient(0, 10, 0, -185);
    trunkGradient.addColorStop(0, this.COLOR_TRUNK_BASE);
    trunkGradient.addColorStop(0.5, '#0c5237');
    trunkGradient.addColorStop(1, this.COLOR_TRUNK_TOP);

    ctx.fillStyle = trunkGradient;
    ctx.beginPath();
    ctx.moveTo(-10, 10);
    ctx.quadraticCurveTo(-7, -80, -3.5, -180);
    ctx.lineTo(3.5, -180);
    ctx.quadraticCurveTo(7, -80, 10, 10);
    ctx.closePath();
    ctx.fill();

    // Natural wood grain texture lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2, 8);
    ctx.quadraticCurveTo(-1, -60, 0, -170);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(3, 8);
    ctx.quadraticCurveTo(2, -70, 1.5, -150);
    ctx.stroke();

    // Trunk apex node
    ctx.fillStyle = this.COLOR_TRUNK_TOP;
    ctx.beginPath();
    ctx.arc(0, -180, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderBranches(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.nodes.forEach(node => {
      const baseThickness = node.type === 'category' ? 2.5 : 2.0;
      const effortThickening = Math.min(2.5, Math.log1p(node.totalMinutes) * 0.45);
      const branchWidth = baseThickness + effortThickening;

      let strokeColor = this.COLOR_BRANCH;
      if (node.status === 'completed') {
        strokeColor = this.COLOR_LEAF;
      } else if (node.status === 'in_progress') {
        strokeColor = this.COLOR_BRANCH_TENDER;
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = branchWidth;

      // Handle migration transition (disconnect old parent, connect new parent)
      if (node.isMigrating && node.migrationProgress < 1) {
        // 1. Old connection gradually retracts toward old origin and fades
        const retractP = 1 - node.migrationProgress;
        if (retractP > 0.02) {
          ctx.save();
          ctx.globalAlpha = retractP * 0.7;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = branchWidth * retractP;

          const oldOriginX = node.previousOriginX;
          const oldOriginY = node.previousOriginY;
          const oldTipX = oldOriginX + (node.currentX - oldOriginX) * retractP;
          const oldTipY = oldOriginY + (node.currentY - oldOriginY) * retractP;

          const midX = (oldOriginX + oldTipX) / 2;
          const midY = (oldOriginY + oldTipY) / 2;
          const dx = oldTipX - oldOriginX;
          const dy = oldTipY - oldOriginY;
          const cpX = midX - dy * 0.12;
          const cpY = midY + dx * 0.12;

          ctx.beginPath();
          ctx.moveTo(oldOriginX, oldOriginY);
          ctx.quadraticCurveTo(cpX, cpY, oldTipX, oldTipY);
          ctx.stroke();
          ctx.restore();
        }

        // 2. New connection smoothly grows from new parent toward the migrating node
        const growP = node.migrationProgress;
        if (growP > 0.02) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, growP * 1.4);
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = branchWidth;

          let newOriginX = node.originX;
          let newOriginY = node.originY;
          if (node.parentId && this.nodes.has(node.parentId)) {
            const parentNode = this.nodes.get(node.parentId)!;
            newOriginX = parentNode.currentX;
            newOriginY = parentNode.currentY;
          }

          const newTipX = newOriginX + (node.currentX - newOriginX) * growP;
          const newTipY = newOriginY + (node.currentY - newOriginY) * growP;

          const midX = (newOriginX + newTipX) / 2;
          const midY = (newOriginY + newTipY) / 2;
          const dx = newTipX - newOriginX;
          const dy = newTipY - newOriginY;
          const cpX = midX - dy * 0.12;
          const cpY = midY + dx * 0.12;

          ctx.beginPath();
          ctx.moveTo(newOriginX, newOriginY);
          ctx.quadraticCurveTo(cpX, cpY, newTipX, newTipY);
          ctx.stroke();
          ctx.restore();
        }
        return;
      }

      // Standard organic branch rendering
      let startX = node.originX;
      let startY = node.originY;
      if (node.parentId && this.nodes.has(node.parentId)) {
        const parentNode = this.nodes.get(node.parentId)!;
        startX = parentNode.currentX;
        startY = parentNode.currentY;
      }

      // Tip advances with sprouting animation
      const animX = startX + (node.currentX - startX) * node.sproutProgress;
      const animY = startY + (node.currentY - startY) * node.sproutProgress;

      const midX = (startX + animX) / 2;
      const midY = (startY + animY) / 2;
      const dx = animX - startX;
      const dy = animY - startY;
      const cpX = midX - dy * 0.12;
      const cpY = midY + dx * 0.12;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(cpX, cpY, animX, animY);
      ctx.stroke();
    });

    ctx.restore();
  }

  private renderNodes(ctx: CanvasRenderingContext2D): void {
    const zoom = this.camera.zoom;

    this.nodes.forEach(node => {
      if (node.sproutProgress < 0.15) return;

      const x = node.currentX;
      const y = node.currentY;
      const isSelected = this.selectedTaskId === node.id;
      const isHovered = this.hoveredTaskId === node.id;

      ctx.save();
      ctx.translate(x, y);

      // ==============================================================
      // 1. ORGANIZATIONAL CATEGORY: Structural Joint & Expanding Aura
      // ==============================================================
      if (node.type === 'category') {
        const catRadius = (isSelected ? 6 : 4.5) * node.sproutProgress;

        // Expanding aura when freshly growing
        if (node.sproutProgress < 0.95) {
          ctx.fillStyle = 'rgba(16, 91, 56, 0.18)';
          ctx.beginPath();
          ctx.arc(0, 0, catRadius + 6 * (1 - node.sproutProgress), 0, Math.PI * 2);
          ctx.fill();
        }

        // Structural joint node
        ctx.fillStyle = this.COLOR_TRUNK_TOP;
        ctx.beginPath();
        ctx.arc(0, 0, catRadius, 0, Math.PI * 2);
        ctx.fill();

        if (isSelected) {
          // Luminous botanical beacon aura for selected category joint
          ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
          ctx.beginPath();
          ctx.arc(0, 0, catRadius + 14, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(16, 185, 129, 0.28)';
          ctx.beginPath();
          ctx.arc(0, 0, catRadius + 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, catRadius + 5, 0, Math.PI * 2);
          ctx.stroke();

          // Inner dark emerald joint core
          ctx.fillStyle = '#064e3b';
          ctx.beginPath();
          ctx.arc(0, 0, catRadius, 0, Math.PI * 2);
          ctx.fill();

          // White center beacon pip
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (isHovered) {
          ctx.strokeStyle = 'rgba(16, 91, 56, 0.45)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, catRadius + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Category Stream Label (Adaptive Level of Detail: visible down to 0.35 zoom, smoothly fading)
        const isCatLabelVisible = isSelected || isHovered || zoom >= 0.35;
        if (isCatLabelVisible && node.sproutProgress > 0.4) {
          const catOpacity = isSelected || isHovered || zoom >= 0.45 ? 1.0 : (zoom - 0.35) / 0.10;
          ctx.save();
          ctx.globalAlpha = Math.max(0.1, Math.min(1.0, catOpacity));

          ctx.font = isSelected ? '700 11px "Plus Jakarta Sans", sans-serif' : '600 11px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          let categoryTitle = node.title.toUpperCase();
          const maxCatWidth = 160;
          let textWidth = ctx.measureText(categoryTitle).width;
          if (textWidth > maxCatWidth) {
            const ellipsis = '...';
            let low = 0;
            let high = categoryTitle.length;
            let best = '';
            while (low <= high) {
              const mid = Math.floor((low + high) / 2);
              const candidate = categoryTitle.slice(0, mid).trimEnd() + ellipsis;
              if (ctx.measureText(candidate).width <= maxCatWidth) {
                best = candidate;
                low = mid + 1;
              } else {
                high = mid - 1;
              }
            }
            categoryTitle = best || ellipsis;
            textWidth = ctx.measureText(categoryTitle).width;
          }

          const tagY = node.labelPlacement === 'bottom' ? 18 : -18;

          ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(251, 252, 249, 0.94)';
          if (isSelected) {
            ctx.shadowColor = 'rgba(16, 185, 129, 0.25)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 2;
          }
          ctx.beginPath();
          ctx.roundRect(-textWidth / 2 - 12, tagY - 12, textWidth + 24, 24, 8);
          ctx.fill();
          ctx.shadowColor = 'transparent';

          if (isSelected) {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Distinct green beacon pip inside tag
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(-textWidth / 2 - 4, tagY, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.strokeStyle = '#e2ece4';
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          ctx.fillStyle = isSelected ? '#064e3b' : this.COLOR_TEXT_CATEGORY;
          ctx.fillText(categoryTitle, isSelected ? 4 : 0, tagY);
          ctx.restore();
        }

        ctx.restore();
        return;
      }

      // ==============================================================
      // 2. ACTIONABLE TASK / PROJECT: Bud, In-Progress, or Bloomed Leaf
      // ==============================================================
      const radius = (isSelected ? 10 : isHovered ? 8 : 6) * node.sproutProgress;

      if (isSelected || isHovered) {
        if (isSelected) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
          ctx.beginPath();
          ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = isSelected ? this.COLOR_LEAF : 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (node.status === 'completed') {
        // Bloomed Leaf Node
        ctx.fillStyle = this.COLOR_LEAF;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // White checkmark center
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-2.5, 0);
        ctx.lineTo(-0.5, 2.5);
        ctx.lineTo(3, -2);
        ctx.stroke();
      } else if (node.status === 'in_progress') {
        // Double-ring Jade Node (Active flourishing)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.COLOR_TRUNK_TOP;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = this.COLOR_TRUNK_TOP;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Pending Amber Bud
        ctx.fillStyle = this.COLOR_BUD_AURA;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.COLOR_BUD;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(0.8, -0.8, radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }

      // ==============================================================
      // 3. Staggered Collision-Free Pill Label Tag (with Adaptive LOD)
      // ==============================================================
      // Level of Detail (LOD) thresholds:
      // - Overview Mode (zoom < 0.48): Subtask labels collapse into clean stylized branch tips
      // - Transition (0.48 <= zoom < 0.65): Labels smoothly fade in via globalAlpha
      // - Detail Mode (zoom >= 0.65): All labels and subtask hours fully visible
      // - Highlight Override: Selected or hovered nodes ALWAYS render with 100% full opacity
      const isTopLevel = !node.parentId;
      let labelOpacity = 0;
      if (isSelected || isHovered) {
        labelOpacity = 1.0;
      } else if (isTopLevel) {
        if (zoom >= 0.45) {
          labelOpacity = 1.0;
        } else if (zoom >= 0.32) {
          labelOpacity = (zoom - 0.32) / 0.13;
        }
      } else {
        // Child subtasks
        if (zoom >= 0.65) {
          labelOpacity = 1.0;
        } else if (zoom >= 0.48) {
          labelOpacity = (zoom - 0.48) / 0.17;
        }
      }

      if (labelOpacity > 0.05 && node.sproutProgress > 0.4) {
        ctx.save();
        ctx.globalAlpha = Math.min(1.0, labelOpacity);

        const {
          totalPillWidth,
          pillHeight,
          displayTitle,
          hoursText,
          titleStartX,
          paddingRight
        } = this.calculatePillLayout(ctx, node.title, node.totalMinutes, isSelected);

        let pillX = 0;
        let pillY = -24;

        if (node.labelPlacement === 'bottom') {
          pillY = 16;
          pillX = -totalPillWidth / 2;
        } else if (node.labelPlacement === 'left') {
          pillX = -totalPillWidth - radius - 6;
          pillY = -pillHeight / 2;
        } else if (node.labelPlacement === 'right') {
          pillX = radius + 6;
          pillY = -pillHeight / 2;
        } else {
          // 'top'
          pillX = -totalPillWidth / 2;
          pillY = -26;
        }

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(6, 78, 59, 0.08)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;

        ctx.beginPath();
        ctx.roundRect(pillX, pillY, totalPillWidth, pillHeight, 11);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = isSelected ? '#10b981' : '#e2ece4';
        ctx.lineWidth = 1;
        ctx.stroke();

        const dotColor = node.status === 'completed'
          ? this.COLOR_LEAF
          : node.status === 'in_progress'
          ? this.COLOR_TRUNK_TOP
          : this.COLOR_BUD;

        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(pillX + 10.5, pillY + pillHeight / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Exact / truncated title text (guaranteed never to encroach on hours space)
        ctx.font = isSelected ? '600 11.5px Inter, sans-serif' : '500 11px Inter, sans-serif';
        ctx.fillStyle = this.COLOR_TEXT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayTitle, pillX + titleStartX, pillY + pillHeight / 2);

        // Hours indicator (independent dedicated space)
        if (hoursText) {
          ctx.font = '500 9.5px "JetBrains Mono", monospace';
          ctx.fillStyle = this.COLOR_TEXT_MUTED;
          ctx.textAlign = 'right';
          ctx.fillText(hoursText, pillX + totalPillWidth - paddingRight, pillY + pillHeight / 2);
        }

        ctx.restore();
      }

      ctx.restore();
    });
  }

  /**
   * Calculates independent layout bounds for title and hours badge within a pill tag.
   * Ensures title and time indicator never overlap, dynamically adapting width up to a safe
   * ceiling and truncating long titles with an ellipsis while keeping the time indicator fully visible.
   */
  private calculatePillLayout(
    ctx: CanvasRenderingContext2D,
    title: string,
    totalMinutes: number,
    isSelected: boolean
  ): {
    totalPillWidth: number;
    pillHeight: number;
    displayTitle: string;
    hoursText: string | null;
    titleStartX: number;
    paddingRight: number;
  } {
    // 1. Format hours indicator cleanly (e.g. "5h", "1.5h", "45m")
    let hoursText: string | null = null;
    if (totalMinutes > 0) {
      if (totalMinutes >= 60) {
        const hours = totalMinutes / 60;
        hoursText = hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
      } else {
        hoursText = `${totalMinutes}m`;
      }
    }

    const pillHeight = 22;
    const paddingLeft = 8;
    const dotRadius = 2.5;
    const dotSpacing = 6;
    const titleStartX = paddingLeft + dotRadius * 2 + dotSpacing; // 19px
    const paddingRight = 9;
    const minTitleHoursGap = 8; // Strictly reserved buffer between title text and hours badge
    const minPillWidth = 60;
    const maxPillWidth = 190; // Natural boundary preventing overlap with neighboring branches

    // 2. Measure hours badge independently
    let hoursWidth = 0;
    if (hoursText) {
      ctx.font = '500 9.5px "JetBrains Mono", monospace';
      hoursWidth = ctx.measureText(hoursText).width;
    }

    // 3. Measure title in its exact rendering font
    ctx.font = isSelected ? '600 11.5px Inter, sans-serif' : '500 11px Inter, sans-serif';
    const fullTitleWidth = ctx.measureText(title).width;

    // 4. Compute ideal pill width and clamp to bounds
    const timeSlotWidth = hoursText ? (minTitleHoursGap + hoursWidth) : 0;
    const contentNeededWidth = titleStartX + fullTitleWidth + timeSlotWidth + paddingRight;
    const totalPillWidth = Math.max(minPillWidth, Math.min(maxPillWidth, Math.ceil(contentNeededWidth)));

    // 5. Independently compute available title space
    const availableTitleWidth = totalPillWidth - titleStartX - timeSlotWidth - paddingRight;

    // 6. Ellipsis truncation if title exceeds available space
    let displayTitle = title;
    if (fullTitleWidth > availableTitleWidth) {
      const ellipsis = '...';
      const ellipsisWidth = ctx.measureText(ellipsis).width;

      if (availableTitleWidth <= ellipsisWidth) {
        displayTitle = '';
      } else {
        let low = 0;
        let high = title.length;
        let best = '';
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const prefix = title.slice(0, mid).trimEnd();
          const candidate = prefix + ellipsis;
          if (ctx.measureText(candidate).width <= availableTitleWidth) {
            best = candidate;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        displayTitle = best || ellipsis;
      }
    }

    return {
      totalPillWidth,
      pillHeight,
      displayTitle,
      hoursText,
      titleStartX,
      paddingRight
    };
  }

  public hitTest(worldX: number, worldY: number): string | null {
    const nodeArray = Array.from(this.nodes.values()).reverse();
    for (const node of nodeArray) {
      const dx = worldX - node.currentX;
      const dy = worldY - node.currentY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 24) {
        return node.id;
      }

      const { totalPillWidth, pillHeight } = this.calculatePillLayout(
        this.ctx,
        node.title,
        node.totalMinutes,
        this.selectedTaskId === node.id
      );

      const radius = (this.selectedTaskId === node.id ? 10 : 6) * node.sproutProgress;
      let pillX = 0;
      let pillY = -24;

      if (node.labelPlacement === 'bottom') {
        pillY = 16;
        pillX = -totalPillWidth / 2;
      } else if (node.labelPlacement === 'left') {
        pillX = -totalPillWidth - radius - 6;
        pillY = -pillHeight / 2;
      } else if (node.labelPlacement === 'right') {
        pillX = radius + 6;
        pillY = -pillHeight / 2;
      } else {
        // 'top'
        pillX = -totalPillWidth / 2;
        pillY = -26;
      }

      if (
        dx >= pillX &&
        dx <= pillX + totalPillWidth &&
        dy >= pillY &&
        dy <= pillY + pillHeight
      ) {
        return node.id;
      }
    }
    return null;
  }

  public getNodePosition(taskId: string): { x: number; y: number } | null {
    const node = this.nodes.get(taskId);
    if (!node) return null;
    return { x: node.targetX, y: node.targetY };
  }

  /**
   * Computes the ideal camera target framing for a task or category.
   * - For categories: frames the category joint together with its direct children cluster,
   *   so the relationship and branch hierarchy are clearly visible.
   * - For individual tasks: frames the task node with comfortable padding around its label.
   */
  public getTaskFraming(taskId: string): {
    centerWorldX: number;
    centerWorldY: number;
    bounds?: { minX: number; maxX: number; minY: number; maxY: number };
    isCluster: boolean;
  } | null {
    const node = this.nodes.get(taskId);
    if (!node) return null;

    if (node.type === 'category') {
      const children = Array.from(this.nodes.values()).filter(n => n.parentId === node.id);
      if (children.length > 0) {
        // Measure category label pill
        const catPillWidth = Math.max(80, Math.min(160, node.title.length * 8 + 24));
        let minX = node.targetX - catPillWidth / 2 - 20;
        let maxX = node.targetX + catPillWidth / 2 + 20;
        let minY = node.targetY - 35;
        let maxY = node.targetY + 35;

        children.forEach(c => {
          const hours = (c.directMinutes || 0) > 0;
          const childPillWidth = Math.max(60, Math.min(190, c.title.length * 7.5 + (hours ? 45 : 22)));
          const halfW = childPillWidth / 2 + 25;
          minX = Math.min(minX, c.targetX - halfW);
          maxX = Math.max(maxX, c.targetX + halfW);
          minY = Math.min(minY, c.targetY - 35);
          maxY = Math.max(maxY, c.targetY + 35);
        });

        // Geometric center of the entire cluster
        const clusterCenterX = (minX + maxX) / 2;
        const clusterCenterY = (minY + maxY) / 2;

        // Balanced composition: 55% weighted toward category joint, 45% toward cluster center
        // Ensures the category node itself remains visually central and focal, not shoved to the edge
        const centerWorldX = node.targetX * 0.55 + clusterCenterX * 0.45;
        const centerWorldY = node.targetY * 0.55 + clusterCenterY * 0.45;

        return {
          centerWorldX,
          centerWorldY,
          bounds: { minX, maxX, minY, maxY },
          isCluster: true
        };
      }
    }

    // Individual task or leaf branch: frame with comfortable margin around node and label
    const hours = (node.directMinutes || 0) > 0;
    const pillWidth = node.type === 'category'
      ? Math.max(80, Math.min(160, node.title.length * 8 + 24))
      : Math.max(60, Math.min(190, node.title.length * 7.5 + (hours ? 45 : 22)));

    const halfW = pillWidth / 2 + 35;

    return {
      centerWorldX: node.targetX,
      centerWorldY: node.targetY,
      bounds: {
        minX: node.targetX - halfW,
        maxX: node.targetX + halfW,
        minY: node.targetY - 50,
        maxY: node.targetY + 50
      },
      isCluster: false
    };
  }
}
