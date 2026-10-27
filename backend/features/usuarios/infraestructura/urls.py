from django.urls import path
from .views import (
    login_view,
    me_view,
    search_users_view,
    usuarios_collection_view,
    cambiar_rol_view,
    alternar_estado_view,
    importar_usuarios_view,
)

urlpatterns = [
    path('auth/login/', login_view, name='login'),
    path('auth/me/', me_view, name='me'),
    path('usuarios/', usuarios_collection_view, name='usuarios-collection'),
    path('usuarios/buscar/', search_users_view, name='usuarios-buscar'),
    path('usuarios/importar/', importar_usuarios_view, name='usuarios-importar'),
    path('usuarios/<int:pk>/rol/', cambiar_rol_view, name='usuarios-cambiar-rol'),
    path('usuarios/<int:pk>/estado/', alternar_estado_view, name='usuarios-alternar-estado'),
]
