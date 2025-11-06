import os
import sys
import secrets
import json
from typing import Dict
import requests
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

# Import the AH client from the appie! folder
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "appie!", "webapp"))
from ah_client import AHClient, AHClientError

# Config
BASE_DIR = os.path.dirname(__file__)
TOKENS_FILE = os.path.join(BASE_DIR, ".tokens.json")
SECRET_FILE = os.path.join(BASE_DIR, ".secret_key")

# Generate or load persistent secret key
def _get_or_create_secret():
    if os.path.exists(SECRET_FILE):
        with open(SECRET_FILE, 'r') as f:
            return f.read().strip()
    else:
        secret = secrets.token_hex(32)
        with open(SECRET_FILE, 'w') as f:
            f.write(secret)
        return secret

APP_SECRET = _get_or_create_secret()

app = FastAPI(title="Albert Heijn Purchase History")

# Add SessionMiddleware with longer session timeout (7 days)
app.add_middleware(
    SessionMiddleware, 
    secret_key=APP_SECRET, 
    https_only=False,
    max_age=7 * 24 * 60 * 60  # 7 days in seconds
)

# Persistent token storage
SESSION_TOKENS: Dict[str, Dict] = {}

def _load_tokens():
    """Load tokens from disk on startup"""
    global SESSION_TOKENS
    if os.path.exists(TOKENS_FILE):
        try:
            with open(TOKENS_FILE, 'r') as f:
                SESSION_TOKENS = json.load(f)
            print(f"Loaded {len(SESSION_TOKENS)} sessions from disk")
        except Exception as e:
            print(f"Failed to load tokens: {e}")
            SESSION_TOKENS = {}
    else:
        SESSION_TOKENS = {}

def _save_tokens():
    """Save tokens to disk"""
    try:
        with open(TOKENS_FILE, 'w') as f:
            json.dump(SESSION_TOKENS, f)
    except Exception as e:
        print(f"Failed to save tokens: {e}")

# Load tokens on startup
_load_tokens()


def _get_session_id(request: Request) -> str:
    """Get or create session ID"""
    if "session_id" not in request.session:
        request.session["session_id"] = secrets.token_hex(16)
    return request.session["session_id"]


def _get_client_for_session(session_id: str) -> AHClient:
    tokens = SESSION_TOKENS.get(session_id)
    client = AHClient(tokens)
    
    # Auto-refresh tokens if they're expired or about to expire
    if client.has_tokens() and client.is_expired():
        try:
            client.refresh()
            SESSION_TOKENS[session_id] = client.tokens
            _save_tokens()
            print(f"Refreshed tokens for session {session_id[:8]}...")
        except Exception as e:
            print(f"Token refresh failed: {e}")
            # Token refresh failed, user will need to login again
            pass
    
    return client


def _save_client_tokens(session_id: str, client: AHClient) -> None:
    SESSION_TOKENS[session_id] = client.tokens
    _save_tokens()


# Serve the main HTML page
@app.get("/", response_class=HTMLResponse)
async def home():
    with open(os.path.join(BASE_DIR, "index.html"), "r") as f:
        return HTMLResponse(content=f.read())


# Serve static files
@app.get("/styles.css")
async def styles():
    return FileResponse(os.path.join(BASE_DIR, "styles.css"))


@app.get("/script.js")
async def script():
    return FileResponse(os.path.join(BASE_DIR, "script.js"))


# API: Check login status
@app.get("/api/status")
async def check_status(request: Request):
    session_id = _get_session_id(request)
    client = _get_client_for_session(session_id)
    return {"logged_in": client.has_tokens()}


# API: Get authorization URL
@app.get("/api/authorize-url")
async def authorize_url():
    # AH only accepts appie:// redirect, but we'll handle it with a helper page
    url = (
        "https://login.ah.nl/secure/oauth/authorize?client_id=appie&"
        "redirect_uri=appie://login-exit&response_type=code"
    )
    return {"authorize_url": url}


# API: Exchange code for token
@app.post("/api/login")
async def login_with_code(request: Request, code: str = Form(...)):
    session_id = _get_session_id(request)
    client = _get_client_for_session(session_id)
    try:
        client.exchange_code(code.strip())
        _save_client_tokens(session_id, client)
        return {"success": True, "message": "Login successful"}
    except AHClientError as e:
        raise HTTPException(status_code=400, detail=str(e))


# API: Get receipts
@app.get("/api/receipts")
async def get_receipts(request: Request):
    session_id = _get_session_id(request)
    client = _get_client_for_session(session_id)
    if not client.has_tokens():
        raise HTTPException(status_code=401, detail="Not logged in")
    try:
        receipts = client.list_receipts()
        _save_client_tokens(session_id, client)
        return {"receipts": receipts}
    except AHClientError as e:
        raise HTTPException(status_code=400, detail=str(e))


# API: Get specific receipt
@app.get("/api/receipts/{transaction_id}")
async def get_receipt_detail(request: Request, transaction_id: str):
    session_id = _get_session_id(request)
    client = _get_client_for_session(session_id)
    if not client.has_tokens():
        raise HTTPException(status_code=401, detail="Not logged in")
    try:
        data = client.get_receipt(transaction_id)
        _save_client_tokens(session_id, client)
        
        # Debug: Log a sample product to see what fields are available
        if data.get('receiptUiItems'):
            product_items = [item for item in data['receiptUiItems'] if item.get('type') == 'product' and item.get('description')]
            if product_items:
                print(f"Sample product item keys: {list(product_items[0].keys())}")
                print(f"Sample product: {product_items[0]}")
        
        return data
    except AHClientError as e:
        raise HTTPException(status_code=400, detail=str(e))


# API: Search for product information
@app.get("/api/products/search")
async def search_products(request: Request, query: str):
    """Search for products using anonymous auth (product search doesn't require user login)"""
    try:
        # Use anonymous token for product search
        # First, try to get or create an anonymous token
        anonymous_token = None
        
        # Try to get anonymous token
        token_url = "https://api.ah.nl/mobile-auth/v1/auth/token/anonymous"
        token_payload = {"clientId": "appie"}
        token_headers = {
            "User-Agent": "Appie/8.22.3",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        token_resp = requests.post(token_url, json=token_payload, headers=token_headers, timeout=10)
        if token_resp.ok:
            anonymous_token = token_resp.json().get('access_token')
        
        if not anonymous_token:
            print("Failed to get anonymous token")
            return {"products": [], "page": {"totalElements": 0}}
        
        # Now search for products
        url = "https://api.ah.nl/mobile-services/product/search/v2"
        headers = {
            "User-Agent": "Appie/8.22.3",
            "Accept": "application/json",
            "Authorization": f"Bearer {anonymous_token}",
            "x-application": "AHWEBSHOP"
        }
        params = {
            "query": query,
            "application": "AHWEBSHOP",
            "availableOnline": "true",
            "bonus": "NONE",
            "orderable": "any",
            "sortBy": "RELEVANCE",
            "page": 0,
            "size": 10  # Increased from 5 to 10 for better scoring options
        }
        
        r = requests.get(url, headers=headers, params=params, timeout=20)
        print(f"Search request URL: {r.url}")
        if not r.ok:
            print(f"Product search error: {r.status_code} - {r.text[:400]}")
            return {"products": [], "page": {"totalElements": 0}}
        
        result = r.json()
        product_count = len(result.get('products', []))
        print(f"Search for '{query}': found {product_count} products")
        if product_count > 0:
            # Log the first few products for debugging
            for i, p in enumerate(result.get('products', [])[:3]):
                print(f"  [{i}] {p.get('brand', 'N/A')} - {p.get('title', 'N/A')}")
        return result
    
    except Exception as e:
        print(f"Product search exception: {str(e)}")
        return {"products": [], "page": {"totalElements": 0}}


# API: Proxy product images to avoid CORS issues
@app.get("/api/products/image")
async def proxy_product_image(request: Request):
    """Proxy product images through our server to avoid CORS issues"""
    # Get the raw query string to handle URLs with their own query parameters
    query_string = request.url.query
    
    # Extract url parameter - everything after 'url='
    if not query_string or not query_string.startswith('url='):
        raise HTTPException(status_code=400, detail="URL parameter is required")
    
    # Everything after 'url=' is the image URL (including its own query params)
    import urllib.parse
    image_url = urllib.parse.unquote(query_string[4:])  # Skip 'url=' and decode
    
    try:
        print(f"Proxying image: {image_url[:100]}...")
        headers = {
            "User-Agent": "Appie/8.22.3",
            "Accept": "image/*"
        }
        r = requests.get(image_url, headers=headers, timeout=10)
        if not r.ok:
            print(f"Image fetch failed: {r.status_code}")
            raise HTTPException(status_code=404, detail="Image not found")
        
        # Determine content type
        content_type = r.headers.get('content-type', 'image/jpeg')
        
        from fastapi.responses import Response
        return Response(content=r.content, media_type=content_type)
    except requests.RequestException as e:
        print(f"Image proxy error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Unexpected image proxy error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# API: Get detailed product information including nutrition
@app.get("/api/products/{webshop_id}")
async def get_product_detail(webshop_id: int):
    """
    Fetch detailed product information including nutritional data
    """
    try:
        # Get anonymous token first
        token_url = "https://api.ah.nl/mobile-auth/v1/auth/token/anonymous"
        token_payload = {"clientId": "appie"}
        token_headers = {
            "User-Agent": "Appie/8.22.3",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        token_resp = requests.post(token_url, json=token_payload, headers=token_headers, timeout=10)
        if not token_resp.ok:
            print(f"Failed to get anonymous token: {token_resp.status_code}")
            return {"error": "Authentication failed"}
        
        anonymous_token = token_resp.json().get('access_token')
        
        # Fetch product details
        url = f"https://api.ah.nl/mobile-services/product/detail/v4/fir/{webshop_id}"
        headers = {
            "User-Agent": "Appie/8.22.3",
            "Accept": "application/json",
            "Authorization": f"Bearer {anonymous_token}",
            "x-application": "AHWEBSHOP"
        }
        
        r = requests.get(url, headers=headers, timeout=20)
        print(f"Product detail request for webshopId {webshop_id}: {r.status_code}")
        
        if not r.ok:
            print(f"Product detail error: {r.status_code} - {r.text[:400]}")
            return {"error": f"Failed to fetch product details: {r.status_code}"}
        
        result = r.json()
        print(f"Product detail fetched successfully for {webshop_id}")
        
        # Log if nutrition info is present
        if 'nutritions' in result or 'nutritionalTable' in result or 'nutritionalInformation' in result:
            print(f"  ✓ Nutrition data found in response")
        
        return result
    
    except Exception as e:
        print(f"Product detail exception: {str(e)}")
        return {"error": str(e)}


# API: Logout
@app.post("/api/logout")
async def logout(request: Request):
    session_id = _get_session_id(request)
    SESSION_TOKENS.pop(session_id, None)
    request.session.clear()
    return {"success": True, "message": "Logged out"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
