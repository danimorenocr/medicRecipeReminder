import sqlite3
import json
from typing import Optional
from datetime import datetime
import config
from core.entities import Recipe, Patient, Clinic, Doctor, Diagnosis, Medication
from core.interfaces import IRecipeRepository
from infrastructure.services.encryption_service import encrypt_data, decrypt_data

def parse_frecuencia_alarms(frecuencia: str) -> list:
    f = (frecuencia or "").lower()
    times = ["08:00 AM"]
    if "12" in f or "doce" in f:
        times = ["08:00 AM", "08:00 PM"]
    elif "8" in f or "ocho" in f:
        times = ["08:00 AM", "04:00 PM", "12:00 AM"]
    elif "6" in f or "seis" in f:
        times = ["06:00 AM", "12:00 PM", "06:00 PM", "12:00 AM"]
    elif "4" in f or "cuatro" in f:
        times = ["08:00 AM", "12:00 PM", "04:00 PM", "08:00 PM", "12:00 AM", "04:00 AM"]
    return [{"id": i + 1, "time": t, "active": True, "status": "pending"} for i, t in enumerate(times)]


class SQLiteRecipeRepository(IRecipeRepository):
    def __init__(self, db_path: str = config.DB_PATH):
        self.db_path = db_path
        self._inicializar_db()

    def _inicializar_db(self):
        """Inicializa las tablas de la base de datos si no existen."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Habilitar modo WAL para permitir lectura y escritura concurrentes
        cursor.execute("PRAGMA journal_mode=WAL;")
        
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
            icon TEXT,
            iconBg TEXT,
            active BOOLEAN DEFAULT 1,
            alarms_json TEXT,
            history_json TEXT,
            created_at TEXT,
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
            ("dosage_fda", "TEXT"),
            ("icon", "TEXT"),
            ("iconBg", "TEXT"),
            ("active", "BOOLEAN DEFAULT 1"),
            ("alarms_json", "TEXT"),
            ("history_json", "TEXT"),
            ("created_at", "TEXT")
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

        # Tabla usuarios
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            fecha_nacimiento TEXT,
            tipo_sangre TEXT,
            alergias TEXT,
            condicion_base TEXT,
            sexo TEXT
        )
        """)

        # Migración: Agregar columna sexo si no existe
        try:
            cursor.execute("ALTER TABLE usuarios ADD COLUMN sexo TEXT")
        except sqlite3.OperationalError:
            pass # La columna ya existe

        # Tabla historial mensajes_chat (App Móvil)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS mensajes_chat (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
                encrypt_data(recipe.paciente.nombre_completo),
                encrypt_data(recipe.paciente.fecha_nacimiento),
                encrypt_data(recipe.paciente.cedula),
                encrypt_data(recipe.paciente.telefono),
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
                alarms = parse_frecuencia_alarms(med.frecuencia)
                cursor.execute("""
                INSERT INTO medicamentos (
                    receta_id, nombre, dosis, frecuencia, duracion,
                    brand_name, generic_name, manufacturer_name,
                    indicaciones_fda, advertencias_fda, dosage_fda,
                    icon, iconBg, active, alarms_json, history_json,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    med.dosage_fda,
                    "pill",
                    "#c4d2ff30",
                    1,
                    json.dumps(alarms),
                    "[]",
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S")
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
            SELECT id, receta_id, nombre, dosis, frecuencia, duracion,
                   icon, iconBg, active, alarms_json, history_json
            FROM medicamentos
            WHERE receta_id = ?
            """, (receta_id,))
            rows = cursor.fetchall()
            meds = []
            for r in rows:
                d = dict(r)
                try:
                    d["alarms"] = json.loads(d["alarms_json"]) if d.get("alarms_json") else []
                except Exception:
                    d["alarms"] = []
                try:
                    d["history"] = json.loads(d["history_json"]) if d.get("history_json") else []
                except Exception:
                    d["history"] = []
                d["active"] = bool(d.get("active"))
                d["name"] = d.pop("nombre", "")
                d["dose"] = d.pop("dosis", "")
                d["frequency"] = d.pop("frecuencia", "")
                d["duration"] = d.pop("duracion", "")
                d.pop("alarms_json", None)
                d.pop("history_json", None)
                meds.append(d)
            return meds
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
                r["paciente_nombre"] = decrypt_data(r.get("paciente_nombre"))
                r["paciente_fecha_nacimiento"] = decrypt_data(r.get("paciente_fecha_nacimiento"))
                r["paciente_cedula"] = decrypt_data(r.get("paciente_cedula"))
                r["paciente_telefono"] = decrypt_data(r.get("paciente_telefono"))
                r["medicamentos"] = self.obtener_medicamentos_por_receta(r["id"])
            return recetas
        except Exception as e:
            print(f"Error al obtener recetas: {e}")
            return []
        finally:
            conn.close()

    def obtener_todos_los_medicamentos(self) -> list:
        """Obtiene todos los medicamentos guardados, con o sin receta asociada."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        try:
            cursor.execute("""
            SELECT m.id, m.receta_id, m.nombre, m.dosis, m.frecuencia, m.duracion,
                   m.icon, m.iconBg, m.active, m.alarms_json, m.history_json,
                   m.created_at as med_created_at,
                   r.fecha_receta, r.created_at as receta_created_at
            FROM medicamentos m
            LEFT JOIN recetas r ON m.receta_id = r.id
            ORDER BY m.id DESC
            """)
            rows = cursor.fetchall()
            meds = []
            for r in rows:
                d = dict(r)
                try:
                    d["alarms"] = json.loads(d["alarms_json"]) if d.get("alarms_json") else []
                except Exception:
                    d["alarms"] = []
                try:
                    d["history"] = json.loads(d["history_json"]) if d.get("history_json") else []
                except Exception:
                    d["history"] = []
                d["active"] = bool(d.get("active"))
                d["created_at"] = d.get("med_created_at")
                d["name"] = d.pop("nombre", "")
                d["dose"] = d.pop("dosis", "")
                d["frequency"] = d.pop("frecuencia", "")
                d["duration"] = d.pop("duracion", "")
                d.pop("alarms_json", None)
                d.pop("history_json", None)
                meds.append(d)
            return meds
        except Exception as e:
            print(f"Error al obtener todos los medicamentos: {e}")
            return []
        finally:
            conn.close()

    def guardar_o_actualizar_medicamento(self, med: dict) -> int:
        """Guarda un nuevo medicamento o actualiza uno existente."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        med_id = med.get("id")
        receta_id = med.get("receta_id")
        nombre = med.get("name", med.get("nombre", ""))
        dosis = med.get("dose", med.get("dosis", ""))
        frecuencia = med.get("frequency", med.get("frecuencia", ""))
        duracion = med.get("duration", med.get("duracion", ""))
        icon = med.get("icon", "pill")
        iconBg = med.get("iconBg", "#c4d2ff30")
        active = 1 if med.get("active", True) else 0
        alarms_json = json.dumps(med.get("alarms", []))
        history_json = json.dumps(med.get("history", []))
        created_at = med.get("created_at") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        try:
            if med_id:
                cursor.execute("""
                UPDATE medicamentos
                SET receta_id = ?, nombre = ?, dosis = ?, frecuencia = ?, duracion = ?,
                    icon = ?, iconBg = ?, active = ?, alarms_json = ?, history_json = ?
                WHERE id = ?
                """, (receta_id, nombre, dosis, frecuencia, duracion, icon, iconBg, active, alarms_json, history_json, med_id))
                conn.commit()
                return med_id
            else:
                cursor.execute("""
                INSERT INTO medicamentos (
                    receta_id, nombre, dosis, frecuencia, duracion,
                    icon, iconBg, active, alarms_json, history_json,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (receta_id, nombre, dosis, frecuencia, duracion, icon, iconBg, active, alarms_json, history_json, created_at))
                conn.commit()
                return cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def eliminar_medicamento(self, med_id: int) -> None:
        """Elimina un medicamento de la base de datos."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM medicamentos WHERE id = ?", (med_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def obtener_perfil_usuario(self) -> Optional[dict]:
        """Obtiene el primer usuario registrado en la base de datos (perfil activo)."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT id, username, password, fecha_nacimiento, tipo_sangre, alergias, condicion_base, sexo FROM usuarios LIMIT 1")
            row = cursor.fetchone()
            if row:
                d = dict(row)
                d["password"] = decrypt_data(d.get("password"))
                d["fecha_nacimiento"] = decrypt_data(d.get("fecha_nacimiento"))
                d["tipo_sangre"] = decrypt_data(d.get("tipo_sangre"))
                d["alergias"] = decrypt_data(d.get("alergias"))
                d["condicion_base"] = decrypt_data(d.get("condicion_base"))
                d["sexo"] = decrypt_data(d.get("sexo"))
                return d
            return None
        except Exception as e:
            print(f"Error al obtener perfil de usuario: {e}")
            return None
        finally:
            conn.close()

    def guardar_o_actualizar_perfil_usuario(self, datos: dict) -> int:
        """Guarda o actualiza el perfil del usuario."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        username = datos.get("username")
        password = encrypt_data(datos.get("password"))
        fecha_nacimiento = encrypt_data(datos.get("fecha_nacimiento"))
        tipo_sangre = encrypt_data(datos.get("tipo_sangre"))
        alergias = encrypt_data(datos.get("alergias") if isinstance(datos.get("alergias"), str) else json.dumps(datos.get("alergias")))
        condicion_base = encrypt_data(datos.get("condicion_base"))
        sexo = encrypt_data(datos.get("sexo"))
        
        try:
            # Comprobar si ya existe algún usuario
            cursor.execute("SELECT id FROM usuarios LIMIT 1")
            row = cursor.fetchone()
            if row:
                user_id = row[0]
                cursor.execute("""
                UPDATE usuarios
                SET username = ?, password = ?, fecha_nacimiento = ?, tipo_sangre = ?, alergias = ?, condicion_base = ?, sexo = ?
                WHERE id = ?
                """, (username, password, fecha_nacimiento, tipo_sangre, alergias, condicion_base, sexo, user_id))
                conn.commit()
                return user_id
            else:
                cursor.execute("""
                INSERT INTO usuarios (username, password, fecha_nacimiento, tipo_sangre, alergias, condicion_base, sexo)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (username, password, fecha_nacimiento, tipo_sangre, alergias, condicion_base, sexo))
                conn.commit()
                return cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def obtener_historial_chat(self) -> list:
        """Obtiene el historial completo de mensajes del chat de la app móvil."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT role, content, created_at FROM mensajes_chat ORDER BY id ASC")
            return [dict(r) for r in cursor.fetchall()]
        except Exception as e:
            print(f"Error al obtener historial de chat: {e}")
            return []
        finally:
            conn.close()

    def guardar_mensaje_chat(self, role: str, content: str) -> None:
        """Guarda un mensaje del chat (usuario o asistente) en la base de datos."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO mensajes_chat (role, content) VALUES (?, ?)", (role, content))
            conn.commit()
        except Exception as e:
            print(f"Error al guardar mensaje de chat: {e}")
        finally:
            conn.close()

    def vaciar_historial_chat(self) -> None:
        """Elimina todos los mensajes del historial de chat."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM mensajes_chat")
            conn.commit()
        except Exception as e:
            print(f"Error al vaciar historial de chat: {e}")
        finally:
            conn.close()



