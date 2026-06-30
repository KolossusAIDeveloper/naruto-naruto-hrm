from django.db import models
from django.contrib.auth.models import User


class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('employee_created', 'Employee Created'),
        ('employee_updated', 'Employee Updated'),
        ('employee_deleted', 'Employee Deleted'),
        ('leave_submitted', 'Leave Submitted'),
        ('leave_approved', 'Leave Approved'),
        ('leave_rejected', 'Leave Rejected'),
        ('leave_cancelled', 'Leave Cancelled'),
        ('salary_updated', 'Salary Updated'),
        ('payroll_processed', 'Payroll Processed'),
        ('announcement_created', 'Announcement Created'),
        ('attendance_marked', 'Attendance Marked'),
        ('department_created', 'Department Created'),
        ('department_updated', 'Department Updated'),
        ('department_deleted', 'Department Deleted'),
        ('other', 'Other'),
    ]

    action_type = models.CharField(max_length=50, choices=ACTION_CHOICES)
    description = models.TextField()
    performed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action_type} at {self.timestamp}"
