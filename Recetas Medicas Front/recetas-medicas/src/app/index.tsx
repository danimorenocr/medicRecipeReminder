import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Briefcase, Camera, Wifi, Activity, Lightbulb, Heart, Clock, Bell, MessageSquare, User, Plus } from 'lucide-react-native';
import { API_URL } from '../constants/api';

export default function SummaryScreen() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/recipes`);
      if (!response.ok) {
        throw new Error('No se pudieron obtener las recetas');
      }
      const data = await response.json();
      setRecipes(data);
      setError(null);
    } catch (err: any) {
      console.error('Error al cargar recetas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRecipes();
    }, [fetchRecipes])
  );

  const latestRecipe = recipes[0]; // La lista viene ordenada descendente por id (última receta primero)

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
        {loading && recipes.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 }}>
            <ActivityIndicator size="large" color="#003d9b" />
            <Text style={{ marginTop: 12, color: '#737685', fontWeight: '600' }}>Cargando dashboard...</Text>
          </View>
        ) : (
          <>
            {/* Welcome & Info */}
            <View style={styles.welcomeSection}>
              <View>
                <Text style={styles.welcomeTitle}>¡Hola, Ricardo!</Text>
                <Text style={styles.welcomeSubtitle}>Tu salud está monitoreada y estable</Text>
              </View>
              <View style={styles.avatarCircle}>
                <Text style={{ fontSize: 20 }}>👨</Text>
              </View>
            </View>

            {/* Vitals Summary Card */}
            <View style={styles.vitalCardDashboard}>
              <Text style={styles.vitalCardTitle}>Tus Constantes Vitales</Text>
              <View style={styles.vitalGridDashboard}>
                <View style={styles.vitalColDashboard}>
                  <Text style={styles.vitalLabelDashboard}>RITMO</Text>
                  <Text style={styles.vitalValDashboard}>72 lpm</Text>
                </View>
                <View style={styles.vitalColDashboard}>
                  <Text style={styles.vitalLabelDashboard}>SPO2</Text>
                  <Text style={styles.vitalValDashboard}>98%</Text>
                </View>
                <View style={styles.vitalColDashboard}>
                  <Text style={styles.vitalLabelDashboard}>SUEÑO</Text>
                  <Text style={styles.vitalValDashboard}>7.5 h</Text>
                </View>
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

            {/* Card 1: Lo que significa tu receta */}
            <View style={styles.prescriptionMeaningCard}>
              <Text style={styles.prescriptionMeaningTitle}>Lo que significa tu receta</Text>
              {latestRecipe ? (
                renderMarkdown(latestRecipe.explicacion, styles.prescriptionMeaningText, false)
              ) : (
                <Text style={styles.prescriptionMeaningText}>
                  No tienes recetas activas. Presiona el botón 'Escanear Receta' arriba para digitalizar tu primera fórmula médica.
                </Text>
              )}
            </View>

            {/* Card 2: Estado Actual */}
            <View style={styles.statusCard}>
              <View style={styles.statusLabelRow}>
                <Activity color="#006c47" size={16} />
                <Text style={styles.statusLabel}>ESTADO ACTUAL</Text>
              </View>
              <Text style={styles.statusTitle}>
                {latestRecipe?.diagnostico_descripcion || (latestRecipe ? "Tratamiento Activo" : "Sin tratamientos activos")}
              </Text>
              <Text style={styles.statusSubtitle}>
                {latestRecipe
                  ? `Receta para ${latestRecipe.paciente_nombre || "el paciente"} emitida por ${latestRecipe.medico_nombre || "médico"} en ${latestRecipe.clinica_nombre || "clínica"}.`
                  : "Tu historial está limpio. Las recetas digitalizadas aparecerán aquí automáticamente."
                }
              </Text>
              <View style={styles.progressBarSection}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: latestRecipe ? '100%' : '0%' }]} />
                </View>
                <Text style={styles.progressText}>{latestRecipe ? "100%" : "0%"} completado</Text>
              </View>
            </View>

            {/* Card 3: Consejo Pro */}
            {latestRecipe && (
              <View style={styles.proTipCard}>
                <View style={styles.proTipHeader}>
                  <Lightbulb color="#FFAB00" size={16} fill="#FFAB00" />
                  <Text style={styles.proTipTitle}>CONSEJO PRO</Text>
                </View>
                <Text style={styles.proTipText}>
                  Toma tus medicamentos a las horas indicadas. Si experimentas efectos secundarios, consulta con tu médico de inmediato.
                </Text>
                {/* Mock Image Representation */}
                <View style={styles.mockImageContainer}>
                  <View style={styles.glassOfWater}>
                    <Text style={styles.mockImageEmoji}>🍋🥛</Text>
                    <Text style={styles.mockImageLabel}>Mantente hidratado durante tu recuperación</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Tus Medicamentos Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tus Medicamentos</Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>
                  {latestRecipe?.medicamentos ? `${latestRecipe.medicamentos.length} Activos` : "0 Activos"}
                </Text>
              </View>
            </View>

            {/* Dynamic Medications List */}
            {latestRecipe?.medicamentos && latestRecipe.medicamentos.map((med: any, index: number) => (
              <View key={med.id || index} style={styles.medCard}>
                <View style={index % 2 === 0 ? styles.medIconWrapperBlue : styles.medIconWrapperGreen}>
                  <Text style={index % 2 === 0 ? styles.medIconTextBlue : styles.medIconTextGreen}>💊</Text>
                </View>
                <View style={styles.medDetails}>
                  <View style={styles.medRow}>
                    <Text style={styles.medName}>{med.nombre} {med.dosis || ""}</Text>
                    <Text style={styles.medFreq}>{med.frecuencia}</Text>
                  </View>
                  <Text style={styles.medDesc}>Duración: {med.duracion || "No especificada"}</Text>
                  {med.brand_name && (
                    <Text style={[styles.medDesc, { fontSize: 11, fontStyle: 'italic', marginTop: 2 }]}>
                      Marca sugerida: {med.brand_name}
                    </Text>
                  )}
                  <View style={styles.medTimeRow}>
                    <Clock size={12} color="#737685" />
                    <Text style={styles.medTimeText}>Frecuencia: {med.frecuencia}</Text>
                  </View>
                </View>
              </View>
            ))}

            {(!latestRecipe || !latestRecipe.medicamentos || latestRecipe.medicamentos.length === 0) && (
              <View style={{ padding: 24, backgroundColor: '#ffffff', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#edeef0', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
                <Text style={{ fontSize: 14, color: '#737685', textAlign: 'center' }}>
                  No se encontraron medicamentos activos. Escanea una nueva fórmula para verla aquí.
                </Text>
              </View>
            )}

            {/* Configurar Alarmas Button */}
            <TouchableOpacity 
              style={styles.actionBtn} 
              activeOpacity={0.8}
              onPress={() => router.push('/alarms')}
            >
              <Bell color="#ffffff" size={20} style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnText}>Configurar Alarmas</Text>
            </TouchableOpacity>
            
            <Text style={styles.actionSubtext}>Te avisaremos 5 minutos antes de cada toma</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const renderMarkdown = (text: string, defaultStyle: any, isDarkHeader: boolean = false) => {
  if (!text) return null;

  const lines = text.split('\n');
  return lines.map((line, lineIndex) => {
    let cleanLine = line.trim();
    if (!cleanLine) return <View key={lineIndex} style={{ height: 6 }} />;

    if (cleanLine.startsWith('###')) {
      const headerText = cleanLine.replace(/###\s*\**/g, '').replace(/\**/g, '').trim();
      return (
        <Text 
          key={lineIndex} 
          style={{ 
            fontSize: 15, 
            fontWeight: '800', 
            color: isDarkHeader ? '#191c1e' : '#ffffff', 
            marginTop: 10, 
            marginBottom: 4 
          }}
        >
          {headerText}
        </Text>
      );
    }

    if (cleanLine.startsWith('-')) {
      const bulletContent = cleanLine.substring(1).trim();
      return (
        <View key={lineIndex} style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 2, paddingLeft: 4 }}>
          <Text style={[defaultStyle, { marginRight: 6 }]}>•</Text>
          <Text style={[defaultStyle, { flex: 1 }]}>
            {parseInlineStyles(bulletContent, isDarkHeader)}
          </Text>
        </View>
      );
    }

    return (
      <Text key={lineIndex} style={[defaultStyle, { marginVertical: 3, lineHeight: 18 }]}>
        {parseInlineStyles(cleanLine, isDarkHeader)}
      </Text>
    );
  });
};

const parseInlineStyles = (text: string, isDarkHeader: boolean) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={index} style={{ fontWeight: '800', color: isDarkHeader ? '#191c1e' : '#ffffff' }}>
          {part.substring(2, part.length - 2)}
        </Text>
      );
    }
    return part;
  });
};

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
    paddingBottom: 120, // Extra space at the bottom to prevent covering
  },
  prescriptionMeaningCard: {
    backgroundColor: '#003d9b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  prescriptionMeaningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
  },
  prescriptionMeaningText: {
    fontSize: 14,
    color: '#ffffffd0',
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#edeef0',
    marginBottom: 16,
  },
  statusLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006c47',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191c1e',
    marginBottom: 6,
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#737685',
    lineHeight: 18,
    marginBottom: 14,
  },
  progressBarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#edeef0',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#006c47',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006c47',
  },
  proTipCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#edeef0',
    borderLeftWidth: 4,
    borderLeftColor: '#FFAB00',
    marginBottom: 24,
  },
  proTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  proTipTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5e3c00',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  proTipText: {
    fontSize: 13,
    color: '#191c1e',
    lineHeight: 18,
    marginBottom: 12,
  },
  mockImageContainer: {
    height: 100,
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#edeef0',
  },
  glassOfWater: {
    alignItems: 'center',
  },
  mockImageEmoji: {
    fontSize: 28,
  },
  mockImageLabel: {
    fontSize: 11,
    color: '#737685',
    marginTop: 4,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191c1e',
  },
  activeBadge: {
    backgroundColor: '#82f9be',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00734c',
  },
  medCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edeef0',
    padding: 16,
    flexDirection: 'row',
    marginBottom: 12,
  },
  medIconWrapperBlue: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#c4d2ff30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medIconTextBlue: {
    fontSize: 18,
  },
  medIconWrapperGreen: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#82f9be30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medIconTextGreen: {
    fontSize: 18,
  },
  medDetails: {
    flex: 1,
  },
  medRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  medName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#191c1e',
  },
  medFreq: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00734c',
  },
  medDesc: {
    fontSize: 13,
    color: '#737685',
    marginTop: 4,
    lineHeight: 18,
  },
  medTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  medTimeText: {
    fontSize: 12,
    color: '#737685',
    marginLeft: 6,
    fontWeight: '500',
  },
  actionBtn: {
    backgroundColor: '#003d9b',
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#003d9b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  actionSubtext: {
    fontSize: 11,
    color: '#737685',
    textAlign: 'center',
    marginTop: 8,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    backgroundColor: '#edeef0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#edeef0',
  },
  vitalCardDashboard: {
    backgroundColor: '#001848',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  vitalCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  vitalGridDashboard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vitalColDashboard: {
    alignItems: 'center',
    width: '30%',
  },
  vitalLabelDashboard: {
    fontSize: 10,
    color: '#ffffff80',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  vitalValDashboard: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
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
});
