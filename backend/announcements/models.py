from django.db import models
from django.contrib.auth.models import User


class Announcement(models.Model):
    PRIORITY_CHOICES = [
        ('normal', 'Normal'), ('important', 'Important'), ('urgent', 'Urgent')
    ]

    title = models.CharField(max_length=200)
    body = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    is_archived = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
