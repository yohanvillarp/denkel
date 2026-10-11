import { IncomingMessage, ServerResponse } from 'http';

interface AnalyzeRequestBody {
  input: string;
  existingNodes: Array<{
    id: string;
    title: string;
    type: 'category' | 'project' | 'task';
    parentId: string | null;
    directMinutes: number;
    isProvisional?: boolean;
  }>;
}

interface ReorganizeRequestBody {
  existingNodes: Array<{
    id: string;
    title: string;
    type: 'category' | 'project' | 'task';
    parentId: string | null;
    directMinutes: number;
    isProvisional?: boolean;
  }>;
}

function readRequestBody(req: IncomingMessage, timeoutMs = 4000): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    const timer = setTimeout(() => {
      reject(new Error('Request body stream read timed out'));
    }, timeoutMs);

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      clearTimeout(timer);
      resolve(body);
    });

    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function handleAnalyzeTask(
  req: IncomingMessage,
  res: ServerResponse,
  apiKey?: string
): Promise<void> {
  // Always ensure JSON header
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  let bodyStr = '';
  try {
    bodyStr = await readRequestBody(req, 4000);
  } catch (err: any) {
    console.warn('[handleAnalyzeTask] Body read error:', err.message);
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Could not read request body.' }));
    return;
  }

  let payload: AnalyzeRequestBody;
  try {
    payload = JSON.parse(bodyStr || '{}');
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Invalid JSON request body.' }));
    return;
  }

  const { input, existingNodes = [] } = payload;
  const rawInput = (input || '').trim();
  if (!rawInput) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Missing input text for task analysis.' }));
    return;
  }

  // Graceful fallback if no Gemini API key is configured
  if (!apiKey || !apiKey.trim()) {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        fallback: true,
        reason: 'NO_API_KEY',
        result: {
          action: 'create_top_level',
          taskTitle: rawInput,
          targetParentId: null,
          reparentExistingTaskIds: [],
          reasoning: 'Saved directly as a provisional branch on the central trunk.',
          confidence: 1.0,
          isFallback: true
        }
      })
    );
    return;
  }

  // Prepare taxonomy context for Gemini prompt
  const treeSummary = existingNodes.length === 0
    ? 'Tree is currently empty (only central trunk exists).'
    : existingNodes
        .map(
          n =>
            `- [ID: ${n.id}] "${n.title}" (type: ${n.type}${n.parentId ? `, child of ID: ${n.parentId}` : ', primary stem'}${n.isProvisional ? ', provisional' : ''})`
        )
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
"${rawInput}"

Determine the optimal placement according to the botanical taxonomy rules:`;

  // Tested working model for this key
  const models = ['gemini-3.5-flash-lite', 'gemini-2.5-flash'];
  let geminiResult: any = null;
  let lastError = '';

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        lastError = `Gemini API (${model}) HTTP ${response.status}: ${errorText.substring(0, 150)}`;
        console.warn(`[handleAnalyzeTask] ${lastError}`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        geminiResult = JSON.parse(rawText);
        break; // Successfully got JSON result
      }
    } catch (err: any) {
      lastError = err?.name === 'AbortError' ? `Timeout calling ${model} (>6s)` : err?.message || String(err);
      console.warn(`[handleAnalyzeTask] Warning with ${model}:`, lastError);
    }
  }

  if (geminiResult && geminiResult.action && geminiResult.taskTitle) {
    const reparentIds = Array.isArray(geminiResult.reparentExistingTaskIds)
      ? geminiResult.reparentExistingTaskIds.filter((id: any) => typeof id === 'string')
      : [];

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        success: true,
        result: {
          action: geminiResult.action,
          taskTitle: String(geminiResult.taskTitle).trim(),
          targetParentId: geminiResult.targetParentId || null,
          newCategoryTitle: geminiResult.newCategoryTitle ? String(geminiResult.newCategoryTitle).trim() : undefined,
          reparentExistingTaskIds: reparentIds,
          reasoning: geminiResult.reasoning || 'Planted naturally by Denkel botanical intelligence.',
          confidence: typeof geminiResult.confidence === 'number' ? geminiResult.confidence : 0.85,
          isFallback: false
        }
      })
    );
    return;
  }

  // Graceful fallback if Gemini timed out, returned non-JSON, or failed
  console.warn('[handleAnalyzeTask] Falling back to safe top-level stem due to:', lastError);
  res.statusCode = 200;
  res.end(
    JSON.stringify({
      fallback: true,
      reason: 'API_ERROR_OR_TIMEOUT',
      error: lastError,
      result: {
        action: 'create_top_level',
        taskTitle: rawInput,
        targetParentId: null,
        reparentExistingTaskIds: [],
        reasoning: 'Saved safely as a provisional branch on the central trunk.',
        confidence: 0.7,
        isFallback: true
      }
    })
  );
}

export async function handleReorganizeTree(
  req: IncomingMessage,
  res: ServerResponse,
  apiKey?: string
): Promise<void> {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  let bodyStr = '';
  try {
    bodyStr = await readRequestBody(req, 4000);
  } catch (err: any) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Could not read request body.' }));
    return;
  }

  let payload: ReorganizeRequestBody;
  try {
    payload = JSON.parse(bodyStr || '{}');
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Invalid JSON request body.' }));
    return;
  }

  const { existingNodes = [] } = payload;
  if (!apiKey || !apiKey.trim() || existingNodes.length < 2) {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        fallback: true,
        result: {
          clusters: [],
          reasoning: existingNodes.length < 2 ? 'Need at least 2 tasks to evaluate reorganization.' : 'No API key configured.',
          isFallback: true
        }
      })
    );
    return;
  }

  const nodeMap = new Map(existingNodes.map(n => [n.id, n]));
  const treeSummary = existingNodes
    .map(n => {
      const parent = n.parentId ? nodeMap.get(n.parentId) : null;
      const parentInfo = parent
        ? `, nested under parent "${parent.title}" [ID: ${parent.id}]`
        : ', primary stem on central trunk';
      return `- [ID: ${n.id}] "${n.title}" (type: ${n.type}${parentInfo}${n.isProvisional ? ', provisional' : ''})`;
    })
    .join('\n');

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

  const prompt = `Current Tree Taxonomy:\n${treeSummary}\n\nAudit relationships and identify any corrections or logical project clusters:`;

  const models = ['gemini-3.5-flash-lite', 'gemini-2.5-flash'];
  let geminiResult: any = null;

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: 'application/json', temperature: 0.1 }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          geminiResult = JSON.parse(rawText);
          break;
        }
      }
    } catch {
      // Continue to next model
    }
  }

  if (geminiResult && (Array.isArray(geminiResult.clusters) || Array.isArray(geminiResult.corrections))) {
    const corrections = Array.isArray(geminiResult.corrections)
      ? geminiResult.corrections.filter((c: any) => c && typeof c.taskId === 'string')
      : [];
    const clusters = Array.isArray(geminiResult.clusters)
      ? geminiResult.clusters.filter((cl: any) => cl && typeof cl.categoryTitle === 'string' && Array.isArray(cl.taskIds))
      : [];

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        success: true,
        result: {
          corrections,
          clusters,
          reasoning: geminiResult.reasoning || 'Taxonomy audit and clustering completed.',
          isFallback: false
        }
      })
    );
    return;
  }

  res.statusCode = 200;
  res.end(
    JSON.stringify({
      fallback: true,
      result: {
        corrections: [],
        clusters: [],
        reasoning: 'Reorganization completed without automatic clusters.',
        isFallback: true
      }
    })
  );
}
