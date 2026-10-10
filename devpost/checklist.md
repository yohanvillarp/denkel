---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn

## Slices

- [x] **1. Plant tasks on an interactive, pannable living tree canvas**
  Becomes usable: A running web app displaying a seedling trunk on an organic canvas with responsive camera navigation (pan and zoom). Typing a task into the bottom input bar sprouts a new branch with smooth coordinate animation. Tasks and branches persist in local storage across browser refreshes.
  Why now: Bootstraps the project, local storage, HTML5 canvas pipeline, basic camera controls, and position transitions immediately so the foundational visual canvas feels responsive and alive from the very start.
  PRD ref: `prd.md > The Core Journey` (steps 1–2), `prd.md > Screens and Layout` (Main Canvas View)
  Spec ref: `spec.md > Components` (TreeCanvas, CameraController, TaskInputBar), `spec.md > Data Model`, `spec.md > File Structure`, `spec.md > Stack`
  Build: Scaffold React + TypeScript + Vite + Tailwind CSS. Implement `types/task.ts`, `LocalStorageAdapter`, `TaskContext`, `CameraController` (pan and wheel zoom), `TreeRenderer` (seedling trunk, branch curves, smooth tweening), and `TaskInputBar`.
  Verify (mechanical): Run `npm run build` for clean compilation; start Vite dev server, confirm canvas mounts with mouse dragging (pan) and wheel scrolling (zoom); verify submitting a task adds a node to local storage and renders an animated branch that persists on reload.
  Learner check: Open the app in your browser, drag the canvas to pan, scroll to zoom, type a task (e.g., "Draft thesis methodology"), press Enter, and see the branch sprout smoothly on the seedling.
  Commit: `Scaffold app and render living tree canvas with pan zoom and task sprouting`

- [x] **2. Log effort to watch branches visibly grow and mature**
  Becomes usable: Selecting any branch slides open the task details drawer where you can view effort breakdown, start a fullscreen distraction-free focus timer with live circular sweep, or log hours manually. Accumulating time visibly thickens the branch on canvas and evolves it from bud to growing branch. Active timer state survives page refresh.
  Why now: Delivers the unique kernel immediately—making effort tangible and rewarding through organic branch growth rather than letting completed tasks disappear into a void.
  PRD ref: `prd.md > The Core Journey` (steps 5–8), `prd.md > Task Details Drawer`, `prd.md > Distraction-Free Focus Mode`
  Spec ref: `spec.md > Components` (TaskDrawer, FocusTimer, TreeRenderer), `spec.md > Data Model` (SessionLog, ActiveTimerState)
  Build: Implement `TaskDrawer` with breadcrumbs, direct vs subtask hours breakdown, and session history log. Implement `FocusTimer` fullscreen overlay with elapsed seconds counter, circular sweep, pause/resume, and 5-second state autosave. Update `TreeRenderer` to taper branch thickness based on accumulated minutes and transition bud states to growing branches.
  Verify (mechanical): Verify time logging updates `directMinutes` and `sessionHistory` in `LocalStorageAdapter`; verify `ActiveTimerState` is written and restored across unmount/reload; verify `TreeRenderer` scales branch thickness with logged duration.
  Learner check: Click a branch to open its details drawer, start the focus timer for a few seconds or manually log 1 hour, then close the drawer to watch the branch visibly thicken and develop.
  Commit: `Add task details drawer, focus timer, and effort-driven branch growth`

- [ ] **3. Dynamic tree restructuring, category promotion, and layout animation**
  Becomes usable: Direct mechanical operations to create higher-level umbrella categories, reparent existing branches/subtrees, and dynamically recalculate collision-free coordinates via `D3TreeLayoutEngine` with smooth branch transition animations. All task data, parent pointers, and logged hours remain strictly preserved with cycle prevention.
  Why now: Validates the structural mutation and layout transition pipeline independently of any AI logic, ensuring that moving branches and creating parent umbrellas is rock-solid and visually seamless before wiring the LLM.
  PRD ref: `prd.md > The Core Journey` (step 3), `prd.md > Organic Expansion & Categorization`
  Spec ref: `spec.md > Components` (D3TreeLayoutEngine, TreeRenderer, TaskContext), `spec.md > Data Model`
  Build: Implement `D3TreeLayoutEngine` (`d3-hierarchy` coordinate solver). Add context operations to create parent categories, reparent nodes, and validate graph acyclicity. Wire `TreeRenderer` to smoothly interpolate branches from previous coordinates to newly computed layout targets.
  Verify (mechanical): Automated test verifying node reparenting recalculates non-overlapping coordinates, preserves all descendant time logs, rejects circular parent assignments, and triggers smooth position tweening.
  Learner check: Reparent a task under a new or existing category, watching the tree smoothly reconfigure its branches and glide them to their new positions without overlapping or losing data.
  Commit: `Implement tree restructuring, category promotion, and animated layout transitions`

- [ ] **4. AI semantic categorization and safe tree reorganization**
  Becomes usable: Typing natural language tasks automatically categorizes them or reparents related branches using Google Gemini Flash-Lite via a secure local proxy, while the client-side Tree Integrity Guard guarantees no cycles, missing parents, or lost time by driving the validated restructuring engine from Slice 3. Unrelated tasks become clean top-level branches, and offline/keyless environments fall back safely.
  Why now: Now that the underlying tree mutations and animations are proven, the AI can safely drive them via structured JSON without mixing AI interpretation errors with layout engine bugs.
  PRD ref: `prd.md > The Core Journey` (step 3), `prd.md > Natural Language Task Ingestion & AI Restructuring`
  Spec ref: `spec.md > Components` (server/api.ts, AIOrchestrator, TreeIntegrityGuard, GeminiProvider), `spec.md > External Services and Dependencies`
  Build: Implement local server endpoint (`server/api.ts` or Vite proxy middleware) connecting to Gemini Flash-Lite with structured JSON schema. Implement `GeminiProvider`, `LocalFallbackProvider`, `TreeIntegrityGuard`, and wire `TaskInputBar` to trigger AI categorization with fallback safety.
  Verify (mechanical): Execute mock AI categorization payload through `TreeIntegrityGuard` to verify cycle rejection; test `/api/analyze-task` endpoint with fallback verification when key is absent; confirm automated categorization drives the tree reorganization safely.
  Learner check: Type a related subtask (e.g., "Literature review chapter 2") and watch it automatically nest under an existing project branch; type an unrelated task to confirm it creates a distinct branch cleanly without errors.
  Commit: `Integrate Gemini API proxy with integrity guard and automated categorization`

- [ ] **5. Semantic search, guided camera flight, and adaptive detail view**
  Becomes usable: A floating search modal (triggered by `/` or search icon) that finds tasks across the tree and smoothly flies the camera (`flyTo`) to center and highlight the matching branch. Viewport features adaptive Level of Detail (LOD) that collapses subtasks when zoomed out and reveals detailed labels when zoomed in.
  Why now: Builds on the camera navigation from Slice 1 to complete the full core journey, guided exploration, and visual polish for scaling trees.
  PRD ref: `prd.md > The Core Journey` (steps 4, 9), `prd.md > Floating Search & Guided Camera Navigation`, `prd.md > Tree Scalability & Adaptive Level of Detail`
  Spec ref: `spec.md > Components` (CameraController, SearchModal), `spec.md > Look and Feel`
  Build: Implement `CameraController.flyTo` with smooth cubic Bézier easing. Implement `SearchModal` with quick keyboard navigation (`/` shortcut). Implement Level of Detail (LOD) label rendering in `TreeRenderer` based on camera zoom scale.
  Verify (mechanical): Run build and tests; verify `CameraController.flyTo` computes target coordinate trajectories; verify search filter matches title and path; verify LOD label cutoff thresholds trigger at designated zoom levels.
  Learner check: Press `/` to open search, select a task, and watch the camera glide smoothly across the canvas to highlight the branch and open its drawer. Zoom out to see the clean canopy and zoom in to inspect details.
  Commit: `Add guided camera flight, search modal, and adaptive level of detail`

## Hands-on Checkpoints

- [x] Early usable behavior explored — Slice 2 (living tree with effort logging and branch growth)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [what actually happened; real document/test/code references; unfinished work if interrupted]
Route and stops: [actual paths and symbols; guided stops completed, or reference-only route]
Edit outcome: [tried/kept/reverted/declined/not applicable; verification if changed]
Reflection: [offered/answered/declined/already covered — personal answer belongs only in the ignored profile]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions
