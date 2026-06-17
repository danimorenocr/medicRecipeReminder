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

        {/* Emergency Banner */}
        <TouchableOpacity 
          style={styles.emergencyBanner} 
          onPress={() => router.push('/explore')}
        >
          <View style={styles.emergencyHeaderRow}>
            <View style={styles.emergencyIconBg}>
              <Text style={{ fontSize: 20 }}>🚨</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.emergencyTitle}>Urgencias y Hospitales 24h</Text>
              <Text style={styles.emergencyDesc}>Localiza el centro médico más cercano con mejores opiniones por GPS.</Text>
            </View>
            <Text style={styles.emergencyArrow}>➔</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Actions Grid */}
        {(() => {
          const totalAlarmsCount = alarmItems.length;
          const takenAlarmsCount = alarmItems.filter(item => {
            const med = medications.find(m => m.id === item.medId);
            return isAlarmTakenOnDate(med, item.alarm.time, targetDate);
          }).length;

          return (
            <>
              <View style={styles.gridContainer}>
                <TouchableOpacity style={styles.gridItemCardDark} onPress={() => router.push('/scan')}>
                  <Camera color="#64ffda" size={32} />
                  <Text style={styles.gridItemTitleDark}>Escanear Receta</Text>
                  <Text style={styles.gridItemDescDark}>Digitalizar con IA</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridItemCardLight} onPress={() => router.push('/chat')}>
                  <MessageSquare color="#0052cc" size={32} />
                  <Text style={styles.gridItemTitleLight}>Consultar Chat</Text>
                  <Text style={styles.gridItemDescLight}>Asistente médico</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.gridContainer, { marginTop: 12, marginBottom: 20 }]}>
                <TouchableOpacity style={styles.gridItemCardLight} onPress={() => router.push('/alarms')}>
                  <Bell color="#0088ff" size={32} />
                  <Text style={styles.gridItemTitleLight}>Mis Alarmas</Text>
                  <Text style={styles.gridItemDescLight}>Control de dosis</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridItemCardTeal} onPress={() => router.push('/profile')}>
                  <User color="#00a86b" size={32} />
                  <Text style={styles.gridItemTitleTeal}>Mi Perfil</Text>
                  <Text style={styles.gridItemDescTeal}>{displayName} (Paciente)</Text>
                </TouchableOpacity>
              </View>
            </>
          );
        })()}

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

          {/* List of Intakes in Timeline Format */}
          {alarmItems.length === 0 ? (
            <View style={styles.emptyAgenda}>
              <Text style={styles.emptyAgendaText}>
                No hay alarmas activas programadas para este día.
              </Text>
            </View>
          ) : (
            (() => {
              const getMonthAbbr = (date: Date) => {
                const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
                return months[date.getMonth()];
              };
              const monthText = getMonthAbbr(targetDate);
              const dayNum = targetDate.getDate();

              const pendingItems = alarmItems.filter(item => {
                const med = medications.find(m => m.id === item.medId);
                return !isAlarmTakenOnDate(med, item.alarm.time, targetDate);
              });

              const takenItems = alarmItems.filter(item => {
                const med = medications.find(m => m.id === item.medId);
                return isAlarmTakenOnDate(med, item.alarm.time, targetDate);
              });

              return (
                <View style={styles.timelineContainer}>
                  {/* PENDIENTES SECTION */}
                  {pendingItems.length > 0 && (
                    <View style={styles.timelineSection}>
                      <View style={styles.sectionHeaderRow}>
                        <View style={[styles.sectionDot, { backgroundColor: '#0052cc' }]} />
                        <Text style={styles.sectionTitleText}>Pendientes ({pendingItems.length})</Text>
                      </View>
                      
                      {pendingItems.map((item, idx) => {
                        const med = medications.find(m => m.id === item.medId);
                        const isLast = idx === pendingItems.length - 1;
                        
                        return (
                          <View key={`pending-${idx}`} style={styles.timelineRow}>
                            {/* Columna Izquierda: Solo Círculo */}
                            <View style={styles.timelineLeftColumn}>
                              <View style={[styles.timelineDayCircle, { backgroundColor: '#0052cc' }]} />
                              {!isLast && <View style={[styles.timelineVerticalLine, { backgroundColor: '#0052cc' }]} />}
                            </View>

                            {/* Columna Derecha: Tarjeta Vertical */}
                            <View style={[styles.timelineCard, { flexDirection: 'column', alignItems: 'stretch' }]}>
                              <Text style={styles.timelineCardMedName}>{item.medName}</Text>
                              <Text style={styles.timelineCardDetailsText}>
                                💊 {item.medDose}  •  ⏰ {item.alarm.time}
                              </Text>
                              
                              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                                <TouchableOpacity 
                                  style={styles.timelineCardButton}
                                  onPress={() => handleToggleAlarm(item.medId, item.alarm.id)}
                                >
                                  <Text style={styles.timelineCardButtonText}>Tomar</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* COMPLETADAS SECTION */}
                  {takenItems.length > 0 && (
                    <View style={[styles.timelineSection, { marginTop: 20 }]}>
                      <View style={styles.sectionHeaderRow}>
                        <View style={[styles.sectionDot, { backgroundColor: '#00a86b' }]} />
                        <Text style={styles.sectionTitleText}>Tomados ({takenItems.length})</Text>
                      </View>

                      {takenItems.map((item, idx) => {
                        const med = medications.find(m => m.id === item.medId);
                        const isLast = idx === takenItems.length - 1;

                        return (
                          <View key={`taken-${idx}`} style={styles.timelineRow}>
                            {/* Columna Izquierda: Solo Círculo */}
                            <View style={styles.timelineLeftColumn}>
                              <View style={[styles.timelineDayCircle, { backgroundColor: '#00a86b' }]} />
                              {!isLast && <View style={[styles.timelineVerticalLine, { backgroundColor: '#00a86b' }]} />}
                            </View>

                            {/* Columna Derecha: Tarjeta Vertical */}
                            <View style={[styles.timelineCard, styles.timelineCardTaken, { flexDirection: 'column', alignItems: 'stretch' }]}>
                              <Text style={[styles.timelineCardMedName, styles.textLineThrough]}>{item.medName}</Text>
                              <Text style={[styles.timelineCardDetailsText, styles.textLineThrough]}>
                                💊 {item.medDose}  •  ⏰ {item.alarm.time}
                              </Text>
                              
                              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 8 }}>
                                <Text style={styles.statusLabelTextTaken}>✓ Tomado</Text>
                                <TouchableOpacity 
                                  style={styles.timelineCardUndoLink}
                                  onPress={() => handleToggleAlarm(item.medId, item.alarm.id)}
                                >
                                  <Text style={styles.timelineCardUndoText}>DESHACER</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })()
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
  gridItemCardDark: {
    width: '48%',
    backgroundColor: '#161726',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 155,
    shadowColor: '#161726',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gridItemCardLight: {
    width: '48%',
    backgroundColor: '#f3f5f9',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 155,
  },
  gridItemCardTeal: {
    width: '48%',
    backgroundColor: '#e1f7ec',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 155,
    shadowColor: '#e1f7ec',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  gridItemTitleDark: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 10,
    textAlign: 'center',
  },
  gridItemDescDark: {
    fontSize: 11,
    color: '#a1a4c4',
    marginTop: 3,
    textAlign: 'center',
  },
  gridItemTitleLight: {
    fontSize: 14,
    fontWeight: '800',
    color: '#12131a',
    marginTop: 10,
    textAlign: 'center',
  },
  gridItemDescLight: {
    fontSize: 11,
    color: '#787b89',
    marginTop: 3,
    textAlign: 'center',
  },
  gridItemTitleTeal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#004d30',
    marginTop: 10,
    textAlign: 'center',
  },
  gridItemDescTeal: {
    fontSize: 11,
    color: '#007d4f',
    marginTop: 3,
    textAlign: 'center',
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
  timelineContainer: {
    marginTop: 12,
  },
  timelineSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  sectionTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#191c1e',
    letterSpacing: 0.3,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeftColumn: {
    width: 32,
    alignItems: 'center',
    position: 'relative',
    paddingTop: 14,
  },
  timelineDayCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  timelineVerticalLine: {
    position: 'absolute',
    top: 28,
    bottom: -20,
    width: 2,
    borderRadius: 1,
    opacity: 0.3,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#edeef0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineCardTaken: {
    backgroundColor: '#f8f9fb',
    borderColor: '#edeef0',
    opacity: 0.75,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineCardTime: {
    fontSize: 15,
    fontWeight: '800',
    color: '#191c1e',
  },
  timelineCardMedName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#191c1e',
  },
  timelineBadgePurple: {
    backgroundColor: '#f0efff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timelineBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7f56da',
    letterSpacing: 0.3,
  },
  timelineCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f2f4',
    paddingTop: 12,
  },
  timelineCardDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 14,
  },
  timelineCardDetailsText: {
    fontSize: 13,
    color: '#535661',
    fontWeight: '500',
  },
  timelineCardLeft: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  statusLabelTextTaken: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00a86b',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#737685',
  },
  timelineCardButton: {
    backgroundColor: '#0052cc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0052cc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineCardButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  timelineCardUndoLink: {
    paddingVertical: 4,
  },
  timelineCardUndoText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#737685',
    letterSpacing: 0.5,
  },
  textLineThrough: {
    textDecorationLine: 'line-through',
    color: '#737685',
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
  emergencyBanner: {
    backgroundColor: '#ffebe9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffd0cb',
    padding: 14,
    marginBottom: 20,
  },
  emergencyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffdbd8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ba1a1a',
  },
  emergencyDesc: {
    fontSize: 12,
    color: '#410002',
    marginTop: 2,
    lineHeight: 16,
  },
  emergencyArrow: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ba1a1a',
    marginLeft: 8,
  },
});
