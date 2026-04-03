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
# 1. Disable UFW to prevent SSH lockouts
sudo ufw disable 2>/dev/null || true

# 2. Reset IPTables default policies & Flush
sudo iptables -P INPUT ACCEPT
sudo iptables -P FORWARD ACCEPT
sudo iptables -P OUTPUT ACCEPT
sudo iptables -F
sudo iptables -t nat -F

# 3. Enable IPv4 Forwarding
sudo sysctl -w net.ipv4.ip_forward=1
# Replace if exists, else append
sed -i '/net.ipv4.ip_forward/d' /etc/sysctl.conf
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf

# 4. Find Public Interface
PUBLIC_IF=$(ip route | grep default | awk '{print $5}' | head -n1)

# 5. Apply NAT and Forwarding Rules
sudo iptables -t nat -A POSTROUTING -s 10.64.0.0/24 -o $PUBLIC_IF -j MASQUERADE
sudo iptables -A FORWARD -i wg0 -j ACCEPT 2>/dev/null || true
sudo iptables -A FORWARD -o wg0 -j ACCEPT 2>/dev/null || true

# Save Rules
sudo DEBIAN_FRONTEND=noninteractive apt-get install iptables-persistent -y
sudo netfilter-persistent save

# 6. Install & Configure WireGuard
sudo apt update
sudo apt install wireguard -y

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

# Make sure iptables recognizes wg0 now it is about to be active
sudo iptables -D FORWARD -i wg0 -j ACCEPT 2>/dev/null || true
sudo iptables -A FORWARD -i wg0 -j ACCEPT
sudo iptables -D FORWARD -o wg0 -j ACCEPT 2>/dev/null || true
sudo iptables -A FORWARD -o wg0 -j ACCEPT
sudo netfilter-persistent save

# Start WG
sudo systemctl enable wg-quick@wg0
sudo systemctl restart wg-quick@wg0

# Print the public key for the script to harvest
echo "===PUBLIC_KEY_START==="
cat /etc/wireguard/publickey
echo "===PUBLIC_KEY_END==="
`;

const setupNode = async (nodeDb) => {
    return new Promise((resolve) => {
        console.log(`\n[*] Processing Node: ${nodeDb.name} (${nodeDb.ipAddress})`);
        const conn = new Client();
        
        conn.on('ready', () => {
            console.log(`[+] SSH Connected to ${nodeDb.name}`);
            conn.exec(getBashScript(), (err, stream) => {
                if (err) {
                    console.error(`[-] EXEC Error on ${nodeDb.name}: ${err.message}`);
                    return resolve(false);
                }
                
                let output = '';
                stream.on('close', async () => {
                    conn.end();
                    // Parse Public Key
                    const keyMatch = output.match(/===PUBLIC_KEY_START===\\n(.*?)\\n===PUBLIC_KEY_END===/m);
                    if (keyMatch && keyMatch[1]) {
                        const newPubKey = keyMatch[1].trim();
                        console.log(`[+] Extracted New Public Key: ${newPubKey}`);
                        
                        await Node.updateOne({ _id: nodeDb._id }, { publicKey: newPubKey });
                        console.log(`[+] Successfully Updated MongoDB for ${nodeDb.name} with key: ${newPubKey}`);
                        resolve(true);
                    } else {
                        console.log(`[-] Could not extract public key from ${nodeDb.name}. Output:`, output);
                        resolve(false);
                    }
                }).on('data', d => output += d).stderr.on('data', d => output += d);
            });
        }).on('error', (err) => {
            console.log(`[-] SSH Timeout/Error for ${nodeDb.name}: ${err.message}`);
            resolve(false);
        }).connect({
            host: nodeDb.ipAddress,
            port: 22,
            username: 'root',
            password: process.env.VPS_PASSWORD,
            readyTimeout: 10000 // Only wait 10s so we skip dead nodes quickly
        });
    });
};

const runProvisioning = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        const nodes = await Node.find({ name: { $in: ['NY-01', 'SF-01'] } });
        
        if (!nodes || nodes.length === 0) {
            console.log("No matching nodes found in DB.");
            process.exit(1);
        }

        console.log(`Found ${nodes.length} nodes to provision.`);
        for (const node of nodes) {
            await setupNode(node);
        }
        
    } catch (e) {
        console.error("Fatal Error:", e);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

runProvisioning();
