# MediaAssist AI (Recetas Médicas) - Asistente de Salud Inteligente

Asistente de salud inteligente multiplataforma diseñado para digitalizar recetas médicas impresas mediante IA, realizar el seguimiento diario de la ingesta de medicamentos y proporcionar un chat interactivo de consulta de síntomas.

El proyecto consta de dos partes principales:
1. **Back (Backend API + Bot de Telegram):** Escrito en Python (FastAPI, SQLite, Groq Llama 3.3, Gemini 2.5 Flash).
2. **Recetas Medicas Front (Frontend Mobile):** Aplicación móvil multiplataforma escrita en React Native + Expo (TypeScript).

---

## 🚀 Características Principales

### 1. Gestión de Perfil y Expediente Médico
* **Perfil de Usuario Completo:** Almacena nombre, contraseña, fecha de nacimiento, sexo, tipo de sangre (RH), alergias críticas y condiciones médicas preexistentes.
* **Cálculo Dinámico de Edad:** El backend calcula automáticamente la edad actual a partir de la fecha de nacimiento en múltiples formatos.
* **Avatar y UI Dinámicos:** El avatar del usuario adapta su emoji según el sexo registrado (`👩` / `👨` / `👤`). Los contactos de emergencia se cargan de forma dinámica con la información del último médico registrado en tus recetas.

### 2. Plan de Medicación e Agenda Interactiva
* **Acceso de Fechas Rápido e Infinito:** Pestañas para conmutar rápidamente entre **Hoy**, **Mañana** y **Pasado Mañana**, además de un botón de calendario para elegir **cualquier fecha del calendario**.
* **Filtro de Tratamiento Inteligente:** Los medicamentos solo se muestran en la agenda en los días correspondientes a la duración de su tratamiento (calculado a partir de la fecha de registro).
* **Control de Alarmas en Tiempo Real:** Permite marcar/desmarcar tomas como completadas para cualquier día. La aplicación almacena la fecha correspondiente de forma explícita en el historial (`YYYY-MM-DD`).
* **Filtro de Inicio de Tratamiento (Sin tomas pasadas):** Si programas un medicamento hoy a las 10:05 PM, el sistema filtrará tomas del pasado (ej. hoy a las 10:00 AM) basándose en la fecha/hora de creación con una tolerancia de cortesía de 30 minutos.

### 3. Panel de Progreso y Alertas
* **Anillo de Progreso Dinámico:** El porcentaje del día de hoy se calcula en caliente según el estado real de las tomas (`(tomas completadas / tomas totales) * 100`).
* **Modal de Historial de Tomas:** Muestra un listado detallado de todas las dosis e instrucciones que el usuario ya ha tomado hoy.

### 4. Consultor de Síntomas Empático (Chat IA)
* **Algoritmo de Triaje de Dolor:** Identifica si el usuario menciona dolor o malestar físico. En lugar de dar respuestas genéricas, inicia un flujo de 1 o 2 preguntas breves y específicas sobre cómo comenzó el síntoma antes de dar una conclusión clínica breve ligada a sus medicamentos recetados.

---

## 🗃️ Estructura de la Base de Datos (`recetas.db`)

El sistema utiliza SQLite para la persistencia de datos. Las tablas clave son:

### 1. Tabla `usuarios`
Almacena el perfil clínico y credenciales del paciente.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `username` (TEXT)
* `password` (TEXT)
* `fecha_nacimiento` (TEXT)
* `tipo_sangre` (TEXT)
* `alergias` (TEXT)
* `condicion_base` (TEXT)
* `sexo` (TEXT)

### 2. Tabla `medicamentos`
Almacena las especificaciones de cada fármaco y su historial de tomas.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `receta_id` (INTEGER, FOREIGN KEY)
* `nombre` (TEXT)
* `dosis` (TEXT)
* `frecuencia` (TEXT)
* `duracion` (TEXT)
* `active` (BOOLEAN)
* `alarms_json` (TEXT)
* `history_json` (TEXT - JSON con las tomas realizadas por fecha)
* `created_at` (TEXT - Fecha y hora exacta de registro)

---

## 🛠️ Instalación y Ejecución

### 1. Configuración de API & Bot (Backend)
1. Navega al directorio del backend:
   ```bash
   cd Back
   ```
2. Instala los requerimientos:
   ```bash
   pip install -r requirements.txt
   ```
3. Configura el archivo `.env` en la raíz de `Back/` con tus llaves de API:
   ```env
   TELEGRAM_TOKEN=tu_token_de_telegram
   GROQ_API_KEY=tu_token_de_groq
   GEMINI_API_KEY=tu_token_de_gemini
   ```
4. Inicia el servidor de desarrollo FastAPI:
   ```bash
   uvicorn api:app --reload --host 0.0.0.0 --port 8000
   ```

### 2. Configuración de la App Móvil (Frontend)
1. Navega al directorio del frontend:
   ```bash
   cd "Recetas Medicas Front/recetas-medicas"
   ```
2. Instala las dependencias de node:
   ```bash
   npm install
   ```
3. Ejecuta el servidor de Metro:
   ```bash
   npx expo start
   ```
