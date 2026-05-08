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
            name="MenuCategory",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=120)),
                ("sort_order", models.IntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("outlet", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="categories", to="outlets.outlet")),
            ],
        ),
        migrations.CreateModel(
            name="MenuItem",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=150)),
                ("description", models.TextField(blank=True)),
                ("price", models.DecimalField(decimal_places=2, max_digits=12)),
                ("image_url", models.URLField(blank=True)),
                ("is_available", models.BooleanField(default=True)),
                ("preparation_time_minutes", models.PositiveIntegerField(blank=True, null=True)),
                ("tags", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("category", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="items", to="catalog.menucategory")),
                ("outlet", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="menu_items", to="outlets.outlet")),
            ],
        ),
    ]

