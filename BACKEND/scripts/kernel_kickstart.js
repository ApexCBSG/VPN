const { Client } = require('ssh2');
const dotenv = require('dotenv');
const path = require('path');

// Load environment
dotenv.config({ path: path.join(__dirname, '../.env') });

const nodes = [
  { name: 'NY-01', host: '157.230.93.112', password: process.env.VPS_PASSWORD },
  { name: 'SF-01', host: '167.71.199.96', password: process.env.VPS_PASSWORD },
  { name: 'MAIN-BACKEND', host: '187.77.147.155', password: "N6-J,/1DqePkK##M)8tj" }
];

async function runOnNode(node) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    console.log(`[CONNECTING] Sentinel Node: ${node.name} (${node.host})...`);

    conn.on('ready', () => {
      console.log(`[AUTH_OK] Successfully logged into ${node.name}.`);
      
      // THE "SENTINEL KICKSTART" COMMANDS:
      // 1. Enable IPv4 Forwarding (Host Kernel)
      // 2. Setup NAT MASQUERADE (Allow internal tunnel packets to reach eth0)
      // 3. Persist Forwarding
      const commands = [
        'sudo sysctl -w net.ipv4.ip_forward=1',
        'echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf',
        'sudo iptables -t nat -A POSTROUTING -s 10.64.0.0/24 -o eth0 -j MASQUERADE',
        'sudo iptables -A FORWARD -i wg0 -j ACCEPT',
        'sudo iptables -A FORWARD -o wg0 -j ACCEPT',
        'sudo iptables-save | sudo tee /etc/iptables.rules'
      ].join(' && ');

      conn.exec(commands, (err, stream) => {
        if (err) return reject(err);
        stream.on('close', (code, signal) => {
          console.log(`[SUCCESS] ${node.name} Routing Activated (Code: ${code}).`);
          conn.end();
          resolve();
        }).on('data', (data) => {
          console.log(`[${node.name} LOG] ` + data);
        }).stderr.on('data', (data) => {
          console.error(`[${node.name} ERR] ` + data);
        });
      });
    }).on('error', (err) => {
      console.error(`[AUTH_FAIL] ${node.name}: ${err.message}`);
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
  console.log('--- SENTINEL KERNEL ROUTING KICKSTART ---');
  for (const node of nodes) {
    try {
      await runOnNode(node);
    } catch (e) {
      console.error(`Skipping ${node.name} due to error.`);
    }
  }
  console.log('--- KICKSTART COMPLETE. TEST YOUR MOBILE APP NOW. ---');
  process.exit();
})();
