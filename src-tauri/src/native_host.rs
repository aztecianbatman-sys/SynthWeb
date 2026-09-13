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
mod win {
    use super::HostTarget;
    use std::sync::{Mutex, OnceLock};
    use tauri::WebviewWindow;
    use windows::core::w;
    use windows::Win32::Foundation::{HWND, RECT};
    use windows::Win32::UI::WindowsAndMessaging::{
        CreateWindowExW, DestroyWindow, GetClientRect, SetWindowPos, ShowWindow,
        HMENU, SWP_NOACTIVATE, SWP_SHOWWINDOW, WS_CHILD, WS_CLIPCHILDREN,
        WS_CLIPSIBLINGS, WS_VISIBLE,
    };

    const CHROME_HEIGHT: i32 = 112;
    static HOSTS: OnceLock<Mutex<Vec<(isize, HWND)>>> = OnceLock::new();

    fn hosts() -> &'static Mutex<Vec<(isize, HWND)>> {
        HOSTS.get_or_init(|| Mutex::new(Vec::new()))
    }

    fn dimensions(window: &WebviewWindow) -> Result<(HWND, i32, i32), String> {
        let parent=window.hwnd().map_err(|e|e.to_string())?;
        let mut rect=RECT::default();
        unsafe { GetClientRect(parent,&mut rect).map_err(|e|e.to_string())?; }
        Ok((parent,(rect.right-rect.left).max(1),(rect.bottom-rect.top-CHROME_HEIGHT).max(1)))
    }

    fn find_host(parent: HWND) -> Option<HWND> {
        hosts().lock().ok()?.iter().find(|(p,_)|*p==parent.0).map(|(_,h)|*h)
    }

    pub fn ensure(window: &WebviewWindow) -> Result<HostTarget,String> {
        let (parent,width,height)=dimensions(window)?;
        let host=if let Some(existing)=find_host(parent) {
            existing
        } else {
            let host=unsafe {
                CreateWindowExW(
                    Default::default(),
                    w!("STATIC"),
                    w!("SynthBrowserAzecotronHost"),
                    WS_CHILD|WS_VISIBLE|WS_CLIPCHILDREN|WS_CLIPSIBLINGS,
                    0,CHROME_HEIGHT,width,height,
                    parent,
                    HMENU::default(),
                    None,
                    None,
                )
            }.map_err(|e|e.to_string())?;
            if let Ok(mut all)=hosts().lock(){all.push((parent.0,host));}
            host
        };
        unsafe {
            SetWindowPos(host,HWND::default(),0,CHROME_HEIGHT,width,height,SWP_NOACTIVATE|SWP_SHOWWINDOW)
                .map_err(|e|e.to_string())?;
            ShowWindow(host,windows::Win32::UI::WindowsAndMessaging::SW_SHOW);
        }
        Ok(HostTarget{hwnd:host.0 as u64,x:0,y:CHROME_HEIGHT,width:width as u32,height:height as u32})
    }

    pub fn resize(window:&WebviewWindow)->Result<(),String>{
        let (parent,width,height)=dimensions(window)?;
        if let Some(host)=find_host(parent){
            unsafe { SetWindowPos(host,HWND::default(),0,CHROME_HEIGHT,width,height,SWP_NOACTIVATE|SWP_SHOWWINDOW).map_err(|e|e.to_string())?; }
        }
        Ok(())
    }

    pub fn destroy(window:&WebviewWindow)->Result<(),String>{
        let parent=window.hwnd().map_err(|e|e.to_string())?;
        let host=hosts().lock().ok().and_then(|mut all|{
            let pos=all.iter().position(|(p,_)|*p==parent.0)?;
            Some(all.remove(pos).1)
        });
        if let Some(host)=host { unsafe { DestroyWindow(host).map_err(|e|e.to_string())?; } }
        Ok(())
    }
}

#[cfg(windows)]
pub fn target(window: tauri::WebviewWindow) -> Result<HostTarget, String> {
    win::ensure(&window)
}

#[cfg(windows)]
pub fn resize(window: tauri::WebviewWindow) -> Result<(), String> {
    win::resize(&window)
}

#[cfg(windows)]
pub fn destroy(window: tauri::WebviewWindow) -> Result<(), String> {
    win::destroy(&window)
}

#[cfg(not(windows))]
pub fn target(_window: tauri::WebviewWindow) -> Result<HostTarget, String> {
    Err("Native Azecotron embedding currently targets Windows.".into())
}

#[cfg(not(windows))]
pub fn resize(_window: tauri::WebviewWindow) -> Result<(), String> {
    Ok(())
}

#[cfg(not(windows))]
pub fn destroy(_window: tauri::WebviewWindow) -> Result<(), String> {
    Ok(())
}
