# NexusLeads: AI-Powered B2B Lead Scraper & Verifier

NexusLeads is an intelligent lead generation application featuring a **Python backend** (compatible with Cloudflare Workers / server deployment) and a **premium Tailwind CSS frontend** hosted on **GitHub Pages**.

## Architecture & Features

- **Frontend (`index.html`)**: Built with Tailwind CSS and Alpine.js, featuring a dark cyberpunk aesthetic, real-time lead search, status indicators, and CSV export.
- **Backend API (`backend/main.py`)**: Built with FastAPI, integrating:
  - **Google Maps API** (`GOOGLE_MAP_API_NEW`) for finding local businesses, addresses, phone numbers, and websites.
  - **Gemini API** (`GEMINI_API_KEY`) for AI lead enrichment and categorization.
  - **Firecrawl API** (`FIRECRAWL_API_KEY`) & **Geekflare API** (`GEEKFLARE_API_KEY`) for deep scraping and technical verification.
  - **Google Sheets Integration** (`Googleservices.json`) for automatic lead synchronization.

---

## Security & Secrets Management

To ensure your secret keys (`CLOUDFLARE_AC_ID`, `CLOUDFLARE_API_KEY`, `GOOGLE_MAP_API_NEW`, `GEMINI_API_KEY`, `GEEKFLARE_API_KEY`, `FIRECRAWL_API_KEY`, and `Googleservices.json`) are **never exposed**:
1. All secrets are stored securely as environment variables or Cloudflare secrets.
2. `Googleservices.json` is listed in `.gitignore` and will never be committed to GitHub.

---

## Setup & Deployment Instructions

### 1. Frontend Deployment (GitHub Pages)
1. Copy `frontend/index.html` to the root of your repository (or configure GitHub Pages to serve from `frontend/`).
2. Enable **GitHub Pages** in your repository settings (`Settings > Pages > Build and deployment > Source: GitHub Actions` or main branch).
3. The frontend will be live at `https://<your-username>.github.io/automation-scrapped/`.

### 2. Backend Deployment (Cloudflare / Python Server)
1. Set up your Cloudflare Worker or Python hosting environment.
2. Add your secrets to Cloudflare Environment Variables or your server `.env`:
   - `GOOGLE_MAP_API_NEW`
   - `GEMINI_API_KEY`
   - `GEEKFLARE_API_KEY`
   - `FIRECRAWL_API_KEY`
3. Place your Google Service Account credentials file as `backend/Googleservices.json` (ensure it is git-ignored).
4. Run the backend server:
   ```bash
   pip install -r backend/requirements.txt
   uvicorn backend.main:app --host 0.0.0.0 --port 8000
   ```
