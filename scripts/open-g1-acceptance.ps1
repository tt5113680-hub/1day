# One-click G1 acceptance: ensure services hint + serve clickable hub + open browser.
$ErrorActionPreference = 'Continue'
$root = 'D:\ONEDAY_V3'
$html = Join-Path $root 'evidence\G1-PACKAGING\G1-ACCEPTANCE-LINKS.html'
$port = 3299
$url = "http://127.0.0.1:$port/"

# Health check — if API down, try start pilot (non-blocking long start)
try {
  $null = Invoke-WebRequest -Uri 'http://127.0.0.1:3200/api/v1/health' -UseBasicParsing -TimeoutSec 3
} catch {
  Write-Host 'API not up — starting human-pilot (wait ~30s)...'
  Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File', (Join-Path $root 'scripts\local-human-pilot-start.ps1') -WorkingDirectory $root
  Start-Sleep -Seconds 25
}

# Kill previous hub on same port if any
Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($url)
$listener.Start()
Write-Host "G1 hub: $url"
Start-Process $url

# Also open the four terminals directly (no copy-paste)
Start-Process 'http://127.0.0.1:3200/api/v1/health'
Start-Process 'http://127.0.0.1:3201/c/stores/30000000-0000-4000-8000-000000000021?tenant=luckin-oneday-human-pilot'
Start-Process 'http://127.0.0.1:3201/c/discovery?tenant=luckin-oneday-human-pilot&latitude=39.9087&longitude=116.4619'
Start-Process 'http://127.0.0.1:3202/e/login'
Start-Process 'http://127.0.0.1:3203/login'
Start-Process 'http://127.0.0.1:3204/login'

$body = Get-Content -Path $html -Raw -Encoding UTF8
# Rewrite relative md links to file explorer hints (keep http buttons as-is)
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  $res.ContentType = 'text/html; charset=utf-8'
  $res.ContentLength64 = $bytes.Length
  $res.OutputStream.Write($bytes, 0, $bytes.Length)
  $res.OutputStream.Close()
}
