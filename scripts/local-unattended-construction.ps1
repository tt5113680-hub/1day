# ONEDAY V3 — one unattended construction turn (Cursor Headless or OpenCode + API).
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
  Load-UnattendedEnv
}

function Test-OpencodeCli {
  $oc = Get-Command opencode -ErrorAction SilentlyContinue
  if (-not $oc) {
    throw 'OpenCode CLI not found. Install: npm install -g opencode-ai'
  }
  return $oc.Source
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
$executor = Get-UnattendedExecutor

$resolvedProfile = if ($Profile -eq 'auto') { Get-TaskSizeProfile } else { $Profile }
$limits = Get-ProfileLimits $resolvedProfile
if ($MaxMinutes -le 0) { $MaxMinutes = $limits.MaxMinutes }

if (-not (Test-ExecutorAuthenticated)) {
  if ($executor -eq 'opencode') {
    Write-Log 'FAIL: OpenCode not ready. Set DEEPSEEK_API_KEY and npm install -g opencode-ai'
  } else {
    Write-Log 'FAIL: not authenticated. Set CURSOR_API_KEY in .env.local-unattended or run: agent login'
  }
  exit 2
}

if (-not (Test-Path $promptFile)) {
  Write-Log "FAIL: missing prompt file $promptFile"
  exit 2
}

if (Test-ActiveBlockedReport) {
  Write-Log 'SKIP: active BLOCKED_REPORT — owner must clear before resuming'
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
  Write-Log "START run#$runNumber executor=$executor profile=$resolvedProfile max=${MaxMinutes}m log=$runLog"

  if (-not $SkipPull) {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      # Soft timeout: network after reboot can hang forever on git fetch.
      $gitJob = Start-Job -ScriptBlock {
        param($Root)
        Set-Location $Root
        git fetch origin 2>&1
        $branch = git rev-parse --abbrev-ref HEAD 2>$null
        if ($branch -eq 'hardening/COMMERCIAL-COMPLETION') {
          git pull --ff-only origin $branch 2>&1
        }
      } -ArgumentList $root
      if (-not (Wait-Job $gitJob -Timeout 45)) {
        Stop-Job $gitJob -Force
        Write-Log 'WARN: git fetch/pull timed out after 45s — continuing without pull'
        "git fetch/pull timed out after 45s" | Out-File $runLog -Append -Encoding utf8
      } else {
        Receive-Job $gitJob | Tee-Object -FilePath $runLog -Append | Out-Null
      }
      Remove-Job $gitJob -Force -ErrorAction SilentlyContinue
    } finally {
      $ErrorActionPreference = $prevEap
    }
  }

  $prompt = Get-Content $promptFile -Raw -Encoding utf8

  if ($executor -eq 'opencode') {
    $ocPath = Test-OpencodeCli
    $model = Get-OpenCodeModel
    $dsKey = $env:DEEPSEEK_API_KEY
    $job = Start-Job -ScriptBlock {
      param($Oc, $Model, $Root, $Prompt, $Key)
      Set-Location $Root
      $env:DEEPSEEK_API_KEY = $Key
      & $Oc run -m $Model --dir $Root $Prompt 2>&1
    } -ArgumentList $ocPath, $model, $root, $prompt, $dsKey
  } else {
    $agentPath = Test-AgentCli
    $agentArgs = @(
      '-p', '--force', '--trust', '--yolo',
      '--workspace', $root,
      '--output-format', 'text',
      $prompt
    )
    $apiKey = Get-CursorApiKeyForAgent
    $job = Start-Job -ScriptBlock {
      param($Agent, $AgentArgList, $Root, $Key)
      Set-Location $Root
      if ($Key) { $env:CURSOR_API_KEY = $Key }
      & $Agent @AgentArgList 2>&1
    } -ArgumentList $agentPath, $agentArgs, $root, $apiKey
  }

  $deadline = $startedAt.AddMinutes($MaxMinutes)
  do {
    if ($job.State -eq 'Completed' -or $job.State -eq 'Failed' -or $job.State -eq 'Stopped') { break }
    Start-Sleep -Seconds 15
  } while ((Get-Date) -lt $deadline)

  if ($job.State -eq 'Running') {
    # Windows PowerShell 5.1 Stop-Job has no -Force; prefer Stop-Job then Remove-Job.
    try { Stop-Job $job -ErrorAction Stop } catch { try { Stop-Job $job -Force -ErrorAction SilentlyContinue } catch {} }
    try { Receive-Job $job -ErrorAction SilentlyContinue | Out-File $runLog -Append -Encoding utf8 } catch {}
    try { Remove-Job $job -Force -ErrorAction SilentlyContinue } catch {}
    Write-Log "TIMEOUT after ${MaxMinutes}m — next turn will adapt (shorter wait, longer max)"
    $exitCode = 3
  } else {
    $output = Receive-Job $job
    $output | Out-File $runLog -Encoding utf8
    $outputText = ($output | Out-String)
    # Commits this turn prove real work succeeded — ignore false positives from diffs/logs.
    $commitsNow = Count-CommitsSince $headBefore
    $realCursorLimit = ($executor -eq 'cursor') -and (
      $outputText -match '(?m)^ActionRequiredError: You''ve hit your usage limit'
    )
    $realApiFail = $outputText -match '(?m)^(Error:|APIError|AuthenticationError).{0,120}(Insufficient Balance|insufficient_quota|invalid_api_key|Authentication Fails|401 Unauthorized)'
    if ($commitsNow -gt 0) {
      Write-Log "END turn OK (commits=$commitsNow)"
      $exitCode = 0
    } elseif ($realCursorLimit) {
      Write-Log 'SKIP: Cursor Agent usage limit — wait for quota reset'
      $exitCode = 4
    } elseif ($realApiFail) {
      Write-Log 'SKIP: API billing/auth issue — check DEEPSEEK balance and key'
      $exitCode = 4
    } elseif ($job.State -eq 'Failed') {
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
