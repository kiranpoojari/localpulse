from django.db import models
from django.utils import timezone
from datetime import timedelta
from apps.users.models import User


def expiry_time():
    return timezone.now() + timedelta(hours=24)


class Post(models.Model):

    POST_TYPE_CHOICES = [
        ('photo', 'Photo'),
        ('text', 'Text'),
        ('both', 'Both'),
    ]

    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    post_type = models.CharField(max_length=10, choices=POST_TYPE_CHOICES)
    content = models.TextField(blank=True)
    image = models.ImageField(upload_to='posts/', blank=True, null=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='info')

    # location of the incident
    latitude = models.FloatField()
    longitude = models.FloatField()
    city = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    state = models.CharField(max_length=100)

    is_disputed = models.BooleanField(default=False)
    expires_at = models.DateTimeField(default=expiry_time)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.author.username} — {self.severity} — {self.city}"