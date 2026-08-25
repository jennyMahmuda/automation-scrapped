# NexusLeads Doctor — সহজ রিপোর্ট

**সার্বিক অবস্থা:** `CRITICAL`  
**Health score:** `0/100`  
**রিপোর্ট সময়:** `2026-08-25 23:58 UTC`  
**Website checked:** `https://leads.sayadbayezid.com/`  
**API checked:** `https://nexusleads-api.mahmudajenny6.workers.dev`

> এই রিপোর্টের উদ্দেশ্য হলো আপনাকে raw log পড়তে না দেওয়া। নিচে সরাসরি বলা আছে: কী সমস্যা, কোন ফাইলে, কোন লাইনে, কেন হচ্ছে, এবং এখন কী করবেন।

## Login ও নতুন account check

| Check | ফলাফল | সহজ ব্যাখ্যা |
|---|---|---|
| `signup` | `BLOCKED` | The browser could not read the API response; likely CORS. |
| `login` | `BLOCKED` | The browser could not read the API response; likely CORS. |

**গুরুত্বপূর্ণ:** Doctor account তৈরি করে না এবং কোনো real password ব্যবহার করে না। Signup-এর জন্য invalid email/short password এবং login-এর জন্য fake credentials পাঠানো হয়; এর উদ্দেশ্য শুধু browser-to-API connection ও CORS পরীক্ষা করা।

## আগে এই সমস্যাগুলো ঠিক করুন

| অগ্রাধিকার | সমস্যা | কোন file | কোন line | কেন হচ্ছে / কী করবেন |
|---|---|---|---|---|
| 1. `HIGH` | The browser printed an error | `frontend/index.html or frontend/app.js` | `Not established` | **কারণ:** Access to fetch at 'https://nexusleads-api.mahmudajenny6.workers.dev/api/usage' from origin 'https://leads.sayadbayezid.com' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.<br>**করণীয়:** Open the browser console message and fix the referenced JavaScript or network request. |
| 2. `HIGH` | The browser printed an error | `frontend/index.html or frontend/app.js` | `Not established` | **কারণ:** Failed to load resource: net::ERR_FAILED<br>**করণীয়:** Open the browser console message and fix the referenced JavaScript or network request. |
| 3. `HIGH` | The browser printed an error | `frontend/index.html or frontend/app.js` | `Not established` | **কারণ:** Access to fetch at 'https://nexusleads-api.mahmudajenny6.workers.dev/api/reviews' from origin 'https://leads.sayadbayezid.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.<br>**করণীয়:** Open the browser console message and fix the referenced JavaScript or network request. |
| 4. `HIGH` | The browser printed an error | `frontend/index.html or frontend/app.js` | `Not established` | **কারণ:** Failed to load resource: net::ERR_FAILED<br>**করণীয়:** Open the browser console message and fix the referenced JavaScript or network request. |
| 5. `HIGH` | The browser printed an error | `frontend/index.html or frontend/app.js` | `Not established` | **কারণ:** Access to fetch at 'https://nexusleads-api.mahmudajenny6.workers.dev/api/auth/signup' from origin 'https://leads.sayadbayezid.com' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.<br>**করণীয়:** Open the browser console message and fix the referenced JavaScript or network request. |
| 6. `HIGH` | The browser printed an error | `frontend/index.html or frontend/app.js` | `Not established` | **কারণ:** Failed to load resource: net::ERR_FAILED<br>**করণীয়:** Open the browser console message and fix the referenced JavaScript or network request. |
| 7. `HIGH` | The browser printed an error | `frontend/index.html or frontend/app.js` | `Not established` | **কারণ:** Access to fetch at 'https://nexusleads-api.mahmudajenny6.workers.dev/api/auth/login' from origin 'https://leads.sayadbayezid.com' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.<br>**করণীয়:** Open the browser console message and fix the referenced JavaScript or network request. |
| 8. `HIGH` | The browser printed an error | `frontend/index.html or frontend/app.js` | `Not established` | **কারণ:** Failed to load resource: net::ERR_FAILED<br>**করণীয়:** Open the browser console message and fix the referenced JavaScript or network request. |
| 9. `HIGH` | A browser request was blocked or failed | `frontend/app.js` | `61-67` | **কারণ:** GET https://nexusleads-api.mahmudajenny6.workers.dev/api/usage Browser reason: {'errorText': 'net::ERR_FAILED'}<br>**করণীয়:** The frontend sends API requests through this helper; inspect the matching route in cloudflare/worker.js. |
| 10. `HIGH` | A browser request was blocked or failed | `frontend/app.js` | `61-67` | **কারণ:** GET https://nexusleads-api.mahmudajenny6.workers.dev/api/reviews Browser reason: {'errorText': 'net::ERR_FAILED'}<br>**করণীয়:** The frontend sends API requests through this helper; inspect the matching route in cloudflare/worker.js. |
| 11. `HIGH` | A browser request was blocked or failed | `Not established` | `Not established` | **কারণ:** POST https://www.google-analytics.com/g/collect?v=2&tid=G-7FPD269E1J&gtm=45je68o1v9261120831za200zd9261120831&_p=1787702334277&gcd=13l3l3l3l1l1&npa=0&dma=0&are=1&cid=1069804133.1787702335&frm=0&ngs=1&pscdl=noapi&rcb=14&sr=1280x720&uaa=x86&uab=64&uafvl=Not%253DA%253FBrand%3B99.0.0.0%7CHeadlessChrome%3B151.0.7922.34%7CChromium%3B151.0.7922.34&uam=&uamb=0&uap=Linux&uapv=&uaw=0&ul=en-us&_s=1&tag_exp=115938465~115938468~118897920~118897930~119367802~119367810~120213116~120385422&sid=1787702334&sct=1&seg=0&dl=https%3A%2F%2Fleads.sayadbayezid.com%2F&dt=NexusLeads%20-%20AI-Powered%20B2B%20Lead%20Scraper%20%26%20Verifier&en=page_view&_fv=1&_nsi=1&_ss=1&_ee=1&ep.anonymize_ip=true&tfd=656 Browser reason: {'errorText': 'net::ERR_ABORTED'}<br>**করণীয়:** The failure was observed in the browser, but no unique source line can be proven from this evidence. |
| 12. `HIGH` | A browser request was blocked or failed | `frontend/app.js` | `313-324` | **কারণ:** POST https://nexusleads-api.mahmudajenny6.workers.dev/api/auth/signup Browser reason: {'errorText': 'net::ERR_FAILED'}<br>**করণীয়:** The frontend sends the signup request here. Also check cloudflare/worker.js:391-408 for the backend handler. |
| 13. `HIGH` | A browser request was blocked or failed | `frontend/app.js` | `313-324` | **কারণ:** POST https://nexusleads-api.mahmudajenny6.workers.dev/api/auth/login Browser reason: {'errorText': 'net::ERR_FAILED'}<br>**করণীয়:** The frontend sends the login request here. Also check cloudflare/worker.js:411-424 for the backend handler. |
| 14. `CRITICAL` | Signup is blocked in the browser | `cloudflare/wrangler.toml` | `21` | **কারণ:** The browser could not receive a normal response from /api/auth/signup. This usually means the custom frontend origin is missing from the Worker CORS allowlist.<br>**করণীয়:** Add https://leads.sayadbayezid.com to ALLOWED_ORIGINS and deploy the Worker. The CORS logic is in cloudflare/worker.js:573-589. |
| 15. `CRITICAL` | Login is blocked in the browser | `cloudflare/wrangler.toml` | `21` | **কারণ:** The browser could not receive a normal response from /api/auth/login. This usually means the custom frontend origin is missing from the Worker CORS allowlist.<br>**করণীয়:** Add https://leads.sayadbayezid.com to ALLOWED_ORIGINS and deploy the Worker. The CORS logic is in cloudflare/worker.js:573-589. |

## Source reference

| বিষয় | Source location |
|---|---|
| Frontend auth request | `frontend/app.js:313-324` |
| Backend signup | `cloudflare/worker.js:391-408` |
| Backend login | `cloudflare/worker.js:411-424` |
| CORS allowlist logic | `cloudflare/worker.js:573-589` |
| Deployed origin allowlist | `cloudflare/wrangler.toml:20-23` |

## কী পরীক্ষা হয়েছে

Doctor live website HTTP status, browser console/runtime error, failed network request, API HTTP response, login/signup UI, safe auth endpoint response, Cloudflare authentication, Worker resources, source files, secrets status, এবং workflow configuration পরীক্ষা করেছে।

## রিপোর্ট পড়ার নিয়ম

- `CRITICAL` হলে আগে সেটি ঠিক করুন; সাধারণত website/API/CORS সম্পূর্ণভাবে আটকে আছে.
- `HIGH` হলে feature কাজ নাও করতে পারে; report-এর file ও line দেখে পরিবর্তন করুন.
- `Not established` মানে Doctor runtime evidence পেয়েছে, কিন্তু নির্দিষ্ট source line প্রমাণ করতে পারেনি—এ ক্ষেত্রে issue message-এ দেওয়া browser/API URL অনুসরণ করুন.
- Login/signup-এর safe probe `HTTP 400` signup এবং `HTTP 401` login পেলে API reachable ও browser CORS কাজ করছে; তখন real account-এর ভুল email/password, existing account, বা database data আলাদা করে পরীক্ষা করতে হবে.

**এই run-এর generated report:** `doctor-report/latest.md`
