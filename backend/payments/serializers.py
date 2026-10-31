from decimal import Decimal
from rest_framework import serializers
from django.utils import timezone
from .models import Payment
from .services import record_payment
from billing.models import Invoice


class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.ReadOnlyField(source='invoice.invoice_number')
    subscription_number = serializers.ReadOnlyField(source='invoice.subscription.subscription_number')
    customer_id = serializers.ReadOnlyField(source='invoice.customer.id')
    customer_email = serializers.ReadOnlyField(source='invoice.customer.email')
    customer_name = serializers.SerializerMethodField()
    invoice_total = serializers.ReadOnlyField(source='invoice.total_amount')

    class Meta:
        model = Payment
        fields = (
            'id',
            'invoice',
            'invoice_number',
            'subscription_number',
            'customer_id',
            'customer_email',
            'customer_name',
            'invoice_total',
            'amount',
            'payment_method',
            'payment_date',
            'transaction_id',
            'note',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'created_at',
            'updated_at',
        )

    def get_customer_name(self, obj):
        customer = obj.invoice.customer
        if customer.first_name:
            return f"{customer.first_name} {customer.last_name or ''}".strip()
        return customer.email


class RecordPaymentSerializer(serializers.Serializer):
    invoice = serializers.PrimaryKeyRelatedField(queryset=Invoice.objects.all())
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    payment_method = serializers.ChoiceField(choices=Payment.PAYMENT_METHOD_CHOICES, default='CARD')
    payment_date = serializers.DateTimeField(required=False, default=timezone.now)
    transaction_id = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    note = serializers.CharField(required=False, allow_blank=True, default='')

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user if request else None

        # Check customer permissions: if CUSTOMER, can only pay their own invoice
        if user and user.role == 'CUSTOMER':
            if validated_data['invoice'].customer != user:
                raise serializers.ValidationError({"invoice": "You do not have permission to pay for this invoice."})

        return record_payment(
            invoice=validated_data['invoice'],
            amount=validated_data['amount'],
            payment_method=validated_data.get('payment_method', 'CARD'),
            transaction_id=validated_data.get('transaction_id', ''),
            note=validated_data.get('note', ''),
            payment_date=validated_data.get('payment_date'),
            recorded_by=user,
        )
