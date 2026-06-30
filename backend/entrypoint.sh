#!/bin/bash
set -e
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Create admin superuser if not exists
python manage.py shell -c "
from django.contrib.auth.models import User
from employees.models import Employee
if not User.objects.filter(username='admin').exists():
    u = User.objects.create_superuser('admin', 'admin@hrm.com', 'admin123')
    Employee.objects.create(
        first_name='Admin', last_name='User', email='admin@hrm.com',
        role='admin', employment_status='active', user=u
    )
    print('Admin user created: admin / admin123')
else:
    print('Admin user already exists')
"

exec gunicorn hrm_backend.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
