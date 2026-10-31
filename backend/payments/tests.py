from decimal import Decimal
from datetime import date
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.exceptions import ValidationError

from catalog.models import Product, Plan
from subscriptions.models import Subscription, SubscriptionLine
from billing.models import Invoice, InvoiceLine
from payments.models import Payment
from payments.services import record_payment

User = get_user_model()


class PaymentServiceAndAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create_superuser(
            email='admin@brightloop.io',
            password='Password@123',
            role='ADMIN'
        )

        # Customer users
        self.customer1 = User.objects.create_user(
            email='cust1@example.com',
            password='Password@123',
            role='CUSTOMER',
            first_name='Alice',
            last_name='Smith'
        )
        self.customer2 = User.objects.create_user(
            email='cust2@example.com',
            password='Password@123',
            role='CUSTOMER',
            first_name='Bob',
            last_name='Jones'
        )

        # Product & Plan
        self.plan = Plan.objects.create(
            name='Test Pro Plan',
            price=Decimal('100.00'),
            billing_period='MONTHLY',
        )
        self.product = Product.objects.create(
            name='Cloud SaaS',
            sales_price=Decimal('100.00'),
            cost_price=Decimal('20.00'),
        )

        # Subscription
        self.sub = Subscription.objects.create(
            subscription_number='SUB-TEST-001',
            customer=self.customer1,
            plan=self.plan,
            start_date=date(2026, 1, 1),
            status='ACTIVE'
        )

        # Invoice for Customer 1
        self.invoice1 = Invoice.objects.create(
            invoice_number='INV-TEST-001',
            subscription=self.sub,
            customer=self.customer1,
            period_start=date(2026, 1, 1),
            period_end=date(2026, 1, 31),
            issue_date=date(2026, 1, 1),
            due_date=date(2026, 1, 15),
            subtotal=Decimal('100.00'),
            tax_amount=Decimal('0.00'),
            discount_amount=Decimal('0.00'),
            total_amount=Decimal('100.00'),
            status='CONFIRMED',
        )

    def test_record_full_payment_transitions_to_paid(self):
        """Paying the entire invoice amount sets status to PAID."""
        payment = record_payment(
            invoice=self.invoice1,
            amount=Decimal('100.00'),
            payment_method='CARD',
            transaction_id='TX-FULL-01'
        )
        self.invoice1.refresh_from_db()
        self.assertEqual(payment.amount, Decimal('100.00'))
        self.assertEqual(self.invoice1.status, 'PAID')

    def test_partial_payment_lifecycle(self):
        """Partial payment keeps status CONFIRMED, then second payment completes to PAID."""
        # 1st payment: $40
        p1 = record_payment(
            invoice=self.invoice1,
            amount=Decimal('40.00'),
            payment_method='UPI',
            transaction_id='TX-PART-01'
        )
        self.invoice1.refresh_from_db()
        self.assertEqual(self.invoice1.status, 'CONFIRMED')

        # 2nd payment: $60
        p2 = record_payment(
            invoice=self.invoice1,
            amount=Decimal('60.00'),
            payment_method='CARD',
            transaction_id='TX-PART-02'
        )
        self.invoice1.refresh_from_db()
        self.assertEqual(self.invoice1.status, 'PAID')
        self.assertEqual(self.invoice1.payments.count(), 2)

    def test_payment_exceeding_balance_raises_error(self):
        """Attempting to pay more than invoice remaining balance raises ValidationError."""
        with self.assertRaises(ValidationError):
            record_payment(
                invoice=self.invoice1,
                amount=Decimal('150.00'),
                payment_method='CARD'
            )

    def test_payment_on_cancelled_invoice_raises_error(self):
        """Attempting to pay a CANCELLED invoice raises ValidationError."""
        self.invoice1.status = 'CANCELLED'
        self.invoice1.save()
        with self.assertRaises(ValidationError):
            record_payment(
                invoice=self.invoice1,
                amount=Decimal('50.00'),
                payment_method='CARD'
            )

    def test_customer_scoping_on_payments_api(self):
        """Customer A can only see their own payments and cannot see or pay Customer B's."""
        # Record payment for cust1
        record_payment(self.invoice1, Decimal('50.00'), 'CARD', 'TX-CUST1')

        # Create invoice for cust2
        sub2 = Subscription.objects.create(
            subscription_number='SUB-TEST-002',
            customer=self.customer2,
            plan=self.plan,
            start_date=date(2026, 1, 1),
            status='ACTIVE'
        )
        inv2 = Invoice.objects.create(
            invoice_number='INV-TEST-002',
            subscription=sub2,
            customer=self.customer2,
            period_start=date(2026, 1, 1),
            period_end=date(2026, 1, 31),
            issue_date=date(2026, 1, 1),
            due_date=date(2026, 1, 15),
            total_amount=Decimal('100.00'),
            status='CONFIRMED',
        )
        record_payment(inv2, Decimal('50.00'), 'CARD', 'TX-CUST2')

        # Login as customer1
        self.client.force_authenticate(user=self.customer1)
        res = self.client.get('/api/payments/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['invoice_number'], 'INV-TEST-001')

        # Customer1 tries to pay Customer2's invoice
        res_pay = self.client.post('/api/payments/', {
            'invoice': inv2.id,
            'amount': '25.00',
            'payment_method': 'CARD'
        })
        self.assertEqual(res_pay.status_code, status.HTTP_400_BAD_REQUEST)
