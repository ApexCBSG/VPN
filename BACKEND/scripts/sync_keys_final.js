const { Client } = require('ssh2');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const NodeSchema = new mongoose.Schema({
  name: String, ipAddress: String, port: Number, publicKey: String, isActive: Boolean
});
const Node = mongoose.model('Node', NodeSchema);

const nodes = [
  { name: 'NY-01', host: '157.230.93.112', password: process.env.VPS_PASSWORD },
  { name: 'SF-01', host: '167.71.199.96', password: process.env.VPS_PASSWORD },
  { name: 'SENTINEL-MASTER', host: '187.77.147.155', password: 'N6-J,/1DqePkK##M)8tj' }
];

async function syncNode(node) {
  return new Promise((resolve) => {
    const conn = new Client();
    console.log(`\n[SYNCING KEYS: ${node.name}]...`);
    
    conn.on('ready', () => {
      const script = `
        PRIV_KEY=$(wg genkey)
        PUB_KEY=$(echo $PRIV_KEY | wg pubkey)
        sudo wg set wg0 private-key <(echo $PRIV_KEY)
        echo "KV_PUB_KEY=$PUB_KEY"
      `;

      conn.exec(script, (err, stream) => {
        let output = '';
        stream.on('close', async () => {
          const match = output.match(/KV_PUB_KEY=(.+)/);
          const publicKey = match ? match[1].trim() : null;
          if (publicKey) {
            console.log(`[SUCCESS] New Public Key for ${node.name}: ${publicKey}`);
            await Node.findOneAndUpdate({ ipAddress: node.host }, { publicKey, isActive: true });
          }
          conn.end();
          resolve();
        }).on('data', (d) => { output += d.toString(); });
      });
    }).on('error', (e) => { console.error(e.message); resolve(); }).connect({
      host: node.host, port: 22, username: 'root', password: node.password
    });
  });
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const node of nodes) await syncNode(node);
  process.exit();
})();
