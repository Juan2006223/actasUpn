"""Transcripción (faster-whisper) e identificación de hablantes (sherpa-onnx). Ambos corren en el propio servidor, gratis y sin enviar audio a terceros."""
import logging
import tarfile
import threading
import urllib.request
from pathlib import Path
from typing import List, Optional

from ..dominio.entidades import Segmento, Turno
from ..dominio.puertos import IdentificadorHablantes, ReportarAvance, Transcriptor

log = logging.getLogger(__name__)
FRECUENCIA = 16000

def _extraer_seguro(tar: tarfile.TarFile, destino: Path) -> None:
    """Extrae solo archivos y carpetas normales dentro de destino (Python < 3.11.4 no tiene filter='data')."""
    base = destino.resolve()
    for miembro in tar.getmembers():
        ruta = (base / miembro.name).resolve()
        if base not in ruta.parents or not (miembro.isfile() or miembro.isdir()):
            raise RuntimeError(f'Archivo sospechoso en el modelo descargado: {miembro.name}')
    tar.extractall(base)  # noqa: S202 — validado arriba


_cache_whisper = {}
_lock_whisper = threading.Lock()


class TranscriptorWhisper(Transcriptor):
    def __init__(self, modelo: str, carpeta_modelos: Path, dispositivo: str = 'cpu', tipo_computo: str = 'int8', hilos: int = 0):
        self.modelo = modelo
        self.carpeta = Path(carpeta_modelos) / 'whisper'
        self.dispositivo = dispositivo
        self.tipo_computo = tipo_computo
        self.hilos = hilos

    def _cargar(self):
        from faster_whisper import WhisperModel  # import diferido: es pesado
        clave = (self.modelo, self.dispositivo, self.tipo_computo)
        with _lock_whisper:
            if clave not in _cache_whisper:
                self.carpeta.mkdir(parents=True, exist_ok=True)
                _cache_whisper[clave] = WhisperModel(
                    self.modelo, device=self.dispositivo, compute_type=self.tipo_computo,
                    cpu_threads=self.hilos, download_root=str(self.carpeta))
            return _cache_whisper[clave]

    def transcribir(self, ruta_audio: str, avance: ReportarAvance) -> List[Segmento]:
        modelo = self._cargar()
        segmentos, info = modelo.transcribe(
            ruta_audio,
            language='es',
            vad_filter=True,  # salta silencios: más rápido y menos texto inventado
            beam_size=5,
            condition_on_previous_text=False,  # evita que en audios largos se repita una frase en bucle
            initial_prompt='Reunión de la Universidad Pedagógica Nacional. Orden del día, acta, compromisos, comité, facultad.',
        )
        duracion = info.duration or 1
        resultado = []
        for s in segmentos:
            texto = s.text.strip()
            if texto:
                resultado.append(Segmento(s.start, s.end, texto))
            avance(min(1.0, s.end / duracion))  # si se canceló, lanza y corta la transcripción
        avance(1.0)
        return resultado, float(info.duration or 0)


class IdentificadorSherpa(IdentificadorHablantes):
    URL_SEGMENTACION = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-segmentation-models/sherpa-onnx-pyannote-segmentation-3-0.tar.bz2'
    URL_VOCES = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/wespeaker_en_voxceleb_resnet34_LM.onnx'

    def __init__(self, carpeta_modelos: Path, umbral: float = 0.5, hilos: int = 4):
        self.carpeta = Path(carpeta_modelos) / 'diarizacion'
        self.umbral = umbral
        self.hilos = hilos

    @property
    def ruta_segmentacion(self) -> Path:
        return self.carpeta / 'sherpa-onnx-pyannote-segmentation-3-0' / 'model.onnx'

    @property
    def ruta_voces(self) -> Path:
        return self.carpeta / 'wespeaker_en_voxceleb_resnet34_LM.onnx'

    def asegurar_modelos(self) -> None:
        """Descarga los modelos la primera vez (unos 33 MB)."""
        self.carpeta.mkdir(parents=True, exist_ok=True)
        if not self.ruta_segmentacion.exists():
            log.info('Descargando modelo de segmentación de hablantes…')
            comprimido = self.carpeta / 'segmentacion.tar.bz2'
            urllib.request.urlretrieve(self.URL_SEGMENTACION, comprimido)
            with tarfile.open(comprimido, 'r:bz2') as tar:
                _extraer_seguro(tar, self.carpeta)
            comprimido.unlink(missing_ok=True)
        if not self.ruta_voces.exists():
            log.info('Descargando modelo de reconocimiento de voces…')
            urllib.request.urlretrieve(self.URL_VOCES, self.ruta_voces)

    def identificar(self, rutas_audio: List[str], avance: ReportarAvance, num_hablantes: Optional[int] = None) -> List[Turno]:
        import numpy as np
        import sherpa_onnx
        from faster_whisper import decode_audio

        self.asegurar_modelos()
        config = sherpa_onnx.OfflineSpeakerDiarizationConfig(
            segmentation=sherpa_onnx.OfflineSpeakerSegmentationModelConfig(
                pyannote=sherpa_onnx.OfflineSpeakerSegmentationPyannoteModelConfig(model=str(self.ruta_segmentacion)),
                num_threads=self.hilos),
            embedding=sherpa_onnx.SpeakerEmbeddingExtractorConfig(model=str(self.ruta_voces), num_threads=self.hilos),
            clustering=sherpa_onnx.FastClusteringConfig(
                num_clusters=int(num_hablantes) if num_hablantes else -1, threshold=self.umbral),
            min_duration_on=0.3,
            min_duration_off=0.5,
        )
        if not config.validate():
            raise RuntimeError('Configuración de identificación de hablantes inválida.')
        motor = sherpa_onnx.OfflineSpeakerDiarization(config)
        # Todas las partes se analizan como un solo audio continuo: así la misma voz
        # recibe la misma etiqueta aunque la reunión se haya grabado en varios archivos.
        audio = np.concatenate([decode_audio(r, sampling_rate=FRECUENCIA) for r in rutas_audio])
        fallo = []

        def progreso(hechos, total):
            try:
                avance(hechos / max(1, total))
                return 0
            except Exception as e:  # noqa: BLE001 — p. ej. cancelación: se pide al motor que pare
                fallo.append(e)
                return 1

        resultado = motor.process(audio, callback=progreso)
        if fallo:
            raise fallo[0]
        return [Turno(r.start, r.end, str(r.speaker)) for r in resultado.sort_by_start_time()]
