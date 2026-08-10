# ONEDAY V3 — one unattended construction turn (Cursor Headless CLI).
# Requires: agent CLI on PATH, CURSOR_API_KEY (env or .env.local-unattended).
param(
  [int]$MaxMinutes = 120,
  [switch]$SkipPull
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root 'logs/unattended'
$lockFile = Join-Path $logDir '.construction.lock'
$promptFile = Join-Path $root 'scripts/unattended-construction-prompt.md'

function Write-Log([string]$Message) {
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Write-Output $line
  Add-Content -Path (Join-Path $logDir 'daemon.log') -Value $line -Encoding utf8
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
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
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

Load-Secrets
$agentPath = Test-AgentCli

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

Acquire-Lock
Push-Location $root
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$runLog = Join-Path $logDir "run-$stamp.log"

try {
  Write-Log "START turn log=$runLog"

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

  $deadline = (Get-Date).AddMinutes($MaxMinutes)
  do {
    if ($job.State -eq 'Completed' -or $job.State -eq 'Failed' -or $job.State -eq 'Stopped') { break }
    Start-Sleep -Seconds 15
  } while ((Get-Date) -lt $deadline)

  if ($job.State -eq 'Running') {
    Stop-Job $job -Force
    Write-Log "TIMEOUT after ${MaxMinutes}m — next scheduled turn will continue"
    Receive-Job $job | Out-File $runLog -Append -Encoding utf8
    exit 3
  }

  $output = Receive-Job $job
  $output | Out-File $runLog -Encoding utf8
  Remove-Job $job -Force

  if ($job.State -eq 'Failed') {
    Write-Log 'FAIL: agent job failed — see run log'
    exit 1
  }

  Write-Log 'END turn OK'
  exit 0
} catch {
  $_ | Out-File $runLog -Append -Encoding utf8
  Write-Log "FAIL: $($_.Exception.Message)"
  exit 1
} finally {
  Pop-Location
  Release-Lock
}
