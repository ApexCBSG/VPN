const { Client } = require('ssh2');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });
const Node = require('../models/Node');

async function fixDroplet() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const nodeInfo = await Node.findOne({ name: 'SF-01' });
  
  if (!nodeInfo) {
    fs.writeFileSync('sf01_status.txt', 'Node not found in DB');
    return process.exit();
  }

  const conn = new Client();
  conn.on('ready', () => {
    
    const script = `
      # Install wireguard if not present
      sudo apt update && sudo apt install wireguard -y
      
      # Check if wg0.conf exists
      if [ ! -f /etc/wireguard/wg0.conf ]; then
        echo "Creating wg0.conf..."
        # We must generate a new private key because we don't have the original one on the node itself
        wg genkey | tee /etc/wireguard/privatekey | wg pubkey > /etc/wireguard/publickey
        chmod 600 /etc/wireguard/privatekey
        
        PRIV_KEY=$(cat /etc/wireguard/privatekey)
        
        cat <<EOF > /etc/wireguard/wg0.conf
[Interface]
PrivateKey = $PRIV_KEY
Address = 10.64.0.1/24
ListenPort = 51820
SaveConfig = false
EOF
        sudo systemctl enable wg-quick@wg0
        sudo systemctl restart wg-quick@wg0
        echo "NEW_PUBKEY: $(cat /etc/wireguard/publickey)"
      else
        echo "wg0.conf already exists."
        sudo systemctl restart wg-quick@wg0
      fi
      ip addr show wg0
    `;

    conn.exec(script, (err, stream) => {
      let output = '';
      stream.on('close', async () => {
        conn.end();
        fs.writeFileSync('sf01_status.txt', output);
        
        const match = output.match(/NEW_PUBKEY:\s+(\S+)/);
        if (match) {
            nodeInfo.publicKey = match[1];
            await nodeInfo.save();
            fs.appendFileSync('sf01_status.txt', '\\n[+] Saved new PubKey to MongoDB!');
        }
        process.exit();
      }).on('data', d => output += d)
        .stderr.on('data', d => output += "ERR: " + d);
    });
  }).connect({
    host: '167.71.199.96',
    port: 22,
    username: 'root',
    password: 'MadMan12321@##**s',
    readyTimeout: 10000
  });
}

fixDroplet();
