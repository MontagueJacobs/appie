import json
import requests
from pathlib import Path
import time
import logging

# === CONFIGURATION ===
TOKEN_FILE = Path("ah_tokens.json")
LOG_FILE = Path("ah_refresh.log")
CLIENT_ID = "appie"
USER_AGENT = "Appie/8.22.3"
REFRESH_INTERVAL = 3600  # seconds (1 hour)
# ======================

# Setup logging
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

def load_tokens():
    if TOKEN_FILE.exists():
        with open(TOKEN_FILE) as f:
            return json.load(f)
    logging.error("Token file not found. Please create ah_tokens.json first.")
    raise SystemExit("❌ No tokens found — log in manually first!")

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

    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        if response.ok:
            tokens = response.json()
            tokens["created_at"] = time.time()
            save_tokens(tokens)
            logging.info("✅ Tokens refreshed successfully.")
            return tokens
        else:
            logging.error(f"❌ Failed to refresh: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logging.exception(f"Exception during token refresh: {e}")
        return None

def get_valid_access_token():
    tokens = load_tokens()
    now = time.time()
    created = tokens.get("created_at", 0)
    lifetime = tokens.get("expires_in", 7200)
    expired = now - created > lifetime - 60

    if expired:
        logging.info("🔄 Token expired or soon expiring. Refreshing...")
        tokens = refresh_tokens(tokens["refresh_token"])
        if not tokens:
            logging.error("❌ Could not refresh tokens. Manual re-login required.")
            raise SystemExit()
    return tokens["access_token"]

def run_auto_refresh():
    while True:
        get_valid_access_token()
        logging.info("🕓 Next refresh scheduled in one hour.")
        time.sleep(REFRESH_INTERVAL)

if __name__ == "__main__":
    logging.info("🚀 Starting AH auto-refresh service...")
    run_auto_refresh()

