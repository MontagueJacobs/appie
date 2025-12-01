# Albert Heijn Purchase History Dashboard

Local project to fetch and display Albert Heijn purchase history, enrich receipt lines with product data and images, and provide a simple UI for browsing and inspecting products.

## Contents
- `server.py` — FastAPI backend that handles OAuth exchange, proxies product image requests, and exposes product search and receipt endpoints.
- `script.js` — Frontend logic: login flow, receipt display, product enrichment and matching algorithm.
- `index.html`, `styles.css` — Frontend UI.
- `.tokens.json`, `.secret_key` — Local files that store tokens and secret keys; these are intentionally not committed and are included in `.gitignore`.

## Local setup
1. Create and activate a Python virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt  # if a requirements file is present
```

2. Run the server

```bash
python3 server.py
```

3. Open the web UI at `http://127.0.0.1:8000` and follow the login instructions.

## Deploying on Vercel

You can host the FastAPI backend and static frontend on Vercel using the Python runtime.

### Files needed
- `server.py` (must expose a top-level `app = FastAPI()`; the existing `if __name__ == "__main__"` block is ignored in serverless)
- `index.html`, `script.js`, `styles.css` (static assets)
- `vercel.json` (build & routing configuration)
- `requirements.txt` (Python dependencies)

### Sample `vercel.json`
```json
{
	"version": 2,
	"builds": [
		{ "src": "server.py", "use": "@vercel/python" },
		{ "src": "index.html", "use": "@vercel/static" },
		{ "src": "script.js", "use": "@vercel/static" },
		{ "src": "styles.css", "use": "@vercel/static" }
	],
	"routes": [
		{ "src": "/api/(.*)", "dest": "/server.py" },
		{ "src": "/script.js", "dest": "/script.js" },
		{ "src": "/styles.css", "dest": "/styles.css" },
		{ "src": "/", "dest": "/index.html" }
	]
}
```

### Steps
1. Install the Vercel CLI locally: `npm i -g vercel`
2. Run `vercel login`.
3. From the project root run `vercel` once to create the project, then `vercel deploy` (or just `vercel --prod`).
4. The Python build will install dependencies from `requirements.txt` and deploy `server.py` as an ASGI function.

### Notes / Caveats
- Serverless functions are stateless: files like `appie!/ah_tokens.json` or `device_id.txt` may not persist between cold starts. Consider moving token storage to an external KV (Redis, Supabase DB, etc.).
- High-frequency outbound calls (e.g. product search) may benefit from caching headers or an external cache layer.
- The current receipts endpoint still returns an upstream `service_unreachable` error; deploying to Vercel will not bypass that limitation.
- If you later add more API routes, you can keep them in `server.py`—no need for multiple Python files unless you want separate lambdas.

### Environment Variables
Use `vercel env add VARIABLE_NAME` to add secrets (e.g. future client secret or feature flags). Access in code via `os.getenv("VARIABLE_NAME")`.

### Local Vercel emulation (optional)
`vercel dev` can run a local dev server approximating production routing; still use `python3 server.py` for native debugging.

## Important: Secrets & tokens
- `server.py` uses `.secret_key` and the app persists tokens in `.tokens.json`. These files are excluded by `.gitignore` and should never be committed to a public repository.
- If you want to share code, remove or rotate any secrets first.

## Creating a remote GitHub repository (recommended)
Option A (manual):
- Create a new repository on GitHub via the website.
- Add it as a remote locally and push:

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

Option B (using GitHub CLI `gh`):

```bash
gh repo create <your-username>/<repo-name> --public --source=. --remote=origin --push
```

## Notes / Next steps
- Consider adding integration tests or a CI workflow for lint/tests.
- Migrate token storage to an external secure store before production deployment.
- Add caching / rate limiting if API usage grows.

