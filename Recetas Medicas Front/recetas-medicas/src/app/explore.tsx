import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { ArrowLeft, MapPin, Star, Navigation, Phone, RefreshCw, AlertTriangle, Activity } from 'lucide-react-native';
import { API_URL } from '../constants/api';

interface Hospital {
  place_id: string;
  name: string;
  rating: number;
  user_ratings_total: number;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  distance: number;
  open_now: boolean;
  tags: string[];
}

export default function ExploreScreen() {
  const router = useRouter();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [statusText, setStatusText] = useState('Obteniendo ubicación GPS...');

  const fetchHospitals = async (latitude: number, longitude: number) => {
    try {
      setStatusText('Buscando centros de urgencias cercanos...');
      const response = await fetch(`${API_URL}/api/hospitals/nearby?lat=${latitude}&lng=${longitude}`);
      if (!response.ok) {
        throw new Error('Error al conectar con la API de hospitales');
      }
      const data = await response.json();
      setHospitals(data.hospitals || []);
      setIsMock(data.is_mock || false);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      setErrorMsg('No se pudo conectar con el servidor para obtener los hospitales.');
    } finally {
      setLoading(false);
    }
  };

  const getPositionAndFetch = async () => {
    setLoading(true);
    setErrorMsg(null);
    setStatusText('Obteniendo ubicación GPS...');
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permiso de ubicación denegado. Habilita el acceso en los ajustes de tu dispositivo para buscar hospitales cercanos.');
        setLoading(false);
        return;
      }

      const currentLoc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLoc);
      await fetchHospitals(currentLoc.coords.latitude, currentLoc.coords.longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      setErrorMsg('Error al obtener la ubicación actual del GPS. Asegúrate de tener el GPS encendido.');
      setLoading(false);
    }
  };

  useEffect(() => {
    getPositionAndFetch();
  }, []);

  const handleOpenNavigation = async (hospital: Hospital) => {
    if (!location) return;
    const destLat = hospital.geometry.location.lat;
    const destLng = hospital.geometry.location.lng;
    const originLat = location.coords.latitude;
    const originLng = location.coords.longitude;
    
    const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
    const nativeUrl = Platform.select({
      ios: `maps://app?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}`,
      android: `google.navigation:q=${destLat},${destLng}`,
      default: webUrl,
    });

    try {
      // Intentar verificar y abrir la app nativa de mapas.
      // Si canOpenURL falla o devuelve falso, o si openURL lanza un error (común en emuladores sin Apple Maps),
      // capturamos el error y abrimos la URL web de Google Maps que siempre es compatible.
      const supported = await Linking.canOpenURL(nativeUrl);
      if (supported) {
        await Linking.openURL(nativeUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (err) {
      console.warn("No se pudo abrir navegación nativa. Abriendo Google Maps Web:", err);
      try {
        await Linking.openURL(webUrl);
      } catch (webErr) {
        console.error("Error al abrir navegación web:", webErr);
      }
    }
  };

  const handleCallHospital = () => {
    // Línea general de emergencias en Colombia es 123
    Linking.openURL('tel:123');
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backBtn}>
          <ArrowLeft color="#191c1e" size={22} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Activity color="#ba1a1a" size={20} style={{ marginRight: 6 }} />
          <Text style={styles.headerTitle}>Urgencias Cercanas</Text>
        </View>
        <TouchableOpacity onPress={getPositionAndFetch} disabled={loading} style={styles.reloadBtn}>
          <RefreshCw color={loading ? '#737685' : '#191c1e'} size={18} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#ba1a1a" />
          <Text style={styles.loaderText}>{statusText}</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.errorContainer}>
          <AlertTriangle color="#ba1a1a" size={48} style={{ marginBottom: 16 }} />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={getPositionAndFetch}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Mock Warning Banner */}
          {isMock && (
            <View style={styles.mockBanner}>
              <AlertTriangle color="#b25e00" size={18} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.mockBannerTitle}>Modo de Simulación Activo</Text>
                <Text style={styles.mockBannerDesc}>
                  Mostrando centros médicos de prueba en Colombia. Configura tu GOOGLE_PLACES_API_KEY en Back/.env para consultar en tiempo real con Google Places.
                </Text>
              </View>
            </View>
          )}

          {hospitals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MapPin color="#737685" size={48} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No se encontraron centros de urgencias en un radio de 5 km.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={getPositionAndFetch}>
                <Text style={styles.retryBtnText}>Buscar de nuevo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Highlight Recommended Hospital */}
              {hospitals.find(h => h.tags.includes('recommended')) && (
                <View style={styles.recommendedSection}>
                  <Text style={styles.sectionTitle}>Opción Recomendada</Text>
                  {(() => {
                    const rec = hospitals.find(h => h.tags.includes('recommended'))!;
                    return (
                      <View style={styles.recommendedCard}>
                        <View style={styles.tagRow}>
                          <View style={[styles.badge, { backgroundColor: '#ba1a1a' }]}>
                            <Text style={styles.badgeText}>🚨 RECOMENDADO</Text>
                          </View>
                          {rec.tags.includes('closest') && (
                            <View style={[styles.badge, { backgroundColor: '#0052cc' }]}>
                              <Text style={styles.badgeText}>📍 EL MÁS CERCANO</Text>
                            </View>
                          )}
                        </View>

                        <Text style={styles.recHospitalName}>{rec.name}</Text>
                        <Text style={styles.recHospitalAddress}>{rec.vicinity}</Text>

                        <View style={styles.statsRow}>
                          <View style={styles.statItem}>
                            <MapPin color="#ba1a1a" size={16} />
                            <Text style={styles.statValue}>{formatDistance(rec.distance)}</Text>
                          </View>
                          {rec.rating > 0 && (
                            <View style={styles.statItem}>
                              <Star color="#b25e00" size={16} fill="#b25e00" />
                              <Text style={styles.statValue}>
                                {rec.rating.toFixed(1)} ({rec.user_ratings_total})
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.actionButtonsRow}>
                          <TouchableOpacity 
                            style={[styles.actionBtn, styles.actionBtnPrimary]} 
                            onPress={() => handleOpenNavigation(rec)}
                          >
                            <Navigation color="#ffffff" size={16} style={{ marginRight: 6 }} />
                            <Text style={styles.actionBtnTextPrimary}>Cómo llegar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={[styles.actionBtn, styles.actionBtnSecondary]} 
                            onPress={handleCallHospital}
                          >
                            <Phone color="#ba1a1a" size={16} style={{ marginRight: 6 }} />
                            <Text style={styles.actionBtnTextSecondary}>Llamar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })()}
                </View>
              )}

              {/* Other Nearby Hospitals */}
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Centros Médicos Cercanos</Text>
              {hospitals.map((hospital) => {
                const isRecommended = hospital.tags.includes('recommended');
                const isClosest = hospital.tags.includes('closest');
                const isBestRated = hospital.tags.includes('best_rated');

                return (
                  <View key={hospital.place_id} style={styles.hospitalCard}>
                    <View style={styles.hospitalHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.hospitalName}>{hospital.name}</Text>
                        <Text style={styles.hospitalAddress}>{hospital.vicinity}</Text>
                      </View>
                      <View style={styles.cardBadges}>
                        {isClosest && !isRecommended && (
                          <View style={[styles.miniBadge, { backgroundColor: '#e0ecff' }]}>
                            <Text style={[styles.miniBadgeText, { color: '#0052cc' }]}>Más cercano</Text>
                          </View>
                        )}
                        {isBestRated && !isRecommended && (
                          <View style={[styles.miniBadge, { backgroundColor: '#fff2e0' }]}>
                            <Text style={[styles.miniBadgeText, { color: '#b25e00' }]}>Mejor calificado</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.hospitalDetailsRow}>
                      <View style={styles.detailItem}>
                        <MapPin color="#737685" size={14} />
                        <Text style={styles.detailText}>{formatDistance(hospital.distance)}</Text>
                      </View>
                      {hospital.rating > 0 && (
                        <View style={styles.detailItem}>
                          <Star color="#b25e00" size={14} fill="#b25e00" />
                          <Text style={styles.detailText}>
                            {hospital.rating.toFixed(1)} ({hospital.user_ratings_total})
                          </Text>
                        </View>
                      )}
                      <View style={styles.detailItem}>
                        <View style={[styles.statusDot, { backgroundColor: '#36B37E' }]} />
                        <Text style={styles.detailText}>Urgencias 24h</Text>
                      </View>
                    </View>

                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity 
                        style={styles.cardActionBtn} 
                        onPress={() => handleOpenNavigation(hospital)}
                      >
                        <Navigation color="#0052cc" size={14} style={{ marginRight: 4 }} />
                        <Text style={styles.cardActionBtnText}>Cómo llegar</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.cardActionBtn} 
                        onPress={handleCallHospital}
                      >
                        <Phone color="#737685" size={14} style={{ marginRight: 4 }} />
                        <Text style={[styles.cardActionBtnText, { color: '#737685' }]}>Llamar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#edeef0',
  },
  backBtn: {
    padding: 6,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ba1a1a',
  },
  reloadBtn: {
    padding: 6,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#737685',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 14,
    color: '#737685',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: '#ba1a1a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#737685',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  },
  mockBanner: {
    flexDirection: 'row',
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#ffe082',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  mockBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b25e00',
    marginBottom: 2,
  },
  mockBannerDesc: {
    fontSize: 11,
    color: '#7f5000',
    lineHeight: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#191c1e',
    marginBottom: 12,
    paddingLeft: 4,
  },
  recommendedSection: {
    marginBottom: 12,
  },
  recommendedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ba1a1a',
    padding: 18,
    shadowColor: '#ba1a1a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  recHospitalName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#191c1e',
    marginBottom: 6,
  },
  recHospitalAddress: {
    fontSize: 13,
    color: '#737685',
    marginBottom: 14,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 18,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#191c1e',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: '#ba1a1a',
  },
  actionBtnSecondary: {
    backgroundColor: '#ba1a1a10',
    borderWidth: 1,
    borderColor: '#ba1a1a30',
  },
  actionBtnTextPrimary: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnTextSecondary: {
    color: '#ba1a1a',
    fontSize: 13,
    fontWeight: '700',
  },
  hospitalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#edeef0',
    padding: 14,
    marginBottom: 12,
  },
  hospitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#191c1e',
    marginBottom: 4,
  },
  hospitalAddress: {
    fontSize: 12,
    color: '#737685',
    lineHeight: 16,
  },
  cardBadges: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'flex-end',
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  hospitalDetailsRow: {
    flexDirection: 'row',
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#edeef0',
    paddingBottom: 10,
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: '#737685',
    fontWeight: '500',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cardActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0052cc',
  },
});
