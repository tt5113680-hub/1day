# 6-hour (or on-demand) unattended health check.
# Detects: active BLOCKED_REPORT, construction stall, lock stuck, G1 false-stop.
# Exit: 0 = OK, 2 = ALERT (needs attention), 1 = script error
param(
  [int]$StallHours = 6,
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

# --- Lock stuck ---
$lockActive = Test-ConstructionLockActive
if ($lockActive) {
  $lockPath = Join-Path $paths.LogDir 'construction.lock'
  $lockAgeH = 0
  if (Test-Path $lockPath) {
    $lockAgeH = [math]::Round((($now) - (Get-Item $lockPath).LastWriteTime).TotalHours, 1)
  }
  if ($lockAgeH -ge 3) {
    Add-Alert ("construction.lock stuck ~{0}h — possible hung turn" -f $lockAgeH)
  } else {
    Add-Note ("construction lock active ({0}h) — turn may be running" -f $lockAgeH)
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
  } elseif ($hoursSinceLast -ge $StallHours) {
    Add-Alert ("No completed construction for {0}h (threshold {1}h) — stall" -f $hoursSinceLast, $StallHours)
  } else {
    Add-Note ("Last construction {0}h ago (OK under {1}h)" -f $hoursSinceLast, $StallHours)
  }
}

# --- Daemon heartbeat ---
$daemonLog = Join-Path $paths.LogDir 'daemon.log'
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

$report = [ordered]@{
  checkedAt         = $now.ToString('o')
  healthy           = ($alerts.Count -eq 0)
  alertCount        = $alerts.Count
  alerts            = @($alerts)
  notes             = @($notes)
  blockedActive     = $blockedActive
  g1Ready           = $g1Ready
  lockActive        = $lockActive
  hoursSinceLastRun = $hoursSinceLast
  stallHours        = $StallHours
  daemonAgeHours    = $daemonAgeH
  branch            = "$branch"
  tip               = "$tip"
  nextAction        = $(
    if ($alerts.Count -eq 0) { 'continue construction' }
    elseif ($blockedActive) { 'clear/resolve BLOCKED_REPORT.md then pnpm unattended:status' }
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
    Write-Output '=== ONEDAY unattended health (6h cadence) ==='
    Write-Output ("  healthy: {0}" -f $report.healthy)
    Write-Output ("  checked: {0}" -f $report.checkedAt)
    Write-Output ("  tip:     {0}" -f $report.tip)
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
