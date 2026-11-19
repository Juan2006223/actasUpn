"""
Reglas transversales de autorización (MEMORIAN · FOR023GDC).

Roles de la plataforma (distintos del cargo institucional de cada persona):
- ADMIN: superadministrador, gestiona usuarios y dependencias y ve todas las actas.
- REVISOR: revisa y corrige las actas de su dependencia.
- REDACTOR: crea actas; en las actas de otros solo firma y deja observaciones.
"""

ADMIN = 'ADMIN'
REVISOR = 'REVISOR'
REDACTOR = 'REDACTOR'
ROLES_PLATAFORMA = (ADMIN, REVISOR, REDACTOR)


def _autenticado(user) -> bool:
    return bool(user and getattr(user, 'is_authenticated', False))


def es_superadmin(user) -> bool:
    return _autenticado(user) and (getattr(user, 'role', '') == ADMIN or getattr(user, 'is_superuser', False))


def es_revisor(user) -> bool:
    return _autenticado(user) and getattr(user, 'role', '') == REVISOR


def puede_gestionar_grupos(user) -> bool:
    """Cualquier persona con rol en la plataforma puede armar grupos para convocar a sus reuniones."""
    return _autenticado(user) and (getattr(user, 'role', '') in ROLES_PLATAFORMA or getattr(user, 'is_superuser', False))


def puede_crear_actas(user) -> bool:
    return puede_gestionar_grupos(user)
