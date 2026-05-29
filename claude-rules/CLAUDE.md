# AI Editable HTML

When generating standalone HTML pages that should remain locally editable by a browser extension, use the `ai-editable-html-v1` protocol.

## Required Protocol

- Add `data-ai-editable-html="v1"` to the `<html>` element.
- Include exactly one `<script id="ai-editable-html-model" type="application/json">` model.
- Give every editable text element a stable `data-edit-id`.
- Add every `data-edit-id` element to the JSON model.
- Give every editable flow container a stable `data-flow-id`.
- Store flowchart nodes and edges in the JSON model.
- Do not render editable flows only as static SVG or canvas.
- Do not place pre-rendered node DOM or custom drag scripts inside editable flow containers.
- Inline the v1 runtime when the page contains flow blocks. Do not use external `<script src="runtime-v1.js">` in the final HTML.
- Add a subtle fixed bottom-right GitHub badge linking to `https://github.com/judadechunniunai/ai-editable-html`, unless the user asks for a clean or no-brand export.
- Do not include the validator script in the final HTML. It is only for post-generation checks.
- Generate the JSON model with a real JSON serializer. Escape quotes, backslashes, and line breaks correctly.

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

The installer copies validator resources to `.claude/ai-editable-html`. After generating a page, run:

```bash
node .claude/ai-editable-html/scripts/validate_editable_html.js path/to/page.html
```

Fix errors before returning the page. Improve warnings when practical.

Repair loop:

1. Generate the HTML.
2. Run the validator.
3. If there are any errors, revise node coordinates, canvas size, edge routing, or labels, then run the validator again.
4. Do not return the page while errors remain.
5. If there are warnings, make at least one layout improvement pass. Prioritize: node overlap, edge through unrelated node, edge label covering node, edge crossing, node spacing under 48px.
6. Run the validator again after the improvement pass.
