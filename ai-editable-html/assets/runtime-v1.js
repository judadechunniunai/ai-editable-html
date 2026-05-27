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

  function renderFlow(block) {
    var container = document.querySelector(block.selector);
    if (!container) return;

    container.classList.add("ai-editable-flow-rendered");
    container.style.position = container.style.position || "relative";
    container.style.overflow = container.style.overflow || "hidden";

    var nodes = Array.isArray(block.nodes) ? block.nodes : [];
    var edges = Array.isArray(block.edges) ? block.edges : [];
    var byId = {};
    nodes.forEach(function (node) {
      byId[node.id] = node;
    });

    var width = Math.max(container.clientWidth || 640, 320);
    var height = Math.max(container.clientHeight || 320, 240);
    var html = '<svg class="ai-flow-lines" viewBox="0 0 ' + width + " " + height + '" preserveAspectRatio="none">';

    edges.forEach(function (edge) {
      var source = byId[edge.source];
      var target = byId[edge.target];
      if (!source || !target) return;
      var a = center(source);
      var b = center(target);
      html += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" />';
    });

    html += "</svg>";

    nodes.forEach(function (node) {
      html += '<div class="ai-flow-node" style="left:' + Number(node.x || 0) + "px;top:" + Number(node.y || 0) + "px;width:" + Number(node.width || 140) + "px;height:" + Number(node.height || 56) + 'px;">' + escapeText(node.label) + "</div>";
    });

    container.innerHTML = html;
  }

  function renderAll() {
    var model = getModel();
    if (!model || !Array.isArray(model.blocks)) return;
    model.blocks.filter(function (block) { return block.type === "flow"; }).forEach(renderFlow);
  }

  var style = document.createElement("style");
  style.textContent = ".ai-editable-flow-rendered{background:#f8fafc;border:1px solid #d8dee8;border-radius:8px}.ai-flow-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.ai-flow-lines line{stroke:#64748b;stroke-width:2}.ai-flow-node{position:absolute;display:flex;align-items:center;justify-content:center;padding:8px 12px;box-sizing:border-box;border:1px solid #94a3b8;border-radius:8px;background:#fff;color:#172033;font:600 14px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 6px 16px rgba(15,23,42,.08)}";
  document.head.appendChild(style);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAll);
  } else {
    renderAll();
  }

  window.aiEditableHtmlRender = renderAll;
})();
