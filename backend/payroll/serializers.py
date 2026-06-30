from rest_framework import serializers
from .models import Payroll


class PayrollSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = Payroll
        fields = '__all__'
        read_only_fields = ['net_pay']

    def get_employee_name(self, obj):
        return obj.employee.full_name

    def get_department_name(self, obj):
        if obj.employee.department:
            return obj.employee.department.name
        return None
