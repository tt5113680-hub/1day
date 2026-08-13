# IDE Agent mutex for construction — ALWAYS use TTL so forgotten sessions cannot block DeepSeek forever.
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Acquire', 'Release', 'Status')]
  [string]$Action,
  [string]$Holder = 'IDE-Agent',
  [int]$Minutes = 90
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/unattended-scheduler.ps1"

$paths = Ensure-UnattendedLogDir
$lockFile = $paths.LockFile

function Write-Out([string]$Message) {
  Write-Output $Message
  Add-Content -Path (Join-Path $paths.LogDir 'daemon.log') -Value ("[{0}] IDE-LOCK {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message) -Encoding utf8
}

switch ($Action) {
  'Status' {
    $info = Get-ConstructionLockInfo
    $info | ConvertTo-Json -Depth 4
    exit 0
  }
  'Release' {
    $info = Get-ConstructionLockInfo
    if ($info.exists -and $info.pidAlive -and $info.isIde -and $info.pid) {
      Stop-Process -Id $info.pid -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $lockFile) { Remove-Item $lockFile -Force -ErrorAction SilentlyContinue }
    Write-Out "released holder=$Holder"
    exit 0
  }
  'Acquire' {
    Clear-StaleConstructionLock | Out-Null
    $info = Get-ConstructionLockInfo
    if ($info.exists -and $info.pidAlive -and -not $info.isIde) {
      throw "Cannot acquire IDE lock: unattended turn active (pid=$($info.pid) holder=$($info.holder))"
    }
    if ($info.exists -and $info.pidAlive -and $info.isIde -and $info.pid) {
      Stop-Process -Id $info.pid -Force -ErrorAction SilentlyContinue
      Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
    }
    $ttl = [Math]::Max(15, [Math]::Min(180, $Minutes))
    $keeper = Start-Process -FilePath 'powershell' -ArgumentList @(
      '-NoProfile', '-Command', "while (`$true) { Start-Sleep -Seconds 60 }"
    ) -PassThru -WindowStyle Hidden
    $started = Get-Date
    $expires = $started.AddMinutes($ttl)
    $line = "pid={0} started={1} expires={2} holder={3}" -f $keeper.Id, $started.ToString('o'), $expires.ToString('o'), $Holder
    Set-Content -Path $lockFile -Value $line -Encoding utf8
    Write-Out "acquired pid=$($keeper.Id) ttl=${ttl}m expires=$($expires.ToString('o')) holder=$Holder"
    Write-Out 'REQUIRED: call Release when IDE session ends (or expires= auto-clears)'
    exit 0
  }
}
