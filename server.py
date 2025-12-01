# ...existing imports...
import json
import time
from pathlib import Path
import httpx
from typing import Optional, Dict
import asyncio
import uuid
from uuid import uuid4
from fastapi import FastAPI, HTTPException, Form
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# ...existing code...

AH_BASE = "https://api.ah.nl"
AH_USER_AGENT = "Appie/8.22.3"
AH_CLIENT_ID = "appie"

TOKENS_PATH = Path("appie!/ah_tokens.json")
DEVICE_ID_PATH = Path("device_id.txt")
if DEVICE_ID_PATH.exists():
    DEVICE_ID = DEVICE_ID_PATH.read_text().strip()
else:
    DEVICE_ID = str(uuid4())
    DEVICE_ID_PATH.write_text(DEVICE_ID)


def load_tokens() -> Optional[Dict]:
    if not TOKENS_PATH.exists():
        return None
    with TOKENS_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data


def save_tokens(tokens: Dict) -> None:
    # Preserve user flag if present; normalize shape + store created_at (epoch)
    user_flag = tokens.get("user", False)
    normalized = {
        "access_token": tokens["access_token"],
        "refresh_token": tokens.get("refresh_token"),
        "expires_in": tokens.get("expires_in", 0),
        "created_at": time.time(),
    }
    if user_flag:
        normalized["user"] = True
    TOKENS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with TOKENS_PATH.open("w", encoding="utf-8") as f:
        json.dump(normalized, f)


def token_is_expired(tokens: Dict, skew: int = 60) -> bool:
    created_at = tokens.get("created_at", 0)
    expires_in = tokens.get("expires_in", 0)
    return (created_at + expires_in - skew) <= time.time()


async def refresh_token_if_needed() -> str:
    tokens = load_tokens()
    if not tokens:
        raise HTTPException(status_code=401, detail="Not logged in (no tokens)")

    if not token_is_expired(tokens):
        return tokens["access_token"]

    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token; please log in again")

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{AH_BASE}/mobile-auth/v1/auth/token/refresh",
            json={"clientId": AH_CLIENT_ID, "refreshToken": refresh_token},
            headers={
                "User-Agent": AH_USER_AGENT,
                "Content-Type": "application/json",
                "Accept": "application/json",
                # Some recent upstream changes appear to require explicit client/device headers.
                "X-Client-Id": AH_CLIENT_ID,
                "X-Device-Id": DEVICE_ID,
            },
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail=f"Failed to refresh token: {resp.status_code} {resp.text}",
        )

    new_tokens = resp.json()
    # Inherit user flag from previous tokens if it existed
    if tokens.get("user"):
        new_tokens["user"] = True
    save_tokens(new_tokens)
    return new_tokens["access_token"]


async def exchange_code_for_token(code: str) -> Dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{AH_BASE}/mobile-auth/v1/auth/token",
            json={"clientId": AH_CLIENT_ID, "code": code},
            headers={
                "User-Agent": AH_USER_AGENT,
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Client-Id": AH_CLIENT_ID,
                "X-Device-Id": DEVICE_ID,
            },
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to exchange code for token: {resp.status_code} {resp.text}",
        )
    tokens = resp.json()
    tokens["user"] = True  # mark this token as user-authenticated (OAuth code flow)
    save_tokens(tokens)
    return tokens


@app.post("/api/login")
async def api_login(code: str = Form(...)):
    """Login using an authorization code.

    The frontend may submit either:
      1. The raw code value (e.g. "abcd1234")
      2. The full redirect URL (e.g. "appie://login-exit?code=abcd1234&state=...")

    We normalize the input to just the code, then exchange it.
    Adds extra diagnostics to help track recent login failures and includes
    optional mobile headers if AH started requiring them for token exchange.
    """

    raw = code.strip()
    # URL decode if user pasted percent-encoded link / fragment
    try:
        from urllib.parse import unquote
        raw = unquote(raw)
    except Exception:
        pass
    # Attempt to extract code if a full URL / fragment was pasted.
    if "code=" in raw:
        try:
            # Split on first occurrence of code= then trim at next & if present.
            raw_fragment = raw.split("code=", 1)[1]
            raw = raw_fragment.split("&", 1)[0]
        except Exception:
            # Keep original raw if parsing fails; will likely 400 downstream.
            pass

    # Basic sanity check — AH codes historically > 20 chars; warn if very short.
    if len(raw) < 6:  # heuristic threshold
        return JSONResponse({
            "status": "error",
            "detail": "Authorization code appears too short; make sure you copied the full value after code=.",
            "submitted": code,
        }, status_code=400)

    try:
        tokens = await exchange_code_for_token(raw)
    except HTTPException as e:
        # Surface upstream body for easier debugging.
        return JSONResponse({
            "status": "error",
            "detail": str(e.detail),
            "hint": "If this keeps failing, re-open the authorize URL and obtain a fresh code. The OAuth flow may now require a one-time PKCE verifier or additional headers.",
            "submitted_code_length": len(raw),
        }, status_code=e.status_code)
    return {"status": "ok", "expires_in": tokens.get("expires_in", 0)}


@app.post("/api/logout")
async def api_logout():
    if TOKENS_PATH.exists():
        TOKENS_PATH.unlink()
    return {"status": "ok"}


def classify_token(tokens: Optional[Dict]) -> Dict:
    if not tokens:
        return {"logged_in": False, "present": False}
    created_at = tokens.get("created_at", 0)
    expires_in = tokens.get("expires_in", 0)
    remaining = int(created_at + expires_in - time.time()) if created_at and expires_in else None
    access = tokens.get("access_token", "")
    refresh = tokens.get("refresh_token")
    # Determine token type:
    # Priority 1: explicit user flag
    if tokens.get("user"):
        token_type = "user"
    else:
        # Priority 2: heuristic — presence of refresh token and reasonable lengths => user
        if refresh and len(refresh) >= 20 and len(access) >= 20:
            token_type = "user"
        else:
            token_type = "anonymous"
    return {
        "logged_in": True,
        "present": True,
        "token_type": token_type,
        "expires_in": expires_in,
        "seconds_remaining": max(0, remaining) if remaining is not None else None,
        "token_expired": token_is_expired(tokens),
    }

@app.get("/api/status")
async def api_status():
    return classify_token(load_tokens())

@app.get("/api/token/status")
async def api_token_status():
    return classify_token(load_tokens())


@app.get("/api/authorize-url")
async def api_authorize_url():
    # matches the gist / your frontend expectations
    url = (
        "https://login.ah.nl/secure/oauth/authorize"
        "?client_id=appie"
        "&redirect_uri=appie://login-exit"
        "&response_type=code"
    )
    # Frontend expects 'authorize_url'; keep backward compatibility exposing both keys.
    return {"authorize_url": url, "url": url}


async def ah_get(path: str, params: Optional[Dict] = None) -> httpx.Response:
    access_token = await refresh_token_if_needed()
    # Emulate more mobile headers for gateway routing; adjust values as needed.
    base_headers = {
        "User-Agent": f"{AH_USER_AGENT} (Android; 14; Sandbox)",
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
        "Accept-Language": "nl-NL,nl;q=0.8,en-US;q=0.6,en;q=0.4",
        "Accept-Encoding": "gzip, deflate",
        "X-App-Version": AH_USER_AGENT.split("/")[-1],  # 8.22.3
        "X-App-Build": AH_USER_AGENT.split("/")[-1].replace(".", ""),  # 8223 approximate build
        "X-App-Name": "ah",
        "X-Channel": "mobile",
        "X-Client-Id": AH_CLIENT_ID,
        "X-Device-Platform": "android",
        "X-Device-Type": "phone",
        "X-OS-Version": "14",
        "X-Device-Id": DEVICE_ID,
        "X-Device-Model": "Pixel 7 Sandbox",
        "X-Network-Type": "wifi",
        "X-Platform": "android",
    }

    # Retry & fallback logic: try path as-is; if still 503 service_unreachable, attempt v2 variant.
    attempts = 3
    last_resp = None
    async with httpx.AsyncClient(timeout=10.0) as client:
        for attempt in range(attempts):
            correlation_id = str(uuid.uuid4())
            headers = {**base_headers, "X-Correlation-ID": correlation_id}
            last_resp = await client.get(f"{AH_BASE}{path}", params=params, headers=headers)
            if last_resp.status_code != 503:
                return last_resp
            # backoff before retry
            await asyncio.sleep(0.5 * (2 ** attempt))

        # If still 503 and initial path is v1, try v2 variant once.
        if path == "/mobile-services/v1/receipts":
            alt_path = "/mobile-services/v2/receipts"
            correlation_id = str(uuid.uuid4())
            headers = {**base_headers, "X-Correlation-ID": correlation_id}
            alt_resp = await client.get(f"{AH_BASE}{alt_path}", params=params, headers=headers)
            # Return alt_resp regardless; caller will decide.
            return alt_resp

    return last_resp


@app.get("/api/receipts")
async def api_receipts():
    # Gather detailed attempts (primary + fallback) for structured diagnostics.
    attempts_meta = []
    path_primary = "/mobile-services/v1/receipts"
    resp = await ah_get(path_primary)
    attempts_meta.append({"path": path_primary, "status_code": resp.status_code})
    # If primary yielded 503 and we auto-fallback to v2 inside ah_get, we already returned alt resp; record alt if different.
    if path_primary == "/mobile-services/v1/receipts" and resp.status_code == 503:
        # Run explicit second attempt to collect meta (even if ah_get already tried internally)
        alt_path = "/mobile-services/v2/receipts"
        alt_resp = await ah_get(alt_path)
        attempts_meta.append({"path": alt_path, "status_code": alt_resp.status_code})
        resp = alt_resp

    if resp.status_code == 200:
        data = resp.json()
        return JSONResponse({"ok": True, "attempts": attempts_meta, "receipts": data})

    # Parse upstream body for error details.
    upstream_body = resp.text
    parsed = None
    err_code = None
    err_desc = None
    try:
        parsed = resp.json()
        err_code = parsed.get("error")
        err_desc = parsed.get("error_description")
    except Exception:
        pass

    structured = {
        "ok": False,
        "upstream_status": resp.status_code,
        "attempts": attempts_meta,
        "error_code": err_code,
        "error_description": err_desc,
        "body_snippet": upstream_body[:400] if upstream_body else None,
    }

    if err_code == "service_unreachable":
        return JSONResponse(structured, status_code=503)
    return JSONResponse(structured, status_code=400)

@app.get("/api/receipts/debug")
async def api_receipts_debug():
    """Attempt multiple possible receipt endpoints and return a diagnostic report.
    Helps troubleshoot upstream 503 service_unreachable by showing each attempt's status and truncated body.
    """
    candidates = [
        "/mobile-services/v1/receipts",
        "/mobile-services/v2/receipts",
        "/mobile-services/receipts/v1/receipts",  # speculative legacy
    ]
    results = []
    for path in candidates:
        resp = await ah_get(path)
        body_snippet = resp.text[:400] if resp.text else ""
        # Try JSON parse
        parsed = None
        try:
            parsed = resp.json()
        except Exception:
            pass
        results.append({
            "path": path,
            "status_code": resp.status_code,
            "ok": resp.status_code == 200,
            "headers": dict(resp.headers),
            "json_keys": list(parsed.keys()) if isinstance(parsed, dict) else None,
            "body_snippet": body_snippet,
        })
        # Stop early if one succeeded
        if resp.status_code == 200:
            break
    return JSONResponse({"diagnostics": results})


@app.get("/api/receipts/{transaction_id}")
async def api_receipt_detail(transaction_id: str):
    resp = await ah_get(f"/mobile-services/v2/receipts/{transaction_id}")
    if resp.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Receipt detail fetch failed: {resp.status_code} {resp.text}",
        )
    return JSONResponse(resp.json())


@app.get("/api/products/search")
async def api_products_search(query: str):
    resp = await ah_get(
        "/mobile-services/product/search/v2",
        params={"query": query, "sortOn": "RELEVANCE"},
    )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Product search failed: {resp.status_code} {resp.text}",
        )
    return JSONResponse(resp.json())


# Root route: serve index.html if present, otherwise a simple health message.
@app.get("/")
async def root():
    index_path = Path("index.html")
    if index_path.exists():
        return FileResponse(str(index_path))
    return HTMLResponse("<h1>Appie backend running</h1>")

@app.get("/script.js")
async def serve_script():
    js_path = Path("script.js")
    if not js_path.exists():
        raise HTTPException(status_code=404, detail="script.js not found")
    return FileResponse(str(js_path), media_type="text/javascript")

@app.get("/styles.css")
async def serve_styles():
    css_path = Path("styles.css")
    if not css_path.exists():
        raise HTTPException(status_code=404, detail="styles.css not found")
    return FileResponse(str(css_path), media_type="text/css")


# Optional: mount static files (CSS/JS/images) if you want direct access without the root handler.
# Commented out for now to avoid shadowing API routes.
# app.mount("/static", StaticFiles(directory="."), name="static")


if __name__ == "__main__":
    # Running via: python3 server.py
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)