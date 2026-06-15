import json
from typing import List, Dict, Optional
from google.genai import types
from infrastructure.clients.api_clients import get_gemini_client

class ReminderParser:
    def __init__(self):
        self.client = get_gemini_client()

    def parsear_tiempos(self, medicamentos: List[Dict]) -> List[Dict]:
        """
        Toma una lista de medicamentos con campos 'nombre', 'frecuencia' y 'duracion',
        y retorna una lista estructurada con 'nombre', 'frecuencia_horas' (int) y 'duracion_dias' (int).
        """
        prompt = (
            "Analiza las frecuencias y duraciones de los siguientes medicamentos. "
            "Para cada uno, extrae o calcula:\n"
            "1. 'frecuencia_horas': la cantidad de horas entre cada toma (ej. 'cada 8 horas' -> 8, 'diario' o 'cada 24 horas' -> 24, 'dos veces al día' -> 12). Si es indefinido o no aplicable, usa 24.\n"
            "2. 'duracion_dias': la cantidad de días totales del tratamiento (ej. '7 días' -> 7, '1 semana' -> 7, '5 días' -> 5). Si dice 'permanente' o es indefinido, usa 30.\n\n"
            "Medicamentos a analizar:\n"
            f"{json.dumps(medicamentos, ensure_ascii=False, indent=2)}\n\n"
            "Devuelve estrictamente un arreglo JSON con los resultados en este formato:\n"
            "[\n"
            "  {\n"
            "    \"nombre\": \"Nombre del medicamento\",\n"
            "    \"frecuencia_horas\": 8,\n"
            "    \"duracion_dias\": 5\n"
            "  }\n"
            "]\n"
            "No incluyas explicaciones, texto extra ni markdown."
        )

        try:
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            if response and response.text:
                texto_limpio = response.text.strip()
                if texto_limpio.startswith("```"):
                    linhas = texto_limpio.split("\n")
                    if linhas[0].startswith("```"):
                        linhas = linhas[1:]
                    if linhas[-1].startswith("```"):
                        linhas = linhas[:-1]
                    texto_limpio = "\n".join(linhas).strip()
                return json.loads(texto_limpio)
            return []
        except Exception as e:
            print(f"Error al parsear tiempos de medicamentos con Gemini: {e}")
            # Fallback estático básico
            resultados = []
            for med in medicamentos:
                freq = 24
                dur = 7
                if med.get("frecuencia"):
                    txt = med["frecuencia"].lower()
                    if "8" in txt: freq = 8
                    elif "12" in txt: freq = 12
                    elif "6" in txt: freq = 6
                if med.get("duracion"):
                    txt = med["duracion"].lower()
                    if "5" in txt: dur = 5
                    elif "10" in txt: dur = 10
                    elif "30" in txt or "mes" in txt: dur = 30
                resultados.append({
                    "nombre": med.get("nombre"),
                    "frecuencia_horas": freq,
                    "duracion_dias": dur
                })
            return resultados
