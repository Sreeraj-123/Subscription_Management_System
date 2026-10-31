from django.urls import path
from .views import DashboardView, ExportCSVView

app_name = 'reports'

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('export-csv/', ExportCSVView.as_view(), name='export-csv'),
]
