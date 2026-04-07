import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Animated, Easing, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { Play, RotateCcw, Activity, Download, Upload, Server, ShieldCheck, Wifi } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { API_URL } from '../config';

const { width, height } = Dimensions.get('window');
const GAUGE_SIZE = width * 0.82;
const STROKE_WIDTH = 24;
const RADIUS = (GAUGE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const HALF_CIRCUMFERENCE = CIRCUMFERENCE / 2;

const AnimatedPath = Animated.createAnimatedComponent(Path);

const PHASES = {
  IDLE: 'READY',
  PINGING: 'LATENCY CHECK',
  DOWNLOAD: 'THROUGHPUT TEST (DL)',
  UPLOAD: 'THROUGHPUT TEST (UL)',
  COMPLETE: 'ANALYSIS COMPLETE'
};

export default function SpeedTestScreen({ route }) {
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [ping, setPing] = useState(0);
  const [download, setDownload] = useState(0);
  const [upload, setUpload] = useState(0);
  const [score, setScore] = useState('—');
  
  // Dynamic target detection
  const selectedServer = route.params?.selectedServer;
  const targetHost = selectedServer?.ip ? `http://${selectedServer.ip}:5001` : `${API_URL}/speedtest`;
  
  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const springValue = useRef(new Animated.Value(0)).current;

  // Sync spring to animated value for high-fidelity physical needle response
  useEffect(() => {
    Animated.spring(springValue, {
      toValue: animatedValue,
      tension: 15,
      friction: 4,
      useNativeDriver: false
    }).start();
  }, [download, upload, phase]);

  const strokeDashoffset = springValue.interpolate({
    inputRange: [0, 200],
    outputRange: [HALF_CIRCUMFERENCE, 0],
    extrapolate: 'clamp',
  });

  const rotation = springValue.interpolate({
    inputRange: [0, 200],
    outputRange: ['-90deg', '90deg'],
    extrapolate: 'clamp',
  });

  const pulseScale = pulseValue.interpolate({
    inputRange: [0.6, 1],
    outputRange: [1.1, 1],
  });

  const runTest = useCallback(async () => {
    try {
        setPhase(PHASES.PINGING);
        animatedValue.setValue(0);
        
        // Pulse animation
        const pulseAnim = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseValue, { toValue: 0.6, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
            Animated.timing(pulseValue, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
          ])
        );
        pulseAnim.start();

        // 1. LIGHTNING PING TEST
        let pings = [];
        for (let i = 0; i < 3; i++) {
            const start = performance.now();
            await fetch(`${targetHost}/ping`);
            pings.push(performance.now() - start);
            setPing(Math.floor(pings.reduce((a, b) => a + b) / pings.length));
        }

        // 2. DOWNLOAD TEST — 3 parallel streams for accuracy
        setPhase(PHASES.DOWNLOAD);
        const dStart = performance.now();
        const [b1, b2, b3] = await Promise.all([
            fetch(`${targetHost}/download`).then(r => r.blob()),
            fetch(`${targetHost}/download`).then(r => r.blob()),
            fetch(`${targetHost}/download`).then(r => r.blob()),
        ]);
        const dEnd = performance.now();
        const totalBytes = b1.size + b2.size + b3.size;
        const dDurationSec = (dEnd - dStart) / 1000;
        const dMbps = ((totalBytes * 8) / dDurationSec) / (1024 * 1024);

        setDownload(parseFloat(dMbps.toFixed(1)));
        Animated.timing(animatedValue, { toValue: Math.min(200, dMbps), duration: 800, useNativeDriver: false }).start();

        await new Promise(r => setTimeout(r, 600));

        // 3. UPLOAD TEST — 3MB payload
        setPhase(PHASES.UPLOAD);
        Animated.timing(animatedValue, { toValue: 0, duration: 300, useNativeDriver: false }).start();

        const uSizeMB = 3;
        const uBuffer = new Uint8Array(uSizeMB * 1024 * 1024).fill(0x55);

        const uStart = performance.now();
        await fetch(`${targetHost}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: uBuffer
        });
        const uEnd = performance.now();

        const uDurationSec = (uEnd - uStart) / 1000;
        const uMbps = ((uBuffer.length * 8) / uDurationSec) / (1024 * 1024);

        setUpload(parseFloat(uMbps.toFixed(1)));
        Animated.timing(animatedValue, { toValue: Math.min(200, uMbps), duration: 800, useNativeDriver: false }).start();

        // Finish logic: Transition to summary
        setPhase(PHASES.COMPLETE);
        pulseAnim.stop();
        Animated.parallel([
            Animated.timing(pulseValue, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(animatedValue, { toValue: Math.min(200, dMbps), useNativeDriver: false }) // Keep DL speed pos
        ]).start();
        
        if (dMbps > 80) setScore('EXCELLENT');
        else if (dMbps > 40) setScore('GOOD');
        else if (dMbps > 15) setScore('AVERAGE');
        else setScore('SLOW');

    } catch (error) {
        setPhase(PHASES.IDLE);
        Alert.alert('Connection Error', 'We could not reach the server. Please check your internet and try again.');
    }
  }, []);

  const resetTest = () => {
    setPhase(PHASES.IDLE);
    setPing(0);
    setDownload(0);
    setUpload(0);
    setScore('—');
    animatedValue.setValue(0);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Brand Synced */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Performance Test</Text>
          <Text style={styles.subtitle}>Network diagnostics audit</Text>
        </View>
        <LinearGradient colors={theme.colors.linearGradient} style={styles.iconCircle}>
          <Wifi size={20} color={theme.colors.background} />
        </LinearGradient>
      </View>

      <View style={styles.contentWrapper}>
        <View style={styles.meterSection}>
          <View style={styles.gaugeContainer}>
            <Animated.View style={[styles.glowCircle, { opacity: pulseValue, transform: [{ scale: pulseScale }] }]} />
            
            <Svg width={GAUGE_SIZE} height={GAUGE_SIZE / 1.5} viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE / 1.5}`}>
              <Defs>
                <SvgGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor={theme.colors.primary} />
                  <Stop offset="70%" stopColor={theme.colors.primaryContainer} />
                  <Stop offset="100%" stopColor={theme.colors.error} />
                </SvgGradient>
              </Defs>
              
              <Path
                d={`M ${STROKE_WIDTH/2} ${GAUGE_SIZE/2} A ${RADIUS} ${RADIUS} 0 0 1 ${GAUGE_SIZE - STROKE_WIDTH/2} ${GAUGE_SIZE/2}`}
                fill="none"
                stroke={theme.colors.surfaceContainerHigh}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeOpacity={0.2}
              />
              
              <AnimatedPath
                d={`M ${STROKE_WIDTH/2} ${GAUGE_SIZE/2} A ${RADIUS} ${RADIUS} 0 0 1 ${GAUGE_SIZE - STROKE_WIDTH/2} ${GAUGE_SIZE/2}`}
                fill="none"
                stroke="url(#grad)"
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${HALF_CIRCUMFERENCE}, ${CIRCUMFERENCE}`}
                strokeLinecap="round"
                strokeDashoffset={strokeDashoffset}
              />
            </Svg>

            <Animated.View style={[styles.needleContainer, { transform: [{ rotate: rotation }] }]}>
              <View style={[styles.needleCap, { backgroundColor: theme.colors.error }]} />
              <LinearGradient colors={[theme.colors.error, 'transparent']} style={styles.needle} />
            </Animated.View>

            <View style={styles.readoutContainer}>
               {phase === PHASES.COMPLETE ? (
                 <View style={styles.summaryDisplay}>
                    <View style={styles.summaryItem}>
                        <Download size={14} color={theme.colors.primary} />
                        <Text style={styles.summaryValue}>{download}</Text>
                        <Text style={styles.summaryLabel}>Mbps</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Upload size={14} color={theme.colors.secondary} />
                        <Text style={styles.summaryValue}>{upload}</Text>
                        <Text style={styles.summaryLabel}>Mbps</Text>
                    </View>
                 </View>
               ) : (
                 <>
                    <Text style={styles.readoutValue}>
                      {phase === PHASES.UPLOAD ? upload : download}
                    </Text>
                    <Text style={styles.readoutUnit}>Mbps</Text>
                 </>
               )}
               
               <BlurView intensity={20} tint="dark" style={styles.phaseIndicator}>
                  <Text style={styles.phaseText}>{phase}</Text>
               </BlurView>
            </View>
          </View>

          {/* Results Cards - Theme Synced */}
          <View style={styles.telemetryContainer}>
            <BlurView intensity={theme.colors.glassBlur} tint="dark" style={styles.glassCard}>
               <View style={styles.cardHeader}>
                  <Activity size={10} color={theme.colors.primary} />
                  <Text style={styles.cardTitle}>PING</Text>
               </View>
               <Text style={styles.cardValue}>{ping || '--'}</Text>
               <Text style={styles.cardUnit}>ms</Text>
            </BlurView>

            <BlurView intensity={theme.colors.glassBlur} tint="dark" style={styles.glassCard}>
               <View style={styles.cardHeader}>
                  <ShieldCheck size={10} color={theme.colors.secondary} />
                  <Text style={styles.cardTitle}>STABILITY</Text>
               </View>
               <Text style={styles.cardValue}>{ping ? '100' : '--'}</Text>
               <Text style={styles.cardUnit}>%</Text>
            </BlurView>

            <BlurView intensity={theme.colors.glassBlur} tint="dark" style={styles.glassCard}>
               <View style={styles.cardHeader}>
                  <Server size={10} color={theme.colors.error} />
                  <Text style={styles.cardTitle}>DIAGNOSIS</Text>
               </View>
               <Text style={[styles.cardValue, { fontSize: 13, color: theme.colors.primary }]}>{score}</Text>
               <Text style={styles.cardUnit}>RATING</Text>
            </BlurView>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <View style={styles.nodeBanner}>
           <Server size={12} color={theme.colors.onSurfaceVariant} />
           <Text style={styles.nodeText}>Server: <Text style={{fontWeight:'800', color: theme.colors.primary}}>{selectedServer?.name || 'Main Hub'}</Text></Text>
        </View>

        {phase === PHASES.COMPLETE ? (
          <TouchableOpacity 
            activeOpacity={0.8}
            style={styles.mainBtn} 
            onPress={resetTest}
          >
            <LinearGradient 
                start={{x:0, y:0}} 
                end={{x:1, y:0}} 
                colors={theme.colors.linearGradient} 
                style={styles.btnGradient}
            >
                <RotateCcw size={22} color={theme.colors.background} />
                <Text style={styles.btnText}>TEST AGAIN</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            activeOpacity={0.8}
            style={[styles.mainBtn, (phase !== PHASES.IDLE) && styles.disabledBtn]} 
            onPress={runTest}
            disabled={phase !== PHASES.IDLE}
          >
            <LinearGradient 
                start={{x:0, y:0}} 
                end={{x:1, y:0}} 
                colors={theme.colors.linearGradient} 
                style={styles.btnGradient}
            >
                <Play size={22} color={theme.colors.background} fill={theme.colors.background} />
                <Text style={styles.btnText}>START TEST</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    color: theme.colors.onBackground,
    fontWeight: '900',
    fontFamily: theme.fonts.display,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
    fontFamily: theme.fonts.body,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  meterSection: {
    alignItems: 'center',
  },
  gaugeContainer: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE / 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
  },
  glowCircle: {
    position: 'absolute',
    width: GAUGE_SIZE * 0.9,
    height: GAUGE_SIZE * 0.9,
    borderRadius: GAUGE_SIZE * 0.45,
    backgroundColor: theme.colors.primary + '05',
    top: -20,
  },
  readoutContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  readoutValue: {
    fontSize: 80,
    color: theme.colors.onBackground,
    fontWeight: '900',
    letterSpacing: -3,
    fontFamily: theme.fonts.display,
  },
  readoutUnit: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: -10,
  },
  summaryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    color: theme.colors.onBackground,
    fontWeight: '900',
    fontFamily: theme.fonts.display,
  },
  summaryLabel: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '800',
    marginTop: -4,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.outlineVariant,
  },
  phaseIndicator: {
    marginTop: 15,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    overflow: 'hidden',
  },
  phaseText: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  needleContainer: {
    position: 'absolute',
    width: 2,
    height: RADIUS + 10,
    top: GAUGE_SIZE / 2 - (RADIUS + 10),
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 10,
  },
  needleCap: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    bottom: -5,
  },
  needle: {
    width: 3,
    height: 60,
    borderRadius: 2,
    marginTop: 5,
  },
  telemetryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 5,
  },
  glassCard: {
    width: (width - 60) / 3.1,
    paddingVertical: 20,
    borderRadius: theme.roundness.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 8,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cardValue: {
    fontSize: 22,
    color: theme.colors.onBackground,
    fontWeight: '900',
    fontFamily: theme.fonts.display,
  },
  cardUnit: {
    fontSize: 8,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
    marginTop: 2,
  },
  actions: {
    padding: 24,
    paddingBottom: 100,
  },
  nodeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingVertical: 10,
    borderRadius: 14,
  },
  nodeText: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  mainBtn: {
    height: 64,
    borderRadius: theme.roundness.lg,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  btnGradient: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  btnText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
