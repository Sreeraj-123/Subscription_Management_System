from django.db import models
from django.conf import settings
from decimal import Decimal


class Subscription(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('QUOTATION', 'Quotation'),
        ('CONFIRMED', 'Confirmed'),
        ('ACTIVE', 'Active'),
        ('PAUSED', 'Paused'),
        ('CLOSED', 'Closed'),
    )

    subscription_number = models.CharField(max_length=50, unique=True, db_index=True)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='subscriptions',
        db_index=True,
    )
    plan = models.ForeignKey(
        'catalog.Plan',
        on_delete=models.PROTECT,
        related_name='subscriptions',
        db_index=True,
    )
    start_date = models.DateField(db_index=True)
    expiry_date = models.DateField(null=True, blank=True, db_index=True)
    payment_terms = models.CharField(max_length=50, default='IMMEDIATE')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT', db_index=True)
    pause_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['status', 'expiry_date']),
        ]

    def __str__(self):
        return f"{self.subscription_number} - {self.customer} ({self.status})"


class SubscriptionLine(models.Model):
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey('catalog.Product', on_delete=models.PROTECT)
    variant = models.ForeignKey('catalog.Variant', on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax = models.ForeignKey('catalog.Tax', on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    def __str__(self):
        return f"{self.subscription.subscription_number}: {self.product.name} x {self.quantity}"
