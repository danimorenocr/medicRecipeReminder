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
        
        system_instruction = (
            "Eres el asistente médico virtual amigable de MediAssist AI. "
            "Responde preguntas sobre salud, medicamentos y recetas de manera clara, comprensible, empática y concisa. "
            "Si el usuario pregunta algo no relacionado con salud o medicina, recuérdale amigablemente que tu especialidad es el cuidado de la salud."
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
