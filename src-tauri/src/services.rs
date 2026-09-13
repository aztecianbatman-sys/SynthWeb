//! Explicit application-service boundaries used by Synth Browser.
//! The concrete source-level storage adapter is Db; native Chromium services
//! can replace individual implementations behind these stable seams.

pub trait DownloadService {}
pub trait HistoryStore {}
pub trait BookmarkStore {}
pub trait WorkspaceStore {}
pub trait PermissionStore {}
pub trait SettingsStore {}
pub trait DiagnosticsService {}
pub trait UpdateService {}
pub trait PerformanceService {}
pub trait LocalizationService {}
pub trait AccessibilityService {}
pub trait ExtensionStore {}

impl DownloadService for crate::Db {}
impl HistoryStore for crate::Db {}
impl BookmarkStore for crate::Db {}
impl WorkspaceStore for crate::Db {}
impl PermissionStore for crate::Db {}
impl SettingsStore for crate::Db {}
impl DiagnosticsService for crate::Db {}
impl UpdateService for crate::Db {}
impl PerformanceService for crate::Db {}
impl ExtensionStore for crate::Db {}

pub(crate) struct RuntimeLocalizationService;
pub(crate) struct RuntimeAccessibilityService;
impl LocalizationService for RuntimeLocalizationService {}
impl AccessibilityService for RuntimeAccessibilityService {}
