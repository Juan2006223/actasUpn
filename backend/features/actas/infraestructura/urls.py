from django.urls import path
from .views.reuniones import (
    reuniones_list, reuniones_detail, reuniones_mis, reuniones_firmar, reuniones_observaciones, reuniones_estado,
)
from .views.firma import mi_firma

urlpatterns = [
    path('reuniones/', reuniones_list, name='reuniones-list'),
    path('reuniones/mis/', reuniones_mis, name='reuniones-mis'),
    path('reuniones/<int:pk>/', reuniones_detail, name='reuniones-detail'),
    path('reuniones/<int:pk>/firmar/', reuniones_firmar, name='reuniones-firmar'),
    path('reuniones/<int:pk>/observaciones/', reuniones_observaciones, name='reuniones-observaciones'),
    path('reuniones/<int:pk>/estado/', reuniones_estado, name='reuniones-estado'),
    path('mi-firma/', mi_firma, name='mi-firma'),
]
