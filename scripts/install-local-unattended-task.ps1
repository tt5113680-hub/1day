# Register Windows Scheduled Task with adaptive orchestrator (poll every N minutes).
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

$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$orchestrator`"" `
  -WorkingDirectory $root

$triggerBoot = New-ScheduledTaskTrigger -AtStartup
$triggerRepeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2)
$triggerRepeat.Repetition = New-ScheduledTaskRepetition `
  -Interval (New-TimeSpan -Minutes $PollMinutes) `
  -Duration ([TimeSpan]::MaxValue)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 4)

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger @($triggerBoot, $triggerRepeat) `
  -Settings $settings `
  -Description 'ONEDAY V3 adaptive local headless construction (orchestrator gates cooldown + task size)' `
  -Force | Out-Null

Write-Output "Registered: $taskName"
Write-Output "Poll every ${PollMinutes}m — orchestrator skips if previous run still active or in cooldown"
Write-Output 'Monitor: pnpm unattended:status'
Write-Output 'Force one turn: powershell -File scripts/local-unattended-orchestrator.ps1 -Force'
Write-Output "Remove: Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false"
