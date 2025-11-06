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
- Consider adding an integration test or CI workflow to run quick lint/tests on pushes.
- Consider adding a migration for storing tokens securely (e.g., keyring, env vars) if you plan to share the repository.

