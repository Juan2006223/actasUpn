from django.urls import path
from .views.reuniones import reuniones_list, reuniones_detail, reuniones_mis
from .views.firma import mi_firma

urlpatterns = [
    path('reuniones/', reuniones_list, name='reuniones-list'),
    path('reuniones/mis/', reuniones_mis, name='reuniones-mis'),
    path('reuniones/<int:pk>/', reuniones_detail, name='reuniones-detail'),
    path('mi-firma/', mi_firma, name='mi-firma'),
]
