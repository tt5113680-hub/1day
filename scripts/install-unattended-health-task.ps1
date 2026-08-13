# Register hourly health-check scheduled task (schtasks) with stale-lock auto-fix.
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$script = Join-Path $root 'scripts/unattended-health-check.ps1'
$taskName = 'ONEDAY-V3-Unattended-Health-6h'

if (-not (Test-Path $script)) {
  throw "Missing health check: $script"
}

# Hourly (name kept for compatibility). AutoFix is default inside the script.
$tr = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$script`" -StallHours 3"
$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
cmd /c "schtasks /Delete /TN `"$taskName`" /F" 2>$null | Out-Null
$create = cmd /c "schtasks /Create /TN `"$taskName`" /TR `"$tr`" /SC HOURLY /MO 1 /F" 2>&1
$ErrorActionPreference = $prev
if ($LASTEXITCODE -ne 0) {
  throw "schtasks create failed: $create"
}

Write-Output "Registered: $taskName (hourly; stale lock auto-clear)"
Write-Output 'Manual: pnpm unattended:health'
Write-Output "Remove: schtasks /Delete /TN `"$taskName`" /F"
