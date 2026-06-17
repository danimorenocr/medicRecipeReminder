import * as React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, StatusBar, Modal, TextInput, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bell, Wifi, ArrowRight, Plus, X, Check, Calendar, Clock, Minus, Pill, Droplet, Activity, Coffee, Heart, Syringe, Thermometer, FlaskConical, Trash2 } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AlarmTriggerOverlay from '../components/alarm-trigger-overlay';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../constants/api';
import { Alert, ActivityIndicator } from 'react-native';

// Dynamically require Notifee to prevent crashing in Expo Go
let notifee: any = null;
let AndroidImportance: any = null;
try {
  const notifeeModule = require('@notifee/react-native');
  notifee = notifeeModule.default;
  AndroidImportance = notifeeModule.AndroidImportance;
} catch (e) {
  // Gracefully fallback to expo-notifications
}

// Set up expo-notifications handler to show notifications even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldVibrate: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function AlarmsScreen() {
  const router = useRouter();
  const { meds, updatedAlarms, updatedMedId, updatedHistory, editMedId, deletedMedId } = useLocalSearchParams();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Dynamic responsive styles
  const cellWidth = Math.floor((screenWidth - 32 - 16) / 7);
  const dynamicCellStyles = {
    width: cellWidth,
    height: cellWidth,
    borderRadius: cellWidth / 2,
  };
  const dynamicHeaderCellStyles = {
    width: cellWidth,
    textAlign: 'center' as const,
  };
  const dynamicCellEmptyStyles = {
    width: cellWidth,
    height: cellWidth,
  };
  const dynamicTitleStyle = {
    fontSize: screenWidth < 360 ? 24 : 32,
    marginBottom: screenHeight < 680 ? 12 : 24,
  };
  const dynamicCalendarWrapperStyle = {
    marginTop: screenHeight < 680 ? 12 : 24,
    marginBottom: screenHeight < 680 ? 8 : 16,
  };
  const dynamicSectionLabelStyle = {
    marginTop: screenHeight < 680 ? 12 : 20,
  };
  const [medications, setMedications] = useState<any[]>([]);

  const fetchMedications = async () => {
    try {
      console.log("[fetchMedications] Fetching from:", `${API_URL}/api/medications`);
      const response = await fetch(`${API_URL}/api/medications`);
      if (response.ok) {
        const data = await response.json();
        setMedications(data);
      } else {
        console.error("Error al cargar medicamentos de la BD, status:", response.status);
      }
    } catch (e) {
      console.error("Error al hacer fetch de medicamentos:", e);
    }
  };

  const updateMedicationInDB = async (updatedMed: any) => {
    try {
      console.log("[updateMedicationInDB] PUT request to:", `${API_URL}/api/medications/${updatedMed.id}`);
      const response = await fetch(`${API_URL}/api/medications/${updatedMed.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedMed),
      });
      if (!response.ok) {
        console.error("Error al actualizar medicamento en la BD, status:", response.status);
      }
    } catch (e) {
      console.error("Error en updateMedicationInDB:", e);
    }
  };

  const medicationsRef = React.useRef(medications);
  useEffect(() => {
    medicationsRef.current = medications;
  }, [medications]);

  useEffect(() => {
    fetchMedications();
  }, []);

  useEffect(() => {
    if (updatedAlarms && updatedMedId) {
      try {
        const alarmsList = JSON.parse(updatedAlarms as string);
        const medId = parseInt(updatedMedId as string, 10);
        const historyList = updatedHistory ? JSON.parse(updatedHistory as string) : null;
        
        const updateAlarmsAndSave = async () => {
          const med = medicationsRef.current.find(m => m.id === medId);
          if (med) {
            const anyActive = alarmsList.some((a: any) => a.active);
            const updatedMed = { 
              ...med, 
              active: anyActive, 
              alarms: alarmsList,
              ...(historyList ? { history: historyList } : {})
            };
            setMedications(prev => prev.map(m => m.id === medId ? updatedMed : m));
            await updateMedicationInDB(updatedMed);
          }
        };
        updateAlarmsAndSave();
        router.setParams({ updatedAlarms: undefined, updatedMedId: undefined, updatedHistory: undefined });
      } catch (e) {
        console.error("Error al actualizar alarmas desde la vista de detalle:", e);
      }
    }
  }, [updatedAlarms, updatedMedId, updatedHistory]);

  useEffect(() => {
    if (deletedMedId) {
      const medId = parseInt(deletedMedId as string, 10);
      const deleteFromDB = async () => {
        try {
          const response = await fetch(`${API_URL}/api/medications/${medId}`, {
            method: 'DELETE'
          });
          if (response.ok) {
            setMedications(prev => prev.filter(m => m.id !== medId));
            router.setParams({ deletedMedId: undefined });
          } else {
            console.error("Error al eliminar de la BD");
          }
        } catch (e) {
          console.error("Error en deleteFromDB:", e);
        }
      };
      deleteFromDB();
    }
  }, [deletedMedId]);

  useEffect(() => {
    if (editMedId) {
      const medId = parseInt(editMedId as string, 10);
      const medToEdit = medications.find(m => m.id === medId);
      if (medToEdit) {
        setEditingMedId(medId);
        setFormMedName(medToEdit.name);
        setFormDose(medToEdit.dose);
        setFormFrequency(medToEdit.frequency);
        
        const parsedDur = parseImportedDuration(medToEdit.duration);
        setDurationValue(parsedDur.val);
        setDurationUnit(parsedDur.unit);
        
        setFormIcon(medToEdit.icon);
        setFormIconBg(medToEdit.iconBg);
        
        const times = medToEdit.alarms.map((a: any) => a.time);
        setScheduledTimes(times);
        
        if (times.length > 0) {
          const [timeStr, ampm] = times[0].split(' ');
          const [h, m] = timeStr.split(':');
          setTimeHour(h);
          setTimeMinute(m);
          setTimeAmPm(ampm);
        }
        
        setModalVisible(true);
        setCurrentStep(1);
      }
      router.setParams({ editMedId: undefined });
    }
  }, [editMedId]);

  // Active Simulated/Real alarm state
  const [activeAlarm, setActiveAlarm] = useState<{
    medication: any;
    alarm: any;
  } | null>(null);

  const triggerNotification = async (medication: any, alarm: any) => {
    try {
      if (Platform.OS !== 'web') {
        // 1. Try Notifee if available (Standalone build)
        if (notifee && AndroidImportance) {
          try {
            await notifee.requestPermission();
            const channelId = await notifee.createChannel({
              id: 'alarmas-medicinas',
              name: 'Recordatorios de Medicinas',
              importance: AndroidImportance.HIGH,
              vibration: true,
            });
            await notifee.displayNotification({
              title: `💊 ¡Hora de tomar ${medication.name}!`,
              body: `Dosis: ${medication.dose} - ${medication.frequency}`,
              android: {
                channelId,
                sound: 'default',
                importance: AndroidImportance.HIGH,
                fullScreenAction: {
                  id: 'default',
                },
                pressAction: {
                  id: 'default',
                },
              },
              ios: {
                sound: 'default',
              },
            });
            return;
          } catch (notifeeError) {
            console.warn("Notifee failed, using expo-notifications fallback:", notifeeError);
          }
        }

        // 2. Fallback to expo-notifications (Expo Go compatible!)
        await Notifications.requestPermissionsAsync();
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `💊 ¡Hora de tomar ${medication.name}!`,
            body: `Dosis: ${medication.dose} - ${medication.frequency}`,
            sound: false, // Silent notification to avoid double beep
          },
          trigger: null, // trigger immediately
        });
      }
    } catch (err) {
      console.error("Error launching notification:", err);
    }
  };

  // Schedule native OS alarms whenever the medications state changes
  useEffect(() => {
    async function scheduleNotifications() {
      if (Platform.OS === 'web') return;

      try {
        // Cancel all existing scheduled notifications first to avoid multiples
        await Notifications.cancelAllScheduledNotificationsAsync();

        // Request permission if not already granted
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }

        for (const med of medications) {
          if (med.active) {
            for (const alarm of med.alarms) {
              if (alarm.active && alarm.status === 'pending') {
                // Parse "08:00 AM" -> hour, minute
                const [timeStr, ampm] = alarm.time.split(' ');
                let [hoursStr, minutesStr] = timeStr.split(':');
                let hours = parseInt(hoursStr, 10);
                const minutes = parseInt(minutesStr, 10);
                if (ampm === 'PM' && hours < 12) hours += 12;
                if (ampm === 'AM' && hours === 12) hours = 0;

                // Schedule a daily repeating alarm notification
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: `💊 ¡Hora de tomar ${med.name}!`,
                    body: `Dosis: ${med.dose} - ${med.frequency}`,
                    sound: true, // Will play sound when phone is locked / backgrounded
                    vibrate: [0, 500, 1000, 500],
                    data: { medId: med.id, alarmId: alarm.id },
                  },
                  trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                    hour: hours,
                    minute: minutes,
                    repeats: true,
                  },
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("Error scheduling background notifications:", err);
      }
    }

    scheduleNotifications();
  }, [medications]);

  useEffect(() => {
    // 1. Listener for when a user clicks/taps the notification (from lock screen or background)
    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && data.medId && data.alarmId) {
        const currentMeds = medicationsRef.current;
        const med = currentMeds.find(m => m.id === data.medId);
        const alarm = med?.alarms.find((a: any) => a.id === data.alarmId);
        if (med && alarm) {
          setActiveAlarm({ medication: med, alarm });
        }
      }
    });

    // 2. Listener for when a notification is received while in foreground (shows alarm overlay immediately)
    const receivedSub = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      if (data && data.medId && data.alarmId) {
        const currentMeds = medicationsRef.current;
        const med = currentMeds.find(m => m.id === data.medId);
        const alarm = med?.alarms.find((a: any) => a.id === data.alarmId);
        if (med && alarm) {
          setActiveAlarm({ medication: med, alarm });
        }
      }
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, []);

  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHour = hours.toString().padStart(2, '0');
      const currentTimeString = `${formattedHour}:${minutes} ${ampm}`;

      for (const med of medications) {
        if (med.active) {
          for (const alarm of med.alarms) {
            if (alarm.active && alarm.status === 'pending' && alarm.time === currentTimeString) {
              setActiveAlarm({ medication: med, alarm });
              triggerNotification(med, alarm);
              return;
            }
          }
        }
      }
    };

    // Check every 10 seconds
    const interval = setInterval(checkAlarms, 10000);
    return () => clearInterval(interval);
  }, [medications]);

  const handleAlarmTake = async (medId: number, alarmId: number) => {
    const med = medications.find(m => m.id === medId);
    if (!med) return;
    
    const updatedAlarms = med.alarms.map((a: any) => a.id === alarmId ? { ...a, status: 'taken' } : a);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
    const historyItem = {
      id: Date.now(),
      date: "Hoy",
      time: med.alarms.find((a: any) => a.id === alarmId)?.time || timeStr,
      status: "taken",
      takenAt: timeStr
    };
    const updatedHistory = [historyItem, ...(med.history || [])];
    const updatedMed = { ...med, alarms: updatedAlarms, history: updatedHistory };
    
    setMedications(prev => prev.map(m => m.id === medId ? updatedMed : m));
    setActiveAlarm(null);
    await updateMedicationInDB(updatedMed);
  };

  const handleAlarmSnooze = async (medId: number, alarmId: number) => {
    const med = medications.find(m => m.id === medId);
    if (!med) return;

    const updatedAlarms = med.alarms.map((a: any) => {
      if (a.id === alarmId) {
        const [timeStr, ampmStr] = a.time.split(' ');
        const [hStr, mStr] = timeStr.split(':');
        let h = parseInt(hStr, 10);
        let min = parseInt(mStr, 10);
        if (ampmStr === 'PM' && h < 12) h += 12;
        if (ampmStr === 'AM' && h === 12) h = 0;

        const date = new Date();
        date.setHours(h);
        date.setMinutes(min + 10);

        let newHours = date.getHours();
        const newMinutes = date.getMinutes().toString().padStart(2, '0');
        const newAmpm = newHours >= 12 ? 'PM' : 'AM';
        newHours = newHours % 12;
        newHours = newHours ? newHours : 12;
        const newFormattedHour = newHours.toString().padStart(2, '0');
        const newTime = `${newFormattedHour}:${newMinutes} ${newAmpm}`;

        return { ...a, time: newTime, status: 'snoozed' };
      }
      return a;
    });

    const updatedMed = { ...med, alarms: updatedAlarms };
    setMedications(prev => prev.map(m => m.id === medId ? updatedMed : m));
    setActiveAlarm(null);
    await updateMedicationInDB(updatedMed);
  };

  // Modal & Form States
  const [modalVisible, setModalVisible] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [editingMedId, setEditingMedId] = useState<number | null>(null);

  const [formMedName, setFormMedName] = useState('');
  const [formDose, setFormDose] = useState('');
  const [formPrescribedQuantity, setFormPrescribedQuantity] = useState('');
  const [formFrequency, setFormFrequency] = useState('Cada 12 horas');
  const [formTime, setFormTime] = useState('08:00 AM');

  useEffect(() => {
    if (!formPrescribedQuantity) return;
    
    const qtyMatch = formPrescribedQuantity.match(/(\d+)/);
    if (!qtyMatch) return;
    const qty = parseInt(qtyMatch[0], 10);
    if (isNaN(qty) || qty <= 0) return;

    let doseQty = 1;
    const doseMatch = formDose.match(/(\d+(\.\d+)?)/);
    if (doseMatch) {
      doseQty = parseFloat(doseMatch[0]);
    }
    if (isNaN(doseQty) || doseQty <= 0) doseQty = 1;

    let intakesPerDay = 1;
    const freq = formFrequency.toLowerCase();
    if (freq.includes('24') || freq.includes('día') || freq.includes('dia') || freq.includes('una vez')) {
      intakesPerDay = 1;
    } else if (freq.includes('12') || freq.includes('doce') || freq.includes('dos veces')) {
      intakesPerDay = 2;
    } else if (freq.includes('8') || freq.includes('ocho') || freq.includes('tres veces')) {
      intakesPerDay = 3;
    } else if (freq.includes('6') || freq.includes('seis') || freq.includes('cuatro veces')) {
      intakesPerDay = 4;
    } else if (freq.includes('4') || freq.includes('cuatro')) {
      intakesPerDay = 6;
    }
    
    const dosesPerDay = intakesPerDay * doseQty;
    const days = Math.ceil(qty / dosesPerDay);
    if (days > 0 && days < 1000) {
      setDurationValue(days.toString());
      setDurationUnit('días');
    }
  }, [formPrescribedQuantity, formDose, formFrequency]);
  
  // Duration Value & Unit Configurable States
  const [durationValue, setDurationValue] = useState('7');
  const [durationUnit, setDurationUnit] = useState('días'); // 'horas' | 'días' | 'meses'
  
  const [formIcon, setFormIcon] = useState('pill');
  const [formIconBg, setFormIconBg] = useState('#c4d2ff30');

  // Time fields for 12-hour AM/PM format input
  const [timeHour, setTimeHour] = useState('08');
  const [timeMinute, setTimeMinute] = useState('00');
  const [timeAmPm, setTimeAmPm] = useState('AM');

  const [scheduledTimes, setScheduledTimes] = useState<string[]>(["08:00 AM"]);
  const [showFreqDropdown, setShowFreqDropdown] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);
  
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

  const handleTimePickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate && pickerIndex !== null) {
      setPickerDate(selectedDate);
      let hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHour = hours.toString().padStart(2, '0');

      const updatedTimes = calculateTimesFromFrequency(formattedHour, minutes, ampm, formFrequency);
      setScheduledTimes(updatedTimes);
    }
  };
  
  // Temporal inputs for editing scheduled times
  const [tempHour, setTempHour] = useState('08');
  const [tempMinute, setTempMinute] = useState('00');
  const [tempAmPm, setTempAmPm] = useState('AM');

  useEffect(() => {
    if (meds) {
      try {
        const parsedMeds = JSON.parse(meds as string);
        if (parsedMeds && parsedMeds.length > 0) {
          setQueue(parsedMeds);
          setCurrentQueueIndex(0);
          loadMedIntoForm(parsedMeds[0]);
          setModalVisible(true);
          setCurrentStep(1);
        }
      } catch (e) {
        console.error("Error al cargar medicamentos en cola:", e);
      }
    }
  }, [meds]);

  // Function to calculate schedules dynamically based on starting hour and frequency
  const calculateTimesFromFrequency = (hourStr: string, minStr: string, ampmStr: string, freqStr: string) => {
    let hr = parseInt(hourStr, 10);
    let min = parseInt(minStr, 10);
    if (isNaN(hr)) hr = 8;
    if (isNaN(min)) min = 0;
    
    if (ampmStr === 'PM' && hr < 12) hr += 12;
    if (ampmStr === 'AM' && hr === 12) hr = 0;

    let interval = 24;
    const cleanFreq = freqStr.toLowerCase();
    if (cleanFreq.includes('24') || cleanFreq.includes('veinticuatro') || cleanFreq.includes('día') || cleanFreq.includes('dia')) interval = 24;
    else if (cleanFreq.includes('12') || cleanFreq.includes('doce')) interval = 12;
    else if (cleanFreq.includes('8') || cleanFreq.includes('ocho')) interval = 8;
    else if (cleanFreq.includes('6') || cleanFreq.includes('seis')) interval = 6;
    else if (cleanFreq.includes('4') || cleanFreq.includes('cuatro')) interval = 4;

    const timesCount = Math.floor(24 / interval);
    const result = [];
    for (let i = 0; i < timesCount; i++) {
      const currentHr = (hr + i * interval) % 24;
      const finalAmPm = currentHr >= 12 ? 'PM' : 'AM';
      let displayHr = currentHr % 12;
      if (displayHr === 0) displayHr = 12;
      const hrString = displayHr.toString().padStart(2, '0');
      const minString = min.toString().padStart(2, '0');
      result.push(`${hrString}:${minString} ${finalAmPm}`);
    }
    return result;
  };

  const handleFrequencyChange = (newFreq: string) => {
    setFormFrequency(newFreq);
    const updated = calculateTimesFromFrequency(timeHour, timeMinute, timeAmPm, newFreq);
    setScheduledTimes(updated);
    setShowFreqDropdown(false);
  };

  const updateFormTime = (hour: string, minute: string, ampm: string) => {
    let formattedHour = hour.padStart(2, '0');
    let formattedMinute = minute.padStart(2, '0');
    setFormTime(`${formattedHour}:${formattedMinute} ${ampm}`);
  };

  const parseImportedDuration = (dur: string) => {
    const matchNum = dur.match(/(\d+)/);
    const val = matchNum ? matchNum[0] : '7';
    let unit = 'días';
    if (dur.toLowerCase().includes('hora')) unit = 'horas';
    else if (dur.toLowerCase().includes('mes')) unit = 'meses';
    return { val, unit };
  };

  const loadMedIntoForm = (med: any) => {
    const medName = med?.nombre || '';
    const medDose = med?.dosis || '';
    const freq = med?.frecuencia || 'Cada 12 horas';
    const duration = med?.duracion || '7 días';

    setFormMedName(medName);
    setFormDose(medDose);
    setFormPrescribedQuantity('');
    setFormFrequency(freq);
    
    const parsedDur = parseImportedDuration(duration);
    setDurationValue(parsedDur.val);
    setDurationUnit(parsedDur.unit);

    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHour = hours.toString().padStart(2, '0');

    setSelectedDate(now);
    setFormTime(`${formattedHour}:${minutes} ${ampm}`);
    setTimeHour(formattedHour);
    setTimeMinute(minutes);
    setTimeAmPm(ampm);
    setFormIcon('pill');
    setFormIconBg('#c4d2ff30');

    // Calculate times from imported recipe frequencies
    const initialTimes = calculateTimesFromFrequency(formattedHour, minutes, ampm, freq);
    setScheduledTimes(initialTimes);
  };

  const handleNewAlarmPress = () => {
    if (Platform.OS === 'web') {
      handleOpenManual();
      return;
    }

    Alert.alert(
      "Nueva Alarma",
      "¿Cómo deseas agregar el medicamento?",
      [
        { text: "Tomar foto de receta", onPress: () => handleTakeRecipePhoto() },
        { text: "Ingreso manual", onPress: () => handleOpenManual() },
        { text: "Cancelar", style: "cancel" }
      ]
    );
  };

  const handleTakeRecipePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Permiso Requerido", "Se requiere permiso de cámara para digitalizar la receta.");
        return;
      }

      const pickerResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (pickerResult.canceled) {
        return;
      }

      const uri = pickerResult.assets[0].uri;
      await uploadAndProcessRecipeImage(uri);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error de Cámara", "No se pudo activar la cámara.");
    }
  };

  const uploadAndProcessRecipeImage = async (uri: string) => {
    setIsProcessingOCR(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'receta.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      // @ts-ignore
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type,
      });

      const response = await fetch(`${API_URL}/api/recipes/process`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Error en el servidor");
      }

      const data = await response.json();
      const extractedMeds = data?.recipe_dict?.medicamentos;
      
      if (extractedMeds && extractedMeds.length > 0) {
        setQueue(extractedMeds);
        setCurrentQueueIndex(0);
        loadMedIntoForm(extractedMeds[0]);
        setModalVisible(true);
        setCurrentStep(1);
        Alert.alert("Receta Procesada", `Se detectaron ${extractedMeds.length} medicamento(s). Revisa y acepta la configuración de cada uno.`);
      } else {
        Alert.alert("OCR Sin Resultados", "No pudimos detectar medicamentos en esta foto. Por favor ingresa manualmente.");
      }
    } catch (err: any) {
      console.error('Error al procesar OCR:', err);
      Alert.alert("Error de Procesamiento", "No se pudo extraer la información con Gemini. Intenta de nuevo o ingresa manualmente.");
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleOpenManual = () => {
    setEditingMedId(null);
    setQueue([]);
    setCurrentQueueIndex(0);
    setFormMedName('');
    setFormDose('');
    setFormPrescribedQuantity('');
    setFormFrequency('Cada 12 horas');
    setDurationValue('7');
    setDurationUnit('días');
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHour = hours.toString().padStart(2, '0');

    setSelectedDate(now);
    setFormTime(`${formattedHour}:${minutes} ${ampm}`);
    setTimeHour(formattedHour);
    setTimeMinute(minutes);
    setTimeAmPm(ampm);
    setFormIcon('pill');
    setFormIconBg('#c4d2ff30');
    
    const initialTimes = calculateTimesFromFrequency(formattedHour, minutes, ampm, 'Cada 12 horas');
    setScheduledTimes(initialTimes);
    setModalVisible(true);
    setCurrentStep(1);
  };

  const handleSaveAlarm = async () => {
    if (editingMedId !== null) {
      const med = medications.find(m => m.id === editingMedId);
      if (!med) return;
      
      const updatedAlarms = scheduledTimes.map((t, idx) => {
        const existing = med.alarms.find((a: any) => a.time === t);
        if (existing) {
          return existing;
        }
        return {
          id: Date.now() + idx,
          time: t,
          active: true,
          status: 'pending'
        };
      });

      const updatedMed = {
        ...med,
        name: formMedName,
        dose: formDose,
        frequency: formFrequency,
        duration: `${durationValue} ${durationUnit}`,
        icon: formIcon,
        iconBg: formIconBg,
        alarms: updatedAlarms
      };

      setMedications(prev => prev.map(m => m.id === editingMedId ? updatedMed : m));
      setEditingMedId(null);
      setModalVisible(false);
      await updateMedicationInDB(updatedMed);
    } else {
      const newAlarms = scheduledTimes.map((t, idx) => ({
        id: Date.now() + idx,
        time: t,
        active: true,
        status: 'pending'
      }));

      const newMed = {
        name: formMedName,
        dose: formDose,
        frequency: formFrequency,
        duration: `${durationValue} ${durationUnit}`,
        icon: formIcon,
        iconBg: formIconBg,
        active: true,
        alarms: newAlarms,
        history: []
      };

      try {
        const response = await fetch(`${API_URL}/api/medications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newMed),
        });
        if (response.ok) {
          const resData = await response.json();
          const medWithId = { ...newMed, id: resData.id };
          setMedications(prev => [medWithId, ...prev]);
        } else {
          console.error("Error al registrar medicamento en BD");
        }
      } catch (e) {
        console.error("Error al guardar medicamento:", e);
      }

      if (queue.length > 0 && currentQueueIndex + 1 < queue.length) {
        const nextIndex = currentQueueIndex + 1;
        setCurrentQueueIndex(nextIndex);
        loadMedIntoForm(queue[nextIndex]);
        setCurrentStep(1);
      } else {
        setModalVisible(false);
        setQueue([]);
        setCurrentQueueIndex(0);
        router.setParams({ meds: undefined });
      }
    }
  };

  const toggleActive = async (id: number) => {
    const med = medications.find(m => m.id === id);
    if (!med) return;
    const newActive = !med.active;
    const updatedAlarms = med.alarms.map((alarm: any) => ({ ...alarm, active: newActive }));
    const updatedMed = { ...med, active: newActive, alarms: updatedAlarms };
    
    setMedications(prevMeds => prevMeds.map(m => m.id === id ? updatedMed : m));
    await updateMedicationInDB(updatedMed);
  };

  const confirmDeleteMedication = (medId: number) => {
    Alert.alert(
      "Eliminar Medicamento",
      "¿Estás seguro de que deseas eliminar este medicamento y todas sus alarmas?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/medications/${medId}`, {
                method: 'DELETE'
              });
              if (response.ok) {
                setMedications(prev => prev.filter(m => m.id !== medId));
              } else {
                console.error("Error al eliminar el medicamento");
              }
            } catch (e) {
              console.error("Error al eliminar de la BD:", e);
            }
          } 
        }
      ]
    );
  };

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Calculates End Date dynamically based on selected start date, value, and unit
  const getCalculatedEndDate = () => {
    const d = new Date(selectedDate.getTime());
    const val = parseInt(durationValue, 10);
    if (isNaN(val) || val <= 0) return d;

    if (durationUnit === 'horas') {
      const daysToAdd = Math.floor(val / 24);
      d.setDate(d.getDate() + daysToAdd);
    } else if (durationUnit === 'días') {
      d.setDate(d.getDate() + val);
    } else if (durationUnit === 'meses') {
      d.setMonth(d.getMonth() + val);
    }
    return d;
  };

  // Helper date grid for rendering the calendar in Spanish
  const getDaysGrid = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const numDays = new Date(year, month + 1, 0).getDate();
    
    const grid = [];
    for (let i = 0; i < firstDayIndex; i++) {
      grid.push(null);
    }
    for (let i = 1; i <= numDays; i++) {
      grid.push(new Date(year, month, i));
    }
    return grid;
  };

  // Helper date methods in Spanish
  const getStartDateString = () => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${selectedDate.getDate()} de ${months[selectedDate.getMonth()]}`;
  };

  const getEndDateString = () => {
    const endDate = getCalculatedEndDate();
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${endDate.getDate()} de ${months[endDate.getMonth()]}`;
  };

  const isDateSelected = (date: Date) => {
    return date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  const isDateEndDate = (date: Date) => {
    const endDate = getCalculatedEndDate();
    return date.getDate() === endDate.getDate() &&
      date.getMonth() === endDate.getMonth() &&
      date.getFullYear() === endDate.getFullYear();
  };

  const isDateInRange = (date: Date) => {
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const end = getCalculatedEndDate();
    const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return current > start && current < endMidnight;
  };

  const renderAlarmIcon = (iconName: string, color = "#003d9b") => {
    switch (iconName) {
      case 'pill':
        return <Pill color={color} size={20} />;
      case 'droplet':
        return <Droplet color={color} size={20} />;
      case 'flask':
        return <FlaskConical color={color} size={20} />;
      case 'syringe':
        return <Syringe color={color} size={20} />;
      case 'thermometer':
        return <Thermometer color={color} size={20} />;
      case 'heart':
        return <Heart color={color} size={20} />;
      default:
        return <Pill color={color} size={20} />;
    }
  };

  const activeMeds = medications.filter(m => m.active);
  const totalAlarms = activeMeds.reduce((sum, m) => sum + (m.alarms ? m.alarms.length : 0), 0);
  const completedAlarms = activeMeds.reduce((sum, m) => sum + (m.alarms ? m.alarms.filter((a: any) => a.status === 'taken').length : 0), 0);
  const progressPercent = totalAlarms > 0 ? Math.round((completedAlarms / totalAlarms) * 100) : 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fb" />
      
      {/* Header matching screenshot */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.doctorAvatar}>
            <Text style={styles.doctorAvatarText}>👨‍⚕️</Text>
          </View>
          <Text style={styles.headerTitle}>MediAssist AI</Text>
        </View>
        <Wifi color="#191c1e" size={20} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* Card 2: Nueva Alarma */}
        <TouchableOpacity style={styles.newAlarmCard} activeOpacity={0.85} onPress={handleNewAlarmPress}>
          <View style={styles.newAlarmLeft}>
            <View style={styles.newAlarmIconWrapper}>
              <Bell color="#ffffff" size={20} />
            </View>
            <View style={{ marginLeft: 14 }}>
              <Text style={styles.newAlarmTitle}>Nueva Alarma</Text>
              <Text style={styles.newAlarmDesc}>Configura un nuevo recordatorio</Text>
              <Text style={styles.newAlarmDesc}>personalizado.</Text>
            </View>
          </View>
          <ArrowRight color="#ffffff" size={20} />
        </TouchableOpacity>

        {/* Card 3: Simular Alarma */}
        <TouchableOpacity 
          style={[styles.newAlarmCard, { backgroundColor: '#34c759', marginBottom: 24 }]} 
          activeOpacity={0.85} 
          onPress={() => {
            const activeMeds = medications.filter(m => m.active);
            const selectedMed = activeMeds.length > 0 ? activeMeds[0] : medications[0];
            const selectedAlarm = selectedMed.alarms[0];
            
            setActiveAlarm({
              medication: selectedMed,
              alarm: selectedAlarm
            });
            triggerNotification(selectedMed, selectedAlarm);
          }}
        >
          <View style={styles.newAlarmLeft}>
            <View style={styles.newAlarmIconWrapper}>
              <Bell color="#ffffff" size={20} />
            </View>
            <View style={{ marginLeft: 14 }}>
              <Text style={styles.newAlarmTitle}>Simular Alarma Test</Text>
              <Text style={styles.newAlarmDesc}>Probar sonido y pantalla completa</Text>
              <Text style={styles.newAlarmDesc}>del recordatorio de inmediato.</Text>
            </View>
          </View>
          <ArrowRight color="#ffffff" size={20} />
        </TouchableOpacity>

        {/* Mis Medicamentos Section */}
        <Text style={styles.sectionTitle}>Mis medicamentos</Text>

        {medications.map(med => {
          const renderLeftActions = () => (
            <TouchableOpacity
              style={styles.deleteSwipeBtn}
              activeOpacity={0.8}
              onPress={() => confirmDeleteMedication(med.id)}
            >
              <Trash2 color="#ffffff" size={24} />
            </TouchableOpacity>
          );

          return (
            <View key={med.id} style={styles.swipeableContainer}>
              <Swipeable
                renderLeftActions={renderLeftActions}
                friction={1.5}
                leftThreshold={40}
              >
                <TouchableOpacity 
                  style={[styles.alarmCard, !med.active && styles.inactiveCard, { marginBottom: 0 }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    router.push({
                      pathname: '/medication-alarms' as any,
                      params: { 
                        medId: med.id, 
                        medName: med.name,
                        medDose: med.dose,
                        medFrequency: med.frequency,
                        medIcon: med.icon,
                        medIconBg: med.iconBg,
                        medAlarms: JSON.stringify(med.alarms),
                        medHistory: JSON.stringify(med.history || [])
                      }
                    });
                  }}
                >
                  <View style={{ backgroundColor: med.iconBg, width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    {renderAlarmIcon(med.icon, "#003d9b")}
                  </View>

                  <View style={styles.alarmContent}>
                    <Text style={[styles.alarmMedName, !med.active && styles.inactiveText, { fontSize: 16 }]}>{med.name}</Text>
                    <Text style={[styles.alarmDose, { marginTop: 2 }]}>{med.dose} • {med.frequency}</Text>
                    <Text style={{ fontSize: 11, color: '#8e8e93', marginTop: 2, fontWeight: '500' }}>
                      {med.alarms.filter((a: any) => a.active).length} de {med.alarms.length} {med.alarms.length === 1 ? 'alarma activa' : 'alarmas activas'}
                    </Text>
                  </View>

                  <Switch
                    value={med.active}
                    onValueChange={() => toggleActive(med.id)}
                    trackColor={{ false: '#edeef0', true: '#003d9b' }}
                    thumbColor={med.active ? '#ffffff' : '#737685'}
                  />
                </TouchableOpacity>
              </Swipeable>
            </View>
          );
        })}

        <TouchableOpacity 
          style={styles.completedLink} 
          activeOpacity={0.7}
          onPress={() => setShowCompletedModal(true)}
        >
          <Text style={styles.completedLinkText}>Ver tomas completadas ({completedAlarms})</Text>
        </TouchableOpacity>

      </ScrollView>




      {/* Modal de Tomas Completadas */}
      <Modal
        visible={showCompletedModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompletedModal(false)}
      >
        <View style={styles.completedModalOverlay}>
          <View style={styles.completedModalContainer}>
            <View style={styles.completedModalHeader}>
              <Text style={styles.completedModalTitle}>Tomas Completadas de Hoy</Text>
              <TouchableOpacity onPress={() => setShowCompletedModal(false)} style={{ padding: 4 }}>
                <X color="#191c1e" size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {completedAlarms === 0 ? (
                <Text style={styles.noCompletedText}>No has completado ninguna toma hoy todavía.</Text>
              ) : (
                medications.map(med => {
                  const takenAlarms = med.alarms ? med.alarms.filter((a: any) => a.status === 'taken') : [];
                  if (takenAlarms.length === 0) return null;

                  return (
                    <View key={med.id} style={styles.completedMedGroup}>
                      <Text style={styles.completedMedName}>{med.name}</Text>
                      {takenAlarms.map((alarm: any) => (
                        <View key={alarm.id} style={styles.completedAlarmRow}>
                          <Check color="#00734c" size={16} style={{ marginRight: 8 }} />
                          <Text style={styles.completedAlarmText}>
                            {med.dose} • Programado a las {alarm.time}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Alarma Full-Screen */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setModalVisible(false);
          setQueue([]);
        }}
      >
        <SafeAreaView style={styles.fsContainer} edges={['top', 'bottom']}>
          {/* Header Row */}
          <View style={styles.fsHeader}>
            <View style={styles.fsHeaderLeft}>
              {currentStep > 1 ? (
                <TouchableOpacity 
                  onPress={() => setCurrentStep(currentStep - 1)}
                  style={{ paddingVertical: 8, paddingHorizontal: 6 }}
                >
                  <Text style={{ fontSize: 16, color: '#007aff', fontWeight: '600' }}>Atrás</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={() => {
                    setModalVisible(false);
                    setQueue([]);
                  }}
                  style={{ paddingVertical: 8, paddingHorizontal: 6 }}
                >
                  <Text style={{ fontSize: 16, color: '#ff3b30', fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.fsHeaderTitleCenter}>
              <Text style={styles.fsHeaderMedName} numberOfLines={1}>{formMedName || 'Medicamento'}</Text>
              <Text style={styles.fsHeaderMedDose} numberOfLines={1}>{formDose || 'Sin dosis'}</Text>
            </View>

            <View style={styles.fsHeaderRight}>
              {currentStep > 1 && (
                <TouchableOpacity 
                  onPress={() => {
                    setModalVisible(false);
                    setQueue([]);
                  }}
                  style={{ paddingVertical: 8, paddingHorizontal: 6 }}
                >
                  <Text style={{ fontSize: 16, color: '#ff3b30', fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView 
            style={styles.fsBody} 
            contentContainerStyle={styles.fsBodyContent} 
            keyboardShouldPersistTaps="handled"
          >
            {/* Step indicator dots */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <View 
                  key={s} 
                  style={{
                    width: currentStep === s ? 20 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: currentStep === s ? '#007aff' : '#d1d1d6',
                  }} 
                />
              ))}
            </View>

            {currentStep === 1 && (
              <>
                <View style={[styles.fsCalendarWrapper, dynamicCalendarWrapperStyle]}>
                  <View style={styles.fsCalendarIconBg}>
                    <View style={styles.fsDotsRow}>
                      <View style={[styles.fsDot, {backgroundColor: '#a2c5f7'}]}/>
                      <View style={[styles.fsDot, {backgroundColor: '#a2c5f7'}]}/>
                      <View style={[styles.fsDot, {backgroundColor: '#a2c5f7'}]}/>
                    </View>
                    <View style={styles.fsDotsRow}>
                      <View style={[styles.fsDot, {backgroundColor: '#a2c5f7'}]}/>
                      <View style={[styles.fsDot, {backgroundColor: '#007aff'}]}/>
                      <View style={[styles.fsDot, {backgroundColor: '#007aff'}]}/>
                    </View>
                    <View style={styles.fsDotsRow}>
                      <View style={[styles.fsDot, {backgroundColor: '#007aff'}]}/>
                      <View style={[styles.fsDot, {backgroundColor: '#007aff'}]}/>
                      <View style={[styles.fsDot, {backgroundColor: '#007aff'}]}/>
                    </View>
                  </View>
                </View>

                <Text style={[styles.fsMainTitle, dynamicTitleStyle]}>Paso 1: Medicamento</Text>
                <Text style={styles.fsSectionLabel}>¿Cómo se llama tu medicamento y cuál es su dosis?</Text>
                <View style={styles.fsCard}>
                  <TextInput
                    style={styles.fsInput}
                    placeholder="Nombre del medicamento"
                    placeholderTextColor="#a0a4b0"
                    value={formMedName}
                    onChangeText={setFormMedName}
                  />
                  <View style={styles.fsDivider} />
                  <TextInput
                    style={styles.fsInput}
                    placeholder="Dosis (Ej. 1 tableta / 500mg)"
                    placeholderTextColor="#a0a4b0"
                    value={formDose}
                    onChangeText={setFormDose}
                  />
                  <View style={styles.fsDivider} />
                  <TextInput
                    style={styles.fsInput}
                    placeholder="Cantidad Prescrita opcional (Ej. 10 tabletas)"
                    placeholderTextColor="#a0a4b0"
                    value={formPrescribedQuantity}
                    onChangeText={setFormPrescribedQuantity}
                  />
                </View>
              </>
            )}

            {currentStep === 2 && (
              <>
                <Text style={[styles.fsMainTitle, dynamicTitleStyle]}>Paso 2: Duración</Text>
                
                <Text style={[styles.fsSectionLabel, dynamicSectionLabelStyle]}>Duración del Tratamiento</Text>
                <View style={styles.fsCard}>
                  <Text style={[{ marginLeft: 16, marginTop: 14, marginBottom: 8, fontWeight: '700', fontSize: 13, color: '#8e8e93' }]}>DEFINIR DURACIÓN</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, marginBottom: 12 }}>
                    <TextInput
                      style={[{ flex: 1, backgroundColor: '#f2f2f7', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, fontSize: 16, color: '#000000' }]}
                      keyboardType="numeric"
                      placeholder="Ej. 7"
                      value={durationValue}
                      onChangeText={setDurationValue}
                    />
                    <View style={{ flexDirection: 'row', backgroundColor: '#e5e5ea', borderRadius: 8, padding: 2 }}>
                      {['horas', 'días', 'meses'].map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          style={[{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 }, durationUnit === unit && { backgroundColor: '#ffffff' }]}
                          onPress={() => setDurationUnit(unit)}
                        >
                          <Text style={[{ fontSize: 13, color: '#8e8e93', fontWeight: '700' }, durationUnit === unit && { color: '#007aff' }]}>
                            {unit}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.fsDivider} />
                  <Text style={[{ marginLeft: 16, marginTop: 14, marginBottom: 8, fontWeight: '700', fontSize: 13, color: '#8e8e93' }]}>SELECCIONAR RANGO EN CALENDARIO</Text>
                  
                  <View style={styles.calMonthHeader}>
                    <Text style={styles.calMonthText}>
                      {selectedDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity onPress={() => {
                        const prevM = new Date(selectedDate.getTime());
                        prevM.setMonth(prevM.getMonth() - 1);
                        setSelectedDate(prevM);
                      }}>
                        <Text style={styles.calNavBtn}>{"<"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        const nextM = new Date(selectedDate.getTime());
                        nextM.setMonth(nextM.getMonth() + 1);
                        setSelectedDate(nextM);
                      }}>
                        <Text style={styles.calNavBtn}>{">"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.calDaysHeader}>
                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, idx) => (
                      <Text key={idx} style={[styles.calDayHeaderCell, dynamicHeaderCellStyles]}>{day}</Text>
                    ))}
                  </View>

                  <View style={styles.calGrid}>
                    {getDaysGrid().map((dayDate, idx) => {
                      if (!dayDate) {
                        return <View key={`empty-${idx}`} style={dynamicCellEmptyStyles} />;
                      }
                      
                      const isStart = isDateSelected(dayDate);
                      const isEnd = isDateEndDate(dayDate);
                      const isInRange = isDateInRange(dayDate);
                      
                      return (
                        <TouchableOpacity
                          key={dayDate.toISOString()}
                          style={[
                            styles.calCell,
                            dynamicCellStyles,
                            isStart && styles.calCellSelectedStart,
                            isEnd && styles.calCellSelectedEnd,
                            isInRange && styles.calCellInRange
                          ]}
                          onPress={() => setSelectedDate(dayDate)}
                        >
                          <Text style={[
                            styles.calCellText,
                            (isStart || isEnd) && styles.calCellTextSelected,
                            isInRange && styles.calCellTextInRange
                          ]}>
                            {dayDate.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Treatment Duration Dates Card */}
                <Text style={styles.fsSectionLabel}>Duración estimada</Text>
                <View style={styles.fsCard}>
                  <View style={styles.fsDurationRow}>
                    <View style={styles.fsDurationCol}>
                      <Text style={styles.fsDurationLabel}>FECHA INICIO</Text>
                      <Text style={styles.fsDurationVal}>{getStartDateString()}</Text>
                    </View>
                    <View style={styles.fsDurationCol}>
                      <Text style={styles.fsDurationLabel}>FECHA FIN</Text>
                      <Text style={styles.fsDurationVal}>{getEndDateString()}</Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            {currentStep === 3 && (
              <>
                <Text style={[styles.fsMainTitle, dynamicTitleStyle]}>Paso 3: Frecuencia y Horarios</Text>
                
                <Text style={[styles.fsSectionLabel, dynamicSectionLabelStyle]}>¿Cada cuánto lo tomarás?</Text>
                <View style={[styles.fsCard, { marginBottom: 16 }]}>
                  <View style={styles.fsCardRow}>
                    <Text style={styles.fsCardText}>{formFrequency}</Text>
                    <TouchableOpacity onPress={() => setShowFreqDropdown(!showFreqDropdown)}>
                      <Text style={styles.fsCardLink}>Cambiar</Text>
                    </TouchableOpacity>
                  </View>

                  {showFreqDropdown && (
                    <View style={styles.fsDropdown}>
                      {['Cada 4 horas', 'Cada 6 horas', 'Cada 8 horas', 'Cada 12 horas', 'Una vez al día'].map((opt) => (
                        <TouchableOpacity 
                          key={opt} 
                          style={styles.fsDropdownItem}
                          onPress={() => handleFrequencyChange(opt)}
                        >
                          <Text style={[styles.fsDropdownText, formFrequency === opt && styles.fsDropdownTextActive]}>
                            {opt}
                          </Text>
                          {formFrequency === opt && <Check color="#007aff" size={16} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Primera Dosis */}
                <Text style={styles.fsSectionLabel}>Primera dosis</Text>
                <View style={[styles.fsCard, { marginBottom: 16, padding: 16 }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#8e8e93', marginBottom: 4 }}>FECHA DE LA PRIMERA DOSIS</Text>
                  <Text style={{ fontSize: 16, color: '#000000', fontWeight: '600', marginBottom: 14 }}>
                    {getStartDateString()} (Configurada en el Paso 2)
                  </Text>
                  
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#8e8e93', marginBottom: 4 }}>HORA DE LA PRIMERA DOSIS</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 18, color: '#007aff', fontWeight: '700' }}>
                      {scheduledTimes[0] || '08:00 AM'}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#8e8e93', fontStyle: 'italic' }}>
                      Edita abajo para reajustar la serie
                    </Text>
                  </View>
                </View>

                <Text style={styles.fsSectionLabel}>¿A qué horas deseas recibir recordatorios?</Text>
                <View style={styles.fsCard}>
                  {scheduledTimes.map((time, idx) => (
                    <View key={idx}>
                      {idx > 0 && <View style={styles.fsDivider} />}
                      <View style={styles.fsCardRow}>
                        <View style={styles.fsRowLeft}>
                          <TouchableOpacity 
                            style={styles.fsMinusBtn}
                            onPress={() => {
                              setScheduledTimes(prev => prev.filter((_, i) => i !== idx));
                            }}
                          >
                            <View style={styles.fsMinusInner} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.fsTimePill}
                            onPress={() => {
                              const [timeStr, ampm] = time.split(' ');
                              let [hoursStr, minutesStr] = timeStr.split(':');
                              let hours = parseInt(hoursStr, 10);
                              const minutes = parseInt(minutesStr, 10);
                              if (ampm === 'PM' && hours < 12) hours += 12;
                              if (ampm === 'AM' && hours === 12) hours = 0;

                              const d = new Date();
                              d.setHours(hours);
                              d.setMinutes(minutes);
                              setPickerDate(d);
                              setPickerIndex(idx);
                              setShowTimePicker(true);
                            }}
                          >
                            <Text style={styles.fsTimePillText}>{time}</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.fsDoseLabel}>{formDose || '1 dosis'}</Text>
                      </View>
                    </View>
                  ))}

                  <View style={styles.fsDivider} />
                  
                  {/* Add a Time Row */}
                  <TouchableOpacity 
                    style={styles.fsCardRow} 
                    onPress={() => setScheduledTimes(prev => [...prev, "08:00 AM"])}
                  >
                    <View style={styles.fsRowLeft}>
                      <View style={styles.fsPlusBtn}>
                        <Plus color="#ffffff" size={14} />
                      </View>
                      <Text style={styles.fsAddText}>Añadir toma</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <Text style={styles.fsNote}>
                  Si programas un horario, recibirás notificaciones para tomar tus medicamentos a tiempo.
                </Text>
              </>
            )}

            {currentStep === 4 && (
              <>
                <Text style={[styles.fsMainTitle, dynamicTitleStyle]}>Paso 4: Personalizar Icono</Text>
                <Text style={[styles.fsSectionLabel, dynamicSectionLabelStyle]}>Selecciona el icono que mejor represente tu toma</Text>
                <View style={[styles.fsCard, { flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16, justifyContent: 'center' }]}>
                  {[
                    { id: 'pill', component: <Pill color={formIcon === 'pill' ? '#ffffff' : '#007aff'} size={24} />, bg: '#c4d2ff30', label: 'Pastilla' },
                    { id: 'droplet', component: <Droplet color={formIcon === 'droplet' ? '#ffffff' : '#34c759'} size={24} />, bg: '#e0f7fa', label: 'Gotas' },
                    { id: 'flask', component: <FlaskConical color={formIcon === 'flask' ? '#ffffff' : '#ff9500'} size={24} />, bg: '#efebe9', label: 'Jarabe' },
                    { id: 'syringe', component: <Syringe color={formIcon === 'syringe' ? '#ffffff' : '#ff3b30'} size={24} />, bg: '#ffebee', label: 'Inyección' },
                    { id: 'thermometer', component: <Thermometer color={formIcon === 'thermometer' ? '#ffffff' : '#00b0ff'} size={24} />, bg: '#e1f5fe', label: 'Termómetro' },
                    { id: 'heart', component: <Heart color={formIcon === 'heart' ? '#ffffff' : '#e91e63'} size={24} />, bg: '#fce4ec', label: 'Vitales' },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.iconSelectButton,
                        { backgroundColor: formIcon === item.id ? '#007aff' : item.bg, width: 72, height: 72, justifyContent: 'center', alignItems: 'center' },
                        formIcon === item.id && styles.iconSelectButtonActive
                      ]}
                      onPress={() => {
                        setFormIcon(item.id);
                        setFormIconBg(item.bg);
                      }}
                    >
                      {item.component}
                      <Text style={{ fontSize: 10, marginTop: 4, fontWeight: '600', color: formIcon === item.id ? '#ffffff' : '#737685' }}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {currentStep === 5 && (
              <>
                <Text style={[styles.fsMainTitle, dynamicTitleStyle]}>Resumen del Plan</Text>
                <Text style={[styles.fsSectionLabel, dynamicSectionLabelStyle]}>Todo listo para guardar</Text>
                
                <View style={[styles.fsCard, { padding: 0, backgroundColor: '#ffffff', borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }]}>
                  {/* Header/Main Medicine Card with background tint */}
                  <View style={{ backgroundColor: '#f0f4ff', padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ backgroundColor: '#ffffff', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 }}>
                      {renderAlarmIcon(formIcon, "#007aff")}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: '#003d9b' }}>{formMedName || 'Sin Nombre'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Pill size={13} color="#737685" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 14, color: '#737685', fontWeight: '500' }}>{formDose || 'Sin Dosis'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Summary Details */}
                  <View style={{ padding: 20, gap: 16 }}>
                    {/* Frecuencia Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 }}>
                        <Activity size={16} color="#34c759" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Frecuencia</Text>
                        <Text style={{ fontSize: 16, color: '#191c1e', fontWeight: '600', marginTop: 2 }}>{formFrequency}</Text>
                      </View>
                    </View>

                    {/* Duración Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#fff8e1', justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 }}>
                        <Calendar size={16} color="#ffb300" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Duración</Text>
                        <Text style={{ fontSize: 16, color: '#191c1e', fontWeight: '600', marginTop: 2 }}>
                          {durationValue} {durationUnit}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#737685', marginTop: 1, fontWeight: '400' }}>
                          Del {getStartDateString()} al {getEndDateString()}
                        </Text>
                      </View>
                    </View>

                    {/* Horarios Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#e1f5fe', justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 }}>
                        <Clock size={16} color="#00b0ff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Recordatorios ({scheduledTimes.length})</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {scheduledTimes.map((time, idx) => (
                            <View key={idx} style={{ backgroundColor: '#f0f4ff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#d0e0ff' }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#007aff' }}>{time}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
          {/* Next / Action Button Row */}
          <View style={styles.fsFooter}>
            <TouchableOpacity 
              style={styles.fsNextBtn} 
              onPress={() => {
                if (currentStep < 5) {
                  setCurrentStep(currentStep + 1);
                } else {
                  handleSaveAlarm();
                }
              }}
            >
              <Text style={styles.fsNextBtnText}>
                {currentStep < 5 
                  ? 'Continuar' 
                  : (editingMedId !== null ? 'Guardar Cambios' : (queue.length > 0 && currentQueueIndex + 1 < queue.length ? 'Siguiente Medicamento' : 'Guardar Alarma'))}
              </Text>
            </TouchableOpacity>
          </View>
          {showTimePicker && Platform.OS !== 'web' && (
            Platform.OS === 'android' ? (
              <DateTimePicker
                value={pickerDate}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={handleTimePickerChange}
              />
            ) : (
              <Modal
                transparent={true}
                animationType="slide"
                visible={showTimePicker}
                onRequestClose={() => setShowTimePicker(false)}
              >
                <View style={styles.pickerModalOverlay}>
                  <View style={styles.pickerModalContainer}>
                    <View style={styles.pickerModalHeader}>
                      <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                        <Text style={styles.pickerModalCancelText}>Cancelar</Text>
                      </TouchableOpacity>
                      <Text style={styles.pickerModalTitle}>Seleccionar Hora</Text>
                      <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                        <Text style={styles.pickerModalConfirmText}>Hecho</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={pickerDate}
                      mode="time"
                      is24Hour={false}
                      display="spinner"
                      textColor="#000000"
                      onChange={handleTimePickerChange}
                    />
                  </View>
                </View>
              </Modal>
            )
          )}
        </SafeAreaView>
      </Modal>

      {/* Real-time Alarm Ringing Overlay */}
      {activeAlarm && (
        <AlarmTriggerOverlay
          visible={!!activeAlarm}
          medicationName={activeAlarm?.medication?.name || ''}
          medicationDose={activeAlarm?.medication?.dose || ''}
          medicationIcon={activeAlarm?.medication?.icon || 'pill'}
          medicationIconBg={activeAlarm?.medication?.iconBg || '#007aff'}
          medicationFrequency={activeAlarm?.medication?.frequency || ''}
          alarmTime={activeAlarm?.alarm?.time || ''}
          onTake={() => handleAlarmTake(activeAlarm?.medication?.id, activeAlarm?.alarm?.id)}
          onSnooze={() => handleAlarmSnooze(activeAlarm?.medication?.id, activeAlarm?.alarm?.id)}
        />
      )}
      {isProcessingOCR && (
        <Modal transparent animationType="fade" visible={isProcessingOCR}>
          <View style={styles.ocrLoaderOverlay}>
            <View style={styles.ocrLoaderContent}>
              <ActivityIndicator size="large" color="#003d9b" style={{ marginBottom: 16 }} />
              <Text style={styles.ocrLoaderTitle}>Analizando Receta con Gemini</Text>
              <Text style={styles.ocrLoaderDesc}>Extrayendo medicamentos, dosis y horarios de tu foto...</Text>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
    </GestureHandlerRootView>
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
  doctorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#edeef0',
  },
  doctorAvatarText: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#003d9b',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 140, // Extra padding at the bottom
  },
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#edeef0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressCardLeft: {
    flex: 1,
    paddingRight: 10,
  },
  progressCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#003d9b',
    marginBottom: 4,
  },
  progressCardDesc: {
    fontSize: 13,
    color: '#737685',
    lineHeight: 18,
    marginBottom: 10,
  },
  completedBadge: {
    backgroundColor: '#82f9be',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00734c',
  },
  progressRingWrapper: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingOuter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 6,
    borderColor: '#006c47', // Completed color
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#006c47',
  },
  newAlarmCard: {
    backgroundColor: '#003d9b',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  newAlarmLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newAlarmIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newAlarmTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  newAlarmDesc: {
    fontSize: 12,
    color: '#ffffffd0',
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191c1e',
    marginBottom: 14,
  },
  alarmCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edeef0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  swipeableContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  deleteSwipeBtn: {
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 74,
    height: '100%',
  },
  inactiveCard: {
    opacity: 0.6,
  },
  alarmContent: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  alarmTime: {
    fontSize: 18,
    fontWeight: '800',
    color: '#191c1e',
  },
  timeBadge: {
    backgroundColor: '#ffddb3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  timeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#624000',
  },
  alarmMedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191c1e',
  },
  alarmDose: {
    fontSize: 12,
    color: '#737685',
    marginTop: 2,
  },
  inactiveText: {
    textDecorationLine: 'line-through',
    color: '#737685',
  },
  completedLink: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  completedLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#737685',
    textDecorationLine: 'underline',
  },
  fab: {
    position: 'absolute',
    bottom: 90, // Positioned safely above the bottom navigation bar
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#003d9b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(25, 28, 30, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  // Fullscreen Modal Styles
  fsContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  fsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 28 : 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
    backgroundColor: '#ffffff',
  },
  fsHeaderLeft: {
    width: 100,
    alignItems: 'flex-start',
  },
  fsHeaderLink: {
    color: '#007aff',
    fontSize: 17,
  },
  fsHeaderLinkCancel: {
    color: '#007aff',
    fontSize: 17,
  },
  fsHeaderTitleCenter: {
    flex: 1,
    alignItems: 'center',
  },
  fsHeaderMedName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  fsHeaderMedDose: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 1,
  },
  fsHeaderRight: {
    width: 100,
    alignItems: 'flex-end',
  },
  fsBody: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  fsBodyContent: {
    paddingBottom: 60,
  },
  fsCalendarWrapper: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  fsCalendarIconBg: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e5ea',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  fsDotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 3,
  },
  fsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fsMainTitle: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    color: '#000000',
    marginBottom: 24,
  },
  fsSectionLabel: {
    fontSize: 13,
    color: '#8e8e93',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  fsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  fsCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fsCardText: {
    fontSize: 17,
    color: '#000000',
  },
  fsCardLink: {
    fontSize: 17,
    color: '#007aff',
  },
  fsDivider: {
    height: 1,
    backgroundColor: '#e5e5ea',
    marginLeft: 16,
  },
  fsInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
    color: '#000000',
  },
  fsDropdown: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  fsDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  fsDropdownText: {
    fontSize: 16,
    color: '#333',
  },
  fsDropdownTextActive: {
    color: '#007aff',
    fontWeight: '600',
  },
  fsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fsMinusBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fsMinusInner: {
    width: 10,
    height: 2,
    backgroundColor: '#ffffff',
  },
  fsTimePill: {
    backgroundColor: '#e5e5ea',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fsTimePillText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  fsDoseLabel: {
    fontSize: 16,
    color: '#007aff',
    fontWeight: '500',
  },
  fsPlusBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#34c759',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fsAddText: {
    fontSize: 17,
    color: '#007aff',
    fontWeight: '500',
  },
  fsNote: {
    fontSize: 13,
    color: '#8e8e93',
    marginHorizontal: 20,
    marginTop: 8,
    lineHeight: 18,
  },
  iconSelectButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconSelectButtonActive: {
    borderColor: '#007aff',
  },
  iconSelectText: {
    fontSize: 24,
  },
  fsDurationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fsDurationCol: {
    flex: 1,
  },
  fsDurationLabel: {
    fontSize: 11,
    color: '#8e8e93',
    marginBottom: 4,
  },
  fsDurationVal: {
    fontSize: 17,
    color: '#000000',
    fontWeight: '500',
  },
  fsFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
    backgroundColor: '#ffffff',
  },
  fsNextBtn: {
    backgroundColor: '#007aff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  fsNextBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
  inlineEditor: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f2f2f7',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineInput: {
    width: 44,
    height: 36,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d1d6',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  inlineColon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8e8e93',
  },
  inlineAmPmContainer: {
    flexDirection: 'row',
    backgroundColor: '#e5e5ea',
    borderRadius: 8,
    padding: 2,
  },
  inlineAmPmBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  inlineAmPmBtnActive: {
    backgroundColor: '#ffffff',
  },
  inlineAmPmText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8e8e93',
  },
  inlineAmPmTextActive: {
    color: '#007aff',
  },
  inlineSaveBtn: {
    backgroundColor: '#34c759',
    padding: 8,
    borderRadius: 8,
  },
  // Custom Calendar Styles
  calMonthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  calMonthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    textTransform: 'capitalize',
  },
  calNavBtn: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007aff',
    paddingHorizontal: 6,
  },
  calDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
  },
  calDayHeaderCell: {
    width: 32,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#8e8e93',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingVertical: 10,
    rowGap: 8,
  },
  calCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calCellSelected: {
    backgroundColor: '#007aff',
  },
  calCellSelectedStart: {
    backgroundColor: '#007aff',
    borderRadius: 18,
  },
  calCellSelectedEnd: {
    backgroundColor: '#34c759',
    borderRadius: 18,
  },
  calCellInRange: {
    backgroundColor: '#e3f2fd',
    borderRadius: 0,
  },
  calCellTextInRange: {
    color: '#007aff',
    fontWeight: '600',
  },
  calCellText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  calCellTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  calCellEmpty: {
    width: 36,
    height: 36,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  pickerModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 40,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  pickerModalCancelText: {
    fontSize: 16,
    color: '#ff3b30',
  },
  pickerModalConfirmText: {
    fontSize: 16,
    color: '#007aff',
    fontWeight: '600',
  },
  ocrLoaderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ocrLoaderContent: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  ocrLoaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#003d9b',
    marginBottom: 8,
    textAlign: 'center',
  },
  ocrLoaderDesc: {
    fontSize: 14,
    color: '#737685',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Completed Modal Styles
  completedModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  completedModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edeef0',
  },
  completedModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#003d9b',
  },
  noCompletedText: {
    textAlign: 'center',
    color: '#737685',
    marginVertical: 24,
    fontSize: 14,
  },
  completedMedGroup: {
    marginBottom: 16,
  },
  completedMedName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#191c1e',
    marginBottom: 8,
  },
  completedAlarmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#82f9be20',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  completedAlarmText: {
    fontSize: 13,
    color: '#00734c',
    fontWeight: '600',
  },
});


