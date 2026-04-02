const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const node = { name: "NY-01", host: "157.230.93.112" };
const vpsPassword = process.env.VPS_PASSWORD;

// This is a test public key
const testPublicKey = "TEST_PUBKEY_" + Date.now();
const testIp = "10.64.0.99/32";

async function testWgSet() {
    return new Promise((resolve) => {
        const conn = new Client();
        conn.on('ready', () => {
            console.log(`[TEST] Connected to ${node.host}. Testing 'wg set' command...`);
            
            // We use the FULL PATH and SUDO to be 100% sure
            const command = `sudo /usr/bin/wg set wg0 peer wmUTsvur1KIx0l+9iwv712oyIR+bauMf8 allowed-ips ${testIp} && echo "COMMAND_SUCCESS"`;

            conn.exec(command, (err, stream) => {
                if (err) resolve(`ERROR: ${err.message}`);
                let output = '';
                stream.on('close', () => {
                    conn.end();
                    resolve(output);
                }).on('data', (data) => {
                    output += data;
                }).stderr.on('data', (data) => {
                    output += `[STDERR] ${data}`;
                });
            });
        }).on('error', (err) => {
            resolve(`CONNECTION FAILED: ${err.message}`);
        }).connect({
            host: node.host,
            username: 'root',
            password: vpsPassword
        });
    });
}

testWgSet().then(console.log);
