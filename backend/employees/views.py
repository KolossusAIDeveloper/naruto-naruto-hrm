from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.utils import timezone
from django.db.models import Count
from datetime import timedelta, date
from .models import Employee
from .serializers import EmployeeSerializer, CustomTokenObtainPairSerializer
from activity_logs.utils import log_activity


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'employee_id', 'email']
    ordering_fields = ['first_name', 'join_date', 'base_salary', 'created_at']
    ordering = ['first_name']

    def get_queryset(self):
        qs = super().get_queryset()
        dept = self.request.query_params.get('department')
        status_filter = self.request.query_params.get('employment_status')
        emp_type = self.request.query_params.get('employment_type')
        if dept:
            qs = qs.filter(department_id=dept)
        if status_filter:
            qs = qs.filter(employment_status=status_filter)
        if emp_type:
            qs = qs.filter(employment_type=emp_type)
        return qs

    def perform_create(self, serializer):
        emp = serializer.save()
        log_activity('employee_created', f"Employee '{emp.full_name}' ({emp.employee_id}) created",
                     user=self.request.user, metadata={'employee_id': emp.id})

    def perform_update(self, serializer):
        old = self.get_object()
        old_salary = old.base_salary
        emp = serializer.save()
        if emp.base_salary != old_salary:
            log_activity('salary_updated',
                         f"Salary updated for {emp.full_name}: {old_salary} -> {emp.base_salary}",
                         user=self.request.user)
        else:
            log_activity('employee_updated', f"Employee '{emp.full_name}' updated",
                         user=self.request.user)

    def perform_destroy(self, instance):
        name = instance.full_name
        eid = instance.employee_id
        instance.delete()
        log_activity('employee_deleted', f"Employee '{name}' ({eid}) deleted",
                     user=self.request.user)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        today = date.today()
        this_month_start = today.replace(day=1)
        next_7_days = today + timedelta(days=7)

        total = Employee.objects.count()
        active = Employee.objects.filter(employment_status='active').count()
        on_leave = Employee.objects.filter(employment_status='on_leave').count()
        new_joiners = Employee.objects.filter(
            join_date__gte=this_month_start, join_date__lte=today
        ).count()

        # Upcoming birthdays (next 7 days, ignoring year)
        upcoming_birthdays = []
        for emp in Employee.objects.filter(date_of_birth__isnull=False, employment_status='active'):
            try:
                bday = emp.date_of_birth.replace(year=today.year)
                if bday < today:
                    bday = bday.replace(year=today.year + 1)
                if today <= bday <= next_7_days:
                    upcoming_birthdays.append({
                        'id': emp.id,
                        'full_name': emp.full_name,
                        'date_of_birth': str(emp.date_of_birth),
                        'birthday_this_year': str(bday),
                        'department_name': emp.department.name if emp.department else None,
                    })
            except ValueError:
                pass

        # Department headcount
        from departments.models import Department
        dept_counts = []
        for dept in Department.objects.all():
            cnt = dept.employees.filter(employment_status='active').count()
            dept_counts.append({'name': dept.name, 'count': cnt})

        # Employment type breakdown
        type_counts = Employee.objects.values('employment_type').annotate(count=Count('id'))
        type_breakdown = [{'employment_type': t['employment_type'], 'count': t['count']} for t in type_counts]

        # Monthly joining trend - last 12 months
        trend = []
        for i in range(11, -1, -1):
            month_date = (today.replace(day=1) - timedelta(days=i*30)).replace(day=1)
            m, y = month_date.month, month_date.year
            cnt = Employee.objects.filter(join_date__year=y, join_date__month=m).count()
            trend.append({'month': f"{y}-{m:02d}", 'count': cnt})

        # Recent pending leaves
        from leaves.models import Leave
        pending_leaves = Leave.objects.filter(status='pending').order_by('-created_at')[:5]
        recent_leaves = []
        for lv in pending_leaves:
            recent_leaves.append({
                'id': lv.id,
                'employee_name': lv.employee.full_name,
                'leave_type': lv.leave_type,
                'start_date': str(lv.start_date),
                'end_date': str(lv.end_date),
                'total_days': lv.total_days,
            })

        # Latest announcement
        from announcements.models import Announcement
        latest_ann = Announcement.objects.filter(is_archived=False).order_by('-created_at').first()
        announcement = None
        if latest_ann:
            announcement = {
                'id': latest_ann.id,
                'title': latest_ann.title,
                'body': latest_ann.body,
                'priority': latest_ann.priority,
                'created_at': str(latest_ann.created_at),
            }

        return Response({
            'total_employees': total,
            'active_employees': active,
            'on_leave': on_leave,
            'new_joiners_this_month': new_joiners,
            'upcoming_birthdays': upcoming_birthdays,
            'department_headcount': dept_counts,
            'employment_type_breakdown': type_breakdown,
            'monthly_joining_trend': trend,
            'recent_pending_leaves': recent_leaves,
            'latest_announcement': announcement,
        })
