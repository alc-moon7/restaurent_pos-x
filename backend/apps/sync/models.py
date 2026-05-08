import uuid

from django.db import models


class SyncCursor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    outlet = models.OneToOneField("outlets.Outlet", on_delete=models.CASCADE, related_name="sync_cursor")
    version = models.BigIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)


class SyncAction(models.Model):
    STATUS_CHOICES = [("pending", "Pending"), ("applied", "Applied"), ("rejected", "Rejected")]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    outlet = models.ForeignKey("outlets.Outlet", on_delete=models.CASCADE, related_name="sync_actions")
    source_device = models.ForeignKey("devices.OutletDevice", on_delete=models.SET_NULL, null=True, blank=True, related_name="sync_actions")
    idempotency_key = models.CharField(max_length=80, db_index=True)
    action_type = models.CharField(max_length=80)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default="pending")
    synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class SyncEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    outlet = models.ForeignKey("outlets.Outlet", on_delete=models.CASCADE, related_name="sync_events")
    cursor = models.ForeignKey(SyncCursor, on_delete=models.CASCADE, related_name="events")
    topic = models.CharField(max_length=80)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

