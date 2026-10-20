#!/usr/bin/env bash
# Sets simulator privacy state and location for deterministic tests (task 6.5).
# Usage: scripts/sim-permissions.sh <all-granted|all-denied|reset> [device]
#   device defaults to "booted". The app bundle id is to.plank.app.
# Notifications: `simctl privacy` has no notification service, so the notification prompt is
# answered in the flow (Maestro taps "Allow" / "Don't Allow"); `reset` makes the prompt appear again.
set -euo pipefail
mode="${1:-}"
device="${2:-booted}"
bundle="to.plank.app"
# Fixed coordinates matching the stubbed weather place (Testville, 51.51 / -0.13).
lat="51.51"; lon="-0.13"

case "$mode" in
  all-granted)
    xcrun simctl privacy "$device" grant location "$bundle"
    xcrun simctl location "$device" set "$lat,$lon"
    ;;
  all-denied)
    xcrun simctl privacy "$device" revoke location "$bundle"
    ;;
  reset)
    xcrun simctl privacy "$device" reset all "$bundle"
    ;;
  *)
    echo "Usage: $0 <all-granted|all-denied|reset> [device]" >&2
    exit 2
    ;;
esac
echo "Simulator permissions: $mode ($device)"
