"use strict";

const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");

admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

const CRM_ADMIN_EMAILS = defineString("CRM_ADMIN_EMAILS", { default: "" });
const CRM_EMAIL_FROM = defineString("CRM_EMAIL_FROM", { default: "Golden Brick Construction <info@goldenbrickc.com>" });
const OPENAI_MODEL = defineString("OPENAI_MODEL", { default: "gpt-4.1-mini" });
const SITE_BASE_URL = defineString("SITE_BASE_URL", { default: "https://www.goldenbrickc.com" });
const TWILIO_ACCOUNT_SID = defineString("TWILIO_ACCOUNT_SID", { default: "" });
const TWILIO_FROM_NUMBER = defineString("TWILIO_FROM_NUMBER", { default: "" });
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");

const STAFF_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const LEAD_STATUSES = {
  new_lead: "New Lead",
  follow_up: "Follow Up",
  estimate_sent: "Estimate Sent",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost"
};

function applyCors(response) {
  Object.entries(STAFF_HEADERS).forEach(([key, value]) => {
    response.setHeader(key, value);
  });
}

function respondJson(response, status, payload) {
  applyCors(response);
  response.status(status).json(payload);
}

function sanitizeEmailKey(email) {
  return String(email || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCommaList(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeString(value) {
  return String(value || "").trim();
}

function toDate(value) {
  if (!value) return null;

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function statusLabel(status) {
  return LEAD_STATUSES[status] || LEAD_STATUSES.new_lead;
}

function defaultEstimateTemplate() {
  return {
    id: "estimate-default",
    name: "Investor Estimate Default",
    subjectTemplate: "Golden Brick estimate for {{projectType}} at {{projectAddress}}",
    greeting: "Hi {{clientName}},",
    intro:
      "Thanks for speaking with Golden Brick Construction. Based on the details you shared, here is a working estimate outline for the project.",
    outro:
      "Please review the scope, note any revisions, and let us know if you want to move into the next planning step.",
    terms:
      "Pricing is a planning estimate until scope, access, existing conditions, and finish selections are confirmed on site."
  };
}

function normaliseAssignedWorkers(assignedWorkers = []) {
  return assignedWorkers
    .map((worker) => ({
      uid: safeString(worker.uid),
      name: safeString(worker.name),
      email: safeString(worker.email).toLowerCase(),
      percent: toNumber(worker.percent)
    }))
    .filter((worker) => worker.uid || worker.email || worker.name);
}

function computeFinanceSummary(projectData, expenseDocs, paymentDocs) {
  const totalExpenses = expenseDocs.reduce((sum, doc) => sum + toNumber(doc.amount), 0);
  const totalPayments = paymentDocs.reduce((sum, doc) => sum + toNumber(doc.amount), 0);
  const rawProfit = totalPayments - totalExpenses;
  const distributableProfit = Math.max(rawProfit, 0);
  const companyShare = distributableProfit * 0.5;
  const workerPool = distributableProfit * 0.5;

  const assignedWorkers = normaliseAssignedWorkers(projectData.assignedWorkers);
  const totalPercent = assignedWorkers.reduce((sum, worker) => sum + worker.percent, 0);
  const workerBreakdown = assignedWorkers.map((worker, index) => {
    let effectivePercent = worker.percent;

    if (assignedWorkers.length === 1 && totalPercent <= 0) {
      effectivePercent = 100;
    } else if (totalPercent > 0) {
      effectivePercent = (worker.percent / totalPercent) * 100;
    }

    const amount = Number(((workerPool * effectivePercent) / 100).toFixed(2));
    return {
      uid: worker.uid || "worker-" + String(index + 1),
      name: worker.name || worker.email || "Assigned worker",
      email: worker.email,
      percent: Number(effectivePercent.toFixed(2)),
      amount
    };
  });

  return {
    totalExpenses: Number(totalExpenses.toFixed(2)),
    totalPayments: Number(totalPayments.toFixed(2)),
    profit: Number(rawProfit.toFixed(2)),
    distributableProfit: Number(distributableProfit.toFixed(2)),
    companyShare: Number(companyShare.toFixed(2)),
    workerPool: Number(workerPool.toFixed(2)),
    workerBreakdown,
    updatedAt: FieldValue.serverTimestamp()
  };
}

function renderEstimateHtml(template, lead, estimate) {
  const lineItems = Array.isArray(estimate.lineItems) ? estimate.lineItems : [];
  const rows = lineItems
    .map((item) => {
      const label = safeString(item.label);
      const description = safeString(item.description);
      const amount = toNumber(item.amount).toFixed(2);

      return `
        <tr>
          <td style="padding: 12px 10px; border-bottom: 1px solid #ece2d2; vertical-align: top;">
            <strong>${label || "Line item"}</strong><br>
            <span style="color: #6e6455; font-size: 13px;">${description || "Scope to be confirmed during planning."}</span>
          </td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #ece2d2; text-align: right; white-space: nowrap;">
            $${amount}
          </td>
        </tr>
      `;
    })
    .join("");

  const subtotal = toNumber(estimate.subtotal).toFixed(2);
  const intro = safeString(estimate.emailBody || template.intro)
    .split("\n")
    .filter(Boolean)
    .map((paragraph) => `<p style="margin: 0 0 14px; color: #2d261d; line-height: 1.7;">${paragraph}</p>`)
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; background: #f7f2ea; padding: 32px 18px;">
      <div style="max-width: 760px; margin: 0 auto; background: #ffffff; border-top: 4px solid #c4a164; box-shadow: 0 20px 40px rgba(30, 24, 16, 0.08);">
        <div style="padding: 36px 32px 24px;">
          <div style="font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #8c7450; margin-bottom: 10px;">Golden Brick Construction</div>
          <h1 style="margin: 0 0 12px; color: #17120d; font-size: 28px; line-height: 1.15;">Estimate for ${safeString(lead.projectType) || "your project"}</h1>
          <p style="margin: 0 0 18px; color: #6e6455; line-height: 1.7;">${template.greeting.replace("{{clientName}}", safeString(lead.clientName) || "there")}</p>
          ${intro}
          <div style="margin: 20px 0 0; padding: 18px; background: #f8f4ed; border-left: 3px solid #c4a164;">
            <div style="font-weight: 700; color: #17120d; margin-bottom: 6px;">Project Address</div>
            <div style="color: #504536;">${safeString(lead.projectAddress) || "To be confirmed"}</div>
          </div>
        </div>

        <div style="padding: 0 32px 28px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 10px; border-bottom: 2px solid #d7c3a0; color: #6e6455; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px;">Scope</th>
                <th style="text-align: right; padding: 10px; border-bottom: 2px solid #d7c3a0; color: #6e6455; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px;">Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr>
                <td style="padding: 14px 10px 0; font-weight: 700; color: #17120d;">Estimated Total</td>
                <td style="padding: 14px 10px 0; text-align: right; font-weight: 700; color: #17120d;">$${subtotal}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="padding: 0 32px 36px;">
          <p style="margin: 0 0 14px; color: #2d261d; line-height: 1.7;">${safeString(template.outro)}</p>
          <p style="margin: 0; color: #6e6455; line-height: 1.7; font-size: 14px;">${safeString(template.terms)}</p>
        </div>
      </div>
    </div>
  `;
}

function fallbackEstimateDraft(lead, template) {
  const projectType = safeString(lead.projectType).toLowerCase();
  let lineItems;

  if (projectType.includes("bath")) {
    lineItems = [
      { label: "Demolition and site prep", description: "Protect the property, demo existing bathroom finishes, and prepare the room for rebuild.", amount: 2200 },
      { label: "Rough plumbing and electrical coordination", description: "Reset utility locations as needed and coordinate inspections for rough work.", amount: 3600 },
      { label: "Tile, waterproofing, and finish installation", description: "Install waterproofing, tile, trim, vanity, fixtures, and closeout details.", amount: 8900 }
    ];
  } else if (projectType.includes("kitchen")) {
    lineItems = [
      { label: "Demolition and protection", description: "Protect occupied areas and prepare the kitchen for layout and rough work.", amount: 3800 },
      { label: "Trade rough-ins and build-back", description: "Coordinate electrical, plumbing, drywall, and prep for cabinetry and finishes.", amount: 8600 },
      { label: "Cabinet, finish, and closeout scope", description: "Install cabinets, finishes, fixtures, trim, and final punch items.", amount: 12400 }
    ];
  } else if (projectType.includes("full")) {
    lineItems = [
      { label: "Scope planning and protection", description: "Initial demolition planning, site protection, and sequencing setup for a larger renovation.", amount: 6200 },
      { label: "Core trade coordination", description: "Structural, mechanical, electrical, and plumbing coordination during the main construction phase.", amount: 18800 },
      { label: "Interior finish package and closeout", description: "Drywall, trim, paint, finish carpentry, and final delivery across the renovated spaces.", amount: 21400 }
    ];
  } else {
    lineItems = [
      { label: "Initial site prep and demolition", description: "Protect the property and open the work area for construction.", amount: 2500 },
      { label: "Construction and coordination", description: "Coordinate trade work, materials, and sequencing for the scope discussed.", amount: 7600 },
      { label: "Finish installation and closeout", description: "Install finish materials, punch items, and project closeout details.", amount: 6800 }
    ];
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    subject:
      template.subjectTemplate
        .replace("{{projectType}}", safeString(lead.projectType) || "your project")
        .replace("{{projectAddress}}", safeString(lead.projectAddress) || "your property"),
    emailBody: [
      template.greeting.replace("{{clientName}}", safeString(lead.clientName) || "there"),
      "",
      template.intro,
      "",
      "This is a planning estimate based on the information currently available. We can tighten the pricing further after a site review, finish confirmation, and final scope check."
    ].join("\n"),
    lineItems,
    subtotal,
    assumptions: [template.terms]
  };
}

async function ensureDefaultTemplate() {
  const templateRef = db.collection("emailTemplates").doc("estimate-default");
  const templateSnap = await templateRef.get();

  if (!templateSnap.exists) {
    await templateRef.set({
      ...defaultEstimateTemplate(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  }
}

async function fetchTemplate() {
  await ensureDefaultTemplate();
  const templateSnap = await db.collection("emailTemplates").doc("estimate-default").get();
  return templateSnap.data();
}

async function sendSms(to, message, twilioTokenValue) {
  const accountSid = safeString(TWILIO_ACCOUNT_SID.value());
  const fromNumber = safeString(TWILIO_FROM_NUMBER.value());

  if (!accountSid || !fromNumber || !twilioTokenValue || !safeString(to)) {
    logger.info("Skipping Twilio delivery because configuration is incomplete.", {
      to,
      hasAccountSid: Boolean(accountSid),
      hasFromNumber: Boolean(fromNumber),
      hasToken: Boolean(twilioTokenValue)
    });
    return {
      delivered: false,
      simulated: true
    };
  }

  const body = new URLSearchParams({
    To: to,
    From: fromNumber,
    Body: message
  });

  const authHeader = Buffer.from(accountSid + ":" + twilioTokenValue).toString("base64");
  const response = await fetch(
    "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json",
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Twilio SMS failed: " + errorText);
  }

  const payload = await response.json();
  return {
    delivered: true,
    simulated: false,
    sid: payload.sid || null
  };
}

async function sendEstimateEmailDelivery({ to, subject, html, resendApiKeyValue }) {
  const emailFrom = safeString(CRM_EMAIL_FROM.value());

  if (!resendApiKeyValue || !emailFrom) {
    logger.info("Skipping Resend delivery because configuration is incomplete.", {
      to,
      hasApiKey: Boolean(resendApiKeyValue),
      hasFrom: Boolean(emailFrom)
    });
    return {
      delivered: false,
      simulated: true
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + resendApiKeyValue,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [to],
      subject,
      html
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Resend send failed: " + errorText);
  }

  const payload = await response.json();
  return {
    delivered: true,
    simulated: false,
    id: payload.id || null
  };
}

async function createOpenAiDraft(lead, template, apiKeyValue) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKeyValue,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL.value(),
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write renovation estimate drafts for a Philadelphia contractor serving homeowners and real estate investors. Return JSON with keys subject, emailBody, assumptions, and lineItems. lineItems must be an array of objects with label, description, and amount as a number. Stay practical, conservative, and useful."
        },
        {
          role: "user",
          content: JSON.stringify({
            company: "Golden Brick Construction",
            client: {
              name: safeString(lead.clientName),
              email: safeString(lead.clientEmail),
              phone: safeString(lead.clientPhone)
            },
            project: {
              projectType: safeString(lead.projectType),
              address: safeString(lead.projectAddress),
              sourcePage: safeString(lead.sourcePage),
              notes: safeString(lead.notes)
            },
            template
          })
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("OpenAI estimate generation failed: " + errorText);
  }

  const payload = await response.json();
  const content = payload.choices && payload.choices[0] && payload.choices[0].message
    ? payload.choices[0].message.content
    : "{}";
  const parsed = JSON.parse(content || "{}");
  const lineItems = Array.isArray(parsed.lineItems) ? parsed.lineItems : [];
  const subtotal = lineItems.reduce((sum, item) => sum + toNumber(item.amount), 0);

  return {
    subject: safeString(parsed.subject),
    emailBody: safeString(parsed.emailBody),
    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.map(safeString).filter(Boolean) : [],
    lineItems: lineItems.map((item) => ({
      label: safeString(item.label),
      description: safeString(item.description),
      amount: toNumber(item.amount)
    })),
    subtotal: Number(subtotal.toFixed(2))
  };
}

async function addLeadActivity(leadId, data) {
  const activityRef = db.collection("leads").doc(leadId).collection("activities").doc();

  await activityRef.set({
    ...data,
    body: safeString(data.body),
    title: safeString(data.title),
    activityType: safeString(data.activityType) || "system",
    visibility: safeString(data.visibility) || "staff",
    createdAt: FieldValue.serverTimestamp()
  });
}

async function parseRequestPayload(request) {
  if (request.is("application/json")) {
    return request.body || {};
  }

  const rawBody = request.rawBody ? request.rawBody.toString("utf8") : "";
  const params = new URLSearchParams(rawBody);
  const payload = {};

  for (const [key, value] of params.entries()) {
    payload[key] = value;
  }

  return payload;
}

async function resolveLeadAssignee() {
  const defaultAssigneeSnap = await db
    .collection("allowedStaff")
    .where("active", "==", true)
    .where("defaultLeadAssignee", "==", true)
    .limit(1)
    .get();

  if (!defaultAssigneeSnap.empty) {
    return defaultAssigneeSnap.docs[0].data();
  }

  const adminSnap = await db
    .collection("allowedStaff")
    .where("active", "==", true)
    .where("role", "==", "admin")
    .limit(1)
    .get();

  return adminSnap.empty ? null : adminSnap.docs[0].data();
}

async function verifyStaffRequest(request) {
  const authHeader = request.get("authorization") || "";
  const matches = authHeader.match(/^Bearer (.+)$/i);

  if (!matches) {
    throw new Error("Missing bearer token.");
  }

  const decoded = await admin.auth().verifyIdToken(matches[1]);
  const userSnap = await db.collection("users").doc(decoded.uid).get();

  if (!userSnap.exists || userSnap.data().active !== true) {
    throw new Error("User is not authorised for the staff portal.");
  }

  return {
    token: decoded,
    profile: userSnap.data()
  };
}

async function syncProjectFinancials(projectId) {
  const projectRef = db.collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    return;
  }

  const [expensesSnap, paymentsSnap] = await Promise.all([
    projectRef.collection("expenses").get(),
    projectRef.collection("payments").get()
  ]);

  const summary = computeFinanceSummary(
    projectSnap.data(),
    expensesSnap.docs.map((doc) => doc.data()),
    paymentsSnap.docs.map((doc) => doc.data())
  );

  await projectRef.set(
    {
      financials: summary,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

exports.publicLeadIntake = onRequest(
  {
    region: "us-central1",
    cors: true,
    secrets: [TWILIO_AUTH_TOKEN]
  },
  async (request, response) => {
    applyCors(response);

    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    if (request.method !== "POST") {
      response.status(405).send("Method not allowed.");
      return;
    }

    try {
      const payload = await parseRequestPayload(request);

      const clientName = safeString(payload.clientName || payload.name || payload["entry.1938418565"]);
      const clientEmail = safeString(payload.clientEmail || payload.email || payload["entry.2064255771"]).toLowerCase();
      const clientPhone = safeString(payload.clientPhone || payload.phone || payload["entry.940072979"]);
      const projectAddress = safeString(payload.projectAddress || payload.address || payload["entry.1570481540"]);
      const notes = safeString(payload.notes || payload.projectNotes || payload["entry.1309691449"]);
      const projectType = safeString(payload.projectType || payload.serviceType || payload.project_type);
      const sourcePage = safeString(payload.sourcePage || payload.pageTitle);
      const sourcePath = safeString(payload.sourcePath || payload.pagePath);
      const formName = safeString(payload.formName || payload.sourceForm || "project_inquiry");
      const consent = String(payload.consent || payload.contactConsent || "").toLowerCase() === "true" || String(payload.consent || "").toLowerCase() === "agreed";

      if (!clientName || !clientPhone) {
        respondJson(response, 400, {
          ok: false,
          message: "Name and phone are required."
        });
        return;
      }

      const assignee = await resolveLeadAssignee();
      const leadRef = db.collection("leads").doc();
      const createdAt = FieldValue.serverTimestamp();

      await leadRef.set({
        id: leadRef.id,
        clientName,
        clientEmail,
        clientPhone,
        projectAddress,
        projectType,
        notes,
        sourceForm: formName,
        sourcePage,
        sourcePath,
        consent,
        status: "new_lead",
        statusLabel: statusLabel("new_lead"),
        inquiryChannel: "website",
        assignedToUid: assignee && assignee.uid ? assignee.uid : null,
        assignedToName: assignee ? safeString(assignee.displayName || assignee.name) : "",
        assignedToEmail: assignee ? safeString(assignee.email).toLowerCase() : "",
        reminderState: "none",
        createdAt,
        updatedAt: createdAt
      });

      await addLeadActivity(leadRef.id, {
        activityType: "system",
        title: "Website lead created",
        body: "Lead captured from " + (sourcePage || formName) + ".",
        actorName: "Website Intake",
        actorUid: "website",
        actorRole: "system"
      });

      if (assignee && assignee.smsNumber) {
        const smsBody = [
          "Golden Brick new lead",
          clientName,
          projectType || "General inquiry",
          clientPhone,
          projectAddress || "Address pending",
          "Open: " + SITE_BASE_URL.value().replace(/\/$/, "") + "/staff"
        ].join(" | ");

        await sendSms(assignee.smsNumber, smsBody, TWILIO_AUTH_TOKEN.value());
      }

      respondJson(response, 200, {
        ok: true,
        leadId: leadRef.id
      });
    } catch (error) {
      logger.error("Lead intake failed.", error);
      respondJson(response, 500, {
        ok: false,
        message: "We could not submit the lead right now."
      });
    }
  }
);

exports.syncStaffSession = onRequest(
  {
    region: "us-central1",
    cors: true
  },
  async (request, response) => {
    applyCors(response);

    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    if (request.method !== "POST") {
      response.status(405).send("Method not allowed.");
      return;
    }

    try {
      const authHeader = request.get("authorization") || "";
      const matches = authHeader.match(/^Bearer (.+)$/i);

      if (!matches) {
        respondJson(response, 401, {
          ok: false,
          authorised: false,
          message: "Missing auth token."
        });
        return;
      }

      const decoded = await admin.auth().verifyIdToken(matches[1]);
      const email = safeString(decoded.email).toLowerCase();
      const emailKey = sanitizeEmailKey(email);
      const bootstrapAdmins = parseCommaList(CRM_ADMIN_EMAILS.value());
      const allowedRef = db.collection("allowedStaff").doc(emailKey);
      const allowedSnap = await allowedRef.get();
      let allowedData = allowedSnap.exists ? allowedSnap.data() : null;

      if (!allowedData && bootstrapAdmins.includes(email)) {
        allowedData = {
          email,
          role: "admin",
          active: true,
          defaultLeadAssignee: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };
        await allowedRef.set(allowedData, { merge: true });
      }

      if (!allowedData || allowedData.active !== true) {
        respondJson(response, 403, {
          ok: false,
          authorised: false,
          message: "This Google account is not approved for the staff portal."
        });
        return;
      }

      await ensureDefaultTemplate();

      const profile = {
        uid: decoded.uid,
        email,
        displayName: safeString(decoded.name || decoded.email),
        role: safeString(allowedData.role || "employee"),
        active: true,
        smsNumber: safeString(allowedData.smsNumber),
        defaultLeadAssignee: Boolean(allowedData.defaultLeadAssignee),
        lastLoginAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      await Promise.all([
        db.collection("users").doc(decoded.uid).set(
          {
            ...profile,
            createdAt: allowedData.createdAt || FieldValue.serverTimestamp()
          },
          { merge: true }
        ),
        allowedRef.set(
          {
            uid: decoded.uid,
            email,
            displayName: safeString(decoded.name || decoded.email),
            lastLoginAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        ),
        admin.auth().setCustomUserClaims(decoded.uid, {
          role: profile.role,
          staff: true
        })
      ]);

      respondJson(response, 200, {
        ok: true,
        authorised: true,
        profile: {
          uid: profile.uid,
          email: profile.email,
          displayName: profile.displayName,
          role: profile.role,
          active: profile.active,
          smsNumber: profile.smsNumber,
          defaultLeadAssignee: profile.defaultLeadAssignee
        }
      });
    } catch (error) {
      logger.error("Staff session sync failed.", error);
      respondJson(response, 500, {
        ok: false,
        authorised: false,
        message: "Could not verify this staff account."
      });
    }
  }
);

exports.generateEstimateDraft = onRequest(
  {
    region: "us-central1",
    cors: true,
    secrets: [OPENAI_API_KEY]
  },
  async (request, response) => {
    applyCors(response);

    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    if (request.method !== "POST") {
      response.status(405).send("Method not allowed.");
      return;
    }

    try {
      const staff = await verifyStaffRequest(request);

      if (staff.profile.role !== "admin") {
        respondJson(response, 403, {
          ok: false,
          message: "Only admins can draft estimates."
        });
        return;
      }

      const payload = request.body || {};
      const leadId = safeString(payload.leadId);

      if (!leadId) {
        respondJson(response, 400, {
          ok: false,
          message: "leadId is required."
        });
        return;
      }

      const [leadSnap, template] = await Promise.all([
        db.collection("leads").doc(leadId).get(),
        fetchTemplate()
      ]);

      if (!leadSnap.exists) {
        respondJson(response, 404, {
          ok: false,
          message: "Lead not found."
        });
        return;
      }

      const lead = leadSnap.data();
      let draft = fallbackEstimateDraft(lead, template);
      let generatedBy = "fallback";

      if (OPENAI_API_KEY.value()) {
        try {
          draft = await createOpenAiDraft(lead, template, OPENAI_API_KEY.value());
          generatedBy = "openai";
        } catch (error) {
          logger.warn("OpenAI draft generation failed, using fallback.", error);
        }
      }

      const existingEstimateSnap = await db.collection("estimates").doc(leadId).get();
      const existingEstimate = existingEstimateSnap.exists ? existingEstimateSnap.data() : null;
      const estimatePayload = {
        id: leadId,
        leadId,
        status: "draft",
        generatedBy,
        subject: draft.subject,
        emailBody: draft.emailBody,
        assumptions: draft.assumptions,
        lineItems: draft.lineItems,
        subtotal: draft.subtotal,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: existingEstimate && existingEstimate.createdAt ? existingEstimate.createdAt : FieldValue.serverTimestamp(),
        lastEditedByUid: staff.profile.uid,
        lastEditedByName: staff.profile.displayName
      };

      await db.collection("estimates").doc(leadId).set(estimatePayload, { merge: true });
      await addLeadActivity(leadId, {
        activityType: "estimate",
        title: "Estimate draft refreshed",
        body: "Estimate draft generated by " + generatedBy + ".",
        actorName: staff.profile.displayName,
        actorUid: staff.profile.uid,
        actorRole: staff.profile.role
      });

      respondJson(response, 200, {
        ok: true,
        estimate: {
          ...estimatePayload,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error("Estimate draft request failed.", error);
      respondJson(response, 500, {
        ok: false,
        message: "Could not generate the estimate draft."
      });
    }
  }
);

exports.sendEstimateEmail = onRequest(
  {
    region: "us-central1",
    cors: true,
    secrets: [RESEND_API_KEY]
  },
  async (request, response) => {
    applyCors(response);

    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    if (request.method !== "POST") {
      response.status(405).send("Method not allowed.");
      return;
    }

    try {
      const staff = await verifyStaffRequest(request);

      if (staff.profile.role !== "admin") {
        respondJson(response, 403, {
          ok: false,
          message: "Only admins can send estimates."
        });
        return;
      }

      const payload = request.body || {};
      const leadId = safeString(payload.leadId);

      if (!leadId) {
        respondJson(response, 400, {
          ok: false,
          message: "leadId is required."
        });
        return;
      }

      const [leadSnap, estimateSnap, template] = await Promise.all([
        db.collection("leads").doc(leadId).get(),
        db.collection("estimates").doc(leadId).get(),
        fetchTemplate()
      ]);

      if (!leadSnap.exists) {
        respondJson(response, 404, {
          ok: false,
          message: "Lead not found."
        });
        return;
      }

      const lead = leadSnap.data();
      const baseEstimate = estimateSnap.exists ? estimateSnap.data() : {};

      if (!safeString(lead.clientEmail)) {
        respondJson(response, 400, {
          ok: false,
          message: "This lead does not have an email address yet."
        });
        return;
      }

      const lineItems = Array.isArray(payload.lineItems) ? payload.lineItems : baseEstimate.lineItems || [];
      const subtotal = lineItems.reduce((sum, item) => sum + toNumber(item.amount), 0);
      const estimate = {
        leadId,
        status: "sent",
        subject: safeString(payload.subject || baseEstimate.subject),
        emailBody: safeString(payload.emailBody || baseEstimate.emailBody),
        assumptions: Array.isArray(payload.assumptions) ? payload.assumptions : baseEstimate.assumptions || [],
        lineItems: lineItems.map((item) => ({
          label: safeString(item.label),
          description: safeString(item.description),
          amount: toNumber(item.amount)
        })),
        subtotal: Number(subtotal.toFixed(2)),
        sentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastEditedByUid: staff.profile.uid,
        lastEditedByName: staff.profile.displayName
      };

      const html = renderEstimateHtml(template, lead, estimate);
      const delivery = await sendEstimateEmailDelivery({
        to: safeString(lead.clientEmail),
        subject: estimate.subject,
        html,
        resendApiKeyValue: RESEND_API_KEY.value()
      });

      const batch = db.batch();
      batch.set(db.collection("estimates").doc(leadId), {
        ...estimate,
        delivery
      }, { merge: true });
      batch.set(db.collection("leads").doc(leadId), {
        status: "estimate_sent",
        statusLabel: statusLabel("estimate_sent"),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      await batch.commit();

      await addLeadActivity(leadId, {
        activityType: "estimate",
        title: "Estimate sent",
        body: delivery.simulated
          ? "Estimate marked as sent in simulation mode. Configure Resend to deliver live email."
          : "Estimate sent to " + safeString(lead.clientEmail) + ".",
        actorName: staff.profile.displayName,
        actorUid: staff.profile.uid,
        actorRole: staff.profile.role
      });

      respondJson(response, 200, {
        ok: true,
        delivery
      });
    } catch (error) {
      logger.error("Estimate email send failed.", error);
      respondJson(response, 500, {
        ok: false,
        message: "Could not send the estimate email."
      });
    }
  }
);

exports.sendDueReminders = onSchedule(
  {
    region: "us-central1",
    schedule: "every 15 minutes",
    secrets: [TWILIO_AUTH_TOKEN]
  },
  async () => {
    const now = Timestamp.now();
    const dueRemindersSnap = await db
      .collection("reminders")
      .where("status", "==", "scheduled")
      .where("remindAt", "<=", now)
      .limit(25)
      .get();

    if (dueRemindersSnap.empty) {
      logger.info("No due reminders found.");
      return;
    }

    for (const reminderDoc of dueRemindersSnap.docs) {
      const reminder = reminderDoc.data();

      try {
        const assignedUserSnap = reminder.assignedToUid
          ? await db.collection("users").doc(reminder.assignedToUid).get()
          : null;
        const assignedUser = assignedUserSnap && assignedUserSnap.exists ? assignedUserSnap.data() : null;
        const smsBody = [
          "Golden Brick follow-up reminder",
          safeString(reminder.clientName || reminder.projectAddress || reminder.leadId),
          safeString(reminder.message || "Review the lead and follow up.")
        ].join(" | ");

        const delivery = assignedUser && assignedUser.smsNumber
          ? await sendSms(assignedUser.smsNumber, smsBody, TWILIO_AUTH_TOKEN.value())
          : { delivered: false, simulated: true };

        await reminderDoc.ref.set({
          status: "sent",
          sentAt: FieldValue.serverTimestamp(),
          delivery
        }, { merge: true });

        if (reminder.leadId) {
          await addLeadActivity(reminder.leadId, {
            activityType: "follow_up",
            title: "Follow-up reminder fired",
            body: delivery.simulated
              ? "Reminder reached simulation mode. Add Twilio to send live SMS."
              : "Reminder sent to assigned staff.",
            actorName: "Reminder Scheduler",
            actorUid: "scheduler",
            actorRole: "system"
          });
        }
      } catch (error) {
        logger.error("Reminder delivery failed.", error);
        await reminderDoc.ref.set({
          status: "failed",
          errorMessage: safeString(error.message),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      }
    }
  }
);

exports.syncProjectFinancialsOnExpenses = onDocumentWritten(
  {
    region: "us-central1",
    document: "projects/{projectId}/expenses/{expenseId}"
  },
  async (event) => {
    await syncProjectFinancials(event.params.projectId);
  }
);

exports.syncProjectFinancialsOnPayments = onDocumentWritten(
  {
    region: "us-central1",
    document: "projects/{projectId}/payments/{paymentId}"
  },
  async (event) => {
    await syncProjectFinancials(event.params.projectId);
  }
);

exports.syncProjectFinancialsOnProjectUpdate = onDocumentWritten(
  {
    region: "us-central1",
    document: "projects/{projectId}"
  },
  async (event) => {
    if (!event.data.after.exists) {
      return;
    }

    const beforeData = event.data.before.exists ? event.data.before.data() : {};
    const afterData = event.data.after.data();
    const beforeWorkers = JSON.stringify(beforeData.assignedWorkers || []);
    const afterWorkers = JSON.stringify(afterData.assignedWorkers || []);

    if (event.data.before.exists && beforeWorkers === afterWorkers) {
      return;
    }

    await syncProjectFinancials(event.params.projectId);
  }
);
