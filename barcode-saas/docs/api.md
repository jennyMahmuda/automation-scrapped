# NexusBarcode API documentation

This guide is for ecommerce developers who want to connect a store admin dashboard, inventory system, fulfillment workflow, or internal product screen to the NexusBarcode-compatible API contract.

The public browser tool is available at [`https://leads.sayadbayezid.com/barcode-saas/`](https://leads.sayadbayezid.com/barcode-saas/). The API integration is designed for a **customer-owned server**. Your server receives a barcode request, generates or retrieves the barcode, and returns a renderable result to the admin dashboard. NexusBarcode does not act as a proxy and does not store your ecommerce data.

> **Recommended architecture:** Keep provider credentials and API secrets on your server. Your admin dashboard should call your own authenticated backend, and your backend should call the barcode generator service or generate the barcode locally.

## 1. Integration model

There are two supported integration models. **Local browser generation** is best for simple admin screens where no server-side workflow is required. **Customer API mode** is best when barcode generation must be connected to products, SKUs, orders, warehouse actions, or audit rules already controlled by your server.

| Model | Request path | Data retention | Best for |
|---|---|---|---|
| Browser-local | No network request | Page memory and browser download only | Manual barcode creation and quick previews |
| Customer API | `POST {BASE_URL}/api/barcode/generate` | Controlled by your server | Product admin dashboards and automated ecommerce workflows |

## 2. Endpoint

```http
POST {CUSTOMER_API_BASE_URL}/api/barcode/generate
Content-Type: application/json
Accept: application/json
```

The browser tool appends `/api/barcode/generate` to the base URL configured by the administrator. For example:

```text
https://store-api.example.com
```

becomes:

```text
https://store-api.example.com/api/barcode/generate
```

Use HTTPS in every production environment. The browser client rejects an HTTP endpoint when the barcode page itself is served over HTTPS.

## 3. Authentication

The admin dashboard supports one of four authentication modes. The secret is entered into the browser for the current tab only and is never saved by the NexusBarcode module. For stronger production isolation, many teams should configure the browser to call a same-origin backend route that keeps the upstream credential entirely on the server.

| Mode | Header sent by the browser | Recommended use |
|---|---|---|
| Bearer token | `Authorization: Bearer <secret>` | Standard server-to-server token authentication |
| API key | `X-API-Key: <secret>` | Providers that issue a dedicated API-key credential |
| Basic | `Authorization: Basic <secret>` | Legacy systems where the pre-encoded value is required |
| None | No credential header | Local development only or a separately protected same-origin route |

Do not place a long-lived provider key in a publicly committed frontend file. If your dashboard uses user sessions, have your backend authenticate the logged-in admin and make the backend-to-barcode request server-side.

## 4. Request schema

The request body contains only the format and value required to create the barcode.

```json
{
  "format": "EAN13",
  "value": "590123412345"
}
```

### Fields

| Field | Type | Required | Accepted values | Notes |
|---|---|---:|---|---|
| `format` | string | Yes | `CODE39`, `EAN13`, `UPCA` | Case-insensitive aliases `EAN-13`, `UPC-A`, and `CODE 39` may also be accepted by the local tool. |
| `value` | string | Yes | Format-specific | The server should validate and normalize before generation. |

### Format rules

| Format | Input rule | Example |
|---|---|---|
| Code 39 | A–Z, 0–9, space, `- . $ / + %`; maximum 80 characters in the browser tool | `INV-2026-001` |
| EAN-13 | 12 digits to calculate the check digit, or a valid 13-digit value | `400638133393` becomes `4006381333931` |
| UPC-A | 11 digits to calculate the check digit, or a valid 12-digit value | `03600029145` becomes `036000291452` |

The customer server should reject malformed values with a safe validation error. Do not trust a value merely because it came from an authenticated admin user; validate the format again on the server.

## 5. Successful response

The preferred response is an SVG because it is sharp at different display and print sizes.

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "success": true,
  "format": "EAN-13",
  "value": "5901234123457",
  "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\">...</svg>"
}
```

The browser tool also accepts a hosted image URL or a base64-encoded PNG.

```json
{
  "success": true,
  "format": "EAN-13",
  "value": "5901234123457",
  "image_url": "https://cdn.store.example/barcodes/5901234123457.png"
}
```

```json
{
  "success": true,
  "format": "EAN-13",
  "value": "5901234123457",
  "png_base64": "iVBORw0KGgoAAAANSUhEUg..."
}
```

Your response should include exactly one renderable result: `svg`, `image_url`, or `png_base64`. If multiple representations are returned, the browser uses the SVG first, then the image URL, then base64 PNG.

## 6. Error responses

Use a non-2xx status and a short, safe error message. The browser displays the `error` field and does not need stack traces or provider response bodies.

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
```

```json
{
  "success": false,
  "error": "The submitted value is not valid for EAN-13."
}
```

Recommended status mapping:

| Status | Meaning | Example |
|---:|---|---|
| `400` | Invalid request or barcode value | Unsupported characters or incorrect check digit |
| `401` | Missing or invalid credential | Token is absent or expired |
| `403` | Authenticated user lacks permission | Warehouse role cannot generate labels |
| `404` | Product or upstream resource not found | SKU does not exist |
| `409` | Business conflict | SKU is archived or locked |
| `429` | Rate limit exceeded | Too many generation requests |
| `500` | Temporary server failure | Internal rendering failure |
| `503` | Service unavailable | Upstream generator is unavailable |

Never include an API key, bearer token, Basic credential, database password, complete request body, or stack trace in an error response.

## 7. Admin dashboard integration

A secure ecommerce dashboard normally calls its own backend, not a third-party barcode endpoint directly. The backend can confirm that the current operator may generate a label, load the SKU, and then make the barcode request.

### Browser dashboard example

```js
async function generateSkuBarcode(sku, format = 'CODE39') {
  const response = await fetch('/admin/api/barcodes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': window.csrfToken
    },
    credentials: 'include',
    body: JSON.stringify({ sku, format })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Barcode generation failed.');

  document.querySelector('#barcode-preview').src = data.image_url;
  document.querySelector('#barcode-value').textContent = data.value;
}
```

### Node.js server example

This example keeps the upstream token on the server. It assumes your store server has already authenticated the admin and has loaded the SKU from your database.

```js
import express from 'express';

const app = express();
app.use(express.json());

app.post('/admin/api/barcodes', requireAdminSession, async (req, res) => {
  const sku = String(req.body.sku || '').trim();
  const format = String(req.body.format || 'CODE39').toUpperCase();

  if (!sku || !['CODE39', 'EAN13', 'UPCA'].includes(format)) {
    return res.status(400).json({ error: 'A valid SKU and barcode format are required.' });
  }

  const upstream = await fetch(`${process.env.BARCODE_API_BASE_URL}/api/barcode/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${process.env.BARCODE_API_TOKEN}`
    },
    body: JSON.stringify({ format, value: sku })
  });

  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok || result.success === false) {
    return res.status(upstream.status || 502).json({ error: result.error || 'Barcode provider request failed.' });
  }

  // Store only the fields your business needs. Do not log result.svg or secrets.
  return res.json({
    success: true,
    value: result.value || sku,
    format: result.format || format,
    image_url: result.image_url,
    svg: result.svg
  });
});
```

For high-volume dashboards, add a server-side queue, idempotency key, rate limiting, and a controlled retry policy. Do not retry `400`, `401`, `403`, or `409` responses automatically.

## 8. cURL test

Replace the example endpoint and token with your own values. Never commit a real token to source control.

```bash
curl --fail-with-body \
  -X POST "https://store-api.example.com/api/barcode/generate" \
  -H "Authorization: Bearer ${BARCODE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data '{"format":"EAN13","value":"400638133393"}'
```

A successful response should include a renderable `svg`, `image_url`, or `png_base64` field.

## 9. CORS and browser security

If the browser dashboard calls the customer endpoint directly, the customer server must return a narrow CORS policy for the deployed barcode origin. Do not use `Access-Control-Allow-Origin: *` together with credentials.

```http
Access-Control-Allow-Origin: https://leads.sayadbayezid.com
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key
Vary: Origin
```

Handle `OPTIONS` requests and reject unexpected origins. A same-origin backend route is safer when the connector credential should never reach browser JavaScript.

## 10. Privacy and logging checklist

The barcode module itself does not store barcode history, generated images, customer database records, or API secrets. In API mode, the customer server controls its own data handling. Ecommerce developers should therefore review the following controls before production launch.

| Control | Required behavior |
|---|---|
| Request logs | Redact authorization headers and avoid logging complete barcode request bodies if values are sensitive. |
| Secrets | Store tokens in a server-side secret manager or environment binding; rotate them periodically. |
| Retention | Define whether barcode values, SVGs, and audit records are retained, and for how long. |
| Authorization | Require the appropriate admin or warehouse permission before generating. |
| Rate limits | Limit per user, store, IP, and server token as appropriate. |
| Idempotency | Use an idempotency key when a retry must not create duplicate inventory records. |
| CORS | Allow only the known dashboard origin when direct browser calls are unavoidable. |
| Downloads | Treat generated files as customer data and secure any CDN URL or signed download URL. |

## 11. Production readiness checklist

Before enabling the connector for store administrators, confirm that the endpoint uses HTTPS, authentication is active, CORS is restricted, the server validates all formats and values, error responses are safe, and the dashboard shows the generated value alongside the preview. Test expired credentials, malformed values, rate limits, duplicate requests, and upstream downtime.

For the fastest initial integration, point the Admin dashboard at your server’s base URL, choose Bearer authentication, enter the token for the current browser session, and run the cURL request above from your deployment environment. Once the response contract is confirmed, connect the SKU/product action in your own admin UI.

## References

[1]: https://leads.sayadbayezid.com/barcode-saas/ "NexusBarcode live generator"
[2]: https://leads.sayadbayezid.com/barcode-saas/admin/ "NexusBarcode admin customization dashboard"
