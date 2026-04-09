import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Dimensions,
  Animated, Easing, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { Play, RotateCcw, Download, Upload, Activity, Server, Wifi } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path, Circle, Line, G, Defs,
  LinearGradient as SvgGrad, Stop,
} from 'react-native-svg';
import { API_URL } from '../config';

const { width } = Dimensions.get('window');

// ── Gauge geometry ──────────────────────────────────────────────────────────
const GAUGE_W   = width - 48;          // SVG canvas width
const SW        = 22;                  // arc stroke width
const R         = (GAUGE_W - SW) / 2; // arc radius
const CX        = GAUGE_W / 2;        // circle centre x
const CY        = GAUGE_W / 2;        // circle centre y (half of canvas)
const HALF_CIRC = Math.PI * R;        // length of upper semicircle arc
const MAX_SPEED = 200;
const NEEDLE_LEN = R - 14;            // needle tip to pivot
const SVG_H     = CY + SW + 2;        // canvas height (centre + a bit below)

// Upper-semicircle arc: counter-clockwise from left-centre to right-centre
// svg sweep-flag=0 → goes over the top
const ARC_PATH = `M ${SW / 2} ${CY} A ${R} ${R} 0 0 0 ${GAUGE_W - SW / 2} ${CY}`;

// ── Phase labels ────────────────────────────────────────────────────────────
const PHASES = {
  IDLE:     'READY TO TEST',
  PINGING:  'LATENCY CHECK',
  DOWNLOAD: 'DOWNLOAD THROUGHPUT',
  UPLOAD:   'UPLOAD THROUGHPUT',
  COMPLETE: 'ANALYSIS COMPLETE',
};

// ── Score config ─────────────────────────────────────────────────────────────
const SCORES = {
  EXCELLENT: { color: theme.colors.primary,  bg: 'rgba(118,185,0,0.12)',  label: 'EXCELLENT' },
  GOOD:      { color: '#bff230',              bg: 'rgba(191,242,48,0.10)', label: 'GOOD' },
  AVERAGE:   { color: '#f5a623',              bg: 'rgba(245,166,35,0.10)', label: 'AVERAGE' },
  SLOW:      { color: theme.colors.error,     bg: 'rgba(229,32,32,0.10)', label: 'SLOW' },
};

// ── Animated SVG elements ───────────────────────────────────────────────────
const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function SpeedTestScreen({ route }) {
  const [phase,   setPhase]   = useState(PHASES.IDLE);
  const [ping,    setPing]    = useState(null);
  const [dlSpeed, setDlSpeed] = useState(null);
  const [ulSpeed, setUlSpeed] = useState(null);
  const [score,   setScore]   = useState(null);

  // JS-driven display values (updated via Animated listener)
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [needleDeg,    setNeedleDeg]    = useState(-90); // -90 = full left, +90 = full right

  const selectedServer = route.params?.selectedServer;
  const targetHost = selectedServer?.ip
    ? `http://${selectedServer.ip}:5001`
    : `${API_URL}/speedtest`;

  // Animated values
  const gaugeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const pulseRef   = useRef(null);

  // Keep needle + display counter in sync with gaugeAnim (JS thread)
  useEffect(() => {
    const id = gaugeAnim.addListener(({ value }) => {
      setNeedleDeg((value / MAX_SPEED) * 180 - 90);
      setDisplaySpeed(Math.round(value));
    });
    return () => gaugeAnim.removeListener(id);
  }, []);

  // Arc fill: strokeDashoffset drives how much of the arc is "lit"
  const strokeDashoffset = gaugeAnim.interpolate({
    inputRange: [0, MAX_SPEED],
    outputRange: [HALF_CIRC, 0],
    extrapolate: 'clamp',
  });

  // ── Helpers ─────────────────────────────────────────────────────────────
  const animGauge = (val, dur = 900) =>
    new Promise(res =>
      Animated.timing(gaugeAnim, {
        toValue: Math.min(Math.max(val, 0), MAX_SPEED),
        duration: dur,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(res)
    );

  const startPulse = () => {
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.07, duration: 750, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.00, duration: 750, useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();
  };

  const stopPulse = () => {
    pulseRef.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  // ── Main test logic ──────────────────────────────────────────────────────
  const runTest = useCallback(async () => {
    try {
      gaugeAnim.setValue(0);
      setPing(null); setDlSpeed(null); setUlSpeed(null); setScore(null);
      setPhase(PHASES.PINGING);
      startPulse();

      // 1 — Ping (3-sample average)
      const pings = [];
      for (let i = 0; i < 3; i++) {
        const t = performance.now();
        await fetch(`${targetHost}/ping`);
        pings.push(performance.now() - t);
      }
      setPing(Math.floor(pings.reduce((a, b) => a + b) / pings.length));

      // 2 — Download (3 parallel streams)
      setPhase(PHASES.DOWNLOAD);
      const dStart = performance.now();
      const [b1, b2, b3] = await Promise.all([
        fetch(`${targetHost}/download`).then(r => r.blob()),
        fetch(`${targetHost}/download`).then(r => r.blob()),
        fetch(`${targetHost}/download`).then(r => r.blob()),
      ]);
      const dMbps = parseFloat(
        (((b1.size + b2.size + b3.size) * 8) /
          ((performance.now() - dStart) / 1000) / (1024 * 1024)).toFixed(1)
      );
      setDlSpeed(dMbps);
      await animGauge(dMbps);
      await new Promise(r => setTimeout(r, 600));

      // 3 — Upload (3 MB payload)
      setPhase(PHASES.UPLOAD);
      await animGauge(0, 400);
      const uBuf = new Uint8Array(3 * 1024 * 1024).fill(0x55);
      const uStart = performance.now();
      await fetch(`${targetHost}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: uBuf,
      });
      const uMbps = parseFloat(
        ((uBuf.length * 8) /
          ((performance.now() - uStart) / 1000) / (1024 * 1024)).toFixed(1)
      );
      setUlSpeed(uMbps);
      await animGauge(uMbps);
      await new Promise(r => setTimeout(r, 600));

      // 4 — Complete
      stopPulse();
      setPhase(PHASES.COMPLETE);
      await animGauge(dMbps, 600); // rest on DL reading

      if      (dMbps > 80) setScore('EXCELLENT');
      else if (dMbps > 40) setScore('GOOD');
      else if (dMbps > 15) setScore('AVERAGE');
      else                  setScore('SLOW');

    } catch {
      stopPulse();
      setPhase(PHASES.IDLE);
      Alert.alert('Connection Error', 'Could not reach the server. Check your internet and try again.');
    }
  }, []);

  const resetTest = () => {
    setPhase(PHASES.IDLE);
    setPing(null); setDlSpeed(null); setUlSpeed(null); setScore(null);
    Animated.timing(gaugeAnim, {
      toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  };

  const isRunning = phase !== PHASES.IDLE && phase !== PHASES.COMPLETE;
  const isDone    = phase === PHASES.COMPLETE;
  const sc        = score ? SCORES[score] : null;

  // Needle tip coordinates (pivot at CX, CY)
  const θ = (needleDeg * Math.PI) / 180; // convert to radians
  const tipX = CX + NEEDLE_LEN * Math.sin(θ);
  const tipY = CY - NEEDLE_LEN * Math.cos(θ);

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Speed Test</Text>
          <Text style={styles.subtitle}>Network performance audit</Text>
        </View>
        <LinearGradient colors={theme.colors.linearGradient} style={styles.headerIcon}>
          <Wifi size={20} color="#fff" />
        </LinearGradient>
      </View>

      {/* ── Gauge zone ─────────────────────────────────────── */}
      <View style={styles.gaugeZone}>

        {/* Glow pulse ring */}
        <Animated.View style={[styles.glowRing, { transform: [{ scale: pulseAnim }] }]} />

        {/* SVG: arc track + arc fill + needle + pivot */}
        <Svg width={GAUGE_W} height={SVG_H} style={styles.svg}>
          <Defs>
            <SvgGrad id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%"   stopColor={theme.colors.primary} />
              <Stop offset="60%"  stopColor={theme.colors.secondary} />
              <Stop offset="100%" stopColor="#f5a623" />
            </SvgGrad>
            <SvgGrad id="needleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%"   stopColor="#ffffff" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
            </SvgGrad>
          </Defs>

          {/* Speed labels at arc ends and top */}
          <G opacity={0.4}>
            <Line x1={SW + 2} y1={CY} x2={SW + 10} y2={CY} stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
            <Line x1={GAUGE_W - SW - 10} y1={CY} x2={GAUGE_W - SW - 2} y2={CY} stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
          </G>

          {/* Track (dim) */}
          <Path
            d={ARC_PATH}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={SW}
            strokeLinecap="round"
          />

          {/* Fill (animated) */}
          <AnimatedPath
            d={ARC_PATH}
            fill="none"
            stroke="url(#arcGrad)"
            strokeWidth={SW}
            strokeLinecap="round"
            strokeDasharray={`${HALF_CIRC} ${HALF_CIRC}`}
            strokeDashoffset={strokeDashoffset}
          />

          {/* Tick marks at 0%, 25%, 50%, 75%, 100% of arc */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const angle = Math.PI - t * Math.PI; // π to 0 (left to right)
            const inner = R - SW / 2 - 6;
            const outer = R + SW / 2 + 6;
            const x1 = CX + inner * Math.cos(angle);
            const y1 = CY - inner * Math.sin(angle);
            const x2 = CX + outer * Math.cos(angle);
            const y2 = CY - outer * Math.sin(angle);
            return (
              <Line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={i === 2 ? 2 : 1.5}
                strokeLinecap="round"
              />
            );
          })}

          {/* Speed labels */}
          {[
            { val: '0',   t: 0 },
            { val: '50',  t: 0.25 },
            { val: '100', t: 0.5 },
            { val: '150', t: 0.75 },
            { val: '200', t: 1 },
          ].map(({ val, t }, i) => {
            const angle = Math.PI - t * Math.PI;
            const labelR = R + SW / 2 + 20;
            const lx = CX + labelR * Math.cos(angle);
            const ly = CY - labelR * Math.sin(angle);
            return (
              <G key={i}>
                {/* react-native-svg Text import */}
              </G>
            );
          })}

          {/* Needle */}
          <G>
            <Line
              x1={CX} y1={CY}
              x2={tipX} y2={tipY}
              stroke="url(#needleGrad)"
              strokeWidth={3}
              strokeLinecap="round"
            />
            {/* Needle glow */}
            <Line
              x1={CX} y1={CY}
              x2={tipX} y2={tipY}
              stroke={theme.colors.primary}
              strokeWidth={8}
              strokeLinecap="round"
              opacity={0.15}
            />
            {/* Needle tip dot */}
            <Circle cx={tipX} cy={tipY} r={3} fill={theme.colors.primary} />
          </G>

          {/* Pivot circle */}
          <Circle cx={CX} cy={CY} r={10} fill={theme.colors.surfaceContainerHigh} />
          <Circle cx={CX} cy={CY} r={5}  fill={theme.colors.primary} />
        </Svg>

        {/* Speed readout — overlaid in the arc's bowl */}
        <View style={styles.readout} pointerEvents="none">
          <Text style={[styles.speedNum, isRunning && { color: theme.colors.primary }]}>
            {displaySpeed}
          </Text>
          <Text style={styles.speedUnit}>Mbps</Text>
        </View>
      </View>

      {/* Phase chip */}
      <View style={styles.phaseRow}>
        <View style={[styles.phaseDot, isRunning && styles.phaseDotActive]} />
        <Text style={[styles.phaseText, isRunning && { color: theme.colors.primary }]}>
          {phase}
        </Text>
      </View>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <StatCard
          icon={<Activity size={13} color={theme.colors.primary} />}
          label="PING"
          value={ping}
          unit="ms"
          accent={theme.colors.primary}
        />
        <StatCard
          icon={<Download size={13} color={theme.colors.secondary} />}
          label="DOWNLOAD"
          value={dlSpeed}
          unit="Mbps"
          accent={theme.colors.secondary}
        />
        <StatCard
          icon={<Upload size={13} color="#f5a623" />}
          label="UPLOAD"
          value={ulSpeed}
          unit="Mbps"
          accent="#f5a623"
        />
      </View>

      {/* ── Score banner ─────────────────────────────────────── */}
      {sc && (
        <View style={[styles.scoreBanner, { backgroundColor: sc.bg, borderColor: sc.color + '35' }]}>
          <View>
            <Text style={styles.scoreLabel}>OVERALL RATING</Text>
            <Text style={[styles.scoreValue, { color: sc.color }]}>{sc.label}</Text>
          </View>
          <View style={[styles.scoreCircle, { borderColor: sc.color + '50' }]}>
            <Text style={[styles.scoreCircleText, { color: sc.color }]}>
              {dlSpeed ? `${dlSpeed}` : '—'}
            </Text>
            <Text style={[styles.scoreCircleUnit, { color: sc.color }]}>DL</Text>
          </View>
        </View>
      )}

      {/* ── Footer ─────────────────────────────────────────── */}
      <View style={styles.footer}>
        <View style={styles.serverBadge}>
          <Server size={11} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.serverText}>
            Testing via{' '}
            <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {selectedServer?.name || 'Main Hub'}
            </Text>
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.btn, isRunning && styles.btnDisabled]}
          onPress={isDone ? resetTest : runTest}
          disabled={isRunning}
        >
          <LinearGradient
            colors={theme.colors.linearGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.btnGrad}
          >
            {isDone ? (
              <><RotateCcw size={20} color="#fff" /><Text style={styles.btnText}>TEST AGAIN</Text></>
            ) : (
              <><Play size={20} color="#fff" fill="#fff" />
                <Text style={styles.btnText}>{isRunning ? 'RUNNING…' : 'START TEST'}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

/* ── Stat card ─────────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, unit, accent }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        {icon}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statVal, value != null && { color: accent }]}>
        {value ?? '—'}
      </Text>
      <Text style={styles.statUnit}>{unit}</Text>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 4,
  },
  title: {
    fontSize: 26,
    color: theme.colors.onBackground,
    fontWeight: '900',
    fontFamily: theme.fonts.display,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    fontFamily: theme.fonts.body,
    marginTop: 2,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Gauge
  gaugeZone: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 6,
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: GAUGE_W * 0.72,
    height: GAUGE_W * 0.72,
    borderRadius: GAUGE_W * 0.36,
    backgroundColor: 'rgba(118,185,0,0.04)',
    top: 0,
  },
  svg: {
    overflow: 'visible',
  },
  readout: {
    position: 'absolute',
    // Centre horizontally; vertically sit in the lower 40% of the arc area
    top: CY * 0.42,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  speedNum: {
    fontSize: 62,
    color: theme.colors.onBackground,
    fontWeight: '900',
    fontFamily: theme.fonts.display,
    letterSpacing: -2,
  },
  speedUnit: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: -6,
  },

  // Phase
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 10,
    marginBottom: 2,
  },
  phaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.outline,
  },
  phaseDotActive: {
    backgroundColor: theme.colors.primary,
  },
  phaseText: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    fontWeight: '900',
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 1.2,
  },

  // Stat cards
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 7,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '900',
    letterSpacing: 0.8,
    fontFamily: theme.fonts.label,
  },
  statVal: {
    fontSize: 22,
    color: theme.colors.outline,
    fontWeight: '900',
    fontFamily: theme.fonts.display,
  },
  statUnit: {
    fontSize: 8,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
    marginTop: 3,
    fontFamily: theme.fonts.body,
  },

  // Score banner
  scoreBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 9,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontFamily: theme.fonts.label,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: theme.fonts.display,
    letterSpacing: 1,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCircleText: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: theme.fonts.display,
  },
  scoreCircleUnit: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: theme.fonts.label,
    letterSpacing: 1,
    marginTop: 1,
  },

  // Footer
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
    marginTop: 8,
  },
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  serverText: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    fontFamily: theme.fonts.body,
  },
  btn: {
    height: 58,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnGrad: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
    fontFamily: theme.fonts.label,
  },
});
