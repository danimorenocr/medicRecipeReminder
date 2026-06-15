import Constants from 'expo-constants';

const getApiUrl = (): string => {
  // En desarrollo con Expo, debuggerHost contiene la IP local de la computadora (ej. 192.168.1.50:8081)
  const debuggerHost = Constants.expoConfig?.hostUri;
  const ip = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
  
  // Si estamos en entorno web de Expo o en producción
  if (!debuggerHost) {
    return 'http://localhost:8000';
  }
  
  return `http://${ip}:8000`;
};

export const API_URL = getApiUrl();
console.log('[API_URL] Configurada en:', API_URL);
