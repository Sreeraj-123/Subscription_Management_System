from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone
from .models import Product, Variant, Tax, Discount


def get_applicable_discounts(scope='SUBSCRIPTION', product_id=None, total_amount=Decimal('0.00'), quantity=1):
    """
    Returns active, valid discounts that meet date, quantity, purchase minimum, and limit conditions.
    """
    today = timezone.now().date()
    qs = Discount.objects.filter(is_active=True, scope=scope)

    if scope == 'PRODUCT' and product_id:
        qs = qs.filter(product_id=product_id)

    valid_discounts = []
    for discount in qs:
        # Check start and end dates
        if discount.start_date and today < discount.start_date:
            continue
        if discount.end_date and today > discount.end_date:
            continue

        # Check usage limit
        if discount.usage_limit is not None and discount.usage_count >= discount.usage_limit:
            continue

        # Check minimums
        if total_amount < discount.min_purchase:
            continue
        if quantity < discount.min_quantity:
            continue

        valid_discounts.append(discount)

    return valid_discounts


def calculate_line(product_id, variant_id=None, quantity=1, tax_id=None, discount_code=None):
    """
    Computes pricing breakdown for a product line:
    - Base unit price = product.sales_price + variant.extra_price (if variant specified)
    - Subtotal = unit_price * quantity
    - Discount = deducted prior to tax calculation
    - Tax = percentage applied to discounted base
    - Total = subtotal - discount + tax
    All numbers rounded to 2 decimal places using Decimal.
    """
    product = Product.objects.get(pk=product_id)
    unit_price = Decimal(str(product.sales_price))

    if variant_id:
        variant = Variant.objects.get(pk=variant_id, product=product)
        unit_price += Decimal(str(variant.extra_price))

    qty = int(quantity)
    subtotal = (unit_price * Decimal(str(qty))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    # Calculate discount
    discount_amount = Decimal('0.00')
    if discount_code:
        try:
            today = timezone.now().date()
            discount = Discount.objects.get(code__iexact=discount_code.strip(), is_active=True)

            is_date_valid = True
            if discount.start_date and today < discount.start_date:
                is_date_valid = False
            if discount.end_date and today > discount.end_date:
                is_date_valid = False

            has_usage_left = discount.usage_limit is None or discount.usage_count < discount.usage_limit
            meets_minimums = subtotal >= discount.min_purchase and qty >= discount.min_quantity

            if is_date_valid and has_usage_left and meets_minimums:
                if discount.type == 'PERCENTAGE':
                    discount_amount = (subtotal * (Decimal(str(discount.value)) / Decimal('100.00'))).quantize(
                        Decimal('0.01'), rounding=ROUND_HALF_UP
                    )
                else:  # FIXED
                    discount_amount = min(subtotal, Decimal(str(discount.value)).quantize(Decimal('0.01')))
        except Discount.DoesNotExist:
            discount_amount = Decimal('0.00')

    discounted_subtotal = max(Decimal('0.00'), subtotal - discount_amount)

    # Calculate tax
    tax_amount = Decimal('0.00')
    tax_rate = Decimal('0.00')
    if tax_id:
        try:
            tax = Tax.objects.get(pk=tax_id, is_active=True)
            tax_rate = Decimal(str(tax.rate))
            tax_amount = (discounted_subtotal * (tax_rate / Decimal('100.00'))).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
        except Tax.DoesNotExist:
            tax_amount = Decimal('0.00')

    total_amount = (discounted_subtotal + tax_amount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    return {
        'product_id': product.id,
        'product_name': product.name,
        'variant_id': variant_id,
        'quantity': qty,
        'unit_price': unit_price.quantize(Decimal('0.01')),
        'subtotal': subtotal,
        'discount_amount': discount_amount,
        'tax_rate': tax_rate,
        'tax_amount': tax_amount,
        'total_amount': total_amount,
    }
