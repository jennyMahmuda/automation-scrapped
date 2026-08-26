# NexusLeads Doctor — সহজ রিপোর্ট

**সার্বিক অবস্থা:** `CRITICAL`  
**Health score:** `0/100`  
**রিপোর্ট সময়:** `2026-08-26 00:00 UTC`  
**Website checked:** `https://leads.sayadbayezid.com/`  
**API checked:** `https://nexusleads-api.mahmudajenny6.workers.dev`

> এই রিপোর্টের উদ্দেশ্য হলো আপনাকে raw log পড়তে না দেওয়া। নিচে সরাসরি বলা আছে: কী সমস্যা, কোন ফাইলে, কোন লাইনে, কেন হচ্ছে, এবং এখন কী করবেন।

## Login ও নতুন account check

| Check | ফলাফল | সহজ ব্যাখ্যা |
|---|---|---|
| `signup` | `BLOCKED` | Browser could not read the API response; likely CORS. |
| `login` | `BLOCKED` | Browser could not read the API response; likely CORS. |

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
| 9. `CRITICAL` | The browser cannot reach the API | `cloudflare/wrangler.toml` | `21` | **কারণ:** 4 API request(s) failed in the browser. Examples: GET https://nexusleads-api.mahmudajenny6.workers.dev/api/usage; GET https://nexusleads-api.mahmudajenny6.workers.dev/api/reviews; POST https://nexusleads-api.mahmudajenny6.workers.dev/api/auth/signup. This is consistent with a cross-origin/CORS problem from the custom domain.<br>**করণীয়:** Add https://leads.sayadbayezid.com to ALLOWED_ORIGINS, deploy the Worker, then run Doctor again. The CORS code is in cloudflare/worker.js:573-589. |
| 10. `CRITICAL` | Login and signup are blocked by the browser | `cloudflare/wrangler.toml` | `21` | **কারণ:** The browser could not receive a normal response from the auth endpoints. Because the live custom domain is calling the Worker API, the most likely cause is that the custom frontend origin is missing from the Worker CORS allowlist.<br>**করণীয়:** Change ALLOWED_ORIGINS to include https://leads.sayadbayezid.com, deploy the Worker, and run Doctor again. The CORS code is in cloudflare/worker.js:573-589. Do not change frontend/app.js first. |

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
