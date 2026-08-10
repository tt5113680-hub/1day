# Register Windows Scheduled Task (schtasks — broad Windows compatibility).
param(
  [int]$PollMinutes = 0
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/unattended-scheduler.ps1"
if ($PollMinutes -le 0) { $PollMinutes = Get-PollMinutes }

$root = Split-Path -Parent $PSScriptRoot
$orchestrator = Join-Path $root 'scripts/local-unattended-orchestrator.ps1'
$taskName = 'ONEDAY-V3-Unattended-Construction'

if (-not (Test-Path $orchestrator)) {
  throw "Missing orchestrator: $orchestrator"
}

$tr = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$orchestrator`""
$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
cmd /c "schtasks /Delete /TN `"$taskName`" /F" 2>$null | Out-Null
$create = cmd /c "schtasks /Create /TN `"$taskName`" /TR `"$tr`" /SC MINUTE /MO $PollMinutes /F" 2>&1
$ErrorActionPreference = $prev
if ($LASTEXITCODE -ne 0) {
  throw "schtasks create failed: $create"
}

Write-Output "Registered: $taskName (every ${PollMinutes} minutes via schtasks)"
Write-Output 'Monitor: pnpm unattended:status  |  Live: pnpm unattended:dashboard'
Write-Output 'Force one turn: powershell -File scripts/local-unattended-orchestrator.ps1 -Force'
Write-Output "Remove: schtasks /Delete /TN `"$taskName`" /F"
