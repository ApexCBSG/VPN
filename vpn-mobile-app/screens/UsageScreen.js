import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, Dimensions,
  ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { Clock, Download, Upload, Wifi, BarChart2, RefreshCw } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 48;
const CHART_HEIGHT = 120;

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const fmtDuration = (seconds) => {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ─── Tiny bar chart (no external lib needed) ────────────────────────────────
function WeeklyChart({ weekly }) {
  if (!weekly?.length) return null;
  const max = Math.max(...weekly.map(d => d.bytes), 1);
  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.bars}>
        {weekly.map((d, i) => {
          const h = Math.max((d.bytes / max) * CHART_HEIGHT, 2);
          const isToday = i === weekly.length - 1;
          return (
            <View key={i} style={chartStyles.barCol}>
              <View style={[chartStyles.bar, { height: h, backgroundColor: isToday ? theme.colors.primary : '#2a2a2a', borderColor: isToday ? theme.colors.primary : '#3a3a3a' }]} />
              <Text style={[chartStyles.barLabel, isToday && { color: theme.colors.primary }]}>{d.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { marginTop: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT + 24, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 2, borderWidth: 1, minHeight: 2 },
  barLabel: { fontSize: 9, color: '#5e5e5e', marginTop: 5, fontWeight: '700' },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function UsageScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const token = await SecureStore.getItemAsync('userToken');
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${API_URL}/vpn/history?limit=20`, {
        headers: { 'x-auth-token': token },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Wifi size={40} color={theme.colors.outline} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchHistory()}>
            <RefreshCw size={14} color={theme.colors.primary} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { stats, weekly, sessions } = data || {};

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchHistory(true)}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.sectionMicro}>ANALYTICS</Text>
            <Text style={styles.title}>Connection Stats</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Download size={16} color={theme.colors.primary} strokeWidth={2.5} />
            <Text style={styles.statValue}>{fmtBytes(stats?.totalBytesIn)}</Text>
            <Text style={styles.statLabel}>DOWNLOADED</Text>
          </View>
          <View style={styles.statCard}>
            <Upload size={16} color={theme.colors.secondary} strokeWidth={2.5} />
            <Text style={styles.statValue}>{fmtBytes(stats?.totalBytesOut)}</Text>
            <Text style={styles.statLabel}>UPLOADED</Text>
          </View>
          <View style={styles.statCard}>
            <Clock size={16} color="#ef9100" strokeWidth={2.5} />
            <Text style={styles.statValue}>{fmtDuration(stats?.totalDuration)}</Text>
            <Text style={styles.statLabel}>TOTAL TIME</Text>
          </View>
          <View style={styles.statCard}>
            <BarChart2 size={16} color="#a78bfa" strokeWidth={2.5} />
            <Text style={styles.statValue}>{stats?.totalSessions ?? 0}</Text>
            <Text style={styles.statLabel}>SESSIONS</Text>
          </View>
        </View>

        {/* Weekly chart */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>WEEKLY USAGE</Text>
          <WeeklyChart weekly={weekly} />
          {weekly?.every(d => d.bytes === 0) && (
            <Text style={styles.emptyNote}>No usage data yet this week</Text>
          )}
        </View>

        {/* Session history */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>SESSION HISTORY</Text>
          {!sessions?.length ? (
            <View style={styles.emptyState}>
              <Wifi size={32} color={theme.colors.outline} />
              <Text style={styles.emptyText}>No sessions yet</Text>
              <Text style={styles.emptySubText}>Connect to a server to start tracking</Text>
            </View>
          ) : (
            sessions.map((s, i) => (
              <View key={s.id} style={[styles.sessionRow, i < sessions.length - 1 && styles.sessionRowBorder]}>
                <View style={styles.sessionDot} />
                <View style={styles.sessionContent}>
                  <Text style={styles.sessionNode}>{s.node}</Text>
                  <Text style={styles.sessionMeta}>
                    {fmtDuration(s.duration)} · ↓{fmtBytes(s.bytesIn)} ↑{fmtBytes(s.bytesOut)}
                  </Text>
                </View>
                <Text style={styles.sessionDate}>{fmtDate(s.connectedAt)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: 24, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 },
  sectionMicro: { fontSize: 10, fontWeight: '700', color: theme.colors.primary, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 26, fontFamily: theme.fonts.display, fontWeight: '700', color: theme.colors.onBackground },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: (width - 58) / 2,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1f1f1f',
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.primary,
    padding: 14,
    gap: 6,
  },
  statValue: { fontSize: 20, fontFamily: theme.fonts.display, fontWeight: '700', color: theme.colors.onSurface },
  statLabel: { fontSize: 9, fontWeight: '700', color: theme.colors.onSurfaceVariant, letterSpacing: 1.5 },

  // Cards
  card: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1f1f1f',
    borderTopWidth: 2,
    borderTopColor: theme.colors.primary,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: { fontSize: 9, fontWeight: '700', color: theme.colors.primary, letterSpacing: 2, marginBottom: 12 },

  // Session rows
  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  sessionRowBorder: { borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  sessionDot: { width: 6, height: 6, borderRadius: 1, backgroundColor: theme.colors.primary },
  sessionContent: { flex: 1 },
  sessionNode: { fontSize: 13, fontWeight: '600', color: theme.colors.onSurface, fontFamily: theme.fonts.body },
  sessionMeta: { fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 2 },
  sessionDate: { fontSize: 10, color: theme.colors.outline, textAlign: 'right' },

  // Empty / error
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 14, fontWeight: '600', color: theme.colors.onSurfaceVariant },
  emptySubText: { fontSize: 12, color: theme.colors.outline, textAlign: 'center' },
  emptyNote: { fontSize: 11, color: theme.colors.outline, textAlign: 'center', marginTop: 8 },
  loadingText: { fontSize: 13, color: theme.colors.onSurfaceVariant, marginTop: 8 },
  errorText: { fontSize: 13, color: theme.colors.error, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, padding: 10, borderWidth: 1, borderColor: theme.colors.primary },
  retryText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
});
