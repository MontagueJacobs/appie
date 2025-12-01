import time
from typing import Optional, Dict, Any
import requests

USER_AGENT = "Appie/8.22.3"
CLIENT_ID = "appie"

class AHClientError(Exception):
    pass

class AHClient:
    """
    Tiny wrapper around the AH mobile API for auth + receipts.

    Notes:
    - Tokens are kept in-memory per client instance. For a web app, create one per session.
    - You must call from a trusted backend. Do not expose tokens to the browser.
    """
    def __init__(self, tokens: Optional[Dict[str, Any]] = None):
        self.tokens: Dict[str, Any] = tokens or {}

    def _headers(self) -> Dict[str, str]:
        hdrs = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        }
        at = self.tokens.get("access_token")
        if at:
            hdrs["Authorization"] = f"Bearer {at}"
        return hdrs

    def set_tokens(self, tokens: Dict[str, Any]) -> None:
        tokens = dict(tokens)
        tokens.setdefault("created_at", time.time())
        self.tokens = tokens

    def has_tokens(self) -> bool:
        return bool(self.tokens.get("access_token") and self.tokens.get("refresh_token"))

    def is_expired(self) -> bool:
        created = float(self.tokens.get("created_at", 0))
        lifetime = int(self.tokens.get("expires_in", 7200))
        return time.time() - created > (lifetime - 60)

    def refresh(self) -> None:
        if not self.tokens.get("refresh_token"):
            raise AHClientError("No refresh_token present")
        url = "https://api.ah.nl/mobile-auth/v1/auth/token/refresh"
        payload = {"clientId": CLIENT_ID, "refreshToken": self.tokens["refresh_token"]}
        r = requests.post(url, json=payload, headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }, timeout=15)
        if not r.ok:
            raise AHClientError(f"Refresh failed: {r.status_code} {r.text}")
        data = r.json()
        data["created_at"] = time.time()
        self.tokens = data

    def ensure_token(self) -> None:
        if self.tokens and self.is_expired():
            self.refresh()

    # Auth code exchange (manual code paste flow)
    def exchange_code(self, code: str) -> Dict[str, Any]:
        url = "https://api.ah.nl/mobile-auth/v1/auth/token"
        payload = {"clientId": CLIENT_ID, "code": code}
        r = requests.post(url, json=payload, headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }, timeout=20)
        if not r.ok:
            raise AHClientError(f"Code exchange failed: {r.status_code} {r.text}")
        data = r.json()
        data["created_at"] = time.time()
        self.tokens = data
        return data

    # Data endpoints
    def list_receipts(self):
        self.ensure_token()
        url = "https://api.ah.nl/mobile-services/v1/receipts"
        r = requests.get(url, headers=self._headers(), timeout=20)
        if not r.ok:
            raise AHClientError(f"Receipts fetch failed: {r.status_code} {r.text}")
        return r.json()

    def get_receipt(self, transaction_id: str):
        self.ensure_token()
        url = f"https://api.ah.nl/mobile-services/v2/receipts/{transaction_id}"
        r = requests.get(url, headers=self._headers(), timeout=20)
        if not r.ok:
            raise AHClientError(f"Receipt fetch failed: {r.status_code} {r.text}")
        return r.json()
