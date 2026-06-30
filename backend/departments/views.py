from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Department
from .serializers import DepartmentSerializer
from activity_logs.utils import log_activity


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def perform_create(self, serializer):
        dept = serializer.save()
        log_activity('department_created', f"Department '{dept.name}' created",
                     user=self.request.user)

    def perform_update(self, serializer):
        dept = serializer.save()
        log_activity('department_updated', f"Department '{dept.name}' updated",
                     user=self.request.user)

    def perform_destroy(self, instance):
        name = instance.name
        instance.delete()
        log_activity('department_deleted', f"Department '{name}' deleted",
                     user=self.request.user)

    @action(detail=True, methods=['get'])
    def employees(self, request, pk=None):
        dept = self.get_object()
        from employees.serializers import EmployeeSerializer
        employees = dept.employees.all()
        serializer = EmployeeSerializer(employees, many=True, context={'request': request})
        return Response(serializer.data)
