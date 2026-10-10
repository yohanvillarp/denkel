---
doc: spec
status: approved
---

# Denkel — Technical Spec

A dynamic, living tree task manager built with React, TypeScript, Vite, and Tailwind CSS. Employs a dedicated Canvas 2D botanical visualization engine (with decoupled camera control and D3-hierarchy coordinate layout), a lightweight local backend proxy keeping the Gemini API key secure, a modular AI provider interface targeting `gemini-3.5-flash-lite` with strict integrity validation, and an abstracted local storage repository.

## How This Works, In Plain Language
When you open Denkel, the browser loads a clean React application. At the center is an HTML5 `<canvas>` element managed by a dedicated visualization system. Instead of jamming everything into one giant file, the tree is split into three independent specialists:
1. **The Camera (`CameraController`):** Remembers where your screen is looking, lets you drag to pan and scroll to zoom, and flies smoothly to focus on specific tasks.
2. **The Layout Specialist (`D3TreeLayoutEngine`):** Uses mathematical hierarchy algorithms (from `d3-hierarchy`) to compute exact, collision-free `(x, y)` targets for every branch, whether you have 3 tasks or 50.
3. **The Painter (`TreeRenderer`):** Takes those targets and draws smooth, organic Bézier curves, variable bark thickness based on logged hours, unopened buds, and leaf clusters at 60 frames per second. When the layout changes, it smoothly glides branches from their old positions to their new targets.

When you type a task into the natural language bar:
- The frontend sends your input and a summary of your current tree to a **local backend proxy endpoint** (`/api/analyze-task`).
- The local server securely holds your `GEMINI_API_KEY` in a local `.env` file (never exposed to the browser) and sends a structured output request to **Gemini Flash-Lite** (`gemini-3.5-flash-lite`).
- When the result arrives, a client-side **Tree Integrity Guard** checks the AI's proposal before anything touches your tree: it verifies that all parent IDs exist, no loops or circular links are created, no existing tasks or logged hours are deleted, and no phantom tasks are added.
- If the local server is offline or no API key is configured, a **Conservative Fallback** safely registers your task as a provisional primary branch directly off the trunk, waiting for future categorization without guessing wildly.

Your tasks, categories, individual session logs, and active timer state live behind a **Storage Adapter** that writes to local browser storage, keeping the data safe across refreshes and ready to swap for a cloud database later.

## The Core Journey Through the System
Implements `prd.md > The Core Journey`.

1. **Initial Boot & Empty Seedling:** React mounts `App.tsx`. The `StorageAdapter` loads saved data. If empty, `TreeRenderer` renders the single seedling trunk on `<canvas>` with an invitation prompt (`prd.md > First Arrival`).
2. **Task Ingestion:** User types *"Draft thesis methodology"* into `TaskInputBar.tsx` (`prd.md > Planting the Seed`). The input component sets a local analyzing state (subtle shimmer).
3. **Secure Proxy & AI Categorization:** `TaskInputBar` calls `AIOrchestrator.ts`. The orchestrator calls the local proxy (`POST /api/analyze-task`). The proxy forwards the request to Gemini Flash-Lite with a strict JSON schema.
4. **Integrity Validation:** When the proxy returns the JSON proposal, `TreeIntegrityGuard.ts` strictly validates the structural graph (verifying no circular references, existing parent existence, and zero time loss).
5. **Layout Calculation & Animated Sprouting:** The validated structure updates `TaskContext.tsx`. `D3TreeLayoutEngine` calculates new target coordinates. `TreeRenderer` animates a bud sprouting along the branch curve, while `CameraController` glides the viewport to center on the new node.
6. **Details Drawer & Session Selection:** `TaskDrawer.tsx` slides in from the right. It queries `TaskContext` to show title, breadcrumbs, status picker, session history list, and total effort (distinguishing direct hours from subtask hours).
7. **Focus Mode (Work Session):** Clicking "Start Timer" mounts `FocusTimer.tsx` fullscreen (`prd.md > Mode A (Focus Timer)`). The timer ticks seconds and animates a continuous circular sweep. Active session state is synced to `StorageAdapter` every 5 seconds.
8. **Session Completion:** User clicks "Finish". Elapsed duration is committed as a new `SessionLog` entry. `FocusTimer` unmounts, revealing the tree canvas. The branch thickens to reflect earned effort.
9. **Floating Search Navigation:** User presses `/` or clicks the search icon. `SearchModal.tsx` opens. Typing a query matches task names or keywords. Clicking a match dismisses the modal, and `CameraController.flyTo(targetX, targetY)` smoothly zooms out and glides across the tree, opening `TaskDrawer`.

## Stack
- **Frontend Framework:** React 18 / 19 with TypeScript.
  - *Rationale:* Component modularity for overlays, slide-overs, and timer screens with full type safety across domain models.
- **Build Tool & Bundler:** Vite.
  - *Rationale:* Instant hot-module replacement and integrated development server.
  - *Docs:* [Vite Documentation](https://vite.dev/)
- **Backend API Proxy:** Lightweight local Node.js / Vite server middleware (`server/api.ts`).
  - *Rationale:* Securely houses `GEMINI_API_KEY` in `.env` without exposing keys in frontend code or client bundles.
- **Styling:** Tailwind CSS.
  - *Rationale:* Rapid, consistent utility styling for the warm-white aesthetic, glassmorphic drawers, and serene timer surface.
  - *Docs:* [Tailwind CSS Documentation](https://tailwindcss.com/)
- **Layout Math:** `d3-hierarchy` (`d3.tree`).
  - *Rationale:* Mathematical guarantee of zero branch overlap in $O(N)$ time, used strictly as a decoupled coordinate solver without rendering DOM elements.
  - *Docs:* [d3-hierarchy Documentation](https://d3js.org/d3-hierarchy)
- **Rendering:** HTML5 Canvas 2D (`CanvasRenderingContext2D`).
  - *Rationale:* 60 FPS organic Bézier curve rendering, dynamic line width tapering, custom leaf/bud sprites, and smooth tweening.
- **Icons:** `lucide-react`.
  - *Rationale:* Clean, minimalist botanical and navigation iconography.
- **AI Model:** Google Gemini Flash-Lite (`gemini-3.5-flash-lite` / `gemini-2.0-flash`).
  - *Rationale:* Ultra-low latency, affordable token cost, and reliable support for structured JSON schema outputs.

## Where It Runs and How Someone Tries It
- **Runtime:** Standard desktop web browser (Chrome, Edge, Firefox, Safari).
- **Environment:** Node.js (v18+) with a local `.env` file containing `GEMINI_API_KEY`.
- **Startup Command:**
  ```bash
  npm install
  npm run dev
  ```
  Starts the local development server and API proxy at `http://localhost:5173`.
- **Hackathon Submission:** Demo video (60–90 seconds) recorded from the local browser screen, submitted alongside the public GitHub repository. No mandatory external hosting is required to review or verify the project.

## Look and Feel
Implements `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`.

- **Canvas Background:** Warm alabaster (`#fcfbf9`).
- **Focus Mode Background:** Serene greenish-white (`#f4f8f5`).
- **Botanical Palette:**
  - Trunk / Primary categories: Deep forest green (`#1b4332`).
  - In-progress branches: Rich foliage green (`#2d6a4f`, `#40916c`).
  - Completed leaf clusters: Leaf emerald (`#52b788`).
  - Pending buds: Warm amber (`#d97706`).
  - Text & Accents: Charcoal slate (`#1e293b`), muted secondary text (`#64748b`).
- **Typography:** Inter or Outfit (`sans-serif`), clean numerical display for timer readouts (`tabular-nums font-mono`).
- **Organic Motion:** Smooth cubic Bézier easing for camera flights and coordinate tweening (duration: ~500ms).

## Components

### 1. `TreeCanvas.tsx`
Implements `prd.md > Screens and Layout > Main Canvas View`.
- React wrapper hosting the `<canvas>` DOM element.
- Instantiates `CameraController`, `D3TreeLayoutEngine`, and `TreeRenderer`.
- Binds pointer and wheel events to `CameraController`.
- Listens to canvas resize and triggers responsive canvas buffer adjustments.
- Triggers node selection callback `onSelectTask(taskId)` on click.

### 2. `CameraController.ts`
Implements `prd.md > Floating Search & Guided Camera Navigation`.
- Maintains viewport camera state: `panX`, `panY`, `zoom`.
- Converts screen coordinates `(clientX, clientY)` to world space coordinates `(worldX, worldY)` for hit testing.
- Implements `flyTo(targetX, targetY, targetZoom)` with smooth cubic bezier or spring interpolation (zooms out slightly on long traverses, then zooms into target).

### 3. `D3TreeLayoutEngine.ts`
Implements `prd.md > Tree Scalability & Adaptive Level of Detail (LOD)`.
- Implements `ITreeLayoutEngine`.
- Builds a `d3.hierarchy` tree from domain nodes.
- Executes `d3.tree().nodeSize([dx, dy])` to calculate non-overlapping target positions for all categories, projects, and subtasks.
- Emits a map of `nodeId -> { targetX, targetY }`.

### 4. `TreeRenderer.ts`
Implements `prd.md > Living Tree Visualization & Branch States`.
- Runs a 60 FPS animation loop on `CanvasRenderingContext2D`.
- Interpolates each node's `(currentX, currentY)` toward `(targetX, targetY)`.
- Draws curved cubic Bézier branches with thickness proportional to accumulated hours (clamped to max ceiling).
- Renders unopened buds for "Pending" tasks and green leaf clusters for "Completed" tasks.
- Implements Level of Detail (LOD): checks `camera.zoom` to suppress subtask labels when zoomed out, rendering full text when zoomed in.

### 5. `TaskInputBar.tsx`
Implements `prd.md > Natural Language Task Ingestion & AI Restructuring`.
- Floating bottom input bar.
- Dispatches raw text to `AIOrchestrator`.
- Displays subtle inline loading animation while awaiting AI analysis.
- Displays inline clarification prompts if AI signals ambiguity.

### 6. `TaskDrawer.tsx`
Implements `prd.md > Task Details Drawer (Slide-Over)`.
- Slides in smoothly from viewport right when a task node is selected.
- Displays breadcrumbs, title, status picker, and subtasks.
- Displays Total Effort, explicitly separating **Direct Hours** from **Subtask Hours**.
- Displays discrete session entries in the **Session History Log**.
- Contains triggers for "Start Timer", "Log Time Manually" (inline form), and status updates.

### 7. `FocusTimer.tsx`
Implements `prd.md > Distraction-Free Focus Mode`.
- Fullscreen distraction-free timer view.
- Central circular canvas/SVG with rhythmic elapsed-time sweep indicator.
- Controls: "Pause / Resume" and "Finish".
- Syncs running/paused state to `StorageAdapter` for refresh resilience.

### 8. `SearchModal.tsx`
Implements `prd.md > Floating Semantic Search`.
- Centered floating search modal invoked by button or keyboard shortcut.
- Filters tasks by title and parent path.
- Clicking a result dismisses modal and calls `cameraController.flyTo()`.

### 9. `server/proxy.ts` (Local API Proxy)
Implements Secure AI Key Handling.
- Lightweight local backend route (`/api/analyze-task`).
- Loads `GEMINI_API_KEY` from local `.env`.
- Invokes Gemini API with structured JSON output schema.
- Keeps credentials completely hidden from client bundle.

## Data Model

```typescript
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export type NodeType = 'category' | 'project' | 'task';

export interface SessionLog {
  id: string;
  startTime: string; // ISO date
  durationMinutes: number;
  note?: string;
}

export interface TaskNode {
  id: string;
  title: string;
  type: NodeType; // 'category' | 'project' | 'task'
  parentId: string | null;
  status: TaskStatus; // independent of hours
  directMinutes: number; // minutes logged directly to this node
  sessionHistory: SessionLog[];
  isProvisional?: boolean; // created without AI category confirmation
  createdAt: string;
  updatedAt: string;
}

export interface ActiveTimerState {
  taskId: string;
  startTime: number; // Unix timestamp
  accumulatedSeconds: number;
  isPaused: boolean;
}
```

### Data Lifecycles & Persistence
- **Storage Location:** Browser LocalStorage via `LocalStorageAdapter` implementing `IStorageAdapter`.
- **Updates:** Any task creation, time logging, or status change writes immediately to the adapter.
- **Active Timer Recovery:** `ActiveTimerState` is written every 5 seconds and on state changes; refreshing restores the exact timer view and elapsed seconds seamlessly.

## File Structure

```
denkel/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .env.example               # GEMINI_API_KEY=your_key_here
├── server/
│   └── api.ts                 # Local backend proxy for Gemini requests
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── types/
│   │   ├── task.ts            # TaskNode, SessionLog, NodeType, TaskStatus
│   │   └── ai.ts              # AI Provider interfaces & result schemas
│   ├── services/
│   │   ├── storage/
│   │   │   ├── IStorageAdapter.ts
│   │   │   └── LocalStorageAdapter.ts
│   │   └── ai/
│   │       ├── IAIProvider.ts
│   │       ├── GeminiProvider.ts       # Calls /api/analyze-task
│   │       ├── LocalFallbackProvider.ts
│   │       ├── TreeIntegrityGuard.ts
│   │       └── AIOrchestrator.ts
│   ├── tree/
│   │   ├── ITreeLayoutEngine.ts
│   │   ├── D3TreeLayoutEngine.ts
│   │   ├── CameraController.ts
│   │   └── TreeRenderer.ts
│   ├── components/
│   │   ├── TreeCanvas.tsx
│   │   ├── Header.tsx
│   │   ├── TaskInputBar.tsx
│   │   ├── TaskDrawer.tsx
│   │   ├── FocusTimer.tsx
│   │   ├── SearchModal.tsx
│   │   └── SettingsModal.tsx
│   └── context/
│       └── TaskContext.tsx     # Global tree state & storage syncing
└── devpost/                   # Hackathon learning documents
    ├── learner-profile.md
    ├── scope.md
    ├── scope.html
    ├── prd.md
    ├── prd.html
    ├── spec.md
    └── spec.html
```

## External Services and Dependencies
- **Google Gemini API:**
  - *Model:* `gemini-3.5-flash-lite` (or latest Gemini Flash-Lite).
  - *Integration:* Invoked server-side via local proxy (`/api/analyze-task`).
  - *Payload:* Current tree taxonomy summary + new task text; requests structured JSON matching `AICategorizationResult`.
  - *Keys:* `GEMINI_API_KEY` stored exclusively in local `.env` on backend.
  - *Cost/Rate Limit:* Free tier available on Google AI Studio.
  - *Documentation:* [Gemini API Docs](https://ai.google.dev/docs)
- **Local Fallback:**
  - Runs with zero external network requests when proxy or key is unavailable, assigning new tasks as provisional top-level branches safely without guessing.

## Important Failure Modes
1. **AI API Unavailable / Network Timeout:**
   - *Fallback:* `AIOrchestrator` catches the timeout and seamlessly falls back to `LocalFallbackProvider`, registering the task as a provisional branch with a subtle notice (*"Saved locally as provisional branch"*). Zero data loss; user flow is never interrupted.
2. **AI Returns Malformed or Invalid Hierarchy:**
   - *Fallback:* `TreeIntegrityGuard` detects cyclic links or missing parents, rejects the modification, logs the anomaly, and sprouts the task as a safe provisional branch.
3. **Browser Refresh During Active Timer Session:**
   - *Fallback:* `App.tsx` reads `ActiveTimerState` from `StorageAdapter` on mount. If an active session exists, it immediately restores `FocusTimer.tsx` with accurate elapsed time intact.

## What Was Simplified and Why
- **Single AI Model with Modular Interface:** Focused initially on `gemini-3.5-flash-lite` to ensure rapid validation of structured outputs, while retaining the `IAIProvider` interface for zero-friction provider swaps later.
- **Local Server Proxy instead of Frontend Keys:** Built a lightweight local API proxy into the dev server to keep secrets out of client-side code and browser bundles.
- **Local Storage Adapter instead of Cloud PostgreSQL/Neon:** Used local browser storage behind `IStorageAdapter` to eliminate backend setup and authentication overhead for the hackathon proof of concept.
- **D3-Hierarchy Coordinate Engine instead of Full D3 DOM Binding:** Used `d3-hierarchy` purely as a mathematical layout calculator and paired it with HTML5 Canvas 2D for high-performance organic rendering without DOM bloat.
- **Conservative Fallback instead of Complex Offline NLP:** When offline, Denkel assigns provisional branches without guessing, preventing incorrect structural assumptions.

## Decisions and Open Issues
- **Decisions Made:**
  - **Framework:** React + TypeScript + Vite + Tailwind CSS.
  - **Backend Proxy:** Local Node/Vite endpoint keeping `GEMINI_API_KEY` in local `.env`.
  - **AI Model:** `gemini-3.5-flash-lite` via `IAIProvider` with strict `TreeIntegrityGuard` validation.
  - **Visualization:** HTML5 Canvas 2D with decoupled `CameraController`, `D3TreeLayoutEngine`, and `TreeRenderer`.
  - **Node Taxonomy:** Explicit split between `category` (structural only) and `project`/`task` (actionable with timers and status).
  - **Timer:** Elapsed time sweep with 5-second persistence interval.
- **Open Issues:**
  - None blocking. All interfaces, data structures, and component responsibilities are fully specified.
