# 24h dedicated build machine: poll every 10m, chain next task when previous finished.
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

Write-Log "DAEMON chain-mode poll=${PollMinutes}m — check prev task, then start next if ready"

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
    # Loud signal when lock is blocking DeepSeek (should self-heal via TTL; if not, owner alert file exists)
    if ("$($gate.reason)" -match 'lock') {
      $info = Get-ConstructionLockInfo
      if ($info.exists -and $info.ageMinutes -ge 60) {
        Write-UnattendedOwnerAlert ("DeepSeek blocked by lock for {0}m holder={1} pid={2} — health will auto-clear when stale" -f $info.ageMinutes, $info.holder, $info.pid)
      }
    }
  }

  Write-Log "DAEMON sleep ${PollMinutes}m until next check"
  Start-Sleep -Seconds ($PollMinutes * 60)
}
