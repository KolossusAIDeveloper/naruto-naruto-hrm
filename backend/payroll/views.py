import csv
from io import StringIO
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from datetime import date
from .models import Payroll
from .serializers import PayrollSerializer
from employees.models import Employee
from activity_logs.utils import log_activity


class PayrollViewSet(viewsets.ModelViewSet):
    queryset = Payroll.objects.all().select_related('employee', 'employee__department')
    serializer_class = PayrollSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        emp_id = self.request.query_params.get('employee')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if emp_id:
            qs = qs.filter(employee_id=emp_id)
        if month:
            qs = qs.filter(month=month)
        if year:
            qs = qs.filter(year=year)
        return qs

    def perform_update(self, serializer):
        payroll = serializer.save()
        log_activity('salary_updated',
                     f"Payroll updated for {payroll.employee.full_name} - {payroll.month}/{payroll.year}",
                     user=self.request.user)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        month = int(request.data.get('month', date.today().month))
        year = int(request.data.get('year', date.today().year))
        employees = Employee.objects.filter(employment_status__in=['active', 'on_leave'])
        created = 0
        for emp in employees:
            _, is_new = Payroll.objects.get_or_create(
                employee=emp, month=month, year=year,
                defaults={'base_salary': emp.base_salary}
            )
            if is_new:
                created += 1
        return Response({'success': True, 'created': created, 'total': employees.count()})

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        payroll = self.get_object()
        payroll.is_processed = True
        payroll.payment_date = request.data.get('payment_date', str(date.today()))
        payroll.save()
        log_activity('payroll_processed',
                     f"Payroll processed for {payroll.employee.full_name} - {payroll.month}/{payroll.year}",
                     user=request.user)
        return Response(PayrollSerializer(payroll).data)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        month = request.query_params.get('month', date.today().month)
        year = request.query_params.get('year', date.today().year)
        records = Payroll.objects.filter(month=month, year=year).select_related(
            'employee', 'employee__department'
        )
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="payroll_{month}_{year}.csv"'
        writer = csv.writer(response)
        writer.writerow(['Employee ID', 'Name', 'Department', 'Base Salary', 'Bonus', 'Deductions', 'Net Pay', 'Status', 'Payment Date'])
        for p in records:
            writer.writerow([
                p.employee.employee_id,
                p.employee.full_name,
                p.employee.department.name if p.employee.department else '',
                p.base_salary, p.bonus, p.deductions, p.net_pay,
                'Processed' if p.is_processed else 'Pending',
                p.payment_date or '',
            ])
        return response
