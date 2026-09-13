#[cfg(windows)]
use std::{fs, path::PathBuf, sync::mpsc};

#[cfg(windows)]
use webview2_com::{
    CapturePreviewCompletedHandler,
    Microsoft::Web::WebView2::Win32::{
        ICoreWebView2_15, COREWEBVIEW2_CAPTURE_PREVIEW_IMAGE_FORMAT_PNG,
    },
};

#[cfg(windows)]
pub fn capture_png<R: tauri::Runtime>(
    view: &tauri::Webview<R>,
    path: PathBuf,
) -> Result<(), String> {
    let (tx, rx) = mpsc::channel::<Result<Vec<u8>, String>>();

    view.with_webview(move |platform| {
        #[cfg(windows)]
        unsafe {
            use windows::core::Interface;
            use windows::Win32::UI::Shell::SHCreateMemStream;

            let stream = match SHCreateMemStream(None) {
                Some(stream) => stream,
                None => {
                    let _ = tx.send(Err("Could not allocate WebView2 image stream.".into()));
                    return;
                }
            };

            let read_stream = match stream.Clone() {
                Ok(clone) => clone,
                Err(error) => {
                    let _ = tx.send(Err(error.to_string()));
                    return;
                }
            };

            let sender = tx.clone();
            let handler = CapturePreviewCompletedHandler::create(Box::new(move |result| {
                if let Err(error) = result {
                    let _ = sender.send(Err(error.to_string()));
                    return Err(error.into());
                }

                let mut data = Vec::new();
                let mut buffer = [0u8; 8192];

                loop {
                    let mut read = 0u32;
                    if let Err(error) = read_stream.Read(
                        buffer.as_mut_ptr() as *mut _,
                        buffer.len() as u32,
                        Some(&mut read),
                    ) {
                        let _ = sender.send(Err(error.to_string()));
                        return Ok(());
                    }

                    if read == 0 {
                        break;
                    }
                    data.extend_from_slice(&buffer[..read as usize]);
                }

                let _ = sender.send(Ok(data));
                Ok(())
            }));

            let controller = match platform.controller().CoreWebView2() {
                Ok(core) => core,
                Err(error) => {
                    let _ = tx.send(Err(error.to_string()));
                    return;
                }
            };

            let core = match controller.cast::<ICoreWebView2_15>() {
                Ok(core) => core,
                Err(error) => {
                    let _ = tx.send(Err(format!("WebView2 CapturePreview is unavailable: {error}")));
                    return;
                }
            };

            if let Err(error) = core.CapturePreview(
                COREWEBVIEW2_CAPTURE_PREVIEW_IMAGE_FORMAT_PNG,
                &stream,
                &handler,
            ) {
                let _ = tx.send(Err(error.to_string()));
            }
        }
    }).map_err(|e| e.to_string())?;

    let bytes = rx.recv().map_err(|_| "Screenshot callback was cancelled.".to_string())??;
    fs::write(path, bytes).map_err(|e| e.to_string())
}

#[cfg(not(windows))]
pub fn capture_png<R: tauri::Runtime>(
    _view: &tauri::Webview<R>,
    _path: PathBuf,
) -> Result<(), String> {
    Err("Native WebView2 screenshot capture is only available on Windows.".into())
}


#[cfg(windows)]
pub fn print_pdf<R: tauri::Runtime>(
    view: &tauri::Webview<R>,
    path: PathBuf,
) -> Result<(), String> {
    let (tx, rx) = mpsc::channel::<Result<(), String>>();

    view.with_webview(move |platform| {
        #[cfg(windows)]
        unsafe {
            use webview2_com::{
                Microsoft::Web::WebView2::Win32::{
                    ICoreWebView2_7, ICoreWebView2Environment6,
                },
                PrintToPdfCompletedHandler, CoTaskMemPWSTR,
            };
            use windows::core::Interface;

            let environment = match platform.environment() {
                env => env,
            };
            let environment6 = match environment.cast::<ICoreWebView2Environment6>() {
                Ok(env) => env,
                Err(error) => {
                    let _ = tx.send(Err(format!("WebView2 PDF support is unavailable: {error}")));
                    return;
                }
            };
            let settings = match environment6.CreatePrintSettings() {
                Ok(settings) => settings,
                Err(error) => {
                    let _ = tx.send(Err(error.to_string()));
                    return;
                }
            };
            let core = match platform.controller().CoreWebView2() {
                Ok(core) => core,
                Err(error) => {
                    let _ = tx.send(Err(error.to_string()));
                    return;
                }
            };
            let core7 = match core.cast::<ICoreWebView2_7>() {
                Ok(core) => core,
                Err(error) => {
                    let _ = tx.send(Err(format!("WebView2 PrintToPdf is unavailable: {error}")));
                    return;
                }
            };

            let destination = CoTaskMemPWSTR::from(path.to_string_lossy().as_ref());
            let sender = tx.clone();
            let handler = PrintToPdfCompletedHandler::create(Box::new(move |result| {
                if let Err(error) = result {
                    let _ = sender.send(Err(error.to_string()));
                } else {
                    let _ = sender.send(Ok(()));
                }
                Ok(())
            }));

            if let Err(error) = core7.PrintToPdf(
                &destination,
                &settings,
                &handler,
            ) {
                let _ = tx.send(Err(error.to_string()));
            }
        }
    }).map_err(|e| e.to_string())?;

    rx.recv().map_err(|_| "PDF callback was cancelled.".to_string())?
}

#[cfg(not(windows))]
pub fn print_pdf<R: tauri::Runtime>(
    _view: &tauri::Webview<R>,
    _path: PathBuf,
) -> Result<(), String> {
    Err("Native WebView2 PDF export is only available on Windows.".into())
}
