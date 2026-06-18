import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Wifi, ArrowLeft, Info, Zap, ZoomIn, CheckCircle2, FileText, RefreshCw, Bell } from 'lucide-react-native';
import { API_URL, API_KEY } from '../constants/api';

export default function ScanScreen() {
  const router = useRouter();
  const [scanState, setScanState] = useState<'camera' | 'scanning' | 'success'>('camera');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const selectImage = async (useCamera: boolean) => {
    try {
      setError(null);
      let permissionResult;
      if (useCamera) {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (permissionResult.granted === false) {
        Alert.alert("Permiso Requerido", "Se requiere permiso para acceder a la cámara o galería.");
        return;
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      };

      const pickerResult = useCamera 
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (pickerResult.canceled) {
        return;
      }

      const uri = pickerResult.assets[0].uri;
      setSelectedImage(uri);
      await uploadImage(uri);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al seleccionar imagen");
      setScanState('camera');
    }
  };

  const uploadImage = async (uri: string) => {
    setScanState('scanning');
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
          'X-API-KEY': API_KEY,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Error en el servidor");
      }

      const data = await response.json();
      setResult(data);
      setScanState('success');
    } catch (err: any) {
      console.error('Error al subir imagen:', err);
      setError(err.message || "Error al procesar la receta");
      setScanState('camera');
      Alert.alert("Error de Escaneo", err.message || "No se pudo procesar la receta. Por favor intenta de nuevo.");
    }
  };

  const triggerScan = () => {
    if (Platform.OS === 'web') {
      selectImage(false);
      return;
    }
    
    Alert.alert(
      "Digitalizar Receta",
      "¿Cómo deseas cargar la imagen de la receta?",
      [
        { text: "Cámara (Tomar foto)", onPress: () => selectImage(true) },
        { text: "Galería (Elegir existente)", onPress: () => selectImage(false) },
        { text: "Cancelar", style: "cancel" }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header matching screenshot */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => scanState === 'success' ? setScanState('camera') : router.back()} style={styles.backBtn}>
            <ArrowLeft color="#191c1e" size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MediAssist AI</Text>
        </View>
        <View style={styles.doctorAvatar}>
          <Text style={styles.doctorAvatarText}>👩‍⚕️</Text>
        </View>
      </View>

      {scanState === 'camera' && (
        <View style={styles.cameraContainer}>
          {/* Camera Viewfinder Mock */}
          <View style={styles.viewfinder}>
            {/* Corner Markers */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Instruction Overlay */}
            <View style={styles.instructionOverlay}>
              <Info color="#ffffff" size={14} />
              <Text style={styles.instructionText}>Centra la receta en el marco</Text>
            </View>

            {/* Viewfinder Controls on Right */}
            <View style={styles.viewfinderControls}>
              <TouchableOpacity style={styles.controlBtn}>
                <Zap color="#ffffff" size={18} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlBtn, { marginTop: 12 }]}>
                <ZoomIn color="#ffffff" size={18} />
              </TouchableOpacity>
            </View>

            {/* Prescripción preview layout inside viewfinder */}
            <View style={styles.documentMock}>
              <View style={styles.docLine} />
              <View style={[styles.docLine, { width: '80%' }]} />
              <View style={[styles.docLine, { width: '60%' }]} />
            </View>
          </View>

          {/* Action Trigger Area at Bottom half */}
          <View style={styles.actionContainer}>
            <Text style={styles.actionTitle}>Digitalizar Fórmula Médica</Text>
            <Text style={styles.actionDesc}>
              Presiona el botón para tomar la foto. Nuestra Inteligencia Artificial extraerá automáticamente medicamentos y dosis.
            </Text>
            
            <TouchableOpacity style={styles.scanTriggerBtn} onPress={triggerScan}>
              <Text style={styles.scanTriggerText}>Tomar Foto e Iniciar Escaneo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {scanState === 'scanning' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#003d9b" />
          <Text style={styles.loadingTitle}>Procesando con Gemini Vision...</Text>
          <Text style={styles.loadingDesc}>
            Extrayendo texto médico, dosis prescritas y frecuencias estructuradas.
          </Text>
        </View>
      )}

      {scanState === 'success' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.successAlert}>
            <CheckCircle2 color="#006c47" size={24} fill="#82f9be" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.alertTitle}>¡Fórmula Digitalizada!</Text>
              <Text style={styles.alertDesc}>Se ha procesado y guardado en tu perfil correctamente.</Text>
            </View>
          </View>

          {/* Extracted Card Details */}
          <View style={styles.extractedCard}>
            <Text style={styles.cardHeader}>Información Extraída</Text>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>PACIENTE</Text>
              <Text style={styles.infoValMain}>{result?.recipe_dict?.paciente?.nombre_completo || "Paciente No Identificado"}</Text>
              <Text style={styles.infoValSub}>
                {result?.recipe_dict?.paciente?.cedula ? `CC: ${result.recipe_dict.paciente.cedula}` : ""}
                {result?.recipe_dict?.paciente?.fecha_nacimiento ? ` • Edad/Nacimiento: ${result.recipe_dict.paciente.fecha_nacimiento}` : ""}
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>MÉDICO Y EMISOR</Text>
              <Text style={styles.infoValMain}>{result?.recipe_dict?.medico?.nombre || "Médico No Identificado"}</Text>
              <Text style={styles.infoValSub}>
                {result?.recipe_dict?.medico?.especialidad || "Medicina"} • {result?.recipe_dict?.clinica?.nombre || "Clínica No Identificada"}
              </Text>
            </View>

            {result?.recipe_dict?.diagnostico?.codigo && (
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>DIAGNÓSTICO (CIE-10)</Text>
                <Text style={styles.infoValMain}>
                  {result.recipe_dict.diagnostico.codigo} - {result.recipe_dict.diagnostico.descripcion || "Sin descripción"}
                </Text>
                {result.recipe_dict.diagnostico.definicion_oficial && (
                  <Text style={styles.infoValSub}>{result.recipe_dict.diagnostico.definicion_oficial}</Text>
                )}
              </View>
            )}

            {result?.explicacion && (
              <View style={[styles.infoSection, { borderTopWidth: 1, borderTopColor: '#edeef0', paddingTop: 12 }]}>
                <Text style={styles.infoLabel}>EXPLICACIÓN DE TU RECETA</Text>
                {renderMarkdown(result.explicacion, [styles.infoValSub, { color: '#191c1e', lineHeight: 18 }], true)}
              </View>
            )}

            <Text style={[styles.infoLabel, { marginTop: 12, marginBottom: 8 }]}>MEDICAMENTOS DETECTADOS</Text>
            {result?.recipe_dict?.medicamentos && result.recipe_dict.medicamentos.map((med: any, index: number) => (
              <View key={index} style={[styles.medicationExtracted, { marginTop: index > 0 ? 12 : 0 }]}>
                <View style={styles.medRow}>
                  <FileText color="#003d9b" size={20} />
                  <Text style={styles.medName}>{med.nombre || "Medicamento"} {med.dosis || ""}</Text>
                </View>
                <View style={styles.instructionGrid}>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Frecuencia</Text>
                    <Text style={styles.gridVal}>{med.frecuencia || "No especificada"}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Duración</Text>
                    <Text style={styles.gridVal}>{med.duracion || "No especificada"}</Text>
                  </View>
                </View>
                {med.indicaciones_fda && (
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#003d9b15' }}>
                    <Text style={[styles.gridLabel, { color: '#003d9b', fontWeight: '700', fontSize: 10 }]}>INFORMACIÓN FDA:</Text>
                    <Text style={[styles.gridVal, { fontWeight: '400', fontSize: 11, color: '#555' }]} numberOfLines={3}>{med.indicaciones_fda}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Alarms trigger prompt */}
          {result?.recipe_dict?.medicamentos && result.recipe_dict.medicamentos.length > 0 && (
            <View style={styles.alarmsPromptCard}>
              <Text style={styles.alarmsPromptTitle}>¿Configurar Recordatorios?</Text>
              <Text style={styles.alarmsPromptDesc}>
                Hemos detectado {result.recipe_dict.medicamentos.length} medicamento(s) en tu receta. ¿Quieres configurar alarmas automáticamente para tus tomas?
              </Text>
              <TouchableOpacity 
                style={styles.alarmsPromptBtn}
                onPress={() => {
                  router.push({
                    pathname: '/alarms',
                    params: {
                      meds: JSON.stringify(result.recipe_dict.medicamentos)
                    }
                  });
                }}
              >
                <Bell color="#ffffff" size={18} style={{ marginRight: 8 }} />
                <Text style={styles.alarmsPromptBtnText}>Sí, Configurar Alarmas</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Reset button */}
          <TouchableOpacity style={styles.resetBtn} onPress={() => setScanState('camera')}>
            <RefreshCw color="#737685" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.resetBtnText}>Escanear Nueva Receta</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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
            fontSize: 14, 
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
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#edeef0',
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 10,
    padding: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#003d9b',
  },
  doctorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#edeef0',
  },
  doctorAvatarText: {
    fontSize: 18,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  viewfinder: {
    height: '45%',
    backgroundColor: '#191c1e80',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#edeef0',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#ffffff',
  },
  topLeft: {
    top: 16,
    left: 16,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 16,
    right: 16,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 16,
    left: 16,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 16,
    right: 16,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  instructionOverlay: {
    position: 'absolute',
    top: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  viewfinderControls: {
    position: 'absolute',
    right: 16,
    top: 20,
    alignItems: 'center',
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentMock: {
    width: '60%',
    height: '50%',
    backgroundColor: '#ffffffdd',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  docLine: {
    height: 6,
    backgroundColor: '#edeef0',
    borderRadius: 3,
    marginBottom: 8,
    width: '90%',
  },
  actionContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191c1e',
    marginBottom: 8,
  },
  actionDesc: {
    fontSize: 13,
    color: '#737685',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  scanTriggerBtn: {
    backgroundColor: '#003d9b',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#003d9b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  scanTriggerText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#ffffff',
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191c1e',
    marginTop: 20,
    marginBottom: 8,
  },
  loadingDesc: {
    fontSize: 14,
    color: '#737685',
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  successAlert: {
    flexDirection: 'row',
    backgroundColor: '#82f9be20',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#82f9be',
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00734c',
  },
  alertDesc: {
    fontSize: 13,
    color: '#00734c',
    marginTop: 2,
  },
  extractedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edeef0',
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191c1e',
    borderBottomWidth: 1,
    borderBottomColor: '#edeef0',
    paddingBottom: 12,
    marginBottom: 16,
  },
  infoSection: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#737685',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValMain: {
    fontSize: 15,
    fontWeight: '700',
    color: '#191c1e',
  },
  infoValSub: {
    fontSize: 13,
    color: '#737685',
    marginTop: 2,
  },
  medicationExtracted: {
    backgroundColor: '#003d9b05',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#003d9b10',
    marginTop: 8,
  },
  medicationLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#003d9b',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  medName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#191c1e',
    marginLeft: 8,
  },
  instructionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#003d9b15',
    paddingTop: 10,
  },
  gridItem: {
    width: '48%',
  },
  gridLabel: {
    fontSize: 11,
    color: '#737685',
  },
  gridVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#191c1e',
    marginTop: 2,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: '#edeef0',
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  resetBtnText: {
    fontSize: 14,
    color: '#737685',
    fontWeight: '600',
  },
  alarmsPromptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edeef0',
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  alarmsPromptTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191c1e',
    marginBottom: 8,
  },
  alarmsPromptDesc: {
    fontSize: 13,
    color: '#737685',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  alarmsPromptBtn: {
    backgroundColor: '#003d9b',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    shadowColor: '#003d9b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  alarmsPromptBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
