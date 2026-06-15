from google import genai
from groq import Groq
import config

def get_gemini_client() -> genai.Client:
    """Retorna un cliente inicializado de Gemini."""
    if not config.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY no configurada.")
    return genai.Client(api_key=config.GEMINI_API_KEY)

def get_groq_client() -> Groq:
    """Retorna un cliente inicializado de Groq."""
    if not config.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY no configurada.")
    return Groq(api_key=config.GROQ_API_KEY)
