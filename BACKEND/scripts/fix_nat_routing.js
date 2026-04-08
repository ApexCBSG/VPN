const { Client } = require('ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const nodes = [
  { name: 'NY-01', host: '157.230.93.112', password: process.env.VPS_PASSWORD },
  { name: 'SF-01', host: '167.71.199.96',  password: process.env.VPS_PASSWORD },
];

async function fixNat(node) {
  return new Promise((resolve) => {
    const conn = new Client();
    console.log(`\n[FIXING NAT] ${node.name} (${node.host})...`);

    conn.on('ready', () => {
      // Detect the real outbound interface (eth0, ens3, etc.)
      // Then:
      // 1. Enable IP forwarding permanently
      // 2. Add NAT masquerade so WireGuard clients can reach the internet
      // 3. Persist iptables rules across reboots
      const script = `
        set -e

        echo "[1] Detecting outbound network interface..."
        IFACE=$(ip route | grep default | awk '{print $5}' | head -1)
        echo "    Interface: $IFACE"

        echo "[2] Enabling IP forwarding..."
        sysctl -w net.ipv4.ip_forward=1
        grep -q "net.ipv4.ip_forward=1" /etc/sysctl.conf || echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
        sysctl -p

        echo "[3] Adding NAT masquerade for WireGuard subnet (10.64.0.0/24)..."
        # Remove old rule if exists to avoid duplicates
        iptables -t nat -D POSTROUTING -s 10.64.0.0/24 -o $IFACE -j MASQUERADE 2>/dev/null || true
        iptables -t nat -A POSTROUTING -s 10.64.0.0/24 -o $IFACE -j MASQUERADE

        echo "[4] Allowing forwarding for WireGuard traffic..."
        iptables -D FORWARD -i wg0 -j ACCEPT 2>/dev/null || true
        iptables -D FORWARD -o wg0 -j ACCEPT 2>/dev/null || true
        iptables -I FORWARD -i wg0 -j ACCEPT
        iptables -I FORWARD -o wg0 -j ACCEPT

        echo "[5] Persisting iptables rules..."
        if command -v iptables-save &>/dev/null; then
          mkdir -p /etc/iptables
          iptables-save > /etc/iptables/rules.v4
          echo "    Saved to /etc/iptables/rules.v4"
        fi

        # Also persist via rc.local as fallback
        if [ -f /etc/rc.local ]; then
          grep -q "POSTROUTING" /etc/rc.local || \
            sed -i "s|exit 0|iptables -t nat -A POSTROUTING -s 10.64.0.0/24 -o $IFACE -j MASQUERADE\\nexit 0|" /etc/rc.local
        fi

        echo "[6] Also persist in wg0.conf PostUp/PreDown if not already there..."
        if ! grep -q "MASQUERADE" /etc/wireguard/wg0.conf 2>/dev/null; then
          IFACE_LINE="PostUp = iptables -t nat -A POSTROUTING -s 10.64.0.0/24 -o $IFACE -j MASQUERADE; iptables -A FORWARD -i wg0 -j ACCEPT; iptables -A FORWARD -o wg0 -j ACCEPT"
          PREDOWN_LINE="PreDown = iptables -t nat -D POSTROUTING -s 10.64.0.0/24 -o $IFACE -j MASQUERADE; iptables -D FORWARD -i wg0 -j ACCEPT; iptables -D FORWARD -o wg0 -j ACCEPT"
          sed -i "/\\[Interface\\]/a $PREDOWN_LINE" /etc/wireguard/wg0.conf
          sed -i "/\\[Interface\\]/a $IFACE_LINE" /etc/wireguard/wg0.conf
          echo "    Added PostUp/PreDown to wg0.conf"
        else
          echo "    wg0.conf already has NAT rules"
        fi

        echo "[7] Verifying NAT rule is active..."
        iptables -t nat -L POSTROUTING -n -v | grep MASQUERADE

        echo "[8] Verifying IP forwarding..."
        sysctl net.ipv4.ip_forward

        echo ""
        echo "✅ NAT routing fixed on $(hostname). WireGuard clients can now reach the internet."
      `;

      conn.exec(script, (err, stream) => {
        if (err) {
          console.error(`[ERROR] ${node.name}:`, err.message);
          conn.end();
          resolve(false);
          return;
        }

        let output = '';
        stream
          .on('close', (code) => {
            console.log(output);
            conn.end();
            resolve(code === 0);
          })
          .on('data', (d) => { output += d; })
          .stderr.on('data', (d) => { output += '[ERR] ' + d; });
      });
    })
    .on('error', (err) => {
      console.error(`[SSH ERROR] ${node.name}:`, err.message);
      resolve(false);
    })
    .connect({
      host: node.host,
      port: 22,
      username: 'root',
      password: node.password,
      readyTimeout: 15000,
    });
  });
}

(async () => {
  console.log('=== SENTINEL NAT/ROUTING FIX ===');
  console.log('Problem: WireGuard tunnel connects but traffic cannot reach internet');
  console.log('Fix: Enable IP forwarding + NAT masquerade on each VPS node\n');

  const results = [];
  for (const node of nodes) {
    const ok = await fixNat(node);
    results.push({ node: node.name, ok });
  }

  console.log('\n=== RESULTS ===');
  results.forEach(r => console.log(`  ${r.node}: ${r.ok ? '✅ FIXED' : '❌ FAILED'}`));
  process.exit(0);
})();
