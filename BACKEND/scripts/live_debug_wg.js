const { Client } = require('ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const nodes = [
  { name: 'NY-01', host: '157.230.93.112', password: process.env.VPS_PASSWORD },
];

async function liveDebug(node) {
  return new Promise((resolve) => {
    const conn = new Client();
    console.log(`\n[LIVE DEBUG: ${node.name}]...`);
    
    conn.on('ready', () => {
      // Check current peers and recent Handshakes
      const script = `
        echo "CURRENT WIREGUARD PEERS:"
        sudo wg show wg0
        echo "\nRECENT SYSTEM LOGS (WireGuard):"
        sudo dmesg | grep wireguard | tail -n 5
        echo "\nIPTABLES NAT STATUS:"
        sudo iptables -t nat -L -v -n
      `;

      conn.exec(script, (err, stream) => {
        if (err) { console.error(err); resolve(); return; }
        stream.on('close', () => { conn.end(); resolve(); }).on('data', (d) => process.stdout.write(d));
      });
    }).on('error', (err) => { console.error(err); resolve(); }).connect({
      host: node.host, port: 22, username: 'root', password: node.password
    });
  });
}

(async () => {
  await liveDebug(nodes[0]);
  process.exit();
})();
