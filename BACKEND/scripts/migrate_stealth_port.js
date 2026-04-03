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

async function migratePort(node) {
  return new Promise((resolve) => {
    const conn = new Client();
    console.log(`\n[MIGRATING TO STEALTH PORT: ${node.name}]...`);
    
    conn.on('ready', () => {
      const script = `
        # 1. Update WireGuard to use Port 443
        sudo wg set wg0 listen-port 443
        
        # 2. Update Firewall (iptables)
        sudo iptables -I INPUT -p udp --dport 443 -j ACCEPT
        sudo iptables -save | sudo tee /etc/iptables/rules.v4
        
        echo "LOG: MIGRATED TO PORT 443"
      `;

      conn.exec(script, (err, stream) => {
        stream.on('close', async () => {
          console.log(`[SUCCESS] Port 443 Active on ${node.host}`);
          await Node.findOneAndUpdate({ ipAddress: node.host }, { port: 443 });
          conn.end();
          resolve();
        }).on('data', (d) => process.stdout.write(d));
      });
    }).on('error', (e) => { console.error(e.message); resolve(); }).connect({
      host: node.host, port: 22, username: 'root', password: node.password
    });
  });
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const node of nodes) await migratePort(node);
  console.log('\n--- STEALTH MIGRATION COMPLETE ---');
  process.exit();
})();
