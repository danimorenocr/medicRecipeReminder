import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Wifi, ArrowLeft, ArrowRight, MessageSquare, Camera, Mic, Send, FileText, Check } from 'lucide-react-native';
import { API_URL } from '../constants/api';

export default function ChatScreen() {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; time: string }>>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hola, soy tu asistente de MediAssist. Estoy aquí para ayudarte a entender tus recetas médicas, resolver dudas sobre tus medicamentos o responder preguntas generales de salud. ¿Qué deseas consultar hoy?',
      time: '09:00 AM'
    }
  ]);

  const formatTime = () => {
    const date = new Date();
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${strMinutes} ${ampm}`;
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || sending) return;

    if (!customText) {
      setInputText('');
    }
    
    setSending(true);

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: textToSend.trim(),
      time: formatTime()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const history = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend.trim(),
          history
        })
      });

      if (!response.ok) {
        throw new Error('Error al conectar con la API de Chat');
      }

      const data = await response.json();

      const botMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: data.reply,
        time: formatTime()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      console.error('Error de chat:', err);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: 'Hubo un error de conexión con el asistente August. Asegúrate de que el backend esté ejecutándose.',
        time: formatTime()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header matching screenshot */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.push('/')} style={{ marginRight: 8, padding: 4 }}>
            <ArrowLeft color="#191c1e" size={22} />
          </TouchableOpacity>
          <View style={styles.doctorAvatar}>
            <Text style={styles.doctorAvatarText}>👩‍⚕️</Text>
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerTitle}>MediAssist AI</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>En línea</Text>
            </View>
          </View>
        </View>
        <Wifi color="#191c1e" size={20} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          {/* Asistente Inteligente Top Block */}
          <View style={styles.assistantIntro}>
            <View style={styles.introIconWrapper}>
              <FileText color="#003d9b" size={24} />
            </View>
            <Text style={styles.introTitle}>Asistente Inteligente</Text>
            <Text style={styles.introSubtitle}>
              Tu historial está encriptado y solo tú puedes verlo. ¿En qué puedo ayudarte hoy?
            </Text>
          </View>

          {/* Today Separator */}
          <View style={styles.dateSeparatorRow}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>HOY</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Dynamic Messages */}
          {messages.map((msg) => {
            if (msg.role === 'assistant') {
              return (
                <View key={msg.id} style={styles.botMessageRow}>
                  <View style={styles.botAvatarCircle} />
                  <View style={styles.botBubble}>
                    <Text style={styles.msgText}>{msg.content}</Text>
                    <Text style={styles.msgTime}>{msg.time}</Text>
                  </View>
                </View>
              );
            } else {
              return (
                <View key={msg.id} style={styles.userMessageRow}>
                  <View style={styles.userBubble}>
                    <Text style={[styles.msgText, { color: '#ffffff' }]}>{msg.content}</Text>
                    <View style={styles.userTimeRow}>
                      <Text style={styles.userTimeText}>{msg.time}</Text>
                      <Check color="#82f9be" size={12} style={{ marginLeft: 4 }} />
                    </View>
                  </View>
                  <View style={styles.userAvatarCircle}>
                    <Text style={styles.userAvatarEmoji}>👤</Text>
                  </View>
                </View>
              );
            }
          })}

          {sending && (
            <View style={[styles.botMessageRow, { alignItems: 'center', opacity: 0.8 }]}>
              <View style={styles.botAvatarCircle} />
              <View style={[styles.botBubble, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <ActivityIndicator size="small" color="#003d9b" />
                <Text style={[styles.msgText, { fontStyle: 'italic', color: '#737685' }]}>Tu asistente está escribiendo...</Text>
              </View>
            </View>
          )}

        </ScrollView>

        {/* Suggestion Pills */}
        <View style={styles.suggestionsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
            <TouchableOpacity style={styles.suggestionPill} onPress={() => handleSend("¿Cómo tomo mi medicación?")}>
              <Text style={styles.suggestionText}>¿Cómo tomo mi medicación?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.suggestionPill} onPress={() => handleSend("Tengo efectos secundarios")}>
              <Text style={styles.suggestionText}>Tengo efectos secundarios</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.suggestionPill} onPress={() => handleSend("¿Qué es la faringitis?")}>
              <Text style={styles.suggestionText}>¿Qué es la faringitis?</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.inputActionBtn} onPress={() => router.push('/scan')}>
            <Camera color="#737685" size={20} />
          </TouchableOpacity>
          
          <TextInput 
            style={styles.textInput} 
            placeholder="Pregúntale a MediAssist..."
            value={inputText}
            onChangeText={setInputText}
            placeholderTextColor="#737685"
            onSubmitEditing={() => handleSend()}
            editable={!sending}
          />

          <TouchableOpacity style={styles.inputActionBtn}>
            <Mic color="#737685" size={20} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.sendCircleBtn, sending && { opacity: 0.6 }]} 
            onPress={() => handleSend()}
            disabled={sending}
          >
            <Send color="#ffffff" size={16} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#36B37E',
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    color: '#737685',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  assistantIntro: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  introIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#003d9b10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#003d9b15',
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#191c1e',
    marginBottom: 6,
  },
  introSubtitle: {
    fontSize: 13,
    color: '#737685',
    textAlign: 'center',
    lineHeight: 18,
  },
  dateSeparatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#edeef0',
  },
  separatorText: {
    fontSize: 11,
    color: '#737685',
    fontWeight: '700',
    marginHorizontal: 10,
  },
  botMessageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  botAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#003d9b',
    marginRight: 8,
  },
  botBubble: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderBottomLeftRadius: 2,
    padding: 14,
    borderWidth: 1,
    borderColor: '#edeef0',
  },
  userMessageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  userAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00734c',
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarEmoji: {
    fontSize: 14,
  },
  userBubble: {
    maxWidth: '80%',
    backgroundColor: '#003d9b',
    borderRadius: 16,
    borderBottomRightRadius: 2,
    padding: 14,
  },
  msgText: {
    fontSize: 14,
    color: '#191c1e',
    lineHeight: 20,
  },
  msgTime: {
    fontSize: 10,
    color: '#737685',
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  userTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  userTimeText: {
    fontSize: 10,
    color: '#c4d2ff',
  },
  protocolCard: {
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#edeef0',
  },
  protocolIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#82f9be30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  protocolTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#191c1e',
  },
  protocolDesc: {
    fontSize: 11,
    color: '#737685',
    marginTop: 1,
  },
  suggestionsWrapper: {
    backgroundColor: '#f8f9fb',
    paddingVertical: 8,
  },
  suggestionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionPill: {
    backgroundColor: '#edeef0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: '#191c1e',
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#edeef0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8, // Gives space at the bottom of the screen
  },
  inputActionBtn: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#191c1e',
  },
  sendCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#003d9b',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
});
