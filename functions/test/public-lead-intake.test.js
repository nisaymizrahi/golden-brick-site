"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");

// Exercise the actual handler code with only Firebase's registration boundary
// stubbed. These unit tests need no Firebase SDK initialization or credentials.
const intakePath = path.resolve(__dirname, "../src/publicLeadIntake.js");
const intakeModule = new Module(intakePath, module);
intakeModule.filename = intakePath;
intakeModule.require = (name) => {
  if (name === "firebase-functions/v2/https") {
    return { onRequest: (_options, handler) => handler };
  }
  if (name === "firebase-functions/params") {
    return {
      defineSecret: () => ({ value: () => "" }),
      defineString: (_name, options) => ({ value: () => options.default }),
    };
  }
  return require(name);
};
intakeModule._compile(fs.readFileSync(intakePath, "utf8"), intakePath);
const {
  createPublicLeadIntakeHandler,
  enforceLeadRateLimit,
  validateConfig,
} = intakeModule.exports;

const CONFIG = {
  siteKey: "configured-public-site-key",
  secretKey: "test-only-private-secret",
  allowedHostnames: ["goldenbrickc.com", "www.goldenbrickc.com"],
};

function validPayload(overrides = {}) {
  return {
    clientName: "Investor One",
    clientPhone: "(267) 555-0123",
    clientEmail: "investor@example.com",
    projectAddress: "123 Example Street, Philadelphia, PA",
    projectType: "Full renovation",
    notes: "Prepare this property for a new tenant.",
    sourcePage: "Request an Estimate",
    sourcePath: "/contact.html",
    formName: "contact_estimate",
    website: "",
    consent: true,
    turnstileToken: "a-token-from-the-widget",
    ...overrides,
  };
}

function verifiedResponse(overrides = {}) {
  return {
    ok: true,
    json: async () => ({
      success: true,
      action: "estimate_request",
      hostname: "goldenbrickc.com",
      ...overrides,
    }),
  };
}

function harness(options = {}) {
  const records = new Map();
  const events = [];
  const requests = [];
  let nextId = 0;
  const db = {
    collection(name) {
      return {
        doc(id = `lead-${++nextId}`) {
          return {
            id,
            path: `${name}/${id}`,
            async set(value) {
              events.push(`write:${name}`);
              records.set(`${name}/${id}`, value);
            },
          };
        },
      };
    },
    async runTransaction(callback) {
      events.push("rate-transaction");
      return callback({
        async get(ref) {
          return { exists: records.has(ref.path), data: () => records.get(ref.path) };
        },
        set(ref, value) {
          records.set(ref.path, value);
        },
      });
    },
  };
  const dependencies = {
    db,
    FieldValue: { serverTimestamp: () => "SERVER_TIMESTAMP" },
    async resolveLeadAssignee() {
      events.push("resolve-assignee");
      return { uid: "staff-1", displayName: "Project Team", email: "TEAM@example.com" };
    },
    async ensureLeadCustomerLink() {
      events.push("link-customer");
      return { customerId: "private-customer-id", matchResult: "linked" };
    },
    async addLeadActivity() { events.push("add-activity"); },
    statusLabel: () => "New Lead",
    parseRequestPayload: async (request) => request.body,
    logger: { error: () => events.push("log-error") },
  };
  const handler = createPublicLeadIntakeHandler(dependencies, {
    getConfig: () => options.config || CONFIG,
    fetchImpl: async (url, init) => {
      events.push("verify-token");
      requests.push({ url, init });
      return options.fetchImpl ? options.fetchImpl(url, init) : verifiedResponse();
    },
    verifyTimeoutMs: options.verifyTimeoutMs,
  });
  async function send(body = validPayload(), method = "POST", rawBody) {
    const response = {
      statusCode: 200,
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      status(value) { this.statusCode = value; return this; },
      json(value) { this.body = value; return this; },
      send(value) { this.body = value; return this; },
    };
    await handler({ method, body, rawBody: rawBody || Buffer.from(JSON.stringify(body)) }, response);
    return response;
  }
  return { send, records, events, requests, db };
}

test("GET exposes only public widget configuration and does no provider or database work", async () => {
  const app = harness();
  const response = await app.send({}, "GET");
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    ok: true,
    turnstileSiteKey: CONFIG.siteKey,
    turnstileAction: "estimate_request",
  });
  assert.equal(response.headers["Cache-Control"], "no-store");
  assert.equal(JSON.stringify(response.body).includes(CONFIG.secretKey), false);
  assert.deepEqual(app.events, []);
});

test("preflight works without configuration, and unsupported methods cannot submit", async () => {
  const app = harness({ config: {} });
  assert.equal((await app.send({}, "OPTIONS")).statusCode, 204);
  assert.equal((await app.send({}, "PUT")).statusCode, 405);
  assert.deepEqual(app.events, []);
});

test("missing configuration fails closed for configuration and submission", async () => {
  for (const config of [{}, { ...CONFIG, secretKey: "" }, { ...CONFIG, siteKey: "" }, { ...CONFIG, allowedHostnames: [] }]) {
    const app = harness({ config });
    for (const method of ["GET", "POST"]) {
      const response = await app.send(validPayload(), method);
      assert.equal(response.statusCode, 503);
      assert.equal(response.body.code, "verification_unavailable");
    }
    assert.equal(app.records.size, 0);
    assert.deepEqual(app.events, []);
  }
});

test("Cloudflare's published bypass keys and hostname wildcards are rejected in production", () => {
  for (const config of [
    { ...CONFIG, siteKey: "1x00000000000000000000AA" },
    { ...CONFIG, secretKey: "1x0000000000000000000000000000000AA" },
    { ...CONFIG, allowedHostnames: ["*.goldenbrickc.com"] },
  ]) {
    assert.throws(() => validateConfig(config), { code: "verification_unavailable" });
  }
});

test("required project type and address are enforced on direct backend submissions", async () => {
  for (const field of ["clientName", "clientPhone", "projectType", "projectAddress"]) {
    const app = harness();
    const response = await app.send(validPayload({ [field]: "   " }));
    assert.equal(response.statusCode, 400);
    assert.equal(response.body.code, "validation_failed");
    assert.equal(response.body.field, field);
    assert.equal(app.records.size, 0);
    assert.deepEqual(app.events, []);
  }
});

test("invalid fields and oversized payloads do not invoke Turnstile or write CRM records", async () => {
  for (const payload of [
    validPayload({ clientPhone: "123" }),
    validPayload({ clientEmail: "invalid-email" }),
    validPayload({ projectAddress: "a".repeat(301) }),
    validPayload({ projectType: ["Full renovation"] }),
    validPayload({ clientName: { injected: "name" } }),
    [],
  ]) {
    const app = harness();
    assert.equal((await app.send(payload)).statusCode, 400);
    assert.equal(app.records.size, 0);
    assert.deepEqual(app.events, []);
  }
  const app = harness();
  assert.equal((await app.send(validPayload(), "POST", Buffer.alloc(32769))).statusCode, 413);
  assert.deepEqual(app.events, []);
});

test("honeypots and omitted verification tokens reject bot submissions without writes", async () => {
  for (const [overrides, code] of [
    [{ website: "https://spam.example" }, "verification_failed"],
    [{ turnstileToken: "" }, "verification_required"],
  ]) {
    const app = harness();
    const response = await app.send(validPayload(overrides));
    assert.equal(response.statusCode, 400);
    assert.equal(response.body.code, code);
    assert.deepEqual(app.events, []);
    assert.equal(app.records.size, 0);
  }
});

test("only a valid challenge for this action and hostname can create a lead", async () => {
  for (const result of [
    { success: false, "error-codes": ["invalid-input-response"] },
    { success: false, "error-codes": ["timeout-or-duplicate"] },
    { success: "true" },
    { action: "different_action" },
    { action: undefined },
    { hostname: "attacker.example" },
    { hostname: "goldenbrickc.com.attacker.example" },
    { hostname: undefined },
  ]) {
    const app = harness({ fetchImpl: async () => verifiedResponse(result) });
    const response = await app.send();
    assert.equal(response.statusCode, 400);
    assert.equal(response.body.code, "verification_failed");
    assert.deepEqual(app.events, ["verify-token"]);
    assert.equal(app.records.size, 0);
  }
});

test("provider failures return a retryable message and never bypass human verification", async () => {
  for (const fetchImpl of [
    async () => { throw new Error("Network unavailable"); },
    async () => ({ ok: false, status: 503 }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError("Invalid JSON"); } }),
    async () => verifiedResponse({ success: false, "error-codes": ["internal-error"] }),
    async () => verifiedResponse({ success: false, "error-codes": ["invalid-input-secret"] }),
  ]) {
    const app = harness({ fetchImpl });
    const response = await app.send();
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.code, "verification_unavailable");
    assert.deepEqual(app.events, ["verify-token"]);
    assert.equal(app.records.size, 0);
  }
});

test("a provider timeout aborts verification without creating a lead", async () => {
  const app = harness({
    verifyTimeoutMs: 5,
    fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
    }),
  });
  const response = await app.send();
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.code, "verification_unavailable");
  assert.deepEqual(app.events, ["verify-token"]);
  assert.equal(app.records.size, 0);
});

test("verified submissions preserve CRM fields and return no internal identifiers", async () => {
  const app = harness();
  const response = await app.send(validPayload({ clientEmail: "INVESTOR@example.com" }));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { ok: true });
  assert.deepEqual(app.events, ["verify-token", "rate-transaction", "resolve-assignee", "write:leads", "link-customer", "add-activity"]);
  const lead = app.records.get("leads/lead-1");
  assert.equal(lead.clientName, "Investor One");
  assert.equal(lead.clientEmail, "investor@example.com");
  assert.equal(lead.projectType, "Full renovation");
  assert.equal(lead.projectAddress, "123 Example Street, Philadelphia, PA");
  assert.equal(lead.assignedToUid, "staff-1");
  assert.equal(lead.consent, true);
  assert.equal("turnstileToken" in lead, false);
  assert.equal("website" in lead, false);
  assert.equal(app.requests[0].url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
  assert.deepEqual(JSON.parse(app.requests[0].init.body), {
    secret: CONFIG.secretKey,
    response: "a-token-from-the-widget",
  });
});

test("verified repeat submissions share a durable phone limit across number formats", async () => {
  const app = harness();
  for (let index = 0; index < 5; index += 1) {
    const response = await app.send(validPayload({ turnstileToken: `fresh-token-${index}` }));
    assert.equal(response.statusCode, 200);
  }
  const response = await app.send(validPayload({ clientPhone: "+1 267 555 0123", turnstileToken: "another-fresh-token" }));
  assert.equal(response.statusCode, 429);
  assert.equal(response.body.code, "rate_limited");
  assert.ok(Number(response.headers["Retry-After"]) > 0);
  assert.equal([...app.records.keys()].filter((key) => key.startsWith("leads/")).length, 5);
  const buckets = [...app.records.keys()].filter((key) => key.startsWith("publicLeadRateLimits/"));
  assert.equal(buckets.length, 1);
  assert.equal(buckets[0].includes("2675550123"), false);
  const bucket = app.records.get(buckets[0]);
  assert.equal(JSON.stringify(bucket).includes("2675550123"), false);
});

test("phone rate limits expire so legitimate investors can submit later", async () => {
  const app = harness();
  const now = 1_800_000_000_000;
  for (let index = 0; index < 5; index += 1) {
    await enforceLeadRateLimit(app.db, "2675550123", CONFIG.secretKey, now);
  }
  await assert.rejects(
    enforceLeadRateLimit(app.db, "2675550123", CONFIG.secretKey, now + 1000),
    { code: "rate_limited", status: 429 },
  );
  await assert.doesNotReject(enforceLeadRateLimit(app.db, "2675550123", CONFIG.secretKey, now + 3_600_001));
});
