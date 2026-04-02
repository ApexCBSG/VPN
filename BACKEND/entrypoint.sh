#!/bin/sh

# Sentinel Auto-Networking Entrypoint
# This script runs EVERY time the container starts in Coolify.

echo "--- SENTINEL BOOT SEQUENCE ---"

# 1. Attempt to enable IP Forwarding on the Host
# This requires 'Privileged Mode' in Coolify settings.
echo "[BOOT] Attempting to enable Kernel IP Forwarding..."
sysctl -w net.ipv4.ip_forward=1 || echo "⚠️ Warning: Could not set sysctl. Ensure Coolify 'Privileged Mode' is ON."

# 2. Start the Backend Application
echo "[BOOT] Starting Sentinel Backend..."
node index.js
