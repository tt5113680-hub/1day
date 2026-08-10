# Phase-1 progress computation + ETA for owner dashboard.
param()

function Get-UnattendedRoot {
  Split-Path -Parent $PSScriptRoot
}

function Read-ProgressFile {
  $path = Join-Path (Get-UnattendedRoot) 'PROJECT_STATE/PHASE1_PROGRESS.json'
  if (-not (Test-Path $path)) { return $null }
  try {
    return (Get-Content $path -Raw -Encoding utf8 | ConvertFrom-Json)
  } catch {
    return $null
  }
}

function Test-G1ReadyInternal([string]$Root) {
  $handoff = Join-Path $Root 'PROJECT_STATE/LATEST_HANDOFF.md'
  if (-not (Test-Path $handoff)) { return $false }
  $text = Get-Content $handoff -Raw -Encoding utf8
  return $text -match 'G1\s*READY|G1_READY|g1 ready'
}

function Sync-ProgressAutoDetect {
  $root = Get-UnattendedRoot
  $progress = Read-ProgressFile
  if (-not $progress) { return $null }

  $checks = @{
    'p1-a'                  = Test-Path (Join-Path $root 'PROJECT_STATE/P1_A_COMMERCIAL_CLOSED_LOOP_ACCEPTANCE.md')
    'p1-b-login'            = Test-Path (Join-Path $root 'PROJECT_STATE/P1_B_SESSION_LOGIN_ACCEPTANCE.md')
    'p1-c-deploy-templates' = Test-Path (Join-Path $root 'infra/deploy/pilot.compose.yaml')
    'p1-g1-packaging'       = (Test-G1ReadyInternal $root)
  }

  foreach ($m in $progress.milestones) {
    if ($checks.ContainsKey($m.id) -and $checks[$m.id]) {
      if ($m.status -ne 'pass') { $m.status = 'pass' }
    }
  }
  return $progress
}

function Get-MilestonePercent($Progress) {
  $done = 0
  $total = 0
  $pending = @()
  $current = $null
  foreach ($m in $Progress.milestones) {
    $w = [double]$m.weight
    $total += $w
    switch ($m.status) {
      'pass' { $done += $w }
      'in_progress' {
        $done += ($w * 0.5)
        if (-not $current) { $current = $m.label }
      }
      default {
        if (-not $current) { $current = $m.label }
        $pending += $m
      }
    }
  }
  if (-not $current -and $Progress.currentStep) { $current = $Progress.currentStep }
  @{
    percentDone   = if ($total -gt 0) { [Math]::Round(($done / $total) * 100, 1) } else { 0 }
    percentRemain = if ($total -gt 0) { [Math]::Round(100 - (($done / $total) * 100), 1) } else { 100 }
    pendingCount  = ($pending | Measure-Object).Count
    currentStep   = $current
    pendingLabels = ($pending | ForEach-Object { $_.label })
  }
}

function Format-ProgressBar([double]$Percent, [int]$Width = 36) {
  $filled = [Math]::Max(0, [Math]::Min($Width, [int][Math]::Round($Width * $Percent / 100)))
  $empty = $Width - $filled
  ('[{0}{1}] {2,5:N1}%' -f ('#' * $filled), ('-' * $empty), $Percent)
}

function Get-CountdownInfo {
  . "$PSScriptRoot/unattended-scheduler.ps1"
  Load-UnattendedEnv
  $paths = Ensure-UnattendedLogDir
  $pollMin = Get-PollMinutes
  $last = Read-JsonFile $paths.LastRun
  $schedule = Read-JsonFile $paths.Schedule
  if (-not $schedule) { $schedule = Get-AdaptiveSchedule -LastRun $last }

  if (Test-ConstructionLockActive) {
    $lockRaw = Get-Content $paths.LockFile -Raw -ErrorAction SilentlyContinue
    $started = $null
    if ($lockRaw -match 'started=([^\r\n]+)') {
      try { $started = [DateTime]::Parse($Matches[1]) } catch { }
    }
    $elapsed = if ($started) { (Get-Date) - $started } else { [TimeSpan]::Zero }
    $maxMin = if ($schedule.maxMinutes) { [int]$schedule.maxMinutes } else { 120 }
    return @{
      mode       = 'running'
      label      = 'construction turn in progress'
      elapsed    = $elapsed
      maxMinutes = $maxMin
      remaining  = [TimeSpan]::FromMinutes([Math]::Max(0, $maxMin - $elapsed.TotalMinutes))
    }
  }

  $gate = Test-ShouldRunNow
  if ($gate.ok) {
    return @{
      mode      = 'ready'
      label     = 'next turn starting'
      remaining = [TimeSpan]::Zero
    }
  }

  $remaining = [TimeSpan]::Zero
  if ($gate.eligibleAt) {
    try {
      $at = [DateTime]::Parse($gate.eligibleAt)
      $remaining = $at - (Get-Date)
      if ($remaining.TotalSeconds -lt 0) { $remaining = [TimeSpan]::Zero }
    } catch { }
  } elseif ($last -and $last.endedAt) {
    try {
      $ended = [DateTime]::Parse($last.endedAt)
      $wait = if ($schedule.waitMinutes) { [int]$schedule.waitMinutes } else { $pollMin }
      $at = $ended.AddMinutes($wait)
      $remaining = $at - (Get-Date)
      if ($remaining.TotalSeconds -lt 0) { $remaining = [TimeSpan]::Zero }
    } catch { }
  }

  return @{
    mode        = 'waiting'
    label       = $gate.reason
    pollMinutes = $pollMin
    remaining   = $remaining
  }
}

function Get-EtaEstimate($Progress, $PercentInfo) {
  . "$PSScriptRoot/unattended-scheduler.ps1"
  $paths = Ensure-UnattendedLogDir
  $last = Read-JsonFile $paths.LastRun
  $runNumber = Get-RunNumber

  $avgHoursPerPoint = 0.35
  $remainPoints = $PercentInfo.percentRemain
  $etaHours = [Math]::Round(($remainPoints * $avgHoursPerPoint), 1)

  if ($last -and $last.durationMinutes -and $runNumber -gt 0) {
    $etaHours = [Math]::Round(($PercentInfo.pendingCount * ([double]$last.durationMinutes / 60) * 1.2), 1)
  }

  $finish = (Get-Date).AddHours($etaHours)
  @{
    etaHours   = $etaHours
    etaAt      = $finish.ToString('yyyy-MM-dd HH:mm')
    assumption = 'remaining slices x last turn duration; 24h machine + 10min chain'
  }
}

function Format-Countdown([TimeSpan]$Span) {
  if ($Span.TotalSeconds -le 0) { return '00:00:00' }
  return ('{0:D2}:{1:D2}:{2:D2}' -f [int]$Span.TotalHours, $Span.Minutes, $Span.Seconds)
}

function Get-Phase1ProgressReport {
  $progress = Sync-ProgressAutoDetect
  if (-not $progress) {
    return @{ error = 'PHASE1_PROGRESS.json missing' }
  }
  $percent = Get-MilestonePercent $progress
  $countdown = Get-CountdownInfo
  $eta = Get-EtaEstimate $progress $percent
  . "$PSScriptRoot/unattended-scheduler.ps1"
  $status = Get-UnattendedStatus

  [ordered]@{
    phase         = $progress.phase
    goal          = $progress.goal
    currentStep   = if ($progress.currentStep) { $progress.currentStep } else { $percent.currentStep }
    percentDone   = $percent.percentDone
    percentRemain = $percent.percentRemain
    progressBar   = (Format-ProgressBar $percent.percentDone)
    pendingCount  = $percent.pendingCount
    pendingLabels = $percent.pendingLabels
    countdown     = $countdown
    eta           = $eta
    runNumber     = $status.runNumber
    lastRun       = $status.lastRun
    g1Ready       = $status.g1Ready
    lockActive    = $status.lockActive
    ownerGates    = $progress.ownerGates
    updatedAt     = $progress.recordedAt
  }
}

if ($MyInvocation.InvocationName -ne '.') {
  Get-Phase1ProgressReport | ConvertTo-Json -Depth 8
}
