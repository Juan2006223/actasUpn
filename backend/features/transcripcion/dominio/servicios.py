"""Reglas puras sobre transcripciones: sin Django, sin modelos de IA, fáciles de probar."""
import json
import re
from typing import Any, Dict, List, Optional

from .entidades import Segmento, Turno


def asignar_hablantes(segmentos: List[Segmento], turnos: List[Turno]) -> List[Segmento]:
    """A cada segmento le asigna la voz con la que más se solapa en el tiempo."""
    if not turnos:
        return segmentos
    turnos = sorted(turnos, key=lambda t: t.inicio)
    resultado = []
    for s in segmentos:
        mejor, solape_max = None, 0.0
        for t in turnos:
            if t.inicio >= s.fin:
                break
            solape = min(s.fin, t.fin) - max(s.inicio, t.inicio)
            if solape > solape_max:
                mejor, solape_max = t.hablante, solape
        if mejor is None:
            # Sin solape: la voz más cercana en el tiempo.
            centro = (s.inicio + s.fin) / 2
            mejor = min(turnos, key=lambda t: min(abs(centro - t.inicio), abs(centro - t.fin))).hablante
        resultado.append(Segmento(s.inicio, s.fin, s.texto, mejor, s.parte))
    return resultado


def renumerar_hablantes(turnos: List[Turno]) -> List[Turno]:
    """Convierte ids internos (0, 3, 7…) en 'Hablante 1', 'Hablante 2'… por orden de aparición."""
    mapa: Dict[str, str] = {}
    salida = []
    for t in sorted(turnos, key=lambda t: t.inicio):
        if t.hablante not in mapa:
            mapa[t.hablante] = f'Hablante {len(mapa) + 1}'
        salida.append(Turno(t.inicio, t.fin, mapa[t.hablante]))
    return salida


def formato_tiempo(segundos: float) -> str:
    s = int(max(0, segundos))
    return f'{s // 3600:02d}:{(s % 3600) // 60:02d}:{s % 60:02d}'


def agrupar_intervenciones(segmentos: List[Segmento], nombres: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
    """Une segmentos seguidos de la misma voz (y de la misma parte) en una sola intervención."""
    nombres = nombres or {}
    intervenciones: List[Dict[str, Any]] = []
    for s in segmentos:
        texto = (s.texto or '').strip()
        if not texto:
            continue
        hablante = nombres.get(s.hablante or '', '').strip() or s.hablante
        ultima = intervenciones[-1] if intervenciones else None
        if ultima and ultima['hablante'] == hablante and ultima['parte'] == s.parte:
            ultima['texto'] += ' ' + texto
            ultima['fin'] = s.fin
        else:
            intervenciones.append({'hablante': hablante, 'inicio': s.inicio, 'fin': s.fin, 'texto': texto, 'parte': s.parte})
    return intervenciones


def transcripcion_como_texto(segmentos: List[Segmento], nombres: Optional[Dict[str, str]] = None,
                             con_tiempos: bool = True) -> str:
    """Texto para la IA. Si la reunión llegó en varias partes, se marca dónde empieza cada una."""
    total_partes = len({s.parte for s in segmentos})
    lineas, parte_actual = [], None
    for i in agrupar_intervenciones(segmentos, nombres):
        if total_partes > 1 and i['parte'] != parte_actual:
            parte_actual = i['parte']
            lineas.append(f'=== Parte {parte_actual + 1} de {total_partes} ===')
        prefijo = f"[{formato_tiempo(i['inicio'])}]" if con_tiempos else ''
        if i['hablante']:
            prefijo = f"{prefijo} {i['hablante']}:".strip()
        lineas.append(f'{prefijo} {i["texto"]}'.strip())
    return '\n'.join(lineas)


# Etiquetas que ponen las herramientas de transcripción cuando no saben el nombre.
ETIQUETA_GENERICA = re.compile(r'^(orador|oradora|hablante|speaker|participante|interlocutor|persona|voz|locutor)\s*[\w]{0,3}$', re.I)
# "Nombre: texto" o "[00:01:02] Nombre: texto"
LINEA_CON_HABLANTE = re.compile(r'^\s*(?:[\[(]?\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?[\])]?\s*[-–]?\s*)?([^:\n\[\]]{1,60}?)\s*:\s+(.+)$')
# Formato Teams/Meet: una línea "Nombre Apellido   0:03" y el texto en las líneas siguientes.
LINEA_ENCABEZADO_HABLANTE = re.compile(r'^\s*([^\d:\n][^:\n]{0,58}?)\s+\d{1,2}:\d{2}(?::\d{2})?\s*$')
LINEA_SOLO_TIEMPO = re.compile(r'^\s*[\[(]?\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?(?:\s*-->\s*\S+)?[\])]?\s*$')


def _parece_hablante(etiqueta: str) -> bool:
    palabras = etiqueta.split()
    return 1 <= len(palabras) <= 6 and not etiqueta.endswith(('.', ',')) and not any(c in etiqueta for c in '¿?¡!')


def etiqueta_hablante(etiqueta: str, parte: int, total_partes: int) -> str:
    """En varias partes, 'Orador 1' de una parte no es necesariamente el de otra: se distinguen por parte.
    Los nombres reales se dejan tal cual porque sí coinciden entre partes."""
    etiqueta = ' '.join(etiqueta.split())
    if total_partes > 1 and ETIQUETA_GENERICA.match(etiqueta):
        return f'Parte {parte + 1} · {etiqueta}'
    return etiqueta


def segmentos_desde_texto(texto: str, parte: int = 0, total_partes: int = 1, desde: int = 0) -> List[Segmento]:
    """Convierte una transcripción pegada en segmentos, reconociendo quién habla si viene indicado."""
    segmentos: List[Segmento] = []
    hablante: Optional[str] = None
    for linea in (texto or '').splitlines():
        linea = linea.strip()
        if not linea or LINEA_SOLO_TIEMPO.match(linea) or linea.upper() == 'WEBVTT':
            continue
        encabezado = LINEA_ENCABEZADO_HABLANTE.match(linea)
        if encabezado and _parece_hablante(encabezado.group(1)):
            hablante = etiqueta_hablante(encabezado.group(1), parte, total_partes)
            continue
        con_hablante = LINEA_CON_HABLANTE.match(linea)
        if con_hablante and _parece_hablante(con_hablante.group(1)):
            hablante = etiqueta_hablante(con_hablante.group(1), parte, total_partes)
            linea = con_hablante.group(2).strip()
        n = desde + len(segmentos)
        segmentos.append(Segmento(float(n), float(n + 1), linea, hablante, parte))
    return segmentos


def dividir_texto(texto: str, max_caracteres: int) -> List[str]:
    """Parte un texto largo por líneas, sin cortar intervenciones, en bloques de tamaño máximo."""
    if len(texto) <= max_caracteres:
        return [texto]
    partes, actual = [], ''
    for linea in texto.split('\n'):
        while len(linea) > max_caracteres:
            # Intervención enorme: se corta en un espacio.
            corte = linea.rfind(' ', 0, max_caracteres)
            corte = corte if corte > 0 else max_caracteres
            if actual:
                partes.append(actual)
                actual = ''
            partes.append(linea[:corte])
            linea = linea[corte:].lstrip()
        if len(actual) + len(linea) + 1 > max_caracteres and actual:
            partes.append(actual)
            actual = linea
        else:
            actual = f'{actual}\n{linea}' if actual else linea
    if actual:
        partes.append(actual)
    return partes


def extraer_json(respuesta: str) -> Dict[str, Any]:
    """Las IAs a veces envuelven el JSON en ```json … ``` o agregan texto; se toma el primer objeto válido."""
    if not respuesta:
        raise ValueError('La IA devolvió una respuesta vacía.')
    limpio = re.sub(r'```(?:json)?', '', respuesta).strip()
    try:
        return json.loads(limpio)
    except json.JSONDecodeError:
        pass
    inicio = limpio.find('{')
    fin = limpio.rfind('}')
    if inicio == -1 or fin <= inicio:
        raise ValueError('La IA no devolvió un JSON válido.')
    return json.loads(limpio[inicio:fin + 1])


def _texto(v: Any) -> str:
    if v is None:
        return ''
    return str(v).strip()


def normalizar_propuesta(datos: Dict[str, Any], desarrollo: str) -> Dict[str, Any]:
    """Lleva la respuesta de la IA a la forma que usa el acta, tolerando variaciones."""
    orden = datos.get('orden_dia') or []
    if isinstance(orden, str):
        orden = [re.sub(r'^\s*\d+[.)\-]\s*', '', l).strip() for l in orden.split('\n')]
    orden = [_texto(o.get('titulo') if isinstance(o, dict) else o) for o in orden]
    orden = [o[0].upper() + o[1:] for o in orden if o][:20]

    compromisos = []
    for c in datos.get('compromisos') or []:
        if not isinstance(c, dict):
            continue
        desc = _texto(c.get('compromiso') or c.get('descripcion'))
        if not desc or desc.upper() == 'N/A':
            continue
        fecha = _texto(c.get('fecha'))
        fecha_iso = fecha_iso_o_vacia(fecha)
        if fecha and not fecha_iso and fecha.upper() not in ('N/A', 'POR DEFINIR'):
            desc = f'{desc} (fecha mencionada: {fecha})'
        compromisos.append({
            'compromiso': desc,
            'responsable': _texto(c.get('responsable')),
            'fecha': fecha_iso,
        })

    personas = []
    for p in datos.get('asistentes_mencionados') or []:
        nombre = _texto(p.get('nombre') if isinstance(p, dict) else p)
        if nombre and not re.match(r'^hablante\s*\d+$', nombre, re.I):
            personas.append({'nombre': nombre, 'cargo': _texto(p.get('cargo')) if isinstance(p, dict) else ''})

    return {
        'orden_dia': orden,
        'desarrollo': (desarrollo or '').strip(),
        'compromisos': compromisos,
        'proxima_convocatoria': _texto(datos.get('proxima_convocatoria')) or 'N/A',
        'asistentes_mencionados': personas,
        'avisos': [str(a) for a in (datos.get('avisos') or []) if a],
    }


FECHA_ISO = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def fecha_iso_o_vacia(valor: str) -> str:
    return valor if valor and FECHA_ISO.match(valor) else ''
