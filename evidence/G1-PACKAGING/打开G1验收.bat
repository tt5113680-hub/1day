@echo off
chcp 65001 >nul
cd /d D:\ONEDAY_V3
echo Starting G1 acceptance pages...
start "" "D:\ONEDAY_V3\evidence\G1-PACKAGING\G1-ACCEPTANCE-LINKS.html"
start "" "http://127.0.0.1:3200/api/v1/health"
start "" "http://127.0.0.1:3201/c/stores/30000000-0000-4000-8000-000000000021?tenant=luckin-oneday-human-pilot"
start "" "http://127.0.0.1:3201/c/discovery?tenant=luckin-oneday-human-pilot&latitude=39.9087&longitude=116.4619"
start "" "http://127.0.0.1:3202/e/login"
start "" "http://127.0.0.1:3203/login"
start "" "http://127.0.0.1:3204/login"
echo Done. If pages fail, run: pnpm human-pilot:start
pause
