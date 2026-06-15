import sys
import os
from PIL import Image

# Agregar la raíz del proyecto al path para importar los módulos correctamente
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.entities import Recipe, Patient, Clinic, Doctor, Diagnosis, Medication
from infrastructure.database.sqlite_repository import SQLiteRecipeRepository
from infrastructure.services.icd_service import WHOICDService
from infrastructure.services.groq_explainer import GroqRecipeExplainer
from core.use_cases import ProcessRecipeUseCase

def test_database():
    print("\n--- Probando SQLite Repository ---")
    repo = SQLiteRecipeRepository("test_recetas.db")
    
    recipe = Recipe(
        paciente=Patient(nombre_completo="Paciente de Prueba", cedula="123456"),
        clinica=Clinic(nombre="Clinica de Prueba"),
        medico=Doctor(nombre="Dr. De Prueba", especialidad="Pediatría"),
        diagnostico=Diagnosis(codigo="J03.9", descripcion="Amigdalitis aguda"),
        fecha="2026-06-12",
        medicamentos=[
            Medication(nombre="Amoxicilina", dosis="500mg", frecuencia="Cada 8 horas", duracion="7 días")
        ]
    )
    
    recipe_id = repo.guardar_receta(recipe)
    print(f"[OK] Receta guardada con ID: {recipe_id}")
    
    repo.guardar_explicacion(recipe_id, "Esta es una explicación de prueba generada por Groq.")
    print("[OK] Explicación guardada correctamente.")
    
    # Limpiar base de datos de prueba
    if os.path.exists("test_recetas.db"):
        os.remove("test_recetas.db")
        print("[DB] Base de datos de prueba eliminada.")

def test_icd_service():
    print("\n--- Probando API ICD de la OMS ---")
    service = WHOICDService()
    codigos = ["M62.4", "J03.9"]
    
    for cod in codigos:
        print(f"Consultando código: {cod}...")
        try:
            res = service.consultar_codigo(cod)
            if res:
                print(f"  [OK] Título oficial: {res.titulo_oficial}")
                print(f"  [OK] Definición oficial: {res.definicion_oficial}")
                print(f"  [OK] Categoría padre: {res.categoria_padre}")
            else:
                print(f"  [ERR] No se encontró información para el código {cod}")
        except Exception as e:
            print(f"  [ERR] Error consultando código {cod}: {e}")

def test_groq_explainer():
    print("\n--- Probando Groq Explainer ---")
    explainer = GroqRecipeExplainer()
    
    recipe = Recipe(
        paciente=Patient(nombre_completo="Carlos Pérez"),
        diagnostico=Diagnosis(
            codigo="M62.4", 
            descripcion="Contractura muscular",
            titulo_oficial="Contractura muscular",
            definicion_oficial="Contracción persistente e involuntaria de un músculo.",
            categoria_padre="Otros trastornos musculares"
        ),
        medicamentos=[
            Medication(nombre="Tiamina", dosis="100mg", frecuencia="Diario", duracion="30 días"),
            Medication(nombre="Metocarbamol + Ibuprofeno", dosis="400mg/500mg", frecuencia="Cada 8 horas", duracion="5 días")
        ]
    )
    
    try:
        explicacion = explainer.explicar_receta(recipe)
        print("[OK] Explicación generada exitosamente por Groq:")
        print(explicacion)
    except Exception as e:
        print(f"[ERR] Error al generar explicación con Groq: {e}")

if __name__ == "__main__":
    print("Iniciando pruebas de componentes de la Arquitectura Limpia...")
    test_database()
    test_icd_service()
    test_groq_explainer()
