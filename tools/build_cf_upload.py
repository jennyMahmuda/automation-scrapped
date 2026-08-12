import json
from pathlib import Path

worker_source = Path('/home/ubuntu/automation-scrapped/cloudflare/worker.js').read_text()
code = '''async () => {
  const workerSource = __WORKER_SOURCE__;
  const boundary = `NexusLeads-${Date.now()}`;
  const metadata = {
    main_module: "worker.js",
    "compatibility_date": "2026-08-08",
    "compatibility_flags": [],
    "workers_dev": true
  };
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="metadata"',
    'Content-Type: application/json',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Disposition: form-data; name="worker.js"; filename="worker.js"',
    'Content-Type: application/javascript+module',
    '',
    workerSource,
    `--${boundary}--`,
    ''
  ].join("\\r\\n");
  return await cloudflare.request({
    method: "PUT",
    path: `/accounts/${accountId}/workers/scripts/nexusleads-api`,
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
    rawBody: true
  });
}'''
code = code.replace('__WORKER_SOURCE__', json.dumps(worker_source))
Path('/tmp/nexusleads_cf_upload.json').write_text(json.dumps({'code': code}))
print('/tmp/nexusleads_cf_upload.json')
