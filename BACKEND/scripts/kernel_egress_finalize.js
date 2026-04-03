const { Client } = require('ssh2');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const nodes = [
  { name: 'NY-01', host: '157.230.93.112', password: process.env.VPS_PASSWORD },
  { name: 'SF-01', host: '167.71.199.96', password: process.env.VPS_PASSWORD }
];

async function finalizeNode(node) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    console.log(`\n[FINALIZING EGRESS: ${node.name}]...`);
    
    conn.on('ready', () => {
      const script = `
        PUBLIC_IF=$(ip route | grep default | awk '{print $5}' | head -n1)
        
        # 1. Un-Block Forwarding at Kernel Level
        sudo sysctl -w net.ipv4.ip_forward=1
        
        # 2. Advanced Egress Clamping (The "Mobile Network" Fix)
        # Prevents packet drops on LTE/5G by adjusting segment size
        sudo iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
        
        # 3. Explicit NAT Route (Masquerading)
        # Map the internal WireGuard subnet (10.64.0.0/24) to the external IP
        sudo iptables -t nat -A POSTROUTING -s 10.64.0.0/24 -o $PUBLIC_IF -j MASQUERADE
        
        # 4. Filter Table Persistence
        sudo iptables -A FORWARD -i wg0 -j ACCEPT
        sudo iptables -A FORWARD -o wg0 -j ACCEPT
        
        # 5. Persist Rules (Survives Reboot)
        if ! command -v iptables-save &> /dev/null; then
          sudo apt-get update && sudo apt-get install -y iptables-persistent
        fi
        sudo iptables-save | sudo tee /etc/iptables/rules.v4
        sudo netfilter-persistent save
        
        echo "STATUS: Kernel Clamp Applied on $PUBLIC_IF"
      `;

      conn.exec(script, (err, stream) => {
        if (err) return reject(err);
        stream.on('close', () => {
          console.log(`[SUCCESS] ${node.name} INTERNET EXIT READY.`);
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
  console.log('--- SENTINEL KERNEL EGRESS FINALIZATION ---');
  for (const node of nodes) {
    try { await finalizeNode(node); } catch (e) { }
  }
  process.exit();
})();
