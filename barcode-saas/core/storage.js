const BRAND_KEY = 'nexus-barcode-brand-v1';
const CONNECTOR_KEY = 'nexus-barcode-connector-v1';

export const defaultBrand = {
  name: 'NexusBarcode',
  tagline: 'Private barcode tools for modern commerce',
  accent: '#55e6c1',
  accentSecondary: '#7c6cff',
  density: 'comfortable',
  defaultFormat: 'CODE39',
  showPrivacyPanel: true
};

export function loadBrand() {
  try { return { ...defaultBrand, ...JSON.parse(localStorage.getItem(BRAND_KEY) || '{}') }; }
  catch { return { ...defaultBrand }; }
}

export function saveBrand(brand) {
  const safe = { ...defaultBrand, ...brand };
  localStorage.setItem(BRAND_KEY, JSON.stringify(safe));
  return safe;
}

export function loadConnectorMeta() {
  try {
    const value = JSON.parse(localStorage.getItem(CONNECTOR_KEY) || '{}');
    return {
      endpoint: typeof value.endpoint === 'string' ? value.endpoint : '',
      authType: ['none', 'bearer', 'x-api-key', 'basic'].includes(value.authType) ? value.authType : 'bearer',
      apiKeyConfigured: false
    };
  } catch { return { endpoint: '', authType: 'bearer', apiKeyConfigured: false }; }
}

export function saveConnectorMeta(meta) {
  const safe = { endpoint: String(meta.endpoint || '').trim(), authType: meta.authType || 'bearer' };
  localStorage.setItem(CONNECTOR_KEY, JSON.stringify(safe));
  return { ...safe, apiKeyConfigured: Boolean(meta.apiKeyConfigured) };
}

export function clearBarcodeLocalState() {
  localStorage.removeItem(BRAND_KEY);
  localStorage.removeItem(CONNECTOR_KEY);
}

export function applyBrand(brand) {
  document.documentElement.style.setProperty('--accent', brand.accent);
  document.documentElement.style.setProperty('--accent-2', brand.accentSecondary);
  document.documentElement.dataset.density = brand.density;
}
