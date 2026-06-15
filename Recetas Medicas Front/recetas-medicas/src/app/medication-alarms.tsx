import * as React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, StatusBar, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, Pill, Droplet, Heart, Syringe, Thermometer, FlaskConical, Check } from 'lucide-react-native';

export default function MedicationAlarmsScreen() {
  const router = useRouter();
  const { medId, medName, medDose, medFrequency, medIcon, medIconBg, medAlarms } = useLocalSearchParams();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Parse alarms list
  const [alarmsList, setAlarmsList] = useState<any[]>([]);

  useEffect(() => {
    if (medAlarms) {
      try {
        setAlarmsList(JSON.parse(medAlarms as string));
      } catch (e) {
        console.error("Error al parsear las alarmas:", e);
      }
    }
  }, [medAlarms]);

  const toggleAlarmActive = (alarmId: number) => {
    setAlarmsList(prev => prev.map(alarm => 
      alarm.id === alarmId ? { ...alarm, active: !alarm.active } : alarm
    ));
  };

  const handleBack = () => {
    router.replace({
      pathname: '/alarms' as any,
      params: {
        updatedAlarms: JSON.stringify(alarmsList),
        updatedMedId: medId
      }
    });
  };

  const renderAlarmIcon = (iconName: string, color = "#003d9b") => {
    switch (iconName) {
      case 'pill':
        return <Pill color={color} size={28} />;
      case 'droplet':
        return <Droplet color={color} size={28} />;
      case 'flask':
        return <FlaskConical color={color} size={28} />;
      case 'syringe':
        return <Syringe color={color} size={28} />;
      case 'thermometer':
        return <Thermometer color={color} size={28} />;
      case 'heart':
        return <Heart color={color} size={28} />;
      default:
        return <Pill color={color} size={28} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header bar matching the styling and safe top padding */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 20 : 44 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft color="#191c1e" size={24} />
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Horarios de Toma</Text>
        <View style={{ width: 80 }} /> {/* balance layout */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Medication Main Information Card */}
        <View style={styles.medicationCard}>
          <View style={[styles.iconWrapper, { backgroundColor: (medIconBg as string) || '#f0f4ff' }]}>
            {renderAlarmIcon(medIcon as string, "#007aff")}
          </View>
          <View style={styles.medicationDetails}>
            <Text style={styles.medicationName}>{medName || 'Medicamento'}</Text>
            <Text style={styles.medicationDose}>{medDose || 'Sin dosis'}</Text>
            <View style={styles.frequencyBadge}>
              <Clock size={12} color="#003d9b" style={{ marginRight: 4 }} />
              <Text style={styles.frequencyBadgeText}>{medFrequency || 'Cada 12 horas'}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recordatorios programados</Text>

        {alarmsList.length > 0 ? (
          alarmsList.map((alarm) => {
            const isPending = !alarm.status || alarm.status === 'pending';
            const isTaken = alarm.status === 'taken';
            const isSnoozed = alarm.status === 'snoozed';

            return (
              <View key={alarm.id} style={[styles.alarmItemCard, !alarm.active && styles.inactiveCard]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.alarmTimeInfo}>
                    <View style={[
                      styles.clockIconBg,
                      isTaken && { backgroundColor: '#e8f5e9' },
                      isSnoozed && { backgroundColor: '#fff3e0' }
                    ]}>
                      <Clock size={18} color={!alarm.active ? '#737685' : isTaken ? '#34c759' : isSnoozed ? '#ff9500' : '#003d9b'} />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={[styles.alarmTimeText, !alarm.active && styles.inactiveText]}>{alarm.time}</Text>
                      
                      {/* Status label / badge */}
                      {!alarm.active ? (
                        <Text style={styles.alarmStatusText}>Desactivada</Text>
                      ) : isTaken ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <View style={{ backgroundColor: '#34c759', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>TOMADO</Text>
                          </View>
                          <TouchableOpacity 
                            style={{ marginLeft: 8 }} 
                            onPress={() => {
                              setAlarmsList(prev => prev.map(a => a.id === alarm.id ? { ...a, status: 'pending' } : a));
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={{ fontSize: 12, color: '#007aff', fontWeight: '600' }}>Restablecer</Text>
                          </TouchableOpacity>
                        </View>
                      ) : isSnoozed ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <View style={{ backgroundColor: '#ff9500', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>POSPUESTO</Text>
                          </View>
                          <TouchableOpacity 
                            style={{ marginLeft: 8 }} 
                            onPress={() => {
                              setAlarmsList(prev => prev.map(a => a.id === alarm.id ? { ...a, status: 'pending' } : a));
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={{ fontSize: 12, color: '#007aff', fontWeight: '600' }}>Restablecer</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Text style={styles.alarmStatusText}>Pendiente para tomar</Text>
                      )}
                    </View>
                  </View>

                  {/* Action buttons (Only if active and pending) */}
                  {alarm.active && isPending && (
                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity
                        style={styles.snoozeBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          setAlarmsList(prev => prev.map(a => a.id === alarm.id ? { ...a, status: 'snoozed' } : a));
                        }}
                      >
                        <Clock size={13} color="#ff9500" style={{ marginRight: 4 }} />
                        <Text style={styles.snoozeBtnText}>Posponer</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.takeBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          setAlarmsList(prev => prev.map(a => a.id === alarm.id ? { ...a, status: 'taken' } : a));
                        }}
                      >
                        <Check size={13} color="#ffffff" style={{ marginRight: 4 }} />
                        <Text style={styles.takeBtnText}>Tomar medicina</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Main Switch to turn alarm on/off */}
                <View style={{ marginLeft: 12 }}>
                  <Switch
                    value={alarm.active}
                    onValueChange={() => toggleAlarmActive(alarm.id)}
                    trackColor={{ false: '#edeef0', true: '#003d9b' }}
                    thumbColor={alarm.active ? '#ffffff' : '#737685'}
                  />
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No hay recordatorios configurados para este medicamento.</Text>
          </View>
        )}

      </ScrollView>
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
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#edeef0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  backBtnText: {
    fontSize: 16,
    color: '#191c1e',
    fontWeight: '600',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#003d9b',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  medicationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#edeef0',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
  },
  medicationDetails: {
    flex: 1,
  },
  medicationName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#003d9b',
  },
  medicationDose: {
    fontSize: 14,
    color: '#737685',
    fontWeight: '500',
    marginTop: 2,
  },
  frequencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6efff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  frequencyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003d9b',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191c1e',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alarmItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edeef0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  alarmTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f2f2f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmTimeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#191c1e',
  },
  alarmStatusText: {
    fontSize: 12,
    color: '#737685',
    marginTop: 1,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  inactiveText: {
    textDecorationLine: 'line-through',
    color: '#737685',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#edeef0',
  },
  emptyText: {
    fontSize: 14,
    color: '#737685',
    textAlign: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
    paddingRight: 8,
  },
  snoozeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ffe0b2',
    borderRadius: 8,
    paddingVertical: 8,
  },
  snoozeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ff9500',
  },
  takeBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34c759',
    borderRadius: 8,
    paddingVertical: 8,
  },
  takeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
