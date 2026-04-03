const { Client } = require('ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const nodes = [
  { name: 'NY-01', host: '157.230.93.112', password: process.env.VPS_PASSWORD },
  { name: 'SF-01', host: '167.71.199.96', password: process.env.VPS_PASSWORD },
  { name: 'CENTRAL_NODE', host: '187.77.147.155', password: 'N6-J,/1DqePkK##M)8tj' }
];

async function forceOpen(node) {
  return new Promise((resolve) => {
    const conn = new Client();
    console.log(`\n[FORCE-OPENING PORT: ${node.name}]...`);
    
    conn.on('ready', () => {
      const script = `
        # 1. Kill any blocking internal firewall
        sudo ufw disable || true
        
        # 2. Force Accept UDP 51820 (WireGuard)
        sudo iptables -I INPUT -p udp --dport 51820 -j ACCEPT
        
        # 3. Force Kernel Forwarding
        sudo sysctl -w net.ipv4.ip_forward=1
        
        # 4. Re-Apply Egress Masquerade
        PUBLIC_IF=$(ip route | grep default | awk '{print $5}' | head -n1)
        sudo iptables -t nat -A POSTROUTING -s 10.64.0.0/24 -o $PUBLIC_IF -j MASQUERADE
        
        # 5. Persist
        sudo iptables-save | sudo tee /etc/iptables/rules.v4
        
        echo "PORT 51820 IS NOW OPEN ON ${node.host}"
      `;

      conn.exec(script, (err, stream) => {
        if (err) { console.error(err); resolve(); return; }
        stream.on('close', () => { conn.end(); resolve(); }).on('data', (d) => process.stdout.write(d));
      });
    }).on('error', (err) => {
      console.error(`[ERROR] ${node.name}: ${err.message}`);
      resolve();
    }).connect({
      host: node.host, port: 22, username: 'root', password: node.password
    });
  });
}

(async () => {
  for (const node of nodes) await forceOpen(node);
  process.exit();
})();
