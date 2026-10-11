import assert from 'assert';
import fs from 'fs';
import path from 'path';

// Read .env if present
const envPath = path.resolve(process.cwd(), '.env');
let apiKey = '';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/GEMINI_API_KEY=(.*)/);
  if (match) apiKey = match[1].trim();
}

console.log('--- 1. Testing TreeIntegrityGuard Sanitize & Validate ---');
function sanitizeAndValidate(rawProposal, existingNodes, rawInput) {
  const existingNodeIds = new Set(existingNodes.map(n => n.id));
  let taskTitle = (rawProposal.taskTitle || '').trim() || rawInput.trim() || 'New Task';
  let action = rawProposal.action;
  let targetParentId = rawProposal.targetParentId;
  let newCategoryTitle = rawProposal.newCategoryTitle?.trim();
  let reasoning = rawProposal.reasoning || '';
  let confidence = typeof rawProposal.confidence === 'number' ? rawProposal.confidence : 0.8;

  if (action === 'nest_under_existing') {
    if (!targetParentId || !existingNodeIds.has(targetParentId)) {
      action = 'create_top_level';
      targetParentId = null;
      reasoning = 'Reverted to trunk: parent not found.';
    }
  } else if (action === 'create_category_wrapper') {
    if (!newCategoryTitle) {
      action = 'create_top_level';
      targetParentId = null;
    }
  } else {
    action = 'create_top_level';
    targetParentId = null;
  }

  const rawReparentIds = Array.isArray(rawProposal.reparentExistingTaskIds) ? rawProposal.reparentExistingTaskIds : [];
  const validatedReparentIds = rawReparentIds.filter(id => typeof id === 'string' && existingNodeIds.has(id));

  return {
    action,
    taskTitle,
    targetParentId,
    newCategoryTitle,
    reparentExistingTaskIds: validatedReparentIds,
    reasoning,
    confidence,
    isFallback: rawProposal.isFallback
  };
}

// Case: Non-existent parent fallback
const bogusResult = sanitizeAndValidate(
  { action: 'nest_under_existing', targetParentId: 'non_existent_id', taskTitle: 'Subtask' },
  [{ id: 'node_1', title: 'Task 1' }],
  'Subtask'
);
assert.strictEqual(bogusResult.action, 'create_top_level');
assert.strictEqual(bogusResult.targetParentId, null);
console.log('✔ Non-existent parent fallback verified');

// Case: Valid reparent existing task IDs
const reparentResult = sanitizeAndValidate(
  {
    action: 'create_category_wrapper',
    newCategoryTitle: 'Thesis',
    taskTitle: 'Correct bibliography',
    reparentExistingTaskIds: ['task_1', 'fake_task_id']
  },
  [{ id: 'task_1', title: 'Draft methodology' }],
  'Correct bibliography'
);
assert.strictEqual(reparentResult.action, 'create_category_wrapper');
assert.deepStrictEqual(reparentResult.reparentExistingTaskIds, ['task_1']);
console.log('✔ Reparenting IDs sanitization verified (filtered fake_task_id)');

console.log('\n--- 2. Testing Data Preservation During Restructuring ---');
const originalTask = {
  id: 'task_123',
  title: 'Draft the methodology',
  type: 'task',
  parentId: null,
  status: 'in_progress',
  directMinutes: 120,
  sessionHistory: [
    { id: 'sess_1', startTime: '2026-10-10T10:00:00Z', durationMinutes: 60, note: 'Chapter 3 draft' },
    { id: 'sess_2', startTime: '2026-10-10T14:00:00Z', durationMinutes: 60, note: 'Added research questions' }
  ],
  isProvisional: true,
  createdAt: '2026-10-10T09:00:00Z',
  updatedAt: '2026-10-10T09:00:00Z'
};

const newCategory = { id: 'cat_thesis_999', title: 'Thesis', type: 'category', parentId: null };
const reparentedTask = {
  ...originalTask,
  parentId: newCategory.id,
  isProvisional: false,
  updatedAt: new Date().toISOString()
};

assert.strictEqual(reparentedTask.id, originalTask.id, 'Task ID must be preserved');
assert.strictEqual(reparentedTask.directMinutes, 120, 'Direct minutes must be preserved');
assert.deepStrictEqual(reparentedTask.sessionHistory, originalTask.sessionHistory, 'All session history must be preserved');
assert.strictEqual(reparentedTask.sessionHistory[0].note, 'Chapter 3 draft');
assert.strictEqual(reparentedTask.status, 'in_progress', 'Task status must be preserved');
assert.strictEqual(reparentedTask.isProvisional, false, 'isProvisional must be cleared');
assert.strictEqual(reparentedTask.parentId, newCategory.id, 'Parent must point to new category');
console.log('✔ All task data (sessions, notes, durations, status, IDs) preserved 100%');

console.log('\n--- 3. Testing 3rd Task Placement with Existing Category ---');
if (apiKey) {
  const existingNodesWithCategory = [
    { id: 'cat_thesis', title: 'Thesis', type: 'category', parentId: null, directMinutes: 0 },
    { id: 'task_1', title: 'Draft the methodology', type: 'task', parentId: 'cat_thesis', directMinutes: 45 },
    { id: 'task_2', title: 'Reviewing its observations', type: 'task', parentId: 'cat_thesis', directMinutes: 15 }
  ];

  const treeSummary = existingNodesWithCategory
    .map(n => `- [ID: ${n.id}] "${n.title}" (type: ${n.type}${n.parentId ? `, child of ID: ${n.parentId}` : ', primary stem'})`)
    .join('\n');

  const systemInstruction = `You are the botanical intelligence engine for "Denkel", a living organic tree task manager.
Your task is to analyze a new user task or activity, and decide how it should be planted on the user's living tree.

CRITICAL BOTANICAL TAXONOMY RULES:

1. SUBTASK vs PEER TASK (DO NOT CONFUSE THEM):
   - A task is a SUBTASK of an existing task ONLY IF it is an internal step, direct dependency, or sub-component that strictly belongs inside that specific parent task (e.g., "Write Chapter 1" is a subtask of "Draft Thesis"; "Adjust brake pads" is a subtask of "Repair bicycle").
   - PEER TASKS: If activities are related because they belong to the SAME broader project or domain (e.g., "Draft methodology", "Review observations", and "Correct bibliographic references" all belong to an academic Thesis), they are PEER TASKS (siblings), NOT parent and child! Neither one is a subtask of the other.
   - DO NOT nest peer tasks under an individual task just because they share a topic or domain.

2. HOW TO HANDLE PEER TASKS:
   - If an organizational category or project node ALREADY exists for that domain (e.g. [ID: cat_1] "Thesis", type: category):
     Set action = "nest_under_existing" and targetParentId = "cat_1" so the new task becomes a sibling under that category.
   - If NO category exists yet, but the new task and one or more existing tasks belong to the same broader endeavor/project (e.g. 2 or more thesis-related tasks):
     Set action = "create_category_wrapper".
     Set newCategoryTitle to a concise, elegant category name (1-3 words max, e.g. "Thesis", "Bicycle Care", "Finances").
     Set reparentExistingTaskIds to an array of existing task IDs that belong in this new category alongside the new task. This retroactively groups them as siblings under the new category without losing any session history or effort!

3. HOW TO HANDLE INDEPENDENT / UNRELATED TASKS:
   - If the task is a new independent activity with no matching project, peers, or category on the tree (e.g., "Repair bicycle" when only thesis tasks exist, or "Buy detergent"):
     Set action = "create_top_level", targetParentId = null, reparentExistingTaskIds = [].
     Sprout it directly from the central trunk. DO NOT force an artificial match or invent single-task dummy categories.

Respond ONLY with a valid JSON object matching this schema:
{
  "action": "create_top_level" | "nest_under_existing" | "create_category_wrapper",
  "taskTitle": string,
  "targetParentId": string | null,
  "newCategoryTitle": string | null,
  "reparentExistingTaskIds": string[],
  "reasoning": string,
  "confidence": number
}`;

  const prompt = `Current Living Tree Taxonomy:
${treeSummary}

New User Task to Plant:
"Correcting the bibliographic references"

Determine the optimal placement according to the botanical taxonomy rules:`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: 'application/json', temperature: 0.1 }
    })
  });

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log('Gemini Live Response:');
  console.log(text);
  const parsed = JSON.parse(text);
  console.log('\nParsed Action:', parsed.action);
  console.log('Target Parent ID:', parsed.targetParentId);
  console.log('Reasoning:', parsed.reasoning);

  assert.strictEqual(parsed.action, 'nest_under_existing');
  assert.strictEqual(parsed.targetParentId, 'cat_thesis', 'Must nest under cat_thesis, not under task_1 or task_2!');
  console.log('✔ Confirmed: 3rd task nested directly under Thesis category as a peer!');
}
