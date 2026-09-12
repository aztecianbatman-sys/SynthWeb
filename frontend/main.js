const tauri = window.__TAURI__;
const invoke = tauri.core.invoke;
const listen = tauri.event.listen;

const state = {
  tabs: [],
  activeId: "",
  activeWorkspace: "Default",
  workspaces: [],
  settings: {},
  runtime: null
};

const $ = id => document.getElementById(id);

function activeTab() {
  return state.tabs.find(t => t.id === state.activeId);
}

function toast(message) {
  const el = $("toast");
  el.textContent = String(message);
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, c => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === "\"") return "&quot;";
    return "&#39;";
  });
}

function applySettings() {
  const theme = state.settings.theme || "dark";
  document.body.dataset.theme = theme === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  document.body.classList.toggle("quiet", state.settings.quiet_mode === "true");
  const accent = state.settings.accent || "cyan";
  document.documentElement.style.setProperty("--cyan", accent === "violet" ? "#9b7cff" : accent === "blue" ? "#5da9ff" : accent === "green" ? "#4ade80" : "#2ee6ff");
}

function renderTabs() {
  const host = $("tabs");
  host.replaceChildren();
  const visible = state.tabs.filter(t => t.workspace === state.activeWorkspace);
  visible.forEach((tab, index) => {
    const el = document.createElement("div");
    el.className = "tab" + (tab.id === state.activeId ? " active" : "");
    el.draggable = true;
    el.dataset.index = String(state.tabs.indexOf(tab));
    el.dataset.id = tab.id;
    const favicon = document.createElement("span");
    favicon.className = "tab-favicon";
    favicon.textContent = tab.loading ? "…" : (tab.private ? "◉" : "•");
    favicon.style.color = tab.private ? "#8b63ff" : (tab.url.startsWith("https://") ? "#34d399" : "#2ee6ff");
    const title = document.createElement("span");
    title.className = "tab-title";
    title.textContent = tab.title || "New Tab";
    const close = document.createElement("button");
    close.className = "tab-close";
    close.textContent = "×";
    close.setAttribute("aria-label", "Close tab");
    close.onclick = e => { e.stopPropagation(); closeTab(tab.id); };
    el.append(favicon, title, close);
    el.onclick = () => activateTab(tab.id);
    el.ondragstart = e => e.dataTransfer.setData("text/plain", tab.id);
    el.ondragover = e => e.preventDefault();
    el.ondrop = async e => {
      e.preventDefault();
      const fromId = e.dataTransfer.getData("text/plain");
      const from = state.tabs.findIndex(t => t.id === fromId);
      const to = state.tabs.findIndex(t => t.id === tab.id);
      if (from >= 0 && to >= 0 && from !== to) {
        try { await invoke("reorder_tab", { from, to }); await refresh(); } catch (err) { toast(err); }
      }
    };
    host.appendChild(el);
  });
}

function renderAddress() {
  const tab = activeTab();
  $("omnibox").value = tab && tab.url !== "synth://newtab" ? tab.url : "";
  const url = tab?.url || "";
  const secure = url.startsWith("https://");
  $("siteState").textContent = url && url !== "synth://newtab" ? (secure ? "•" : "!") : "•";
  $("siteState").style.color = secure ? "var(--good)" : (url ? "var(--warn)" : "var(--muted)");
}

function render() {
  renderTabs();
  renderAddress();
  const tab = activeTab();
  $("newtab").style.visibility = tab && tab.url === "synth://newtab" ? "visible" : "hidden";
  $("workspaceButton").textContent = state.activeWorkspace;
  applySettings();
}

async function refresh() {
  const snapshot = await invoke("get_snapshot");
  Object.assign(state, snapshot);
  state.settings = await invoke("get_settings");
  render();
}

async function go(value) {
  const v = String(value || "").trim();
  if (!v) return;
  try { await invoke("navigate", { input: v }); await refresh(); }
  catch (e) { toast("Unable to load this request."); }
}

async function activateTab(id) {
  try { await invoke("activate_tab", { tabId:id }); await refresh(); } catch (e) { toast(e); }
}

async function closeTab(id) {
  try { await invoke("close_tab", { tabId:id }); await refresh(); } catch (e) { toast(e); }
}

async function showWorkspaceMenu() {
  const existing = $("workspaceMenu");
  if (existing) { existing.remove(); return; }
  const menu = document.createElement("div");
  menu.id = "workspaceMenu";
  menu.className = "workspace-menu";
  state.workspaces.forEach(w => {
    const row = document.createElement("button");
    row.className = "workspace-item" + (w.name === state.activeWorkspace ? " active" : "");
    row.innerHTML = "<span>" + esc(w.name) + "</span><span>" + (w.name === state.activeWorkspace ? "●" : "") + "</span>";
    row.onclick = async () => {
      try { await invoke("switch_workspace", { name:w.name }); await refresh(); menu.remove(); }
      catch(e){ toast(e); }
    };
    menu.appendChild(row);
  });
  const create = document.createElement("button");
  create.className = "workspace-item workspace-create";
  create.textContent = "+ Create workspace";
  create.onclick = async () => {
    const name = prompt("Workspace name");
    if (!name) return;
    try { await invoke("create_workspace", { name }); await refresh(); menu.remove(); }
    catch(e){ toast(e); }
  };
  menu.appendChild(create);
  $("tabbar").appendChild(menu);
}

function showPanel() {
  const p = $("panel");
  p.classList.remove("hidden");
  p.innerHTML = '<div class="panel-section"><div class="panel-title">Synth Browser</div>' +
    '<button class="panel-action" data-cmd="private">New Private Tab</button>' +
    '<button class="panel-action" data-cmd="reopen">Reopen Closed Tab</button>' +
    '<button class="panel-action" data-cmd="shelf">Reading Shelf</button>' +
    '<button class="panel-action" data-cmd="sessions">Saved Sessions</button><button class="panel-action" data-cmd="notes">Notes</button><button class="panel-action" data-cmd="boards">Research Board</button>' +
    '<button class="panel-action" data-cmd="bookmarks">Bookmarks</button>' +
    '<button class="panel-action" data-cmd="history">History</button>' +
    '<button class="panel-action" data-cmd="settings">Settings</button>' +
    '<button class="panel-action" data-cmd="privacy">Privacy Shield</button>' +
    '<button class="panel-action" data-cmd="runtime">Runtime Status</button>' +
    '<button class="panel-action" data-cmd="devtools">Developer Tools</button>' +
    '<button class="panel-action" data-cmd="clear">Clear Browsing Data</button>' +
    '</div>';
  p.querySelectorAll("[data-cmd]").forEach(b => b.onclick = () => runCommand(b.dataset.cmd));
}

async function runCommand(cmd) {
  try {
    if (cmd === "private") await invoke("new_tab",{private:true});
    if (cmd === "reopen") await invoke("reopen_closed_tab");
    if (cmd === "shelf") return showShelf();
    if (cmd === "sessions") return showSessions();
    if (cmd === "notes") return showNotes();
    if (cmd === "boards") return showBoards();
    if (cmd === "bookmarks") return showBookmarks();
    if (cmd === "history") return showHistory();
    if (cmd === "settings") return showSettings();
    if (cmd === "privacy") return showPrivacy();
    if (cmd === "runtime") return showRuntime();
    if (cmd === "devtools") await invoke("open_devtools");
    if (cmd === "clear") {
      if (confirm("Clear local history and active browser data?")) { await invoke("clear_browsing_data"); toast("Browsing data cleared"); }
    }
    $("panel").classList.add("hidden");
    await refresh();
  } catch (e) { toast(e); }
}

function basePanel(title) {
  const p=$("panel");
  p.classList.remove("hidden");
  p.innerHTML='<div class="panel-section"><div class="panel-title">'+esc(title)+'</div><div id="panelBody"></div></div>';
  return p.querySelector("#panelBody");
}

async function showShelf() {
  const body=basePanel("Reading Shelf");
  const rows=await invoke("list_shelf");
  if(!rows.length){body.innerHTML='<div class="panel-row">Your reading shelf is empty.</div><div class="panel-row">Save a page for later.</div>';return}
  rows.forEach(item=>{
    const row=document.createElement("div");row.className="reading-row";
    row.innerHTML='<div class="reading-info"><div class="reading-title">'+esc(item.title||item.url)+'</div><div class="reading-url">'+esc(item.url)+'</div></div>';
    const open=document.createElement("button");open.className="mini-action";open.textContent="Open";open.onclick=()=>go(item.url);
    const read=document.createElement("button");read.className="mini-action";read.textContent=item.is_read?"Unread":"Read";read.onclick=async()=>{await invoke("toggle_shelf_read",{id:item.id});showShelf()};
    const remove=document.createElement("button");remove.className="mini-action";remove.textContent="×";remove.onclick=async()=>{await invoke("remove_shelf",{id:item.id});showShelf()};
    row.append(open,read,remove);body.appendChild(row);
  });
}

async function showSessions() {
  const body=basePanel("Saved Sessions");
  const rows=await invoke("list_sessions");
  const save=document.createElement("button");save.className="panel-action";save.textContent="+ Save current workspace session";
  save.onclick=async()=>{const name=prompt("Session name");if(!name)return;try{await invoke("save_session",{name});toast("Session saved");showSessions()}catch(e){toast(e)}};
  body.appendChild(save);
  if(!rows.length){body.innerHTML+='<div class="panel-row">No saved sessions yet.</div>';return}
  rows.forEach(s=>{
    const b=document.createElement("button");b.className="panel-action";b.textContent=s.name;
    b.onclick=async()=>{try{await invoke("open_session",{id:s.id,append:false});await refresh();}catch(e){toast(e)}};
    body.appendChild(b);
  });
}

async function showBookmarks() {
  const body=basePanel("Bookmarks");
  const rows=await invoke("list_bookmarks");
  if(!rows.length){body.innerHTML='<div class="panel-row">No bookmarks yet.</div>';return}
  rows.forEach(r=>{const b=document.createElement("button");b.className="panel-action";b.innerHTML="<strong>"+esc(r.title)+"</strong><br><span style='color:#718396'>"+esc(r.url)+"</span>";b.onclick=()=>go(r.url);body.appendChild(b)});
}

async function showHistory() {
  const body=basePanel("History");
  const rows=await invoke("list_history");
  if(!rows.length){body.innerHTML='<div class="panel-row">No history yet.</div>';return}
  rows.forEach(r=>{const b=document.createElement("button");b.className="panel-action";b.innerHTML="<strong>"+esc(r.title||r.domain||r.url)+"</strong><br><span style='color:#718396'>"+esc(r.url)+"</span>";b.onclick=()=>go(r.url);body.appendChild(b)});
}

async function showDownloads() {
  const body=basePanel("Downloads");
  body.innerHTML='<div class="panel-row">Download folder <strong>Downloads/Synth Browser</strong></div><div class="panel-row">Auto-run <strong>Disabled</strong></div><div class="panel-row">Checksum verification <strong>NOT STARTED</strong></div><div class="panel-row">Actual download history <strong>Stored locally</strong></div>';
}
async function showNotes() {
  const body=basePanel("Notes");
  const add=document.createElement("button");add.className="panel-action";add.textContent="+ New note from current page";
  add.onclick=async()=>{const title=prompt("Note title");if(!title)return;const bodyText=prompt("Note text");if(bodyText===null)return;try{await invoke("create_note",{title,body:bodyText});toast("Note saved");showNotes()}catch(e){toast(e)}};
  body.appendChild(add);
  const rows=await invoke("list_notes");
  if(!rows.length){body.innerHTML+='<div class="panel-row">No notes yet.</div>';return}
  rows.slice(0,30).forEach(n=>{const wrap=document.createElement("div");wrap.className="reading-row";wrap.innerHTML='<div class="reading-info"><div class="reading-title">'+esc(n.title)+'</div><div class="reading-url">'+esc(n.url||"Local note")+'</div><div class="reading-url">'+esc(n.body.slice(0,120))+'</div></div>';const open=document.createElement("button");open.className="mini-action";open.textContent=n.url?"Open":"View";open.onclick=()=>n.url?go(n.url):toast(n.body);const del=document.createElement("button");del.className="mini-action";del.textContent="×";del.onclick=async()=>{await invoke("delete_note",{id:n.id});showNotes()};wrap.append(open,del);body.appendChild(wrap)});
}

async function showBoards() {
  const body=basePanel("Research Board");
  const add=document.createElement("button");add.className="panel-action";add.textContent="+ New board";
  add.onclick=async()=>{const name=prompt("Board name");if(!name)return;try{await invoke("create_research_board",{name});toast("Board created");showBoards()}catch(e){toast(e)}};
  body.appendChild(add);
  const rows=await invoke("list_research_boards");
  if(!rows.length){body.innerHTML+='<div class="panel-row">No research boards yet.</div>';return}
  rows.forEach(b=>{const wrap=document.createElement("div");wrap.className="reading-row";const info=document.createElement("div");info.className="reading-info";info.innerHTML='<div class="reading-title">'+esc(b.name)+'</div><div class="reading-url">'+esc(b.workspace||"Independent board")+'</div>';const addCurrent=document.createElement("button");addCurrent.className="mini-action";addCurrent.textContent="Add tab";addCurrent.onclick=async()=>{try{await invoke("add_current_to_board",{boardId:b.id});toast("Added to board")}catch(e){toast(e)}};const view=document.createElement("button");view.className="mini-action";view.textContent="View";view.onclick=async()=>{const items=await invoke("list_board_items",{boardId:b.id});showBoardItems(b.name,items)};const del=document.createElement("button");del.className="mini-action";del.textContent="×";del.onclick=async()=>{if(confirm("Delete this research board?")){await invoke("delete_research_board",{id:b.id});showBoards()}};wrap.append(info,addCurrent,view,del);body.appendChild(wrap)});
}

function showBoardItems(name,items){
  const body=basePanel(name);
  if(!items.length){body.innerHTML='<div class="panel-row">This board is empty.</div>';return}
  items.forEach(i=>{const b=document.createElement("button");b.className="panel-action";b.innerHTML="<strong>"+esc(i.title)+"</strong><br><span style='color:#718396'>"+esc(i.url||i.quote||"")+"</span>";b.onclick=()=>i.url&&go(i.url);body.appendChild(b)});
}

async function showPrivacy() {
  const body=basePanel("Privacy Shield");
  body.innerHTML =
    '<div class="panel-row">History storage <strong>Local SQLite</strong></div>' +
    '<div class="panel-row">Private tabs <strong>Incognito runtime</strong></div>' +
    '<div class="panel-row">Telemetry <strong>Not implemented</strong></div>' +
    '<div class="panel-row">Tracker blocking <strong>NOT STARTED</strong></div>' +
    '<div class="panel-row">HTTPS-only <strong>NOT STARTED</strong></div>';
  const clear=document.createElement("button");clear.className="panel-action";clear.textContent="Clear Browsing Data";clear.onclick=()=>runCommand("clear");body.appendChild(clear);
}

async function showRuntime() {
  const body=basePanel("Runtime Status");
  const info=await invoke("runtime_info");
  body.innerHTML =
    '<div class="panel-row">Browser runtime <strong>'+esc(info.runtime)+'</strong></div>' +
    '<div class="panel-row">Runtime revision <strong>'+esc(info.revision)+'</strong></div>' +
    '<div class="panel-row">Azecotron Web <strong>'+esc(info.azecotronWeb.status)+'</strong></div>' +
    '<div class="panel-row">Cortis <strong>'+esc(info.search.status)+'</strong></div>' +
    '<div class="panel-row">'+esc(info.search.mode)+'</div>';
}

async function showSettings() {
  const body=basePanel("Settings");
  const s=await invoke("get_settings");Object.assign(state.settings,s);applySettings();
  body.innerHTML='';
  const search=document.createElement("input");search.className="setting-control";search.placeholder="Search settings…";body.appendChild(search);
  const grid=document.createElement("div");grid.className="settings-grid";body.appendChild(grid);

  const addSelect=(key,label,options)=>{
    const wrap=document.createElement("label");wrap.innerHTML='<div class="setting-label">'+label+'</div>';
    const sel=document.createElement("select");sel.className="setting-control";options.forEach(([v,t])=>{const o=document.createElement("option");o.value=v;o.textContent=t;sel.appendChild(o)});
    sel.value=s[key] || options[0][0];sel.onchange=async()=>{await invoke("set_setting",{key,value:sel.value});state.settings[key]=sel.value;applySettings()};
    wrap.appendChild(sel);grid.appendChild(wrap);return wrap;
  };
  const addToggle=(key,label)=>{
    const row=document.createElement("label");row.className="setting-toggle";row.innerHTML='<span>'+label+'</span>';
    const input=document.createElement("input");input.type="checkbox";input.checked=(s[key]||"false")==="true";
    input.onchange=async()=>{await invoke("set_setting",{key,value:String(input.checked)});state.settings[key]=String(input.checked);applySettings()};
    row.appendChild(input);grid.appendChild(row);return row;
  };

  addSelect("theme","Theme",[["dark","Dark"],["light","Light"],["system","System"]]);
  addSelect("accent","Accent",[["cyan","Cyan"],["violet","Violet"],["blue","Blue"],["green","Green"]]);
  addSelect("density","Density",[["comfortable","Comfortable"],["compact","Compact"]]);
  addToggle("show_shortcuts","Show shortcuts");
  addToggle("show_recent","Show recent activity");
  addToggle("search_history","Store search history");
  addToggle("quiet_mode","Quiet Mode");
  addSelect("default_zoom","Default zoom",[["75","75%"],["90","90%"],["100","100%"],["110","110%"],["125","125%"],["150","150%"]]);
  const reset=document.createElement("button");reset.className="panel-action";reset.textContent="Reset settings";reset.onclick=async()=>{if(confirm("Reset Synth Browser settings?")){await invoke("reset_settings");state.settings={};await refresh();showSettings()}};grid.appendChild(reset);

  search.oninput=()=>{
    const q=search.value.toLowerCase();
    [...grid.children].forEach(el=>{el.style.display=el.textContent.toLowerCase().includes(q)?"":"none"});
  };
}

$("workspaceButton").onclick=showWorkspaceMenu;
$("back").onclick=()=>invoke("back").catch(e=>toast(e));
$("forward").onclick=()=>invoke("forward").catch(e=>toast(e));
$("reload").onclick=()=>invoke("stop_or_reload").catch(e=>toast(e));
$("newTab").onclick=()=>invoke("new_tab",{private:false}).then(refresh).catch(toast);
$("bookmark").onclick=async()=>{try{await invoke("add_bookmark");toast("Saved to Bookmarks")}catch(e){toast(e)}};
$("shelf").onclick=async()=>{try{const tab=activeTab();if(tab?.url && tab.url!=="synth://newtab"){await invoke("add_to_shelf");toast("Saved to Reading Shelf")}else{showShelf()}}catch(e){toast(e)}};
$("downloads").onclick=()=>showDownloads();
$("menu").onclick=showPanel;

$("omnibox").addEventListener("input",async e=>{
  const q=e.target.value.trim();
  const wrap=$("omnibox").parentElement;
  let box=wrap.querySelector(".suggestions");
  if(!q){box?.remove();return}
  if(!box){box=document.createElement("div");box.className="suggestions";wrap.appendChild(box)}
  const candidates=[];
  state.tabs.filter(t=>t.workspace===state.activeWorkspace&&t.title.toLowerCase().includes(q.toLowerCase())).slice(0,4).forEach(t=>candidates.push(["Tab",t.title,t.url]));
  try{const hs=await invoke("list_history");hs.filter(h=>(h.title+h.url).toLowerCase().includes(q.toLowerCase())).slice(0,4).forEach(h=>candidates.push(["History",h.title||h.url,h.url]));}catch{}
  box.replaceChildren(...candidates.slice(0,7).map(c=>{const r=document.createElement("div");r.className="suggestion";r.innerHTML="<span>"+esc(c[1])+"</span><span class='suggestion-type'>"+esc(c[0])+"</span>";r.onclick=()=>{box.remove();go(c[2])};return r}));
});
$("omnibox").addEventListener("keydown",e=>{if(e.key==="Enter"){$("omnibox").parentElement.querySelector(".suggestions")?.remove();go(e.target.value)}if(e.key==="Escape"){renderAddress();$("omnibox").parentElement.querySelector(".suggestions")?.remove()}});

$("searchForm").onsubmit=e=>{e.preventDefault();go($("newtabSearch").value)};
$("newtabSearch").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();go(e.target.value)}};

const commands=[
 ["New Tab","Ctrl+T",()=>invoke("new_tab",{private:false})],
 ["New Private Tab","Ctrl+Shift+N",()=>invoke("new_tab",{private:true})],
 ["Close Tab","Ctrl+W",()=>closeTab(state.activeId)],
 ["Reopen Closed Tab","Ctrl+Shift+T",()=>invoke("reopen_closed_tab")],
 ["Stop / Reload","Ctrl+R",()=>invoke("stop_or_reload")],
 ["Add Bookmark","Ctrl+D",()=>invoke("add_bookmark")],
 ["Reading Shelf","",()=>showShelf()],
 ["Saved Sessions","",()=>showSessions()],
 ["Notes","",()=>showNotes()],
 ["Research Board","",()=>showBoards()],
 ["Workspaces","",()=>showWorkspaceMenu()],
 ["Settings","",()=>showSettings()],
 ["Privacy Shield","",()=>showPrivacy()],
 ["Developer Tools","F12",()=>invoke("open_devtools")],
 ["Print Page","Ctrl+P",()=>invoke("print_page")],
 ["Zoom In","Ctrl++",()=>setZoom(110)],
 ["Zoom Reset","Ctrl+0",()=>setZoom(100)],
 ["Zoom Out","Ctrl+-",()=>setZoom(90)],
 ["Clear Browsing Data","Ctrl+Shift+Delete",()=>runCommand("clear")]
];
async function setZoom(percent){try{await invoke("set_zoom",{percent});state.settings.default_zoom=String(percent);toast("Zoom "+percent+"%")}catch(e){toast(e)}}
function openPalette(){ $("palettePanel").classList.remove("hidden");$("paletteInput").value="";$("paletteInput").focus();renderCommands("") }
function closePalette(){ $("palettePanel").classList.add("hidden") }
function renderCommands(q){const matches=commands.filter(x=>x[0].toLowerCase().includes(q.toLowerCase()));const host=$("paletteResults");host.replaceChildren();matches.forEach((c,i)=>{const row=document.createElement("div");row.className="palette-result"+(i===0?" selected":"");row.innerHTML="<span>"+esc(c[0])+"</span><span class='palette-key'>"+esc(c[1])+"</span>";row.onclick=async()=>{closePalette();try{await c[2]();await refresh()}catch(e){toast(e)}};host.appendChild(row)})}
$("palette").onclick=openPalette;
$("paletteInput").oninput=e=>renderCommands(e.target.value);
$("paletteInput").onkeydown=async e=>{if(e.key==="Escape")closePalette();if(e.key==="Enter"){const c=commands.find(x=>x[0].toLowerCase().includes(e.target.value.toLowerCase()));if(c){closePalette();try{await c[2]();await refresh()}catch(err){toast(err)}}else{closePalette();go(e.target.value)}}};

document.addEventListener("click",e=>{
  if(!e.target.closest("#workspaceButton")&&!e.target.closest("#workspaceMenu")) $("workspaceMenu")?.remove();
  if(!e.target.closest("#panel")&&!e.target.closest("#menu")&&!e.target.closest("#downloads")&&!e.target.closest("#shelf")&&!e.target.closest("#privacy")) $("panel").classList.add("hidden");
});

document.addEventListener("keydown",async e=>{
 const m=e.ctrlKey||e.metaKey;
 if(m&&e.key.toLowerCase()==="l"){e.preventDefault();$("omnibox").focus();$("omnibox").select()}
 if(m&&e.key.toLowerCase()==="k"){e.preventDefault();openPalette()}
 if(m&&e.key.toLowerCase()==="t"){e.preventDefault();await invoke("new_tab",{private:false});await refresh()}
 if(m&&e.key.toLowerCase()==="w"){e.preventDefault();await closeTab(state.activeId)}
 if(m&&e.shiftKey&&e.key.toLowerCase()==="t"){e.preventDefault();await invoke("reopen_closed_tab");await refresh()}
 if(m&&e.key.toLowerCase()==="d"){e.preventDefault();$("bookmark").click()}
 if(m&&e.key.toLowerCase()==="r"){e.preventDefault();await invoke("stop_or_reload")}
 if(e.key==="F12"){e.preventDefault();invoke("open_devtools").catch(toast)}
 if(m&&e.key.toLowerCase()==="p"){e.preventDefault();invoke("print_page").catch(toast)}
 if(m&&e.key==="+"){e.preventDefault();setZoom(110)}
 if(m&&e.key==="-"){e.preventDefault();setZoom(90)}
 if(m&&e.key==="0"){e.preventDefault();setZoom(100)}
});

listen("browser://snapshot",e=>{Object.assign(state,e.payload);render()});
listen("browser://navigation",e=>{const t=state.tabs.find(x=>x.id===e.payload.tabId);if(t){t.url=e.payload.url;t.loading=e.payload.loading}render()});
listen("browser://title",e=>{const t=state.tabs.find(x=>x.id===e.payload.tabId);if(t)t.title=e.payload.title||"Untitled";render()});
listen("browser://download",e=>toast(e.payload.status==="completed"?"Download complete":"Download "+e.payload.status));
listen("browser://new-window",e=>go(e.payload.url));

(async()=>{
  try{
    state.runtime=await invoke("runtime_info");
    await refresh();
    $("runtimeText").textContent=state.runtime.runtime;
    $("runtimeDot").className="dot "+(state.runtime.runtime.includes("WebView2")?"":"cyan");
    setTimeout(()=>$("boot").classList.add("hidden"),1700);
  }catch(e){
    $("boot").classList.add("hidden");
    toast(e);
  }
})();
