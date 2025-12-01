# AH Receipts Viewer (Unofficial)

A tiny FastAPI web app to log in to your Albert Heijn account (mobile API) and view your purchase history.

⚠️ Unofficial, for personal use only. Do not deploy publicly. Tokens are kept in-memory per-session.

## Features
- Paste OAuth authorization code to sign in
- List receipts and view a detailed receipt
- Auto-refresh access token when needed

## Setup

1. Create and activate a virtual environment (optional).
2. Install dependencies.
3. Run the server.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r webapp/requirements.txt
uvicorn webapp.app:app --reload --port 8000
```

Open http://127.0.0.1:8000

## Login flow
The AH mobile auth uses a custom scheme (`appie://`). Use the code-paste method:

1. Click "Open AH Login" on /login, or open this URL:
   https://login.ah.nl/secure/oauth/authorize?client_id=appie&redirect_uri=appie://login-exit&response_type=code
2. Sign in. After login the browser tries to redirect to `appie://...code=XXXX` and fails.
3. Copy the `code` parameter value from the location or error page.
4. Paste the code into the app.

The app exchanges the code for tokens and stores them in memory for your session. The access token is auto-refreshed when expiring.

## Security notes
- Your AH password never passes through this app. Only the auth code and tokens are handled.
- Do not deploy on the public internet. If you must, add proper server-side storage, HTTPS, CSRF protection, and auth.

## Development
- `webapp/ah_client.py` handles tokens and API calls.
- `webapp/app.py` defines the web routes and session handling.
- Templates live in `webapp/templates/`.

## Troubleshooting
- If code exchange fails, the auth code may be single-use or expired. Try logging in again to obtain a fresh code.
- Some accounts may require extra steps (e.g., 2FA); the mobile flow can change over time, so behavior may vary.
