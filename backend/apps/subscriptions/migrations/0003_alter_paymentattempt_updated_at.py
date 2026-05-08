from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0002_owner_onboarding_billing"),
    ]

    operations = [
        migrations.AlterField(
            model_name="paymentattempt",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
    ]
