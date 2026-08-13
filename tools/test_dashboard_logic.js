const fs = require('fs');
const vm = require('vm');

const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
global.window = {
  NEXUS_API_BASE: 'https://example.test',
  confirm: () => true,
  URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
};
global.document = { querySelector: () => ({ content: 'https://example.test' }), createElement: () => ({}) };
global.navigator = { clipboard: { writeText: async () => {} } };

global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ success: true }) });

global.alert = () => {};
vm.runInThisContext(fs.readFileSync('/home/ubuntu/automation-scrapped/frontend/app.js', 'utf8'));

const app = leadApp();
app.currentUser = { id: 'test-user', email: 'test@example.com' };
app.sheetId = '';
app.toggleAutoPush(true);
if (app.autoPushEnabled !== false) throw new Error('Auto-Push must remain disconnected without a Sheet');
app.sheetId = 'sheet-test';
app.toggleAutoPush(true);
if (app.autoPushEnabled !== true || app.metrics.sheet !== 'Connected') throw new Error('Auto-Push did not connect after Sheet configuration');
app.toggleAutoPush(false);
if (app.autoPushEnabled !== false || app.metrics.sheet !== 'Disconnected') throw new Error('Auto-Push did not disconnect when unchecked');
app.leads = Array.from({ length: 200 }, (_, index) => ({ name: `Lead ${index + 1}`, selected: false }));
app.toggleAll(true);
if (!app.allSelected() || app.selectedCount() !== 200) throw new Error('Select-all failed for 200 rows');
app.leads[0].selected = false;
app.persistWorkspace();
const saved = JSON.parse(storage.get('nexusleads-workspace-test-user'));
if (saved.leads.length !== 200 || saved.leads[0].selected !== false) throw new Error('Per-user workspace persistence failed');
app.clearWorkspace();
if (app.leads.length !== 0 || storage.has('nexusleads-workspace-test-user')) throw new Error('Clear dashboard failed');
console.log('PASS: auto-push connect/disconnect, select-all 200, persistence, and clear logic');
