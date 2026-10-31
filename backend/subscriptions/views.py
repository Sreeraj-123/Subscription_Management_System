from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema, OpenApiResponse

from config.permissions import IsOwnerCustomer, IsAdminOrInternal
from .models import Subscription
from .serializers import (
    SubscriptionSerializer,
    CreateFromTemplateSerializer,
    TransitionStatusSerializer,
)
from .services import transition_subscription_status, create_subscription_from_template

User = get_user_model()


class SubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'customer', 'plan']
    search_fields = [
        'subscription_number',
        'customer__email',
        'customer__first_name',
        'customer__last_name',
    ]
    ordering_fields = ['created_at', 'start_date', 'expiry_date', 'status']

    def get_queryset(self):
        user = self.request.user
        qs = (
            Subscription.objects.select_related('customer', 'plan')
            .prefetch_related('lines__product', 'lines__variant', 'lines__tax')
            .all()
        )
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'CUSTOMER':
            return qs.filter(customer=user)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'create_from_template']:
            return [IsAdminOrInternal()]
        return [IsOwnerCustomer()]

    @extend_schema(
        request=TransitionStatusSerializer,
        responses={200: SubscriptionSerializer},
        description="Transition subscription lifecycle state with plan policy validation."
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrInternal])
    def transition(self, request, pk=None):
        subscription = self.get_object()
        serializer = TransitionStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_status = serializer.validated_data['status']
        updated_sub = transition_subscription_status(subscription, target_status, user=request.user)

        return Response(SubscriptionSerializer(updated_sub).data, status=status.HTTP_200_OK)

    @extend_schema(
        request=CreateFromTemplateSerializer,
        responses={201: SubscriptionSerializer},
        description="Create a complete subscription prefilled from a Quotation Template."
    )
    @action(detail=False, methods=['post'], url_path='create-from-template', permission_classes=[IsAdminOrInternal])
    def create_from_template(self, request):
        serializer = CreateFromTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            customer = User.objects.get(pk=data['customer_id'])
        except User.DoesNotExist:
            return Response({'error': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)

        subscription = create_subscription_from_template(
            customer=customer,
            template_id=data['template_id'],
            start_date=data.get('start_date'),
            notes=data.get('notes', ''),
        )

        return Response(SubscriptionSerializer(subscription).data, status=status.HTTP_201_CREATED)
