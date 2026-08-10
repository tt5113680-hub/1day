# Start unattended daemon at user logon (hidden). Shares lock with scheduled orchestrator.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$daemon = Join-Path $root 'scripts/local-unattended-daemon.ps1'
$taskName = 'ONEDAY-V3-Unattended-Daemon'

if (-not (Test-Path $daemon)) { throw "Missing $daemon" }

$tr = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$daemon`""
$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
cmd /c "schtasks /Delete /TN `"$taskName`" /F" 2>$null | Out-Null
$create = cmd /c "schtasks /Create /TN `"$taskName`" /TR `"$tr`" /SC ONLOGON /RL LIMITED /F" 2>&1
$ErrorActionPreference = $prev
if ($LASTEXITCODE -ne 0) {
  throw "schtasks create failed: $create"
}

Write-Output "Registered: $taskName (starts at logon, hidden daemon loop)"
Write-Output "Remove: schtasks /Delete /TN `"$taskName`" /F"
