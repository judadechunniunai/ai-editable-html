---
name: ai-editable-html
description: Generate single-file HTML pages that remain locally editable after generation. Use when creating AI-authored HTML intended for browser-side edits, especially editable text blocks and flowcharts with draggable nodes, add/delete nodes, add/delete edges, and stable data that can be edited by the AI Editable HTML Chrome extension.
---

# AI Editable HTML

Create self-contained HTML that follows the `ai-editable-html-v1` protocol so browser tools can make small deterministic edits without regenerating the page.

## Output Requirements

Always produce one complete HTML document. The document must:

- Add `data-ai-editable-html="v1"` to the `<html>` element.
- Include exactly one model script:

```html
<script id="ai-editable-html-model" type="application/json">
{
  "version": "1",
  "title": "Page title",
  "blocks": []
}
</script>
```

- Give every editable text element a stable `data-edit-id`.
- Add every `data-edit-id` element to the JSON model. Include body copy, captions, lists, and explanatory sections, not only headings.
- Give every editable flow container a stable `data-flow-id`.
- Keep flowchart data in the JSON model, not only in SVG or canvas.
- Include the runtime from `assets/runtime-v1.js` inline before `</body>` when the page contains a flow block.
- Avoid minifying the model JSON. Keep it readable.
- Do not place pre-rendered node DOM, static flow SVG, or custom drag scripts inside editable flow containers. The runtime and browser extension must be the only code that renders or edits flow nodes.

## Editable Text Blocks

For every user-facing text that should be directly editable, add a text block:

```json
{
  "id": "hero_title",
  "type": "text",
  "selector": "[data-edit-id='hero_title']",
  "format": "text",
  "content": "Quarterly launch plan"
}
```

The DOM content should match `content`:

```html
<h1 data-edit-id="hero_title">Quarterly launch plan</h1>
```

Use stable lower_snake_case IDs. Do not use generated random IDs.

For editable rich text containers, preserve markup with `format: "html"`:

```json
{
  "id": "details",
  "type": "text",
  "selector": "[data-edit-id='details']",
  "format": "html",
  "content": "<p>Editable paragraph.</p><ol><li>Editable list item.</li></ol>"
}
```

## Editable Flow Blocks

Represent flowcharts with a flow block:

```json
{
  "id": "main_flow",
  "type": "flow",
  "selector": "[data-flow-id='main_flow']",
  "nodes": [
    { "id": "idea", "label": "Idea", "x": 40, "y": 80, "width": 140, "height": 56 },
    { "id": "review", "label": "Review", "x": 260, "y": 80, "width": 140, "height": 56 }
  ],
  "edges": [
    { "id": "idea_to_review", "source": "idea", "target": "review", "label": "" }
  ]
}
```

The container should be a normal block element:

```html
<section class="flow-wrap">
  <div data-flow-id="main_flow" class="ai-flow"></div>
</section>
```

Flow node coordinates are local to the flow container. Use a container with an explicit `height`, `min-height`, or `aspect-ratio`.

For large or complex flows, compute the canvas size from node bounds:

- `canvas width >= max(node.x + node.width) + 80`
- `canvas height >= max(node.y + node.height) + 80`
- Set the flow container `min-width` and `min-height` to those values or larger.
- Use `overflow: auto`, not `overflow: hidden`, so large diagrams remain inspectable.
- Do not rely on a small fixed-height frame when any node coordinate exceeds that frame.

Optional node `type` values can be used for styling:

- `start`
- `decision`
- `process`
- `action`
- `end`

Style these through `.ai-flow-node-start`, `.ai-flow-node-decision`, `.ai-flow-node-process`, `.ai-flow-node-action`, and `.ai-flow-node-end`. The extension reuses these classes while editing.

Edge labels are directly editable in the browser extension. Use an empty string when a label is not needed yet; the extension can fill it later.

## Styling Guidance

- Make pages attractive as normal standalone HTML even before editing.
- Use regular HTML/CSS for layout.
- Use the runtime only to render flow blocks from the model.
- Do not draw editable flows as static SVG only.
- Do not use canvas for editable text or flow blocks.
- Do not add page-level mouse drag handlers for flow nodes. Dragging is an editor feature, not a normal display feature.
- Keep responsive CSS simple; flow node coordinates are edited in pixels.
- Prefer scrollable large canvases over clipping or shrinking complex diagrams until labels become unreadable.

## Validation Checklist

Before returning HTML:

- The model parses as JSON.
- Every text block selector resolves to one element.
- Every flow block selector resolves to one element.
- Every edge source and target matches an existing node ID.
- The inline runtime is present when flow blocks exist.
- The page remains useful if the browser extension is not installed.

See `references/protocol-v1.md` for the full model shape and `assets/example-editable-page.html` for a compact example.
