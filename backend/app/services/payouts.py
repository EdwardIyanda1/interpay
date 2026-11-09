"""Refunds and organiser payouts go through this interface. The simulated provider is used
until transfer or disbursement API access is confirmed with Interswitch."""
from ..config import settings


class SimulatedPayouts:
    name = "simulated"

    def send(self, kind: str, reference: str, amount_kobo: int, destination: dict) -> str:
        return f"SIM-{kind}-{reference}"


class InterswitchPayouts:
    name = "interswitch"

    def send(self, kind: str, reference: str, amount_kobo: int, destination: dict) -> str:
        raise NotImplementedError("Implement with the Interswitch transfer API once access is confirmed")


def get_payouts():
    return InterswitchPayouts() if settings.payout_provider == "interswitch" else SimulatedPayouts()
