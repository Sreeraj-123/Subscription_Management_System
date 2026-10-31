from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum
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
    paid_amount = serializers.SerializerMethodField()
    remaining_balance = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

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
            'paid_amount',
            'remaining_balance',
            'is_overdue',
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
            'paid_amount',
            'remaining_balance',
            'is_overdue',
            'created_at',
            'updated_at',
        )

    def get_customer_name(self, obj):
        full = f"{obj.customer.first_name} {obj.customer.last_name}".strip()
        return full if full else obj.customer.email

    def get_paid_amount(self, obj):
        if hasattr(obj, 'annotated_paid_amount'):
            return obj.annotated_paid_amount or Decimal('0.00')
        paid = obj.payments.aggregate(total=Sum('amount'))['total']
        return paid or Decimal('0.00')

    def get_remaining_balance(self, obj):
        paid = self.get_paid_amount(obj)
        remaining = obj.total_amount - paid
        return max(Decimal('0.00'), remaining)

    def get_is_overdue(self, obj):
        return obj.status != 'PAID' and obj.due_date < timezone.now().date()


class RunBillingResponseSerializer(serializers.Serializer):
    generated_count = serializers.IntegerField()
    skipped_count = serializers.IntegerField()
    message = serializers.CharField()


class InvoiceActionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['CONFIRMED', 'CANCELLED', 'PAID'])

