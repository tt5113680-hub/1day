# Run elevated once to re-enable unattended scheduled tasks after COST STOP clear.
# Right-click PowerShell → Run as administrator, then:
#   powershell -ExecutionPolicy Bypass -File D:\ONEDAY_V3\scripts\enable-unattended-after-cost-clear.ps1

Enable-ScheduledTask -TaskName 'ONEDAY-V3-Unattended-Construction' -ErrorAction Stop
Enable-ScheduledTask -TaskName 'ONEDAY-V3-Unattended-Daemon' -ErrorAction Stop
Get-ScheduledTask |
  Where-Object { $_.TaskName -match 'ONEDAY-V3-Unattended' } |
  Select-Object TaskName, State |
  Format-Table -AutoSize
Write-Host 'OK: unattended tasks enabled. Daemon will pick up after IDE Release / next poll.'
