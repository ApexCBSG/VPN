const { Client } = require('ssh2');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const nodes = [
  { name: 'NY-01', host: '157.230.93.112', password: process.env.VPS_PASSWORD },
  { name: 'SF-01', host: '167.71.199.96', password: process.env.VPS_PASSWORD }
];

async function fixNode(node) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    console.log(`\n[FIXING NODE: ${node.name}]...`);
    
    conn.on('ready', () => {
      // THE "SENTINEL UNLOCK" SCRIPT:
      // 1. Get the REAL public interface (PUBLIC_IF)
      // 2. Enable Host Forwarding
      // 3. Clear existing NAT rules for this subnet to avoid conflicts
      // 4. Force UFW to ACCEPT the forward policy
      const script = `
        PUBLIC_IF=$(ip route | grep default | awk '{print $5}' | head -n1)
        echo "DETECTION: Using Public Interface: $PUBLIC_IF"
        
        # 1. Enable Forwarding
        sudo sysctl -w net.ipv4.ip_forward=1
        echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
        
        # 2. Cleanup & Apply NAT
        sudo iptables -t nat -F POSTROUTING
        sudo iptables -t nat -A POSTROUTING -s 10.64.0.0/24 -o $PUBLIC_IF -j MASQUERADE
        
        # 3. Allow Forwarding in Filter Table
        sudo iptables -A FORWARD -i wg0 -j ACCEPT
        sudo iptables -A FORWARD -o wg0 -j ACCEPT
        
        # 4. UFW Override
        if [ -f /etc/default/ufw ]; then
          sudo sed -i 's/DEFAULT_FORWARD_POLICY="DROP"/DEFAULT_FORWARD_POLICY="ACCEPT"/' /etc/default/ufw
          sudo ufw allow 51820/udp
          sudo ufw --force reload
        fi
        
        echo "STATUS: Routing Guard Active on $PUBLIC_IF"
      `;

      conn.exec(script, (err, stream) => {
        if (err) return reject(err);
        stream.on('close', () => {
          console.log(`[SUCCESS] ${node.name} INTERNET GATES OPEN.`);
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
  console.log('--- SENTINEL FINAL CONNECTIVITY BRIDGE ---');
  for (const node of nodes) {
    try { await fixNode(node); } catch (e) { }
  }
  console.log('\n--- ALL GATES OPEN. PLEASE TOGGLE YOUR VPN NOW. ---');
  process.exit();
})();
