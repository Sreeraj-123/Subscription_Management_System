from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from billing.models import Invoice
from .models import Payment


def get_invoice_paid_amount(invoice: Invoice) -> Decimal:
    """Returns the total amount already paid towards the invoice."""
    result = invoice.payments.aggregate(total=models_sum())
    return result or Decimal('0.00')


def models_sum():
    from django.db.models import Sum
    return Sum('amount')


def record_payment(
    invoice: Invoice,
    amount: Decimal,
    payment_method: str = 'CARD',
    transaction_id: str = '',
    note: str = '',
    payment_date=None,
    recorded_by=None
) -> Payment:
    """
    Records a payment against an invoice inside an atomic transaction.
    - Validates amount > 0
    - Validates invoice is not CANCELLED
    - Computes remaining balance and prevents overpayment
    - Updates invoice status to PAID if fully settled
    - Moves DRAFT invoice to CONFIRMED or PAID
    """
    if amount <= Decimal('0.00'):
        raise ValidationError({"amount": "Payment amount must be greater than zero."})

    valid_methods = [choice[0] for choice in Payment.PAYMENT_METHOD_CHOICES]
    if payment_method not in valid_methods:
        raise ValidationError({"payment_method": f"Invalid payment method. Choices are: {valid_methods}."})

    with transaction.atomic():
        # Lock the invoice to prevent concurrent payments race conditions
        locked_invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)

        if locked_invoice.status == 'CANCELLED':
            raise ValidationError({"invoice": "Cannot record payment for a cancelled invoice."})

        # Calculate current total paid
        existing_paid = locked_invoice.payments.aggregate(total=models_sum())['total'] or Decimal('0.00')
        remaining = locked_invoice.total_amount - existing_paid

        if remaining <= Decimal('0.00') and locked_invoice.status == 'PAID':
            raise ValidationError({"invoice": "This invoice is already fully paid."})

        if amount > remaining:
            raise ValidationError({
                "amount": f"Payment amount (${amount:.2f}) exceeds invoice remaining balance (${remaining:.2f})."
            })

        payment = Payment.objects.create(
            invoice=locked_invoice,
            amount=amount,
            payment_method=payment_method,
            payment_date=payment_date or timezone.now(),
            transaction_id=transaction_id or '',
            note=note or '',
        )

        new_total_paid = existing_paid + amount
        if new_total_paid >= locked_invoice.total_amount:
            locked_invoice.status = 'PAID'
            locked_invoice.save(update_fields=['status', 'updated_at'])
        elif locked_invoice.status == 'DRAFT':
            locked_invoice.status = 'CONFIRMED'
            locked_invoice.save(update_fields=['status', 'updated_at'])

        return payment
