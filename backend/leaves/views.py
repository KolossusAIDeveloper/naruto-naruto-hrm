from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from .models import Leave, LeaveBalance, LEAVE_ALLOWANCES
from .serializers import LeaveSerializer, LeaveBalanceSerializer
from activity_logs.utils import log_activity


class LeaveViewSet(viewsets.ModelViewSet):
    queryset = Leave.objects.all().select_related('employee', 'reviewed_by')
    serializer_class = LeaveSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['employee__first_name', 'employee__last_name', 'leave_type', 'status']

    def get_queryset(self):
        qs = super().get_queryset()
        emp_id = self.request.query_params.get('employee')
        leave_type = self.request.query_params.get('leave_type')
        status_f = self.request.query_params.get('status')
        start = self.request.query_params.get('start_date')
        end = self.request.query_params.get('end_date')
        if emp_id:
            qs = qs.filter(employee_id=emp_id)
        if leave_type:
            qs = qs.filter(leave_type=leave_type)
        if status_f:
            qs = qs.filter(status=status_f)
        if start:
            qs = qs.filter(start_date__gte=start)
        if end:
            qs = qs.filter(end_date__lte=end)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        leave = serializer.save()
        log_activity('leave_submitted',
                     f"Leave request submitted for {leave.employee.full_name} ({leave.leave_type})",
                     user=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        leave = self.get_object()
        if leave.status != 'pending':
            return Response({'error': 'Can only approve pending leaves'}, status=400)
        leave.status = 'approved'
        leave.reviewed_by = request.user
        leave.review_comment = request.data.get('comment', '')
        leave.save()
        log_activity('leave_approved',
                     f"Leave approved for {leave.employee.full_name}",
                     user=request.user)
        return Response(LeaveSerializer(leave).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        leave = self.get_object()
        if leave.status != 'pending':
            return Response({'error': 'Can only reject pending leaves'}, status=400)
        leave.status = 'rejected'
        leave.reviewed_by = request.user
        leave.review_comment = request.data.get('comment', '')
        leave.save()
        log_activity('leave_rejected',
                     f"Leave rejected for {leave.employee.full_name}",
                     user=request.user)
        return Response(LeaveSerializer(leave).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        leave = self.get_object()
        leave.status = 'cancelled'
        leave.save()
        return Response(LeaveSerializer(leave).data)


class LeaveBalanceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LeaveBalance.objects.all().select_related('employee')
    serializer_class = LeaveBalanceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        emp_id = self.request.query_params.get('employee')
        year = self.request.query_params.get('year')
        if emp_id:
            qs = qs.filter(employee_id=emp_id)
        if year:
            qs = qs.filter(year=year)
        if not year and not emp_id:
            import datetime
            qs = qs.filter(year=datetime.date.today().year)
        return qs
