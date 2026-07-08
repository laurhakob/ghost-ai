import type { Edge, Node } from "@xyflow/react"

/**
 * Shapes a canvas node can render as. Shape-specific visuals are added later;
 * for now this is the shared vocabulary the node data and shape panel agree on.
 */
export type CanvasNodeShape =
  | "rectangle"
  | "diamond"
  | "circle"
  | "pill"
  | "cylinder"
  | "hexagon"

/**
 * Data carried by every canvas node. The index signature keeps it assignable to
 * React Flow's `Record<string, unknown>` data constraint.
 */
export interface CanvasNodeData {
  /** Text label displayed on the node. */
  label: string
  /** Fill/accent color for the node. */
  color: string
  /** Which shape the node renders as. */
  shape: CanvasNodeShape
  [key: string]: unknown
}

/** Default fill/accent color applied to freshly dropped nodes. */
export const DEFAULT_NODE_COLOR = "#64B5F6"

/** MIME-ish key used to carry a shape across a drag-and-drop onto the canvas. */
export const SHAPE_DRAG_TYPE = "application/ghost-shape"

/** Payload written to the drag event when dragging a shape from the panel. */
export interface ShapeDragPayload {
  /** Which shape is being dragged. */
  shape: CanvasNodeShape
  /** Default node width in canvas units. */
  width: number
  /** Default node height in canvas units. */
  height: number
}

/** The single custom node type used on the canvas. */
export const CANVAS_NODE_TYPE = "canvasNode" as const

/** The single custom edge type used on the canvas. */
export const CANVAS_EDGE_TYPE = "canvasEdge" as const

/** A React Flow node backed by {@link CanvasNodeData}. */
export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>

/** A React Flow edge on the canvas. */
export type CanvasEdge = Edge<Record<string, unknown>, typeof CANVAS_EDGE_TYPE>
