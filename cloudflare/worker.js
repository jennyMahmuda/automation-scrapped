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
  "Collected At",
  "Facebook",
  "Instagram",
  "Twitter/X",
  "LinkedIn",
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

function extractSheetId(input) {
  if (!input || typeof input !== "string") return null;
  const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : input.trim();
}

async function appendToGoogleSheet(leads, requestBody, env) {
  const sheetId = extractSheetId(requestBody.sheet_id) || env.GOOGLE_SHEET_ID;
  const requestedTab = requestBody.sheet_tab || env.GOOGLE_SHEET_TAB || "Leads";
  const sheetTab = String(requestedTab).trim().slice(0, 100).replace(/[\\/\\?\\*\\[\\]:]/g, "_") || "Leads";
  const serviceAccount = env.GOOGLE_SERVICE_ACCOUNT_JSON || env.GOOGLESERVICES_JSON;
  if (!sheetId || !serviceAccount) return { exported: false, reason: "Google Sheet URL/ID and service-account secret are required" };

  const accessToken = await googleAccessToken(serviceAccount);
  const authHeaders = { authorization: `Bearer ${accessToken}`, "content-type": "application/json" };
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
    lead.facebook || "",
    lead.instagram || "",
    lead.twitter || "",
    lead.linkedin || "",
    lead.draft_type || "general",
    lead.email_subject || "",
    lead.email_draft || "",
    lead.whatsapp_draft || "",
    lead.personalization_note || "",
  ]);
  const headerRange = `${sheetTab}!A1:S1`;
  const appendRange = `${sheetTab}!A:S`;
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
  const headerMatches = SHEET_HEADERS.every((header, index) => existingHeader[index] === header);
  if (!headerMatches) {
    const updateUrl = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(headerRange)}`);
    updateUrl.searchParams.set("valueInputOption", "USER_ENTERED");
    const updateResponse = await fetch(updateUrl, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ majorDimension: "ROWS", values: [SHEET_HEADERS] }),
    });
    const updateData = await updateResponse.json();
    if (!updateResponse.ok) throw new Error(`Google Sheets header update failed: ${updateData.error?.message || "unknown error"}`);
  }

  const appendUrl = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(appendRange)}:append`);
  appendUrl.searchParams.set("valueInputOption", "USER_ENTERED");
  appendUrl.searchParams.set("insertDataOption", "INSERT_ROWS");
  const response = await fetch(appendUrl, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ majorDimension: "ROWS", values }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Google Sheets export failed: ${data.error?.message || "unknown error"}`);
  return { exported: true, updated_range: data.updates?.updatedRange || null, sheet_tab: sheetTab, header_written: !headerMatches };
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
  return candidate || null;
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

async function googlePlacesSearch(keyword, location, maxResults, env) {
  const apiKey = env.GOOGLE_MAP_API_NEW;
  if (!apiKey) throw new Error("GOOGLE_MAP_API_NEW is not configured in Cloudflare Worker secrets");

  const searchUrl = "https://places.googleapis.com/v1/places:searchText";
  const searchResponse = await fetchWithTimeout(searchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.types,places.rating,places.internationalPhoneNumber,places.websiteUri",
    },
    body: JSON.stringify({
      textQuery: `${keyword} in ${location}`,
      maxResultCount: maxResults,
    }),
  }, 12000);

  const searchData = await searchResponse.json();
  if (!searchResponse.ok) throw new Error(`Google Places (New) search failed: ${searchData.error?.message || "unknown error"}`);

  const places = searchData.places || [];
  return Promise.all(places.map(async (place) => {
    const website = normalizeWebsite(place.websiteUri);
    const lead = {
      name: place.displayName?.text || "Unnamed business",
      category: (place.types || []).filter(t => !["point_of_interest", "establishment"].includes(t))[0] || keyword,
      phone: place.internationalPhoneNumber ? `'${place.internationalPhoneNumber}` : null,
      email: null,
      address: place.formattedAddress || location,
      website,
      rating: place.rating ?? null,
      verification: "Google Places (New) verified",
      source: "Google Places API (New)",
      collected_at: new Date().toISOString(),
    };
    const websiteData = await websiteEnrichment(website, env).catch(() => ({ email: null, facebook: null, instagram: null, twitter: null, linkedin: null, verification: "Website enrichment unavailable" }));
    lead.email = websiteData.email;
    lead.facebook = websiteData.facebook || null;
    lead.instagram = websiteData.instagram || null;
    lead.twitter = websiteData.twitter || null;
    lead.linkedin = websiteData.linkedin || null;
    lead.verification = `${lead.verification}; ${websiteData.verification}`;
    return lead;
  }));
}

async function handleScrape(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ success: false, error: "A valid JSON request is required" }, 400);

  let keyword = typeof body.keyword === "string" ? body.keyword.trim().slice(0, 100) : "";
  let location = typeof body.location === "string" ? body.location.trim().slice(0, 150) : "";
  const researchPrompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 500) : "";

  if (researchPrompt) {
    const parsed = await parseResearchPrompt(researchPrompt, env);
    keyword = parsed.keyword || keyword;
    location = parsed.location || location;
  }
  if (!keyword || !location) return json({ success: false, error: "Provide a keyword and location, or use the AI research prompt" }, 400);

  location = await parseLocationWithGemini(location, env);

  const requestedMax = Math.min(Math.max(Number(body.max_results || 20), 1), 50);
  const verifiedOnly = body.verified_only !== false;
  const searchLimit = verifiedOnly ? Math.min(50, Math.max(requestedMax * 3, requestedMax)) : requestedMax;
  const candidates = await googlePlacesSearch(keyword, location, searchLimit, env);
  if (body.enrich_with_ai && env.GEMINI_API_KEY) {
    for (const lead of candidates.slice(0, 10)) Object.assign(lead, await geminiEnrichment(lead, env));
  }

  let leads = verifiedOnly
    ? candidates.filter((lead) => Boolean(lead.phone && lead.email)).slice(0, requestedMax)
    : candidates.slice(0, requestedMax);
  const generateOutreach = body.generate_outreach !== false;
  const outreachStyle = typeof body.outreach_style === "string" ? body.outreach_style.trim().slice(0, 1000) : "";
  const draftType = normalizeDraftType(body.draft_type);
  if (generateOutreach) {
    leads = await Promise.all(leads.map(async (lead) => ({ ...lead, ...(await outreachDraftForLead(lead, env, outreachStyle, draftType)) })));
  }
  let sheets = { exported: false, reason: "Export not requested" };
  if (body.export_to_sheet !== false && leads.length > 0) {
    sheets = await appendToGoogleSheet(leads, body, env).catch((error) => ({ exported: false, reason: error.message }));
  } else if (body.export_to_sheet !== false && verifiedOnly && leads.length === 0) {
    sheets = { exported: false, reason: "No leads matched the required public phone and email verification filter" };
  }

  return json({
    success: true,
    count: leads.length,
    leads,
    sheets,
    filters: { verified_only: verifiedOnly, required_fields: verifiedOnly ? ["phone", "email"] : [] },
    outreach: { enabled: generateOutreach, draft_type: draftType, provider: env.GEMINI_OUTREACH_API_KEY ? "dedicated Gemini outreach key" : (env.GEMINI_API_KEY ? "shared Gemini key" : "safe fallback templates"), available_skills: Object.entries(OUTREACH_SKILLS).map(([key, value]) => ({ key, label: value.label, goal: value.goal })) },
    providers: { google_places: true, firecrawl: Boolean(env.FIRECRAWL_API_KEY), gemini: Boolean(env.GEMINI_API_KEY || env.GEMINI_OUTREACH_API_KEY), geekflare_configured: Boolean(env.GEEKFLARE_API_KEY) },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    const url = new URL(request.url);
    try {
      let response;
      if (request.method === "GET" && url.pathname === "/") response = json({ service: "NexusLeads API", status: "online", version: "1.0.0" });
      else if (request.method === "GET" && url.pathname === "/api/health") response = json({ status: "ok", providers: { google_places: Boolean(env.GOOGLE_MAP_API_NEW), firecrawl: Boolean(env.FIRECRAWL_API_KEY), gemini: Boolean(env.GEMINI_API_KEY || env.GEMINI_OUTREACH_API_KEY), google_sheets: Boolean(env.GOOGLE_SERVICE_ACCOUNT_JSON || env.GOOGLESERVICES_JSON) }, outreach_skills: Object.entries(OUTREACH_SKILLS).map(([key, value]) => ({ key, label: value.label })) });
      else if (request.method === "POST" && url.pathname === "/api/scrape") response = await handleScrape(request, env);
      else response = json({ success: false, error: "Not found" }, 404);
      return withCors(response, request, env);
    } catch (error) {
      console.error("Worker Error:", error);
      return withCors(json({ success: false, error: error instanceof Error ? error.message : "Unexpected backend error", stack: error instanceof Error ? error.stack : null }, 500), request, env);
    }
  },
};
