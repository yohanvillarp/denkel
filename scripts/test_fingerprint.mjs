import assert from 'assert';

function computeTreeStructureFingerprint(taskList) {
  return taskList
    .map(t => `${t.id}:${t.parentId || 'root'}:${t.type}:${t.title.trim().toLowerCase()}:${t.isProvisional ? 'prov' : 'done'}`)
    .sort()
    .join('|');
}

console.log('--- Testing Tree Structure Fingerprint & Review Gating ---');

const task1 = { id: 't1', title: 'Task 1', type: 'task', parentId: null, isProvisional: false };
const task2 = { id: 't2', title: 'Task 2', type: 'task', parentId: null, isProvisional: false };

// 1. Initial 2 tasks, not yet reviewed
let lastReviewedFingerprint = null;
let currentTasks = [task1, task2];

function hasPendingStructuralReview(tasks, reviewedFp) {
  if (tasks.length < 2) return false;
  if (tasks.some(t => t.isProvisional)) return true;
  if (!reviewedFp) return true;
  return computeTreeStructureFingerprint(tasks) !== reviewedFp;
}

assert.strictEqual(hasPendingStructuralReview(currentTasks, lastReviewedFingerprint), true, 'Should need review when never reviewed');
console.log('✔ Needs review on initial unreviewed tasks');

// 2. Mark as reviewed
lastReviewedFingerprint = computeTreeStructureFingerprint(currentTasks);
assert.strictEqual(hasPendingStructuralReview(currentTasks, lastReviewedFingerprint), false, 'Should be false when reviewed');
console.log('✔ Option hidden when reviewed');

// 3. User logs time or changes note - structure does NOT change!
const task1WithEffort = { ...task1, directMinutes: 120, sessionHistory: [{ durationMinutes: 60 }] };
const tasksWithEffort = [task1WithEffort, task2];
assert.strictEqual(hasPendingStructuralReview(tasksWithEffort, lastReviewedFingerprint), false, 'Logging time does NOT trigger review');
console.log('✔ Logging time does not trigger unnecessary review');

// 4. A provisional task is added in offline fallback
const task3Prov = { id: 't3', title: 'Task 3', type: 'task', parentId: null, isProvisional: true };
const tasksWithProv = [...currentTasks, task3Prov];
assert.strictEqual(hasPendingStructuralReview(tasksWithProv, lastReviewedFingerprint), true, 'Provisional task triggers review');
console.log('✔ Provisional/fallback task triggers review');

// 5. Structure changes manually (e.g. reparenting)
const task2Reparented = { ...task2, parentId: 't1' };
const tasksReparented = [task1, task2Reparented];
assert.strictEqual(hasPendingStructuralReview(tasksReparented, lastReviewedFingerprint), true, 'Manual reparenting triggers review');
console.log('✔ Structural changes trigger review');

// 6. Gemini reviews and confirms no changes needed -> clears provisional and updates fingerprint
const tasksReviewedNoChanges = tasksWithProv.map(t => ({ ...t, isProvisional: false }));
lastReviewedFingerprint = computeTreeStructureFingerprint(tasksReviewedNoChanges);
assert.strictEqual(hasPendingStructuralReview(tasksReviewedNoChanges, lastReviewedFingerprint), false, 'After review, option disappears');
console.log('✔ After Gemini review, option disappears completely');
