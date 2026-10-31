from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, RunBillingView

app_name = 'billing'

router = DefaultRouter()
router.register(r'invoices', InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('run-billing/', RunBillingView.as_view(), name='run_billing'),
    path('', include(router.urls)),
]
