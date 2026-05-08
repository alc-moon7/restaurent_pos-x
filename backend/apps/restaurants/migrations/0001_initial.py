from django.db import migrations, models
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Restaurant",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=150)),
                ("slug", models.SlugField(unique=True)),
                ("status", models.CharField(choices=[("trial", "Trial"), ("active", "Active"), ("past_due", "Past Due"), ("suspended", "Suspended"), ("cancelled", "Cancelled")], default="trial", max_length=24)),
                ("phone", models.CharField(blank=True, max_length=32)),
                ("address", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]

