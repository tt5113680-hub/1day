# One-shot setup for a 24h dedicated build PC (or main PC always on).
param(
  [string]$CursorApiKey = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env.local-unattended'
$example = Join-Path $root '.env.local-unattended.example'

if (-not (Test-Path $example)) { throw "Missing $example" }
if (-not (Test-Path $envFile)) { Copy-Item $example $envFile }

$map = [ordered]@{
  UNATTENDED_CHAIN_MODE       = '1'
  UNATTENDED_POLL_MINUTES     = '20'
  UNATTENDED_MIN_INTERVAL_MIN = '10'
  UNATTENDED_USAGE_LIMIT_WAIT_MIN = '360'
}
if ($CursorApiKey) { $map['CURSOR_API_KEY'] = $CursorApiKey }

$lines = Get-Content $envFile -Encoding utf8
$seen = @{}
$out = New-Object System.Collections.Generic.List[string]
foreach ($line in $lines) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=') {
    $key = $Matches[1]
    if ($map.Contains($key)) {
      $out.Add("$key=$($map[$key])")
      $seen[$key] = $true
      continue
    }
  }
  $out.Add($line)
}
foreach ($key in $map.Keys) {
  if (-not $seen[$key]) { $out.Add("$key=$($map[$key])") }
}
Set-Content -Path $envFile -Value ($out -join "`n") -Encoding utf8

& "$PSScriptRoot/install-local-unattended-task.ps1" -PollMinutes 20
& "$PSScriptRoot/install-logon-daemon.ps1"

Write-Output '=== Dedicated build machine — FULL AUTO (no watching) ==='
Write-Output 'Every 20 min + logon daemon: auto chain tasks until G1 READY'
Write-Output 'At usage limit: auto wait 6h then retry — no owner action'
Write-Output 'Optional: pnpm unattended:status   Logs: logs/unattended/daemon.log'
if (-not $CursorApiKey) {
  Write-Output 'ACTION: set CURSOR_API_KEY in .env.local-unattended if not already set'
}
