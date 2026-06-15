import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Platform, useWindowDimensions, Vibration } from 'react-native';
import { Pill, Droplet, Heart, Syringe, Thermometer, FlaskConical, Check, Clock, Utensils } from 'lucide-react-native';
import { Audio } from 'expo-av';

interface AlarmTriggerOverlayProps {
  visible: boolean;
  medicationName: string;
  medicationDose: string;
  medicationIcon: string;
  medicationIconBg: string;
  medicationFrequency?: string;
  alarmTime: string;
  onTake: () => void;
  onSnooze: () => void;
}

export default function AlarmTriggerOverlay({
  visible,
  medicationName,
  medicationDose,
  medicationIcon,
  medicationIconBg,
  medicationFrequency = "Cada 12 horas",
  alarmTime,
  onTake,
  onSnooze
}: AlarmTriggerOverlayProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [soundInstance, setSoundInstance] = useState<any>(null);
  const [pulseScale, setPulseScale] = useState(1);

  // Sound play & stop logic
  useEffect(() => {
    let webIntervalId: any = null;
    let nativeSound: Audio.Sound | null = null;

    async function startAlarmSound() {
      // Vibrate pattern: 500ms vibrate, 1000ms pause, repeat
      if (Platform.OS !== 'web') {
        try {
          Vibration.vibrate([500, 1000], true);
        } catch (err) {
          console.error("Vibration error:", err);
        }
      }

      if (Platform.OS === 'web') {
        try {
          const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            webIntervalId = setInterval(() => {
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, audioCtx.currentTime);
              gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.5);
            }, 1000);
          }
        } catch (e) {
          console.error("Web Audio error:", e);
        }
      } else {
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            staysActiveInBackground: true,
            playThroughEarpieceAndroid: false
          });

          // Use the locally bundled alarm sound to prevent network resolution errors
          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/alarm.mp3'),
            { shouldPlay: true, isLooping: true, volume: 1.0 }
          );
          nativeSound = sound;
          setSoundInstance(sound);
        } catch (e) {
          console.error("Native Audio error (vibration will still run):", e);
        }
      }
    }

    if (visible) {
      startAlarmSound();
      
      // Pulse animation interval
      const animInterval = setInterval(() => {
        setPulseScale(prev => (prev === 1 ? 1.15 : 1));
      }, 1000);

      return () => {
        clearInterval(animInterval);
        
        // Stop vibration
        if (Platform.OS !== 'web') {
          try {
            Vibration.cancel();
          } catch (err) {
            console.error("Error cancelling vibration:", err);
          }
        }

        // Clean up web audio
        if (webIntervalId) {
          clearInterval(webIntervalId);
        }
        
        // Clean up native audio
        if (nativeSound) {
          nativeSound.stopAsync().then(() => {
            nativeSound?.unloadAsync();
          }).catch(err => console.error("Sound unloading error:", err));
        }
      };
    }
  }, [visible]);

  const renderMedIcon = () => {
    const iconColor = '#ffffff';
    switch (medicationIcon) {
      case 'pill':
        return <Pill color={iconColor} size={44} style={styles.pillIconRotated} />;
      case 'droplet':
        return <Droplet color={iconColor} size={44} />;
      case 'flask':
        return <FlaskConical color={iconColor} size={44} />;
      case 'syringe':
        return <Syringe color={iconColor} size={44} />;
      case 'thermometer':
        return <Thermometer color={iconColor} size={44} />;
      case 'heart':
        return <Heart color={iconColor} size={44} />;
      default:
        return <Pill color={iconColor} size={44} style={styles.pillIconRotated} />;
    }
  };

  // Extract digits for big time display (e.g. "11:52" from "11:52 AM")
  const displayTime = alarmTime ? alarmTime.split(' ')[0] : '12:00';

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.container}>
        
        {/* Central Pill Badge at Top */}
        <View style={styles.centerSection}>
          {/* Concentric ripples */}
          <View style={[styles.ripple, { width: 130 * pulseScale, height: 130 * pulseScale, borderRadius: 65 * pulseScale, opacity: 0.12 }]} />
          <View style={[styles.ripple, { width: 160 * pulseScale, height: 160 * pulseScale, borderRadius: 80 * pulseScale, opacity: 0.06 }]} />

          <View style={styles.iconContainer}>
            {renderMedIcon()}
          </View>
        </View>

        {/* Time and Alarm Title */}
        <View style={styles.topSection}>
          <Text style={styles.alarmTime}>{displayTime}</Text>
          <Text style={styles.subtitle}>Hora de la toma</Text>
        </View>

        {/* Medicine detail info */}
        <View style={styles.medicationInfoSection}>
          <Text style={styles.medicationName}>{medicationName}</Text>
          
          <View style={styles.medicationDetailsRow}>
            <Utensils size={16} color="#a5b4fc" style={{ marginRight: 6 }} />
            <Text style={styles.medicationDose}>
              {medicationDose} - {medicationFrequency}
            </Text>
          </View>
        </View>

        {/* Cellphone-style Snooze / Take buttons at bottom */}
        <View style={styles.bottomButtonsSection}>
          {/* Take medicine button (Solid Blue Primary) */}
          <TouchableOpacity
            style={styles.takeButton}
            activeOpacity={0.8}
            onPress={onTake}
          >
            <View style={styles.checkIconWrapper}>
              <Check size={14} color="#0056d2" strokeWidth={3.5} />
            </View>
            <Text style={styles.takeButtonText}>Confirmar Toma</Text>
          </TouchableOpacity>

          {/* Snooze button (Translucent gray-blue with border) */}
          <TouchableOpacity
            style={styles.snoozeButton}
            activeOpacity={0.85}
            onPress={onSnooze}
          >
            <Clock size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.snoozeButtonText}>Posponer 10 min</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1738', // Deep premium midnight blue gradient theme
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  topSection: {
    alignItems: 'center',
    marginTop: -20,
  },
  alarmTime: {
    fontSize: 68,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#a5b4fc', // Light purple/blue HSL tone
    letterSpacing: 3,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  centerSection: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 180,
    width: 180,
    marginTop: 40,
  },
  ripple: {
    position: 'absolute',
    backgroundColor: '#0056d2',
  },
  iconContainer: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#0056d2', // Solid vivid blue circular badge
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0056d2',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  pillIconRotated: {
    transform: [{ rotate: '45deg' }],
  },
  medicationInfoSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: -20,
  },
  medicationName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  medicationDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    opacity: 0.9,
  },
  medicationDose: {
    fontSize: 15,
    color: '#a5b4fc',
    fontWeight: '500',
  },
  bottomButtonsSection: {
    width: '100%',
    gap: 12,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  takeButton: {
    width: '100%',
    backgroundColor: '#004ebd', // Solid blue primary button
    borderRadius: 16,
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#004ebd',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkIconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  takeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  snoozeButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  snoozeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.9,
  },
});
