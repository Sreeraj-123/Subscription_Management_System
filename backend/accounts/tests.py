from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


class HealthAndContractTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_openapi_schema_endpoint(self):
        url = reverse('schema')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('openapi', response.data)
        self.assertEqual(response.data['info']['title'], 'Brightloop Subscription Management API')

    def test_swagger_ui_endpoint(self):
        url = reverse('swagger-ui')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertContains(response, 'Brightloop Subscription Management API')

    def test_custom_user_creation(self):
        user = User.objects.create_user(
            email='testcustomer@brightloop.io',
            password='Customer@123456',
            role='CUSTOMER'
        )
        self.assertEqual(user.email, 'testcustomer@brightloop.io')
        self.assertEqual(user.role, 'CUSTOMER')
        self.assertFalse(user.is_staff)
        self.assertTrue(user.check_password('Customer@123456'))
