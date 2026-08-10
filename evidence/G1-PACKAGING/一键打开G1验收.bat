@echo off
title ONEDAY G1 一键验收
cd /d D:\ONEDAY_V3
echo 正在打开验收页面（请稍等）...
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\ONEDAY_V3\scripts\open-g1-acceptance.ps1"
