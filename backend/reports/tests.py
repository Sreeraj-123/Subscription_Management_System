from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from catalog.models import Plan, Product
from subscriptions.models import Subscription
from billing.models import Invoice
from payments.models import Payment
from payments.services import record_payment

User = get_user_model()


class ReportsServiceAndAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.admin = User.objects.create_superuser(
            email='admin@brightloop.io',
            password='Password@123',
            role='ADMIN'
        )
        self.customer = User.objects.create_user(
            email='alice@example.com',
            password='Password@123',
            role='CUSTOMER',
            first_name='Alice',
            last_name='Wonder'
        )

        # Plans: 1 Monthly ($100), 1 Yearly ($1200 -> $100/mo)
        self.plan_monthly = Plan.objects.create(
            name='Pro Monthly',
            price=Decimal('100.00'),
            billing_period='MONTHLY',
        )
        self.plan_yearly = Plan.objects.create(
            name='Enterprise Annual',
            price=Decimal('1200.00'),
            billing_period='YEARLY',
        )

        # Active Subscriptions
        self.sub1 = Subscription.objects.create(
            subscription_number='SUB-M-001',
            customer=self.customer,
            plan=self.plan_monthly,
            start_date=date.today() - timedelta(days=60),
            status='ACTIVE'
        )
        self.sub2 = Subscription.objects.create(
            subscription_number='SUB-Y-001',
            customer=self.customer,
            plan=self.plan_yearly,
            start_date=date.today() - timedelta(days=30),
            status='ACTIVE'
        )

        # Paid Invoice ($100)
        self.inv_paid = Invoice.objects.create(
            invoice_number='INV-PAID-001',
            subscription=self.sub1,
            customer=self.customer,
            period_start=date.today() - timedelta(days=60),
            period_end=date.today() - timedelta(days=31),
            issue_date=date.today() - timedelta(days=60),
            due_date=date.today() - timedelta(days=45),
            total_amount=Decimal('100.00'),
            status='CONFIRMED',
        )
        record_payment(self.inv_paid, Decimal('100.00'), 'CARD', 'TX-PAID')

        # Overdue Unpaid Invoice ($200)
        self.inv_overdue = Invoice.objects.create(
            invoice_number='INV-OVERDUE-001',
            subscription=self.sub1,
            customer=self.customer,
            period_start=date.today() - timedelta(days=30),
            period_end=date.today(),
            issue_date=date.today() - timedelta(days=30),
            due_date=date.today() - timedelta(days=10),  # In the past
            total_amount=Decimal('200.00'),
            status='CONFIRMED',
        )

    def test_admin_financial_dashboard_metrics(self):
        """Admin dashboard returns calculated MRR, ARR, revenue, outstanding, and overdue amounts."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/reports/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data
        self.assertEqual(data['role'], 'ADMIN')
        self.assertEqual(data['active_subscriptions_count'], 2)
        # MRR: Monthly $100 + Yearly ($1200 / 12 = $100) = $200.00
        self.assertAlmostEqual(data['mrr'], 200.0, places=1)
        self.assertAlmostEqual(data['arr'], 2400.0, places=1)
        self.assertAlmostEqual(data['total_revenue_collected'], 100.0, places=1)
        self.assertAlmostEqual(data['total_outstanding'], 200.0, places=1)
        self.assertEqual(data['overdue_invoices_count'], 1)
        self.assertAlmostEqual(data['overdue_amount'], 200.0, places=1)
        self.assertGreater(len(data['revenue_by_month']), 0)

    def test_customer_dashboard_view(self):
        """Customer accessing dashboard gets scoped portal overview."""
        self.client.force_authenticate(user=self.customer)
        res = self.client.get('/api/reports/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data
        self.assertEqual(data['role'], 'CUSTOMER')
        self.assertEqual(data['active_subscriptions_count'], 2)
        self.assertAlmostEqual(data['total_spent'], 100.0, places=1)
        self.assertEqual(data['unpaid_invoices_count'], 1)
        self.assertAlmostEqual(data['outstanding_balance'], 200.0, places=1)

    def test_csv_export_payments(self):
        """Export payments to CSV returns a 200 stream with headers."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/reports/export-csv/?report_type=payments')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('text/csv', res['Content-Type'])
        self.assertIn('attachment; filename="brightloop_payments_', res['Content-Disposition'])
        content = res.content.decode('utf-8')
        self.assertIn('Payment ID', content)
        self.assertIn('TX-PAID', content)

    def test_csv_export_invoices(self):
        """Export invoices to CSV returns a 200 stream with invoice numbers."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/reports/export-csv/?report_type=invoices')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('text/csv', res['Content-Type'])
        content = res.content.decode('utf-8')
        self.assertIn('Invoice Number', content)
        self.assertIn('INV-PAID-001', content)
