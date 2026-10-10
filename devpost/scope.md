---
doc: scope
status: approved
---

# Denkel

A dynamic, living tree task manager that uses AI to semantically structure tasks and visualize accumulated effort over time.

## The Unique Kernel
Instead of tasks disappearing into completed checklists that undervalue your effort, Denkel visualizes work as an organic living tree where branches grow and develop based on accumulated time, while AI dynamically organizes and reorganizes the hierarchy from natural language input.

## Who It's For
A university student managing multiple simultaneous responsibilities—such as a thesis, coursework, personal projects, and daily tasks—who struggles with the overhead of manual categorization and feels unrewarded by conventional to-do apps where finished work simply vanishes.

## The Core Loop
1. Open the app to view the living tree.
2. Enter a task in plain natural language with zero manual categorization.
3. AI analyzes relationships to existing activities under strict constraints (no circular links, no duplicate nodes, stable IDs, never loses recorded time) and creates or reparents branches.
4. Smooth camera focus moves to the branch and opens the task details panel. The user inspects task info and chooses between starting the live timer or manually logging time.
5. Log effort (via live timer or manual entry) and see the branch visually reflect the effort spent (transitioning from bud to growing), retaining that growth even if the task remains unfinished.

## Inspiration & Identity
- **Metaphor:** Organic botanical growth—buds (not started), growing branches (in progress with accumulated time), fully developed branches (completed).
- **Tone & Feel:** Calm, rewarding, fluid, and uncluttered. Smooth camera transitions and visual branch evolution that celebrate effort rather than rushed task churn.

## Why This Matters to the Learner
"I use task managers quite often, but honestly, they don't really give me a sense of accomplishment. Tasks simply disappear or end up on a 'completed' list, making everything you've achieved feel less meaningful. Also, they don't usually take into account the hours and minutes spent on each task... I want users to open the app and say, 'Wow, I spent so much time on this, and I actually did it!'"

## What "Working" Looks Like
A crisp 60–90 second screen recording demonstrating:
1. Entering a natural language task (e.g., "Operationalization Matrix") and watching the AI semantically link or reparent it under "Thesis Project" without losing any existing task data or creating cycles.
2. Smooth camera flight focusing on the newly created/updated branch and opening the task details panel.
3. Choosing an action: launching the focused work timer (with live elapsed time, pause, and finish) or manually entering logged hours.
4. Completing the time log and watching the camera pull back as the branch visibly evolves to reflect the accumulated work time.
5. Searching for a previous task in the search bar and watching the camera glide smoothly to locate and highlight that branch.

## The POC Boundary
- **In Scope:**
  - Natural language task creation with AI semantic categorization and constrained tree re-branching (node stability, cycle prevention, zero phantom tasks, preserved time records).
  - Interactive visual tree view with smooth camera transitions and branch lifecycle states (bud, growing, developed).
  - Task details panel with explicit choices to launch a live focused timer or manually log time.
  - Focused timer screen (elapsed time, pause, finish) recording session time back to the branch.
  - Manual time entry dialog for retrospective time logging.
  - Search bar with automatic camera navigation to matching branches.
  - Pluggable storage abstraction layer (storage adapter interface implemented with LocalStorage for the PoC) so persistence can be swapped without architectural refactoring.

## Later
- Cloud sync and user account authentication (swapping in a cloud storage adapter).
- Multi-user collaboration and shared project trees.
- Exportable time analytics and external calendar integrations.
- Mobile native touch optimizations.

## Explicitly Cut
- **Backend database / auth infrastructure:** Cut to avoid setup friction and keep the PoC fast, private, and local for the 2–4 hour hackathon target.
- **Background notifications / audio alarms:** Cut to keep the timer implementation lightweight and cleanly self-contained in-tab.
