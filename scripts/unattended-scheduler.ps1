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

function Get-ConstructionLockInfo {
  $paths = Ensure-UnattendedLogDir
  if (-not (Test-Path $paths.LockFile)) {
    return @{
      exists     = $false
      path       = $paths.LockFile
      pid        = $null
      pidAlive   = $false
      started    = $null
      expires    = $null
      holder     = ''
      ageMinutes = 0
      isIde      = $false
      raw        = ''
    }
  }
  $raw = Get-Content $paths.LockFile -Raw -ErrorAction SilentlyContinue
  if (-not $raw) { $raw = '' }
  $pidNum = $null
  $pidAlive = $false
  if ($raw -match 'pid=(\d+)') {
    $pidNum = [int]$Matches[1]
    $pidAlive = [bool](Get-Process -Id $pidNum -ErrorAction SilentlyContinue)
  }
  $started = $null
  if ($raw -match 'started=([^\r\n\s]+)') {
    try { $started = [datetime]::Parse($Matches[1].Trim()) } catch { $started = $null }
  }
  $expires = $null
  if ($raw -match 'expires=([^\r\n\s]+)') {
    try { $expires = [datetime]::Parse($Matches[1].Trim()) } catch { $expires = $null }
  }
  $holder = ''
  if ($raw -match 'holder=([^\r\n]+)') { $holder = $Matches[1].Trim() }
  $ageMinutes = 0
  if ($started) {
    $ageMinutes = [math]::Round(((Get-Date) - $started).TotalMinutes, 1)
  } else {
    $ageMinutes = [math]::Round(((Get-Date) - (Get-Item $paths.LockFile).LastWriteTime).TotalMinutes, 1)
  }
  $isIde = ($holder -match '(?i)IDE-Agent|ide\b')
  return @{
    exists     = $true
    path       = $paths.LockFile
    pid        = $pidNum
    pidAlive   = $pidAlive
    started    = $started
    expires    = $expires
    holder     = $holder
    ageMinutes = $ageMinutes
    isIde      = $isIde
    raw        = $raw.Trim()
  }
}

function Write-UnattendedOwnerAlert([string]$Message) {
  $paths = Ensure-UnattendedLogDir
  $alertPath = Join-Path $paths.Root 'PROJECT_STATE/OWNER_ALERT_UNATTENDED.md'
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -Path (Join-Path $paths.LogDir 'daemon.log') -Value $line -Encoding utf8
  $body = @(
    '# OWNER_ALERT — Unattended construction'
    ''
    '- auto_generated: true'
    ("- updated_at: {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
    '- action: check `logs/unattended/daemon.log` / `pnpm unattended:health`'
    ''
    '## Latest'
    ''
    $Message
    ''
  ) -join "`n"
  Set-Content -Path $alertPath -Value $body -Encoding utf8
}

function Clear-StaleConstructionLock {
  <#
    Auto-heal hung/forgotten locks so DeepSeek is not blocked for hours.
    - dead pid → drop lock file
    - expires= past → kill keeper (if any) + drop
    - IDE-Agent holder older than IdeMaxMinutes (default 90) → kill + drop
    - daemon/unattended holder older than DaemonMaxMinutes (default 200) → kill + drop
  #>
  param(
    [int]$IdeMaxMinutes = 90,
    [int]$DaemonMaxMinutes = 200,
    [switch]$DryRun
  )

  $info = Get-ConstructionLockInfo
  if (-not $info.exists) {
    return @{ cleared = $false; reason = 'no lock' }
  }

  $why = $null
  if (-not $info.pidAlive) {
    $why = "stale lock file (pid dead holder=$($info.holder))"
  } elseif ($info.expires -and ((Get-Date) -gt $info.expires)) {
    $why = "lock expired at $($info.expires.ToString('o')) holder=$($info.holder)"
  } elseif ($info.isIde -and ($info.ageMinutes -ge $IdeMaxMinutes)) {
    $why = "IDE lock age $($info.ageMinutes)m >= ${IdeMaxMinutes}m holder=$($info.holder) — forgotten session"
  } elseif ((-not $info.isIde) -and ($info.ageMinutes -ge $DaemonMaxMinutes)) {
    $why = "daemon lock age $($info.ageMinutes)m >= ${DaemonMaxMinutes}m holder=$($info.holder) — hung turn"
  }

  if (-not $why) {
    return @{
      cleared    = $false
      reason     = "lock healthy age=$($info.ageMinutes)m holder=$($info.holder) pid=$($info.pid)"
      lock       = $info
    }
  }

  if ($DryRun) {
    return @{ cleared = $false; wouldClear = $true; reason = $why; lock = $info }
  }

  if ($info.pidAlive -and $info.pid) {
    Stop-Process -Id $info.pid -Force -ErrorAction SilentlyContinue
  }
  Remove-Item -Path $info.path -Force -ErrorAction SilentlyContinue
  Write-UnattendedOwnerAlert ("AUTO-CLEARED construction lock: {0}" -f $why)
  return @{ cleared = $true; reason = $why; lock = $info }
}

function Test-ConstructionLockActive {
  # Heal forgotten/hung locks before treating the mutex as busy.
  Clear-StaleConstructionLock | Out-Null
  $info = Get-ConstructionLockInfo
  return [bool]($info.exists -and $info.pidAlive)
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

function Test-ValidCursorApiKey([string]$Key) {
  if ([string]::IsNullOrWhiteSpace($Key)) { return $false }
  return $Key -notmatch 'your_cursor_api_key|changeme|placeholder|^xxx$'
}

function Get-CursorApiKeyForAgent {
  if (Test-ValidCursorApiKey $env:CURSOR_API_KEY) { return $env:CURSOR_API_KEY }
  return $null
}

function Load-UnattendedEnv {
  $paths = Get-UnattendedPaths
  $envFile = Join-Path $paths.Root '.env.local-unattended'
  if (-not (Test-Path $envFile)) { return }
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      $name = $Matches[1]
      $value = $Matches[2].Trim().Trim('"').Trim("'")
      if ($name -eq 'CURSOR_API_KEY' -and -not (Test-ValidCursorApiKey $value)) {
        Remove-Item Env:CURSOR_API_KEY -ErrorAction SilentlyContinue
        return
      }
      if (-not [string]::IsNullOrWhiteSpace($value)) {
        Set-Item -Path "Env:$name" -Value $value
      }
    }
  }
}

function Get-UnattendedExecutor {
  Load-UnattendedEnv
  $v = [Environment]::GetEnvironmentVariable('UNATTENDED_EXECUTOR')
  if ($v -eq 'opencode') { return 'opencode' }
  return 'cursor'
}

function Test-ValidApiKey([string]$Key) {
  if ([string]::IsNullOrWhiteSpace($Key)) { return $false }
  return $Key -notmatch 'your_cursor_api_key|your_|changeme|placeholder|^xxx$'
}

function Test-DeepSeekApiKey {
  return Test-ValidApiKey $env:DEEPSEEK_API_KEY
}

function Get-OpenCodeModel {
  Load-UnattendedEnv
  $m = [Environment]::GetEnvironmentVariable('UNATTENDED_OPENCODE_MODEL')
  if ($m -and $m -match '/') { return $m }
  if ($m) { return "deepseek/$m" }
  return 'deepseek/deepseek-chat'
}

function Test-ExecutorAuthenticated {
  if ((Get-UnattendedExecutor) -eq 'opencode') {
    return (Test-DeepSeekApiKey -and (Get-Command opencode -ErrorAction SilentlyContinue))
  }
  return Test-AgentAuthenticated
}

function Test-AgentAuthenticated {
  if (Test-ValidCursorApiKey $env:CURSOR_API_KEY) { return $true }
  if (-not (Get-Command agent -ErrorAction SilentlyContinue)) { return $false }
  $status = (& agent status 2>&1 | Out-String)
  return $status -match 'Logged in|Login successful'
}

function Test-ChainMode {
  Load-UnattendedEnv
  $v = [Environment]::GetEnvironmentVariable('UNATTENDED_CHAIN_MODE')
  if ([string]::IsNullOrWhiteSpace($v)) { return $true }
  return $v -match '^(1|true|yes|dedicated|on)$'
}

function Get-PollMinutes {
  Load-UnattendedEnv
  return Get-EnvInt 'UNATTENDED_POLL_MINUTES' 10
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

  $usageLimitWait = $false
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
      4 {
        Load-UnattendedEnv
        $wait = Get-EnvInt 'UNATTENDED_USAGE_LIMIT_WAIT_MIN' 360
        $usageLimitWait = $true
        $reason = 'last=USAGE_LIMIT — wait for free quota reset (no Pro required)'
      }
      0 {
        if (Test-ChainMode) {
          $wait = $minWait
          $reason = 'chain: prev OK — next task after poll interval'
        } elseif ($duration -ge 90) {
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

  if ($usageLimitWait) {
    $wait = [Math]::Max($minWait, $wait)
  } else {
    $wait = [Math]::Max($minWait, [Math]::Min($maxWait, $wait))
  }
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

function Test-ActiveBlockedReport {
  $paths = Get-UnattendedPaths
  $p = Join-Path $paths.Root 'PROJECT_STATE/BLOCKED_REPORT.md'
  if (-not (Test-Path $p)) { return $false }
  $text = Get-Content $p -Raw -Encoding utf8
  if ($text -match 'RESOLVED|no active blocker|Current blockers\s*\n\s*None') { return $false }
  return $true
}

function Test-ShouldRunNow {
  param([switch]$Force)

  Load-UnattendedEnv
  $paths = Ensure-UnattendedLogDir

  if (Test-ConstructionLockActive) {
    return @{ ok = $false; reason = 'previous task still running (lock)' }
  }

  if (Test-ActiveBlockedReport) {
    return @{ ok = $false; reason = 'BLOCKED_REPORT active — owner action required' }
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
      4 { 'USAGE_LIMIT' }
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
