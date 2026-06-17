import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wifi, Plus, Phone, FileText, Calendar, ShieldAlert, Award, Heart, Edit2, Lock, User as UserIcon, Save, X, HeartPulse } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { API_URL } from '../constants/api';

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [lastRecipe, setLastRecipe] = useState<any>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [tipoSangre, setTipoSangre] = useState('O+');
  const [alergias, setAlergias] = useState('');
  const [condicionBase, setCondicionBase] = useState('');
  const [sexo, setSexo] = useState('Femenino');

  const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  const fetchLastRecipe = async () => {
    try {
      console.log("[fetchLastRecipe] Fetching from:", `${API_URL}/api/recipes`);
      const response = await fetch(`${API_URL}/api/recipes`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          // data está ordenado por ID descendente (la última receta primero)
          setLastRecipe(data[0]);
        }
      }
    } catch (e) {
      console.error("Error al obtener recetas para el perfil:", e);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      console.log("[fetchProfile] Fetching from:", `${API_URL}/api/profile`);
      const response = await fetch(`${API_URL}/api/profile`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.username) {
          setProfile(data);
          // Pre-populate forms
          setUsername(data.username);
          setPassword(data.password || '');
          setFechaNacimiento(data.fecha_nacimiento || '');
          setTipoSangre(data.tipo_sangre || 'O+');
          setAlergias(data.alergias || '');
          setCondicionBase(data.condicion_base || '');
          setSexo(data.sexo || 'Femenino');
        } else {
          setProfile(null);
        }
      } else {
        console.error("Error al cargar perfil, status:", response.status);
      }
    } catch (e) {
      console.error("Error al obtener perfil del backend:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchLastRecipe();
  }, []);


  const handleSave = async () => {
    if (!username.trim() || !fechaNacimiento.trim()) {
      Alert.alert("Campos requeridos", "Por favor ingresa un nombre de usuario y tu fecha de nacimiento.");
      return;
    }

    // Basic date validation YYYY-MM-DD or DD-MM-YYYY
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const dateRegexAlt = /^\d{2}-\d{2}-\d{4}$/;
    if (!dateRegex.test(fechaNacimiento) && !dateRegexAlt.test(fechaNacimiento)) {
      Alert.alert("Formato de fecha inválido", "Por favor ingresa la fecha en formato AAAA-MM-DD.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          fecha_nacimiento: fechaNacimiento,
          tipo_sangre: tipoSangre,
          alergias,
          condicion_base: condicionBase,
          sexo
        })
      });

      if (response.ok) {
        Alert.alert("Éxito", "Perfil guardado correctamente.");
        setIsEditing(false);
        await fetchProfile();
      } else {
        Alert.alert("Error", "No se pudo guardar el perfil.");
      }
    } catch (e) {
      console.error("Error al guardar perfil:", e);
      Alert.alert("Error de conexión", "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <ActivityIndicator size="large" color="#003d9b" />
        <Text style={{ marginTop: 12, color: '#737685' }}>Cargando perfil...</Text>
      </SafeAreaView>
    );
  }

  // Parse allergies and chronic conditions to lists/chips
  const parseList = (str: string) => {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(Boolean);
  };

  const allergyList = profile ? parseList(profile.alergias) : [];
  const conditionList = profile ? parseList(profile.condicion_base) : [];

  // If no profile exists and not editing/registering, show registration view
  if (!profile || isEditing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fb" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.doctorAvatar}>
              <HeartPulse color="#003d9b" size={20} />
            </View>
            <Text style={styles.headerTitle}>
              {profile ? "Editar Perfil" : "Registro de Paciente"}
            </Text>
          </View>
          {profile && (
            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelBtnIcon}>
              <X color="#191c1e" size={20} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {profile ? "Actualiza tus datos de salud" : "Crea tu perfil médico digital"}
            </Text>
            <Text style={styles.formSubtitle}>
              Esta información se guardará en tu dispositivo para personalizar tus alarmas y asistencia médica de IA.
            </Text>

            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre de Usuario / Nombre Completo</Text>
              <View style={styles.inputWrapper}>
                <UserIcon color="#737685" size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Ricardo Alarcón"
                  value={username}
                  onChangeText={setUsername}
                  placeholderTextColor="#a0a4b8"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña (para tu seguridad)</Text>
              <View style={styles.inputWrapper}>
                <Lock color="#737685" size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ingresa una contraseña"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor="#a0a4b8"
                />
              </View>
            </View>

            {/* Birthdate Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fecha de Nacimiento (AAAA-MM-DD)</Text>
              <View style={styles.inputWrapper}>
                <Calendar color="#737685" size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 1984-06-15"
                  value={fechaNacimiento}
                  onChangeText={setFechaNacimiento}
                  placeholderTextColor="#a0a4b8"
                />
              </View>
            </View>

            {/* Blood Type Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tipo de Sangre (RH)</Text>
              <View style={styles.bloodGrid}>
                {bloodTypes.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.bloodChip,
                      tipoSangre === type && styles.bloodChipSelected
                    ]}
                    onPress={() => setTipoSangre(type)}
                  >
                    <Text style={[
                      styles.bloodChipText,
                      tipoSangre === type && styles.bloodChipTextSelected
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Allergies Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Alergias Críticas (separadas por comas)</Text>
              <View style={styles.inputWrapper}>
                <ShieldAlert color="#ba1a1a" size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Penicilina, Frutos Secos, Látex"
                  value={alergias}
                  onChangeText={setAlergias}
                  placeholderTextColor="#a0a4b8"
                />
              </View>
            </View>

            {/* Base Condition Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Condiciones Crónicas / Base (separadas por comas)</Text>
              <View style={styles.inputWrapper}>
                <Award color="#003d9b" size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Hipertensión Arterial, Asma Leve"
                  value={condicionBase}
                  onChangeText={setCondicionBase}
                  placeholderTextColor="#a0a4b8"
                />
              </View>
            </View>

            {/* Sexo Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Sexo</Text>
              <View style={styles.btnRow}>
                {['Femenino', 'Masculino', 'Otro'].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.btn,
                      sexo === s ? styles.btnPrimary : styles.btnOutline
                    ]}
                    onPress={() => setSexo(s)}
                  >
                    <Text style={sexo === s ? styles.btnPrimaryText : styles.btnOutlineText}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Save and Cancel Buttons */}
            <View style={styles.btnRow}>
              {profile && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnOutline]}
                  onPress={() => setIsEditing(false)}
                >
                  <X color="#003d9b" size={18} style={{ marginRight: 6 }} />
                  <Text style={styles.btnOutlineText}>Cancelar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, !profile && { width: '100%' }]}
                onPress={handleSave}
              >
                <Save color="#ffffff" size={18} style={{ marginRight: 6 }} />
                <Text style={styles.btnPrimaryText}>Guardar Perfil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Display profile view when profile is registered and not editing
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fb" />
      
      {/* Header matching screenshot */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.doctorAvatar}>
            <HeartPulse color="#0052cc" size={18} />
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
              <UserIcon color="#0052cc" size={38} />
            </View>
            <TouchableOpacity 
              style={styles.editBtn} 
              activeOpacity={0.8}
              onPress={() => setIsEditing(true)}
            >
              <Edit2 color="#ffffff" size={14} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.profileName}>{profile.username}</Text>
          
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Calendar size={12} color="#737685" style={{ marginRight: 4 }} />
              <Text style={styles.badgeText}>{profile.edad} años</Text>
            </View>
            <View style={styles.badge}>
              <Heart size={12} color="#0052cc" style={{ marginRight: 4 }} />
              <Text style={styles.badgeText}>{profile.tipo_sangre}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{profile.sexo || 'Femenino'}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#e1f7ec' }]}>
              <Text style={[styles.badgeText, { color: '#00a86b', fontWeight: '700' }]}>✓ Asegurado</Text>
            </View>
          </View>

          {/* Export PDF Button */}
          <TouchableOpacity style={styles.exportBtn} activeOpacity={0.85}>
            <FileText color="#ffffff" size={16} style={{ marginRight: 8 }} />
            <Text style={styles.exportBtnText}>Exportar Historial PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Alergias Críticas Card */}
        <View style={[styles.allergiesCard, allergyList.length === 0 && { backgroundColor: '#f1f3f9', borderColor: '#dcdfe9' }]}>
          <View style={styles.cardHeaderRow}>
            <ShieldAlert color={allergyList.length > 0 ? "#ba1a1a" : "#737685"} size={20} />
            <Text style={[styles.allergiesTitle, allergyList.length === 0 && { color: '#44474e' }]}>
              Alergias Críticas
            </Text>
          </View>
          
          {allergyList.length > 0 ? (
            <View style={styles.allergyChipsGrid}>
              {allergyList.map((allergy, index) => (
                <View key={index} style={styles.allergyChip}>
                  <View style={styles.redDot} />
                  <Text style={styles.allergyText}>{allergy}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: '#737685', marginBottom: 12 }}>Ninguna alergia registrada.</Text>
          )}

          {allergyList.length > 0 && (
            <Text style={styles.allergiesWarning}>
              * Notificar a personal médico antes de cualquier intervención.
            </Text>
          )}
        </View>

        {/* Condiciones Crónicas Card */}
        <View style={styles.whiteCard}>
          <View style={styles.cardHeaderRow}>
            <Award color="#0052cc" size={20} />
            <Text style={styles.cardTitle}>Condiciones Crónicas</Text>
            <TouchableOpacity style={styles.plusIconWrapper} onPress={() => setIsEditing(true)}>
              <Plus color="#0052cc" size={20} />
            </TouchableOpacity>
          </View>

          {conditionList.length > 0 ? (
            conditionList.map((cond, index) => (
              <View key={index} style={styles.conditionRow}>
                <View style={styles.conditionIconBg}>
                  <FileText color="#0052cc" size={16} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.conditionName}>{cond}</Text>
                  <Text style={styles.conditionDate}>Condición de base activa</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#e1f7ec' }]}>
                  <Text style={[styles.statusBadgeText, { color: '#00a86b' }]}>ESTABLE</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 13, color: '#737685', paddingVertical: 12 }}>Ninguna condición crónica de base registrada.</Text>
          )}
        </View>

        {/* Contactos de Emergencia Card */}
        <View style={styles.whiteCard}>
          <View style={styles.cardHeaderRow}>
            <Phone color="#0052cc" size={20} />
            <Text style={styles.cardTitle}>Contactos de Emergencia</Text>
          </View>

          {/* Contact 1 - Doctor */}
          <View style={styles.contactRow}>
            <View style={styles.contactAvatar}>
              <HeartPulse color="#0052cc" size={18} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.contactName}>
                {lastRecipe ? `Dra. ${lastRecipe.medico_nombre}` : 'Elena Alarcón'}
              </Text>
              <Text style={styles.contactDesc}>
                {lastRecipe ? `${lastRecipe.medico_especialidad || 'Medicina General'} (Último Médico)` : 'Esposa (Contacto Primario)'}
              </Text>
            </View>
            <TouchableOpacity style={styles.phoneBtn} activeOpacity={0.7}>
              <Phone color="#00a86b" size={16} />
            </TouchableOpacity>
          </View>

          {/* Contact 2 - Clínica */}
          <View style={styles.contactRow}>
            <View style={styles.contactAvatar}>
              <Award color="#0052cc" size={18} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.contactName}>
                {lastRecipe ? lastRecipe.clinica_nombre : 'Dr. Carlos Mendoza'}
              </Text>
              <Text style={styles.contactDesc}>
                {lastRecipe ? lastRecipe.clinica_direccion : 'Cardiólogo Personal'}
              </Text>
            </View>
            <TouchableOpacity style={[styles.phoneBtn, { backgroundColor: '#e1f7ec' }]} activeOpacity={0.7}>
              <Phone color="#00a86b" size={16} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Urgencias y Hospitales Card */}
        <TouchableOpacity 
          style={styles.urgenciasCard}
          onPress={() => router.push('/explore')}
        >
          <View style={styles.urgenciasHeaderRow}>
            <View style={styles.urgenciasIconBg}>
              <ShieldAlert color="#ba1a1a" size={22} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.urgenciasTitle}>Urgencias y Hospitales 24h</Text>
              <Text style={styles.urgenciasDesc}>Localizar clínica recomendada por GPS</Text>
            </View>
            <Text style={styles.urgenciasArrow}>➔</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#c4d2ff30',
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
  cancelBtnIcon: {
    padding: 6,
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
    borderRadius: 45, // Circular avatar
    backgroundColor: '#f0f4fc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#edeef0',
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
  // Form styles
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#edeef0',
    padding: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#003d9b',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#737685',
    lineHeight: 18,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#191c1e',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fb',
    borderWidth: 1,
    borderColor: '#edeef0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#191c1e',
    height: '100%',
  },
  bloodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  bloodChip: {
    width: '22%',
    height: 40,
    backgroundColor: '#f8f9fb',
    borderWidth: 1,
    borderColor: '#edeef0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bloodChipSelected: {
    backgroundColor: '#003d9b',
    borderColor: '#003d9b',
  },
  bloodChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#44474e',
  },
  bloodChipTextSelected: {
    color: '#ffffff',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#003d9b',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#003d9b',
    backgroundColor: 'transparent',
  },
  btnOutlineText: {
    color: '#003d9b',
    fontSize: 14,
    fontWeight: '700',
  },
  urgenciasCard: {
    backgroundColor: '#ffebe9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffd0cb',
    padding: 16,
    marginBottom: 20,
  },
  urgenciasHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgenciasIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ffdbd8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgenciasTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ba1a1a',
  },
  urgenciasDesc: {
    fontSize: 12,
    color: '#410002',
    marginTop: 2,
  },
  urgenciasArrow: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ba1a1a',
  },
});
