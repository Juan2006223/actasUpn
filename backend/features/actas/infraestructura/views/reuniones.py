from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from shared.dominio import es_superadmin, puede_crear_actas
from ..repositorios import DjangoActasRepository
from ...aplicacion.casos_uso import (
    ListarActasUseCase, ListarMisActasUseCase, ObtenerActaUseCase,
    GuardarActaUseCase, EliminarActaUseCase
)

repo = DjangoActasRepository()
listar_actas_uc = ListarActasUseCase(repo)
listar_mis_actas_uc = ListarMisActasUseCase(repo)
obtener_acta_uc = ObtenerActaUseCase(repo)
guardar_acta_uc = GuardarActaUseCase(repo)
eliminar_acta_uc = EliminarActaUseCase(repo)


def _serialize_entidad(acta):
    d = dict(acta.data or {})
    d.pop('id', None)
    d.pop('creador_id', None)
    return {'id': acta.id, **d, 'creador_id': acta.creador_id}


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def reuniones_list(request):
    user = request.user
    if request.method == 'GET':
        actas = listar_actas_uc.ejecutar(user.id, es_admin=es_superadmin(user))
        return Response([_serialize_entidad(a) for a in actas])

    if not puede_crear_actas(user):
        return Response({'detail': 'No tienes permisos para crear actas.'}, status=403)

    data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
    acta = guardar_acta_uc.ejecutar(data=data, creador_id=user.id, actor_id=user.id, es_admin=es_superadmin(user))
    return Response(_serialize_entidad(acta), status=201)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def reuniones_detail(request, pk):
    user = request.user
    is_admin = es_superadmin(user)

    try:
        acta = obtener_acta_uc.ejecutar(pk, user_id=user.id, es_admin=is_admin)
    except PermissionError as e:
        return Response({'detail': str(e)}, status=403)

    if not acta:
        return Response({'detail': 'No encontrada'}, status=404)

    if request.method == 'GET':
        return Response(_serialize_entidad(acta))

    if request.method == 'DELETE':
        try:
            eliminar_acta_uc.ejecutar(pk, user_id=user.id, es_admin=is_admin)
            return Response(status=204)
        except PermissionError as e:
            return Response({'detail': str(e)}, status=403)

    try:
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        acta_actualizada = guardar_acta_uc.ejecutar(
            data=data,
            creador_id=acta.creador_id,
            acta_id=pk,
            actor_id=user.id,
            es_admin=is_admin,
        )
        return Response(_serialize_entidad(acta_actualizada))
    except PermissionError as e:
        return Response({'detail': str(e)}, status=403)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reuniones_mis(request):
    actas = listar_mis_actas_uc.ejecutar(request.user.id)
    return Response([_serialize_entidad(a) for a in actas])
