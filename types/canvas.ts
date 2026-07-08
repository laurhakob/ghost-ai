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
  /** Background/fill color for the node. */
  color: string
  /** Label text color, paired with {@link color} for contrast. */
  textColor: string
  /** Which shape the node renders as. */
  shape: CanvasNodeShape
  [key: string]: unknown
}

/**
 * A predefined node color theme: a background/fill paired with a matching text
 * color chosen to stay legible on that background. The color toolbar offers one
 * swatch per pair; there is no free-form color picker.
 */
export interface NodeColorPair {
  /** Stable identifier, also used as the swatch's accessible name. */
  id: string
  /** Node background/fill color. */
  background: string
  /** Label text color paired with {@link background}. */
  text: string
}

/**
 * The canvas node palette — dark, tinted surfaces with a vivid paired text color
 * that suits the dark technical workspace. Kept here (rather than in global.css)
 * because these pairs exist only for canvas nodes and have no theme tokens yet.
 */
export const NODE_COLORS: NodeColorPair[] = [
  { id: "slate", background: "#1E293B", text: "#E2E8F0" },
  { id: "sky", background: "#0F2A3F", text: "#7DD3FC" },
  { id: "emerald", background: "#0F2E22", text: "#6EE7B7" },
  { id: "amber", background: "#33270A", text: "#FCD34D" },
  { id: "rose", background: "#3A1220", text: "#FDA4AF" },
  { id: "violet", background: "#241A3A", text: "#C4B5FD" },
]

/** Color pair applied to freshly dropped nodes. */
export const DEFAULT_NODE_COLOR_PAIR = NODE_COLORS[0]

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
