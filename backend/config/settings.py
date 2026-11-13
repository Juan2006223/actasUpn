from pathlib import Path
import os
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent

try:
    # Variables locales opcionales (claves de IA, etc.) en un archivo .env en la raíz del proyecto.
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass

SECRET_KEY = os.environ.get('SECRET_KEY', 'actas-secret-key-change-in-production-upn')
DEBUG = os.environ.get('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0,testserver').split(',')
    if h.strip()
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'features.usuarios.infraestructura.apps.UsuariosInfraConfig',
    'features.grupos.infraestructura.apps.GruposInfraConfig',
    'features.actas.infraestructura.apps.ActasInfraConfig',
    'features.transcripcion.infraestructura.apps.TranscripcionInfraConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_USER_MODEL = 'usuarios.User'

AUTHENTICATION_BACKENDS = [
    'features.usuarios.infraestructura.backends.DocumentNumberBackend',
    'django.contrib.auth.backends.ModelBackend',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174'
    ).split(',')
    if origin.strip()
]
CORS_ALLOW_ALL_ORIGINS = DEBUG and os.environ.get('CORS_STRICT', 'False') != 'True'
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']
CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization', 'content-type',
    'dnt', 'origin', 'user-agent', 'x-csrftoken', 'x-requested-with',
]

LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'America/Bogota'
USE_I18N = True
USE_TZ = True
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
MEDIA_ROOT = Path(os.environ.get('MEDIA_ROOT', BASE_DIR / 'media'))


def _bool_env(nombre, defecto):
    return os.environ.get(nombre, str(defecto)).strip().lower() in ('1', 'true', 'si', 'sí', 'yes')


# Grabaciones de reuniones → transcripción → propuesta de acta.
TRANSCRIPCION = {
    # Whisper local: tiny | base | small | medium | large-v3-turbo (más grande = mejor y más lento).
    'WHISPER_MODELO': os.environ.get('WHISPER_MODELO', 'small'),
    'WHISPER_DISPOSITIVO': os.environ.get('WHISPER_DISPOSITIVO', 'cpu'),
    'WHISPER_TIPO_COMPUTO': os.environ.get('WHISPER_TIPO_COMPUTO', 'int8'),
    'WHISPER_HILOS': int(os.environ.get('WHISPER_HILOS', '0')),
    'IDENTIFICAR_HABLANTES': _bool_env('IDENTIFICAR_HABLANTES', True),
    'UMBRAL_HABLANTES': float(os.environ.get('UMBRAL_HABLANTES', '0.5')),
    'CARPETA_MODELOS': Path(os.environ.get('CARPETA_MODELOS', BACKEND_DIR / 'modelos')),
    # IA que redacta el acta: ollama (local y privado) | gemini | groq
    'REDACTOR_IA': os.environ.get('REDACTOR_IA', 'ollama'),
    'OLLAMA_URL': os.environ.get('OLLAMA_URL', 'http://localhost:11434'),
    'OLLAMA_MODELO': os.environ.get('OLLAMA_MODELO', 'qwen2.5:7b'),
    'OLLAMA_CONTEXTO': int(os.environ.get('OLLAMA_CONTEXTO', '12288')),
    'GEMINI_API_KEY': os.environ.get('GEMINI_API_KEY', ''),
    'GEMINI_MODELO': os.environ.get('GEMINI_MODELO', 'gemini-flash-latest'),
    'GROQ_API_KEY': os.environ.get('GROQ_API_KEY', ''),
    'GROQ_MODELO': os.environ.get('GROQ_MODELO', 'llama-3.3-70b-versatile'),
    'AUDIO_MAX_MB': int(os.environ.get('AUDIO_MAX_MB', '2048')),
    # Por privacidad y espacio, el audio se borra apenas se transcribe.
    'CONSERVAR_AUDIO': _bool_env('CONSERVAR_AUDIO', False),
    'TRABAJADOR_EN_SERVIDOR': _bool_env('TRANSCRIPCION_TRABAJADOR_EN_SERVIDOR', True),
}
