mod updater;
mod webview_cdp;
mod process_diagnostics;
mod webview_capture;
mod native_host;
mod azecotron_bridge;
mod tracker;
mod services;
mod accessibility;
mod localization;

mod ai;
mod browser_runtime;
mod search;

use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::{Read, BufReader};
use std::{
    collections::VecDeque,
    fs,
    path::{Path, PathBuf},
    sync::{atomic::{AtomicU64, Ordering}, Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{
    path::BaseDirectory,
    menu::{Menu, MenuItem},
    webview::{DownloadEvent, NewWindowResponse, PageLoadEvent, PermissionKind, PermissionResponse, WebviewBuilder, WebviewUrl},
    Emitter, LogicalPosition, LogicalSize, Manager, State, WebviewWindowBuilder, WindowEvent,
};
use thiserror::Error;
use url::Url;

const CHROME_HEIGHT: f64 = 112.0;

#[derive(Debug, Error)]
enum AppError {
    #[error("{0}")]
    Message(String),
    #[error("database error: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}

type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Tab {
    id: String,
    title: String,
    url: String,
    pinned: bool,
    muted: bool,
    favicon: Option<String>,
    private: bool,
    loading: bool,
    workspace: String,
    has_webview: bool,
}
