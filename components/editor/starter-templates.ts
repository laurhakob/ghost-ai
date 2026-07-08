import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  DEFAULT_EDGE_MARKER,
  NODE_COLORS,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeShape,
  type NodeColorPair,
} from "@/types/canvas"

/**
 * A predefined starter diagram the user can import to replace their canvas.
 * Built entirely from the shared canvas node/edge types so imported items look
 * and behave exactly like hand-drawn ones.
 */
export interface CanvasTemplate {
  id: string
  name: string
  description: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

/** Default drop sizes per shape, mirroring the shape panel, so nodes look right. */
const SHAPE_SIZE: Record<CanvasNodeShape, { width: number; height: number }> = {
  rectangle: { width: 160, height: 90 },
  diamond: { width: 140, height: 140 },
  circle: { width: 110, height: 110 },
  pill: { width: 160, height: 64 },
  cylinder: { width: 120, height: 140 },
  hexagon: { width: 150, height: 120 },
}

/** Resolves a palette pair by id, falling back to the default (first) pair. */
function palette(id: string): NodeColorPair {
  return NODE_COLORS.find((pair) => pair.id === id) ?? NODE_COLORS[0]
}

/** Builds a template node from readable inputs, filling in size + color data. */
function node(
  id: string,
  shape: CanvasNodeShape,
  x: number,
  y: number,
  label: string,
  colorId: string,
): CanvasNode {
  const { width, height } = SHAPE_SIZE[shape]
  const pair = palette(colorId)
  return {
    id,
    type: CANVAS_NODE_TYPE,
    position: { x, y },
    width,
    height,
    style: { width, height },
    data: { label, color: pair.background, textColor: pair.text, shape },
  }
}

/** Builds a template edge between two node ids, with the shared arrowhead. */
function edge(source: string, target: string, label = ""): CanvasEdge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    type: CANVAS_EDGE_TYPE,
    markerEnd: DEFAULT_EDGE_MARKER,
    data: { label },
  }
}

/** The built-in starter templates offered in the import modal. */
export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "microservices",
    name: "Microservices",
    description:
      "An API gateway fanning out to independent services backed by a shared database.",
    nodes: [
      node("gateway", "rectangle", 250, 0, "API Gateway", "sky"),
      node("auth", "rectangle", 40, 180, "Auth Service", "emerald"),
      node("orders", "rectangle", 250, 180, "Orders Service", "emerald"),
      node("payments", "rectangle", 460, 180, "Payments Service", "emerald"),
      node("db", "cylinder", 270, 380, "Database", "amber"),
    ],
    edges: [
      edge("gateway", "auth"),
      edge("gateway", "orders"),
      edge("gateway", "payments"),
      edge("auth", "db"),
      edge("orders", "db"),
      edge("payments", "db"),
    ],
  },
  {
    id: "cicd-pipeline",
    name: "CI/CD Pipeline",
    description:
      "A linear build-test-deploy pipeline from commit through to production.",
    nodes: [
      node("commit", "circle", 0, 20, "Commit", "slate"),
      node("build", "rectangle", 180, 5, "Build", "sky"),
      node("test", "rectangle", 400, 5, "Test", "violet"),
      node("deploy", "rectangle", 620, 5, "Deploy", "rose"),
      node("prod", "cylinder", 840, -10, "Production", "emerald"),
    ],
    edges: [
      edge("commit", "build"),
      edge("build", "test"),
      edge("test", "deploy"),
      edge("deploy", "prod"),
    ],
  },
  {
    id: "event-driven",
    name: "Event-Driven System",
    description:
      "A producer publishing to an event broker that fans out to multiple consumers.",
    nodes: [
      node("producer", "rectangle", 0, 150, "Producer", "sky"),
      node("broker", "hexagon", 240, 135, "Event Broker", "violet"),
      node("consumer-a", "rectangle", 470, 0, "Consumer A", "emerald"),
      node("consumer-b", "rectangle", 470, 150, "Consumer B", "emerald"),
      node("consumer-c", "rectangle", 470, 300, "Consumer C", "emerald"),
    ],
    edges: [
      edge("producer", "broker"),
      edge("broker", "consumer-a"),
      edge("broker", "consumer-b"),
      edge("broker", "consumer-c"),
    ],
  },
]
