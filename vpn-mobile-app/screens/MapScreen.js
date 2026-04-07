import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { Navigation, Globe, Signal, ChevronRight, Activity } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { API_URL } from '../config';

const { width, height } = Dimensions.get('window');

// Map country codes to approximate positions on a simple world projection
const COUNTRY_POSITIONS = {
  US: { top: '35%', left: '18%' },
  CA: { top: '25%', left: '20%' },
  GB: { top: '28%', left: '47%' },
  DE: { top: '30%', left: '51%' },
  FR: { top: '32%', left: '49%' },
  NL: { top: '29%', left: '50%' },
  SG: { top: '55%', left: '76%' },
  JP: { top: '35%', left: '82%' },
  AU: { top: '72%', left: '82%' },
  BR: { top: '60%', left: '32%' },
  IN: { top: '42%', left: '72%' },
  AE: { top: '40%', left: '63%' },
  ZA: { top: '68%', left: '55%' },
  KR: { top: '36%', left: '80%' },
  // Default fallback
  DEFAULT: { top: '45%', left: '50%' },
};

const getPosition = (countryCode) => {
  return COUNTRY_POSITIONS[countryCode] || COUNTRY_POSITIONS.DEFAULT;
};

export default function MapScreen({ navigation }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      const response = await fetch(`${API_URL}/nodes`);
      const data = await response.json();
      if (response.ok) {
        setNodes(data.filter(n => n.isActive));
      }
    } catch (error) {
      console.error('[MAP] Failed to fetch nodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeSelect = (node) => {
    navigation.navigate('Main', {
      screen: 'Shield',
      params: { selectedServer: node }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Global Network</Text>
          <Text style={styles.subtitle}>Tap a node to connect</Text>
        </View>
        <LinearGradient colors={theme.colors.linearGradient} style={styles.iconCircle}>
          <Globe size={20} color={theme.colors.background} />
        </LinearGradient>
      </View>

      {/* Map Area */}
      <View style={styles.mapContainer}>
        {/* Grid lines for visual effect */}
        <View style={styles.gridOverlay}>
          {[...Array(5)].map((_, i) => (
            <View key={`h-${i}`} style={[styles.gridLineH, { top: `${(i + 1) * 16.6}%` }]} />
          ))}
          {[...Array(7)].map((_, i) => (
            <View key={`v-${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 12.5}%` }]} />
          ))}
        </View>

        {/* Continent shapes (simplified dots) */}
        <View style={[styles.continentDot, { top: '30%', left: '15%', width: 80, height: 40 }]} />
        <View style={[styles.continentDot, { top: '50%', left: '28%', width: 50, height: 50 }]} />
        <View style={[styles.continentDot, { top: '28%', left: '45%', width: 60, height: 30 }]} />
        <View style={[styles.continentDot, { top: '38%', left: '52%', width: 40, height: 40 }]} />
        <View style={[styles.continentDot, { top: '35%', left: '68%', width: 70, height: 40 }]} />
        <View style={[styles.continentDot, { top: '65%', left: '78%', width: 50, height: 30 }]} />

        {/* Node markers */}
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : (
          nodes.map((node) => {
            const pos = getPosition(node.countryCode);
            const isSelected = selectedNode?._id === node._id;
            return (
              <TouchableOpacity
                key={node._id}
                style={[styles.nodeMarker, { top: pos.top, left: pos.left }]}
                onPress={() => setSelectedNode(isSelected ? null : node)}
                activeOpacity={0.7}
              >
                <View style={[styles.markerPulse, isSelected && styles.markerPulseActive]} />
                <View style={[styles.markerDot, isSelected && styles.markerDotActive]} />
                <Text style={[styles.markerLabel, isSelected && styles.markerLabelActive]}>
                  {node.name}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        {selectedNode ? (
          <TouchableOpacity
            style={styles.nodeCard}
            activeOpacity={0.8}
            onPress={() => handleNodeSelect(selectedNode)}
          >
            <View style={styles.nodeCardLeft}>
              <LinearGradient colors={theme.colors.linearGradient} style={styles.nodeIcon}>
                <Signal size={18} color={theme.colors.background} />
              </LinearGradient>
              <View>
                <Text style={styles.nodeCardName}>{selectedNode.name}</Text>
                <Text style={styles.nodeCardMeta}>{selectedNode.city} - {selectedNode.countryCode}</Text>
              </View>
            </View>
            <View style={styles.nodeCardRight}>
              <View style={styles.loadIndicator}>
                <Activity size={12} color={selectedNode.load < 50 ? theme.colors.tertiary : theme.colors.error} />
                <Text style={[styles.loadText, { color: selectedNode.load < 50 ? theme.colors.tertiary : theme.colors.error }]}>
                  {selectedNode.load}%
                </Text>
              </View>
              <LinearGradient colors={theme.colors.linearGradient} style={styles.connectBtn}>
                <Text style={styles.connectBtnText}>CONNECT</Text>
                <ChevronRight size={14} color={theme.colors.background} />
              </LinearGradient>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.hintContainer}>
            <Signal size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.hintText}>
              {nodes.length} active node{nodes.length !== 1 ? 's' : ''} available - Tap a node on the map
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.listViewBtn}
          onPress={() => navigation.navigate('Servers')}
        >
          <Navigation size={16} color={theme.colors.primary} />
          <Text style={styles.listViewText}>LIST VIEW</Text>
        </TouchableOpacity>
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
    paddingTop: 10,
    paddingBottom: 16,
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
    fontFamily: theme.fonts.body,
    marginTop: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    overflow: 'hidden',
    position: 'relative',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(129, 236, 255, 0.03)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(129, 236, 255, 0.03)',
  },
  continentDot: {
    position: 'absolute',
    borderRadius: 20,
    backgroundColor: 'rgba(129, 236, 255, 0.04)',
  },
  loader: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
  },
  nodeMarker: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  markerPulse: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(129, 236, 255, 0.1)',
    top: -10,
  },
  markerPulseActive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(129, 236, 255, 0.2)',
    top: -16,
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.background,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  markerDotActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryContainer,
    borderWidth: 3,
  },
  markerLabel: {
    marginTop: 4,
    fontSize: 9,
    fontFamily: theme.fonts.label,
    fontWeight: '800',
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textShadowColor: theme.colors.background,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  markerLabelActive: {
    color: theme.colors.primary,
    fontSize: 10,
  },
  bottomPanel: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  nodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(129, 236, 255, 0.15)',
  },
  nodeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nodeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeCardName: {
    fontSize: 16,
    fontFamily: theme.fonts.display,
    color: theme.colors.onSurface,
    fontWeight: '800',
  },
  nodeCardMeta: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  nodeCardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  loadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadText: {
    fontSize: 11,
    fontFamily: theme.fonts.label,
    fontWeight: '800',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  connectBtnText: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    fontWeight: '900',
    color: theme.colors.background,
    letterSpacing: 0.5,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  hintText: {
    fontSize: 13,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
  },
  listViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(129, 236, 255, 0.15)',
  },
  listViewText: {
    fontSize: 12,
    fontFamily: theme.fonts.label,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
});
