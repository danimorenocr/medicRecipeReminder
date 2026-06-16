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

import math
import httpx
from config import GOOGLE_PLACES_API_KEY

def calcular_distancia(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Retorna la distancia en metros utilizando la fórmula de Haversine
    R = 6371000 # Radio de la Tierra en metros
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def obtener_hospitales_simulados(lat: float, lng: float) -> list:
    # Clínicas de referencia en Colombia (Bogotá / Medellín / Cali etc.)
    # Generamos clínicas simuladas alrededor de la ubicación actual del usuario sumando pequeños offsets
    clinicas_base = [
        {"name": "Clínica del Country (Urgencias 24h)", "rating": 4.5, "user_ratings_total": 452, "address": "Cra. 16 #82-57, Bogotá", "lat_offset": 0.005, "lng_offset": -0.004},
        {"name": "Hospital Universitario Fundación Santa Fe (Urgencias 24h)", "rating": 4.8, "user_ratings_total": 1250, "address": "Av. 9 #119-76, Bogotá", "lat_offset": 0.012, "lng_offset": 0.015},
        {"name": "Clínica Marly (Servicio Urgencias)", "rating": 4.1, "user_ratings_total": 310, "address": "Cra. 13 #49-40, Bogotá", "lat_offset": -0.010, "lng_offset": -0.008},
        {"name": "Hospital Universitario San Ignacio (Urgencias)", "rating": 4.3, "user_ratings_total": 890, "address": "Cra. 7 #40-62, Bogotá", "lat_offset": -0.018, "lng_offset": -0.005},
        {"name": "Clínica Reina Sofía (Colsanitas)", "rating": 4.2, "user_ratings_total": 540, "address": "Cra. 21 #127-13, Bogotá", "lat_offset": 0.022, "lng_offset": 0.005},
    ]
    
    hospitals = []
    for idx, c in enumerate(clinicas_base):
        h_lat = lat + c["lat_offset"]
        h_lng = lng + c["lng_offset"]
        dist = calcular_distancia(lat, lng, h_lat, h_lng)
        
        hospitals.append({
            "place_id": f"mock_hospital_{idx}",
            "name": c["name"],
            "rating": c["rating"],
            "user_ratings_total": c["user_ratings_total"],
            "vicinity": c["address"],
            "geometry": {
                "location": {
                    "lat": h_lat,
                    "lng": h_lng
                }
            },
            "distance": round(dist),
            "open_now": True
        })
    return hospitals

@app.get("/api/hospitals/nearby")
async def get_nearby_hospitals(lat: float, lng: float, radius: float = 5000):
    # Si la clave de Google Places no está configurada, usar simulación
    if not GOOGLE_PLACES_API_KEY or GOOGLE_PLACES_API_KEY.strip() == "":
        hospitals = obtener_hospitales_simulados(lat, lng)
        is_mock = True
    else:
        try:
            url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
            # Usamos un keyword simple para evitar que Google sobre-filtre y deje pocos resultados.
            # Delegamos el filtrado de exclusiones (veterinarias, laboratorios) al código Python.
            params = {
                "location": f"{lat},{lng}",
                "radius": radius,
                "type": "hospital",
                "keyword": "urgencias",
                "key": GOOGLE_PLACES_API_KEY
            }
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=10.0)
                if response.status_code != 200:
                    raise Exception("Error en la respuesta de Google Places API")
                data = response.json()
                
                if data.get("status") not in ["OK", "ZERO_RESULTS"]:
                    print(f"Google Places API retorno status: {data.get('status')}. Usando fallback simulado.")
                    hospitals = obtener_hospitales_simulados(lat, lng)
                    is_mock = True
                else:
                    results = data.get("results", [])
                    hospitals = []
                    for r in results:
                        name_lower = r.get("name", "").lower()
                        vicinity_lower = r.get("vicinity", "").lower()
                        
                        # Filtro manual de seguridad adicional para excluir veterinarias, mascotas y laboratorios
                        exclude_words = [
                            "veterinaria", "veterinario", "mascota", "pet ", " pets", "animal", "veterinary",
                            "laboratorio", "laboratorios", " lab", "clinilab", "diagnostico", "diagnostica"
                        ]
                        if any(w in name_lower or w in vicinity_lower for w in exclude_words):
                            continue
                            
                        geom = r.get("geometry", {})
                        loc = geom.get("location", {})
                        h_lat = loc.get("lat")
                        h_lng = loc.get("lng")
                        
                        dist = 999999
                        if h_lat is not None and h_lng is not None:
                            dist = calcular_distancia(lat, lng, h_lat, h_lng)
                            
                        hospitals.append({
                            "place_id": r.get("place_id"),
                            "name": r.get("name"),
                            "rating": r.get("rating", 0.0),
                            "user_ratings_total": r.get("user_ratings_total", 0),
                            "vicinity": r.get("vicinity", "Dirección no disponible"),
                            "geometry": geom,
                            "distance": round(dist) if dist != 999999 else None,
                            "open_now": r.get("opening_hours", {}).get("open_now", True)
                        })
                    is_mock = False
        except Exception as e:
            print(f"Error consultando Google Places API: {e}. Usando fallback simulado.")
            hospitals = obtener_hospitales_simulados(lat, lng)
            is_mock = True

    if not hospitals:
        return {"hospitals": [], "recommended_id": None, "closest_id": None, "best_rated_id": None, "is_mock": is_mock}

    hospitals_sorted_by_dist = sorted([h for h in hospitals if h["distance"] is not None], key=lambda x: x["distance"])
    closest_hospital = hospitals_sorted_by_dist[0] if hospitals_sorted_by_dist else None
    
    hospitals_with_ratings = [h for h in hospitals if h.get("rating", 0) > 0 and h.get("user_ratings_total", 0) >= 3]
    if not hospitals_with_ratings:
        hospitals_with_ratings = hospitals
    best_rated_hospital = sorted(hospitals_with_ratings, key=lambda x: x["rating"], reverse=True)[0] if hospitals_with_ratings else None
    
    def calculate_score(h):
        dist_km = (h["distance"] or 1000) / 1000.0
        rating = h.get("rating") or 3.5
        if h.get("user_ratings_total", 0) < 5:
            rating -= 0.5
        return rating / (1.0 + 0.3 * dist_km)
        
    recommended_hospital = sorted(hospitals, key=calculate_score, reverse=True)[0]

    for h in hospitals:
        tags = []
        if recommended_hospital and h["place_id"] == recommended_hospital["place_id"]:
            tags.append("recommended")
        if closest_hospital and h["place_id"] == closest_hospital["place_id"]:
            tags.append("closest")
        if best_rated_hospital and h["place_id"] == best_rated_hospital["place_id"]:
            tags.append("best_rated")
        h["tags"] = tags

    return {
        "hospitals": hospitals_sorted_by_dist,
        "recommended_id": recommended_hospital["place_id"] if recommended_hospital else None,
        "closest_id": closest_hospital["place_id"] if closest_hospital else None,
        "best_rated_id": best_rated_hospital["place_id"] if best_rated_hospital else None,
        "is_mock": is_mock
    }


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
