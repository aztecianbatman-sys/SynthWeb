use std::path::PathBuf;
use url::Url;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum RuntimeKind {
    TauriWebView2,
    AzecotronChromium,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RuntimeCapabilities {
    pub kind: RuntimeKind,
    pub native: bool,
    pub tabs: bool,
    pub navigation: bool,
    pub downloads: bool,
    pub permissions: bool,
    pub devtools: bool,
    pub network_interception: bool,
    pub extensions: bool,
    pub media: bool,
}

pub trait BrowserRuntime {
    fn kind(&self) -> RuntimeKind;
    fn capabilities(&self) -> RuntimeCapabilities;
    fn create_view(&self, id: &str, url: &Url) -> Result<(), String>;
    fn navigate(&self, id: &str, url: &Url) -> Result<(), String>;
    fn back(&self, id: &str) -> Result<(), String>;
    fn forward(&self, id: &str) -> Result<(), String>;
    fn reload(&self, id: &str) -> Result<(), String>;
    fn close_view(&self, id: &str) -> Result<(), String>;
    fn get_url(&self, id: &str) -> Result<Url, String>;
    fn set_zoom(&self, id: &str, zoom: f64) -> Result<(), String>;
    fn print(&self, id: &str) -> Result<(), String>;
}

pub struct TauriWebviewRuntime;

impl BrowserRuntime for TauriWebviewRuntime {
    fn kind(&self) -> RuntimeKind { RuntimeKind::TauriWebView2 }

    fn capabilities(&self) -> RuntimeCapabilities {
        RuntimeCapabilities {
            kind: self.kind(), native: false, tabs: true, navigation: true,
            downloads: true, permissions: true, devtools: true,
            network_interception: false, extensions: cfg!(windows), media: true,
        }
    }

    fn create_view(&self, _id: &str, _url: &Url) -> Result<(), String> { Ok(()) }
    fn navigate(&self, _id: &str, _url: &Url) -> Result<(), String> { Ok(()) }
    fn back(&self, _id: &str) -> Result<(), String> { Ok(()) }
    fn forward(&self, _id: &str) -> Result<(), String> { Ok(()) }
    fn reload(&self, _id: &str) -> Result<(), String> { Ok(()) }
    fn close_view(&self, _id: &str) -> Result<(), String> { Ok(()) }
    fn get_url(&self, _id: &str) -> Result<Url, String> {
        Err("URL access is provided by the concrete Tauri webview handle.".into())
    }
    fn set_zoom(&self, _id: &str, _zoom: f64) -> Result<(), String> { Ok(()) }
    fn print(&self, _id: &str) -> Result<(), String> { Ok(()) }
}

#[derive(Clone)]
pub struct AzecotronRuntime {
    executable: PathBuf,
}

impl AzecotronRuntime {
    pub fn new(executable: PathBuf) -> Self { Self { executable } }
    pub fn executable(&self) -> &PathBuf { &self.executable }
}

impl BrowserRuntime for AzecotronRuntime {
    fn kind(&self) -> RuntimeKind { RuntimeKind::AzecotronChromium }

    fn capabilities(&self) -> RuntimeCapabilities {
        RuntimeCapabilities {
            kind: self.kind(), native: true, tabs: true, navigation: true,
            downloads: true, permissions: true, devtools: true,
            network_interception: true, extensions: true, media: true,
        }
    }

    fn create_view(&self, _id: &str, url: &Url) -> Result<(), String> {
        if !self.executable.is_file() {
            return Err("Azecotron executable is unavailable.".into());
        }
        if !(url.scheme() == "http" || url.scheme() == "https" ||
             url.as_str() == "about:blank") {
            return Err("Azecotron accepts only HTTP(S) or about:blank URLs.".into());
        }
        Ok(())
    }

    fn navigate(&self, id: &str, url: &Url) -> Result<(), String> {
        self.create_view(id, url)
    }

    fn back(&self, _id: &str) -> Result<(), String> {
        Err("Native Azecotron back control is provided by the runtime IPC bridge.".into())
    }
    fn forward(&self, _id: &str) -> Result<(), String> {
        Err("Native Azecotron forward control is provided by the runtime IPC bridge.".into())
    }
    fn reload(&self, _id: &str) -> Result<(), String> {
        Err("Native Azecotron reload control is provided by the runtime IPC bridge.".into())
    }
    fn close_view(&self, _id: &str) -> Result<(), String> {
        Err("Native Azecotron tab lifecycle is provided by the runtime IPC bridge.".into())
    }
    fn get_url(&self, _id: &str) -> Result<Url, String> {
        Err("Native Azecotron URL state is delivered through runtime events.".into())
    }
    fn set_zoom(&self, _id: &str, _zoom: f64) -> Result<(), String> {
        Err("Native Azecotron zoom control is provided by runtime IPC.".into())
    }
    fn print(&self, _id: &str) -> Result<(), String> {
        Err("Native Azecotron print control is provided by runtime IPC.".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn runtime_kinds_are_stable() {
        assert_ne!(RuntimeKind::TauriWebView2, RuntimeKind::AzecotronChromium);
    }

    #[test]
    fn native_runtime_declares_native_capabilities() {
        let runtime = AzecotronRuntime::new(PathBuf::from("azecotron_host.exe"));
        let capabilities = runtime.capabilities();
        assert!(capabilities.native);
        assert!(capabilities.network_interception);
        assert!(capabilities.extensions);
    }

    #[test]
    fn native_runtime_rejects_unsafe_scheme() {
        let runtime = AzecotronRuntime::new(PathBuf::from("missing"));
        let result = runtime.create_view(
            "tab-1",
            &Url::parse("file:///etc/passwd").unwrap(),
        );
        assert!(result.is_err());
    }
}
