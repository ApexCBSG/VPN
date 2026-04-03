const mongoose = require('mongoose');
const { Client } = require('ssh2');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });
const Node = require('../models/Node');

// Bash sequence to provision WireGuard safely
const getBashScript = () => `
#!/bin/bash
sudo ufw disable 2>/dev/null || true
sudo iptables -P INPUT ACCEPT
sudo iptables -P FORWARD ACCEPT
sudo iptables -P OUTPUT ACCEPT
sudo iptables -F
sudo iptables -t nat -F

sudo sysctl -w net.ipv4.ip_forward=1
sed -i '/net.ipv4.ip_forward/d' /etc/sysctl.conf
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf

PUBLIC_IF=$(ip route | grep default | awk '{print $5}' | head -n1)
sudo iptables -t nat -A POSTROUTING -s 10.64.0.0/24 -o $PUBLIC_IF -j MASQUERADE
sudo iptables -A FORWARD -i wg0 -j ACCEPT 2>/dev/null || true
sudo iptables -A FORWARD -o wg0 -j ACCEPT 2>/dev/null || true

sudo DEBIAN_FRONTEND=noninteractive apt-get install iptables-persistent wireguard -y
sudo netfilter-persistent save

if [ ! -f /etc/wireguard/privatekey ]; then
    wg genkey | tee /etc/wireguard/privatekey | wg pubkey > /etc/wireguard/publickey
    chmod 600 /etc/wireguard/privatekey
fi

PRIV_KEY=$(cat /etc/wireguard/privatekey)

cat <<EOF > /etc/wireguard/wg0.conf
[Interface]
PrivateKey = $PRIV_KEY
Address = 10.64.0.1/24
ListenPort = 51820
SaveConfig = false
EOF

sudo iptables -D FORWARD -i wg0 -j ACCEPT 2>/dev/null || true
sudo iptables -A FORWARD -i wg0 -j ACCEPT
sudo iptables -D FORWARD -o wg0 -j ACCEPT 2>/dev/null || true
sudo iptables -A FORWARD -o wg0 -j ACCEPT
sudo netfilter-persistent save

sudo systemctl enable wg-quick@wg0
sudo systemctl restart wg-quick@wg0

# Print the public key for the script to harvest
echo "===PUBLIC_KEY_START==="
cat /etc/wireguard/publickey
echo "===PUBLIC_KEY_END==="
`;

const setupNode = async (nodeDb) => {
    return new Promise((resolve) => {
        const conn = new Client();
        
        conn.on('ready', () => {
            conn.exec(getBashScript(), (err, stream) => {
                let output = '';
                stream.on('close', async () => {
                    conn.end();
                    const keyMatch = output.match(/===PUBLIC_KEY_START===\\n(.*?)\\n===PUBLIC_KEY_END===/m);
                    if (keyMatch && keyMatch[1]) {
                        const newPubKey = keyMatch[1].trim();
                        
                        await Node.updateOne({ name: nodeDb.name }, { $set: { publicKey: newPubKey } });
                        console.log(`[+] SUCCESS: Updated ${nodeDb.name} with key ${newPubKey}`);
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }).on('data', d => output += d).stderr.on('data', d => output += d);
            });
        }).on('error', (err) => {
            resolve(false);
        }).connect({
            host: nodeDb.ipAddress,
            port: 22,
            username: 'root',
            password: process.env.VPS_PASSWORD,
            readyTimeout: 15000
        });
    });
};

const runProvisioning = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const nodes = await Node.find({ name: { $in: ['NY-01', 'SF-01'] } });
    
    for (const node of nodes) {
        await setupNode(node);
    }
    mongoose.connection.close();
    process.exit();
};

runProvisioning();
