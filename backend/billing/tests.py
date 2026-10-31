from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone

from subscriptions.models import Subscription, SubscriptionLine
from catalog.models import Product, Plan, Tax, Discount
from billing.models import Invoice
from billing.services import (
    generate_invoices_for_due_subscriptions,
    render_invoice_pdf,
    transition_invoice_status,
)

User = get_user_model()


class BillingEngineTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            email='admin@brightloop.io',
            password='Admin@Password123'
        )
        self.customer = User.objects.create_user(
            email='customer@example.com',
            password='Customer@Password123',
            role='CUSTOMER'
        )

        self.plan = Plan.objects.create(
            name='Standard Plan',
            price=Decimal('50.00'),
            billing_period='MONTHLY',
        )
        self.product = Product.objects.create(
            name='Cloud License',
            type='SOFTWARE',
            sales_price=Decimal('100.00'),
        )
        self.tax_10 = Tax.objects.create(name='VAT 10%', rate=Decimal('10.00'))

        # Create active subscription with 1 line
        self.subscription = Subscription.objects.create(
            subscription_number='SUB-000001',
            customer=self.customer,
            plan=self.plan,
            start_date=timezone.now().date(),
            status='ACTIVE',
        )
        SubscriptionLine.objects.create(
            subscription=self.subscription,
            product=self.product,
            quantity=1,
            unit_price=Decimal('100.00'),
            tax=self.tax_10,
            amount=Decimal('100.00'),
        )

    def test_idempotent_billing_generation(self):
        # 1. First billing run: creates invoice
        result1 = generate_invoices_for_due_subscriptions()
        self.assertEqual(result1['generated_count'], 1)
        self.assertEqual(result1['skipped_count'], 0)

        invoice = Invoice.objects.first()
        self.assertIsNotNone(invoice)
        self.assertEqual(invoice.status, 'DRAFT')
        # Subtotal 100 + 10% tax = 110.00
        self.assertEqual(invoice.subtotal, Decimal('100.00'))
        self.assertEqual(invoice.tax_amount, Decimal('10.00'))
        self.assertEqual(invoice.total_amount, Decimal('110.00'))

        # 2. Second billing run for the same period: IDEMPOTENT (generates 0, skips 1)
        result2 = generate_invoices_for_due_subscriptions()
        self.assertEqual(result2['generated_count'], 0)
        self.assertEqual(result2['skipped_count'], 1)
        self.assertEqual(Invoice.objects.count(), 1)

    def test_discount_auto_application_and_usage_count(self):
        discount = Discount.objects.create(
            code='SAVE20',
            type='FIXED',
            value=Decimal('20.00'),
            scope='SUBSCRIPTION',
            usage_limit=5,
            usage_count=0,
            is_active=True,
        )

        result = generate_invoices_for_due_subscriptions()
        self.assertEqual(result['generated_count'], 1)

        inv = result['invoices'][0]
        # Subtotal: 100, Discount: 20 => Taxable: 80, Tax 10%: 8 => Total: 88
        self.assertEqual(inv.discount_amount, Decimal('20.00'))

        discount.refresh_from_db()
        self.assertEqual(discount.usage_count, 1)

    def test_invoice_status_workflow(self):
        result = generate_invoices_for_due_subscriptions()
        inv = result['invoices'][0]
        self.assertEqual(inv.status, 'DRAFT')

        # DRAFT -> CONFIRMED
        inv = transition_invoice_status(inv, 'CONFIRMED')
        self.assertEqual(inv.status, 'CONFIRMED')

        # CONFIRMED -> PAID
        inv = transition_invoice_status(inv, 'PAID')
        self.assertEqual(inv.status, 'PAID')

    def test_invoice_pdf_rendering(self):
        result = generate_invoices_for_due_subscriptions()
        inv = result['invoices'][0]

        pdf_bytes = render_invoice_pdf(inv)
        self.assertTrue(pdf_bytes.startswith(b'%PDF-'))
        self.assertGreater(len(pdf_bytes), 500)
