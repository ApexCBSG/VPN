const { Client } = require('ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const nodes = [
  { name: 'NY-01', host: '157.230.93.112', password: process.env.VPS_PASSWORD },
  { name: 'SF-01', host: '167.71.199.96', password: process.env.VPS_PASSWORD },
  { name: 'SENTINEL-MASTER', host: '187.77.147.155', password: 'N6-J,/1DqePkK##M)8tj' }
];

async function forceNat(node) {
  return new Promise((resolve) => {
    const conn = new Client();
    console.log(`\n[FORCE-NAT RECOVERY: ${node.name}]...`);
    
    conn.on('ready', () => {
      const script = `
        # 1. Force Kernel Forwarding
        sudo sysctl -w net.ipv4.ip_forward=1
        
        # 2. Reset NAT table to clean state
        sudo iptables -t nat -F POSTROUTING
        
        # 3. Insert PRIMARY Masquerade at Rule #1
        PUBLIC_IF=$(ip route | grep default | awk '{print $5}' | head -n1)
        sudo iptables -t nat -I POSTROUTING 1 -s 10.64.0.0/24 -o $PUBLIC_IF -j MASQUERADE
        
        # 4. Force Allow Forwarding
        sudo iptables -I FORWARD 1 -i wg0 -j ACCEPT
        sudo iptables -I FORWARD 1 -o wg0 -j ACCEPT
        
        # 5. Persist
        sudo iptables-save | sudo tee /etc/iptables/rules.v4
        
        echo "LOG: NAT & FORWARDING RECOVERED ON ${node.host}"
      `;

      conn.exec(script, (err, stream) => {
        if (err) { console.error(err); resolve(); return; }
        stream.on('close', () => { conn.end(); resolve(); }).on('data', (d) => process.stdout.write(d));
      });
    }).on('error', (e) => { console.error(e.message); resolve(); }).connect({
      host: node.host, port: 22, username: 'root', password: node.password
    });
  });
}

(async () => {
  for (const node of nodes) await forceNat(node);
  process.exit();
})();
