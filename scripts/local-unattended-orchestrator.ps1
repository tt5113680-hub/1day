# Gate + adaptive limits, then run one construction turn.
param([switch]$Force)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/unattended-scheduler.ps1"

function Write-Log([string]$Message) {
  $paths = Ensure-UnattendedLogDir
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Write-Output $line
  Add-Content -Path (Join-Path $paths.LogDir 'daemon.log') -Value $line -Encoding utf8
}

$gate = Test-ShouldRunNow -Force:$Force
if (-not $gate.ok) {
  Write-Log "ORCHESTRATOR SKIP: $($gate.reason)"
  exit 0
}

$schedule = $gate.schedule
if (-not $schedule) {
  $schedule = Get-AdaptiveSchedule
}

Write-Log "ORCHESTRATOR RUN profile=$($schedule.profile) max=$($schedule.maxMinutes)m reason=$($schedule.reason)"

$runner = Join-Path $PSScriptRoot 'local-unattended-construction.ps1'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runner `
  -MaxMinutes ([int]$schedule.maxMinutes) `
  -Profile $schedule.profile

exit $LASTEXITCODE
