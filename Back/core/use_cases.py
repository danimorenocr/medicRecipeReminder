from PIL import Image
from typing import Optional
from core.entities import Recipe
from core.interfaces import IRecipeRepository, IRecipeExtractor, IICDService, IRecipeExplainer, IMedicationInfoService

class ProcessRecipeUseCase:
    def __init__(
        self,
        extractor: IRecipeExtractor,
        icd_service: IICDService,
        explainer: IRecipeExplainer,
        fda_service: IMedicationInfoService,
        repository: IRecipeRepository
    ):
        self.extractor = extractor
        self.icd_service = icd_service
        self.explainer = explainer
        self.fda_service = fda_service
        self.repository = repository

    def execute(
        self,
        image: Image.Image,
        telegram_chat_id: Optional[str] = None,
        telegram_message_id: Optional[int] = None,
        telegram_file_id: Optional[str] = None
    ) -> Recipe:
        """
        Coordina el flujo de procesamiento de una receta médica.
        """
        # 1. Extraer información usando Gemini
        recipe = self.extractor.extraer_receta(image)
        
        # Asignar metadatos de Telegram
        recipe.telegram_chat_id = telegram_chat_id
        recipe.telegram_message_id = telegram_message_id
        recipe.telegram_file_id = telegram_file_id

        # 1.5. Consultar OpenFDA para cada medicamento
        if recipe.medicamentos:
            for med in recipe.medicamentos:
                try:
                    fda_info = self.fda_service.consultar_medicamento(med.nombre)
                    if fda_info:
                        med.brand_name = fda_info.get("brand_name")
                        med.generic_name = fda_info.get("generic_name")
                        med.manufacturer_name = fda_info.get("manufacturer_name")
                        med.indicaciones_fda = fda_info.get("indicaciones_fda")
                        med.advertencias_fda = fda_info.get("advertencias_fda")
                        med.dosage_fda = fda_info.get("dosage_fda")
                except Exception as e:
                    print(f"Error consultando OpenFDA para {med.nombre}: {e}")

        # 2. Si hay código de diagnóstico, consultar la API ICD de la OMS
        if recipe.diagnostico and recipe.diagnostico.codigo:
            codigo_limpio = recipe.diagnostico.codigo.strip()
            
            # Intentar normalizar formato (por ejemplo si viene M624 en vez de M62.4)
            # Para CIE-10 el formato estándar suele ser de 3 o 4 caracteres con punto (ej. M62.4)
            if len(codigo_limpio) > 3 and "." not in codigo_limpio:
                # Insertar punto después del tercer carácter si es un código estándar sin punto
                codigo_formateado = f"{codigo_limpio[:3]}.{codigo_limpio[3:]}"
            else:
                codigo_formateado = codigo_limpio

            try:
                diag_info = self.icd_service.consultar_codigo(codigo_formateado)
                if diag_info:
                    recipe.diagnostico.titulo_oficial = diag_info.titulo_oficial
                    recipe.diagnostico.definicion_oficial = diag_info.definicion_oficial
                    recipe.diagnostico.categoria_padre = diag_info.categoria_padre
            except Exception as e:
                # Tolerancia a fallos: continuar si falla la API ICD de la OMS
                print(f"Error consultando código ICD {codigo_formateado}: {e}")

        # 3. Generar la explicación de la receta con Groq
        explicacion = self.explainer.explicar_receta(recipe)
        recipe.explicacion = explicacion

        # 4. Guardar todo en la base de datos
        recipe_id = self.repository.guardar_receta(recipe)
        recipe.id = recipe_id
        
        if explicacion:
            self.repository.guardar_explicacion(recipe_id, explicacion)

        return recipe

