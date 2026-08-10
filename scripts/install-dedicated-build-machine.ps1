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
  UNATTENDED_POLL_MINUTES     = '10'
  UNATTENDED_MIN_INTERVAL_MIN = '10'
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

& "$PSScriptRoot/install-local-unattended-task.ps1" -PollMinutes 10

Write-Output ''
Write-Output '=== Dedicated build machine ready ==='
Write-Output 'Every 10 min: if previous task finished -> start next task'
Write-Output 'Monitor:  pnpm unattended:dashboard   (live % + countdown)'
Write-Output 'Snapshot: pnpm unattended:status'
Write-Output 'Logs:    logs/unattended/daemon.log'
if (-not $CursorApiKey) {
  Write-Output 'ACTION: set CURSOR_API_KEY in .env.local-unattended if not already set'
}
