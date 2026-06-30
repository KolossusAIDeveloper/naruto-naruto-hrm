from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from .models import Employee


class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = '__all__'
        extra_kwargs = {'employee_id': {'read_only': True}}

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None

    def get_full_name(self, obj):
        return obj.full_name

    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_photo.url)
            return obj.profile_photo.url
        return None


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        emp = getattr(user, 'employee', None)
        data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': emp.full_name if emp else user.get_full_name() or user.username,
            'role': emp.role if emp else 'employee',
            'employee_id': emp.employee_id if emp else None,
            'profile_photo': emp.profile_photo.url if emp and emp.profile_photo else None,
        }
        return data
