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

  # Cost guard first: no slice → never call orchestrator / DeepSeek
  if (Test-NoAuthorizedEngineeringSlice) {
    $idleWait = Get-IdleNoSliceWaitMinutes
    Write-Log "DAEMON IDLE_NO_SLICE — refusing DeepSeek; sleep ${idleWait}m (cost guard)"
    Write-UnattendedOwnerAlert ("COST GUARD idle: no authorized slice — daemon sleeping {0}m without API" -f $idleWait)
    $why = Wait-UnattendedIdle -MaxMinutes $idleWait
    Write-Log "DAEMON resume reason=$why (still subject to cost guard)"
    continue
  }

  $gate = Test-ShouldRunNow
  if ($gate.ok) {
    Write-Log 'DAEMON prev finished — starting next task'
    $orchestrator = Join-Path $PSScriptRoot 'local-unattended-orchestrator.ps1'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $orchestrator
    $code = $LASTEXITCODE
    Write-Log "DAEMON turn finished exit=$code"
    if ($code -eq 5) {
      $idleWait = Get-IdleNoSliceWaitMinutes
      Write-Log "DAEMON exit=IDLE_NO_SLICE — sleep ${idleWait}m without chaining"
      $why = Wait-UnattendedIdle -MaxMinutes $idleWait
      Write-Log "DAEMON resume reason=$why"
      continue
    }
  } else {
    Write-Log "DAEMON monitor: $($gate.reason)"
    if ("$($gate.reason)" -match 'lock') {
      $info = Get-ConstructionLockInfo
      if ($info.exists -and $info.ageMinutes -ge 60) {
        Write-UnattendedOwnerAlert ("DeepSeek blocked by lock for {0}m holder={1} pid={2} — health will auto-clear when stale" -f $info.ageMinutes, $info.holder, $info.pid)
      }
    }
    if ($gate.idle -or ("$($gate.reason)" -match 'cost guard|no authorized')) {
      $idleWait = if ($gate.waitMinutes) { [int]$gate.waitMinutes } else { Get-IdleNoSliceWaitMinutes }
      Write-Log "DAEMON cost-guard wait ${idleWait}m"
      $why = Wait-UnattendedIdle -MaxMinutes $idleWait
      Write-Log "DAEMON resume reason=$why"
      continue
    }
  }

  Write-Log "DAEMON wait up to ${PollMinutes}m (15s slices; wakes on lock-release / .wake / cooldown end)"
  $why = Wait-UnattendedIdle -MaxMinutes $PollMinutes
  Write-Log "DAEMON resume reason=$why"
}
