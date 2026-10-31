from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubscriptionViewSet

app_name = 'subscriptions'

router = DefaultRouter()
router.register(r'', SubscriptionViewSet, basename='subscription')

urlpatterns = [
    path('', include(router.urls)),
]
