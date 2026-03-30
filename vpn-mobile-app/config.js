import { Platform } from 'react-native';

/**
 * API Configuration
 * 
 * - 10.0.2.2: The host machine from Android Emulator
 * - localhost / 127.0.0.1: The host machine for Web/iOS Simulator
 * - 192.168.x.x: Your machine's local IP (for physical devices)
 */

const LOCAL_IP = '10.0.2.2'; // Change this to your computer's local IP if using a real phone

export const BASE_URL = Platform.select({
  android: `http://${LOCAL_IP}:5000`,
  ios: 'http://localhost:5000',
  default: 'http://localhost:5000',
});

export const API_URL = `${BASE_URL}/api`;
