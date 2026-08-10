# ONEDAY V3 — local unattended daemon (loops construction turns; no IDE windows).
param(
  [int]$IntervalMinutes = 30,
  [int]$MaxMinutesPerTurn = 120
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root 'logs/unattended'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-Log([string]$Message) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Write-Output $line
  Add-Content -Path (Join-Path $logDir 'daemon.log') -Value $line -Encoding utf8
}

Write-Log "DAEMON start interval=${IntervalMinutes}m maxTurn=${MaxMinutesPerTurn}m"

while ($true) {
  $runner = Join-Path $root 'scripts/local-unattended-construction.ps1'
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runner -MaxMinutes $MaxMinutesPerTurn
  $code = $LASTEXITCODE
  Write-Log "DAEMON turn exit=$code sleeping ${IntervalMinutes}m"
  Start-Sleep -Seconds ($IntervalMinutes * 60)
}
