const { Client } = require('ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const node = { host: '157.230.93.112', password: process.env.VPS_PASSWORD };

async function runTest(node) {
  return new Promise((resolve) => {
    const conn = new Client();
    console.log(`\n[UDPD-TEST: NY-01] Starting Listener on 51820...`);
    
    conn.on('ready', () => {
      // 1. Start a netcat listener and check for arriving data
      const script = `
        echo "LOG: LISTENING ON UDP 51820 FOR 15 SECONDS..."
        sudo timeout 15 nc -lu 51820 -v
      `;

      conn.exec(script, (err, stream) => {
        if (err) { console.error(err); resolve(); return; }
        stream.on('close', () => { conn.end(); resolve(); }).on('data', (d) => process.stdout.write(d));
      });
    }).on('error', (e) => { console.log(e.message); resolve(); }).connect({
      host: node.host, port: 22, username: 'root', password: node.password
    });
  });
}

(async () => {
  await runTest(node);
  process.exit();
})();
