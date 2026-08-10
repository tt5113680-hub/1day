# Human-readable unattended monitor (first run + last run + next eligible).
param([switch]$Json)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/unattended-scheduler.ps1"

$status = Get-UnattendedStatus

if ($Json) {
  $status | ConvertTo-Json -Depth 6
  exit 0
}

Write-Output '=== ONEDAY V3 Unattended Status ==='
Write-Output ("Lock active:     {0}" -f $status.lockActive)
Write-Output ("G1 ready:        {0}" -f $status.g1Ready)
Write-Output ("Total runs:      {0}" -f $status.runNumber)

if ($status.lastRun) {
  $l = $status.lastRun
  Write-Output ''
  Write-Output '--- Last run ---'
  Write-Output ("  #              {0}" -f $l.runNumber)
  Write-Output ("  Result         {0} (exit {1})" -f $l.exitLabel, $l.exitCode)
  Write-Output ("  Profile        {0}" -f $l.profile)
  Write-Output ("  Duration       {0} min (max {1} min)" -f $l.durationMinutes, $l.maxMinutes)
  Write-Output ("  Started        {0}" -f $l.startedAt)
  Write-Output ("  Ended          {0}" -f $l.endedAt)
  Write-Output ("  Commits        {0}" -f $l.commitsPushed)
  Write-Output ("  Log            {0}" -f $l.runLog)
  if ($l.firstRun -eq $true) {
    Write-Output '  >> First run recorded — check log above for agent output'
  }
} else {
  Write-Output ''
  Write-Output '--- Last run ---'
  Write-Output '  (none yet — waiting for first orchestrator run)'
}

Write-Output ''
Write-Output '--- Next schedule ---'
$s = $status.nextSchedule
Write-Output ("  Profile        {0}" -f $s.profile)
Write-Output ("  Max minutes    {0}" -f $s.maxMinutes)
Write-Output ("  Wait after run {0} min" -f $s.waitMinutes)
Write-Output ("  Reason         {0}" -f $s.reason)

Write-Output ''
Write-Output '--- Should run now? ---'
Write-Output ("  {0}" -f $(if ($status.shouldRun.ok) { 'YES — ' + $status.shouldRun.reason } else { 'NO — ' + $status.shouldRun.reason }))
if ($status.shouldRun.eligibleAt) {
  Write-Output ("  Eligible at    {0}" -f $status.shouldRun.eligibleAt)
}

Write-Output ''
Write-Output 'Tip: pnpm unattended:status  |  force one turn: pnpm unattended:once -- -Force'
