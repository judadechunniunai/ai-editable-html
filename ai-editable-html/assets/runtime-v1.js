(function () {
  function getModel() {
    var el = document.getElementById("ai-editable-html-model");
    if (!el) return null;
    try {
      return JSON.parse(el.textContent);
    } catch (error) {
      console.warn("Invalid ai-editable-html model", error);
      return null;
    }
  }

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function center(node) {
    return {
      x: Number(node.x || 0) + Number(node.width || 140) / 2,
      y: Number(node.y || 0) + Number(node.height || 56) / 2
    };
  }

  function safeClass(value) {
    return String(value || "action").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  }

  function flowBounds(nodes) {
    var maxX = 0;
    var maxY = 0;
    nodes.forEach(function (node) {
      maxX = Math.max(maxX, Number(node.x || 0) + Number(node.width || 140));
      maxY = Math.max(maxY, Number(node.y || 0) + Number(node.height || 56));
    });
    return {
      width: Math.ceil(maxX + 80),
      height: Math.ceil(maxY + 80)
    };
  }

  function renderFlow(block) {
    var container = document.querySelector(block.selector);
    if (!container) return;

    container.classList.add("ai-editable-flow-rendered");
    container.style.position = container.style.position || "relative";
    container.style.overflow = "auto";

    var nodes = Array.isArray(block.nodes) ? block.nodes : [];
    var edges = Array.isArray(block.edges) ? block.edges : [];
    var byId = {};
    nodes.forEach(function (node) {
      byId[node.id] = node;
    });

    var bounds = flowBounds(nodes);
    var width = Math.max(container.clientWidth || 640, bounds.width, 320);
    var height = Math.max(container.clientHeight || 320, bounds.height, 240);
    container.style.minWidth = width + "px";
    container.style.minHeight = height + "px";
    var html = '<svg class="ai-flow-lines" viewBox="0 0 ' + width + " " + height + '" preserveAspectRatio="none">';
    var labelHtml = "";

    edges.forEach(function (edge) {
      var source = byId[edge.source];
      var target = byId[edge.target];
      if (!source || !target) return;
      var a = center(source);
      var b = center(target);
      html += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" />';
      if (edge.label) {
        labelHtml += '<div class="ai-flow-edge-label" style="left:' + ((a.x + b.x) / 2) + "px;top:" + ((a.y + b.y) / 2) + 'px;">' + escapeText(edge.label) + "</div>";
      }
    });

    html += "</svg>" + labelHtml;

    nodes.forEach(function (node) {
      var typeClass = "ai-flow-node-" + safeClass(node.type);
      html += '<div class="ai-flow-node ' + typeClass + '" data-node-id="' + escapeText(node.id) + '" style="left:' + Number(node.x || 0) + "px;top:" + Number(node.y || 0) + "px;width:" + Number(node.width || 140) + "px;height:" + Number(node.height || 56) + 'px;">' + escapeText(node.label) + "</div>";
    });

    container.innerHTML = html;
  }

  function renderAll() {
    var model = getModel();
    if (!model || !Array.isArray(model.blocks)) return;
    model.blocks.filter(function (block) { return block.type === "flow"; }).forEach(renderFlow);
  }

  var style = document.createElement("style");
  style.textContent = ".ai-editable-flow-rendered{background:#f8fafc;border:1px solid #d8dee8;border-radius:8px}.ai-flow-lines{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}.ai-flow-lines line{stroke:#64748b;stroke-width:2}.ai-flow-edge-label{position:absolute;z-index:2;transform:translate(-50%,-50%);padding:4px 10px;border-radius:999px;background:#fff;color:#526070;font:600 12px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 2px 8px rgba(15,23,42,.12)}.ai-flow-node{position:absolute;display:flex;align-items:center;justify-content:center;padding:8px 12px;box-sizing:border-box;border:1px solid #94a3b8;border-radius:8px;background:#fff;color:#172033;font:600 14px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 6px 16px rgba(15,23,42,.08)}.ai-flow-node-start{border:0;background:linear-gradient(135deg,#11998e 0%,#38ef7d 100%);color:#fff}.ai-flow-node-decision{border:0;border-radius:0;background:linear-gradient(135deg,#fc4a1a 0%,#f7b733 100%);color:#fff;clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%);text-align:center}.ai-flow-node-action{border:0;background:linear-gradient(135deg,#4facfe 0%,#00f2fe 100%);color:#fff}.ai-flow-node-process{border:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff}.ai-flow-node-end{border:0;border-radius:999px;background:linear-gradient(135deg,#434343 0%,#000 100%);color:#fff}";
  document.head.appendChild(style);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAll);
  } else {
    renderAll();
  }

  window.aiEditableHtmlRender = renderAll;
})();
