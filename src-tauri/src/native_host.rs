use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostTarget {
    pub hwnd: u64,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[cfg(windows)]
pub fn target(window: tauri::WebviewWindow) -> Result<HostTarget, String> {
    use windows::Win32::Foundation::RECT;
    use windows::Win32::UI::WindowsAndMessaging::GetClientRect;
    let hwnd=window.hwnd().map_err(|e|e.to_string())?;
    let mut rect=RECT::default();
    unsafe { GetClientRect(hwnd,&mut rect).map_err(|e|e.to_string())?; }
    Ok(HostTarget{hwnd:hwnd.0 as u64,x:0,y:0,width:(rect.right-rect.left) as u32,height:(rect.bottom-rect.top) as u32})
}

#[cfg(not(windows))]
pub fn target(_window: tauri::WebviewWindow) -> Result<HostTarget, String> {
    Err("Native Azecotron embedding currently targets Windows.".into())
}
