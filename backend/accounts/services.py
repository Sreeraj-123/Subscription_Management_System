from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.exceptions import ValidationError

User = get_user_model()


def send_password_reset_email(user, host='localhost:5173'):
    """Generates password reset token and sends an email via configured backend."""
    token = default_token_generator.make_token(user)
    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
    reset_url = f"http://{host}/reset-password?uid={uidb64}&token={token}"

    subject = "Reset your Brightloop password"
    message = (
        f"Hello {user.first_name or user.email},\n\n"
        f"You requested a password reset for your Brightloop account.\n"
        f"Please click the link below to set a new password:\n\n"
        f"{reset_url}\n\n"
        f"If you did not make this request, you can safely ignore this email.\n\n"
        f"Best regards,\nBrightloop Team"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
    return reset_url


def confirm_password_reset(uidb64, token, new_password):
    """Verifies reset token and updates user's password."""
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        raise ValidationError({"error": "Invalid or expired password reset link."})

    if not default_token_generator.check_token(user, token):
        raise ValidationError({"error": "Invalid or expired password reset link."})

    user.set_password(new_password)
    user.save(update_fields=['password'])
    return user

