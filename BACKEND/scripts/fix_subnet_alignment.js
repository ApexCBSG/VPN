const { Client } = require('ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const nodes = [
  { name: 'NY-01', host: '157.230.93.112', password: process.env.VPS_PASSWORD },
  { name: 'SF-01', host: '167.71.199.96', password: process.env.VPS_PASSWORD }
];

async function alignSubnet(node) {
  return new Promise((resolve) => {
    const conn = new Client();
    console.log(`\n[FIXING SUBNET: ${node.name}]...`);
    
    conn.on('ready', () => {
      const script = `
        # 1. Reset wg0 IP to correct 10.64.0.1 subnet
        sudo ip link set wg0 down
        sudo ip addr flush dev wg0
        sudo ip addr add 10.64.0.1/24 dev wg0
        sudo ip link set wg0 up
        
        # 2. Verify Final Routing Status
        echo "NEW SUBNET STATUS:"
        ip addr show wg0 | grep inet
        
        # 3. Ensure Masquerade is correct
        PUBLIC_IF=$(ip route | grep default | awk '{print $5}' | head -n1)
        sudo iptables -t nat -D POSTROUTING -s 10.64.0.0/24 -o $PUBLIC_IF -j MASQUERADE 2>/dev/null || true
        sudo iptables -t nat -A POSTROUTING -s 10.64.0.0/24 -o $PUBLIC_IF -j MASQUERADE
        
        echo "EGRESS ALIGNED ON $PUBLIC_IF"
      `;

      conn.exec(script, (err, stream) => {
        if (err) { console.error(err); resolve(); return; }
        stream.on('close', () => {
          conn.end();
          console.log(`[SUCCESS] ${node.name} Subnet Re-Aligned.`);
          resolve();
        }).on('data', (d) => process.stdout.write(d));
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
  console.log('--- SENTINEL NETWORK REALIGNMENT ---');
  for (const node of nodes) await alignSubnet(node);
  process.exit();
})();
