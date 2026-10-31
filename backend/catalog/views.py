from decimal import Decimal
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, OpenApiResponse

from config.permissions import IsAdmin, IsAdminOrInternal
from .models import (
    Product,
    Variant,
    Plan,
    Tax,
    Discount,
    QuotationTemplate,
)
from .serializers import (
    ProductSerializer,
    VariantSerializer,
    PlanSerializer,
    TaxSerializer,
    DiscountSerializer,
    QuotationTemplateSerializer,
    CalculateLineRequestSerializer,
)
from .services import calculate_line, get_applicable_discounts


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.prefetch_related('variants').all()
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type', 'is_active']
    search_fields = ['name', 'notes']
    ordering_fields = ['name', 'sales_price', 'created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminOrInternal()]


class VariantViewSet(viewsets.ModelViewSet):
    queryset = Variant.objects.select_related('product').all()
    serializer_class = VariantSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['product', 'attribute_name']
    search_fields = ['attribute_value', 'attribute_name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminOrInternal()]


class PlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['billing_period', 'is_active']
    search_fields = ['name']
    ordering_fields = ['price', 'created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminOrInternal()]


class TaxViewSet(viewsets.ModelViewSet):
    queryset = Tax.objects.all()
    serializer_class = TaxSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]


class DiscountViewSet(viewsets.ModelViewSet):
    queryset = Discount.objects.select_related('product').all()
    serializer_class = DiscountSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['scope', 'type', 'is_active', 'product']
    search_fields = ['code']
    ordering_fields = ['created_at', 'value', 'usage_count']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAdminOrInternal()]
        return [IsAdmin()]


class QuotationTemplateViewSet(viewsets.ModelViewSet):
    queryset = QuotationTemplate.objects.select_related('plan').prefetch_related('lines__product', 'lines__variant').all()
    serializer_class = QuotationTemplateSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['plan']
    search_fields = ['name', 'notes']
    permission_classes = [IsAdminOrInternal]


class CalculateLineView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=CalculateLineRequestSerializer,
        responses={200: OpenApiResponse(description="Pricing breakdown with discount and tax calculated")},
        description="Calculate pricing breakdown for a product line (used by subscriptions and quotations)."
    )
    def post(self, request):
        serializer = CalculateLineRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        result = calculate_line(
            product_id=data['product_id'],
            variant_id=data.get('variant_id'),
            quantity=data.get('quantity', 1),
            tax_id=data.get('tax_id'),
            discount_code=data.get('discount_code'),
        )
        return Response(result, status=status.HTTP_200_OK)


class ApplicableDiscountsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses={200: DiscountSerializer(many=True)},
        description="Returns list of currently active discounts matching scope, quantity, and amount."
    )
    def get(self, request):
        scope = request.query_params.get('scope', 'SUBSCRIPTION')
        product_id = request.query_params.get('product_id')
        amount_raw = request.query_params.get('amount', '0.00')
        quantity_raw = request.query_params.get('quantity', '1')

        try:
            total_amount = Decimal(amount_raw)
            quantity = int(quantity_raw)
        except (ValueError, TypeError):
            total_amount = Decimal('0.00')
            quantity = 1

        discounts = get_applicable_discounts(
            scope=scope,
            product_id=int(product_id) if product_id else None,
            total_amount=total_amount,
            quantity=quantity,
        )
        serializer = DiscountSerializer(discounts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
