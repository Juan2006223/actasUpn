from typing import List, Optional, Dict, Any
from datetime import date
from django.contrib.auth import get_user_model
from ..dominio.entidades import GrupoEntidad
from ..dominio.puertos import RepositorioGrupos
from .models import Grupo


class DjangoGruposRepository(RepositorioGrupos):
    def _cargar_usuarios_activos(self) -> List[Dict[str, Any]]:
        User = get_user_model()
        return list(User.objects.filter(is_active=True).values(
            'id', 'username', 'first_name', 'last_name', 'email', 'role', 'document_number'
        ))

    def _to_entity(self, model: Grupo, usuarios: Optional[List[Dict[str, Any]]] = None) -> GrupoEntidad:
        entidad = GrupoEntidad(
            id=model.id,
            name=model.name,
            date=model.date,
            description=model.description or "",
            features=model.features or "",
            advisor_id=model.advisor_id,
            advisor_name=model.advisor_name or "",
        )
        entidad.integrantes = self._resolver_integrantes(entidad, usuarios)
        return entidad

    def listar_todos(self) -> List[GrupoEntidad]:
        usuarios = self._cargar_usuarios_activos()
        return [self._to_entity(g, usuarios) for g in Grupo.objects.all()]

    def obtener_por_id(self, grupo_id: int) -> Optional[GrupoEntidad]:
        try:
            model = Grupo.objects.get(pk=grupo_id)
            return self._to_entity(model, self._cargar_usuarios_activos())
        except Grupo.DoesNotExist:
            return None

    def guardar(self, grupo: GrupoEntidad) -> GrupoEntidad:
        fecha_val = grupo.date
        if isinstance(fecha_val, str):
            fecha_val = date.fromisoformat(fecha_val)
        defaults = {
            'name': grupo.name,
            'date': fecha_val,
            'description': grupo.description,
            'features': grupo.features,
            'advisor_id': int(grupo.advisor_id) if str(grupo.advisor_id or '').isdigit() else None,
            'advisor_name': grupo.advisor_name,
        }
        if grupo.id:
            obj, _ = Grupo.objects.update_or_create(pk=grupo.id, defaults=defaults)
        else:
            obj = Grupo.objects.create(**defaults)
        return self._to_entity(obj, self._cargar_usuarios_activos())

    def eliminar(self, grupo_id: int) -> bool:
        deleted, _ = Grupo.objects.filter(pk=grupo_id).delete()
        return deleted > 0

    def listar_estudiantes_activos(self) -> List[Dict[str, Any]]:
        return [
            u for u in self._cargar_usuarios_activos()
            if u.get('role') == 'STUDENT'
        ]

    def _resolver_integrantes(
        self,
        grupo: GrupoEntidad,
        usuarios: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        catalogo = usuarios if usuarios is not None else self._cargar_usuarios_activos()
        por_id = {u['id']: u for u in catalogo}
        integrantes: List[Dict[str, Any]] = []
        vistos = set()

        def _agregar_usuario(u: Dict[str, Any]):
            clave = f"id:{u['id']}"
            if clave in vistos:
                return
            vistos.add(clave)
            nombre = f"{u.get('first_name') or ''} {u.get('last_name') or ''}".strip() or u.get('username', '')
            vistos.add(f"name:{nombre.lower()}")
            integrantes.append({
                'id': u['id'],
                'first_name': u.get('first_name') or nombre,
                'last_name': u.get('last_name') or '',
                'full_name': nombre,
                'email': u.get('email') or '',
                'role': u.get('role') or 'ASISTENTE',
                'document_number': u.get('document_number') or '',
            })

        if grupo.advisor_id and int(grupo.advisor_id) in por_id:
            _agregar_usuario(por_id[int(grupo.advisor_id)])

        for item in (grupo.features or '').split(','):
            token = item.strip()
            if not token:
                continue
            raw_role = 'ASISTENTE'
            raw_name = token
            if '(' in token and token.endswith(')'):
                idx = token.rfind('(')
                raw_name = token[:idx].strip()
                raw_role = token[idx + 1:-1].strip() or 'ASISTENTE'
            if not raw_name:
                continue
            target_low = raw_name.lower()
            match = next(
                (
                    u for u in catalogo
                    if target_low in (
                        f"{u.get('first_name') or ''} {u.get('last_name') or ''}".strip().lower(),
                        (u.get('username') or '').lower(),
                        (u.get('email') or '').lower(),
                    )
                ),
                None,
            )
            if match:
                _agregar_usuario(match)
            elif f"name:{target_low}" not in vistos:
                vistos.add(f"name:{target_low}")
                integrantes.append({
                    'id': None,
                    'first_name': raw_name,
                    'last_name': '',
                    'full_name': raw_name,
                    'email': '',
                    'role': raw_role,
                    'document_number': '',
                })

        if integrantes:
            return integrantes
        return [u for u in catalogo if u.get('role') == 'STUDENT']

    def obtener_integrantes_grupo(self, grupo: GrupoEntidad) -> List[Dict[str, Any]]:
        return grupo.integrantes if grupo.integrantes else self._resolver_integrantes(grupo)
