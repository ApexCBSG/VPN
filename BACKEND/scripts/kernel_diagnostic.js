const { Client } = require('ssh2');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const nodes = [
  { name: 'NY-01', host: '157.230.93.112', password: process.env.VPS_PASSWORD },
  { name: 'SF-01', host: '167.71.199.96', password: process.env.VPS_PASSWORD }
];

async function auditNode(node) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    console.log(`\n[DIAGNOSING: ${node.name}]...`);
    
    conn.on('ready', () => {
      // 1. Audit Kernel State
      // 2. Identify Public Interface
      // 3. Force Global Forwarding
      // 4. Reset NAT
      const script = `
        PUBLIC_IF=$(ip route | grep default | awk '{print $5}' | head -n1)
        echo "DETECTION: Public Interface is $PUBLIC_IF"
        
        # Check if wg0 is up
        if ip link show wg0 > /dev/null; then
          echo "INTERFACE: wg0 is UP."
        else
          echo "INTERFACE: wg0 is DOWN."
          sudo wg-quick up wg0 2>/dev/null || echo "ERROR: Could not bring up wg0"
        fi

        # Audit Kernel Handshakes
        echo "LIVE KERNEL DATA:"
        sudo wg show
        
        # Absolute Routing Reset
        sudo sysctl -w net.ipv4.ip_forward=1
        sudo iptables -t nat -F POSTROUTING
        sudo iptables -t nat -A POSTROUTING -o $PUBLIC_IF -j MASQUERADE
        sudo iptables -A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
        sudo iptables -A FORWARD -i wg0 -j ACCEPT
        
        echo "STATUS: Final Egress Gates OPEN on $PUBLIC_IF"
      `;

      conn.exec(script, (err, stream) => {
        if (err) return reject(err);
        stream.on('close', () => {
          conn.end();
          resolve();
        }).on('data', (d) => process.stdout.write(d));
      });
    }).on('error', (err) => {
      console.error(`[ERROR] ${node.name}: ${err.message}`);
      reject(err);
    }).connect({
      host: node.host,
      port: 22,
      username: 'root',
      password: node.password
    });
  });
}

(async () => {
  console.log('--- SENTINEL LIVE KERNEL AUDIT ---');
  for (const node of nodes) {
    try { await auditNode(node); } catch (e) { }
  }
  process.exit();
})();
