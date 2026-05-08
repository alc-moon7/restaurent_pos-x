import secrets
import uuid

from django.db import models


class OutletDevice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    outlet = models.ForeignKey("outlets.Outlet", on_delete=models.CASCADE, related_name="devices")
    name = models.CharField(max_length=120)
    device_type = models.CharField(max_length=40, default="outlet_agent")
    token = models.CharField(max_length=64, unique=True, default=secrets.token_urlsafe)
    is_active = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class PrinterEndpoint(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    outlet = models.ForeignKey("outlets.Outlet", on_delete=models.CASCADE, related_name="printer_endpoints")
    device = models.ForeignKey(OutletDevice, on_delete=models.SET_NULL, null=True, blank=True, related_name="printers")
    connection_type = models.CharField(max_length=24, default="network")
    address = models.CharField(max_length=255, blank=True)
    paper_width = models.PositiveIntegerField(default=80)
    auto_print_kitchen = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)


class PrintJob(models.Model):
    STATUS_CHOICES = [("queued", "Queued"), ("sent", "Sent"), ("failed", "Failed"), ("acknowledged", "Acknowledged")]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    outlet = models.ForeignKey("outlets.Outlet", on_delete=models.CASCADE, related_name="print_jobs")
    printer = models.ForeignKey(PrinterEndpoint, on_delete=models.SET_NULL, null=True, blank=True, related_name="jobs")
    order = models.ForeignKey("orders.CustomerOrder", on_delete=models.SET_NULL, null=True, blank=True, related_name="print_jobs")
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default="queued")
    attempts = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)

