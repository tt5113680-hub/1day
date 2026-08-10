#!/usr/bin/env bash
# Phase-1 pilot post-deploy smoke (P1-C). Usage: ./healthcheck.sh https://api.example.com
set -euo pipefail
BASE="${1:?API base URL required, e.g. https://api.example.com}"
HEALTH="${BASE%/}/api/v1/health"
echo "Checking ${HEALTH}"
BODY="$(curl -fsS "${HEALTH}")"
echo "${BODY}" | grep -q '"status":"ok"' || { echo "health status not ok"; exit 1; }
echo "${BODY}" | grep -q '"database":"ready"' || { echo "database not ready"; exit 1; }
echo "PASS: API health ready"
