# Unattended health check — detects BLOCKED_REPORT, construction stall, lock stuck; auto-clears stale locks.
# Exit: 0 = OK, 2 = ALERT (needs attention), 1 = script error
param(
  [int]$StallHours = 6,
  [int]$IdeLockMaxMinutes = 90,
  [int]$DaemonLockMaxMinutes = 200,
  [switch]$AutoFix,
  [switch]$Json,
  [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/unattended-scheduler.ps1"

$paths = Ensure-UnattendedLogDir
$root = $paths.Root
$now = Get-Date
$alerts = [System.Collections.Generic.List[string]]::new()
$notes = [System.Collections.Generic.List[string]]::new()

function Add-Alert([string]$msg) { [void]$alerts.Add($msg) }
function Add-Note([string]$msg) { [void]$notes.Add($msg) }

# Default: auto-fix stale locks on every health run (daemon + scheduled task).
if (-not $PSBoundParameters.ContainsKey('AutoFix')) { $AutoFix = $true }

# --- BLOCKED_REPORT ---
$blockedActive = Test-ActiveBlockedReport
if ($blockedActive) {
  $blockedPath = Join-Path $root 'PROJECT_STATE/BLOCKED_REPORT.md'
  $ageH = 0
  if (Test-Path $blockedPath) {
    $ageH = [math]::Round((($now) - (Get-Item $blockedPath).LastWriteTime).TotalHours, 1)
  }
  Add-Alert ("BLOCKED_REPORT active for ~{0}h — daemon will not call OpenCode/DeepSeek until RESOLVED" -f $ageH)
} else {
  Add-Note 'BLOCKED_REPORT clear'
}

# --- G1 READY stop ---
if (Test-G1Ready) {
  Add-Note 'G1 READY flag set — unattended waits for owner manual test (expected pause)'
}

# --- Stale lock auto-heal (wrong path bug fixed: use .construction.lock) ---
$lockPath = $paths.LockFile
$clearResult = $null
if ($AutoFix) {
  $clearResult = Clear-StaleConstructionLock -IdeMaxMinutes $IdeLockMaxMinutes -DaemonMaxMinutes $DaemonLockMaxMinutes
  if ($clearResult.cleared) {
    Add-Alert ("AUTO-CLEARED stale lock: {0}" -f $clearResult.reason)
  }
}

$lockInfo = Get-ConstructionLockInfo
$lockActive = [bool]($lockInfo.exists -and $lockInfo.pidAlive)
if ($lockActive) {
  $lockAgeH = [math]::Round($lockInfo.ageMinutes / 60.0, 2)
  if ($lockInfo.isIde -and $lockInfo.ageMinutes -ge 45) {
    Add-Alert ("IDE construction.lock held {0}m holder={1} — DeepSeek blocked; expires/auto-clear at {2}m" -f $lockInfo.ageMinutes, $lockInfo.holder, $IdeLockMaxMinutes)
  } elseif ($lockAgeH -ge 3) {
    Add-Alert ("construction.lock stuck ~{0}h holder={1} pid={2}" -f $lockAgeH, $lockInfo.holder, $lockInfo.pid)
  } else {
    Add-Note ("construction lock active ({0}m) holder={1}" -f $lockInfo.ageMinutes, $lockInfo.holder)
  }
} else {
  Add-Note 'construction lock clear'
}

# --- Skip-storm: only count SKIP-lock lines AFTER current lock started ---
$daemonLog = Join-Path $paths.LogDir 'daemon.log'
$skipStorm = $false
if ((Test-Path $daemonLog) -and $lockActive -and $lockInfo.started) {
  $tail = Get-Content $daemonLog -Tail 80 -ErrorAction SilentlyContinue
  $afterLockSkips = 0
  foreach ($row in $tail) {
    if ($row -notmatch 'still running \(lock\)') { continue }
    if ($row -match '^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]') {
      try {
        $ts = [datetime]::ParseExact($Matches[1], 'yyyy-MM-dd HH:mm:ss', $null)
        if ($ts -ge $lockInfo.started) { $afterLockSkips++ }
      } catch { }
    }
  }
  # Real storm: lock held a while, still only SKIPs, and either IDE forgotten or no opencode burning API
  $opencodeAlive = [bool](Get-Process -Name opencode -ErrorAction SilentlyContinue)
  if ($afterLockSkips -ge 3 -and $lockInfo.ageMinutes -ge 45 -and ($lockInfo.isIde -or -not $opencodeAlive)) {
    $skipStorm = $true
    Add-Alert ("daemon SKIP-lock storm x{0} after lock start — DeepSeek not spending; holder={1} age={2}m" -f $afterLockSkips, $lockInfo.holder, $lockInfo.ageMinutes)
  } elseif ($afterLockSkips -gt 0) {
    Add-Note ("SKIP-lock after current lock: {0} (opencodeAlive={1})" -f $afterLockSkips, $opencodeAlive)
  }
}

# --- Last successful construction stall ---
$last = Read-JsonFile $paths.LastRun
$hoursSinceLast = $null
if ($last -and $last.endedAt) {
  try {
    $ended = [datetime]::Parse($last.endedAt.ToString())
    $hoursSinceLast = [math]::Round(($now - $ended).TotalHours, 1)
  } catch {
    $hoursSinceLast = $null
  }
}

$g1Ready = Test-G1Ready
if (-not $g1Ready -and -not $blockedActive) {
  if ($null -eq $hoursSinceLast) {
    Add-Alert 'No last-run.json endedAt — unattended may never have completed a turn'
  } elseif ($hoursSinceLast -ge $StallHours -and -not $lockActive) {
    Add-Alert ("No completed construction for {0}h (threshold {1}h) — stall" -f $hoursSinceLast, $StallHours)
  } elseif ($hoursSinceLast -ge $StallHours -and $lockActive -and $lockInfo.isIde) {
    Add-Alert ("No completed construction for {0}h AND IDE lock still held — forgotten IDE session" -f $hoursSinceLast)
  } else {
    Add-Note ("Last construction {0}h ago (OK under {1}h)" -f $hoursSinceLast, $StallHours)
  }
}

# --- Daemon heartbeat ---
$daemonAgeH = $null
if (Test-Path $daemonLog) {
  $daemonAgeH = [math]::Round((($now) - (Get-Item $daemonLog).LastWriteTime).TotalHours, 1)
  if ($daemonAgeH -ge $StallHours) {
    Add-Alert ("daemon.log silent for {0}h — scheduled task/daemon may be stopped" -f $daemonAgeH)
  } else {
    Add-Note ("daemon.log touched {0}h ago" -f $daemonAgeH)
  }
} else {
  Add-Alert 'daemon.log missing — unattended daemon may not be installed'
}

# --- Branch tip ---
$branch = ''
$tip = ''
try {
  Push-Location $root
  $branch = (git rev-parse --abbrev-ref HEAD 2>$null)
  $tip = (git log -1 --format='%h %ci %s' 2>$null)
  Pop-Location
} catch {
  if (Get-Location -PSProvider FileSystem | Where-Object Path -eq $root) { Pop-Location }
}

if ($alerts.Count -gt 0) {
  Write-UnattendedOwnerAlert ($alerts -join '; ')
}

$report = [ordered]@{
  checkedAt         = $now.ToString('o')
  healthy           = ($alerts.Count -eq 0)
  alertCount        = $alerts.Count
  alerts            = @($alerts)
  notes             = @($notes)
  blockedActive     = $blockedActive
  g1Ready           = $g1Ready
  lockActive        = $lockActive
  lockHolder        = $(if ($lockInfo) { $lockInfo.holder } else { '' })
  lockAgeMinutes    = $(if ($lockInfo) { $lockInfo.ageMinutes } else { 0 })
  lockPath          = $lockPath
  skipStorm         = $skipStorm
  autoCleared       = [bool]($clearResult -and $clearResult.cleared)
  hoursSinceLastRun = $hoursSinceLast
  stallHours        = $StallHours
  daemonAgeHours    = $daemonAgeH
  branch            = "$branch"
  tip               = "$tip"
  nextAction        = $(
    if ($alerts.Count -eq 0) { 'continue construction' }
    elseif ($blockedActive) { 'clear/resolve BLOCKED_REPORT.md then pnpm unattended:status' }
    elseif ($skipStorm -or ($lockInfo -and $lockInfo.isIde)) { 'stale IDE lock should auto-clear; or: powershell scripts/unattended-ide-lock.ps1 -Action Release' }
    else { 'inspect daemon/logs; force turn if safe: orchestrator -Force' }
  )
}

$outPath = Join-Path $paths.LogDir 'health-latest.json'
Write-JsonFile $outPath $report

$line = '[{0}] healthy={1} alerts={2} {3}' -f $report.checkedAt, $report.healthy, $report.alertCount, ($alerts -join '; ')
Add-Content -Path (Join-Path $paths.LogDir 'health.log') -Value $line -Encoding utf8

if (-not $Quiet) {
  if ($Json) {
    $report | ConvertTo-Json -Depth 6
  } else {
    Write-Output ''
    Write-Output '=== ONEDAY unattended health ==='
    Write-Output ("  healthy: {0}" -f $report.healthy)
    Write-Output ("  checked: {0}" -f $report.checkedAt)
    Write-Output ("  tip:     {0}" -f $report.tip)
    Write-Output ("  lock:    {0}" -f $lockPath)
    if ($notes.Count) {
      Write-Output '  notes:'
      foreach ($n in $notes) { Write-Output ("    - {0}" -f $n) }
    }
    if ($alerts.Count) {
      Write-Output '  ALERTS:'
      foreach ($a in $alerts) { Write-Output ("    ! {0}" -f $a) }
      Write-Output ("  next: {0}" -f $report.nextAction)
    } else {
      Write-Output '  OK — construction pipeline looks alive'
    }
    Write-Output ("  log: {0}" -f $outPath)
    Write-Output ''
  }
}

if ($alerts.Count -gt 0) { exit 2 }
exit 0
