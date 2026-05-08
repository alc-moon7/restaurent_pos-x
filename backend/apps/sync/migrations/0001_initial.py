from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("devices", "0001_initial"),
        ("outlets", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="SyncCursor",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("version", models.BigIntegerField(default=1)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("outlet", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="sync_cursor", to="outlets.outlet")),
            ],
        ),
        migrations.CreateModel(
            name="SyncAction",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("idempotency_key", models.CharField(db_index=True, max_length=80)),
                ("action_type", models.CharField(max_length=80)),
                ("payload", models.JSONField(default=dict)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("applied", "Applied"), ("rejected", "Rejected")], default="pending", max_length=24)),
                ("synced_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("outlet", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sync_actions", to="outlets.outlet")),
                ("source_device", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="sync_actions", to="devices.outletdevice")),
            ],
        ),
        migrations.CreateModel(
            name="SyncEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("topic", models.CharField(max_length=80)),
                ("payload", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("cursor", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="sync.synccursor")),
                ("outlet", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sync_events", to="outlets.outlet")),
            ],
        ),
    ]

