import requests
from typing import Optional
import config
from core.entities import Diagnosis
from core.interfaces import IICDService

class WHOICDService(IICDService):
    def __init__(self):
        self.client_id = config.ICD_CLIENT_ID
        self.client_secret = config.ICD_CLIENT_SECRET
        self.token_url = config.ICD_TOKEN_URL
        self.api_base = config.ICD_API_BASE
        self._token = None

    def _get_token(self) -> str:
        """Obtiene un token de acceso OAuth2 para la API de ICD."""
        if self._token:
            return self._token
            
        resp = requests.post(
            self.token_url,
            data={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "scope": "icdapi_access",
                "grant_type": "client_credentials",
            },
            timeout=10
        )
        resp.raise_for_status()
        self._token = resp.json()["access_token"]
        return self._token

    def _headers(self, token: str) -> dict:
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Accept-Language": "en",
            "API-Version": "v2",
        }

    def _obtener_entidad(self, url: str, token: str) -> Optional[dict]:
        try:
            resp = requests.get(url, headers=self._headers(token), timeout=10)
            if resp.status_code != 200:
                return None
            return resp.json()
        except Exception as e:
            print(f"Error al obtener entidad {url}: {e}")
            return None

    def consultar_codigo(self, codigo: str) -> Optional[Diagnosis]:
        """
        Consulta la API de ICD-10 de la OMS para un código específico.
        """
        try:
            token = self._get_token()
        except Exception as e:
            print(f"No se pudo obtener el token de ICD API: {e}")
            return None

        # La URL para el código en el release 2019 de ICD-10
        url = f"{self.api_base}/{codigo}"
        entidad = self._obtener_entidad(url, token)
        
        if not entidad:
            return None

        titulo = entidad.get('title', {}).get('@value')
        definicion = entidad.get('definition', {}).get('@value') if 'definition' in entidad else None
        
        # Categoría padre
        categoria_padre_info = None
        if "parent" in entidad and len(entidad["parent"]) > 0:
            parent_url = entidad["parent"][0]
            padre = self._obtener_entidad(parent_url, token)
            if padre:
                padre_codigo = padre.get('code', '')
                padre_titulo = padre.get('title', {}).get('@value', '')
                if padre_codigo and padre_titulo:
                    categoria_padre_info = f"{padre_codigo} - {padre_titulo}"
                elif padre_titulo:
                    categoria_padre_info = padre_titulo

        return Diagnosis(
            codigo=codigo,
            titulo_oficial=titulo,
            definicion_oficial=definicion,
            categoria_padre=categoria_padre_info
        )
