import random
from datetime import date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.utils import timezone

from catalog.models import Product, Variant, Plan, Tax, Discount, QuotationTemplate, QuotationTemplateLine
from subscriptions.models import Subscription, SubscriptionLine
from billing.models import Invoice, InvoiceLine
from payments.models import Payment

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds demonstration data: Admin, Staff, 50 Customers, Catalog, Subscriptions, Invoices, and Payments.'

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

        backup_prod, _ = Product.objects.get_or_create(
            name='Dedicated Database Backup',
            defaults={
                'type': 'SERVICE',
                'sales_price': Decimal('150.00'),
                'cost_price': Decimal('30.00'),
                'notes': 'Daily encrypted multi-region snapshots and point-in-time recovery.',
                'is_active': True,
            }
        )

        analytics_prod, _ = Product.objects.get_or_create(
            name='Real-time AI Analytics Addon',
            defaults={
                'type': 'SERVICE',
                'sales_price': Decimal('80.00'),
                'cost_price': Decimal('15.00'),
                'notes': 'Predictive churn and usage intelligence streams.',
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
        enterprise_plan, _ = Plan.objects.get_or_create(
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

        # 7. Customer Users (50 accounts)
        first_names = [
            'Alex', 'Jordan', 'Taylor', 'Morgan', 'Sam', 'Chris', 'Casey', 'Robin', 'Riley', 'Avery',
            'Jamie', 'Peyton', 'Cameron', 'Dakota', 'Skyler', 'Jesse', 'Reese', 'Kendall', 'Logan', 'Drew'
        ]
        last_names = [
            'Miller', 'Davis', 'Wilson', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson',
            'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen'
        ]

        hashed_password = make_password('Customer@123456')
        existing_cust_count = User.objects.filter(role='CUSTOMER').count()

        if existing_cust_count < 50:
            customers_to_create = []
            for i in range(existing_cust_count + 1, 51):
                email = f'customer{i}@brightloop.io'
                if not User.objects.filter(email=email).exists():
                    fn = first_names[(i - 1) % len(first_names)]
                    ln = last_names[(i - 1) % len(last_names)]
                    customers_to_create.append(
                        User(
                            email=email,
                            password=hashed_password,
                            first_name=fn,
                            last_name=ln,
                            role='CUSTOMER',
                            is_active=True,
                        )
                    )
            if customers_to_create:
                User.objects.bulk_create(customers_to_create)
                self.stdout.write(self.style.SUCCESS(f'Created {len(customers_to_create)} customer accounts (pw: Customer@123456).'))

        customers = list(User.objects.filter(role='CUSTOMER').order_by('id')[:50])

        # 8. Subscriptions, Invoices & Historical Payments
        plans_list = [pro_plan, enterprise_plan, starter_plan]
        methods_list = ['CARD', 'UPI', 'BANK_TRANSFER', 'CASH']
        today = timezone.now().date()

        existing_subs = Subscription.objects.count()
        if existing_subs < 40:
            self.stdout.write(self.style.NOTICE('Seeding subscriptions, invoices, and payments...'))
            for idx, cust in enumerate(customers):
                plan = plans_list[idx % len(plans_list)]
                sub_num = f"SUB-{1000 + idx:06d}"
                sub, created = Subscription.objects.get_or_create(
                    subscription_number=sub_num,
                    defaults={
                        'customer': cust,
                        'plan': plan,
                        'start_date': today - timedelta(days=random.randint(45, 180)),
                        'status': 'ACTIVE' if idx % 7 != 0 else 'PAUSED',
                        'notes': f'Subscribed to {plan.name}',
                    }
                )
                if created:
                    SubscriptionLine.objects.create(
                        subscription=sub,
                        product=erp_prod if plan == enterprise_plan else backup_prod,
                        quantity=1,
                        unit_price=plan.price,
                        amount=plan.price
                    )

                # Generate invoices for past months
                for m_offset in range(3, -1, -1):
                    p_start = (today.replace(day=1) - timedelta(days=m_offset * 30)).replace(day=1)
                    p_end = p_start + timedelta(days=29)
                    inv_num = f"INV-{10000 + (idx * 4) + m_offset:07d}"

                    if not Invoice.objects.filter(invoice_number=inv_num).exists():
                        is_overdue = (m_offset == 1 and idx % 4 == 0)
                        is_paid = (m_offset >= 1 and not is_overdue)
                        inv_status = 'PAID' if is_paid else ('CONFIRMED' if is_overdue else 'DRAFT')
                        due_date = p_start + timedelta(days=15)

                        total = plan.price if plan.price > Decimal('0.00') else Decimal('49.00')
                        tax = (total * Decimal('0.18')).quantize(Decimal('0.01'))
                        final_total = total + tax

                        inv = Invoice.objects.create(
                            invoice_number=inv_num,
                            subscription=sub,
                            customer=cust,
                            period_start=p_start,
                            period_end=p_end,
                            issue_date=p_start,
                            due_date=due_date,
                            subtotal=total,
                            tax_amount=tax,
                            discount_amount=Decimal('0.00'),
                            total_amount=final_total,
                            status=inv_status,
                            notes=f'Invoice for {plan.name} ({p_start} to {p_end})',
                        )

                        InvoiceLine.objects.create(
                            invoice=inv,
                            product=erp_prod,
                            description=f"{plan.name} License",
                            quantity=1,
                            unit_price=total,
                            tax_amount=tax,
                            total_amount=final_total,
                        )

                        if is_paid:
                            pay_date = timezone.datetime.combine(
                                p_start + timedelta(days=random.randint(1, 10)),
                                timezone.datetime.min.time(),
                                tzinfo=timezone.get_current_timezone()
                            )
                            Payment.objects.create(
                                invoice=inv,
                                amount=final_total,
                                payment_method=methods_list[idx % len(methods_list)],
                                payment_date=pay_date,
                                transaction_id=f"TXN-{random.randint(100000, 999999)}",
                                note="Automated billing cycle settlement."
                            )

            self.stdout.write(self.style.SUCCESS('Successfully seeded subscriptions, invoices, and payments.'))

        self.stdout.write(self.style.SUCCESS('Demo seed completed successfully.'))
