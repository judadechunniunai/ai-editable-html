(function () {
  if (window.__aiEditableHtmlLoaded) return;
  window.__aiEditableHtmlLoaded = true;

  var modelEl = document.getElementById("ai-editable-html-model");
  var isProtocolPage = document.documentElement.getAttribute("data-ai-editable-html") === "v1";
  if (!modelEl || !isProtocolPage) return;

  var state = {
    model: null,
    selectedFlowId: "",
    mode: "select",
    linkSource: null
  };

  function parseModel() {
    try {
      state.model = JSON.parse(modelEl.textContent);
    } catch (error) {
      toast("Invalid ai-editable-html model JSON.");
      state.model = null;
    }
  }

  function writeModel() {
    modelEl.textContent = "\n" + JSON.stringify(state.model, null, 2) + "\n";
  }

  function blocks(type) {
    if (!state.model || !Array.isArray(state.model.blocks)) return [];
    return state.model.blocks.filter(function (block) { return block.type === type; });
  }

  function flowById(id) {
    return blocks("flow").find(function (block) { return block.id === id; }) || null;
  }

  function nodeById(flow, id) {
    return (flow.nodes || []).find(function (node) { return node.id === id; }) || null;
  }

  function center(node) {
    return {
      x: Number(node.x || 0) + Number(node.width || 140) / 2,
      y: Number(node.y || 0) + Number(node.height || 56) / 2
    };
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function safeClass(value) {
    return String(value || "action").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  }

  function makeId(prefix, list) {
    var used = {};
    list.forEach(function (item) { used[item.id] = true; });
    var i = list.length + 1;
    while (used[prefix + "_" + i]) i += 1;
    return prefix + "_" + i;
  }

  function toast(message) {
    var el = document.createElement("div");
    el.className = "aieh-toast";
    el.textContent = message;
    document.documentElement.appendChild(el);
    setTimeout(function () { el.remove(); }, 2400);
  }

  function initTextEditing() {
    blocks("text").forEach(function (block) {
      var el = document.querySelector(block.selector);
      if (!el) return;
      el.classList.add("aieh-editable-text");
      el.setAttribute("contenteditable", "true");
      el.setAttribute("spellcheck", "true");
      el.addEventListener("input", function () {
        block.content = el.textContent;
        writeModel();
      });
    });
  }

  function renderAllFlows() {
    blocks("flow").forEach(renderFlow);
  }

  function renderFlow(flow) {
    var container = document.querySelector(flow.selector);
    if (!container) return;

    var nodes = Array.isArray(flow.nodes) ? flow.nodes : (flow.nodes = []);
    var edges = Array.isArray(flow.edges) ? flow.edges : (flow.edges = []);
    var width = Math.max(container.clientWidth || 640, 320);
    var height = Math.max(container.clientHeight || 320, 240);
    var byId = {};
    nodes.forEach(function (node) { byId[node.id] = node; });

    container.classList.add("aieh-flow-editor");
    container.innerHTML = "";

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "aieh-lines");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("preserveAspectRatio", "none");
    container.appendChild(svg);

    edges.forEach(function (edge) {
      var source = byId[edge.source];
      var target = byId[edge.target];
      if (!source || !target) return;
      var a = center(source);
      var b = center(target);
      var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", a.x);
      line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x);
      line.setAttribute("y2", b.y);
      line.dataset.edgeId = edge.id;
      line.addEventListener("click", function (event) {
        event.stopPropagation();
        if (state.mode === "delete") {
          flow.edges = edges.filter(function (candidate) { return candidate.id !== edge.id; });
          writeModel();
          renderFlow(flow);
        }
      });
      svg.appendChild(line);
      if (edge.label) {
        var label = document.createElement("div");
        label.className = "aieh-edge-label ai-flow-edge-label";
        label.dataset.edgeId = edge.id;
        label.textContent = edge.label;
        label.style.left = ((a.x + b.x) / 2) + "px";
        label.style.top = ((a.y + b.y) / 2) + "px";
        container.appendChild(label);
      }
    });

    nodes.forEach(function (node) {
      var el = document.createElement("div");
      el.className = "aieh-node ai-flow-node ai-flow-node-" + safeClass(node.type);
      el.dataset.nodeId = node.id;
      el.textContent = node.label || node.id;
      el.style.left = Number(node.x || 0) + "px";
      el.style.top = Number(node.y || 0) + "px";
      el.style.width = Number(node.width || 140) + "px";
      el.style.height = Number(node.height || 56) + "px";
      if (state.linkSource === node.id) el.classList.add("is-link-source");

      el.addEventListener("dblclick", function (event) {
        event.stopPropagation();
        var label = prompt("Node label", node.label || node.id);
        if (label == null) return;
        node.label = label;
        writeModel();
        renderFlow(flow);
      });

      el.addEventListener("click", function (event) {
        event.stopPropagation();
        if (state.mode === "edge") {
          handleEdgeClick(flow, node.id);
        } else if (state.mode === "delete") {
          flow.nodes = nodes.filter(function (candidate) { return candidate.id !== node.id; });
          flow.edges = edges.filter(function (edge) { return edge.source !== node.id && edge.target !== node.id; });
          state.linkSource = null;
          writeModel();
          renderFlow(flow);
        }
      });

      el.addEventListener("pointerdown", function (event) {
        if (state.mode !== "select") return;
        event.preventDefault();
        el.setPointerCapture(event.pointerId);
        var startX = event.clientX;
        var startY = event.clientY;
        var baseX = Number(node.x || 0);
        var baseY = Number(node.y || 0);

        function move(moveEvent) {
          node.x = Math.round(baseX + moveEvent.clientX - startX);
          node.y = Math.round(baseY + moveEvent.clientY - startY);
          el.style.left = node.x + "px";
          el.style.top = node.y + "px";
          updateLines(container, flow);
        }

        function up() {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerup", up);
          writeModel();
        }

        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
      });

      container.appendChild(el);
    });
  }

  function updateLines(container, flow) {
    var byId = {};
    (flow.nodes || []).forEach(function (node) { byId[node.id] = node; });
    container.querySelectorAll("line[data-edge-id]").forEach(function (line) {
      var edge = (flow.edges || []).find(function (candidate) { return candidate.id === line.dataset.edgeId; });
      if (!edge || !byId[edge.source] || !byId[edge.target]) return;
      var a = center(byId[edge.source]);
      var b = center(byId[edge.target]);
      line.setAttribute("x1", a.x);
      line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x);
      line.setAttribute("y2", b.y);
      var label = container.querySelector('.aieh-edge-label[data-edge-id="' + CSS.escape(edge.id) + '"]');
      if (label) {
        label.style.left = ((a.x + b.x) / 2) + "px";
        label.style.top = ((a.y + b.y) / 2) + "px";
      }
    });
  }

  function handleEdgeClick(flow, nodeId) {
    if (!state.linkSource) {
      state.linkSource = nodeId;
      renderFlow(flow);
      return;
    }
    if (state.linkSource === nodeId) {
      state.linkSource = null;
      renderFlow(flow);
      return;
    }
    var edgeId = makeId(state.linkSource + "_to_" + nodeId, flow.edges || []);
    flow.edges.push({ id: edgeId, source: state.linkSource, target: nodeId, label: "" });
    state.linkSource = null;
    writeModel();
    renderFlow(flow);
  }

  function addNode() {
    var flow = flowById(state.selectedFlowId);
    if (!flow) return;
    flow.nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
    var id = makeId("node", flow.nodes);
    flow.nodes.push({ id: id, label: "New node", x: 48, y: 48, width: 140, height: 56 });
    writeModel();
    renderFlow(flow);
  }

  function downloadHtml() {
    writeModel();
    var html = "<!doctype html>\n" + document.documentElement.outerHTML;
    var blob = new Blob([html], { type: "text/html;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    var title = state.model && state.model.title ? state.model.title : "ai-editable-page";
    a.href = url;
    a.download = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".html";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  function setMode(mode) {
    state.mode = mode;
    state.linkSource = null;
    document.querySelectorAll(".aieh-mode").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.mode === mode);
    });
    renderAllFlows();
  }

  function buildToolbar() {
    var flows = blocks("flow");
    if (flows.length) state.selectedFlowId = flows[0].id;

    var toolbar = document.createElement("div");
    toolbar.className = "aieh-toolbar";

    var select = document.createElement("select");
    flows.forEach(function (flow) {
      var option = document.createElement("option");
      option.value = flow.id;
      option.textContent = flow.id;
      select.appendChild(option);
    });
    select.addEventListener("change", function () {
      state.selectedFlowId = select.value;
    });
    toolbar.appendChild(select);

    [["select", "Move"], ["edge", "Edge"], ["delete", "Delete"]].forEach(function (entry) {
      var button = document.createElement("button");
      button.className = "aieh-mode";
      button.dataset.mode = entry[0];
      button.textContent = entry[1];
      button.addEventListener("click", function () { setMode(entry[0]); });
      toolbar.appendChild(button);
    });

    var add = document.createElement("button");
    add.textContent = "Add node";
    add.addEventListener("click", addNode);
    toolbar.appendChild(add);

    var save = document.createElement("button");
    save.textContent = "Download";
    save.addEventListener("click", downloadHtml);
    toolbar.appendChild(save);

    document.documentElement.appendChild(toolbar);
    setMode("select");
  }

  parseModel();
  if (!state.model) return;
  initTextEditing();
  renderAllFlows();
  buildToolbar();
  toast("AI Editable HTML editor enabled.");
})();
