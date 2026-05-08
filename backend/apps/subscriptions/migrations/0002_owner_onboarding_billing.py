from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("restaurants", "0002_expand_statuses"),
        ("accounts", "0002_owner_models"),
        ("subscriptions", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="plan",
            name="currency",
            field=models.CharField(default="BDT", max_length=8),
        ),
        migrations.AddField(
            model_name="subscription",
            name="amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="subscription",
            name="billing_cycle",
            field=models.CharField(choices=[("monthly", "Monthly"), ("annual", "Annual")], default="monthly", max_length=16),
        ),
        migrations.AddField(
            model_name="subscription",
            name="grace_ends_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="subscription",
            name="next_billing_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="subscription",
            name="owner_account",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="subscriptions", to="accounts.owneraccount"),
        ),
        migrations.AlterField(
            model_name="subscription",
            name="restaurant",
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="subscription", to="restaurants.restaurant"),
        ),
        migrations.AlterField(
            model_name="subscription",
            name="status",
            field=models.CharField(
                choices=[
                    ("payment_pending", "Payment Pending"),
                    ("payment_succeeded", "Payment Succeeded"),
                    ("setup_pending", "Setup Pending"),
                    ("active", "Active"),
                    ("past_due", "Past Due"),
                    ("suspended", "Suspended"),
                    ("cancelled", "Cancelled"),
                ],
                default="payment_pending",
                max_length=24,
            ),
        ),
        migrations.AddField(
            model_name="invoice",
            name="billing_cycle",
            field=models.CharField(choices=[("monthly", "Monthly"), ("annual", "Annual")], default="monthly", max_length=16),
        ),
        migrations.AddField(
            model_name="invoice",
            name="paid_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="invoice",
            name="currency",
            field=models.CharField(default="BDT", max_length=8),
        ),
        migrations.AddField(
            model_name="paymentattempt",
            name="amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="paymentattempt",
            name="currency",
            field=models.CharField(default="BDT", max_length=8),
        ),
        migrations.AddField(
            model_name="paymentattempt",
            name="gateway_reference",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="paymentattempt",
            name="gateway_session_id",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="paymentattempt",
            name="gateway_transaction_id",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="paymentattempt",
            name="payment_method",
            field=models.CharField(choices=[("bkash", "bKash"), ("nagad", "Nagad"), ("bank", "Bank"), ("card", "Card")], default="bkash", max_length=16),
        ),
        migrations.AddField(
            model_name="paymentattempt",
            name="phone",
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AddField(
            model_name="paymentattempt",
            name="raw_payload",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="paymentattempt",
            name="setup_completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="paymentattempt",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, null=True),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="paymentattempt",
            name="provider",
            field=models.CharField(default="sslcommerz", max_length=32),
        ),
        migrations.AlterField(
            model_name="paymentattempt",
            name="status",
            field=models.CharField(
                choices=[
                    ("initiated", "Initiated"),
                    ("pending", "Pending"),
                    ("succeeded", "Succeeded"),
                    ("failed", "Failed"),
                    ("expired", "Expired"),
                    ("cancelled", "Cancelled"),
                ],
                default="initiated",
                max_length=24,
            ),
        ),
    ]
