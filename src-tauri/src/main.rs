use serde::{Deserialize, Serialize};
use std::{
    collections::VecDeque,
    fs,
    path::{Path, PathBuf},
    sync::{atomic::{AtomicU64, Ordering}, Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{
    menu::{Menu, MenuItem},
    webview::{DownloadEvent, PageLoadEvent, WebviewBuilder, WebviewUrl},
    Emitter, LogicalPosition, LogicalSize, Manager, State, WindowEvent,
};
use thiserror::Error;
use url::Url;

const CHROME_HEIGHT: f64 = 112.0;

#[derive(Debug, Error)]
enum AppError {
    #[error("{0}")]
    Message(String),
    #[error("database error: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}

type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Tab {
    id: String,
    title: String,
    url: String,
    pinned: bool,
    muted: bool,
    private: bool,
    loading: bool,
    workspace: String,
    has_webview: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Snapshot {
    tabs: Vec<Tab>,
    active_id: String,
    runtime_name: String,
    runtime_revision: String,
    azecotron_status: String,
    search_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Bookmark {
    id: i64,
    title: String,
    url: String,
    folder: String,
    created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct HistoryEntry {
    id: i64,
    url: String,
    title: String,
    domain: String,
    workspace: String,
    visited_at: i64,
}

#[derive(Clone)]
struct Db {
    path: PathBuf,
}

impl Db {
    fn new() -> AppResult<Self> {
        let root = dirs_next::data_dir().unwrap_or_else(|| PathBuf::from(".")).join("SynthBrowser");
        fs::create_dir_all(&root)?;
        let db = Self { path: root.join("browser.sqlite3") };
        db.migrate()?;
        Ok(db)
    }

    fn connect(&self) -> Result<rusqlite::Connection, rusqlite::Error> {
        let c = rusqlite::Connection::open(&self.path)?;
        c.busy_timeout(std::time::Duration::from_millis(1500))?;
        Ok(c)
    }

    fn migrate(&self) -> AppResult<()> {
        let c = self.connect()?;
        c.execute_batch(
            "PRAGMA journal_mode = WAL;
             CREATE TABLE IF NOT EXISTS schema_meta(version INTEGER NOT NULL);
             CREATE TABLE IF NOT EXISTS bookmarks(
               id INTEGER PRIMARY KEY,
               title TEXT NOT NULL,
               url TEXT NOT NULL UNIQUE,
               folder TEXT NOT NULL DEFAULT 'Bookmarks',
               created_at INTEGER NOT NULL
             );
             CREATE TABLE IF NOT EXISTS history(
               id INTEGER PRIMARY KEY,
               url TEXT NOT NULL,
               title TEXT NOT NULL DEFAULT '',
               domain TEXT NOT NULL DEFAULT '',
               workspace TEXT NOT NULL DEFAULT 'Default',
               visited_at INTEGER NOT NULL
             );
             CREATE INDEX IF NOT EXISTS idx_history_visited ON history(visited_at DESC);
             CREATE TABLE IF NOT EXISTS downloads(
               id INTEGER PRIMARY KEY,
               url TEXT NOT NULL,
               path TEXT,
               status TEXT NOT NULL,
               created_at INTEGER NOT NULL,
               finished_at INTEGER
             );
             INSERT INTO schema_meta(version)
             SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM schema_meta);"
        )?;
        Ok(())
    }

    fn now() -> i64 {
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() as i64
    }

    fn add_history(&self, url: &str, title: &str, domain: &str) -> AppResult<()> {
        self.connect()?.execute(
            "INSERT INTO history(url,title,domain,workspace,visited_at) VALUES(?1,?2,?3,'Default',?4)",
            rusqlite::params![url, title, domain, Self::now()]
        )?;
        Ok(())
    }

    fn list_history(&self) -> AppResult<Vec<HistoryEntry>> {
        let c = self.connect()?;
        let mut s = c.prepare("SELECT id,url,title,domain,workspace,visited_at FROM history ORDER BY visited_at DESC LIMIT 250")?;
        let rows = s.query_map([], |r| Ok(HistoryEntry {
            id: r.get(0)?, url: r.get(1)?, title: r.get(2)?, domain: r.get(3)?,
            workspace: r.get(4)?, visited_at: r.get(5)?
        }))?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    fn clear_history(&self) -> AppResult<()> {
        self.connect()?.execute("DELETE FROM history", [])?;
        Ok(())
    }

    fn add_bookmark(&self, title: &str, url: &str) -> AppResult<Bookmark> {
        self.connect()?.execute(
            "INSERT INTO bookmarks(title,url,folder,created_at) VALUES(?1,?2,'Bookmarks',?3)
             ON CONFLICT(url) DO UPDATE SET title=excluded.title",
            rusqlite::params![title, url, Self::now()]
        )?;
        let c = self.connect()?;
        let mut s = c.prepare("SELECT id,title,url,folder,created_at FROM bookmarks WHERE url=?1")?;
        Ok(s.query_row([url], |r| Ok(Bookmark {
            id:r.get(0)?, title:r.get(1)?, url:r.get(2)?, folder:r.get(3)?, created_at:r.get(4)?
        }))?)
    }

    fn list_bookmarks(&self) -> AppResult<Vec<Bookmark>> {
        let c = self.connect()?;
        let mut s = c.prepare("SELECT id,title,url,folder,created_at FROM bookmarks ORDER BY created_at DESC")?;
        let rows = s.query_map([], |r| Ok(Bookmark {
            id:r.get(0)?, title:r.get(1)?, url:r.get(2)?, folder:r.get(3)?, created_at:r.get(4)?
        }))?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    fn download_started(&self, url: &str, path: &Path) -> AppResult<()> {
        self.connect()?.execute(
            "INSERT INTO downloads(url,path,status,created_at) VALUES(?1,?2,'downloading',?3)",
            rusqlite::params![url, path.to_string_lossy(), Self::now()]
        )?;
        Ok(())
    }

    fn download_finished(&self, url: &str, path: Option<&Path>, success: bool) -> AppResult<()> {
        self.connect()?.execute(
            "UPDATE downloads SET status=?1, path=COALESCE(?2,path), finished_at=?3
             WHERE id=(SELECT id FROM downloads WHERE url=?4 ORDER BY id DESC LIMIT 1)",
            rusqlite::params![
                if success { "completed" } else { "failed" },
                path.map(|p| p.to_string_lossy().to_string()),
                Self::now(),
                url
            ]
        )?;
        Ok(())
    }
}

struct AppState {
    tabs: Arc<Mutex<Vec<Tab>>>,
    active_id: Arc<Mutex<String>>,
    closed: Arc<Mutex<VecDeque<Tab>>>,
    next_id: AtomicU64,
    db: Db,
}

impl AppState {
    fn new(db: Db) -> Self {
        Self {
            tabs: Arc::new(Mutex::new(vec![Tab {
                id: "tab-1".into(),
                title: "New Tab".into(),
                url: "synth://newtab".into(),
                pinned:false, muted:false, private:false, loading:false,
                workspace:"Default".into(), has_webview:false,
            }])),
            active_id: Arc::new(Mutex::new("tab-1".into())),
            closed: Arc::new(Mutex::new(VecDeque::new())),
            next_id: AtomicU64::new(2),
            db,
        }
    }
    fn next_tab_id(&self) -> String {
        format!("tab-{}", self.next_id.fetch_add(1, Ordering::Relaxed))
    }
}

#[derive(Debug, Clone)]
enum SearchDecision {
    NewTab,
    Url(Url),
    Search(Url),
}

fn classify(input: &str) -> AppResult<SearchDecision> {
    let s = input.trim();
    if s.is_empty() || s == "synth://newtab" {
        return Ok(SearchDecision::NewTab);
    }
    if let Ok(u) = Url::parse(s) {
        if matches!(u.scheme(), "http" | "https") { return Ok(SearchDecision::Url(u)); }
    }
    if s.contains('.') && !s.contains(' ') {
        let u = Url::parse(&format!("https://{s}")).map_err(|e| AppError::Message(e.to_string()))?;
        return Ok(SearchDecision::Url(u));
    }
    let mut encoded = String::with_capacity(s.len());
    for b in s.as_bytes() {
        match b {
            b'A'..=b'Z'|b'a'..=b'z'|b'0'..=b'9'|b'-'|b'_'|b'.'|b'~' => encoded.push(*b as char),
            b' ' => encoded.push('+'),
            _ => encoded.push_str(&format!("%{b:02X}"))
        }
    }
    let u = Url::parse(&format!("https://www.google.com/search?q={encoded}"))
        .map_err(|e| AppError::Message(e.to_string()))?;
    Ok(SearchDecision::Search(u))
}

fn runtime_status() -> (&'static str, &'static str, &'static str) {
    #[cfg(target_os = "windows")]
    { return ("Tauri WebView2", "OS-provided WebView2 runtime", "BLOCKED / DESIGNED: Azecotron Web Chromium fork not bundled"); }
    #[cfg(target_os = "macos")]
    { return ("Tauri WKWebView", "OS-provided WebKit runtime", "BLOCKED / DESIGNED: Azecotron Web Chromium fork not bundled"); }
    #[cfg(target_os = "linux")]
    { return ("Tauri WebKitGTK", "OS-provided WebKitGTK runtime", "BLOCKED / DESIGNED: Azecotron Web Chromium fork not bundled"); }
    ("Tauri native webview", "platform runtime", "BLOCKED / DESIGNED")
}

fn snapshot(state: &AppState) -> Snapshot {
    let (runtime_name, runtime_revision, azecotron_status) = runtime_status();
    Snapshot {
        tabs: state.tabs.lock().unwrap().clone(),
        active_id: state.active_id.lock().unwrap().clone(),
        runtime_name: runtime_name.into(),
        runtime_revision: runtime_revision.into(),
        azecotron_status: azecotron_status.into(),
        search_name: "Cortis".into(),
    }
}

fn emit_snapshot<R: tauri::Runtime>(app: &tauri::AppHandle<R>, state: &AppState) {
    let _ = app.emit("browser://snapshot", snapshot(state));
}

fn webview_bounds<R: tauri::Runtime>(window: &tauri::Window<R>) -> AppResult<(LogicalPosition<f64>, LogicalSize<f64>)> {
    let sf = window.scale_factor().map_err(|e| AppError::Message(e.to_string()))?;
    let s = window.inner_size().map_err(|e| AppError::Message(e.to_string()))?;
    let width = s.width as f64 / sf;
    let height = s.height as f64 / sf;
    Ok((
        LogicalPosition::new(0.0, CHROME_HEIGHT),
        LogicalSize::new(width.max(1.0), (height-CHROME_HEIGHT).max(1.0))
    ))
}

fn layout<R: tauri::Runtime>(app: &tauri::AppHandle<R>, state: &AppState) -> AppResult<()> {
    let window = app.get_window("main").ok_or_else(|| AppError::Message("main window missing".into()))?;
    let (pos, size) = webview_bounds(&window)?;
    let active = state.active_id.lock().unwrap().clone();
    for tab in state.tabs.lock().unwrap().iter() {
        if let Some(view) = app.get_webview(&format!("page-{}", tab.id)) {
            if tab.id == active && tab.has_webview {
                view.set_position(pos).map_err(|e| AppError::Message(e.to_string()))?;
                view.set_size(size).map_err(|e| AppError::Message(e.to_string()))?;
                view.show().map_err(|e| AppError::Message(e.to_string()))?;
            } else {
                view.hide().map_err(|e| AppError::Message(e.to_string()))?;
            }
        }
    }
    Ok(())
}

fn create_page_webview<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    state: &AppState,
    tab_id: &str,
    url: &Url,
    private: bool,
) -> AppResult<()> {
    let window = app.get_window("main").ok_or_else(|| AppError::Message("main window missing".into()))?;
    let label = format!("page-{tab_id}");
    if let Some(view) = app.get_webview(&label) {
        view.navigate(url.clone()).map_err(|e| AppError::Message(e.to_string()))?;
        return Ok(());
    }

    let tabs_nav = state.tabs.clone();
    let tabs_title = state.tabs.clone();
    let tabs_load = state.tabs.clone();
    let app_nav = app.clone();
    let app_title = app.clone();
    let app_load = app.clone();
    let app_download = app.clone();
    let db_path = state.db.path().to_path_buf();
    let download_dir = dirs_next::download_dir().unwrap_or_else(|| PathBuf::from(".")).join("Synth Browser");
    fs::create_dir_all(&download_dir)?;

    let builder = WebviewBuilder::new(label.clone(), WebviewUrl::External(url.clone()))
        .focused(false)
        .incognito(private)
        .devtools(cfg!(debug_assertions))
        .zoom_hotkeys_enabled(true)
        .on_navigation(move |next| {
            if !matches!(next.scheme(), "http"|"https") { return false; }
            if let Ok(mut tabs) = tabs_nav.lock() {
                if let Some(tab) = tabs.iter_mut().find(|t| t.id == tab_id) {
                    tab.url = next.as_str().to_owned();
                    tab.loading = true;
                    tab.has_webview = true;
                }
            }
            if !private {
                let db = Db { path: db_path.clone() };
                let _ = db.migrate();
                let _ = db.add_history(next.as_str(), "", next.host_str().unwrap_or(""));
            }
            let _ = app_nav.emit("browser://navigation", serde_json::json!({
                "tabId": tab_id, "url": next.as_str(), "loading": true
            }));
            true
        })
        .on_document_title_changed(move |_view, title| {
            if let Ok(mut tabs) = tabs_title.lock() {
                if let Some(tab) = tabs.iter_mut().find(|t| t.id == tab_id) {
                    tab.title = if title.trim().is_empty() { "Untitled".into() } else { title.clone() };
                    tab.loading = false;
                }
            }
            let _ = app_title.emit("browser://title", serde_json::json!({
                "tabId": tab_id, "title": title
            }));
        })
        .on_page_load(move |_view, payload| {
            if payload.event() == PageLoadEvent::Finished {
                if let Ok(mut tabs) = tabs_load.lock() {
                    if let Some(tab) = tabs.iter_mut().find(|t| t.id == tab_id) { tab.loading = false; }
                }
                let _ = app_load.emit("browser://load", serde_json::json!({
                    "tabId": tab_id, "url": payload.url().as_str()
                }));
            }
        })
        .on_download(move |_view, event| {
            match event {
                DownloadEvent::Requested { url, destination } => {
                    let filename = url.path_segments().and_then(|s| s.last()).filter(|s| !s.is_empty()).unwrap_or("download");
                    let mut target = download_dir.join(filename);
                    if target.exists() {
                        let stem = target.file_stem().and_then(|s| s.to_str()).unwrap_or("download");
                        let ext = target.extension().and_then(|s| s.to_str()).map(|s| format!(".{s}")).unwrap_or_default();
                        let mut n = 2;
                        loop {
                            let candidate = download_dir.join(format!("{stem} ({n}){ext}"));
                            if !candidate.exists() { target = candidate; break; }
                            n += 1;
                        }
                    }
                    *destination = target.clone();
                    let db = Db { path: db_path.clone() };
                    let _ = db.download_started(url.as_str(), &target);
                    let _ = app_download.emit("browser://download", serde_json::json!({
                        "status":"downloading","url":url.as_str(),"path":target
                    }));
                    true
                }
                DownloadEvent::Finished { url, path, success } => {
                    let db = Db { path: db_path.clone() };
                    let _ = db.download_finished(url.as_str(), path.as_deref(), success);
                    let _ = app_download.emit("browser://download", serde_json::json!({
                        "status": if success {"completed"} else {"failed"},
                        "url":url.as_str(),"path":path
                    }));
                    true
                }
                _ => true
            }
        });

    let (pos, size) = webview_bounds(&window)?;
    let view = window.add_child(builder, pos, size).map_err(|e| AppError::Message(e.to_string()))?;
    view.hide().map_err(|e| AppError::Message(e.to_string()))?;
    Ok(())
}

#[tauri::command]
fn get_snapshot(state: State<AppState>) -> Snapshot {
    snapshot(&state)
}

#[tauri::command]
fn navigate(app: tauri::AppHandle, state: State<AppState>, input: String) -> AppResult<()> {
    let decision = classify(&input)?;
    let active_id = state.active_id.lock().unwrap().clone();
    let private = state.tabs.lock().unwrap().iter().find(|t| t.id == active_id).map(|t| t.private).ok_or_else(|| AppError::Message("active tab missing".into()))?;

    match decision {
        SearchDecision::NewTab => {
            if let Some(view) = app.get_webview(&format!("page-{active_id}")) { let _ = view.hide(); }
            if let Some(tab) = state.tabs.lock().unwrap().iter_mut().find(|t| t.id == active_id) {
                tab.url = "synth://newtab".into();
                tab.title = if private { "Private Tab".into() } else { "New Tab".into() };
                tab.loading = false;
                tab.has_webview = false;
            }
        }
        SearchDecision::Url(url) | SearchDecision::Search(url) => {
            create_page_webview(&app, &state, &active_id, &url, private)?;
            if let Some(view) = app.get_webview(&format!("page-{active_id}")) {
                view.navigate(url).map_err(|e| AppError::Message(e.to_string()))?;
            }
            if let Some(tab) = state.tabs.lock().unwrap().iter_mut().find(|t| t.id == active_id) {
                tab.has_webview = true; tab.loading = true;
            }
        }
    }
    layout(&app, &state)?;
    emit_snapshot(&app, &state);
    Ok(())
}

#[tauri::command]
fn new_tab(app: tauri::AppHandle, state: State<AppState>, private: bool) -> AppResult<()> {
    let id = state.next_tab_id();
    state.tabs.lock().unwrap().push(Tab {
        id: id.clone(),
        title: if private {"Private Tab".into()} else {"New Tab".into()},
        url:"synth://newtab".into(), pinned:false, muted:false, private, loading:false,
        workspace:"Default".into(), has_webview:false,
    });
    *state.active_id.lock().unwrap() = id;
    layout(&app, &state)?;
    emit_snapshot(&app, &state);
    Ok(())
}

#[tauri::command]
fn activate_tab(app: tauri::AppHandle, state: State<AppState>, tab_id: String) -> AppResult<()> {
    if !state.tabs.lock().unwrap().iter().any(|t| t.id == tab_id) {
        return Err(AppError::Message("tab not found".into()));
    }
    *state.active_id.lock().unwrap() = tab_id;
    layout(&app, &state)?;
    emit_snapshot(&app, &state);
    Ok(())
}

#[tauri::command]
fn close_tab(app: tauri::AppHandle, state: State<AppState>, tab_id: String) -> AppResult<()> {
    let mut tabs = state.tabs.lock().unwrap();
    if tabs.len() == 1 {
        let id = tabs[0].id.clone();
        if let Some(view) = app.get_webview(&format!("page-{id}")) { let _ = view.hide(); }
        tabs[0].url = "synth://newtab".into();
        tabs[0].title = "New Tab".into();
        tabs[0].has_webview = false;
        drop(tabs);
        emit_snapshot(&app, &state);
        return Ok(());
    }
    let idx = tabs.iter().position(|t| t.id == tab_id).ok_or_else(|| AppError::Message("tab not found".into()))?;
    let was_active = *state.active_id.lock().unwrap() == tab_id;
    let removed = tabs.remove(idx);
    state.closed.lock().unwrap().push_front(removed);
    if let Some(view) = app.get_webview(&format!("page-{tab_id}")) { let _ = view.close(); }
    if was_active {
        let next = tabs.get(idx.min(tabs.len()-1)).or_else(|| tabs.last()).ok_or_else(|| AppError::Message("no tab remains".into()))?;
        *state.active_id.lock().unwrap() = next.id.clone();
    }
    drop(tabs);
    layout(&app, &state)?;
    emit_snapshot(&app, &state);
    Ok(())
}

#[tauri::command]
fn reopen_closed_tab(app: tauri::AppHandle, state: State<AppState>) -> AppResult<()> {
    let old = state.closed.lock().unwrap().pop_front().ok_or_else(|| AppError::Message("No closed tabs".into()))?;
    let id = state.next_tab_id();
    let url_string = old.url.clone();
    let private = old.private;
    let had_webview = old.has_webview;
    let new_tab = Tab { id:id.clone(), ..old };
    state.tabs.lock().unwrap().push(new_tab);
    *state.active_id.lock().unwrap() = id.clone();
    if had_webview {
        let url = Url::parse(&url_string).map_err(|e| AppError::Message(e.to_string()))?;
        create_page_webview(&app, &state, &id, &url, private)?;
        if let Some(view) = app.get_webview(&format!("page-{id}")) { view.navigate(url).map_err(|e| AppError::Message(e.to_string()))?; }
    }
    layout(&app, &state)?;
    emit_snapshot(&app, &state);
    Ok(())
}

#[tauri::command]
fn reload(app: tauri::AppHandle, state: State<AppState>) -> AppResult<()> {
    let id = state.active_id.lock().unwrap().clone();
    if let Some(view) = app.get_webview(&format!("page-{id}")) { view.reload().map_err(|e| AppError::Message(e.to_string()))?; }
    Ok(())
}

#[tauri::command]
fn back(app: tauri::AppHandle, state: State<AppState>) -> AppResult<()> {
    let id = state.active_id.lock().unwrap().clone();
    if let Some(view) = app.get_webview(&format!("page-{id}")) { view.eval("history.back()").map_err(|e| AppError::Message(e.to_string()))?; }
    Ok(())
}

#[tauri::command]
fn forward(app: tauri::AppHandle, state: State<AppState>) -> AppResult<()> {
    let id = state.active_id.lock().unwrap().clone();
    if let Some(view) = app.get_webview(&format!("page-{id}")) { view.eval("history.forward()").map_err(|e| AppError::Message(e.to_string()))?; }
    Ok(())
}

#[tauri::command]
fn open_devtools(app: tauri::AppHandle, state: State<AppState>) -> AppResult<()> {
    let id = state.active_id.lock().unwrap().clone();
    if let Some(view) = app.get_webview(&format!("page-{id}")) {
        #[cfg(debug_assertions)]
        { view.open_devtools(); return Ok(()); }
        #[cfg(not(debug_assertions))]
        { let _ = view; return Err(AppError::Message("Developer Tools are available in debug builds for v0.1.0.".into())); }
    }
    Err(AppError::Message("No active web page.".into()))
}

#[tauri::command]
fn add_bookmark(state: State<AppState>) -> AppResult<Bookmark> {
    let id = state.active_id.lock().unwrap().clone();
    let tab = state.tabs.lock().unwrap().iter().find(|t| t.id == id).cloned().ok_or_else(|| AppError::Message("active tab missing".into()))?;
    if tab.url == "synth://newtab" { return Err(AppError::Message("There is no page to bookmark.".into())); }
    state.db.add_bookmark(&tab.title, &tab.url)
}

#[tauri::command]
fn list_bookmarks(state: State<AppState>) -> AppResult<Vec<Bookmark>> {
    state.db.list_bookmarks()
}

#[tauri::command]
fn list_history(state: State<AppState>) -> AppResult<Vec<HistoryEntry>> {
    state.db.list_history()
}

#[tauri::command]
fn clear_browsing_data(app: tauri::AppHandle, state: State<AppState>) -> AppResult<()> {
    state.db.clear_history()?;
    for tab in state.tabs.lock().unwrap().iter() {
        if let Some(view) = app.get_webview(&format!("page-{}", tab.id)) { let _ = view.clear_all_browsing_data(); }
    }
    Ok(())
}

#[tauri::command]
fn runtime_info() -> serde_json::Value {
    let (runtime_name, runtime_revision, azecotron_status) = runtime_status();
    serde_json::json!({
        "runtime": runtime_name,
        "revision": runtime_revision,
        "azecotronWeb": {"name":"Azecotron Web","status":azecotron_status},
        "search": {"name":"Cortis","status":"FUNCTIONAL","mode":"Google web-search delegation"}
    })
}

fn main() {
    let db = Db::new().expect("unable to initialize Synth Browser database");
    let state = AppState::new(db);

    tauri::Builder::default()
        .manage(state)
        .setup(|app| {
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit])?;
            app.set_menu(menu)?;
            app.on_menu_event(|app, event| {
                if event.id().as_ref() == "quit" { app.exit(0); }
            });
            if let Some(window) = app.get_window("main") {
                let handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::Resized(_) = event {
                        if let Some(state) = handle.try_state::<AppState>() {
                            let _ = layout(&handle, &state);
                        }
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_snapshot, navigate, new_tab, activate_tab, close_tab, reopen_closed_tab,
            reload, back, forward, open_devtools, add_bookmark, list_bookmarks, list_history,
            clear_browsing_data, runtime_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running Synth Browser");
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_input_opens_new_tab() {
        assert!(matches!(classify(" ").unwrap(), SearchDecision::NewTab));
    }

    #[test]
    fn explicit_url_is_not_reinterpreted_as_search() {
        match classify("https://example.com/path").unwrap() {
            SearchDecision::Url(u) => assert_eq!(u.as_str(), "https://example.com/path"),
            _ => panic!("expected URL classification"),
        }
    }

    #[test]
    fn domain_gets_https() {
        match classify("example.com").unwrap() {
            SearchDecision::Url(u) => assert_eq!(u.as_str(), "https://example.com/"),
            _ => panic!("expected domain classification"),
        }
    }

    #[test]
    fn free_text_is_delegated_to_google_search() {
        match classify("hello world").unwrap() {
            SearchDecision::Search(u) => assert_eq!(u.as_str(), "https://www.google.com/search?q=hello+world"),
            _ => panic!("expected search classification"),
        }
    }
}
