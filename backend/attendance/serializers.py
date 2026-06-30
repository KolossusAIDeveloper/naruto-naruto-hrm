from rest_framework import serializers
from .models import Attendance


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_dept = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = '__all__'

    def get_employee_name(self, obj):
        return obj.employee.full_name

    def get_employee_dept(self, obj):
        return obj.employee.department.name if obj.employee.department else None
