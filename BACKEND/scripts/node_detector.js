const { Client } = require('ssh2');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const nodes = [
  { name: 'NY-01', host: '157.230.93.112', password: process.env.VPS_PASSWORD },
  { name: 'SF-01', host: '167.71.199.96', password: process.env.VPS_PASSWORD }
];

async function detectAndFix(node) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      console.log(`\n[NODE: ${node.name}]`);
      
      // 1. Find public interface
      // 2. Enable Forwarding
      // 3. Clear and Reset NAT
      // 4. Force UFW to allow routing
      const script = `
        PUBLIC_IF=$(ip route | grep default | awk '{print $5}' | head -n1)
        echo "Detected Public Interface: $PUBLIC_IF"
        
        # Enable Forwarding
        sysctl -w net.ipv4.ip_forward=1
        
        # Wipe old Sentinel rules to avoid duplicates
        iptables -t nat -D POSTROUTING -s 10.64.0.0/24 -o eth0 -j MASQUERADE 2>/dev/null || true
        iptables -t nat -D POSTROUTING -s 10.64.0.0/24 -o $PUBLIC_IF -j MASQUERADE 2>/dev/null || true
        
        # Apply CORRECT NAT
        iptables -t nat -A POSTROUTING -s 10.64.0.0/24 -o $PUBLIC_IF -j MASQUERADE
        
        # UFW Routing Fix
        if command -v ufw > /dev/null; then
          ufw allow 51820/udp
          ufw route allow in on wg0 out on $PUBLIC_IF
          ufw route allow in on $PUBLIC_IF out on wg0
          sed -i 's/DEFAULT_FORWARD_POLICY="DROP"/DEFAULT_FORWARD_POLICY="ACCEPT"/' /etc/default/ufw
          ufw --force reload
        fi
        
        # Verification
        echo "FORWARDING:" $(cat /proc/sys/net/ipv4/ip_forward)
        echo "NAT RULES:"
        iptables -t nat -S POSTROUTING | grep 10.64
      `;

      conn.exec(script, (err, stream) => {
        if (err) return reject(err);
        stream.on('close', () => {
          conn.end();
          resolve();
        }).on('data', (data) => {
          process.stdout.write(data);
        });
      });
    }).connect({
      host: node.host,
      port: 22,
      username: 'root',
      password: node.password
    });
  });
}

(async () => {
  for (const node of nodes) {
    try { await detectAndFix(node); } catch (e) { console.error(e); }
  }
  process.exit();
})();
