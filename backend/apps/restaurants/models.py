import uuid

from django.db import models


class Restaurant(models.Model):
    STATUS_CHOICES = [
        ("trial", "Trial"),
        ("payment_pending", "Payment Pending"),
        ("payment_succeeded", "Payment Succeeded"),
        ("setup_pending", "Setup Pending"),
        ("active", "Active"),
        ("past_due", "Past Due"),
        ("suspended", "Suspended"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    slug = models.SlugField(unique=True)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default="trial")
    phone = models.CharField(max_length=32, blank=True)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
