from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from shared.dominio import es_superadmin, puede_crear_actas
from ..aplicacion.casos_uso import ErrorDeValidacion
from ..dominio.entidades import EXTENSIONES_PERMITIDAS, MAX_PARTES, Estado
from . import contenedor, trabajador

TAMANO_TROZO_MB = 8


def _serializar(p, completo=True):
    partes = p.lista_partes()
    datos = {
        'id': p.id,
        'estado': p.estado,
        'progreso': p.progreso,
        'mensaje': p.mensaje,
        'nombre_archivo': p.nombre,
        'es_texto': p.es_texto,
        # Sin rutas ni textos: solo lo que la interfaz necesita para mostrar y reanudar la subida.
        'partes': [{'tipo': x.tipo, 'nombre': x.nombre, 'tamano': x.tamano, 'recibido': x.recibido} for x in partes],
        'tamano_bytes': sum(x.tamano for x in partes),
        'recibido_bytes': sum(x.recibido for x in partes),
        'proveedor_redaccion': p.proveedor_redaccion,
        'duracion_segundos': p.duracion_segundos,
        'tiene_transcripcion': p.tiene_transcripcion,
        'posicion_en_cola': contenedor.repo.posicion_en_cola(p.id) if p.estado == Estado.EN_COLA else 0,
    }
    if completo:
        datos['segmentos'] = p.segmentos
        datos['nombres_hablantes'] = p.nombres_hablantes
        datos['propuesta'] = p.propuesta
    return datos


def _manejar(funcion):
    try:
        return funcion()
    except ErrorDeValidacion as e:
        return Response({'detail': str(e)}, status=400)
    except PermissionError as e:
        return Response({'detail': str(e)}, status=403)
    except LookupError as e:
        return Response({'detail': str(e)}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def configuracion(request):
    c = settings.TRANSCRIPCION
    return Response({
        'proveedor_redaccion': c['REDACTOR_IA'],
        'max_mb': c['AUDIO_MAX_MB'],
        'parte_mb': TAMANO_TROZO_MB,
        'max_partes': MAX_PARTES,
        'extensiones': sorted(EXTENSIONES_PERMITIDAS),
        'identifica_hablantes': c['IDENTIFICAR_HABLANTES'],
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def crear(request):
    if not puede_crear_actas(request.user):
        return Response({'detail': 'No tienes permisos para crear actas.'}, status=403)
    d = request.data
    archivos = d.get('archivos') if isinstance(d.get('archivos'), list) else []
    textos = d.get('textos') if isinstance(d.get('textos'), list) else []
    # Compatibilidad con un solo archivo o un solo texto.
    if not archivos and d.get('nombre_archivo'):
        archivos = [{'nombre_archivo': d.get('nombre_archivo'), 'tamano_bytes': d.get('tamano_bytes')}]
    if not textos and d.get('texto'):
        textos = [d.get('texto')]

    def accion():
        p = contenedor.crear_procesamiento().ejecutar(
            creador_id=request.user.id,
            archivos=archivos,
            textos=textos,
            contexto={**(d.get('contexto') or {}), 'num_hablantes': d.get('num_hablantes')},
        )
        if p.estado == Estado.EN_COLA:
            trabajador.avisar()
        return Response(_serializar(p, completo=False), status=201)
    return _manejar(accion)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def contenido(request, pk):
    try:
        indice = int(request.query_params.get('parte', '0'))
        offset = int(request.query_params.get('offset', '-1'))
        longitud = int(request.META.get('CONTENT_LENGTH') or 0)
    except ValueError:
        return Response({'detail': 'Parámetros inválidos.'}, status=400)
    if offset < 0 or longitud <= 0 or longitud > (TAMANO_TROZO_MB + 1) * 1024 * 1024:
        return Response({'detail': 'Trozo inválido.'}, status=400)

    def accion():
        p = contenedor.recibir_parte().ejecutar(
            pk, request.user.id, es_superadmin(request.user), indice, offset, request._request, longitud)
        return Response(_serializar(p, completo=False))
    return _manejar(accion)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def detalle(request, pk):
    es_admin = es_superadmin(request.user)
    if request.method == 'DELETE':
        def eliminar():
            contenedor.eliminar_procesamiento().ejecutar(pk, request.user.id, es_admin)
            return Response(status=204)
        return _manejar(eliminar)

    def consultar():
        p = contenedor.consultar_procesamiento().ejecutar(pk, request.user.id, es_admin)
        if p.estado in Estado.EN_PROCESO:
            # Si el servidor se reinició, el trabajador vuelve a arrancar y retoma la cola.
            trabajador.asegurar_en_ejecucion()
        ligero = request.query_params.get('ligero') == '1' and p.estado not in Estado.TERMINALES
        return Response(_serializar(p, completo=not ligero))
    return _manejar(consultar)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def redactar(request, pk):
    def accion():
        p = contenedor.volver_a_redactar().ejecutar(
            pk, request.user.id, es_superadmin(request.user),
            nombres_hablantes=request.data.get('nombres_hablantes'),
            contexto=request.data.get('contexto'),
        )
        return Response(_serializar(p, completo=False))
    return _manejar(accion)
