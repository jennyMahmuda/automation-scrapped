# NexusLeads [Live](https://jennymahmuda.github.io/automation-scrapped/)

NexusLeads is a premium lead-research application with a responsive GitHub Pages frontend and an edge backend on Cloudflare Workers. It discovers public business listings from Google Places, verifies public website details, optionally enriches the listing with Firecrawl and Gemini, and appends the results to Google Sheets.

> **Privacy and compliance boundary:** the application uses public business information supplied by approved APIs and public business websites. It does not bypass logins, CAPTCHA, paywalls, or access controls, and it does not fabricate or infer missing emails. You are responsible for complying with the terms of the data providers and applicable outreach/privacy laws.

## Repository layout

| Path | Purpose |
|---|---|
| `frontend/index.html` | Premium responsive interface for keyword/location research, result review, and CSV export. |
| `cloudflare/worker.js` | Cloudflare Worker edge API. Secrets are read only from the Worker environment. |
| `cloudflare/wrangler.toml` | Worker name, compatibility date, non-sensitive variables, and required secret names. |
| `backend/main.py` | Local FastAPI-compatible development backend. Production traffic should use the Cloudflare Worker. |
| `.github/workflows/pages.yml` | GitHub Pages deployment workflow for the `frontend/` directory. |

## Cloudflare backend deployment & CI/CD

The production backend is automatically deployed and synchronized via **GitHub Actions** (`.github/workflows/deploy-backend.yml`). Whenever you push updates to `cloudflare/`, GitHub Actions automatically deploys the Worker to Cloudflare and securely provisions your API keys as encrypted Cloudflare Worker secrets.

Live Endpoint: `https://nexusleads-api.mahmudajenny6.workers.dev`

The Worker is configured for a `workers.dev` endpoint. Cloudflare Python Workers are currently in open beta and require a special compatibility flag; this project therefore keeps the production edge handler in the stable JavaScript module Worker runtime while retaining `backend/main.py` for local Python development. This avoids claiming that the Python development server is itself the deployed edge runtime.

## Required GitHub Secrets

To enable automated deployment and secret synchronization, add the following secrets in your GitHub repository under **Settings > Secrets and variables > Actions**:

| GitHub Secret Name | Purpose |
|---|---|
| `CLOUDFLARE_AC_ID` | Your Cloudflare Account ID |
| `CLOUDFLARE_API_KEY` | Your Cloudflare API Token (with Workers permissions) |
| `GOOGLE_MAP_API_NEW` | Google Places Text Search and Place Details |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Complete Google service-account JSON for Sheets OAuth |
| `GOOGLE_SHEET_ID` | Spreadsheet ID from your Google Sheets URL |
| `FIRECRAWL_API_KEY` | Public-website enrichment via Firecrawl v2 |
| `GEMINI_API_KEY` | AI classification and lead fit scoring |
| `GEEKFLARE_API_KEY` | Optional security/meta scanning credential |

Note: I have already securely provisioned your `GOOGLE_SERVICE_ACCOUNT_JSON` directly on your Cloudflare Worker. You only need to add the remaining secrets in GitHub to enable full CI/CD synchronization.

The Google service account JSON is entered as one complete JSON value when prompted. The spreadsheet must be shared with the service-account email address with Editor permission. The API server writes to the `Leads` tab by default and includes a header row with business name, category, phone, email, address, website, rating, verification, source, and collection time.

## GitHub Pages

The included GitHub Actions workflow publishes `frontend/` on every push to `main`. After enabling GitHub Pages with **GitHub Actions** as the build source, the site will be available at:

```text
https://jennymahmuda.github.io/automation-scrapped/
```

After the Worker is deployed, update the `nexus-api-base` meta tag in `frontend/index.html` to the exact Worker URL, commit, and push. The frontend only stores that public URL; no API key is placed in it.

## Local development

For the local Python service:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

For local Worker development, use Wrangler with local secrets in `cloudflare/.dev.vars`. This file is ignored by Git and must never be committed.

## API request example

```json
{
  "keyword": "dental clinic",
  "location": "Austin, TX",
  "max_results": 20,
  "enrich_with_ai": true,
  "export_to_sheet": true
}
```

`sheet_id` and `sheet_tab` may be supplied per request, but the recommended production setup is to keep them as Cloudflare secrets/variables so the browser does not need to know them.

---

**Developed by Sayad md Bayezid & jenny**
© 2026 SmartGen Nexus. All rights reserved.
