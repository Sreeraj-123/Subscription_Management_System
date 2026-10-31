import io
from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone
from django.db import transaction, IntegrityError
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.exceptions import ValidationError

from .models import Invoice, InvoiceLine
from subscriptions.models import Subscription
from catalog.models import Discount, Tax
from catalog.services import calculate_line, get_applicable_discounts

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors


def generate_invoice_number():
    """Generates sequential unique invoice number: INV-2026-000123"""
    year = timezone.now().year
    last_inv = Invoice.objects.order_by('-id').first()
    next_id = (last_inv.id + 1) if last_inv else 1
    return f"INV-{year}-{next_id:06d}"


def calculate_next_period(subscription, as_of_date=None):
    """Calculates billing period start and end for a subscription."""
    ref_date = as_of_date or timezone.now().date()
    last_invoice = Invoice.objects.filter(subscription=subscription).order_by('-period_end').first()

    if last_invoice:
        period_start = last_invoice.period_end + timezone.timedelta(days=1)
    else:
        period_start = subscription.start_date

    plan = subscription.plan
    if plan.billing_period == 'YEARLY':
        period_end = period_start + timezone.timedelta(days=365)
    elif plan.billing_period == 'MONTHLY':
        period_end = period_start + timezone.timedelta(days=30)
    elif plan.billing_period == 'WEEKLY':
        period_end = period_start + timezone.timedelta(days=7)
    else:  # DAILY
        period_end = period_start + timezone.timedelta(days=1)

    return period_start, period_end


def is_subscription_due(subscription, as_of_date=None):
    """Checks if subscription has an unbilled period due on or before as_of_date."""
    today = as_of_date or timezone.now().date()
    last_invoice = Invoice.objects.filter(subscription=subscription).order_by('-period_end').first()
    if last_invoice and last_invoice.period_end >= today:
        return False
    return True


def generate_invoices_for_due_subscriptions(as_of_date=None):
    """
    IDEMPOTENT bulk billing engine:
    - Scans ACTIVE subscriptions that are due.
    - Locks row using select_for_update(skip_locked=True) inside transaction.atomic.
    - Enforces UniqueConstraint(subscription, period_start, period_end).
    - Prefills customer details, product lines, taxes, and applies active discounts.
    - Increments discount usage counts.
    Returns: { "generated_count", "invoices", "skipped_count" }
    """
    today = as_of_date or timezone.now().date()
    generated_invoices = []
    skipped_count = 0

    with transaction.atomic():
        # Lock active subscriptions to prevent concurrent double-billing
        due_subscriptions = (
            Subscription.objects.select_for_update(skip_locked=True)
            .filter(status='ACTIVE')
            .select_related('customer', 'plan')
            .prefetch_related('lines__product', 'lines__variant', 'lines__tax')
        )

        for sub in due_subscriptions:
            if not is_subscription_due(sub, as_of_date=today):
                skipped_count += 1
                continue

            period_start, period_end = calculate_next_period(sub, as_of_date=today)

            # Idempotency check: don't generate if invoice already exists for this exact period
            if Invoice.objects.filter(subscription=sub, period_start=period_start, period_end=period_end).exists():
                skipped_count += 1
                continue

            try:
                invoice = Invoice.objects.create(
                    invoice_number=generate_invoice_number(),
                    subscription=sub,
                    customer=sub.customer,
                    period_start=period_start,
                    period_end=period_end,
                    issue_date=today,
                    due_date=today + timezone.timedelta(days=15),
                    status='DRAFT',
                    subtotal=Decimal('0.00'),
                    tax_amount=Decimal('0.00'),
                    discount_amount=Decimal('0.00'),
                    total_amount=Decimal('0.00'),
                )

                subtotal = Decimal('0.00')
                total_tax = Decimal('0.00')

                # Create lines
                for sub_line in sub.lines.all():
                    calc = calculate_line(
                        product_id=sub_line.product_id,
                        variant_id=sub_line.variant_id,
                        quantity=sub_line.quantity,
                        tax_id=sub_line.tax_id,
                    )

                    line_subtotal = calc['subtotal']
                    line_tax = calc['tax_amount']
                    line_total = line_subtotal + line_tax

                    desc = f"{sub_line.product.name}"
                    if sub_line.variant:
                        desc += f" ({sub_line.variant.attribute_name}: {sub_line.variant.attribute_value})"

                    InvoiceLine.objects.create(
                        invoice=invoice,
                        product=sub_line.product,
                        description=desc,
                        quantity=sub_line.quantity,
                        unit_price=calc['unit_price'],
                        tax_amount=line_tax,
                        total_amount=line_total,
                    )

                    subtotal += line_subtotal
                    total_tax += line_tax

                # Auto-apply applicable subscription discounts
                applicable_discounts = get_applicable_discounts(
                    scope='SUBSCRIPTION',
                    total_amount=subtotal,
                    quantity=sum(l.quantity for l in sub.lines.all())
                )

                discount_amount = Decimal('0.00')
                if applicable_discounts:
                    chosen_discount = applicable_discounts[0]
                    if chosen_discount.type == 'PERCENTAGE':
                        discount_amount = (subtotal * (chosen_discount.value / Decimal('100.00'))).quantize(
                            Decimal('0.01'), rounding=ROUND_HALF_UP
                        )
                    else:
                        discount_amount = min(subtotal, chosen_discount.value)

                    # Increment usage count
                    chosen_discount.usage_count += 1
                    chosen_discount.save(update_fields=['usage_count'])

                final_total = max(Decimal('0.00'), subtotal - discount_amount + total_tax)

                invoice.subtotal = subtotal
                invoice.tax_amount = total_tax
                invoice.discount_amount = discount_amount
                invoice.total_amount = final_total
                invoice.save()

                generated_invoices.append(invoice)

            except IntegrityError:
                # Caught duplicate period constraint safely
                skipped_count += 1

    return {
        'generated_count': len(generated_invoices),
        'invoices': generated_invoices,
        'skipped_count': skipped_count,
    }


def transition_invoice_status(invoice, new_status):
    """Invoice status workflow: DRAFT -> CONFIRMED -> PAID (CANCELLED)."""
    valid_transitions = {
        'DRAFT': ['CONFIRMED', 'CANCELLED'],
        'CONFIRMED': ['PAID', 'CANCELLED'],
        'PAID': [],
        'CANCELLED': ['DRAFT'],
    }

    if new_status == invoice.status:
        return invoice

    if new_status not in valid_transitions.get(invoice.status, []):
        raise ValidationError(f"Cannot transition invoice from {invoice.status} to {new_status}.")

    invoice.status = new_status
    invoice.save(update_fields=['status'])
    return invoice


def send_invoice_email(invoice):
    """Dispatches invoice notification email with details to customer."""
    subject = f"Brightloop Invoice {invoice.invoice_number} is ready"
    body = (
        f"Hello {invoice.customer.first_name or invoice.customer.email},\n\n"
        f"Your invoice {invoice.invoice_number} for the period "
        f"{invoice.period_start} to {invoice.period_end} is now available.\n\n"
        f"Amount Due: ${invoice.total_amount}\n"
        f"Due Date: {invoice.due_date}\n"
        f"Status: {invoice.status}\n\n"
        f"Thank you for your business,\nBrightloop Team"
    )
    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[invoice.customer.email],
        fail_silently=False,
    )
    return True


def render_invoice_pdf(invoice):
    """Generates standard PDF binary buffer for the invoice using ReportLab."""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    p.setFont("Helvetica-Bold", 18)

    # Header
    p.drawString(50, 750, "BRIGHTLOOP SOFTWARE")
    p.setFont("Helvetica", 10)
    p.setFillColor(colors.HexColor('#6B7280'))
    p.drawString(50, 735, "Subscription Management & Invoicing")

    # Invoice Details
    p.setFont("Helvetica-Bold", 14)
    p.setFillColor(colors.HexColor('#111827'))
    p.drawRightString(550, 750, f"INVOICE: {invoice.invoice_number}")
    p.setFont("Helvetica", 9)
    p.drawRightString(550, 735, f"Status: {invoice.status}")
    p.drawRightString(550, 720, f"Date: {invoice.issue_date} | Due: {invoice.due_date}")

    # Customer info
    p.line(50, 705, 550, 705)
    p.drawString(50, 690, f"Billed To: {invoice.customer.email}")
    p.drawString(50, 675, f"Subscription: {invoice.subscription.subscription_number} ({invoice.subscription.plan.name})")
    p.drawString(50, 660, f"Billing Period: {invoice.period_start} to {invoice.period_end}")

    # Lines table header
    p.setFillColor(colors.HexColor('#F3F4F6'))
    p.rect(50, 620, 500, 20, fill=1, stroke=0)
    p.setFillColor(colors.HexColor('#111827'))
    p.setFont("Helvetica-Bold", 9)
    p.drawString(60, 626, "DESCRIPTION")
    p.drawString(320, 626, "QTY")
    p.drawString(380, 626, "UNIT PRICE")
    p.drawRightString(540, 626, "TOTAL")

    # Lines
    y = 600
    p.setFont("Helvetica", 9)
    for line in invoice.lines.all():
        p.drawString(60, y, line.description[:45])
        p.drawString(325, y, str(line.quantity))
        p.drawString(385, y, f"${line.unit_price}")
        p.drawRightString(540, y, f"${line.total_amount}")
        y -= 20
        if y < 150:
            p.showPage()
            y = 700

    # Summary Totals
    y -= 10
    p.line(350, y, 550, y)
    y -= 20
    p.drawString(380, y, "Subtotal:")
    p.drawRightString(540, y, f"${invoice.subtotal}")

    if invoice.discount_amount > Decimal('0.00'):
        y -= 15
        p.drawString(380, y, "Discount:")
        p.drawRightString(540, y, f"-${invoice.discount_amount}")

    if invoice.tax_amount > Decimal('0.00'):
        y -= 15
        p.drawString(380, y, "Taxes:")
        p.drawRightString(540, y, f"+${invoice.tax_amount}")

    y -= 20
    p.setFont("Helvetica-Bold", 12)
    p.drawString(380, y, "Total Due:")
    p.drawRightString(540, y, f"${invoice.total_amount}")

    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer.getvalue()
