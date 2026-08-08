param([switch]$NoBuild)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$env:DATABASE_URL = 'postgresql://oneday:oneday_local_only@127.0.0.1:5434/oneday_human_pilot'
$env:AUTH_TOKEN_SECRET = 'local-human-pilot-auth-secret-2026-08-08-only'
Push-Location $root
try {
  if (-not $NoBuild) { pnpm.cmd build }
  pnpm.cmd db:migrate
  node scripts/local-human-pilot-seed.mjs
  docker compose -f infra/docker/human-pilot.compose.yaml up --build -d
  Write-Output 'Local HUMAN PILOT services started in production mode on ports 3200-3205.'
} finally { Pop-Location }
