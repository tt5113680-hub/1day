# Human-readable unattended monitor + Phase-1 progress summary.
param([switch]$Json)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/unattended-scheduler.ps1"
. "$PSScriptRoot/unattended-progress.ps1"

$status = Get-UnattendedStatus
$progress = Get-Phase1ProgressReport

if ($Json) {
  @{ unattended = $status; phase1 = $progress } | ConvertTo-Json -Depth 8
  exit 0
}

Write-Output ''
Write-Output '============================================================'
Write-Output '  ONEDAY V3 construction status'
Write-Output '============================================================'
Write-Output ''
Write-Output ('  Progress  ' + $progress.progressBar)
Write-Output ("  Done {0}%  |  Remain {1}%  |  Slices left {2}" -f $progress.percentDone, $progress.percentRemain, $progress.pendingCount)
Write-Output ("  Step >> {0}" -f $progress.currentStep)
Write-Output ("  ETA G1 ready: ~{0}h ({1})" -f $progress.eta.etaHours, $progress.eta.etaAt)
Write-Output ''

$cd = $progress.countdown
Write-Output '--- Countdown ---'
switch ($cd.mode) {
  'running' {
    Write-Output ("  BUILDING  elapsed {0}" -f (Format-Countdown $cd.elapsed))
    Write-Output ("  turn left ~{0}" -f (Format-Countdown $cd.remaining))
  }
  'ready' { Write-Output '  READY — next turn starting' }
  default {
    Write-Output ("  {0}" -f $cd.label)
    Write-Output ("  next check in {0}" -f (Format-Countdown $cd.remaining))
  }
}

Write-Output ''
Write-Output '--- Unattended ---'
Write-Output ("  runs {0}  |  lock {1}  |  G1 {2}" -f $status.runNumber, $status.lockActive, $status.g1Ready)

if ($status.lastRun) {
  $l = $status.lastRun
  Write-Output ("  last #{0} {1}  {2}min  commits={3}" -f $l.runNumber, $l.exitLabel, $l.durationMinutes, $l.commitsPushed)
}

Write-Output ''
Write-Output 'Live board: pnpm unattended:dashboard'
Write-Output ''
