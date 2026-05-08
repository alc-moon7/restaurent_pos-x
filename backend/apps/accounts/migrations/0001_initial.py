from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("outlets", "0001_initial"),
        ("restaurants", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="StaffAccount",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("full_name", models.CharField(max_length=120)),
                ("role", models.CharField(default="manager", max_length=32)),
                ("pin", models.CharField(max_length=12)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("outlet", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="staff_accounts", to="outlets.outlet")),
                ("restaurant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="staff_accounts", to="restaurants.restaurant")),
            ],
        ),
        migrations.CreateModel(
            name="StaffSessionToken",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("token", models.CharField(max_length=64, unique=True)),
                ("expires_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("staff", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="session_tokens", to="accounts.staffaccount")),
            ],
        ),
    ]

