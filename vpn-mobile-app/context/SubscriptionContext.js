import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

const SubscriptionContext = createContext({});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }) => {
  const [entitlements, setEntitlements] = useState({ premium: false });
  const [offerings, setOfferings] = useState(null);
  const [adminOfferings, setAdminOfferings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializePurchases();
  }, []);

  const initializePurchases = async () => {
    try {
      Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

      // Replace these with your actual keys from the dashboard
      const iosApiKey = 'goog_TihBBnUGfXSZZQPTGtAgVlZSmpt'; // Placeholder
      const androidApiKey = 'goog_TihBBnUGfXSZZQPTGtAgVlZSmpt'; // From your snippet

      if (Platform.OS === 'ios' && iosApiKey) {
        Purchases.configure({ apiKey: iosApiKey });
      } else if (Platform.OS === 'android' && androidApiKey) {
        Purchases.configure({ apiKey: androidApiKey });
      }

      // Check current entitlement status
      updateEntitlements();
      
      // Fetch Offerings (from RevenueCat)
      const rcOfferings = await Purchases.getOfferings();
      if (rcOfferings.current !== null) {
        setOfferings(rcOfferings.current);
      }

      // Fetch Display Metadata (from our Admin Backend)
      fetchAdminOfferings();

    } catch (e) {
      console.error('Subscription Init Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminOfferings = async () => {
    try {
      const res = await fetch(`${API_URL}/payment/offerings`);
      const data = await res.json();
      setAdminOfferings(data);
    } catch (e) {
      console.error('Admin Offerings Fetch Error:', e);
    }
  };

  const updateEntitlements = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      if (customerInfo.entitlements.active['premium'] !== undefined) {
        setEntitlements({ premium: true });
      } else {
        setEntitlements({ premium: false });
      }
    } catch (e) {
      console.error('Entitlement Update Error:', e);
    }
  };

  const syncIdentity = async (userId) => {
    try {
      const { customerInfo } = await Purchases.logIn(userId);
      updateEntitlements();
      return customerInfo;
    } catch (e) {
      console.error('Identity Sync Error:', e);
    }
  };

  const purchasePackage = async (rcPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(rcPackage);
      if (customerInfo.entitlements.active['premium'] !== undefined) {
        setEntitlements({ premium: true });
        return true;
      }
      return false;
    } catch (e) {
      if (!e.userCancelled) {
        Alert.alert('Error', e.message);
      }
      return false;
    }
  };

  return (
    <SubscriptionContext.Provider value={{
      entitlements,
      offerings,
      adminOfferings,
      loading,
      syncIdentity,
      purchasePackage,
      refresh: updateEntitlements
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
