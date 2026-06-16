import io
import dataclasses
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from PIL import Image
from infrastructure.database.sqlite_repository import SQLiteRecipeRepository
from infrastructure.services.gemini_extractor import GeminiRecipeExtractor
from infrastructure.services.icd_service import WHOICDService
from infrastructure.services.groq_explainer import GroqRecipeExplainer
from infrastructure.services.openfda_service import OpenFDAService
from core.use_cases import ProcessRecipeUseCase

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Recetas Claras API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar los componentes de la Arquitectura Limpia
repository = SQLiteRecipeRepository()
extractor = GeminiRecipeExtractor()
icd_service = WHOICDService()
explainer = GroqRecipeExplainer()
fda_service = OpenFDAService()

use_case = ProcessRecipeUseCase(
    extractor=extractor,
    icd_service=icd_service,
    explainer=explainer,
    fda_service=fda_service,
    repository=repository
)

from datetime import datetime

def calcular_edad(fecha_nacimiento_str: str) -> int:
    try:
        # fecha_nacimiento_str se espera en formato YYYY-MM-DD o YYYY/MM/DD o DD/MM/YYYY
        # Soportar múltiples formatos comunes
        fecha_nacimiento_str = fecha_nacimiento_str.replace("/", "-")
        parts = fecha_nacimiento_str.split("-")
        if len(parts) == 3:
            # Si tiene formato DD-MM-YYYY
            if len(parts[0]) == 2 and len(parts[2]) == 4:
                birthdate = datetime.strptime(fecha_nacimiento_str, "%d-%m-%d" if len(parts[1]) == 2 else "%d-%m-%Y")
            else:
                birthdate = datetime.strptime(fecha_nacimiento_str, "%Y-%m-%d")
        else:
            birthdate = datetime.strptime(fecha_nacimiento_str, "%Y-%m-%d")
        today = datetime.today()
        return today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))
    except Exception as e:
        print(f"Error calculando edad: {e}")
        return 0

@app.get("/api/profile")
async def get_profile():
    try:
        profile = repository.obtener_perfil_usuario()
        if not profile:
            return {}
        profile["edad"] = calcular_edad(profile.get("fecha_nacimiento", ""))
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/profile")
async def save_profile(request: dict):
    try:
        user_id = repository.guardar_o_actualizar_perfil_usuario(request)
        return {"id": user_id, "status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/recipes")
async def get_recipes():
    try:
        return repository.obtener_recetas()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/medications")
async def get_medications():
    try:
        return repository.obtener_todos_los_medicamentos()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/medications")
async def create_medication(request: dict):
    try:
        med_id = repository.guardar_o_actualizar_medicamento(request)
        return {"id": med_id, "status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/medications/{id}")
async def update_medication(id: int, request: dict):
    try:
        request["id"] = id
        med_id = repository.guardar_o_actualizar_medicamento(request)
        return {"id": med_id, "status": "updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/medications/{id}")
async def delete_medication(id: int):
    try:
        repository.eliminar_medicamento(id)
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(request: dict):
    message = request.get("message")
    history = request.get("history", [])
    if not message:
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío")
        
    try:
        from infrastructure.clients.api_clients import get_groq_client
        client = get_groq_client()
        
        # Determinar si es el inicio de la conversación (sin mensajes previos del usuario en el historial)
        is_initial_stage = True
        for msg in history:
            if msg.get("role") == "user":
                is_initial_stage = False
                break
        
        # Palabras clave en español relacionadas con dolor o malestar físico
        pain_keywords = ["dolor", "duele", "doliendo", "molestia", "malestar", "punzada", "cólico", "jaqueca", "migraña", "ardor", "siento mal", "enfermo"]
        message_lower = message.lower()
        has_pain = any(kw in message_lower for kw in pain_keywords)
        
        system_instruction = (
            "Eres el asistente médico virtual amigable de MediAssist AI.\n"
            "Tus respuestas deben ser muy concisas, breves y empáticas. Evita explicaciones largas, tecnicismos excesivos u oraciones innecesarias. "
            "Si el usuario pregunta algo no relacionado con salud o medicina, recuérdale amigablemente que tu especialidad es el cuidado de la salud.\n\n"
            "Sigue estrictamente estas pautas para estructurar la conversación:\n"
            "1. Cuando el usuario te mencione un dolor o síntoma (especialmente al inicio):\n"
            "   - Muestra empatía de forma muy breve (ej. 'Lamento escuchar eso', 'El dolor en X puede ser muy molesto' o similar, usando su nombre si ya lo conoces).\n"
            "   - Explica brevemente y en palabras sencillas qué es o dónde está esa zona o síntoma si es relevante (ej. 'el coxis (la \"colita\" o hueso al final de la columna)').\n"
            "   - Haz de inmediato 1 o 2 preguntas muy directas sobre cómo empezó (ej. '¿El dolor comenzó después de una caída, golpe, o estar sentada mucho tiempo?').\n"
            "2. Cuando el usuario responda a tu pregunta sobre el origen/causa del síntoma:\n"
            "   - Responde comenzando exactamente con la frase: '¡Perfecto, [Nombre]! Te explico lo que pienso hasta ahora:' (o similar, usando su nombre si lo sabes).\n"
            "   - Explica de forma muy breve (un solo párrafo corto de 2 o 3 líneas) la causa del síntoma, relacionándolo de forma sencilla con su diagnóstico y cómo le ayudarán los medicamentos recetados a aliviarlo.\n"
            "   - Sé sumamente directo y conciso."
        )
        
        messages = [{"role": "system", "content": system_instruction}]
        
        # Cargar historial
        for msg in history:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
            
        # Añadir mensaje actual
        messages.append({"role": "user", "content": message})
        
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=600,
            temperature=0.7
        )
        
        reply = response.choices[0].message.content.strip()
        return {"reply": reply}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recipes/process")
async def process_recipe(
    file: UploadFile = File(...),
    chat_id: str = Form(None),
    message_id: str = Form(None),
    file_id: str = Form(None)
):
    try:
        # Leer la imagen
        file_bytes = await file.read()
        image = Image.open(io.BytesIO(file_bytes))
        
        # Ejecutar el caso de uso
        recipe = use_case.execute(
            image=image,
            telegram_chat_id=chat_id,
            telegram_message_id=message_id,
            telegram_file_id=file_id
        )
        
        # Convertir entidad de receta a diccionario
        recipe_dict = {
            "paciente": dataclasses.asdict(recipe.paciente),
            "clinica": dataclasses.asdict(recipe.clinica),
            "medico": dataclasses.asdict(recipe.medico),
            "diagnostico": dataclasses.asdict(recipe.diagnostico),
            "fecha": recipe.fecha,
            "medicamentos": [dataclasses.asdict(m) for m in recipe.medicamentos]
        }
        
        return {
            "id": recipe.id,
            "explicacion": recipe.explicacion,
            "recipe_dict": recipe_dict
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
