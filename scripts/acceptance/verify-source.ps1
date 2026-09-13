$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent | Split-Path -Parent

Write-Host 'Synth Browser source acceptance audit' -ForegroundColor Cyan

$required = @(
  'frontend/index.html',
  'frontend/styles.css',
  'frontend/main.js',
  'src-tauri/src/main.rs',
  'src-tauri/src/ai.rs',
  'src-tauri/src/updater.rs',
  'src-tauri/src/process_diagnostics.rs',
  'src-tauri/src/webview_capture.rs',
  'src-tauri/src/azecotron_bridge.rs',
  'src-tauri/src/native_host.rs',
  'src-tauri/src/tracker.rs',
  'azecotron/app/BUILD.gn',
  'azecotron/app/azecotron_app_main.cc',
  'azecotron/app/synth_content_main_delegate.cc',
  'azecotron/app/synth_content_browser_client.cc',
  'azecotron/app/synth_browser_main_parts.cc',
  'azecotron/app/synth_browser_context.cc',
  'azecotron/app/synth_tracker_throttle.cc',
  'azecotron/host/azecotron_runtime_host.cc',
  'azecotron/host/azecotron_tab_observer.cc'
)

foreach ($path in $required) {
  if (-not (Test-Path (Join-Path $root $path))) { throw "Missing required source: $path" }
}

$appFiles = Get-ChildItem (Join-Path $root 'azecotron/app') -Recurse -File -Include *.cc,*.h,*.gn
$shellHits = $appFiles | Select-String -Pattern 'content/shell' -SimpleMatch
if ($shellHits) {
  $shellHits | ForEach-Object { Write-Host "FORBIDDEN Content Shell reference: $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
  throw 'Content Shell dependency found under azecotron/app.'
}

$main = Get-Content (Join-Path $root 'src-tauri/src/main.rs') -Raw
$requiredCommands = @(
  'navigate','new_tab','activate_tab','close_tab','reopen_closed_tab',
  'discard_tab','restore_tab','open_session_lazy','search_with_mode',
  'capture_screenshot','save_page_html','print_page_to_pdf',
  'open_devtools','close_devtools','devtools_status',
  'list_current_site_cookies','delete_current_site_cookie','clear_current_site_data',
  'list_site_permissions','set_site_permission','reset_site_permissions',
  'list_extensions','install_extension','set_extension_enabled','remove_extension',
  'create_ai_thread','list_ai_threads','list_ai_messages','delete_ai_thread',
  'record_performance_sample','list_performance_samples','clear_performance_samples',
  'create_browser_window','open_workspace_in_window'
)
foreach ($name in $requiredCommands) {
  if ($main -notmatch "fn\s+$name\s*\(") { throw "Required Tauri command missing: $name" }
}

$mainJs = Get-Content (Join-Path $root 'frontend/main.js') -Raw
if ($mainJs.Length -lt 10000) { throw 'frontend/main.js unexpectedly small.' }

Write-Host 'Source structure: PASS' -ForegroundColor Green
Write-Host 'Content Shell boundary: PASS' -ForegroundColor Green
Write-Host "Required command count: $($requiredCommands.Count)" -ForegroundColor Green
