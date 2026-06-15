import json
import time
from PIL import Image
from google.genai.errors import APIError
from google.genai import types
from core.entities import Recipe, Patient, Clinic, Doctor, Diagnosis, Medication
from core.interfaces import IRecipeExtractor
from infrastructure.clients.api_clients import get_gemini_client

PROMPT_EXTRACTION = """
Analiza detalladamente esta imagen de una receta u orden médica.
Tu objetivo es extraer toda la información disponible y estructurarla estrictamente en el siguiente formato JSON:

{
  "paciente": {
    "nombre_completo": "Nombre completo del paciente (o null si no está visible)",
    "fecha_nacimiento": "Fecha de nacimiento (o null si no está visible)",
    "cedula": "Cédula o Documento de Identidad (o null si no está visible)",
    "telefono": "Teléfono (o null si no está visible)"
  },
  "clinica": {
    "nombre": "Nombre de la clínica, hospital o institución de salud (o null si no está visible)",
    "direccion": "Dirección física de la clínica o institución (o null si no está visible)"
  },
  "medico": {
    "nombre": "Nombre completo del médico (o null si no está visible)",
    "especialidad": "Especialidad médica (o null si no está visible)"
  },
  "diagnostico": {
    "codigo": "Código alfanumérico CIE-10 / ICD-10 del diagnóstico si está visible (ej. J03.90, M62.4, etc.) o null",
    "descripcion": "Descripción textual del diagnóstico en la receta (ej. Amigdalitis, Espasmo muscular, etc.) o null"
  },
  "fecha": "Fecha de emisión de la receta (o null si no está visible)",
  "medicamentos": [
    {
      "nombre": "Nombre comercial o principio activo del medicamento",
      "dosis": "Dosificación, concentración o cantidad (ej. 500mg, 1 tableta, 20ml, etc. O null si no se especifica)",
      "frecuencia": "Frecuencia de administración (ej. cada 8 horas, una vez al día, con las comidas, etc. O null si no se especifica)",
      "duracion": "Duración total del tratamiento (ej. 7 días, 1 mes, permanente, etc. O null si no se especifica)"
    }
  ]
}

Reglas:
1. Responde ÚNICAMENTE con el objeto JSON válido.
2. No agregues explicaciones, introducciones, ni bloques de código markdown como ```json o ```.
3. Si un campo no se puede identificar en absoluto en la imagen, asígnale el valor null.
"""

class GeminiRecipeExtractor(IRecipeExtractor):
    def __init__(self):
        self.client = get_gemini_client()

    def extraer_receta(self, image: Image.Image) -> Recipe:
        """
        Consulta Gemini para extraer la información estructurada de la receta.
        """
        intentos = 3
        response = None

        for intento in range(intentos):
            try:
                response = self.client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[image, PROMPT_EXTRACTION],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                break
            except APIError as e:
                # Reintentar en caso de error de servidor ocupado (503)
                if e.code == 503 and intento < intentos - 1:
                    print(f"Servidor Gemini ocupado (503). Reintentando en {intento + 2} segundos...")
                    time.sleep(intento + 2)
                    continue
                else:
                    raise e

        if not response or not response.text:
            raise ValueError("No se recibió respuesta de la API de Gemini.")

        texto_limpio = response.text.strip()
        
        # Limpieza manual por si acaso
        if texto_limpio.startswith("```"):
            linhas = texto_limpio.split("\n")
            if linhas[0].startswith("```"):
                linhas = linhas[1:]
            if linhas[-1].startswith("```"):
                linhas = linhas[:-1]
            texto_limpio = "\n".join(linhas).strip()

        try:
            data = json.loads(texto_limpio)
        except json.JSONDecodeError as e:
            print(f"Error al decodificar JSON de Gemini: {texto_limpio}")
            raise ValueError("La respuesta de la IA no es un JSON válido.") from e

        # Mapear JSON a entidades de dominio
        paciente_raw = data.get("paciente") or {}
        paciente = Patient(
            nombre_completo=paciente_raw.get("nombre_completo"),
            fecha_nacimiento=paciente_raw.get("fecha_nacimiento"),
            cedula=paciente_raw.get("cedula"),
            telefono=paciente_raw.get("telefono")
        )

        clinica_raw = data.get("clinica") or {}
        clinica = Clinic(
            nombre=clinica_raw.get("nombre"),
            direccion=clinica_raw.get("direccion")
        )

        medico_raw = data.get("medico") or {}
        medico = Doctor(
            nombre=medico_raw.get("nombre"),
            especialidad=medico_raw.get("especialidad")
        )

        diag_raw = data.get("diagnostico") or {}
        diagnostico = Diagnosis(
            codigo=diag_raw.get("codigo"),
            descripcion=diag_raw.get("descripcion")
        )

        medicamentos = []
        for med_raw in data.get("medicamentos") or []:
            if med_raw.get("nombre"):
                medicamentos.append(Medication(
                    nombre=med_raw.get("nombre"),
                    dosis=med_raw.get("dosis"),
                    frecuencia=med_raw.get("frecuencia"),
                    duracion=med_raw.get("duracion")
                ))

        return Recipe(
            paciente=paciente,
            clinica=clinica,
            medico=medico,
            diagnostico=diagnostico,
            fecha=data.get("fecha"),
            medicamentos=medicamentos
        )
