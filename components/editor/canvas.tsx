"use client"

import { Component, useCallback, useRef, type ReactNode } from "react"

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
} from "@xyflow/react"
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense"

import { CanvasNodeRenderer } from "@/components/editor/canvas-node"
import { ShapePanel } from "@/components/editor/shape-panel"
import {
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR_PAIR,
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

interface CanvasProps {
  /** The Liveblocks room ID — this is the project ID. */
  roomId: string
}

/**
 * Client-side canvas wrapper. Establishes the Liveblocks room for the given
 * project and renders the collaborative React Flow canvas inside it.
 */
export function Canvas({ roomId }: CanvasProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={roomId} initialPresence={{ cursor: null }}>
        <CanvasErrorBoundary>
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <FlowCanvas />
          </ClientSideSuspense>
        </CanvasErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
}

/**
 * Provides React Flow context so the inner canvas can convert screen
 * coordinates to canvas space when shapes are dropped.
 */
function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  )
}

/**
 * The React Flow canvas wired to Liveblocks Storage. Nodes and edges start
 * empty and stay in sync across everyone in the room. Shapes dragged from the
 * bottom panel are dropped here to create new nodes.
 */
function FlowCanvasInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })

  const { screenToFlowPosition } = useReactFlow()
  // Disambiguates nodes created within the same millisecond.
  const counterRef = useRef(0)

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

  return (
    <div
      className="relative h-full w-full bg-neutral-950"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        connectionMode={ConnectionMode.Loose}
        fitView
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Cursors />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>

      <ShapePanel />
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
