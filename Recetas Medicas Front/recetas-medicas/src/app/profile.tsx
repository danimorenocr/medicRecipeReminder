import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wifi, Plus, Phone, FileText, Calendar, ShieldAlert, Award, Heart, Edit2 } from 'lucide-react-native';

export default function ProfileScreen() {
  const patient = {
    name: "Ricardo Alarcón",
    age: "42 años",
    rh: "O Negativo",
    status: "Asegurado",
  };

  const chronicConditions = [
    { id: 1, name: "Hipertensión Arterial", date: "Diagnosticado: Enero 2019", status: "ESTABLE", statusColor: '#00734c', statusBg: '#82f9be', icon: '📈' },
    { id: 2, name: "Asma Leve", date: "Diagnosticado: Marzo 2005", status: "CONTROLADO", statusColor: '#ffddb3', statusBg: '#7d5200', icon: '🫁' }
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fb" />
      
      {/* Header matching screenshot */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.doctorAvatar}>
            <Text style={styles.doctorAvatarText}>👩‍⚕️</Text>
          </View>
          <Text style={styles.headerTitle}>MediAssist AI</Text>
        </View>
        <Wifi color="#191c1e" size={20} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* Profile Card Info */}
        <View style={styles.profileInfoSection}>
          <View style={styles.avatarBigWrapper}>
            <View style={styles.avatarBig}>
              <Text style={styles.avatarBigText}>👨</Text>
            </View>
            <TouchableOpacity style={styles.editBtn} activeOpacity={0.8}>
              <Edit2 color="#ffffff" size={14} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.profileName}>{patient.name}</Text>
          
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Calendar size={12} color="#737685" style={{ marginRight: 4 }} />
              <Text style={styles.badgeText}>{patient.age}</Text>
            </View>
            <View style={styles.badge}>
              <Heart size={12} color="#003d9b" style={{ marginRight: 4 }} />
              <Text style={styles.badgeText}>{patient.rh}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#82f9be' }]}>
              <Text style={[styles.badgeText, { color: '#00734c', fontWeight: '700' }]}>✓ {patient.status}</Text>
            </View>
          </View>

          {/* Export PDF Button */}
          <TouchableOpacity style={styles.exportBtn} activeOpacity={0.85}>
            <FileText color="#ffffff" size={16} style={{ marginRight: 8 }} />
            <Text style={styles.exportBtnText}>Exportar Historial PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Alergias Críticas Card */}
        <View style={styles.allergiesCard}>
          <View style={styles.cardHeaderRow}>
            <ShieldAlert color="#ba1a1a" size={20} />
            <Text style={styles.allergiesTitle}>Alergias Críticas</Text>
          </View>
          
          <View style={styles.allergyChipsGrid}>
            <View style={styles.allergyChip}>
              <View style={styles.redDot} />
              <Text style={styles.allergyText}>Penicilina</Text>
            </View>
            <View style={styles.allergyChip}>
              <View style={styles.redDot} />
              <Text style={styles.allergyText}>Frutos Secos</Text>
            </View>
            <View style={styles.allergyChip}>
              <View style={styles.redDot} />
              <Text style={styles.allergyText}>Látex</Text>
            </View>
          </View>

          <Text style={styles.allergiesWarning}>
            * Notificar a personal médico antes de cualquier intervención.
          </Text>
        </View>

        {/* Condiciones Crónicas Card */}
        <View style={styles.whiteCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={{ fontSize: 18 }}>📝</Text>
            <Text style={styles.cardTitle}>Condiciones Crónicas</Text>
            <TouchableOpacity style={styles.plusIconWrapper}>
              <Plus color="#003d9b" size={20} />
            </TouchableOpacity>
          </View>

          {chronicConditions.map(cond => (
            <View key={cond.id} style={styles.conditionRow}>
              <View style={styles.conditionIconBg}>
                <Text style={{ fontSize: 16 }}>{cond.icon}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.conditionName}>{cond.name}</Text>
                <Text style={styles.conditionDate}>{cond.date}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: cond.statusBg + '30' }]}>
                <Text style={[styles.statusBadgeText, { color: cond.statusBg }]}>{cond.status}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Contactos de Emergencia Card */}
        <View style={styles.whiteCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={{ fontSize: 18 }}>📇</Text>
            <Text style={styles.cardTitle}>Contactos de Emergencia</Text>
          </View>

          {/* Contact 1 */}
          <View style={styles.contactRow}>
            <View style={styles.contactAvatar}>
              <Text style={{ fontSize: 16 }}>👤</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.contactName}>Elena Alarcón</Text>
              <Text style={styles.contactDesc}>Esposa (Contacto Primario)</Text>
            </View>
            <TouchableOpacity style={styles.phoneBtn} activeOpacity={0.7}>
              <Phone color="#00734c" size={16} />
            </TouchableOpacity>
          </View>

          {/* Contact 2 */}
          <View style={styles.contactRow}>
            <View style={styles.contactAvatar}>
              <Text style={{ fontSize: 16 }}>👤</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.contactName}>Dr. Carlos Mendoza</Text>
              <Text style={styles.contactDesc}>Cardiólogo Personal</Text>
            </View>
            <TouchableOpacity style={[styles.phoneBtn, { backgroundColor: '#82f9be30' }]} activeOpacity={0.7}>
              <Text style={{ fontSize: 14 }}>🏥</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Resumen de Actividad Vital Card */}
        <View style={styles.vitalCard}>
          <Text style={styles.vitalTitle}>Resumen de Actividad Vital</Text>
          <Text style={styles.vitalDesc}>
            Su MediAssist AI está monitorizando sus constantes vitales en tiempo real para predecir cualquier anomalía.
          </Text>
          
          <View style={styles.vitalGrid}>
            <View style={styles.vitalCol}>
              <Text style={styles.vitalLabel}>RITMO</Text>
              <Text style={styles.vitalVal}>72 lpm</Text>
            </View>
            <View style={styles.vitalCol}>
              <Text style={styles.vitalLabel}>SPO2</Text>
              <Text style={styles.vitalVal}>98%</Text>
            </View>
            <View style={styles.vitalCol}>
              <Text style={styles.vitalLabel}>SUEÑO</Text>
              <Text style={styles.vitalVal}>7.5 h</Text>
            </View>
          </View>
        </View>

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
    paddingTop: 20,
    paddingBottom: 130, // Safe bottom space for tab bar
  },
  profileInfoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarBigWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarBig: {
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: '#e1e2e4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#edeef0',
  },
  avatarBigText: {
    fontSize: 48,
  },
  editBtn: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#003d9b',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#191c1e',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#edeef0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#191c1e',
    fontWeight: '500',
  },
  exportBtn: {
    backgroundColor: '#003d9b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  exportBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  allergiesCard: {
    backgroundColor: '#ffdada30',
    borderColor: '#ba1a1a15',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  allergiesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ba1a1a',
    marginLeft: 8,
  },
  allergyChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  allergyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ba1a1a15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ba1a1a',
    marginRight: 6,
  },
  allergyText: {
    fontSize: 13,
    color: '#191c1e',
    fontWeight: '600',
  },
  allergiesWarning: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#ba1a1a',
  },
  whiteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edeef0',
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191c1e',
    marginLeft: 8,
    flex: 1,
  },
  plusIconWrapper: {
    padding: 4,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#edeef0',
  },
  conditionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#c4d2ff30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191c1e',
  },
  conditionDate: {
    fontSize: 12,
    color: '#737685',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#edeef0',
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191c1e',
  },
  contactDesc: {
    fontSize: 12,
    color: '#737685',
    marginTop: 2,
  },
  phoneBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#82f9be30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vitalCard: {
    backgroundColor: '#001848',
    borderRadius: 16,
    padding: 20,
    marginBottom: 10,
  },
  vitalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  vitalDesc: {
    fontSize: 13,
    color: '#ffffffa0',
    lineHeight: 18,
    marginBottom: 20,
  },
  vitalGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vitalCol: {
    alignItems: 'center',
    width: '30%',
  },
  vitalLabel: {
    fontSize: 11,
    color: '#ffffff80',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  vitalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
