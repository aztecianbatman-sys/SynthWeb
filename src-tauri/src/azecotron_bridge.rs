use std::path::PathBuf;
use std::process::{Child, Command};

#[derive(Debug, Clone, serde::Serialize)]
pub struct AzecotronStatus {
    pub executable: String,
    pub available: bool,
    pub version: Option<String>,
    pub runtime: String,
}

pub fn executable_path() -> PathBuf {
    let repo_root = std::env::var_os("SYNTHWEB_ROOT").map(PathBuf::from);
    let source_root = repo_root.unwrap_or_else(|| PathBuf::from("."));
    source_root.join("third_party").join("azecotron-chromium").join("src").join("out").join("Azecotron").join(if cfg!(windows) {"chrome.exe"} else {"chrome"})
}

pub fn status() -> AzecotronStatus {
    let path=executable_path();
    let version=if path.exists() {
        Command::new(&path).arg("--version").output().ok().map(|o|String::from_utf8_lossy(&o.stdout).trim().to_string()).filter(|s|!s.is_empty())
    } else { None };
    AzecotronStatus{executable:path.display().to_string(),available:path.exists(),version,runtime:"Azecotron Web / Chromium Content API".into()}
}

pub fn launch(profile_dir:PathBuf,url:&str,parent_hwnd:Option<u64>)->Result<Child,String>{
    let path=executable_path();
    if !path.exists(){return Err(format!("Azecotron executable was not found at {}",path.display()))}
    if !(url.starts_with("https://")||url.starts_with("http://")||url=="about:blank"){return Err("Azecotron launch accepts only HTTP(S) URLs or about:blank.".into())}
    std::fs::create_dir_all(&profile_dir).map_err(|e|e.to_string())?;
    Command::new(path)
        .arg(format!("--user-data-dir={}",profile_dir.display()))
        .arg("--no-first-run")
        .arg("--disable-default-apps")
        .args(parent_hwnd.map(|h| vec![format!("--synth-parent-hwnd={h}")]).unwrap_or_default())
        .arg(url)
        .spawn()
        .map_err(|e|format!("Could not start Azecotron: {e}"))
}
