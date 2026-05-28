#!/usr/bin/env node

const fs = require("fs");

const file = process.argv[2];
if (!file) {
  console.error("Usage: node validate_editable_html.js <page.html>");
  process.exit(2);
}

const html = fs.readFileSync(file, "utf8");
const modelMatch = html.match(/<script\s+[^>]*id=["']ai-editable-html-model["'][^>]*>([\s\S]*?)<\/script>/i);

const report = {
  file,
  flowCount: 0,
  flows: [],
  warnings: [],
  errors: []
};

function add(kind, flowId, message, data) {
  report[kind].push({ flowId, message, data });
}

function rect(node) {
  return {
    id: node.id,
    x1: Number(node.x || 0),
    y1: Number(node.y || 0),
    x2: Number(node.x || 0) + Number(node.width || 140),
    y2: Number(node.y || 0) + Number(node.height || 56)
  };
}

function intersects(a, b, gap = 0) {
  return !(
    a.x2 + gap <= b.x1 ||
    b.x2 + gap <= a.x1 ||
    a.y2 + gap <= b.y1 ||
    b.y2 + gap <= a.y1
  );
}

function center(node) {
  return {
    x: Number(node.x || 0) + Number(node.width || 140) / 2,
    y: Number(node.y || 0) + Number(node.height || 56) / 2
  };
}

function orientation(a, b, c) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) < 1e-9) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a, b, c) {
  return (
    Math.min(a.x, c.x) <= b.x &&
    b.x <= Math.max(a.x, c.x) &&
    Math.min(a.y, c.y) <= b.y &&
    b.y <= Math.max(a.y, c.y)
  );
}

function segmentsIntersect(a1, a2, b1, b2) {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a1, b1, a2)) return true;
  if (o2 === 0 && onSegment(a1, b2, a2)) return true;
  if (o3 === 0 && onSegment(b1, a1, b2)) return true;
  if (o4 === 0 && onSegment(b1, a2, b2)) return true;
  return false;
}

function segmentIntersectsRect(a, b, r) {
  if (a.x > r.x1 && a.x < r.x2 && a.y > r.y1 && a.y < r.y2) return true;
  if (b.x > r.x1 && b.x < r.x2 && b.y > r.y1 && b.y < r.y2) return true;
  const corners = [
    { x: r.x1, y: r.y1 },
    { x: r.x2, y: r.y1 },
    { x: r.x2, y: r.y2 },
    { x: r.x1, y: r.y2 }
  ];
  return [0, 1, 2, 3].some((i) => segmentsIntersect(a, b, corners[i], corners[(i + 1) % 4]));
}

function validateFlow(flow) {
  const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
  const edges = Array.isArray(flow.edges) ? flow.edges : [];
  const nodeRects = nodes.map(rect);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edgeSegments = [];
  let maxX = 0;
  let maxY = 0;

  nodeRects.forEach((r) => {
    maxX = Math.max(maxX, r.x2);
    maxY = Math.max(maxY, r.y2);
  });

  const flowSummary = {
    id: flow.id,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    requiredCanvasWidth: Math.ceil(maxX + 80),
    requiredCanvasHeight: Math.ceil(maxY + 80)
  };
  report.flows.push(flowSummary);

  nodes.forEach((node) => {
    if (!node.id) add("errors", flow.id, "Node missing id", node);
    if (!node.label) add("warnings", flow.id, "Node has empty label", { nodeId: node.id });
    if (Number(node.x || 0) < 0 || Number(node.y || 0) < 0) {
      add("errors", flow.id, "Node has negative coordinates", { nodeId: node.id, x: node.x, y: node.y });
    }
  });

  for (let i = 0; i < nodeRects.length; i += 1) {
    for (let j = i + 1; j < nodeRects.length; j += 1) {
      if (intersects(nodeRects[i], nodeRects[j], 0)) {
        add("errors", flow.id, "Nodes overlap", { a: nodeRects[i].id, b: nodeRects[j].id });
      } else if (intersects(nodeRects[i], nodeRects[j], 48)) {
        add("warnings", flow.id, "Nodes are closer than 48px", { a: nodeRects[i].id, b: nodeRects[j].id });
      }
    }
  }

  edges.forEach((edge) => {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) {
      add("errors", flow.id, "Edge references missing node", edge);
      return;
    }
    edgeSegments.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      a: center(source),
      b: center(target),
      label: edge.label || ""
    });
  });

  for (let i = 0; i < edgeSegments.length; i += 1) {
    for (let j = i + 1; j < edgeSegments.length; j += 1) {
      const a = edgeSegments[i];
      const b = edgeSegments[j];
      const sharesNode = a.source === b.source || a.source === b.target || a.target === b.source || a.target === b.target;
      if (!sharesNode && segmentsIntersect(a.a, a.b, b.a, b.b)) {
        add("warnings", flow.id, "Edges cross", { a: a.id, b: b.id });
      }
    }
  }

  edgeSegments.forEach((edge) => {
    nodeRects.forEach((nodeRect) => {
      if (nodeRect.id === edge.source || nodeRect.id === edge.target) return;
      if (segmentIntersectsRect(edge.a, edge.b, nodeRect)) {
        add("warnings", flow.id, "Edge passes through unrelated node", { edge: edge.id, node: nodeRect.id });
      }
    });

    if (edge.label) {
      const midpoint = {
        x1: (edge.a.x + edge.b.x) / 2 - 36,
        y1: (edge.a.y + edge.b.y) / 2 - 14,
        x2: (edge.a.x + edge.b.x) / 2 + 36,
        y2: (edge.a.y + edge.b.y) / 2 + 14
      };
      nodeRects.forEach((nodeRect) => {
        if (intersects(midpoint, nodeRect, 0)) {
          add("warnings", flow.id, "Edge label may cover a node", { edge: edge.id, node: nodeRect.id, label: edge.label });
        }
      });
    }
  });
}

if (!modelMatch) {
  report.errors.push({ message: "Missing #ai-editable-html-model script" });
} else {
  try {
    const model = JSON.parse(modelMatch[1]);
    const flows = Array.isArray(model.blocks) ? model.blocks.filter((block) => block.type === "flow") : [];
    report.flowCount = flows.length;
    flows.forEach(validateFlow);
  } catch (error) {
    report.errors.push({ message: "Model JSON does not parse", error: error.message });
  }
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.errors.length ? 1 : 0);
