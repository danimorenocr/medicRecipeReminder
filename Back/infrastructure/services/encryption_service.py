import os
import sys
from cryptography.fernet import Fernet

# Intentar obtener la clave de las variables de entorno
key_str = os.getenv("ENCRYPTION_KEY")

if not key_str:
    print("⚠️ ADVERTENCIA: ENCRYPTION_KEY no está configurada en el entorno. Usando clave de desarrollo por defecto.", file=sys.stderr)
    # Clave de desarrollo fija (base64 de 32 bytes) para que funcione localmente sin configuración inicial
    key = b"yL1_pX99T6_xH8dD_7j9eD4p9q5r9tDw3y2x1z0v8uM="
else:
    key = key_str.encode()

try:
    cipher_suite = Fernet(key)
except Exception as e:
    print(f"❌ Error al inicializar Fernet con la clave provista: {e}. Generando una clave temporal para esta sesión.", file=sys.stderr)
    temp_key = Fernet.generate_key()
    cipher_suite = Fernet(temp_key)

def encrypt_data(value: str) -> str:
    """
    Encripta una cadena de texto y la retorna como string codificado.
    Si el valor es None o no es un string, lo retorna tal cual.
    """
    if not value or not isinstance(value, str):
        return value
    try:
        encrypted_bytes = cipher_suite.encrypt(value.encode('utf-8'))
        return encrypted_bytes.decode('utf-8')
    except Exception as e:
        print(f"Error al encriptar datos: {e}", file=sys.stderr)
        return value

def decrypt_data(value: str) -> str:
    """
    Desencripta una cadena de texto.
    Si falla (por estar en texto plano o por cambio de clave), retorna el valor original.
    """
    if not value or not isinstance(value, str):
        return value
    try:
        decrypted_bytes = cipher_suite.decrypt(value.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except Exception:
        # Retorna el valor original (permite compatibilidad con texto plano histórico)
        return value
