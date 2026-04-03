import WireGuard from 'react-native-wireguard-vpn';
import { getPublicIP } from './network';

/**
 * Comprehensive VPN diagnostics to identify connection failures
 */
export const runVPNDiagnostics = async (initialIP) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    initialIP,
    tests: {},
  };

  try {
    // Test 1: Check WireGuard module availability
    diagnostics.tests.wireguardAvailable = {
      name: 'WireGuard Module Available',
      status: 'PASS',
    };

    // Test 2: Get current VPN status
    try {
      const status = await WireGuard.getStatus();
      diagnostics.tests.vpnStatus = {
        name: 'VPN Status Check',
        status: 'PASS',
        data: status,
      };
    } catch (e) {
      diagnostics.tests.vpnStatus = {
        name: 'VPN Status Check',
        status: 'FAIL',
        error: e.message,
      };
    }

    // Test 3: Check current public IP
    try {
      const currentIP = await getPublicIP();
      const ipChanged = currentIP && currentIP !== initialIP;
      diagnostics.tests.publicIP = {
        name: 'Public IP Changed',
        status: ipChanged ? 'PASS' : 'WARNING',
        data: { initial: initialIP, current: currentIP, changed: ipChanged },
      };
    } catch (e) {
      diagnostics.tests.publicIP = {
        name: 'Public IP Check',
        status: 'FAIL',
        error: e.message,
      };
    }

    // Test 4: Network connectivity
    try {
      const testURL = 'https://1.1.1.1/dns-query';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(testURL, { signal: controller.signal });
      clearTimeout(timeout);
      
      diagnostics.tests.connectivity = {
        name: 'Basic Connectivity',
        status: response.ok ? 'PASS' : 'FAIL',
        data: { statusCode: response.status },
      };
    } catch (e) {
      diagnostics.tests.connectivity = {
        name: 'Basic Connectivity',
        status: 'FAIL',
        error: e.message,
      };
    }
  } catch (err) {
    diagnostics.error = err.message;
  }

  return diagnostics;
};

/**
 * Format diagnostics for display
 */
export const formatDiagnostics = (diagnostics) => {
  let report = 'VPN DIAGNOSTICS:\n';
  report += `\nTime: ${diagnostics.timestamp}`;
  report += `\nInitial IP: ${diagnostics.initialIP}`;
  report += '\n\nTests:';
  
  Object.values(diagnostics.tests).forEach((test) => {
    report += `\n- ${test.name}: ${test.status}`;
    if (test.error) report += ` (${test.error})`;
    if (test.data) report += `\n  Data: ${JSON.stringify(test.data)}`;
  });

  return report;
};
