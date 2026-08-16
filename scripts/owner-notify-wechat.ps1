param(
  [Parameter(Mandatory = $true)]
  [string]$Message,
  [string]$Root = 'D:\ONEDAY_V3'
)

$ErrorActionPreference = 'Stop'
$envFile = Join-Path $Root '.env.local-unattended'
$logDir = Join-Path $Root 'logs\unattended'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'owner-notify.log'

function Write-NotifyLog([string]$Line) {
  Add-Content -Path $log -Value ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Line) -Encoding utf8
}

if (Test-Path $envFile) {
  Get-Content $envFile -Encoding utf8 | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $k, $v = $_ -split '=', 2
    $k = $k.Trim()
    $v = $v.Trim().Trim('"').Trim("'")
    if ($k -and -not [string]::IsNullOrWhiteSpace($v)) {
      Set-Item -Path "Env:$k" -Value $v
    }
  }
}

$url = $env:OWNER_NOTIFY_WEBHOOK_URL
if ([string]::IsNullOrWhiteSpace($url)) { $url = $env:WECHAT_WEBHOOK_URL }

if ([string]::IsNullOrWhiteSpace($url)) {
  Write-NotifyLog "SKIP no OWNER_NOTIFY_WEBHOOK_URL / WECHAT_WEBHOOK_URL — message=$Message"
  exit 0
}

# Enterprise WeChat bot JSON; also works for many generic chat webhooks expecting text
$body = @{
  msgtype = 'text'
  text    = @{
    content = ("[ONEDAY] {0}`n{1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message)
  }
} | ConvertTo-Json -Compress -Depth 5

try {
  Invoke-RestMethod -Method Post -Uri $url -ContentType 'application/json; charset=utf-8' -Body $body | Out-Null
  Write-NotifyLog "OK sent len=$($Message.Length)"
  exit 0
} catch {
  Write-NotifyLog "FAIL $($_.Exception.Message)"
  exit 1
}
