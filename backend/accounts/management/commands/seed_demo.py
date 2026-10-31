from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds initial demonstration data (Admin, Staff, Customers, and catalog)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting seed_demo...'))

        # Create or update default Admin
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
        else:
            self.stdout.write(self.style.WARNING('Admin user already exists.'))

        # Create default Staff
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

        self.stdout.write(self.style.SUCCESS('Initial seed skeleton completed successfully.'))

