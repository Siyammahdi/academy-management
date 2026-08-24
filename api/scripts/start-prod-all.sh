#!/usr/bin/env bash
# Runs HTTP API + BullMQ worker in one process group (Render free tier:
# no separate background worker needed). Email-dispatch jobs are consumed here.
set -euo pipefail

cd "$(dirname "$0")/.."

node dist/src/worker.js &
worker_pid=$!

cleanup() {
  kill "$worker_pid" 2>/dev/null || true
}
trap cleanup SIGTERM SIGINT

node dist/src/main.js
