/// Service boundaries required by the Synth Browser architecture.
/// Concrete implementations can be swapped without changing the browser UI.
pub trait DownloadService {}
pub trait HistoryStore {}
pub trait BookmarkStore {}
pub trait WorkspaceStore {}
pub trait PermissionStore {}
pub trait SettingsStore {}
pub trait DiagnosticsService {}
pub trait UpdateService {}
