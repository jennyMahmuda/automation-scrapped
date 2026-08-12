const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const LEADS_SHEET_HEADERS = [
  "Name",
  "Category",
  "Phone",
  "Email",
  "Address",
  "Website",
  "Rating",
  "Verification",
  "Source",
  "Collected At",
  "Facebook",
  "Instagram",
  "Twitter/X",
  "LinkedIn"
];

const OUTREACH_SHEET_HEADERS = [
  "Name",
  "Category",
  "Phone",
  "Email",
  "Address",
  "Website",
  "Draft Type",
  "Email Subject Draft",
  "Email Message Draft",
  "WhatsApp Message Draft",
  "Personalization Note",
  "Sender Email",
  "Support CTA",
  "Sender Website"
];

const LEGACY_COMBINED_HEADERS = [
  ...LEADS_SHEET_HEADERS,
  "Draft Type",
  "Email Subject Draft",
  "Email Message Draft",
  "WhatsApp Message Draft",
  "Personalization Note"
];

const OUTREACH_SKILLS = {
  general: { label: "Professional Introduction", goal: "Start a respectful conversation based on a relevant public business fact." },
  proposal: { label: "Project Proposal", goal: "Suggest a focused project with scope, outcome, and a low-pressure next step." },
  marketing: { label: "Marketing Growth", goal: "Offer measurable marketing, tracking, SEO, or lead-generation improvement." },
  offering: { label: "Service Offering", goal: "Present the sender's relevant service clearly without overpromising." },
  partnership: { label: "Business Partnership", goal: "Explore a mutually useful partnership, referral, or delivery collaboration." },
  website: { label: "Website Build", goal: "Offer a fast, professional website or web-platform improvement." },
  seo: { label: "SEO System", goal: "Offer technical, on-page, or local SEO help with measurable next steps." },
  developer: { label: "Developer Support", goal: "Offer development support for a business, agency, freelancer, or product team." },
  real_estate: { label: "Real Estate Digital", goal: "Offer a stronger website, lead system, tracking, or marketing workflow for real-estate businesses." },
  freelancer: { label: "Freelancer Collaboration", goal: "Offer reliable web, SEO, or product support to a freelancer or solo operator." },
  follow_up: { label: "Follow-up", goal: "Create a polite follow-up that adds value without pressure or repeated claims." }
};

function normalizeDraftType(value) {
  const key = String(value || "general").toLowerCase().trim().replace(/[-\s]+/g, "_");
  return OUTREACH_SKILLS[key] ? key : "general";
}

const OUTREACH_PROFILE = {
  sender: "Sayad Md Bayezid Hosan",
  website: "https://sayadbayezid.com",
  email_sender: "info@sayadbayezid.com",
  support_cta: "support@sayadbayezid.com",
  services: "Web platforms, full-stack Cloudflare Workers and D1 builds, technical/on-page/local SEO systems, marketing infrastructure, conversion tracking, lead systems, analytics, and product builds from idea to shipped tool.",
  proof: "Founder-led work behind SmartGen, SmartLeadGen, and SmartLeadGen-style lead systems; claims should only be used when supported by the public website.",
  style: "Professional, concise, human, helpful, evidence-based, and consultative. Never aggressive, deceptive, or spammy. Do not invent a problem, result, relationship, or business fact. Offer a short discovery conversation and include a respectful opt-out sentence."
};

const DAILY_FREE_LEAD_LIMIT = 100;
const CREDIT_RESERVATION_TTL = 7200;
const CREDIT_USAGE_TTL = 172800;
const PRICING_MODEL = {
  currency: "USD",
  daysPerMonth: 30,
  freeDailyLeads: DAILY_FREE_LEAD_LIMIT,
  verifiedCandidateMultiplier: 2,
  googlePlaces: { sku: "Places API Text Search Pro", pricePerThousand: 32, freeMonthlyEvents: 5000, requestsPer50LeadSearch: 5 },
  firecrawl: { plan: "Standard", monthlyPrice: 83, includedPages: 100000, creditsPerPage: 1 },
  gemini: { model: "Gemini 2.5 Flash-Lite", inputPricePerMillion: 0.10, outputPricePerMillion: 0.40, inputTokensPerLead: 2200, outputTokensPerLead: 750, callsPerLead: 2 },
  cloudflare: { workersPaidMonthly: 5, workersFreeDailyRequests: 100000, kvFreeDailyWrites: 1000 },
  googleSheets: { estimatedMonthlyCost: 0 }
};

function calculatePricingEstimate() {
  const leadsPerMonth = PRICING_MODEL.freeDailyLeads * PRICING_MODEL.daysPerMonth;
  const dailySearches = Math.ceil(PRICING_MODEL.freeDailyLeads / 50);
  const googleRequests = dailySearches * PRICING_MODEL.googlePlaces.requestsPer50LeadSearch * PRICING_MODEL.daysPerMonth;
  const googleBillableRequests = Math.max(0, googleRequests - PRICING_MODEL.googlePlaces.freeMonthlyEvents);
  const googleCost = googleBillableRequests / 1000 * PRICING_MODEL.googlePlaces.pricePerThousand;
  const verifiedPages = leadsPerMonth * PRICING_MODEL.verifiedCandidateMultiplier;
  const firecrawlPlan = verifiedPages <= 5000 ? { name: "Hobby", price: 16, includedPages: 5000 } : { name: PRICING_MODEL.firecrawl.plan, price: PRICING_MODEL.firecrawl.monthlyPrice, includedPages: PRICING_MODEL.firecrawl.includedPages };
  const geminiInputTokens = leadsPerMonth * PRICING_MODEL.gemini.inputTokensPerLead;
  const geminiOutputTokens = leadsPerMonth * PRICING_MODEL.gemini.outputTokensPerLead;
  const geminiCost = (geminiInputTokens / 1000000 * PRICING_MODEL.gemini.inputPricePerMillion) + (geminiOutputTokens / 1000000 * PRICING_MODEL.gemini.outputPricePerMillion);
  const totalCost = googleCost + firecrawlPlan.price + geminiCost + PRICING_MODEL.googleSheets.estimatedMonthlyCost;
  return {
    assumptions: { leads_per_day: PRICING_MODEL.freeDailyLeads, days_per_month: PRICING_MODEL.daysPerMonth, final_leads_per_month: leadsPerMonth, verified_candidate_multiplier: PRICING_MODEL.verifiedCandidateMultiplier, google_requests_per_month: googleRequests, firecrawl_pages_per_month: verifiedPages, gemini_input_tokens_per_month: geminiInputTokens, gemini_output_tokens_per_month: geminiOutputTokens },
    free_tier: { name: "Free", price_monthly: 0, included_leads_per_day: DAILY_FREE_LEAD_LIMIT },
    api_costs_monthly: { google_places: Number(googleCost.toFixed(4)), firecrawl: Number(firecrawlPlan.price.toFixed(2)), gemini: Number(geminiCost.toFixed(4)), google_sheets: 0, cloudflare_workers: 0, cloudflare_kv: 0, total: Number(totalCost.toFixed(2)) },
    firecrawl_plan: firecrawlPlan,
    paid_tier: { name: "Pro", markup_percent: 50, suggested_price_markup: Number((totalCost * 1.5).toFixed(2)), suggested_price_gross_margin: Number((totalCost / 0.5).toFixed(2)), rounded_price_markup: 129, rounded_price_gross_margin: 169, note: "These are planning estimates, not an invoice. Actual billing depends on account tiers, quotas, retries, traffic, and provider plan changes." },
    sources: { google_maps: "https://developers.google.com/maps/billing-and-pricing/pricing", firecrawl: "https://www.firecrawl.dev/pricing", gemini: "https://ai.google.dev/gemini-api/docs/pricing", cloudflare: "https://developers.cloudflare.com/workers/platform/pricing/" }
  };
}

function utcDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function randomId() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function creditIdentity(request, body = {}) {
  const supplied = String(body.client_id || request.headers.get("X-Nexus-Client-ID") || request.headers.get("CF-Connecting-IP") || "anonymous").slice(0, 160);
  return sha256Hex(`nexusleads-credit-v1:${supplied}`);
}

function creditSummary(used, storage = "kv") {
  const safeUsed = Math.min(Math.max(Number(used) || 0, 0), DAILY_FREE_LEAD_LIMIT);
  return { plan: "free", used: safeUsed, limit: DAILY_FREE_LEAD_LIMIT, remaining: Math.max(DAILY_FREE_LEAD_LIMIT - safeUsed, 0), reset_utc: "00:00 UTC", storage };
}

async function readDailyCredits(request, body, env) {
  const clientKey = await creditIdentity(request, body);
  const usageKey = `credits:${utcDayKey()}:${clientKey}`;
  if (!env.NEXUS_CREDITS) return { clientKey, usageKey, credits: creditSummary(0, "unavailable") };
  const stored = await env.NEXUS_CREDITS.get(usageKey, { type: "json" }).catch(() => null);
  return { clientKey, usageKey, credits: creditSummary(stored?.used || 0, "kv") };
}

async function reserveDailyCredits(request, body, env, amount) {
  const current = await readDailyCredits(request, body, env);
  const requested = Math.min(Math.max(Number(amount) || 0, 1), DAILY_FREE_LEAD_LIMIT);
  if (current.credits.storage === "unavailable") return { allowed: true, reservationId: "", credits: current.credits };
  if (requested > current.credits.remaining) return { allowed: false, reservationId: "", credits: current.credits, error: `Daily free limit reached. You have ${current.credits.remaining} lead credit(s) remaining; the Free plan allows ${DAILY_FREE_LEAD_LIMIT} leads per UTC day.` };
  const reservationId = randomId();
  const nextUsed = current.credits.used + requested;
  await env.NEXUS_CREDITS.put(current.usageKey, JSON.stringify({ used: nextUsed, updated_at: new Date().toISOString() }), { expirationTtl: CREDIT_USAGE_TTL });
  await env.NEXUS_CREDITS.put(`reservation:${reservationId}`, JSON.stringify({ usage_key: current.usageKey, reserved: requested, settled: false, created_at: new Date().toISOString() }), { expirationTtl: CREDIT_RESERVATION_TTL });
  return { allowed: true, reservationId, credits: creditSummary(nextUsed, "kv") };
}

async function settleDailyCredits(request, body, env) {
  const reservationId = String(body?.reservation_id || "").slice(0, 100);
  if (!env.NEXUS_CREDITS || !reservationId) return { credits: (await readDailyCredits(request, body, env)).credits, refunded: 0 };
  const reservationKey = `reservation:${reservationId}`;
  const reservation = await env.NEXUS_CREDITS.get(reservationKey, { type: "json" }).catch(() => null);
  if (!reservation || reservation.settled) return { credits: (await readDailyCredits(request, body, env)).credits, refunded: 0 };
  const actual = Math.min(Math.max(Number(body.actual_leads) || 0, 0), Number(reservation.reserved) || 0);
  const current = await env.NEXUS_CREDITS.get(reservation.usage_key, { type: "json" }).catch(() => ({ used: 0 }));
  const refunded = Math.max((Number(reservation.reserved) || 0) - actual, 0);
  const nextUsed = Math.max((Number(current?.used) || 0) - refunded, 0);
  await env.NEXUS_CREDITS.put(reservation.usage_key, JSON.stringify({ used: nextUsed, updated_at: new Date().toISOString() }), { expirationTtl: CREDIT_USAGE_TTL });
  await env.NEXUS_CREDITS.put(reservationKey, JSON.stringify({ ...reservation, settled: true, actual, settled_at: new Date().toISOString() }), { expirationTtl: CREDIT_RESERVATION_TTL });
  return { credits: creditSummary(nextUsed, "kv"), refunded };
}

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
    "access-control-allow-headers": "content-type, authorization, x-nexus-client-id",
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

function extractSheetId(input) {
  if (!input || typeof input !== "string") return null;
  const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : input.trim();
}

function sanitizeSheetTitle(value, fallback) {
  return String(value || fallback).trim().slice(0, 100).replace(/[\\/\\?\\*\\[\\]:]/g, "_") || fallback;
}

function resolveSheetTabs(requestBody, env) {
  const leadsTab = sanitizeSheetTitle(requestBody.leads_sheet_tab || requestBody.sheet_tab || env.GOOGLE_SHEET_TAB || "Leads", "Leads");
  let outreachTab = sanitizeSheetTitle(requestBody.outreach_sheet_tab || env.GOOGLE_OUTREACH_SHEET_TAB || "Outreach", "Outreach");
  if (outreachTab.toLowerCase() === leadsTab.toLowerCase()) {
    outreachTab = leadsTab.toLowerCase() === "outreach" ? "Leads" : "Outreach";
  }
  if (outreachTab.toLowerCase() === leadsTab.toLowerCase()) outreachTab = `${leadsTab} Outreach`.slice(0, 100);
  return { leadsTab, outreachTab };
}

async function ensureSheetTab(sheetId, sheetTab, headers, authHeaders, cleanupLegacy = false) {
  const headerRange = `${sheetTab}!A1:${String.fromCharCode(64 + headers.length)}1`;
  const headerUrl = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(headerRange)}`);
  headerUrl.searchParams.set("majorDimension", "ROWS");
  let headerResponse = await fetch(headerUrl, { headers: authHeaders });
  let headerData = await headerResponse.json();

  if (!headerResponse.ok && headerData.error?.message?.includes("Unable to parse range")) {
    const createUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}:batchUpdate`;
    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetTab } } }] }),
    });
    const createData = await createResponse.json();
    if (!createResponse.ok) throw new Error(`Google Sheets tab creation failed: ${createData.error?.message || "unknown error"}`);
    headerData = { values: [] };
  }
  if (!headerResponse.ok && !headerData.values) throw new Error(`Google Sheets header check failed: ${headerData.error?.message || "unknown error"}`);

  const existingHeader = headerData.values?.[0] || [];
  const headerMatches = headers.every((header, index) => existingHeader[index] === header);
  if (cleanupLegacy && LEGACY_COMBINED_HEADERS.every((header, index) => existingHeader[index] === header)) {
    const clearUrl = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(`${sheetTab}!O:Z`)}:clear`);
    const clearResponse = await fetch(clearUrl, { method: "POST", headers: authHeaders, body: "{}" });
    const clearData = await clearResponse.json();
    if (!clearResponse.ok) throw new Error(`Google Sheets legacy draft cleanup failed: ${clearData.error?.message || "unknown error"}`);
  }
  if (!headerMatches) {
    const updateUrl = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(headerRange)}`);
    updateUrl.searchParams.set("valueInputOption", "USER_ENTERED");
    const updateResponse = await fetch(updateUrl, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ majorDimension: "ROWS", values: [headers] }),
    });
    const updateData = await updateResponse.json();
    if (!updateResponse.ok) throw new Error(`Google Sheets header update failed: ${updateData.error?.message || "unknown error"}`);
  }
  return { header_written: !headerMatches };
}

async function appendSheetRows(sheetId, sheetTab, headers, rows, authHeaders, cleanupLegacy = false) {
  const headerState = await ensureSheetTab(sheetId, sheetTab, headers, authHeaders, cleanupLegacy);
  const appendRange = `${sheetTab}!A:${String.fromCharCode(64 + headers.length)}`;
  const appendUrl = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(appendRange)}:append`);
  appendUrl.searchParams.set("valueInputOption", "USER_ENTERED");
  appendUrl.searchParams.set("insertDataOption", "INSERT_ROWS");
  const response = await fetch(appendUrl, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ majorDimension: "ROWS", values: rows }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Google Sheets export failed for ${sheetTab}: ${data.error?.message || "unknown error"}`);
  return { sheet_tab: sheetTab, updated_range: data.updates?.updatedRange || null, header_written: headerState.header_written, rows: rows.length };
}

async function appendToGoogleSheet(leads, requestBody, env) {
  const sheetId = extractSheetId(requestBody.sheet_id) || env.GOOGLE_SHEET_ID;
  const serviceAccount = env.GOOGLE_SERVICE_ACCOUNT_JSON || env.GOOGLESERVICES_JSON;
  if (!sheetId || !serviceAccount) return { exported: false, reason: "Google Sheet URL/ID and service-account secret are required" };

  const { leadsTab, outreachTab } = resolveSheetTabs(requestBody, env);
  const accessToken = await googleAccessToken(serviceAccount);
  const authHeaders = { authorization: `Bearer ${accessToken}`, "content-type": "application/json" };
  const leadRows = leads.map((lead) => [
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
    lead.facebook || "",
    lead.instagram || "",
    lead.twitter || "",
    lead.linkedin || "",
  ]);
  const outreachRows = leads.map((lead) => [
    lead.name,
    lead.category,
    lead.phone,
    lead.email,
    lead.address,
    lead.website,
    lead.draft_type || "general",
    lead.email_subject || "",
    lead.email_draft || "",
    lead.whatsapp_draft || "",
    lead.personalization_note || "",
    OUTREACH_PROFILE.email_sender,
    OUTREACH_PROFILE.support_cta,
    OUTREACH_PROFILE.website,
  ]);

  const leadsResult = await appendSheetRows(sheetId, leadsTab, LEADS_SHEET_HEADERS, leadRows, authHeaders, true);
  const outreachResult = await appendSheetRows(sheetId, outreachTab, OUTREACH_SHEET_HEADERS, outreachRows, authHeaders);
  return {
    exported: true,
    sheet_tab: leadsTab,
    outreach_sheet_tab: outreachTab,
    sheet_tabs: { leads: leadsResult, outreach: outreachResult },
    rows: leads.length,
  };
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

function extractEmail(text, website = "") {
  if (text) {
    const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi) || [];
    const ignored = new Set(["example@example.com", "email@example.com", "name@example.com"]);
    const blockedTlds = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico", "pdf"]);
    const candidate = matches.map((item) => item.toLowerCase().replace(/[),.;:]+$/g, ""))
      .find((item) => {
        const [local, domain] = item.split("@");
        const tld = domain?.split(".").pop() || "";
        const firstLabel = domain?.split(".")[0] || "";
        return Boolean(local && domain && domain.includes(".") && /^[a-z]{2,24}$/.test(tld))
          && !blockedTlds.has(tld)
          && !ignored.has(item)
          && !item.includes("sentry")
          && !item.includes("wixpress")
          && !/^(?:[0-9]+x|image|img)\./i.test(`${firstLabel}.`)
          && !/(?:^|[_-])\d{2,}x(?:[_-]|$)/i.test(local);
      });
    if (candidate) return candidate;
  }
  if (website) {
    try {
      const parsed = new URL(website);
      const domain = parsed.hostname.replace(/^www\./, "");
      if (domain && !domain.includes("localhost") && !domain.includes("google") && !domain.includes("facebook")) {
        return `info@${domain}`;
      }
    } catch {}
  }
  return null;
}

function extractSocialLinks(text, html = "") {
  const combined = `${text} ${html}`;
  const getUrl = (regex) => {
    const match = combined.match(regex);
    if (!match) return null;
    let url = match[0].replace(/[),.;:]+$/g, "");
    if (!url.startsWith("http")) url = `https://${url}`;
    try {
      const parsed = new URL(url);
      return parsed.toString();
    } catch {
      return null;
    }
  };

  const facebook = getUrl(/https?:\/\/(?:www\.)?(?:facebook|fb)\.com\/[A-Za-z0-9._%+-]+/i);
  const instagram = getUrl(/https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._%+-]+/i);
  const twitter = getUrl(/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9._%+-]+/i);
  const linkedin = getUrl(/https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9._%+-]+/i);

  return { facebook, instagram, twitter, linkedin };
}

async function websiteEnrichment(website, env) {
  if (!website) return { email: null, verification: "Maps verified; no public website supplied" };

  let text = "";
  let source = "Website fetch";
  try {
    if (env.FIRECRAWL_API_KEY) {
      const response = await fetchWithTimeout("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { authorization: `Bearer ${env.FIRECRAWL_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ url: website, formats: ["markdown"], onlyMainContent: true }),
      }, 12000);
      if (response.ok) {
        const data = await response.json();
        text = data.data?.markdown || data.markdown || "";
        source = "Firecrawl public website scrape";
      } else {
        source = "Firecrawl website scrape unavailable";
      }
    } else {
      const response = await fetchWithTimeout(website, { headers: { "user-agent": "NexusLeads/1.0 (+public-business-research)" } }, 9000);
      if (response.ok) text = await response.text();
    }
  } catch {
    source = env.FIRECRAWL_API_KEY ? "Firecrawl website scrape unavailable" : "Website fetch unavailable";
  }

  const email = extractEmail(text, website);
  const socials = extractSocialLinks(text);
  const foundSocials = Object.values(socials).filter(Boolean).length;
  return {
    email,
    ...socials,
    verification: email ? `${source}; public email detected; ${foundSocials} social profiles` : `${source}; no public email detected; ${foundSocials} social profiles`,
  };
}

async function parseResearchPrompt(researchPrompt, env) {
  if (!env.GEMINI_API_KEY || !researchPrompt) return {};
  const model = env.GEMINI_MODEL || "gemini-1.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
  const instruction = `Convert this lead research request into strict JSON with only these keys: keyword, location, requirements. Extract a concise business category/search keyword and a city, state, country, or region. Do not invent a location. Requirements should be a short string. Return only valid JSON. Request: ${researchPrompt}`;
  try {
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: instruction }] }], generationConfig: { responseMimeType: "application/json", temperature: 0 } }),
    }, 8000);
    if (!response.ok) return {};
    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      keyword: typeof parsed.keyword === "string" ? parsed.keyword : "",
      location: typeof parsed.location === "string" ? parsed.location : "",
      requirements: typeof parsed.requirements === "string" ? parsed.requirements : "",
    };
  } catch {
    return {};
  }
}

async function parseLocationWithGemini(locationPrompt, env) {
  if (!env.GEMINI_API_KEY) return locationPrompt;
  const model = env.GEMINI_MODEL || "gemini-1.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
  const prompt = `Convert this location prompt into a precise city, state, or region search query for Google Places (e.g. "near downtown Austin" -> "Downtown Austin, TX", "silicon valley tech hub" -> "San Jose, CA"). Return only the resolved location string.\nPrompt: ${locationPrompt}`;
  try {
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }, 8000);
    if (!response.ok) return locationPrompt;
    const data = await response.json();
    const resolved = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return resolved || locationPrompt;
  } catch {
    return locationPrompt;
  }
}

async function geminiEnrichment(lead, env) {
  if (!env.GEMINI_API_KEY) return {};
  const model = env.GEMINI_MODEL || "gemini-1.5-flash";
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
  try {   return JSON.parse(raw); } catch { return {}; }
}

function fallbackOutreachDraft(lead, style = "", draftType = "general") {
  const business = lead.name || "your business";
  const category = lead.category || "business";
  const skill = OUTREACH_SKILLS[draftType] || OUTREACH_SKILLS.general;
  const websiteLine = lead.website ? `I found your public website (${lead.website}) while researching ${category} businesses.` : `I found your public ${category} listing while researching businesses in the area.`;
  const subjectByType = {
    proposal: `A focused digital project proposal for ${business}`,
    marketing: `A measurable marketing idea for ${business}`,
    offering: `A practical digital service option for ${business}`,
    partnership: `A possible delivery partnership with ${business}`,
    website: `A website improvement idea for ${business}`,
    seo: `A practical SEO opportunity for ${business}`,
    developer: `Development support for ${business}`,
    real_estate: `A stronger digital lead system for ${business}`,
    freelancer: `Reliable delivery support for ${business}`,
    follow_up: `Following up with one useful idea for ${business}`,
    general: `A practical digital growth idea for ${business}`,
  };
  const subject = subjectByType[draftType] || subjectByType.general;
  const email = `Hi ${business} team,\n\n${websiteLine}\n\nI’m Sayad Md Bayezid Hosan. ${skill.goal} My work covers web platforms, SEO systems, conversion tracking, marketing infrastructure, and lead systems.\n\nIf this is relevant, please contact ${OUTREACH_PROFILE.support_cta} for a brief conversation, or review ${OUTREACH_PROFILE.website}. I can share a practical next-step outline based on your goals.\n\nIf this is not relevant, reply “not a fit” and I won’t message again.\n\nBest regards,\nSayad Md Bayezid Hosan\n${OUTREACH_PROFILE.email_sender} | ${OUTREACH_PROFILE.website}`;
  const whatsapp = `Hi ${business} team, I’m Sayad Md Bayezid Hosan (${OUTREACH_PROFILE.email_sender}). ${skill.goal} I work on websites, SEO, tracking, and lead systems. If this is useful, contact ${OUTREACH_PROFILE.support_cta} or visit ${OUTREACH_PROFILE.website}. Reply “not a fit” to opt out.`;
  return { draft_type: draftType, email_subject: subject, email_draft: email, whatsapp_draft: whatsapp, personalization_note: `${skill.label}: ${skill.goal} Public ${category} listing${lead.address ? ` in ${lead.address}` : ""}; verify facts before sending. ${style ? "Custom style applied." : ""}` };
}

async function outreachDraftForLead(lead, env, style = "", draftType = "general") {
  const normalizedType = normalizeDraftType(draftType);
  const apiKey = env.GEMINI_OUTREACH_API_KEY || env.GEMINI_API_KEY;
  if (!apiKey) return fallbackOutreachDraft(lead, style, normalizedType);
  const model = env.GEMINI_OUTREACH_MODEL || env.GEMINI_MODEL || "gemini-1.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const skill = OUTREACH_SKILLS[normalizedType];
  const prompt = [
    "You are a senior B2B outreach copywriter and editor. Return strict JSON with exactly these keys: draft_type, email_subject, email_draft, whatsapp_draft, personalization_note.",
    `Selected skill: ${skill.label}. Goal: ${skill.goal}.`,
    `Sender profile: ${JSON.stringify(OUTREACH_PROFILE)}`,
    `Additional campaign style from the user: ${style || "Use the sender profile style."}`,
    "Quality rules: write drafts only; never send messages. Use sender email info@sayadbayezid.com and support CTA support@sayadbayezid.com. Use only facts present in the lead object. Do not claim the business is new, weak, interested, or a customer unless the lead data states it. Do not invent names, services, results, or relationships. Keep email under 140 words and WhatsApp under 70 words. Use correct grammar, spelling, punctuation, and natural business English. Do not include placeholders such as [Name]. Make the message human, specific, respectful, easy to decline, and include a clear but low-pressure CTA. Mention https://sayadbayezid.com naturally.",
    `Lead: ${JSON.stringify({ name: lead.name, category: lead.category, address: lead.address, website: lead.website, rating: lead.rating, facebook: lead.facebook, instagram: lead.instagram, twitter: lead.twitter, linkedin: lead.linkedin })}`,
  ].join("\n");
  try {
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }),
    }, 12000);
    if (!response.ok) return fallbackOutreachDraft(lead, style, normalizedType);
    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim());
    if (!parsed.email_subject || !parsed.email_draft || !parsed.whatsapp_draft) return fallbackOutreachDraft(lead, style, normalizedType);
    return {
      draft_type: normalizedType,
      email_subject: String(parsed.email_subject).slice(0, 180),
      email_draft: String(parsed.email_draft).slice(0, 3000),
      whatsapp_draft: String(parsed.whatsapp_draft).slice(0, 1200),
      personalization_note: String(parsed.personalization_note || "Review the public facts before sending.").slice(0, 500),
    };
  } catch {
    return fallbackOutreachDraft(lead, style, normalizedType);
  }
}

async function prepareSearch(body, env) {
  let keyword = typeof body.keyword === "string" ? body.keyword.trim().slice(0, 100) : "";
  let location = typeof body.location === "string" ? body.location.trim().slice(0, 150) : "";
  const researchPrompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 500) : "";

  if (researchPrompt) {
    const parsed = await parseResearchPrompt(researchPrompt, env);
    keyword = parsed.keyword || keyword;
    location = parsed.location || location;
  }
  if (!keyword || !location) throw new Error("Provide a keyword and location, or use the AI research prompt");
  location = await parseLocationWithGemini(location, env);
  const target = Math.min(Math.max(Number(body.max_results || 20), 1), 50);
  return { keyword, location, target };
}

function makeBaseLead(place, location, keyword) {
  return {
    place_id: place.id || null,
    name: place.displayName?.text || "Unnamed business",
    category: (place.types || []).filter(t => !["point_of_interest", "establishment"].includes(t))[0] || keyword,
    phone: place.internationalPhoneNumber ? `'${place.internationalPhoneNumber}` : null,
    email: null,
    address: place.formattedAddress || location,
    website: normalizeWebsite(place.websiteUri),
    rating: place.rating ?? null,
    verification: "Google Places (New) verified; enrichment pending",
    source: "Google Places API (New)",
    collected_at: new Date().toISOString(),
    facebook: null,
    instagram: null,
    twitter: null,
    linkedin: null,
  };
}

function getGoogleMapsApiKeys(env) {
  return [env.GOOGLE_MAP_API_NEW, env.GOOGLE_MAP_API_NEW_2, env.GOOGLE_MAP_API_NEW_3].filter(Boolean);
}

async function googlePlacesSearchPage(keyword, location, maxResults, env, pageToken = "", apiKeyOverride = "") {
  const apiKey = apiKeyOverride || getGoogleMapsApiKeys(env)[0];
  if (!apiKey) throw new Error("At least one Google Maps API key is required in Cloudflare Worker secrets");
  const searchUrl = "https://places.googleapis.com/v1/places:searchText";
  const requestBody = {
    textQuery: `${keyword} in ${location}`,
    maxResultCount: Math.min(Math.max(maxResults, 1), 20),
  };
  if (pageToken) requestBody.pageToken = pageToken;
  const searchResponse = await fetchWithTimeout(searchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.types,places.rating,places.internationalPhoneNumber,places.websiteUri,nextPageToken",
    },
    body: JSON.stringify(requestBody),
  }, 12000);
  const searchData = await searchResponse.json();
  if (!searchResponse.ok) throw new Error(`Google Places (New) search failed: ${searchData.error?.message || "unknown error"}`);
  return {
    leads: (searchData.places || []).map((place) => makeBaseLead(place, location, keyword)),
    nextPageToken: searchData.nextPageToken || "",
  };
}

async function googlePlacesSearch(keyword, location, target, env) {
  const leads = [];
  let pageToken = "";
  const mapKeys = getGoogleMapsApiKeys(env);
  for (let page = 0; page < 3 && leads.length < target; page += 1) {
    if (page > 0) await new Promise((resolve) => setTimeout(resolve, 1200));
    const result = await googlePlacesSearchPage(keyword, location, Math.min(20, target - leads.length), env, pageToken, mapKeys[page % mapKeys.length]);
    leads.push(...result.leads);
    pageToken = result.nextPageToken;
    if (!pageToken || !result.leads.length) break;
  }
  const unique = new Map();
  for (const lead of leads) unique.set(lead.place_id || `${lead.name}|${lead.address}`, lead);
  return Array.from(unique.values()).slice(0, target);
}

async function googlePlacesSearchVariants(keyword, location, target, env) {
  const variants = [keyword, `${keyword} businesses`, `${keyword} services`];
  const unique = new Map();
  for (const variant of variants) {
    if (unique.size >= target) break;
    const batch = await googlePlacesSearch(variant, location, Math.min(60, target - unique.size), env);
    for (const lead of batch) unique.set(lead.place_id || `${lead.name}|${lead.address}`, lead);
  }
  return Array.from(unique.values()).slice(0, target);
}

async function enrichLeadBatch(leads, body, env) {
  const outreachStyle = typeof body.outreach_style === "string" ? body.outreach_style.trim().slice(0, 1000) : "";
  const draftType = normalizeDraftType(body.draft_type);
  const generateOutreach = body.generate_outreach !== false;
  return Promise.all(leads.slice(0, 5).map(async (baseLead) => {
    const lead = { ...baseLead };
    const websiteData = await websiteEnrichment(lead.website, env).catch(() => ({ email: null, facebook: null, instagram: null, twitter: null, linkedin: null, verification: "Website enrichment unavailable" }));
    lead.email = websiteData.email;
    lead.facebook = websiteData.facebook || null;
    lead.instagram = websiteData.instagram || null;
    lead.twitter = websiteData.twitter || null;
    lead.linkedin = websiteData.linkedin || null;
    lead.verification = `${lead.verification}; ${websiteData.verification}`;
    if (body.enrich_with_ai && env.GEMINI_API_KEY) Object.assign(lead, await geminiEnrichment(lead, env));
    if (generateOutreach) Object.assign(lead, await outreachDraftForLead(lead, env, outreachStyle, draftType));
    return lead;
  }));
}

async function handleDiscover(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ success: false, error: "A valid JSON request is required" }, 400);
  let reservation = null;
  try {
    const search = await prepareSearch(body, env);
    reservation = await reserveDailyCredits(request, body, env, search.target);
    if (!reservation.allowed) return json({ success: false, code: "DAILY_CREDIT_LIMIT", error: reservation.error, credits: reservation.credits, pricing: calculatePricingEstimate() }, 402);
    const candidateTarget = Math.min(120, Math.max(60, search.target * 2));
    const candidates = await googlePlacesSearchVariants(search.keyword, search.location, candidateTarget, env);
    return json({ success: true, stage: "discovered", keyword: search.keyword, location: search.location, target: search.target, candidate_count: candidates.length, candidates, reservation_id: reservation.reservationId, credits: reservation.credits, paging: { max_pages: 3, provider_limit: 60 } });
  } catch (error) {
    if (reservation?.reservationId) await settleDailyCredits(request, { ...body, reservation_id: reservation.reservationId, actual_leads: 0 }, env).catch(() => null);
    return json({ success: false, error: error instanceof Error ? error.message : "Discovery failed" }, 502);
  }
}

async function handleUsage(request, env) {
  const body = { client_id: request.headers.get("X-Nexus-Client-ID") || "anonymous" };
  const usage = await readDailyCredits(request, body, env);
  return json({ success: true, credits: usage.credits, pricing: calculatePricingEstimate() });
}

async function handlePricing() {
  return json({ success: true, pricing: calculatePricingEstimate() });
}

async function handleEnrich(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !Array.isArray(body.leads)) return json({ success: false, error: "A lead batch is required" }, 400);
  if (body.leads.length < 1 || body.leads.length > 5) return json({ success: false, error: "Enrichment batches must contain 1 to 5 leads" }, 400);
  try {
    const leads = await enrichLeadBatch(body.leads, body, env);
    return json({ success: true, stage: "enriched", count: leads.length, leads, batch_index: body.batch_index ?? null });
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : "Enrichment failed" }, 502);
  }
}

async function handleScrape(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ success: false, error: "A valid JSON request is required" }, 400);
  try {
    const search = await prepareSearch(body, env);
    const candidates = await googlePlacesSearch(search.keyword, search.location, Math.min(search.target, 15), env);
    const leads = await enrichLeadBatch(candidates.slice(0, 5), body, env);
    const verifiedOnly = body.verified_only !== false;
    const filtered = verifiedOnly ? leads.filter((lead) => Boolean(lead.phone && lead.email)) : leads;
    const selected = filtered.slice(0, search.target);
    let sheets = { exported: false, reason: "Auto-Push is disabled; use Sync Selected to push chosen leads." };
    if ((body.auto_push === true || body.export_to_sheet === true) && selected.length) sheets = await appendToGoogleSheet(selected, body, env).catch((error) => ({ exported: false, reason: error.message }));
    return json({ success: true, count: selected.length, leads: selected, sheets, stage: "legacy_single_request", partial: true, message: "Use the dashboard staged search for 20–50 result collection." });
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : "Scrape failed" }, 502);
  }
}

async function handleExport(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !Array.isArray(body.leads)) return json({ success: false, error: "Select at least one lead before syncing" }, 400);
  const leads = body.leads.filter((lead) => lead && typeof lead === "object").slice(0, 50);
  if (!leads.length) return json({ success: false, error: "Select at least one lead before syncing" }, 400);
  const sheets = await appendToGoogleSheet(leads, body, env).catch((error) => ({ exported: false, reason: error.message }));
  if (!sheets.exported) return json({ success: false, error: sheets.reason || "Selected lead sync failed", sheets }, 502);
  return json({ success: true, count: leads.length, sheets, mode: "manual_selected" });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    const url = new URL(request.url);
    try {
      let response;
      if (request.method === "GET" && url.pathname === "/") response = json({ service: "NexusLeads API", status: "online", version: "1.0.0" });
      else if (request.method === "GET" && url.pathname === "/api/health") response = json({ status: "ok", providers: { google_places: Boolean(env.GOOGLE_MAP_API_NEW), google_places_keys: getGoogleMapsApiKeys(env).length, firecrawl: Boolean(env.FIRECRAWL_API_KEY), gemini: Boolean(env.GEMINI_API_KEY || env.GEMINI_OUTREACH_API_KEY), google_sheets: Boolean(env.GOOGLE_SERVICE_ACCOUNT_JSON || env.GOOGLESERVICES_JSON) }, credits: { daily_free_leads: DAILY_FREE_LEAD_LIMIT, storage: env.NEXUS_CREDITS ? "kv" : "unavailable" }, routes: { discover: "/api/discover", enrich: "/api/enrich", export: "/api/export", usage: "/api/usage", pricing: "/api/pricing" }, outreach_skills: Object.entries(OUTREACH_SKILLS).map(([key, value]) => ({ key, label: value.label })) });
      else if (request.method === "GET" && url.pathname === "/api/usage") response = await handleUsage(request, env);
      else if (request.method === "GET" && url.pathname === "/api/pricing") response = await handlePricing();
      else if (request.method === "POST" && url.pathname === "/api/discover") response = await handleDiscover(request, env);
      else if (request.method === "POST" && url.pathname === "/api/enrich") response = await handleEnrich(request, env);
      else if (request.method === "POST" && url.pathname === "/api/scrape") response = await handleScrape(request, env);
      else if (request.method === "POST" && url.pathname === "/api/export") response = await handleExport(request, env);
      else response = json({ success: false, error: "Not found" }, 404);
      return withCors(response, request, env);
    } catch (error) {
      console.error("Worker Error:", error);
      return withCors(json({ success: false, error: error instanceof Error ? error.message : "Unexpected backend error", stack: error instanceof Error ? error.stack : null }, 500), request, env);
    }
  },
};
