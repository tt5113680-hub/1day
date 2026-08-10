# ONEDAY V3 — one unattended construction turn (Cursor Headless CLI).
param(
  [int]$MaxMinutes = 0,
  [ValidateSet('small', 'medium', 'large', 'auto')]
  [string]$Profile = 'auto',
  [switch]$SkipPull
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/unattended-scheduler.ps1"

$paths = Ensure-UnattendedLogDir
$root = $paths.Root
$lockFile = $paths.LockFile
$promptFile = Join-Path $root 'scripts/unattended-construction-prompt.md'

function Write-Log([string]$Message) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Write-Output $line
  Add-Content -Path (Join-Path $paths.LogDir 'daemon.log') -Value $line -Encoding utf8
}

function Load-Secrets {
  $envFile = Join-Path $root '.env.local-unattended'
  if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
      if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
        $name = $Matches[1]
        $value = $Matches[2].Trim().Trim('"').Trim("'")
        if (-not [string]::IsNullOrWhiteSpace($value)) {
          Set-Item -Path "Env:$name" -Value $value
        }
      }
    }
  }
}

function Test-AgentCli {
  $agent = Get-Command agent -ErrorAction SilentlyContinue
  if (-not $agent) {
    throw 'Cursor agent CLI not found. Install: irm https://cursor.com/install?win32=true | iex'
  }
  return $agent.Source
}

function Acquire-Lock {
  if (Test-Path $lockFile) {
    $existing = Get-Content $lockFile -Raw -ErrorAction SilentlyContinue
    if ($existing -match 'pid=(\d+)') {
      $pidNum = [int]$Matches[1]
      $proc = Get-Process -Id $pidNum -ErrorAction SilentlyContinue
      if ($proc) {
        Write-Log "SKIP: another unattended run active (pid=$pidNum)"
        exit 0
      }
    }
  }
  Set-Content -Path $lockFile -Value "pid=$PID started=$(Get-Date -Format o)" -Encoding utf8
}

function Release-Lock {
  if (Test-Path $lockFile) { Remove-Item $lockFile -Force -ErrorAction SilentlyContinue }
}

function Get-HeadBefore {
  Push-Location $root
  try { return (git rev-parse HEAD 2>$null) } finally { Pop-Location }
}

function Count-CommitsSince([string]$BeforeHead) {
  Push-Location $root
  try {
    if (-not $BeforeHead) { return 0 }
    $after = git rev-parse HEAD 2>$null
    if ($after -eq $BeforeHead) { return 0 }
    return ((git rev-list --count "$BeforeHead..HEAD" 2>$null) -as [int])
  } finally { Pop-Location }
}

Load-Secrets
$agentPath = Test-AgentCli

$resolvedProfile = if ($Profile -eq 'auto') { Get-TaskSizeProfile } else { $Profile }
$limits = Get-ProfileLimits $resolvedProfile
if ($MaxMinutes -le 0) { $MaxMinutes = $limits.MaxMinutes }

if (-not $env:CURSOR_API_KEY) {
  Write-Log 'FAIL: CURSOR_API_KEY missing. Copy .env.local-unattended.example to .env.local-unattended'
  exit 2
}

if (-not (Test-Path $promptFile)) {
  Write-Log "FAIL: missing prompt file $promptFile"
  exit 2
}

$blocked = Join-Path $root 'PROJECT_STATE/BLOCKED_REPORT.md'
if (Test-Path $blocked) {
  Write-Log 'SKIP: BLOCKED_REPORT.md present — owner must clear before resuming'
  exit 0
}

if ((Test-G1Ready)) {
  Write-Log 'SKIP: G1 READY — waiting for owner manual test'
  exit 0
}

$runNumber = Get-RunNumber + 1
$startedAt = Get-Date
$headBefore = Get-HeadBefore
Acquire-Lock
Push-Location $root
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$runLog = Join-Path $paths.LogDir "run-$stamp.log"
$exitCode = 1

try {
  Write-Log "START run#$runNumber profile=$resolvedProfile max=${MaxMinutes}m log=$runLog"

  if (-not $SkipPull) {
    git fetch origin 2>&1 | Tee-Object -FilePath $runLog -Append | Out-Null
    $branch = git rev-parse --abbrev-ref HEAD
    if ($branch -eq 'hardening/COMMERCIAL-COMPLETION') {
      git pull --ff-only origin $branch 2>&1 | Tee-Object -FilePath $runLog -Append | Out-Null
    }
  }

  $prompt = Get-Content $promptFile -Raw -Encoding utf8
  $agentArgs = @(
    '-p', '--force', '--trust', '--yolo',
    '--workspace', $root,
    '--output-format', 'text',
    $prompt
  )

  $job = Start-Job -ScriptBlock {
    param($Agent, $Args, $Root, $Key)
    Set-Location $Root
    $env:CURSOR_API_KEY = $Key
    & $Agent @Args 2>&1
  } -ArgumentList $agentPath, $agentArgs, $root, $env:CURSOR_API_KEY

  $deadline = $startedAt.AddMinutes($MaxMinutes)
  do {
    if ($job.State -eq 'Completed' -or $job.State -eq 'Failed' -or $job.State -eq 'Stopped') { break }
    Start-Sleep -Seconds 15
  } while ((Get-Date) -lt $deadline)

  if ($job.State -eq 'Running') {
    Stop-Job $job -Force
    Receive-Job $job | Out-File $runLog -Append -Encoding utf8
    Write-Log "TIMEOUT after ${MaxMinutes}m — next turn will adapt (shorter wait, longer max)"
    $exitCode = 3
  } else {
    $output = Receive-Job $job
    $output | Out-File $runLog -Encoding utf8
    if ($job.State -eq 'Failed') {
      Write-Log 'FAIL: agent job failed — see run log'
      $exitCode = 1
    } else {
      Write-Log 'END turn OK'
      $exitCode = 0
    }
  }
  Remove-Job $job -Force -ErrorAction SilentlyContinue
} catch {
  $_ | Out-File $runLog -Append -Encoding utf8
  Write-Log "FAIL: $($_.Exception.Message)"
  $exitCode = 1
} finally {
  Pop-Location
  Release-Lock
  $endedAt = Get-Date
  $commits = Count-CommitsSince $headBefore
  Write-LastRunRecord -RunNumber $runNumber -ExitCode $exitCode -StartedAt $startedAt -EndedAt $endedAt `
    -Profile $resolvedProfile -MaxMinutes $MaxMinutes -RunLog $runLog -CommitsPushed $commits | Out-Null
  Set-RunNumber $runNumber
  $sched = Get-AdaptiveSchedule -LastRun (Read-JsonFile $paths.LastRun) -Profile $resolvedProfile
  Write-Log "RECORD run#$runNumber exit=$exitCode duration=$([Math]::Round(($endedAt-$startedAt).TotalMinutes,1))m commits=$commits nextWait=$($sched.waitMinutes)m nextMax=$($sched.maxMinutes)m"
  exit $exitCode
}
