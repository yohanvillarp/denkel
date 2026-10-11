import { hierarchy, HierarchyNode } from 'd3-hierarchy';
import { TaskNode } from '../types/task';
import { ITreeLayoutEngine, LayoutPosition } from './ITreeLayoutEngine';

interface HierarchyTaskData {
  id: string;
  task?: TaskNode;
  children?: HierarchyTaskData[];
}

interface Rect {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export class D3TreeLayoutEngine implements ITreeLayoutEngine {
  // Balanced botanical primary branch slots along the trunk
  // Staggers vertical emergence (originY from -75 to -180) and angles
  // to distribute weight naturally between left, right, and crown.
  private readonly PRIMARY_SLOTS = [
    // 0: Wide lower-left (reaches out left-up)
    { originY: -80, angle: -Math.PI * 0.78, baseLength: 175, preferredPlacement: 'left' as const },
    // 1: Graceful lower-right (reaches out right-up)
    { originY: -100, angle: -Math.PI * 0.22, baseLength: 180, preferredPlacement: 'right' as const },
    // 2: Upper-left canopy
    { originY: -135, angle: -Math.PI * 0.65, baseLength: 170, preferredPlacement: 'top' as const },
    // 3: Upper-right canopy
    { originY: -150, angle: -Math.PI * 0.32, baseLength: 170, preferredPlacement: 'top' as const },
    // 4: Crown apex (tall center stem)
    { originY: -180, angle: -Math.PI * 0.48, baseLength: 160, preferredPlacement: 'top' as const },
    // 5: Mid-left secondary
    { originY: -110, angle: -Math.PI * 0.88, baseLength: 160, preferredPlacement: 'left' as const },
    // 6: Mid-right secondary
    { originY: -125, angle: -Math.PI * 0.14, baseLength: 165, preferredPlacement: 'right' as const },
    // 7: Crown-left apex
    { originY: -170, angle: -Math.PI * 0.58, baseLength: 155, preferredPlacement: 'top' as const },
    // 8: Crown-right apex
    { originY: -170, angle: -Math.PI * 0.40, baseLength: 155, preferredPlacement: 'top' as const },
  ];

  public calculateLayout(tasks: TaskNode[]): Map<string, LayoutPosition> {
    const posMap = new Map<string, LayoutPosition>();
    if (tasks.length === 0) return posMap;

    const taskMap = new Map<string, TaskNode>();
    tasks.forEach(t => taskMap.set(t.id, t));

    // Guard against circular paths and find roots
    const hasPathToAncestor = (nodeId: string, targetId: string, visited: Set<string>): boolean => {
      if (nodeId === targetId) return true;
      if (visited.has(nodeId)) return false;
      visited.add(nodeId);
      const node = taskMap.get(nodeId);
      if (!node || !node.parentId) return false;
      return hasPathToAncestor(node.parentId, targetId, visited);
    };

    const childrenMap = new Map<string, TaskNode[]>();
    const roots: TaskNode[] = [];

    tasks.forEach(task => {
      if (!task.parentId || !taskMap.has(task.parentId) || hasPathToAncestor(task.parentId, task.id, new Set())) {
        roots.push(task);
      } else {
        const arr = childrenMap.get(task.parentId) || [];
        arr.push(task);
        childrenMap.set(task.parentId, arr);
      }
    });

    // Helper: compute total subtree size to dynamically scale primary stem reach
    const countSubtreeNodes = (nodeId: string): number => {
      const children = childrenMap.get(nodeId) || [];
      return 1 + children.reduce((acc, c) => acc + countSubtreeNodes(c.id), 0);
    };

    // Label bounding boxes collection for collision resolution
    const occupiedPills: { id: string; rect: Rect }[] = [];

    // Lay out primary stems along trunk
    roots.forEach((rootTask, rootIdx) => {
      const slot = this.PRIMARY_SLOTS[rootIdx % this.PRIMARY_SLOTS.length];
      const wrapCycle = Math.floor(rootIdx / this.PRIMARY_SLOTS.length);

      // Subtree-aware reach: larger trees get slightly longer primary branches to give children clearance
      const subtreeSize = countSubtreeNodes(rootTask.id);
      const subtreeBonus = Math.min(50, (subtreeSize - 1) * 12);

      const lengthJitter = ((rootIdx * 19) % 25) - 10;
      const actualLength = slot.baseLength + subtreeBonus + lengthJitter + wrapCycle * 20;

      // Slight angle offset for overflow roots
      const angleJitter = wrapCycle * 0.15 * (rootIdx % 2 === 0 ? 1 : -1);
      const actualAngle = slot.angle + angleJitter;

      // Origin on organic curved trunk
      const originX = Math.sin((slot.originY / -180) * Math.PI) * 5;
      const originY = slot.originY;

      let targetX = originX + Math.cos(actualAngle) * actualLength;
      let targetY = originY + Math.sin(actualAngle) * actualLength;

      // Choose collision-free placement for primary root
      const { placement, rect, adjustedX, adjustedY } = this.resolveLabelCollision(
        rootTask,
        targetX,
        targetY,
        actualAngle,
        slot.preferredPlacement,
        occupiedPills
      );

      targetX = adjustedX;
      targetY = adjustedY;
      occupiedPills.push({ id: rootTask.id, rect });

      posMap.set(rootTask.id, {
        x: targetX,
        y: targetY,
        originX,
        originY,
        placement
      });

      // Construct subtree data for d3.hierarchy
      const buildTreeData = (nodeId: string): HierarchyTaskData => {
        const children = childrenMap.get(nodeId) || [];
        return {
          id: nodeId,
          task: taskMap.get(nodeId),
          children: children.map(c => buildTreeData(c.id))
        };
      };

      const treeData = buildTreeData(rootTask.id);
      if (treeData.children && treeData.children.length > 0) {
        const d3Root = hierarchy<HierarchyTaskData>(treeData);
        d3Root.count();

        this.layoutSubtree(
          d3Root,
          targetX,
          targetY,
          actualAngle,
          posMap,
          occupiedPills,
          1
        );
      }
    });

    return posMap;
  }

  /**
   * Recursively lay out child sub-branches using D3 subtree weights,
   * enforcing minimum angular arc clearance and collision-free label placements.
   */
  private layoutSubtree(
    d3Parent: HierarchyNode<HierarchyTaskData>,
    parentX: number,
    parentY: number,
    parentAngle: number,
    posMap: Map<string, LayoutPosition>,
    occupiedPills: { id: string; rect: Rect }[],
    depth: number
  ): void {
    const children = d3Parent.children;
    if (!children || children.length === 0) return;

    const childCount = children.length;
    // Fan spread scales gracefully with number of children
    const fanSpread = Math.min(Math.PI * 0.65, 0.35 + childCount * 0.15);
    const startAngle = parentAngle - fanSpread / 2;

    const totalWeight = children.reduce((sum, c) => sum + (c.value || 1), 0);
    let currentAngle = startAngle;

    children.forEach((d3Child, idx) => {
      const childTask = d3Child.data.task;
      const childWeight = d3Child.value || 1;
      const sliceSize = childCount > 1 ? (childWeight / totalWeight) * fanSpread : 0;
      const childAngle = childCount === 1 
        ? parentAngle + (idx % 2 === 0 ? 0.12 : -0.12)
        : currentAngle + sliceSize / 2;
      currentAngle += sliceSize;

      // Stagger radial length between adjacent siblings to break concentric clustering
      const staggerShift = (idx % 2 === 0 ? 1 : -1) * 22;
      const baseLength = Math.max(80, 130 - depth * 16);
      const childLength = baseLength + staggerShift;

      let cx = parentX + Math.cos(childAngle) * childLength;
      let cy = parentY + Math.sin(childAngle) * childLength;

      const preferredPlacement = idx % 2 === 0 ? 'top' : 'bottom';

      // Resolve collision with all existing labels
      const { placement, rect, adjustedX, adjustedY } = this.resolveLabelCollision(
        childTask,
        cx,
        cy,
        childAngle,
        preferredPlacement,
        occupiedPills
      );

      cx = adjustedX;
      cy = adjustedY;
      occupiedPills.push({ id: d3Child.data.id, rect });

      posMap.set(d3Child.data.id, {
        x: cx,
        y: cy,
        originX: parentX,
        originY: parentY,
        placement
      });

      this.layoutSubtree(d3Child, cx, cy, childAngle, posMap, occupiedPills, depth + 1);
    });
  }

  /**
   * Evaluates label bounding boxes for the 4 cardinal placements and checks for overlap
   * against already occupied pills. Adjusts branch reach outward if necessary.
   */
  private resolveLabelCollision(
    task: TaskNode | undefined,
    x: number,
    y: number,
    angle: number,
    preferredPlacement: 'top' | 'bottom' | 'left' | 'right',
    occupiedPills: { id: string; rect: Rect }[]
  ): { placement: 'top' | 'bottom' | 'left' | 'right'; rect: Rect; adjustedX: number; adjustedY: number } {
    const title = task?.title || 'Branch';
    const isCategory = task?.type === 'category';

    // Approximate pill tag dimensions synchronized with TreeRenderer ceiling
    const hours = (task?.directMinutes || 0) > 0;
    const pillWidth = isCategory
      ? Math.max(80, Math.min(160, title.length * 8 + 24))
      : Math.max(60, Math.min(190, title.length * 7.5 + (hours ? 45 : 22)));
    const pillHeight = 22;

    const placements: ('top' | 'bottom' | 'left' | 'right')[] = [
      preferredPlacement,
      preferredPlacement === 'top' ? 'bottom' : 'top',
      'right',
      'left'
    ];

    const getRect = (placement: 'top' | 'bottom' | 'left' | 'right', posX: number, posY: number): Rect => {
      let offsetX = 0;
      let offsetY = -26;
      if (placement === 'bottom') {
        offsetX = -pillWidth / 2;
        offsetY = 16;
      } else if (placement === 'left') {
        offsetX = -pillWidth - 14;
        offsetY = -pillHeight / 2;
      } else if (placement === 'right') {
        offsetX = 14;
        offsetY = -pillHeight / 2;
      } else {
        // 'top'
        offsetX = -pillWidth / 2;
        offsetY = -26;
      }
      return {
        minX: posX + offsetX,
        maxX: posX + offsetX + pillWidth,
        minY: posY + offsetY,
        maxY: posY + offsetY + pillHeight
      };
    };

    const hasCollision = (r1: Rect, padding: number = 8): boolean => {
      return occupiedPills.some(p => {
        const r2 = p.rect;
        return !(
          r1.maxX + padding < r2.minX ||
          r1.minX - padding > r2.maxX ||
          r1.maxY + padding < r2.minY ||
          r1.minY - padding > r2.maxY
        );
      });
    };

    // 1. Try placements at the initial tip position
    for (const p of placements) {
      const rect = getRect(p, x, y);
      if (!hasCollision(rect)) {
        return { placement: p, rect, adjustedX: x, adjustedY: y };
      }
    }

    // 2. If all placements collide, push outward along the branch angle
    for (const pushDist of [28, 48]) {
      const pushedX = x + Math.cos(angle) * pushDist;
      const pushedY = y + Math.sin(angle) * pushDist;
      for (const p of placements) {
        const rect = getRect(p, pushedX, pushedY);
        if (!hasCollision(rect)) {
          return { placement: p, rect, adjustedX: pushedX, adjustedY: pushedY };
        }
      }
    }

    // Fallback: use preferred placement with small push
    const finalX = x + Math.cos(angle) * 20;
    const finalY = y + Math.sin(angle) * 20;
    const finalRect = getRect(preferredPlacement, finalX, finalY);
    return { placement: preferredPlacement, rect: finalRect, adjustedX: finalX, adjustedY: finalY };
  }
}
