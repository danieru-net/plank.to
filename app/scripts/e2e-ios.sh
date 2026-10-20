#!/usr/bin/env bash
# macOS + iOS Simulator end-to-end runner (tasks 6.7 and 6.8).
# Usage: npm run test:e2e:ios [-- <flow-name> ...]      e.g. npm run test:e2e:ios -- smoke task-lifecycle
# Env:   E2E_DEVICE   simulator name or UDID (default: the booted one, else the newest iPhone)
#        E2E_REBUILD=1  force a fresh native build even if the app is installed
#        E2E_FLOWS_DIR  flow folder (default .maestro)
#        E2E_ARTIFACTS_ROOT  output root (default artifacts/e2e)
# Steps: pick/boot simulator, install the dev build if missing, start Metro in test mode, then for
# each flow: record the screen, run Maestro (each flow clears app data and seeds test data), stop
# the recording, keep the logs. Exit status is non-zero if any flow failed.
set -uo pipefail

cd "$(dirname "$0")/.."
APP_ID="to.plank.app"
FLOWS_DIR="${E2E_FLOWS_DIR:-.maestro}"
STAMP="$(date +%Y%m%d-%H%M%S)"
ROOT="${E2E_ARTIFACTS_ROOT:-artifacts/e2e}"
OUT="$ROOT/$STAMP"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
METRO_PID=""
REC_PID=""

log() { printf '[e2e] %s\n' "$*"; }
die() { printf '[e2e] ERROR: %s\n' "$*" >&2; exit 2; }

# Finalize a recording: simctl only writes a playable MP4 after SIGINT.
stop_recording() {
  if [ -n "$REC_PID" ]; then
    kill -INT "$REC_PID" 2>/dev/null
    local i=0
    while kill -0 "$REC_PID" 2>/dev/null && [ $i -lt 100 ]; do sleep 0.1; i=$((i + 1)); done
    kill -KILL "$REC_PID" 2>/dev/null
    wait "$REC_PID" 2>/dev/null
    REC_PID=""
  fi
}

cleanup() {
  stop_recording
  if [ -n "$METRO_PID" ]; then
    kill "$METRO_PID" 2>/dev/null
    pkill -P "$METRO_PID" 2>/dev/null
    wait "$METRO_PID" 2>/dev/null
  fi
}
trap cleanup EXIT
trap 'log "interrupted"; exit 130' INT TERM

command -v xcrun >/dev/null || die "xcrun not found; install Xcode."
command -v maestro >/dev/null || die "maestro not found; see README (brew install mobile-dev-inc/tap/maestro)."
command -v node >/dev/null || die "node not found."

# 1. Simulator
DEVICE="${E2E_DEVICE:-}"
if [ -z "$DEVICE" ]; then
  DEVICE="$(xcrun simctl list devices booted | grep -Eo '[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}' | head -1)"
fi
if [ -z "$DEVICE" ]; then
  DEVICE="$(xcrun simctl list devices available | grep -E '^\s+iPhone ' | tail -1 | grep -Eo '[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}')"
fi
[ -n "$DEVICE" ] || die "no iOS Simulator found."
xcrun simctl boot "$DEVICE" 2>/dev/null || true
xcrun simctl bootstatus "$DEVICE" -b >/dev/null 2>&1 || die "simulator $DEVICE did not boot."
open -a Simulator >/dev/null 2>&1 || true
DEVICE_INFO="$(xcrun simctl list devices | grep "$DEVICE" | head -1 | sed 's/^ *//')"
log "simulator: $DEVICE_INFO"

# Fixed simulator location (matches the stubbed place) for the device-location flows.
xcrun simctl location "$DEVICE" set 51.51,-0.13 >/dev/null 2>&1 || log "warning: could not set simulator location"

# 2. App build (reuse an installed one)
if [ "${E2E_REBUILD:-0}" != "1" ] && xcrun simctl get_app_container "$DEVICE" "$APP_ID" >/dev/null 2>&1; then
  log "reusing installed build (E2E_REBUILD=1 forces a rebuild)"
else
  log "building and installing the app (first run can take several minutes)"
  EXPO_USE_PRECOMPILED_MODULES=0 npx expo run:ios --device "$DEVICE" --no-bundler >"$OUT/build.log" 2>&1 \
    || die "build failed; see $OUT/build.log"
fi

# 3. Metro in test mode (stubbed weather, seed route). Needs port 8081 free.
if curl -fs http://localhost:8081/status >/dev/null 2>&1; then
  die "something is already serving port 8081; stop it (Metro must run in test mode)."
fi
log "starting Metro in test mode"
EXPO_PUBLIC_PLANK_TEST_MODE=1 CI=1 npx expo start --dev-client --clear --port 8081 >"$OUT/metro.log" 2>&1 &
METRO_PID=$!
for _ in $(seq 1 120); do
  curl -fs http://localhost:8081/status 2>/dev/null | grep -q running && break
  kill -0 "$METRO_PID" 2>/dev/null || die "Metro exited; see $OUT/metro.log"
  sleep 1
done
curl -fs http://localhost:8081/status 2>/dev/null | grep -q running || die "Metro did not start; see $OUT/metro.log"

# 4. Flows
FLOWS=()
if [ "$#" -gt 0 ]; then
  for n in "$@"; do n="${n%.yaml}"; n="${n##*/}"; FLOWS+=("$FLOWS_DIR/$n.yaml"); done
else
  for f in "$FLOWS_DIR"/*.yaml; do FLOWS+=("$f"); done
fi
for f in "${FLOWS[@]}"; do [ -f "$f" ] || die "flow not found: $f"; done

PASSED=(); FAILED=()
SUMMARY="$OUT/summary.txt"
: >"$SUMMARY"
for flow in "${FLOWS[@]}"; do
  name="$(basename "$flow" .yaml)"
  dir="$OUT/$name"
  mkdir -p "$dir"
  log "running $name"
  xcrun simctl io "$DEVICE" recordVideo --codec h264 --force "$dir/$name.mp4" >"$dir/recording.log" 2>&1 &
  REC_PID=$!
  sleep 1
  maestro test --udid "$DEVICE" --format junit --output "$dir/report.xml" \
    --debug-output "$dir/maestro-debug" --flatten-debug-output "$flow" >"$dir/maestro.log" 2>&1
  status=$?
  stop_recording
  if [ "$status" -eq 0 ]; then
    PASSED+=("$name"); echo "PASS $name" | tee -a "$SUMMARY"
  else
    FAILED+=("$name"); echo "FAIL $name (exit $status)" | tee -a "$SUMMARY"
  fi
  [ -s "$dir/$name.mp4" ] || log "warning: no video written for $name"
done

# 5. Report
ln -sfn "$STAMP" "$ROOT/latest"
log "passed: ${#PASSED[@]}, failed: ${#FAILED[@]}"
log "artifacts: $OUT  (also $ROOT/latest)"
if [ "${#FAILED[@]}" -gt 0 ]; then
  log "failed flows: ${FAILED[*]}"
  exit 1
fi
exit 0
