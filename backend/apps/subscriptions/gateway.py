import secrets


SUPPORTED_PAYMENT_METHODS = ("bkash", "nagad", "bank", "card")


def build_payment_session(*, payment_method: str, amount: str, currency: str, phone: str) -> dict[str, str]:
    normalized_method = payment_method if payment_method in SUPPORTED_PAYMENT_METHODS else "bkash"
    session_id = f"pay_{secrets.token_hex(8)}"
    transaction_id = f"txn_{secrets.token_hex(8)}"
    reference = f"ref_{secrets.token_hex(6)}"
    checkout_url = f"https://payments.example.com/checkout/{session_id}"
    return {
        "provider": "sslcommerz",
        "paymentMethod": normalized_method,
        "sessionId": session_id,
        "transactionId": transaction_id,
        "reference": reference,
        "checkoutUrl": checkout_url,
        "amount": amount,
        "currency": currency,
        "phone": phone,
    }


def normalize_payment_status(status: str) -> str:
    normalized = (status or "").strip().lower()
    if normalized in {"initiated", "pending", "succeeded", "failed", "expired", "cancelled"}:
        return normalized
    if normalized in {"success", "successful", "paid"}:
        return "succeeded"
    if normalized in {"error", "declined"}:
        return "failed"
    return "pending"
