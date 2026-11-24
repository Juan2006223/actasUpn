"""Proveedores de IA para redactar. Se elige con REDACTOR_IA = ollama | gemini | groq.

- ollama: corre en el propio servidor; nada sale de la universidad (opción preferida por privacidad).
- gemini / groq: planes gratuitos en la nube; requieren clave y el texto sale a esos servicios.
"""
import time
from typing import Any, Dict

import requests

from ..dominio.puertos import ModeloLenguaje

REINTENTOS = 4


class ErrorProveedorIA(RuntimeError):
    pass


def _post_con_reintentos(url: str, timeout: int, **kwargs) -> Dict[str, Any]:
    espera = 10
    for intento in range(REINTENTOS):
        try:
            r = requests.post(url, timeout=timeout, **kwargs)
        except requests.ConnectionError as e:
            raise ErrorProveedorIA(f'No se pudo conectar con {url.split("/")[2]}. ¿Está encendido el servicio?') from e
        except requests.Timeout as e:
            raise ErrorProveedorIA('La IA tardó demasiado en responder.') from e
        if r.status_code == 429 or r.status_code >= 500:
            # Límite del plan gratuito o caída temporal: se espera y se reintenta.
            if intento < REINTENTOS - 1:
                retry_after = r.headers.get('retry-after')
                time.sleep(float(retry_after) if retry_after and retry_after.replace('.', '').isdigit() else espera)
                espera *= 2
                continue
        if r.status_code >= 400:
            detalle = r.text[:300]
            if r.status_code == 429:
                raise ErrorProveedorIA('Se alcanzó el límite gratuito del proveedor de IA. Intenta más tarde o cambia de proveedor.')
            if r.status_code in (401, 403):
                raise ErrorProveedorIA('La clave del proveedor de IA no es válida o no está configurada.')
            raise ErrorProveedorIA(f'El proveedor de IA respondió {r.status_code}: {detalle}')
        return r.json()
    raise ErrorProveedorIA('El proveedor de IA no respondió tras varios intentos.')


class ModeloOllama(ModeloLenguaje):
    desarrollo_por_punto = True

    def __init__(self, url: str, modelo: str, contexto_tokens: int = 8192, timeout: int = 3600):
        self.url = url.rstrip('/')
        self.modelo = modelo
        self.contexto_tokens = contexto_tokens
        self.timeout = timeout
        self.nombre = f'Ollama local ({modelo})'
        # ~3,5 caracteres por token en español; se reserva espacio para instrucciones y respuesta.
        self.max_caracteres_transcripcion = max(4000, int(contexto_tokens * 3.5 * 0.5))

    def completar(self, prompt: str, formato_json: bool = False) -> str:
        cuerpo = {
            'model': self.modelo,
            'messages': [{'role': 'user', 'content': prompt}],
            'stream': False,
            'options': {'num_ctx': self.contexto_tokens, 'temperature': 0.3, 'num_predict': 4096},
        }
        if formato_json:
            cuerpo['format'] = 'json'
        datos = _post_con_reintentos(f'{self.url}/api/chat', self.timeout, json=cuerpo)
        if datos.get('error'):
            raise ErrorProveedorIA(f"Ollama: {datos['error']}")
        return (datos.get('message') or {}).get('content', '')


class ModeloGemini(ModeloLenguaje):
    desarrollo_por_punto = False
    URL = 'https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent'

    def __init__(self, api_key: str, modelo: str, timeout: int = 600):
        if not api_key:
            raise ErrorProveedorIA('Falta GEMINI_API_KEY en la configuración.')
        self.api_key = api_key
        self.modelo = modelo
        self.timeout = timeout
        self.nombre = f'Gemini ({modelo})'
        self.max_caracteres_transcripcion = 600_000  # admite reuniones muy largas de una sola vez

    def completar(self, prompt: str, formato_json: bool = False) -> str:
        config: Dict[str, Any] = {'temperature': 0.3, 'maxOutputTokens': 16000}
        if formato_json:
            config['responseMimeType'] = 'application/json'
        datos = _post_con_reintentos(
            self.URL.format(modelo=self.modelo), self.timeout,
            headers={'x-goog-api-key': self.api_key},
            json={'contents': [{'role': 'user', 'parts': [{'text': prompt}]}], 'generationConfig': config},
        )
        try:
            partes = datos['candidates'][0]['content']['parts']
        except (KeyError, IndexError) as e:
            motivo = (datos.get('promptFeedback') or {}).get('blockReason') or 'respuesta sin contenido'
            raise ErrorProveedorIA(f'Gemini no devolvió texto ({motivo}).') from e
        return ''.join(p.get('text', '') for p in partes)


class ModeloGroq(ModeloLenguaje):
    desarrollo_por_punto = True  # peticiones más pequeñas: respetan el límite por minuto del plan gratuito
    URL = 'https://api.groq.com/openai/v1/chat/completions'

    def __init__(self, api_key: str, modelo: str, max_caracteres: int = 20000, timeout: int = 300):
        if not api_key:
            raise ErrorProveedorIA('Falta GROQ_API_KEY en la configuración.')
        self.api_key = api_key
        self.modelo = modelo
        self.timeout = timeout
        self.nombre = f'Groq ({modelo})'
        self.max_caracteres_transcripcion = max_caracteres

    def completar(self, prompt: str, formato_json: bool = False) -> str:
        cuerpo: Dict[str, Any] = {
            'model': self.modelo,
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': 0.3,
        }
        if formato_json:
            cuerpo['response_format'] = {'type': 'json_object'}
        datos = _post_con_reintentos(self.URL, self.timeout, headers={'Authorization': f'Bearer {self.api_key}'}, json=cuerpo)
        return datos['choices'][0]['message']['content']


def crear_modelo(config: Dict[str, Any]) -> ModeloLenguaje:
    proveedor = (config.get('REDACTOR_IA') or 'ollama').lower()
    if proveedor == 'gemini':
        return ModeloGemini(config.get('GEMINI_API_KEY', ''), config.get('GEMINI_MODELO', 'gemini-flash-latest'))
    if proveedor == 'groq':
        return ModeloGroq(config.get('GROQ_API_KEY', ''), config.get('GROQ_MODELO', 'openai/gpt-oss-120b'),
                          int(config.get('GROQ_MAX_CARACTERES', 20000)))
    if proveedor == 'ollama':
        return ModeloOllama(config.get('OLLAMA_URL', 'http://localhost:11434'), config.get('OLLAMA_MODELO', 'qwen2.5:7b'),
                            int(config.get('OLLAMA_CONTEXTO', 12288)))
    raise ErrorProveedorIA(f'Proveedor de IA desconocido: {proveedor}. Usa ollama, gemini o groq.')
