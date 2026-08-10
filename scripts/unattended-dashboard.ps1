# Live progress dashboard (30s refresh): countdown, step, %, ETA.
param(
  [int]$RefreshSeconds = 30
)

$ErrorActionPreference = 'Stop'

function Show-Dashboard {
  . "$PSScriptRoot/unattended-progress.ps1"
  $r = Get-Phase1ProgressReport
  if ($r.error) {
    Write-Output $r.error
    return
  }

  Clear-Host
  $now = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Output ''
  Write-Output '  ============================================================'
  Write-Output '       ONEDAY V3  Phase-1  Progress Board'
  Write-Output "       Updated: $now  (refresh ${RefreshSeconds}s, Ctrl+C exit)"
  Write-Output '  ============================================================'
  Write-Output ''
  Write-Output ('  ' + $r.progressBar)
  Write-Output ("  Done {0}%    Remain {1}%" -f $r.percentDone, $r.percentRemain)
  Write-Output ''
  Write-Output '  --- Current step ---'
  Write-Output ("  >> {0}" -f $r.currentStep)
  Write-Output ("  AI slices left: {0}" -f $r.pendingCount)
  Write-Output ''
  Write-Output '  --- Countdown ---'
  $cd = $r.countdown
  switch ($cd.mode) {
    'running' {
      Write-Output ('  [BUILDING] elapsed {0}' -f (Format-Countdown $cd.elapsed))
      Write-Output ('  turn cap {0} min, ~{1} left' -f $cd.maxMinutes, (Format-Countdown $cd.remaining))
    }
    'ready' {
      Write-Output '  [READY] previous finished — starting next'
      Write-Output '  countdown  00:00:00'
    }
    default {
      Write-Output ("  [WAIT] {0}" -f $cd.label)
      Write-Output ('  next check in {0}  (poll every {1} min)' -f (Format-Countdown $cd.remaining), $cd.pollMinutes)
    }
  }
  Write-Output ''
  Write-Output '  --- ETA (AI work until G1 ready) ---'
  Write-Output ("  ~{0} hours  ->  {1}" -f $r.eta.etaHours, $r.eta.etaAt)
  Write-Output ("  ({0})" -f $r.eta.assumption)
  Write-Output ''
  Write-Output '  --- Unattended ---'
  Write-Output ("  runs {0}  lock {1}  G1 {2}" -f $r.runNumber, $r.lockActive, $r.g1Ready)
  if ($r.lastRun) {
    Write-Output ("  last #{0} {1}  {2}min  commits {3}" -f $r.lastRun.runNumber, $r.lastRun.exitLabel, $r.lastRun.durationMinutes, $r.lastRun.commitsPushed)
  }
  Write-Output ''
  Write-Output '  --- Pending (AI) ---'
  if ($r.pendingCount -eq 0) {
    Write-Output '    (none — G1 packaging or owner test)'
  } else {
    $i = 1
    foreach ($label in $r.pendingLabels) {
      Write-Output ("    {0}. {1}" -f $i, $label)
      $i++
    }
  }
  Write-Output ''
  Write-Output '  --- Owner gates (not in AI %) ---'
  foreach ($g in $r.ownerGates) {
    Write-Output ("    [{0}] {1}" -f $g.status, $g.label)
  }
  Write-Output ''
}

while ($true) {
  Show-Dashboard
  Start-Sleep -Seconds $RefreshSeconds
}
