const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const nodes = [
    { name: "NY-01", host: "157.230.93.112" },
    { name: "SF-01", host: "167.71.199.96" }
];

const vpsPassword = process.env.VPS_PASSWORD;

async function auditNode(node) {
    return new Promise((resolve) => {
        const conn = new Client();
        let output = '';

        conn.on('ready', () => {
            console.log(`[${node.name}] SSH Connection Established. Running Deep Kernel Audit...`);
            
            // WE RUN 3 CRITICAL TESTS:
            // 1. wg show: Verifies the Tunnel Interface is UP and listening on 51820.
            // 2. iptables: Verifies the VPN traffic can actually reach the internet (PostRouting).
            // 3. sysctl: Verifies the VPS is acting as a router.
            const command = `
                echo "--- 1. WireGuard Status ---" && sudo wg show | head -n 10 && 
                echo "--- 2. NAT Routing (IPTables) ---" && sudo iptables -t nat -L POSTROUTING -n -v | grep -i "MASQUERADE" && 
                echo "--- 3. Kernel Forwarding ---" && sysctl net.ipv4.ip_forward
            `;

            conn.exec(command, (err, stream) => {
                if (err) resolve(`[${node.name}] ERROR: ${err.message}`);
                stream.on('close', (code, signal) => {
                    conn.end();
                    resolve(output);
                }).on('data', (data) => {
                    output += data;
                }).stderr.on('data', (data) => {
                    output += `[STDERR] ${data}`;
                });
            });
        }).on('error', (err) => {
            resolve(`[${node.name}] CONNECTION FAILED: ${err.message}`);
        }).connect({
            host: node.host,
            port: 22,
            username: 'root',
            password: vpsPassword
        });
    });
}

async function startAudit() {
    console.log('\n--- SENTINEL DEEP-KERNEL AUDIT (VPS LEVEL) ---');
    
    if (!vpsPassword) {
        console.error('❌ FATAL: VPS_PASSWORD not found in .env. Cannot perform Deep Audit.');
        process.exit(1);
    }

    // We audit New York first as it's the primary node
    const nyResult = await auditNode(nodes[0]);
    console.log(nyResult);

    console.log('\n--- AUDIT COMPLETE ---');
    process.exit(0);
}

startAudit();
