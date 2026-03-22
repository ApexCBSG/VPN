import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { Globe, Search, ChevronRight, Activity } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

const SERVERS = [
  { id: '1', name: 'USA - New York', city: 'Low Latency', country: 'US', ping: '24ms', load: 12, tier: 'free' },
  { id: '2', name: 'UK - London', city: 'Stable', country: 'GB', ping: '65ms', load: 35, tier: 'premium' },
  { id: '3', name: 'Germany - Frankfurt', city: 'Optimized', country: 'DE', ping: '58ms', load: 42, tier: 'premium' },
  { id: '4', name: 'Singapore', city: 'Asian Hub', country: 'SG', ping: '120ms', load: 68, tier: 'premium' },
];

export default function ServerListScreen({ navigation }) {
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      style={styles.serverCard} 
      onPress={() => navigation.goBack()}
    >
      <View style={styles.cardInfo}>
        <View style={styles.iconContainer}>
          <Globe size={20} color={theme.colors.primary} strokeWidth={1.5} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.serverTitle}>{item.name}</Text>
          <Text style={styles.serverMeta}>{item.city} • {item.ping}</Text>
        </View>
      </View>
      
      <View style={styles.loadContainer}>
        <Activity size={14} color={item.load < 50 ? theme.colors.tertiary : theme.colors.error} />
        <Text style={[styles.loadText, { color: item.load < 50 ? theme.colors.tertiary : theme.colors.error }]}>
          {item.load}%
        </Text>
        <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Global Nodes</Text>
        <Text style={styles.subtitle}>Select a high-speed server</Text>
        
        <View style={styles.searchContainer}>
          <Search size={20} color={theme.colors.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            placeholder="Search locations..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            style={styles.searchInput}
          />
        </View>
      </View>

      <FlatList
        data={SERVERS}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
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
    marginBottom: theme.spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.roundness.md,
    paddingHorizontal: theme.spacing.md,
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.body,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  serverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  textContainer: {},
  serverTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.headline,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  serverMeta: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  loadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadText: {
    fontSize: 12,
    fontFamily: theme.fonts.label,
    fontWeight: '700',
    marginHorizontal: 8,
  },
});
