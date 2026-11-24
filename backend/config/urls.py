from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include


def health_view(_request):
    return JsonResponse({'status': 'ok', 'service': 'memorian-actas-upn'})


urlpatterns = [
    path('', health_view, name='root-health'),
    path('api/health/', health_view, name='api-health'),
    path('admin/', admin.site.urls),
    path('api/', include('features.usuarios.infraestructura.urls')),
    path('api/grupos/', include('features.grupos.infraestructura.urls')),
    path('api/actas/', include('features.actas.infraestructura.urls')),
    path('api/grabaciones/', include('features.transcripcion.infraestructura.urls')),
]
