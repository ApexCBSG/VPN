const { Client } = require('ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const nodes = [
  { name: 'NY-01', host: '157.230.93.112', password: process.env.VPS_PASSWORD },
];

async function checkIp(node) {
  return new Promise((resolve) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec('ip addr show wg0', (err, stream) => {
        stream.on('close', () => { conn.end(); resolve(); }).on('data', (d) => process.stdout.write(d));
      });
    }).on('error', (err) => { console.error(err); resolve(); }).connect({
      host: node.host, port: 22, username: 'root', password: node.password
    });
  });
}

(async () => {
  for (const node of nodes) await checkIp(node);
  process.exit();
})();
