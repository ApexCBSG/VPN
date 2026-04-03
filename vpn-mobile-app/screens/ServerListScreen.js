import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { Globe, Search, ChevronRight, Activity, Lock } from 'lucide-react-native';
import { API_URL } from '../config';
import { useSubscription } from '../context/SubscriptionContext';

export default function ServerListScreen({ navigation }) {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { entitlements } = useSubscription();

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const response = await fetch(`${API_URL}/nodes`);
      const data = await response.json();
      if (response.ok) {
        setServers(data);
      } else {
        Alert.alert('Error', 'Failed to load server network.');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleServerSelect = (item) => {
    const isPremium = item.allowedTiers.includes('premium') && !item.allowedTiers.includes('free');
    
    if (isPremium && !entitlements.premium) {
      navigation.navigate('Paywall');
      return;
    }

    navigation.navigate('Main', { 
      screen: 'Shield', 
      params: { selectedServer: item } 
    });
  };

  const filteredServers = servers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.city.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => {
    const isPremium = item.allowedTiers.includes('premium') && !item.allowedTiers.includes('free');

    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        style={styles.serverCard} 
        onPress={() => handleServerSelect(item)}
      >
        <View style={styles.cardInfo}>
          <View style={styles.iconContainer}>
            <Globe size={20} color={theme.colors.primary} strokeWidth={1.5} />
          </View>
          <View style={styles.textContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.serverTitle}>{item.name}</Text>
              {isPremium && (
                <View style={styles.proBadge}>
                   <Lock size={10} color="#FFD700" fill="#FFD700" />
                   <Text style={styles.proText}>PRO</Text>
                </View>
              )}
            </View>
            <Text style={styles.serverMeta}>{item.city} • {item.countryCode}</Text>
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Global Connection Network</Text>
        <Text style={styles.subtitle}>Select an optimized enterprise node for your session</Text>
        
        <View style={styles.searchContainer}>
          <Search size={20} color={theme.colors.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            placeholder="Search locations..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredServers}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 50 }}>
              No available nodes detected in this region.
            </Text>
          }
        />
      )}
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
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#FFD700',
    gap: 4,
  },
  proText: {
    fontSize: 8,
    fontFamily: theme.fonts.label,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 0.5,
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
