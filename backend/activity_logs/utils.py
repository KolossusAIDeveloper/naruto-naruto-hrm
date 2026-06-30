from .models import ActivityLog


def log_activity(action_type, description, user=None, metadata=None):
    try:
        ActivityLog.objects.create(
            action_type=action_type,
            description=description,
            performed_by=user,
            metadata=metadata,
        )
    except Exception:
        pass
