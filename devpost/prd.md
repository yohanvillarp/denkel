---
doc: prd
status: approved
---

# Denkel — Product Requirements

A living, dynamic tree task manager where tasks grow organically as branches, AI semantically manages hierarchy from natural language, and accumulated effort is visibly celebrated rather than lost in a checklist void. Designed for a university student or multi-project thinker managing complex, ongoing responsibilities.
Source: `scope.md > Who It's For` and `scope.md > The Unique Kernel`.

## The Core Journey
Source: `scope.md > The Core Loop`.

1. **First Arrival:** The user arrives at an uncluttered, warm-white screen showing a single seedling trunk at the center and a gentle prompt inviting them to plant their first task.
2. **Planting the Seed:** The user types a natural language task (e.g., *"Draft thesis methodology"*) into the bottom input bar and presses Enter. A one-time germination animation sprouts the trunk into its first branch.
3. **Organic Expansion & Categorization:** As more tasks are entered, the AI interprets semantic relationships:
   - If related to existing nodes, it nests or reparents under existing projects or categories.
   - If entirely unrelated to existing activities (e.g., *"Fix bicycle brakes"* when the tree only contains thesis tasks), the AI creates a **provisional top-level branch** directly off the trunk without prematurely inventing an unnecessary parent category.
   - If a broader umbrella emerges later, the AI reorganizes related branches under a shared organizational category.
4. **Adaptive Exploration (Zoom & LOD):** At overview zoom, major categories and primary project branches display labels; subtasks collapse into compact branch tips to prevent text collisions. Zooming in smoothly reveals detailed subtask titles and node states.
5. **Task Selection & Details:** Selecting any actionable task glides the camera into focus and slides open the right-side details drawer, displaying:
   - Task title, hierarchy breadcrumb path, and lifecycle status picker.
   - **Effort Breakdown:** Displays Total Accumulated Hours, clearly distinguishing **Direct Hours** (logged directly on this node) from **Subtask Hours** (contributed by child branches).
   - **Session History Log:** Displays discrete session entries with dates and durations.
6. **Effort Tracking (Two Modes):**
   - **Mode A (Focus Timer):** Clean transition to Focus Mode with a continuous elapsed-time sweep animation, pause, and finish controls.
   - **Mode B (Manual Entry):** Inline form in the drawer to record past hours and minutes directly.
7. **Active Session Resilience:** If the user reloads or closes the page during an active timer session, the timer's running or paused state and elapsed duration are automatically recovered without losing tracked time.
8. **Visual Effort Reflection:** Finishing a session appends to the history log and visibly thickens the branch. Branch growth reflects earned effort while maintaining independent lifecycle status (Pending bud, In-Progress branch, Completed leaf cluster).
9. **Semantic Search & Navigation:** The user clicks the search icon, types a query in the floating modal, selects a match, and watches the camera smoothly zoom out and glide across the tree to center and highlight that branch.

## Screens and Layout
Source: `scope.md > The POC Boundary`.

Denkel operates across three primary visual surfaces designed to minimize cognitive clutter:

1. **Main Canvas View (The Living Tree):**
   - **Header Bar (Top):** Minimalist. "Denkel" branding on the top-left; subtle Search icon button and Settings icon button on the top-right. No permanent dashboards.
   - **Center Canvas:** The organic tree occupying almost the entire viewport. Smooth curved branches in shades of green on a warm off-white background.
   - **Adaptive Level of Detail (LOD):**
     - *Overview Zoom:* Displays major categories and top-level projects with clean labels; smaller subtasks render as compact branch endings without overlapping text.
     - *Close-up Zoom:* Full task titles, sub-branches, and node icons gracefully fade in as the user zooms into a cluster.
   - **Floating Navigation Controls:** Subtle floating zoom/pan controls (+, -, center view) anchored in a corner.
   - **Floating Task Input Bar (Bottom Center):** Clean, rounded natural language input bar with subtle inline processing feedback during AI analysis.
2. **Task Details Drawer (Right-Hand Slide-Over):**
   - Hidden by default; slides in smoothly when an actionable task is selected.
   - Displays: Task name, hierarchy breadcrumb path, lifecycle status picker (Pending / In Progress / Completed), and child subtasks.
   - **Time Breakdown Display:** Clean breakdown showing Total Effort (e.g. 9h), Direct Node Effort (e.g. 2h), and Subtask Contributed Effort (e.g. 7h).
   - **Session History Log:** Displays discrete session entries with dates and durations (e.g., *"Oct 10: 45m"*, *"Oct 11: 1h 15m"*).
   - **Action Triggers:** "Start Timer", "Log Time Manually", and Status Toggle.
   - *(Note: Selecting an organizational Category displays its grouped sub-projects and hierarchy, but does not display a timer or completion button).*
3. **Focus Mode (The Timer Surface):**
   - Fullscreen serene view inspired by the Stitch design: soft greenish-white background with zero background distractions (tree fades away completely).
   - Centered large circular timer with a continuous rhythmic elapsed-time sweep animation (no artificial countdown or progress percentage).
   - Active timer state persistence: reloading tab seamlessly resumes the timer in its exact state (running or paused).
   - Task title cleanly anchored at the top.
   - Exactly two control buttons: "Pause / Resume" and "Finish".
4. **Floating Search Overlay:**
   - Centered modal dialog invoked via top search button or shortcut (`/` or `Ctrl+K`).
   - Supports exact titles or approximate/semantic descriptions.
   - List of matching results showing task title, parent category/branch, and status badge. Dismisses on selection with camera glide to target.

## Look and Feel
Source: `scope.md > Inspiration & Identity`.

- **Color Palette:**
  - Background: Warm alabaster/off-white (`#fcfbf9` or `#f8f7f4`) transitioning to soft greenish-white in Focus Mode (`#f4f8f5`).
  - Botanical Greens: Deep forest green for main trunks and categories (`#1b4332`), vibrant foliage green for in-progress branches (`#2d6a4f`, `#40916c`), and fresh leaf emerald (`#52b788`, `#74c69d`) for completed foliage.
  - Accent / Buds: Warm amber bud accent (`#d97706`) for pending tasks.
  - Text & Accents: Deep slate charcoal for crisp readability (`#1e293b`), muted sage for secondary metadata (`#64748b`).
- **Typography:** Modern, clean, geometric sans-serif (Inter or Outfit) with generous letter spacing and clear numerical hierarchy for timers.
- **Motion & Physics:** Smooth, organic easing curves. Camera transitions zoom out slightly during long traverses to preserve spatial orientation without disorienting the user.

## Features and Behavior

### Node Taxonomy & Time Rollup Breakdown
Source: `scope.md > The POC Boundary`.

- **Organizational Categories:** Higher-level structural branches (e.g., *"University"*, *"Personal Projects"*).
  - Act purely as structural containers without timers or individual completion checkmarks.
- **Actionable Projects & Tasks:** Actual work activities entered by the user (e.g., *"Thesis Project"*, *"Operationalization Matrix"*).
  - Support timers, manual time logging, session histories, and status toggles.
- **Transparent Effort Rollup:**
  - When a parent project has subtasks, its total effort is displayed as:
    `Total Time = Direct Node Time + Sum(Child Subtask Times)`
  - Example: If *"Thesis Project"* has 2 hours logged directly, *"Operationalization Matrix"* has 3 hours, and *"Theoretical Framework"* has 4 hours, the project clearly reports **9 hours total (2h direct + 7h from subtasks)**.
  - Subtask time is never double-counted into the grand totals or confused with direct parent work.

#### Acceptance Criteria
- [ ] AI categorization assigns structural categories without timer or completion controls.
- [ ] Selecting a parent node with subtasks clearly displays both Direct Hours and Subtask Contributed Hours alongside the total sum.
- [ ] Direct hours logged on a parent branch are never overwritten or erased by child subtask additions.

### Unrelated Tasks & Provisional Top-Level Branches
Source: `scope.md > The Core Loop > Step 2 & 3`.

- **Handling Unrelated Activities:** If a user enters a task with no semantic connection to existing nodes (e.g. entering *"Bicycle Maintenance"* when only academic tasks exist):
  - The AI sprouts a **provisional primary branch** directly from the main trunk.
  - The AI does NOT force-create an unnecessary or speculative parent category (e.g. *"Errands"* or *"Mechanics"*) for a single isolated task.
  - If subsequent related tasks are added later, the AI may then suggest or create a unifying category.

#### Acceptance Criteria
- [ ] Entering an unrelated task sprouts a new primary branch from the trunk without inventing single-item dummy categories.
- [ ] Subsequent tasks can link under this branch or trigger organic categorization if a clear pattern emerges.

### Active Timer State Persistence & Crash Resilience
Source: `scope.md > The POC Boundary`.

- **Session State Preservation:**
  - When a timer session is started, its active state (Task ID, start timestamp, paused/running status, and accumulated active duration) is continuously synchronized to local storage.
  - If the user reloads the page, navigates away, or reopens the browser:
    - If running: The timer calculates elapsed time based on the start timestamp and continues counting seamlessly.
    - If paused: The timer re-renders in the paused state with the exact accumulated duration intact.
  - User can click "Finish" or "Pause/Resume" without any loss of tracked effort.

#### Acceptance Criteria
- [ ] Refreshing the browser while a timer is running restores Focus Mode with accurate elapsed time intact.
- [ ] Refreshing while the timer is paused restores Focus Mode in the paused state with exact paused duration.
- [ ] Clicking "Finish" after a page reload cleanly logs the completed session and updates the branch.

### Tree Scalability & Adaptive Level of Detail (LOD)
Source: `scope.md > The Core Loop`.

- **Clutter Prevention:**
  - *Overview Mode:* Major category and project branches remain clearly visible; minor sub-branches collapse into stylized branch tips without overlapping text labels.
  - *Detail Mode:* Zooming into or selecting a branch cluster smoothly reveals subtask titles, bud indicators, and leaves.
  - *Auto-Spacing:* Branch layout dynamically adjusts angular separation so branches never overlap or collide.

#### Acceptance Criteria
- [ ] At zoomed-out view, branch labels do not collide or overlap; subtasks collapse into clean branch tips.
- [ ] Zooming into a branch cluster smoothly fades in subtask labels and detail nodes.
- [ ] Panning and zooming remain fluid with no jitter or visual stutter.

### Lifecycle States & Decoupled Effort Tracking
Source: `scope.md > The Unique Kernel`.

- **Status & Time Independence:** A task's lifecycle status and its accumulated hours are completely independent:
  1. **Pending (Bud):** Visualized as an unopened rounded bud. Indicates pending status (a task can have logged exploratory hours and still be placed in Pending).
  2. **In Progress (Growing Branch):** Visualized as an active branch with organic bark texture.
  3. **Completed (Developed Branch):** Visualized with sprouted leaf clusters at the branch tip.
- **Effort Accumulation Mechanics:**
  - Branch thickness increases proportionally to accumulated hours across all sessions.
  - Bounded growth: A capped maximum thickness prevents high-hour tasks from warping canvas geometry.
  - Status is never automatically overridden by logging time.

#### Acceptance Criteria
- [ ] A task can hold accumulated hours while remaining in "Pending" status, rendering as an unopened bud with earned branch thickness.
- [ ] Changing status from Pending to In Progress transitions the bud to an active branch tip.
- [ ] Marking a task Complete renders leaf clusters on the branch tip without altering logged hours.
- [ ] Branch thickness scales smoothly with hours up to a defined visual ceiling.

### Floating Search & Camera Navigation
Source: `scope.md > What "Working" Looks Like`.

- **Floating Search Modal:** Invoked via top search icon or shortcut (`/` or `Ctrl+K`).
- **Semantic & Keyword Querying:** Matches task names or descriptive keywords.
- **Guided Camera Glide:** Selecting a search result dismisses modal, smoothly zooms out/glides to target branch, highlights it, and opens its details drawer.

#### Acceptance Criteria
- [ ] Search modal opens on click, filters tasks by query, and shows parent location.
- [ ] Selecting a result guides camera smoothly to the branch and opens the details drawer.

## States and Boundaries

- **First Arrival (Empty State):** Single seedling trunk in center with prompt: *"Plant your first task below..."*. First task triggers brief germination animation into a trunk and branch.
- **Normal Interaction State:** Full tree canvas with zoom/pan, floating input bar, top bar; details drawer closed.
- **Active Focus Session State:** Fullscreen distraction-free timer surface; persists running/paused state across reloads.
- **Input Ambiguity State:** If input matches multiple potential parents (e.g., *"Review notes"*), the input bar displays an inline clarification question before modifying branches.
- **Input Validation State:** Empty Enter displays subtle *"Please enter a task description"*. Gibberish asks for clarification while preserving typed text.
- **Error / Failure State:** If an AI processing error occurs, input text is preserved, tree remains unchanged, and a retry prompt is displayed.
- **Persistence Boundary:** Tasks, categories, session logs, hierarchy, and active timer session persist across browser refreshes via an abstract storage interface implemented locally for the PoC.

## Product Decisions
Source: `scope.md > Product Decisions`.

- **Categories vs. Tasks:** Separated organizational grouping branches (no timers, no completion) from actionable tasks (have timers, sessions, status).
- **Decoupled Status and Time:** A task can have recorded hours in any status (Pending, In Progress, Completed); time does not dictate status.
- **Direct vs Subtask Time Distinction:** Projects display total hours while explicitly breaking down direct effort versus subtask effort, preventing double-counting.
- **Provisional Top-Level Branches:** Unrelated tasks sprout directly from the trunk without force-inventing single-item parent categories.
- **Crash-Resilient Focus Timer:** Active timer state survives browser refreshes and tab closures without data loss.
- **Continuous Elapsed Timer:** Circular indicator animates elapsed time smoothly rather than showing an artificial percentage bar.
- **Adaptive Level of Detail (LOD):** Prevents visual chaos at scale by collapsing labels and twigs at overview zoom and revealing details up close.

## What We're Building
Everything required for the hackathon proof of concept:
1. Warm-white canvas with living tree engine (pan, zoom, LOD label management, branch curves).
2. Category vs Task taxonomy with provisional top-level branches for unrelated tasks.
3. Natural language input bar with AI categorization and strict integrity guards.
4. Three botanical states (Bud for Pending, Growing Branch for In Progress, Leaves for Completed) with time-based bounded thickness.
5. Slide-out task details drawer with direct vs subtask time breakdown, session history log, and manual entry.
6. Serene fullscreen Focus Mode timer with elapsed-time sweep animation and refresh persistence.
7. Floating search modal with smooth camera navigation.
8. Seedling empty state with germination animation.
9. Storage abstraction with local persistence across page reloads.

## Deferred From the POC
- **User accounts & cloud sync:** Kept local for the 2–4 hour hackathon window.
- **Multi-user collaborative trees:** Out of scope for personal task manager PoC.
- **Exportable PDF/CSV timesheets:** Excluded to maintain focus on the living tree experience.
- **Mobile native touch gestures:** Desktop web focused for prototype.

## Possible Later Enhancements
- Visual seasonal cycles (e.g., autumn foliage as projects wrap up).
- Exportable summaries of hours invested across semesters.
- Ambient audio soundscapes in Focus Mode.

## Non-Goals
- **No traditional checklist or kanban table view.**
- **No complex project management gantt charts or dependency blockers.**
- **No background audio alarms or notifications.**

## Open Questions
- None blocking specification. All behavioral journeys, taxonomy rules, persistence states, and acceptance criteria are concrete and testable.
