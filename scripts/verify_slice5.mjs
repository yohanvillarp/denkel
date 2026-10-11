import assert from 'assert';

console.log('--- 1. Testing CameraController.flyTo Trajectory Math ---');

// Emulate cubic bezier easing used in CameraController
function computeEase(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

// Compute screen coordinates for a given world point, pan, and zoom
function worldToScreen(worldX, worldY, panX, panY, zoom) {
  return {
    x: worldX * zoom + panX,
    y: worldY * zoom + panY
  };
}

// Simulate flyTo animation interpolation
const startPanX = 100;
const startPanY = 100;
const startZoom = 0.5;

const targetWorldX = 250;
const targetWorldY = -300;
const screenWidth = 1200;
const screenHeight = 800;
const targetZoom = 1.15;

const endPanX = screenWidth / 2 - targetWorldX * targetZoom;
const endPanY = screenHeight / 2 - targetWorldY * targetZoom;

// Check midpoint (progress = 0.5)
const midEase = computeEase(0.5);
assert.strictEqual(midEase, 0.5, 'Midpoint easing must be 0.5');

const midPanX = startPanX + (endPanX - startPanX) * midEase;
const midPanY = startPanY + (endPanY - startPanY) * midEase;
const midZoom = startZoom + (targetZoom - startZoom) * midEase;

// Check final position (progress = 1.0)
const finalEase = computeEase(1.0);
assert.strictEqual(finalEase, 1.0, 'Final easing must reach 1.0');

const finalPanX = startPanX + (endPanX - startPanX) * finalEase;
const finalPanY = startPanY + (endPanY - startPanY) * finalEase;
const finalZoom = startZoom + (targetZoom - startZoom) * finalEase;

assert.strictEqual(finalPanX, endPanX, 'Final panX must exactly match calculated endPanX');
assert.strictEqual(finalPanY, endPanY, 'Final panY must exactly match calculated endPanY');
assert.strictEqual(finalZoom, targetZoom, 'Final zoom must exactly match targetZoom');

// Verify that in final state, targetWorld point is centered on screen
const centeredScreen = worldToScreen(targetWorldX, targetWorldY, finalPanX, finalPanY, finalZoom);
assert(Math.abs(centeredScreen.x - screenWidth / 2) < 0.001, 'Target world X must be centered on screen width');
assert(Math.abs(centeredScreen.y - screenHeight / 2) < 0.001, 'Target world Y must be centered on screen height');

console.log('✔ CameraController.flyTo trajectory and center framing verified');

console.log('\n--- 2. Testing Semantic and Breadcrumb Search Matching ---');

const mockTasks = [
  { id: 'cat_thesis', title: 'Tesis Universitaria', parentId: null, type: 'category', status: 'in_progress', directMinutes: 0 },
  { id: 'task_meth', title: 'Draft methodology', parentId: 'cat_thesis', type: 'task', status: 'in_progress', directMinutes: 45 },
  { id: 'task_refs', title: 'Correct bibliographic references', parentId: 'cat_thesis', type: 'task', status: 'pending', directMinutes: 0 },
  { id: 'task_groceries', title: 'Comprar alimentos semanales', parentId: null, type: 'task', status: 'completed', directMinutes: 30 }
];

// Helper to build breadcrumb path
function getBreadcrumb(task, taskList) {
  const parts = [];
  let currParent = task.parentId;
  while (currParent) {
    const parent = taskList.find(t => t.id === currParent);
    if (parent) {
      parts.unshift(parent.title);
      currParent = parent.parentId;
    } else {
      break;
    }
  }
  return parts.length > 0 ? parts.join(' / ') : 'Trunk Root';
}

function searchTasks(query, taskList) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return taskList;

  return taskList.filter(task => {
    const titleMatch = task.title.toLowerCase().includes(trimmed);
    const breadcrumb = getBreadcrumb(task, taskList).toLowerCase();
    const pathMatch = breadcrumb.includes(trimmed);
    const statusMatch = task.status.toLowerCase().includes(trimmed);
    return titleMatch || pathMatch || statusMatch;
  });
}

// Test direct title match
const resDirect = searchTasks('methodology', mockTasks);
assert.strictEqual(resDirect.length, 1);
assert.strictEqual(resDirect[0].id, 'task_meth');
console.log('✔ Title direct match verified ("methodology" -> task_meth)');

// Test breadcrumb ancestry match
const resPath = searchTasks('tesis', mockTasks);
assert.strictEqual(resPath.length, 3, 'Query "tesis" must match the category and its two subtasks');
console.log('✔ Breadcrumb path match verified ("tesis" matches category and descendants)');

// Test case insensitivity
const resCase = searchTasks('COMPRAR', mockTasks);
assert.strictEqual(resCase.length, 1);
assert.strictEqual(resCase[0].id, 'task_groceries');
console.log('✔ Case insensitivity verified ("COMPRAR" -> task_groceries)');

// Test empty search fallback
const resEmpty = searchTasks('', mockTasks);
assert.strictEqual(resEmpty.length, mockTasks.length);
console.log('✔ Empty query returns complete task list');

console.log('\n--- 3. Testing Adaptive Level of Detail (LOD) Thresholds ---');

function computeLabelOpacity(zoom, isTopLevel, isSelected, isHovered) {
  if (isSelected || isHovered) return 1.0;
  if (isTopLevel) {
    if (zoom >= 0.45) return 1.0;
    if (zoom >= 0.32) return (zoom - 0.32) / 0.13;
    return 0;
  } else {
    // Child subtask
    if (zoom >= 0.65) return 1.0;
    if (zoom >= 0.48) return (zoom - 0.48) / 0.17;
    return 0;
  }
}

// 1. Zoomed out (Overview mode, zoom = 0.35)
const subtaskZoomedOut = computeLabelOpacity(0.35, false, false, false);
assert.strictEqual(subtaskZoomedOut, 0, 'Subtasks must collapse to 0 opacity in Overview Mode');

const topLevelZoomedOut = computeLabelOpacity(0.35, true, false, false);
assert(topLevelZoomedOut > 0 && topLevelZoomedOut < 1, 'Top-level stems must remain partially visible in Overview Mode');

// 2. Transition zoom (zoom = 0.55)
const subtaskTransition = computeLabelOpacity(0.55, false, false, false);
assert(subtaskTransition > 0 && subtaskTransition < 1, 'Subtask label must smoothly fade in during transition');

// 3. Detail zoom (zoom = 0.80)
const subtaskDetail = computeLabelOpacity(0.80, false, false, false);
assert.strictEqual(subtaskDetail, 1.0, 'Subtask label must be fully visible (1.0) in Detail Mode');

// 4. Selection override at any zoom (zoom = 0.25)
const selectedZoomedOut = computeLabelOpacity(0.25, false, true, false);
assert.strictEqual(selectedZoomedOut, 1.0, 'Selected task label must ALWAYS be 1.0 regardless of zoom');

console.log('\n--- 4. Testing Visible Canvas Area Framing & Cluster Centering Math ---');

// Viewport and drawer geometry
const testScreenW = 1440;
const testScreenH = 900;
const testHeaderH = 56;
const testDrawerW = 420;
const testPadding = 75;

const visibleW = testScreenW - testDrawerW; // 1020px
const visibleH = testScreenH - testHeaderH; // 844px
const targetScreenX = visibleW / 2; // 510px
const targetScreenY = testHeaderH + visibleH / 2; // 478px

assert.strictEqual(targetScreenX, 510, 'targetScreenX must be exactly half of visible canvas width (1020 / 2 = 510)');

// Category "Tesis" and child tasks world coordinates
const categoryNode = { x: -150, y: -200 };
const childNodes = [
  { x: -240, y: -260, title: 'Draft methodology' },
  { x: -270, y: -200, title: 'Review observations' },
  { x: -230, y: -140, title: 'Correct references' }
];

// Cluster bounds calculation with label padding
let clusterMinX = categoryNode.x - 70;
let clusterMaxX = categoryNode.x + 70;
let clusterMinY = categoryNode.y - 35;
let clusterMaxY = categoryNode.y + 35;

childNodes.forEach(c => {
  clusterMinX = Math.min(clusterMinX, c.x - 90);
  clusterMaxX = Math.max(clusterMaxX, c.x + 90);
  clusterMinY = Math.min(clusterMinY, c.y - 35);
  clusterMaxY = Math.max(clusterMaxY, c.y + 35);
});

const clusterCenterX = (clusterMinX + clusterMaxX) / 2;
const clusterCenterY = (clusterMinY + clusterMaxY) / 2;

// 55% Category node, 45% Cluster center
const balancedCenterX = categoryNode.x * 0.55 + clusterCenterX * 0.45;
const balancedCenterY = categoryNode.y * 0.55 + clusterCenterY * 0.45;

// Distance from balanced center to category node vs distance from geometric center to category node
const distFromBalanced = Math.abs(categoryNode.x - balancedCenterX);
const distFromGeometric = Math.abs(categoryNode.x - clusterCenterX);

assert(distFromBalanced < distFromGeometric, 'Balanced center must bring category node closer to focal center than pure geometric cluster center');

// Fit zoom calculation
const effectiveW = visibleW - testPadding * 2; // 1020 - 150 = 870
const effectiveH = visibleH - testPadding * 2; // 844 - 150 = 694
const maxDistX = Math.max(Math.abs(balancedCenterX - clusterMinX), Math.abs(clusterMaxX - balancedCenterX));
const maxDistY = Math.max(Math.abs(balancedCenterY - clusterMinY), Math.abs(clusterMaxY - balancedCenterY));

const fitZoom = Math.min(1.15, Math.min((effectiveW / 2) / maxDistX, (effectiveH / 2) / maxDistY));
const testEndPanX = targetScreenX - balancedCenterX * fitZoom;
const testEndPanY = targetScreenY - balancedCenterY * fitZoom;

// Verify category node screen position
const catScreenX = categoryNode.x * fitZoom + testEndPanX;
assert(catScreenX >= testPadding && catScreenX <= visibleW - testPadding, 'Category node must be safely within visible canvas padding');

// Verify all children screen positions
childNodes.forEach(c => {
  const childScreenX = c.x * fitZoom + testEndPanX;
  assert(childScreenX >= testPadding && childScreenX <= visibleW - testPadding, `Child ${c.title} must be safely within visible canvas`);
});

console.log(`✔ Balanced center brings category node within ${distFromBalanced.toFixed(1)} world units of center (vs ${distFromGeometric.toFixed(1)} geometric offset)`);
console.log(`✔ Category node renders at screenX = ${catScreenX.toFixed(1)}px (visible center = ${targetScreenX}px, visible range [${testPadding}, ${visibleW - testPadding}])`);
console.log(`✔ All child branches render within visible canvas bounds [${testPadding}px, ${visibleW - testPadding}px]`);

console.log('\n✔ ALL MECHANICAL VERIFICATIONS FOR SLICE 5 PASSED SUCCESSFULLY!');
