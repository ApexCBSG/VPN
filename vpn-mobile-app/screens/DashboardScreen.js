import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { Settings, Activity, Globe, Power } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

import * as SecureStore from 'expo-secure-store';

export default function DashboardScreen({ navigation, route }) {
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const selectedServer = route.params?.selectedServer || { 
    name: 'Auto Selection', 
    city: 'Optimal Node', 
    countryCode: 'US' 
  };

  const handleToggleConnection = async () => {
    if (isConnected) {
      // Disconnect logic
      setIsConnected(false);
      return;
    }

    setConnecting(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        Alert.alert('Auth Error', 'Please log in again.');
        navigation.navigate('Login');
        return;
      }

      // 1. Generate WireGuard keys (Simplified for now - using persistent mock or real JS lib if needed)
      // Standard practice: generate on device. 
      const mockPubKey = "L0zI5YMjdtd6E02hBCAQivz0Q+VjdZUE2Hy2bR1/EnM="; 

      // 2. Register on server
      const response = await fetch('http://localhost:5000/api/vpn/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          nodeId: selectedServer._id,
          publicKey: mockPubKey
        })
      });

      const data = await response.json();
      if (response.ok) {
        setIsConnected(true);
        // data.config contains address, dns, serverPublicKey, endpoint
        console.log('Tunnel Config Received:', data.config);
      } else {
        Alert.alert('Connection Failed', data.msg || 'Sentinel network is busy.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Network Error', 'Could not establish tunnel handshake.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Servers')}
          >
             <Globe size={24} color={theme.colors.onSurface} strokeWidth={1.5} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
             <Settings size={24} color={theme.colors.onSurface} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        <View style={styles.statusContainer}>
          <View style={[styles.statusChip, { backgroundColor: isConnected ? theme.colors.tertiary : theme.colors.error }]}>
            <Text style={styles.statusChipText}>{isConnected ? 'SECURE' : 'UNPROTECTED'}</Text>
          </View>
          <Text style={styles.displayStatus}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      <View style={styles.main}>
        <TouchableOpacity 
          activeOpacity={0.8} 
          style={[styles.connectOuter, isConnected && { shadowColor: theme.colors.tertiary, shadowOpacity: 0.6 }]}
          onPress={handleToggleConnection}
          disabled={connecting}
        >
          <LinearGradient
            colors={isConnected ? ['#00e3fd', '#002b3d'] : theme.colors.linearGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pulseContainer}
          >
            <View style={styles.buttonBody}>
               {connecting ? (
                 <ActivityIndicator size="large" color={theme.colors.background} />
               ) : (
                 <Power size={50} color={theme.colors.background} strokeWidth={2} />
               )}
               <Text style={styles.buttonLabel}>{isConnected ? 'DISCONNECT' : 'PROTECT'}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <BlurView intensity={20} tint="dark" style={styles.glassPanel}>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => navigation.navigate('Servers')}
          >
            <Text style={styles.statLabel}>LOCATION</Text>
            <View style={styles.statValueContainer}>
              <Text style={styles.statValue}>{selectedServer.name}</Text>
              <Text style={styles.statSubValue}>{selectedServer.city}, {selectedServer.countryCode}</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>PROTOCOL</Text>
            <View style={styles.statValueContainer}>
              <Text style={styles.statValue}>WireGuard</Text>
              <Text style={styles.statSubValue}>{isConnected ? 'v4.2.0-STABLE' : 'Standby'}</Text>
            </View>
          </View>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.huge,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: theme.spacing.sm,
  },
  statusChipText: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    fontWeight: '800',
    color: theme.colors.surface,
    letterSpacing: 1,
  },
  displayStatus: {
    fontSize: 56, 
    fontFamily: theme.fonts.display,
    color: theme.colors.onBackground,
    fontWeight: '700',
    textAlign: 'center',
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectOuter: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    padding: 12,
    backgroundColor: theme.colors.surfaceContainerHigh,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  pulseContainer: {
    flex: 1,
    borderRadius: width * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonBody: {
    alignItems: 'center',
  },
  buttonLabel: {
    color: theme.colors.background,
    fontSize: 14,
    fontFamily: theme.fonts.label,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 12,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  glassPanel: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: theme.roundness.lg,
    padding: theme.spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  statSubValue: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: theme.colors.outlineVariant,
    marginHorizontal: theme.spacing.md,
  },
});
