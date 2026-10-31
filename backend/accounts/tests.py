from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.core import mail
from accounts.services import send_password_reset_email

User = get_user_model()


class AccountsAuthTests(TestCase):
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

    def test_signup_success(self):
        url = reverse('accounts:signup')
        data = {
            'email': 'newuser@brightloop.io',
            'password': 'Secure@Password123',
            'confirm_password': 'Secure@Password123',
            'first_name': 'Jane',
            'last_name': 'Doe',
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertEqual(response.data['user']['role'], 'CUSTOMER')
        self.assertTrue(User.objects.filter(email='newuser@brightloop.io').exists())

    def test_signup_password_validation_failures(self):
        url = reverse('accounts:signup')

        # Too short (<= 8 chars)
        res = self.client.post(url, {
            'email': 'short@brightloop.io',
            'password': 'Pass1@',
            'confirm_password': 'Pass1@',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Missing uppercase
        res = self.client.post(url, {
            'email': 'noupper@brightloop.io',
            'password': 'password123@',
            'confirm_password': 'password123@',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Missing special char
        res = self.client.post(url, {
            'email': 'nospecial@brightloop.io',
            'password': 'Password123',
            'confirm_password': 'Password123',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_signup_duplicate_email(self):
        url = reverse('accounts:signup')
        res = self.client.post(url, {
            'email': 'customer@example.com',
            'password': 'Customer@New123',
            'confirm_password': 'Customer@New123',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_success(self):
        url = reverse('accounts:login')
        res = self.client.post(url, {
            'email': 'customer@example.com',
            'password': 'Customer@Password123',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', res.data)
        self.assertIn('access', res.data['tokens'])

    def test_login_invalid_password(self):
        url = reverse('accounts:login')
        res = self.client.post(url, {
            'email': 'customer@example.com',
            'password': 'WrongPassword@123',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_current_user_me_endpoint(self):
        url = reverse('accounts:current_user')

        # Unauthenticated
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated
        self.client.force_authenticate(user=self.customer)
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['email'], self.customer.email)

    def test_staff_management_rbac(self):
        url = reverse('accounts:staff_management')

        # Customer forbidden (403)
        self.client.force_authenticate(user=self.customer)
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin allowed (200)
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Admin creates new staff member
        new_staff_data = {
            'email': 'newstaff@brightloop.io',
            'password': 'Staff@Password123',
            'first_name': 'Dev',
            'last_name': 'Ops',
            'role': 'INTERNAL',
        }
        create_res = self.client.post(url, new_staff_data, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_res.data['role'], 'INTERNAL')

    def test_password_reset_flow(self):
        # 1. Request reset link
        req_url = reverse('accounts:password_reset_request')
        res = self.client.post(req_url, {'email': self.customer.email}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        email_body = mail.outbox[0].body
        self.assertIn('http://', email_body)

        # Extract uid and token using helper
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        token = default_token_generator.make_token(self.customer)
        uidb64 = urlsafe_base64_encode(force_bytes(self.customer.pk))

        # 2. Confirm reset with new valid password
        confirm_url = reverse('accounts:password_reset_confirm')
        confirm_res = self.client.post(confirm_url, {
            'uidb64': uidb64,
            'token': token,
            'new_password': 'BrandNew@Password123'
        }, format='json')
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        # 3. Verify user can log in with new password
        login_res = self.client.post(reverse('accounts:login'), {
            'email': self.customer.email,
            'password': 'BrandNew@Password123'
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
