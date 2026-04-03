const { Client } = require('ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const node = { host: '157.230.93.112', password: process.env.VPS_PASSWORD };

async function trace(node) {
  return new Promise((resolve) => {
    const conn = new Client();
    console.log(`\n[TRAFFIC TRACE: NY-01] Listening for your phone's packets...`);
    
    conn.on('ready', () => {
      // 1. Check if ANY packets hit UDP 51820 in the last few seconds
      const script = `
        echo "LOG: STARTING PACKET SNIFF ON UDP 51820..."
        sudo timeout 10 tcpdump -i any udp port 51820 -n -c 5
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
  await trace(node);
  process.exit();
})();
