const crypto = require('crypto');
const { execSync } = require('child_process');

/**
 * Generates WireGuard Private/Public Key pairs.
 * Note: Requires 'wg' command to be installed on the machine running this service.
 * In a production environment without 'wg' binary, use a JS port of Curve25519.
 */
exports.generateKeys = () => {
  try {
    const privateKey = execSync('wg genkey').toString().trim();
    const publicKey = execSync(`echo ${privateKey} | wg pubkey`).toString().trim();
    return { privateKey, publicKey };
  } catch (error) {
    console.error('Error generating WireGuard keys:', error);
    throw new Error('Key generation failed');
  }
};

/**
 * Generates a Pre-Shared Key.
 */
exports.generatePSK = () => {
  return execSync('wg genpsk').toString().trim();
};
