# Run elevated to hard-stop DeepSeek scheduled tasks
Disable-ScheduledTask -TaskName "ONEDAY-V3-Unattended-Construction" -ErrorAction SilentlyContinue
Disable-ScheduledTask -TaskName "ONEDAY-V3-Unattended-Daemon" -ErrorAction SilentlyContinue
Get-ScheduledTask | Where-Object { $_.TaskName -match "ONEDAY-V3-Unattended" } | Select-Object TaskName, State | Format-Table -AutoSize
