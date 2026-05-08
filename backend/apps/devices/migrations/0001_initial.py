from django.db import migrations, models
import django.db.models.deletion
import secrets
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("orders", "0001_initial"),
        ("outlets", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="OutletDevice",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=120)),
                ("device_type", models.CharField(default="outlet_agent", max_length=40)),
                ("token", models.CharField(default=secrets.token_urlsafe, max_length=64, unique=True)),
                ("is_active", models.BooleanField(default=True)),
                ("last_seen_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("outlet", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="devices", to="outlets.outlet")),
            ],
        ),
        migrations.CreateModel(
            name="PrinterEndpoint",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("connection_type", models.CharField(default="network", max_length=24)),
                ("address", models.CharField(blank=True, max_length=255)),
                ("paper_width", models.PositiveIntegerField(default=80)),
                ("auto_print_kitchen", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("device", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="printers", to="devices.outletdevice")),
                ("outlet", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="printer_endpoints", to="outlets.outlet")),
            ],
        ),
        migrations.CreateModel(
            name="PrintJob",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("payload", models.JSONField(default=dict)),
                ("status", models.CharField(choices=[("queued", "Queued"), ("sent", "Sent"), ("failed", "Failed"), ("acknowledged", "Acknowledged")], default="queued", max_length=24)),
                ("attempts", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("acknowledged_at", models.DateTimeField(blank=True, null=True)),
                ("order", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="print_jobs", to="orders.customerorder")),
                ("outlet", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="print_jobs", to="outlets.outlet")),
                ("printer", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="jobs", to="devices.printerendpoint")),
            ],
        ),
    ]
