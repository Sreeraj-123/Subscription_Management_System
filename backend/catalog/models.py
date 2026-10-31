from django.db import models
from decimal import Decimal


class Product(models.Model):
    PRODUCT_TYPE_CHOICES = (
        ('SERVICE', 'Service'),
        ('PHYSICAL', 'Physical Product'),
        ('SOFTWARE', 'Software License'),
    )

    name = models.CharField(max_length=255, db_index=True)
    type = models.CharField(max_length=50, choices=PRODUCT_TYPE_CHOICES, default='SOFTWARE')
    sales_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Variant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    attribute_name = models.CharField(max_length=100)  # e.g., "Brand"
    attribute_value = models.CharField(max_length=100)  # e.g., "Odoo"
    extra_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['product', 'attribute_name', 'attribute_value']
        unique_together = ('product', 'attribute_name', 'attribute_value')

    def __str__(self):
        return f"{self.product.name} - {self.attribute_name}: {self.attribute_value} (+${self.extra_price})"


class Plan(models.Model):
    BILLING_PERIOD_CHOICES = (
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
        ('YEARLY', 'Yearly'),
    )

    name = models.CharField(max_length=150, db_index=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    billing_period = models.CharField(max_length=20, choices=BILLING_PERIOD_CHOICES, default='MONTHLY', db_index=True)
    min_quantity = models.PositiveIntegerField(default=1)
    available_from = models.DateField(null=True, blank=True)
    available_to = models.DateField(null=True, blank=True)

    # Policy flags set by admin
    auto_close = models.BooleanField(default=False, help_text="Auto-close at end date")
    closable_early = models.BooleanField(default=True, help_text="Allow customer/rep to close early")
    pausable = models.BooleanField(default=True, help_text="Allow subscription pause")
    renewable = models.BooleanField(default=True, help_text="Allow subscription renewal")
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['price']

    def __str__(self):
        return f"{self.name} (${self.price}/{self.billing_period.lower()})"


class Tax(models.Model):
    name = models.CharField(max_length=100)  # e.g. "VAT 18%" or "GST 18%"
    rate = models.DecimalField(max_digits=5, decimal_places=2, help_text="Percentage rate, e.g. 18.00")
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Taxes'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.rate}%)"


class Discount(models.Model):
    DISCOUNT_TYPE_CHOICES = (
        ('FIXED', 'Fixed Amount'),
        ('PERCENTAGE', 'Percentage'),
    )
    SCOPE_CHOICES = (
        ('PRODUCT', 'Specific Product'),
        ('SUBSCRIPTION', 'Whole Subscription'),
    )

    code = models.CharField(max_length=50, unique=True, db_index=True)
    type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, default='FIXED')
    value = models.DecimalField(max_digits=12, decimal_places=2)
    min_purchase = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    min_quantity = models.PositiveIntegerField(default=0)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    usage_count = models.PositiveIntegerField(default=0)
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default='SUBSCRIPTION')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='discounts')
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.code} ({self.type}: {self.value})"


class QuotationTemplate(models.Model):
    name = models.CharField(max_length=200)
    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name='quotation_templates')
    validity_days = models.PositiveIntegerField(default=30)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} (Plan: {self.plan.name})"


class QuotationTemplateLine(models.Model):
    template = models.ForeignKey(QuotationTemplate, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    variant = models.ForeignKey(Variant, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.product.name} x {self.quantity} for {self.template.name}"
