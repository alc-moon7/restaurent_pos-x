from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("outlets", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="NotificationEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("category", models.CharField(max_length=40)),
                ("payload", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("outlet", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notification_events", to="outlets.outlet")),
            ],
        ),
    ]
