from django.db import models
from django.contrib.auth.models import User


class Employee(models.Model):
    GENDER_CHOICES = [('male', 'Male'), ('female', 'Female'), ('other', 'Other')]
    ROLE_CHOICES = [('admin', 'Admin'), ('manager', 'Manager'), ('employee', 'Employee')]
    EMPLOYMENT_TYPE_CHOICES = [
        ('full_time', 'Full Time'), ('part_time', 'Part Time'), ('contract', 'Contract')
    ]
    STATUS_CHOICES = [
        ('active', 'Active'), ('on_leave', 'On Leave'),
        ('resigned', 'Resigned'), ('terminated', 'Terminated')
    ]

    employee_id = models.CharField(max_length=20, unique=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    address = models.TextField(blank=True)
    profile_photo = models.FileField(upload_to='profile_photos/', null=True, blank=True)
    department = models.ForeignKey(
        'departments.Department', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='employees'
    )
    job_title = models.CharField(max_length=100, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    employment_type = models.CharField(
        max_length=20, choices=EMPLOYMENT_TYPE_CHOICES, default='full_time'
    )
    employment_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='active'
    )
    join_date = models.DateField(null=True, blank=True)
    base_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    user = models.OneToOneField(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='employee'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_id})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def save(self, *args, **kwargs):
        if not self.employee_id:
            last = Employee.objects.order_by('-id').first()
            next_id = (last.id + 1) if last else 1
            self.employee_id = f"EMP{next_id:04d}"
        super().save(*args, **kwargs)
