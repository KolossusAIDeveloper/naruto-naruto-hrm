from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Employee


@receiver(post_save, sender=Employee)
def generate_employee_id(sender, instance, created, **kwargs):
    if created and not instance.employee_id:
        instance.employee_id = f"EMP{instance.pk:03d}"
        Employee.objects.filter(pk=instance.pk).update(employee_id=instance.employee_id)
