from decimal import Decimal
from rest_framework import serializers
from .models import Subscription, SubscriptionLine
from catalog.serializers import ProductSerializer, PlanSerializer
from catalog.services import calculate_line


class SubscriptionLineSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    variant_name = serializers.ReadOnlyField(source='variant.attribute_value')

    class Meta:
        model = SubscriptionLine
        fields = (
            'id',
            'product',
            'product_name',
            'variant',
            'variant_name',
            'quantity',
            'unit_price',
            'tax',
            'amount',
        )
        read_only_fields = ('id', 'amount')


class SubscriptionSerializer(serializers.ModelSerializer):
    lines = SubscriptionLineSerializer(many=True, required=False)
    customer_email = serializers.ReadOnlyField(source='customer.email')
    customer_name = serializers.SerializerMethodField()
    plan_name = serializers.ReadOnlyField(source='plan.name')
    plan_period = serializers.ReadOnlyField(source='plan.billing_period')
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = (
            'id',
            'subscription_number',
            'customer',
            'customer_email',
            'customer_name',
            'plan',
            'plan_name',
            'plan_period',
            'start_date',
            'expiry_date',
            'payment_terms',
            'status',
            'pause_date',
            'notes',
            'lines',
            'total_amount',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'subscription_number', 'status', 'pause_date', 'created_at', 'updated_at')

    def get_customer_name(self, obj):
        full = f"{obj.customer.first_name} {obj.customer.last_name}".strip()
        return full if full else obj.customer.email

    def get_total_amount(self, obj):
        total = sum((line.amount for line in obj.lines.all()), Decimal('0.00'))
        return str(total)

    def create(self, validated_data):
        from .services import generate_subscription_number

        lines_data = validated_data.pop('lines', [])
        validated_data['subscription_number'] = generate_subscription_number()
        validated_data['status'] = 'DRAFT'

        subscription = Subscription.objects.create(**validated_data)

        for line_data in lines_data:
            product = line_data['product']
            variant = line_data.get('variant')
            quantity = line_data.get('quantity', 1)
            tax = line_data.get('tax')

            calc = calculate_line(
                product_id=product.id,
                variant_id=variant.id if variant else None,
                quantity=quantity,
                tax_id=tax.id if tax else None,
            )

            SubscriptionLine.objects.create(
                subscription=subscription,
                product=product,
                variant=variant,
                quantity=quantity,
                unit_price=calc['unit_price'],
                tax=tax,
                amount=calc['subtotal'],
            )

        return subscription


class CreateFromTemplateSerializer(serializers.Serializer):
    customer_id = serializers.IntegerField(required=True)
    template_id = serializers.IntegerField(required=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class TransitionStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=['QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED'],
        required=True
    )

