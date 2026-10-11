import assert from 'assert';
import fs from 'fs';
import path from 'path';

// Read .env
const envPath = path.resolve(process.cwd(), '.env');
let apiKey = '';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/GEMINI_API_KEY=(.*)/);
  if (match) apiKey = match[1].trim();
}

console.log('--- Testing Semantic Restructuring & Misplaced Relationship Correction ---');

if (!apiKey) {
  console.log('⚠ No GEMINI_API_KEY found, skipping live check.');
  process.exit(0);
}

// Case 1: Misplaced grocery task under Tesis with NO other category -> should detach to root (null)
const existingNodesCase1 = [
  { id: 'cat_tesis', title: 'Tesis', type: 'category', parentId: null, directMinutes: 0 },
  { id: 'task_1', title: 'Redactar la metodología', type: 'task', parentId: 'cat_tesis', directMinutes: 45 },
  { id: 'task_2', title: 'Revisar observaciones', type: 'task', parentId: 'cat_tesis', directMinutes: 30 },
  { id: 'task_3', title: 'Comprar alimentos para la semana', type: 'task', parentId: 'cat_tesis', directMinutes: 0 }
];

function buildPrompt(nodes) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  return nodes
    .map(n => {
      const parent = n.parentId ? nodeMap.get(n.parentId) : null;
      const parentInfo = parent
        ? `, nested under parent "${parent.title}" [ID: ${parent.id}]`
        : ', primary stem on central trunk';
      return `- [ID: ${n.id}] "${n.title}" (type: ${n.type}${parentInfo}${n.isProvisional ? ', provisional' : ''})`;
    })
    .join('\n');
}

const systemInstruction = `You are the botanical restructuring intelligence for "Denkel", a living organic tree task manager.
Analyze the current nodes on the tree. Your mission is to evaluate the taxonomy, audit existing relationships, and propose structural improvements.

Do NOT assume existing parent-child relationships are necessarily correct. Users or prior placements may have put tasks under the wrong parent. Treat current relationships as context to be reconsidered.

You must perform two types of actions when appropriate:

1. RELATIONSHIP AUDIT & CORRECTION ("corrections"):
   - Inspect every nested task against its current parent.
   - If a task is clearly MISPLACED (unrelated to its parent, such as "Comprar alimentos para la semana" nested under "Tesis", or "Cambiar aceite del auto" under "Estudio de mercado"):
     - Propose moving it:
       * If another appropriate category already exists on the tree, set "newParentId" to that category's ID.
       * If no appropriate category exists, set "newParentId" to null (detaching it to sprout directly from the central trunk as an independent primary stem).
     - Include a clear botanical reasoning explaining why it was detached or moved.
   - Conservative criteria: Only correct a relationship when there is strong, obvious semantic divergence. Do NOT move tasks that reasonably belong to their parent.

2. LOGICAL PROJECT CLUSTERING ("clusters"):
   - Identify 2 or more independent, provisional, or detached tasks that belong to the same broader endeavor or project (e.g. multiple tasks about "Thesis", "Bicycle Care", "Finances").
   - Propose a unifying category title (1-3 words max) and list the task IDs in "taskIds".
   - Do NOT cluster tasks that are genuinely independent.

Respond ONLY with valid JSON matching this schema:
{
  "corrections": [
    {
      "taskId": string,
      "newParentId": string | null,
      "reasoning": string
    }
  ],
  "clusters": [
    {
      "categoryTitle": string,
      "taskIds": string[],
      "reasoning": string
    }
  ],
  "reasoning": string
}`;

async function queryGemini(nodes) {
  const treeSummary = buildPrompt(nodes);
  const prompt = `Current Tree Taxonomy:\n${treeSummary}\n\nAudit relationships and identify any corrections or logical project clusters:`;

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
  return JSON.parse(text);
}

console.log('Test Case 1: Misplaced task with no matching category (detach to null)');
const resultCase1 = await queryGemini(existingNodesCase1);
assert.ok(Array.isArray(resultCase1.corrections), 'Should return corrections array');
const task3Correction = resultCase1.corrections.find(c => c.taskId === 'task_3');
assert.ok(task3Correction, 'Must identify task_3 as misplaced');
assert.strictEqual(task3Correction.newParentId, null, 'Must detach task_3 to null');
console.log('✔ Case 1 passed: correctly detached to central trunk (newParentId: null)');

console.log('\nTest Case 2: Misplaced task when an appropriate category DOES exist on tree');
const existingNodesCase2 = [
  { id: 'cat_tesis', title: 'Tesis', type: 'category', parentId: null, directMinutes: 0 },
  { id: 'cat_hogar', title: 'Compras y Hogar', type: 'category', parentId: null, directMinutes: 0 },
  { id: 'task_1', title: 'Redactar la metodología', type: 'task', parentId: 'cat_tesis', directMinutes: 45 },
  { id: 'task_2', title: 'Comprar alimentos para la semana', type: 'task', parentId: 'cat_tesis', directMinutes: 0 } // misplaced under Tesis
];

const resultCase2 = await queryGemini(existingNodesCase2);
const task2Correction = resultCase2.corrections.find(c => c.taskId === 'task_2');
assert.ok(task2Correction, 'Must identify task_2 as misplaced');
assert.strictEqual(task2Correction.newParentId, 'cat_hogar', 'Must relocate task_2 to cat_hogar');
console.log('✔ Case 2 passed: correctly relocated to matching category cat_hogar');

console.log('\n✔ ALL TESTS PASSED SUCCESSFULLY!');
