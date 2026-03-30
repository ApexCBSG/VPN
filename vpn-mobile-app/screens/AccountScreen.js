import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { User, Mail, CreditCard, Bell, Shield, LogOut, ChevronRight } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

export default function AccountScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { 'x-auth-token': token }
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync('userToken');
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.profileBadge}>
            <User size={40} color={theme.colors.primary} />
          </View>
          <Text style={styles.userName}>{user?.name || 'VPN User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          <View style={styles.planBadge}>
            <Shield size={14} color={theme.colors.tertiary} style={{ marginRight: 6 }} />
            <Text style={styles.planText}>{user?.isPremium ? 'PREMIUM USER' : 'FREE ACCOUNT'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLabel}>
              <Mail size={20} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.menuText}>Email Address</Text>
            </View>
            <Text style={styles.menuValue}>{user?.email}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLabel}>
              <CreditCard size={20} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.menuText}>Current Plan</Text>
            </View>
            <Text style={styles.menuValue}>{user?.isPremium ? 'Premium' : 'Standard'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.menuItem}>
            <View style={styles.menuLabel}>
              <Bell size={20} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.menuText}>Security Alerts</Text>
            </View>
            <Switch 
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: theme.colors.surfaceContainerHigh, true: theme.colors.primary }}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <LogOut size={20} color={theme.colors.error} style={{ marginRight: 10 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Sentinel's Veil v1.0.2-Stable</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  profileBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  userName: {
    fontSize: 24,
    fontFamily: theme.fonts.display,
    color: theme.colors.onBackground,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 15,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 227, 253, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 227, 253, 0.3)',
  },
  planText: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  section: {
    marginTop: 25,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: theme.fonts.label,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  menuLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurface,
    marginLeft: 15,
    fontWeight: '500',
  },
  menuValue: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginHorizontal: theme.spacing.lg,
    height: 56,
    borderRadius: theme.roundness.md,
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  logoutText: {
    color: theme.colors.error,
    fontSize: 16,
    fontFamily: theme.fonts.label,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    opacity: 0.5,
  },
});
