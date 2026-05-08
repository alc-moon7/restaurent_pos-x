import uuid

from django.db import models


class CustomerOrder(models.Model):
    ORDER_TYPE_CHOICES = [("dine_in", "Dine In"), ("pickup", "Pickup")]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("preparing", "Preparing"),
        ("ready", "Ready"),
        ("served", "Served"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    restaurant = models.ForeignKey("restaurants.Restaurant", on_delete=models.CASCADE, related_name="orders")
    outlet = models.ForeignKey("outlets.Outlet", on_delete=models.CASCADE, related_name="orders")
    table = models.ForeignKey("outlets.OutletTable", on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
    source = models.CharField(max_length=40, default="cloud_customer")
    order_type = models.CharField(max_length=24, choices=ORDER_TYPE_CHOICES, default="dine_in")
    customer_name = models.CharField(max_length=120, blank=True)
    customer_phone = models.CharField(max_length=40, blank=True)
    table_no = models.CharField(max_length=64, blank=True)
    note = models.TextField(blank=True)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default="pending")
    idempotency_key = models.CharField(max_length=80, blank=True, db_index=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    accepted_at = models.DateTimeField(null=True, blank=True)
    preparing_at = models.DateTimeField(null=True, blank=True)
    ready_at = models.DateTimeField(null=True, blank=True)
    served_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class CustomerOrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(CustomerOrder, on_delete=models.CASCADE, related_name="items")
    menu_item = models.ForeignKey("catalog.MenuItem", on_delete=models.PROTECT, related_name="order_items")
    name_snapshot = models.CharField(max_length=150)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    note = models.TextField(blank=True)

