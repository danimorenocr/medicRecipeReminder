import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { MessageSquare, Home, FileText, Bell, User, MapPin } from 'lucide-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeColor = '#00734c'; // on-secondary-container
  const inactiveColor = '#737685'; // outline
  const bgColor = '#ffffff';
  const borderColor = '#edeef0';

  return (
    <SafeAreaProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: inactiveColor,
          tabBarStyle: {
            backgroundColor: bgColor,
            borderTopWidth: 1,
            borderTopColor: borderColor,
            height: 88,
            paddingBottom: 24,
            paddingTop: 8,
          },
          tabBarItemStyle: {
            borderRadius: 24,
            marginHorizontal: 12,
            marginVertical: 8,
            height: 48,
          },
          tabBarActiveBackgroundColor: '#82f9be50', // Soft mint green chip
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '700',
            fontFamily: 'System',
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color }) => <MessageSquare color={color} size={20} />,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color }) => <Home color={color} size={20} />,
          }}
        />
        <Tabs.Screen
          name="alarms"
          options={{
            title: 'Alarmas',
            tabBarIcon: ({ color }) => <Bell color={color} size={20} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color }) => <User color={color} size={20} />,
          }}
        />
        {/* Ocultar explore de las pestañas principales pero mantener en la ruta */}
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
    </SafeAreaProvider>
  );
}
