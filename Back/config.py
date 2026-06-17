import os
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# Configuración de APIs
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")

ICD_CLIENT_ID = os.getenv("ICD_CLIENT_ID")
ICD_CLIENT_SECRET = os.getenv("ICD_CLIENT_SECRET")
ICD_TOKEN_URL = "https://icdaccessmanagement.who.int/connect/token"
ICD_API_BASE = "https://id.who.int/icd/release/10/2019"

# Configuración de base de datos
DB_PATH = os.getenv("DB_PATH", "recetas.db")
