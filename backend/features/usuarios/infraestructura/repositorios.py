from typing import Optional, List
from django.db.models import Q
from ..dominio.entidades import UsuarioEntidad
from ..dominio.puertos import RepositorioUsuarios
from .models import User

class DjangoUsuariosRepository(RepositorioUsuarios):
    def _to_entity(self, model: User) -> UsuarioEntidad:
        return UsuarioEntidad(
            id=model.id,
            username=model.username,
            email=model.email or "",
            first_name=model.first_name or "",
            last_name=model.last_name or "",
            role=model.role,
            document_number=model.document_number,
            photo=model.photo.url if model.photo else None,
            is_active=model.is_active,
        )

    def obtener_por_id(self, user_id: int) -> Optional[UsuarioEntidad]:
        try:
            u = User.objects.get(pk=user_id)
            return self._to_entity(u)
        except User.DoesNotExist:
            return None

    def obtener_por_documento_o_correo(self, documento: str, email: str) -> Optional[UsuarioEntidad]:
        filtro = Q(email__iexact=email)
        if documento:
            filtro |= Q(document_number__iexact=documento)
        u = User.objects.filter(filtro).first()
        return self._to_entity(u) if u else None

    def listar_todos(self) -> List[UsuarioEntidad]:
        qs = User.objects.all().order_by('-is_active', 'first_name', 'last_name', 'username')
        return [self._to_entity(u) for u in qs]

    def buscar_por_termino(self, termino: str, limite: int = 20) -> List[UsuarioEntidad]:
        q = termino.strip()
        filtro = (
            Q(first_name__icontains=q) |
            Q(last_name__icontains=q) |
            Q(username__icontains=q) |
            Q(email__icontains=q) |
            Q(document_number__icontains=q) |
            Q(role__icontains=q)
        )
        if q.lower() in ('profesor', 'docente', 'teacher', 'supervisor', 'coordinador', 'apoyo', 'asistente', 'directorio', 'todos'):
            filtro |= Q(role__in=['TEACHER', 'ADMIN', 'SUPERVISOR', 'COORDINADOR', 'APOYO', 'ASISTENTE', 'STUDENT'])
        qs = User.objects.filter(filtro, is_active=True).order_by('first_name', 'last_name')[:limite]
        return [self._to_entity(u) for u in qs]

    def guardar(self, usuario: UsuarioEntidad, password: Optional[str] = None) -> UsuarioEntidad:
        username = usuario.username
        if not usuario.id:
            base = username
            contador = 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{contador}"
                contador += 1

        defaults = {
            'username': username,
            'email': usuario.email,
            'first_name': usuario.first_name,
            'last_name': usuario.last_name,
            'role': usuario.role,
            'document_number': usuario.document_number,
            'is_active': usuario.is_active,
        }
        if usuario.id:
            obj, _ = User.objects.update_or_create(pk=usuario.id, defaults=defaults)
        else:
            obj = User(**defaults)
            if password:
                obj.set_password(password)
            else:
                obj.set_password(usuario.document_number or 'upn2026')
            obj.save()
        return self._to_entity(obj)
