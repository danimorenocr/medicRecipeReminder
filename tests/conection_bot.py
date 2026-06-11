import os
import re
from dotenv import load_dotenv
from telegram import Update, ReplyKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder, CommandHandler,
    MessageHandler, filters, ContextTypes, ConversationHandler
)
from groq import Groq

load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Estados de la conversación
MENU, RECETA, SINTOMAS = range(3)

SYSTEM_RECETA = """Eres un asistente de salud para Colombia. Explicas fórmulas 
médicas en lenguaje sencillo para pacientes colombianos. Considera el contexto 
del PBS y las EPS colombianas. Usa emojis para que sea más fácil de leer en 
Telegram. Estructura tu respuesta así:

💊 *MEDICAMENTOS*
Por cada medicamento: nombre, para qué sirve, cómo tomarlo.

⚠️ *QUÉ EVITAR*
Alimentos, bebidas o actividades a evitar.

🚨 *SEÑALES DE ALARMA*
Síntomas que requieren ir al médico o urgencias.

⏰ *RECORDATORIO*
Consejo simple para no olvidar las dosis.

Responde en español colombiano claro. Máximo 500 palabras."""

SYSTEM_SINTOMAS = """Eres un orientador de salud para Colombia. Según los 
síntomas del paciente, le dices a dónde debe ir. Considera el sistema de 
salud colombiano (EPS, IPS, urgencias). Usa emojis para Telegram.

Estructura tu respuesta así:

🏥 *A DÓNDE IR*: URGENCIAS / MÉDICO GENERAL / EN CASA

📋 *POR QUÉ*: Explicación breve.

✅ *QUÉ HACER AHORA*: Pasos concretos.

🚨 *VE A URGENCIAS SI*: Señales de alarma adicionales.

💡 *CONSEJO EPS*: Tip para navegar el sistema colombiano.

Responde en español colombiano claro."""


def llamar_groq(system_prompt: str, user_message: str) -> str:
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        max_tokens=600,
        temperature=0.3
    )
    return response.choices[0].message.content


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    teclado = [["💊 Mi receta médica", "🤒 Tengo síntomas"]]
    markup = ReplyKeyboardMarkup(teclado, resize_keyboard=True)
    await update.message.reply_text(
        "👋 ¡Hola! Soy *RecetaClara*, tu asistente de salud colombiano.\n\n"
        "Puedo ayudarte a:\n"
        "💊 *Entender tu fórmula médica* en lenguaje sencillo\n"
        "🤒 *Orientarte* sobre a dónde ir según tus síntomas\n\n"
        "⚠️ _No soy un médico. Ante emergencias llama al 123._\n\n"
        "¿Qué necesitas hoy?",
        parse_mode="Markdown",
        reply_markup=markup
    )
    return MENU


async def menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    texto = update.message.text
    if "receta" in texto.lower():
        await update.message.reply_text(
            "💊 Escríbeme o pega tu *fórmula médica*.\n\n"
            "_Ejemplo: Amoxicilina 500mg c/8h x 7 días, "
            "Ibuprofeno 400mg si hay dolor_",
            parse_mode="Markdown"
        )
        return RECETA
    elif "síntomas" in texto.lower() or "sintomas" in texto.lower():
        await update.message.reply_text(
            "🤒 Cuéntame tus síntomas con detalle.\n\n"
            "_Ejemplo: Tengo fiebre de 38.5, dolor de cabeza "
            "y tos seca hace 2 días. Tengo 35 años y soy de Bogotá._",
            parse_mode="Markdown"
        )
        return SINTOMAS
    else:
        await update.message.reply_text(
            "Usa los botones del menú 👇",
        )
        return MENU


async def procesar_receta(update: Update, context: ContextTypes.DEFAULT_TYPE):
    receta = update.message.text
    await update.message.reply_text("⏳ Analizando tu receta...")

    try:
        respuesta = llamar_groq(SYSTEM_RECETA, f"Fórmula médica: {receta}")
        await update.message.reply_text(respuesta, parse_mode="Markdown")
        await update.message.reply_text(
            "¿Necesitas algo más?",
            reply_markup=ReplyKeyboardMarkup(
                [["💊 Nueva receta", "🤒 Tengo síntomas"]],
                resize_keyboard=True
            )
        )
    except Exception as e:
        await update.message.reply_text(
            "❌ Hubo un error. Intenta de nuevo en un momento."
        )
    return MENU


async def procesar_sintomas(update: Update, context: ContextTypes.DEFAULT_TYPE):
    sintomas = update.message.text
    await update.message.reply_text("⏳ Analizando tus síntomas...")

    try:
        respuesta = llamar_groq(SYSTEM_SINTOMAS, f"Síntomas: {sintomas}")
        await update.message.reply_text(respuesta, parse_mode="Markdown")
        await update.message.reply_text(
            "¿Necesitas algo más?",
            reply_markup=ReplyKeyboardMarkup(
                [["💊 Mi receta médica", "🤒 Tengo síntomas"]],
                resize_keyboard=True
            )
        )
    except Exception as e:
        await update.message.reply_text(
            "❌ Hubo un error. Intenta de nuevo en un momento."
        )
    return MENU


async def cancelar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Hasta luego 👋 Escribe /start para volver.")
    return ConversationHandler.END


def main():
    app = ApplicationBuilder().token(os.getenv("TELEGRAM_TOKEN")).build()

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            MENU: [MessageHandler(filters.TEXT & ~filters.COMMAND, menu)],
            RECETA: [MessageHandler(filters.TEXT & ~filters.COMMAND, procesar_receta)],
            SINTOMAS: [MessageHandler(filters.TEXT & ~filters.COMMAND, procesar_sintomas)],
        },
        fallbacks=[CommandHandler("cancelar", cancelar)],
    )

    app.add_handler(conv_handler)
    print("🤖 Bot corriendo...")
    app.run_polling()


if __name__ == "__main__":
    main()