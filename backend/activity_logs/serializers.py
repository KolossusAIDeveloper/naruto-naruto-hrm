from rest_framework import serializers
from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = '__all__'

    def get_performed_by_name(self, obj):
        if obj.performed_by:
            emp = getattr(obj.performed_by, 'employee', None)
            if emp:
                return emp.full_name
            return obj.performed_by.get_full_name() or obj.performed_by.username
        return 'System'
