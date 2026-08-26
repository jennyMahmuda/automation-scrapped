import { applyBrand, defaultBrand, loadBrand, loadConnectorMeta, saveBrand } from '../core/storage.js';
import { connectConnector, disconnectConnector, getConnectorState } from '../core/api-client.js';

let brand = loadBrand();
const fields = {
  name: document.querySelector('#brand-name'), tagline: document.querySelector('#tagline'), accent: document.querySelector('#accent'), accentSecondary: document.querySelector('#accent-secondary'), defaultFormat: document.querySelector('#default-format'), density: document.querySelector('#density'), showPrivacyPanel: document.querySelector('#show-privacy')
};
const connectorFields = { endpoint: document.querySelector('#endpoint'), authType: document.querySelector('#auth-type'), secret: document.querySelector('#secret') };
const brandStatus = document.querySelector('#brand-status');
const connectorStatus = document.querySelector('#connector-status');

function fillBrand() {
  Object.entries(fields).forEach(([key, node]) => { node.type === 'checkbox' ? node.checked = Boolean(brand[key]) : node.value = brand[key] ?? ''; });
  applyBrand(brand);
  document.querySelectorAll('[data-brand-name]').forEach(node => { node.textContent = brand.name; });
}
function setStatus(node, text, error = false) { node.textContent = text; node.style.color = error ? '#ff9fb1' : 'var(--accent)'; }
function renderConnectorState() {
  const state = getConnectorState();
  connectorFields.endpoint.value = state.endpoint || '';
  connectorFields.authType.value = state.authType || 'bearer';
  setStatus(connectorStatus, state.endpoint ? (state.apiKeyConfigured ? `Connected for this tab: ${state.endpoint}` : `Endpoint saved, secret not active until you reconnect: ${state.endpoint}`) : 'No customer API connected.');
}

fillBrand();
renderConnectorState();

document.querySelector('#brand-form').addEventListener('submit', event => {
  event.preventDefault();
  brand = saveBrand({ name: fields.name.value.trim() || defaultBrand.name, tagline: fields.tagline.value.trim() || defaultBrand.tagline, accent: fields.accent.value, accentSecondary: fields.accentSecondary.value, defaultFormat: fields.defaultFormat.value, density: fields.density.value, showPrivacyPanel: fields.showPrivacyPanel.checked });
  fillBrand();
  setStatus(brandStatus, 'Customization saved locally in this browser only.');
});
document.querySelector('#reset-brand').addEventListener('click', () => { brand = saveBrand(defaultBrand); fillBrand(); setStatus(brandStatus, 'Appearance reset.'); });
document.querySelector('#connect').addEventListener('click', () => {
  try {
    const state = connectConnector({ endpoint: connectorFields.endpoint.value, authType: connectorFields.authType.value, secret: connectorFields.secret.value });
    connectorFields.secret.value = '';
    setStatus(connectorStatus, `Connected for this tab: ${state.endpoint}. Secret cleared from the form and memory remains session-only.`);
  } catch (error) { setStatus(connectorStatus, error.message || 'Could not connect.', true); }
});
document.querySelector('#disconnect').addEventListener('click', () => { disconnectConnector(); connectorFields.secret.value = ''; renderConnectorState(); });
window.addEventListener('pagehide', () => { connectorFields.secret.value = ''; });
