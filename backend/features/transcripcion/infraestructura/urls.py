from django.urls import path

from . import views

urlpatterns = [
    path('', views.crear, name='grabaciones-crear'),
    path('config/', views.configuracion, name='grabaciones-config'),
    path('<int:pk>/', views.detalle, name='grabaciones-detalle'),
    path('<int:pk>/contenido/', views.contenido, name='grabaciones-contenido'),
    path('<int:pk>/redactar/', views.redactar, name='grabaciones-redactar'),
]
