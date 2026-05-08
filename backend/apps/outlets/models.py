import uuid

from django.db import models


class Outlet(models.Model):
    SYNC_CHOICES = [
        ("healthy", "Healthy"),
        ("degraded", "Degraded"),
        ("offline", "Offline"),
        ("pending", "Pending"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    restaurant = models.ForeignKey("restaurants.Restaurant", on_delete=models.CASCADE, related_name="outlets")
    name = models.CharField(max_length=140)
    slug = models.SlugField()
    timezone = models.CharField(max_length=64, default="UTC")
    currency = models.CharField(max_length=8, default="USD")
    tax_rate = models.DecimalField(max_digits=6, decimal_places=2, default=10)
    prep_time_minutes = models.PositiveIntegerField(default=25)
    customer_ordering_enabled = models.BooleanField(default=True)
    table_ordering_enabled = models.BooleanField(default=True)
    sync_status = models.CharField(max_length=24, choices=SYNC_CHOICES, default="pending")
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class OutletTable(models.Model):
    STATUS_CHOICES = [
        ("available", "Available"),
        ("occupied", "Occupied"),
        ("reserved", "Reserved"),
        ("out_of_service", "Out of Service"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    outlet = models.ForeignKey(Outlet, on_delete=models.CASCADE, related_name="tables")
    name = models.CharField(max_length=64)
    seats = models.PositiveIntegerField(default=4)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default="available")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

