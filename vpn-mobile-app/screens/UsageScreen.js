import React from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { LineChart } from 'react-native-chart-kit';
import { Clock, Database, Zap, ArrowDownCircle, ArrowUpCircle } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const chartData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [
    {
      data: [2.1, 4.5, 3.2, 8.4, 6.7, 10.2, 5.5],
      color: (opacity = 1) => theme.colors.primary,
      strokeWidth: 2
    }
  ]
};

export default function UsageScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Connection Analytics</Text>
          <Text style={styles.subtitle}>Real-time monitoring and throughput analysis</Text>
        </View>

        
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>NETWORK THROUGHPUT (GB)</Text>
          <LineChart
            data={chartData}
            width={width - theme.spacing.lg * 2}
            height={220}
            chartConfig={{
              backgroundColor: theme.colors.background,
              backgroundGradientFrom: theme.colors.background,
              backgroundGradientTo: theme.colors.background,
              decimalPlaces: 1,
              color: (opacity = 1) => theme.colors.primary,
              labelColor: (opacity = 1) => theme.colors.onSurfaceVariant,
              style: { borderRadius: 16 },
              propsForDots: { r: "4", strokeWidth: "2", stroke: theme.colors.primary }
            }}
            bezier
            style={styles.chart}
          />
        </View>

        
        <View style={styles.statsGrid}>
          <BlurView intensity={theme.glassBlur} tint="dark" style={styles.statCard}>
            <ArrowDownCircle size={20} color={theme.colors.primary} />
            <Text style={styles.statLabel}>DOWNLOAD</Text>
            <Text style={styles.statValue}>12.4 MB/s</Text>
          </BlurView>
          <BlurView intensity={theme.glassBlur} tint="dark" style={styles.statCard}>
            <ArrowUpCircle size={20} color={theme.colors.secondary} />
            <Text style={styles.statLabel}>UPLOAD</Text>
            <Text style={styles.statValue}>2.8 MB/s</Text>
          </BlurView>
        </View>

        
        <View style={styles.historyContainer}>
          <Text style={styles.sectionLabel}>SESSION LOGS</Text>
          {[1, 2, 3].map((_, i) => (
            <View key={i} style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <Clock size={16} color={theme.colors.onSurfaceVariant} />
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyTitle}>USA - New York Server</Text>
                <Text style={styles.historyMeta}>2h 15m • 4.2 GB Transferred</Text>
              </View>
              <Text style={styles.historyDate}>Mar 22</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  header: {
    marginBottom: theme.spacing.xl,
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
  chartContainer: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.roundness.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  chartTitle: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: theme.spacing.md,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    width: (width - theme.spacing.lg * 3) / 2,
    padding: theme.spacing.md,
    borderRadius: theme.roundness.lg,
    backgroundColor: theme.colors.surfaceVariant,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '800',
    marginTop: 8,
  },
  statValue: {
    fontSize: 18,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurface,
    fontWeight: '700',
    marginTop: 2,
  },
  historyContainer: {
    marginTop: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: theme.spacing.lg,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: theme.spacing.md,
    borderRadius: theme.roundness.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    color: theme.colors.onSurface,
    fontSize: 14,
    fontFamily: theme.fonts.headline,
    fontWeight: '600',
  },
  historyMeta: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    fontFamily: theme.fonts.body,
    marginTop: 2,
  },
  historyDate: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: theme.fonts.body,
  },
});
