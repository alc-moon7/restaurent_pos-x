import json
import os
import random
from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Sum
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.utils.text import slugify
from django.views.decorators.csrf import csrf_exempt

from apps.accounts.models import (
    OwnerAccount,
    OwnerPhoneVerification,
    OwnerSessionToken,
    StaffAccount,
    StaffSessionToken,
)
from apps.catalog.models import MenuCategory, MenuItem
from apps.devices.models import OutletDevice, PrinterEndpoint, PrintJob
from apps.notifications.models import NotificationEvent
from apps.orders.models import CustomerOrder, CustomerOrderItem
from apps.outlets.models import Outlet, OutletTable
from apps.restaurants.models import Restaurant
from apps.subscriptions.gateway import SUPPORTED_PAYMENT_METHODS, build_payment_session, normalize_payment_status
from apps.subscriptions.models import FeatureEntitlement, Invoice, PaymentAttempt, Plan, Subscription
from apps.sync.models import SyncAction, SyncCursor, SyncEvent


def _json(request: HttpRequest) -> dict[str, Any]:
    if not request.body:
        return {}
    return json.loads(request.body.decode("utf8"))


def _bad_request(message: str, *, status: int = 400) -> JsonResponse:
    return JsonResponse({"detail": message}, status=status)


def _unauthorized(message: str = "Unauthorized") -> JsonResponse:
    return JsonResponse({"detail": message}, status=401)


def _normalize_phone(phone: str) -> str:
    cleaned = "".join(ch for ch in str(phone or "") if ch.isdigit() or ch == "+")
    return cleaned.strip()


def _serialize_subscription(subscription: Subscription | None) -> dict[str, Any]:
    if not subscription:
        return {
            "status": "payment_pending",
            "billingCycle": "monthly",
            "nextBillingAt": None,
            "graceEndsAt": None,
            "planName": "Starter",
            "amount": 0,
            "currency": "BDT",
        }
    return {
        "status": subscription.status,
        "billingCycle": subscription.billing_cycle,
        "nextBillingAt": subscription.next_billing_at.isoformat() if subscription.next_billing_at else None,
        "graceEndsAt": subscription.grace_ends_at.isoformat() if subscription.grace_ends_at else None,
        "planName": subscription.plan.name,
        "amount": float(subscription.amount),
        "currency": subscription.plan.currency,
    }


def _serialize_context(staff: StaffAccount) -> dict[str, Any]:
    subscription = getattr(staff.restaurant, "subscription", None)
    outlet = staff.outlet or staff.restaurant.outlets.first()
    return {
        "role": staff.role,
        "restaurant": {
            "id": str(staff.restaurant_id),
            "name": staff.restaurant.name,
            "status": staff.restaurant.status,
        },
        "outlet": {
            "id": str(outlet.id) if outlet else "",
            "name": outlet.name if outlet else "Main Outlet",
        },
        "subscription": _serialize_subscription(subscription),
        "sync": {
            "status": outlet.sync_status if outlet else "pending",
            "lastSyncedAt": outlet.last_synced_at.isoformat() if outlet and outlet.last_synced_at else None,
        },
        "menuDomain": "",
    }


def _serialize_item(item: MenuItem) -> dict[str, Any]:
    return {
        "id": str(item.id),
        "categoryId": str(item.category_id) if item.category_id else None,
        "name": item.name,
        "description": item.description or None,
        "price": float(item.price),
        "imageUrl": item.image_url or None,
        "isAvailable": item.is_available,
        "preparationTimeMinutes": item.preparation_time_minutes,
        "tags": item.tags,
    }


def _serialize_menu(outlet: Outlet) -> list[dict[str, Any]]:
    categories = MenuCategory.objects.filter(outlet=outlet).prefetch_related("items").order_by("sort_order", "name")
    return [
        {
            "id": str(category.id),
            "name": category.name,
            "sortOrder": category.sort_order,
            "items": [_serialize_item(item) for item in category.items.all().order_by("name")],
        }
        for category in categories
    ]


def _serialize_table(table: OutletTable) -> dict[str, Any]:
    return {
        "id": str(table.id),
        "name": table.name,
        "seats": table.seats,
        "status": table.status,
    }


def _serialize_public_outlet(outlet: Outlet, *, table: OutletTable | None = None) -> dict[str, Any]:
    categories = _serialize_menu(outlet)
    for category in categories:
        category["items"] = [item for item in category["items"] if item["isAvailable"]]
    return {
        "restaurant": {
            "id": str(outlet.restaurant_id),
            "name": outlet.restaurant.name,
        },
        "outlet": {
            "id": str(outlet.id),
            "name": outlet.name,
            "currency": outlet.currency,
            "taxRate": float(outlet.tax_rate),
            "prepTimeMinutes": outlet.prep_time_minutes,
            "customerOrderingEnabled": outlet.customer_ordering_enabled,
            "tableOrderingEnabled": outlet.table_ordering_enabled,
        },
        "table": _serialize_table(table) if table else None,
        "menu": categories,
    }


def _serialize_order(order: CustomerOrder) -> dict[str, Any]:
    return {
        "id": str(order.id),
        "tableId": str(order.table_id) if order.table_id else None,
        "tableNo": order.table_no or (order.table.name if order.table else None),
        "orderType": order.order_type,
        "customerName": order.customer_name or None,
        "status": order.status,
        "note": order.note or None,
        "subtotal": float(order.subtotal),
        "tax": float(order.tax),
        "total": float(order.total),
        "createdAt": order.created_at.isoformat(),
        "updatedAt": order.updated_at.isoformat(),
        "acceptedAt": order.accepted_at.isoformat() if order.accepted_at else None,
        "preparingAt": order.preparing_at.isoformat() if order.preparing_at else None,
        "readyAt": order.ready_at.isoformat() if order.ready_at else None,
        "servedAt": order.served_at.isoformat() if order.served_at else None,
        "cancelledAt": order.cancelled_at.isoformat() if order.cancelled_at else None,
        "items": [
            {
                "id": str(item.id),
                "orderId": str(order.id),
                "menuItemId": str(item.menu_item_id),
                "nameSnapshot": item.name_snapshot,
                "unitPrice": float(item.unit_price),
                "quantity": item.quantity,
                "notes": item.note or None,
            }
            for item in order.items.all()
        ],
    }


def _staff_from_request(request: HttpRequest) -> StaffAccount | None:
    auth = request.headers.get("Authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    session = StaffSessionToken.objects.filter(
        token=token,
        expires_at__gt=timezone.now(),
    ).select_related("staff__restaurant", "staff__outlet").first()
    return session.staff if session else None


def _require_staff(request: HttpRequest) -> StaffAccount | JsonResponse:
    staff = _staff_from_request(request)
    if not staff or not staff.is_active:
        return _unauthorized()
    return staff


def _outlet_from_staff(staff: StaffAccount) -> Outlet:
    outlet = staff.outlet or staff.restaurant.outlets.first()
    if not outlet:
        raise Outlet.DoesNotExist("No outlet configured.")
    return outlet


def _generate_otp() -> str:
    return f"{random.randint(100000, 999999)}"


def _unique_slug(model, source: str, *, field_name: str = "slug") -> str:
    base = slugify(source)[:40] or "restaurant"
    candidate = base
    counter = 2
    while model.objects.filter(**{field_name: candidate}).exists():
        candidate = f"{base}-{counter}"
        counter += 1
    return candidate


def _get_or_create_default_plan() -> Plan:
    plan, _ = Plan.objects.get_or_create(
        code="cloud-starter",
        defaults={
            "name": "Cloud Starter",
            "billing_provider": "sslcommerz",
            "currency": "BDT",
            "monthly_price": Decimal("800.00"),
            "annual_price": Decimal("8000.00"),
            "is_active": True,
        },
    )
    return plan


def _amount_for_cycle(plan: Plan, billing_cycle: str) -> Decimal:
    return plan.annual_price if billing_cycle == "annual" else plan.monthly_price


def _billing_dates(billing_cycle: str) -> tuple[timezone.datetime, timezone.datetime]:
    now = timezone.now()
    next_billing = now + timedelta(days=365 if billing_cycle == "annual" else 30)
    grace_ends = next_billing + timedelta(days=7)
    return next_billing, grace_ends


def _seed_default_entitlements(subscription: Subscription) -> None:
    defaults = {
        "max_outlets": "1",
        "customer_ordering_enabled": "true",
        "mobile_staff_access": "true",
        "reporting_enabled": "true",
        "printer_device_limit": "2",
    }
    for code, value in defaults.items():
        FeatureEntitlement.objects.get_or_create(subscription=subscription, code=code, defaults={"value": value})


def _find_verified_owner(phone: str) -> OwnerAccount | None:
    normalized_phone = _normalize_phone(phone)
    return OwnerAccount.objects.filter(phone=normalized_phone, phone_verified_at__isnull=False, is_active=True).first()


def _find_or_create_owner_staff(owner: OwnerAccount) -> StaffAccount | None:
    if not owner.restaurant_id:
        return None
    outlet = owner.restaurant.outlets.first()
    if not outlet:
        return None
    staff = StaffAccount.objects.filter(
        restaurant=owner.restaurant,
        role__in=["owner", "manager"],
        is_active=True,
    ).order_by("created_at").first()
    return staff


def _serialize_owner_auth_response(owner: OwnerAccount, *, staff: StaffAccount | None = None) -> dict[str, Any]:
    staff_token = StaffSessionToken.issue(staff) if staff else None
    owner_token = OwnerSessionToken.issue(owner)
    payload = {
        "ownerAccessToken": owner_token.token,
        "owner": {
            "id": str(owner.id),
            "phone": owner.phone,
            "hasRestaurant": bool(owner.restaurant_id),
        },
        "subscription": _serialize_subscription(owner.subscriptions.order_by("-started_at").select_related("plan").first()),
    }
    if staff and owner.restaurant_id:
        payload.update(_serialize_context(staff))
        payload["accessToken"] = staff_token.token if staff_token else None
    return payload


def _should_seed_demo_data() -> bool:
    return os.environ.get("POS_ENABLE_DEMO_DATA", "").lower() in {"1", "true", "yes"}


def _ensure_demo_data() -> None:
    if not _should_seed_demo_data() or StaffAccount.objects.exists():
        return

    plan = _get_or_create_default_plan()
    demo_restaurant, _ = Restaurant.objects.get_or_create(
        slug="bistro-aurora",
        defaults={
            "name": "Bistro Aurora",
            "status": "active",
            "phone": "+8801700000000",
            "address": "123 Demo Street",
        },
    )
    owner, _ = OwnerAccount.objects.get_or_create(
        phone="+8801700000000",
        defaults={"restaurant": demo_restaurant, "phone_verified_at": timezone.now(), "is_active": True},
    )
    if not owner.password_hash:
        owner.set_password("password123")
        owner.restaurant = demo_restaurant
        owner.phone_verified_at = owner.phone_verified_at or timezone.now()
        owner.save(update_fields=["password_hash", "restaurant", "phone_verified_at", "updated_at"])
    demo_outlet, _ = Outlet.objects.get_or_create(
        restaurant=demo_restaurant,
        slug="main-outlet",
        defaults={
            "name": "Main Outlet",
            "currency": "BDT",
            "tax_rate": Decimal("10"),
            "prep_time_minutes": 25,
            "customer_ordering_enabled": True,
            "table_ordering_enabled": True,
            "sync_status": "healthy",
            "last_synced_at": timezone.now(),
        },
    )
    subscription, _ = Subscription.objects.get_or_create(
        owner_account=owner,
        restaurant=demo_restaurant,
        plan=plan,
        defaults={
            "status": "active",
            "billing_cycle": "monthly",
            "amount": plan.monthly_price,
            "next_billing_at": timezone.now() + timedelta(days=30),
            "grace_ends_at": timezone.now() + timedelta(days=37),
        },
    )
    _seed_default_entitlements(subscription)
    StaffAccount.objects.get_or_create(
        restaurant=demo_restaurant,
        pin="1234",
        defaults={
            "outlet": demo_outlet,
            "full_name": "Demo Owner",
            "role": "owner",
            "is_active": True,
        },
    )
    for table_name, seats in [("A1", 4), ("A2", 4), ("B1", 2)]:
        OutletTable.objects.get_or_create(
            outlet=demo_outlet,
            name=table_name,
            defaults={"seats": seats, "status": "available"},
        )
    mains, _ = MenuCategory.objects.get_or_create(outlet=demo_outlet, name="Mains", defaults={"sort_order": 1})
    drinks, _ = MenuCategory.objects.get_or_create(outlet=demo_outlet, name="Drinks", defaults={"sort_order": 2})
    for category, name, description, price in [
        (mains, "Classic Burger", "Beef patty with fries", Decimal("12.50")),
        (mains, "Chicken Alfredo", "Creamy pasta with grilled chicken", Decimal("14.00")),
        (drinks, "Lemon Mint", "Fresh house cooler", Decimal("4.50")),
    ]:
        MenuItem.objects.get_or_create(
            outlet=demo_outlet,
            category=category,
            name=name,
            defaults={"description": description, "price": price, "is_available": True},
        )
    device, _ = OutletDevice.objects.get_or_create(
        outlet=demo_outlet,
        name="Local Demo Agent",
        defaults={"device_type": "outlet_agent", "is_active": True, "last_seen_at": timezone.now()},
    )
    PrinterEndpoint.objects.get_or_create(
        outlet=demo_outlet,
        device=device,
        defaults={
            "connection_type": "network",
            "address": "127.0.0.1:9100",
            "paper_width": 80,
            "auto_print_kitchen": True,
        },
    )
    SyncCursor.objects.get_or_create(outlet=demo_outlet)


def health(_request: HttpRequest) -> JsonResponse:
    _get_or_create_default_plan()
    return JsonResponse(
        {
            "status": "ok",
            "serverTime": timezone.now().isoformat(),
            "realtime": {"mode": "polling_first"},
            "payments": {"provider": "sslcommerz", "methods": list(SUPPORTED_PAYMENT_METHODS)},
        }
    )


def owner_plan_list(_request: HttpRequest) -> JsonResponse:
    plan = _get_or_create_default_plan()
    return JsonResponse(
        [
            {
                "code": plan.code,
                "name": plan.name,
                "currency": plan.currency,
                "monthlyPrice": float(plan.monthly_price),
                "annualPrice": float(plan.annual_price),
                "billingProvider": plan.billing_provider,
                "paymentMethods": list(SUPPORTED_PAYMENT_METHODS),
                "annualSavings": float((plan.monthly_price * Decimal("12")) - plan.annual_price),
            }
        ],
        safe=False,
    )


@csrf_exempt
def owner_request_otp(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return _bad_request("Method not allowed", status=405)
    body = _json(request)
    phone = _normalize_phone(body.get("phone", ""))
    if len(phone) < 10:
        return _bad_request("Enter a valid phone number.")
    OwnerPhoneVerification.objects.filter(phone=phone, is_consumed=False, verified_at__isnull=True).update(is_consumed=True)
    otp_code = _generate_otp()
    verification = OwnerPhoneVerification.objects.create(
        phone=phone,
        purpose="onboarding",
        otp_code=otp_code,
        expires_at=timezone.now() + timedelta(minutes=10),
    )
    payload: dict[str, Any] = {
        "verificationId": str(verification.id),
        "phone": phone,
        "expiresAt": verification.expires_at.isoformat(),
        "delivery": "sms_stub",
    }
    if settings.DEBUG:
        payload["devOtpCode"] = otp_code
    return JsonResponse(payload, status=201)


@csrf_exempt
def owner_verify_otp(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return _bad_request("Method not allowed", status=405)
    body = _json(request)
    phone = _normalize_phone(body.get("phone", ""))
    otp = str(body.get("otp", "")).strip()
    verification = OwnerPhoneVerification.objects.filter(
        phone=phone,
        purpose="onboarding",
        is_consumed=False,
    ).order_by("-created_at").first()
    if not verification or not verification.is_valid or verification.otp_code != otp:
        return _bad_request("Invalid or expired OTP.")

    verification.verified_at = timezone.now()
    verification.is_consumed = True
    verification.save(update_fields=["verified_at", "is_consumed"])

    owner, _ = OwnerAccount.objects.get_or_create(phone=phone, defaults={"is_active": True})
    owner.phone_verified_at = timezone.now()
    owner.save(update_fields=["phone_verified_at", "updated_at"])

    return JsonResponse(
        {
            "verified": True,
            "ownerId": str(owner.id),
            "hasRestaurant": bool(owner.restaurant_id),
            "requiresSetup": not bool(owner.restaurant_id),
        }
    )


@csrf_exempt
def owner_payment_session(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return _bad_request("Method not allowed", status=405)
    body = _json(request)
    phone = _normalize_phone(body.get("phone", ""))
    plan_code = body.get("planCode", "cloud-starter")
    billing_cycle = body.get("billingCycle", "monthly")
    payment_method = body.get("paymentMethod", "bkash")

    if billing_cycle not in {"monthly", "annual"}:
        return _bad_request("Unsupported billing cycle.")
    if payment_method not in SUPPORTED_PAYMENT_METHODS:
        return _bad_request("Unsupported payment method.")

    owner = _find_verified_owner(phone)
    if not owner:
        return _unauthorized("Phone verification required before payment.")

    plan = Plan.objects.filter(code=plan_code, is_active=True).first() or _get_or_create_default_plan()
    amount = _amount_for_cycle(plan, billing_cycle)
    next_billing_at, grace_ends_at = _billing_dates(billing_cycle)

    with transaction.atomic():
        subscription = Subscription.objects.create(
            owner_account=owner,
            plan=plan,
            status="payment_pending",
            billing_cycle=billing_cycle,
            amount=amount,
            next_billing_at=next_billing_at,
            grace_ends_at=grace_ends_at,
        )
        invoice = Invoice.objects.create(
            subscription=subscription,
            status="pending",
            billing_cycle=billing_cycle,
            amount=amount,
            currency=plan.currency,
            due_at=timezone.now() + timedelta(minutes=30),
        )
        gateway_payload = build_payment_session(
            payment_method=payment_method,
            amount=f"{amount:.2f}",
            currency=plan.currency,
            phone=phone,
        )
        payment = PaymentAttempt.objects.create(
            invoice=invoice,
            provider=gateway_payload["provider"],
            payment_method=payment_method,
            status="pending",
            phone=phone,
            amount=amount,
            currency=plan.currency,
            gateway_session_id=gateway_payload["sessionId"],
            gateway_transaction_id=gateway_payload["transactionId"],
            gateway_reference=gateway_payload["reference"],
            provider_reference=gateway_payload["reference"],
            raw_payload=gateway_payload,
        )

    return JsonResponse(
        {
            "paymentAttemptId": str(payment.id),
            "paymentSessionId": payment.gateway_session_id,
            "status": payment.status,
            "checkoutUrl": gateway_payload["checkoutUrl"],
            "amount": float(amount),
            "currency": plan.currency,
            "billingCycle": billing_cycle,
            "planName": plan.name,
            "subscriptionStatus": subscription.status,
        },
        status=201,
    )


@csrf_exempt
def owner_payment_callback(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return _bad_request("Method not allowed", status=405)
    body = _json(request)
    payment = PaymentAttempt.objects.select_related("invoice__subscription__plan", "invoice__subscription__owner_account").filter(
        gateway_session_id=body.get("paymentSessionId", "")
    ).first()
    if not payment:
        return _bad_request("Payment session not found.", status=404)

    normalized_status = normalize_payment_status(body.get("status", "pending"))
    payment.status = normalized_status
    payment.raw_payload = {**payment.raw_payload, **body}
    if body.get("gatewayTransactionId"):
        payment.gateway_transaction_id = str(body["gatewayTransactionId"])
    payment.save(update_fields=["status", "raw_payload", "gateway_transaction_id", "updated_at"])

    invoice = payment.invoice
    subscription = invoice.subscription
    if normalized_status == "succeeded":
        invoice.status = "paid"
        invoice.paid_at = timezone.now()
        subscription.status = "setup_pending" if not subscription.restaurant_id else "active"
    elif normalized_status in {"failed", "expired", "cancelled"}:
        invoice.status = normalized_status
        subscription.status = "payment_pending"
    else:
        invoice.status = "pending"
        subscription.status = "payment_pending"
    invoice.save(update_fields=["status", "paid_at"])
    subscription.save(update_fields=["status"])

    return JsonResponse(
        {
            "paymentAttemptId": str(payment.id),
            "paymentSessionId": payment.gateway_session_id,
            "status": payment.status,
            "subscriptionStatus": subscription.status,
            "setupRequired": normalized_status == "succeeded" and not subscription.restaurant_id,
        }
    )


def owner_payment_status(request: HttpRequest) -> JsonResponse:
    payment_attempt_id = request.GET.get("paymentAttemptId", "")
    payment_session_id = request.GET.get("paymentSessionId", "")
    filters: dict[str, Any] = {}
    if payment_attempt_id:
        filters["id"] = payment_attempt_id
    elif payment_session_id:
        filters["gateway_session_id"] = payment_session_id
    else:
        return _bad_request("Missing paymentAttemptId or paymentSessionId.")

    payment = PaymentAttempt.objects.select_related("invoice__subscription__plan").filter(**filters).first()
    if not payment:
        return _bad_request("Payment session not found.", status=404)

    subscription = payment.invoice.subscription
    return JsonResponse(
        {
            "paymentAttemptId": str(payment.id),
            "paymentSessionId": payment.gateway_session_id,
            "status": payment.status,
            "paymentMethod": payment.payment_method,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "subscription": _serialize_subscription(subscription),
            "setupCompleted": payment.setup_completed_at.isoformat() if payment.setup_completed_at else None,
        }
    )


@csrf_exempt
def owner_setup(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return _bad_request("Method not allowed", status=405)
    body = _json(request)
    phone = _normalize_phone(body.get("phone", ""))
    owner_password = str(body.get("ownerPassword", "")).strip()
    restaurant_name = str(body.get("restaurantName", "")).strip()
    outlet_name = str(body.get("firstOutletName", "")).strip()
    admin_pin = str(body.get("adminPin", "")).strip()
    payment_session_id = str(body.get("paymentSessionId", "")).strip()

    if not all([phone, owner_password, restaurant_name, outlet_name, admin_pin, payment_session_id]):
        return _bad_request("Missing required onboarding fields.")
    if len(admin_pin) < 4:
        return _bad_request("Admin PIN must be at least 4 digits.")
    if len(owner_password) < 8:
        return _bad_request("Owner password must be at least 8 characters.")

    owner = _find_verified_owner(phone)
    if not owner:
        return _unauthorized("Phone verification required before setup.")

    payment = PaymentAttempt.objects.select_related("invoice__subscription__plan").filter(
        gateway_session_id=payment_session_id,
        phone=phone,
        status="succeeded",
    ).first()
    if not payment:
        return _bad_request("Confirmed payment required before setup.", status=409)

    existing_staff = _find_or_create_owner_staff(owner)
    if payment.setup_completed_at and owner.restaurant_id and existing_staff:
        payload = _serialize_owner_auth_response(owner, staff=existing_staff)
        return JsonResponse({**payload, "alreadyProvisioned": True})

    subscription = payment.invoice.subscription
    with transaction.atomic():
        restaurant = owner.restaurant
        if not restaurant:
            restaurant = Restaurant.objects.create(
                name=restaurant_name,
                slug=_unique_slug(Restaurant, restaurant_name),
                status="active",
                phone=phone,
            )
            owner.restaurant = restaurant
            owner.set_password(owner_password)
            owner.save(update_fields=["restaurant", "password_hash", "updated_at"])
        elif not owner.password_hash:
            owner.set_password(owner_password)
            owner.save(update_fields=["password_hash", "updated_at"])

        outlet = restaurant.outlets.first()
        if not outlet:
            outlet = Outlet.objects.create(
                restaurant=restaurant,
                name=outlet_name,
                slug=_unique_slug(Outlet, outlet_name),
                timezone="Asia/Dhaka",
                currency=subscription.plan.currency,
                tax_rate=Decimal("0"),
                prep_time_minutes=20,
                customer_ordering_enabled=True,
                table_ordering_enabled=True,
                sync_status="pending",
            )
            SyncCursor.objects.get_or_create(outlet=outlet)

        staff = StaffAccount.objects.filter(restaurant=restaurant, role="owner").first()
        if not staff:
            staff = StaffAccount.objects.create(
                restaurant=restaurant,
                outlet=outlet,
                full_name=f"{restaurant_name} Owner",
                role="owner",
                pin=admin_pin,
                is_active=True,
            )
        else:
            staff.outlet = staff.outlet or outlet
            staff.pin = admin_pin
            staff.is_active = True
            staff.save(update_fields=["outlet", "pin", "is_active", "updated_at"])

        restaurant.status = "active"
        restaurant.save(update_fields=["status", "updated_at"])

        subscription.restaurant = restaurant
        subscription.owner_account = owner
        subscription.status = "active"
        subscription.amount = payment.amount
        subscription.save(update_fields=["restaurant", "owner_account", "status", "amount"])
        _seed_default_entitlements(subscription)

        invoice = payment.invoice
        invoice.status = "paid"
        invoice.paid_at = invoice.paid_at or timezone.now()
        invoice.save(update_fields=["status", "paid_at"])

        payment.setup_completed_at = timezone.now()
        payment.save(update_fields=["setup_completed_at", "updated_at"])

    payload = _serialize_owner_auth_response(owner, staff=staff)
    payload["paymentAttemptId"] = str(payment.id)
    payload["paymentSessionId"] = payment.gateway_session_id
    return JsonResponse(payload, status=201)


@csrf_exempt
def owner_login(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return _bad_request("Method not allowed", status=405)
    body = _json(request)
    phone = _normalize_phone(body.get("phone", ""))
    password = str(body.get("password", ""))
    owner = OwnerAccount.objects.select_related("restaurant").filter(phone=phone, is_active=True).first()
    if not owner or not owner.check_password(password):
        return _unauthorized("Invalid phone or password.")
    staff = _find_or_create_owner_staff(owner)
    payload = _serialize_owner_auth_response(owner, staff=staff)
    return JsonResponse(payload)


@csrf_exempt
def staff_login(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    _ensure_demo_data()
    body = _json(request)
    staff = StaffAccount.objects.select_related("restaurant", "outlet").filter(pin=str(body.get("pin", "")).strip(), is_active=True).first()
    if not staff:
        return JsonResponse({"message": "Incorrect PIN"}, status=401)
    session = StaffSessionToken.issue(staff)
    payload = _serialize_context(staff)
    payload["accessToken"] = session.token
    return JsonResponse(payload)


def staff_context(request: HttpRequest) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    return JsonResponse(_serialize_context(staff))


@csrf_exempt
def staff_config(request: HttpRequest) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    outlet = _outlet_from_staff(staff)

    if request.method == "PATCH":
        body = _json(request)
        staff.restaurant.name = body.get("restaurantName", staff.restaurant.name)
        staff.restaurant.address = body.get("address", staff.restaurant.address)
        staff.restaurant.phone = body.get("phone", staff.restaurant.phone)
        if body.get("currency"):
            outlet.currency = body["currency"]
        if body.get("taxRate") is not None:
            outlet.tax_rate = Decimal(str(body["taxRate"]))
        staff.restaurant.save(update_fields=["name", "address", "phone", "updated_at"])
        outlet.save(update_fields=["currency", "tax_rate", "updated_at"])

    subscription = getattr(staff.restaurant, "subscription", None)
    printer = outlet.printer_endpoints.first()
    return JsonResponse(
        {
            "restaurantId": str(staff.restaurant_id),
            "restaurantName": staff.restaurant.name,
            "restaurantStatus": staff.restaurant.status,
            "outletId": str(outlet.id),
            "outletName": outlet.name,
            "currency": outlet.currency,
            "taxRate": float(outlet.tax_rate),
            "prepTimeMinutes": outlet.prep_time_minutes,
            "tableOrderingEnabled": outlet.table_ordering_enabled,
            "customerOrderingEnabled": outlet.customer_ordering_enabled,
            "printer": {
                "deviceId": str(printer.device_id) if printer and printer.device_id else None,
                "connectionType": printer.connection_type if printer else "network",
                "address": printer.address if printer else None,
                "paperWidth": printer.paper_width if printer else 80,
                "autoPrintKitchen": printer.auto_print_kitchen if printer else True,
            },
            "subscription": _serialize_subscription(subscription),
            "sync": {
                "status": outlet.sync_status,
                "lastSyncedAt": outlet.last_synced_at.isoformat() if outlet.last_synced_at else None,
            },
        }
    )


def staff_menu(request: HttpRequest) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    return JsonResponse(_serialize_menu(_outlet_from_staff(staff)), safe=False)


@csrf_exempt
def staff_menu_categories(request: HttpRequest) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    outlet = _outlet_from_staff(staff)
    if request.method == "POST":
        body = _json(request)
        category = MenuCategory.objects.create(
            outlet=outlet,
            name=body.get("name", ""),
            sort_order=body.get("sortOrder", 0),
        )
        return JsonResponse({"id": str(category.id), "name": category.name, "sortOrder": category.sort_order})
    data = MenuCategory.objects.filter(outlet=outlet).order_by("sort_order", "name")
    return JsonResponse([{"id": str(category.id), "name": category.name, "sortOrder": category.sort_order} for category in data], safe=False)


@csrf_exempt
def staff_menu_items(request: HttpRequest) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    outlet = _outlet_from_staff(staff)
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    body = _json(request)
    category = MenuCategory.objects.filter(id=body.get("categoryId"), outlet=outlet).first() if body.get("categoryId") else None
    item = MenuItem.objects.create(
        outlet=outlet,
        category=category,
        name=body.get("name", ""),
        description=body.get("description", "") or "",
        price=Decimal(str(body.get("price", "0"))),
        image_url=body.get("imageUrl", "") or "",
        is_available=bool(body.get("isAvailable", True)),
    )
    return JsonResponse(_serialize_item(item))


@csrf_exempt
def staff_menu_item_detail(request: HttpRequest, item_id) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    outlet = _outlet_from_staff(staff)
    item = MenuItem.objects.filter(id=item_id, outlet=outlet).first()
    if not item:
        return JsonResponse({"detail": "Not found"}, status=404)
    if request.method == "DELETE":
        item.delete()
        return JsonResponse({"success": True})
    if request.method == "PATCH":
        body = _json(request)
        if body.get("categoryId"):
            item.category = MenuCategory.objects.filter(id=body["categoryId"], outlet=outlet).first()
        for field, attr in [("name", "name"), ("description", "description"), ("imageUrl", "image_url")]:
            if field in body:
                setattr(item, attr, body[field] or "")
        if "price" in body:
            item.price = Decimal(str(body["price"]))
        if "isAvailable" in body:
            item.is_available = bool(body["isAvailable"])
        item.save()
    return JsonResponse(_serialize_item(item))


@csrf_exempt
def staff_tables(request: HttpRequest) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    outlet = _outlet_from_staff(staff)
    if request.method == "POST":
        body = _json(request)
        table = OutletTable.objects.create(
            outlet=outlet,
            name=body.get("name", ""),
            seats=body.get("seats", 4),
            status=body.get("status", "available"),
        )
        return JsonResponse(_serialize_table(table))
    return JsonResponse([_serialize_table(table) for table in outlet.tables.order_by("name")], safe=False)


@csrf_exempt
def staff_table_detail(request: HttpRequest, table_id) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    table = OutletTable.objects.filter(id=table_id, outlet=_outlet_from_staff(staff)).first()
    if not table:
        return JsonResponse({"detail": "Not found"}, status=404)
    if request.method == "DELETE":
        table.delete()
        return JsonResponse({"success": True})
    body = _json(request)
    table.status = body.get("status", table.status)
    table.save(update_fields=["status", "updated_at"])
    return JsonResponse(_serialize_table(table))


@csrf_exempt
def staff_orders(request: HttpRequest) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    outlet = _outlet_from_staff(staff)
    queryset = CustomerOrder.objects.filter(outlet=outlet).prefetch_related("items").order_by("-created_at")
    if request.GET.get("status"):
        queryset = queryset.filter(status=request.GET["status"])
    return JsonResponse([_serialize_order(order) for order in queryset], safe=False)


@csrf_exempt
def staff_order_detail(request: HttpRequest, order_id) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    order = CustomerOrder.objects.filter(id=order_id, outlet=_outlet_from_staff(staff)).prefetch_related("items").first()
    if not order:
        return JsonResponse({"detail": "Not found"}, status=404)
    if request.method == "PATCH":
        body = _json(request)
        next_status = body.get("status", order.status)
        order.status = next_status
        now = timezone.now()
        if next_status == "accepted" and not order.accepted_at:
            order.accepted_at = now
        if next_status == "preparing" and not order.preparing_at:
            order.preparing_at = now
        if next_status == "ready" and not order.ready_at:
            order.ready_at = now
        if next_status == "served" and not order.served_at:
            order.served_at = now
        if next_status == "cancelled" and not order.cancelled_at:
            order.cancelled_at = now
        order.save()
        if next_status in {"accepted", "preparing", "ready"}:
            PrintJob.objects.create(outlet=order.outlet, order=order, payload={"orderId": str(order.id), "status": next_status})
    return JsonResponse(_serialize_order(order))


def staff_reports(request: HttpRequest) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    outlet = _outlet_from_staff(staff)
    orders = CustomerOrder.objects.filter(outlet=outlet)
    total_revenue = orders.filter(status="served").aggregate(total=Sum("total")).get("total") or Decimal("0")
    total_orders = orders.count()
    completed_orders = orders.filter(status="served").count()
    cancelled_orders = orders.filter(status="cancelled").count()
    top_items = (
        CustomerOrderItem.objects.filter(order__outlet=outlet)
        .values("name_snapshot")
        .annotate(unitsSold=Sum("quantity"))
        .order_by("-unitsSold")[:5]
    )
    return JsonResponse(
        {
            "kpi": {
                "range": request.GET.get("range", "today"),
                "fromDate": request.GET.get("from"),
                "toDate": request.GET.get("to"),
                "totalRevenue": float(total_revenue),
                "totalOrders": total_orders,
                "completedOrders": completed_orders,
                "cancelledOrders": cancelled_orders,
                "avgOrderValue": float(total_revenue / completed_orders) if completed_orders else 0,
                "topSellingItem": {"name": top_items[0]["name_snapshot"], "unitsSold": top_items[0]["unitsSold"]} if top_items else None,
            },
            "dailyRevenue": [],
            "statusBreakdown": list(orders.values("status").annotate(count=Count("id"))),
            "topItems": list(top_items),
            "hourlyTraffic": [],
        }
    )


@csrf_exempt
def staff_printer(request: HttpRequest) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    outlet = _outlet_from_staff(staff)
    printer = outlet.printer_endpoints.first()
    if request.method == "PATCH":
        body = _json(request)
        if not printer:
            device = outlet.devices.filter(is_active=True).first()
            printer = PrinterEndpoint.objects.create(outlet=outlet, device=device)
        printer.connection_type = body.get("connectionType", printer.connection_type)
        printer.address = body.get("address", printer.address)
        printer.paper_width = body.get("paperWidth", printer.paper_width)
        printer.save()
    if not printer:
        return JsonResponse({"connectionType": "network", "address": None, "paperWidth": 80, "deviceId": None, "autoPrintKitchen": True})
    return JsonResponse(
        {
            "connectionType": printer.connection_type,
            "address": printer.address or None,
            "paperWidth": printer.paper_width,
            "deviceId": str(printer.device_id) if printer.device_id else None,
            "autoPrintKitchen": printer.auto_print_kitchen,
        }
    )


@csrf_exempt
def staff_printer_test(request: HttpRequest) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    outlet = _outlet_from_staff(staff)
    PrintJob.objects.create(outlet=outlet, payload={"type": "test_print"})
    return JsonResponse({"success": True})


@csrf_exempt
def staff_waiter_call(request: HttpRequest) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    body = _json(request)
    outlet = _outlet_from_staff(staff)
    NotificationEvent.objects.create(
        outlet=outlet,
        category="waiter_call",
        payload={"tableId": body.get("tableId"), "tableName": body.get("tableName"), "at": timezone.now().isoformat()},
    )
    return JsonResponse({"success": True})


def sync_bootstrap(request: HttpRequest) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    outlet = _outlet_from_staff(staff)
    cursor, _ = SyncCursor.objects.get_or_create(outlet=outlet)
    return JsonResponse(
        {
            "cursor": cursor.version,
            "outlet": {"id": str(outlet.id), "name": outlet.name},
            "tables": [_serialize_table(table) for table in outlet.tables.all()],
            "menu": _serialize_menu(outlet),
        }
    )


def sync_pull(request: HttpRequest) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    outlet = _outlet_from_staff(staff)
    since = int(request.GET.get("cursor", "0"))
    events = SyncEvent.objects.filter(outlet=outlet, cursor__version__gt=since).order_by("created_at")[:200]
    return JsonResponse(
        {
            "events": [{"topic": event.topic, "payload": event.payload, "createdAt": event.created_at.isoformat()} for event in events],
            "nextCursor": events.last().cursor.version if events else since,
        }
    )


@csrf_exempt
def sync_push(request: HttpRequest) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    outlet = _outlet_from_staff(staff)
    body = _json(request)
    action = SyncAction.objects.create(
        outlet=outlet,
        idempotency_key=body.get("idempotencyKey", ""),
        action_type=body.get("actionType", ""),
        payload=body.get("payload", {}),
        synced_at=timezone.now(),
        status="applied",
    )
    return JsonResponse({"success": True, "actionId": str(action.id), "syncedAt": action.synced_at.isoformat() if action.synced_at else None})


@csrf_exempt
def print_job_ack(request: HttpRequest) -> JsonResponse:
    staff = _require_staff(request)
    if isinstance(staff, JsonResponse):
        return staff
    body = _json(request)
    job = PrintJob.objects.filter(id=body.get("printJobId")).first()
    if not job:
        return JsonResponse({"detail": "Not found"}, status=404)
    job.status = "acknowledged"
    job.acknowledged_at = timezone.now()
    job.save(update_fields=["status", "acknowledged_at"])
    return JsonResponse({"success": True})


def public_menu(_request: HttpRequest, outlet_id) -> JsonResponse:
    outlet = Outlet.objects.filter(id=outlet_id, customer_ordering_enabled=True).first()
    if not outlet:
        return JsonResponse({"detail": "Outlet not found"}, status=404)
    categories = _serialize_menu(outlet)
    for category in categories:
        category["items"] = [item for item in category["items"] if item["isAvailable"]]
    return JsonResponse(categories, safe=False)


def public_outlet_bootstrap(request: HttpRequest, restaurant_id, outlet_id) -> JsonResponse:
    outlet = (
        Outlet.objects.filter(
            id=outlet_id,
            restaurant_id=restaurant_id,
            customer_ordering_enabled=True,
            table_ordering_enabled=True,
        )
        .select_related("restaurant")
        .first()
    )
    if not outlet:
        return JsonResponse({"detail": "Outlet not found"}, status=404)

    table_id = request.GET.get("tableId", "").strip()
    if not table_id:
        return JsonResponse({"detail": "tableId is required."}, status=400)

    table = OutletTable.objects.filter(id=table_id, outlet=outlet).first()
    if not table:
        return JsonResponse({"detail": "Table not found."}, status=404)

    return JsonResponse(_serialize_public_outlet(outlet, table=table))


@csrf_exempt
def public_waiter_call(request: HttpRequest, restaurant_id, outlet_id) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    outlet = (
        Outlet.objects.filter(
            id=outlet_id,
            restaurant_id=restaurant_id,
            customer_ordering_enabled=True,
            table_ordering_enabled=True,
        )
        .select_related("restaurant")
        .first()
    )
    if not outlet:
        return JsonResponse({"detail": "Outlet not found"}, status=404)

    body = _json(request)
    table = OutletTable.objects.filter(id=body.get("tableId"), outlet=outlet).first() if body.get("tableId") else None
    if not table:
        return JsonResponse({"detail": "Table not found."}, status=404)

    NotificationEvent.objects.create(
        outlet=outlet,
        category="waiter_call",
        payload={
            "tableId": str(table.id),
            "tableName": table.name,
            "source": "public_qr",
            "at": timezone.now().isoformat(),
        },
    )
    return JsonResponse({"success": True})


@csrf_exempt
def public_order_create(request: HttpRequest, outlet_id) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    outlet = Outlet.objects.filter(id=outlet_id, customer_ordering_enabled=True).select_related("restaurant").first()
    if not outlet:
        return JsonResponse({"detail": "Outlet not found"}, status=404)
    body = _json(request)
    order_id = body.get("id")
    idempotency_key = request.headers.get("Idempotency-Key") or order_id or ""
    existing = CustomerOrder.objects.filter(outlet=outlet, idempotency_key=idempotency_key).prefetch_related("items").first()
    if existing:
        return JsonResponse(_serialize_order(existing))
    table = OutletTable.objects.filter(id=body.get("tableId"), outlet=outlet).first() if body.get("tableId") else None
    items_payload = body.get("items", [])
    menu_items = {str(item.id): item for item in MenuItem.objects.filter(outlet=outlet, id__in=[entry.get("menuItemId") for entry in items_payload], is_available=True)}
    if len(menu_items) != len(items_payload):
        return JsonResponse({"detail": "One or more items are unavailable."}, status=400)
    subtotal = Decimal("0")
    create_kwargs = {}
    if order_id:
        create_kwargs["id"] = order_id
    order = CustomerOrder.objects.create(
        restaurant=outlet.restaurant,
        outlet=outlet,
        table=table,
        table_no=body.get("tableNo", "") or (table.name if table else ""),
        source=body.get("source", "cloud_customer"),
        order_type=body.get("orderType", "dine_in"),
        customer_name=body.get("customerName", "") or "",
        customer_phone=body.get("customerPhone", "") or "",
        note=body.get("note", "") or "",
        status="pending",
        idempotency_key=idempotency_key,
        **create_kwargs,
    )
    for entry in items_payload:
        menu_item = menu_items[entry["menuItemId"]]
        qty = int(entry.get("qty", 1))
        subtotal += menu_item.price * qty
        CustomerOrderItem.objects.create(
            order=order,
            menu_item=menu_item,
            name_snapshot=menu_item.name,
            unit_price=menu_item.price,
            quantity=qty,
            note="",
        )
    tax = subtotal * (Decimal(str(outlet.tax_rate)) / Decimal("100"))
    order.subtotal = subtotal
    order.tax = tax
    order.total = subtotal + tax
    order.save(update_fields=["subtotal", "tax", "total"])
    PrintJob.objects.create(outlet=outlet, order=order, payload={"orderId": str(order.id), "event": "new_order"})
    return JsonResponse(_serialize_order(CustomerOrder.objects.prefetch_related("items").get(id=order.id)), status=201)


def public_order_detail(_request: HttpRequest, outlet_id, order_id) -> JsonResponse:
    order = CustomerOrder.objects.filter(id=order_id, outlet_id=outlet_id).prefetch_related("items").first()
    if not order:
        return JsonResponse({"detail": "Not found"}, status=404)
    return JsonResponse(_serialize_order(order))
