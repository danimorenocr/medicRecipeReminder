# MediaAssist AI (Recetas Claras) - Asistente de Salud Inteligente Completo

MediaAssist AI (también conocido como **Recetas Claras**) es un ecosistema de salud inteligente diseñado para simplificar la gestión y el seguimiento de tratamientos médicos. Permite a los usuarios digitalizar recetas u órdenes médicas en formato físico (imágenes) mediante Inteligencia Artificial, entender su diagnóstico en lenguaje sencillo, programar alarmas de toma de medicamentos y chatear con un asistente de salud empático.

El proyecto está compuesto por:
1. **Back (Backend API + Bot de Telegram):** Escrito en Python (FastAPI, SQLite, Telegram Bot API, Gemini 2.5 Flash, Llama 3.3).
2. **Recetas Medicas Front (App Móvil):** Aplicación multiplataforma premium escrita en React Native + Expo (TypeScript).

---

## 🏗️ Arquitectura General del Sistema

El ecosistema está construido siguiendo principios de **Clean Architecture** (Arquitectura Limpia) en el backend y **File-based Routing** en el frontend:

```
                       [ USUARIO (Telegram Bot / App Móvil) ]
                                      │  ▲
                                      ▼  │ (Interacción / Carga de Recetas)
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               APLICACIÓN MÓVIL (EXPO)                                  │
│ - Pantalla de Inicio (Agenda Interactiva por Fechas, Calendario, Tareas completadas).   │
│ - Mis Alarmas (Progreso del día, editor premium de horarios, notificaciones locales).  │
│ - Mi Perfil (Ficha clínica del paciente, contactos de emergencia dinámicos).            │
│ - Chat Médico & Escáner Integrado (Carga directa de fotos a la API).                    │
└─────────────────────────────────────┬───────────────────────────────────────────────────┘
                                      │
                                      ▼ (Peticiones HTTP Rest / JSON)
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 API FASTAPI (api.py)                                    │
│ - Endpoints de consulta y almacenamiento (/api/profile, /api/medications, /api/recipes).│
│ - Canalización del procesamiento de imágenes (/api/recipes/process).                     │
│ - Endpoint del Asistente Virtual (/api/chat).                                           │
└─────────────────────────────────────┬───────────────────────────────────────────────────┘
                                      │
                                      ▼ (Casos de Uso / Domain Layer)
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                       PROCESADOR DE RECETAS (ProcessRecipeUseCase)                      │
│                                                                                         │
│ 1. Extractor Gemini Vision (Gemini 2.5 Flash): Lee la receta y la estructura en JSON.    │
│ 2. Diccionario CIE-10 (WHO ICD Service): Resuelve el código médico oficial del síntoma. │
│ 3. Groq Explainer (Llama 3.3): Redacta una explicación empática en lenguaje cotidiano.   │
│ 4. OpenFDA Service: Consulta advertencias de uso, contraindicaciones y genéricos.      │
│ 5. SQLite Repository: Persiste la receta y los medicamentos programando alertas.       │
└─────────────────────────────────────┬───────────────────────────────────────────────────┘
                                      │
                                      ▼ (Base de Datos Local)
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              BASE DE DATOS SQLITE (recetas.db)                         │
│ - Tablas: recetas, medicamentos, usuarios, recordatorios, mensajes_telegram.            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔔 Canal de Telegram (Bot Asistente)
El bot de Telegram (`telegram_bot.py`) actúa como un punto de entrada alternativo e interactivo:
* **Digitalización Directa:** El usuario envía la foto de la receta al chat del bot.
* **Alertas Automatizadas:** Al procesarse la receta, el bot ofrece activar alertas repetitivas. Si el usuario acepta, se configuran hilos automáticos (`JobQueue`) que envían recordatorios directamente al chat de Telegram del paciente según la frecuencia de su receta.

---

## 🚀 Módulos y Características Implementadas

### 1. Extracción y Enriquecimiento con IA (Backend Pipeline)
* **Lector Óptico de Recetas:** Utiliza `gemini-2.5-flash` con esquemas de respuesta estrictos en formato JSON para obtener paciente, clínica, médico, diagnóstico y medicamentos (nombre, dosis, frecuencia, duración).
* **Traductor de Diagnósticos (CIE-10):** Consulta la base de datos de la OMS (ICD-10) para encontrar el código oficial de la enfermedad.
* **Explicador de Medicamentos:** Usa Groq con `llama-3.3-70b-versatile` para generar una guía comprensible, respondiendo preguntas clave como: *¿Para qué sirve este medicamento?*, *¿Cómo me ayuda?* y *¿Qué precauciones debo tener?*.
* **Vínculo Oficial OpenFDA:** Extrae indicaciones, advertencias y dosificación técnica consultando la API oficial de la FDA de Estados Unidos.

### 2. Agenda y Plan de Medicación (Frontend Dashboard)
* **Agenda Multi-Día Interactiva:** Barra de acceso rápido para **Hoy**, **Mañana** y **Pasado Mañana**, además de un botón de calendario para abrir un selector de fecha en **cualquier día**.
* **Filtro de Calendario por Tratamiento:** Compara la fecha seleccionada con el inicio y fin de la duración prescrita para cada medicamento.
* **Filtro de Registro:** Evita mostrar alarmas del pasado el día que se registra el medicamento (ej. si configuras una toma de 12 horas a las 10:05 PM, se oculta la toma ficticia de las 10:00 AM de hoy). Cuenta con un margen de cortesía de 30 minutos.
* **Registro del Historial:** Puedes marcar y desmarcar tomas como tomadas en cualquier día del calendario. Las tomas se guardan asociadas a su respectiva fecha en formato `YYYY-MM-DD`.

### 3. Gestor de Alarmas y Notificaciones
* **Cálculo de Dosis y Duración:** Al ingresar un medicamento, puedes escribir la **Cantidad Prescrita** (ej. 10 tabletas) y el sistema calculará automáticamente cuántos días dura el tratamiento en base a la dosis y frecuencia (ej. 1 tableta cada 12 horas = 5 días de duración).
* **Modal de Tomas Completadas:** Detalla las horas y nombres de los medicamentos tomados hoy.
* **Notificaciones Locales (Background/Foreground):** Integra notificaciones nativas en el móvil a las horas exactas de tus alarmas.

### 4. Expediente Clínico (Perfil del Usuario)
* **Ficha del Paciente:** Registra credenciales del perfil, fecha de nacimiento, sexo, tipo de sangre (RH), alergias críticas y condiciones médicas de base.
* **Contactos de Emergencia Dinámicos:** Muestra la información de contacto del último médico que emitió tu receta guardada en el historial.

### 5. Chat de Orientación Médica Empática (Protocolo A.L.I.C.I.A.)
* **Evaluación Clínica Estructurada (A.L.I.C.I.A.)**: El chat médico virtual guía al usuario en un interrogatorio natural y paso a paso para desmenuzar cualquier dolor o molestia principal:
  - **A - Aparición**: ¿Cuándo empezó y cómo evolucionó?
  - **L - Localización**: ¿En qué parte exacta duele?
  - **I - Intensidad**: Escala de dolor del 1 al 10.
  - **C - Características**: Cómo se siente el dolor (punzante, opresivo, cólico, etc.).
  - **I - Irradiación**: Si el dolor se desplaza hacia otra zona del cuerpo.
  - **A - Atenuación / Agravación**: Qué factores alivian o empeoran la molestia.
* **Diagnósticos Basados en Metáforas**: El asistente traduce jerga médica compleja a analogías cotidianas para facilitar el entendimiento:
  - *Migraña por vasoespasmo* ➔ Arterias de la cabeza bailando o parpadeando como luces de Navidad.
  - *Reflujo / Gastritis* ➔ Ácido estomacal fuerte como cloro de piscina o compuerta esofágica desajustada como puerta vieja.
  - *Espasmo muscular* ➔ Fibras del músculo trenzadas como un nudo de corbata o cables enredados.
* **Filtros de Alarma ("Red Flags")**: Evalúa constantemente síntomas críticos (dificultad respiratoria, dolor opresivo de pecho, sangrado, pérdida de fuerza o conciencia, fiebre extremadamente alta). Si los detecta, detiene el interrogatorio clínico de inmediato e indica al usuario acudir a emergencias con prioridad.

### 6. Localizador de Urgencias y Hospitales 24h
* **Integración con Google Places API**: Posee un endpoint proxy seguro (`GET /api/hospitals/nearby`) que consulta en tiempo real los centros médicos disponibles con la palabra clave `urgencias` (reforzando que sean servicios 24h humanos y no veterinarias o laboratorios clínicos).
* **Filtros de Exclusión Avanzados**: Descarta del listado de forma automática tanto clínicas veterinarias (`veterinaria`, `mascotas`, `pet`) como laboratorios clínicos y centros de diagnóstico (`laboratorio`, `diagnostico`).
* **Algoritmo de Recomendación**: Analiza los datos de Google para ofrecer tres sugerencias destacadas:
  - 🚨 **Recomendado (Mejor Opción)**: Balance óptimo entre la mejor calificación de estrellas y menor distancia.
  - 📍 **El Más Cercano**: Menor distancia lineal calculada mediante la fórmula de Haversine.
  - ⭐ **Mejor Calificado**: Hospital con mayor promedio de estrellas y volumen de calificaciones de Google.
* **Geolocalización y Ruteo GPS**:
  - Obtiene la ubicación precisa del dispositivo mediante `expo-location`.
  - Proporciona ruteo interactivo al pulsar **"Cómo llegar"**, abriendo la aplicación de mapas nativa (Google Maps / Apple Maps) mediante Deep Linking, con un fallback web seguro e inmune a fallos.
* **Modo de Simulación**: En ausencia de API Key en el entorno de desarrollo, simula centros médicos reales en Colombia geolocalizados cerca de la posición del GPS del desarrollador para realizar pruebas rápidas y completas.

---

## 🗃️ Esquema de la Base de Datos (`recetas.db`)

La persistencia de datos utiliza SQLite. El esquema consta de las siguientes tablas principales:

### `recetas`
Almacena las cabeceras de los diagnósticos y doctores.
* `id` (INTEGER PRIMARY KEY)
* `paciente_nombre`, `paciente_fecha_nacimiento`, `paciente_cedula`, `paciente_telefono` (TEXT)
* `clinica_nombre`, `clinica_direccion` (TEXT)
* `medico_nombre`, `medico_especialidad` (TEXT)
* `fecha_receta` (TEXT)
* `telegram_chat_id`, `telegram_message_id`, `telegram_file_id` (TEXT/INTEGER)
* `diagnostico_codigo`, `diagnostico_descripcion` (TEXT)
* `explicacion` (TEXT - HTML/Markdown explicativo generado por Groq)
* `created_at` (TIMESTAMP)

### `medicamentos`
Almacena el detalle de los fármacos.
* `id` (INTEGER PRIMARY KEY)
* `receta_id` (INTEGER, FOREIGN KEY)
* `nombre`, `dosis`, `frecuencia`, `duracion` (TEXT)
* `brand_name`, `generic_name`, `manufacturer_name` (TEXT - extraídos de OpenFDA)
* `indicaciones_fda`, `advertencias_fda`, `dosage_fda` (TEXT)
* `icon`, `iconBg` (TEXT)
* `active` (BOOLEAN)
* `alarms_json` (TEXT - JSON con las horas programadas)
* `history_json` (TEXT - JSON con los registros de tomas finalizadas por fecha)
* `created_at` (TEXT - Timestamp exacto de creación para cálculos de filtro)

### `usuarios`
* `id` (INTEGER PRIMARY KEY)
* `username`, `password`, `fecha_nacimiento`, `tipo_sangre`, `alergias`, `condicion_base`, `sexo` (TEXT)

---

## 🛠️ Requisitos e Instalación

### Backend (Python)
1. Ve a la carpeta `Back`:
   ```bash
   cd Back
   ```
2. Instala dependencias:
   ```bash
   pip install -r requirements.txt
   ```
3. Configura el archivo `.env`:
   ```env
   TELEGRAM_TOKEN=tu_token_de_telegram
   GROQ_API_KEY=tu_token_de_groq
   GEMINI_API_KEY=tu_token_de_gemini
   ```
4. Corre la API en puerto 8000:
   ```bash
   uvicorn api:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend (React Native / Expo)
1. Ve a la carpeta `Recetas Medicas Front/recetas-medicas`:
   ```bash
   cd "Recetas Medicas Front/recetas-medicas"
   ```
2. Instala los paquetes de Node:
   ```bash
   npm install
   ```
3. Inicia la aplicación móvil:
   ```bash
   npx expo start
   ```
