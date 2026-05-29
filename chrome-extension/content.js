(function () {
  if (window.__aiEditableHtmlLoaded) return;
  window.__aiEditableHtmlLoaded = true;

  var modelEl = document.getElementById("ai-editable-html-model");
  var isProtocolPage = document.documentElement.getAttribute("data-ai-editable-html") === "v1";
  if (!modelEl || !isProtocolPage) return;

  var state = {
    model: null,
    selectedFlowId: "",
    selectedNodeId: "",
    mode: "select",
    linkSource: null,
    nodeType: "action",
    undoStack: [],
    redoStack: [],
    historyLimit: 100,
    restoring: false,
    activeEditSnapshot: null,
    activeEditCommit: null
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

  function modelSnapshot() {
    return JSON.stringify(state.model);
  }

  function pushHistory(previousSnapshot) {
    var currentSnapshot = modelSnapshot();
    if (!previousSnapshot || previousSnapshot === currentSnapshot || state.restoring) return;
    state.undoStack.push(previousSnapshot);
    if (state.undoStack.length > state.historyLimit) state.undoStack.shift();
    state.redoStack = [];
    updateHistoryButtons();
  }

  function commitActiveEdit() {
    if (typeof state.activeEditCommit === "function") state.activeEditCommit();
  }

  function restoreSnapshot(snapshot) {
    if (!snapshot) return;
    try {
      state.restoring = true;
      state.model = JSON.parse(snapshot);
      writeModel();
      applyTextBlocksToDom();
      renderAllFlows();
    } catch (error) {
      toast("Cannot restore edit history.");
    } finally {
      state.restoring = false;
      updateHistoryButtons();
    }
  }

  function undoEdit() {
    commitActiveEdit();
    var activeSnapshot = state.activeEditSnapshot;
    if (activeSnapshot && activeSnapshot !== modelSnapshot()) {
      state.redoStack.push(modelSnapshot());
      state.activeEditSnapshot = null;
      state.activeEditCommit = null;
      restoreSnapshot(activeSnapshot);
      toast("Undo");
      return;
    }
    if (!state.undoStack.length) return;
    var currentSnapshot = modelSnapshot();
    var previousSnapshot = state.undoStack.pop();
    state.redoStack.push(currentSnapshot);
    restoreSnapshot(previousSnapshot);
    toast("Undo");
  }

  function redoEdit() {
    commitActiveEdit();
    if (!state.redoStack.length) return;
    state.activeEditSnapshot = null;
    state.activeEditCommit = null;
    var currentSnapshot = modelSnapshot();
    var nextSnapshot = state.redoStack.pop();
    state.undoStack.push(currentSnapshot);
    restoreSnapshot(nextSnapshot);
    toast("Redo");
  }

  function updateHistoryButtons() {
    var hasActiveUndo = !!(
      state.activeEditSnapshot &&
      state.activeEditSnapshot !== modelSnapshot()
    );
    document.querySelectorAll("[data-aieh-history='undo']").forEach(function (button) {
      button.disabled = !state.undoStack.length && !hasActiveUndo;
    });
    document.querySelectorAll("[data-aieh-history='redo']").forEach(function (button) {
      button.disabled = !state.redoStack.length;
    });
  }

  function ensureTextBlocksFromDom() {
    if (!state.model || !Array.isArray(state.model.blocks)) return;
    var known = {};
    state.model.blocks.forEach(function (block) {
      if (block.id) known[block.id] = true;
    });

    document.querySelectorAll("[data-edit-id]").forEach(function (el) {
      var id = el.getAttribute("data-edit-id");
      if (!id || known[id]) return;
      state.model.blocks.push({
        id: id,
        type: "text",
        selector: "[data-edit-id='" + id.replace(/'/g, "\\'") + "']",
        format: el.children.length ? "html" : "text",
        content: el.children.length ? el.innerHTML : el.textContent
      });
      known[id] = true;
    });
    writeModel();
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
      var editStartSnapshot = null;
      el.classList.add("aieh-editable-text");
      el.setAttribute("contenteditable", "true");
      el.setAttribute("spellcheck", "true");
      if (block.format === "html" && block.content && el.innerHTML.trim() !== String(block.content).trim()) {
        el.innerHTML = block.content;
      }
      el.addEventListener("focus", function () {
        editStartSnapshot = modelSnapshot();
        state.activeEditSnapshot = editStartSnapshot;
        state.activeEditCommit = function () {
          block.content = block.format === "html" ? el.innerHTML : el.textContent;
          writeModel();
        };
      });
      el.addEventListener("input", function () {
        block.content = block.format === "html" ? el.innerHTML : el.textContent;
        writeModel();
        updateHistoryButtons();
      });
      el.addEventListener("blur", function () {
        if (state.activeEditSnapshot === editStartSnapshot) commitActiveEdit();
        pushHistory(editStartSnapshot);
        if (state.activeEditSnapshot === editStartSnapshot) {
          state.activeEditSnapshot = null;
          state.activeEditCommit = null;
        }
        editStartSnapshot = null;
      });
    });
  }

  function applyTextBlocksToDom() {
    blocks("text").forEach(function (block) {
      var el = document.querySelector(block.selector);
      if (!el) return;
      if (block.format === "html") {
        if (el.innerHTML !== String(block.content || "")) el.innerHTML = block.content || "";
      } else if (el.textContent !== String(block.content || "")) {
        el.textContent = block.content || "";
      }
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
    var bounds = flowBounds(nodes);
    var width = Math.max(container.clientWidth || 640, bounds.width, 320);
    var height = Math.max(container.clientHeight || 320, bounds.height, 240);
    container.style.minWidth = width + "px";
    container.style.minHeight = height + "px";
    var byId = {};
    nodes.forEach(function (node) { byId[node.id] = node; });

    container.classList.add("aieh-flow-editor");
    container.innerHTML = "";

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ai-flow-lines aieh-lines");
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
          var beforeDeleteEdge = modelSnapshot();
          flow.edges = edges.filter(function (candidate) { return candidate.id !== edge.id; });
          writeModel();
          pushHistory(beforeDeleteEdge);
          renderFlow(flow);
        }
      });
      svg.appendChild(line);
      var label = document.createElement("div");
      label.className = "aieh-edge-label ai-flow-edge-label" + (edge.label ? "" : " is-empty");
      label.dataset.edgeId = edge.id;
      label.textContent = edge.label || "";
      label.setAttribute("contenteditable", "true");
      label.setAttribute("spellcheck", "true");
      label.style.left = ((a.x + b.x) / 2) + "px";
      label.style.top = ((a.y + b.y) / 2) + "px";
      var edgeEditStartSnapshot = null;
      label.addEventListener("input", function () {
        edge.label = label.textContent;
        label.classList.toggle("is-empty", !edge.label);
        writeModel();
        updateHistoryButtons();
      });
      label.addEventListener("focus", function () {
        edgeEditStartSnapshot = modelSnapshot();
        state.activeEditSnapshot = edgeEditStartSnapshot;
        state.activeEditCommit = function () {
          edge.label = label.textContent;
          label.classList.toggle("is-empty", !edge.label);
          writeModel();
        };
        label.classList.add("aieh-editing-inline");
      });
      label.addEventListener("blur", function () {
        label.classList.remove("aieh-editing-inline");
        if (state.activeEditSnapshot === edgeEditStartSnapshot) commitActiveEdit();
        label.classList.toggle("is-empty", !label.textContent);
        pushHistory(edgeEditStartSnapshot);
        if (state.activeEditSnapshot === edgeEditStartSnapshot) {
          state.activeEditSnapshot = null;
          state.activeEditCommit = null;
        }
        edgeEditStartSnapshot = null;
      });
      label.addEventListener("click", function (event) {
        event.stopPropagation();
      });
      container.appendChild(label);
    });

    nodes.forEach(function (node) {
      var el = document.createElement("div");
      el.className = "aieh-node ai-flow-node ai-flow-node-" + safeClass(node.type);
      el.dataset.nodeId = node.id;
      el.textContent = node.label || node.id;
      el.setAttribute("contenteditable", "true");
      el.setAttribute("spellcheck", "true");
      el.style.left = Number(node.x || 0) + "px";
      el.style.top = Number(node.y || 0) + "px";
      el.style.width = Number(node.width || 140) + "px";
      el.style.height = Number(node.height || 56) + "px";
      if (state.linkSource === node.id) el.classList.add("is-link-source");
      if (state.selectedFlowId === flow.id && state.selectedNodeId === node.id) el.classList.add("is-selected");
      var nodeEditStartSnapshot = null;

      el.addEventListener("input", function () {
        node.label = el.textContent;
        writeModel();
        updateHistoryButtons();
      });

      el.addEventListener("focus", function () {
        nodeEditStartSnapshot = modelSnapshot();
        state.activeEditSnapshot = nodeEditStartSnapshot;
        state.activeEditCommit = function () {
          node.label = el.textContent;
          writeModel();
        };
        el.classList.add("aieh-editing-inline");
      });

      el.addEventListener("blur", function () {
        el.classList.remove("aieh-editing-inline");
        if (state.activeEditSnapshot === nodeEditStartSnapshot) commitActiveEdit();
        pushHistory(nodeEditStartSnapshot);
        if (state.activeEditSnapshot === nodeEditStartSnapshot) {
          state.activeEditSnapshot = null;
          state.activeEditCommit = null;
        }
        nodeEditStartSnapshot = null;
      });

      el.addEventListener("click", function (event) {
        event.stopPropagation();
        state.selectedFlowId = flow.id;
        state.selectedNodeId = node.id;
        if (state.mode === "edge") {
          handleEdgeClick(flow, node.id);
        } else if (state.mode === "delete") {
          var beforeDelete = modelSnapshot();
          flow.nodes = nodes.filter(function (candidate) { return candidate.id !== node.id; });
          flow.edges = edges.filter(function (edge) { return edge.source !== node.id && edge.target !== node.id; });
          state.linkSource = null;
          state.selectedNodeId = "";
          writeModel();
          pushHistory(beforeDelete);
          renderFlow(flow);
        } else {
          container.querySelectorAll(".aieh-node.is-selected").forEach(function (selected) {
            selected.classList.remove("is-selected");
          });
          el.classList.add("is-selected");
        }
      });

      el.addEventListener("pointerdown", function (event) {
        if (state.mode !== "select") return;
        el.setPointerCapture(event.pointerId);
        var startX = event.clientX;
        var startY = event.clientY;
        var baseX = Number(node.x || 0);
        var baseY = Number(node.y || 0);
        var beforeDrag = modelSnapshot();
        var dragging = false;

        function move(moveEvent) {
          var dx = moveEvent.clientX - startX;
          var dy = moveEvent.clientY - startY;
          if (!dragging && Math.sqrt(dx * dx + dy * dy) < 4) return;
          dragging = true;
          moveEvent.preventDefault();
          node.x = Math.round(baseX + moveEvent.clientX - startX);
          node.y = Math.round(baseY + moveEvent.clientY - startY);
          el.style.left = node.x + "px";
          el.style.top = node.y + "px";
          updateLines(container, flow);
        }

        function up() {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerup", up);
          if (dragging) {
            writeModel();
            pushHistory(beforeDrag);
          }
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
    var beforeEdge = modelSnapshot();
    flow.edges.push({ id: edgeId, source: state.linkSource, target: nodeId, label: "" });
    state.linkSource = null;
    writeModel();
    pushHistory(beforeEdge);
    renderFlow(flow);
  }

  function addNode() {
    var flow = flowById(state.selectedFlowId);
    if (!flow) return;
    flow.nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
    var id = makeId("node", flow.nodes);
    var dimensions = {
      start: { width: 150, height: 58 },
      decision: { width: 190, height: 140 },
      process: { width: 170, height: 60 },
      action: { width: 160, height: 60 },
      end: { width: 160, height: 60 }
    }[state.nodeType] || { width: 160, height: 60 };
    var node = {
      id: id,
      label: "New " + state.nodeType,
      x: 48,
      y: 48,
      width: dimensions.width,
      height: dimensions.height,
      type: state.nodeType
    };
    var beforeAdd = modelSnapshot();
    flow.nodes.push(node);
    state.selectedFlowId = flow.id;
    state.selectedNodeId = node.id;
    writeModel();
    pushHistory(beforeAdd);
    renderFlow(flow);
  }

  function scaleSelectedNode(factor) {
    var flow = flowById(state.selectedFlowId);
    if (!flow || !state.selectedNodeId) {
      toast("Select a node first.");
      return;
    }
    var node = nodeById(flow, state.selectedNodeId);
    if (!node) return;
    var beforeScale = modelSnapshot();
    var width = Number(node.width || 140);
    var height = Number(node.height || 56);
    node.width = Math.max(40, Math.round(width * factor));
    node.height = Math.max(24, Math.round(height * factor));
    writeModel();
    pushHistory(beforeScale);
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

    var flowGroup = document.createElement("div");
    flowGroup.className = "aieh-toolbar-group";

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
    flowGroup.appendChild(select);
    toolbar.appendChild(flowGroup);

    var modeGroup = document.createElement("div");
    modeGroup.className = "aieh-toolbar-group";
    [["select", "Move"], ["edge", "Edge"], ["delete", "Delete"]].forEach(function (entry) {
      var button = document.createElement("button");
      button.className = "aieh-mode";
      button.dataset.mode = entry[0];
      button.textContent = entry[1];
      button.addEventListener("click", function () { setMode(entry[0]); });
      modeGroup.appendChild(button);
    });
    toolbar.appendChild(modeGroup);

    var addGroup = document.createElement("div");
    addGroup.className = "aieh-toolbar-group";

    var typeSelect = document.createElement("select");
    [
      ["action", "Action"],
      ["process", "Process"],
      ["decision", "Decision"],
      ["start", "Start"],
      ["end", "End"]
    ].forEach(function (entry) {
      var option = document.createElement("option");
      option.value = entry[0];
      option.textContent = entry[1];
      typeSelect.appendChild(option);
    });
    typeSelect.addEventListener("change", function () {
      state.nodeType = typeSelect.value;
    });
    addGroup.appendChild(typeSelect);

    var add = document.createElement("button");
    add.textContent = "Add node";
    add.addEventListener("click", addNode);
    addGroup.appendChild(add);
    toolbar.appendChild(addGroup);

    var sizeGroup = document.createElement("div");
    sizeGroup.className = "aieh-toolbar-group";

    var shrink = document.createElement("button");
    shrink.textContent = "-";
    shrink.title = "Scale selected node down";
    shrink.addEventListener("click", function () { scaleSelectedNode(0.9); });
    sizeGroup.appendChild(shrink);

    var grow = document.createElement("button");
    grow.textContent = "+";
    grow.title = "Scale selected node up";
    grow.addEventListener("click", function () { scaleSelectedNode(1.1); });
    sizeGroup.appendChild(grow);
    toolbar.appendChild(sizeGroup);

    var historyGroup = document.createElement("div");
    historyGroup.className = "aieh-toolbar-group";

    var undo = document.createElement("button");
    undo.textContent = "Undo";
    undo.title = "Undo (Ctrl+Z)";
    undo.dataset.aiehHistory = "undo";
    undo.addEventListener("click", undoEdit);
    historyGroup.appendChild(undo);

    var redo = document.createElement("button");
    redo.textContent = "Redo";
    redo.title = "Redo (Ctrl+Y)";
    redo.dataset.aiehHistory = "redo";
    redo.addEventListener("click", redoEdit);
    historyGroup.appendChild(redo);
    toolbar.appendChild(historyGroup);

    var save = document.createElement("button");
    save.textContent = "Download";
    save.addEventListener("click", downloadHtml);
    toolbar.appendChild(save);

    document.documentElement.appendChild(toolbar);
    setMode("select");
    updateHistoryButtons();
  }

  function initKeyboardShortcuts() {
    document.addEventListener("keydown", function (event) {
      var key = String(event.key || "").toLowerCase();
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (event.target && event.target.closest && event.target.closest("[contenteditable='true']")) return;
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undoEdit();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redoEdit();
      }
    }, true);
  }

  parseModel();
  if (!state.model) return;
  ensureTextBlocksFromDom();
  initTextEditing();
  initKeyboardShortcuts();
  renderAllFlows();
  buildToolbar();
  toast("AI Editable HTML editor enabled.");
})();
