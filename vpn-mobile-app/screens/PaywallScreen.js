import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import { theme } from '../styles/theme';
import { X, CheckCircle, Zap, Shield, Globe, Star, ArrowRight } from 'lucide-react-native';
import { useSubscription } from '../context/SubscriptionContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function PaywallScreen({ navigation }) {
  const { offerings, adminOfferings, purchasePackage, loading } = useSubscription();

  const handlePurchase = async (pkg) => {
    const success = await purchasePackage(pkg);
    if (success) {
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Map RevenueCat packages to our Admin descriptions
  const displayPlans = adminOfferings.map(adminPlan => {
    // Find the matching RC package based on ID
    const pkg = offerings?.availablePackages.find(p => p.identifier === adminPlan.revenueCatPackageId);
    return {
      ...adminPlan,
      rcPackage: pkg
    };
  }).filter(p => p.rcPackage); // Only show if linked to RevenueCat

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <X size={24} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
          <View style={styles.badge}>
            <Star size={12} color="#FFD700" fill="#FFD700" />
            <Text style={styles.badgeText}>UPGRADE TO PREMIUM</Text>
          </View>
          <Text style={styles.title}>Unlock the Full Power of Sentinel</Text>
          <Text style={styles.subtitle}>Get unlimted high-speed bandwidth and access to our global enterprise network.</Text>
        </View>

        {/* Feature List */}
        <View style={styles.features}>
           <FeatureItem icon={<Zap size={20} color={theme.colors.primary} />} title="Blazing Speeds" desc="Direct 10Gbps fiber connections." />
           <FeatureItem icon={<Shield size={20} color={theme.colors.primary} />} title="Zero-Log Policy" desc="Military-grade encryption protocols." />
           <FeatureItem icon={<Globe size={20} color={theme.colors.primary} />} title="Global Fleet" desc="Over 50+ premium locations." />
        </View>

        {/* Pricing Cards */}
        <View style={styles.plansContainer}>
          {displayPlans.map((plan, index) => (
            <TouchableOpacity 
              key={plan._id} 
              activeOpacity={0.9} 
              style={[styles.planCard, plan.isFeatured && styles.featuredCard]}
              onPress={() => handlePurchase(plan.rcPackage)}
            >
              {plan.isFeatured && (
                <View style={styles.popularBadge}>
                   <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDuration}>{plan.duration.toUpperCase()}</Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceTag}>${plan.price}</Text>
                </View>
              </View>
              
              <View style={styles.planFeatures}>
                {plan.features.slice(0, 3).map((feat, i) => (
                  <View key={i} style={styles.featRow}>
                    <CheckCircle size={14} color={theme.colors.primary} strokeWidth={2.5} />
                    <Text style={styles.featText}>{feat}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.buyButton, plan.isFeatured && styles.featuredBuyButton]}>
                 <Text style={[styles.buyButtonText, plan.isFeatured && styles.featuredBuyButtonText]}>SELECT PLAN</Text>
                 <ArrowRight size={16} color={plan.isFeatured ? "#fff" : theme.colors.primary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.restoreButton} onPress={() => {}}>
           <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Subscriptions will automatically renew unless canceled 24 hours prior to the end of the period.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const FeatureItem = ({ icon, title, desc }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIcon}>{icon}</View>
    <View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </View>
  </View>
);

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
  scrollContent: {
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  closeButton: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.display,
    color: theme.colors.onBackground,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  features: {
    marginBottom: 40,
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  featureDesc: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  featuredCard: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceContainerLowest,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popularText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  planName: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.onSurface,
  },
  planDuration: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 1,
    marginTop: 2,
  },
  priceTag: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  planFeatures: {
    gap: 12,
    marginBottom: 24,
  },
  featRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featText: {
    fontSize: 13,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  buyButton: {
    height: 54,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  featuredBuyButton: {
    backgroundColor: theme.colors.primary,
  },
  buyButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  featuredBuyButtonText: {
    color: '#fff',
  },
  restoreButton: {
    marginTop: 30,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footerNote: {
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
    paddingHorizontal: 40,
    marginBottom: 40,
  }
});
