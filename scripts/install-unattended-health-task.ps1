# Register 6-hour health-check scheduled task (schtasks).
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$script = Join-Path $root 'scripts/unattended-health-check.ps1'
$taskName = 'ONEDAY-V3-Unattended-Health-6h'

if (-not (Test-Path $script)) {
  throw "Missing health check: $script"
}

$tr = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$script`" -StallHours 6"
$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
cmd /c "schtasks /Delete /TN `"$taskName`" /F" 2>$null | Out-Null
$create = cmd /c "schtasks /Create /TN `"$taskName`" /TR `"$tr`" /SC HOURLY /MO 6 /F" 2>&1
$ErrorActionPreference = $prev
if ($LASTEXITCODE -ne 0) {
  throw "schtasks create failed: $create"
}

Write-Output "Registered: $taskName (every 6 hours)"
Write-Output 'Manual: pnpm unattended:health'
Write-Output "Remove: schtasks /Delete /TN `"$taskName`" /F"
