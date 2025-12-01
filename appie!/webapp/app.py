import os
import secrets
from typing import Dict
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

from ah_client import AHClient, AHClientError

# Config
APP_SECRET = os.getenv("APP_SECRET", secrets.token_hex(16))
BASE_DIR = os.path.dirname(__file__)

templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

app = FastAPI(title="AH Receipts Viewer")
app.add_middleware(SessionMiddleware, secret_key=APP_SECRET, https_only=False)
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Simple per-session in-memory token store
# DO NOT USE in production. Replace with DB/redis.
SESSION_TOKENS: Dict[str, Dict] = {}


def _get_client_for_session(session_id: str) -> AHClient:
    tokens = SESSION_TOKENS.get(session_id)
    return AHClient(tokens)


def _save_client_tokens(session_id: str, client: AHClient) -> None:
    SESSION_TOKENS[session_id] = client.tokens


@app.middleware("http")
async def ensure_session(request: Request, call_next):
    if "session_id" not in request.session:
        request.session["session_id"] = secrets.token_hex(16)
    response = await call_next(request)
    return response


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    session_id = request.session["session_id"]
    client = _get_client_for_session(session_id)
    logged_in = client.has_tokens()
    receipts = None
    error = None
    if logged_in:
        try:
            receipts = client.list_receipts()
            _save_client_tokens(session_id, client)
        except AHClientError as e:
            error = str(e)
    return templates.TemplateResponse("home.html", {
        "request": request,
        "logged_in": logged_in,
        "receipts": receipts,
        "error": error,
    })


@app.get("/login", response_class=HTMLResponse)
async def login_form(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.post("/login/code")
async def login_with_code(request: Request, code: str = Form(...)):
    session_id = request.session["session_id"]
    client = _get_client_for_session(session_id)
    try:
        client.exchange_code(code.strip())
        _save_client_tokens(session_id, client)
    except AHClientError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return RedirectResponse(url="/", status_code=303)


@app.get("/logout")
async def logout(request: Request):
    session_id = request.session["session_id"]
    SESSION_TOKENS.pop(session_id, None)
    request.session.clear()
    return RedirectResponse("/", status_code=303)


@app.get("/receipts/{transaction_id}", response_class=HTMLResponse)
async def receipt_detail(request: Request, transaction_id: str):
    session_id = request.session["session_id"]
    client = _get_client_for_session(session_id)
    if not client.has_tokens():
        return RedirectResponse("/login", status_code=303)
    try:
        data = client.get_receipt(transaction_id)
        _save_client_tokens(session_id, client)
    except AHClientError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return templates.TemplateResponse("receipt.html", {"request": request, "data": data})


# Helpful link target to open authorize URL in a new tab
@app.get("/authorize-url")
async def authorize_url():
    # The auth flow redirects to appie:// which won't open in browsers.
    # We use the code-paste method instead; still, provide the link.
    url = (
        "https://login.ah.nl/secure/oauth/authorize?client_id=appie&"
        "redirect_uri=appie://login-exit&response_type=code"
    )
    return {"authorize_url": url}
