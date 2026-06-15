import sqlite3
from typing import Optional
import config
from core.entities import Recipe, Patient, Clinic, Doctor, Diagnosis, Medication
from core.interfaces import IRecipeRepository

class SQLiteRecipeRepository(IRecipeRepository):
    def __init__(self, db_path: str = config.DB_PATH):
        self.db_path = db_path
        self._inicializar_db()

    def _inicializar_db(self):
        """Inicializa las tablas de la base de datos si no existen."""
        conn = sqlite3.connect(self.db_path)
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
            telegram_chat_id TEXT,
            telegram_message_id INTEGER,
            telegram_file_id TEXT,
            diagnostico_codigo TEXT,
            diagnostico_descripcion TEXT,
            explicacion TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # Agregar columnas si la tabla ya existía sin ellas (para actualizaciones fluidas)
        columns_to_check = [
            ("telegram_chat_id", "TEXT"),
            ("telegram_message_id", "INTEGER"),
            ("telegram_file_id", "TEXT"),
            ("diagnostico_codigo", "TEXT"),
            ("diagnostico_descripcion", "TEXT"),
            ("explicacion", "TEXT")
        ]
        for col, col_type in columns_to_check:
            try:
                cursor.execute(f"ALTER TABLE recetas ADD COLUMN {col} {col_type}")
            except sqlite3.OperationalError:
                pass  # La columna ya existe
                
        # Tabla medicamentos
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS medicamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            receta_id INTEGER,
            nombre TEXT,
            dosis TEXT,
            frecuencia TEXT,
            duracion TEXT,
            brand_name TEXT,
            generic_name TEXT,
            manufacturer_name TEXT,
            indicaciones_fda TEXT,
            advertencias_fda TEXT,
            dosage_fda TEXT,
            FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE
        )
        """)

        # Agregar columnas si la tabla ya existía sin ellas
        meds_columns_to_check = [
            ("brand_name", "TEXT"),
            ("generic_name", "TEXT"),
            ("manufacturer_name", "TEXT"),
            ("indicaciones_fda", "TEXT"),
            ("advertencias_fda", "TEXT"),
            ("dosage_fda", "TEXT")
        ]
        for col, col_type in meds_columns_to_check:
            try:
                cursor.execute(f"ALTER TABLE medicamentos ADD COLUMN {col} {col_type}")
            except sqlite3.OperationalError:
                pass

        # Tabla historial mensajes_telegram
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS mensajes_telegram (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_chat_id TEXT,
            telegram_message_id INTEGER,
            tipo TEXT,
            contenido TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Tabla recordatorios
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS recordatorios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            receta_id INTEGER,
            chat_id TEXT,
            medicamento_nombre TEXT,
            frecuencia_horas INTEGER,
            duracion_dias INTEGER,
            fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            proximo_envio TIMESTAMP,
            activo BOOLEAN DEFAULT 1,
            FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE
        )
        """)
        
        conn.commit()
        conn.close()

    def guardar_receta(self, recipe: Recipe) -> int:
        """Guarda los datos de la receta en SQLite."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
            INSERT INTO recetas (
                paciente_nombre, paciente_fecha_nacimiento, paciente_cedula, paciente_telefono,
                clinica_nombre, clinica_direccion,
                medico_nombre, medico_especialidad,
                fecha_receta,
                telegram_chat_id, telegram_message_id, telegram_file_id,
                diagnostico_codigo, diagnostico_descripcion,
                explicacion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                recipe.paciente.nombre_completo,
                recipe.paciente.fecha_nacimiento,
                recipe.paciente.cedula,
                recipe.paciente.telefono,
                recipe.clinica.nombre,
                recipe.clinica.direccion,
                recipe.medico.nombre,
                recipe.medico.especialidad,
                recipe.fecha,
                recipe.telegram_chat_id,
                recipe.telegram_message_id,
                recipe.telegram_file_id,
                recipe.diagnostico.codigo,
                recipe.diagnostico.descripcion,
                recipe.explicacion
            ))
            
            recipe_id = cursor.lastrowid
            
            # Guardar medicamentos correspondientes
            for med in recipe.medicamentos:
                cursor.execute("""
                INSERT INTO medicamentos (
                    receta_id, nombre, dosis, frecuencia, duracion,
                    brand_name, generic_name, manufacturer_name,
                    indicaciones_fda, advertencias_fda, dosage_fda
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    recipe_id,
                    med.nombre,
                    med.dosis,
                    med.frecuencia,
                    med.duracion,
                    med.brand_name,
                    med.generic_name,
                    med.manufacturer_name,
                    med.indicaciones_fda,
                    med.advertencias_fda,
                    med.dosage_fda
                ))

                
            conn.commit()
            return recipe_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def guardar_explicacion(self, recipe_id: int, explicacion: str) -> None:
        """Guarda o actualiza la explicación de la receta."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        try:
            cursor.execute("""
            UPDATE recetas
            SET explicacion = ?
            WHERE id = ?
            """, (explicacion, recipe_id))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def registrar_mensaje(self, chat_id: str, message_id: int, tipo: str, contenido: str) -> None:
        """Registra un mensaje de Telegram en la tabla historial."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        try:
            cursor.execute("""
            INSERT INTO mensajes_telegram (telegram_chat_id, telegram_message_id, tipo, contenido)
            VALUES (?, ?, ?, ?)
            """, (str(chat_id), message_id, tipo, contenido))
            conn.commit()
        except Exception as e:
            print(f"Error al registrar mensaje en DB: {e}")
        finally:
            conn.close()

    def guardar_recordatorio(self, receta_id: int, chat_id: str, medicamento_nombre: str, frecuencia_horas: int, duracion_dias: int, proximo_envio: str) -> int:
        """Guarda un recordatorio en la base de datos."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        try:
            cursor.execute("""
            INSERT INTO recordatorios (receta_id, chat_id, medicamento_nombre, frecuencia_horas, duracion_dias, proximo_envio)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (receta_id, str(chat_id), medicamento_nombre, frecuencia_horas, duracion_dias, proximo_envio))
            conn.commit()
            return cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def obtener_recordatorios_activos(self) -> list:
        """Obtiene una lista de todos los recordatorios activos."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        try:
            cursor.execute("""
            SELECT id, receta_id, chat_id, medicamento_nombre, frecuencia_horas, duracion_dias, fecha_inicio, proximo_envio, activo
            FROM recordatorios
            WHERE activo = 1
            """)
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        except Exception as e:
            print(f"Error al obtener recordatorios activos: {e}")
            return []
        finally:
            conn.close()

    def actualizar_proximo_envio_recordatorio(self, recordatorio_id: int, proximo_envio: str) -> None:
        """Actualiza la fecha del próximo envío para un recordatorio."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        try:
            cursor.execute("""
            UPDATE recordatorios
            SET proximo_envio = ?
            WHERE id = ?
            """, (proximo_envio, recordatorio_id))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def desactivar_recordatorio(self, recordatorio_id: int) -> None:
        """Desactiva un recordatorio (activo = 0)."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        try:
            cursor.execute("""
            UPDATE recordatorios
            SET activo = 0
            WHERE id = ?
            """, (recordatorio_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def obtener_medicamentos_por_receta(self, receta_id: int) -> list:
        """Obtiene todos los medicamentos asociados a una receta."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        try:
            cursor.execute("""
            SELECT id, receta_id, nombre, dosis, frecuencia, duracion
            FROM medicamentos
            WHERE receta_id = ?
            """, (receta_id,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        except Exception as e:
            print(f"Error al obtener medicamentos para receta {receta_id}: {e}")
            return []
        finally:
            conn.close()

    def obtener_recetas(self) -> list:
        """Obtiene todas las recetas guardadas junto con sus medicamentos."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        try:
            cursor.execute("""
            SELECT id, paciente_nombre, paciente_fecha_nacimiento, paciente_cedula, paciente_telefono,
                   clinica_nombre, clinica_direccion, medico_nombre, medico_especialidad,
                   fecha_receta, telegram_chat_id, telegram_message_id, telegram_file_id,
                   diagnostico_codigo, diagnostico_descripcion, explicacion, created_at
            FROM recetas
            ORDER BY id DESC
            """)
            recetas = [dict(r) for r in cursor.fetchall()]
            for r in recetas:
                r["medicamentos"] = self.obtener_medicamentos_por_receta(r["id"])
            return recetas
        except Exception as e:
            print(f"Error al obtener recetas: {e}")
            return []
        finally:
            conn.close()


