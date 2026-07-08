"use client"

import { Component, useCallback, useRef, type ReactNode } from "react"

import {
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type DefaultEdgeOptions,
  type EdgeChange,
  type EdgeTypes,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useRedo,
  useUndo,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense"

import { CanvasControls } from "@/components/editor/canvas-controls"
import { CanvasEdgeRenderer } from "@/components/editor/canvas-edge"
import { CanvasNodeRenderer } from "@/components/editor/canvas-node"
import { LiveCursors } from "@/components/editor/live-cursors"
import { PresenceAvatars } from "@/components/editor/presence-avatars"
import { ShapePanel } from "@/components/editor/shape-panel"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { useKeyboardShortcuts, ZOOM_ANIMATION_DURATION } from "@/hooks/use-keyboard-shortcuts"
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  DEFAULT_EDGE_MARKER,
  DEFAULT_NODE_COLOR_PAIR,
  EDGE_STROKE_COLOR,
  SHAPE_DRAG_TYPE,
  type CanvasEdge,
  type CanvasNode,
  type ShapeDragPayload,
} from "@/types/canvas"

import "@xyflow/react/dist/style.css"
import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-flow/styles.css"

/** Custom node types, defined at module scope so React Flow sees a stable ref. */
const nodeTypes: NodeTypes = { [CANVAS_NODE_TYPE]: CanvasNodeRenderer }

/** Custom edge types, defined at module scope so React Flow sees a stable ref. */
const edgeTypes: EdgeTypes = { [CANVAS_EDGE_TYPE]: CanvasEdgeRenderer }

/**
 * Default style for new edges: the custom canvas renderer plus an arrowhead.
 * The light, rounded stroke itself is drawn by {@link CanvasEdgeRenderer}.
 */
const defaultEdgeOptions: DefaultEdgeOptions = {
  type: CANVAS_EDGE_TYPE,
  markerEnd: DEFAULT_EDGE_MARKER,
}

/** Light, round-capped preview line shown while dragging a new connection. */
const connectionLineStyle = {
  stroke: EDGE_STROKE_COLOR,
  strokeWidth: 2,
  strokeLinecap: "round",
} as const

interface CanvasProps {
  /** The Liveblocks room ID — this is the project ID. */
  roomId: string
  /** Whether the starter-templates modal is open (opened from the navbar). */
  templatesOpen: boolean
  /** Toggles the starter-templates modal open/closed. */
  onTemplatesOpenChange: (open: boolean) => void
}

/**
 * Client-side canvas wrapper. Establishes the Liveblocks room for the given
 * project and renders the collaborative React Flow canvas inside it.
 */
export function Canvas({ roomId, templatesOpen, onTemplatesOpenChange }: CanvasProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={roomId} initialPresence={{ cursor: null, thinking: false }}>
        <CanvasErrorBoundary>
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <FlowCanvas
              templatesOpen={templatesOpen}
              onTemplatesOpenChange={onTemplatesOpenChange}
            />
          </ClientSideSuspense>
        </CanvasErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
}

interface FlowCanvasProps {
  templatesOpen: boolean
  onTemplatesOpenChange: (open: boolean) => void
}

/**
 * Provides React Flow context so the inner canvas can convert screen
 * coordinates to canvas space when shapes are dropped.
 */
function FlowCanvas({ templatesOpen, onTemplatesOpenChange }: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner
        templatesOpen={templatesOpen}
        onTemplatesOpenChange={onTemplatesOpenChange}
      />
    </ReactFlowProvider>
  )
}

/**
 * The React Flow canvas wired to Liveblocks Storage. Nodes and edges start
 * empty and stay in sync across everyone in the room. Shapes dragged from the
 * bottom panel are dropped here to create new nodes.
 */
function FlowCanvasInner({ templatesOpen, onTemplatesOpenChange }: FlowCanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })

  const reactFlow = useReactFlow()
  const { screenToFlowPosition } = reactFlow
  // Disambiguates nodes created within the same millisecond.
  const counterRef = useRef(0)
  // The canvas container, used to offset live-cursor overlay positions.
  const containerRef = useRef<HTMLDivElement>(null)

  // Broadcast this user's cursor position (in canvas coordinates) so it stays
  // anchored to the diagram for everyone else, regardless of their own view.
  const updateMyPresence = useUpdateMyPresence()
  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const point = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      updateMyPresence({ cursor: { x: point.x, y: point.y } })
    },
    [screenToFlowPosition, updateMyPresence],
  )
  const onMouseLeave = useCallback(() => {
    updateMyPresence({ cursor: null })
  }, [updateMyPresence])

  // Liveblocks history, wired to both the control bar and keyboard shortcuts.
  const undo = useUndo()
  const redo = useRedo()
  useKeyboardShortcuts({ reactFlow, onUndo: undo, onRedo: redo })

  // Liveblocks' own `onConnect` builds a plain edge that ignores
  // `defaultEdgeOptions`, so build the edge here with the custom type, arrow,
  // and empty label, then dispatch it through the synced change pipeline.
  const onConnect = useCallback(
    (connection: Connection) => {
      const [edge] = addEdge(connection, [] as CanvasEdge[])
      if (!edge) return

      const newEdge: CanvasEdge = {
        ...edge,
        type: CANVAS_EDGE_TYPE,
        markerEnd: DEFAULT_EDGE_MARKER,
        data: { label: "" },
      }

      onEdgesChange([{ type: "add", item: newEdge }])
    },
    [onEdgesChange],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const raw = event.dataTransfer.getData(SHAPE_DRAG_TYPE)
      if (!raw) return

      let payload: ShapeDragPayload
      try {
        payload = JSON.parse(raw) as ShapeDragPayload
      } catch {
        return
      }

      // Screen coordinates → canvas coordinates, centered under the cursor.
      const point = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const id = `${payload.shape}-${Date.now()}-${counterRef.current++}`
      const newNode: CanvasNode = {
        id,
        type: CANVAS_NODE_TYPE,
        position: {
          x: point.x - payload.width / 2,
          y: point.y - payload.height / 2,
        },
        width: payload.width,
        height: payload.height,
        style: { width: payload.width, height: payload.height },
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR_PAIR.background,
          textColor: DEFAULT_NODE_COLOR_PAIR.text,
          shape: payload.shape,
        },
      }

      onNodesChange([{ type: "add", item: newNode }])
    },
    [screenToFlowPosition, onNodesChange],
  )

  // Import a starter template: replace the current canvas by removing every
  // existing node/edge first, then adding the template's, all through the same
  // synced change pipeline so the swap stays inside the collaborative state.
  const onImportTemplate = useCallback(
    (template: CanvasTemplate) => {
      const nodeChanges: NodeChange<CanvasNode>[] = [
        ...nodes.map((node) => ({ type: "remove" as const, id: node.id })),
        ...template.nodes.map((node) => ({
          type: "add" as const,
          item: structuredClone(node),
        })),
      ]
      const edgeChanges: EdgeChange<CanvasEdge>[] = [
        ...edges.map((edge) => ({ type: "remove" as const, id: edge.id })),
        ...template.edges.map((edge) => ({
          type: "add" as const,
          item: structuredClone(edge),
        })),
      ]

      onNodesChange(nodeChanges)
      onEdgesChange(edgeChanges)
      onTemplatesOpenChange(false)

      // Fit to the freshly loaded diagram once the synced state has committed.
      setTimeout(() => {
        void reactFlow.fitView({ duration: ZOOM_ANIMATION_DURATION })
      }, 50)
    },
    [nodes, edges, onNodesChange, onEdgesChange, onTemplatesOpenChange, reactFlow],
  )

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-neutral-950"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={connectionLineStyle}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        connectionMode={ConnectionMode.Loose}
        fitView
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>

      <LiveCursors containerRef={containerRef} />
      <PresenceAvatars />

      <CanvasControls />
      <ShapePanel />

      <StarterTemplatesModal
        open={templatesOpen}
        onOpenChange={onTemplatesOpenChange}
        onImport={onImportTemplate}
      />
    </div>
  )
}

/** Simple loading state shown while the Liveblocks room connects. */
function CanvasLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-neutral-950">
      <p className="text-sm text-neutral-500">Loading canvas…</p>
    </div>
  )
}

interface CanvasErrorBoundaryProps {
  children: ReactNode
}

/**
 * Catches Liveblocks connection/authentication failures so a dropped room
 * doesn't take the whole workspace down with it.
 */
class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  { hasError: boolean }
> {
  constructor(props: CanvasErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-neutral-950 p-6 text-center">
          <p className="text-sm text-neutral-500">
            Couldn&rsquo;t connect to the canvas. Check your connection and
            refresh to try again.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
