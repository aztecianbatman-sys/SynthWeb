const tauri = window.__TAURI__;
const invoke = tauri.core.invoke;
const listen = tauri.event.listen;

const state = {tabs:[],activeId:"",runtime:null};

function $(id){return document.getElementById(id)}
function active(){return state.tabs.find(t=>t.id===state.activeId)}
function toast(msg){const el=$("toast");el.textContent=String(msg);el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2200)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[c]))}

function render(){
  const host=$("tabs");host.replaceChildren();
  state.tabs.forEach(tab=>{
    const t=document.createElement("div");t.className="tab"+(tab.id===state.activeId?" active":"");
    const f=document.createElement("span");f.textContent=tab.loading?"…":(tab.private?"◉":"•");f.style.color=tab.private?"#8b63ff":"#2ee6ff";
    const title=document.createElement("span");title.className="tab-title";title.textContent=tab.title||"New Tab";
    const x=document.createElement("button");x.className="tab-close";x.textContent="×";x.setAttribute("aria-label","Close tab");
    x.onclick=e=>{e.stopPropagation();closeTab(tab.id)};
    t.append(f,title,x);t.onclick=()=>activate(tab.id);host.appendChild(t);
  });
  const tab=active();$("omnibox").value=tab&&tab.url!=="synth://newtab"?tab.url:"";
  const secure=Boolean(tab&&tab.url.startsWith("https://"));
  $("siteState").textContent=tab&&tab.url!=="synth://newtab"?(secure?"•":"!"):"•";
  $("siteState").style.color=tab&&tab.url!=="synth://newtab"?(secure?"var(--good)":"var(--warn)"):"var(--muted)";
  $("newtab").style.visibility=tab&&tab.url==="synth://newtab"?"visible":"hidden";
}

async function refresh(){Object.assign(state,await invoke("get_snapshot"));render()}
async function go(value){const v=String(value||"").trim();if(!v)return;try{await invoke("navigate",{input:v});await refresh()}catch(e){toast(e)}}
async function activate(id){try{await invoke("activate_tab",{tabId:id});await refresh()}catch(e){toast(e)}}
async function closeTab(id){try{await invoke("close_tab",{tabId:id});await refresh()}catch(e){toast(e)}}

const links=[["YouTube","https://youtube.com"],["GitHub","https://github.com"],["Reddit","https://reddit.com"],["Discord","https://discord.com"]];
links.forEach(([name,url])=>{const b=document.createElement("button");b.className="shortcut";b.textContent=name;b.onclick=()=>go(url);$("shortcuts").appendChild(b)});

$("back").onclick=()=>invoke("back").catch(toast)
$("forward").onclick=()=>invoke("forward").catch(toast)
$("reload").onclick=()=>invoke("reload").catch(toast)
$("newTab").onclick=()=>invoke("new_tab",{private:false}).then(refresh).catch(toast)
$("bookmark").onclick=async()=>{try{await invoke("add_bookmark");toast("Saved to Bookmarks")}catch(e){toast(e)}}
$("omnibox").onkeydown=e=>{if(e.key==="Enter")go(e.target.value);if(e.key==="Escape")render()}
$("searchForm").onsubmit=e=>{e.preventDefault();go($("newtabSearch").value)}
$("newtabSearch").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();go(e.target.value)}}

async function panel(kind){
  const p=$("panel");p.classList.remove("hidden");
  if(kind==="menu")p.innerHTML='<div class="panel-section"><div class="panel-title">Synth Browser</div><button class="panel-action" data-x="private">New Private Tab</button><button class="panel-action" data-x="reopen">Reopen Closed Tab</button><button class="panel-action" data-x="bookmarks">Bookmarks</button><button class="panel-action" data-x="history">History</button><button class="panel-action" data-x="clear">Clear Browsing Data</button><button class="panel-action" data-x="devtools">Developer Tools</button><button class="panel-action" data-x="runtime">Runtime & Security</button></div>';
  if(kind==="privacy")p.innerHTML='<div class="panel-section"><div class="panel-title">Privacy Shield</div><div class="panel-row">Normal history <strong>Local SQLite</strong></div><div class="panel-row">Private tabs <strong>Incognito runtime</strong></div><div class="panel-row">Telemetry <strong>Not implemented</strong></div><div class="panel-row">Tracker filtering <strong>NOT STARTED</strong></div><button class="panel-action" data-x="clear">Clear Browsing Data</button></div>';
  if(kind==="downloads")p.innerHTML='<div class="panel-section"><div class="panel-title">Downloads</div><div class="panel-row">Folder <strong>Downloads/Synth Browser</strong></div><div class="panel-row">Auto-run <strong>Disabled</strong></div><div class="panel-row">Checksum verification <strong>NOT STARTED</strong></div></div>';
  p.querySelectorAll("[data-x]").forEach(b=>b.onclick=async()=>{const cmd=b.dataset.x;try{if(cmd==="private")await invoke("new_tab",{private:true});if(cmd==="reopen")await invoke("reopen_closed_tab");if(cmd==="bookmarks"){const rows=await invoke("list_bookmarks");dataPanel("Bookmarks",rows.map(x=>[x.title,x.url]))}if(cmd==="history"){const rows=await invoke("list_history");dataPanel("History",rows.map(x=>[x.title||x.domain,x.url]))}if(cmd==="clear"){if(confirm("Clear local history and active webview browsing data?")){await invoke("clear_browsing_data");toast("Browsing data cleared")}}if(cmd==="devtools")await invoke("open_devtools");if(cmd==="runtime"){const x=await invoke("runtime_info");dataPanel("Runtime & Security",[[x.runtime,x.revision],["Azecotron Web",x.azecotronWeb.status],["Cortis",x.search.status+" · "+x.search.mode]])}if(cmd!=="bookmarks"&&cmd!=="history"&&cmd!=="runtime"){p.classList.add("hidden")}await refresh()}catch(e){toast(e)}})
}
$("menu").onclick=()=>panel("menu")
$("downloads").onclick=()=>panel("downloads")
$("privacy").onclick=()=>panel("privacy")

function dataPanel(title,rows){const p=$("panel");p.classList.remove("hidden");p.innerHTML='<div class="panel-section"><div class="panel-title">'+esc(title)+'</div><div id="rows"></div></div>';const h=p.querySelector("#rows");if(!rows.length){h.innerHTML='<div class="panel-row">Nothing here yet.</div>';return}rows.slice(0,30).forEach(r=>{const b=document.createElement("button");b.className="panel-action";b.innerHTML="<strong>"+esc(r[0])+"</strong><br><span style='color:#6f8192'>"+esc(r[1])+"</span>";b.onclick=()=>go(r[1]);h.appendChild(b)})}

const commands=[
  ["New Tab","Ctrl+T",()=>invoke("new_tab",{private:false})],
  ["New Private Tab","Ctrl+Shift+N",()=>invoke("new_tab",{private:true})],
  ["Close Tab","Ctrl+W",()=>closeTab(state.activeId)],
  ["Reopen Closed Tab","Ctrl+Shift+T",()=>invoke("reopen_closed_tab")],
  ["Reload","Ctrl+R",()=>invoke("reload")],
  ["Add Bookmark","Ctrl+D",()=>invoke("add_bookmark")],
  ["History","Ctrl+H",()=>panel("menu")],
  ["Clear Browsing Data","Ctrl+Shift+Delete",()=>{if(confirm("Clear browsing data?"))return invoke("clear_browsing_data")}],
  ["Developer Tools","F12",()=>invoke("open_devtools")],
  ["Runtime & Security","",()=>panel("menu")]
];
function palette(){
  $("palettePanel").classList.remove("hidden");$("paletteInput").value="";$("paletteInput").focus();renderCommands("")
}
function closePalette(){$("palettePanel").classList.add("hidden")}
function renderCommands(q){const m=commands.filter(x=>x[0].toLowerCase().includes(q.toLowerCase()));const host=$("paletteResults");host.replaceChildren();m.forEach((c,i)=>{const r=document.createElement("div");r.className="palette-result"+(i===0?" selected":"");r.innerHTML="<span>"+esc(c[0])+"</span><span class='palette-key'>"+esc(c[1])+"</span>";r.onclick=async()=>{closePalette();try{await c[2]();await refresh()}catch(e){toast(e)}};host.appendChild(r)})}
$("palette").onclick=palette
$("paletteInput").oninput=e=>renderCommands(e.target.value)
$("paletteInput").onkeydown=async e=>{if(e.key==="Escape")closePalette();if(e.key==="Enter"){const c=commands.find(x=>x[0].toLowerCase().includes(e.target.value.toLowerCase()));if(c){closePalette();try{await c[2]();await refresh()}catch(err){toast(err)}}else{closePalette();go(e.target.value)}}}

document.onkeydown=async e=>{
 const m=e.ctrlKey||e.metaKey;
 if(m&&e.key.toLowerCase()==="l"){e.preventDefault();$("omnibox").focus();$("omnibox").select()}
 if(m&&e.key.toLowerCase()==="k"){e.preventDefault();palette()}
 if(m&&e.key.toLowerCase()==="t"){e.preventDefault();await invoke("new_tab",{private:false});await refresh()}
 if(m&&e.key.toLowerCase()==="w"){e.preventDefault();await closeTab(state.activeId)}
 if(m&&e.shiftKey&&e.key.toLowerCase()==="t"){e.preventDefault();await invoke("reopen_closed_tab");await refresh()}
 if(m&&e.key.toLowerCase()==="d"){e.preventDefault();$("bookmark").click()}
 if(m&&e.key.toLowerCase()==="r"){e.preventDefault();await invoke("reload")}
 if(e.key==="F12"){e.preventDefault();invoke("open_devtools").catch(toast)}
}

listen("browser://snapshot",e=>{Object.assign(state,e.payload);render()});
listen("browser://navigation",e=>{const t=state.tabs.find(x=>x.id===e.payload.tabId);if(t){t.url=e.payload.url;t.loading=e.payload.loading}render()});
listen("browser://title",e=>{const t=state.tabs.find(x=>x.id===e.payload.tabId);if(t)t.title=e.payload.title||"Untitled";render()});
listen("browser://download",e=>toast(e.payload.status==="completed"?"Download complete":"Download "+e.payload.status));
listen("browser://new-window",e=>go(e.payload.url));

refresh().then(async()=>{try{state.runtime=await invoke("runtime_info");$("runtimeText").textContent=state.runtime.runtime;$("runtimeDot").className="dot "+(state.runtime.runtime.includes("WebView2")?"":"cyan")}catch(e){toast(e)}}).catch(toast);
