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
            name="Plan",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.SlugField(unique=True)),
                ("name", models.CharField(max_length=120)),
                ("billing_provider", models.CharField(default="manual", max_length=32)),
                ("monthly_price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("annual_price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("is_active", models.BooleanField(default=True)),
            ],
        ),
        migrations.CreateModel(
            name="Subscription",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("status", models.CharField(choices=[("trial", "Trial"), ("active", "Active"), ("past_due", "Past Due"), ("suspended", "Suspended"), ("cancelled", "Cancelled")], default="trial", max_length=24)),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("ends_at", models.DateTimeField(blank=True, null=True)),
                ("gateway_customer_id", models.CharField(blank=True, max_length=120)),
                ("plan", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="subscriptions", to="subscriptions.plan")),
                ("restaurant", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="subscription", to="restaurants.restaurant")),
            ],
        ),
        migrations.CreateModel(
            name="Invoice",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("status", models.CharField(default="draft", max_length=24)),
                ("amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("currency", models.CharField(default="USD", max_length=8)),
                ("due_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("subscription", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="invoices", to="subscriptions.subscription")),
            ],
        ),
        migrations.CreateModel(
            name="FeatureEntitlement",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(max_length=64)),
                ("value", models.CharField(max_length=120)),
                ("subscription", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="entitlements", to="subscriptions.subscription")),
            ],
        ),
        migrations.CreateModel(
            name="PaymentAttempt",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("provider", models.CharField(default="manual", max_length=32)),
                ("status", models.CharField(default="pending", max_length=24)),
                ("provider_reference", models.CharField(blank=True, max_length=120)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("invoice", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="payment_attempts", to="subscriptions.invoice")),
            ],
        ),
    ]

