# 24h dedicated build machine: poll, chain next task when previous finished.
# Sleep is sliced (15s) so IDE lock release wakes DeepSeek immediately.
param(
  [int]$PollMinutes = 0
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/unattended-scheduler.ps1"

if ($PollMinutes -le 0) { $PollMinutes = Get-PollMinutes }

function Write-Log([string]$Message) {
  $paths = Ensure-UnattendedLogDir
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Write-Output $line
  Add-Content -Path (Join-Path $paths.LogDir 'daemon.log') -Value $line -Encoding utf8
}

Write-Log "DAEMON chain-mode poll=${PollMinutes}m slice=15s — lock release / .wake starts next turn without babysitting"

while ($true) {
  if (Test-G1Ready) {
    Write-Log 'DAEMON stop: G1 READY — owner manual test pending'
    break
  }

  $cleared = Clear-StaleConstructionLock
  if ($cleared.cleared) {
    Write-Log ("DAEMON auto-cleared stale lock: {0}" -f $cleared.reason)
  }

  $gate = Test-ShouldRunNow
  if ($gate.ok) {
    Write-Log 'DAEMON prev finished — starting next task'
    $orchestrator = Join-Path $PSScriptRoot 'local-unattended-orchestrator.ps1'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $orchestrator
    $code = $LASTEXITCODE
    Write-Log "DAEMON turn finished exit=$code"
  } else {
    Write-Log "DAEMON monitor: $($gate.reason)"
    if ("$($gate.reason)" -match 'lock') {
      $info = Get-ConstructionLockInfo
      if ($info.exists -and $info.ageMinutes -ge 60) {
        Write-UnattendedOwnerAlert ("DeepSeek blocked by lock for {0}m holder={1} pid={2} — health will auto-clear when stale" -f $info.ageMinutes, $info.holder, $info.pid)
      }
    }
  }

  Write-Log "DAEMON wait up to ${PollMinutes}m (15s slices; wakes on lock-release / .wake / cooldown end)"
  $why = Wait-UnattendedIdle -MaxMinutes $PollMinutes
  Write-Log "DAEMON resume reason=$why"
}
