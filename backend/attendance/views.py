from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import date, timedelta
from django.db.models import Count, Q
from .models import Attendance
from .serializers import AttendanceSerializer
from employees.models import Employee
from activity_logs.utils import log_activity


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        emp_id = self.request.query_params.get('employee')
        att_date = self.request.query_params.get('date')
        if emp_id:
            qs = qs.filter(employee_id=emp_id)
        if att_date:
            qs = qs.filter(date=att_date)
        return qs

    @action(detail=False, methods=['get'])
    def daily(self, request):
        att_date_str = request.query_params.get('date', str(date.today()))
        employees = Employee.objects.filter(employment_status='active').select_related('department')
        existing = {a.employee_id: a for a in Attendance.objects.filter(date=att_date_str)}
        result = []
        for emp in employees:
            att = existing.get(emp.id)
            result.append({
                'employee_id': emp.id,
                'employee_name': emp.full_name,
                'employee_code': emp.employee_id,
                'department': emp.department.name if emp.department else None,
                'attendance_id': att.id if att else None,
                'status': att.status if att else None,
                'note': att.note if att else '',
            })
        return Response(result)

    @action(detail=False, methods=['post'])
    def mark(self, request):
        emp_id = request.data.get('employee')
        att_date = request.data.get('date')
        att_status = request.data.get('status')
        note = request.data.get('note', '')
        att, created = Attendance.objects.update_or_create(
            employee_id=emp_id, date=att_date,
            defaults={'status': att_status, 'note': note}
        )
        log_activity('attendance_marked',
                     f"Attendance marked for employee {emp_id} on {att_date}: {att_status}",
                     user=request.user)
        return Response(AttendanceSerializer(att).data)

    @action(detail=False, methods=['post'])
    def bulk_mark(self, request):
        att_date = request.data.get('date', str(date.today()))
        att_status = request.data.get('status', 'present')
        employees = Employee.objects.filter(employment_status='active')
        for emp in employees:
            Attendance.objects.update_or_create(
                employee_id=emp.id, date=att_date,
                defaults={'status': att_status}
            )
        log_activity('attendance_marked',
                     f"Bulk attendance marked as {att_status} for {date} - {employees.count()} employees",
                     user=request.user)
        return Response({'success': True, 'count': employees.count()})

    @action(detail=False, methods=['get'])
    def monthly_report(self, request):
        month = int(request.query_params.get('month', date.today().month))
        year = int(request.query_params.get('year', date.today().year))
        employees = Employee.objects.filter(employment_status__in=['active', 'on_leave'])
        report = []
        for emp in employees:
            records = Attendance.objects.filter(
                employee=emp, date__month=month, date__year=year
            )
            present = records.filter(status='present').count()
            absent = records.filter(status='absent').count()
            half_day = records.filter(status='half_day').count()
            wfh = records.filter(status='work_from_home').count()
            total = present + absent + half_day + wfh
            pct = round((present + wfh + half_day * 0.5) / total * 100, 1) if total > 0 else 0
            report.append({
                'employee_id': emp.id,
                'employee_name': emp.full_name,
                'department': emp.department.name if emp.department else None,
                'present': present,
                'absent': absent,
                'half_day': half_day,
                'work_from_home': wfh,
                'total_days': total,
                'attendance_percentage': pct,
            })
        return Response(report)

    @action(detail=False, methods=['get'])
    def heatmap(self, request):
        emp_id = request.query_params.get('employee')
        month = int(request.query_params.get('month', date.today().month))
        year = int(request.query_params.get('year', date.today().year))
        records = Attendance.objects.filter(
            employee_id=emp_id, date__month=month, date__year=year
        )
        data = {str(r.date): r.status for r in records}
        return Response(data)
