import secrets
import uuid
from datetime import timedelta

from django.db import models
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone


class OwnerAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    restaurant = models.OneToOneField(
        "restaurants.Restaurant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owner_account",
    )
    phone = models.CharField(max_length=32, unique=True)
    phone_verified_at = models.DateTimeField(null=True, blank=True)
    password_hash = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def set_password(self, raw_password: str) -> None:
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        if not self.password_hash:
            return False
        return check_password(raw_password, self.password_hash)


class OwnerPhoneVerification(models.Model):
    PURPOSE_CHOICES = [
        ("onboarding", "Onboarding"),
        ("login", "Login"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=32, db_index=True)
    purpose = models.CharField(max_length=32, choices=PURPOSE_CHOICES, default="onboarding")
    otp_code = models.CharField(max_length=8)
    expires_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)
    is_consumed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_valid(self) -> bool:
        return not self.is_consumed and self.expires_at > timezone.now()


class StaffAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    restaurant = models.ForeignKey("restaurants.Restaurant", on_delete=models.CASCADE, related_name="staff_accounts")
    outlet = models.ForeignKey("outlets.Outlet", on_delete=models.SET_NULL, null=True, blank=True, related_name="staff_accounts")
    full_name = models.CharField(max_length=120)
    role = models.CharField(max_length=32, default="manager")
    pin = models.CharField(max_length=12)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class StaffSessionToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(StaffAccount, on_delete=models.CASCADE, related_name="session_tokens")
    token = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    @classmethod
    def issue(cls, staff: StaffAccount, hours: int = 24) -> "StaffSessionToken":
        return cls.objects.create(
            staff=staff,
            token=secrets.token_urlsafe(32),
            expires_at=timezone.now() + timedelta(hours=hours),
        )


class OwnerSessionToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(OwnerAccount, on_delete=models.CASCADE, related_name="session_tokens")
    token = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    @classmethod
    def issue(cls, owner: OwnerAccount, hours: int = 24) -> "OwnerSessionToken":
        return cls.objects.create(
            owner=owner,
            token=secrets.token_urlsafe(32),
            expires_at=timezone.now() + timedelta(hours=hours),
        )
