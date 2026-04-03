const { Client } = require('ssh2');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const NodeSchema = new mongoose.Schema({
  name: String, ipAddress: String, port: Number, publicKey: String, 
  location: String, isActive: Boolean, load: Number, createdAt: Date
});
const Node = mongoose.model('Node', NodeSchema);

const nodeConfig = {
  name: 'SENTINEL-MASTER',
  host: '187.77.147.155',
  password: 'N6-J,/1DqePkK##M)8tj',
  port: 51820
};

async function deployNode() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    console.log(`\n[DEPLOYING SENTINEL-MASTER] (${nodeConfig.host})...`);
    
    conn.on('ready', () => {
      const script = `
        # 1. Install WireGuard (Non-Interactive)
        export DEBIAN_FRONTEND=noninteractive
        sudo apt-get update && sudo apt-get install -y wireguard iptables-persistent
        
        # 2. Generate Keys
        PRIV_KEY=$(wg genkey)
        PUB_KEY=$(echo $PRIV_KEY | wg pubkey)
        
        # 3. Create Interface wg0
        sudo ip link add dev wg0 type wireguard
        sudo ip addr add 10.64.0.1/24 dev wg0
        sudo wg set wg0 listen-port ${nodeConfig.port} private-key <(echo $PRIV_KEY)
        sudo ip link set wg0 up
        
        # 4. Networking Fixes (Forwarding & NAT)
        sudo sysctl -w net.ipv4.ip_forward=1
        PUBLIC_IF=$(ip route | grep default | awk '{print $5}' | head -n1)
        sudo iptables -t nat -A POSTROUTING -s 10.64.0.0/24 -o $PUBLIC_IF -j MASQUERADE
        sudo iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
        sudo iptables-save | sudo tee /etc/iptables/rules.v4
        
        # 5. Output for DB
        echo "KV_PUB_KEY=$PUB_KEY"
        echo "STATUS: DEPLOYED"
      `;

      conn.exec(script, (err, stream) => {
        if (err) return reject(err);
        let output = '';
        stream.on('close', async () => {
          const match = output.match(/KV_PUB_KEY=(.+)/);
          const publicKey = match ? match[1].trim() : null;
          
          if (publicKey) {
            console.log(`[SUCCESS] Public Key Generated: ${publicKey}`);
            await updateDb(publicKey);
          } else {
            console.error('[ERROR] Could not extract Public Key.');
          }
          conn.end();
          resolve();
        }).on('data', (d) => {
          output += d.toString();
          process.stdout.write(d);
        });
      });
    }).on('error', reject).connect({
      host: nodeConfig.host, port: 22, username: 'root', password: nodeConfig.password
    });
  });
}

async function updateDb(publicKey) {
  await mongoose.connect(process.env.MONGODB_URI);
  // Upsert the Central Node in the database
  await Node.findOneAndUpdate(
    { ipAddress: nodeConfig.host },
    {
      name: nodeConfig.name,
      port: nodeConfig.port,
      publicKey: publicKey,
      location: 'Global Hub',
      isActive: true,
      load: 0,
      createdAt: new Date()
    },
    { upsert: true, new: true }
  );
  console.log('[DB] Central Node Registered in Sentinel Network.');
}

(async () => {
  try { await deployNode(); } catch (e) { console.error(e); }
  process.exit();
})();
