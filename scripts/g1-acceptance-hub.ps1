$ErrorActionPreference = "Stop"
$port = 3299
$url = "http://127.0.0.1:$port/"
$htmlPath = "D:\ONEDAY_V3\evidence\G1-PACKAGING\G1-ACCEPTANCE-LINKS.html"
$body = Get-Content -Path $htmlPath -Raw -Encoding UTF8
Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($url)
$listener.Start()
Write-Output "G1 hub listening on $url"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  $res.ContentType = "text/html; charset=utf-8"
  $res.ContentLength64 = $bytes.Length
  $res.OutputStream.Write($bytes, 0, $bytes.Length)
  $res.OutputStream.Close()
}
