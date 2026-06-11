import os
import requests
from dotenv import load_dotenv
from google import genai
from groq import Groq

# Cargar variables de entorno
load_dotenv()

# Configuración de credenciales y fallbacks
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Inicialización de clientes
try:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Error al inicializar el cliente de Gemini: {e}")
    gemini_client = None

try:
    groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
except Exception as e:
    print(f"Error al inicializar el cliente de Groq: {e}")
    groq_client = None


def llamar_groq(system_prompt: str, user_message: str, model: str = "llama-3.3-70b-versatile", max_tokens: int = 600, temperature: float = 0.3) -> str:
    """Realiza una consulta a la API de Groq utilizando el modelo configurado."""
    if not groq_client:
        raise ValueError("El cliente de Groq no ha sido inicializado. Verifica tu GROQ_API_KEY.")
    
    response = groq_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        max_tokens=max_tokens,
        temperature=temperature
    )
    return response.choices[0].message.content


def consultar_fda(componente: str) -> dict:
    """
    Busca información de un medicamento o principio activo en OpenFDA.
    Retorna un diccionario con los datos en crudo o el estado de la búsqueda.
    """
    url = f'https://api.fda.gov/drug/label.json?search=openfda.generic_name:"{componente}"+openfda.brand_name:"{componente}"&limit=1'
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            datos = response.json()
            if datos.get("results"):
                resultado = datos["results"][0]
                return {
                    "status": "ok",
                    "brand_name": resultado.get("openfda", {}).get("brand_name", ["N/A"]),
                    "generic_name": resultado.get("openfda", {}).get("generic_name", ["N/A"]),
                    "manufacturer_name": resultado.get("openfda", {}).get("manufacturer_name", ["Desconocido"]),
                    "indicaciones_raw": resultado.get("indications_and_usage", ["No especificado"])[0],
                    "advertencias_raw": resultado.get("warnings", ["No especificado"])[0],
                    "dosage_raw": resultado.get("dosage_and_administration", ["No especificado"])[0]
                }
        return {"status": "not_found"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
