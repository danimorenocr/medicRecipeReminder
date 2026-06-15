import requests
from typing import Optional
from core.interfaces import IMedicationInfoService

class OpenFDAService(IMedicationInfoService):
    def consultar_medicamento(self, nombre: str) -> Optional[dict]:
        """
        Busca información de un medicamento o principio activo en OpenFDA.
        """
        # Buscamos tanto en el nombre de marca (brand_name) como en el genérico (generic_name)
        url = f'https://api.fda.gov/drug/label.json?search=openfda.brand_name:"{nombre}"+openfda.generic_name:"{nombre}"&limit=1'
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                datos = response.json()
                if datos.get("results"):
                    resultado = datos["results"][0]
                    openfda_info = resultado.get("openfda", {})
                    
                    brand_names = openfda_info.get("brand_name", [])
                    brand_name = brand_names[0] if brand_names else None
                    
                    generic_names = openfda_info.get("generic_name", [])
                    generic_name = generic_names[0] if generic_names else None
                    
                    manufacturers = openfda_info.get("manufacturer_name", [])
                    manufacturer = manufacturers[0] if manufacturers else None
                    
                    indicaciones = resultado.get("indications_and_usage", [])
                    indicaciones_txt = indicaciones[0] if indicaciones else None
                    
                    advertencias = resultado.get("warnings", [])
                    advertencias_txt = advertencias[0] if advertencias else None
                    
                    dosage = resultado.get("dosage_and_administration", [])
                    dosage_txt = dosage[0] if dosage else None
                    
                    return {
                        "brand_name": brand_name,
                        "generic_name": generic_name,
                        "manufacturer_name": manufacturer,
                        "indicaciones_fda": indicaciones_txt,
                        "advertencias_fda": advertencias_txt,
                        "dosage_fda": dosage_txt
                    }
            return None
        except Exception as e:
            print(f"Error consultando OpenFDA para {nombre}: {e}")
            return None
