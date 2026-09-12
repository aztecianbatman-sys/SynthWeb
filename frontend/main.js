const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const state = {
  tabs: [],
  activeId: "",
  activeWorkspace: "Default",
  workspaces: [],
  restoreAvailable: false,
  searchMode: "web",
  settings: {},
  runtime: null
};

const $ = (id) => document.getElementById(id);

function activeTab() {
  return state.tabs.find((tab) => tab.id === state.activeId);
}

function toast(message) {
  const el = $("toast");
  el.textContent = String(message);
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === "\"") return "&quot;";
    return "&#39;";
  });
}

function applySettings() {
  const theme = state.settings.theme || "dark";
  document.body.dataset.theme = theme === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  document.body.classList.toggle("quiet", state.settings.quiet_mode === "true");
  document.body.classList.toggle("compact", state.settings.density === "compact");
  const accent = state.settings.accent || "cyan";
  const accentMap = {
    cyan: "#2ee6ff",
    violet: "#9b7cff",
    blue: "#5da9ff",
    green: "#4ade80"
  };
  document.documentElement.style.setProperty("--cyan", accentMap[accent] || accentMap.cyan);
}

function renderTabs() {
  const host = $("tabs");
  host.replaceChildren();
  const visible = state.tabs.filter((tab) => tab.workspace === state.activeWorkspace);

  visible.forEach((tab) => {
    const el = document.createElement("div");
    el.className = "tab" + (tab.id === state.activeId ? " active" : "");
    el.draggable = true;
    el.dataset.id = tab.id;

    let icon;
    if (tab.favicon) {
      icon = document.createElement("img");
      icon.className = "tab-favicon";
      icon.src = tab.favicon;
      icon.alt = "";
      icon.width = 16;
      icon.height = 16;
      icon.referrerPolicy = "no-referrer";
      icon.onerror = () => {
        const fallback = document.createElement("span");
        fallback.className = "tab-favicon";
        fallback.textContent = tab.loading ? "…" : (tab.private ? "◉" : "•");
        fallback.style.color = tab.private ? "#8b63ff" : "#2ee6ff";
        icon.replaceWith(fallback);
      };
    } else {
      icon = document.createElement("span");
      icon.className = "tab-favicon";
      icon.textContent = tab.loading ? "…" : (tab.private ? "◉" : "•");
      icon.style.color = tab.private ? "#8b63ff" : (tab.url.startsWith("https://") ? "#34d399" : "#2ee6ff");
    }

    const title = document.createElement("span");
    title.className = "tab-title";
    title.textContent = tab.title || "New Tab";

    const close = document.createElement("button");
    close.className = "tab-close";
    close.textContent = "×";
    close.setAttribute("aria-label", "Close tab");
    close.onclick = (event) => {
      event.stopPropagation();
      closeTab(tab.id);
    };

    el.append(icon, title, close);
    el.onclick = () => activateTab(tab.id);
    el.oncontextmenu = (event) => {
      event.preventDefault();
      showTabContext(event.clientX, event.clientY, tab);
    };

    el.ondragstart = (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", tab.id);
    };
    el.ondragover = (event) => event.preventDefault();
    el.ondrop = async (event) => {
      event.preventDefault();
      const fromId = event.dataTransfer.getData("text/plain");
      const from = state.tabs.findIndex((item) => item.id === fromId);
      const to = state.tabs.findIndex((item) => item.id === tab.id);
      if (from < 0 || to < 0 || from === to) return;
      try {
        await invoke("reorder_tab", { from, to });
        await refresh();
      } catch (error) {
        toast(error);
      }
    };

    host.appendChild(el);
  });
}

function renderAddress() {
  const tab = activeTab();
  const url = tab?.url || "";
  $("omnibox").value = url && url !== "synth://newtab" ? url : "";
  const secure = url.startsWith("https://");
  $("siteState").textContent = url && url !== "synth://newtab" ? (secure ? "•" : "!") : "•";
  $("siteState").style.color = secure ? "var(--good)" : (url ? "var(--warn)" : "var(--muted)");
}

async function renderRecent() {
  const host = $("recent");
  if (!host) return;
  host.replaceChildren();
  if (state.settings.show_recent === "false" || state.settings.quiet_mode === "true") return;
  try {
    if (state.settings.search_history === "false") return;
    const rows = await invoke("list_history");
    const seen = new Set();
    for (const row of rows) {
      const key = row.domain || row.url;
      if (!row.url || seen.has(key) || seen.size >= 6) continue;
      if (row.url.startsWith("https://www.google.com/search")) continue;
      seen.add(key);
      const button = document.createElement("button");
      button.className = "shortcut recent-link";
      button.textContent = row.title || row.domain || row.url;
      button.onclick = () => go(row.url);
      host.appendChild(button);
    }
  } catch {
    // Recent sites are optional; an unavailable history store should not break New Tab.
  }
}

function render() {
  renderTabs();
  renderAddress();
  $("newtab").style.visibility = activeTab()?.url === "synth://newtab" ? "visible" : "hidden";
  $("workspaceButton").textContent = state.activeWorkspace;
  document.querySelectorAll(".search-mode").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.searchMode);
  });
  applySettings();
  renderRecent();
}

async function refresh() {
  const snapshot = await invoke("get_snapshot");
  state.tabs = snapshot.tabs;
  state.activeId = snapshot.active_id;
  state.activeWorkspace = snapshot.active_workspace;
  state.workspaces = snapshot.workspaces;
  state.restoreAvailable = snapshot.restore_available;
  state.runtime = await invoke("runtime_info");
  state.settings = await invoke("get_settings");
  render();
}

async function go(value) {
  const input = String(value || "").trim();
  if (!input) return;
  try {
    await invoke("navigate", { input });
    await refresh();
  } catch (error) {
    toast("Unable to load this request.");
  }
}

async function processOmnibox(value) {
  const input = String(value || "").trim();
  const lower = input.toLowerCase();
  if (lower.startsWith("open ")) return go(input.slice(5).trim());
  if (lower.startsWith("search ")) return cortisSearch(input.slice(7).trim());
  if (lower.startsWith("zoom ")) {
    const percent = Number(input.slice(5).trim().replace("%", ""));
    if (!Number.isFinite(percent) || percent < 50 || percent > 200) {
      toast("Zoom must be 50–200%.");
      return;
    }
    return setZoom(percent);
  }
  if (lower.startsWith("workspace ")) {
    const name = input.slice(10).trim();
    if (!name) return;
    try {
      await invoke("switch_workspace", { name });
      await refresh();
    } catch (error) {
      toast(error);
    }
    return;
  }
  if (lower.startsWith("bookmarks ")) return showBookmarks();
  if (lower.startsWith("history ")) return showHistory();
  return go(input);
}

async function cortisSearch(query, mode = state.searchMode) {
  const q = String(query || "").trim();
  if (!q) return;
  try {
    await invoke("search_with_mode", { query: q, mode });
    await refresh();
  } catch (error) {
    toast("Cortis could not complete that search.");
  }
}

async function activateTab(id) {
  try {
    await invoke("activate_tab", { tabId: id });
    await refresh();
  } catch (error) {
    toast(error);
  }
}

async function closeTab(id) {
  try {
    await invoke("close_tab", { tabId: id });
    await refresh();
  } catch (error) {
    toast(error);
  }
}

async function setZoom(percent) {
  try {
    await invoke("set_zoom", { percent });
    state.settings.default_zoom = String(percent);
    toast("Zoom " + percent + "%");
  } catch (error) {
    toast(error);
  }
}

function showTabContext(x, y, tab) {
  document.querySelector("#tabContext")?.remove();
  const menu = document.createElement("div");
  menu.id = "tabContext";
  menu.className = "workspace-menu";
  menu.style.left = x + "px";
  menu.style.top = y + "px";

  const actions = [
    [tab.pinned ? "Unpin Tab" : "Pin Tab", async () => invoke("toggle_pin", { tabId: tab.id })],
    ["Duplicate Tab", async () => {
      await invoke("new_tab", { private: tab.private });
      await invoke("navigate", { input: tab.url });
    }],
    ["Close Tab", async () => closeTab(tab.id)],
    ["Close Other Tabs", async () => invoke("close_other_tabs", { tabId: tab.id })],
    ["Close Tabs to Right", async () => invoke("close_tabs_right", { tabId: tab.id })],
    ["Move to Workspace", async () => showWorkspaceMove(tab)]
  ];

  for (const [label, action] of actions) {
    const button = document.createElement("button");
    button.className = "workspace-item";
    button.textContent = label;
    button.onclick = async () => {
      menu.remove();
      try {
        await action();
        await refresh();
      } catch (error) {
        toast(error);
      }
    };
    menu.appendChild(button);
  }

  document.body.appendChild(menu);
  setTimeout(() => {
    const close = () => {
      menu.remove();
      document.removeEventListener("click", close);
    };
    document.addEventListener("click", close);
  }, 0);
}

function showWorkspaceMove(tab) {
  document.querySelector("#tabMove")?.remove();
  const menu = document.createElement("div");
  menu.id = "tabMove";
  menu.className = "workspace-menu";
  menu.style.left = "50%";
  menu.style.top = "110px";

  state.workspaces.filter((workspace) => workspace.name !== tab.workspace).forEach((workspace) => {
    const button = document.createElement("button");
    button.className = "workspace-item";
    button.textContent = workspace.name;
    button.onclick = async () => {
      try {
        await invoke("move_tab_to_workspace", { tabId: tab.id, name: workspace.name });
        await refresh();
        menu.remove();
      } catch (error) {
        toast(error);
      }
    };
    menu.appendChild(button);
  });

  if (!menu.children.length) {
    const empty = document.createElement("div");
    empty.className = "workspace-item";
    empty.textContent = "No other workspaces.";
    menu.appendChild(empty);
  }

  document.body.appendChild(menu);
}

function showWorkspaceMenu() {
  const existing = $("workspaceMenu");
  if (existing) {
    existing.remove();
    return;
  }

  const menu = document.createElement("div");
  menu.id = "workspaceMenu";
  menu.className = "workspace-menu";

  state.workspaces.forEach((workspace) => {
    const row = document.createElement("div");
    row.className = "workspace-item" + (workspace.name === state.activeWorkspace ? " active" : "");
    const label = document.createElement("span");
    label.textContent = workspace.name;
    row.appendChild(label);
    row.onclick = async () => {
      try {
        await invoke("switch_workspace", { name: workspace.name });
        await refresh();
        menu.remove();
      } catch (error) {
        toast(error);
      }
    };
    row.oncontextmenu = async (event) => {
      event.preventDefault();
      const action = prompt("Workspace action: rename, duplicate, delete");
      if (!action) return;
      try {
        if (action === "rename" && workspace.name !== "Default") {
          const name = prompt("New name", workspace.name);
          if (name) await invoke("rename_workspace", { id: workspace.id, name });
        } else if (action === "duplicate") {
          const name = prompt("Copy name", workspace.name + " Copy");
          if (name) await invoke("duplicate_workspace", { source: workspace.name, name });
        } else if (action === "delete") {
          if (workspace.name === "Default") throw new Error("The Default workspace cannot be deleted.");
          if (confirm("Delete this workspace and move its tabs to Default?")) {
            await invoke("delete_workspace", { id: workspace.id });
          }
        }
        await refresh();
        menu.remove();
        showWorkspaceMenu();
      } catch (error) {
        toast(error);
      }
    };
    menu.appendChild(row);
  });

  const create = document.createElement("button");
  create.className = "workspace-item workspace-create";
  create.textContent = "+ Create workspace";
  create.onclick = async () => {
    const name = prompt("Workspace name");
    if (!name) return;
    try {
      await invoke("create_workspace", { name });
      await refresh();
      menu.remove();
    } catch (error) {
      toast(error);
    }
  };
  menu.appendChild(create);

  document.querySelector(".tabbar").appendChild(menu);
}

function basePanel(title) {
  const panel = $("panel");
  panel.classList.remove("hidden");
  panel.innerHTML = '<div class="panel-section"><div class="panel-title">' + esc(title) + '</div><div id="panelBody"></div></div>';
  return panel.querySelector("#panelBody");
}

function closePanel() {
  $("panel").classList.add("hidden");
}

function showMenuPanel() {
  const body = basePanel("Synth Browser");
  const actions = [
    ["New Private Tab", async () => invoke("new_tab", { private: true })],
    ["Reopen Closed Tab", async () => invoke("reopen_closed_tab")],
    ["Tab Overview", async () => openOverview()],
    ["Reading Shelf", async () => showShelf()],
    ["Saved Sessions", async () => showSessions()],
    ["Notes", async () => showNotes()],
    ["Research Board", async () => showBoards()],
    ["Synth Assist", async () => showAssist()],
    ["Bookmarks", async () => showBookmarks()],
    ["History", async () => showHistory()],
    ["Privacy Shield", async () => showPrivacy()],
    ["Site Capsule", async () => showSiteSecurity()],
    ["Settings", async () => showSettings()],
    ["Runtime Status", async () => showRuntime()],
    ["Downloads", async () => showDownloads()],
    ["Developer Tools", async () => invoke("open_devtools")],
    ["Clear Browsing Data", async () => {
      if (confirm("Clear local history and active browser data?")) await invoke("clear_browsing_data");
    }]
  ];
  actions.forEach(([label, action]) => {
    const button = document.createElement("button");
    button.className = "panel-action";
    button.textContent = label;
    button.onclick = async () => {
      try {
        await action();
        if (!["Reading Shelf","Saved Sessions","Notes","Research Board","Synth Assist","Bookmarks","History","Privacy Shield","Site Capsule","Settings","Runtime Status","Downloads","Tab Overview"].includes(label)) {
          closePanel();
        }
        await refresh();
      } catch (error) {
        toast(error);
      }
    };
    body.appendChild(button);
  });
}

async function showDownloads() {
  const body = basePanel("Downloads");
  try {
    const rows = await invoke("list_downloads");
    body.innerHTML = '<div class="panel-row">Folder <strong>Downloads/Synth Browser</strong></div>' +
      '<div class="panel-row">Auto-run <strong>Disabled</strong></div>' +
      '<div class="panel-row">Checksum verification <strong>NOT STARTED</strong></div>';
    if (!rows.length) {
      body.innerHTML += '<div class="panel-row">No downloads yet.</div>';
      return;
    }
    rows.slice(0, 25).forEach((download) => {
      const row = document.createElement("div");
      row.className = "reading-row";
      const filename = download.path ? download.path.split(/[\\\\/]/).pop() : download.url;
      row.innerHTML = '<div class="reading-info"><div class="reading-title">' + esc(filename) + '</div><div class="reading-url">' +
        esc(download.status) + ' · ' + esc(download.path || download.url) + '</div></div>';
      body.appendChild(row);
    });
  } catch (error) {
    toast(error);
  }
}

async function showBookmarks() {
  const body = basePanel("Bookmarks");
  const rows = await invoke("list_bookmarks");
  if (!rows.length) {
    body.innerHTML = '<div class="panel-row">No bookmarks yet.</div>';
    return;
  }
  rows.forEach((bookmark) => {
    const button = document.createElement("button");
    button.className = "panel-action";
    button.innerHTML = '<strong>' + esc(bookmark.title) + '</strong><br><span style="color:#718396">' + esc(bookmark.url) + '</span>';
    button.onclick = () => go(bookmark.url);
    body.appendChild(button);
  });
}

async function showHistory() {
  const body = basePanel("History");
  const rows = await invoke("list_history");
  if (!rows.length) {
    body.innerHTML = '<div class="panel-row">No history yet.</div>';
    return;
  }
  rows.forEach((item) => {
    const button = document.createElement("button");
    button.className = "panel-action";
    button.innerHTML = '<strong>' + esc(item.title || item.domain || item.url) + '</strong><br><span style="color:#718396">' + esc(item.url) + '</span>';
    button.onclick = () => go(item.url);
    body.appendChild(button);
  });
}

async function showShelf() {
  const body = basePanel("Reading Shelf");
  const rows = await invoke("list_shelf");
  if (!rows.length) {
    body.innerHTML = '<div class="panel-row">Your reading shelf is empty.</div><div class="panel-row">Save a page for later.</div>';
    return;
  }
  rows.forEach((item) => {
    const row = document.createElement("div");
    row.className = "reading-row";
    row.innerHTML = '<div class="reading-info"><div class="reading-title">' + esc(item.title || item.url) + '</div><div class="reading-url">' + esc(item.url) + '</div></div>';
    const open = document.createElement("button");
    open.className = "mini-action";
    open.textContent = "Open";
    open.onclick = () => go(item.url);
    const read = document.createElement("button");
    read.className = "mini-action";
    read.textContent = item.is_read ? "Unread" : "Read";
    read.onclick = async () => { await invoke("toggle_shelf_read", { id: item.id }); await showShelf(); };
    const remove = document.createElement("button");
    remove.className = "mini-action";
    remove.textContent = "×";
    remove.onclick = async () => { await invoke("remove_shelf", { id: item.id }); await showShelf(); };
    row.append(open, read, remove);
    body.appendChild(row);
  });
}

async function showSessions() {
  const body = basePanel("Saved Sessions");
  const save = document.createElement("button");
  save.className = "panel-action";
  save.textContent = "+ Save current workspace session";
  save.onclick = async () => {
    const name = prompt("Session name");
    if (!name) return;
    try {
      await invoke("save_session", { name });
      toast("Session saved");
      await showSessions();
    } catch (error) { toast(error); }
  };
  body.appendChild(save);

  const rows = await invoke("list_sessions");
  rows.forEach((session) => {
    const button = document.createElement("button");
    button.className = "panel-action";
    button.textContent = session.name;
    button.onclick = async () => {
      try {
        await invoke("open_session", { id: session.id, append: false });
        await refresh();
      } catch (error) { toast(error); }
    };
    body.appendChild(button);
  });
  if (!rows.length) body.innerHTML += '<div class="panel-row">No saved sessions yet.</div>';
}

async function showNotes() {
  const body = basePanel("Notes");
  const create = document.createElement("button");
  create.className = "panel-action";
  create.textContent = "+ New note from current page";
  create.onclick = async () => {
    const title = prompt("Note title");
    if (!title) return;
    const noteBody = prompt("Note text");
    if (noteBody === null) return;
    try {
      await invoke("create_note", { title, body: noteBody });
      toast("Note saved");
      await showNotes();
    } catch (error) { toast(error); }
  };
  body.appendChild(create);

  const rows = await invoke("list_notes");
  rows.forEach((note) => {
    const row = document.createElement("div");
    row.className = "reading-row";
    row.innerHTML = '<div class="reading-info"><div class="reading-title">' + esc(note.title) + '</div><div class="reading-url">' +
      esc(note.url || "Local note") + '</div><div class="reading-url">' + esc(note.body.slice(0, 140)) + '</div></div>';
    const open = document.createElement("button");
    open.className = "mini-action";
    open.textContent = note.url ? "Open" : "View";
    open.onclick = () => note.url ? go(note.url) : toast(note.body);
    const remove = document.createElement("button");
    remove.className = "mini-action";
    remove.textContent = "×";
    remove.onclick = async () => { await invoke("delete_note", { id: note.id }); await showNotes(); };
    row.append(open, remove);
    body.appendChild(row);
  });
  if (!rows.length) body.innerHTML += '<div class="panel-row">No notes yet.</div>';
}

async function showBoards() {
  const body = basePanel("Research Board");
  const create = document.createElement("button");
  create.className = "panel-action";
  create.textContent = "+ New board";
  create.onclick = async () => {
    const name = prompt("Board name");
    if (!name) return;
    try {
      await invoke("create_research_board", { name });
      toast("Board created");
      await showBoards();
    } catch (error) { toast(error); }
  };
  body.appendChild(create);

  const rows = await invoke("list_research_boards");
  rows.forEach((board) => {
    const row = document.createElement("div");
    row.className = "reading-row";
    row.innerHTML = '<div class="reading-info"><div class="reading-title">' + esc(board.name) + '</div><div class="reading-url">' + esc(board.workspace || "Independent board") + '</div></div>';
    const add = document.createElement("button");
    add.className = "mini-action";
    add.textContent = "Add tab";
    add.onclick = async () => {
      try {
        await invoke("add_current_to_board", { boardId: board.id });
        toast("Added to board");
      } catch (error) { toast(error); }
    };
    const view = document.createElement("button");
    view.className = "mini-action";
    view.textContent = "View";
    view.onclick = async () => showBoardItems(board.name, board.id);
    const del = document.createElement("button");
    del.className = "mini-action";
    del.textContent = "×";
    del.onclick = async () => {
      if (!confirm("Delete this research board?")) return;
      try { await invoke("delete_research_board", { id: board.id }); await showBoards(); }
      catch (error) { toast(error); }
    };
    row.append(add, view, del);
    body.appendChild(row);
  });
  if (!rows.length) body.innerHTML += '<div class="panel-row">No research boards yet.</div>';
}

async function showBoardItems(name, id) {
  const body = basePanel(name);
  const rows = await invoke("list_board_items", { boardId: id });
  if (!rows.length) {
    body.innerHTML = '<div class="panel-row">This board is empty.</div>';
    return;
  }
  rows.forEach((item) => {
    const button = document.createElement("button");
    button.className = "panel-action";
    button.innerHTML = '<strong>' + esc(item.title) + '</strong><br><span style="color:#718396">' + esc(item.url || item.quote || "") + '</span>';
    button.onclick = () => item.url && go(item.url);
    body.appendChild(button);
  });
}

async function showPrivacy() {
  const body = basePanel("Privacy Shield");
  const httpsOnly = state.settings.https_only === "true";
  body.innerHTML =
    '<div class="panel-row">History storage <strong>Local SQLite</strong></div>' +
    '<div class="panel-row">Private tabs <strong>Incognito runtime</strong></div>' +
    '<div class="panel-row">Telemetry <strong>Not implemented</strong></div>' +
    '<div class="panel-row">Tracker blocking <strong>NOT STARTED</strong></div>' +
    '<div class="panel-row">HTTPS-only <strong>' + (httpsOnly ? "Enabled" : "Disabled") + '</strong></div>';
  const clear = document.createElement("button");
  clear.className = "panel-action";
  clear.textContent = "Clear Browsing Data";
  clear.onclick = () => runClear();
  body.appendChild(clear);
}

async function runClear() {
  if (!confirm("Clear local history, search history and active browser data?")) return;
  try {
    await invoke("clear_browsing_data");
    toast("Browsing data cleared");
    await refresh();
  } catch (error) {
    toast(error);
  }
}

async function showSiteSecurity() {
  const body = basePanel("Site Capsule");
  try {
    const info = await invoke("site_info");
    body.innerHTML =
      '<div class="panel-row">Host <strong>' + esc(info.host || "—") + '</strong></div>' +
      '<div class="panel-row">Connection <strong>' + esc(info.secure ? "HTTPS" : "HTTP") + '</strong></div>' +
      '<div class="panel-row">Private <strong>' + (info.private ? "Yes" : "No") + '</strong></div>' +
      '<div class="panel-row">Cookies visible to runtime <strong>' + String(info.cookieCount) + '</strong></div>' +
      '<div class="panel-row">URL <strong style="word-break:break-all">' + esc(info.url) + '</strong></div>';
    const clear = document.createElement("button");
    clear.className = "panel-action";
    clear.textContent = "Clear Browsing Data";
    clear.onclick = () => runClear();
    body.appendChild(clear);
  } catch (error) {
    body.innerHTML = '<div class="panel-row">No active web page.</div>';
  }
}

async function showRuntime() {
  const body = basePanel("Runtime Status");
  try {
    const info = await invoke("runtime_info");
    body.innerHTML =
      '<div class="panel-row">Browser runtime <strong>' + esc(info.runtime) + '</strong></div>' +
      '<div class="panel-row">Revision <strong>' + esc(info.revision) + '</strong></div>' +
      '<div class="panel-row">Azecotron Web <strong>' + esc(info.azecotronWeb.status) + '</strong></div>' +
      '<div class="panel-row">Cortis <strong>' + esc(info.search.status) + '</strong></div>' +
      '<div class="panel-row">' + esc(info.search.mode) + '</div>';
  } catch (error) {
    toast(error);
  }
}

async function showSettings() {
  const body = basePanel("Settings");
  const settings = await invoke("get_settings");
  state.settings = settings;
  body.replaceChildren();

  const search = document.createElement("input");
  search.className = "setting-control";
  search.placeholder = "Search settings…";
  body.appendChild(search);

  const grid = document.createElement("div");
  grid.className = "settings-grid";
  body.appendChild(grid);

  const select = (key, label, options) => {
    const wrap = document.createElement("label");
    const labelEl = document.createElement("div");
    labelEl.className = "setting-label";
    labelEl.textContent = label;
    const el = document.createElement("select");
    el.className = "setting-control";
    options.forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      el.appendChild(option);
    });
    el.value = settings[key] || options[0][0];
    el.onchange = async () => {
      try {
        await invoke("set_setting", { key, value: el.value });
        settings[key] = el.value;
        state.settings = settings;
        applySettings();
      } catch (error) { toast(error); }
    };
    wrap.append(labelEl, el);
    grid.appendChild(wrap);
  };

  const toggle = (key, label) => {
    const row = document.createElement("label");
    row.className = "setting-toggle";
    const text = document.createElement("span");
    text.textContent = label;
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = settings[key] === "true";
    input.onchange = async () => {
      try {
        await invoke("set_setting", { key, value: String(input.checked) });
        settings[key] = String(input.checked);
        state.settings = settings;
        applySettings();
        renderRecent();
      } catch (error) { toast(error); }
    };
    row.append(text, input);
    grid.appendChild(row);
  };

  select("theme", "Theme", [["dark","Dark"],["light","Light"],["system","System"]]);
  select("accent", "Accent", [["cyan","Cyan"],["violet","Violet"],["blue","Blue"],["green","Green"]]);
  select("density", "Density", [["comfortable","Comfortable"],["compact","Compact"]]);
  toggle("show_shortcuts", "Show shortcuts");
  toggle("show_recent", "Show recent activity");
  toggle("search_history", "Store search history");
  toggle("quiet_mode", "Quiet Mode");
  toggle("https_only", "HTTPS-only");
  toggle("ai_enabled", "Enable Synth Assist");
  toggle("ai_page_context", "Allow page context when requested");
  toggle("ai_selection_context", "Allow selection context when requested");
  select("default_zoom", "Default zoom", [["75","75%"],["90","90%"],["100","100%"],["110","110%"],["125","125%"],["150","150%"]]);

  const tools = document.createElement("div");
  tools.className = "settings-grid";
  const exportButton = document.createElement("button");
  exportButton.className = "panel-action";
  exportButton.textContent = "Export my browser data";
  exportButton.onclick = async () => { try { toast("Exported: " + await invoke("export_data")); } catch (error) { toast(error); } };
  const diagButton = document.createElement("button");
  diagButton.className = "panel-action";
  diagButton.textContent = "Export diagnostics";
  diagButton.onclick = async () => { try { toast("Diagnostics exported: " + await invoke("export_diagnostics")); } catch (error) { toast(error); } };
  const resetButton = document.createElement("button");
  resetButton.className = "panel-action";
  resetButton.textContent = "Reset browser data";
  resetButton.onclick = async () => {
    if (!confirm("Reset local browser data, workspaces, sessions, notes and bookmarks?")) return;
    try { await invoke("reset_browser"); state.settings = {}; await refresh(); showSettings(); }
    catch (error) { toast(error); }
  };
  tools.append(exportButton, diagButton, resetButton);
  grid.appendChild(tools);

  search.oninput = () => {
    const q = search.value.toLowerCase();
    [...grid.children].forEach((child) => {
      child.style.display = child.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  };
}

async function showAssist() {
  const body = basePanel("Synth Assist");
  const info = await invoke("ai_status");
  body.innerHTML =
    '<div class="panel-row">Status <strong>' + (info.enabled ? "Enabled" : "Disabled") + '</strong></div>' +
    '<div class="panel-row">Provider <strong>' + esc(info.provider) + '</strong></div>' +
    '<div class="setting-label">Endpoint</div>';
  const endpoint = document.createElement("input");
  endpoint.className = "setting-control";
  endpoint.value = info.endpoint;
  endpoint.onchange = async () => {
    try { await invoke("set_setting", { key: "ai_endpoint", value: endpoint.value }); toast("AI endpoint saved"); }
    catch (error) { toast(error); }
  };
  body.appendChild(endpoint);

  const label = document.createElement("div");
  label.className = "setting-label";
  label.textContent = "Model";
  body.appendChild(label);
  const model = document.createElement("input");
  model.className = "setting-control";
  model.value = info.model;
  model.placeholder = "e.g. llama3.2";
  model.onchange = async () => {
    try { await invoke("set_setting", { key: "ai_model", value: model.value }); toast("AI model saved"); }
    catch (error) { toast(error); }
  };
  body.appendChild(model);

  const enabled = document.createElement("label");
  enabled.className = "setting-toggle";
  const enabledText = document.createElement("span");
  enabledText.textContent = "Enable Synth Assist";
  const enabledInput = document.createElement("input");
  enabledInput.type = "checkbox";
  enabledInput.checked = info.enabled;
  enabledInput.onchange = async () => {
    await invoke("set_setting", { key: "ai_enabled", value: String(enabledInput.checked) });
    await showAssist();
  };
  enabled.append(enabledText, enabledInput);

  const page = document.createElement("label");
  page.className = "setting-toggle";
  const pageText = document.createElement("span");
  pageText.textContent = "Allow page context on request";
  const pageInput = document.createElement("input");
  pageInput.type = "checkbox";
  pageInput.checked = state.settings.ai_page_context === "true";
  pageInput.onchange = async () => {
    await invoke("set_setting", { key: "ai_page_context", value: String(pageInput.checked) });
    state.settings.ai_page_context = String(pageInput.checked);
  };
  page.append(pageText, pageInput);

  const selection = document.createElement("label");
  selection.className = "setting-toggle";
  const selectionText = document.createElement("span");
  selectionText.textContent = "Allow selection context on request";
  const selectionInput = document.createElement("input");
  selectionInput.type = "checkbox";
  selectionInput.checked = state.settings.ai_selection_context === "true";
  selectionInput.onchange = async () => {
    await invoke("set_setting", { key: "ai_selection_context", value: String(selectionInput.checked) });
    state.settings.ai_selection_context = String(selectionInput.checked);
  };
  selection.append(selectionText, selectionInput);

  body.append(enabled, page, selection);

  const credential = document.createElement("div");
  credential.className = "panel-row";
  credential.innerHTML = 'Credential <strong>' + (info.keyStored ? "Stored in OS secure storage" : "Not stored") + '</strong>';
  body.appendChild(credential);

  const key = document.createElement("input");
  key.type = "password";
  key.className = "setting-control";
  key.placeholder = info.keyStored ? "Replace secure API key" : "Store API key securely";
  body.appendChild(key);

  const saveKey = document.createElement("button");
  saveKey.className = "panel-action";
  saveKey.textContent = "Save API key";
  saveKey.onclick = async () => {
    if (!key.value) return;
    try {
      await invoke("set_ai_key", { provider: info.provider, key: key.value });
      key.value = "";
      toast("API key stored securely");
      await showAssist();
    } catch (error) { toast(error); }
  };
  body.appendChild(saveKey);

  const clearKey = document.createElement("button");
  clearKey.className = "panel-action";
  clearKey.textContent = "Clear API key";
  clearKey.onclick = async () => {
    try { await invoke("clear_ai_key", { provider: info.provider }); toast("API key removed"); await showAssist(); }
    catch (error) { toast(error); }
  };
  body.appendChild(clearKey);

  const models = document.createElement("button");
  models.className = "panel-action";
  models.textContent = "Load available models";
  models.onclick = async () => {
    try {
      const list = await invoke("list_ai_models");
      toast(list.length ? "Models: " + list.slice(0, 4).join(", ") : "Provider returned no models");
    } catch (error) { toast(error); }
  };
  body.appendChild(models);

  const ask = document.createElement("button");
  ask.className = "panel-action";
  ask.textContent = "Ask about current page";
  ask.onclick = async () => {
    try { await invoke("request_page_context"); toast("Page context requested…"); }
    catch (error) { toast(error); }
  };
  body.appendChild(ask);

  const explain = document.createElement("button");
  explain.className = "panel-action";
  explain.textContent = "Explain current selection";
  explain.onclick = async () => {
    try { await invoke("request_selection_context"); toast("Selection context requested…"); }
    catch (error) { toast(error); }
  };
  body.appendChild(explain);

  const note = document.createElement("div");
  note.className = "panel-row";
  note.textContent = "Page or selection text is sent only after you explicitly request context.";
  body.appendChild(note);
}

function showAiAnswer(answer, title) {
  const body = basePanel("Synth Assist");
  const heading = document.createElement("div");
  heading.className = "panel-row";
  heading.innerHTML = "<strong>" + esc(title || "Answer") + "</strong>";
  const output = document.createElement("div");
  output.style.cssText = "padding:10px 0;font-size:12px;line-height:1.65;white-space:pre-wrap;color:#d4dee6";
  output.textContent = answer;
  const back = document.createElement("button");
  back.className = "panel-action";
  back.textContent = "Back to Assist";
  back.onclick = showAssist;
  body.append(heading, output, back);
}

function openOverview() {
  $("overviewPanel").classList.remove("hidden");
  $("overviewSearch").value = "";
  renderOverview("");
  $("overviewSearch").focus();
}

function closeOverview() {
  $("overviewPanel").classList.add("hidden");
}

function renderOverview(query) {
  const host = $("overviewTabs");
  const q = String(query || "").toLowerCase();
  host.replaceChildren();
  state.tabs.filter((tab) =>
    tab.workspace === state.activeWorkspace &&
    ((tab.title || "").toLowerCase().includes(q) || (tab.url || "").toLowerCase().includes(q))
  ).forEach((tab) => {
    const card = document.createElement("button");
    card.className = "overview-tab" + (tab.id === state.activeId ? " active" : "");
    card.innerHTML =
      '<div class="ov-title">' + esc(tab.title || "New Tab") + '</div>' +
      '<div class="ov-url">' + esc(tab.url) + '</div>' +
      '<div class="ov-meta">' + (tab.private ? "Private" : "Tab") + ' · ' + esc(tab.workspace) + '</div>';
    card.onclick = async () => {
      await activateTab(tab.id);
      closeOverview();
    };
    host.appendChild(card);
  });
  if (!host.children.length) host.innerHTML = '<div class="panel-row">No matching open tabs.</div>';
}

$("workspaceButton").onclick = showWorkspaceMenu;
$("back").onclick = () => invoke("back").catch(toast);
$("forward").onclick = () => invoke("forward").catch(toast);
$("reload").onclick = () => invoke("stop_or_reload").catch(toast);
$("newTab").onclick = () => invoke("new_tab", { private: false }).then(refresh).catch(toast);
$("bookmark").onclick = async () => {
  try { await invoke("add_bookmark"); toast("Saved to Bookmarks"); }
  catch (error) { toast(error); }
};
$("shelf").onclick = async () => {
  try {
    const tab = activeTab();
    if (tab?.url && tab.url !== "synth://newtab") {
      await invoke("add_to_shelf");
      toast("Saved to Reading Shelf");
    } else {
      await showShelf();
    }
  } catch (error) { toast(error); }
};
$("downloads").onclick = showDownloads;
$("menu").onclick = showMenuPanel;
$("privacy").onclick = showPrivacy;
$("overview").onclick = openOverview;
$("overviewClose").onclick = closeOverview;
$("overviewSearch").oninput = (event) => renderOverview(event.target.value);

document.querySelectorAll(".search-mode").forEach((button) => {
  button.onclick = () => {
    state.searchMode = button.dataset.mode;
    document.querySelectorAll(".search-mode").forEach((item) => item.classList.toggle("active", item === button));
    $("newtabSearch").focus();
  };
});

$("omnibox").addEventListener("input", async (event) => {
  const value = event.target.value.trim();
  const wrap = $("omnibox").parentElement;
  let box = wrap.querySelector(".suggestions");
  if (!value) {
    box?.remove();
    return;
  }
  if (!box) {
    box = document.createElement("div");
    box.className = "suggestions";
    wrap.appendChild(box);
  }

  const candidates = [];
  state.tabs
    .filter((tab) => tab.workspace === state.activeWorkspace && (tab.title + tab.url).toLowerCase().includes(value.toLowerCase()))
    .slice(0, 4)
    .forEach((tab) => candidates.push(["Tab", tab.title || tab.url, tab.url]));

  if (state.settings.search_history !== "false") {
    try {
      const history = await invoke("list_history");
      history
        .filter((item) => (item.title + item.url).toLowerCase().includes(value.toLowerCase()))
        .slice(0, 4)
        .forEach((item) => candidates.push(["History", item.title || item.url, item.url]));
    } catch {}
  }

  box.replaceChildren(...candidates.slice(0, 7).map((candidate) => {
    const row = document.createElement("div");
    row.className = "suggestion";
    row.innerHTML = "<span>" + esc(candidate[1]) + "</span><span class='suggestion-type'>" + esc(candidate[0]) + "</span>";
    row.onclick = () => {
      box.remove();
      processOmnibox(candidate[2]);
    };
    return row;
  }));
});

$("omnibox").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    $("omnibox").parentElement.querySelector(".suggestions")?.remove();
    processOmnibox(event.target.value);
  }
  if (event.key === "Escape") {
    $("omnibox").parentElement.querySelector(".suggestions")?.remove();
    renderAddress();
  }
});

$("searchForm").onsubmit = (event) => {
  event.preventDefault();
  cortisSearch($("newtabSearch").value);
};
$("newtabSearch").onkeydown = (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    cortisSearch(event.target.value);
  }
};

$("palette").onclick = () => {
  $("palettePanel").classList.remove("hidden");
  $("paletteInput").value = "";
  $("paletteInput").focus();
  renderCommands("");
};

const commands = [
  ["New Tab", "Ctrl+T", () => invoke("new_tab", { private: false })],
  ["New Private Tab", "Ctrl+Shift+N", () => invoke("new_tab", { private: true })],
  ["Close Tab", "Ctrl+W", () => closeTab(state.activeId)],
  ["Reopen Closed Tab", "Ctrl+Shift+T", () => invoke("reopen_closed_tab")],
  ["Tab Overview", "Ctrl+Shift+A", () => openOverview()],
  ["Reload / Stop", "Ctrl+R", () => invoke("stop_or_reload")],
  ["Add Bookmark", "Ctrl+D", () => invoke("add_bookmark")],
  ["Reading Shelf", "", () => showShelf()],
  ["Saved Sessions", "", () => showSessions()],
  ["Notes", "", () => showNotes()],
  ["Research Board", "", () => showBoards()],
  ["Synth Assist", "", () => showAssist()],
  ["Settings", "", () => showSettings()],
  ["Privacy Shield", "", () => showPrivacy()],
  ["Site Capsule", "", () => showSiteSecurity()],
  ["Downloads", "Ctrl+J", () => showDownloads()],
  ["Print Page", "Ctrl+P", () => invoke("print_page")],
  ["Developer Tools", "F12", () => invoke("open_devtools")],
  ["Clear Browsing Data", "Ctrl+Shift+Delete", () => runClear()]
];

function renderCommands(query) {
  const host = $("paletteResults");
  const matches = commands.filter((command) => command[0].toLowerCase().includes(String(query).toLowerCase()));
  host.replaceChildren(...matches.map((command, index) => {
    const row = document.createElement("div");
    row.className = "palette-result" + (index === 0 ? " selected" : "");
    row.innerHTML = "<span>" + esc(command[0]) + "</span><span class='palette-key'>" + esc(command[1]) + "</span>";
    row.onclick = async () => {
      closePalette();
      try { await command[2](); await refresh(); } catch (error) { toast(error); }
    };
    return row;
  }));
}

function closePalette() {
  $("palettePanel").classList.add("hidden");
}

$("paletteInput").oninput = (event) => renderCommands(event.target.value);
$("paletteInput").onkeydown = async (event) => {
  if (event.key === "Escape") closePalette();
  if (event.key === "Enter") {
    const query = event.target.value.trim();
    const command = commands.find((item) => item[0].toLowerCase().includes(query.toLowerCase()));
    if (command) {
      closePalette();
      try { await command[2](); await refresh(); } catch (error) { toast(error); }
    } else {
      closePalette();
      await processOmnibox(query);
    }
  }
};

$("restoreYes").onclick = async () => {
  try {
    await invoke("restore_previous_session");
    $("restore").classList.add("hidden");
    await refresh();
    toast("Previous session restored");
  } catch (error) { toast(error); }
};
$("restoreNo").onclick = async () => {
  try {
    await invoke("dismiss_restore");
    $("restore").classList.add("hidden");
  } catch (error) { toast(error); }
};

listen("browser://snapshot", (event) => {
  const snapshot = event.payload;
  state.tabs = snapshot.tabs;
  state.activeId = snapshot.active_id;
  state.activeWorkspace = snapshot.active_workspace;
  state.workspaces = snapshot.workspaces;
  state.restoreAvailable = snapshot.restore_available;
  render();
});

listen("browser://navigation", (event) => {
  const tab = state.tabs.find((item) => item.id === event.payload.tabId);
  if (tab) {
    tab.url = event.payload.url;
    tab.loading = event.payload.loading;
  }
  render();
});

listen("browser://title", (event) => {
  const tab = state.tabs.find((item) => item.id === event.payload.tabId);
  if (tab) tab.title = event.payload.title || "Untitled";
  renderTabs();
  renderAddress();
});

listen("browser://favicon", (event) => {
  const tab = state.tabs.find((item) => item.id === event.payload.tabId);
  if (tab) tab.favicon = event.payload.favicon;
  renderTabs();
});

listen("browser://download", (event) => {
  toast(event.payload.status === "completed" ? "Download complete" : "Download " + event.payload.status);
});

listen("browser://https-upgrade", (event) => {
  go(event.payload.url);
});

listen("browser://navigation-blocked", () => {
  toast("HTTP was blocked by HTTPS-only mode.");
});

listen("ai://page-context", async (event) => {
  const context = String(event.payload?.text || "").trim();
  if (!context) {
    toast("No readable page content was found.");
    return;
  }
  try {
    const question = prompt("What should Synth Assist do with this page?", "Summarize this page in clear bullet points.");
    if (!question) return;
    const answer = await invoke("synth_assist", { context, question });
    showAiAnswer(answer, event.payload?.title);
  } catch (error) {
    toast(error);
  }
});

listen("ai://selection-context", async (event) => {
  const context = String(event.payload?.text || "").trim();
  if (!context) {
    toast("No text is currently selected.");
    return;
  }
  try {
    const question = prompt("What should Synth Assist explain about this selection?", "Explain this simply.");
    if (!question) return;
    const answer = await invoke("synth_assist", { context, question });
    showAiAnswer(answer, event.payload?.title);
  } catch (error) {
    toast(error);
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("#panel") && !event.target.closest("#menu") && !event.target.closest("#downloads") && !event.target.closest("#shelf") && !event.target.closest("#privacy")) {
    closePanel();
  }
  if (!event.target.closest("#workspaceMenu") && !event.target.closest("#workspaceButton")) {
    $("workspaceMenu")?.remove();
  }
  if (!event.target.closest("#tabContext") && !event.target.closest("#tabbar")) {
    $("tabContext")?.remove();
    $("tabMove")?.remove();
  }
});

document.addEventListener("keydown", async (event) => {
  const mod = event.ctrlKey || event.metaKey;
  if (mod && event.key.toLowerCase() === "l") {
    event.preventDefault();
    $("omnibox").focus();
    $("omnibox").select();
  }
  if (mod && event.key.toLowerCase() === "k") {
    event.preventDefault();
    $("palette").click();
  }
  if (mod && event.key.toLowerCase() === "t") {
    event.preventDefault();
    await invoke("new_tab", { private: false });
    await refresh();
  }
  if (mod && event.key.toLowerCase() === "w") {
    event.preventDefault();
    await closeTab(state.activeId);
  }
  if (mod && event.shiftKey && event.key.toLowerCase() === "t") {
    event.preventDefault();
    await invoke("reopen_closed_tab");
    await refresh();
  }
  if (mod && event.key.toLowerCase() === "d") {
    event.preventDefault();
    $("bookmark").click();
  }
  if (mod && event.key.toLowerCase() === "r") {
    event.preventDefault();
    await invoke("stop_or_reload");
  }
  if (mod && event.key.toLowerCase() === "p") {
    event.preventDefault();
    await invoke("print_page");
  }
  if (mod && event.key === "0") {
    event.preventDefault();
    await setZoom(100);
  }
  if (mod && event.key === "+") {
    event.preventDefault();
    await setZoom(110);
  }
  if (mod && event.key === "-") {
    event.preventDefault();
    await setZoom(90);
  }
  if (mod && event.shiftKey && event.key.toLowerCase() === "a") {
    event.preventDefault();
    openOverview();
  }
  if (event.key === "F12") {
    event.preventDefault();
    invoke("open_devtools").catch(toast);
  }
  if (event.key === "Escape") {
    closeOverview();
    closePalette();
  }
});

(async () => {
  try {
    await refresh();
    $("runtimeText").textContent = state.runtime.runtime;
    $("runtimeDot").className = "dot " + (state.runtime.runtime.includes("WebView2") ? "" : "cyan");
    setTimeout(() => {
      $("boot").classList.add("hidden");
      if (state.restoreAvailable) $("restore").classList.remove("hidden");
    }, 1700);
  } catch (error) {
    $("boot").classList.add("hidden");
    toast(error);
  }
})();
