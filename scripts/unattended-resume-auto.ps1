# Re-enable full auto unattended (scheduled task + optional logon daemon).
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/unattended-scheduler.ps1"

$taskName = 'ONEDAY-V3-Unattended-Construction'
$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
cmd /c "schtasks /Query /TN `"$taskName`" /FO LIST" 2>$null | Out-Null
$taskMissing = ($LASTEXITCODE -ne 0)
cmd /c "schtasks /Change /TN `"$taskName`" /ENABLE" 2>$null | Out-Null
$ErrorActionPreference = $prev
if ($taskMissing) {
  & "$PSScriptRoot/install-local-unattended-task.ps1"
}

$daemonName = 'ONEDAY-V3-Unattended-Daemon'
$ErrorActionPreference = 'Continue'
cmd /c "schtasks /Query /TN `"$daemonName`" /FO LIST" 2>$null | Out-Null
$daemonMissing = ($LASTEXITCODE -ne 0)
cmd /c "schtasks /Change /TN `"$daemonName`" /ENABLE" 2>$null | Out-Null
$ErrorActionPreference = $prev
if ($daemonMissing) {
  & "$PSScriptRoot/install-logon-daemon.ps1"
}

Write-Output 'AUTO MODE ON — no watching required. Appear only at G1 READY.'
Write-Output 'Optional glance: pnpm unattended:status (not required)'
