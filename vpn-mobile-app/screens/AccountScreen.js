import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Switch, 
  Alert, 
  ActivityIndicator, 
  Modal, 
  TextInput, 
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { User, Mail, CreditCard, Bell, Shield, LogOut, ChevronRight, Lock, Eye, EyeOff, Save, X } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from '../config';

const { width, height } = Dimensions.get('window');

export default function AccountScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  
  // Password State
  const [modalVisible, setModalVisible] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [updating, setUpdating] = useState(false);

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
      } else {
        // Token expired probably
        navigation.replace('Login');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      Alert.alert('Incomplete', 'Please fill all fields.');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }

    setUpdating(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API_URL}/auth/update-password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-auth-token': token 
        },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new
        })
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Password updated successfully.');
        setModalVisible(false);
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        Alert.alert('Error', data.msg || 'Failed to update password.');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not reach server.');
    } finally {
      setUpdating(false);
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
          <TouchableOpacity style={styles.profileBadge}>
            <LinearGradient colors={theme.colors.linearGradient} style={styles.profileGradient}>
              <Text style={styles.initials}>{user?.email?.charAt(0).toUpperCase() || 'U'}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.name || 'VPN User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          <TouchableOpacity 
            style={[styles.planBadge, user?.tier === 'premium' && styles.premiumBadge]}
            onPress={() => user?.tier !== 'premium' && navigation.navigate('Paywall')}
          >
            <Shield size={14} color={user?.tier === 'premium' ? theme.colors.background : theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.planText, user?.tier === 'premium' && styles.premiumText]}>
                {user?.tier === 'premium' ? 'PREMIUM USER' : 'FREE ACCOUNT'}
            </Text>
            {user?.tier !== 'premium' && <ChevronRight size={14} color={theme.colors.primary} />}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.menuItem}>
            <View style={styles.menuLabel}>
              <Mail size={20} color={theme.colors.onSurfaceVariant} strokeWidth={1.5} />
              <Text style={styles.menuText}>Email Address</Text>
            </View>
            <Text style={styles.menuValue}>{user?.email}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Paywall')}
          >
            <View style={styles.menuLabel}>
              <CreditCard size={20} color={theme.colors.onSurfaceVariant} strokeWidth={1.5} />
              <Text style={styles.menuText}>Subscription</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.menuValue}>{user?.tier === 'premium' ? 'Premium' : 'Upgrade'}</Text>
                <ChevronRight size={16} color={theme.colors.outline} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security & Privacy</Text>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setModalVisible(true)}
          >
            <View style={styles.menuLabel}>
              <Lock size={20} color={theme.colors.onSurfaceVariant} strokeWidth={1.5} />
              <Text style={styles.menuText}>Change Password</Text>
            </View>
            <ChevronRight size={16} color={theme.colors.outline} />
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <View style={styles.menuLabel}>
              <Bell size={20} color={theme.colors.onSurfaceVariant} strokeWidth={1.5} />
              <Text style={styles.menuText}>In-App Notifications</Text>
            </View>
            <Switch 
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: theme.colors.surfaceContainerHigh, true: theme.colors.primary }}
              thumbColor={notifications ? theme.colors.background : theme.colors.onSurfaceVariant}
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

        <Text style={styles.versionText}>Sentinel Secure Access v1.0.4</Text>
      </ScrollView>

      {/* CHANGE PASSWORD MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalView}>
           <BlurView intensity={30} tint="dark" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                 <Text style={styles.modalTitle}>Security Update</Text>
                 <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <X size={24} color={theme.colors.onSurfaceVariant} />
                 </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>CURRENT PASSWORD</Text>
                 <View style={styles.inputWrapper}>
                    <TextInput 
                        style={styles.input} 
                        secureTextEntry={!showPwd}
                        placeholder="Required for verification"
                        placeholderTextColor={theme.colors.outline}
                        value={passwords.current}
                        onChangeText={(t) => setPasswords({...passwords, current: t})}
                    />
                    <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
                        {showPwd ? <EyeOff size={18} color={theme.colors.primary} /> : <Eye size={18} color={theme.colors.outline} />}
                    </TouchableOpacity>
                 </View>
              </View>

              <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>NEW PASSWORD</Text>
                 <View style={styles.inputWrapper}>
                    <TextInput 
                        style={styles.input} 
                        secureTextEntry={!showPwd}
                        placeholder="Update password"
                        placeholderTextColor={theme.colors.outline}
                        value={passwords.new}
                        onChangeText={(t) => setPasswords({...passwords, new: t})}
                    />
                 </View>
              </View>

              <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
                 <View style={styles.inputWrapper}>
                    <TextInput 
                        style={styles.input} 
                        secureTextEntry={!showPwd}
                        placeholder="Confirm update"
                        placeholderTextColor={theme.colors.outline}
                        value={passwords.confirm}
                        onChangeText={(t) => setPasswords({...passwords, confirm: t})}
                    />
                 </View>
              </View>

              <TouchableOpacity 
                style={styles.saveBtn}
                onPress={handleUpdatePassword}
                disabled={updating}
              >
                 <LinearGradient 
                    start={{x:0, y:0}} 
                    end={{x:1, y:0}} 
                    colors={theme.colors.linearGradient}
                    style={styles.saveGradient}
                 >
                    {updating ? (
                        <ActivityIndicator size="small" color={theme.colors.background} />
                    ) : (
                        <>
                            <Save size={18} color={theme.colors.background} />
                            <Text style={styles.saveText}>CONFIRM SECURITY UPDATE</Text>
                        </>
                    )}
                 </LinearGradient>
              </TouchableOpacity>
           </BlurView>
        </View>
      </Modal>
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
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  profileBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.surfaceContainerHigh,
    padding: 6,
    marginBottom: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  profileGradient: {
    flex: 1,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.background,
    letterSpacing: -1,
  },
  userName: {
    fontSize: 26,
    fontFamily: theme.fonts.display,
    color: theme.colors.onBackground,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 20,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(129, 236, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.roundness.lg,
    borderWidth: 1,
    borderColor: 'rgba(129, 236, 255, 0.2)',
  },
  premiumBadge: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  planText: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 1,
    marginRight: 8,
  },
  premiumText: {
    color: theme.colors.background,
  },
  section: {
    marginTop: 30,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
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
    fontWeight: '600',
  },
  menuValue: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    marginRight: 6,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
    marginHorizontal: theme.spacing.lg,
    height: 60,
    borderRadius: theme.roundness.lg,
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  logoutText: {
    color: theme.colors.error,
    fontSize: 16,
    fontFamily: theme.fonts.label,
    fontWeight: '800',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 60,
    fontSize: 11,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    opacity: 0.4,
    letterSpacing: 1,
  },
  
  // MODAL STYLES
  modalView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: '100%',
    padding: 30,
    paddingTop: 20,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.display,
    color: theme.colors.onBackground,
    fontWeight: '900',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  input: {
    flex: 1,
    color: theme.colors.onSurface,
    fontSize: 15,
    fontFamily: theme.fonts.body,
  },
  saveBtn: {
    height: 60,
    borderRadius: 18,
    marginTop: 20,
    marginBottom: 10,
    overflow: 'hidden',
  },
  saveGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  saveText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  }
});
