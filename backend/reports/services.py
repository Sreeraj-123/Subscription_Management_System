import csv
import io
from decimal import Decimal
from django.db.models import Sum, Count, Case, When, F, DecimalField, Q
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from datetime import timedelta, date

from billing.models import Invoice
from subscriptions.models import Subscription
from payments.models import Payment
from catalog.models import Plan


def get_financial_dashboard_metrics(user, as_of_date=None):
    """
    Computes high-performance database-aggregated metrics for the executive finance dashboard.
    No Python row looping over large tables - all aggregations done natively in database.
    """
    today = as_of_date or timezone.now().date()

    if user.role == 'CUSTOMER':
        # Customer portal dashboard view
        customer_subs = Subscription.objects.filter(customer=user)
        customer_invoices = Invoice.objects.filter(customer=user)
        customer_payments = Payment.objects.filter(invoice__customer=user)

        active_subs_count = customer_subs.filter(status='ACTIVE').count()
        total_spent = customer_payments.aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']

        unpaid_invoices = customer_invoices.exclude(status__in=['PAID', 'CANCELLED'])
        unpaid_count = unpaid_invoices.count()
        invoiced_total = unpaid_invoices.aggregate(total=Coalesce(Sum('total_amount'), Decimal('0.00')))['total']
        paid_on_unpaid = customer_payments.filter(invoice__in=unpaid_invoices).aggregate(
            total=Coalesce(Sum('amount'), Decimal('0.00'))
        )['total']
        outstanding_balance = max(Decimal('0.00'), invoiced_total - paid_on_unpaid)

        recent_payments = (
            customer_payments.select_related('invoice')
            .order_by('-payment_date')[:6]
        )

        open_invoices = (
            unpaid_invoices.select_related('subscription__plan')
            .order_by('due_date')[:6]
        )

        return {
            "role": "CUSTOMER",
            "active_subscriptions_count": active_subs_count,
            "total_spent": float(total_spent),
            "unpaid_invoices_count": unpaid_count,
            "outstanding_balance": float(outstanding_balance),
            "recent_payments": [
                {
                    "id": p.id,
                    "invoice_number": p.invoice.invoice_number,
                    "amount": float(p.amount),
                    "payment_method": p.payment_method,
                    "payment_date": p.payment_date.isoformat(),
                    "transaction_id": p.transaction_id,
                }
                for p in recent_payments
            ],
            "open_invoices": [
                {
                    "id": inv.id,
                    "invoice_number": inv.invoice_number,
                    "due_date": inv.due_date.isoformat(),
                    "total_amount": float(inv.total_amount),
                    "status": inv.status,
                    "is_overdue": inv.due_date < today,
                }
                for inv in open_invoices
            ],
        }

    # Admin & Internal staff dashboard view
    # 1. Subscriptions stats
    active_subs_qs = Subscription.objects.filter(status='ACTIVE')
    active_subs_count = active_subs_qs.count()
    total_subs_count = Subscription.objects.count()

    # 2. MRR (Monthly Recurring Revenue) via native DB Case/When aggregation
    mrr_agg = active_subs_qs.aggregate(
        mrr=Coalesce(
            Sum(
                Case(
                    When(plan__billing_period='MONTHLY', then=F('plan__price')),
                    When(plan__billing_period='YEARLY', then=F('plan__price') / Decimal('12.0')),
                    When(plan__billing_period='WEEKLY', then=F('plan__price') * Decimal('4.3333333333')),
                    When(plan__billing_period='DAILY', then=F('plan__price') * Decimal('30.0')),
                    default=F('plan__price'),
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                )
            ),
            Decimal('0.00'),
        )
    )
    mrr = mrr_agg['mrr']
    arr = mrr * Decimal('12.00')

    # 3. Total revenue collected
    total_revenue = Payment.objects.aggregate(
        total=Coalesce(Sum('amount'), Decimal('0.00'))
    )['total']

    # 4. Total outstanding unpaid invoices
    unpaid_invoices_qs = Invoice.objects.exclude(status__in=['PAID', 'CANCELLED'])
    total_invoiced_unpaid = unpaid_invoices_qs.aggregate(
        total=Coalesce(Sum('total_amount'), Decimal('0.00'))
    )['total']
    paid_towards_unpaid = Payment.objects.filter(invoice__in=unpaid_invoices_qs).aggregate(
        total=Coalesce(Sum('amount'), Decimal('0.00'))
    )['total']
    total_outstanding = max(Decimal('0.00'), total_invoiced_unpaid - paid_towards_unpaid)

    # 5. Overdue invoices
    overdue_qs = Invoice.objects.filter(due_date__lt=today).exclude(status__in=['PAID', 'CANCELLED'])
    overdue_count = overdue_qs.count()
    overdue_amount = overdue_qs.aggregate(
        total=Coalesce(Sum('total_amount'), Decimal('0.00'))
    )['total']

    # 6. Revenue trend by month (Last 6 calendar months)
    six_months_ago = (today.replace(day=1) - timedelta(days=150)).replace(day=1)
    monthly_rev_db = (
        Payment.objects.filter(payment_date__date__gte=six_months_ago)
        .annotate(month=TruncMonth('payment_date'))
        .values('month')
        .annotate(revenue=Sum('amount'), count=Count('id'))
        .order_by('month')
    )

    monthly_rev_map = {
        item['month'].strftime('%Y-%m'): {
            'revenue': float(item['revenue']),
            'count': item['count']
        }
        for item in monthly_rev_db if item['month']
    }

    # Fill calendar continuity for the last 6 months
    revenue_by_month = []
    current_iter = six_months_ago
    while current_iter <= today:
        key = current_iter.strftime('%Y-%m')
        label = current_iter.strftime('%b %Y')
        data = monthly_rev_map.get(key, {'revenue': 0.0, 'count': 0})
        revenue_by_month.append({
            'key': key,
            'label': label,
            'revenue': data['revenue'],
            'count': data['count'],
        })
        # Advance to next month
        next_month = current_iter.month % 12 + 1
        next_year = current_iter.year + (1 if next_month == 1 else 0)
        current_iter = date(next_year, next_month, 1)

    # 7. Recent payments
    recent_payments = (
        Payment.objects.select_related('invoice__customer')
        .order_by('-payment_date')[:6]
    )

    # 8. Top overdue invoices
    top_overdue = (
        overdue_qs.select_related('customer', 'subscription')
        .order_by('due_date')[:6]
    )

    # 9. Plan distribution
    plan_distribution = list(
        Subscription.objects.filter(status='ACTIVE')
        .values(plan_name=F('plan__name'))
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return {
        "role": user.role,
        "mrr": float(mrr),
        "arr": float(arr),
        "active_subscriptions_count": active_subs_count,
        "total_subscriptions_count": total_subs_count,
        "total_revenue_collected": float(total_revenue),
        "total_outstanding": float(total_outstanding),
        "overdue_invoices_count": overdue_count,
        "overdue_amount": float(overdue_amount),
        "revenue_by_month": revenue_by_month,
        "plan_distribution": plan_distribution,
        "recent_payments": [
            {
                "id": p.id,
                "invoice_number": p.invoice.invoice_number,
                "customer_name": f"{p.invoice.customer.first_name} {p.invoice.customer.last_name}".strip() or p.invoice.customer.email,
                "customer_email": p.invoice.customer.email,
                "amount": float(p.amount),
                "payment_method": p.payment_method,
                "payment_date": p.payment_date.isoformat(),
                "transaction_id": p.transaction_id,
            }
            for p in recent_payments
        ],
        "overdue_invoices": [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "customer_name": f"{inv.customer.first_name} {inv.customer.last_name}".strip() or inv.customer.email,
                "customer_email": inv.customer.email,
                "due_date": inv.due_date.isoformat(),
                "total_amount": float(inv.total_amount),
                "days_overdue": (today - inv.due_date).days,
            }
            for inv in top_overdue
        ],
    }


def generate_csv_report(report_type: str, user, start_date=None, end_date=None) -> str:
    """
    Streams CSV rows directly using io.StringIO for optimal throughput.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == 'payments':
        writer.writerow([
            'Payment ID',
            'Invoice Number',
            'Customer Email',
            'Customer Name',
            'Amount ($)',
            'Method',
            'Transaction ID',
            'Payment Date',
            'Notes',
        ])
        qs = Payment.objects.select_related('invoice__customer').order_by('-payment_date')
        if user.role == 'CUSTOMER':
            qs = qs.filter(invoice__customer=user)
        if start_date:
            qs = qs.filter(payment_date__date__gte=start_date)
        if end_date:
            qs = qs.filter(payment_date__date__lte=end_date)

        for p in qs:
            c = p.invoice.customer
            name = f"{c.first_name} {c.last_name}".strip() or c.email
            writer.writerow([
                p.id,
                p.invoice.invoice_number,
                c.email,
                name,
                f"{p.amount:.2f}",
                p.payment_method,
                p.transaction_id,
                p.payment_date.strftime('%Y-%m-%d %H:%M:%S'),
                p.note,
            ])

    elif report_type == 'invoices':
        writer.writerow([
            'Invoice Number',
            'Subscription Number',
            'Customer Email',
            'Customer Name',
            'Issue Date',
            'Due Date',
            'Subtotal ($)',
            'Tax Amount ($)',
            'Discount Amount ($)',
            'Total Amount ($)',
            'Status',
        ])
        qs = Invoice.objects.select_related('subscription', 'customer').order_by('-issue_date')
        if user.role == 'CUSTOMER':
            qs = qs.filter(customer=user)
        if start_date:
            qs = qs.filter(issue_date__gte=start_date)
        if end_date:
            qs = qs.filter(issue_date__lte=end_date)

        for inv in qs:
            c = inv.customer
            name = f"{c.first_name} {c.last_name}".strip() or c.email
            writer.writerow([
                inv.invoice_number,
                inv.subscription.subscription_number if inv.subscription else 'N/A',
                c.email,
                name,
                inv.issue_date.isoformat(),
                inv.due_date.isoformat(),
                f"{inv.subtotal:.2f}",
                f"{inv.tax_amount:.2f}",
                f"{inv.discount_amount:.2f}",
                f"{inv.total_amount:.2f}",
                inv.status,
            ])

    elif report_type == 'subscriptions':
        writer.writerow([
            'Subscription Number',
            'Customer Email',
            'Plan Name',
            'Billing Period',
            'Plan Price ($)',
            'Start Date',
            'Expiry Date',
            'Status',
        ])
        qs = Subscription.objects.select_related('customer', 'plan').order_by('-created_at')
        if user.role == 'CUSTOMER':
            qs = qs.filter(customer=user)
        if start_date:
            qs = qs.filter(start_date__gte=start_date)
        if end_date:
            qs = qs.filter(start_date__lte=end_date)

        for sub in qs:
            writer.writerow([
                sub.subscription_number,
                sub.customer.email,
                sub.plan.name,
                sub.plan.billing_period,
                f"{sub.plan.price:.2f}",
                sub.start_date.isoformat(),
                sub.expiry_date.isoformat() if sub.expiry_date else 'N/A',
                sub.status,
            ])

    else:
        # Default revenue summary by month
        writer.writerow(['Month', 'Transactions Count', 'Revenue Collected ($)'])
        rev_db = (
            Payment.objects.all()
            .annotate(month=TruncMonth('payment_date'))
            .values('month')
            .annotate(revenue=Sum('amount'), count=Count('id'))
            .order_by('-month')
        )
        for row in rev_db:
            if row['month']:
                writer.writerow([
                    row['month'].strftime('%Y-%m'),
                    row['count'],
                    f"{row['revenue']:.2f}",
                ])

    return output.getvalue()
