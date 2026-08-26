import { loadConnectorMeta, saveConnectorMeta } from './storage.js';

let runtimeSecret = '';

function validateEndpoint(endpoint) {
  const url = new URL(endpoint);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Connector endpoint must use HTTPS in production.');
  if (url.protocol === 'http:' && location.protocol === 'https:') throw new Error('An HTTPS page cannot call an HTTP connector endpoint.');
  return url.toString().replace(/\/$/, '');
}

export function getConnectorState() {
  return { ...loadConnectorMeta(), apiKeyConfigured: Boolean(runtimeSecret) };
}

export function connectConnector({ endpoint, authType, secret }) {
  const safeEndpoint = validateEndpoint(String(endpoint || '').trim());
  if (authType !== 'none' && !String(secret || '').trim()) throw new Error('Enter the connector secret once to establish the session.');
  runtimeSecret = String(secret || '').trim();
  saveConnectorMeta({ endpoint: safeEndpoint, authType, apiKeyConfigured: Boolean(runtimeSecret) });
  return getConnectorState();
}

export function disconnectConnector() {
  runtimeSecret = '';
  saveConnectorMeta({ endpoint: '', authType: 'bearer', apiKeyConfigured: false });
  return getConnectorState();
}

function buildAuthHeaders(authType) {
  if (!runtimeSecret || authType === 'none') return {};
  if (authType === 'x-api-key') return { 'X-API-Key': runtimeSecret };
  if (authType === 'basic') return { Authorization: `Basic ${btoa(runtimeSecret)}` };
  return { Authorization: `Bearer ${runtimeSecret}` };
}

export async function generateWithConnector(payload) {
  const meta = loadConnectorMeta();
  if (!meta.endpoint) throw new Error('Configure a customer API endpoint in Admin settings first.');
  if (meta.authType !== 'none' && !runtimeSecret) throw new Error('Reconnect the customer API in this browser session; its secret is intentionally not stored.');
  const response = await fetch(`${validateEndpoint(meta.endpoint)}/api/barcode/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...buildAuthHeaders(meta.authType) },
    body: JSON.stringify({ format: payload.format, value: payload.value })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || 'Customer API rejected the barcode request.');
  if (!data.svg && !data.image_url && !data.png_base64) throw new Error('Customer API must return svg, image_url, or png_base64.');
  return data;
}

export function forgetRuntimeSecret() {
  runtimeSecret = '';
}
