# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- In Progress

## Current Goal

- Feature spec 30+ (next up)

## Completed

- Boilerplate cleanup (globals.css, page.tsx, removed SVGs)
- lucide-react installed
- lib/utils.ts with cn() helper created
- shadcn/ui configured (components.json, radix-nova style)
- All shadcn components added: Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea
- Feature spec 01 (design system) complete
- Feature spec 02 (editor): components/editor/editor-navbar.tsx and
  components/editor/project-sidebar.tsx created; dialog pattern ready for
  future use
- Feature spec 03 (auth): Clerk provider, sign-in/sign-up pages, proxy.ts
  route protection, `/` redirect logic, UserButton in editor navbar
- Feature spec 04 (project dialogs): editor home screen (EditorHome), Create/
  Rename/Delete dialogs (ProjectDialogs), useProjectDialogs hook, sidebar
  project items with owner-only rename/delete actions, mobile backdrop scrim,
  live slug preview. Mock data (lib/projects.ts) only, no persistence.
- Feature spec 05 (prisma): Project + ProjectCollaborator models in
  prisma/models/project.prisma (multi-file schema; prisma.config schema now
  points at the prisma/ folder), ProjectStatus enum (DRAFT/ARCHIVED),
  lib/prisma.ts cached singleton branching on DATABASE_URL (prisma+postgres://
  -> Accelerate, else @prisma/adapter-pg), first migration
  20260706085933_init applied, client generated. `npm run build` passes.
- Feature spec 06 (project APIs): backend REST route handlers —
  app/api/projects/route.ts (GET list current user's projects ordered by
  createdAt desc; POST create, name defaults to "Untitled Project", cuid id)
  and app/api/projects/[projectId]/route.ts (PATCH rename, DELETE). Clerk
  userId as ownerId; 401 when unauthenticated, 404 when missing, 403 for
  non-owner mutations. Backend-only, UI not wired. `npm run build` passes.

- Feature spec 07 (wire editor home): app/editor/page.tsx is now an async
  server component fetching owned + shared projects via lib/projects-data.ts
  (getOwnedProjects/getSharedProjects) and passing both to EditorShell (client)
  → sidebar; no client fetch on initial load. hooks/use-project-actions.ts
  manages dialog state + mutations: create builds a room ID (slug + short
  suffix via buildRoomId/generateRoomSuffix) sent as the project id so id and
  room ID stay aligned, then navigates to /editor/[id]; rename PATCHes +
  router.refresh(); delete redirects to /editor if deleting the active
  workspace else router.refresh(). Create dialog previews the room ID. POST
  /api/projects now accepts an optional explicit id. Old use-project-dialogs
  hook and mock project arrays removed. `npm run build` passes.

- Feature spec 08 (editor workspace shell): app/editor/[roomId]/page.tsx server
  component with access checks (redirect /sign-in when unauth; AccessDenied for
  missing/unauthorized). lib/project-access.ts (getCurrentIdentity +
  getAccessibleProject by owner/collaborator), components/editor/access-denied
  .tsx (lock icon, message, link to /editor), workspace-navbar (project name,
  Share + AI-sidebar toggle), workspace-shell composing the existing
  ProjectSidebar (current room highlighted via currentProjectId) + dark canvas
  placeholder + collapsible right AI sidebar placeholder. No canvas/Liveblocks/
  AI/share logic yet. `npm run build` passes; /editor/[roomId] registered.

- Feature spec 09 (share dialog): components/editor/share-dialog.tsx opened from
  the workspace navbar Share button (WorkspaceNavbar gained an onShare prop;
  WorkspaceShell owns the isShareOpen state and passes canManage={project.owned}).
  Owners can invite by email, see the collaborator list, remove collaborators,
  and copy the project link (/editor/[id]) with temporary "Copied!" feedback;
  collaborators get a read-only list (no invite/remove/copy). Backend:
  app/api/projects/[projectId]/collaborators/route.ts — GET (owner or
  collaborator may view; reports isOwner), POST (owner-only invite, idempotent
  upsert on the projectId_email unique, email validated + lowercased), DELETE
  (owner-only remove by email). lib/collaborators.ts enrichCollaborators() uses
  clerkClient().users.getUserList({ emailAddress }) to add name + avatar,
  falling back to email-only when no Clerk user matches or the lookup throws. No
  local user table added. `npm run build` passes; collaborators route
  registered.

- Feature spec 10 (Liveblocks setup): realtime infra configured. liveblocks
  .config.ts types Presence (cursor: {x,y}|null, isThinking) and UserMeta (id +
  info{ name, avatar, color }). lib/liveblocks.ts holds a lazily-created cached
  node client (getLiveblocks() — lazy because the Liveblocks constructor
  validates the secret eagerly, which broke build page-data collection) plus
  getUserColor() mapping a user ID deterministically into a fixed 10-color
  palette. app/api/liveblocks-auth/route.ts (POST): Clerk auth (401), reads the
  room from the body (room ID = project ID), verifies access via
  getAccessibleProject (403 when denied), getOrCreateRoom({defaultAccesses:[]})
  to ensure the room exists, then prepareSession with userInfo {name (Clerk
  fullName → email → "Anonymous"), avatar (Clerk imageUrl), color} and
  FULL_ACCESS to that room. NOTE: @liveblocks/node was NOT actually installed
  (spec claim was wrong) — installed @^3.22.0 to match the other liveblocks
  packages. LIVEBLOCKS_SECRET_KEY added (empty) to .env.local — must be filled
  from the Liveblocks dashboard before the auth route works at runtime. No
  client Room provider wired yet. `npm run build` passes.

- Feature spec 11 (base canvas): replaced the workspace canvas placeholder with
  a Liveblocks-backed React Flow canvas. components/editor/canvas.tsx (client):
  Canvas wrapper sets up LiveblocksProvider (authEndpoint /api/liveblocks-auth) +
  RoomProvider (id = project.id, initialPresence { cursor: null }) wrapped in a
  local CanvasErrorBoundary (class component — Liveblocks/react-error-boundary
  export none) and ClientSideSuspense (Loading canvas… fallback). Inner
  FlowCanvas uses useLiveblocksFlow<CanvasNode, CanvasEdge>({ suspense: true,
  nodes/edges initial: [] }) and feeds synced nodes/edges + onNodesChange/
  onEdgesChange/onConnect/onDelete into ReactFlow with ConnectionMode.Loose,
  fitView, colorMode dark, hideAttribution, plus <Cursors/>, <MiniMap/>, and a
  dots <Background/>. CSS: @xyflow/react + @liveblocks/react-flow styles imported.
  types/canvas.ts holds CanvasNodeData (label, color, shape + index signature),
  CanvasNodeShape, CANVAS_NODE_TYPE "canvasNode" / CANVAS_EDGE_TYPE "canvasEdge",
  and CanvasNode/CanvasEdge. workspace-shell.tsx renders <Canvas roomId=
  {project.id}/> in place of the placeholder. NOTE: made Presence.isThinking
  optional in liveblocks.config.ts so initial presence can be { cursor: null }
  per spec (isThinking is an unused AI-feature field until later). No controls,
  custom node/edge rendering, persistence, or AI yet (out of scope). `npm run
  build` passes. (Machine note: C: was 100% full mid-task — cleared npm cache to
  free ~16 GB before the build could run.)

- Feature spec 12 (shape panel): drag shapes onto the canvas to create nodes.
  components/editor/shape-panel.tsx — floating pill toolbar at bottom-center
  (absolute, pointer-events-none wrapper / pointer-events-auto pill), six
  draggable icon buttons (rectangle=RectangleHorizontal 160x90, diamond 140x140,
  circle 110x110, pill 160x64, cylinder 120x140, hexagon 150x120 — rects wider
  than tall, circle square, diamond slightly larger). onDragStart writes a
  ShapeDragPayload { shape, width, height } to dataTransfer under SHAPE_DRAG_TYPE
  ("application/ghost-shape"). components/editor/canvas-node.tsx —
  CanvasNodeRenderer: basic bordered rectangle filling the node box, label
  centered, borderColor from data.color, four source Handles (all shapes render
  the same for now). canvas.tsx: FlowCanvas now wraps FlowCanvasInner in
  ReactFlowProvider so useReactFlow().screenToFlowPosition works; wrapper div
  gets onDragOver (dropEffect move) + onDrop. onDrop parses the payload,
  converts screen→canvas coords (centered under cursor), builds a CanvasNode
  (id = `${shape}-${Date.now()}-${counter++}` via counterRef, type canvasNode,
  width/height + matching style, data { label:"", color: DEFAULT_NODE_COLOR
  #64B5F6, shape }) and applies it via onNodesChange([{ type:"add", item }]).
  nodeTypes = { canvasNode: CanvasNodeRenderer } at module scope; passed to
  ReactFlow. types/canvas.ts gained the six-shape CanvasNodeShape union,
  DEFAULT_NODE_COLOR, SHAPE_DRAG_TYPE, and ShapeDragPayload. No shape-specific
  visuals yet (all render as rectangles). `npm run build` passes.

- Feature spec 13 (node shape rendering + drag preview): replaced the
  placeholder rectangle renderer with real shape variants and a ghost drag
  preview. New components/editor/canvas-shape.tsx exports CanvasShape({ shape,
  color, selected?, label? }) — the single source of truth for drawing a shape,
  shared by the node renderer and the drag preview. Rectangle/pill/circle are
  CSS boxes (border-radius: rectangle 0.5rem, pill+circle 9999px); diamond/
  hexagon/cylinder are SVGs on a 0 0 100 100 viewBox with
  preserveAspectRatio="none" so they stretch to any node size, and
  vectorEffect="non-scaling-stroke" so the border stays uniform (cylinder =
  body-fill path + sides/bottom-rim path + top-rim ellipse). Fill is
  neutral-900/80; border is subtle at rest (color at 50% alpha via withAlpha,
  2px) and brightens when selected (full color, 2.5px, + drop-shadow glow).
  canvas-node.tsx now reads NodeProps.selected and renders CanvasShape (Handles
  unchanged, still all four sides). shape-panel.tsx adds off-screen ghost
  elements (one CanvasShape per shape at its drop width/height, fixed at
  left:-9999px); handleDragStart calls dataTransfer.setDragImage(ghost,
  width/2, height/2) so the cursor carries a shape preview centered under it —
  browser hides it automatically on drop/cancel. No resize/label-editing, no
  shape-panel layout or drop-handler changes (out of scope). `npm run build`
  passes.

- Feature spec 14 (node resizing + inline label editing): canvas-node.tsx
  (CanvasNodeRenderer) now overlays two editing affordances on the shape.
  Resize: a `<NodeResizer isVisible={selected}>` with MIN_NODE_SIZE=48 min
  width/height, subtle neutral-600 (#525252) 8px rounded handles + faint lines
  to match the dark canvas; drag-resize dispatches dimension changes through
  the existing onNodesChange pipeline (so Liveblocks syncs dimensions). Label
  editing: double-click anywhere on the node opens a centered textarea pinned
  over the label (absolute inset-0 flex-center px-3, same slot the shape draws
  its label in — no layout shift); CanvasShape is passed label="" while editing
  so only the textarea shows. Local `draft` state updates as you type; commit on
  blur via useReactFlow().updateNodeData(id,{label}) (which flows through
  onNodesChange as a replace change → Liveblocks sync); Escape cancels/reverts;
  a useEffect mirrors remote label edits into draft when not editing, another
  focuses+selects on open. `nodrag`/`nopan` on the textarea stop text
  interactions from dragging the node or panning the canvas. Empty nodes show a
  centered "Double-click to add label" neutral-600 placeholder in the same
  position. No shape-rendering, shape-panel, drag-preview, or drop-handler
  changes (out of scope). `npm run build` passes.

- Feature spec 15 (node color toolbar): selected nodes get a floating swatch
  toolbar to change their background + paired text color. ui-context.md has no
  real node palette (still the template) and global.css only holds shadcn
  tokens, so per spec the palette lives in types/canvas.ts: NodeColorPair
  ({ id, background, text }) + NODE_COLORS (6 dark tinted surfaces with vivid
  paired text: slate/sky/emerald/amber/rose/violet) + DEFAULT_NODE_COLOR_PAIR
  (slate). CanvasNodeData gained `textColor`; `color` is now the background/fill
  (was the border accent). canvas-shape.tsx: dropped the fixed SHAPE_FILL const —
  fill = background, and the label/border/selection-glow use textColor (subtle
  at rest via withAlpha, bright when selected); label span color set inline.
  New components/editor/node-color-toolbar.tsx wraps xyflow <NodeToolbar
  position=Top offset=12 isVisible={selected}> and renders one Swatch per pair;
  a swatch fills with the background, shows an "A" in the text color, gets a
  bright ring when active (matched by background equality), and a tight
  text-color glow on hover (boxShadow 0 0 6px 0, no spread). nodrag/nopan on the
  toolbar + onPointerDown/onClick stopPropagation on swatches keep interactions
  from dragging the node or panning. Selecting a swatch calls
  useReactFlow().updateNodeData(id,{color,textColor}) → onNodesChange replace →
  Liveblocks sync (no server calls). canvas-node.tsx renders the toolbar and
  passes background/textColor to CanvasShape; the editing textarea now colors
  text with data.textColor too. canvas.tsx onDrop and shape-panel.tsx drag
  preview updated to the pair model (DEFAULT_NODE_COLOR removed). No drag/drop,
  selection, or full color-picker changes (out of scope). `npm run build`
  passes.

- Feature spec 16 (edge behavior): custom canvas edges with connection handles
  and inline labels. types/canvas.ts gained CanvasEdgeData ({ label?: string } +
  index signature); CanvasEdge is now Edge<CanvasEdgeData, typeof
  CANVAS_EDGE_TYPE>. canvas-node.tsx: the four source Handles (top/right/bottom/
  left, ConnectionMode.Loose already allows any-handle→any-handle) now render as
  subtle 8px white dots with a dark border (#0a0a0a), opacity 0 at rest and
  fading to 1 on node hover (node wrapper tracks `hovered`; handles stay
  connectable while invisible). New components/editor/canvas-edge.tsx
  (CanvasEdgeRenderer): right-angle routing via getSmoothStepPath (borderRadius
  8), BaseEdge with a light #94a3b8 round-capped 2px stroke that is dimmed
  (opacity 0.45) at rest and full when hovered/selected (`active`), wide invisible
  interaction band from BaseEdge's default interactionWidth so it's easy to
  hover/click without thickening the line. Double-click (on the edge <g> or the
  label) opens an inline editor positioned via EdgeLabelRenderer at the
  getSmoothStepPath labelX/labelY (no manual midpoint math); input grows with
  text (width `${max(len,1)}ch`), saves on blur/Enter/Escape (Enter+Escape blur →
  commit) through useReactFlow().updateEdgeData(id,{label}) → onEdgesChange →
  Liveblocks sync; a useEffect mirrors remote label edits into the draft when not
  editing. Saved labels show as pill badges; an active edge with no label shows a
  faint "Double-click to label" hint. nodrag/nopan + onPointerDown
  stopPropagation keep label interaction from panning/dragging. canvas.tsx:
  edgeTypes = { canvasEdge: CanvasEdgeRenderer } + defaultEdgeOptions ({ type:
  canvasEdge, markerEnd: ArrowClosed #94a3b8 }) + connectionLineType SmoothStep +
  round-capped connectionLineStyle. Because Liveblocks' built-in onConnect calls
  addEdge(connection, []) and ignores defaultEdgeOptions, replaced it with a local
  onConnect that builds the edge (addEdge to generate id) then stamps type +
  markerEnd + data.label:"" and dispatches via onEdgesChange add (synced). No
  node-creation/shape-panel/node-renderer changes beyond the handle styling (out
  of scope). `npm run build` passes.

- Feature spec 17 (canvas ergonomics): floating control bar + keyboard shortcuts
  for zoom and undo/redo. New components/editor/canvas-controls.tsx
  (CanvasControls): pill-shaped bar at bottom-6 left-6 (z-10, above the shape
  panel), pointer-events-none wrapper / pointer-events-auto pill matching the
  shape-panel style, two groups split by a thin w-px divider — zoom (zoom out
  Minus / fit view Maximize / zoom in Plus) driving useReactFlow().zoomOut/
  fitView/zoomIn with { duration: 200 } for a smooth animation, and history
  (Undo2/Redo2) wired to Liveblocks useUndo()/useRedo(); buttons disable via
  useCanUndo()/useCanRedo() and dim to opacity-30 + cursor-not-allowed when
  disabled. New hooks/use-keyboard-shortcuts.ts (useKeyboardShortcuts, exports
  ZOOM_ANIMATION_DURATION=200): takes { reactFlow (Pick zoomIn/zoomOut), onUndo,
  onRedo }, binds a window keydown listener, and ignores events whose target is
  an INPUT/TEXTAREA/contentEditable (so node/edge label editors are unaffected).
  Shortcuts: `+`/`=` zoom in, `-` zoom out (no modifier); Cmd/Ctrl+Z undo,
  Cmd/Ctrl+Shift+Z & Cmd/Ctrl+Y redo. canvas.tsx FlowCanvasInner now grabs the
  full reactFlow instance, calls useUndo/useRedo, wires useKeyboardShortcuts, and
  renders <CanvasControls/> alongside <ShapePanel/>. No shape-panel, node/edge
  renderer, extra-controls, or collaborative-state changes (out of scope). `npm
  run build` passes.

- Feature spec 18 (starter templates): import a pre-built diagram to replace the
  canvas. types/canvas.ts gained shared edge constants EDGE_STROKE_COLOR
  (#94a3b8) + DEFAULT_EDGE_MARKER (ArrowClosed 18x18); canvas.tsx now imports
  these instead of its old local EDGE_STROKE/EDGE_MARKER_END (same values, no
  behavior change) so template edges and user edges share one arrowhead source.
  components/editor/starter-templates.ts: CanvasTemplate type ({ id, name,
  description, nodes: CanvasNode[], edges: CanvasEdge[] }) + CANVAS_TEMPLATES
  (three — Microservices, CI/CD Pipeline, Event-Driven System) built with
  node()/edge() helpers + a per-shape SHAPE_SIZE map (mirrors shape-panel drop
  sizes) and a palette() lookup into NODE_COLORS, so templates use the shared
  types + existing palette. components/editor/template-preview.tsx: lightweight
  static preview (no React Flow) — derives content bounds from node positions/
  sizes, scales to fit a 340x190 logical viewport (0.82 padding) + centers, then
  renders responsively (w-full at that aspect ratio, nodes positioned by
  percentage) so previews fill the card and stay large/legible; draws edges as
  <line>s between node centers (SVG viewBox) and nodes via reused <CanvasShape>.
  components/editor/starter-templates-modal.tsx: shadcn Dialog (sm:max-w-6xl)
  with a scrollable (ScrollArea, max-h-70vh) responsive grid of cards
  (1/2/3 cols at base/sm/lg, so all three templates sit in one row on a wide
  screen) — large preview + name + description + full-width Import button; Import
  calls onImport(template).
  Wiring: WorkspaceShell owns isTemplatesOpen; WorkspaceNavbar gained an
  onOpenTemplates prop + a "Templates" outline button (LayoutTemplate icon)
  beside Share. Canvas takes templatesOpen + onTemplatesOpenChange, threaded
  through FlowCanvas → FlowCanvasInner, which renders <StarterTemplatesModal> and
  implements onImportTemplate: builds NodeChange/EdgeChange arrays that remove
  every existing node/edge then add structuredClone'd template items (so repeat
  imports don't share refs), dispatches via the synced onNodesChange/
  onEdgesChange, closes the modal, and fitView({duration:200}) after a 50ms tick
  so the swap stays inside the collaborative Liveblocks state. No template
  saving/custom templates/server persistence, and no node/edge rendering changes
  (out of scope). `npm run build` passes.

- Feature spec 19 (presence avatars & cursors): active-room participants shown
  inside the editor canvas view only; the editor home navbar and shared
  workspace navbar are untouched. liveblocks.config.ts Presence tightened to the
  spec — cursor {x,y}|null plus a required `thinking: boolean` (was optional
  isThinking); canvas.tsx RoomProvider initialPresence now { cursor: null,
  thinking: false }. components/editor/presence-avatars.tsx (PresenceAvatars):
  absolute top-right (right-4 top-4, z-30) group, pointer-events-none wrapper so
  it never blocks the canvas; current user's Clerk ID from useUser() filters
  useOthers() (other.id !== user.id) to exclude their own duplicate sessions.
  Collaborators render as an overlapping stack (-space-x-2) of display-only
  CollaboratorAvatars (h-8 w-8, profile photo via <img>, initials fallback via
  getInitials, ring-2 ring-neutral-900), up to MAX_VISIBLE=5 then a +N
  OverflowChip. A w-px divider shows only when ≥1 collaborator; the current user
  is the existing Clerk <UserButton> (userButtonAvatarBox h-8 w-8, matching size,
  pointer-events-auto) — never drawn from presence. components/editor/live-
  cursors.tsx (LiveCursors): renders other participants' cursors only (skips
  self by Clerk id + null cursor); cursor stored in presence in canvas (flow)
  coords so it stays anchored per-viewer, rendered via flowToScreenPosition
  minus the canvas container rect, re-running on useViewport() pan/zoom; small
  colored SVG pointer + name badge tinted to the participant's presence color.
  canvas.tsx wiring: dropped the built-in @liveblocks/react-flow <Cursors/>;
  FlowCanvasInner gains a containerRef on the wrapper, useUpdateMyPresence, and
  ReactFlow onMouseMove (screenToFlowPosition → updateMyPresence cursor) /
  onMouseLeave (cursor null); renders <LiveCursors containerRef>/<PresenceAvatars/>.
  No navbar, node/edge, or Clerk profile-behavior changes (out of scope). `npm
  run build` passes.

- Feature spec 20 (AI sidebar shell): extracted the inline right-hand AI chat
  placeholder from workspace-shell.tsx into components/editor/ai-sidebar.tsx
  (AiSidebar; open/close still owned by WorkspaceShell's isAiOpen — onClose
  wired, no open/close rebuild). Now a floating right aside (absolute top-12
  right-0 z-40, w-96, h-[calc(100%-3rem)]) that slides in with translate-x
  (translate-x-full ↔ translate-x-0, duration-200 ease-in-out), matching the
  ProjectSidebar slide pattern; surface uses bg-background/95 backdrop-blur,
  border-l border-border, shadow-2xl. Header: bot icon + "AI Workspace"
  (text-foreground) / "Collaborate with Ghost AI" (text-muted-foreground) +
  right-aligned close (X). shadcn Tabs (AI Architect / Specs), TabsTrigger given
  accent active styling (data-active:bg-primary/15 data-active:text-primary,
  inactive text-muted-foreground). Architect tab: scrollable chat area, empty
  state (bot icon + description + three starter-prompt pills — "Design an
  e-commerce backend", "Create a chat app architecture", "Build a CI/CD
  pipeline" — styled bg-muted text-primary soft pills that fill the input on
  click); user bubbles right-aligned (border-2 border-primary/50 bg-primary/10
  text-foreground), assistant bubbles left-aligned (border border-border bg-card
  text-primary); input row = shadcn Textarea (field-sizing-content auto-resize,
  min-h-[72px] max-h-40) + icon send Button (bg-primary text-white); Enter
  submits, Shift+Enter newline; send appends a user ChatMessage to local state
  only (no backend/AI generation). Specs tab: full-width "Generate Spec" button
  (bg-primary text-white) + one static demo spec Card (bg-card border-border,
  FileText icon, title, snippet, disabled Download button).
  TOKEN MAPPING NOTE: the spec's token names (bg-base, border-surface-border,
  text-primary-text, text-muted-text, bg-accent/text-accent, bg-subtle,
  text-accent-text, bg-brand-dim/border-brand, text-copy-primary, bg-elevated)
  do not exist — globals.css only holds shadcn tokens and ui-context.md is still
  the template. Per spec step 6 (reuse existing tokens, don't invent), mapped
  them to the nearest shadcn tokens: base→background, surface-border→border,
  primary-text→foreground, muted-text→muted-foreground, accent/brand→primary
  (the vivid cyan interactive color; shadcn `accent` is a muted surface here),
  subtle→muted, elevated→card, copy-primary→foreground. No Liveblocks/AI/
  backend logic (out of scope). `npm run build` passes.

- Feature spec 21 (canvas autosave & load): the collaborative canvas now
  persists to Vercel Blob with Prisma holding only the blob URL. Installed
  @vercel/blob. Schema: reused the already-present Project.canvasJsonPath
  String? (in prisma/models/project.prisma and the init migration) — no new
  migration needed. New app/api/projects/[projectId]/canvas/route.ts: PUT
  (auth → getAccessibleProject so any owner/collaborator may save; validates the
  body has nodes[]+edges[]; put(`canvases/${projectId}.json`, JSON, {access:
  "private", contentType:"application/json", allowOverwrite:true}) — stable
  pathname + overwrite so each project keeps one blob; stores blob.url on
  project.canvasJsonPath; returns { url }) and GET (auth + access, reads
  canvasJsonPath, reads the blob via the authenticated get(url, {access:
  "private", useCache:false}) helper and streams it to JSON, returns { nodes,
  edges }; any missing/failed read degrades to EMPTY_CANVAS {nodes:[],edges:[]}).
  NOTE: the configured Blob store is PRIVATE — access must be "private" on both
  put and get; a public put or a plain fetch() of the blob URL is rejected
  ("Cannot use public access on a private store").
  New hooks/use-canvas-autosave.ts (useCanvasAutosave → SaveStatus
  "idle"|"saving"|"saved"|"error"): watches a JSON signature of nodes+edges
  (compared to avoid saving on Liveblocks reference churn), debounces
  AUTOSAVE_DEBOUNCE_MS=1200ms, PUTs the signature to the canvas route; gated by
  an `enabled` flag and skips the first enabled run so the just-loaded state
  isn't re-saved. canvas.tsx: roomId threaded as projectId through
  FlowCanvas → FlowCanvasInner, plus an onSaveStatusChange callback. On mount a
  one-shot effect (hasLoadedRef guard) checks the suspense-synced room — if it
  already has any nodes/edges it SKIPS the load (never overwrites active
  collaboration) and just enables autosave; if empty it GETs the saved canvas
  and, only when the payload is non-empty, adds nodes/edges via the synced
  onNodesChange/onEdgesChange add-changes, then enables autosave in `finally`.
  saveStatus is reported up via onSaveStatusChange. WorkspaceShell owns
  saveStatus state (setSaveStatus passed to Canvas, saveStatus passed to navbar).
  WorkspaceNavbar gained a SaveIndicator (role=status aria-live=polite) beside
  Templates: Save/idle+Check/saved (text-primary), spinning Loader2/saving,
  TriangleAlert/error (text-destructive). NOTE: BLOB_READ_WRITE_TOKEN already
  present (empty) in .env.local — must be filled from the Vercel Blob store
  before saves work at runtime (build/typecheck don't need it). No AI generation
  logic (out of scope). `npm run build` passes; canvas route registered.

- Feature spec 22 (design agent API): Trigger.dev backend wiring only, no AI
  logic. New trigger/design-agent.ts — minimal `designAgent` task (id
  "design-agent") reusing the existing @trigger.dev/sdk `task()` setup (matches
  trigger/example.ts); payload { prompt, roomId }; logs the input and echoes it
  back (no node/edge/canvas/AI work). Prisma: added TaskRun model to
  prisma/models/project.prisma (id cuid, runId @unique, projectId, userId,
  createdAt; @@index([runId]) + compound @@index([userId, projectId])) —
  migration 20260709171422_add_task_run applied. New app/api/ai/design/route.ts
  (POST): Clerk auth (401), validates prompt/roomId/projectId in body (400),
  getAccessibleProject(projectId) so only owner/collaborator may trigger (404),
  tasks.trigger<typeof designAgent>("design-agent", { prompt, roomId }), records
  a TaskRun { runId: handle.id, projectId, userId }, returns { runId }. New
  app/api/ai/design/token/route.ts (POST): auth (401), validates runId (400),
  looks up TaskRun by runId and verifies userId matches the caller (404
  otherwise), then auth.createPublicToken({ scopes: { read: { runs: [runId] } },
  expirationTime: "1h" }) and returns { token }. NOTE: prisma generate hit a
  transient EPERM renaming query_engine-windows.dll.node (OneDrive/dev-server
  lock on the binary) — the TS client types regenerated fine (TaskRun present)
  and the existing engine binary stayed in place, so `npm run build` passes and
  both routes register. TRIGGER_SECRET_KEY / project ref (proj_kqtgascrlvyjbsqphmnl
  in trigger.config.ts) must be configured for the trigger + token calls to work
  at runtime. `npm run build` passes.

- Feature spec 23 (design agent logic): the design agent now interprets a prompt
  with Gemini and applies real changes to the collaborative canvas in real time,
  with AI presence + a shared status feed visible to all participants.
  trigger/design-agent.ts: the task (retry maxAttempts:1 — canvas edits aren't
  idempotent across regenerated plans) uses createGoogleGenerativeAI({ apiKey:
  GOOGLE_AI_API_KEY }) + generateObject (ai SDK, model "gemini-2.0-flash") with a
  zod plan schema { summary, actions[] }. Actions are ONE flat object with a
  `type` enum + optional fields (not a discriminated union — Gemini's structured
  output handles a single object schema far more reliably than anyOf/oneOf):
  addNode/moveNode/resizeNode/updateNode/deleteNode/addEdge/deleteEdge. It reads
  the current canvas first (via mutateFlow read) so it can extend/edit by id
  rather than recreate, then applies each action through @liveblocks/react-flow's
  `mutateFlow` (from @liveblocks/react-flow/node) — the SAME storage the client's
  useLiveblocksFlow uses, so AI edits behave like hand-drawn ones (no new state
  system, no bypass of the collaborative flow). Nodes are built with the shared
  types/canvas constants (CANVAS_NODE_TYPE, DEFAULT_EDGE_MARKER, NODE_COLORS
  palette lookup, per-shape SHAPE_SIZE mirroring the shape panel) so generated
  designs obey the allowed shapes + palette; the prompt encodes layout/spacing
  rules (~220u horizontal / ~160u vertical between centers, no overlap, clear
  flow, short labels).
  AI presence + status feed: the background task has no Liveblocks presence
  connection, so it publishes a plain-JSON GhostAiState (types/ai.ts — declared
  as a `type`, not `interface`, so it carries the implicit index signature Lson
  requires) into Liveblocks Storage under the new `ai` key
  (liveblocks.config.ts Storage gained `ai?: GhostAiState | null` — optional so
  rooms still need no initialStorage; the react-flow nodes/edges keep living
  under react-flow's own storage key). The task flushes the whole object via the
  node client's mutateStorage on each change: thinking/cursor/phase/status +
  a rolling feed (capped at 8). Key steps push status (start "interpreting",
  processing "<summary>", complete, or error); the AI cursor is parked at each
  action's target (with 180ms waits) so participants watch the agent work, then
  presence is cleared ~1.6s after completion. Errors are caught → error status
  published → rethrown (single attempt, so no retry storm / duplicate diagram);
  the canvas is never left broken.
  Frontend: new components/editor/ai-presence.tsx (AiPresence) reads
  useStorage(root => root.ai) and renders an AI cursor (cyan, flowToScreenPosition
  + useViewport like LiveCursors) plus a floating top-center status pill
  (phase icon: spinning Loader2 / CheckCircle2 / TriangleAlert). Rendered in
  canvas.tsx FlowCanvasInner beside LiveCursors/PresenceAvatars; returns null
  when idle. ai-sidebar.tsx ArchitectTab send now also fires POST /api/ai/design
  ({ prompt, roomId, projectId } — all project.id) so a chat prompt actually
  triggers the agent (progress streams onto the canvas via Liveblocks, so no run
  subscription needed here — just a chat ack/failure line); AiSidebar gained a
  projectId prop threaded from workspace-shell. NOTE: GOOGLE_AI_API_KEY,
  LIVEBLOCKS_SECRET_KEY, and TRIGGER_SECRET_KEY must be configured for the agent
  to run at runtime (build/typecheck don't need them). `npm run build` passes.

- Feature spec 24 (AI presence state): shared AI activity indicators — UI +
  presence + realtime status only (no new generation logic). types/tasks.ts:
  new schema module for the shared AI status feed — AI_STATUS_FEED_KEY
  ("ai-status-feed"), aiStatusPhaseSchema, aiStatusMessageSchema (zod object,
  optional `text` + phase/active/at, generic enough for design AND later spec
  generation), and parseAiStatusMessage() (safeParse → message | null) used to
  validate every incoming feed entry before display. liveblocks.config.ts:
  Storage gained `"ai-status-feed"?: AiStatusMessage[] | null` (optional, no
  initialStorage needed) alongside the existing `ai` GhostAiState key. Reuses
  the spec-23 realtime pipeline instead of adding parallel state: the design
  agent (trigger/design-agent.ts) now, on each flushPresence, also
  root.set(AI_STATUS_FEED_KEY, buildStatusFeed(ai)) — mapping its existing
  rolling `ai.feed` (GhostAiActivity[]) to AiStatusMessage[] with the current
  `active` flag, so the feed empties when presence clears.
  Subscription is lifted through the room (AiSidebar sits OUTSIDE the Canvas'
  RoomProvider, so it can't use Liveblocks hooks directly — same callback-lift
  pattern as saveStatus): canvas.tsx FlowCanvasInner reads
  useStorage(root => root["ai-status-feed"]), validates the latest entry via
  parseAiStatusMessage, and reports it up through a new onAiStatusChange prop;
  it also publishes the local user's `thinking` (new Canvas `thinking` prop) to
  presence via updateMyPresence({ thinking }). WorkspaceShell owns aiStatus +
  isThinking state, passing aiStatus/onThinkingChange to AiSidebar and
  onAiStatusChange/thinking to Canvas. ai-sidebar.tsx ArchitectTab: derives
  isGenerating (aiStatus.active) + isBusy (isSending || isGenerating) — shows a
  role=status pill with the latest status text while generating, disables the
  Textarea, and swaps the send icon for a spinning Loader2 (button disabled when
  busy); send() flips onThinkingChange(true/false) around the request so other
  participants see a spinner. live-cursors.tsx: Cursor reads
  other.presence.thinking and renders a small spinning Loader2 before the name
  badge when true (hidden when false/missing). Scope respected: no new
  generation logic, no new task triggers, sidebar never dimmed as a whole, only
  the most recent status shown. `npm run build` passes.

- Feature spec 25 (sidebar chat feed): real-time room chat in the AI sidebar via
  a NEW, separate Liveblocks `ai-chat` Storage feed — kept fully distinct from
  spec-24's `ai-status-feed` (chat vs. AI progress never mixed). types/tasks.ts:
  added AI_CHAT_KEY ("ai-chat"), aiChatRoleSchema ("user"|"assistant" — only
  "user" used, no AI replies), aiChatSenderSchema ({ id, name, color?, avatar? }
  mirroring Liveblocks UserMeta.info), aiChatMessageSchema ({ id, sender, role,
  content, at }) + parseAiChatMessage() (safeParse → message | null) used to
  validate every entry before render. liveblocks.config.ts Storage gained
  `"ai-chat"?: AiChatMessage[] | null` alongside `ai` and `ai-status-feed`.
  ARCHITECTURE CHANGE: the AiSidebar previously sat OUTSIDE the Canvas'
  RoomProvider (spec 24 lifted its status up via a callback). Chat needs the
  sidebar to both read AND write room storage, so the LiveblocksProvider +
  RoomProvider were lifted UP from canvas.tsx into workspace-shell.tsx, now
  wrapping both the canvas <main> and the AiSidebar in one shared room
  (initialPresence { cursor:null, thinking:false } moved here). Canvas dropped
  its own provider wrappers (keeps CanvasErrorBoundary + ClientSideSuspense);
  spec-24's onAiStatusChange/thinking callback plumbing is unchanged and still
  works. ai-sidebar.tsx ArchitectTab now uses non-suspense @liveblocks/react
  hooks: useStorage(root => root["ai-chat"]) → validated message list rendered
  in order; useSelf(me => me.id) to right-align own messages; useMutation
  publishMessage appends { sender from self.info, role:"user", content, at } to
  the feed (full-array set, capped MAX_CHAT_MESSAGES=100 — same pattern as the
  other feeds). ChatBubble rewritten to show sender name (tinted to presence
  color) + short local timestamp + content, own messages right-aligned. Send
  clears the input on success and shows a small inline error (role=alert) on
  failure. DESIGN DECISION worth confirming: the Architect input is also the
  ONLY UI entry point to the design agent (specs 22-24), so rather than strand
  that feature, send() is ADDITIVE — it publishes the message to `ai-chat` AND
  still triggers the design agent (POST /api/ai/design) + sets presence.thinking
  (spec 24). The scope limit "don't trigger backend AI tasks" is read as "the
  chat feed itself introduces no backend AI task" (chat is pure Liveblocks);
  ai-chat carries only human user-role messages, AI progress stays on the
  separate ai-status-feed pill. If full chat/AI decoupling was intended instead,
  drop the /api/ai/design fetch + onThinkingChange from send(). `npm run build`
  passes.

- Feature spec 26 (AI chat functional): wired the AI sidebar's Architect tab to
  submit design prompts, track the Trigger.dev run in realtime, and reflect
  AI-driven canvas updates via Liveblocks. app/api/ai/design/route.ts now also
  mints a run-scoped public token (auth.createPublicToken, read scope on the new
  run, 1h) and returns { runId, publicToken } — so the client subscribes without
  a second call to the standalone /token route (which still exists). ai-sidebar
  .tsx ArchitectTab: on send it publishes the user message to `ai-chat` (as
  before), POSTs { prompt, roomId, projectId }, reads { runId, publicToken } into
  local `run` state, then useRealtimeRun<typeof designAgent>(run?.id, {
  accessToken: run?.token, enabled, onComplete }) subscribes to the run's
  lifecycle only (canvas/edge/presence still stream in automatically through
  Liveblocks — no manual node/edge sync). isRunActive = run set && !(run
  .isCompleted || run.isFailed); combined with the room-wide `ai-status-feed`
  active flag (isGenerating) into isWorking, which disables the textarea and
  shows the compact status strip; isBusy (isSubmitting || isWorking) drives the
  send-button spinner + disabled. onComplete pushes a final AI (assistant)
  message to `ai-chat` ("Done…" or an error line), clears run state, and releases
  presence.thinking; only the submitting client subscribes, so no duplicate
  completion messages. Errors are surfaced as assistant messages in the `ai-chat`
  feed (per spec) instead of the old inline error line. presence.thinking is set
  true on submit and cleared in onComplete / on start failure.
  COLOR DECISION: the spec's UI details explicitly name a green accent #62C073
  for the user bubble background + send button (and green-accented status strip),
  which conflicts with the "use existing tokens" note — there is no green token
  (primary is cyan). Honored the explicit hex via a single ACCENT_GREEN constant
  applied through inline styles (user bubble bg + dark text, send button bg,
  status strip border/text); AI/other bubbles stay dark card + light text. No
  backend design/Trigger.dev generation logic changed (only the token addition to
  the existing route). `npm run build` passes.

- Feature spec 27 (spec generation flow): backend AI-powered Markdown spec
  generation, mirroring the design flow's auth/ownership/Trigger.dev patterns.
  No frontend/editor UI (out of scope). New trigger/generate-spec.ts —
  `generateSpec` task (id "generate-spec") accepts { projectId, roomId,
  chatHistory, nodes, edges }, re-validates the whole payload with Zod
  (inputSchema: loose passthrough node/edge schemas reading only id/data.label/
  data.shape/position + source/target, chatHistory as { role?, content }[], all
  three arrays .default([])); uses Gemini via createGoogleGenerativeAI +
  generateText (ai SDK) with the SAME MODEL_CANDIDATES fallback list as the
  design agent (gemini-flash-latest → flash-lite-latest → 2.5-flash-lite,
  maxRetries 3). Builds a prompt from the canvas snapshot (nodes/edges) + chat
  history and asks for GFM Markdown ONLY (title + Overview/Goals/Architecture/
  Data Flow/APIs/Data Model/Open Questions sections, grounded in the actual
  inputs, no whole-doc code fence); returns { projectId, roomId, spec } as task
  output (plain Markdown). Realtime tracking via run METADATA (not Liveblocks —
  spec gen is a per-user doc, not shared room state): setStatus() writes
  metadata phase ("thinking"/"processing"/"complete"/"error") + human status on
  each step, guarded so it no-ops outside a run context. Retries left at the
  project default (task is read-only/idempotent, unlike the non-idempotent
  design agent which opts out). trigger/example.ts does not exist; patterns were
  taken from trigger/design-agent.ts. New app/api/ai/spec/route.ts (POST): Clerk
  auth (401), validates roomId (string) + nodes/edges (arrays) + optional
  chatHistory (array) in body (400), getAccessibleProject(roomId, identity) so
  only owner/collaborator may trigger (404) — projectId is DERIVED from the
  resolved project (project.id), NEVER taken from the client; tasks.trigger<
  typeof generateSpec>("generate-spec", payload) with project.id as the trusted
  projectId, records a TaskRun { runId, projectId, userId }, returns { runId }.
  New app/api/ai/spec/token/route.ts (POST): identical to the design token route
  — auth (401), validates runId (400), looks up TaskRun by runId and verifies
  userId matches the caller (404 otherwise), auth.createPublicToken({ scopes:
  { read: { runs: [runId] } }, expirationTime: "1h" }), returns { token }.
  Reused the existing TaskRun model (no schema/migration change), lib/project-
  access, lib/prisma, and the @trigger.dev/sdk auth/tasks helpers. GOOGLE_AI_API_KEY
  + TRIGGER_SECRET_KEY must be configured for runtime. `npm run build` passes;
  both /api/ai/spec and /api/ai/spec/token routes register.

- Feature spec 28 (spec persistence & download): generated specs are now
  persisted (Prisma = metadata, Vercel Blob = content) and downloadable behind
  access checks. Backend only, no UI (out of scope). Schema: new ProjectSpec
  model in prisma/models/project.prisma (id cuid, projectId, filePath, createdAt,
  @@index([projectId, createdAt]), project relation onDelete: Cascade) + a
  `specs ProjectSpec[]` back-relation on Project — migration
  20260709221546_add_project_spec applied (prisma generate hit the same known
  EPERM DLL-rename lock as spec 22; TS client types regenerated fine, ProjectSpec
  present). Persistence lives in the generateSpec task (trigger/generate-spec.ts):
  after drafting, it uploads the Markdown to Vercel Blob via
  put(`specs/${projectId}/${randomUUID()}.md`, spec, { access: "private",
  contentType: "text/markdown" }) — private store + unique per-spec path (a
  project accumulates a spec history, unlike the single stable-path canvas blob) —
  then prisma.projectSpec.create({ projectId, filePath: blob.url }); the task
  return now includes specId. Follows the canvas metadata+blob pattern (private
  access; content never in Prisma). New app/api/projects/[projectId]/specs/
  [specId]/download/route.ts (GET): Clerk auth (401), getAccessibleProject(
  projectId) so only owner/collaborator may download (404), looks up ProjectSpec
  by specId and verifies spec.projectId === projectId (404 — never serve a spec
  by id alone across projects), reads the Markdown from the private blob via the
  authenticated get(filePath, { access: "private", useCache: false }) helper (404
  on missing/failed read), and returns it as a Markdown attachment (Content-Type
  text/markdown; charset=utf-8, Content-Disposition attachment;
  filename="spec-<id>.md"). Existing canvas persistence untouched. Reused
  lib/project-access, lib/prisma, and @vercel/blob (already installed). Runtime
  needs BLOB_READ_WRITE_TOKEN + DATABASE_URL (task) as before. `npm run build`
  passes; the download route registers.

- Feature spec 29 (spec UI integration): the AI sidebar Specs tab now lists,
  previews, and downloads real generated specs (frontend only + one thin read
  route). GAP FILLED: the spec assumed an "existing ProjectSpec API" to list
  specs, but spec 28 only built the per-spec download route — so added a minimal
  GET app/api/projects/[projectId]/specs/route.ts returning metadata only
  ({ id, createdAt }, ordered createdAt desc) behind the same getAccessibleProject
  owner/collaborator check; no blob/generation logic (that stays in specs 27/28).
  ai-sidebar.tsx SpecsTab (now takes projectId) replaces the old static demo card:
  fetches the list on mount/projectId change (loadSpecs, useCallback) with
  loading / error+Retry / empty states; each spec renders as a compact clickable
  Card (FileText badge + derived filename `spec-<id>.md` + local createdAt) that
  opens the preview, plus an outline Download button. The Generate Spec button is
  left as the existing static element (wiring generation is out of spec-29 scope).
  Download uses a temporary <a download> pointed at the authenticated download
  route (browser handles the save; client never touches the Blob store). New
  components/editor/spec-preview-modal.tsx (SpecPreviewModal): shadcn Dialog +
  ScrollArea; on open it fetches the spec content via fetch() of the SAME download
  route (fetch reads the body regardless of the attachment header — no direct Blob
  access) and renders it with react-markdown (newly installed dep) through an
  explicit MARKDOWN_COMPONENTS tailwind map (no typography plugin needed, existing
  tokens only); loading/error states, Download in the footer, Esc/close via Dialog.
  Content is fetched fresh per open and dropped on close — never held in long-term
  state (respects the scope limit). No new global state, no sidebar/tab redesign.
  `npm run build` + TypeScript pass; the specs list route registers.
  FOLLOW-UP (post spec 29): wired the previously-inert "Generate Spec" button in
  ai-sidebar.tsx SpecsTab to the existing spec-27 backend. On click it fetches the
  latest saved canvas snapshot (GET /api/projects/[id]/canvas) + the room chat
  (Liveblocks `ai-chat` via useStorage), POSTs /api/ai/spec ({ roomId, nodes,
  edges, chatHistory }), mints a run token via /api/ai/spec/token, then tracks the
  run with useRealtimeRun<typeof generateSpec> — a progress strip shows the task's
  run-metadata status, and onComplete reloads the spec list so the new spec
  appears (or shows an error). Reused existing endpoints only; no backend change.
  RUNTIME NOTE: the run only executes if the Trigger.dev dev worker is running
  (`npx trigger.dev@latest dev`) with GOOGLE_AI_API_KEY / TRIGGER_SECRET_KEY /
  BLOB_READ_WRITE_TOKEN / DATABASE_URL set — otherwise the run just queues.
  Also: the earlier `prisma.projectSpec` undefined 500 was a stale cached Prisma
  client in the running dev server (client on disk was correct) — fixed by
  restarting the dev server.

## In Progress

- None

## Next Up

- Feature specs 30+

## Open Questions

- None

## Architecture Decisions

- Using shadcn/ui with radix-nova style and neutral base color
- CSS variables approach for theming (dark/light via .dark class)

## Session Notes

- shadcn is installed as a direct dependency (not devDependency)
- components.json uses radix-nova style with Tailwind v4 + CSS variables
- Do not modify generated components/ui/* files after installation
