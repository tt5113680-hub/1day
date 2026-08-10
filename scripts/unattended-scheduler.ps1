# Shared adaptive scheduling for local unattended construction.
param()

function Get-UnattendedPaths {
  $root = Split-Path -Parent $PSScriptRoot
  $logDir = Join-Path $root 'logs/unattended'
  @{
    Root       = $root
    LogDir     = $logDir
    LockFile   = Join-Path $logDir '.construction.lock'
    LastRun    = Join-Path $logDir 'last-run.json'
    Schedule   = Join-Path $logDir 'schedule.json'
    RunCounter = Join-Path $logDir 'run-counter.txt'
  }
}

function Ensure-UnattendedLogDir {
  $paths = Get-UnattendedPaths
  New-Item -ItemType Directory -Force -Path $paths.LogDir | Out-Null
  return $paths
}

function Read-JsonFile([string]$Path) {
  if (-not (Test-Path $Path)) { return $null }
  try {
    return (Get-Content $Path -Raw -Encoding utf8 | ConvertFrom-Json)
  } catch {
    return $null
  }
}

function Write-JsonFile([string]$Path, $Object) {
  $Object | ConvertTo-Json -Depth 6 | Set-Content -Path $Path -Encoding utf8
}

function Get-RunNumber {
  $paths = Ensure-UnattendedLogDir
  if (-not (Test-Path $paths.RunCounter)) { return 0 }
  $raw = (Get-Content $paths.RunCounter -Raw -ErrorAction SilentlyContinue).Trim()
  if ($raw -match '^\d+$') { return [int]$raw }
  return 0
}

function Set-RunNumber([int]$Number) {
  $paths = Ensure-UnattendedLogDir
  Set-Content -Path $paths.RunCounter -Value "$Number" -Encoding utf8
}

function Test-ConstructionLockActive {
  $paths = Ensure-UnattendedLogDir
  if (-not (Test-Path $paths.LockFile)) { return $false }
  $existing = Get-Content $paths.LockFile -Raw -ErrorAction SilentlyContinue
  if ($existing -match 'pid=(\d+)') {
    $proc = Get-Process -Id ([int]$Matches[1]) -ErrorAction SilentlyContinue
    return [bool]$proc
  }
  return $false
}

function Test-G1Ready {
  $paths = Get-UnattendedPaths
  $handoff = Join-Path $paths.Root 'PROJECT_STATE/LATEST_HANDOFF.md'
  if (-not (Test-Path $handoff)) { return $false }
  $text = Get-Content $handoff -Raw -Encoding utf8
  return $text -match 'G1\s*READY|G1_READY|g1 ready'
}

function Get-EnvInt([string]$Name, [int]$Default) {
  $raw = [Environment]::GetEnvironmentVariable($Name)
  if ($raw -and $raw -match '^\d+$') { return [int]$raw }
  return $Default
}

function Get-TaskSizeProfile {
  $paths = Get-UnattendedPaths
  $blob = @(
    (Get-Content (Join-Path $paths.Root 'PROJECT_STATE/LATEST_HANDOFF.md') -Raw -ErrorAction SilentlyContinue)
    (Get-Content (Join-Path $paths.Root 'PROJECT_STATE/CURRENT_STATE.md') -Raw -ErrorAction SilentlyContinue)
    (Get-Content (Join-Path $paths.Root 'PROJECT_STATE/SYSTEMIC_CONSTRUCTION_PLAN.md') -Raw -ErrorAction SilentlyContinue)
  ) -join "`n"

  if ($blob -match 'P1-B|visual|design.system|@oneday/ui|playwright|storefront-renderer|shell baseline|FormField|Table|Modal') {
    return 'large'
  }
  if ($blob -match 'chore|handoff pin|docs only|state record|evidence only') {
    return 'small'
  }
  return 'medium'
}

function Get-ProfileLimits([string]$Profile) {
  switch ($Profile) {
    'small' {
      @{
        MaxMinutes = Get-EnvInt 'UNATTENDED_MAX_MINUTES_SMALL' 60
        BaseWait   = Get-EnvInt 'UNATTENDED_WAIT_SMALL_MIN' 15
      }
    }
    'large' {
      @{
        MaxMinutes = Get-EnvInt 'UNATTENDED_MAX_MINUTES_LARGE' 180
        BaseWait   = Get-EnvInt 'UNATTENDED_WAIT_LARGE_MIN' 45
      }
    }
    default {
      @{
        MaxMinutes = Get-EnvInt 'UNATTENDED_MAX_MINUTES_MEDIUM' 120
        BaseWait   = Get-EnvInt 'UNATTENDED_WAIT_MEDIUM_MIN' 25
      }
    }
  }
}

function Get-AdaptiveSchedule {
  param(
    [object]$LastRun = $null,
    [string]$Profile = (Get-TaskSizeProfile)
  )

  $paths = Ensure-UnattendedLogDir
  $limits = Get-ProfileLimits $Profile
  $minWait = Get-EnvInt 'UNATTENDED_MIN_INTERVAL_MIN' 10
  $maxWait = Get-EnvInt 'UNATTENDED_MAX_INTERVAL_MIN' 90

  $wait = $limits.BaseWait
  $maxMinutes = $limits.MaxMinutes
  $reason = "profile=$Profile base"

  if ($LastRun) {
    $exitCode = if ($null -ne $LastRun.exitCode) { [int]$LastRun.exitCode } else { 0 }
    $duration = if ($null -ne $LastRun.durationMinutes) { [double]$LastRun.durationMinutes } else { 0 }

    switch ($exitCode) {
      3 {
        $wait = [Math]::Min($maxWait, 15)
        $maxMinutes = [Math]::Min(240, $maxMinutes + 30)
        $reason = 'last=TIMEOUT extend max + short wait'
      }
      1 {
        $wait = [Math]::Min($maxWait, 20)
        $reason = 'last=FAIL retry sooner'
      }
      0 {
        if ($duration -ge 90) {
          $wait = [Math]::Min($maxWait, 55)
          $reason = 'last=OK long run cool down'
        } elseif ($duration -le 20) {
          $wait = [Math]::Max($minWait, 12)
          $reason = 'last=OK quick run continue sooner'
        } else {
          $wait = $limits.BaseWait
          $reason = 'last=OK normal'
        }
      }
      default {
        $wait = $limits.BaseWait
      }
    }
  }

  $wait = [Math]::Max($minWait, [Math]::Min($maxWait, $wait))
  $schedule = [ordered]@{
    profile           = $Profile
    maxMinutes        = $maxMinutes
    waitMinutes       = $wait
    reason            = $reason
    updatedAt         = (Get-Date).ToString('o')
    g1Ready           = (Test-G1Ready)
    lockActive        = (Test-ConstructionLockActive)
  }
  Write-JsonFile $paths.Schedule $schedule
  return $schedule
}

function Test-ShouldRunNow {
  param([switch]$Force)

  $paths = Ensure-UnattendedLogDir

  if (Test-ConstructionLockActive) {
    return @{ ok = $false; reason = 'run in progress (lock)' }
  }

  if (Test-Path (Join-Path $paths.Root 'PROJECT_STATE/BLOCKED_REPORT.md')) {
    return @{ ok = $false; reason = 'BLOCKED_REPORT present' }
  }

  if ((Test-G1Ready) -and -not $Force) {
    return @{ ok = $false; reason = 'G1 READY — waiting for owner manual test' }
  }

  if ($Force) {
    return @{ ok = $true; reason = 'forced' }
  }

  $last = Read-JsonFile $paths.LastRun
  $schedule = Get-AdaptiveSchedule -LastRun $last
  if (-not $last -or -not $last.endedAt) {
    return @{ ok = $true; reason = 'first run' ; schedule = $schedule }
  }

  try {
    $ended = [DateTime]::Parse($last.endedAt)
  } catch {
    return @{ ok = $true; reason = 'last run time unreadable' ; schedule = $schedule }
  }

  $eligibleAt = $ended.AddMinutes([int]$schedule.waitMinutes)
  if ((Get-Date) -lt $eligibleAt) {
    $mins = [Math]::Ceiling(($eligibleAt - (Get-Date)).TotalMinutes)
    return @{ ok = $false; reason = "cooldown ${mins}m left ($($schedule.reason))"; schedule = $schedule; eligibleAt = $eligibleAt.ToString('o') }
  }

  return @{ ok = $true; reason = $schedule.reason; schedule = $schedule }
}

function Write-LastRunRecord {
  param(
    [int]$RunNumber,
    [int]$ExitCode,
    [datetime]$StartedAt,
    [datetime]$EndedAt,
    [string]$Profile,
    [int]$MaxMinutes,
    [string]$RunLog,
    [int]$CommitsPushed = 0
  )

  $paths = Ensure-UnattendedLogDir
  $duration = ($EndedAt - $StartedAt).TotalMinutes
  $record = [ordered]@{
    runNumber       = $RunNumber
    exitCode        = $ExitCode
    exitLabel       = switch ($ExitCode) {
      0 { if ($duration -lt 1) { 'SKIP' } else { 'OK' } }
      1 { 'FAIL' }
      2 { 'CONFIG' }
      3 { 'TIMEOUT' }
      default { "EXIT_$ExitCode" }
    }
    profile         = $Profile
    maxMinutes      = $MaxMinutes
    durationMinutes = [Math]::Round($duration, 1)
    startedAt       = $StartedAt.ToString('o')
    endedAt         = $EndedAt.ToString('o')
    runLog          = $RunLog
    commitsPushed   = $CommitsPushed
    firstRun        = ($RunNumber -eq 1)
  }
  Write-JsonFile $paths.LastRun $record
  Get-AdaptiveSchedule -LastRun $record -Profile $Profile | Out-Null
  return $record
}

function Get-UnattendedStatus {
  $paths = Ensure-UnattendedLogDir
  $last = Read-JsonFile $paths.LastRun
  $schedule = Read-JsonFile $paths.Schedule
  if (-not $schedule) { $schedule = Get-AdaptiveSchedule -LastRun $last }

  $gate = Test-ShouldRunNow
  [ordered]@{
    lockActive   = (Test-ConstructionLockActive)
    g1Ready      = (Test-G1Ready)
    runNumber    = Get-RunNumber
    lastRun      = $last
    nextSchedule = $schedule
    shouldRun    = $gate
  }
}

if ($MyInvocation.InvocationName -ne '.') {
  Get-UnattendedStatus | ConvertTo-Json -Depth 6
}
