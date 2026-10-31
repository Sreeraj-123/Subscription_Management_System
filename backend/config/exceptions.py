from rest_framework.views import exception_handler
from rest_framework import status
from rest_framework.exceptions import APIException


def custom_exception_handler(exc, context):
    """
    Standardized API error response format across all apps:
    {
        "error": {
            "code": "validation_error" | "not_found" | "authentication_failed" | etc.,
            "message": "Human readable summary",
            "fields": { "field_name": ["details"] }
        }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_code = getattr(exc, 'default_code', 'error')
        if hasattr(exc, 'get_codes'):
            codes = exc.get_codes()
            if isinstance(codes, str):
                error_code = codes
            elif isinstance(codes, dict) and 'detail' in codes:
                error_code = codes['detail']
            elif isinstance(codes, dict):
                error_code = 'validation_error'

        message = 'An error occurred.'
        fields = {}

        if isinstance(response.data, dict):
            if 'detail' in response.data:
                message = str(response.data['detail'])
            else:
                message = 'Validation failed.'
                fields = response.data
        elif isinstance(response.data, list):
            message = ' '.join([str(item) for item in response.data])
        else:
            message = str(response.data)

        response.data = {
            'error': {
                'code': str(error_code),
                'message': message,
                'fields': fields,
            }
        }

    return response

