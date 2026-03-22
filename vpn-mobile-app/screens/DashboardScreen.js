import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { Settings, Activity, Globe } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const isConnected = false;

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
        <TouchableOpacity activeOpacity={0.8} style={styles.connectOuter}>
          <LinearGradient
            colors={theme.colors.linearGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pulseContainer}
          >
            <View style={styles.buttonBody}>
               <Activity size={50} color={theme.colors.background} strokeWidth={2} />
               <Text style={styles.buttonLabel}>PROTECT</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      
      <View style={styles.footer}>
        <BlurView intensity={theme.colors.glassBlur} tint="dark" style={styles.glassPanel}>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => navigation.navigate('Servers')}
          >
            <Text style={styles.statLabel}>LOCATION</Text>
            <View style={styles.statValueContainer}>
              <Text style={styles.statValue}>Auto Selection</Text>
              <Text style={styles.statSubValue}>USA, New York</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>PROTOCOL</Text>
            <View style={styles.statValueContainer}>
              <Text style={styles.statValue}>WireGuard</Text>
              <Text style={styles.statSubValue}>v4.2.0-STABLE</Text>
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
    backgroundColor: theme.colors.surfaceVariant,
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
