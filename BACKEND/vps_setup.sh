#!/bin/bash

# Sentinel VPS Networking Setup Script
# This script prepares the HOST machine for the Dockerized VPN.

echo "--- STARTING SENTINEL VPS SETUP ---"

# 1. Enable IP Forwarding (Kernel Level)
echo "[1/3] Enabling IPv4 Forwarding..."
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf

# 2. Configure Firewall (UFW)
echo "[2/3] Configuring Firewall..."
if command -v ufw > /dev/null; then
    sudo ufw allow 51820/udp
    sudo ufw allow 5000/tcp
    sudo ufw allow 22/tcp
    sudo ufw --force enable
    echo "✅ UFW Configured."
else
    echo "⚠️ UFW not found. Please ensure port 51820 UDP and 5000 TCP are open in your Cloud Dashboard."
fi

# 3. Load WireGuard Kernel Module (Prerequisite for Docker)
echo "[3/3] Ensuring WireGuard Kernel Module is loaded..."
sudo modprobe wireguard
sudo apt-get update
sudo apt-get install -y wireguard-tools

echo "--- SETUP COMPLETE ---"
echo "Your VPS is now a Bridge. You can now run your Docker container."
