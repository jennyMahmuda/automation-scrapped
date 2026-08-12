const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const SHEET_HEADERS = [
  "Name",
  "Category",
  "Phone",
  "Email",
  "Address",
  "Website",
  "Rating",
  "Verification",
  "Source",
  "Collected At"
];

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function getAllowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || "https://jennymahmuda.github.io,http://localhost:5173,http://localhost:8787")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = getAllowedOrigins(env);
  const headers = {
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "vary": "Origin",
  };
  if (allowedOrigins.includes(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request, env))) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function textBase64Url(value) {
  return base64Url(new TextEncoder().encode(value));
}

function pemToArrayBuffer(pem) {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function googleAccessToken(serviceAccountJson) {
  const account = typeof serviceAccountJson === "string" ? JSON.parse(serviceAccountJson) : serviceAccountJson;
  if (!account?.client_email || !account?.private_key) throw new Error("Google service account secret is missing client_email or private_key");

  const now = Math.floor(Date.now() / 1000);
  const header = textBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = textBase64Url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsignedToken = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedToken));
  const assertion = `${unsignedToken}.${base64Url(new Uint8Array(signature))}`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) throw new Error(`Google OAuth failed: ${tokenData.error_description || tokenData.error || "unknown error"}`);
  return tokenData.access_token;
}

async function appendToGoogleSheet(leads, requestBody, env) {
  const sheetId = requestBody.sheet_id || env.GOOGLE_SHEET_ID;
  const sheetTab = requestBody.sheet_tab || env.GOOGLE_SHEET_TAB || "Leads";
  const serviceAccount = env.GOOGLE_SERVICE_ACCOUNT_JSON || env.GOOGLESERVICES_JSON;
  if (!sheetId || !serviceAccount) return { exported: false, reason: "Google Sheet ID or service-account secret is not configured" };

  const accessToken = await googleAccessToken(serviceAccount);
  const values = leads.map((lead) => [
    lead.name,
    lead.category,
    lead.phone,
    lead.email,
    lead.address,
    lead.website,
    lead.rating,
    lead.verification,
    lead.source,
    lead.collected_at,
  ]);
  const range = `${sheetTab}!A:J`;
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}:append`);
  url.searchParams.set("valueInputOption", "USER_ENTERED");
  url.searchParams.set("insertDataOption", "INSERT_ROWS");
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ majorDimension: "ROWS", values: [SHEET_HEADERS, ...values] }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Google Sheets export failed: ${data.error?.message || "unknown error"}`);
  return { exported: true, updated_range: data.updates?.updatedRange || null };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeWebsite(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractEmail(text) {
  if (!text) return null;
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  const ignored = new Set(["example@example.com", "email@example.com", "name@example.com"]);
  const candidate = matches.map((item) => item.toLowerCase().replace(/[),.;:]+$/g, ""))
    .find((item) => !ignored.has(item) && !item.includes("sentry") && !item.includes("wixpress"));
  return candidate || null;
}

async function websiteEnrichment(website, env) {
  if (!website) return { email: null, verification: "Maps verified; no public website supplied" };

  let text = "";
  let source = "Website fetch";
  if (env.FIRECRAWL_API_KEY) {
    const response = await fetchWithTimeout("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { authorization: `Bearer ${env.FIRECRAWL_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ url: website, formats: ["markdown"], onlyMainContent: true }),
    }, 15000);
    if (response.ok) {
      const data = await response.json();
      text = data.data?.markdown || data.markdown || "";
      source = "Firecrawl public website scrape";
    }
  }

  if (!text) {
    const response = await fetchWithTimeout(website, { headers: { "user-agent": "NexusLeads/1.0 (+public-business-research)" } }, 10000);
    if (response.ok) text = await response.text();
  }

  const email = extractEmail(text);
  return {
    email,
    verification: email ? `${source}; public email detected` : `${source}; no public email detected`,
  };
}

async function geminiEnrichment(lead, env) {
  if (!env.GEMINI_API_KEY) return {};
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
  const prompt = [
    "Classify this public business listing. Return strict JSON with keys category, fit_score, and summary. Do not invent missing facts.",
    JSON.stringify({ name: lead.name, address: lead.address, category: lead.category, website: lead.website, rating: lead.rating }),
  ].join("\n");
  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }),
  }, 10000);
  if (!response.ok) return {};
  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  try { return JSON.parse(raw); } catch { return {}; }
}

async function googlePlacesSearch(keyword, location, maxResults, env) {
  const apiKey = env.GOOGLE_MAP_API_NEW;
  if (!apiKey) throw new Error("GOOGLE_MAP_API_NEW is not configured in Cloudflare Worker secrets");

  const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  searchUrl.searchParams.set("query", `${keyword} in ${location}`);
  searchUrl.searchParams.set("key", apiKey);
  const searchResponse = await fetchWithTimeout(searchUrl, {}, 12000);
  const searchData = await searchResponse.json();
  if (!searchResponse.ok || !["OK", "ZERO_RESULTS"].includes(searchData.status)) throw new Error(`Google Places search failed: ${searchData.error_message || searchData.status || "unknown error"}`);

  const places = (searchData.results || []).slice(0, maxResults);
  return Promise.all(places.map(async (place) => {
    let phone = null;
    let website = null;
    if (place.place_id) {
      const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
      detailsUrl.searchParams.set("place_id", place.place_id);
      detailsUrl.searchParams.set("fields", "formatted_phone_number,website");
      detailsUrl.searchParams.set("key", apiKey);
      const detailResponse = await fetchWithTimeout(detailsUrl, {}, 10000);
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        phone = detailData.result?.formatted_phone_number || null;
        website = normalizeWebsite(detailData.result?.website);
      }
    }

    const types = (place.types || []).filter((type) => !["point_of_interest", "establishment"].includes(type));
    const lead = {
      name: place.name || "Unnamed business",
      category: types[0] || keyword,
      phone,
      email: null,
      address: place.formatted_address || location,
      website,
      rating: place.rating ?? null,
      verification: "Google Places verified",
      source: "Google Places API",
      collected_at: new Date().toISOString(),
    };
    const websiteData = await websiteEnrichment(website, env).catch(() => ({ email: null, verification: "Website enrichment unavailable" }));
    lead.email = websiteData.email;
    lead.verification = `${lead.verification}; ${websiteData.verification}`;
    return lead;
  }));
}

async function handleScrape(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.keyword !== "string" || typeof body.location !== "string") return json({ success: false, error: "keyword and location are required" }, 400);

  const keyword = body.keyword.trim().slice(0, 100);
  const location = body.location.trim().slice(0, 150);
  if (!keyword || !location) return json({ success: false, error: "keyword and location cannot be empty" }, 400);

  const maxResults = Math.min(Math.max(Number(body.max_results || 20), 1), 50);
  const leads = await googlePlacesSearch(keyword, location, maxResults, env);
  if (body.enrich_with_ai && env.GEMINI_API_KEY) {
    for (const lead of leads.slice(0, 10)) Object.assign(lead, await geminiEnrichment(lead, env));
  }
  let sheets = { exported: false, reason: "Export not requested" };
  if (body.export_to_sheet !== false) sheets = await appendToGoogleSheet(leads, body, env).catch((error) => ({ exported: false, reason: error.message }));

  return json({ success: true, count: leads.length, leads, sheets, providers: { google_places: true, firecrawl: Boolean(env.FIRECRAWL_API_KEY), gemini: Boolean(env.GEMINI_API_KEY), geekflare_configured: Boolean(env.GEEKFLARE_API_KEY) } });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    const url = new URL(request.url);
    try {
      let response;
      if (request.method === "GET" && url.pathname === "/") response = json({ service: "NexusLeads API", status: "online", version: "1.0.0" });
      else if (request.method === "GET" && url.pathname === "/api/health") response = json({ status: "ok", providers: { google_places: Boolean(env.GOOGLE_MAP_API_NEW), firecrawl: Boolean(env.FIRECRAWL_API_KEY), gemini: Boolean(env.GEMINI_API_KEY), google_sheets: Boolean(env.GOOGLE_SERVICE_ACCOUNT_JSON || env.GOOGLESERVICES_JSON) } });
      else if (request.method === "POST" && url.pathname === "/api/scrape") response = await handleScrape(request, env);
      else response = json({ success: false, error: "Not found" }, 404);
      return withCors(response, request, env);
    } catch (error) {
      return withCors(json({ success: false, error: error instanceof Error ? error.message : "Unexpected backend error" }, 500), request, env);
    }
  },
};
