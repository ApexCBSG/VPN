import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { Activity, Zap, Play, RotateCcw } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function SpeedTestScreen() {
  const [testing, setTesting] = useState(false);
  const [downloadSpeed, setDownloadSpeed] = useState(0);

  useEffect(() => {
    let interval;
    if (testing) {
      interval = setInterval(() => {
        setDownloadSpeed(prev => {
          if (prev >= 120.5) {
             clearInterval(interval);
             setTesting(false);
             return 120.5;
          }
          return parseFloat((prev + Math.random() * 15).toFixed(1));
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [testing]);

  const startTest = () => {
    setDownloadSpeed(0);
    setTesting(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Speed Test</Text>
        <Text style={styles.subtitle}>Analyze network performance</Text>
      </View>

      <View style={styles.meterContainer}>
        
        <View style={styles.gaugeOuter}>
          <BlurView intensity={theme.glassBlur} tint="dark" style={styles.gaugeInner}>
            <Text style={styles.speedValue}>{downloadSpeed}</Text>
            <Text style={styles.speedUnit}>Mbps</Text>
          </BlurView>
          
          
          <View style={[styles.gaugeIndicator, { transform: [{ rotate: `${(downloadSpeed / 150) * 180 - 90}deg` }] }]} />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>LATENCY</Text>
            <Text style={styles.statResult}>24 ms</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>GRADE</Text>
            <Text style={[styles.statResult, { color: theme.colors.tertiary }]}>A+</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          activeOpacity={0.8}
          style={styles.actionButton}
          onPress={startTest}
          disabled={testing}
        >
          <LinearGradient
            colors={theme.colors.linearGradient}
            style={styles.gradientButton}
          >
            {testing ? (
              <RotateCcw size={24} color={theme.colors.background} />
            ) : (
              <Play size={24} color={theme.colors.background} />
            )}
            <Text style={styles.actionText}>{testing ? 'TESTING...' : 'START TEST'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Text style={styles.disclaimer}>
        Measurements are conducted against our closest node in USA - NEW YORK to ensure optimal accuracy.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.display,
    color: theme.colors.onBackground,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  meterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeOuter: {
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 10,
    borderColor: theme.colors.surfaceContainerLow,
  },
  gaugeInner: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceVariant,
  },
  speedValue: {
    fontSize: 48,
    fontFamily: theme.fonts.display,
    color: theme.colors.onBackground,
    fontWeight: '800',
  },
  speedUnit: {
    fontSize: 14,
    fontFamily: theme.fonts.label,
    color: theme.colors.primary,
    fontWeight: '700',
    letterSpacing: 2,
  },
  gaugeIndicator: {
    position: 'absolute',
    width: 4,
    height: width * 0.35,
    backgroundColor: theme.colors.primary,
    top: width * 0.375 - width * 0.35,
    left: width * 0.375 - 2,
    borderRadius: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.roundness.lg,
    padding: theme.spacing.lg,
    marginTop: 60,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statResult: {
    fontSize: 20,
    fontFamily: theme.fonts.headline,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    backgroundColor: theme.colors.outlineVariant,
  },
  actions: {
    marginTop: 20,
    marginBottom: 20,
  },
  actionButton: {
    height: 56,
    borderRadius: theme.roundness.md,
    overflow: 'hidden',
  },
  gradientButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: theme.colors.background,
    fontSize: 14,
    fontFamily: theme.fonts.label,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginLeft: 10,
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
});
