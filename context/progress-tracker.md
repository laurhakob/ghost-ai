# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- In Progress

## Current Goal

- Feature spec 03 - Auth

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

## In Progress

- None

## Next Up

- Feature specs 16+

## Open Questions

- None

## Architecture Decisions

- Using shadcn/ui with radix-nova style and neutral base color
- CSS variables approach for theming (dark/light via .dark class)

## Session Notes

- shadcn is installed as a direct dependency (not devDependency)
- components.json uses radix-nova style with Tailwind v4 + CSS variables
- Do not modify generated components/ui/* files after installation
