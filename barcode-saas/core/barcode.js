const CODE39 = {
  '0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw','5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn',
  'A':'wnnnnwnnw','B':'nnwnnwnnw','C':'wnwnnwnnn','D':'nnnnwwnnw','E':'wnnnwwnnn','F':'nnwnwwnnn','G':'nnnnnwwnw','H':'wnnnnwwnn','I':'nnwnnwwnn','J':'nnnnwwwnn',
  'K':'wnnnnnnww','L':'nnwnnnnww','M':'wnwnnnnwn','N':'nnnnwnnww','O':'wnnnwnnwn','P':'nnwnwnnwn','Q':'nnnnnnwww','R':'wnnnnnwwn','S':'nnwnnnwwn','T':'nnnnwnwwn',
  'U':'wwnnnnnnw','V':'nwwnnnnnw','W':'wwwnnnnnn','X':'nwnnwnnnw','Y':'wwnnwnnnn','Z':'nwwnwnnnn','-':'nwnnnnwnw','.':'wwnnnnwnn',' ':'nwwnnnwnn','$':'nwnwnwnnn','/':'nwnwnnnwn','+':'nwnnnwnwn','%':'nnnwnwnwn','*':'nwnnwnwnn'
};

const EAN_L = {
  '0':'0001101','1':'0011001','2':'0010011','3':'0111101','4':'0100011','5':'0110001','6':'0101111','7':'0111011','8':'0110111','9':'0001011'
};
const EAN_G = {
  '0':'0100111','1':'0110011','2':'0011011','3':'0100001','4':'0011101','5':'0111001','6':'0000101','7':'0010001','8':'0001001','9':'0010111'
};
const EAN_R = {
  '0':'1110010','1':'1100110','2':'1101100','3':'1000010','4':'1011100','5':'1001110','6':'1010000','7':'1000100','8':'1001000','9':'1110100'
};
const PARITY = {
  '0':'LLLLLL','1':'LLGLGG','2':'LLGGLG','3':'LLGGGL','4':'LGLLGG','5':'LGGLLG','6':'LGGGLL','7':'LGLGLG','8':'LGLGGL','9':'LGGLGL'
};

function escapeXml(value) {
  return String(value).replace(/[&<>\"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&apos;' })[ch]);
}

function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function ean13Checksum(twelveDigits) {
  const digits = digitsOnly(twelveDigits).slice(0, 12).padStart(12, '0');
  const sum = digits.split('').reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return String((10 - (sum % 10)) % 10);
}

function normalizeEan13(value) {
  const raw = digitsOnly(value);
  if (raw.length === 12) return raw + ean13Checksum(raw);
  if (raw.length === 13) {
    const expected = ean13Checksum(raw.slice(0, 12));
    if (raw[12] !== expected) throw new Error(`Invalid EAN-13 check digit. Expected ${expected}.`);
    return raw;
  }
  throw new Error('EAN-13 requires 12 digits (check digit is added) or a valid 13-digit value.');
}

function normalizeUpca(value) {
  const raw = digitsOnly(value);
  if (raw.length === 11) return raw + ean13Checksum('0' + raw).slice(-1);
  if (raw.length === 12) {
    const expected = ean13Checksum('0' + raw.slice(0, 11));
    if (raw[11] !== expected) throw new Error(`Invalid UPC-A check digit. Expected ${expected}.`);
    return raw;
  }
  throw new Error('UPC-A requires 11 digits (check digit is added) or a valid 12-digit value.');
}

function barcodeSvg(width, height, modules, label, quiet = 10) {
  const moduleWidth = width / (modules.length + quiet * 2);
  const barHeight = height - 34;
  let x = quiet * moduleWidth;
  let bars = '';
  for (const bit of modules) {
    if (bit === '1') bars += `<rect x="${x.toFixed(3)}" y="10" width="${Math.max(moduleWidth, 0.5).toFixed(3)}" height="${barHeight}" fill="#08111f"/>`;
    x += moduleWidth;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(label)}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/>${bars}<text x="${width / 2}" y="${height - 8}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" letter-spacing="1" fill="#08111f">${escapeXml(label)}</text></svg>`;
}

function renderEan13(value, upca = false) {
  const digits = upca ? normalizeUpca(value) : normalizeEan13(value);
  const eanDigits = upca ? '0' + digits : digits;
  const parity = PARITY[eanDigits[0]];
  let modules = '101';
  for (let index = 1; index <= 6; index += 1) modules += (parity[index - 1] === 'L' ? EAN_L : EAN_G)[eanDigits[index]];
  modules += '01010';
  for (let index = 7; index <= 12; index += 1) modules += EAN_R[eanDigits[index]];
  modules += '101';
  return { svg: barcodeSvg(420, 210, modules, upca ? digits : digits), value: digits, format: upca ? 'UPC-A' : 'EAN-13' };
}

function renderCode39(value) {
  const clean = String(value ?? '').trim().toUpperCase();
  if (!clean) throw new Error('Code 39 requires a value.');
  if (clean.length > 80) throw new Error('Code 39 values are limited to 80 characters.');
  const full = `*${clean}*`;
  const unsupported = [...full].find(ch => !CODE39[ch]);
  if (unsupported) throw new Error(`Code 39 does not support “${unsupported}”. Use A–Z, 0–9, space, or - . $ / + %.`);
  let modules = '';
  [...full].forEach((character, index) => {
    const pattern = CODE39[character];
    [...pattern].forEach(kind => { modules += kind === 'w' ? '111' : '1'; modules += '0'; });
    if (index < full.length - 1) modules += '00';
  });
  return { svg: barcodeSvg(760, 210, modules, clean), value: clean, format: 'Code 39' };
}

export function generateBarcode({ format = 'CODE39', value = '' } = {}) {
  const key = String(format).toUpperCase();
  if (key === 'EAN13' || key === 'EAN-13') return renderEan13(value, false);
  if (key === 'UPCA' || key === 'UPC-A') return renderEan13(value, true);
  if (key === 'CODE39' || key === 'CODE 39') return renderCode39(value);
  throw new Error('Supported formats are Code 39, EAN-13, and UPC-A.');
}

export function svgToDataUri(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function svgToPngBlob(svg, scale = 2) {
  const image = new Image();
  image.src = svgToDataUri(svg);
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
  const canvas = document.createElement('canvas');
  canvas.width = 840 * scale;
  canvas.height = 420 * scale;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}
