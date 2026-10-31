from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from subscriptions.models import Subscription, SubscriptionLine
from subscriptions.services import transition_subscription_status, create_subscription_from_template
from catalog.models import Product, Plan, QuotationTemplate, QuotationTemplateLine

User = get_user_model()


class SubscriptionLifecycleTests(TestCase):
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
            name='Pro Plan',
            price=Decimal('49.00'),
            billing_period='MONTHLY',
            pausable=True,
            closable_early=True,
            renewable=True,
        )
        self.strict_plan = Plan.objects.create(
            name='Strict Annual',
            price=Decimal('999.00'),
            billing_period='YEARLY',
            pausable=False,
            closable_early=False,
            renewable=False,
        )

        self.product = Product.objects.create(
            name='Analytics Addon',
            type='SOFTWARE',
            sales_price=Decimal('20.00'),
        )

        self.template = QuotationTemplate.objects.create(
            name='Pro Package',
            plan=self.plan,
            validity_days=30,
        )
        QuotationTemplateLine.objects.create(
            template=self.template,
            product=self.product,
            quantity=2,
        )

    def test_create_from_template(self):
        sub = create_subscription_from_template(
            customer=self.customer,
            template_id=self.template.id,
        )
        self.assertTrue(sub.subscription_number.startswith('SUB-'))
        self.assertEqual(sub.status, 'DRAFT')
        self.assertEqual(sub.lines.count(), 1)
        self.assertEqual(sub.lines.first().quantity, 2)
        self.assertEqual(sub.lines.first().unit_price, Decimal('20.00'))

    def test_lifecycle_status_transitions(self):
        sub = create_subscription_from_template(
            customer=self.customer,
            template_id=self.template.id,
        )

        # DRAFT -> QUOTATION
        sub = transition_subscription_status(sub, 'QUOTATION')
        self.assertEqual(sub.status, 'QUOTATION')

        # QUOTATION -> CONFIRMED
        sub = transition_subscription_status(sub, 'CONFIRMED')
        self.assertEqual(sub.status, 'CONFIRMED')

        # CONFIRMED -> ACTIVE
        sub = transition_subscription_status(sub, 'ACTIVE')
        self.assertEqual(sub.status, 'ACTIVE')

        # ACTIVE -> PAUSED (plan allows pause)
        sub = transition_subscription_status(sub, 'PAUSED')
        self.assertEqual(sub.status, 'PAUSED')
        self.assertIsNotNone(sub.pause_date)

        # PAUSED -> ACTIVE
        sub = transition_subscription_status(sub, 'ACTIVE')
        self.assertEqual(sub.status, 'ACTIVE')
        self.assertIsNone(sub.pause_date)

        # ACTIVE -> CLOSED (early close allowed)
        sub = transition_subscription_status(sub, 'CLOSED')
        self.assertEqual(sub.status, 'CLOSED')

    def test_plan_policy_enforcement(self):
        sub = Subscription.objects.create(
            subscription_number='SUB-999999',
            customer=self.customer,
            plan=self.strict_plan,
            start_date=timezone.now().date(),
            expiry_date=timezone.now().date() + timezone.timedelta(days=365),
            status='ACTIVE',
        )

        # Strict plan does NOT allow pausing
        with self.assertRaises(ValidationError):
            transition_subscription_status(sub, 'PAUSED')

        # Strict plan does NOT allow early closing
        with self.assertRaises(ValidationError):
            transition_subscription_status(sub, 'CLOSED')
