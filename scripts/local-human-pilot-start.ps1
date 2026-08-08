param([switch]$NoBuild)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$env:DATABASE_URL = 'postgresql://oneday:oneday_local_only@127.0.0.1:5434/oneday_human_pilot'
$env:AUTH_TOKEN_SECRET = 'local-human-pilot-auth-secret-2026-08-08-only'
$logs = Join-Path $root '.local-human-pilot'
New-Item -ItemType Directory -Force -Path $logs | Out-Null

Push-Location $root
try {
  if (-not $NoBuild) { pnpm.cmd build }
  pnpm.cmd db:migrate
  node scripts/local-human-pilot-seed.mjs
  $services = @(
    @{ Name = 'api'; Port = 3001; Command = 'pnpm.cmd'; Args = @('--filter', '@oneday/api', 'dev'); Env = @{ PORT = '3001' } },
    @{ Name = 'worker'; Port = 3002; Command = 'pnpm.cmd'; Args = @('--filter', '@oneday/worker', 'dev'); Env = @{ HEALTH_PORT = '3002' } },
    @{ Name = 'consumer-web'; Port = 3171; Command = 'pnpm.cmd'; Args = @('--filter', '@oneday/consumer-web', 'exec', 'next', 'start', '--port', '3171', '--hostname', '127.0.0.1'); Env = @{ API_BASE_URL = 'http://127.0.0.1:3001'; NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:3001' } },
    @{ Name = 'employee-web'; Port = 3172; Command = 'pnpm.cmd'; Args = @('--filter', '@oneday/employee-web', 'exec', 'next', 'start', '--port', '3172', '--hostname', '127.0.0.1'); Env = @{ NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:3001' } },
    @{ Name = 'management-web'; Port = 3173; Command = 'pnpm.cmd'; Args = @('--filter', '@oneday/management-web', 'exec', 'next', 'start', '--port', '3173', '--hostname', '127.0.0.1'); Env = @{ NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:3001' } },
    @{ Name = 'platform-web'; Port = 3174; Command = 'pnpm.cmd'; Args = @('--filter', '@oneday/platform-web', 'exec', 'next', 'start', '--port', '3174', '--hostname', '127.0.0.1'); Env = @{ NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:3001' } }
  )
  foreach ($service in $services) {
    $existing = Get-NetTCPConnection -LocalPort $service.Port -State Listen -ErrorAction SilentlyContinue
    if ($existing) { throw "Port already in use for $($service.Name)" }
    $command = "`$env:DATABASE_URL='$env:DATABASE_URL'; `$env:AUTH_TOKEN_SECRET='$env:AUTH_TOKEN_SECRET'; "
    foreach ($pair in $service.Env.GetEnumerator()) { $command += "`$env:$($pair.Key)='$($pair.Value)'; " }
    $command += "& '$($service.Command)' $($service.Args -join ' ')"
    Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile', '-Command', $command -RedirectStandardOutput (Join-Path $logs "$($service.Name).out.log") -RedirectStandardError (Join-Path $logs "$($service.Name).err.log")
  }
  Write-Output 'Local HUMAN PILOT services started. Logs: .local-human-pilot'
} finally { Pop-Location }
