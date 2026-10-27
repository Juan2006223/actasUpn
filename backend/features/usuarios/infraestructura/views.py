from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from shared.dominio import es_superadmin, puede_gestionar_grupos
from .serializers import UserSerializer
from .repositorios import DjangoUsuariosRepository
from ..aplicacion.casos_uso import (
    BuscarUsuariosUseCase,
    ListarUsuariosUseCase,
    CambiarRolUsuarioUseCase,
    AlternarEstadoUsuarioUseCase,
    CrearUsuarioInstitucionalUseCase,
    ImportarUsuariosMasivoUseCase,
)

repo_usuarios = DjangoUsuariosRepository()
buscar_usuarios_uc = BuscarUsuariosUseCase(repo_usuarios)
listar_usuarios_uc = ListarUsuariosUseCase(repo_usuarios)
cambiar_rol_uc = CambiarRolUsuarioUseCase(repo_usuarios)
alternar_estado_uc = AlternarEstadoUsuarioUseCase(repo_usuarios)
crear_usuario_uc = CrearUsuarioInstitucionalUseCase(repo_usuarios)
importar_masivo_uc = ImportarUsuariosMasivoUseCase(repo_usuarios)

_es_superadmin = es_superadmin
_puede_convocar_grupos = puede_gestionar_grupos

def _serialize_usuario(entidad):
    return {
        'id': entidad.id,
        'username': entidad.username,
        'email': entidad.email,
        'first_name': entidad.first_name,
        'last_name': entidad.last_name,
        'full_name': entidad.full_name,
        'role': entidad.role,
        'document_number': entidad.document_number,
        'photo': entidad.photo,
        'is_active': entidad.is_active,
    }

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    if not username or not password:
        return Response({'detail': 'Credenciales incompletas'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, username=username, password=password)
    if not user:
        return Response({'detail': 'Usuario o contrasena incorrectos'}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.is_active:
        return Response({'detail': 'Usuario inactivo'}, status=status.HTTP_403_FORBIDDEN)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data
    })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def search_users_view(request):
    if not _puede_convocar_grupos(request.user):
        return Response(
            {'detail': 'Solo Supervisores, Coordinadores, Docentes y Superadmin pueden convocar usuarios a grupos de acta.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    q = request.query_params.get('q', '').strip()
    usuarios = buscar_usuarios_uc.ejecutar(q)
    return Response([_serialize_usuario(u) for u in usuarios])

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def usuarios_collection_view(request):
    if not _es_superadmin(request.user):
        return Response(
            {'detail': 'El panel de gestión de usuarios es exclusivo del Superadministrador.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    if request.method == 'GET':
        usuarios = listar_usuarios_uc.ejecutar()
        return Response([_serialize_usuario(u) for u in usuarios])

    try:
        creado = crear_usuario_uc.ejecutar(
            document_number=request.data.get('document_number', ''),
            email=request.data.get('email', ''),
            first_name=request.data.get('first_name', ''),
            last_name=request.data.get('last_name', ''),
            role=request.data.get('role', 'TEACHER'),
            password=request.data.get('password') or None,
        )
        return Response(_serialize_usuario(creado), status=status.HTTP_201_CREATED)
    except ValueError as err:
        return Response({'detail': str(err)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def cambiar_rol_view(request, pk: int):
    if not _es_superadmin(request.user):
        return Response({'detail': 'Permiso denegado.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        actualizado = cambiar_rol_uc.ejecutar(pk, request.data.get('role') or request.data.get('rol'))
        return Response(_serialize_usuario(actualizado))
    except ValueError as err:
        return Response({'detail': str(err)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def alternar_estado_view(request, pk: int):
    if not _es_superadmin(request.user):
        return Response({'detail': 'Permiso denegado.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        actualizado = alternar_estado_uc.ejecutar(pk, actor_id=request.user.id)
        return Response(_serialize_usuario(actualizado))
    except ValueError as err:
        return Response({'detail': str(err)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def importar_usuarios_view(request):
    if not _es_superadmin(request.user):
        return Response({'detail': 'Permiso denegado.'}, status=status.HTTP_403_FORBIDDEN)
    registros = request.data.get('registros', [])
    if not isinstance(registros, list):
        return Response({'detail': 'Formato de registros invalido'}, status=status.HTTP_400_BAD_REQUEST)
    resultado = importar_masivo_uc.ejecutar(registros)
    return Response(resultado)
