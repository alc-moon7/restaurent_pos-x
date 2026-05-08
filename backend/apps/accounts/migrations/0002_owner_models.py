from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
        ("restaurants", "0002_expand_statuses"),
    ]

    operations = [
        migrations.CreateModel(
            name="OwnerAccount",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("phone", models.CharField(max_length=32, unique=True)),
                ("phone_verified_at", models.DateTimeField(blank=True, null=True)),
                ("password_hash", models.CharField(blank=True, max_length=255)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "restaurant",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="owner_account",
                        to="restaurants.restaurant",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="OwnerPhoneVerification",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("phone", models.CharField(db_index=True, max_length=32)),
                ("purpose", models.CharField(choices=[("onboarding", "Onboarding"), ("login", "Login")], default="onboarding", max_length=32)),
                ("otp_code", models.CharField(max_length=8)),
                ("expires_at", models.DateTimeField()),
                ("verified_at", models.DateTimeField(blank=True, null=True)),
                ("is_consumed", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name="OwnerSessionToken",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("token", models.CharField(max_length=64, unique=True)),
                ("expires_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="session_tokens", to="accounts.owneraccount")),
            ],
        ),
    ]
