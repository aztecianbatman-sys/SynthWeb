const tauri = window.__TAURI__;
const invoke = tauri.core.invoke;
const listen = tauri.event.listen;

const state = {
  tabs: [],
  searchMode: "web",
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
  document.body.classList.toggle("compact", state.settings.density === "compact");
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
    el.oncontextmenu = e => { e.preventDefault(); showTabContext(e.clientX,e.clientY,tab); };
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

async function renderRecent() {
  const host=$("recent"); if(!host)return;
  host.replaceChildren();
  if(state.settings.show_recent==="false" || state.settings.quiet_mode==="true") return;
  try {
    const rows=state.settings.search_history==="false"?[]:await invoke("list_history");
    const seen=new Set();
    rows.filter(r=>r.url&&!r.url.startsWith("https://www.google.com/search")).forEach(r=>{
      const key=r.domain||r.url;
      if(seen.has(key)||seen.size>=6)return;
      seen.add(key);
      const b=document.createElement("button");b.className="shortcut recent-link";b.innerHTML=esc(r.title||r.domain||r.url)+" <span>recent</span>";b.onclick=()=>go(r.url);host.appendChild(b);
    });
  } catch {}
}

function render() {
  renderTabs();
  renderAddress();
  const tab = activeTab();
  $("newtab").style.visibility = tab && tab.url === "synth://newtab" ? "visible" : "hidden";
  $("workspaceButton").textContent = state.activeWorkspace;
  applySettings();
  document.querySelectorAll(".search-mode").forEach(b=>b.classList.toggle("active",b.dataset.mode===state.searchMode));
  renderRecent();
}

async function refresh() {
  const snapshot = await invoke("get_snapshot");
  Object.assign(state, snapshot);
  state.settings = await invoke("get_settings");
  render();
}

async function cortisSearch(query, mode=state.searchMode) {
  const q=String(query||"").trim();
  if(!q)return;
  try{await invoke("search_with_mode",{query:q,mode});await refresh()}
  catch(e){toast("Cortis could not complete that search.")}
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

function showTabContext(x,y,tab){
  document.querySelector("#tabContext")?.remove();
  const menu=document.createElement("div");menu.id="tabContext";menu.className="workspace-menu";menu.style.left=x+"px";menu.style.top=y+"px";
  const actions=[
    [tab.pinned?"Unpin Tab":"Pin Tab",async()=>{await invoke("toggle_pin",{tabId:tab.id})}],
    ["Duplicate Tab",async()=>{const n=await invoke("new_tab",{private:tab.private});await invoke("navigate",{input:tab.url})}],
    ["Close Tab",async()=>closeTab(tab.id)],
    ["Close Other Tabs",async()=>invoke("close_other_tabs",{tabId:tab.id})],
    ["Close Tabs to Right",async()=>invoke("close_tabs_right",{tabId:tab.id})],
    ["Move to Workspace",async()=>showWorkspaceMove(tab)]
  ];
  actions.forEach(([label,fn])=>{const b=document.createElement("button");b.className="workspace-item";b.textContent=label;b.onclick=async()=>{menu.remove();try{await fn();await refresh()}catch(e){toast(e)}};menu.appendChild(b)});
  document.body.appendChild(menu);
  const close=()=>{menu.remove();document.removeEventListener("click",close)};setTimeout(()=>document.addEventListener("click",close),0);
}
async function showWorkspaceMove(tab){
  const menu=document.createElement("div");menu.id="tabMove";menu.className="workspace-menu";menu.style.left="50%";menu.style.top="100px";
  state.workspaces.filter(w=>w.name!==tab.workspace).forEach(w=>{const b=document.createElement("button");b.className="workspace-item";b.textContent=w.name;b.onclick=async()=>{await moveTabToWorkspace(tab.id,w.name);menu.remove()};menu.appendChild(b)});
  document.body.appendChild(menu);
}
async function moveTabToWorkspace(tabId,name){try{await invoke("move_tab_to_workspace",{tabId,name});await refresh()}catch(e){toast(e)}}

async function showWorkspaceMenu() {
  const existing=$("workspaceMenu"); if(existing){existing.remove();return}
  const menu=document.createElement("div");menu.id="workspaceMenu";menu.className="workspace-menu";
  state.workspaces.forEach(w=>{
    const row=document.createElement("div");row.className="workspace-item"+(w.name===state.activeWorkspace?" active":"");row.innerHTML="<span>"+esc(w.name)+"</span>";
    row.onclick=async()=>{try{await invoke("switch_workspace",{name:w.name});await refresh();menu.remove()}catch(e){toast(e)}};
    row.oncontextmenu=async e=>{e.preventDefault();const action=prompt("Workspace action: rename, duplicate, delete");if(!action)return;try{
      if(action==="rename"){const n=prompt("New name",w.name);if(n)await invoke("rename_workspace",{id:w.id,name:n})}
      if(action==="duplicate"){const n=prompt("Copy name",w.name+" Copy");if(n)await invoke("duplicate_workspace",{source:w.name,name:n})}
      if(action==="delete"){if(confirm("Delete this workspace and move its tabs to Default?"))await invoke("delete_workspace",{id:w.id})}
      await refresh();showWorkspaceMenu();
    }catch(err){toast(err)}};
    menu.appendChild(row);
  });
  const create=document.createElement("button");create.className="workspace-item workspace-create";create.textContent="+ Create workspace";create.onclick=async()=>{const n=prompt("Workspace name");if(!n)return;try{await invoke("create_workspace",{name:n});await refresh();menu.remove()}catch(e){toast(e)}};
  menu.appendChild(create);document.body.appendChild(menu);
}
async function showAssist(){
  const body=basePanel("Synth Assist");
  let info;
  try{info=await invoke("ai_status")}catch(e){body.innerHTML="<div class='panel-row'>AI status unavailable.</div>";return}
  body.innerHTML=
    '<div class="panel-row">Status <strong>'+ (info.enabled?"Enabled":"Disabled") +'</strong></div>'+
    '<div class="panel-row">Provider <strong>'+esc(info.provider)+'</strong></div>'+
    '<div class="panel-row">Endpoint <strong>'+esc(info.endpoint)+'</strong></div>'+
    '<div class="setting-label">Model</div>';
  const model=document.createElement("input");model.className="setting-control";model.value=info.model;model.placeholder="e.g. llama3.2";model.onchange=async()=>{try{await invoke("set_setting",{key:"ai_model",value:model.value});toast("AI model saved")}catch(e){toast(e)}};
  body.appendChild(model);
  const endpoint=document.createElement("input");endpoint.className="setting-control";endpoint.value=info.endpoint;endpoint.placeholder="http://127.0.0.1:11434/v1";endpoint.onchange=async()=>{try{await invoke("set_setting",{key:"ai_endpoint",value:endpoint.value});toast("AI endpoint saved")}catch(e){toast(e)}};
  body.appendChild(document.createElement("div")).textContent="Endpoint";
  body.appendChild(endpoint);
  const enabled=document.createElement("label");enabled.className="setting-toggle";enabled.innerHTML="<span>Enable Synth Assist</span>";
  const check=document.createElement("input");check.type="checkbox";check.checked=info.enabled;check.onchange=async()=>{try{await invoke("set_setting",{key:"ai_enabled",value:String(check.checked)});showAssist()}catch(e){toast(e)}};
  enabled.appendChild(check);body.appendChild(enabled);
  const page=document.createElement("label");page.className="setting-toggle";page.innerHTML="<span>Allow page context on request</span>";
  const pageCheck=document.createElement("input");pageCheck.type="checkbox";pageCheck.checked=(state.settings.ai_page_context||"false")==="true";pageCheck.onchange=async()=>{await invoke("set_setting",{key:"ai_page_context",value:String(pageCheck.checked)});state.settings.ai_page_context=String(pageCheck.checked)};
  page.appendChild(pageCheck);body.appendChild(page);
  const selection=document.createElement("label");selection.className="setting-toggle";selection.innerHTML="<span>Allow selection context on request</span>";
  const selectionCheck=document.createElement("input");selectionCheck.type="checkbox";selectionCheck.checked=(state.settings.ai_selection_context||"false")==="true";selectionCheck.onchange=async()=>{await invoke("set_setting",{key:"ai_selection_context",value:String(selectionCheck.checked)});state.settings.ai_selection_context=String(selectionCheck.checked)};
  selection.appendChild(selectionCheck);body.appendChild(selection);
  const keyStatus=document.createElement("div");keyStatus.className="panel-row";keyStatus.innerHTML="Credential <strong>"+(info.keyStored?"Stored in OS secure storage":"Not stored")+"</strong>";body.appendChild(keyStatus);
  const key=document.createElement("input");key.type="password";key.className="setting-control";key.placeholder=info.keyStored?"Replace secure API key":"Store API key securely";body.appendChild(key);
  const save=document.createElement("button");save.className="panel-action";save.textContent="Save API key";save.onclick=async()=>{if(!key.value)return;try{await invoke("set_ai_key",{provider:info.provider,key:key.value});key.value="";toast("API key stored securely");showAssist()}catch(e){toast(e)}};body.appendChild(save);
  const clear=document.createElement("button");clear.className="panel-action";clear.textContent="Clear API key";clear.onclick=async()=>{try{await invoke("clear_ai_key",{provider:info.provider});toast("API key removed");showAssist()}catch(e){toast(e)}};body.appendChild(clear);
  const models=document.createElement("button");models.className="panel-action";models.textContent="Load available models";models.onclick=async()=>{try{const rows=await invoke("list_ai_models");toast(rows.length?("Models: "+rows.slice(0,4).join(", ")): "Provider returned no models")}catch(e){toast(e)}};body.appendChild(models);
  const ask=document.createElement("button");ask.className="panel-action";ask.textContent="Ask about current page";ask.onclick=async()=>{try{await invoke("request_page_context");toast("Page context requested…")}catch(e){toast(e)}};body.appendChild(ask);
  const explain=document.createElement("button");explain.className="panel-action";explain.textContent="Explain current selection";explain.onclick=async()=>{try{await invoke("request_selection_context");toast("Selection context requested…")}catch(e){toast(e)}};body.appendChild(explain);
  const note=document.createElement("div");note.className="panel-row";note.textContent="Page or selection text is sent only after you explicitly request context.";body.appendChild(note);
}

function showAiAnswer(answer,title){
  const body=basePanel("Synth Assist");
  const h=document.createElement("div");h.className="panel-row";h.innerHTML="<strong>"+esc(title||"Answer")+"</strong>";body.appendChild(h);
  const out=document.createElement("div");out.style.cssText="padding:10px 0;font-size:12px;line-height:1.65;white-space:pre-wrap;color:#d4dee6";out.textContent=answer;body.appendChild(out);
  const clear=document.createElement("button");clear.className="panel-action";clear.textContent="Back to Assist";clear.onclick=showAssist;body.appendChild(clear);
}


