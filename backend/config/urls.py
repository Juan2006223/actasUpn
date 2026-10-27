from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('features.usuarios.infraestructura.urls')),
    path('api/grupos/', include('features.grupos.infraestructura.urls')),
    path('api/actas/', include('features.actas.infraestructura.urls')),
]
