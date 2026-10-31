from decimal import Decimal
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, OpenApiResponse

from config.permissions import IsOwnerCustomer, IsAdmin, IsAdminOrInternal
from .models import Invoice
from .serializers import (
    InvoiceSerializer,
    InvoiceActionSerializer,
    RunBillingResponseSerializer,
)
from .services import (
    generate_invoices_for_due_subscriptions,
    transition_invoice_status,
    send_invoice_email,
    render_invoice_pdf,
)


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'customer', 'subscription']
    search_fields = [
        'invoice_number',
        'customer__email',
        'customer__first_name',
        'customer__last_name',
        'subscription__subscription_number',
    ]
    ordering_fields = ['issue_date', 'due_date', 'total_amount', 'created_at']

    def get_queryset(self):
        user = self.request.user
        qs = (
            Invoice.objects.select_related('subscription__plan', 'customer')
            .prefetch_related('lines__product')
            .annotate(annotated_paid_amount=Coalesce(Sum('payments__amount'), Decimal('0.00')))
            .all()
        )
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'CUSTOMER':
            return qs.filter(customer=user)
        return qs

    def get_permissions(self):
        return [IsOwnerCustomer()]

    @extend_schema(
        request=InvoiceActionSerializer,
        responses={200: InvoiceSerializer},
        description="Transition invoice lifecycle status: DRAFT -> CONFIRMED -> PAID (CANCELLED)."
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrInternal])
    def transition(self, request, pk=None):
        invoice = self.get_object()
        serializer = InvoiceActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        updated_inv = transition_invoice_status(invoice, new_status)
        return Response(InvoiceSerializer(updated_inv).data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={200: OpenApiResponse(description="Email sent confirmation")},
        description="Dispatches invoice notification email with PDF details to customer."
    )
    @action(detail=True, methods=['post'], url_path='send-email', permission_classes=[IsAdminOrInternal])
    def send_email(self, request, pk=None):
        invoice = self.get_object()
        send_invoice_email(invoice)
        return Response({'message': f'Invoice {invoice.invoice_number} sent to {invoice.customer.email}.'})

    @extend_schema(
        responses={200: OpenApiResponse(description="Binary PDF stream")},
        description="Renders and downloads official invoice PDF."
    )
    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        pdf_bytes = render_invoice_pdf(invoice)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
        return response


class RunBillingView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        responses={200: RunBillingResponseSerializer},
        description="Admin trigger for idempotent bulk billing run across all active due subscriptions."
    )
    def post(self, request):
        result = generate_invoices_for_due_subscriptions()
        return Response(
            {
                'generated_count': result['generated_count'],
                'skipped_count': result['skipped_count'],
                'message': (
                    f"Generated {result['generated_count']} new invoices; "
                    f"skipped {result['skipped_count']} duplicate periods."
                ),
            },
            status=status.HTTP_200_OK,
        )
