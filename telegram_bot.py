import io
import json
import os
from PIL import Image
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes
from api_clients import TELEGRAM_TOKEN
from recipe_extractor import extraer_receta_json
from database import inicializar_db, guardar_receta

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Manejador del comando /start."""
    await update.message.reply_text(
        "👋 ¡Hola! Soy un Bot extractor de recetas médicas.\n\n"
        "Envíame una foto de tu receta u orden médica e identificaré los datos del paciente, "
        "médico y los medicamentos para guardarlos en la base de datos local."
    )

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Manejador para procesar imágenes enviadas por los usuarios."""
    await update.message.reply_chat_action(action="typing")
    
    try:
        # Descargar la imagen de Telegram
        photo_file = await update.message.photo[-1].get_file()
        photo_bytearray = await photo_file.download_as_bytearray()
        
        # Abrir la imagen usando PIL
        image = Image.open(io.BytesIO(photo_bytearray))
        
        await update.message.reply_text("⏳ Procesando imagen de la receta médica con IA...")
        
        # Extraer información en JSON usando nuestro módulo recipe_extractor
        receta_data = extraer_receta_json(image)
        
        # Guardar en la base de datos local SQLite
        receta_id = guardar_receta(receta_data)
        
        # Convertir a cadena de texto con sangría
        json_str = json.dumps(receta_data, indent=2, ensure_ascii=False)
        
        # Enviar respuesta formateada
        mensaje_respuesta = (
            f"✅ **¡Información Extraída e Insertada en DB (ID: {receta_id})!**\n\n"
            f"```json\n{json_str}\n```"
        )
        await update.message.reply_text(mensaje_respuesta, parse_mode="Markdown")
        
    except Exception as e:
        print(f"Error al procesar la imagen: {e}")
        await update.message.reply_text(
            f"❌ Ocurrió un error al procesar tu receta médica:\n`{str(e)}`",
            parse_mode="Markdown"
        )

def main():
    if not TELEGRAM_TOKEN:
        print("Error: TELEGRAM_TOKEN no configurado en las variables de entorno ni en el fallback.")
        return
    
    # Inicializar la base de datos SQLite
    inicializar_db()
        
    # Inicializar la aplicación del bot de Telegram
    app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
    
    # Registrar los manejadores
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    
    print("Bot extractor de recetas iniciado y escuchando...")
    app.run_polling()

if __name__ == "__main__":
    main()
