use std::path::PathBuf;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use tauri::Emitter;

static RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Clone, serde::Serialize)]
pub struct AzecotronStatus {
    pub executable: String,
    pub available: bool,
    pub version: Option<String>,
    pub runtime: String,
}

pub fn executable_path() -> PathBuf {
    let explicit = std::env::var_os("SYNTH_AZECOTRON_PATH").map(PathBuf::from);
    if let Some(path) = explicit { return path; }
    let repo_root = std::env::var_os("SYNTHWEB_ROOT").map(PathBuf::from);
    let source_root = repo_root.unwrap_or_else(|| PathBuf::from("."));
    source_root.join("third_party").join("azecotron-chromium").join("src").join("out").join("Azecotron").join(if cfg!(windows) {"azecotron_host.exe"} else {"azecotron_host"})
}

pub fn running() -> bool { RUNNING.load(Ordering::Acquire) }

pub fn status() -> AzecotronStatus {
    let path=executable_path();
    let version=if path.exists() {
        Command::new(&path).arg("--version").output().ok().map(|o|String::from_utf8_lossy(&o.stdout).trim().to_string()).filter(|s|!s.is_empty())
    } else { None };
    AzecotronStatus{executable:path.display().to_string(),available:path.exists(),version,runtime:"Azecotron Web / Chromium Content API".into()}
}

pub fn launch(app: tauri::AppHandle, profile_dir:PathBuf,url:&str,parent_hwnd:Option<u64>,tab_id:&str)->Result<(),String>{
    let path=executable_path();
    if !path.exists(){return Err(format!("Azecotron executable was not found at {}",path.display()))}
    if !(url.starts_with("https://")||url.starts_with("http://")||url=="about:blank"){return Err("Azecotron launch accepts only HTTP(S) URLs or about:blank.".into())}
    std::fs::create_dir_all(&profile_dir).map_err(|e|e.to_string())?;
    if running(){return Err("An Azecotron runtime instance is already running for this Synth session.".into())}
    let mut child=Command::new(path)
        .arg(format!("--user-data-dir={}",profile_dir.display()))
        .arg("--no-first-run")
        .arg("--disable-default-apps")
        .args(parent_hwnd.map(|h| vec![format!("--synth-parent-hwnd={h}")]).unwrap_or_default())
        .arg(format!("--synth-tab-id={tab_id}"))
        .arg(format!("--synth-url={url}"))
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e|format!("Could not start Azecotron: {e}"))?;

    RUNNING.store(true, Ordering::Release);

    if let Some(stdout)=child.stdout.take(){
        let app_events=app.clone();
        thread::spawn(move||{
            let reader=BufReader::new(stdout);
            for line in reader.lines().flatten(){
                if let Some(json)=line.strip_prefix("SYNTH_EVENT "){
                    if let Ok(value)=serde_json::from_str::<serde_json::Value>(json){
                        let _=app_events.emit("azecotron://event",value);
                    }
                }
            }
        });
    }

    let app_exit=app.clone();
    thread::spawn(move||{
        let status=child.wait();
        RUNNING.store(false,Ordering::Release);
        let exit_code=status.ok().and_then(|s|s.code());
        let _=app_exit.emit("azecotron://process-exited",serde_json::json!({"code":exit_code}));
    });

    Ok(())
}
