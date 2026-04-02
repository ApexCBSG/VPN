import { Platform } from 'react-native';

/**
 * API Configuration
 * 
 * - 10.0.2.2: The host machine from Android Emulator
 * - localhost / 127.0.0.1: The host machine for Web/iOS Simulator
 * - 192.168.x.x: Your machine's local IP (for physical devices)
 */

/**
 * Sentinel Production API Configuration
 * Switching from local '10.0.2.2' to live Sentinel Cloud Endpoint.
 */

export const BASE_URL = 'http://eer9s13ro0qqw7yf5l7ncohi.187.77.147.155.sslip.io';

export const API_URL = `${BASE_URL}/api`;
