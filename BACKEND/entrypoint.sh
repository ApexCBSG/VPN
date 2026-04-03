#!/bin/sh

# Sentinel Auto-Networking Entrypoint
# This script runs EVERY time the container starts in Coolify.

echo "--- SENTINEL BOOT SEQUENCE ---"

# 1. Forwarding fixed on Host Node
echo "[BOOT] Kernel IP Forwarding is active (Host Override)."

# 2. Start the Backend Application
echo "[BOOT] Starting Sentinel Backend..."
node index.js
