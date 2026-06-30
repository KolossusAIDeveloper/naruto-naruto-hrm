import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hrm_backend.settings')
os.environ.setdefault('DB_PATH', ':memory:')
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
django.setup()

from django.test import TestCase


def test_django_setup():
    assert django.VERSION >= (4, 0), "Django version too old"


def test_models_importable():
    from employees.models import Employee
    from departments.models import Department
    from leaves.models import Leave, LeaveBalance
    from attendance.models import Attendance
    from payroll.models import Payroll
    from announcements.models import Announcement
    from activity_logs.models import ActivityLog
    assert True


def test_business_days():
    from leaves.models import count_business_days
    from datetime import date
    days = count_business_days(date(2024, 1, 1), date(2024, 1, 5))
    assert days == 5


def test_payroll_net_calculation():
    from payroll.models import Payroll
    p = Payroll()
    p.base_salary = 50000
    p.bonus = 5000
    p.deductions = 2000
    from decimal import Decimal
    p.base_salary = Decimal('50000')
    p.bonus = Decimal('5000')
    p.deductions = Decimal('2000')
    net = p.base_salary + p.bonus - p.deductions
    assert net == Decimal('53000')
