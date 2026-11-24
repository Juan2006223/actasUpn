from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ..repositorios import DjangoFirmasRepository
from ...aplicacion.casos_uso import GestionarFirmaUseCase

firma_repo = DjangoFirmasRepository()
gestionar_firma_uc = GestionarFirmaUseCase(firma_repo)

@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def mi_firma(request):
    user = request.user
    if request.method == 'GET':
        firma_data = gestionar_firma_uc.obtener_firma(user.id)
        return Response({'firma_data': firma_data})

    if request.method == 'DELETE':
        gestionar_firma_uc.eliminar_firma(user.id)
        return Response(status=204)

    firma_data = request.data.get('firma_data', '').strip()
    if not firma_data:
        return Response({'detail': 'Firma requerida'}, status=400)

    try:
        gestionar_firma_uc.registrar_firma(user.id, firma_data)
        return Response({'firma_data': firma_data, 'detail': 'Firma guardada con exito'})
    except ValueError as e:
        return Response({'detail': str(e)}, status=400)
