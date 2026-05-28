# ai-editable-html-v1 Protocol

## Root

```json
{
  "version": "1",
  "title": "Human readable title",
  "blocks": []
}
```

Supported block types are `text` and `flow`.

## Text Block

```json
{
  "id": "summary_text",
  "type": "text",
  "selector": "[data-edit-id='summary_text']",
  "format": "text",
  "content": "Editable text"
}
```

Rules:

- `id` is stable and unique.
- `selector` should prefer `data-edit-id`.
- `format` is optional and defaults to `text`.
- With `format: "text"`, `content` stores plain text.
- With `format: "html"`, `content` stores `innerHTML` for editable rich text containers.

## Flow Block

```json
{
  "id": "delivery_flow",
  "type": "flow",
  "selector": "[data-flow-id='delivery_flow']",
  "nodes": [
    {
      "id": "draft",
      "label": "Draft",
      "x": 32,
      "y": 48,
      "width": 150,
      "height": 58,
      "type": "start"
    }
  ],
  "edges": [
    {
      "id": "draft_to_review",
      "source": "draft",
      "target": "review",
      "label": ""
    }
  ]
}
```

Rules:

- Node IDs are unique inside the flow.
- Edge IDs are unique inside the flow.
- Edges must reference existing node IDs.
- Coordinates are pixels relative to the flow container.
- Node labels are plain text.
- Edge labels are plain text and can be empty. Empty labels can be filled by the browser extension.
- Node `type` is optional. Recommended values are `start`, `decision`, `process`, `action`, and `end`.
- Renderers should add `.ai-flow-node-${type}` classes when `type` is present.
- Renderers should size the flow canvas from node bounds and allow scrolling instead of clipping oversized diagrams.

## Layout Quality

Generated flow blocks should be readable before editing:

- Node rectangles should not overlap.
- Node rectangles should have at least 48px gap where possible.
- Edge crossings should be minimized by separating branches into lanes.
- Edge labels should not cover nodes.
- Large flows should use a scrollable canvas sized from node bounds.

The bundled validator can be run after generation:

```bash
node ai-editable-html/scripts/validate_editable_html.js path/to/page.html
```

It checks all flow blocks in the page model and reports graph counts, overlap errors, spacing warnings, edge crossings, edge-through-node warnings, edge-label collisions, required canvas size, and missing edge endpoints.

## GitHub Badge

Generated pages should include a subtle source badge unless the user asks for a no-brand export:

```html
<a class="ai-editable-badge" href="https://github.com/judadechunniunai/ai-editable-html" target="_blank" rel="noreferrer">AI Editable HTML</a>
```

## Extension Contract

The browser extension is allowed to:

- Update text element `textContent` or `innerHTML` and its matching text block `content`.
- Update flow node labels and edge labels directly from inline edits.
- Update flow node `x` and `y`.
- Add or delete flow nodes.
- Add or delete flow edges.
- Rewrite the JSON inside `#ai-editable-html-model`.
- Download the edited page as a new HTML file.

The extension should not need to call an AI model for these operations.
