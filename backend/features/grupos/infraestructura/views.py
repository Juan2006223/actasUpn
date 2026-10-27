from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from shared.dominio import es_superadmin, puede_gestionar_grupos
from .repositorios import DjangoGruposRepository
from ..aplicacion.casos_uso import (
    ListarGruposUseCase,
    CrearGrupoUseCase,
    EliminarGrupoUseCase,
    ListarCursosParaImportacionUseCase,
)

repo_grupos = DjangoGruposRepository()
listar_grupos_uc = ListarGruposUseCase(repo_grupos)
crear_grupo_uc = CrearGrupoUseCase(repo_grupos)
eliminar_grupo_uc = EliminarGrupoUseCase(repo_grupos)
listar_cursos_uc = ListarCursosParaImportacionUseCase(repo_grupos)


def _serialize_grupo(g):
    integrantes = g.integrantes or []
    return {
        'id': g.id,
        'name': g.name,
        'date': g.date.isoformat() if hasattr(g.date, 'isoformat') else str(g.date),
        'description': g.description,
        'features': g.features,
        'advisor_id': g.advisor_id,
        'advisor_name': g.advisor_name,
        'student_count': len(integrantes),
        'students': integrantes,
    }


class GrupoViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        grupos = listar_grupos_uc.ejecutar(
            user_id=request.user.id,
            es_admin=es_superadmin(request.user),
        )
        return Response([_serialize_grupo(g) for g in grupos])

    def create(self, request):
        if not puede_gestionar_grupos(request.user):
            return Response(
                {'detail': 'Solo Supervisores, Coordinadores, Docentes y Superadmin pueden crear grupos de acta.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        data = request.data
        try:
            grupo = crear_grupo_uc.ejecutar(
                name=data.get('name', ''),
                fecha=data.get('date', ''),
                description=data.get('description', ''),
                features=data.get('features', ''),
                advisor_id=request.user.id,
                advisor_name=data.get('advisor_name', ''),
            )
            return Response(_serialize_grupo(grupo), status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        if not puede_gestionar_grupos(request.user):
            return Response(
                {'detail': 'No tienes permisos para eliminar grupos de acta.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            eliminado = eliminar_grupo_uc.ejecutar(
                grupo_id=int(pk),
                user_id=request.user.id,
                es_admin=es_superadmin(request.user),
            )
        except PermissionError as err:
            return Response({'detail': str(err)}, status=status.HTTP_403_FORBIDDEN)
        if not eliminado:
            return Response({'detail': 'Grupo no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], url_path='cursos')
    def cursos(self, request):
        cursos = listar_cursos_uc.ejecutar(
            user_id=request.user.id,
            es_admin=es_superadmin(request.user),
        )
        return Response(cursos)
