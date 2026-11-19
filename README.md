# Memorian · Actas UPN (FOR023GDC)

Aplicativo para crear actas y resúmenes de reunión de la Universidad Pedagógica Nacional en el formato **FOR023GDC**.

Además del formulario del formato, el aplicativo puede:

- **Generar el acta desde la grabación.** Se sube el audio de la reunión, que puede venir en varios archivos, o se pega la transcripción de Teams o Meet. El sistema transcribe, identifica quién habla y propone el orden del día, el desarrollo de cada punto, los compromisos y la próxima convocatoria. La persona revisa y corrige antes de aplicar la propuesta.
- **Autoguardar.** El avance se guarda solo en el navegador y en el servidor, así que no se pierde por un apagón o por cerrar la ventana.

Todo funciona con herramientas **gratuitas**, y por defecto la IA corre **en el mismo computador**, sin enviar el contenido de las reuniones a servicios externos.

### Roles y flujo de un acta

El rol en la plataforma es distinto del **cargo** de la persona (director, docente…). Cada usuario tiene un rol, un cargo y una **dependencia**. El cargo y la dependencia salen solos en la columna "Cargo/Dependencia" del acta.

| Rol | Qué puede hacer |
|---|---|
| **Redactor** (por defecto) | Crea actas y las edita mientras están en borrador. En las actas de otras personas solo firma y deja observaciones. |
| **Revisor** | Lo mismo que un redactor. Además ve y corrige las actas de su dependencia, y las aprueba o las devuelve con observaciones. |
| **Superadministrador** | Ve y corrige cualquier acta. Gestiona usuarios y la lista de dependencias. |

Un acta pasa por estos estados: **Borrador → (opcional) En revisión → Para firmas**. Quien la redacta puede publicarla directamente para firmas, sin pasar por revisión. Solo se firma un acta publicada. Para corregir una publicada hay que reabrirla, y eso anula las firmas ya registradas. Las observaciones las ven quien redacta, el revisor y todas las personas que participan.

---

## Contenido

1. [Qué se necesita](#1-qué-se-necesita)
2. [Instalar y conectar Ollama (la IA local)](#2-instalar-y-conectar-ollama-la-ia-local)
3. [Correr el backend (Django)](#3-correr-el-backend-django)
4. [Correr el frontend (React)](#4-correr-el-frontend-react)
5. [Probar que todo funciona](#5-probar-que-todo-funciona)
6. [Cómo funciona la generación desde la grabación](#6-cómo-funciona-la-generación-desde-la-grabación)
7. [Configuración (.env)](#7-configuración-env)
8. [Problemas frecuentes](#8-problemas-frecuentes)
9. [Pruebas automáticas](#9-pruebas-automáticas)
10. [Estructura del proyecto](#10-estructura-del-proyecto)
11. [Antes de desplegar](#11-antes-de-desplegar)

---

## 1. Qué se necesita

| Programa | Versión | Para qué |
|---|---|---|
| [Python](https://www.python.org/downloads/) | 3.11 o superior | Backend (Django) y transcripción |
| [Node.js](https://nodejs.org/) | 18 o superior | Frontend (React + Vite) |
| [Ollama](https://ollama.com/download) | La más reciente | IA local que redacta el acta |
| Git | Cualquiera | Clonar el repositorio |

**Computador recomendado:** 16 GB de RAM (mínimo 8 GB) y unos **8 GB libres en disco** para los modelos de IA. No hace falta tarjeta gráfica, pero con ella todo es mucho más rápido (ver [tiempos](#tiempos-de-referencia)).

> La base de datos local es **SQLite** (un archivo `db.sqlite3` en la raíz). No hay que instalar ningún motor de base de datos para trabajar en local.

---

## 2. Instalar y conectar Ollama (la IA local)

Ollama es un programa gratuito que corre modelos de IA en el propio computador. El backend se conecta a él por `http://localhost:11434`, que es su dirección por defecto, así que **no hay que configurar nada para "conectarlo"**: basta con que esté instalado y encendido, y con que tenga descargado el modelo.

### 2.1 Instalar

- **Windows:** descargar `OllamaSetup.exe` de <https://ollama.com/download> e instalarlo.
  - Si el disco C tiene poco espacio, se puede instalar en otro disco con `OllamaSetup.exe /DIR="D:\Ollama"`.
  - Para guardar los modelos en otro disco, crear la variable de entorno de usuario `OLLAMA_MODELS` con, por ejemplo, `D:\Ollama\models`. Hay que hacerlo **antes** de descargar el modelo y reiniciar Ollama después.
- **macOS:** descargar la aplicación de <https://ollama.com/download>.
- **Linux:** `curl -fsSL https://ollama.com/install.sh | sh`

En Windows y macOS, Ollama queda corriendo en segundo plano (ícono de la llama junto al reloj) y arranca solo con el computador.

### 2.2 Descargar el modelo que usa el aplicativo

En una terminal (PowerShell, CMD o Terminal):

```bash
ollama pull qwen2.5:7b
```

Son unos 4,7 GB y solo se descarga una vez.

### 2.3 Verificar que quedó conectado

```bash
ollama list                     # debe aparecer qwen2.5:7b
curl http://localhost:11434     # debe responder: Ollama is running
```

También se puede abrir <http://localhost:11434> en el navegador.

Si no responde, abrir la aplicación Ollama o ejecutar `ollama serve` y dejar esa terminal abierta.

> **Alternativas en la nube (opcionales):** el aplicativo también puede redactar con **Gemini** o **Groq**, que tienen claves gratuitas. Son más rápidos, pero el texto de la reunión sale a esos servicios y sus planes gratuitos tienen límites diarios. Ver [Configuración](#7-configuración-env).

---

## 3. Correr el backend (Django)

Desde la raíz del repositorio:

```powershell
cd backend

# 1) Entorno virtual de Python
python -m venv .venv

# 2) Dependencias (la primera vez tarda unos minutos)
.venv\Scripts\python -m pip install -r requirements.txt

# 3) Crear la base de datos local
.venv\Scripts\python manage.py migrate

# 4) Crear un usuario administrador y darle el rol ADMIN del aplicativo
.venv\Scripts\python manage.py createsuperuser
.venv\Scripts\python manage.py shell -c "from django.contrib.auth import get_user_model as g; g().objects.filter(is_superuser=True).update(role='ADMIN')"

# 5) Encender el servidor
.venv\Scripts\python manage.py runserver 8000
```

> En **macOS/Linux** se cambia `.venv\Scripts\python` por `.venv/bin/python`.

El backend queda en <http://localhost:8000/api/>. Hay que dejar esa terminal abierta.

**Primera grabación:** al procesar el primer audio, el backend descarga solo los modelos de transcripción (Whisper `small`, unos 500 MB) y de identificación de hablantes (unos 35 MB) en `backend/modelos/`. Esa primera vez tarda un poco más.

---

## 4. Correr el frontend (React)

En **otra** terminal, desde la raíz del repositorio:

```powershell
cd frontend
npm install
npm run dev
```

Abrir <http://localhost:5174> e iniciar sesión con el usuario creado en el paso 3. Se puede entrar con el nombre de usuario, el correo o el número de documento.

El frontend envía las peticiones `/api` al backend en el puerto 8000; esa conexión ya está configurada en `vite.config.js`.

---

## 5. Probar que todo funciona

1. Crear una **Nueva acta** y llenar fecha, horas y asistentes.
2. **Opcional, pero recomendado:** escribir el **orden del día**. Si está escrito, la IA lo respeta y el acta sale mejor organizada.
3. En **"Generar desde la grabación"**, elegir una opción:
   - **Subir grabación:** audio o video (`mp3`, `m4a`, `wav`, `mp4`, `webm`…). Si la reunión está en varios archivos, se seleccionan todos y se ordenan.
   - **Ya tengo la transcripción:** pegar el texto de Teams o Meet. Si son varias partes, usar "Agregar otra parte".
4. Esperar. La pantalla muestra la etapa y el avance. Se puede cerrar la ventana, porque el proceso sigue en el servidor.
5. Pulsar **"Revisar y aplicar al acta"**. Ahí se ven la transcripción, se pueden poner nombres a los hablantes, aparecen los avisos y se aplica la propuesta.

Para probar solo la IA, sin audio, lo más rápido es pegar una transcripción corta.

---

## 6. Cómo funciona la generación desde la grabación

```
Audio(s) ─► Whisper (transcripción, local) ─► sherpa-onnx (quién habla, local) ─┐
                                                                                ├─► IA (Ollama) ─► Propuesta ─► Revisión
Transcripción pegada (Teams/Meet) ──────────────────────────────────────────────┘
```

**1. Subida por partes.** Los archivos se envían en trozos de 8 MB. Si se cae la conexión, la subida continúa desde donde iba.

**2. Fila de espera.** Se procesa **una reunión a la vez**, porque cada una usa todo el procesador. Las demás esperan, y la pantalla muestra cuántas hay antes.

**3. Transcripción e identificación de hablantes.** Si la reunión viene en varios audios, las voces se comparan entre todas las partes, así que "Hablante 1" es la misma persona en todas. **El audio se borra al terminar de transcribirse**; se conserva el texto.

**4. Redacción**, pensada para un computador sin tarjeta gráfica:
1. La transcripción se lee **una sola vez**, por fragmentos, tomando notas detalladas de cada uno.
2. Se define el **orden del día**: el que escribió la persona o, si no hay, uno que propone la IA a partir de las notas.
3. Cada punto se redacta **solo con sus notas**, para evitar que se repita contenido entre puntos. El estilo y la extensión se calibraron con un acta real de la universidad: varios párrafos por punto y unas 700 palabras por hora de reunión.
4. Si la IA propuso un punto del que no se habló, ese punto se quita y se avisa. Si el punto lo escribió la persona, se deja con "No se encontró información sobre este punto en la transcripción".

**5. Revisión.** Nada llega al acta sin que la persona lo apruebe.

**Qué se guarda:** la transcripción, los nombres de los hablantes y la propuesta quedan en la base de datos, unidos al acta. Si se borra el acta, se borran también. Los audios no se guardan, salvo que se active `CONSERVAR_AUDIO=True`.

### Tiempos de referencia

Medidos en un Ryzen 3 4300G con 15 GB de RAM y sin tarjeta gráfica:

| Etapa | Reunión de 2 horas |
|---|---|
| Transcripción + hablantes | ~1 hora (medido) |
| Redacción con Ollama | ~1 a 2 horas (estimado: sin GPU escribe solo 2 a 4 tokens por segundo) |
| Redacción con Gemini (nube) | unos minutos (estimado) |

Con una tarjeta gráfica (GPU) NVIDIA, la transcripción y la redacción local son entre 10 y 20 veces más rápidas.

Pegar la transcripción de Teams o Meet se salta la parte de transcribir.

---

## 7. Configuración (`.env`)

Para correr en local **no hace falta** crear el archivo: los valores por defecto funcionan con Ollama.

Para cambiar algo, copiar `.env.example` como `.env` **en la raíz del repositorio**. Ese archivo no se sube a git.

| Variable | Por defecto | Descripción |
|---|---|---|
| `REDACTOR_IA` | `ollama` | IA que redacta: `ollama` (local y privada), `gemini` o `groq` |
| `OLLAMA_URL` | `http://localhost:11434` | Dirección de Ollama. Se cambia solo si Ollama corre en otro equipo de la red. |
| `OLLAMA_MODELO` | `qwen2.5:7b` | Modelo de Ollama. Debe estar descargado con `ollama pull`. |
| `OLLAMA_CONTEXTO` | `12288` | Memoria de trabajo del modelo, en tokens |
| `GEMINI_API_KEY` | — | Clave gratuita de <https://aistudio.google.com/apikey> |
| `GROQ_API_KEY` | — | Clave gratuita de <https://console.groq.com/keys> |
| `WHISPER_MODELO` | `small` | Calidad de la transcripción: `tiny`, `base`, `small`, `medium` o `large-v3-turbo`. Los modelos más grandes son más precisos y más lentos. |
| `IDENTIFICAR_HABLANTES` | `True` | Separa las voces de la grabación |
| `AUDIO_MAX_MB` | `2048` | Tamaño máximo por archivo de audio |
| `CONSERVAR_AUDIO` | `False` | Conservar los audios después de transcribirlos |
| `TRANSCRIPCION_TRABAJADOR_EN_SERVIDOR` | `True` | El servidor web procesa la fila de espera. En producción conviene `False` y correr aparte `python manage.py procesar_grabaciones`. |
| `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` | — | Configuración estándar de Django |

---

## 8. Problemas frecuentes

| Síntoma | Solución |
|---|---|
| "No se pudo conectar con localhost:11434. ¿Está encendido el servicio?" | Ollama no está corriendo. Abrir la app Ollama o ejecutar `ollama serve`. |
| La IA responde "model not found" | Falta descargar el modelo: `ollama pull qwen2.5:7b` |
| El login da error 404 o "Network Error" | El backend no está encendido, o no está en el puerto 8000 (ver la fila siguiente). |
| El puerto 8000 está ocupado | Correr el backend en otro puerto (`runserver 8001`) e iniciar el frontend así: `$env:VITE_API_URL="http://localhost:8001/api"; npm run dev` en PowerShell, o `VITE_API_URL=http://localhost:8001/api npm run dev` en macOS/Linux. |
| Una grabación queda "En espera" mucho tiempo | Hay otra reunión procesándose antes; la pantalla dice cuántas. Una grabación se puede cancelar con "Cancelar y quitar". |
| La primera grabación tarda mucho en empezar | Está descargando los modelos de transcripción. Solo pasa la primera vez. |
| Poca memoria o el equipo se pone lento | Usar un modelo más liviano: `ollama pull qwen2.5:3b` y `OLLAMA_MODELO=qwen2.5:3b`. Redacta más rápido, pero con menos calidad. |

La sesión se renueva sola mientras se usa el aplicativo y se cierra tras **3 horas sin actividad**, con un aviso un minuto antes. Lo que se estaba escribiendo queda guardado.

---

## 9. Pruebas automáticas

```powershell
# Backend
cd backend
.venv\Scripts\python manage.py test features

# Frontend
cd frontend
npm test
```

Las pruebas del backend usan una IA simulada: **no necesitan Ollama** ni descargan modelos.

---

## 10. Estructura del proyecto

Cada módulo sigue una arquitectura hexagonal: `dominio/` (reglas), `aplicacion/` (casos de uso) e `infraestructura/` (Django, APIs, interfaz).

```
backend/
  config/                      Configuración de Django (settings, urls)
  features/
    usuarios/                  Usuarios, roles e inicio de sesión (JWT)
    grupos/                    Comités y equipos
    actas/                     Actas FOR023GDC y autoguardado
    transcripcion/             Grabaciones → transcripción → propuesta de acta
      aplicacion/prompts.py    Instrucciones para la IA (estilo del acta)
      aplicacion/redaccion.py  Cómo se arma la propuesta
      infraestructura/         Whisper, sherpa-onnx, Ollama/Gemini/Groq, fila de espera
frontend/
  src/features/                Mismas funcionalidades, del lado de React
  src/shared/                  Diseño general (menú, encabezado) y cliente de la API
```

---

## 11. Antes de desplegar

El proyecto está listo para trabajar en local. Para producción (Neon + Railway + Vercel) quedan pendientes:

- **Base de datos:** hoy usa SQLite. Falta leer `DATABASE_URL` para conectar con Postgres en Neon. `dj-database-url` ya está en las dependencias.
- **Seguridad:** `backend/features/usuarios/infraestructura/backends.py` acepta contraseñas fijas de prueba cuando `DEBUG=True`. Hay que quitarlas antes de publicar y desplegar siempre con `DEBUG=False` y un `SECRET_KEY` propio.
- **IA en el servidor:** Whisper y Ollama necesitan bastante memoria y procesador, y en Railway el disco no es permanente. Hay dos opciones:
  - Que un computador de la universidad procese la fila de espera (`TRANSCRIPCION_TRABAJADOR_EN_SERVIDOR=False` en el servidor y `python manage.py procesar_grabaciones` en ese equipo, conectado a la misma base de datos). Para los audios hace falta además un almacenamiento compartido.
  - Usar Gemini o Groq para la redacción, con sus límites y teniendo en cuenta la privacidad.
- **Frontend en Vercel:** definir `VITE_API_URL` con la URL pública del backend y agregar el dominio de Vercel a `CORS_ALLOWED_ORIGINS`.
