from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class Patient:
    nombre_completo: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    cedula: Optional[str] = None
    telefono: Optional[str] = None

@dataclass
class Clinic:
    nombre: Optional[str] = None
    direccion: Optional[str] = None

@dataclass
class Doctor:
    nombre: Optional[str] = None
    especialidad: Optional[str] = None

@dataclass
class Diagnosis:
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    titulo_oficial: Optional[str] = None
    definicion_oficial: Optional[str] = None
    categoria_padre: Optional[str] = None

@dataclass
class Medication:
    nombre: str
    dosis: Optional[str] = None
    frecuencia: Optional[str] = None
    duracion: Optional[str] = None
    brand_name: Optional[str] = None
    generic_name: Optional[str] = None
    manufacturer_name: Optional[str] = None
    indicaciones_fda: Optional[str] = None
    advertencias_fda: Optional[str] = None
    dosage_fda: Optional[str] = None


@dataclass
class Recipe:
    id: Optional[int] = None
    paciente: Patient = field(default_factory=Patient)
    clinica: Clinic = field(default_factory=Clinic)
    medico: Doctor = field(default_factory=Doctor)
    diagnostico: Diagnosis = field(default_factory=Diagnosis)
    fecha: Optional[str] = None
    medicamentos: List[Medication] = field(default_factory=list)
    telegram_chat_id: Optional[str] = None
    telegram_message_id: Optional[int] = None
    telegram_file_id: Optional[str] = None
    explicacion: Optional[str] = None
