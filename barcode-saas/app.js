import { generateBarcode, svgToDataUri, svgToPngBlob } from './core/barcode.js';
import { connectConnector, generateWithConnector, getConnectorState, forgetRuntimeSecret } from './core/api-client.js';
import { applyBrand, loadBrand, loadConnectorMeta } from './core/storage.js';

const brand = loadBrand();
applyBrand(brand);
document.querySelectorAll('[data-brand-name]').forEach(node => { node.textContent = brand.name; });
document.querySelectorAll('[data-brand-tagline]').forEach(node => { node.textContent = brand.tagline; });

const format = document.querySelector('#format');
const value = document.querySelector('#value');
const mode = document.querySelector('#mode');
const preview = document.querySelector('#preview');
const status = document.querySelector('#status');
const outputFormat = document.querySelector('#output-format');
const generateButton = document.querySelector('#generate');
const sessionConnector = document.querySelector('#session-connector');
const sessionSecret = document.querySelector('#session-secret');
const sessionConnect = document.querySelector('#session-connect');
const downloadSvgButton = document.querySelector('#download-svg');
const downloadPngButton = document.querySelector('#download-png');
let lastSvg = '';

format.value = brand.defaultFormat;
const connector = loadConnectorMeta();
if (connector.endpoint) mode.querySelector('option[value="api"]').textContent = `Use connected customer API — ${connector.endpoint}`;

function setStatus(message, error = false) {
  status.textContent = message;
  status.style.color = error ? '#ff9fb1' : 'var(--accent)';
}

function refreshSessionConnector() {
  const state = getConnectorState();
  sessionConnector.style.display = mode.value === 'api' ? 'block' : 'none';
  sessionConnect.textContent = state.apiKeyConfigured ? 'Reconnect customer API for this tab' : 'Connect securely for this tab';
}

sessionConnect.addEventListener('click', () => {
  try {
    const state = connectConnector({ endpoint: connector.endpoint, authType: connector.authType, secret: sessionSecret.value });
    sessionSecret.value = '';
    setStatus(`Customer API connected for this tab: ${state.endpoint}. Secret cleared from the form.`);
    refreshSessionConnector();
  } catch (error) { setStatus(error.message || 'Could not connect to the customer API.', true); }
});
mode.addEventListener('change', refreshSessionConnector);

function renderResult(data) {
  lastSvg = data.svg || '';
  if (lastSvg) preview.innerHTML = `<img alt="${data.format || format.value} barcode preview" src="${svgToDataUri(lastSvg)}">`;
  else if (data.image_url) { lastSvg = ''; preview.innerHTML = `<img alt="Barcode preview" src="${data.image_url}">`; }
  else if (data.png_base64) { lastSvg = ''; preview.innerHTML = `<img alt="Barcode preview" src="data:image/png;base64,${data.png_base64}">`; }
  outputFormat.textContent = data.format || format.value;
  downloadSvgButton.disabled = !lastSvg;
  downloadPngButton.disabled = !lastSvg;
}

async function generate() {
  if (!value.value.trim()) { setStatus('Enter a barcode value first.', true); value.focus(); return; }
  generateButton.disabled = true;
  setStatus(mode.value === 'local' ? 'Rendering locally. No network request will be made.' : 'Sending only the requested value to the connected customer API.');
  try {
    const result = mode.value === 'local' ? generateBarcode({ format: format.value, value: value.value }) : await generateWithConnector({ format: format.value, value: value.value });
    renderResult(result);
    setStatus(`Generated ${result.format || format.value}. Nothing was saved.`);
  } catch (error) {
    setStatus(error.message || 'Could not generate the barcode.', true);
  } finally { generateButton.disabled = false; }
}

generateButton.addEventListener('click', generate);
value.addEventListener('keydown', event => { if (event.key === 'Enter') generate(); });
document.querySelector('#clear').addEventListener('click', () => {
  value.value = '';
  lastSvg = '';
  preview.innerHTML = '<p class="helper">Your barcode preview will appear here.</p>';
  outputFormat.textContent = 'Waiting';
  downloadSvgButton.disabled = true;
  downloadPngButton.disabled = true;
  setStatus('Cleared from this page.');
});
downloadSvgButton.addEventListener('click', () => {
  if (!lastSvg) return;
  const link = document.createElement('a');
  link.href = svgToDataUri(lastSvg); link.download = `barcode-${Date.now()}.svg`; link.click();
});
downloadPngButton.addEventListener('click', async () => {
  if (!lastSvg) return;
  const blob = await svgToPngBlob(lastSvg);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `barcode-${Date.now()}.png`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
window.addEventListener('pagehide', forgetRuntimeSecret);
refreshSessionConnector();
setStatus(`Ready. ${getConnectorState().endpoint ? 'A customer API is configured in Admin settings.' : 'Local mode is active.'}`);
