import 'react-native-get-random-values';
import nacl from 'tweetnacl';
import * as base64 from 'base64-js';

/**
 * Generates a WireGuard-compatible Key Pair
 * @returns {object} { publicKey: string, privateKey: string }
 */
export const generateKeyPair = () => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: base64.fromByteArray(keyPair.publicKey),
    privateKey: base64.fromByteArray(keyPair.secretKey)
  };
};

/**
 * Validates a Base64 encoded public key
 * @param {string} key 
 * @returns {boolean}
 */
export const isValidKey = (key) => {
  try {
    const decoded = base64.toByteArray(key);
    return decoded.length === 32;
  } catch (e) {
    return false;
  }
};
