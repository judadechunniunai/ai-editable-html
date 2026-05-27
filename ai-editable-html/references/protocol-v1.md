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
  "content": "Editable text"
}
```

Rules:

- `id` is stable and unique.
- `selector` should prefer `data-edit-id`.
- `content` stores plain text. Rich text is not supported in v1.

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
- Node `type` is optional. Recommended values are `start`, `decision`, `action`, and `end`.
- Renderers should add `.ai-flow-node-${type}` classes when `type` is present.

## Extension Contract

The browser extension is allowed to:

- Update text element `textContent` and its matching text block `content`.
- Update flow node `x` and `y`.
- Add or delete flow nodes.
- Add or delete flow edges.
- Rewrite the JSON inside `#ai-editable-html-model`.
- Download the edited page as a new HTML file.

The extension should not need to call an AI model for these operations.
