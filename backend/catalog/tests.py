from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from catalog.models import Product, Variant, Plan, Tax, Discount
from catalog.services import calculate_line, get_applicable_discounts

User = get_user_model()


class CatalogDomainTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            email='admin@brightloop.io',
            password='Admin@Password123'
        )
        self.staff = User.objects.create_user(
            email='staff@brightloop.io',
            password='Staff@Password123',
            role='INTERNAL',
            is_staff=True
        )
        self.customer = User.objects.create_user(
            email='customer@example.com',
            password='Customer@Password123',
            role='CUSTOMER'
        )

        # Base catalog entities
        self.product = Product.objects.create(
            name='Brightloop ERP License',
            type='SOFTWARE',
            sales_price=Decimal('1000.00'),
            cost_price=Decimal('200.00')
        )
        self.variant_odoo = Variant.objects.create(
            product=self.product,
            attribute_name='Brand',
            attribute_value='Odoo',
            extra_price=Decimal('560.00')
        )
        self.tax_18 = Tax.objects.create(
            name='GST 18%',
            rate=Decimal('18.00')
        )
        self.discount_10pct = Discount.objects.create(
            code='SAVE10',
            type='PERCENTAGE',
            value=Decimal('10.00'),
            min_purchase=Decimal('500.00'),
            scope='SUBSCRIPTION'
        )

    def test_product_and_variant_api(self):
        url = reverse('catalog:product-list')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should include nested variants
        products = res.data['results']
        self.assertEqual(len(products), 1)
        self.assertEqual(len(products[0]['variants']), 1)
        self.assertEqual(products[0]['variants'][0]['attribute_value'], 'Odoo')
        self.assertEqual(Decimal(products[0]['variants'][0]['extra_price']), Decimal('560.00'))

    def test_plan_creation_with_policy_flags(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('catalog:plan-list')
        data = {
            'name': 'Enterprise Yearly',
            'price': '1999.00',
            'billing_period': 'YEARLY',
            'min_quantity': 5,
            'auto_close': False,
            'closable_early': True,
            'pausable': True,
            'renewable': True,
        }
        res = self.client.post(url, data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['billing_period'], 'YEARLY')
        self.assertTrue(res.data['pausable'])

    def test_discount_admin_only_rbac(self):
        url = reverse('catalog:discount-list')
        data = {
            'code': 'SUMMER50',
            'type': 'FIXED',
            'value': '50.00',
            'scope': 'SUBSCRIPTION',
        }

        # Customer forbidden (403)
        self.client.force_authenticate(user=self.customer)
        res = self.client.post(url, data, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Staff forbidden from creating discount rules (403)
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(url, data, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin allowed (201)
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(url, data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['code'], 'SUMMER50')

    def test_calculate_line_service_with_variant_discount_and_tax(self):
        # Product base: $1000, Odoo variant: +$560 => unit price = $1560
        # Qty: 2 => Subtotal = $3120
        # Discount SAVE10 (10%) => Discount amount = $312.00
        # Taxable base = $3120 - $312 = $2808.00
        # Tax GST 18% (18%) => $2808 * 0.18 = $505.44
        # Total = $2808 + $505.44 = $3313.44

        breakdown = calculate_line(
            product_id=self.product.id,
            variant_id=self.variant_odoo.id,
            quantity=2,
            tax_id=self.tax_18.id,
            discount_code='SAVE10'
        )

        self.assertEqual(breakdown['unit_price'], Decimal('1560.00'))
        self.assertEqual(breakdown['subtotal'], Decimal('3120.00'))
        self.assertEqual(breakdown['discount_amount'], Decimal('312.00'))
        self.assertEqual(breakdown['tax_amount'], Decimal('505.44'))
        self.assertEqual(breakdown['total_amount'], Decimal('3313.44'))

    def test_calculate_line_api_endpoint(self):
        url = reverse('catalog:calculate_line')
        data = {
            'product_id': self.product.id,
            'variant_id': self.variant_odoo.id,
            'quantity': 1,
            'tax_id': self.tax_18.id,
        }
        res = self.client.post(url, data, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # 1560 + 18% tax (280.80) = 1840.80
        self.assertEqual(Decimal(str(res.data['total_amount'])), Decimal('1840.80'))

    def test_applicable_discounts_service(self):
        discounts = get_applicable_discounts(
            scope='SUBSCRIPTION',
            total_amount=Decimal('600.00'),
            quantity=1
        )
        self.assertEqual(len(discounts), 1)
        self.assertEqual(discounts[0].code, 'SAVE10')

        # Below min_purchase of 500
        discounts_below = get_applicable_discounts(
            scope='SUBSCRIPTION',
            total_amount=Decimal('400.00'),
            quantity=1
        )
        self.assertEqual(len(discounts_below), 0)
