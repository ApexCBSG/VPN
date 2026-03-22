import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { theme } from '../styles/theme';
import { MapPin, Navigation } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const NODES = [
  { id: '1', name: 'New York', lat: 40.7128, lng: -74.0060, country: 'US' },
  { id: '2', name: 'London', lat: 51.5074, lng: -0.1278, country: 'GB' },
  { id: '3', name: 'Frankfurt', lat: 50.1109, lng: 8.6821, country: 'DE' },
  { id: '4', name: 'Singapore', lat: 1.3521, lng: 103.8198, country: 'SG' },
];

const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#1d2c4d" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#8ec3b9" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#1a3646" }]
  },
  {
    "featureType": "administrative.country",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#4b6878" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#060e20" }] 
  }
];

export default function MapScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 20,
          longitude: 0,
          latitudeDelta: 100,
          longitudeDelta: 100,
        }}
        customMapStyle={mapStyle}
      >
        {NODES.map(node => (
          <Marker
            key={node.id}
            coordinate={{ latitude: node.lat, longitude: node.lng }}
            title={node.name}
          >
            <View style={styles.markerContainer}>
              <View style={styles.markerDot} />
              <View style={styles.markerHalo} />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.overlay}>
        <Text style={styles.title}>Global Nodes</Text>
        <Text style={styles.subtitle}>Select a region to establish a connection</Text>
      </View>

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => navigation.navigate('Servers')}
      >
        <Navigation size={24} color={theme.colors.background} />
        <Text style={styles.floatingButtonText}>LIST VIEW</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  map: {
    width: width,
    height: height,
  },
  overlay: {
    position: 'absolute',
    top: 60,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: 'rgba(6, 14, 32, 0.8)',
    padding: theme.spacing.md,
    borderRadius: theme.roundness.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  title: {
    color: theme.colors.onBackground,
    fontSize: 20,
    fontFamily: theme.fonts.display,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    fontFamily: theme.fonts.body,
    marginTop: 4,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    zIndex: 2,
  },
  markerHalo: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceTint,
    opacity: 0.3,
    zIndex: 1,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontFamily: theme.fonts.label,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 10,
  },
});
