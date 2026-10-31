from django.db import models
from django.utils import timezone
from decimal import Decimal


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = (
        ('CARD', 'Credit / Debit Card'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CASH', 'Cash'),
        ('UPI', 'UPI'),
    )

    invoice = models.ForeignKey(
        'billing.Invoice',
        on_delete=models.PROTECT,
        related_name='payments',
        db_index=True,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    payment_method = models.CharField(max_length=30, choices=PAYMENT_METHOD_CHOICES, default='CARD')
    payment_date = models.DateTimeField(default=timezone.now, db_index=True)
    transaction_id = models.CharField(max_length=100, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-payment_date']
        indexes = [
            models.Index(fields=['invoice', 'payment_date']),
        ]

    def __str__(self):
        return f"Payment {self.id} on {self.invoice.invoice_number} (${self.amount})"
