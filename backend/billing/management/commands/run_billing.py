from django.core.management.base import BaseCommand
from django.utils import timezone
from billing.services import generate_invoices_for_due_subscriptions


class Command(BaseCommand):
    help = 'Executes idempotent bulk invoice generation for all due active subscriptions.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting automated billing run...'))
        today = timezone.now().date()

        result = generate_invoices_for_due_subscriptions(as_of_date=today)
        generated = result['generated_count']
        skipped = result['skipped_count']

        self.stdout.write(
            self.style.SUCCESS(
                f"Billing run completed successfully. Invoices generated: {generated}, duplicate periods skipped: {skipped}."
            )
        )

