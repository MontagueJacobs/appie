import json
import requests
from pathlib import Path
import time

TOKEN_FILE = Path("ah_tokens.json")
CLIENT_ID = "appie"
USER_AGENT = "Appie/8.22.3"

def load_tokens():
    if TOKEN_FILE.exists():
        with open(TOKEN_FILE) as f:
            return json.load(f)
    return None

def save_tokens(tokens):
    with open(TOKEN_FILE, "w") as f:
        json.dump(tokens, f, indent=2)

def refresh_tokens(refresh_token):
    url = "https://api.ah.nl/mobile-auth/v1/auth/token/refresh"
    headers = {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    data = {"clientId": CLIENT_ID, "refreshToken": refresh_token}
    response = requests.post(url, headers=headers, json=data)
    if response.ok:
        tokens = response.json()
        tokens["created_at"] = time.time()
        save_tokens(tokens)
        print("✅ Tokens refreshed!")
        return tokens
    else:
        print("❌ Failed to refresh:", response.status_code, response.text)
        return None

def get_valid_access_token():
    tokens = load_tokens()
    if not tokens:
        raise SystemExit("No tokens found — log in manually first!")

    # Check expiration
    if time.time() - tokens.get("created_at", 0) > tokens.get("expires_in", 7200) - 60:
        print("🔄 Token expired, refreshing...")
        tokens = refresh_tokens(tokens["refresh_token"])

    return tokens["access_token"]

# Example usage: fetch your receipts
def get_receipts():
    access_token = get_valid_access_token()
    url = "https://api.ah.nl/mobile-services/v1/receipts"
    headers = {
        "User-Agent": USER_AGENT,
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }
    r = requests.get(url, headers=headers)
    print(json.dumps(r.json(), indent=2))

if __name__ == "__main__":
    get_receipts()

