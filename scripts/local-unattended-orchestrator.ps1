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

$cleared = Clear-StaleConstructionLock
if ($cleared.cleared) {
  Write-Log ("ORCHESTRATOR auto-cleared stale lock: {0}" -f $cleared.reason)
}

$gate = Test-ShouldRunNow -Force:$Force
if (-not $gate.ok) {
  Write-Log "ORCHESTRATOR SKIP: $($gate.reason)"
  if ("$($gate.reason)" -match 'lock') {
    $info = Get-ConstructionLockInfo
    if ($info.exists -and $info.ageMinutes -ge 60) {
      Write-UnattendedOwnerAlert ("ORCHESTRATOR blocked by lock {0}m holder={1}" -f $info.ageMinutes, $info.holder)
    }
  }
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
