const { Client } = require('ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const nodes = [
  { name: 'NY-01', host: '157.230.93.112', password: process.env.VPS_PASSWORD },
  { name: 'SF-01', host: '167.71.199.96', password: process.env.VPS_PASSWORD }
];

async function checkNode(node) {
  return new Promise((resolve) => {
    const conn = new Client();
    console.log(`\n[DIAGNOSTIC: ${node.name}]...`);
    
    conn.on('ready', () => {
      const script = `
        echo "1. IP FORWARD:"
        sysctl net.ipv4.ip_forward
        echo "\n2. WG0 STATUS:"
        sudo wg show
        echo "\n3. IPTABLES NAT TABLE:"
        sudo iptables -t nat -L POSTROUTING -n -v
        echo "\n4. IPTABLES FORWARD RULES:"
        sudo iptables -L FORWARD -n -v
        echo "\n5. INTERFACES:"
        ip addr show
      `;

      conn.exec(script, (err, stream) => {
        if (err) { console.error(err); resolve(); return; }
        stream.on('close', () => {
          conn.end();
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
  for (const node of nodes) await checkNode(node);
  process.exit();
})();
