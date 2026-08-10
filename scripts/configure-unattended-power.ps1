# ONEDAY V3 — power profile for 24h unattended construction + screen protection.
# Run once as user (no admin required for most powercfg changes).
$ErrorActionPreference = 'Stop'

Write-Output 'Configuring unattended construction power profile...'

# Never sleep / hibernate (machine stays awake for scheduled tasks + OpenCode)
powercfg /change standby-timeout-ac 0
powercfg /change standby-timeout-dc 0
powercfg /change hibernate-timeout-ac 0
powercfg /change hibernate-timeout-dc 0

# Turn display off after 10 min (protect screen; system keeps running)
powercfg /change monitor-timeout-ac 10
powercfg /change monitor-timeout-dc 10

# Lid close = do nothing (laptop can stay closed while plugged in)
$scheme = (powercfg /getactivescheme) -replace '.*: ([a-f0-9-]+).*', '$1'
if ($scheme -match '^[a-f0-9-]{36}$') {
  powercfg -setacvalueindex $scheme SUB_BUTTONS LIDACTION 0 | Out-Null
  powercfg -setdcvalueindex $scheme SUB_BUTTONS LIDACTION 0 | Out-Null
  powercfg /setactive $scheme | Out-Null
}

# Keep disk awake on AC (avoid spin-down during long builds)
powercfg -setacvalueindex $scheme SUB_DISK DISKIDLE 0 | Out-Null
powercfg /setactive $scheme | Out-Null

Write-Output 'Done. Summary:'
Write-Output '  sleep/hibernate: NEVER (AC + battery)'
Write-Output '  display off: 10 minutes (AC + battery)'
Write-Output '  lid close: do nothing'
Write-Output '  disk idle (AC): never'
Write-Output ''
Write-Output 'Tip: close Cursor IDE when not watching — it can block display sleep.'
