import sqlite3
import os

DB_PATH = "recetas.db"

def inicializar_db():
    """Crea las tablas de recetas y medicamentos si no existen."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Tabla recetas
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recetas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paciente_nombre TEXT,
        paciente_fecha_nacimiento TEXT,
        paciente_cedula TEXT,
        paciente_telefono TEXT,
        clinica_nombre TEXT,
        clinica_direccion TEXT,
        medico_nombre TEXT,
        medico_especialidad TEXT,
        fecha_receta TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Tabla medicamentos
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS medicamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receta_id INTEGER,
        nombre TEXT,
        dosis TEXT,
        frecuencia TEXT,
        duracion TEXT,
        FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE
    )
    """)
    
    conn.commit()
    conn.close()
    print("Base de datos inicializada correctamente.")

def guardar_receta(receta_data: dict) -> int:
    """
    Guarda los datos de la receta y sus medicamentos correspondientes en la base de datos.
    Retorna el ID de la receta insertada.
    """
    paciente = receta_data.get("paciente") or {}
    clinica = receta_data.get("clinica") or {}
    medico = receta_data.get("medico") or {}
    fecha = receta_data.get("fecha")
    medicamentos = receta_data.get("medicamentos") or []

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Insertar cabecera de la receta
        cursor.execute("""
        INSERT INTO recetas (
            paciente_nombre, paciente_fecha_nacimiento, paciente_cedula, paciente_telefono,
            clinica_nombre, clinica_direccion,
            medico_nombre, medico_especialidad,
            fecha_receta
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            paciente.get("nombre_completo"),
            paciente.get("fecha_nacimiento"),
            paciente.get("cedula"),
            paciente.get("telefono"),
            clinica.get("nombre"),
            clinica.get("direccion"),
            medico.get("nombre"),
            medico.get("especialidad"),
            fecha
        ))
        
        receta_id = cursor.lastrowid
        
        # Insertar los medicamentos asociados
        for med in medicamentos:
            cursor.execute("""
            INSERT INTO medicamentos (
                receta_id, nombre, dosis, frecuencia, duracion
            ) VALUES (?, ?, ?, ?, ?)
            """, (
                receta_id,
                med.get("nombre"),
                med.get("dosis"),
                med.get("frecuencia"),
                med.get("duracion")
            ))
            
        conn.commit()
        return receta_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
