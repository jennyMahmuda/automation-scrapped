import assert from 'node:assert/strict';
import { ean13Checksum, generateBarcode } from '../core/barcode.js';

assert.equal(ean13Checksum('400638133393'), '1');
assert.equal(generateBarcode({ format: 'EAN13', value: '400638133393' }).value, '4006381333931');
assert.equal(generateBarcode({ format: 'UPCA', value: '03600029145' }).value, '036000291452');
assert.equal(generateBarcode({ format: 'CODE39', value: 'INV-2026-001' }).format, 'Code 39');
assert.match(generateBarcode({ format: 'CODE39', value: 'ABC 123' }).svg, /^<svg/);
assert.throws(() => generateBarcode({ format: 'EAN13', value: '4006381333932' }), /Invalid EAN-13/);
assert.throws(() => generateBarcode({ format: 'CODE39', value: 'bad_underscore' }), /does not support/);
console.log('barcode-saas tests passed');
