# Verify local unattended deployment readiness.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/unattended-scheduler.ps1"
. "$PSScriptRoot/unattended-progress.ps1"

$root = Split-Path -Parent $PSScriptRoot
$issues = @()

$envFile = Join-Path $root '.env.local-unattended'
if (-not (Test-Path $envFile)) {
  $issues += 'MISSING: .env.local-unattended (copy from .env.local-unattended.example)'
} else {
  Load-UnattendedEnv
}

$executor = Get-UnattendedExecutor
if ($executor -eq 'opencode') {
  if (-not (Get-Command opencode -ErrorAction SilentlyContinue)) {
    $issues += 'MISSING: OpenCode CLI (npm install -g opencode-ai)'
  }
  if (-not (Test-DeepSeekApiKey)) {
    $issues += 'MISSING: DEEPSEEK_API_KEY in .env.local-unattended'
  }
} else {
  if (-not (Get-Command agent -ErrorAction SilentlyContinue)) {
    $issues += 'MISSING: Cursor agent CLI (irm https://cursor.com/install?win32=true | iex)'
  }
  if (-not (Test-AgentAuthenticated)) {
    $issues += 'MISSING: CURSOR_API_KEY in .env.local-unattended OR run: agent login'
  }
}

if (Test-ActiveBlockedReport) {
  $issues += 'BLOCKED: PROJECT_STATE/BLOCKED_REPORT.md is active'
}

$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
cmd /c "schtasks /Query /TN ONEDAY-V3-Unattended-Construction /FO LIST" 2>$null | Out-Null
$ErrorActionPreference = $prev
if ($LASTEXITCODE -ne 0) {
  $issues += 'MISSING: scheduled task (run pnpm unattended:install:dedicated)'
}

Write-Output '=== Unattended deploy verify ==='
Write-Output "  executor: $executor"
if ($issues.Count -eq 0) {
  Write-Output 'READY: all checks passed — construction will run on schedule'
  powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot/unattended-status.ps1"
  exit 0
}

foreach ($i in $issues) { Write-Output "  ! $i" }
Write-Output ''
Write-Output 'Fix the items above, then: pnpm unattended:once -- -Force'
exit 1
