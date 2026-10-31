from rest_framework import serializers
from .models import Invoice, InvoiceLine


class InvoiceLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLine
        fields = (
            'id',
            'product',
            'description',
            'quantity',
            'unit_price',
            'tax_amount',
            'total_amount',
        )


class InvoiceSerializer(serializers.ModelSerializer):
    lines = InvoiceLineSerializer(many=True, read_only=True)
    customer_email = serializers.ReadOnlyField(source='customer.email')
    customer_name = serializers.SerializerMethodField()
    subscription_number = serializers.ReadOnlyField(source='subscription.subscription_number')
    plan_name = serializers.ReadOnlyField(source='subscription.plan.name')

    class Meta:
        model = Invoice
        fields = (
            'id',
            'invoice_number',
            'subscription',
            'subscription_number',
            'plan_name',
            'customer',
            'customer_email',
            'customer_name',
            'period_start',
            'period_end',
            'issue_date',
            'due_date',
            'subtotal',
            'tax_amount',
            'discount_amount',
            'total_amount',
            'status',
            'notes',
            'lines',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'invoice_number',
            'subtotal',
            'tax_amount',
            'discount_amount',
            'total_amount',
            'created_at',
            'updated_at',
        )

    def get_customer_name(self, obj):
        full = f"{obj.customer.first_name} {obj.customer.last_name}".strip()
        return full if full else obj.customer.email


class RunBillingResponseSerializer(serializers.Serializer):
    generated_count = serializers.IntegerField()
    skipped_count = serializers.IntegerField()
    message = serializers.CharField()


class InvoiceActionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['CONFIRMED', 'CANCELLED', 'PAID'])

