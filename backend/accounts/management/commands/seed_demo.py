from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from catalog.models import Product, Variant, Plan, Tax, Discount, QuotationTemplate, QuotationTemplateLine

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds initial demonstration data (Admin, Staff, Customers, and catalog)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting seed_demo...'))

        # 1. Admin
        admin, created = User.objects.get_or_create(
            email='admin@brightloop.io',
            defaults={
                'first_name': 'Brightloop',
                'last_name': 'Admin',
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin.set_password('Admin@123456')
            admin.save()
            self.stdout.write(self.style.SUCCESS('Created admin user: admin@brightloop.io (pw: Admin@123456)'))

        # 2. Staff
        staff_emails = ['staff1@brightloop.io', 'staff2@brightloop.io']
        for email in staff_emails:
            staff, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': 'Staff',
                    'last_name': email.split('@')[0],
                    'role': 'INTERNAL',
                    'is_staff': True,
                }
            )
            if created:
                staff.set_password('Staff@123456')
                staff.save()
                self.stdout.write(self.style.SUCCESS(f'Created staff user: {email} (pw: Staff@123456)'))

        # 3. Catalog Products & Variants
        erp_prod, _ = Product.objects.get_or_create(
            name='Brightloop Cloud ERP',
            defaults={
                'type': 'SOFTWARE',
                'sales_price': Decimal('1200.00'),
                'cost_price': Decimal('300.00'),
                'notes': 'All-in-one business software license with modular add-ons.',
                'is_active': True,
            }
        )
        Variant.objects.get_or_create(
            product=erp_prod,
            attribute_name='Brand',
            attribute_value='Odoo Integration',
            defaults={'extra_price': Decimal('560.00')}
        )

        Product.objects.get_or_create(
            name='Dedicated Database Backup',
            defaults={
                'type': 'SERVICE',
                'sales_price': Decimal('150.00'),
                'cost_price': Decimal('30.00'),
                'notes': 'Daily encrypted multi-region snapshots and point-in-time recovery.',
                'is_active': True,
            }
        )

        # 4. Subscription Plans
        starter_plan, _ = Plan.objects.get_or_create(
            name='Starter Plan',
            defaults={
                'price': Decimal('0.00'),
                'billing_period': 'MONTHLY',
                'min_quantity': 1,
                'pausable': True,
                'renewable': True,
                'closable_early': True,
            }
        )
        pro_plan, _ = Plan.objects.get_or_create(
            name='Professional Plan',
            defaults={
                'price': Decimal('49.00'),
                'billing_period': 'MONTHLY',
                'min_quantity': 1,
                'pausable': True,
                'renewable': True,
                'closable_early': True,
            }
        )
        Plan.objects.get_or_create(
            name='Enterprise Annual',
            defaults={
                'price': Decimal('1999.00'),
                'billing_period': 'YEARLY',
                'min_quantity': 5,
                'pausable': True,
                'renewable': True,
                'closable_early': False,
            }
        )

        # 5. Taxes & Discounts
        tax_gst, _ = Tax.objects.get_or_create(
            name='GST 18%',
            defaults={'rate': Decimal('18.00'), 'is_active': True}
        )
        Tax.objects.get_or_create(
            name='VAT 10%',
            defaults={'rate': Decimal('10.00'), 'is_active': True}
        )

        Discount.objects.get_or_create(
            code='SAVE10',
            defaults={
                'type': 'PERCENTAGE',
                'value': Decimal('10.00'),
                'min_purchase': Decimal('100.00'),
                'scope': 'SUBSCRIPTION',
                'is_active': True,
            }
        )
        Discount.objects.get_or_create(
            code='WELCOME50',
            defaults={
                'type': 'FIXED',
                'value': Decimal('50.00'),
                'min_purchase': Decimal('300.00'),
                'scope': 'SUBSCRIPTION',
                'is_active': True,
            }
        )

        # 6. Quotation Template
        tpl, created = QuotationTemplate.objects.get_or_create(
            name='Standard Pro SaaS Package',
            plan=pro_plan,
            defaults={'validity_days': 30, 'notes': 'Default template for new professional subscribers.'}
        )
        if created:
            QuotationTemplateLine.objects.create(
                template=tpl,
                product=erp_prod,
                quantity=1
            )

        self.stdout.write(self.style.SUCCESS('Catalog and demonstration seed completed successfully.'))
