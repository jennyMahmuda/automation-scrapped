# NexusBarcode — isolated ecommerce barcode add-on

NexusBarcode is a standalone, browser-first barcode tool for ecommerce teams. It is intentionally contained in this `barcode-saas/` directory and does not import, modify, or depend on the legacy NexusLeads frontend, backend, Cloudflare Worker, database, or GitHub workflows.

## What is included

| Path | Purpose |
| --- | --- |
| `index.html` | Barcode generator interface with local and customer-API modes. |
| `admin/index.html` | Admin dashboard for branding, default format, density, and API connection settings. |
| `core/barcode.js` | Deterministic Code 39, EAN-13, and UPC-A SVG generation plus PNG conversion. |
| `core/api-client.js` | Customer-owned API adapter supporting bearer, `X-API-Key`, basic, and no-auth requests. |
| `core/storage.js` | Local-only UI metadata storage; no barcode values, images, or secrets are stored. |
| `workflows/workflow-map.md` | End-to-end workflow and security boundary. |
| `workflows/customer-api-contract.md` | Compact contract for plugging in a customer’s server API. |
| `docs/api.md` | Full ecommerce developer API documentation with dashboard examples and production checklists. |
| `tests/barcode.test.js` | Deterministic validation tests. |

## Live URLs

- Generator: <https://leads.sayadbayezid.com/barcode-saas/>
- Admin customization: <https://leads.sayadbayezid.com/barcode-saas/admin/>
- Developer API documentation: [`docs/api.md`](./docs/api.md)

## Run locally

From this directory, use any static server. For example:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173/barcode-saas/` when serving from the repository root, or open the module root when serving from inside `barcode-saas/`.

No package installation, database, account, or server API is required for local generation.

## Privacy model

Local generation is the default and makes no network request. The module does not maintain a generation history, does not send analytics, has no database schema, and does not write barcode values or images to local storage. The Admin screen stores only harmless display preferences and the customer API endpoint/auth mode label. The API secret is accepted at runtime, kept in memory only, cleared from the input after connection, and removed on page exit.

When API mode is selected, only `{ format, value }` is sent to the configured customer-owned endpoint. The customer server is responsible for its own retention policy. This add-on does not proxy or store the customer’s data.

## Zero-touch guarantee

The implementation was created under a new folder, and the existing application source folders remain unchanged. The GitHub Pages workflow now assembles the existing `frontend/` at the site root and publishes this module at `/barcode-saas/`. The Cloudflare backend workflow and legacy runtime remain unchanged.

## Supported output contract

The local engine returns an SVG. The PNG download is generated in the browser from that SVG. A compatible customer API may return an SVG, `image_url`, or base64 PNG; see `workflows/customer-api-contract.md`.
