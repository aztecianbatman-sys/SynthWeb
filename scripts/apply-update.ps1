param(
  [Parameter(Mandatory=$true)][string]$PendingFile,
  [switch]$Rollback
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $PendingFile)) { throw "Pending update file not found." }

$pending = Get-Content -LiteralPath $PendingFile -Raw | ConvertFrom-Json
$current = [System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
$staged = [string]$pending.staged_path
$backup = [string]$pending.backup_path

if ($Rollback) {
  if (-not (Test-Path -LiteralPath $backup)) { throw "Rollback backup not found." }
  $temp = "$current.rollback.tmp"
  Copy-Item -LiteralPath $backup -Destination $temp -Force
  Move-Item -LiteralPath $temp -Destination $current -Force
  Remove-Item -LiteralPath $PendingFile -Force -ErrorAction SilentlyContinue
  exit 0
}

if (-not (Test-Path -LiteralPath $staged)) { throw "Staged update artifact not found." }
$sha = (Get-FileHash -Algorithm SHA256 -LiteralPath $staged).Hash.ToLowerInvariant()
if ($sha -ne ([string]$pending.sha256).ToLowerInvariant()) { throw "Staged artifact checksum mismatch." }

$temp = "$current.update.tmp"
Copy-Item -LiteralPath $staged -Destination $temp -Force
Move-Item -LiteralPath $temp -Destination $current -Force
Remove-Item -LiteralPath $PendingFile -Force -ErrorAction SilentlyContinue
