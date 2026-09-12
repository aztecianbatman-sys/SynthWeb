use url::Url;

/// Stable application-facing boundary for the browsing engine.
/// The current concrete implementation lives in Tauri/Wry child webviews.
/// A future Azecotron Web Chromium runtime can implement this without
/// changing browser UI or persistence services.
pub trait BrowserRuntime {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn runtime_boundary_is_constructible() {
        let _runtime = TauriWebviewRuntime;
    }
}
