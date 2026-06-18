from core.entities import Recipe
from core.interfaces import IRecipeExplainer
from infrastructure.clients.api_clients import get_groq_client

SYSTEM_PROMPT = """
Eres un asistente médico virtual amigable y comprensivo llamado "Alicia". Tu objetivo es explicar recetas médicas complejas en un lenguaje sencillo, cotidiano y comprensible para cualquier paciente, eliminando el tecnicismo médico innecesario pero manteniendo la precisión.

Debes responder estructurando la información exactamente de la siguiente manera, utilizando formato Markdown limpio y profesional:

### **Diagnóstico: [Nombre del diagnóstico] ([Código CIE-10/ICD-10 si existe])**
[Explicación amigable en un párrafo corto de qué es esta enfermedad/condición, usando analogías sencillas del día a día si aplica. Si se incluye información oficial de la OMS, incorpórala de manera amigable.]

### **Medicamentos recetados:**
[Lista con viñetas para cada medicamento:]
- **[Nombre del medicamento] ([Dosis] si aplica):** [Explicación sencilla y en español cotidiano de para qué sirve este medicamento y cómo ayuda específicamente a su condición.]

### **¿Qué significa para ti?**
[Recomendaciones generales, nivel de preocupación (ej: "No es grave, pero sí incómodo"), recomendaciones de autocuidado como reposo, hidratación o calor local según corresponda al diagnóstico, y los signos de alarma por los cuales debería consultar de inmediato a un médico.]

Reglas estrictas:
1. Sé empático, claro y muy conciso.
2. Usa lenguaje sencillo (en lugar de "cefalea", di "dolor de cabeza"; en lugar de "analgésico", di "para calmar el dolor", etc.).
3. No inventes información médica de riesgo. Si hay múltiples medicamentos combinados, explica brevemente qué hace cada componente.
4. Responde en Español.
"""

class GroqRecipeExplainer(IRecipeExplainer):
    def __init__(self, model: str = "llama-3.3-70b-versatile"):
        self.client = get_groq_client()
        self.model = model

    def explicar_receta(self, recipe: Recipe) -> str:
        """
        Genera una explicación de la receta estructurada en lenguaje natural usando Groq.
        """
        meds_text = ""
        for med in recipe.medicamentos:
            dosis_str = f", Dosis: {med.dosis}" if med.dosis else ""
            freq_str = f", Frecuencia: {med.frecuencia}" if med.frecuencia else ""
            dur_str = f", Duración: {med.duracion}" if med.duracion else ""
            
            fda_details = []
            if med.brand_name or med.generic_name:
                names = f"FDA: Brand='{med.brand_name or 'N/A'}', Generic='{med.generic_name or 'N/A'}'"
                fda_details.append(names)
            if med.indicaciones_fda:
                fda_details.append(f"Indicaciones: {med.indicaciones_fda[:300]}")
            if med.advertencias_fda:
                fda_details.append(f"Advertencias: {med.advertencias_fda[:300]}")
                
            fda_str = f"\n  (Detalles OpenFDA: {'; '.join(fda_details)})" if fda_details else ""
            meds_text += f"- {med.nombre}{dosis_str}{freq_str}{dur_str}{fda_str}\n"


        diagnostico_info = f"{recipe.diagnostico.descripcion or 'No especificado'}"
        if recipe.diagnostico.codigo:
            diagnostico_info += f" (Código: {recipe.diagnostico.codigo})"
        
        if recipe.diagnostico.titulo_oficial:
            diagnostico_info += f"\n- Título oficial OMS: {recipe.diagnostico.titulo_oficial}"
        if recipe.diagnostico.definicion_oficial:
            diagnostico_info += f"\n- Definición oficial OMS: {recipe.diagnostico.definicion_oficial}"
        if recipe.diagnostico.categoria_padre:
            diagnostico_info += f"\n- Categoría padre OMS: {recipe.diagnostico.categoria_padre}"

        user_message = f"""
        Por favor explica esta receta médica:
        
        DIAGNÓSTICO:
        {diagnostico_info}
        
        MEDICAMENTOS:
        {meds_text if meds_text else "Ninguno listado"}
        
        DATOS ADICIONALES:
        - Médico: {recipe.medico.nombre or 'No especificado'} ({recipe.medico.especialidad or 'No especificado'})
        - Fecha: {recipe.fecha or 'No especificada'}
        """

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            max_tokens=800,
            temperature=0.3
        )
        
        return response.choices[0].message.content.strip()
