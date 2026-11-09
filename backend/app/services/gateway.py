"""Payment gateway adapters. Checkout is collected through the Interswitch inline checkout
(a hosted page served by this backend). The server always verifies a payment itself."""
import json
from dataclasses import dataclass, field

import httpx

from ..config import settings


@dataclass
class VerifyResult:
    paid: bool
    amount_kobo: int | None = None
    raw: dict = field(default_factory=dict)


class SimulatedGateway:
    """Development only. No money moves."""
    name = "simulated"
    successes: set = set()

    def mark(self, txn_ref: str, ok: bool = True):
        (self.successes.add if ok else self.successes.discard)(txn_ref)

    def verify(self, txn_ref: str, amount_kobo: int) -> VerifyResult:
        return VerifyResult(txn_ref in self.successes, amount_kobo if txn_ref in self.successes else None, {"simulated": True})


class InterswitchGateway:
    name = "interswitch"

    def client_params(self, txn_ref: str, amount_kobo: int) -> dict:
        return {
            "merchant_code": settings.ipg_merchant_code,
            "pay_item_id": settings.ipg_pay_item_id,
            "txn_ref": txn_ref,
            "amount": str(amount_kobo),  # minor denomination: 3000 is 30 naira
            "currency": 566,
            "mode": settings.ipg_mode,
        }

    def verify(self, txn_ref: str, amount_kobo: int) -> VerifyResult:
        # Confirm the exact verify call (parameters and any hash header) in the Interswitch docs.
        try:
            r = httpx.get(
                settings.ipg_verify_url,
                params={"merchantcode": settings.ipg_merchant_code, "transactionreference": txn_ref, "amount": amount_kobo},
                timeout=15,
            )
            data = r.json()
        except Exception as exc:  # network or parse failure: treat as not paid yet
            return VerifyResult(False, None, {"error": str(exc)})
        amount = data.get("Amount")
        try:
            amount = int(amount) if amount is not None else None
        except (TypeError, ValueError):
            amount = None
        # The gateway can add a transaction fee, so accept an amount at or above the order amount.
        paid = str(data.get("ResponseCode")) == "00" and amount is not None and amount >= amount_kobo
        return VerifyResult(paid, amount, data)


_gateway = None


def get_gateway():
    global _gateway
    if _gateway is None:
        _gateway = InterswitchGateway() if settings.gateway == "interswitch" else SimulatedGateway()
    return _gateway
