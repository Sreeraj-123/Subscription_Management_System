from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """Allows access only to users with role=ADMIN or superusers."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and (
                request.user.role == 'ADMIN' or request.user.is_superuser
            )
        )


class IsAdminOrInternal(BasePermission):
    """Allows access to users with role=ADMIN, role=INTERNAL, or superusers."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and (
                request.user.role in ['ADMIN', 'INTERNAL'] or request.user.is_superuser
            )
        )


class IsOwnerCustomer(BasePermission):
    """
    Allows access to CUSTOMER for their own records, or staff/admin for all records.
    Assumes object has a `customer` or `user` attribute.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role in ['ADMIN', 'INTERNAL'] or request.user.is_superuser:
            return True
        # Check customer ownership
        target_customer = getattr(obj, 'customer', getattr(obj, 'user', None))
        return target_customer == request.user

