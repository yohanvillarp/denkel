import { TaskNode } from '../types/task';
import { CameraController } from './CameraController';

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
}

export class TreeRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: CameraController;
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

  constructor(canvas: HTMLCanvasElement, camera: CameraController) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D canvas context');
    }
    this.ctx = context;
    this.camera = camera;
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

    // Calculate natural, asymmetrical organic layout positions
    const positions = this.calculateOrganicPositions(taskList);

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
          radius: task.type === 'category' ? 4 : 6,
          sproutProgress: 0
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

  /**
   * Deterministic Asymmetric Botanical Layout
   * Staggers branching heights along the trunk, uses natural organic arching,
   * and staggers label positioning to prevent collisions.
   */
  private calculateOrganicPositions(tasks: TaskNode[]): Map<string, {
    x: number;
    y: number;
    originX: number;
    originY: number;
    placement: 'top' | 'bottom' | 'left' | 'right';
  }> {
    const posMap = new Map<string, {
      x: number;
      y: number;
      originX: number;
      originY: number;
      placement: 'top' | 'bottom' | 'left' | 'right';
    }>();

    const roots = tasks.filter(t => !t.parentId);
    const byParent = new Map<string, TaskNode[]>();
    tasks.forEach(t => {
      if (t.parentId) {
        const arr = byParent.get(t.parentId) || [];
        arr.push(t);
        byParent.set(t.parentId, arr);
      }
    });

    // Asymmetric branch configuration presets for primary stems along the trunk
    // Trunk runs from y = 0 to y = -180.
    // Different branches emerge at distinct, staggered heights!
    const branchSlots = [
      // 0: Lower-left branch (emerges low, reaches wide left)
      { originY: -85, angle: -Math.PI * 0.78, length: 185, placement: 'left' as const },
      // 1: Mid-right branch (emerges middle, reaches high right)
      { originY: -125, angle: -Math.PI * 0.22, length: 195, placement: 'right' as const },
      // 2: Upper-left branch (emerges higher, reaches steep upper-left)
      { originY: -155, angle: -Math.PI * 0.62, length: 165, placement: 'top' as const },
      // 3: Crown-top branch (emerges near apex, reaches upper center)
      { originY: -180, angle: -Math.PI * 0.46, length: 155, placement: 'top' as const },
      // 4: Lower-right branch (emerges low, reaches wide right)
      { originY: -95, angle: -Math.PI * 0.16, length: 175, placement: 'right' as const },
      // 5: Steep-right branch
      { originY: -145, angle: -Math.PI * 0.35, length: 160, placement: 'top' as const },
      // 6: Deep-left branch
      { originY: -115, angle: -Math.PI * 0.88, length: 150, placement: 'left' as const },
    ];

    roots.forEach((root, idx) => {
      const slot = branchSlots[idx % branchSlots.length];
      // Slight index-based deterministic length shift
      const lengthShift = ((idx * 17) % 25) - 12;
      const actualLength = slot.length + lengthShift;

      // Calculate trunk curvature at originY
      const originX = Math.sin((slot.originY / -180) * Math.PI) * 4;
      const targetX = originX + Math.cos(slot.angle) * actualLength;
      const targetY = slot.originY + Math.sin(slot.angle) * actualLength;

      posMap.set(root.id, {
        x: targetX,
        y: targetY,
        originX,
        originY: slot.originY,
        placement: slot.placement
      });

      // Layout children / sub-branches recursively
      this.layoutChildren(root.id, targetX, targetY, slot.angle, byParent, posMap, 1);
    });

    return posMap;
  }

  private layoutChildren(
    parentId: string,
    parentX: number,
    parentY: number,
    parentAngle: number,
    byParent: Map<string, TaskNode[]>,
    posMap: Map<string, { x: number; y: number; originX: number; originY: number; placement: 'top' | 'bottom' | 'left' | 'right' }>,
    depth: number
  ): void {
    const children = byParent.get(parentId) || [];
    if (children.length === 0) return;

    const count = children.length;
    // Sub-branches spread gracefully with staggered lengths
    const fanSpread = Math.min(Math.PI * 0.55, 0.28 + count * 0.14);
    const startAngle = parentAngle - fanSpread / 2;
    const angleStep = count > 1 ? fanSpread / (count - 1) : 0;

    children.forEach((child, i) => {
      const angle = count === 1 ? parentAngle + (i % 2 === 0 ? 0.12 : -0.12) : startAngle + i * angleStep;
      // Stagger child lengths to avoid circular ring collisions
      const length = Math.max(75, 125 - depth * 20 + ((i * 19) % 30) - 15);
      const cx = parentX + Math.cos(angle) * length;
      const cy = parentY + Math.sin(angle) * length;

      // Determine label placement: alternate top/bottom to prevent overlapping labels
      const placement: 'top' | 'bottom' | 'left' | 'right' = i % 2 === 0 ? 'top' : 'bottom';

      posMap.set(child.id, {
        x: cx,
        y: cy,
        originX: parentX,
        originY: parentY,
        placement
      });

      this.layoutChildren(child.id, cx, cy, angle, byParent, posMap, depth + 1);
    });
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
        node.sproutProgress = Math.min(1, node.sproutProgress + 0.06 * (dt / 16.6));
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

    // Curved botanical branches (delicate, proportional thickness)
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

    // Organic tapered trunk rising from (0, 12) up to (0, -180)
    // Tapers naturally: 10px base -> 4px at crown
    const gradient = ctx.createLinearGradient(0, 12, 0, -180);
    gradient.addColorStop(0, this.COLOR_TRUNK_BASE);
    gradient.addColorStop(0.6, this.COLOR_TRUNK_TOP);
    gradient.addColorStop(1, this.COLOR_BRANCH);

    ctx.strokeStyle = gradient;
    ctx.fillStyle = gradient;
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;

    ctx.beginPath();
    ctx.moveTo(0, 12);
    // Subtle natural S-curve sway
    ctx.bezierCurveTo(-6, -50, 6, -110, 0, -180);
    ctx.stroke();

    // If tree is completely empty, draw tender seedling sprout at the tip
    if (this.nodes.size === 0) {
      // Tender young leaves
      ctx.fillStyle = this.COLOR_LEAF;
      ctx.beginPath();
      ctx.ellipse(-10, -188, 12, 6, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(10, -188, 12, 6, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      // Tender center sprout bud
      ctx.fillStyle = this.COLOR_BUD;
      ctx.beginPath();
      ctx.arc(0, -184, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderBranches(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.nodes.forEach(node => {
      const startX = node.originX;
      const startY = node.originY;

      // Base branch thickness starts delicate (1.8px - 2.2px)
      // Gradually thickens with accumulated time, capped at 4.5px
      const baseThickness = node.type === 'category' ? 2.5 : 2.0;
      const effortThickening = Math.min(2.5, Math.log1p(node.totalMinutes) * 0.45);
      const branchWidth = baseThickness + effortThickening;

      // Branch color: categories are deep forest; tasks are emerald/foliage
      let strokeColor = this.COLOR_BRANCH;
      if (node.status === 'completed') {
        strokeColor = this.COLOR_LEAF;
      } else if (node.status === 'in_progress') {
        strokeColor = this.COLOR_BRANCH_TENDER;
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = branchWidth;

      // Organic curved branch line
      ctx.beginPath();
      ctx.moveTo(startX, startY);

      // Interpolated tip for smooth sprouting animation
      const animX = startX + (node.currentX - startX) * node.sproutProgress;
      const animY = startY + (node.currentY - startY) * node.sproutProgress;

      // Natural arch control point
      const midX = (startX + animX) / 2;
      const midY = (startY + animY) / 2;
      const dx = animX - startX;
      const dy = animY - startY;

      // Curvature perpendicular to branch vector
      const curvature = 0.12;
      const cpX = midX - dy * curvature;
      const cpY = midY + dx * curvature;

      ctx.quadraticCurveTo(cpX, cpY, animX, animY);
      ctx.stroke();
    });

    ctx.restore();
  }

  private renderNodes(ctx: CanvasRenderingContext2D): void {
    const zoom = this.camera.zoom;

    this.nodes.forEach(node => {
      // Only render node when sprout animation has progressed
      if (node.sproutProgress < 0.2) return;

      const x = node.currentX;
      const y = node.currentY;
      const isSelected = this.selectedTaskId === node.id;
      const isHovered = this.hoveredTaskId === node.id;

      ctx.save();
      ctx.translate(x, y);

      // ==============================================================
      // 1. ORGANIZATIONAL CATEGORY: Structural Stream (No pending bud)
      // ==============================================================
      if (node.type === 'category') {
        // Delicate structural joint node
        ctx.fillStyle = this.COLOR_TRUNK_TOP;
        ctx.beginPath();
        ctx.arc(0, 0, isSelected ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();

        if (isSelected || isHovered) {
          ctx.strokeStyle = 'rgba(16, 91, 56, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Category Stream Label: Elegant, spaced, dignified
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = this.COLOR_TEXT_CATEGORY;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const categoryTitle = node.title.toUpperCase();
        const tagY = node.labelPlacement === 'bottom' ? 18 : -18;

        // Soft frosted backdrop pill
        const textWidth = ctx.measureText(categoryTitle).width;
        ctx.fillStyle = 'rgba(251, 252, 249, 0.92)';
        ctx.beginPath();
        ctx.roundRect(-textWidth / 2 - 8, tagY - 10, textWidth + 16, 20, 6);
        ctx.fill();

        ctx.fillStyle = this.COLOR_TEXT_CATEGORY;
        ctx.fillText(categoryTitle, 0, tagY);

        ctx.restore();
        return;
      }

      // ==============================================================
      // 2. ACTIONABLE TASK / PROJECT: Bud, In-Progress, or Bloomed Leaf
      // ==============================================================
      const radius = isSelected ? 10 : isHovered ? 8 : 6;

      // Glow / Selection Ring
      if (isSelected || isHovered) {
        ctx.strokeStyle = isSelected ? this.COLOR_LEAF : 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (node.status === 'completed') {
        // Bloomed Emerald Node
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
        // Pending Amber Bud (Delicate warm resin)
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
      // 3. Staggered Pill Label Tag (Exact User Title Preserved)
      // ==============================================================
      const shouldShowLabel = zoom >= 0.5 || !node.parentId || isSelected;

      if (shouldShowLabel) {
        ctx.font = isSelected ? '600 11.5px Inter, sans-serif' : '500 11px Inter, sans-serif';
        const exactTitle = node.title;

        // Calculate hours readout if logged
        const hoursText = node.totalMinutes > 0
          ? node.totalMinutes >= 60
            ? `${(node.totalMinutes / 60).toFixed(1)}h`
            : `${node.totalMinutes}m`
          : null;

        const textMetrics = ctx.measureText(exactTitle);
        const titleWidth = textMetrics.width;
        const totalPillWidth = titleWidth + (hoursText ? 42 : 18);
        const pillHeight = 22;

        // Staggered tag offset based on node placement
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

        // Soft white card with delicate border and shadow
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

        // Status indicator dot inside pill
        const dotColor = node.status === 'completed'
          ? this.COLOR_LEAF
          : node.status === 'in_progress'
          ? this.COLOR_TRUNK_TOP
          : this.COLOR_BUD;

        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(pillX + 9, pillY + pillHeight / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Exact title text
        ctx.fillStyle = this.COLOR_TEXT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(exactTitle, pillX + 16, pillY + pillHeight / 2);

        // Optional time logged pill badge
        if (hoursText) {
          ctx.font = '500 9.5px "JetBrains Mono", monospace';
          ctx.fillStyle = this.COLOR_TEXT_MUTED;
          ctx.textAlign = 'right';
          ctx.fillText(hoursText, pillX + totalPillWidth - 8, pillY + pillHeight / 2);
        }
      }

      ctx.restore();
    });
  }

  public hitTest(worldX: number, worldY: number): string | null {
    const nodeArray = Array.from(this.nodes.values()).reverse();
    for (const node of nodeArray) {
      const dx = worldX - node.currentX;
      const dy = worldY - node.currentY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Generous hit test radius for comfortable clicking
      if (dist <= 20) {
        return node.id;
      }
    }
    return null;
  }

  public getNodePosition(taskId: string): { x: number; y: number } | null {
    const node = this.nodes.get(taskId);
    if (!node) return null;
    return { x: node.currentX, y: node.currentY };
  }

  public getNodes(): RenderNode[] {
    return Array.from(this.nodes.values());
  }
}
