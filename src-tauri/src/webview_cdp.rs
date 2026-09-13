#[cfg(windows)]
use std::sync::mpsc;

#[cfg(windows)]
use webview2_com::{
    CallDevToolsProtocolMethodCompletedHandler, CoTaskMemPWSTR,
};

#[cfg(windows)]
const SAFE_METHODS: &[&str] = &[
    "DOM.getDocument",
    "DOM.getOuterHTML",
    "Runtime.evaluate",
    "Runtime.getProperties",
    "Network.enable",
    "Network.disable",
    "Network.getResponseBody",
    "Page.getResourceTree",
    "Security.enable",
    "Security.disable",
    "Page.getNavigationHistory",
    "Page.getFrameTree",
    "Performance.getMetrics",
];

#[cfg(windows)]
pub fn call<R: tauri::Runtime>(
    view: &tauri::Webview<R>,
    method: &str,
    params: &str,
) -> Result<String, String> {
    if !SAFE_METHODS.contains(&method) {
        return Err(format!("DevTools method is not allowed: {method}"));
    }

    serde_json::from_str::<serde_json::Value>(params)
        .map_err(|e| format!("Invalid DevTools JSON parameters: {e}"))?;

    let (tx, rx) = mpsc::channel::<Result<String, String>>();
    let method=method.to_string();
    let params=params.to_string();

    view.with_webview(move |platform| {
        #[cfg(windows)]
        unsafe {
            use windows::core::PCWSTR;

            let core=match platform.controller().CoreWebView2() {
                Ok(value)=>value,
                Err(error)=>{let _=tx.send(Err(error.to_string()));return;}
            };

            let method_utf=CoTaskMemPWSTR::from(method.as_str());
            let params_utf=CoTaskMemPWSTR::from(params.as_str());
            let sender=tx.clone();

            let handler=CallDevToolsProtocolMethodCompletedHandler::create(
                Box::new(move |error_code,result| {
                    if let Err(error)=error_code {
                        let _=sender.send(Err(error.to_string()));
                    } else {
                        let text=result.to_string().unwrap_or_default();
                        let _=sender.send(Ok(text));
                    }
                    Ok(())
                })
            );

            if let Err(error)=core.CallDevToolsProtocolMethod(
                *method_utf.as_ref().as_pcwstr(),
                *params_utf.as_ref().as_pcwstr(),
                &handler,
            ){
                let _=tx.send(Err(error.to_string()));
            }
        }
    }).map_err(|e|e.to_string())?;

    rx.recv().map_err(|_|"DevTools callback cancelled.".to_string())?
}

#[cfg(not(windows))]
pub fn call<R: tauri::Runtime>(
    _view: &tauri::Webview<R>,
    _method: &str,
    _params: &str,
) -> Result<String,String> {
    Err("DevTools Protocol bridge is only available on Windows WebView2.".into())
}
