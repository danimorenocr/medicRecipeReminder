import json
import requests

CLIENT_ID = "e30a0484-d147-4c0f-8294-3e258211c586_7dccff9f-6dc2-437c-a6be-3e31aa6ce7cf"
CLIENT_SECRET = "F6cJmvjZimp39esvz0r0BbXwy6ZYMiOItWaqrB66ClE="

TOKEN_URL = "https://icdaccessmanagement.who.int/connect/token"
API_BASE = "https://id.who.int/icd/release/10/2019"


def get_token():
    resp = requests.post(
        TOKEN_URL,
        data={
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "scope": "icdapi_access",
            "grant_type": "client_credentials",
        },
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Accept-Language": "es",
        "API-Version": "v2",
    }


def obtener_entidad(url, token):
    resp = requests.get(url, headers=headers(token))
    if resp.status_code != 200:
        return None
    return resp.json()


def mostrar_info(codigo, token):
    url = f"{API_BASE}/{codigo}"
    entidad = obtener_entidad(url, token)
    if not entidad:
        print(f"No se encontró el código {codigo}")
        return

    print(f"\n=== Código: {codigo} ===")
    print(f"Título: {entidad.get('title', {}).get('@value')}")
    print(f"Tipo de clase: {entidad.get('classKind')}")
    print(f"URL: {entidad.get('browserUrl')}")

    # Definición (si existe)
    if "definition" in entidad:
        print(f"Definición: {entidad['definition'].get('@value')}")

    # Inclusiones (si existen)
    if "inclusion" in entidad:
        print("Incluye:")
        for inc in entidad["inclusion"]:
            print(f"  - {inc['label'].get('@value')}")

    # Exclusiones (si existen)
    if "exclusion" in entidad:
        print("Excluye:")
        for exc in entidad["exclusion"]:
            print(f"  - {exc['label'].get('@value')}")

    # Categoría padre
    if "parent" in entidad:
        for parent_url in entidad["parent"]:
            padre = obtener_entidad(parent_url, token)
            if padre:
                print(f"Categoría padre ({padre.get('code')}): {padre.get('title', {}).get('@value')}")


def main():
    token = get_token()
    codigos = ["M62.4", "J03.9"]

    for codigo in codigos:
        mostrar_info(codigo, token)


if __name__ == "__main__":
    main()