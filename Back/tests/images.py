import os
import io
import time
from PIL import Image
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from google import genai
from google.genai.errors import APIError  # Para capturar errores específicos de la API
import requests

from dotenv import load_dotenv

load_dotenv()

# 1. CONFIGURACIÓN (Reemplaza con tus credenciales o usa variables de entorno)
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Inicializamos el cliente de Gemini (SDK actualizado)
ai_client = genai.Client(api_key=GEMINI_API_KEY)

# Comando /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 ¡Hola! Soy un bot OCR inteligente.\n"
        "Envíame cualquier imagen que contenga texto y te diré qué dice."
    )

# Función para procesar la imagen
async def handle_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_chat_action(action="typing")
    
    try:
        # 1. Descargar y procesar imagen con Telegram y PIL
        photo_file = await update.message.photo[-1].get_file()
        photo_bytearray = await photo_file.download_as_bytearray()
        image = Image.open(io.BytesIO(photo_bytearray))
        
        # 2. Le pedimos a Gemini que extraiga el nombre (Con manejo de error 503)
        prompt = (
            "Analiza esta imagen de un medicamento. Identifica su nombre comercial o principio activo principal. "
            "Devuelve ÚNICAMENTE el nombre más claro que encuentres, sin saludos, sin puntos, ni explicaciones. "
            "Ejemplo de salida esperada: Paracetamol"
        )
        
        response = None
        intentos = 3  # Intentará hasta 3 veces si el servidor está lleno
        
        for intencion in range(intentos):
            try:
                response = ai_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[image, prompt]
                )
                break  # Si funciona, salimos del ciclo de reintentos
            except APIError as e:
                if e.code == 503 and intencion < intentos - 1:
                    print(f"⚠️ Servidor ocupado (503). Reintentando en {intencion + 2} segundos...")
                    time.sleep(intencion + 2)  # Espera progresiva: 2s, luego 3s...
                    continue
                else:
                    # Si es otro error o ya agotó los intentos, lanza la excepción
                    raise e

        if not response:
            await update.message.reply_text("⏳ El servidor de IA está muy saturado en este momento. Por favor, intenta enviar la foto otra vez en unos segundos.")
            return

        nombre_medicamento = response.text.strip()
        print(f"Gemini detectó el medicamento: {nombre_medicamento}")
        
        if not nombre_medicamento or "no encontrado" in nombre_medicamento.lower():
            await update.message.reply_text("🤔 No logré identificar un nombre de medicamento claro en la imagen.")
            return

        # 3. Consultar la API Gratuita de la AEMPS (CIMA)
        url_api = f"https://cima.aemps.es/cima/rest/medicamentos?nombre={nombre_medicamento}"
        api_response = requests.get(url_api)
        
        if api_response.status_code == 200:
            datos = api_response.json()
            
            # Verificar si la API encontró resultados
            if datos.get("resultados"):
                # Tomamos el primer resultado encontrado
                med = datos["resultados"][0]
                
                nombre = med.get("nombre", "N/A")
                principios_activos = ", ".join([p.get("nombre", "") for p in med.get("principiosActivos", [])])
                lab = med.get("labtitular", "Desconocido")
                receta = "Sí ⚠️" if med.get("receta") else "No ✅"
                
                # Links a prospectos oficiales si existen
                prospecto_link = ""
                for documento in med.get("docs", []):
                    if documento.get("tipo") == 2: # Tipo 2 suele ser el prospecto (paciente)
                        prospecto_link = f"\n📄 [Ver Prospecto Oficial]({documento.get('url')})"

                # 4. Construir la respuesta para el usuario
                mensaje_final = (
                    f"🔍 **Medicamento Encontrado:**\n"
                    f"🔹 **Nombre:** {nombre}\n"
                    f"🧪 **Principio Activo:** {principios_activos}\n"
                    f"🏢 **Laboratorio:** {lab}\n"
                    f"📋 **Requiere Receta:** {receta}\n"
                    f"{prospecto_link}"
                )
                await update.message.reply_text(mensaje_final, parse_mode="Markdown")
            else:
                await update.message.reply_text(
                    f"🤖 Gemini leyó: '{nombre_medicamento}', pero no encontré registros oficiales en la base de datos médica."
                )
        else:
            await update.message.reply_text("⚠️ Hubo un problema al conectar con la base de datos médica.")

    except Exception as e:
        print(f"Error general: {e}")
        await update.message.reply_text("❌ Ocurrió un error al procesar tu solicitud.")

def main():
    # Crear la aplicación de Telegram
    application = Application.builder().token(TELEGRAM_TOKEN).build()

    # Registrar los manejadores (handlers)
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.PHOTO, handle_image))

    # Iniciar el bot en modo polling (escucha activa)
    print("Bot en marcha... Presiona Ctrl+C para detenerlo.")
    application.run_polling()

if __name__ == '__main__':
    main()