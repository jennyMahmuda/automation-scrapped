# NexusBarcode workflow map

## Product boundary

The add-on is a standalone static module under `barcode-saas/`. It has two user-facing surfaces: a generator and an admin customization dashboard. The module has no server of its own and no persistence layer.

```text
Admin opens barcode-saas/admin/
        |
        +--> Save harmless UI preferences locally
        |
        +--> Enter customer API endpoint + secret
                    |
                    +--> endpoint/auth mode saved locally
                    +--> secret retained in memory for this tab only

User opens barcode-saas/
        |
        +--> Local mode (default)
        |       |
        |       +--> validate format/value
        |       +--> generate SVG in browser
        |       +--> convert SVG to PNG in browser when requested
        |       +--> download file; no network request
        |
        +--> Customer API mode
                |
                +--> validate connector session
                +--> POST /api/barcode/generate
                    { format, value }
                +--> receive svg, image_url, or png_base64
                +--> render result and download locally
```

## Security and retention boundaries

| Area | Behavior |
| --- | --- |
| Barcode values | Exist in active page memory only; never placed in local storage, cookies, or a database by this module. |
| Generated SVG/PNG | Exists in active page memory or browser download flow only; no server upload occurs in local mode. |
| Customer API secret | Entered once, held in JavaScript memory for the current tab, cleared from the form after connection, and forgotten on page exit. |
| Customer API endpoint | Stored as non-secret connection metadata to avoid retyping the URL; the endpoint is not a credential. |
| Admin preferences | Stored locally for branding and layout only. |
| Customer server | Receives only the requested `{ format, value }` payload in API mode and controls its own server-side retention. |
| Existing NexusLeads runtime | Not imported, edited, or called. No legacy route, database table, Worker binding, or root workflow is changed. |

## Failure behavior

Invalid values are rejected in the browser before a customer API call is made. Connector failures show a concise error without echoing the secret. Unsupported API response shapes are rejected because the UI accepts only `svg`, `image_url`, or `png_base64`. If the tab is reopened, the user must reconnect the API secret by design.

## Deployment mapping

The existing repository’s deployment workflows intentionally do not include this new folder. This preserves the user’s zero-touch requirement. The module is deployable as a separate static site by publishing only this directory, or it can be copied into a new standalone repository with its own host-specific workflow.
