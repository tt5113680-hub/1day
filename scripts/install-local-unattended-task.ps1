# Register Windows Scheduled Task: ONEDAY-V3-Unattended-Construction
# Run once as the logged-in user (no admin required for per-user task).
param(
  [int]$IntervalMinutes = 30
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $root 'scripts/local-unattended-construction.ps1'
$taskName = 'ONEDAY-V3-Unattended-Construction'

if (-not (Test-Path $runner)) {
  throw "Missing runner: $runner"
}

$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`"" `
  -WorkingDirectory $root

$triggerBoot = New-ScheduledTaskTrigger -AtStartup
$triggerRepeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2)
$triggerRepeat.Repetition = New-ScheduledTaskRepetition `
  -Interval (New-TimeSpan -Minutes $IntervalMinutes) `
  -Duration ([TimeSpan]::MaxValue)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 3)

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger @($triggerBoot, $triggerRepeat) `
  -Settings $settings `
  -Description 'ONEDAY V3 Phase-1 local headless construction (Cursor CLI)' `
  -Force | Out-Null

Write-Output "Registered scheduled task: $taskName (every ${IntervalMinutes}m + at startup)"
Write-Output 'One-time: copy .env.local-unattended.example -> .env.local-unattended and set CURSOR_API_KEY'
Write-Output 'Logs: logs/unattended/daemon.log and logs/unattended/run-*.log'
Write-Output "Remove: Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false"
