import io
import json
import httpx
from datetime import datetime, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes
import config
from infrastructure.database.sqlite_repository import SQLiteRecipeRepository

# Inicializar componentes locales
repository = SQLiteRecipeRepository()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Manejador del comando /start."""
    chat_id = str(update.effective_chat.id)
    message_id = update.effective_message.message_id
    repository.registrar_mensaje(chat_id, message_id, 'comando', '/start')
    
    await update.message.reply_text(
        "👋 ¡Hola! Soy August, tu asistente inteligente de salud.\n\n"
        "Envíame una foto de tu receta u orden médica. Extraeré los datos estructurados, "
        "consultaré el diagnóstico oficial CIE-10 y te explicaré de forma sencilla y en "
        "lenguaje cotidiano para qué sirve cada medicamento y qué significa para ti."
    )

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Manejador para procesar imágenes enviadas por los usuarios enviándolas a la API."""
    await update.message.reply_chat_action(action="typing")
    
    chat_id = str(update.effective_chat.id)
    message_id = update.effective_message.message_id
    file_id = update.message.photo[-1].file_id
    
    # Registrar la recepción de la foto en la base de datos
    repository.registrar_mensaje(chat_id, message_id, 'foto', file_id)
    
    try:
        # Descargar la imagen de Telegram
        photo_file = await update.message.photo[-1].get_file()
        photo_bytearray = await photo_file.download_as_bytearray()
        
        await update.message.reply_text("⏳ Procesando imagen de la receta médica con IA (Extracción + CIE-10 + Explicación)...")
        
        # Enviar la imagen a la API de FastAPI
        async with httpx.AsyncClient(timeout=120.0) as client:
            files = {'file': ('recipe.jpg', bytes(photo_bytearray), 'image/jpeg')}
            data = {
                'chat_id': chat_id,
                'message_id': str(message_id),
                'file_id': file_id
            }
            # Cambia la URL si la API corre en otro host/puerto
            response = await client.post("http://localhost:8000/api/recipes/process", files=files, data=data)
            response.raise_for_status()
            res_json = response.json()
            
        recipe_id = res_json["id"]
        explicacion = res_json["explicacion"]
        recipe_dict = res_json["recipe_dict"]
        
        json_str = json.dumps(recipe_dict, indent=2, ensure_ascii=False)
        
        # Formatear la respuesta combinando la explicación amigable de Groq y el JSON
        mensaje_respuesta = (
            f"{explicacion}\n\n"
            f"---\n"
            f"📋 **Datos Técnicos Extraídos (ID: {recipe_id})**:\n"
            f"```json\n{json_str}\n```"
        )
        
        # Verificar si hay medicamentos elegibles para recordatorios
        elegibles = [m for m in recipe_dict["medicamentos"] if m.get("frecuencia") and m.get("duracion")]
        reply_markup = None
        if elegibles:
            keyboard = [
                [
                    InlineKeyboardButton("⏰ Activar Recordatorios", callback_data=f"act_rem:{recipe_id}"),
                    InlineKeyboardButton("❌ No, gracias", callback_data=f"dis_rem:{recipe_id}")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            mensaje_respuesta += "\n\n🔔 **He detectado horarios en tu receta.** ¿Deseas activar recordatorios automáticos para tus medicamentos?"

        # Enviar respuesta formateada
        await update.message.reply_text(mensaje_respuesta, parse_mode="Markdown", reply_markup=reply_markup)
        
    except Exception as e:
        print(f"Error al procesar la imagen: {e}")
        import traceback
        traceback.print_exc()
        await update.message.reply_text(
            f"❌ Ocurrió un error al procesar tu receta médica:\n`{str(e)}`",
            parse_mode="Markdown"
        )

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Registra en la base de datos cualquier mensaje de texto que entre al bot."""
    chat_id = str(update.effective_chat.id)
    message_id = update.effective_message.message_id
    texto = update.message.text
    
    # Registrar en la base de datos
    repository.registrar_mensaje(chat_id, message_id, 'texto', texto)

async def enviar_alerta_medicamento(context: ContextTypes.DEFAULT_TYPE):
    """Callback para enviar alertas periódicas de medicamentos."""
    job = context.job
    chat_id = job.chat_id
    med_name = job.data["med_name"]
    dosis = job.data["dosis"]
    recordatorio_id = job.data["recordatorio_id"]
    fecha_inicio_str = job.data["fecha_inicio"]
    duracion_dias = job.data["duracion_dias"]
    
    # Comprobar si ya expiró el tratamiento
    fecha_inicio = datetime.fromisoformat(fecha_inicio_str)
    if datetime.now() > fecha_inicio + timedelta(days=duracion_dias):
        repository.desactivar_recordatorio(recordatorio_id)
        job.schedule_removal()
        await context.bot.send_message(
            chat_id=chat_id,
            text=f"✅ Tu tratamiento para **{med_name}** ha finalizado. ¡Que te mejores!",
            parse_mode="Markdown"
        )
        return
        
    dosis_str = f" ({dosis})" if dosis else ""
    mensaje = f"🔔 **Recordatorio de Medicamento**:\n\nEs hora de tomar tu **{med_name}**{dosis_str}."
    await context.bot.send_message(chat_id=chat_id, text=mensaje, parse_mode="Markdown")

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Manejador para la confirmación de los recordatorios."""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    chat_id = str(update.effective_chat.id)
    
    if data.startswith("act_rem:"):
        recipe_id = int(data.split(":")[1])
        await query.edit_message_reply_markup(reply_markup=None)
        
        status_msg = await query.message.reply_text("⏳ Procesando receta y configurando tus recordatorios...")
        
        # Obtener medicamentos
        medicamentos = repository.obtener_medicamentos_por_receta(recipe_id)
        elegibles = [m for m in medicamentos if m.get("frecuencia") and m.get("duracion")]
        
        if not elegibles:
            await status_msg.edit_text("❌ No se encontraron medicamentos con horarios válidos en esta receta.")
            return
            
        from infrastructure.services.reminder_parser import ReminderParser
        parser = ReminderParser()
        tiempos = parser.parsear_tiempos(elegibles)
        
        activados_text = []
        ahora = datetime.now()
        
        for t in tiempos:
            nombre = t.get("nombre")
            freq_h = t.get("frecuencia_horas", 24)
            dur_d = t.get("duracion_dias", 7)
            
            # Buscar la dosis original
            dosis = ""
            for el in elegibles:
                if el["nombre"].lower() == nombre.lower():
                    dosis = el.get("dosis") or ""
                    break
            
            # Calcular proximo envio
            proximo_envio = (ahora + timedelta(hours=freq_h)).isoformat()
            
            # Guardar en base de datos
            rec_id = repository.guardar_recordatorio(
                receta_id=recipe_id,
                chat_id=chat_id,
                medicamento_nombre=nombre,
                frecuencia_horas=freq_h,
                duracion_dias=dur_d,
                proximo_envio=proximo_envio
            )
            
            # Programar en la JobQueue
            context.job_queue.run_repeating(
                enviar_alerta_medicamento,
                interval=freq_h * 3600,
                first=freq_h * 3600,
                chat_id=chat_id,
                name=f"reminder_{rec_id}",
                data={
                    "recordatorio_id": rec_id,
                    "med_name": nombre,
                    "dosis": dosis,
                    "fecha_inicio": ahora.isoformat(),
                    "duracion_dias": dur_d
                }
            )
            
            activados_text.append(f"- **{nombre}**: Cada {freq_h} horas por {dur_d} días.")
            
        res_msg = "⏰ **¡Recordatorios activados con éxito!**\n\nTe notificaré en los horarios establecidos:\n" + "\n".join(activados_text)
        await status_msg.edit_text(res_msg, parse_mode="Markdown")
        
    elif data.startswith("dis_rem:"):
        await query.edit_message_reply_markup(reply_markup=None)
        await query.message.reply_text("Entendido, no se configurarán recordatorios para esta receta.")

def restaurar_recordatorios(application):
    """Restaura todos los recordatorios activos al iniciar el bot."""
    recordatorios = repository.obtener_recordatorios_activos()
    if not recordatorios:
        return
        
    ahora = datetime.now()
    count = 0
    jq = application.job_queue
    if not jq:
        print("Advertencia: JobQueue no disponible, no se pudieron restaurar los recordatorios.")
        return
        
    for r in recordatorios:
        rec_id = r["id"]
        chat_id = r["chat_id"]
        nombre = r["medicamento_nombre"]
        freq_h = r["frecuencia_horas"]
        dur_d = r["duracion_dias"]
        fecha_inicio_str = r["fecha_inicio"]
        proximo_envio_str = r["proximo_envio"]
        
        # Calcular fecha inicio y proximo envio
        try:
            # Reemplazar espacio con 'T' para formato ISO compatible
            if fecha_inicio_str and " " in fecha_inicio_str:
                fecha_inicio_str = fecha_inicio_str.replace(" ", "T")
            if proximo_envio_str and " " in proximo_envio_str:
                proximo_envio_str = proximo_envio_str.replace(" ", "T")
                
            fecha_inicio = datetime.fromisoformat(fecha_inicio_str) if fecha_inicio_str else ahora
            proximo_envio = datetime.fromisoformat(proximo_envio_str) if proximo_envio_str else (ahora + timedelta(hours=freq_h))
        except Exception as err:
            print(f"Error al analizar fechas de recordatorio {rec_id}: {err}")
            fecha_inicio = ahora
            proximo_envio = ahora + timedelta(hours=freq_h)
            
        if ahora > fecha_inicio + timedelta(days=dur_d):
            repository.desactivar_recordatorio(rec_id)
            continue
            
        segundos_restantes = (proximo_envio - ahora).total_seconds()
        if segundos_restantes < 0:
            segundos_restantes = 1
            
        jq.run_repeating(
            enviar_alerta_medicamento,
            interval=freq_h * 3600,
            first=segundos_restantes,
            chat_id=chat_id,
            name=f"reminder_{rec_id}",
            data={
                "recordatorio_id": rec_id,
                "med_name": nombre,
                "dosis": "",
                "fecha_inicio": fecha_inicio.isoformat(),
                "duracion_dias": dur_d
            }
        )
        count += 1
        
    print(f"Restaurados {count} recordatorios activos en la cola de trabajo.")

def main():
    if not config.TELEGRAM_TOKEN:
        print("Error: TELEGRAM_TOKEN no configurado en las variables de entorno.")
        return
        
    # Inicializar la aplicación del bot de Telegram con mayores timeouts por defecto
    app = (
        ApplicationBuilder()
        .token(config.TELEGRAM_TOKEN)
        .read_timeout(60)
        .write_timeout(60)
        .connect_timeout(60)
        .build()
    )
    
    # Registrar los manejadores
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    app.add_handler(CallbackQueryHandler(handle_callback))
    
    # Restaurar recordatorios al arrancar
    restaurar_recordatorios(app)
    
    print("Bot August iniciado y escuchando...")
    app.run_polling()

if __name__ == "__main__":
    main()
