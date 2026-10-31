from rest_framework import serializers
from .models import (
    Product,
    Variant,
    Plan,
    Tax,
    Discount,
    QuotationTemplate,
    QuotationTemplateLine,
)


class VariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Variant
        fields = (
            'id',
            'product',
            'attribute_name',
            'attribute_value',
            'extra_price',
            'created_at',
        )
        read_only_fields = ('id', 'created_at')


class ProductSerializer(serializers.ModelSerializer):
    variants = VariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'type',
            'sales_price',
            'cost_price',
            'notes',
            'is_active',
            'variants',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = (
            'id',
            'name',
            'price',
            'billing_period',
            'min_quantity',
            'available_from',
            'available_to',
            'auto_close',
            'closable_early',
            'pausable',
            'renewable',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class TaxSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tax
        fields = ('id', 'name', 'rate', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')


class DiscountSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')

    class Meta:
        model = Discount
        fields = (
            'id',
            'code',
            'type',
            'value',
            'min_purchase',
            'min_quantity',
            'start_date',
            'end_date',
            'usage_limit',
            'usage_count',
            'scope',
            'product',
            'product_name',
            'is_active',
            'created_at',
        )
        read_only_fields = ('id', 'usage_count', 'created_at')

    def validate_code(self, value):
        return value.strip().upper()


class QuotationTemplateLineSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    variant_name = serializers.ReadOnlyField(source='variant.attribute_value')

    class Meta:
        model = QuotationTemplateLine
        fields = ('id', 'product', 'product_name', 'variant', 'variant_name', 'quantity')


class QuotationTemplateSerializer(serializers.ModelSerializer):
    plan_name = serializers.ReadOnlyField(source='plan.name')
    lines = QuotationTemplateLineSerializer(many=True, read_only=True)

    class Meta:
        model = QuotationTemplate
        fields = (
            'id',
            'name',
            'plan',
            'plan_name',
            'validity_days',
            'notes',
            'lines',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class CalculateLineRequestSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=True)
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(required=False, default=1, min_value=1)
    tax_id = serializers.IntegerField(required=False, allow_null=True)
    discount_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
