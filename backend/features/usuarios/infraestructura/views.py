from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from shared.dominio import es_superadmin, puede_gestionar_grupos
from .serializers import UserSerializer
from .repositorios import DjangoUsuariosRepository, DjangoDependenciasRepository
from ..aplicacion.casos_uso import (
    BuscarUsuariosUseCase,
    ListarUsuariosUseCase,
    CambiarRolUsuarioUseCase,
    AlternarEstadoUsuarioUseCase,
    CrearUsuarioInstitucionalUseCase,
    ImportarUsuariosMasivoUseCase,
    ActualizarPerfilUsuarioUseCase,
    GestionarDependenciasUseCase,
)

repo_usuarios = DjangoUsuariosRepository()
buscar_usuarios_uc = BuscarUsuariosUseCase(repo_usuarios)
listar_usuarios_uc = ListarUsuariosUseCase(repo_usuarios)
cambiar_rol_uc = CambiarRolUsuarioUseCase(repo_usuarios)
alternar_estado_uc = AlternarEstadoUsuarioUseCase(repo_usuarios)
repo_dependencias = DjangoDependenciasRepository()
crear_usuario_uc = CrearUsuarioInstitucionalUseCase(repo_usuarios, repo_dependencias)
importar_masivo_uc = ImportarUsuariosMasivoUseCase(repo_usuarios, repo_dependencias)
actualizar_perfil_uc = ActualizarPerfilUsuarioUseCase(repo_usuarios, repo_dependencias)
dependencias_uc = GestionarDependenciasUseCase(repo_dependencias)

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
        'cargo': entidad.cargo,
        'dependencia_id': entidad.dependencia_id,
        'dependencia_nombre': entidad.dependencia_nombre,
        'document_number': entidad.document_number,
        'photo': entidad.photo,
        'is_active': entidad.is_active,
    }

@api_view(['POST'])
@authentication_classes([])
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
            {'detail': 'No tienes permisos para convocar usuarios.'},
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
            role=request.data.get('role') or 'REDACTOR',
            password=request.data.get('password') or None,
            cargo=request.data.get('cargo', ''),
            dependencia_id=request.data.get('dependencia_id'),
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


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def actualizar_usuario_view(request, pk: int):
    if not _es_superadmin(request.user):
        return Response({'detail': 'Permiso denegado.'}, status=status.HTTP_403_FORBIDDEN)
    campos = ('role', 'cargo', 'dependencia_id', 'first_name', 'last_name')
    datos = {k: request.data.get(k) for k in campos if k in request.data}
    try:
        actualizado = actualizar_perfil_uc.ejecutar(pk, datos, actor_id=request.user.id)
        return Response(_serialize_usuario(actualizado))
    except ValueError as err:
        return Response({'detail': str(err)}, status=status.HTTP_400_BAD_REQUEST)


def _serialize_dependencia(d):
    return {'id': d.id, 'nombre': d.nombre, 'activa': d.activa, 'num_usuarios': d.num_usuarios}


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def dependencias_view(request):
    if request.method == 'GET':
        # Todos ven las activas (para mostrar cargos en actas); el superadmin ve también las inactivas.
        solo_activas = not _es_superadmin(request.user)
        return Response([_serialize_dependencia(d) for d in dependencias_uc.listar(solo_activas=solo_activas)])
    if not _es_superadmin(request.user):
        return Response({'detail': 'Solo el Superadministrador gestiona dependencias.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        creada = dependencias_uc.crear(request.data.get('nombre', ''))
        return Response(_serialize_dependencia(creada), status=status.HTTP_201_CREATED)
    except ValueError as err:
        return Response({'detail': str(err)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def dependencia_detalle_view(request, pk: int):
    if not _es_superadmin(request.user):
        return Response({'detail': 'Solo el Superadministrador gestiona dependencias.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        if request.method == 'DELETE':
            dependencias_uc.eliminar(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        datos = {k: request.data.get(k) for k in ('nombre', 'activa') if k in request.data}
        return Response(_serialize_dependencia(dependencias_uc.actualizar(pk, datos)))
    except LookupError as err:
        return Response({'detail': str(err)}, status=status.HTTP_404_NOT_FOUND)
    except ValueError as err:
        return Response({'detail': str(err)}, status=status.HTTP_400_BAD_REQUEST)
