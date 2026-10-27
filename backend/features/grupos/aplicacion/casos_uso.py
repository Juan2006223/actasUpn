from typing import List, Optional, Dict, Any
from datetime import date
from ..dominio.entidades import GrupoEntidad
from ..dominio.puertos import RepositorioGrupos


class ListarGruposUseCase:
    def __init__(self, repo: RepositorioGrupos):
        self.repo = repo

    def ejecutar(self, user_id: Optional[int] = None, es_admin: bool = True) -> List[GrupoEntidad]:
        grupos = self.repo.listar_todos()
        if user_id is None or es_admin:
            return grupos
        return [g for g in grupos if g.pertenece_a_usuario(user_id, es_admin=False)]


class CrearGrupoUseCase:
    def __init__(self, repo: RepositorioGrupos):
        self.repo = repo

    def ejecutar(
        self,
        name: str,
        fecha: date,
        description: str = "",
        features: str = "",
        advisor_id: Optional[int] = None,
        advisor_name: str = ""
    ) -> GrupoEntidad:
        grupo = GrupoEntidad(
            id=None,
            name=name,
            date=fecha,
            description=description,
            features=features,
            advisor_id=advisor_id,
            advisor_name=advisor_name,
        )
        return self.repo.guardar(grupo)


class EliminarGrupoUseCase:
    def __init__(self, repo: RepositorioGrupos):
        self.repo = repo

    def ejecutar(
        self,
        grupo_id: int,
        user_id: Optional[int] = None,
        es_admin: bool = True
    ) -> bool:
        grupo = self.repo.obtener_por_id(grupo_id)
        if not grupo:
            return False
        if user_id is not None and not grupo.puede_ser_eliminado_por(user_id, es_admin):
            raise PermissionError("Solo puedes eliminar grupos creados por ti.")
        return self.repo.eliminar(grupo_id)


class ListarCursosParaImportacionUseCase:
    def __init__(self, repo: RepositorioGrupos):
        self.repo = repo

    def ejecutar(self, user_id: Optional[int] = None, es_admin: bool = True) -> List[Dict[str, Any]]:
        grupos = self.repo.listar_todos()
        if user_id is not None and not es_admin:
            grupos = [g for g in grupos if g.pertenece_a_usuario(user_id, es_admin=False)]
        resultado = []
        for g in grupos:
            integrantes = g.integrantes or self.repo.obtener_integrantes_grupo(g)
            fecha_str = g.date.isoformat() if hasattr(g.date, 'isoformat') else str(g.date)
            year = fecha_str.split('-')[0] if '-' in fecha_str else '2026'
            resultado.append({
                'id': g.id,
                'name': g.name,
                'code': f"GRP-{g.id:03d}" if g.id else "GRP-000",
                'teacher_name': g.advisor_name or 'Sin creador',
                'year': year,
                'period': '1',
                'features': g.features,
                'student_count': len(integrantes),
                'students': integrantes,
            })
        return resultado
