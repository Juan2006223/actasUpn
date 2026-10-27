"""
Reglas transversales de autorización y roles institucionales (MEMORIAN · FOR023GDC).
"""

ROLES_GESTION_GRUPOS = frozenset({'ADMIN', 'SUPERVISOR', 'COORDINADOR', 'TEACHER'})
ROLES_CREACION_ACTAS = frozenset({'ADMIN', 'SUPERVISOR', 'COORDINADOR', 'TEACHER', 'APOYO', 'ASISTENTE'})


def es_superadmin(user) -> bool:
    return bool(
        user
        and getattr(user, 'is_authenticated', False)
        and (getattr(user, 'role', '') == 'ADMIN' or getattr(user, 'is_superuser', False))
    )


def puede_gestionar_grupos(user) -> bool:
    return bool(
        user
        and getattr(user, 'is_authenticated', False)
        and (getattr(user, 'role', '') in ROLES_GESTION_GRUPOS or getattr(user, 'is_superuser', False))
    )


def puede_crear_actas(user) -> bool:
    return bool(
        user
        and getattr(user, 'is_authenticated', False)
        and (getattr(user, 'role', '') in ROLES_CREACION_ACTAS or getattr(user, 'is_superuser', False))
    )
