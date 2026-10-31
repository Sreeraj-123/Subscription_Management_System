from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse

from .services import get_financial_dashboard_metrics, generate_csv_report


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        description="Retrieve database-aggregated financial metrics: MRR, ARR, Active Subs, Revenue, Outstanding, Overdue, and trends.",
        responses={200: OpenApiResponse(description="Executive finance metrics")}
    )
    def get(self, request):
        metrics = get_financial_dashboard_metrics(request.user)
        return Response(metrics, status=status.HTTP_200_OK)


class ExportCSVView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter(name='report_type', description='Type of report', required=False, type=str, enum=['payments', 'invoices', 'subscriptions', 'revenue']),
            OpenApiParameter(name='start_date', description='Start date YYYY-MM-DD', required=False, type=str),
            OpenApiParameter(name='end_date', description='End date YYYY-MM-DD', required=False, type=str),
        ],
        description="Export financial records to CSV formatted file.",
        responses={200: OpenApiResponse(description="CSV File attachment")}
    )
    def get(self, request):
        report_type = request.query_params.get('report_type', 'payments')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        csv_content = generate_csv_report(
            report_type=report_type,
            user=request.user,
            start_date=start_date,
            end_date=end_date,
        )

        today_str = timezone.now().strftime('%Y%m%d')
        filename = f"brightloop_{report_type}_{today_str}.csv"

        response = HttpResponse(csv_content, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
