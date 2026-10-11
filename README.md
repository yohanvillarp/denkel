# Denkel 🌿

> **A dynamic, hierarchical task manager visualized as a living botanical tree.**  
> Built for the Devpost *Build With AI: Basics* hackathon.

Instead of traditional to-do lists where completed items simply disappear into a void, **Denkel** turns your work into an evolving, organic tree. Tasks sprout as buds, mature into branches, thicken with accumulated focus time, and bloom as leaves when completed.

---

## ✨ Features

- **Living Canvas Visualization:** An interactive HTML5 Canvas with smooth continuous cursor-anchored zoom, responsive drag panning, and natural tapered wood grain.
- **Effort-Driven Growth:** Accumulating work sessions visibly thickens branch stems logarithmically (`Math.log1p(minutes)`). Track sessions using the fullscreen distraction-free focus timer (with circular sweep and autosave) or log hours manually.
- **Dynamic Organic Hierarchy:** Powered by `d3-hierarchy`, branches emerge naturally along primary trunk slots and fan out with collision-free label placements. Sub-branches and parent categories transition smoothly with migration tweening.
- **AI Semantic Categorization & Restructuring:** Natural language task inputs are intelligently categorized using **Google Gemini 2.5 Flash-Lite**. Contextual reorganization recognizes cross-stream relationships and corrects miscategorized branches.
- **Tree Integrity Guard:** A client-side guard verifies acyclicity, parent validity, and preserves all historical time logs before applying any structural mutations.
- **Offline & Keyless Fallback:** Operates seamlessly offline. If no Gemini API key is configured or network fails, a deterministic local fallback creates clean top-level branches without interruption.
- **Guided Camera Flight & Adaptive Level of Detail (LOD):** Quick floating search modal (`/` or `Ctrl+K` / `⌘K`) with smooth cubic Bézier flight navigation (`flyTo`). Viewport-aware projection frames categories and tasks inside the visible canvas (excluding the drawer), while adaptive LOD collapses labels into clean branch tips when zoomed out.

---

## 🛠️ Tech Stack

- **Core & UI:** React 18, TypeScript, Tailwind CSS
- **Visualization:** Custom 2D Canvas rendering engine with `d3-hierarchy` coordinate layout
- **Icons & Design:** Lucide React, Plus Jakarta Sans, JetBrains Mono, Inter
- **AI Engine:** Google Gemini 2.5 Flash-Lite via Vite server middleware proxy (`server/api.ts`)
- **Build Tooling:** Vite 6, PostCSS, Autoprefixer

---

## 📂 Project Structure

```
denkel/
├── server/
│   └── api.ts                   # Gemini API proxy handlers & streaming parser
├── src/
│   ├── components/
│   │   ├── FocusTimer.tsx       # Distraction-free focus timer with circular sweep
│   │   ├── Header.tsx           # Minimal botanical header & search trigger pill
│   │   ├── SearchModal.tsx      # Keyboard-navigable floating search modal
│   │   ├── TaskDrawer.tsx       # Details drawer: timer, session logs, sub-branches
│   │   ├── TaskInputBar.tsx     # Natural language task ingestion & AI reorg trigger
│   │   └── TreeCanvas.tsx       # Canvas wrapper, camera handlers & viewport controls
│   ├── context/
│   │   └── TaskContext.tsx      # Reactive task state, active timer & camera dispatch
│   ├── services/
│   │   ├── ai/                  # AI Orchestrator, Gemini provider & Integrity Guard
│   │   └── storage/             # LocalStorage adapter with camera & timer persistence
│   ├── tree/
│   │   ├── CameraController.ts  # Smooth zoom, pan, and cubic Bézier flyTo math
│   │   ├── D3TreeLayoutEngine.ts# D3 hierarchy coordinate calculation & collision solver
│   │   └── TreeRenderer.ts      # Canvas 2D engine: trunk, branches, buds, LOD pills
│   └── types/                   # TypeScript schemas for tasks, sessions, and AI
├── devpost/                     # Devpost Learn planning docs, checklist & app map
├── scripts/                     # Mechanical verification test scripts
├── .env.example                 # Example environment variables template
└── vite.config.ts               # Vite configuration with integrated API proxy middleware
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.x or later recommended)
- `npm` (comes with Node.js)

### 1. Clone the Repository

```bash
git clone https://github.com/yohanvillarp/denkel.git
cd denkel
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure the Gemini API Key (Optional)

Denkel works completely offline out of the box using its built-in local fallback engine. To enable live AI semantic categorization and tree reorganization with Gemini:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Obtain a free Google Gemini API key from [Google AI Studio](https://aistudio.google.com/).
3. Open `.env` and paste your key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

*(Note: `.env` is ignored by Git in `.gitignore` and is never committed.)*

### 4. Start the Local Development Server

```bash
npm run dev
```

Open your browser at **`http://localhost:5173`** to use Denkel.

---

## 🧪 Verification & Build Scripts

- **`npm run dev`**: Starts the local Vite development server with hot module reloading and the integrated Gemini proxy middleware.
- **`npm run build`**: Runs TypeScript type checking (`tsc`) and compiles the production bundle via Vite.
- **`npm run preview`**: Serves the production build locally for verification.
- **`node scripts/verify_slice5.mjs`**: Runs the standalone Node.js verification script testing camera flight interpolation, search matching, LOD thresholds, and visible viewport projection math.

---

## 🗺️ App Map & Architecture Reference

For an interactive, standalone visual architecture guide tracing task ingestion from input to canvas rendering, open:

```
devpost/app-map.html
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
