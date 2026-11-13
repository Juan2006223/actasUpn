"""Instrucciones para la IA. El estilo de redacción se calibró con un acta real de la universidad:
varios párrafos por punto, con quién intervino, qué se planteó, los casos concretos,
las preocupaciones y lo que se acordó."""
from typing import Any, Dict, List

ROL = 'Eres un asistente administrativo de la Universidad Pedagógica Nacional de Colombia que redacta actas de reunión en el formato institucional FOR023GDC.'

# Frase que se usa cuando un punto que escribió la persona no aparece en la reunión.
NO_ENCONTRADO = 'No se encontró información sobre este punto en la transcripción.'

REGLAS_HABLANTES = """- La transcripción puede identificar a las personas como "Hablante 1", "Orador 2", etc. NUNCA escribas esos identificadores en el acta. Deduce el nombre real o el cargo por el contexto (los participantes suelen nombrarse entre sí o presentarse). Si no se puede saber, usa lenguaje impersonal ("Se planteó que…", "Uno de los participantes señaló…").
- La reunión puede venir en varias partes (marcadas con "=== Parte N de M ==="), una a continuación de la otra. Etiquetas como "Parte 2 · Orador 1" solo valen dentro de su parte: el "Orador 1" de la parte 1 puede ser una persona distinta al "Orador 1" de la parte 2. Reconoce a cada persona por su nombre, su cargo o el contexto, no por la etiqueta. Trata las partes como una sola reunión continua.
- FIDELIDAD ANTE TODO: nunca agregues temas, debates, acuerdos, cifras ni personas que no aparezcan en el material.
- Si una palabra de la transcripción no tiene sentido (errores de transcripción automática), omítela en lugar de adivinar."""

ESTILO_DESARROLLO = """ESTILO (así se redactan las actas de la universidad):
- Prosa formal, en pasado y en tercera persona: "Se planteó que…", "Se discutió…", "Intervino el vicerrector académico, quien…", "La coordinadora del grupo, Angie Manrique, señaló…".
- Varios párrafos, cada uno sobre un aspecto distinto: qué se presentó y con qué propósito; quién intervino y qué posiciones o argumentos expuso; casos concretos, cifras, fechas y nombres de documentos, normas o programas tal como se dijeron; preocupaciones, dificultades y propuestas; y al final lo que se decidió ("Finalmente, se acordó…").
- Sé específico: escribe los detalles, no frases generales como "se discutió la importancia del tema".
- No repitas la misma idea con otras palabras ni en otro párrafo.
- Sin viñetas, sin títulos, sin markdown."""


def _contexto(ctx: Dict[str, Any]) -> str:
    def personas(clave):
        filas = [p for p in (ctx.get(clave) or []) if (p.get('nombre') or '').strip() and p.get('nombre') != 'N/A']
        if not filas:
            return 'No registrados'
        return '; '.join(f"{p['nombre']}" + (f" ({p['cargo']})" if p.get('cargo') else '') for p in filas)

    lineas = [
        f"Tipo: {'Resumen de reunión' if ctx.get('tipo') == 'RESUMEN' else 'Acta de reunión'}",
        f"Fecha: {ctx.get('fecha') or 'No indicada'}",
        f"Hora inicio: {ctx.get('hora_inicio') or 'No indicada'}",
        f"Hora final: {ctx.get('hora_final') or 'No indicada'}",
        f"Dependencias: {ctx.get('instancias') or 'No indicadas'}",
        f"Lugar: {ctx.get('lugar') or 'No indicado'}",
        f"Asistentes registrados: {personas('asistentes')}",
        f"Ausentes registrados: {personas('ausentes')}",
        f"Invitados registrados: {personas('invitados')}",
    ]
    return '\n'.join(lineas)


def _lista(orden_dia: List[str]) -> str:
    return '\n'.join(f'{i}. {p}' for i, p in enumerate(orden_dia, 1))


# ─────────────── Sin orden del día escrito: notas en orden, luego el orden del día y la clasificación ───────────────

REGLAS_NOTAS = """- Cada nota es una idea concreta con sus detalles: quién habló (nombre o cargo), qué presentó, planteó o propuso, sus argumentos, cifras, fechas, nombres de documentos, normas, programas o sistemas, casos concretos, preocupaciones, desacuerdos y decisiones.
- Escribe todas las notas que haga falta. No resumas en una frase lo que se discutió durante varios minutos: es mejor una nota de más que una de menos.
- En COMPROMISOS anota todo lo que alguien se ofreció o comprometió a hacer ("yo me encargo", "enviaré", "quedamos en que…")."""


def notas_de_bloque(bloque: str, numero: int, total: int, ctx: Dict[str, Any]) -> str:
    return f"""{ROL}

Vas a leer el fragmento {numero} de {total} de la transcripción de una reunión. Toma NOTAS DETALLADAS de este fragmento, en el orden en que se dijeron. Con estas notas se redactará el acta, así que todo lo que no anotes se perderá.

Responde EXACTAMENTE con estas secciones:
### NOTAS
- …
### COMPROMISOS
- Qué se hará / quién / para cuándo
### PRÓXIMA REUNIÓN
- …
### PARTICIPANTES
- Nombre (cargo o dependencia)

REGLAS:
- Si alguien anunció formalmente el orden del día de la reunión, la primera nota debe ser "ORDEN DEL DÍA ANUNCIADO: …" copiado textual.
{REGLAS_NOTAS}
- Si una sección no tiene nada, escribe solo "- (nada)".
{REGLAS_HABLANTES}

DATOS DE LA REUNIÓN:
{_contexto(ctx)}

FRAGMENTO {numero} DE {total}:
{bloque}"""


def clasificar_notas(notas_numeradas: str, orden_dia: List[str]) -> str:
    return f"""{ROL}

Clasifica cada nota de la reunión en el punto del orden del día al que pertenece.

ORDEN DEL DÍA:
{_lista(orden_dia)}

Devuelve ÚNICAMENTE un JSON con el número de cada nota y el número del punto, así: {{"1": 2, "2": 2, "3": 1}}
Incluye todas las notas. Si una nota no encaja claramente, asígnala al punto más relacionado.

NOTAS:
{notas_numeradas}"""


def orden_del_dia(material: str, es_transcripcion: bool, ctx: Dict[str, Any]) -> str:
    fuente = 'TRANSCRIPCIÓN' if es_transcripcion else 'NOTAS DE LA REUNIÓN (en el orden en que se dijeron)'
    return f"""{ROL}

Define el ORDEN DEL DÍA del acta. Devuelve ÚNICAMENTE un JSON válido con esta estructura:
{{"orden_dia": ["Punto 1", "Punto 2"]}}

- Si al inicio se anunció formalmente un orden del día, usa exactamente esos puntos (incluidos saludo, varios y cierre si se anunciaron).
- Si no se anunció, identifica los grandes temas en el orden en que se trataron y agrupa los subtemas afines: entre 3 y 10 puntos según lo extensa que haya sido la reunión.
- Cada punto es una frase descriptiva y específica (p. ej. "Análisis de dificultades en la carga y validación de planes de trabajo"), no una palabra genérica.
- No conviertas en punto un tema que solo se mencionó de pasada.

DATOS DE LA REUNIÓN:
{_contexto(ctx)}

{fuente}:
{material}"""


# ─────────────── Paso 2: notas detalladas por punto, fragmento a fragmento ───────────────

def notas_por_punto(bloque: str, numero: int, total: int, orden_dia: List[str], ctx: Dict[str, Any]) -> str:
    secciones = '\n'.join(f'### PUNTO {i}\n- …' for i in range(1, len(orden_dia) + 1))
    return f"""{ROL}

Vas a leer el fragmento {numero} de {total} de la transcripción de una reunión. Toma NOTAS DETALLADAS de este fragmento, clasificadas según el orden del día. Con estas notas se redactará el acta, así que todo lo que no anotes se perderá.

ORDEN DEL DÍA:
{_lista(orden_dia)}

Responde EXACTAMENTE con estas secciones, en este orden:
{secciones}
### COMPROMISOS
- Qué se hará / quién / para cuándo
### PRÓXIMA REUNIÓN
- …
### PARTICIPANTES
- Nombre (cargo o dependencia)

REGLAS:
{REGLAS_NOTAS}
- Pon cada nota en el punto al que pertenece; si no encaja claramente, en el más relacionado. No repitas una nota en dos puntos.
- Si en este fragmento no se habló de un punto, escribe solo "- (nada)" en esa sección.
{REGLAS_HABLANTES}

DATOS DE LA REUNIÓN:
{_contexto(ctx)}

FRAGMENTO {numero} DE {total}:
{bloque}"""


# ─────────────── Paso 3: compromisos y redacción ───────────────

def compromisos(material: str, ctx: Dict[str, Any]) -> str:
    return f"""{ROL}

Con las notas de la reunión, devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{{
  "compromisos": [{{"compromiso": "", "responsable": "", "fecha": "AAAA-MM-DD o vacío"}}],
  "proxima_convocatoria": "",
  "asistentes_mencionados": [{{"nombre": "", "cargo": ""}}]
}}

- compromisos: todos los compromisos de las notas, sin repetir los que sean el mismo. Redacta cada uno en infinitivo y empezando por el verbo (p. ej. "Enviar los informes individuales a los docentes"), nunca en primera persona. Responsable con nombre real o dependencia si se sabe. Fecha en AAAA-MM-DD si se dijo una fecha concreta (usa el año de la reunión); si no, "".
- proxima_convocatoria: fecha, hora y lugar de la próxima reunión en lenguaje natural si se mencionó; si no, "N/A".
- asistentes_mencionados: personas que participaron, con su cargo si se dijo. Nunca "Hablante X" ni "Orador X".

DATOS DE LA REUNIÓN:
{_contexto(ctx)}

NOTAS:
{material}"""


def desarrollo_de_punto(notas: str, orden_dia: List[str], indice: int, ctx: Dict[str, Any],
                        palabras: int, parrafos: int) -> str:
    punto = orden_dia[indice]
    return f"""{ROL}

Redacta el desarrollo del punto {indice + 1} del orden del día del acta: "{punto}".
Para que sepas dónde encaja, este es el orden del día completo:
{_lista(orden_dia)}

Usa ÚNICAMENTE las notas de abajo, que son las de este punto. Desarrolla cada nota: no omitas nombres, cifras, fechas, casos ni acuerdos, y no agregues nada que no esté en ellas.
Extensión: alrededor de {palabras} palabras, en {parrafos} párrafo(s). Si las notas son pocas, escribe menos antes que inventar.
Devuelve solo los párrafos, sin el título del punto.

{ESTILO_DESARROLLO}
{REGLAS_HABLANTES}

DATOS DE LA REUNIÓN:
{_contexto(ctx)}

NOTAS DEL PUNTO {indice + 1}:
{notas}"""


# ─────────────── Modelos con mucha memoria (Gemini): toda la reunión de una vez ───────────────

def notas_de_parte(parte: str, numero: int, total: int) -> str:
    return f"""{ROL}

Vas a leer la parte {numero} de {total} de la transcripción de una reunión larga. Escribe notas detalladas de ESTA parte para redactar después el acta completa.

Incluye, en viñetas:
- Temas tratados, en el orden en que aparecen.
- Qué se presentó, quién intervino (nombre real si se deduce), qué posiciones, argumentos, cifras y casos concretos se mencionaron.
- Decisiones y acuerdos.
- Compromisos: qué, quién lo hará y para cuándo.
- Si se anunció un orden del día o una próxima reunión, anótalo textualmente.

{REGLAS_HABLANTES}
- Sé exhaustivo: estas notas reemplazan a la transcripción.

TRANSCRIPCIÓN (parte {numero} de {total}):
{parte}"""


def estructura(material: str, es_transcripcion: bool, ctx: Dict[str, Any], orden_fijo: List[str] = None) -> str:
    fuente = 'TRANSCRIPCIÓN' if es_transcripcion else 'NOTAS DE LA REUNIÓN (resumen de la transcripción)'
    if orden_fijo:
        instrucciones_orden = f'- Devuelve exactamente este orden del día, que ya definió quien hace el acta:\n{_lista(orden_fijo)}'
    else:
        instrucciones_orden = """- Si al inicio de la reunión se anunció formalmente un orden del día, usa exactamente esos puntos.
- Si no se anunció, identifica los grandes temas en el orden en que se trataron y agrúpalos: entre 3 y 10 puntos. Cada punto, una frase descriptiva y específica."""
    return f"""{ROL}

Analiza la información y devuelve ÚNICAMENTE un JSON válido, sin texto adicional, con esta estructura exacta:

{{
  "orden_dia": ["Punto 1", "Punto 2"],
  "compromisos": [{{"compromiso": "", "responsable": "", "fecha": "AAAA-MM-DD o vacío"}}],
  "proxima_convocatoria": "",
  "asistentes_mencionados": [{{"nombre": "", "cargo": ""}}]
}}

INSTRUCCIONES PARA orden_dia:
{instrucciones_orden}

INSTRUCCIONES PARA compromisos:
- Incluye TODO lo que alguien se ofreció o comprometió a hacer (frases como "yo puedo", "yo me encargo", "me comprometo", "enviaré"). Revisa la reunión completa: suele haber varios.
- Redacta cada compromiso en infinitivo, empezando por el verbo (p. ej. "Enviar los informes individuales a los docentes"). Nunca en primera persona.
- Usa el nombre real del responsable si se deduce.
- La fecha en formato AAAA-MM-DD si se dijo una fecha concreta (usa el año de la reunión); si no, deja "".
- Si no hubo compromisos, devuelve una lista vacía.

INSTRUCCIONES PARA proxima_convocatoria:
- Fecha, hora y lugar de la próxima reunión en lenguaje natural (p. ej. "2 de diciembre de 2026, 10:00 a. m., virtual") si se mencionó; si no, "N/A".

INSTRUCCIONES PARA asistentes_mencionados:
- Personas que participaron o se mencionaron como presentes, con su cargo si se dijo. No incluyas "Hablante X".

{REGLAS_HABLANTES}

DATOS REGISTRADOS EN EL FORMULARIO (tienen prioridad sobre lo que diga la transcripción):
{_contexto(ctx)}

{fuente}:
{material}"""


def desarrollo_completo(material: str, es_transcripcion: bool, orden_dia: List[str], ctx: Dict[str, Any], palabras: int) -> str:
    fuente = 'TRANSCRIPCIÓN' if es_transcripcion else 'NOTAS DE LA REUNIÓN'
    return f"""{ROL} Tu única tarea es redactar el DESARROLLO DEL ORDEN DEL DÍA del acta.

Desarrolla CADA punto en una sección separada con este formato exacto:

PUNTO 1. [TÍTULO DEL PUNTO EN MAYÚSCULAS]
[Párrafos del desarrollo]

PUNTO 2. [TÍTULO DEL PUNTO EN MAYÚSCULAS]
[…]

- Nunca mezcles los puntos ni omitas ninguno. No repitas en un punto lo que ya contaste en otro.
- Extensión: el acta debe dejar constancia de todo lo que se habló. En total, alrededor de {palabras} palabras, repartidas según cuánto se discutió cada punto (normalmente 3 a 5 párrafos por punto).
- Si de un punto no se habló en la reunión, escribe debajo de su título únicamente: "{NO_ENCONTRADO}"
- Devuelve solo el texto del desarrollo, sin JSON ni explicaciones.

{ESTILO_DESARROLLO}
{REGLAS_HABLANTES}

ORDEN DEL DÍA (desarrolla únicamente estos puntos, ni más ni menos):
{_lista(orden_dia)}

DATOS DE LA REUNIÓN:
{_contexto(ctx)}

{fuente}:
{material}"""
