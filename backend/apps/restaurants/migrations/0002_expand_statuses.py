from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("restaurants", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="restaurant",
            name="status",
            field=models.CharField(
                choices=[
                    ("trial", "Trial"),
                    ("payment_pending", "Payment Pending"),
                    ("payment_succeeded", "Payment Succeeded"),
                    ("setup_pending", "Setup Pending"),
                    ("active", "Active"),
                    ("past_due", "Past Due"),
                    ("suspended", "Suspended"),
                    ("cancelled", "Cancelled"),
                ],
                default="trial",
                max_length=24,
            ),
        ),
    ]
