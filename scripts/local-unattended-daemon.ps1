# Adaptive daemon: waits for cooldown, adjusts sleep from last run outcome.
param(
  [int]$PollMinutes = 5
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/unattended-scheduler.ps1"

function Write-Log([string]$Message) {
  $paths = Ensure-UnattendedLogDir
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Write-Output $line
  Add-Content -Path (Join-Path $paths.LogDir 'daemon.log') -Value $line -Encoding utf8
}

Write-Log "DAEMON adaptive start poll=${PollMinutes}m (orchestrator gates each turn)"

while ($true) {
  if (Test-G1Ready) {
    Write-Log 'DAEMON stop: G1 READY — owner manual test pending'
    break
  }

  $gate = Test-ShouldRunNow
  if ($gate.ok) {
    $orchestrator = Join-Path $PSScriptRoot 'local-unattended-orchestrator.ps1'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $orchestrator
    $code = $LASTEXITCODE
    Write-Log "DAEMON turn finished exit=$code"
  } else {
    Write-Log "DAEMON idle: $($gate.reason)"
  }

  $schedule = Read-JsonFile (Join-Path (Get-UnattendedPaths).LogDir 'schedule.json')
  $sleepMin = if ($schedule -and $schedule.waitMinutes) { [int]$schedule.waitMinutes } else { 25 }
  $sleepMin = [Math]::Max($PollMinutes, [Math]::Min(90, $sleepMin))
  Write-Log "DAEMON sleep ${sleepMin}m"
  Start-Sleep -Seconds ($sleepMin * 60)
}
