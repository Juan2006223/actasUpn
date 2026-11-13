import re
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Tuple

from . import prompts
from ..dominio.entidades import Segmento
from ..dominio.puertos import ModeloLenguaje
from ..dominio.servicios import (
    dividir_texto, extraer_json, normalizar_propuesta, transcripcion_como_texto,
)

# El acta de referencia (n8n) tiene ~700 palabras de desarrollo por hora de reunión.
PALABRAS_POR_HORA = 700
MAX_RONDAS_RESUMEN = 3
# Fragmentos pequeños: los modelos locales toman notas más detalladas cuando leen menos a la vez.
BLOQUE_NOTAS_MAX = 10_000

SALTO = '\n'
NO_ENCONTRADO = prompts.NO_ENCONTRADO
SIN_DESARROLLO = 'Sin desarrollo registrado en la grabación.'  # frase de versiones anteriores
FRASES_VACIAS = (NO_ENCONTRADO, SIN_DESARROLLO)

# "PUNTO 1.", "**Punto 2:**", "PUNTO III -", "PUNTO UNO"…
ENCABEZADO_PUNTO = re.compile(r'^\s*[#*]*\s*PUNTO\s+\S+.*$', re.IGNORECASE)
# Secciones de las notas: "### PUNTO 3", "**PUNTO 3: …**", "### COMPROMISOS"…
SECCION_NOTAS = re.compile(
    r'^\s*(?:#+|\*\*)?\s*(?:PUNTO\s+(\d+)|(NOTAS|COMPROMISOS|PR[OÓ]XIMA\s+REUNI[OÓ]N|PARTICIPANTES))\b.*$', re.IGNORECASE)
NOTA_VACIA = re.compile(r'^[-*•\s]*(\(?\s*(nada|ninguno|ninguna|n/?a|sin información|no se habló.*)\s*\)?\.?)?\s*$', re.IGNORECASE)
# Etiquetas genéricas que se cuelan en la prosa: "el Orador 2", "Parte 2 · Hablante 1"…
ETIQUETA_EN_PROSA = re.compile(
    r'\b(?:(del|al|el|la)\s+)?(?:Parte\s+\d+\s*·\s*)?(?:orador|oradora|hablante|speaker|participante|interlocutor)\s+\d+\b',
    re.IGNORECASE)


def minutos_de_reunion(ctx: Dict[str, Any], segmentos: List[Segmento]) -> float:
    try:
        ini = datetime.strptime(ctx.get('hora_inicio', ''), '%H:%M')
        fin = datetime.strptime(ctx.get('hora_final', ''), '%H:%M')
        minutos = (fin - ini).total_seconds() / 60
        if minutos > 0:
            return minutos
    except ValueError:
        pass
    if segmentos:
        return max(s.fin for s in segmentos) / 60
    return 60


def sin_etiquetas_genericas(texto: str) -> str:
    def reemplazo(m):
        articulo = (m.group(1) or '').lower()
        texto = {'del': 'de un participante', 'al': 'a un participante'}.get(articulo, 'un participante')
        antes = m.string[:m.start()].rstrip()
        inicio_de_frase = not antes or antes[-1] in '.!?:\n'
        return texto[0].upper() + texto[1:] if inicio_de_frase else texto
    return ETIQUETA_EN_PROSA.sub(reemplazo, texto)


def cuerpo_limpio(cuerpo: str) -> str:
    """Quita el título que a veces repite el modelo y las frases de "sin información"."""
    lineas = (cuerpo or '').strip().split('\n')
    if lineas and ENCABEZADO_PUNTO.match(lineas[0]):
        lineas = lineas[1:]
    texto = '\n'.join(lineas).strip()
    for frase in FRASES_VACIAS:
        texto = texto.replace(frase, '')
    return sin_etiquetas_genericas(texto.strip())


def con_encabezado(indice: int, titulo: str, cuerpo: str) -> str:
    """El título lo pone el sistema: los modelos pequeños a veces lo omiten o lo cambian."""
    return f'PUNTO {indice + 1}. {titulo.upper()}\n{cuerpo_limpio(cuerpo) or NO_ENCONTRADO}'


def orden_desde_texto(valor: Any) -> List[str]:
    """El orden del día que escribió la persona ("1. Saludo\\n2. Informe…") como lista."""
    if isinstance(valor, list):
        lineas = [str(v) for v in valor]
    else:
        lineas = str(valor or '').split('\n')
    puntos = [re.sub(r'^\s*(?:punto\s+)?\d+\s*[.):\-]\s*', '', l, flags=re.IGNORECASE).strip(' -•*\t') for l in lineas]
    return [p for p in puntos if p and p.upper() != 'N/A']


def separar_notas(respuesta: str, num_puntos: int) -> Tuple[List[List[str]], Dict[str, List[str]]]:
    """Reparte la respuesta del modelo en notas por punto y en las secciones finales."""
    por_punto: List[List[str]] = [[] for _ in range(num_puntos)]
    otras: Dict[str, List[str]] = {'notas': [], 'compromisos': [], 'proxima': [], 'participantes': []}
    destino: Optional[List[str]] = None
    for linea in (respuesta or '').split('\n'):
        m = SECCION_NOTAS.match(linea)
        if m:
            if m.group(1):
                i = int(m.group(1)) - 1
                destino = por_punto[i] if 0 <= i < num_puntos else None
            else:
                nombre = m.group(2).upper()
                clave = {'N': 'notas', 'C': 'compromisos', 'P': 'participantes' if nombre.startswith('PART') else 'proxima'}
                destino = otras[clave[nombre[0]]]
            continue
        if destino is None or NOTA_VACIA.match(linea):
            continue
        destino.append(linea.strip())
    return por_punto, otras


def punto_valido(valor: Any, total: int) -> Optional[int]:
    try:
        numero = int(valor[0] if isinstance(valor, list) and valor else valor)
    except (TypeError, ValueError):
        return None
    return numero - 1 if 1 <= numero <= total else None


def objetivo_de_extension(notas: str) -> Tuple[int, int]:
    """Las notas ya son un resumen: el desarrollo en prosa ocupa algo más que ellas."""
    palabras = min(900, max(120, int(len(notas.split()) * 1.3)))
    return palabras, min(6, max(1, round(palabras / 120)))


def secciones_del_desarrollo(desarrollo: str, orden: List[str]) -> Optional[List[str]]:
    """Separa un desarrollo escrito de una vez en los cuerpos de cada punto (None si no cuadra)."""
    cuerpos, actual = [], None
    for linea in (desarrollo or '').split('\n'):
        if ENCABEZADO_PUNTO.match(linea):
            if actual is not None:
                cuerpos.append('\n'.join(actual))
            actual = []
        elif actual is not None:
            actual.append(linea)
    if actual is not None:
        cuerpos.append('\n'.join(actual))
    return cuerpos if len(cuerpos) == len(orden) else None


class GenerarPropuestaActa:
    """Convierte una transcripción en orden del día, desarrollo y compromisos usando el modelo configurado."""

    def __init__(self, modelo: ModeloLenguaje):
        self.modelo = modelo

    def ejecutar(
        self,
        segmentos: List[Segmento],
        contexto: Dict[str, Any],
        nombres_hablantes: Optional[Dict[str, str]] = None,
        avance: Callable[[float, str], None] = lambda _p, _m: None,
        con_tiempos: bool = True,
    ) -> Dict[str, Any]:
        # Las transcripciones pegadas no traen tiempos reales: no se le muestran a la IA.
        texto = transcripcion_como_texto(segmentos, nombres_hablantes, con_tiempos)
        if not texto.strip():
            raise ValueError('La transcripción está vacía: no hay nada que redactar.')
        orden_fijo = orden_desde_texto(contexto.get('orden_dia'))
        palabras_total = max(400, int(minutos_de_reunion(contexto, segmentos) / 60 * PALABRAS_POR_HORA))

        if getattr(self.modelo, 'desarrollo_por_punto', False):
            datos, orden, cuerpos = self._por_notas(texto, contexto, orden_fijo, avance)
        else:
            datos, orden, cuerpos = self._de_una_vez(texto, contexto, orden_fijo, palabras_total, avance)

        orden, desarrollo, avisos = self._armar(orden, cuerpos, bool(orden_fijo))
        datos['orden_dia'] = orden
        avance(1.0, 'Propuesta lista')
        propuesta = normalizar_propuesta(datos, desarrollo)
        propuesta['avisos'] = avisos
        return propuesta

    # ── Modelos locales o con poca memoria: notas por fragmento y un punto a la vez ──

    def _por_notas(self, texto, contexto, orden_fijo, avance):
        bloques = dividir_texto(texto, min(BLOQUE_NOTAS_MAX, self.modelo.max_caracteres_transcripcion))
        finales: Dict[str, List[str]] = {'compromisos': [], 'proxima': [], 'participantes': []}

        def guardar_finales(otras):
            for clave in finales:
                finales[clave].extend(otras[clave])

        # La transcripción se lee una sola vez (es lo más lento en un equipo sin tarjeta gráfica).
        if orden_fijo:
            orden = orden_fijo
            notas_punto: List[List[str]] = [[] for _ in orden]
            for n, bloque in enumerate(bloques, 1):
                avance(0.6 * (n - 1) / len(bloques), f'Tomando notas del fragmento {n} de {len(bloques)}')
                por_punto, otras = separar_notas(
                    self.modelo.completar(prompts.notas_por_punto(bloque, n, len(bloques), orden, contexto)), len(orden))
                for i, notas in enumerate(por_punto):
                    notas_punto[i].extend(notas)
                guardar_finales(otras)
        else:
            notas_por_bloque = []
            for n, bloque in enumerate(bloques, 1):
                avance(0.55 * (n - 1) / len(bloques), f'Tomando notas del fragmento {n} de {len(bloques)}')
                _, otras = separar_notas(self.modelo.completar(prompts.notas_de_bloque(bloque, n, len(bloques), contexto)), 0)
                notas_por_bloque.append(otras['notas'])
                guardar_finales(otras)
            avance(0.56, 'Definiendo el orden del día')
            orden = self._orden_desde_notas(notas_por_bloque, contexto)
            notas_punto = self._clasificar(notas_por_bloque, orden, lambda p, m: avance(0.58 + p * 0.07, m))

        avance(0.66, 'Identificando compromisos y próxima reunión')
        material = SALTO.join(
            f'{titulo}:{SALTO}' + (SALTO.join(finales[clave]) or '- (nada)')
            for clave, titulo in (('compromisos', 'COMPROMISOS'), ('proxima', 'PRÓXIMA REUNIÓN'), ('participantes', 'PARTICIPANTES')))
        datos = {}
        if any(finales.values()):
            datos = extraer_json(self.modelo.completar(prompts.compromisos(material, contexto), formato_json=True))

        cuerpos = []
        for i in range(len(orden)):
            avance(0.7 + 0.29 * i / len(orden), f'Redactando el punto {i + 1} de {len(orden)}')
            notas = SALTO.join(notas_punto[i]).strip()
            if not notas:
                cuerpos.append('')  # no se habló de este punto: no hace falta preguntarle a la IA
                continue
            palabras, parrafos = objetivo_de_extension(notas)
            cuerpos.append(self.modelo.completar(prompts.desarrollo_de_punto(notas, orden, i, contexto, palabras, parrafos)))
        return datos, orden, cuerpos

    def _orden_desde_notas(self, notas_por_bloque: List[List[str]], contexto) -> List[str]:
        todas = [n for bloque in notas_por_bloque for n in bloque]
        if not todas:
            return ['Desarrollo de la reunión']
        limite = self.modelo.max_caracteres_transcripcion
        material = SALTO.join(todas)
        if len(material) > limite:
            # Para decidir los temas basta el comienzo de cada nota.
            material = SALTO.join(n[:160] for n in todas)[:limite]
        datos = extraer_json(self.modelo.completar(prompts.orden_del_dia(material, False, contexto), formato_json=True))
        return normalizar_propuesta(datos, '')['orden_dia'] or ['Desarrollo de la reunión']

    def _clasificar(self, notas_por_bloque: List[List[str]], orden: List[str], avance) -> List[List[str]]:
        """Reparte las notas entre los puntos. La IA solo responde números: es rápido."""
        notas_punto: List[List[str]] = [[] for _ in orden]
        if len(orden) == 1:
            notas_punto[0] = [n for bloque in notas_por_bloque for n in bloque]
            return notas_punto
        anterior = 0
        for b, notas in enumerate(notas_por_bloque, 1):
            if not notas:
                continue
            avance((b - 1) / len(notas_por_bloque), f'Ordenando las notas del fragmento {b} de {len(notas_por_bloque)}')
            numeradas = SALTO.join(f'{i}. {n.lstrip("-*• ").strip()}' for i, n in enumerate(notas, 1))
            mapa = extraer_json(self.modelo.completar(prompts.clasificar_notas(numeradas, orden), formato_json=True))
            for i, nota in enumerate(notas, 1):
                punto = punto_valido(mapa.get(str(i)), len(orden))
                # Si la IA no clasificó una nota, se deja con la anterior: en una reunión los temas van seguidos.
                anterior = punto if punto is not None else anterior
                notas_punto[anterior].append(nota)
        return notas_punto

    # ── Modelos con mucha memoria (Gemini): toda la reunión en una petición ──

    def _de_una_vez(self, texto, contexto, orden_fijo, palabras, avance):
        material, es_transcripcion = self._material_que_quepa(texto, lambda p, m: avance(p * 0.6, m))
        avance(0.62, 'Identificando orden del día y compromisos')
        datos = extraer_json(self.modelo.completar(
            prompts.estructura(material, es_transcripcion, contexto, orden_fijo), formato_json=True))
        orden = orden_fijo or normalizar_propuesta(datos, '')['orden_dia'] or ['Desarrollo de la reunión']
        avance(0.75, 'Redactando el desarrollo del orden del día')
        desarrollo = self.modelo.completar(prompts.desarrollo_completo(material, es_transcripcion, orden, contexto, palabras))
        cuerpos = secciones_del_desarrollo(desarrollo, orden)
        if cuerpos is None:
            # El modelo no respetó los títulos: se entrega tal cual para que la persona lo revise.
            return datos, orden, [sin_etiquetas_genericas(desarrollo.strip())]
        return datos, orden, cuerpos

    def _material_que_quepa(self, texto: str, avance: Callable[[float, str], None]):
        """Si la transcripción es muy larga para el modelo, se resume por partes (y otra vez si hace falta)."""
        limite = self.modelo.max_caracteres_transcripcion
        if len(texto) <= limite:
            return texto, True
        material = texto
        for ronda in range(MAX_RONDAS_RESUMEN):
            partes = dividir_texto(material, limite)
            notas = []
            for i, parte in enumerate(partes):
                avance((ronda + i / len(partes)) / MAX_RONDAS_RESUMEN, f'Resumiendo la parte {i + 1} de {len(partes)}')
                notas.append(self.modelo.completar(prompts.notas_de_parte(parte, i + 1, len(partes))).strip())
            material = '\n\n'.join(f'--- Parte {i + 1} ---\n{n}' for i, n in enumerate(notas))
            if len(material) <= limite:
                break
        return material[: limite * 2], False

    # ── Puntos sin contenido ──

    @staticmethod
    def _armar(orden: List[str], cuerpos: List[str], orden_de_la_persona: bool):
        """Si la IA propuso un punto del que no se habló, se quita; si lo escribió la persona, se deja y se avisa."""
        if len(cuerpos) != len(orden):
            return orden, cuerpos[0] if cuerpos else '', []
        finales, secciones, avisos = [], [], []
        for titulo, cuerpo in zip(orden, cuerpos):
            limpio = cuerpo_limpio(cuerpo)
            if not limpio and not orden_de_la_persona:
                avisos.append(f'Se quitó el punto "{titulo}" porque no se encontró de qué se habló sobre él. '
                              'Si sí se trató, agrégalo a mano.')
                continue
            if not limpio:
                avisos.append(f'No se encontró en la transcripción información sobre el punto "{titulo}".')
            finales.append(titulo)
            secciones.append(con_encabezado(len(finales) - 1, titulo, limpio))
        if not finales:
            return orden, '\n\n'.join(con_encabezado(i, t, '') for i, t in enumerate(orden)), avisos
        return finales, '\n\n'.join(secciones), avisos
