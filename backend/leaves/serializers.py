from rest_framework import serializers
from .models import Leave, LeaveBalance


class LeaveSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Leave
        fields = '__all__'
        read_only_fields = ['total_days', 'reviewed_by', 'status']

    def get_employee_name(self, obj):
        return obj.employee.full_name

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username
        return None


class LeaveBalanceSerializer(serializers.ModelSerializer):
    remaining_days = serializers.SerializerMethodField()
    employee_name = serializers.SerializerMethodField()
    leave_type_display = serializers.SerializerMethodField()

    class Meta:
        model = LeaveBalance
        fields = '__all__'

    def get_remaining_days(self, obj):
        return obj.remaining_days

    def get_employee_name(self, obj):
        return obj.employee.full_name

    def get_leave_type_display(self, obj):
        return obj.get_leave_type_display()
