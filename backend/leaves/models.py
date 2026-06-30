from django.db import models
from django.contrib.auth.models import User
from datetime import timedelta


def count_business_days(start, end):
    count = 0
    current = start
    while current <= end:
        if current.weekday() < 5:
            count += 1
        current += timedelta(days=1)
    return count


LEAVE_TYPE_CHOICES = [
    ('sick', 'Sick Leave'), ('casual', 'Casual Leave'), ('annual', 'Annual Leave'),
    ('maternity', 'Maternity Leave'), ('paternity', 'Paternity Leave'), ('unpaid', 'Unpaid Leave'),
]

LEAVE_ALLOWANCES = {
    'sick': 12, 'casual': 12, 'annual': 15,
    'maternity': 90, 'paternity': 10, 'unpaid': 30,
}


class Leave(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'), ('approved', 'Approved'),
        ('rejected', 'Rejected'), ('cancelled', 'Cancelled'),
    ]

    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.CASCADE, related_name='leaves'
    )
    leave_type = models.CharField(max_length=20, choices=LEAVE_TYPE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    total_days = models.IntegerField(default=0)
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_leaves'
    )
    review_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.start_date and self.end_date:
            self.total_days = count_business_days(self.start_date, self.end_date)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee.full_name} - {self.leave_type} ({self.status})"


class LeaveBalance(models.Model):
    employee = models.ForeignKey(
        'employees.Employee', on_delete=models.CASCADE, related_name='leave_balances'
    )
    leave_type = models.CharField(max_length=20, choices=LEAVE_TYPE_CHOICES)
    year = models.IntegerField()
    allowed_days = models.IntegerField(default=0)
    used_days = models.IntegerField(default=0)

    class Meta:
        unique_together = ['employee', 'leave_type', 'year']

    @property
    def remaining_days(self):
        return max(0, self.allowed_days - self.used_days)
