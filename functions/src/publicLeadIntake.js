"use strict";

const crypto = require("node:crypto");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");

const TURNSTILE_SECRET_KEY = defineSecret("TURNSTILE_SECRET_KEY");
const TURNSTILE_SITE_KEY = defineString("TURNSTILE_SITE_KEY", { default: "" });
const TURNSTILE_ALLOWED_HOSTNAMES = defineString("TURNSTILE_ALLOWED_HOSTNAMES", {
  default: [
    "goldenbrickc.com",
    "www.goldenbrickc.com",
    "golden-brick-construction.web.app",
    "golden-brick-construction.firebaseapp.com",
  ].join(","),
});

const TURNSTILE_ACTION = "estimate_request";
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_BODY_BYTES = 32 * 1024;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_PHONE = 5;

function intakeError(code, message, status = 400, field) {
  const error = new Error(message);
  Object.assign(error, { code, status, field, isIntakeError: true });
  return error;
}

function verificationUnavailable() {
  return intakeError(
    "verification_unavailable",
    "Human verification is temporarily unavailable. Please try again, or call (267) 715-5557.",
    503,
  );
}

function verificationFailed() {
  return intakeError(
    "verification_failed",
    "Please complete the human verification again, then send your request.",
  );
}

function readText(payload, keys, limit, label, required = false) {
  const key = keys.find((name) => payload[name] !== undefined && payload[name] !== "");
  const raw = key ? payload[key] : "";
  if (typeof raw !== "string") {
    throw intakeError("validation_failed", `Please check ${label}.`, 400, keys[0]);
  }
  const value = raw.trim();
  if (required && !value) {
    throw intakeError("validation_failed", `Please enter ${label}.`, 400, keys[0]);
  }
  if (value.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    throw intakeError("validation_failed", `Please check ${label}.`, 400, keys[0]);
  }
  return value;
}

function normalizeLeadPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw intakeError("validation_failed", "Please check your request and try again.");
  }
  const website = readText(payload, ["website"], 300, "your request");
  if (website) throw verificationFailed();

  const lead = {
    clientName: readText(payload, ["clientName", "name", "entry.1938418565"], 120, "your full name", true),
    clientEmail: readText(payload, ["clientEmail", "email", "entry.2064255771"], 254, "your email address").toLowerCase(),
    clientPhone: readText(payload, ["clientPhone", "phone", "entry.940072979"], 40, "your phone number", true),
    projectAddress: readText(payload, ["projectAddress", "address", "entry.1570481540"], 300, "the project address", true),
    projectType: readText(payload, ["projectType", "serviceType", "project_type"], 120, "the project type", true),
    notes: readText(payload, ["notes", "projectNotes", "entry.1309691449"], 8000, "your project details"),
    sourcePage: readText(payload, ["sourcePage", "pageTitle"], 300, "the page title"),
    sourcePath: readText(payload, ["sourcePath", "pagePath"], 500, "the page path"),
    sourceForm: readText(payload, ["formName", "sourceForm"], 120, "the form name") || "project_inquiry",
    consent: [true, "true", "agreed"].includes(payload.consent || payload.contactConsent),
  };
  const phoneDigits = lead.clientPhone
    .replace(/\s*(?:ext\.?|x|#)\s*\d+\s*$/i, "")
    .replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    throw intakeError("validation_failed", "Enter a phone number where we can reach you.", 400, "clientPhone");
  }
  if (lead.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.clientEmail)) {
    throw intakeError("validation_failed", "Enter a valid email address, or leave it blank.", 400, "clientEmail");
  }
  const turnstileToken = readText(payload, ["turnstileToken", "cf-turnstile-response"], 2048, "the human verification");
  if (!turnstileToken) {
    throw intakeError("verification_required", "Please complete the human verification before sending your request.");
  }
  return { lead, turnstileToken, phoneDigits };
}

function getRuntimeConfig() {
  return {
    siteKey: TURNSTILE_SITE_KEY.value(),
    secretKey: TURNSTILE_SECRET_KEY.value(),
    allowedHostnames: TURNSTILE_ALLOWED_HOSTNAMES.value().split(","),
    allowTestKeys: process.env.FUNCTIONS_EMULATOR === "true",
  };
}

function validateConfig(config) {
  const siteKey = String(config.siteKey || "").trim();
  const secretKey = String(config.secretKey || "").trim();
  const allowedHostnames = (config.allowedHostnames || [])
    .map((hostname) => String(hostname).trim().toLowerCase())
    .filter(Boolean);
  // Cloudflare's published test keys bypass the challenge and must never go live.
  const isTestKey = (key) => /^[123]x0{10,}/.test(key);
  if (
    !siteKey || !secretKey || !allowedHostnames.length ||
    /^YOUR_/i.test(siteKey) || /^YOUR_/i.test(secretKey) ||
    allowedHostnames.some((hostname) => !/^[a-z0-9.-]+$/.test(hostname)) ||
    (!config.allowTestKeys && (isTestKey(siteKey) || isTestKey(secretKey)))
  ) {
    throw verificationUnavailable();
  }
  return { siteKey, secretKey, allowedHostnames };
}

async function verifyTurnstile(token, config, fetchImpl = fetch, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let result;
  try {
    const response = await fetchImpl(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: config.secretKey, response: token }),
      signal: controller.signal,
    });
    if (!response.ok) throw verificationUnavailable();
    result = await response.json();
  } catch (error) {
    if (error.isIntakeError) throw error;
    throw verificationUnavailable();
  } finally {
    clearTimeout(timeout);
  }

  if (!result || typeof result !== "object") throw verificationUnavailable();
  const providerErrors = Array.isArray(result["error-codes"]) ? result["error-codes"] : [];
  if (providerErrors.some((code) => ["internal-error", "missing-input-secret", "invalid-input-secret"].includes(code))) {
    throw verificationUnavailable();
  }
  if (
    result.success !== true ||
    result.action !== TURNSTILE_ACTION ||
    typeof result.hostname !== "string" ||
    !config.allowedHostnames.includes(result.hostname.toLowerCase())
  ) {
    throw verificationFailed();
  }
}

async function enforceLeadRateLimit(db, phoneDigits, secretKey, now = Date.now()) {
  // A shared phone can submit five properties per hour. Do not rely on an
  // untrusted forwarded-IP header, or group every Hosting visitor into one IP.
  const normalizedPhone = phoneDigits.length === 11 && phoneDigits.startsWith("1")
    ? phoneDigits.slice(1)
    : phoneDigits;
  const bucketId = crypto.createHmac("sha256", secretKey).update(normalizedPhone).digest("hex");
  const bucketRef = db.collection("publicLeadRateLimits").doc(bucketId);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(bucketRef);
    const previous = snapshot.exists ? snapshot.data() : {};
    const resetAt = Number(previous.resetAt) || 0;
    const count = resetAt > now ? Number(previous.count) || 0 : 0;
    if (count >= MAX_REQUESTS_PER_PHONE) {
      const error = intakeError(
        "rate_limited",
        "We’ve received several requests for this phone number. Please try again later, or call (267) 715-5557.",
        429,
      );
      error.retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
      throw error;
    }
    transaction.set(bucketRef, {
      count: count + 1,
      resetAt: count ? resetAt : now + RATE_WINDOW_MS,
      expiresAt: new Date(now + 24 * 60 * 60 * 1000),
    });
  });
}

function createPublicLeadIntakeHandler(dependencies, options = {}) {
  const {
    db, FieldValue, resolveLeadAssignee, ensureLeadCustomerLink,
    addLeadActivity, statusLabel, parseRequestPayload, logger,
  } = dependencies;
  const getConfig = options.getConfig || getRuntimeConfig;

  return async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }
    if (!["GET", "POST"].includes(request.method)) {
      response.setHeader("Allow", "GET, POST, OPTIONS");
      response.status(405).json({ ok: false, code: "method_not_allowed", message: "Method not allowed." });
      return;
    }

    try {
      const config = validateConfig(getConfig());
      if (request.method === "GET") {
        response.status(200).json({ ok: true, turnstileSiteKey: config.siteKey, turnstileAction: TURNSTILE_ACTION });
        return;
      }
      if (request.rawBody && request.rawBody.length > MAX_BODY_BYTES) {
        throw intakeError("validation_failed", "Your request is too long. Please shorten the project details.", 413);
      }
      const payload = await parseRequestPayload(request);
      const { lead, turnstileToken, phoneDigits } = normalizeLeadPayload(payload);
      await verifyTurnstile(turnstileToken, config, options.fetchImpl, options.verifyTimeoutMs);
      // Rate counters and CRM writes only occur after a verified challenge.
      await enforceLeadRateLimit(db, phoneDigits, config.secretKey);

      const assignee = await resolveLeadAssignee();
      const leadRef = db.collection("leads").doc();
      const createdAt = FieldValue.serverTimestamp();
      const leadPayload = {
        id: leadRef.id,
        customerId: null,
        customerName: "",
        ...lead,
        status: "new_lead",
        statusLabel: statusLabel("new_lead"),
        inquiryChannel: "website",
        assignedToUid: assignee && assignee.uid ? assignee.uid : null,
        assignedToName: assignee ? String(assignee.displayName || assignee.name || "").trim() : "",
        assignedToEmail: assignee ? String(assignee.email || "").trim().toLowerCase() : "",
        hasEstimate: false,
        estimateSubtotal: 0,
        estimateTitle: "",
        customerMatchResult: "",
        customerReviewRequired: false,
        customerMatchIds: [],
        createdAt,
        updatedAt: createdAt,
      };
      await leadRef.set(leadPayload);
      await ensureLeadCustomerLink(leadRef, leadPayload);
      await addLeadActivity(leadRef.id, {
        activityType: "system",
        title: "Website lead created",
        body: "Lead captured from " + (lead.sourcePage || lead.sourceForm) + ".",
        actorName: "Website Intake",
        actorUid: "website",
        actorRole: "system",
      });
      response.status(200).json({ ok: true });
    } catch (error) {
      if (error.isIntakeError) {
        if (error.retryAfter) response.setHeader("Retry-After", String(error.retryAfter));
        response.status(error.status).json({
          ok: false,
          code: error.code,
          message: error.message,
          ...(error.field ? { field: error.field } : {}),
        });
        return;
      }
      // Do not log submitted contact details, provider tokens, or secrets.
      logger.error("Lead intake failed.", { code: String(error.code || "internal") });
      response.status(500).json({
        ok: false,
        code: "submit_failed",
        message: "We couldn’t confirm your request. Please try again, or call (267) 715-5557.",
      });
    }
  };
}

function buildPublicLeadIntake(dependencies) {
  return onRequest(
    { region: "us-central1", cors: true, secrets: [TURNSTILE_SECRET_KEY] },
    createPublicLeadIntakeHandler(dependencies),
  );
}

module.exports = {
  buildPublicLeadIntake,
  createPublicLeadIntakeHandler,
  enforceLeadRateLimit,
  normalizeLeadPayload,
  validateConfig,
  verifyTurnstile,
};
