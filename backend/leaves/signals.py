from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import date
from .models import Leave, LEAVE_ALLOWANCES, LeaveBalance


@receiver(post_save, sender=Leave)
def handle_leave_status_change(sender, instance, created, **kwargs):
    if not created and instance.status == 'approved':
        today = date.today()
        emp = instance.employee
        if instance.start_date <= today <= instance.end_date:
            emp.employment_status = 'on_leave'
            emp.save(update_fields=['employment_status'])

        # Update leave balance
        year = instance.start_date.year
        balance, _ = LeaveBalance.objects.get_or_create(
            employee=emp,
            leave_type=instance.leave_type,
            year=year,
            defaults={'allowed_days': LEAVE_ALLOWANCES.get(instance.leave_type, 0)}
        )
        total_approved = Leave.objects.filter(
            employee=emp,
            leave_type=instance.leave_type,
            start_date__year=year,
            status='approved',
        ).aggregate(total=__import__('django.db.models', fromlist=['Sum']).Sum('total_days'))['total'] or 0
        balance.used_days = total_approved
        balance.save()

    if not created and instance.status in ['rejected', 'cancelled']:
        emp = instance.employee
        if emp.employment_status == 'on_leave':
            active_leaves = Leave.objects.filter(
                employee=emp,
                status='approved',
                start_date__lte=date.today(),
                end_date__gte=date.today(),
            ).exclude(id=instance.id).exists()
            if not active_leaves:
                emp.employment_status = 'active'
                emp.save(update_fields=['employment_status'])
