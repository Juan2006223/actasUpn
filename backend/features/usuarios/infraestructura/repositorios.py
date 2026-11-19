from typing import Optional, List
from django.db.models import Q, Count
from ..dominio.entidades import UsuarioEntidad, DependenciaEntidad
from ..dominio.puertos import RepositorioUsuarios, RepositorioDependencias
from .models import User, Dependencia

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
            cargo=model.cargo or "",
            dependencia_id=model.dependencia_id,
            dependencia_nombre=model.dependencia.nombre if model.dependencia_id else "",
        )

    def obtener_por_id(self, user_id: int) -> Optional[UsuarioEntidad]:
        try:
            u = User.objects.select_related('dependencia').get(pk=user_id)
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
        qs = User.objects.select_related('dependencia').order_by('-is_active', 'first_name', 'last_name', 'username')
        return [self._to_entity(u) for u in qs]

    def buscar_por_termino(self, termino: str, limite: int = 20) -> List[UsuarioEntidad]:
        q = termino.strip()
        filtro = (
            Q(first_name__icontains=q) |
            Q(last_name__icontains=q) |
            Q(username__icontains=q) |
            Q(email__icontains=q) |
            Q(document_number__icontains=q) |
            Q(cargo__icontains=q) |
            Q(dependencia__nombre__icontains=q)
        )
        if q.lower() in ('directorio', 'todos'):
            filtro = Q()
        qs = User.objects.select_related('dependencia').filter(filtro, is_active=True).order_by('first_name', 'last_name')[:limite]
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
            'cargo': usuario.cargo or '',
            'dependencia_id': usuario.dependencia_id,
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


class DjangoDependenciasRepository(RepositorioDependencias):
    def _to_entity(self, m: Dependencia) -> DependenciaEntidad:
        return DependenciaEntidad(
            id=m.id, nombre=m.nombre, activa=m.activa,
            num_usuarios=getattr(m, 'num_usuarios', 0),
        )

    def _qs(self):
        return Dependencia.objects.annotate(num_usuarios=Count('usuarios'))

    def listar(self, solo_activas: bool = False) -> List[DependenciaEntidad]:
        qs = self._qs()
        if solo_activas:
            qs = qs.filter(activa=True)
        return [self._to_entity(m) for m in qs.order_by('nombre')]

    def obtener(self, dependencia_id: int) -> Optional[DependenciaEntidad]:
        m = self._qs().filter(pk=dependencia_id).first()
        return self._to_entity(m) if m else None

    def obtener_por_nombre(self, nombre: str) -> Optional[DependenciaEntidad]:
        m = self._qs().filter(nombre__iexact=nombre.strip()).first()
        return self._to_entity(m) if m else None

    def guardar(self, dependencia: DependenciaEntidad) -> DependenciaEntidad:
        if dependencia.id:
            Dependencia.objects.filter(pk=dependencia.id).update(nombre=dependencia.nombre, activa=dependencia.activa)
            return self.obtener(dependencia.id)
        m = Dependencia.objects.create(nombre=dependencia.nombre, activa=dependencia.activa)
        return self.obtener(m.id)

    def eliminar(self, dependencia_id: int) -> bool:
        borrados, _ = Dependencia.objects.filter(pk=dependencia_id).delete()
        return borrados > 0
