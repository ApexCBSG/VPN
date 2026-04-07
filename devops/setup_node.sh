#!/bin/bash
set -e

echo "Starting Sentinel Node Setup..."

# Update and install
apt-get update
apt-get install -y wireguard ufw qrencode

# Enable IP Forwarding
echo "net.ipv4.ip_forward=1" > /etc/sysctl.d/99-wireguard.conf
sysctl -p /etc/sysctl.d/99-wireguard.conf

# Generate Keys if not exist
if [ ! -f /etc/wireguard/private.key ]; then
    wg genkey | tee /etc/wireguard/private.key | wg pubkey > /etc/wireguard/public.key
    chmod 600 /etc/wireguard/private.key
fi

PRIV_KEY=$(cat /etc/wireguard/private.key)
PUB_KEY=$(cat /etc/wireguard/public.key)

# Configure Interface
cat > /etc/wireguard/wg0.conf <<EOF
[Interface]
PrivateKey = $PRIV_KEY
Address = 10.64.0.1/24
ListenPort = 51820
SaveConfig = false

PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
EOF

# Setup Firewall
ufw allow 51820/udp
ufw allow 5001/tcp
ufw allow ssh
yes | ufw enable

# ---------------------------------------------------------
# Sentinel Node Auditor Setup (Zero-Dependency)
# ---------------------------------------------------------
echo "Installing High-Performance Nginx Auditor..."

# Ensure Nginx is installed
apt-get install -y nginx

# Prepare Speed Test Directory
mkdir -p /var/www/speedtest
dd if=/dev/urandom of=/var/www/speedtest/download bs=1M count=3
echo "pong" > /var/www/speedtest/ping

# Configure Nginx for Diagnostics on Port 5001
cat > /etc/nginx/sites-available/sentinel-speedtest <<EOF
server {
    listen 5001;
    root /var/www/speedtest;
    index index.html;

    # CORS Headers for Mobile App
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;

    location / {
        try_files \$uri \$uri/ =404;
    }

    # High-Performance Download
    location /download {
        default_type application/octet-stream;
        alias /var/www/speedtest/download;
    }

    # Upload Sink (Consumes up to 20MB)
    location /upload {
        client_max_body_size 20M;
        if (\$request_method = 'POST') {
            return 200 '{"status":"ok"}';
        }
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
EOF

ln -sf /etc/nginx/sites-available/sentinel-speedtest /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

systemctl restart nginx

# Start Service
systemctl enable wg-quick@wg0
systemctl restart wg-quick@wg0

echo "Setup Complete!"
echo "PUBLIC_KEY=$PUB_KEY"
echo "AUDITOR_PORT=5001"
