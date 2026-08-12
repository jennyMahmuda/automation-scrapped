# NexusLeads

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

## Cloudflare backend deployment

The production backend is successfully deployed as a Cloudflare Worker named `nexusleads-api` at:
`https://nexusleads-api.mahmudajenny6.workers.dev`

It exposes `GET /api/health` and `POST /api/scrape`.

The Worker is configured for a `workers.dev` endpoint. Cloudflare Python Workers are currently in open beta and require a special compatibility flag; this project therefore keeps the production edge handler in the stable JavaScript module Worker runtime while retaining `backend/main.py` for local Python development. This avoids claiming that the Python development server is itself the deployed edge runtime.

## Required Cloudflare secrets

Set each value with the Cloudflare dashboard or `wrangler secret put`. Never place secret values in `wrangler.toml`, GitHub Actions, HTML, JavaScript shipped to browsers, or committed files.

| Secret | Purpose |
|---|---|
| `GOOGLE_MAP_API_NEW` | Google Places Text Search and Place Details. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Complete Google service-account JSON for Sheets OAuth. The service account must be granted access to the target spreadsheet. |
| `GOOGLE_SHEET_ID` | Spreadsheet ID from the Google Sheets URL. |
| `FIRECRAWL_API_KEY` | Optional public-website enrichment through Firecrawl v2. |
| `GEMINI_API_KEY` | Optional AI classification and fit scoring. |
| `GEEKFLARE_API_KEY` | Retained as an optional provider credential; no undocumented Geekflare endpoint is guessed. |

Example commands use placeholders only:

```bash
npx wrangler secret put GOOGLE_MAP_API_NEW
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
npx wrangler secret put GOOGLE_SHEET_ID
npx wrangler secret put FIRECRAWL_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GEEKFLARE_API_KEY
```

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
