from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from shared.dominio import puede_crear_actas
from ..repositorios import DjangoActasRepository, DjangoFirmasRepository, nombres_de_dependencias, nombres_de_usuarios
from ...dominio.entidades import Actor
from ...aplicacion.casos_uso import (
    ListarActasUseCase, ListarMisActasUseCase, ObtenerActaUseCase, CrearActaUseCase, EditarActaUseCase,
    EliminarActaUseCase, FirmarActaUseCase, AgregarObservacionUseCase, CambiarEstadoActaUseCase,
)

repo = DjangoActasRepository()
listar_actas_uc = ListarActasUseCase(repo)
listar_mis_actas_uc = ListarMisActasUseCase(repo)
obtener_acta_uc = ObtenerActaUseCase(repo)
crear_acta_uc = CrearActaUseCase(repo)
editar_acta_uc = EditarActaUseCase(repo)
eliminar_acta_uc = EliminarActaUseCase(repo)
firmar_acta_uc = FirmarActaUseCase(repo, DjangoFirmasRepository())
observar_acta_uc = AgregarObservacionUseCase(repo)
cambiar_estado_uc = CambiarEstadoActaUseCase(repo)


# Campos que calcula el servidor o que solo usa la interfaz: no se guardan dentro de data.
CAMPOS_NO_PERSISTIBLES = (
    'id', 'creador_id', 'creador_nombre', 'updated_at', 'isNew', 'estado', 'dependencia_id',
    'dependencia_nombre', 'permisos',
)


def actor_de(request) -> Actor:
    u = request.user
    nombre = f'{u.first_name or ""} {u.last_name or ""}'.strip() or u.username
    return Actor(id=u.id, rol=getattr(u, 'role', ''), dependencia_id=getattr(u, 'dependencia_id', None),
                 nombre=nombre, es_superuser=bool(getattr(u, 'is_superuser', False)))


def _serializar(actas, actor):
    dependencias = nombres_de_dependencias({a.dependencia_id for a in actas})
    creadores = nombres_de_usuarios({a.creador_id for a in actas})
    resultado = []
    for acta in actas:
        d = {k: v for k, v in (acta.data or {}).items() if k not in CAMPOS_NO_PERSISTIBLES}
        resultado.append({
            'id': acta.id,
            **d,
            'estado': acta.estado,
            'borrador': acta.estado == 'BORRADOR',
            'creador_id': acta.creador_id,
            'creador_nombre': creadores.get(acta.creador_id, ''),
            'dependencia_id': acta.dependencia_id,
            'dependencia_nombre': dependencias.get(acta.dependencia_id, ''),
            'permisos': acta.permisos(actor),
            'updated_at': acta.updated_at.isoformat() if acta.updated_at else None,
        })
    return resultado


def _una(acta, actor):
    return _serializar([acta], actor)[0]


def _datos_entrada(request):
    data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
    for campo in CAMPOS_NO_PERSISTIBLES:
        data.pop(campo, None)
    return data


def _responder(funcion, codigo=200):
    try:
        resultado = funcion()
    except PermissionError as e:
        return Response({'detail': str(e)}, status=403)
    except LookupError:
        return Response({'detail': 'No encontrada'}, status=404)
    except ValueError as e:
        return Response({'detail': str(e)}, status=400)
    if resultado is None:
        return Response(status=204)
    return Response(resultado, status=codigo)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def reuniones_list(request):
    actor = actor_de(request)
    if request.method == 'GET':
        return Response(_serializar(listar_actas_uc.ejecutar(actor), actor))

    if not puede_crear_actas(request.user):
        return Response({'detail': 'No tienes permisos para crear actas.'}, status=403)
    return _responder(lambda: _una(crear_acta_uc.ejecutar(_datos_entrada(request), actor), actor), 201)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def reuniones_detail(request, pk):
    actor = actor_de(request)
    if request.method == 'GET':
        return _responder(lambda: _una(obtener_acta_uc.ejecutar(pk, actor), actor))
    if request.method == 'DELETE':
        return _responder(lambda: eliminar_acta_uc.ejecutar(pk, actor) and None)
    return _responder(lambda: _una(editar_acta_uc.ejecutar(pk, _datos_entrada(request), actor), actor))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reuniones_firmar(request, pk):
    actor = actor_de(request)
    firma = request.data.get('firma_data') or None
    return _responder(lambda: _una(firmar_acta_uc.ejecutar(pk, actor, firma), actor))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reuniones_observaciones(request, pk):
    actor = actor_de(request)
    return _responder(lambda: _una(observar_acta_uc.ejecutar(pk, actor, request.data.get('texto', '')), actor), 201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reuniones_estado(request, pk):
    actor = actor_de(request)
    return _responder(lambda: _una(cambiar_estado_uc.ejecutar(
        pk, actor, request.data.get('estado', ''), request.data.get('motivo', '')), actor))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reuniones_mis(request):
    actor = actor_de(request)
    return Response(_serializar(listar_mis_actas_uc.ejecutar(actor.id), actor))
