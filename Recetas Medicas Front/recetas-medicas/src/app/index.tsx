import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Briefcase, Camera, Wifi, Bell, MessageSquare, User, Calendar } from 'lucide-react-native';
import { API_URL } from '../constants/api';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SummaryScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('Ricardo');
  const [medications, setMedications] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<'today' | 'tomorrow' | 'after' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getFormattedCustomDate = () => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${customDate.getDate()} ${months[customDate.getMonth()]}`;
  };

  const getSelectedDate = (): Date => {
    const today = new Date();
    if (selectedDay === 'today') {
      return today;
    } else if (selectedDay === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow;
    } else if (selectedDay === 'after') {
      const after = new Date();
      after.setDate(today.getDate() + 2);
      return after;
    } else {
      return customDate;
    }
  };

  const getMidnight = (date: Date): Date => {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const getMedicationStartDate = (med: any): Date => {
    let dateStr = med.receta_created_at || med.fecha_receta || med.created_at;
    if (dateStr) {
      const cleanDate = dateStr.split(' ')[0];
      const parsed = new Date(cleanDate);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date(); // fallback to today
  };

  const getMedicationStartDateTime = (med: any): Date => {
    let dateStr = med.created_at || med.receta_created_at || med.fecha_receta;
    if (dateStr) {
      const formatted = dateStr.replace(' ', 'T');
      const parsed = new Date(formatted);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  };

  const getAlarmDateTimeForDate = (alarmTime: string, date: Date): Date => {
    const [timeStr, ampm] = alarmTime.split(' ');
    let [hoursStr, minutesStr] = timeStr.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    const d = new Date(date.getTime());
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const getDurationDays = (durationStr: string): number => {
    if (!durationStr) return 365 * 10;
    const clean = durationStr.toLowerCase();
    if (clean.includes('permanente') || clean.includes('indefinid') || clean.includes('continuo')) {
      return 365 * 10;
    }
    const match = clean.match(/(\d+)/);
    if (!match) return 365 * 10;
    const val = parseInt(match[0], 10);
    if (clean.includes('mes')) {
      return val * 30;
    }
    if (clean.includes('año') || clean.includes('ano')) {
      return val * 365;
    }
    if (clean.includes('semana')) {
      return val * 7;
    }
    return val;
  };

  const isAlarmTakenOnDate = (med: any, alarmTime: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return (med.history || []).some((h: any) => 
      (h.date === dateStr || (h.date === "Hoy" && isToday(date))) && 
      h.time === alarmTime && 
      h.status === "taken"
    );
  };

  const fetchMedications = async () => {
    try {
      const response = await fetch(`${API_URL}/api/medications`);
      if (response.ok) {
        const data = await response.json();
        setMedications(data);
      }
    } catch (e) {
      console.error("Error fetching medications in index:", e);
    }
  };

  const handleToggleAlarm = async (medId: number, alarmId: number) => {
    const targetDate = getSelectedDate();
    const targetDateStr = targetDate.toISOString().split('T')[0];
    const isTargetToday = isToday(targetDate);
    
    const med = medications.find(m => m.id === medId);
    if (!med) return;
    
    const alarm = med.alarms.find((a: any) => a.id === alarmId);
    if (!alarm) return;
    
    const currentlyTaken = isAlarmTakenOnDate(med, alarm.time, targetDate);
    const newStatus = currentlyTaken ? 'pending' : 'taken';
    
    // Update local alarm status ONLY if target date is today
    let updatedAlarms = med.alarms;
    if (isTargetToday) {
      updatedAlarms = med.alarms.map((a: any) => a.id === alarmId ? { ...a, status: newStatus } : a);
    }
    
    let updatedHistory = [...(med.history || [])];
    if (newStatus === 'taken') {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
      const historyItem = {
        id: Date.now(),
        date: targetDateStr,
        time: alarm.time,
        status: "taken",
        takenAt: timeStr
      };
      updatedHistory = [historyItem, ...updatedHistory];
    } else {
      updatedHistory = updatedHistory.filter((h: any) => 
        !( (h.date === targetDateStr || (h.date === "Hoy" && isTargetToday)) && h.time === alarm.time )
      );
    }
    
    const updatedMed = {
      ...med,
      alarms: updatedAlarms,
      history: updatedHistory
    };
    
    setMedications(prev => prev.map(m => m.id === medId ? updatedMed : m));
    
    try {
      await fetch(`${API_URL}/api/medications/${medId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedMed),
      });
    } catch (e) {
      console.error("Error al actualizar estado de la toma:", e);
    }
  };

  const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(' ');
    if (parts.length < 2) return 0;
    const time = parts[0];
    const ampm = parts[1];
    let [hours, minutes] = time.split(':').map(Number);
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const getFilteredMedicationsForSelectedDay = () => {
    const targetMidnight = getMidnight(getSelectedDate());
    return medications.filter(m => {
      if (!m.active) return false;
      
      const startDate = getMidnight(getMedicationStartDate(m));
      const durationDays = getDurationDays(m.duration);
      
      const endDate = new Date(startDate.getTime());
      endDate.setDate(startDate.getDate() + durationDays - 1);
      
      return targetMidnight >= startDate && targetMidnight <= endDate;
    });
  };

  const activeMeds = getFilteredMedicationsForSelectedDay();
  const targetDate = getSelectedDate();
  const alarmItems = activeMeds.flatMap(med => {
    const startDateTime = getMedicationStartDateTime(med);
    const startWithGrace = new Date(startDateTime.getTime() - 30 * 60 * 1000);
    return (med.alarms || [])
      .filter((alarm: any) => {
        const alarmDateTime = getAlarmDateTimeForDate(alarm.time, targetDate);
        return alarmDateTime >= startWithGrace;
      })
      .map((alarm: any) => ({
        medId: med.id,
        medName: med.name,
        medDose: med.dose,
        icon: med.icon,
        iconBg: med.iconBg,
        alarm
      }));
  }).sort((a, b) => parseTime(a.alarm.time) - parseTime(b.alarm.time));

  const fetchProfileName = async () => {
    try {
      const response = await fetch(`${API_URL}/api/profile`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.username) {
          const firstName = data.username.split(' ')[0];
          setDisplayName(firstName);
        }
      }
    } catch (e) {
      console.error("Error al cargar nombre del perfil en index:", e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchProfileName();
      fetchMedications();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fb" />
      
      {/* Header matching screenshot */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.briefcaseWrapper}>
            <Briefcase color="#0052CC" size={20} fill="#0052CC" />
          </View>
          <Text style={styles.headerTitle}>MediaAssist AI</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.push('/scan')} style={{ padding: 4 }}>
            <Camera color="#003d9b" size={22} />
          </TouchableOpacity>
          <Wifi color="#191c1e" size={20} />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome & Info */}
        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.welcomeTitle}>¡Hola, {displayName}!</Text>
            <Text style={styles.welcomeSubtitle}>Tu salud está monitoreada y estable</Text>
          </View>
          <View style={styles.avatarCircle}>
            <User color="#003d9b" size={20} />
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.gridContainer}>
          <TouchableOpacity style={styles.gridItemCard} onPress={() => router.push('/scan')}>
            <View style={[styles.gridIconBg, { backgroundColor: '#c4d2ff30' }]}>
              <Camera color="#003d9b" size={24} />
            </View>
            <Text style={styles.gridItemTitle}>Escanear Receta</Text>
            <Text style={styles.gridItemDesc}>Digitalizar con IA</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItemCard} onPress={() => router.push('/chat')}>
            <View style={[styles.gridIconBg, { backgroundColor: '#82f9be30' }]}>
              <MessageSquare color="#00734c" size={24} />
            </View>
            <Text style={styles.gridItemTitle}>Consultar Chat</Text>
            <Text style={styles.gridItemDesc}>Asistente virtual</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.gridContainer, { marginTop: 12, marginBottom: 20 }]}>
          <TouchableOpacity style={styles.gridItemCard} onPress={() => router.push('/alarms')}>
            <View style={[styles.gridIconBg, { backgroundColor: '#fff2e0' }]}>
              <Bell color="#b25e00" size={24} />
            </View>
            <Text style={styles.gridItemTitle}>Mis Alarmas</Text>
            <Text style={styles.gridItemDesc}>Control de dosis</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItemCard} onPress={() => router.push('/profile')}>
            <View style={[styles.gridIconBg, { backgroundColor: '#fcdbe4' }]}>
              <User color="#ba1a1a" size={24} />
            </View>
            <Text style={styles.gridItemTitle}>Mi Perfil</Text>
            <Text style={styles.gridItemDesc}>Historial médico</Text>
          </TouchableOpacity>
        </View>

        {/* Agenda de Medicamentos */}
        <View style={styles.agendaSection}>
          <Text style={styles.agendaTitle}>Plan de Medicación</Text>
          
          {/* Day Selector Tabs */}
          <View style={styles.daySelectorRow}>
            {(
              [
                { id: 'today', label: 'Hoy' },
                { id: 'tomorrow', label: 'Mañana' },
                { id: 'after', label: getDayAfterTomorrowName() },
                { id: 'custom', label: selectedDay === 'custom' ? getFormattedCustomDate() : 'Elegir' }
              ] as Array<{ id: 'today' | 'tomorrow' | 'after' | 'custom'; label: string }>
            ).map(day => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayTab,
                  selectedDay === day.id && styles.dayTabActive
                ]}
                onPress={() => {
                  if (day.id === 'custom') {
                    setShowDatePicker(true);
                  } else {
                    setSelectedDay(day.id);
                  }
                }}
              >
                {day.id === 'custom' && selectedDay !== 'custom' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} color="#737685" />
                    <Text style={styles.dayTabText}>{day.label}</Text>
                  </View>
                ) : (
                  <Text style={[
                    styles.dayTabText,
                    selectedDay === day.id && styles.dayTabTextActive
                  ]}>
                    {day.label}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {showDatePicker && (
            Platform.OS === 'ios' ? (
              <Modal
                transparent={true}
                animationType="slide"
                visible={showDatePicker}
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.pickerModalContainer}>
                    <View style={styles.pickerModalHeader}>
                      <Text style={styles.pickerModalTitle}>Seleccionar Fecha</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.pickerDoneText}>Hecho</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={customDate}
                      mode="date"
                      display="spinner"
                      themeVariant="light"
                      onChange={(event, date) => {
                        if (date) {
                          setCustomDate(date);
                          const today = new Date();
                          if (
                            date.getDate() === today.getDate() &&
                            date.getMonth() === today.getMonth() &&
                            date.getFullYear() === today.getFullYear()
                          ) {
                            setSelectedDay('today');
                          } else {
                            setSelectedDay('custom');
                          }
                        }
                      }}
                    />
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={customDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    setCustomDate(date);
                    const today = new Date();
                    if (
                      date.getDate() === today.getDate() &&
                      date.getMonth() === today.getMonth() &&
                      date.getFullYear() === today.getFullYear()
                    ) {
                      setSelectedDay('today');
                    } else {
                      setSelectedDay('custom');
                    }
                  }
                }}
              />
            )
          )}

          {/* List of Intakes */}
          {alarmItems.length === 0 ? (
            <View style={styles.emptyAgenda}>
              <Text style={styles.emptyAgendaText}>
                No hay alarmas activas programadas para este día.
              </Text>
            </View>
          ) : (
            alarmItems.map((item, idx) => {
              const targetDate = getSelectedDate();
              const med = medications.find(m => m.id === item.medId);
              const isTaken = isAlarmTakenOnDate(med, item.alarm.time, targetDate);
              return (
                <View key={idx} style={[styles.intakeCard, isTaken && styles.intakeCardTaken]}>
                  <View style={styles.intakeLeft}>
                    <View style={[styles.intakeIconBg, { backgroundColor: item.iconBg }]}>
                      <Text style={{ fontSize: 16 }}>💊</Text>
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={[styles.intakeMedName, isTaken && styles.textLineThrough]}>
                        {item.medName}
                      </Text>
                      <Text style={styles.intakeDose}>{item.medDose}</Text>
                    </View>
                  </View>

                  <View style={styles.intakeRight}>
                    <View style={[styles.timeBadge, isTaken && styles.timeBadgeTaken]}>
                      <Text style={[styles.timeBadgeText, isTaken && styles.timeBadgeTextTaken]}>
                        {item.alarm.time}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.checkCircle, isTaken && styles.checkCircleActive]}
                      onPress={() => handleToggleAlarm(item.medId, item.alarm.id)}
                    >
                      {isTaken && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper para obtener el nombre de pasado mañana
function getDayAfterTomorrowName() {
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return days[d.getMonth() === 11 && d.getDate() === 31 ? 0 : d.getDay()];
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#edeef0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  briefcaseWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0052cc10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#003d9b',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 4,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#191c1e',
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#737685',
    marginTop: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0052cc10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItemCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edeef0',
    padding: 16,
    alignItems: 'flex-start',
  },
  gridIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191c1e',
    marginBottom: 4,
  },
  gridItemDesc: {
    fontSize: 12,
    color: '#737685',
  },
  // Agenda Section styles
  agendaSection: {
    marginTop: 24,
  },
  agendaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#191c1e',
    marginBottom: 16,
  },
  daySelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#edeef0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  dayTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  dayTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dayTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#737685',
  },
  dayTabTextActive: {
    color: '#003d9b',
    fontWeight: '700',
  },
  emptyAgenda: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edeef0',
    padding: 24,
    alignItems: 'center',
  },
  emptyAgendaText: {
    color: '#737685',
    fontSize: 13,
    textAlign: 'center',
  },
  intakeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edeef0',
    padding: 14,
    marginBottom: 10,
  },
  intakeCardTaken: {
    backgroundColor: '#f8f9fb',
    borderColor: '#edeef0',
    opacity: 0.8,
  },
  intakeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  intakeIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intakeMedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191c1e',
  },
  textLineThrough: {
    textDecorationLine: 'line-through',
    color: '#737685',
  },
  intakeDose: {
    fontSize: 12,
    color: '#737685',
    marginTop: 2,
  },
  intakeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeBadge: {
    backgroundColor: '#c4d2ff30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeBadgeTaken: {
    backgroundColor: '#82f9be30',
  },
  timeBadgeText: {
    fontSize: 11,
    color: '#003d9b',
    fontWeight: '700',
  },
  timeBadgeTextTaken: {
    color: '#00734c',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#003d9b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleActive: {
    backgroundColor: '#00734c',
    borderColor: '#00734c',
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  pickerModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edeef0',
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191c1e',
  },
  pickerDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0052cc',
  },

});
