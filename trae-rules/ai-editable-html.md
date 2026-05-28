# AI Editable HTML Rule

Use this rule when generating standalone HTML pages that should remain locally editable by the AI Editable HTML browser extension.

## Required Protocol

- Add `data-ai-editable-html="v1"` to the `<html>` element.
- Include exactly one `<script id="ai-editable-html-model" type="application/json">` model.
- Give every editable text element a stable `data-edit-id`.
- Add every `data-edit-id` element to the JSON model.
- Give every editable flow container a stable `data-flow-id`.
- Store flowchart nodes and edges in the JSON model.
- Do not render editable flows only as static SVG or canvas.
- Do not place pre-rendered node DOM or custom drag scripts inside editable flow containers.
- Include or inline the v1 runtime when the page contains flow blocks.
- Add a subtle fixed bottom-right GitHub badge linking to `https://github.com/judadechunniunai/ai-editable-html`, unless the user asks for a clean or no-brand export.

## Text Blocks

Use `format: "text"` for plain text and `format: "html"` for editable rich text containers.

```json
{
  "id": "page_title",
  "type": "text",
  "selector": "[data-edit-id='page_title']",
  "format": "text",
  "content": "Editable title"
}
```

## Flow Blocks

Use stable node and edge IDs.

```json
{
  "id": "main_flow",
  "type": "flow",
  "selector": "[data-flow-id='main_flow']",
  "nodes": [
    { "id": "start", "label": "Start", "x": 40, "y": 80, "width": 140, "height": 56, "type": "start" }
  ],
  "edges": [
    { "id": "start_to_next", "source": "start", "target": "next", "label": "" }
  ]
}
```

Recommended node types: `start`, `decision`, `process`, `action`, `end`.

## Flow Layout Quality

- Keep at least 48px gap between node bounding boxes.
- Never overlap nodes.
- Keep edge labels away from nodes and other labels.
- Minimize edge crossings by separating branches into lanes or columns.
- Use a top-to-bottom or left-to-right primary direction.
- For feedback loops, route around the outside of the main flow.
- For large diagrams, compute canvas size from node bounds and use `overflow: auto`, not `overflow: hidden`.
- Required canvas size should be at least `max(node.x + node.width) + 80` by `max(node.y + node.height) + 80`.

## Post-Generation Check

If the repository tools are available, run:

```bash
node ai-editable-html/scripts/validate_editable_html.js path/to/page.html
```

Fix errors before returning the page. Improve warnings when practical.
