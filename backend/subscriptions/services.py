from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from rest_framework.exceptions import ValidationError
from .models import Subscription, SubscriptionLine
from catalog.models import QuotationTemplate, Plan
from catalog.services import calculate_line


def generate_subscription_number():
    """Generates next unique sequential subscription number: SUB-000123"""
    last_sub = Subscription.objects.order_by('-id').first()
    next_id = (last_sub.id + 1) if last_sub else 1
    return f"SUB-{next_id:06d}"


def create_subscription_from_template(customer, template_id, start_date=None, notes=''):
    """Creates a complete subscription initialized from a QuotationTemplate."""
    template = QuotationTemplate.objects.select_related('plan').prefetch_related('lines__product', 'lines__variant').get(pk=template_id)
    plan = template.plan

    start = start_date or timezone.now().date()
    # Expiry based on validity or period
    expiry = start + timezone.timedelta(days=template.validity_days)

    with transaction.atomic():
        sub = Subscription.objects.create(
            subscription_number=generate_subscription_number(),
            customer=customer,
            plan=plan,
            start_date=start,
            expiry_date=expiry,
            status='DRAFT',
            notes=notes or f"Created from template: {template.name}",
        )

        for line in template.lines.all():
            calc = calculate_line(
                product_id=line.product_id,
                variant_id=line.variant_id,
                quantity=line.quantity,
            )
            SubscriptionLine.objects.create(
                subscription=sub,
                product=line.product,
                variant=line.variant,
                quantity=line.quantity,
                unit_price=calc['unit_price'],
                amount=calc['subtotal'],
            )

        return sub


ALLOWED_TRANSITIONS = {
    'DRAFT': ['QUOTATION', 'CONFIRMED', 'CLOSED'],
    'QUOTATION': ['CONFIRMED', 'DRAFT', 'CLOSED'],
    'CONFIRMED': ['ACTIVE', 'CLOSED'],
    'ACTIVE': ['PAUSED', 'CLOSED'],
    'PAUSED': ['ACTIVE', 'CLOSED'],
    'CLOSED': ['ACTIVE'],  # Renewal creates new or reactivates if plan allows
}


def transition_subscription_status(subscription, target_status, user=None):
    """
    Enforces subscription lifecycle state machine and plan policy rules.
    Allowed: DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED (with PAUSED).
    """
    current_status = subscription.status
    plan = subscription.plan

    if target_status == current_status:
        return subscription

    allowed_targets = ALLOWED_TRANSITIONS.get(current_status, [])
    if target_status not in allowed_targets:
        raise ValidationError(
            f"Cannot transition subscription from {current_status} to {target_status}. Allowed: {allowed_targets}"
        )

    # Policy checks based on Plan flags
    if target_status == 'PAUSED':
        if not plan.pausable:
            raise ValidationError(f"Plan '{plan.name}' does not allow pausing subscriptions.")
        subscription.pause_date = timezone.now().date()

    elif target_status == 'CLOSED' and current_status == 'ACTIVE':
        today = timezone.now().date()
        is_at_end = subscription.expiry_date and today >= subscription.expiry_date
        if not is_at_end and not plan.closable_early:
            raise ValidationError(f"Plan '{plan.name}' cannot be closed before its contract expiry date.")

    elif target_status == 'ACTIVE' and current_status == 'CLOSED':
        if not plan.renewable:
            raise ValidationError(f"Plan '{plan.name}' does not support renewal.")
        # Extend expiry date by plan period
        today = timezone.now().date()
        if plan.billing_period == 'YEARLY':
            subscription.expiry_date = today + timezone.timedelta(days=365)
        elif plan.billing_period == 'MONTHLY':
            subscription.expiry_date = today + timezone.timedelta(days=30)
        elif plan.billing_period == 'WEEKLY':
            subscription.expiry_date = today + timezone.timedelta(days=7)
        else:
            subscription.expiry_date = today + timezone.timedelta(days=1)
        subscription.start_date = today

    elif target_status == 'ACTIVE' and current_status == 'PAUSED':
        subscription.pause_date = None

    subscription.status = target_status
    subscription.save()
    return subscription

