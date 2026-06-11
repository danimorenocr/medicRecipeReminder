import json
import time
from PIL import Image
from google.genai.errors import APIError
from google.genai import types
from api_clients import gemini_client

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

def extraer_receta_json(image: Image.Image) -> dict:
    """
    Recibe una imagen PIL, consulta a Gemini 2.5 Flash y retorna
    un diccionario de Python con la información estructurada de la receta.
    """
    if not gemini_client:
        raise ValueError("El cliente de Gemini no está configurado.")

    intentos = 3
    response = None

    for intento in range(intentos):
        try:
            response = gemini_client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[image, PROMPT_EXTRACTION],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            break
        except APIError as e:
            # Reintentar si el servidor está ocupado (error 503)
            if e.code == 503 and intento < intentos - 1:
                print(f"Servidor Gemini ocupado (503). Reintentando en {intento + 2} segundos...")
                time.sleep(intento + 2)
                continue
            else:
                raise e

    if not response or not response.text:
        raise ValueError("No se recibió respuesta de la API de Gemini.")

    # Limpiar posibles delimitadores markdown (por si acaso, aunque response_mime_type los previene)
    texto_limpio = response.text.strip()
    if texto_limpio.startswith("```"):
        # Quitar ```json y ```
        linhas = texto_limpio.split("\n")
        if linhas[0].startswith("```"):
            linhas = linhas[1:]
        if linhas[-1].startswith("```"):
            linhas = linhas[:-1]
        texto_limpio = "\n".join(linhas).strip()

    try:
        data = json.loads(texto_limpio)
        return data
    except json.JSONDecodeError as e:
        print(f"Error al decodificar JSON de Gemini: {texto_limpio}")
        raise ValueError("La respuesta de la IA no es un JSON válido.") from e
