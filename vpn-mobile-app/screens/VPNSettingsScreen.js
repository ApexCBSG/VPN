import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Switch, ScrollView,
  Alert, SectionList, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { ArrowLeft, Shield, Zap, GitBranch, ChevronRight, Info, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useVPNSettings } from '../context/VPNSettingsContext';
import { openKillSwitchSettings } from '../utils/vpnBridge';

const { width } = Dimensions.get('window');

export default function VPNSettingsScreen({ navigation }) {
  const {
    killSwitch, setKillSwitch,
    autoConnect, setAutoConnect,
    splitTunnelEnabled, setSplitTunnelEnabled,
    splitTunnelApps, toggleSplitTunnelApp,
    AVAILABLE_APPS,
  } = useVPNSettings();

  const [showAppList, setShowAppList] = useState(false);

  const handleKillSwitchToggle = async (val) => {
    if (val) {
      // Inform user that kill switch requires Android system settings
      Alert.alert(
        'Kill Switch',
        'Kill Switch blocks all internet traffic if the VPN disconnects unexpectedly.\n\nThis requires enabling "Always-on VPN" + "Block connections without VPN" in Android system settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Configure',
            onPress: () => {
              setKillSwitch(true);
              openKillSwitchSettings();
            }
          }
        ]
      );
    } else {
      await setKillSwitch(false);
    }
  };

  const handleSplitTunnelToggle = async (val) => {
    await setSplitTunnelEnabled(val);
    if (val) setShowAppList(true);
  };

  // Group apps by category for the section list
  const categories = [...new Set(AVAILABLE_APPS.map(a => a.category))];
  const sections = categories.map(cat => ({
    title: cat,
    data: AVAILABLE_APPS.filter(a => a.category === cat),
  }));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={styles.title}>VPN Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── KILL SWITCH ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PROTECTION</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <LinearGradient colors={['#ff716c', '#cc3030']} style={styles.iconBg}>
                  <Shield size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Kill Switch</Text>
                  <Text style={styles.rowSub}>Block internet if VPN drops</Text>
                </View>
              </View>
              <Switch
                value={killSwitch}
                onValueChange={handleKillSwitchToggle}
                trackColor={{ false: theme.colors.surfaceContainerHigh, true: 'rgba(255,113,108,0.4)' }}
                thumbColor={killSwitch ? '#ff716c' : theme.colors.onSurfaceVariant}
              />
            </View>
            {killSwitch && (
              <TouchableOpacity style={styles.infoRow} onPress={openKillSwitchSettings}>
                <Info size={12} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.infoText}>Tap to verify Android system settings are configured</Text>
                <ChevronRight size={12} color={theme.colors.outline} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── AUTO-CONNECT ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CONNECTION</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <LinearGradient colors={theme.colors.linearGradient} style={styles.iconBg}>
                  <Zap size={18} color={theme.colors.background} />
                </LinearGradient>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Auto-Connect</Text>
                  <Text style={styles.rowSub}>Connect VPN when app opens</Text>
                </View>
              </View>
              <Switch
                value={autoConnect}
                onValueChange={setAutoConnect}
                trackColor={{ false: theme.colors.surfaceContainerHigh, true: 'rgba(129,236,255,0.3)' }}
                thumbColor={autoConnect ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
            </View>
            {autoConnect && (
              <View style={styles.infoRow}>
                <Info size={12} color={theme.colors.primary} />
                <Text style={[styles.infoText, { color: theme.colors.primary }]}>
                  Will reconnect to last used server on launch
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── SPLIT TUNNELING ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SPLIT TUNNELING</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <LinearGradient colors={['#afefdd', '#00c49a']} style={styles.iconBg}>
                  <GitBranch size={18} color={theme.colors.background} />
                </LinearGradient>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Split Tunneling</Text>
                  <Text style={styles.rowSub}>Choose apps that bypass VPN</Text>
                </View>
              </View>
              <Switch
                value={splitTunnelEnabled}
                onValueChange={handleSplitTunnelToggle}
                trackColor={{ false: theme.colors.surfaceContainerHigh, true: 'rgba(175,239,221,0.3)' }}
                thumbColor={splitTunnelEnabled ? theme.colors.secondary : theme.colors.onSurfaceVariant}
              />
            </View>

            <TouchableOpacity
              style={[styles.expandBtn, !splitTunnelEnabled && styles.expandBtnDisabled]}
              onPress={() => splitTunnelEnabled && setShowAppList(!showAppList)}
              disabled={!splitTunnelEnabled}
            >
              <Text style={[styles.expandBtnText, !splitTunnelEnabled && { color: theme.colors.outline }]}>
                {splitTunnelApps.length > 0
                  ? `${splitTunnelApps.length} app${splitTunnelApps.length > 1 ? 's' : ''} bypassing VPN`
                  : 'Select apps to bypass'}
              </Text>
              <ChevronRight
                size={14}
                color={splitTunnelEnabled ? theme.colors.secondary : theme.colors.outline}
                style={{ transform: [{ rotate: showAppList ? '90deg' : '0deg' }] }}
              />
            </TouchableOpacity>
          </View>

          {/* App list shown inline when expanded */}
          {splitTunnelEnabled && showAppList && (
            <View style={styles.appListCard}>
              <Text style={styles.appListHint}>
                Selected apps will use your regular internet connection, bypassing the VPN tunnel.
              </Text>
              {sections.map(section => (
                <View key={section.title}>
                  <Text style={styles.appCategoryLabel}>{section.title.toUpperCase()}</Text>
                  {section.data.map(app => {
                    const isExcluded = splitTunnelApps.includes(app.packageName);
                    return (
                      <TouchableOpacity
                        key={app.packageName}
                        style={styles.appRow}
                        onPress={() => toggleSplitTunnelApp(app.packageName)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.appIconPlaceholder}>
                          <Text style={styles.appIconText}>{app.label.charAt(0)}</Text>
                        </View>
                        <Text style={styles.appLabel}>{app.label}</Text>
                        <View style={[styles.appCheckbox, isExcluded && styles.appCheckboxActive]}>
                          {isExcluded && <Check size={12} color={theme.colors.background} strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Info footer */}
        <View style={styles.footerCard}>
          <Text style={styles.footerText}>
            Changes apply on next VPN connection. Reconnect to activate updated settings.
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: theme.fonts.display,
    fontWeight: '900',
    color: theme.colors.onBackground,
    letterSpacing: 0.5,
  },
  scroll: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    fontWeight: '900',
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 2,
    marginBottom: 12,
  },
  card: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.body,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  rowSub: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
  },
  expandBtnDisabled: {
    opacity: 0.4,
  },
  expandBtnText: {
    fontSize: 13,
    fontFamily: theme.fonts.body,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  appListCard: {
    marginTop: 8,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  appListHint: {
    fontSize: 11,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 16,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  appCategoryLabel: {
    fontSize: 9,
    fontFamily: theme.fonts.label,
    fontWeight: '900',
    color: theme.colors.outline,
    letterSpacing: 1.5,
    marginTop: 14,
    marginBottom: 8,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(64,72,93,0.08)',
  },
  appIconPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appIconText: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  appLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.body,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  appCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: theme.colors.outline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appCheckboxActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  footerCard: {
    backgroundColor: 'rgba(129,236,255,0.04)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(129,236,255,0.08)',
  },
  footerText: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
});
