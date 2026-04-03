const { Client } = require('ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const node = {
  name: 'CENTRAL_NODE',
  host: '187.77.147.155',
  password: 'N6-J,/1DqePkK##M)8tj'
};

async function checkNode(node) {
  return new Promise((resolve) => {
    const conn = new Client();
    console.log(`\n[DIAGNOSTIC: ${node.name}] (${node.host})...`);
    
    conn.on('ready', () => {
      const script = `
        echo "1. WG STATUS:"
        sudo wg show
        echo "\n2. IP ADDR:"
        ip addr show
        echo "\n3. KERNEL FORWARDING:"
        sysctl net.ipv4.ip_forward
        echo "\n4. IPTABLES NAT:"
        sudo iptables -t nat -L -v -n
      `;

      conn.exec(script, (err, stream) => {
        if (err) { console.error(err); resolve(); return; }
        stream.on('close', () => {
          console.log('\n[SUCCESS] Node Diagnostic Finished.');
          conn.end();
          resolve();
        }).on('data', (d) => process.stdout.write(d));
      });
    }).on('error', (err) => {
      console.error(`[ERROR] ${node.host}: ${err.message}`);
      resolve();
    }).connect({
      host: node.host, port: 22, username: 'root', password: node.password
    });
  });
}

(async () => {
  await checkNode(node);
  process.exit();
})();
