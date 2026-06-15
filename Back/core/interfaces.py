from abc import ABC, abstractmethod
from typing import Optional
from PIL import Image
from core.entities import Recipe, Diagnosis

class IRecipeRepository(ABC):
    @abstractmethod
    def guardar_receta(self, recipe: Recipe) -> int:
        """Guarda una receta en la base de datos y retorna su ID."""
        pass

    @abstractmethod
    def guardar_explicacion(self, recipe_id: int, explicacion: str) -> None:
        """Asocia y guarda la explicación generada para una receta específica."""
        pass

    @abstractmethod
    def registrar_mensaje(self, chat_id: str, message_id: int, tipo: str, contenido: str) -> None:
        """Registra un mensaje de Telegram en el historial."""
        pass

    @abstractmethod
    def guardar_recordatorio(self, receta_id: int, chat_id: str, medicamento_nombre: str, frecuencia_horas: int, duracion_dias: int, proximo_envio: str) -> int:
        """Guarda un recordatorio en la base de datos."""
        pass

    @abstractmethod
    def obtener_recordatorios_activos(self) -> list:
        """Obtiene una lista de todos los recordatorios activos."""
        pass

    @abstractmethod
    def actualizar_proximo_envio_recordatorio(self, recordatorio_id: int, proximo_envio: str) -> None:
        """Actualiza la fecha del próximo envío para un recordatorio."""
        pass

    @abstractmethod
    def desactivar_recordatorio(self, recordatorio_id: int) -> None:
        """Desactiva un recordatorio (activo = 0)."""
        pass

    @abstractmethod
    def obtener_medicamentos_por_receta(self, receta_id: int) -> list:
        """Obtiene todos los medicamentos asociados a una receta."""
        pass

    @abstractmethod
    def obtener_recetas(self) -> list:
        """Obtiene todas las recetas guardadas junto con sus medicamentos."""
        pass



class IRecipeExtractor(ABC):
    @abstractmethod
    def extraer_receta(self, image: Image.Image) -> Recipe:
        """Extrae la información estructurada de una receta a partir de una imagen."""
        pass

class IICDService(ABC):
    @abstractmethod
    def consultar_codigo(self, codigo: str) -> Optional[Diagnosis]:
        """Consulta la API de ICD de la OMS para obtener detalles del diagnóstico."""
        pass

class IRecipeExplainer(ABC):
    @abstractmethod
    def explicar_receta(self, recipe: Recipe) -> str:
        """Genera una explicación amigable en lenguaje cotidiano sobre la receta."""
        pass

class IMedicationInfoService(ABC):
    @abstractmethod
    def consultar_medicamento(self, nombre: str) -> Optional[dict]:
        """Consulta información detallada de un medicamento."""
        pass

