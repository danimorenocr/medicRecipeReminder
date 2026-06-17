import { Tabs } from 'expo-router';
import { useColorScheme, View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Image } from 'react-native';
import { MessageSquare, Home, FileText, Bell, User, MapPin } from 'lucide-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect, useRef, useState } from 'react';

function AnimatedTabItem({ isFocused, onPress, onLongPress, label, icon }: any) {
  // Animar la transición (pop) del resorte
  const animValue = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
      tension: 70,
    }).start();
  }, [isFocused]);

  // Interpolar las animaciones
  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });

  const textTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const circleScale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.01, 1],
  });

  const circleOpacity = animValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.6, 1],
  });

  const iconScale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const activeColor = '#0052cc';
  const inactiveColor = '#737685';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      activeOpacity={0.85}
    >
      <View style={styles.centerTabWrapper}>
        {/* Círculo de Fondo Animado */}
        <Animated.View 
          style={[
            styles.raisedButtonCircle, 
            { 
              position: 'absolute',
              transform: [{ translateY }, { scale: circleScale }],
              opacity: circleOpacity
            }
          ]} 
        />

        {/* Contenedor del Icono Animado */}
        <Animated.View style={{ transform: [{ translateY }, { scale: iconScale }] }}>
          <View style={styles.iconChip}>
            {React.cloneElement(icon, { 
              color: isFocused ? '#ffffff' : inactiveColor, 
              size: 22,
              fill: isFocused ? '#ffffff' : 'none'
            })}
          </View>
        </Animated.View>

        {/* Etiqueta de Texto */}
        <Animated.Text style={[
          styles.tabLabel, 
          { 
            color: isFocused ? activeColor : inactiveColor, 
            fontWeight: isFocused ? '800' : '600',
            marginTop: -6,
            transform: [{ translateY: textTranslateY }]
          }
        ]}>
          {label}
        </Animated.Text>
      </View>
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const currentRoute = state.routes[state.index];
  if (currentRoute.name === 'chat') {
    return null;
  }

  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        if (options.href === null) {
          return null;
        }

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        let icon = null;
        if (route.name === 'index') {
          icon = <Home size={22} />;
        } else if (route.name === 'chat') {
          icon = <MessageSquare size={22} />;
        } else if (route.name === 'alarms') {
          icon = <Bell size={22} />;
        } else if (route.name === 'profile') {
          icon = <User size={22} />;
        } else {
          return null;
        }

        return (
          <AnimatedTabItem
            key={route.key}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
            label={label}
            icon={icon}
          />
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  
  // Estados para el Splash Screen Animado
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  
  // Sonar Waves
  const sonar1Scale = useRef(new Animated.Value(0.8)).current;
  const sonar1Opacity = useRef(new Animated.Value(0.6)).current;
  const sonar2Scale = useRef(new Animated.Value(0.8)).current;
  const sonar2Opacity = useRef(new Animated.Value(0.4)).current;
  
  // Títulos
  const textTranslateY = useRef(new Animated.Value(30)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const subTextOpacity = useRef(new Animated.Value(0)).current;
  const subTextTranslateY = useRef(new Animated.Value(20)).current;

  // Brillo / Sweep
  const shineAnim = useRef(new Animated.Value(-150)).current;

  // Progreso
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Deriva de luz ambiental (Glow circles)
  const glowDrift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Iniciar derivas ambientales (looping)
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowDrift, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(glowDrift, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2. Iniciar sonar
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(sonar1Scale, {
            toValue: 2.2,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(sonar1Scale, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(sonar1Opacity, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(sonar1Opacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Sonar 2 con delay
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(sonar2Scale, {
              toValue: 2.2,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(sonar2Scale, {
              toValue: 0.8,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(sonar2Opacity, {
              toValue: 0,
              duration: 1800,
              useNativeDriver: true,
            }),
            Animated.timing(sonar2Opacity, {
              toValue: 0.4,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }, 800);

    // 3. Secuencia principal de aparición
    Animated.sequence([
      // Logo
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          tension: 30,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Efecto brillo (shine sweep)
      Animated.timing(shineAnim, {
        toValue: 150,
        duration: 800,
        useNativeDriver: true,
      }),
      // Textos
      Animated.parallel([
        Animated.spring(textTranslateY, {
          toValue: 0,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(subTextTranslateY, {
          toValue: 0,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(subTextOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Barra de progreso cargando
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.delay(400),
      // Desvanecimiento del splash
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSplash(false);
    });

    return () => clearTimeout(timer);
  }, []);

  const glowTranslateX1 = glowDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, 30],
  });
  const glowTranslateY1 = glowDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 20],
  });

  const glowTranslateX2 = glowDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [40, -40],
  });
  const glowTranslateY2 = glowDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [30, -30],
  });

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <Tabs
          tabBar={props => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Inicio',
            }}
          />
          <Tabs.Screen
            name="chat"
            options={{
              title: 'Chat',
            }}
          />
          <Tabs.Screen
            name="alarms"
            options={{
              title: 'Alarmas',
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Perfil',
            }}
          />
          <Tabs.Screen
            name="explore"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="scan"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="medication-alarms"
            options={{
              href: null,
            }}
          />
        </Tabs>

        {showSplash && (
          <Animated.View style={[StyleSheet.absoluteFill, styles.splashContainer, { opacity: fadeAnim }]}>
            {/* Luces de Fondo (Glow Circles) */}
            <Animated.View style={[styles.glowOrb, styles.glowCyan, { transform: [{ translateX: glowTranslateX1 }, { translateY: glowTranslateY1 }] }]} />
            <Animated.View style={[styles.glowOrb, styles.glowPurple, { transform: [{ translateX: glowTranslateX2 }, { translateY: glowTranslateY2 }] }]} />
            <Animated.View style={[styles.glowOrb, styles.glowBlue, { transform: [{ translateX: glowTranslateX1 }, { translateY: glowTranslateY2 }] }]} />

            {/* Logo y sus anillos sonar */}
            <View style={styles.logoOuterContainer}>
              <Animated.View style={[styles.sonarRing, { transform: [{ scale: sonar1Scale }], opacity: sonar1Opacity }]} />
              <Animated.View style={[styles.sonarRing, { transform: [{ scale: sonar2Scale }], opacity: sonar2Opacity }]} />
              
              <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={styles.splashLogo}
                />
                {/* Shine Sweep Overlay */}
                <Animated.View style={[styles.shineOverlay, { transform: [{ translateX: shineAnim }] }]} />
              </Animated.View>
            </View>

            {/* Títulos y Subtítulos */}
            <View style={styles.textContainer}>
              <Animated.View style={{ transform: [{ translateY: textTranslateY }], opacity: textOpacity }}>
                <Text style={styles.splashTitle}>MediaAssist AI</Text>
              </Animated.View>
              <Animated.View style={{ transform: [{ translateY: subTextTranslateY }], opacity: subTextOpacity }}>
                <Text style={styles.splashSubtitle}>Tu asistente de salud inteligente</Text>
              </Animated.View>
            </View>

            {/* Barra de progreso */}
            <View style={styles.progressContainer}>
              <Animated.View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    }) 
                  }
                ]} 
              />
            </View>
          </Animated.View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    height: 72,
    backgroundColor: '#ffffff',
    borderRadius: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconChip: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: 'System',
    marginTop: 2,
  },
  centerTabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  raisedButtonCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0052cc',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0052cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  // Estilos del Splash Animado
  splashContainer: {
    backgroundColor: '#070a1e', // Fondo oscuro premium
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  glowOrb: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.15,
  },
  glowCyan: {
    backgroundColor: '#00f2fe',
    top: '20%',
    left: '-20%',
  },
  glowPurple: {
    backgroundColor: '#9b51e0',
    bottom: '25%',
    right: '-20%',
  },
  glowBlue: {
    backgroundColor: '#0052cc',
    top: '40%',
    left: '40%',
  },
  logoOuterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 200,
    height: 200,
  },
  sonarRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(0, 82, 204, 0.4)',
  },
  logoContainer: {
    position: 'relative',
    width: 110,
    height: 110,
    borderRadius: 28,
    overflow: 'hidden', // Contiene el shine sweep
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#ffffff',
    shadowColor: '#0052cc',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  splashLogo: {
    width: '100%',
    height: '100%',
  },
  shineOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    transform: [{ rotate: '25deg' }],
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  splashTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
    textAlign: 'center',
  },
  splashSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 60,
    width: 140,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0052cc',
  },
});
