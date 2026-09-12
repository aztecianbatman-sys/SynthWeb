//! Explicit application-service boundaries from the Synth Browser architecture.
//! These interfaces are intentionally small so implementations can be swapped
//! without coupling the browser chrome to storage, download, permission, or update logic.

pub trait DownloadService {}
pub trait HistoryStore {}
pub trait BookmarkStore {}
pub trait WorkspaceStore {}
pub trait PermissionStore {}
pub trait SettingsStore {}
pub trait DiagnosticsService {}
pub trait UpdateService {}

/// Marker implementations used by the bootstrap's compile-time boundary check.
/// They contain no browser behavior and are not exposed to the frontend.
pub(crate) struct NullDownloadService;
pub(crate) struct NullHistoryStore;
pub(crate) struct NullBookmarkStore;
pub(crate) struct NullWorkspaceStore;
pub(crate) struct NullPermissionStore;
pub(crate) struct NullSettingsStore;
pub(crate) struct NullDiagnosticsService;
pub(crate) struct NullUpdateService;

impl DownloadService for NullDownloadService {}
impl HistoryStore for NullHistoryStore {}
impl BookmarkStore for NullBookmarkStore {}
impl WorkspaceStore for NullWorkspaceStore {}
impl PermissionStore for NullPermissionStore {}
impl SettingsStore for NullSettingsStore {}
impl DiagnosticsService for NullDiagnosticsService {}
impl UpdateService for NullUpdateService {}
