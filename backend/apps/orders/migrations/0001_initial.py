from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("catalog", "0001_initial"),
        ("outlets", "0001_initial"),
        ("restaurants", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="CustomerOrder",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("source", models.CharField(default="cloud_customer", max_length=40)),
                ("order_type", models.CharField(choices=[("dine_in", "Dine In"), ("pickup", "Pickup")], default="dine_in", max_length=24)),
                ("customer_name", models.CharField(blank=True, max_length=120)),
                ("customer_phone", models.CharField(blank=True, max_length=40)),
                ("table_no", models.CharField(blank=True, max_length=64)),
                ("note", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("accepted", "Accepted"), ("preparing", "Preparing"), ("ready", "Ready"), ("served", "Served"), ("cancelled", "Cancelled")], default="pending", max_length=24)),
                ("idempotency_key", models.CharField(blank=True, db_index=True, max_length=80)),
                ("subtotal", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("tax", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("total", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("accepted_at", models.DateTimeField(blank=True, null=True)),
                ("preparing_at", models.DateTimeField(blank=True, null=True)),
                ("ready_at", models.DateTimeField(blank=True, null=True)),
                ("served_at", models.DateTimeField(blank=True, null=True)),
                ("cancelled_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("outlet", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="orders", to="outlets.outlet")),
                ("restaurant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="orders", to="restaurants.restaurant")),
                ("table", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="orders", to="outlets.outlettable")),
            ],
        ),
        migrations.CreateModel(
            name="CustomerOrderItem",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name_snapshot", models.CharField(max_length=150)),
                ("unit_price", models.DecimalField(decimal_places=2, max_digits=12)),
                ("quantity", models.PositiveIntegerField(default=1)),
                ("note", models.TextField(blank=True)),
                ("menu_item", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="order_items", to="catalog.menuitem")),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="orders.customerorder")),
            ],
        ),
    ]

