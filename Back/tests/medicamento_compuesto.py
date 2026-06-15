import os
import io
import json
import time
import requests
from PIL import Image
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from google import genai
from google.genai.errors import APIError
from dotenv import load_dotenv
from groq import Groq

# Cargar variables de entorno (.env)
load_dotenv()

# ==========================================
# CONFIGURACIÓN (Coloca tus credenciales)
# ==========================================
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

ai_client = genai.Client(api_key=GEMINI_API_KEY)
groq_client = Groq(api_key=GROQ_API_KEY)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 ¡Hola! Envíame una foto de tu receta u orden médica y buscaré "
        "la información oficial y advertencias de cada uno de tus medicamentos."
    )

def consultar_fda_individual(componente):
    """Consulta un único componente en la API de la FDA."""
    url = f'https://api.fda.gov/drug/label.json?search=openfda.generic_name:"{componente}"&limit=1'
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            datos = response.json()
            if datos.get("results"):
                resultado = datos["results"][0]
                # Extraemos fragmentos clave en inglés para que la IA los procese
                return {
                    "status": "ok",
                    "indicaciones_raw": resultado.get("indications_and_usage", [""])[0],
                    "advertencias_raw": resultado.get("warnings", [""])[0]
                }
        return {"status": "not_found"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

async def handle_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_chat_action(action="typing")
    
    try:
        # 1. Descargar imagen de Telegram
        photo_file = await update.message.photo[-1].get_file()
        photo_bytearray = await photo_file.download_as_bytearray()
        image = Image.open(io.BytesIO(photo_bytearray))
        
        # 2. Paso 1 con Gemini: Extraer componentes estructurados en formato JSON estructurado
        prompt_extraccion = (
            "Analiza esta receta médica. Identifica todos los principios activos de los medicamentos listados. "
            "Para cada uno, traduce su nombre científico/genérico al inglés médico oficial (por ejemplo: 'tiamina' -> 'thiamine', 'metocarbamol' -> 'methocarbamol'). "
            "Devuelve estrictamente un arreglo JSON con los nombres en inglés. No incluyas markdown, ni bloques de código, ni texto adicional.\n"
            "Ejemplo de salida esperada:\n"
            '["thiamine", "methocarbamol", "ibuprofen", "trimebutine", "simethicone"]'
        )
        
        # Manejo de reintentos por si la IA está saturada (Error 503)
        response_ia = None
        for intento in range(3):
            try:
                response_ia = ai_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[image, prompt_extraccion]
                )
                break
            except APIError as e:
                if e.code == 503 and intento < 2:
                    time.sleep(intento + 2)
                    continue
                raise e

        if not response_ia:
            await update.message.reply_text("⏳ El servidor de IA está saturado, por favor intenta de nuevo.")
            return

        # Limpiar y parsear la respuesta de la IA para convertirla en una lista de Python
        texto_limpio = response_ia.text.strip().replace("```json", "").replace("```", "").strip()
        try:
            lista_componentes = json.loads(texto_limpio)
        except Exception:
            await update.message.reply_text("❌ No logré estructurar los componentes de la receta de forma correcta.")
            return

        print(f"🧪 Componentes detectados por la IA: {lista_componentes}")
        
        if not lista_componentes:
            await update.message.reply_text("🤔 No encontré principios activos legibles en la imagen.")
            return

        await update.message.reply_text(f"📝 He detectado {len(lista_componentes)} componentes en tu receta. Buscando en la base de datos médica...")

        # 3. Iterar sobre cada componente y consultar la FDA
        for comp in lista_componentes:
            await update.message.reply_chat_action(action="typing")
            
            resultado_fda = consultar_fda_individual(comp)
            
            if resultado_fda["status"] == "ok":
                # 4. Paso 2 con Groq: Traducir y resumir la data técnica de la FDA al usuario
                prompt_resumen = (
                    f"Eres un asistente médico experto para pacientes. Toma la siguiente información técnica en inglés de la FDA "
                    f"para el componente '{comp}' y genera un resumen breve, claro y fácil de entender en ESPAÑOL.\n\n"
                    f"INFORMACIÓN DE LA FDA:\n"
                    f"- Indicaciones: {resultado_fda['indicaciones_raw'][:800]}\n"
                    f"- Advertencias: {resultado_fda['advertencias_raw'][:800]}\n\n"
                    f"Devuelve tu respuesta con este formato exacto en Markdown:\n"
                    f"💊 **Componente:** {comp.upper()}\n"
                    f"📋 **¿Para qué sirve?:** (Resumen corto en español)\n"
                    f"⚠️ **Precauciones / Advertencias:** (Resumen corto en español de riesgos esenciales)"
                )
                
                response_groq = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "user", "content": prompt_resumen}
                    ],
                    max_tokens=600,
                    temperature=0.3
                )
                resumen_texto = response_groq.choices[0].message.content
                await update.message.reply_text(resumen_texto, parse_mode="Markdown")
                
            else:
                # Si la FDA no lo tiene (sucede con moléculas muy locales o antiguas como a veces la trimebutina en EE.UU.)
                # Dejamos que Groq use su propio conocimiento médico de respaldo
                prompt_respaldo = (
                    f"El componente medicamento '{comp}' no se encuentra en la base de datos de EE.UU. "
                    f"Usa tu propio conocimiento médico para explicarle brevemente al paciente en español qué es.\n"
                    f"Formato Markdown:\n"
                    f"💊 **Componente:** {comp.upper()} (Información general)\n"
                    f"📋 **¿Para qué sirve?:** (Explicación corta)\n"
                    f"⚠️ **Nota:** Este compuesto puede variar en regulación según el país."
                )
                response_groq = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "user", "content": prompt_respaldo}
                    ],
                    max_tokens=600,
                    temperature=0.3
                )
                resumen_texto = response_groq.choices[0].message.content
                await update.message.reply_text(resumen_texto, parse_mode="Markdown")
                
            # Pequeña pausa para no saturar las llamadas de Telegram o la API
            time.sleep(1)

    except Exception as e:
        print(f"Error General: {e}")
        await update.message.reply_text("❌ Ocurrió un error al procesar la receta médica.")

def main():
    application = Application.builder().token(TELEGRAM_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.PHOTO, handle_image))
    
    print("Bot listo y escuchando órdenes médicas...")
    application.run_polling()

if __name__ == '__main__':
    main()