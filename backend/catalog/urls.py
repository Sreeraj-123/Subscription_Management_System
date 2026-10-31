from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductViewSet,
    VariantViewSet,
    PlanViewSet,
    TaxViewSet,
    DiscountViewSet,
    QuotationTemplateViewSet,
    CalculateLineView,
    ApplicableDiscountsView,
)

app_name = 'catalog'

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'variants', VariantViewSet, basename='variant')
router.register(r'plans', PlanViewSet, basename='plan')
router.register(r'taxes', TaxViewSet, basename='tax')
router.register(r'discounts', DiscountViewSet, basename='discount')
router.register(r'templates', QuotationTemplateViewSet, basename='template')

urlpatterns = [
    path('calculate-line/', CalculateLineView.as_view(), name='calculate_line'),
    path('applicable-discounts/', ApplicableDiscountsView.as_view(), name='applicable_discounts'),
    path('', include(router.urls)),
]
