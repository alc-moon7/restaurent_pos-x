import uuid

from django.db import models


class Plan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.SlugField(unique=True)
    name = models.CharField(max_length=120)
    billing_provider = models.CharField(max_length=32, default="manual")
    currency = models.CharField(max_length=8, default="BDT")
    monthly_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    annual_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)


class Subscription(models.Model):
    STATUS_CHOICES = [
        ("payment_pending", "Payment Pending"),
        ("payment_succeeded", "Payment Succeeded"),
        ("setup_pending", "Setup Pending"),
        ("active", "Active"),
        ("past_due", "Past Due"),
        ("suspended", "Suspended"),
        ("cancelled", "Cancelled"),
    ]
    BILLING_CYCLE_CHOICES = [
        ("monthly", "Monthly"),
        ("annual", "Annual"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    restaurant = models.OneToOneField(
        "restaurants.Restaurant",
        on_delete=models.CASCADE,
        related_name="subscription",
        null=True,
        blank=True,
    )
    owner_account = models.ForeignKey(
        "accounts.OwnerAccount",
        on_delete=models.SET_NULL,
        related_name="subscriptions",
        null=True,
        blank=True,
    )
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default="payment_pending")
    billing_cycle = models.CharField(max_length=16, choices=BILLING_CYCLE_CHOICES, default="monthly")
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    next_billing_at = models.DateTimeField(null=True, blank=True)
    grace_ends_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    gateway_customer_id = models.CharField(max_length=120, blank=True)


class FeatureEntitlement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name="entitlements")
    code = models.CharField(max_length=64)
    value = models.CharField(max_length=120)


class Invoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name="invoices")
    status = models.CharField(max_length=24, default="draft")
    billing_cycle = models.CharField(max_length=16, choices=Subscription.BILLING_CYCLE_CHOICES, default="monthly")
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="BDT")
    due_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class PaymentAttempt(models.Model):
    STATUS_CHOICES = [
        ("initiated", "Initiated"),
        ("pending", "Pending"),
        ("succeeded", "Succeeded"),
        ("failed", "Failed"),
        ("expired", "Expired"),
        ("cancelled", "Cancelled"),
    ]
    PAYMENT_METHOD_CHOICES = [
        ("bkash", "bKash"),
        ("nagad", "Nagad"),
        ("bank", "Bank"),
        ("card", "Card"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payment_attempts")
    provider = models.CharField(max_length=32, default="sslcommerz")
    payment_method = models.CharField(max_length=16, choices=PAYMENT_METHOD_CHOICES, default="bkash")
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default="initiated")
    phone = models.CharField(max_length=32, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="BDT")
    gateway_session_id = models.CharField(max_length=120, blank=True)
    gateway_transaction_id = models.CharField(max_length=120, blank=True)
    gateway_reference = models.CharField(max_length=120, blank=True)
    provider_reference = models.CharField(max_length=120, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    setup_completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
