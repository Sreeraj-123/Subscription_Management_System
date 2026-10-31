from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, OpenApiResponse

from config.permissions import IsAdmin, IsOwnerCustomer
from .models import Payment
from .serializers import PaymentSerializer, RecordPaymentSerializer


class PaymentViewSet(viewsets.ModelViewSet):
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['payment_method', 'invoice']
    search_fields = [
        'transaction_id',
        'invoice__invoice_number',
        'invoice__customer__email',
        'invoice__customer__first_name',
        'invoice__customer__last_name',
        'note',
    ]
    ordering_fields = ['payment_date', 'amount', 'created_at']
    ordering = ['-payment_date']

    def get_queryset(self):
        user = self.request.user
        qs = (
            Payment.objects.select_related('invoice__customer', 'invoice__subscription')
            .all()
        )
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'CUSTOMER':
            return qs.filter(invoice__customer=user)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return RecordPaymentSerializer
        return PaymentSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'create']:
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    @extend_schema(
        request=RecordPaymentSerializer,
        responses={201: PaymentSerializer},
        description="Record a payment against an invoice with automatic partial payment and status handling."
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        output_serializer = PaymentSerializer(payment, context={'request': request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
