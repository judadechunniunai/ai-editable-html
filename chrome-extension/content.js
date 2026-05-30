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
    selectedEdgeId: "",
    mode: "select",
    linkSource: null,
    nodeType: "action",
    editing: false,
    keyboardShortcutsReady: false,
    loadedSnapshot: false,
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
      var savedModel = loadSavedSnapshot();
      if (savedModel) {
        state.model = savedModel;
        state.loadedSnapshot = true;
        writeModel();
      }
    } catch (error) {
      toast("Invalid ai-editable-html model JSON.");
      state.model = null;
    }
  }

  function writeModel() {
    modelEl.textContent = "\n" + JSON.stringify(state.model, null, 2) + "\n";
    saveSnapshot();
  }

  function snapshotKey() {
    return "aieh:snapshot:" + location.href.split("#")[0];
  }

  function loadSavedSnapshot() {
    try {
      var raw = window.localStorage && window.localStorage.getItem(snapshotKey());
      if (!raw) return null;
      var payload = JSON.parse(raw);
      return payload && payload.model && Array.isArray(payload.model.blocks) ? payload.model : null;
    } catch (error) {
      return null;
    }
  }

  function saveSnapshot() {
    try {
      if (!window.localStorage || !state.model) return;
      window.localStorage.setItem(snapshotKey(), JSON.stringify({
        savedAt: new Date().toISOString(),
        model: state.model
      }));
    } catch (error) {
      // Some file:// pages or privacy settings block localStorage.
    }
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
      if (state.editing) {
        renderAllFlows();
      } else {
        renderReadOnlyFlows();
      }
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

  function textBlockById(id) {
    return blocks("text").find(function (block) { return block.id === id; }) || null;
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
      if (el.dataset.aiehTextReady === "true") return;
      el.dataset.aiehTextReady = "true";
      el.addEventListener("focus", function () {
        var currentBlock = textBlockById(block.id) || block;
        editStartSnapshot = modelSnapshot();
        state.activeEditSnapshot = editStartSnapshot;
        state.activeEditCommit = function () {
          currentBlock.content = currentBlock.format === "html" ? el.innerHTML : el.textContent;
          writeModel();
        };
      });
      el.addEventListener("input", function () {
        var currentBlock = textBlockById(block.id) || block;
        currentBlock.content = currentBlock.format === "html" ? el.innerHTML : el.textContent;
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

  function stopTextEditing() {
    blocks("text").forEach(function (block) {
      var el = document.querySelector(block.selector);
      if (!el) return;
      el.classList.remove("aieh-editable-text");
      el.removeAttribute("contenteditable");
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

  function renderReadOnlyFlows() {
    blocks("flow").forEach(function (flow) {
      var container = document.querySelector(flow.selector);
      if (!container) return;
      container.classList.remove("aieh-flow-editor");
      container.classList.add("ai-editable-flow-rendered");
      container.onclick = null;
      container.style.position = container.style.position || "relative";
      container.style.overflow = "auto";

      var nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
      var edges = Array.isArray(flow.edges) ? flow.edges : [];
      var bounds = flowBounds(nodes);
      var width = Math.max(container.clientWidth || 640, bounds.width, 320);
      var height = Math.max(container.clientHeight || 320, bounds.height, 240);
      var byId = {};
      nodes.forEach(function (node) { byId[node.id] = node; });
      container.style.minWidth = width + "px";
      container.style.minHeight = height + "px";
      container.innerHTML = "";

      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "ai-flow-lines");
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
        svg.appendChild(line);
        if (edge.label) {
          var label = document.createElement("div");
          label.className = "ai-flow-edge-label";
          label.textContent = edge.label;
          label.style.left = ((a.x + b.x) / 2) + "px";
          label.style.top = ((a.y + b.y) / 2) + "px";
          container.appendChild(label);
        }
      });

      nodes.forEach(function (node) {
        var el = document.createElement("div");
        el.className = "ai-flow-node ai-flow-node-" + safeClass(node.type);
        el.dataset.nodeId = node.id;
        el.textContent = node.label || "";
        el.style.left = Number(node.x || 0) + "px";
        el.style.top = Number(node.y || 0) + "px";
        el.style.width = Number(node.width || 140) + "px";
        el.style.height = Number(node.height || 56) + "px";
        container.appendChild(el);
      });
    });
  }

  function clearInlineEditTarget() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    state.activeEditSnapshot = null;
    state.activeEditCommit = null;
  }

  function selectNode(flow, nodeId, container) {
    clearInlineEditTarget();
    state.selectedFlowId = flow.id;
    state.selectedNodeId = nodeId;
    state.selectedEdgeId = "";
    container.querySelectorAll(".is-selected").forEach(function (selected) {
      selected.classList.remove("is-selected");
    });
    container.querySelectorAll(".aieh-selection-box").forEach(function (box) {
      box.remove();
    });
    var nodeEl = container.querySelector('.aieh-node[data-node-id="' + CSS.escape(nodeId) + '"]');
    if (nodeEl) {
      nodeEl.classList.add("is-selected");
      addResizeHandle(nodeEl, flow, nodeId, container);
    }
  }

  function selectEdge(flow, edgeId, container) {
    clearInlineEditTarget();
    state.selectedFlowId = flow.id;
    state.selectedNodeId = "";
    state.selectedEdgeId = edgeId;
    container.querySelectorAll(".is-selected").forEach(function (selected) {
      selected.classList.remove("is-selected");
    });
    container.querySelectorAll(".aieh-selection-box").forEach(function (box) {
      box.remove();
    });
    container.querySelectorAll('[data-edge-id="' + CSS.escape(edgeId) + '"]').forEach(function (edgeEl) {
      edgeEl.classList.add("is-selected");
    });
  }

  function removeSelectedItem() {
    var flow = flowById(state.selectedFlowId);
    if (!flow) return;
    var beforeDelete = modelSnapshot();
    if (state.selectedNodeId) {
      flow.nodes = (flow.nodes || []).filter(function (node) { return node.id !== state.selectedNodeId; });
      flow.edges = (flow.edges || []).filter(function (edge) {
        return edge.source !== state.selectedNodeId && edge.target !== state.selectedNodeId;
      });
      state.selectedNodeId = "";
      state.selectedEdgeId = "";
    } else if (state.selectedEdgeId) {
      flow.edges = (flow.edges || []).filter(function (edge) { return edge.id !== state.selectedEdgeId; });
      state.selectedEdgeId = "";
    } else {
      return;
    }
    state.linkSource = null;
    writeModel();
    pushHistory(beforeDelete);
    renderFlow(flow);
  }

  function addResizeHandle(nodeEl, flow, nodeId, container) {
    container.querySelectorAll(".aieh-selection-box").forEach(function (box) {
      box.remove();
    });
    var node = nodeById(flow, nodeId);
    if (!node) return;
    var box = document.createElement("div");
    box.className = "aieh-selection-box";
    box.style.left = Number(node.x || 0) + "px";
    box.style.top = Number(node.y || 0) + "px";
    box.style.width = Number(node.width || 140) + "px";
    box.style.height = Number(node.height || 56) + "px";
    var handle = document.createElement("span");
    handle.className = "aieh-resize-handle";
    handle.title = "Drag to scale";
    box.appendChild(handle);
    container.appendChild(box);
    handle.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      event.stopPropagation();
      node = nodeById(flow, nodeId);
      if (!node) return;
      handle.setPointerCapture(event.pointerId);
      var startX = event.clientX;
      var startY = event.clientY;
      var baseWidth = Number(node.width || 140);
      var baseHeight = Number(node.height || 56);
      var beforeScale = modelSnapshot();
      var resizing = false;

      function move(moveEvent) {
        var dx = moveEvent.clientX - startX;
        var dy = moveEvent.clientY - startY;
        var widthFactor = (baseWidth + dx) / baseWidth;
        var heightFactor = (baseHeight + dy) / baseHeight;
        var factor = Math.max(widthFactor, heightFactor, 0.35);
        resizing = true;
        moveEvent.preventDefault();
        node.width = Math.max(40, Math.round(baseWidth * factor));
        node.height = Math.max(24, Math.round(baseHeight * factor));
        nodeEl.style.width = node.width + "px";
        nodeEl.style.height = node.height + "px";
        box.style.width = node.width + "px";
        box.style.height = node.height + "px";
        updateLines(container, flow);
      }

      function up() {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        if (resizing) {
          writeModel();
          pushHistory(beforeScale);
        }
      }

      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
    });
  }

  function updateSelectionBox(container, node) {
    var box = container.querySelector(".aieh-selection-box");
    if (!box || !node) return;
    box.style.left = Number(node.x || 0) + "px";
    box.style.top = Number(node.y || 0) + "px";
    box.style.width = Number(node.width || 140) + "px";
    box.style.height = Number(node.height || 56) + "px";
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
    container.onclick = function (event) {
      if (event.target !== container) return;
      state.selectedNodeId = "";
      state.selectedEdgeId = "";
      container.querySelectorAll(".is-selected").forEach(function (selected) {
        selected.classList.remove("is-selected");
      });
      container.querySelectorAll(".aieh-selection-box").forEach(function (box) {
        box.remove();
      });
    };

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
      if (state.selectedFlowId === flow.id && state.selectedEdgeId === edge.id) line.classList.add("is-selected");
      line.addEventListener("click", function (event) {
        event.stopPropagation();
        if (state.mode === "delete") {
          var beforeDeleteEdge = modelSnapshot();
          flow.edges = edges.filter(function (candidate) { return candidate.id !== edge.id; });
          state.selectedEdgeId = "";
          writeModel();
          pushHistory(beforeDeleteEdge);
          renderFlow(flow);
        } else {
          selectEdge(flow, edge.id, container);
        }
      });
      svg.appendChild(line);
      var label = document.createElement("div");
      label.className = "aieh-edge-label ai-flow-edge-label" + (edge.label ? "" : " is-empty");
      label.dataset.edgeId = edge.id;
      label.textContent = edge.label || "";
      label.setAttribute("spellcheck", "true");
      label.style.left = ((a.x + b.x) / 2) + "px";
      label.style.top = ((a.y + b.y) / 2) + "px";
      if (state.selectedFlowId === flow.id && state.selectedEdgeId === edge.id) label.classList.add("is-selected");
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
        label.removeAttribute("contenteditable");
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
        selectEdge(flow, edge.id, container);
      });
      label.addEventListener("dblclick", function (event) {
        event.preventDefault();
        event.stopPropagation();
        selectEdge(flow, edge.id, container);
        label.setAttribute("contenteditable", "true");
        label.focus();
      });
      container.appendChild(label);
    });

    nodes.forEach(function (node) {
      var el = document.createElement("div");
      el.className = "aieh-node ai-flow-node ai-flow-node-" + safeClass(node.type);
      el.dataset.nodeId = node.id;
      el.setAttribute("spellcheck", "true");
      el.style.left = Number(node.x || 0) + "px";
      el.style.top = Number(node.y || 0) + "px";
      el.style.width = Number(node.width || 140) + "px";
      el.style.height = Number(node.height || 56) + "px";
      var label = document.createElement("span");
      label.className = "aieh-node-label";
      label.textContent = node.label || "";
      el.appendChild(label);
      if (state.linkSource === node.id) el.classList.add("is-link-source");
      if (state.selectedFlowId === flow.id && state.selectedNodeId === node.id) el.classList.add("is-selected");
      var nodeEditStartSnapshot = null;

      label.addEventListener("input", function () {
        node.label = label.textContent;
        writeModel();
        updateHistoryButtons();
      });

      label.addEventListener("focus", function () {
        nodeEditStartSnapshot = modelSnapshot();
        state.activeEditSnapshot = nodeEditStartSnapshot;
        state.activeEditCommit = function () {
          node.label = label.textContent;
          writeModel();
        };
        label.classList.add("aieh-editing-inline");
      });

      label.addEventListener("blur", function () {
        label.removeAttribute("contenteditable");
        label.classList.remove("aieh-editing-inline");
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
        if (state.mode === "edge") {
          handleEdgeClick(flow, node.id);
        } else if (state.mode === "delete") {
          state.selectedFlowId = flow.id;
          state.selectedNodeId = node.id;
          state.selectedEdgeId = "";
          removeSelectedItem();
        } else {
          selectNode(flow, node.id, container);
        }
      });

      el.addEventListener("dblclick", function (event) {
        event.preventDefault();
        event.stopPropagation();
        selectNode(flow, node.id, container);
        label.setAttribute("contenteditable", "true");
        label.focus();
      });

      el.addEventListener("pointerdown", function (event) {
        if (state.mode !== "select") return;
        if (event.target && event.target.closest && event.target.closest(".aieh-resize-handle")) return;
        if (label.getAttribute("contenteditable") === "true") return;
        selectNode(flow, node.id, container);
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
          updateSelectionBox(container, node);
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
      if (state.selectedFlowId === flow.id && state.selectedNodeId === node.id) {
        addResizeHandle(el, flow, node.id, container);
      }
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
    commitActiveEdit();
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

  function exitEditing() {
    if (!state.editing) return;
    commitActiveEdit();
    writeModel();
    state.editing = false;
    state.mode = "select";
    state.linkSource = null;
    state.selectedNodeId = "";
    state.selectedEdgeId = "";
    state.activeEditSnapshot = null;
    state.activeEditCommit = null;
    stopTextEditing();
    applyTextBlocksToDom();
    renderReadOnlyFlows();
    document.querySelectorAll(".aieh-toolbar").forEach(function (toolbar) {
      toolbar.remove();
    });
    buildEditLauncher();
    toast("Read-only mode");
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

    var exit = document.createElement("button");
    exit.textContent = "Exit edit";
    exit.title = "Return to read-only mode";
    exit.addEventListener("click", exitEditing);
    toolbar.appendChild(exit);

    document.documentElement.appendChild(toolbar);
    setMode("select");
    updateHistoryButtons();
  }

  function initKeyboardShortcuts() {
    if (state.keyboardShortcutsReady) return;
    state.keyboardShortcutsReady = true;
    document.addEventListener("keydown", function (event) {
      if (!state.editing) return;
      var key = String(event.key || "").toLowerCase();
      if ((key === "delete" || key === "backspace") && !(event.ctrlKey || event.metaKey || event.altKey)) {
        if (event.target && event.target.closest && event.target.closest("[contenteditable='true']")) return;
        event.preventDefault();
        removeSelectedItem();
        return;
      }
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

  function buildEditLauncher() {
    if (document.querySelector(".aieh-edit-launcher")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "aieh-edit-launcher";
    button.textContent = "Edit";
    button.title = "Enter AI Editable HTML edit mode";
    button.addEventListener("click", function () {
      startEditing(button);
    });
    document.documentElement.appendChild(button);
  }

  function startEditing(launcher) {
    if (state.editing) return;
    state.editing = true;
    if (launcher) launcher.remove();
    ensureTextBlocksFromDom();
    initTextEditing();
    initKeyboardShortcuts();
    renderAllFlows();
    buildToolbar();
    toast("AI Editable HTML editor enabled.");
  }

  parseModel();
  if (!state.model) return;
  if (state.loadedSnapshot) {
    applyTextBlocksToDom();
    renderReadOnlyFlows();
  }
  buildEditLauncher();
})();
