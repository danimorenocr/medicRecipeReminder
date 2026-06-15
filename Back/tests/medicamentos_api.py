import requests
import json

def buscar_en_fda(nombre):
    print(f"🔍 Buscando '{nombre}' en OpenFDA...")
    
    # URL de búsqueda en la base de datos de etiquetas de medicamentos (drug label)
    # Buscamos tanto en el nombre de marca (brand_name) como en el genérico (generic_name)
    url = f'https://api.fda.gov/drug/label.json?search=openfda.brand_name:"{nombre}"+openfda.generic_name:"{nombre}"&limit=1'
    
    try:
        response = requests.get(url)
        
        if response.status_code == 200:
            datos = response.json()
            
            if datos.get("results"):
                resultado = datos["results"][0]
                openfda_info = resultado.get("openfda", {})
                
                print("\n--- RESULTADO ENCONTRADO EN FDA ---")
                
                # Nombres
                marcas = openfda_info.get("brand_name", ["N/A"])
                genericos = openfda_info.get("generic_name", ["N/A"])
                print(f"📌 Nombre Comercial (Brand): {', '.join(marcas)}")
                print(f"🧪 Nombre Genérico: {', '.join(genericos)}")
                
                # Fabricante / Laboratorio
                fabricante = openfda_info.get("manufacturer_name", ["Desconocido"])
                print(f"🏢 Fabricante: {', '.join(fabricante)}")
                
                # Información Médica (Vienen como listas de textos)
                print("\n📋 ¿Para qué sirve? (Indications and Usage):")
                indicaciones = resultado.get("indications_and_usage", ["No especificado"])
                print(indicaciones[0][:500] + "..." if len(indicaciones[0]) > 500 else indicaciones[0])
                
                print("\n⚠️ Advertencias (Warnings):")
                advertencias = resultado.get("warnings", ["No especificado"])
                print(advertencias[0][:500] + "..." if len(advertencias[0]) > 500 else advertencias[0])
                
                print("\n💡 Dosificación (Dosage & Administration):")
                dosis = resultado.get("dosage_and_administration", ["No especificado"])
                print(dosis[0][:500] + "..." if len(dosis[0]) > 500 else dosis[0])
                
                print("------------------------------------\n")
                
                # Opción de ver el JSON entero
                ver_raw = input("¿Quieres ver el JSON completo de la FDA? (s/n): ")
                if ver_raw.lower() == 's':
                    print(json.dumps(resultado, indent=4, ensure_ascii=False))
            else:
                print(f"❌ No se encontraron resultados en la FDA para: '{nombre}'")
                
        elif response.status_code == 404:
            print(f"❌ No se encontró ningún medicamento con el nombre: '{nombre}' (404)")
        else:
            print(f"⚠️ Error en la API de la FDA. Código HTTP: {response.status_code}")
            
    except Exception as e:
        print(f"🚨 Error de conexión: {e}")

if __name__ == "__main__":
    medicamento = input("Escribe el nombre del medicamento (ej: Aspirin, Ibuprofen, Lipitor, Ventolin): ")
    buscar_en_fda(medicamento)