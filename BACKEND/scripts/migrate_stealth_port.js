const { Client } = require('ssh2');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const NodeSchema = new mongoose.Schema({
  name: String, ipAddress: String, port: Number, publicKey: String, isActive: Boolean
});
const Node = mongoose.model('Node', NodeSchema);

const TARGET_PORT = 443;

const nodes = [
  { name: 'NY-01', host: '157.230.93.112', password: process.env.VPS_PASSWORD },
  { name: 'SF-01', host: '167.71.199.96',  password: process.env.VPS_PASSWORD },
];

async function migratePort(node) {
  return new Promise((resolve) => {
    const conn = new Client();
    console.log(`\n[MIGRATING] ${node.name} (${node.host}) → port ${TARGET_PORT}...`);

    conn.on('ready', () => {
      // 1. Change live WireGuard port (instant, no tunnel drop)
      // 2. Persist in wg0.conf so it survives reboots
      // 3. Open port in UFW (try both ufw and iptables for compatibility)
      const script = `
        set -e

        echo "[1] Changing live WireGuard listen port to ${TARGET_PORT}..."
        sudo /usr/bin/wg set wg0 listen-port ${TARGET_PORT}

        echo "[2] Persisting in /etc/wireguard/wg0.conf..."
        sudo sed -i 's/^ListenPort\\s*=.*/ListenPort = ${TARGET_PORT}/' /etc/wireguard/wg0.conf
        grep ListenPort /etc/wireguard/wg0.conf

        echo "[3] Opening firewall for UDP ${TARGET_PORT}..."
        if command -v ufw &>/dev/null; then
          sudo ufw allow ${TARGET_PORT}/udp
          sudo ufw allow ${TARGET_PORT}/tcp
        fi
        sudo iptables -C INPUT -p udp --dport ${TARGET_PORT} -j ACCEPT 2>/dev/null || \
          sudo iptables -I INPUT -p udp --dport ${TARGET_PORT} -j ACCEPT
        if [ -d /etc/iptables ]; then
          sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null
        fi

        echo "[4] Verifying..."
        sudo /usr/bin/wg show wg0 | grep "listening port"

        echo "[DONE] ${node.name} now listening on port ${TARGET_PORT}"
      `;

      conn.exec(script, (err, stream) => {
        if (err) {
          console.error(`[ERROR] exec failed on ${node.name}:`, err.message);
          conn.end();
          resolve(false);
          return;
        }

        let output = '';
        stream
          .on('close', async (code) => {
            console.log(output);
            if (code === 0) {
              const result = await Node.findOneAndUpdate(
                { ipAddress: node.host },
                { port: TARGET_PORT },
                { new: true }
              );
              if (result) {
                console.log(`[DB] Updated ${node.name} port → ${TARGET_PORT}`);
              } else {
                console.warn(`[DB] Node ${node.name} not found in DB — check ipAddress`);
              }
              resolve(true);
            } else {
              console.error(`[FAIL] Script exited with code ${code} on ${node.name}`);
              resolve(false);
            }
            conn.end();
          })
          .on('data', (d) => { output += d; })
          .stderr.on('data', (d) => { output += '[STDERR] ' + d; });
      });
    })
    .on('error', (err) => {
      console.error(`[POOL ERROR] ${node.name}:`, err.message);
      resolve(false);
    })
    .connect({
      host: node.host,
      port: 22,
      username: 'root',
      password: node.password,
      readyTimeout: 20000,
    });
  });
}

(async () => {
  console.log('--- SENTINEL STEALTH PORT MIGRATION ---');
  console.log(`Target: port ${TARGET_PORT} (bypasses ISP WireGuard blocks)\n`);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[DB] Connected to MongoDB');

  const results = [];
  for (const node of nodes) {
    const ok = await migratePort(node);
    results.push({ node: node.name, ok });
  }

  console.log('\n--- RESULTS ---');
  results.forEach(r => console.log(`  ${r.node}: ${r.ok ? '✅ SUCCESS' : '❌ FAILED'}`));
  console.log('\nRestart your backend to reload the SSH pool with the new port.');
  process.exit(0);
})();
