# Customer API contract

NexusBarcode calls the configured customer endpoint with a single request shape. The endpoint is configured in Admin settings and the path is appended automatically.

## Request

```http
POST {CUSTOMER_API_BASE_URL}/api/barcode/generate
Content-Type: application/json
Accept: application/json
Authorization: Bearer {secret}
```

The authentication header changes according to the admin setting. For `x-api-key`, the client sends `X-API-Key`; for `basic`, the secret field must already contain the value expected by the Basic scheme; for `none`, no authentication header is sent. Production deployments should use HTTPS.

```json
{
  "format": "EAN13",
  "value": "590123412345"
}
```

## Successful response

The preferred response is an SVG because it keeps the output sharp at any size.

```json
{
  "success": true,
  "format": "EAN-13",
  "value": "5901234123457",
  "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\">...</svg>"
}
```

The UI also accepts either of these alternatives:

```json
{ "success": true, "format": "EAN-13", "image_url": "https://customer-cdn.example/barcode.png" }
```

```json
{ "success": true, "format": "EAN-13", "png_base64": "iVBORw0KGgoAAAANSUhEUg..." }
```

## Error response

Return a non-2xx status and a short, safe message. Do not include API keys, authorization headers, complete request bodies, database credentials, or stack traces.

```json
{
  "success": false,
  "error": "The submitted value is not valid for EAN-13."
}
```

## Customer-server implementation notes

The customer server should authenticate the request, validate `format` against the supported allowlist, validate and normalize `value`, apply rate limits, and choose its own retention policy. If the customer does not want server-side retention, it should generate the output in memory and avoid request-body logging. CORS should allow only the deployed NexusBarcode origin, not `*`, when credentials are used.
