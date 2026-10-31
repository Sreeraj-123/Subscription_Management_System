from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema, OpenApiResponse

from config.permissions import IsAdmin
from .serializers import (
    UserSerializer,
    SignupSerializer,
    LoginSerializer,
    CreateStaffSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from .services import send_password_reset_email, confirm_password_reset

User = get_user_model()


class SignupView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=SignupSerializer,
        responses={201: UserSerializer},
        description="Register a new customer account with email and password."
    )
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate JWT upon signup
        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['email'] = user.email

        return Response(
            {
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'message': 'Account created successfully.'
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=LoginSerializer,
        responses={200: OpenApiResponse(description="Returns user object and JWT tokens")},
        description="Authenticate user with email and password, returning JWT access & refresh tokens."
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class StaffManagementView(generics.ListCreateAPIView):
    """Admin-only endpoint to list all internal team members or create new staff."""
    permission_classes = [IsAdmin]
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.filter(role__in=['ADMIN', 'INTERNAL']).order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateStaffSerializer
        return UserSerializer


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=PasswordResetRequestSerializer,
        responses={200: OpenApiResponse(description="Generic confirmation response")},
        description="Sends a password reset link to the email if the account exists."
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower().strip()

        try:
            user = User.objects.get(email__iexact=email)
            host = request.get_host()
            send_password_reset_email(user, host=host)
        except User.DoesNotExist:
            # Don't leak whether email exists
            pass

        return Response(
            {'message': 'If an account exists with that email, a password reset link has been sent.'},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=PasswordResetConfirmSerializer,
        responses={200: OpenApiResponse(description="Success message")},
        description="Resets the password given a valid uidb64, token, and new password."
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        confirm_password_reset(
            uidb64=serializer.validated_data['uidb64'],
            token=serializer.validated_data['token'],
            new_password=serializer.validated_data['new_password']
        )

        return Response(
            {'message': 'Password has been reset successfully. You may now log in.'},
            status=status.HTTP_200_OK,
        )
