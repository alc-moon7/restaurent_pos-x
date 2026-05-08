from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("restaurants", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Outlet",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=140)),
                ("slug", models.SlugField()),
                ("timezone", models.CharField(default="UTC", max_length=64)),
                ("currency", models.CharField(default="USD", max_length=8)),
                ("tax_rate", models.DecimalField(decimal_places=2, default=10, max_digits=6)),
                ("prep_time_minutes", models.PositiveIntegerField(default=25)),
                ("customer_ordering_enabled", models.BooleanField(default=True)),
                ("table_ordering_enabled", models.BooleanField(default=True)),
                ("sync_status", models.CharField(choices=[("healthy", "Healthy"), ("degraded", "Degraded"), ("offline", "Offline"), ("pending", "Pending")], default="pending", max_length=24)),
                ("last_synced_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("restaurant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="outlets", to="restaurants.restaurant")),
            ],
        ),
        migrations.CreateModel(
            name="OutletTable",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=64)),
                ("seats", models.PositiveIntegerField(default=4)),
                ("status", models.CharField(choices=[("available", "Available"), ("occupied", "Occupied"), ("reserved", "Reserved"), ("out_of_service", "Out of Service")], default="available", max_length=24)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("outlet", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="tables", to="outlets.outlet")),
            ],
        ),
    ]

