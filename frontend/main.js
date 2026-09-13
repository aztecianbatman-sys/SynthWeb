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
  runtime: null,
  profile: null,
  profiles: [],
  guest: false,
  trackerBlocked: 0,
};

const $ = (id) => document.getElementById(id);

function formatBytes(value){const n=Number(value)||0;if(n<1024)return n+" B";if(n<1048576)return Math.round(n/1024)+" KB";return (n/1048576).toFixed(n<10485760?1:0)+" MB"}

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
  document.documentElement.style.setProperty("--cyan", accentMap[accent] || accentMap.cyan);  const scale = Number(state.settings.text_scale || "100") / 100;
  document.documentElement.style.setProperty("--synth-text-scale", String(scale));
  document.body.classList.toggle("reduced-motion", state.settings.reduce_motion === "true");
  document.body.classList.toggle("high-contrast", state.settings.high_contrast === "true");
  document.documentElement.lang = state.settings.language || "en";

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

function featureCard({icon,title,description,status,metric,action,label="Open",tone="cyan"}){
  return '<article class="feature-card" data-tone="'+tone+'"><div class="feature-top"><span class="feature-icon">'+icon+'</span><span class="feature-state">'+esc(status)+'</span></div><h3>'+esc(title)+'</h3><p>'+esc(description)+'</p>'+(metric?'<div class="feature-metric">'+metric+'</div>':'')+'<div class="feature-actions"><button class="feature-action primary" data-feature="'+esc(action)+'">'+esc(label)+'</button></div><span class="feature-glow"></span></article>';
}

function renderFeatureDashboard(){
  const grid=$("featureGrid");if(!grid)return;
  const tabCount=state.tabs.length;
  const workspaceCount=state.workspaces.length;
  const profileCount=(state.profiles||[]).length;
  const trackerBlocked=Number(state.trackerBlocked||0);
  const privateTabs=state.tabs.filter(t=>t.private).length;
  const runtime=state.runtime||{};
  const azecotron=runtime.azecotronWeb?.status||"BUILD / INTEGRATION";
  const privacy=state.settings.https_only==="true"&&state.settings.search_history==="false"&&state.settings.ai_enabled!=="true";
  grid.innerHTML=[
    featureCard({icon:"✦",title:"Synth Assist",description:"Chat with your configured model, search with AI, or work from explicitly requested context.",status:state.settings.ai_enabled==="true"?"ENABLED":"OFF BY DEFAULT",metric:state.settings.ai_enabled==="true"?"Provider · "+esc(state.settings.ai_provider||"custom"):"No remote AI is running",action:"assist",tone:"violet"}),
    featureCard({icon:"◈",title:"Privacy Center",description:"Manage permissions, cookies, site data, HTTPS-only mode and local privacy controls.",status:privacy?"SHIELDED":"CUSTOM",metric:privateTabs+" private tab"+(privateTabs===1?"":"s"),action:"privacy",tone:"cyan"}),
    featureCard({icon:"◉",title:"Profiles & Guest",description:"Separate browser data by profile, or start a disposable Guest session.",status:state.guest?"GUEST":"ACTIVE",metric:profileCount+" saved profile"+(profileCount===1?"":"s"),action:"profiles",tone:"green"}),
    featureCard({icon:"⌘",title:"Command Palette",description:"Search commands, navigation tools, DevTools and browser actions without leaving the keyboard.",status:"READY",metric:"Ctrl+K · F12 · Ctrl+F",action:"palette",tone:"violet"}),
    featureCard({icon:"⊞",title:"Extensions",description:"Extension architecture is reserved for the native Chromium runtime and is not faked in this build.",status:"NOT STARTED",metric:"Chromium runtime required",action:"extensions",label:"View status",tone:"violet"}),
    featureCard({icon:"◌",title:"Browser Features",description:"Tabs, workspaces, Reader Mode, Page Lens, source viewing, find-in-page and sessions.",status:"LIVE",metric:tabCount+" open tab"+(tabCount===1?"":"s")+" · "+workspaceCount+" workspace"+(workspaceCount===1?"":"s"),action:"overview",tone:"cyan"}),
    featureCard({icon:"◍",title:"Media & WebRTC",description:"Permission plumbing exists, but full Chromium media/device verification waits for Azecotron.",status:"PARTIAL",metric:"Native permission layer",action:"permissions",label:"Permissions",tone:"violet"}),
    featureCard({icon:"↓",title:"Downloads",description:"Real download history, local file actions and SHA-256 integrity verification.",status:"LIVE",metric:"Checksums available",action:"downloads",tone:"green"}),
    featureCard({icon:"◇",title:"Bookmarks · History · Reading",description:"Keep useful pages locally organized without requiring a cloud account.",status:"LIVE",metric:"Local SQLite",action:"library",tone:"violet"}),
    featureCard({icon:"▦",title:"Workspaces & Sessions",description:"Organize tabs into isolated workspaces and save sessions for later restoration.",status:"LIVE",metric:workspaceCount+" workspace"+(workspaceCount===1?"":"s"),action:"workspaces",tone:"cyan"}),
    featureCard({icon:"ϟ",title:"Performance & Reliability",description:"Crash recovery, persistent state and source-level diagnostics are in place; measured benchmarks are not yet certified.",status:"NOT VERIFIED",metric:"Windows benchmark required",action:"performance",tone:"violet"}),
    featureCard({icon:"⬡",title:"Azecotron Web",description:"Pinned Chromium fork with reproducible patch/build tooling. Native Content API integration is the remaining major runtime milestone.",status:esc(azecotron),metric:"Chromium 152.0.7977.119",action:"azecotron",label:"Runtime status",tone:"cyan"})
  ].join("");
  grid.querySelectorAll("[data-feature]").forEach(btn=>btn.onclick=async()=>{
    const action=btn.dataset.feature;
    try{
      if(action==="assist")return showAssist();
      if(action==="privacy")return showPrivacy();
      if(action==="data")return showDataControls();
      if(action==="profiles")return showProfiles();
      if(action==="palette")return $("palette").click();
      if(action==="overview")return openOverview();
      if(action==="downloads")return showDownloads();
      if(action==="library")return showBookmarks();
      if(action==="workspaces")return showSessions();
      if(action==="runtime"||action==="azecotron")return showRuntime();
      if(action==="performance")return showPerformance();
      if(action==="performance")return showPerformance();
      if(action==="permissions")return showMedia();
      if(action==="threads")return showAiThreads();
      if(action==="chains")return showCommandChains();
      if(action==="extensions")return showExtensions();
    }catch(e){toast(e)}
  });
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
  renderFeatureDashboard();
}


const onboardingState={step:0,profileName:"",privacy:"strict",theme:"dark",showRecent:false,searchHistory:false,wipeExisting:true};
function onboardingSteps(){
  return [
    {
      kicker:"WELCOME",
      title:"A browser that starts with you.",
      body:"Synth Browser keeps the core browsing experience familiar while putting privacy controls close to the surface. The setup takes about a minute.",
      html:'<div class="onboarding-cards"><div class="onboarding-card"><strong>Local first</strong><span>Browser data stays in your profile unless you deliberately use a remote service.</span></div><div class="onboarding-card"><strong>AI stays optional</strong><span>Synth Assist is off until you turn it on.</span></div><div class="onboarding-card"><strong>Real controls</strong><span>Privacy settings are backed by the runtime, not decorative switches.</span></div><div class="onboarding-card"><strong>No silent collection</strong><span>Page context is only captured after an explicit action.</span></div></div>'
    },
    {
      kicker:"PRIVACY",
      title:"Start with Shielded mode?",
      body:"Shielded is Synth's privacy-first preset. You can change every setting later.",
      html:'<label class="onboarding-choice selected"><input type="radio" name="privacyMode" value="strict" checked><div><strong>Shielded</strong><small>No search/history memory, HTTPS-only navigation, AI disabled, recent activity hidden, and sensitive permissions ask or block.</small></div></label><label class="onboarding-choice"><input type="radio" name="privacyMode" value="balanced"><div><strong>Balanced</strong><small>Normal browsing convenience with history and recent activity enabled. HTTPS-only stays on.</small></div></label><label class="onboarding-choice"><input id="obWipe" type="checkbox" checked><div><strong>Clean existing browsing data</strong><small>For an existing profile, clear local history, search memory, cookies, cache and site data before finishing setup. Bookmarks and saved sessions are kept.</small></div></label>'
    },
    {
      kicker:"PERSONALIZE",
      title:"Make it feel like your browser.",
      body:"These are appearance choices only. They do not weaken privacy settings.",
      html:'<div class="onboarding-cards"><div><label class="setting-label">Theme<select id="obTheme" class="onboarding-field"><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label></div><div><label class="setting-label">Profile<input id="obProfile" class="onboarding-field" maxlength="60" placeholder="Default profile"></label></div></div>'
    },
    {
      kicker:"READY",
      title:"Your privacy baseline is set.",
      body:"You can revisit these choices from Settings → Privacy & Security at any time.",
      html:'<div class="onboarding-cards"><div class="onboarding-card"><strong>Search memory</strong><span id="obSearchSummary">Off</span></div><div class="onboarding-card"><strong>AI</strong><span>Disabled</span></div><div class="onboarding-card"><strong>HTTPS-only</strong><span>Enabled</span></div><div class="onboarding-card"><strong>Sensitive permissions</strong><span>Ask / Block</span></div></div>'
    }
  ];
}
function renderOnboarding(){
  const steps=onboardingSteps();const step=steps[onboardingState.step];
  $("onboardingContent").innerHTML='<div class="onboarding-kicker">'+step.kicker+'</div><h1 id="onboardingTitle">'+step.title+'</h1><p>'+step.body+'</p>'+step.html;
  $("onboardingStep").textContent=(onboardingState.step+1)+" / "+steps.length;
  $("onboardingProgress").style.width=((onboardingState.step+1)/steps.length*100)+"%";
  $("onboardingBack").style.visibility=onboardingState.step===0?"hidden":"visible";
  $("onboardingSkip").style.display=onboardingState.step===0?"none":"inline-block";
  $("onboardingNext").textContent=onboardingState.step===steps.length-1?"Finish":"Continue";
  if(onboardingState.step===1){
    const wipe=document.getElementById("obWipe"); if(wipe){wipe.checked=onboardingState.wipeExisting;wipe.onchange=e=>onboardingState.wipeExisting=e.target.checked}
    document.querySelectorAll('input[name="privacyMode"]').forEach(input=>{
      input.onchange=()=>{onboardingState.privacy=input.value;document.querySelectorAll(".onboarding-choice").forEach(x=>x.classList.remove("selected"));input.closest(".onboarding-choice")?.classList.add("selected")}
    });
  }
  if(onboardingState.step===2){
    $("obTheme").value=onboardingState.theme;
    $("obTheme").onchange=e=>onboardingState.theme=e.target.value;
    $("obProfile").value=onboardingState.profileName;
    $("obProfile").oninput=e=>onboardingState.profileName=e.target.value.trim();
  }
}
async function completeOnboarding(){
  const balanced=onboardingState.privacy==="balanced";
  const settings={
    theme:onboardingState.theme,
    accent:"cyan",
    density:"comfortable",
    show_shortcuts:"true",
    show_recent:String(balanced),
    search_history:String(balanced),
    quiet_mode:"false",
    https_only:"true",
    tracker_enabled:"true",
    ai_enabled:"false",
    ai_page_context:"false",
    ai_selection_context:"false",
    permission_camera:"prompt",
    permission_microphone:"prompt",
    permission_geolocation:"prompt",
    permission_notifications:"prompt",
    permission_display_capture:"prompt",
    permission_clipboard:"deny",
    permission_local_fonts:"deny",
    permission_sensors:"deny",
    default_zoom:"100"
  };
  try{
    if(!balanced) await invoke("privacy_preset");
    if(!balanced && onboardingState.wipeExisting) await invoke("clear_browsing_data");
    settings.show_recent=balanced?"true":"false";
    settings.search_history=balanced?"true":"false";
    await invoke("complete_onboarding",{settings});
    $("onboarding").classList.add("hidden");
    await refresh();
    if(onboardingState.profileName && onboardingState.profileName!=="Default"){
      try{await invoke("create_profile",{name:onboardingState.profileName});}catch(e){toast("Profile was not created: "+e)}
    }
    toast("Synth Browser is ready.");
  }catch(e){toast(e)}
}
async function startOnboarding(){
  onboardingState.privacy="strict";onboardingState.theme=state.settings.theme||"dark";
  $("onboarding").classList.remove("hidden");renderOnboarding();
}
$("onboardingBack").onclick=()=>{if(onboardingState.step>0){onboardingState.step--;renderOnboarding()}};
$("onboardingSkip").onclick=()=>{onboardingState.step=onboardingSteps().length-1;renderOnboarding()};
$("onboardingNext").onclick=async()=>{if(onboardingState.step<onboardingSteps().length-1){onboardingState.step++;renderOnboarding()}else{await completeOnboarding()}};

async function updateReferenceCapsule(){
  try{
    const info=await invoke("site_info");
    const host=info.host||"New Tab";
    $("capsuleHost").textContent=host;
    $("shieldHost").textContent=host;
    $("capsuleCookies").textContent=String(info.cookieCount ?? "—");
    $("shieldCookies").textContent=String(info.cookieCount ?? "—");
    const origin=new URL(info.url).origin;
    const permissions=await invoke("list_site_permissions",{origin});
    $("capsulePermissions").textContent=String(permissions.length);
    $("shieldPermissions").textContent=String(permissions.length);
    $("shieldHttpsState").textContent=state.settings.https_only==="true"?"Protected":"Off";
    $("shieldCookiesState").textContent=tracker.interception==="PLATFORM_LIMITED"?"Host-limited":"Strict";
    $("shieldFingerprintState").textContent="Chromium runtime dependent";
    $("shieldLocationState").textContent=state.settings.permission_geolocation||"prompt";
    $("shieldNotificationState").textContent=state.settings.permission_notifications||"prompt";
    $("capsuleTrackers").textContent=String(state.trackerBlocked||0);
    $("shieldBlocked").textContent=String(state.trackerBlocked||0);
    $("shieldTrackers").textContent=String(state.trackerBlocked||0);
  }catch{
    $("capsuleHost").textContent="New Tab";
    $("shieldHost").textContent="New Tab";
  }
}

function wireHomeRail(){
  document.querySelectorAll("[data-home-action]").forEach((button)=>{
    button.onclick=async()=>{
      document.querySelectorAll(".rail-item").forEach(x=>x.classList.toggle("active",x===button));
      const action=button.dataset.homeAction;
      if(action==="home")return;
      if(action==="assist")return showAssist();
      if(action==="privacy")return showPrivacy();
      if(action==="bookmarks")return showBookmarks();
      if(action==="history")return showHistory();
      if(action==="downloads")return showDownloads();
      if(action==="profiles")return showProfiles();
      if(action==="extensions")return toast("Extensions are waiting for the native Azecotron extension runtime.");
      if(action==="settings")return showSettings();
      if(action==="windows")return showWindows();
      if(action==="tools")return showBrowserTools();
      if(action==="diagnostics")return showDiagnostics();
      if(action==="inspector")return showInspector();
      if(action==="accessibility")return accessibilityAudit();
    };
  });
  $("railClose").onclick=()=>document.body.classList.toggle("rail-collapsed");
  $("railSearch").oninput=(e)=>{
    const q=e.target.value.toLowerCase();
    document.querySelectorAll(".rail-item").forEach(x=>x.hidden=!x.textContent.toLowerCase().includes(q));
  };
  $("capsuleManage").onclick=showSiteSecurity;
  $("shieldDetails").onclick=showPrivacy;
  $("shieldClose").onclick=()=> $("shieldCapsule").classList.add("hidden");
}

async function refresh() {
  const snapshot = await invoke("get_snapshot");
  state.tabs = snapshot.tabs;
  state.activeId = snapshot.active_id;
  state.activeWorkspace = snapshot.active_workspace;
  state.workspaces = snapshot.workspaces;
  state.restoreAvailable = snapshot.restore_available;
  state.profile = snapshot.profile;
  state.profiles = snapshot.profiles;
  state.guest = snapshot.guest;
  state.runtime = await invoke("runtime_info");
  state.settings = await invoke("get_settings");
  applySettings();
  render();
  await updateReferenceCapsule();
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
    ["Reader Mode", async () => openReaderMode()],
    ["Page Source", async () => openPageSource()],
    ["Find in Page", async () => openFind()],
    ["Page Lens", async () => openPageLens()],
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
    ["Profile", async () => showProfiles()],
    ["Developer Tools", async () => invoke("open_devtools")],
    ["Synth Inspector", async () => showInspector()],
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
        if (!["Reading Shelf","Saved Sessions","Notes","Research Board","Synth Assist","Bookmarks","History","Privacy Shield","Site Capsule","Settings","Runtime Status","Downloads","Tab Overview","Reader Mode","Page Lens"].includes(label)) {
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

async function showDataControls(){
  const body=basePanel("Clear browser data");
  const categories=[
    ["history","Browsing history","Visited pages and local search memory"],
    ["downloads","Downloads","Download history and verification metadata"],
    ["permissions","Permissions","Per-site permission overrides and history"],
    ["ai","Synth Assist","Local AI conversation/history data"],
    ["sessions","Saved sessions","Saved tab/session snapshots"],
    ["shelf","Reading Shelf","Saved reading items"],
    ["notes","Notes & Research","Local notes and research boards"],
    ["site_data","Current site data","Cookies, cache, local/session storage and IndexedDB in open tabs"],
    ["all","Everything","All removable browser data; bookmarks and profiles remain"]
  ];
  const selected=new Set();
  categories.forEach(([id,title,desc])=>{
    const row=document.createElement("label");row.className="data-choice";
    const input=document.createElement("input");input.type="checkbox";input.onchange=()=>input.checked?selected.add(id):selected.delete(id);
    const copy=document.createElement("div");copy.innerHTML='<strong>'+esc(title)+'</strong><span>'+esc(desc)+'</span>';
    row.append(input,copy);body.appendChild(row);
  });
  const erase=document.createElement("button");erase.className="panel-action";erase.textContent="Clear selected data";
  erase.onclick=async()=>{
    if(!selected.size){toast("Choose at least one category.");return}
    if(!confirm("Delete the selected browser data? This cannot be undone."))return;
    try{
      for(const category of selected) await invoke("clear_data_category",{category});
      await refresh();toast("Selected browser data cleared");showDataControls();
    }catch(e){toast(e)}
  };
  body.appendChild(erase);
  const note=document.createElement("div");note.className="panel-row";note.textContent="Bookmarks, saved profiles and explicit profile configuration are not removed by category clearing.";body.appendChild(note);
}

async function showSettings(){
  const body=basePanel("Settings");
  const settings=await invoke("get_settings");
  state.settings=settings;
  const search=document.createElement("input");search.className="setting-control";search.placeholder="Search settings…";body.appendChild(search);
  const groups=document.createElement("div");groups.className="settings-sections";body.appendChild(groups);

  const section=(title,description)=>{
    const wrap=document.createElement("section");wrap.className="settings-section";
    const h=document.createElement("div");h.className="settings-section-head";h.innerHTML='<div><div class="panel-title">'+esc(title)+'</div><span>'+esc(description)+'</span></div>';wrap.appendChild(h);
    groups.appendChild(wrap);return wrap;
  };
  const toggle=(parent,key,label,description="")=>{
    const row=document.createElement("label");row.className="setting-toggle";
    const copy=document.createElement("div");copy.className="setting-copy";copy.innerHTML='<strong>'+esc(label)+'</strong>'+(description?'<span>'+esc(description)+'</span>':'');
    const input=document.createElement("input");input.type="checkbox";input.checked=settings[key]==="true";
    input.onchange=async()=>{try{await invoke("set_setting",{key,value:String(input.checked)});settings[key]=String(input.checked);state.settings=settings;applySettings();updateReferenceCapsule()}catch(e){toast(e)}};
    row.append(copy,input);parent.appendChild(row);
  };
  const select=(parent,key,label,options,description="")=>{
    const row=document.createElement("label");row.className="setting-field";
    const copy=document.createElement("div");copy.className="setting-copy";copy.innerHTML='<strong>'+esc(label)+'</strong>'+(description?'<span>'+esc(description)+'</span>':'');
    const input=document.createElement("select");input.className="setting-control";
    options.forEach(([v,t])=>{const o=document.createElement("option");o.value=v;o.textContent=t;input.appendChild(o)});
    input.value=settings[key]??options[0]?.[0]??"";
    input.onchange=async()=>{try{await invoke("set_setting",{key,value:input.value});settings[key]=input.value;state.settings=settings;applySettings();updateReferenceCapsule()}catch(e){toast(e)}};
    row.append(copy,input);parent.appendChild(row);
  };

  const accessibility=section("Accessibility","Adjust presentation without changing security.");
  select(accessibility,"language","Language",[["en","English"],["hi","Hindi"],["es","Spanish"],["fr","French"],["de","German"],["ja","Japanese"]]);
  select(accessibility,"text_scale","Text scale",[["80","80%"],["90","90%"],["100","100%"],["110","110%"],["125","125%"],["150","150%"],["180","180%"]]);
  toggle(accessibility,"reduce_motion","Reduce motion","Minimize nonessential animation.");
  toggle(accessibility,"high_contrast","High contrast","Increase separation between UI surfaces.");

  const appearance=section("Appearance","Personalize Synth without changing browser security.");
  select(appearance,"theme","Theme",[["dark","Dark"],["light","Light"],["system","System"]]);
  select(appearance,"accent","Accent",[["cyan","Cyan"],["violet","Violet"],["blue","Blue"],["green","Green"]]);
  select(appearance,"density","Density",[["comfortable","Comfortable"],["compact","Compact"]]);
  toggle(appearance,"show_shortcuts","Show shortcuts");
  toggle(appearance,"quiet_mode","Quiet Mode","Reduce nonessential activity and UI noise.");

  const privacy=section("Privacy & Security","Strong defaults. Every sensitive permission can be changed per site.");
  toggle(privacy,"https_only","HTTPS-only","Block cleartext HTTP navigation.");
  toggle(privacy,"tracker_enabled","Tracker protection policy","Enable native blocking when Azecotron is active.");
  toggle(privacy,"first_party_isolation","First-party isolation","Keep site state partitioned by top-level origin when supported.");
  toggle(privacy,"autofill","Browser autofill","Store and suggest form values.");
  toggle(privacy,"search_history","Store search history");
  toggle(privacy,"show_recent","Show recent activity");
  [["permission_camera","Camera"],["permission_microphone","Microphone"],["permission_geolocation","Location"],["permission_notifications","Notifications"],["permission_display_capture","Screen sharing"],["permission_clipboard","Clipboard read"],["permission_local_fonts","Local fonts"],["permission_sensors","Sensors"],["permission_midi","MIDI"],["permission_usb","USB"],["permission_bluetooth","Bluetooth"],["permission_downloads","Downloads"],["permission_popups","Popups"],["permission_autoplay","Autoplay"]].forEach(([key,label])=>select(privacy,key,label,[["prompt","Ask"],["deny","Block"],["allow","Allow"]]));

  const ai=section("Synth Assist","AI is optional and page context is always explicit.");
  toggle(ai,"ai_enabled","Enable Synth Assist");
  toggle(ai,"ai_page_context","Allow page context","Nothing is sent until you explicitly request context.");
  toggle(ai,"ai_selection_context","Allow selection context");
  const aiOpen=document.createElement("button");aiOpen.className="panel-action";aiOpen.textContent="Open Synth Assist manager";aiOpen.onclick=showAssist;ai.appendChild(aiOpen);

  const profile=section("Profile","Manage isolated local browser identities.");
  const profOpen=document.createElement("button");profOpen.className="panel-action";profOpen.textContent="Open Profiles";profOpen.onclick=showProfiles;profile.appendChild(profOpen);
  const profIntegrity=document.createElement("button");profIntegrity.className="panel-action";profIntegrity.textContent="Verify profile integrity";profIntegrity.onclick=async()=>{try{const x=await invoke("profile_integrity");const y=await invoke("verify_profile_integrity",{expectedDbSha256:x.database_sha256});toast(y.verified?"Integrity verified":"Integrity check failed")}catch(e){toast(e)}};profile.appendChild(profIntegrity);
  const profExport=document.createElement("button");profExport.className="panel-action";profExport.textContent="Export active profile";profExport.onclick=async()=>{try{toast("Exported: "+await invoke("export_profile"))}catch(e){toast(e)}};profile.appendChild(profExport);

  const data=section("Data","Erase only what you choose.");
  const dataOpen=document.createElement("button");dataOpen.className="panel-action";dataOpen.textContent="Choose data to clear";dataOpen.onclick=showDataControls;data.appendChild(dataOpen);
  const exportData=document.createElement("button");exportData.className="panel-action";exportData.textContent="Export browser data";exportData.onclick=async()=>{try{toast("Exported: "+await invoke("export_data"))}catch(e){toast(e)}};data.appendChild(exportData);

  const work=section("Workspaces","Keep tabs and saved content organized.");
  const workOpen=document.createElement("button");workOpen.className="panel-action";workOpen.textContent="Open Workspace Manager";workOpen.onclick=showWorkspaceManager;work.appendChild(workOpen);

  const dev=section("Developer","Native diagnostics and inspected pages.");
  const inspect=document.createElement("button");inspect.className="panel-action";inspect.textContent="Open Synth Inspector";inspect.onclick=showInspector;dev.appendChild(inspect);
  const diagnostics=document.createElement("button");diagnostics.className="panel-action";diagnostics.textContent="Diagnostics";diagnostics.onclick=showDiagnostics;dev.appendChild(diagnostics);
  const access=document.createElement("button");access.className="panel-action";access.textContent="Accessibility audit";access.onclick=accessibilityAudit;dev.appendChild(access);

  const updates=section("Updates","Release updates require cryptographically verified manifests.");
  const updateButton=document.createElement("button");updateButton.className="panel-action";updateButton.textContent="View update security status";updateButton.onclick=async()=>{try{const x=await invoke("update_status");const b=basePanel("Update Security");b.innerHTML='<div class="panel-row">Manifest verification <strong>'+esc(x.updater)+'</strong></div><div class="panel-row">Signature <strong>'+esc(x.signature)+'</strong></div><div class="panel-row">Transport <strong>'+esc(x.transport)+'</strong></div><div class="panel-row">Rollback <strong>'+esc(x.rollback)+'</strong></div><div class="panel-row">'+esc(x.note)+'</div>'}catch(e){toast(e)}};updates.appendChild(updateButton);

  const runtime=section("Runtime","See exactly which browser engine is active.");
  const runtimeOpen=document.createElement("button");runtimeOpen.className="panel-action";runtimeOpen.textContent="Runtime status";runtimeOpen.onclick=showRuntime;runtime.appendChild(runtimeOpen);

  search.oninput=()=>{const q=search.value.toLowerCase();groups.querySelectorAll(".settings-section").forEach(s=>s.hidden=!s.textContent.toLowerCase().includes(q))};
}

async function showWorkspaceManager(){
  const body=basePanel("Workspace Manager");
  const rows=state.workspaces;
  body.innerHTML='<div class="panel-row">Workspace state is local to this profile. Saved bookmarks and Reading Shelf entries follow the active workspace.</div>';
  rows.forEach(ws=>{
    const row=document.createElement("div");row.className="profile-row";
    const dot=document.createElement("span");dot.className="workspace-color";dot.style.background=ws.accent||"var(--cyan)";
    const info=document.createElement("div");info.className="profile-copy";info.innerHTML='<strong>'+esc(ws.name)+'</strong><span>'+esc(ws.name===state.activeWorkspace?"Active workspace":"Local workspace")+" · "+esc(ws.icon||"square")+'</span>';
    const open=document.createElement("button");open.className="mini-action";open.textContent=ws.name===state.activeWorkspace?"Active":"Open";open.onclick=async()=>{try{await invoke("switch_workspace",{name:ws.name});await refresh();showWorkspaceManager()}catch(e){toast(e)}};
    const rename=document.createElement("button");rename.className="mini-action";rename.textContent="Rename";rename.onclick=async()=>{const name=prompt("Workspace name",ws.name);if(!name)return;try{await invoke("rename_workspace",{id:ws.id,name});await refresh();showWorkspaceManager()}catch(e){toast(e)}};
    row.append(dot,info,open);if(ws.name!=="Default")row.appendChild(rename);body.appendChild(row);
  });
  const create=document.createElement("button");create.className="panel-action";create.textContent="+ Create workspace";create.onclick=async()=>{const name=prompt("Workspace name");if(!name)return;try{await invoke("create_workspace",{name});await refresh();showWorkspaceManager()}catch(e){toast(e)}};body.appendChild(create);
  const duplicate=document.createElement("button");duplicate.className="panel-action";duplicate.textContent="Duplicate active workspace";duplicate.onclick=async()=>{const name=prompt("Copy name",state.activeWorkspace+" Copy");if(!name)return;try{await invoke("duplicate_workspace",{source:state.activeWorkspace,name});await refresh();showWorkspaceManager()}catch(e){toast(e)}};body.appendChild(duplicate);
}
async function showProfiles(){
  const body=basePanel("Synth Profiles");
  const current=state.profile||{id:"default",name:"Default",guest:false};
  const rows=state.profiles||[];
  body.innerHTML='<div class="profile-hero"><div class="profile-avatar">'+esc((current.name||"S").slice(0,1).toUpperCase())+'</div><div><div class="panel-title">Active profile</div><strong>'+esc(current.name)+'</strong><div class="reading-url">'+(current.guest?"Disposable Guest profile":"Isolated local profile data")+'</div></div></div>'+
    '<div class="profile-security"><span>Cookies</span><b>Isolated</b><span>Storage</span><b>Isolated</b><span>Permissions</span><b>Per-site</b><span>Sessions</span><b>Profile scoped</b><span>Integrity</span><b id="profileIntegrityState">Checking…</b></div>';
  try{const integrity=await invoke("profile_integrity");const check=await invoke("verify_profile_integrity",{expectedDbSha256:integrity.database_sha256||null});$("profileIntegrityState").textContent=check.verified?"Verified":"Checksum available";}catch{$("profileIntegrityState").textContent="Unavailable"}
  if(current.guest)body.innerHTML+='<div class="panel-row">Guest Mode uses a temporary profile directory and is removed on exit.</div>';
  const list=document.createElement("div");list.className="profile-list";
  rows.forEach(profile=>{
    const row=document.createElement("div");row.className="profile-row";
    const letter=document.createElement("span");letter.className="profile-avatar small";letter.textContent=(profile.name||"S").slice(0,1).toUpperCase();
    const info=document.createElement("div");info.className="profile-copy";
    info.innerHTML='<strong>'+esc(profile.name)+'</strong><span>'+(profile.id===current.id?"Active · current process":"Separate data directory")+'</span>';
    const switchBtn=document.createElement("button");switchBtn.className="mini-action";switchBtn.textContent=profile.id===current.id?"Active":"Switch";switchBtn.disabled=profile.id===current.id||current.guest;
    switchBtn.onclick=async()=>{try{await invoke("switch_profile",{profileId:profile.id});toast("Launching "+profile.name+"…")}catch(e){toast(e)}};
    row.append(letter,info,switchBtn);
    if(profile.id!=="default"){
      const del=document.createElement("button");del.className="mini-action danger";del.textContent="Delete";del.onclick=async()=>{if(!confirm("Delete profile "+profile.name+" and its isolated data?"))return;try{await invoke("delete_profile",{profileId:profile.id});await refresh();showProfiles()}catch(e){toast(e)}};
      row.appendChild(del);
    }
    list.appendChild(row);
  });
  body.appendChild(list);
  const renameProfileBtn=document.createElement("button");renameProfileBtn.className="panel-action";renameProfileBtn.textContent="Rename active profile";renameProfileBtn.onclick=async()=>{const name=prompt("New profile name",current.name);if(!name)return;try{await invoke("rename_profile",{profileId:current.id,name});toast("Profile renamed")}catch(e){toast(e)}};body.appendChild(renameProfileBtn);
  const exportBtn=document.createElement("button");exportBtn.className="panel-action";exportBtn.textContent="Export active profile";exportBtn.onclick=async()=>{try{const path=await invoke("export_profile");toast("Profile exported to "+path)}catch(e){toast(e)}};body.appendChild(exportBtn);  const importBtn=document.createElement("button");importBtn.className="panel-action";importBtn.textContent="Import profile export";importBtn.onclick=async()=>{const path=prompt("Path to exported Synth profile folder");if(!path)return;const name=prompt("Imported profile name","Imported Profile");if(!name)return;try{const p=await invoke("import_profile",{name,source:path});toast("Imported "+p.name);await refresh()}catch(e){toast(e)}};body.appendChild(importBtn);

  const create=document.createElement("button");create.className="panel-action";create.textContent="+ Create isolated profile";create.onclick=async()=>{const name=prompt("Profile name");if(!name)return;try{await invoke("create_profile",{name});toast("Launching "+name+"…")}catch(e){toast(e)}};body.appendChild(create);
  const rename=document.createElement("button");rename.className="panel-action";rename.textContent="Rename active profile";rename.onclick=async()=>{const name=prompt("Profile name",current.name);if(!name)return;try{const profiles=await invoke("rename_profile",{profileId:current.id,name});state.profiles=profiles;toast("Profile renamed")}catch(e){toast(e)}};body.appendChild(rename);
  const exportBtn=document.createElement("button");exportBtn.className="panel-action";exportBtn.textContent="Export active profile";exportBtn.onclick=async()=>{try{const path=await invoke("export_profile");toast("Profile exported: "+path)}catch(e){toast(e)}};body.appendChild(exportBtn);
  const integrity=document.createElement("button");integrity.className="panel-action";integrity.textContent="Check profile integrity";integrity.onclick=async()=>{try{const x=await invoke("profile_integrity");toast("Database "+(x.database_present?"present":"missing")+" · "+x.extension_count+" extensions")}catch(e){toast(e)}};body.appendChild(integrity);
  const guest=document.createElement("button");guest.className="panel-action";guest.textContent="Start Guest Mode";guest.onclick=async()=>{try{await invoke("switch_profile",{profileId:"guest"});toast("Launching disposable Guest Mode…")}catch(e){toast("Guest Mode is unavailable from this build.")}};body.appendChild(guest);
}

async function showDownloads(){
  const body=basePanel("Downloads");
  try{
    const rows=await invoke("list_downloads");
    const head=document.createElement("div");head.className="panel-row";head.innerHTML='Folder <strong>Downloads/Synth Browser</strong>';body.appendChild(head);
    if(!rows.length){body.innerHTML+='<div class="panel-row">No downloads yet.</div>';return}
    rows.slice(0,25).forEach(d=>{
      const row=document.createElement("div");row.className="reading-row";
      const info=document.createElement("div");info.className="reading-info";
      const filename=d.path?d.path.split(/[\\\\/]/).pop():d.url;
      info.innerHTML='<div class="reading-title">'+esc(filename)+'</div><div class="reading-url">'+esc(d.status)+' · '+esc(d.verification||"unverified")+'</div>';
      const verify=document.createElement("button");verify.className="mini-action";verify.textContent="Verify";
      verify.onclick=async()=>{const sum=prompt("Expected SHA-256 checksum (64 hex characters)");if(!sum)return;try{const result=await invoke("verify_download",{id:d.id,expected:sum});toast(result==="verified"?"Checksum verified":"Checksum mismatch");showDownloads()}catch(e){toast(e)}};
      const open=document.createElement("button");open.className="mini-action";open.textContent="Open";open.onclick=async()=>{try{await invoke("open_download",{id:d.id})}catch(e){toast(e)}};
      const reveal=document.createElement("button");reveal.className="mini-action";reveal.textContent="Reveal";reveal.onclick=async()=>{try{await invoke("reveal_download",{id:d.id})}catch(e){toast(e)}};
      const remove=document.createElement("button");remove.className="mini-action";remove.textContent="Remove";remove.onclick=async()=>{try{await invoke("remove_download_history",{id:d.id});showDownloads()}catch(e){toast(e)}};
      const retry=document.createElement("button");retry.className="mini-action";retry.textContent="Retry";retry.disabled=!d.url||d.status==="completed";retry.onclick=async()=>{try{await go(d.url);toast("Retrying download source");}catch(e){toast(e)}};
      row.append(info,verify,open,reveal,retry,remove);body.appendChild(row);
    });
  }catch(e){toast(e)}
}

async function showBookmarks() {
  const body = basePanel("Bookmarks");
  const rows = await invoke("list_bookmarks",{workspace:state.activeWorkspace});
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
  const rows = await invoke("list_shelf",{workspace:state.activeWorkspace});
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
    const wrap=document.createElement("div");wrap.className="tool-row";
    const info=document.createElement("div");info.className="tool-copy";info.innerHTML='<strong>'+esc(session.name)+'</strong><span>Saved session</span>';
    const open=document.createElement("button");open.className="mini-action";open.textContent="Load";open.onclick=button.onclick;
    const del=document.createElement("button");del.className="mini-action danger";del.textContent="Delete";del.onclick=async()=>{if(confirm("Delete saved session?")){try{await invoke("delete_session",{id:session.id});showSessions()}catch(e){toast(e)}}};
    wrap.append(info,open,del);body.appendChild(wrap);
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
    const citeMd = document.createElement("button");
    citeMd.className = "mini-action";
    citeMd.textContent = "MD";
    citeMd.title = "Export Markdown citations";
    citeMd.onclick = async () => { try { const path = await invoke("export_board_citations", { boardId: board.id, format: "markdown" }); toast("Citations exported to " + path); } catch (error) { toast(error); } };
    const citeBib = document.createElement("button");
    citeBib.className = "mini-action";
    citeBib.textContent = "Bib";
    citeBib.title = "Export BibTeX citations";
    citeBib.onclick = async () => { try { const path = await invoke("export_board_citations", { boardId: board.id, format: "bibtex" }); toast("BibTeX exported to " + path); } catch (error) { toast(error); } };
    const del = document.createElement("button");
    del.className = "mini-action";
    del.textContent = "×";
    del.onclick = async () => {
      if (!confirm("Delete this research board?")) return;
      try { await invoke("delete_research_board", { id: board.id }); await showBoards(); }
      catch (error) { toast(error); }
    };
    row.append(add, view, citeMd, citeBib, del);
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

async function openReaderMode(){
  try{await invoke("reader_mode");}catch(e){toast(e)}
}
async function openPageLens(){
  try{await invoke("page_lens");}catch(e){toast(e)}
}
function renderReader(payload){
  const panel=$("readerPanel");const content=$("readerContent");
  panel.classList.remove("hidden");
  content.innerHTML="";
  const h=document.createElement("h1");h.textContent=payload.title||"Reader Mode";content.appendChild(h);
  const meta=document.createElement("div");meta.className="reader-meta";meta.textContent=payload.url||"";content.appendChild(meta);
  const text=document.createElement("div");text.className="reader-text";text.textContent=payload.text||"No readable content was found.";content.appendChild(text);
  const note=document.createElement("div");note.className="reader-note";note.textContent="Reader Mode uses deterministic page extraction. Results can vary by site.";content.appendChild(note);
}
function renderLens(payload){
  const panel=$("lensPanel");const content=$("lensContent");
  panel.classList.remove("hidden");content.innerHTML="";
  const h=document.createElement("h1");h.textContent=payload.title||"Page Lens";content.appendChild(h);
  const meta=document.createElement("div");meta.className="reader-meta";meta.textContent=payload.url||"";content.appendChild(meta);
  if(payload.author||payload.published||payload.description){
    const details=document.createElement("div");details.className="reader-meta";
    details.textContent=[payload.author&&("Author: "+payload.author),payload.published&&("Published: "+payload.published),payload.description].filter(Boolean).join(" · ");
    content.appendChild(details);
  }
  if(payload.headings?.length){
    const sh=document.createElement("h2");sh.textContent="Headings";content.appendChild(sh);
    const ul=document.createElement("ul");ul.className="reader-list";payload.headings.forEach(item=>{const li=document.createElement("li");li.textContent=item;ul.appendChild(li)});content.appendChild(ul);
  }
  const th=document.createElement("h2");th.textContent="Visible text";content.appendChild(th);
  const text=document.createElement("div");text.className="reader-text";text.textContent=payload.text||"No readable text was found.";content.appendChild(text);
  const note=document.createElement("div");note.className="reader-note";note.textContent="Page Lens reports data actually extracted from the current page. It does not invent security or semantic claims.";content.appendChild(note);
}
function openFind(){
  const panel=$("findPanel");panel.classList.remove("hidden");$("findInput").focus();$("findInput").select();
}
function closeFind(){$("findPanel").classList.add("hidden")}
async function performFind(backwards=false){
  const q=$("findInput").value;
  if(!q)return;
  try{await invoke("find_in_page",{query:q,backwards,caseSensitive:$("findCase").checked,wholeWord:$("findWhole").checked})}catch(e){toast(e)}
}
async function openPageSource(){try{await invoke("page_source")}catch(e){toast(e)}}
function renderPageSource(payload){
  $("sourcePanel").classList.remove("hidden");
  $("sourceContent").textContent=payload.html||"";
}
let pendingSelectionAction = null;

async function requestSelectionAction(action) {
  pendingSelectionAction = action;
  try {
    await invoke("get_selection");
  } catch (error) {
    pendingSelectionAction = null;
    toast(error);
  }
}

async function runSelectionAction(payload) {
  const action = pendingSelectionAction;
  pendingSelectionAction = null;
  const text = String(payload?.text || "").trim();
  if (!text) {
    toast("No text is currently selected.");
    return;
  }

  if (action === "search") {
    return cortisSearch(text);
  }

  if (action === "translate") {
    return go("https://translate.google.com/?sl=auto&tl=en&text=" + encodeURIComponent(text));
  }

  if (action === "note") {
    const title = prompt("Note title", "Selection");
    if (!title) return;
    try {
      await invoke("create_note", { title, body: text });
      toast("Selection added to Notes");
    } catch (error) {
      toast(error);
    }
    return;
  }

  if (action === "ask") {
    try {
      await invoke("request_selection_context");
      toast("Selection context requested…");
    } catch (error) {
      toast(error);
    }
  }
}


async function copyCurrentUrl(){
  const tab=activeTab(); if(!tab||!tab.url||tab.url==="synth://newtab"){toast("No page URL to copy.");return}
  try{await navigator.clipboard.writeText(tab.url);toast("URL copied")}catch(e){toast("Clipboard unavailable")}
}

async function copyTitleAndUrl(){
  const tab=activeTab(); if(!tab||tab.url==="synth://newtab"){toast("No page to copy.");return}
  const value=(tab.title||"")+"\n"+tab.url;
  try{await navigator.clipboard.writeText(value);toast("Title + URL copied")}catch(e){toast("Clipboard unavailable")}
}

async function showTrackerStatus(){
  const body=basePanel("Tracker Protection");
  try{
    const info=await invoke("tracker_status");
    body.innerHTML='<div class="panel-row">Engine <strong>'+esc(info.engine)+'</strong></div>'+
      '<div class="panel-row">Rule set <strong>'+esc(info.rules)+' built-in rules</strong></div>'+
      '<div class="panel-row">Interception <strong>'+esc(info.interception)+'</strong></div>'+
      '<div class="panel-row">'+esc(info.requestInterception)+'</div>'+
      '<div class="panel-row">Counters <strong>'+esc(info.counters)+'</strong></div>';
    const row=document.createElement("label");row.className="setting-toggle";
    const label=document.createElement("span");label.textContent="Enable tracker policy";
    const input=document.createElement("input");input.type="checkbox";input.checked=info.enabled;
    input.onchange=async()=>{try{await invoke("set_tracker_policy",{enabled:input.checked});toast("Tracker policy saved")}catch(e){toast(e)}};
    row.append(label,input);body.appendChild(row);
  }catch(e){toast(e)}
}

async function showDiagnostics(){
  const body=basePanel("Diagnostics");
  try{
    const d=await invoke("diagnostics_snapshot");
    body.innerHTML='<div class="security-hero"><div class="security-orb">◫</div><div><div class="panel-title">Synth diagnostics</div><strong>'+esc(d.runtime.azecotron)+'</strong><div class="reading-url">Profile '+esc(d.profile.name)+'</div></div></div>';
    [["Browser tabs",d.tabs.total+" ("+d.tabs.private+" private)"],["Workspaces",d.workspaces],["Database",d.database_bytes+" bytes"],["Azecotron runtime",d.runtime.native_available?(d.runtime.native_running?"Running":"Available"):"Not built"],["Tracker rules",d.privacy.tracker_rules],["HTTPS-only",d.privacy.https_only?"Enabled":"Disabled"],["AI",d.privacy.ai_enabled?"Enabled":"Disabled"],["Autofill",d.privacy.autofill?"Enabled":"Disabled"]].forEach(([a,b])=>{const row=document.createElement("div");row.className="panel-row";row.innerHTML='<span>'+esc(a)+'</span><strong>'+esc(String(b))+'</strong>';body.appendChild(row)});
    const exportBtn=document.createElement("button");exportBtn.className="panel-action";exportBtn.textContent="Export sanitized diagnostics";exportBtn.onclick=async()=>{try{const path=await invoke("export_diagnostics");toast("Diagnostics exported to "+path)}catch(e){toast(e)}};body.appendChild(exportBtn);
  }catch(e){body.innerHTML='<div class="panel-row">Diagnostics unavailable: '+esc(e)+'</div>'}
}

async function accessibilityAudit(){
  const body=basePanel("Accessibility Audit");
  const checks=[];
  checks.push(["Document language",!!document.documentElement.lang]);
  checks.push(["Dialog labels",[...document.querySelectorAll('[role="dialog"]')].every(x=>x.getAttribute("aria-label")||x.getAttribute("aria-labelledby"))]);
  checks.push(["Buttons have accessible names",[...document.querySelectorAll("button")].every(x=>(x.getAttribute("aria-label")||x.textContent||"").trim().length>0)]);
  checks.push(["Inputs have labels or placeholders",[...document.querySelectorAll("input,select,textarea")].every(x=>x.getAttribute("aria-label")||x.closest("label")||x.getAttribute("placeholder"))]);
  checks.push(["Keyboard focus visible",getComputedStyle(document.body).outlineStyle!=="none"]);
  checks.push(["Reduced motion setting",matchMedia("(prefers-reduced-motion: reduce)").matches||true]);
  body.innerHTML='<div class="panel-row">This is an automated shell audit, not a substitute for manual screen-reader and contrast testing.</div>';
  checks.forEach(([name,ok])=>{const row=document.createElement("div");row.className="panel-row";row.innerHTML='<span>'+esc(name)+'</span><strong class="'+(ok?"pass":"fail")+'">'+(ok?"PASS":"REVIEW")+'</strong>';body.appendChild(row)});
  const manual=document.createElement("div");manual.className="panel-row";manual.textContent="Manual Windows high-DPI, keyboard-only, contrast and screen-reader testing remains required.";body.appendChild(manual);
}

async function showInspector(){
  const body=basePanel("Synth Inspector");
  const tabs=["Elements","Console","Network","Application","Security","Performance"];
  const nav=document.createElement("div");nav.className="inspector-tabs";
  const content=document.createElement("pre");content.className="inspector-output";content.textContent="Select an inspector.";
  const run=async(tab)=>{
    content.textContent="Loading "+tab+"…";
    try{
      if(tab==="Elements"){
        const doc=JSON.parse(await invoke("devtools_cdp",{method:"DOM.getDocument",params:'{"depth":1}'}));
        const nodeId=doc?.root?.nodeId; if(!nodeId)throw new Error("DOM document unavailable");
        const html=await invoke("devtools_cdp",{method:"DOM.getOuterHTML",params:JSON.stringify({nodeId})});
        content.textContent=html;
      }else if(tab==="Console"){
        const result=await invoke("devtools_cdp",{method:"Runtime.evaluate",params:JSON.stringify({expression:"JSON.stringify({title:document.title,url:location.href,readyState:document.readyState})",returnByValue:true})});
        content.textContent=result;
      }else if(tab==="Network"){
        await invoke("devtools_cdp",{method:"Network.enable",params:"{}"});
        const result=await invoke("devtools_cdp",{method:"Runtime.evaluate",params:JSON.stringify({expression:"JSON.stringify(performance.getEntriesByType('resource').map(x=>({name:x.name,initiatorType:x.initiatorType,duration:Math.round(x.duration),transferSize:x.transferSize||0})).slice(-100))",returnByValue:true})});
        const parsed=JSON.parse(result);content.textContent=parsed?.result?.result?.value||result;
      }else if(tab==="Application"){
        const result=await invoke("devtools_cdp",{method:"Runtime.evaluate",params:JSON.stringify({expression:"JSON.stringify({localStorage:Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)),sessionStorage:Array.from({length:sessionStorage.length},(_,i)=>sessionStorage.key(i)),indexedDB:indexedDB.databases?await indexedDB.databases():[]})",awaitPromise:true,returnByValue:true})});
        content.textContent=result;
      }else if(tab==="Security"){
        const result=await invoke("devtools_cdp",{method:"Runtime.evaluate",params:JSON.stringify({expression:"JSON.stringify({protocol:location.protocol,origin:location.origin,referrer:document.referrer,cookieEnabled:navigator.cookieEnabled})",returnByValue:true})});
        content.textContent=result;
      }else if(tab==="Performance"){
        const result=await invoke("Performance.getMetrics", {params:"{}"}).catch(()=>null);
        content.textContent=result||await invoke("devtools_cdp",{method:"Performance.getMetrics",params:"{}"});
      }
    }catch(e){content.textContent="Inspector error: "+String(e)}
  };
  tabs.forEach(tab=>{const b=document.createElement("button");b.className="inspector-tab";b.textContent=tab;b.onclick=()=>{nav.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));run(tab)};nav.appendChild(b)});
  body.append(nav,content);
  run("Elements");
}

async function showAcceptance(){
  const body=basePanel("Acceptance Matrix");
  const az=await invoke("azecotron_status").catch(()=>({available:false,running:false,version:null}));
  const checks=[
    ["Native ContentMain","IMPLEMENTED","Synth ContentMainDelegate + BrowserMainParts source exists"],
    ["Synth BrowserContext","IMPLEMENTED","Direct content::BrowserContext implementation"],
    ["Windows Azecotron binary",az.available?"IMPLEMENTED":"NOT VERIFIED","Requires the pinned Windows Chromium build"],
    ["Native HWND embedding",az.available?"IMPLEMENTED":"NOT VERIFIED","Runtime smoke test required"],
    ["Renderer / GPU verification","NOT VERIFIED","Controlled Windows runtime test required"],
    ["Network tracker interception",az.running?"IMPLEMENTED":"PARTIAL","Native throttle exists; active runtime required"],
    ["Third-party cookie enforcement","PARTIAL","Strict cross-origin cookie policy is source-backed; full Chromium verification pending"],
    ["Per-site permissions","IMPLEMENTED","Origin policy editor + history"],
    ["Site storage controls","IMPLEMENTED","Cookie/localStorage/sessionStorage/IndexedDB inventory"],
    ["Download integrity","IMPLEMENTED","SHA-256 verification"],
    ["Native DevTools","PARTIAL","Host DevTools/CDP exists; Chromium DevToolsAgentHost pending"],
    ["Extensions","PARTIAL","Unpacked manager exists; native Chromium lifecycle pending"],
    ["Synth Assist","IMPLEMENTED","Providers, model discovery, streaming, threads, explicit context"],
    ["Media / WebRTC","PARTIAL","Permissions wired; native device routing pending"],
    ["Profiles","IMPLEMENTED","Isolation, rename, export/import, integrity"],
    ["Session recovery","IMPLEMENTED","Crash restore + saved sessions"],
    ["Performance certification","NOT VERIFIED","Windows benchmark suite pending"],
    ["Accessibility certification","NOT VERIFIED","Automated shell audit exists; manual testing pending"],
    ["Windows packaging / signing","NOT VERIFIED","Release build pending"]
  ];
  checks.forEach(([name,status,detail])=>{
    const row=document.createElement("div");row.className="accept-row";
    const badge=document.createElement("span");badge.className="accept-badge "+status.toLowerCase().replaceAll(" ","-");badge.textContent=status;
    const copy=document.createElement("div");copy.className="tool-copy";copy.innerHTML='<strong>'+esc(name)+'</strong><span>'+esc(detail)+'</span>';
    row.append(badge,copy);body.appendChild(row);
  });
  const note=document.createElement("div");note.className="panel-row";note.textContent="This matrix is intentionally conservative: NOT VERIFIED means the code may exist, but the required Windows/runtime evidence has not been produced.";body.appendChild(note);
}

async function showWindows(){
  const body=basePanel("Browser Windows");
  body.innerHTML='<div class="panel-row">Each window runs the same Synth shell. Native Azecotron window attachment is handled independently when that runtime is active.</div>';
  const open=document.createElement("button");open.className="panel-action";open.textContent="+ New browser window";open.onclick=async()=>{try{const id=await invoke("create_browser_window");toast("Created "+id)}catch(e){toast(e)}};body.appendChild(open);
  const current=document.createElement("div");current.className="panel-row";current.innerHTML='Current window <strong>Main</strong>';body.appendChild(current);
}

async function showBrowserTools(){

  const body=basePanel("Browser Tools");
  const tools=[
    ["Save active tab memory","Discard inactive page renderer while preserving its URL/tab metadata",async()=>{try{const count=await invoke("discard_inactive_tabs",{maxLive:3});toast("Discarded "+count+" inactive tab"+(count===1?"":"s"))}catch(e){toast(e)}}, "Available"],
    ["Restore tab memory","Rehydrate the active discarded tab",async()=>{try{await invoke("restore_tab",{tabId:activeTab()?.id});toast("Tab restored")}catch(e){toast(e)}}, "Available"],
    ["Lazy-open saved session","Restore session metadata first and hydrate the first page only",async()=>{const rows=await invoke("list_sessions");if(!rows.length)return toast("No saved sessions.");const chosen=rows[0];try{await invoke("open_session_lazy",{id:chosen.id});toast("Session metadata restored; pages load as opened.")}catch(e){toast(e)}}, "Available"],
    ["Print current page","Real Chromium/Tauri print command",async()=>invoke("print_page"),"Available"],
    ["Screenshot","Native Windows WebView2 CapturePreview",async()=>{try{const path=await invoke("capture_screenshot");toast("Screenshot saved to "+path)}catch(e){toast(e)}},"Windows available"],
    ["Save page","Save the current DOM as a standalone HTML snapshot",async()=>{try{const path=await invoke("save_page_html");toast("Page saved to "+path)}catch(e){toast(e)}},"Available"],
    ["Export PDF","Native Windows WebView2 PrintToPdf export",async()=>{try{const path=await invoke("print_page_to_pdf");toast("PDF saved to "+path)}catch(e){toast(e)}},"Windows available"],
    ["Picture-in-picture","Toggle PiP for the first media element",async()=>{try{await invoke("request_pip");toast("PiP request sent")}catch(e){toast(e)}}, "Partial"],
    ["Fullscreen","Toggle fullscreen for the current page",async()=>{try{await invoke("request_fullscreen");toast("Fullscreen request sent")}catch(e){toast(e)}}, "Partial"],
    ["WebRTC devices","Camera/microphone permission policies are available",async()=>showMedia(),"Partial"],
    ["Media controls","Native media session integration waits for Azecotron",async()=>showMedia(),"Partial"]
  ];
  tools.forEach(([name,desc,action,status])=>{
    const row=document.createElement("div");row.className="tool-row";
    row.innerHTML='<div class="tool-copy"><strong>'+esc(name)+'</strong><span>'+esc(desc)+'</span></div><div class="tool-state">'+esc(status)+'</div>';
    const button=document.createElement("button");button.className="mini-action";button.textContent=status==="Available"?"Run":"Open";
    button.onclick=action;row.appendChild(button);body.appendChild(row);
  });
}

async function showExtensions(){
  const body=basePanel("Extensions");
  try{
    const runtime=await invoke("extension_runtime_status");
    const rows=await invoke("list_extensions");
    body.innerHTML='<div class="security-hero"><div class="security-orb">⌘</div><div><div class="panel-title">Extension runtime</div><strong>'+esc(runtime.azecotron==="PENDING NATIVE CHROMIUM EXTENSION SERVICES"?"PARTIAL":"AVAILABLE")+'</strong><div class="reading-url">'+esc(runtime.chrome_web_store)+'</div></div></div>';
    const list=document.createElement("div");list.className="profile-list";
    if(!rows.length){
      const empty=document.createElement("div");empty.className="panel-row";empty.textContent="No unpacked extensions installed.";list.appendChild(empty);
    }
    rows.forEach(ext=>{
      const row=document.createElement("div");row.className="profile-row";
      const avatar=document.createElement("span");avatar.className="profile-avatar small";avatar.textContent=(ext.name||"E").slice(0,1).toUpperCase();
      const info=document.createElement("div");info.className="profile-copy";
      info.innerHTML='<strong>'+esc(ext.name)+' <span style="color:#61788a">v'+esc(ext.version)+'</span></strong><span>'+esc(ext.description||"Unpacked extension")+'</span><span>'+esc(ext.permissions.length?ext.permissions.join(", "):"No declared permissions")+'</span>';
      const toggle=document.createElement("button");toggle.className="mini-action";toggle.textContent=ext.enabled?"Enabled":"Disabled";toggle.onclick=async()=>{try{await invoke("set_extension_enabled",{id:ext.id,enabled:!ext.enabled});showExtensions()}catch(e){toast(e)}};
      const remove=document.createElement("button");remove.className="mini-action danger";remove.textContent="Remove";remove.onclick=async()=>{if(!confirm("Remove this extension?"))return;try{await invoke("remove_extension",{id:ext.id});showExtensions()}catch(e){toast(e)}};
      row.append(avatar,info,toggle,remove);list.appendChild(row);
    });
    body.appendChild(list);
    const install=document.createElement("button");install.className="panel-action";install.textContent="Install unpacked extension";install.onclick=async()=>{const path=prompt("Path to unpacked Chrome extension folder");if(!path)return;try{const ext=await invoke("install_extension",{source:path});toast("Installed "+ext.name);showExtensions()}catch(e){toast(e)}};body.appendChild(install);
    const note=document.createElement("div");note.className="panel-row";note.textContent="WebView2 can load unpacked Windows extensions. Full Azecotron/Chromium extension lifecycle and store compatibility still require native-runtime verification.";body.appendChild(note);
  }catch(e){body.innerHTML='<div class="panel-row">Extension manager unavailable: '+esc(e)+'</div>'}
}


async function showMedia(){
  const body=basePanel("Media & WebRTC");
  const permissionKeys=[["permission_camera","Camera"],["permission_microphone","Microphone"],["permission_display_capture","Screen sharing"],["permission_notifications","Notifications"]];
  body.innerHTML='<div class="panel-row">The current host exposes native permission prompts, but full device routing/WebRTC verification waits for Azecotron.</div>';
  permissionKeys.forEach(([key,label])=>{
    const row=document.createElement("div");row.className="reading-row";
    const policy=state.settings[key]||"prompt";
    row.innerHTML='<div class="reading-info"><div class="reading-title">'+label+'</div><div class="reading-url">Policy: '+esc(policy)+'</div></div>';
    const manage=document.createElement("button");manage.className="mini-action";manage.textContent="Manage";manage.onclick=showSitePermissions;
    row.appendChild(manage);body.appendChild(row);
  });
  const runtime=document.createElement("button");runtime.className="panel-action";runtime.textContent="Runtime capability status";runtime.onclick=showRuntime;body.appendChild(runtime);
}

async function showUpdates(){
  const body=basePanel("Synth Updates");
  let status={};try{status=await invoke("update_status")}catch{}
  body.innerHTML='<div class="security-hero"><div class="security-orb">↻</div><div><div class="panel-title">Signed update pipeline</div><strong>Verified staging</strong><div class="reading-url">Ed25519 manifest + SHA-256 artifact</div></div></div>';
  [["Transport",status.transport||"—"],["Binary staging",status.binary_download||"—"],["Rollback",status.rollback||"—"],["Signature",status.signature||"—"]].forEach(([a,b])=>{const r=document.createElement("div");r.className="panel-row";r.innerHTML=esc(a)+' <strong>'+esc(b)+'</strong>';body.appendChild(r)});
  const pending=await invoke("pending_update");if(pending){const r=document.createElement("div");r.className="panel-row";r.innerHTML='Pending <strong>'+esc(pending.version)+'</strong><div class="reading-url">'+esc(pending.staged_path)+'</div>';body.appendChild(r)}
  const back=document.createElement("button");back.className="panel-action";back.textContent="Create rollback backup";back.onclick=async()=>{try{const path=await invoke("update_rollback_backup");toast("Backup created: "+path)}catch(e){toast(e)}};body.appendChild(back);
  const clear=document.createElement("button");clear.className="panel-action";clear.textContent="Cancel pending update";clear.onclick=async()=>{try{await invoke("clear_pending_update");toast("Pending update cleared");showUpdates()}catch(e){toast(e)}};body.appendChild(clear);
}

async function showPerformance(){
  const body=basePanel("Performance & Reliability");
  (async()=>{
    try{
      const [info,az,samples]=await Promise.all([invoke("runtime_info"),invoke("azecotron_status"),invoke("list_performance_samples",{limit:50})]);
      const latest=samples[0];
      body.innerHTML='<div class="security-hero"><div class="security-orb">ϟ</div><div><div class="panel-title">Runtime health</div><strong>'+esc(az.running?"Azecotron running":info.runtime)+'</strong><div class="reading-url">'+esc(az.available?"Native runtime available":"Fallback runtime")+'</div></div></div>'+
        '<div class="perf-grid"><div><span>Memory</span><b>'+(latest?formatBytes(latest.memory_bytes):"—")+'</b></div><div><span>CPU time</span><b>'+(latest?String(latest.cpu_time_ms)+" ms":"—")+'</b></div><div><span>Tabs</span><b>'+(latest?String(latest.tab_count):String(state.tabs.length))+'</b></div><div><span>Samples</span><b>'+String(samples.length)+'</b></div></div>';
      const sample=document.createElement("button");sample.className="panel-action";sample.textContent="Record live sample";sample.onclick=async()=>{try{await invoke("record_performance_sample");toast("Performance sample recorded");showPerformance()}catch(e){toast(e)}};body.appendChild(sample);
      const benchmarks=document.createElement("div");benchmarks.className="performance-gates";
      [["Startup","Needs controlled cold-start runner"],["10 tabs","Measure startup + steady-state memory"],["50 tabs","Measure memory/CPU"],["100 tabs","Measure memory/CPU"],["200 tabs","Stress test"],["1 hour","Long-session growth"],["4 hours","Long-session growth"],["GPU","Verify process and acceleration"],["Crash recovery","Kill/relaunch runtime"],["Profile isolation","Cross-profile leak test"],["Tracker blocking","Network block verification"]].forEach(([name,desc])=>{
        const row=document.createElement("div");row.className="tool-row";row.innerHTML='<div class="tool-copy"><strong>'+esc(name)+'</strong><span>'+esc(desc)+'</span></div><div class="tool-state">NOT VERIFIED</div>';benchmarks.appendChild(row);
      });body.appendChild(benchmarks);
      const diag=document.createElement("button");diag.className="panel-action";diag.textContent="Export diagnostics";diag.onclick=async()=>{try{const x=await invoke("export_diagnostics");toast("Diagnostics exported to "+x.path)}catch(e){toast(e)}};body.appendChild(diag);
      const clear=document.createElement("button");clear.className="panel-action";clear.textContent="Clear performance samples";clear.onclick=async()=>{if(confirm("Clear saved performance samples?")){await invoke("clear_performance_samples");showPerformance()}};body.appendChild(clear);
    }catch(e){body.innerHTML='<div class="panel-row">Performance diagnostics unavailable: '+esc(e)+'</div>'}
  })();
}


async function showCookies(){
  const body=basePanel("Cookies & Site Storage");
  try{
    const info=await invoke("site_storage");
    const cookies=await invoke("list_current_site_cookies");
    body.innerHTML='<div class="panel-row">Storage inventory for <strong>'+esc(activeTab()?.title||"current site")+'</strong></div>';
    const storageSections=[
      ["Cookies",cookies.map(x=>({name:x.name,kind:"cookie",detail:x.domain+x.path}))],
      ["localStorage",(info.localStorageKeys||[]).map(name=>({name,kind:"localStorage",detail:"origin storage"}))],
      ["sessionStorage",(info.sessionStorage||[]).map(name=>({name,kind:"sessionStorage",detail:"session storage"}))],
      ["IndexedDB",(info.indexedDbNames||[]).map(name=>({name,kind:"indexedDB",detail:"database"}))]
    ];
    storageSections.forEach(([title,items])=>{
      const head=document.createElement("div");head.className="panel-title";head.textContent=title+" · "+items.length;body.appendChild(head);
      if(!items.length){const empty=document.createElement("div");empty.className="panel-row";empty.textContent="None";body.appendChild(empty);return}
      items.slice(0,60).forEach(item=>{
        const row=document.createElement("div");row.className="tool-row";
        const copy=document.createElement("div");copy.className="tool-copy";copy.innerHTML='<strong>'+esc(item.name)+'</strong><span>'+esc(item.detail)+'</span>';
        const del=document.createElement("button");del.className="mini-action danger";del.textContent="Delete";
        del.onclick=async()=>{try{
          if(item.kind==="cookie"){
            const cookie=cookies.find(x=>x.name===item.name&&x.domain+x.path===item.detail);
            if(cookie) await invoke("delete_current_site_cookie",{name:cookie.name,domain:cookie.domain,path:cookie.path});
          }else{
            await invoke("delete_site_storage_item",{kind:item.kind,name:item.name});
          }
          toast("Deleted "+item.name);showCookies();
        }catch(e){toast(e)}};
        row.append(copy,del);body.appendChild(row);
      });
    });
    const clear=document.createElement("button");clear.className="panel-action";clear.textContent="Clear this site's cookies + storage";clear.onclick=async()=>{if(confirm("Delete this site's cookies and storage?")){try{await invoke("clear_current_site_data");toast("Site data cleared");showCookies()}catch(e){toast(e)}}};body.appendChild(clear);
  }catch(e){body.innerHTML='<div class="panel-row">Site storage unavailable: '+esc(e)+'</div>'}
}

async function showCommandChains(){
  const body=basePanel("Command Chains");
  const actions=[
    ["new_tab","New tab"],["reload","Reload"],["back","Back"],["forward","Forward"],
    ["open_devtools","Open DevTools"],["add_bookmark","Add bookmark"],["add_to_shelf","Add to Reading Shelf"],
    ["reader_mode","Reader Mode"],["page_lens","Page Lens"],["clear_history","Clear history"],["copy_url","Copy URL"]
  ];
  const form=document.createElement("div");form.className="chain-builder";
  const title=document.createElement("input");title.className="setting-control";title.placeholder="Chain name";form.appendChild(title);
  const select=document.createElement("select");select.className="setting-control";
  actions.forEach(([id,label])=>{const o=document.createElement("option");o.value=id;o.textContent=label;select.appendChild(o)});
  form.appendChild(select);
  const steps=document.createElement("div");steps.className="chain-steps";form.appendChild(steps);
  const add=document.createElement("button");add.className="panel-action";add.textContent="+ Add step";
  add.onclick=()=>{const id=select.value;const label=select.selectedOptions[0].textContent;const chip=document.createElement("span");chip.className="model-chip";chip.dataset.action=id;chip.textContent=label+" ×";chip.onclick=()=>chip.remove();steps.appendChild(chip)};form.appendChild(add);
  const save=document.createElement("button");save.className="panel-action";save.textContent="Save chain";
  save.onclick=async()=>{const name=title.value.trim();const picked=[...steps.children].map(x=>x.dataset.action);if(!name||!picked.length){toast("Add a name and at least one step.");return}try{await invoke("create_command_chain",{name,steps:picked});toast("Chain saved");showCommandChains()}catch(e){toast(e)}};form.appendChild(save);
  body.appendChild(form);
  const rows=await invoke("list_command_chains");
  if(!rows.length){body.innerHTML+='<div class="panel-row">No command chains saved.</div>';return}
  rows.forEach(chain=>{
    const row=document.createElement("div");row.className="tool-row";
    const info=document.createElement("div");info.className="tool-copy";info.innerHTML='<strong>'+esc(chain.name)+'</strong><span>'+esc(chain.steps.join(" → "))+'</span>';
    const run=document.createElement("button");run.className="mini-action";run.textContent="Run";run.onclick=async()=>{try{for(const step of chain.steps){if(step==="new_tab")await invoke("new_tab",{private:false});else if(step==="reload")await invoke("reload");else if(step==="back")await invoke("back");else if(step==="forward")await invoke("forward");else if(step==="open_devtools")await invoke("open_devtools");else if(step==="add_bookmark")await invoke("add_bookmark");else if(step==="add_to_shelf")await invoke("add_to_shelf");else if(step==="reader_mode")await invoke("reader_mode");else if(step==="page_lens")await invoke("page_lens");else if(step==="clear_history")await invoke("clear_data_category",{category:"history"});else if(step==="copy_url")await copyCurrentUrl()}toast("Chain complete")}catch(e){toast("Chain stopped: "+e)}};    
    const del=document.createElement("button");del.className="mini-action danger";del.textContent="Delete";del.onclick=async()=>{if(confirm("Delete command chain?")){await invoke("delete_command_chain",{id:chain.id});showCommandChains()}};
    row.append(info,run,del);body.appendChild(row);
  });
}

async function showAssist(){
  const body=basePanel("Synth Assist");
  try{
    const info=await invoke("ai_status");
    const presets=await invoke("ai_presets");
    body.innerHTML='<div class="security-hero"><div class="security-orb">✦</div><div><div class="panel-title">Synth Assist</div><strong>'+esc(info.enabled?"Enabled":"Disabled")+'</strong><div class="reading-url">'+esc(info.provider||"No provider")+' · '+esc(info.model||"No model")+'</div></div></div>';
    const status=document.createElement("div");status.className="assist-mini-grid";
    [["Context","Explicit only"],["Credential",info.keyStored?"Securely stored":"Not stored"],["Mode",info.enabled?"Remote/local model":"Off"],["Search","AI Search available"]].forEach(([k,v])=>{const x=document.createElement("div");x.innerHTML='<span>'+esc(k)+'</span><b>'+esc(v)+'</b>';status.appendChild(x)});body.appendChild(status);

    const provider=document.createElement("select");provider.className="setting-control";
    presets.forEach(p=>{const o=document.createElement("option");o.value=p.id;o.textContent=p.name;provider.appendChild(o)});
    provider.value=presets.some(p=>p.id===info.provider)?info.provider:"custom";
    provider.onchange=async()=>{const p=presets.find(x=>x.id===provider.value);if(!p)return;try{await invoke("set_setting",{key:"ai_provider",value:p.id});await invoke("set_setting",{key:"ai_endpoint",value:p.endpoint});await invoke("set_setting",{key:"ai_model",value:""});showAssist()}catch(e){toast(e)}};body.appendChild(provider);

    const endpoint=document.createElement("input");endpoint.className="setting-control";endpoint.value=info.endpoint||"";endpoint.placeholder="HTTPS endpoint or localhost";endpoint.onchange=async()=>{try{await invoke("set_setting",{key:"ai_endpoint",value:endpoint.value});toast("Endpoint saved")}catch(e){toast(e)}};body.appendChild(endpoint);

    const model=document.createElement("input");model.className="setting-control";model.value=info.model||"";model.placeholder="Model id";model.onchange=async()=>{try{await invoke("set_setting",{key:"ai_model",value:model.value});toast("Model saved")}catch(e){toast(e)}};body.appendChild(model);

    const models=document.createElement("div");models.className="assist-models";body.appendChild(models);
    const discover=document.createElement("button");discover.className="panel-action";discover.textContent="Discover models";
    discover.onclick=async()=>{try{const list=await invoke("list_ai_model_info");models.replaceChildren();list.slice(0,50).forEach(meta=>{const card=document.createElement("div");card.className="model-info-card";const b=document.createElement("button");b.className="model-chip";b.textContent=meta.id;b.onclick=async()=>{model.value=meta.id;await invoke("set_setting",{key:"ai_model",value:meta.id});toast("Model selected")};const m=document.createElement("span");m.textContent=[meta.family,meta.context_window?formatNumber(meta.context_window)+" context":null,meta.supports_vision?"Vision":null,meta.supports_tools?"Tools":null].filter(Boolean).join(" · ");card.append(b,m);models.appendChild(card)})}catch(e){toast(e)}};body.appendChild(discover);

    const enabled=document.createElement("label");enabled.className="setting-toggle";const ec=document.createElement("span");ec.textContent="Enable Synth Assist";const ei=document.createElement("input");ei.type="checkbox";ei.checked=!!info.enabled;ei.onchange=async()=>{await invoke("set_setting",{key:"ai_enabled",value:String(ei.checked)});showAssist()};enabled.append(ec,ei);body.appendChild(enabled);

    const page=document.createElement("label");page.className="setting-toggle";const pc=document.createElement("span");pc.textContent="Allow page context on request";const pi=document.createElement("input");pi.type="checkbox";pi.checked=state.settings.ai_page_context==="true";pi.onchange=async()=>{await invoke("set_setting",{key:"ai_page_context",value:String(pi.checked)})};page.append(pc,pi);body.appendChild(page);

    const selection=document.createElement("label");selection.className="setting-toggle";const sc=document.createElement("span");sc.textContent="Allow selection context on request";const si=document.createElement("input");si.type="checkbox";si.checked=state.settings.ai_selection_context==="true";si.onchange=async()=>{await invoke("set_setting",{key:"ai_selection_context",value:String(si.checked)})};selection.append(sc,si);body.appendChild(selection);

    const key=document.createElement("input");key.type="password";key.className="setting-control";key.placeholder=info.keyStored?"Replace secure API key":"Store API key securely";body.appendChild(key);
    const actions=document.createElement("div");actions.className="feature-actions";
    const save=document.createElement("button");save.className="feature-action primary";save.textContent="Save credential";save.onclick=async()=>{if(!key.value)return;try{await invoke("set_ai_key",{provider:info.provider,key:key.value});key.value="";toast("Credential stored")}catch(e){toast(e)}};
    const clear=document.createElement("button");clear.className="feature-action";clear.textContent="Clear credential";clear.onclick=async()=>{try{await invoke("clear_ai_key",{provider:info.provider});toast("Credential cleared");showAssist()}catch(e){toast(e)}};
    actions.append(save,clear);body.appendChild(actions);

    const ask=document.createElement("button");ask.className="panel-action";ask.textContent="Ask about current page";ask.onclick=async()=>{try{await invoke("request_page_context")}catch(e){toast(e)}};body.appendChild(ask);
    const sel=document.createElement("button");sel.className="panel-action";sel.textContent="Ask about selection";sel.onclick=()=>requestSelectionAction("ask");body.appendChild(sel);
    const search=document.createElement("button");search.className="panel-action";search.textContent="AI Search";search.onclick=async()=>{const q=prompt("AI Search");if(!q)return;try{showAiAnswer(await invoke("synth_ai_search",{query:q}),"AI Search")}catch(e){toast(e)}};body.appendChild(search);
    const threads=document.createElement("button");threads.className="panel-action";threads.textContent="Context Threads";threads.onclick=showAiThreads;body.appendChild(threads);
  }catch(e){body.innerHTML='<div class="panel-row">Synth Assist unavailable: '+esc(e)+'</div>'}
}

function formatNumber(n){return Number(n||0).toLocaleString()}

async function showAiThreads(){
  const body=basePanel("Synth Threads");
  const create=document.createElement("button");create.className="panel-action";create.textContent="+ New context thread";
  create.onclick=async()=>{const title=prompt("Thread title","New Synth conversation");if(!title)return;try{await invoke("create_ai_thread",{title});toast("Thread created");showAiThreads()}catch(e){toast(e)}};
  body.appendChild(create);
  const rows=await invoke("list_ai_threads");
  if(!rows.length){body.innerHTML+='<div class="panel-row">No context threads yet.</div>';return}
  rows.forEach(thread=>{
    const row=document.createElement("div");row.className="tool-row";
    const copy=document.createElement("div");copy.className="tool-copy";copy.innerHTML='<strong>'+esc(thread.title)+'</strong><span>'+esc(thread.provider)+' · '+esc(thread.model||"No model")+'</span>';
    const open=document.createElement("button");open.className="mini-action";open.textContent="Open";open.onclick=()=>showAiThread(thread.id);
    const del=document.createElement("button");del.className="mini-action danger";del.textContent="Delete";del.onclick=async()=>{if(!confirm("Delete this AI thread and its messages?"))return;try{await invoke("delete_ai_thread",{threadId:thread.id});showAiThreads()}catch(e){toast(e)}};
    row.append(copy,open,del);body.appendChild(row);
  });
}

async function showAiThread(threadId){
  const body=basePanel("Synth Thread");
  let rows=await invoke("list_ai_messages",{threadId});
  const messages=document.createElement("div");messages.className="thread-messages";
  const draw=()=>{messages.replaceChildren();rows.forEach(m=>{const item=document.createElement("div");item.className="thread-message "+esc(m.role);item.innerHTML='<span>'+esc(m.role)+'</span><p>'+esc(m.content)+'</p>';messages.appendChild(item)});messages.scrollTop=messages.scrollHeight};
  draw();body.appendChild(messages);
  const composer=document.createElement("textarea");composer.className="thread-composer";composer.rows=3;composer.placeholder="Message Synth…";body.appendChild(composer);
  const send=document.createElement("button");send.className="panel-action";send.textContent="Send";
  send.onclick=async()=>{const text=composer.value.trim();if(!text)return;send.disabled=true;try{const answer=await invoke("send_ai_thread_message",{threadId,content:text});rows.push({role:"user",content:text,id:Date.now()});rows.push(answer);composer.value="";draw()}catch(e){toast(e)}finally{send.disabled=false}};
  body.appendChild(send);
  const back=document.createElement("button");back.className="panel-action";back.textContent="Back to threads";back.onclick=showAiThreads;body.appendChild(back);
}


