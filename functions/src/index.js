"use strict";

const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineString } = require("firebase-functions/params");

admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

const CRM_ADMIN_EMAILS = defineString("CRM_ADMIN_EMAILS", { default: "" });

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
    .toLowerCase();
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

function normaliseEmail(value) {
  return safeString(value).toLowerCase();
}

function normalisePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

function statusLabel(status) {
  return LEAD_STATUSES[status] || LEAD_STATUSES.new_lead;
}

function uniqueValues(values) {
  return Array.from(
    new Set(
      (values || [])
        .map((value) => safeString(value))
        .filter(Boolean)
    )
  );
}

function normaliseMillis(value) {
  if (!value) return 0;

  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function latestByUpdated(items) {
  if (!items.length) return null;

  return [...items].sort((left, right) => {
    return normaliseMillis(right.updatedAt || right.createdAt) - normaliseMillis(left.updatedAt || left.createdAt);
  })[0];
}

async function findMatchingCustomers(leadData = {}) {
  const normalisedLeadEmail = normaliseEmail(leadData.clientEmail);
  const normalisedLeadPhone = normalisePhone(leadData.clientPhone);

  if (!normalisedLeadEmail && !normalisedLeadPhone) {
    return [];
  }

  const customerSnap = await db.collection("customers").get();
  const matches = customerSnap.docs
    .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
    .filter((customer) => {
      const customerEmail = normaliseEmail(customer.searchEmail || customer.primaryEmail);
      const customerPhone = normalisePhone(customer.searchPhone || customer.primaryPhone);
      return (normalisedLeadEmail && customerEmail === normalisedLeadEmail)
        || (normalisedLeadPhone && customerPhone === normalisedLeadPhone);
    });

  return matches.sort((left, right) => {
    return normaliseMillis(right.updatedAt || right.createdAt) - normaliseMillis(left.updatedAt || left.createdAt);
  });
}

function buildCustomerPayloadFromLead(leadData = {}, existingCustomer = {}) {
  return {
    name: safeString(existingCustomer.name || leadData.customerName || leadData.clientName || "Unnamed customer"),
    primaryEmail: safeString(existingCustomer.primaryEmail || leadData.clientEmail),
    primaryPhone: safeString(existingCustomer.primaryPhone || leadData.clientPhone),
    primaryAddress: safeString(existingCustomer.primaryAddress || leadData.projectAddress),
    notes: safeString(existingCustomer.notes),
    searchEmail: normaliseEmail(existingCustomer.searchEmail || existingCustomer.primaryEmail || leadData.clientEmail),
    searchPhone: normalisePhone(existingCustomer.searchPhone || existingCustomer.primaryPhone || leadData.clientPhone),
    allowedStaffUids: uniqueValues([
      ...(existingCustomer.allowedStaffUids || []),
      safeString(leadData.assignedToUid)
    ])
  };
}

async function ensureCustomerDocument(customerRef, leadData = {}) {
  const customerSnap = await customerRef.get();
  const existingCustomer = customerSnap.exists ? customerSnap.data() : {};
  const payload = buildCustomerPayloadFromLead(leadData, existingCustomer);

  await customerRef.set({
    id: customerRef.id,
    ...payload,
    createdAt: existingCustomer.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return {
    id: customerRef.id,
    name: payload.name
  };
}

async function ensureLeadCustomerLink(leadRef, leadData = {}) {
  if (leadData.customerId) {
    const linkedCustomer = await ensureCustomerDocument(
      db.collection("customers").doc(leadData.customerId),
      leadData
    );

    await leadRef.set({
      customerId: linkedCustomer.id,
      customerName: linkedCustomer.name,
      customerMatchResult: "linked",
      customerReviewRequired: false,
      customerMatchIds: [linkedCustomer.id]
    }, { merge: true });

    return {
      customerId: linkedCustomer.id,
      customerName: linkedCustomer.name,
      matchResult: "linked",
      reviewRequired: false,
      customerMatchIds: [linkedCustomer.id]
    };
  }

  const matches = await findMatchingCustomers(leadData);

  if (matches.length > 1) {
    const customerMatchIds = matches.map((customer) => customer.id);

    await leadRef.set({
      customerId: null,
      customerName: "",
      customerMatchResult: "review_required",
      customerReviewRequired: true,
      customerMatchIds
    }, { merge: true });

    return {
      customerId: null,
      customerName: "",
      matchResult: "review_required",
      reviewRequired: true,
      customerMatchIds
    };
  }

  if (matches.length === 1) {
    const linkedCustomer = await ensureCustomerDocument(
      db.collection("customers").doc(matches[0].id),
      {
        ...leadData,
        customerId: matches[0].id,
        customerName: matches[0].name || leadData.clientName
      }
    );

    await leadRef.set({
      customerId: linkedCustomer.id,
      customerName: linkedCustomer.name,
      customerMatchResult: "linked",
      customerReviewRequired: false,
      customerMatchIds: [linkedCustomer.id]
    }, { merge: true });

    return {
      customerId: linkedCustomer.id,
      customerName: linkedCustomer.name,
      matchResult: "linked",
      reviewRequired: false,
      customerMatchIds: [linkedCustomer.id]
    };
  }

  const customerRef = db.collection("customers").doc();
  const createdCustomer = await ensureCustomerDocument(customerRef, leadData);

  await leadRef.set({
    customerId: createdCustomer.id,
    customerName: createdCustomer.name,
    customerMatchResult: "created",
    customerReviewRequired: false,
    customerMatchIds: [createdCustomer.id]
  }, { merge: true });

  return {
    customerId: createdCustomer.id,
    customerName: createdCustomer.name,
    matchResult: "created",
    reviewRequired: false,
    customerMatchIds: [createdCustomer.id]
  };
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

function normaliseStaffRole(value) {
  return safeString(value).toLowerCase() === "admin" ? "admin" : "employee";
}

function buildStaffProfile(decoded, allowedData = {}) {
  return {
    uid: safeString(decoded.uid),
    email: safeString(decoded.email).toLowerCase(),
    displayName: safeString(decoded.name || decoded.email || allowedData.displayName || allowedData.email),
    role: normaliseStaffRole(allowedData.role),
    active: true,
    defaultLeadAssignee: Boolean(allowedData.defaultLeadAssignee),
    lastLoginAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
}

function serialiseStaffProfile(profile = {}) {
  return {
    uid: safeString(profile.uid),
    email: safeString(profile.email).toLowerCase(),
    displayName: safeString(profile.displayName || profile.email),
    role: normaliseStaffRole(profile.role),
    active: profile.active !== false,
    defaultLeadAssignee: Boolean(profile.defaultLeadAssignee)
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

function buildProjectAccessUids(projectData = {}) {
  return uniqueValues([
    safeString(projectData.assignedLeadOwnerUid),
    ...((projectData.assignedWorkerIds || []).map((uid) => safeString(uid)))
  ]);
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

function fallbackEstimateDraft(lead, template) {
  const projectType = safeString(lead.projectType).toLowerCase();
  let lineItems;

  if (projectType.includes("bath")) {
    lineItems = [
      {
        label: "Demolition and site prep",
        description: "Protect the property, demo existing bathroom finishes, and prepare the room for rebuild.",
        amount: 2200
      },
      {
        label: "Rough plumbing and electrical coordination",
        description: "Reset utility locations as needed and coordinate inspections for rough work.",
        amount: 3600
      },
      {
        label: "Tile, waterproofing, and finish installation",
        description: "Install waterproofing, tile, trim, vanity, fixtures, and closeout details.",
        amount: 8900
      }
    ];
  } else if (projectType.includes("kitchen")) {
    lineItems = [
      {
        label: "Demolition and protection",
        description: "Protect occupied areas and prepare the kitchen for layout and rough work.",
        amount: 3800
      },
      {
        label: "Trade rough-ins and build-back",
        description: "Coordinate electrical, plumbing, drywall, and prep for cabinetry and finishes.",
        amount: 8600
      },
      {
        label: "Cabinet, finish, and closeout scope",
        description: "Install cabinets, finishes, fixtures, trim, and final punch items.",
        amount: 12400
      }
    ];
  } else if (projectType.includes("full")) {
    lineItems = [
      {
        label: "Scope planning and protection",
        description: "Initial demolition planning, site protection, and sequencing setup for a larger renovation.",
        amount: 6200
      },
      {
        label: "Core trade coordination",
        description: "Structural, mechanical, electrical, and plumbing coordination during the main construction phase.",
        amount: 18800
      },
      {
        label: "Interior finish package and closeout",
        description: "Drywall, trim, paint, finish carpentry, and final delivery across the renovated spaces.",
        amount: 21400
      }
    ];
  } else {
    lineItems = [
      {
        label: "Initial site prep and demolition",
        description: "Protect the property and open the work area for construction.",
        amount: 2500
      },
      {
        label: "Construction and coordination",
        description: "Coordinate trade work, materials, and sequencing for the scope discussed.",
        amount: 7600
      },
      {
        label: "Finish installation and closeout",
        description: "Install finish materials, punch items, and project closeout details.",
        amount: 6800
      }
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
  const email = safeString(decoded.email).toLowerCase();
  const userSnap = await db.collection("users").doc(decoded.uid).get();

  if (userSnap.exists && userSnap.data().active === true) {
    return {
      token: decoded,
      profile: serialiseStaffProfile(userSnap.data())
    };
  }

  if (!email) {
    throw new Error("User is not authorised for the staff portal.");
  }

  const allowedSnap = await db.collection("allowedStaff").doc(sanitizeEmailKey(email)).get();
  if (!allowedSnap.exists || allowedSnap.data().active !== true) {
    throw new Error("User is not authorised for the staff portal.");
  }

  return {
    token: decoded,
    profile: serialiseStaffProfile(buildStaffProfile(decoded, allowedSnap.data()))
  };
}

async function verifyLeadStaffAccess(leadId, profile = {}) {
  const leadRef = db.collection("leads").doc(leadId);
  const leadSnap = await leadRef.get();

  if (!leadSnap.exists) {
    const error = new Error("Lead not found.");
    error.status = 404;
    throw error;
  }

  const leadData = leadSnap.data();
  const canAccess = profile.role === "admin" || safeString(leadData.assignedToUid) === safeString(profile.uid);

  if (!canAccess) {
    const error = new Error("You do not have access to this lead.");
    error.status = 403;
    throw error;
  }

  return { leadRef, leadData };
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
    expensesSnap.docs.map((snapshot) => snapshot.data()),
    paymentsSnap.docs.map((snapshot) => snapshot.data())
  );

  await projectRef.set(
    {
      financials: summary,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

async function syncCustomerSummary(customerId) {
  if (!customerId) return;

  const customerRef = db.collection("customers").doc(customerId);
  const customerSnap = await customerRef.get();

  if (!customerSnap.exists) {
    return;
  }

  const [leadSnap, projectSnap] = await Promise.all([
    db.collection("leads").where("customerId", "==", customerId).get(),
    db.collection("projects").where("customerId", "==", customerId).get()
  ]);

  const leads = leadSnap.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
  const projects = projectSnap.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
  const existing = customerSnap.data() || {};
  const latestLead = latestByUpdated(leads);
  const latestProject = latestByUpdated(projects);
  const openLeads = leads.filter((lead) => ["new_lead", "follow_up", "estimate_sent"].includes(lead.status));
  const wonLeadIds = leads.filter((lead) => lead.status === "closed_won").map((lead) => lead.id);
  const lostLeadIds = leads.filter((lead) => lead.status === "closed_lost").map((lead) => lead.id);
  const leadIds = leads.map((lead) => lead.id);
  const jobIds = projects.map((project) => project.id);
  const allowedStaffUids = uniqueValues([
    ...leads.map((lead) => lead.assignedToUid),
    ...projects.flatMap((project) => [
      project.assignedLeadOwnerUid,
      ...(project.assignedWorkerIds || []),
      ...((project.allowedStaffUids || []))
    ])
  ]);
  const estimateLead = latestByUpdated(openLeads.filter((lead) => Boolean(lead.hasEstimate)));
  const totalWonSales = projects.reduce((sum, project) => sum + toNumber(project.jobValue || 0), 0);
  const totalPaymentsReceived = projects.reduce((sum, project) => sum + toNumber(project.financials && project.financials.totalPayments), 0);

  await customerRef.set({
    name: safeString(existing.name || latestLead?.clientName || latestProject?.clientName || "Unnamed customer"),
    primaryEmail: safeString(existing.primaryEmail || latestLead?.clientEmail || latestProject?.clientEmail),
    primaryPhone: safeString(existing.primaryPhone || latestLead?.clientPhone || latestProject?.clientPhone),
    primaryAddress: safeString(existing.primaryAddress || latestLead?.projectAddress || latestProject?.projectAddress),
    searchEmail: normaliseEmail(existing.searchEmail || existing.primaryEmail || latestLead?.clientEmail || latestProject?.clientEmail),
    searchPhone: normalisePhone(existing.searchPhone || existing.primaryPhone || latestLead?.clientPhone || latestProject?.clientPhone),
    leadIds,
    jobIds,
    openLeadIds: openLeads.map((lead) => lead.id),
    wonLeadIds,
    lostLeadIds,
    openOpportunityCount: openLeads.length,
    wonJobCount: projects.length,
    lostLeadCount: lostLeadIds.length,
    currentEstimateLeadId: estimateLead ? estimateLead.id : null,
    totalWonSales: Number(totalWonSales.toFixed(2)),
    totalPaymentsReceived: Number(totalPaymentsReceived.toFixed(2)),
    allowedStaffUids,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
}

exports.publicLeadIntake = onRequest(
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
      const leadPayload = {
        id: leadRef.id,
        customerId: null,
        customerName: "",
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
        hasEstimate: false,
        estimateSubtotal: 0,
        estimateTitle: "",
        customerMatchResult: "",
        customerReviewRequired: false,
        customerMatchIds: [],
        createdAt,
        updatedAt: createdAt
      };

      await leadRef.set(leadPayload);
      const customerLink = await ensureLeadCustomerLink(leadRef, leadPayload);

      await addLeadActivity(leadRef.id, {
        activityType: "system",
        title: "Website lead created",
        body: "Lead captured from " + (sourcePage || formName) + ".",
        actorName: "Website Intake",
        actorUid: "website",
        actorRole: "system"
      });

      respondJson(response, 200, {
        ok: true,
        leadId: leadRef.id,
        customerId: customerLink.customerId || null,
        customerMatchResult: customerLink.matchResult
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

      const profile = buildStaffProfile(decoded, allowedData);

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
            role: profile.role,
            active: true,
            defaultLeadAssignee: profile.defaultLeadAssignee,
            lastLoginAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        )
      ]);

      let claimsSynced = true;
      try {
        await admin.auth().setCustomUserClaims(decoded.uid, {
          role: profile.role,
          staff: true
        });
      } catch (error) {
        claimsSynced = false;
        logger.warn("Staff session claims sync degraded.", error);
      }

      respondJson(response, 200, {
        ok: true,
        authorised: true,
        mode: "api",
        claimsSynced,
        profile: serialiseStaffProfile(profile)
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

exports.syncLeadCustomerLink = onRequest(
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
      const staff = await verifyStaffRequest(request);
      const payload = request.body || {};
      const leadId = safeString(payload.leadId);

      if (!leadId) {
        respondJson(response, 400, {
          ok: false,
          message: "leadId is required."
        });
        return;
      }

      const { leadRef, leadData } = await verifyLeadStaffAccess(leadId, staff.profile);
      const customerLink = await ensureLeadCustomerLink(leadRef, leadData);

      respondJson(response, 200, {
        ok: true,
        ...customerLink
      });
    } catch (error) {
      logger.error("Lead customer sync failed.", error);
      respondJson(response, error.status || 500, {
        ok: false,
        message: error.message || "Could not sync the lead customer."
      });
    }
  }
);

exports.convertLeadToProject = onRequest(
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
      const staff = await verifyStaffRequest(request);
      const payload = request.body || {};
      const leadId = safeString(payload.leadId);

      if (!leadId) {
        respondJson(response, 400, {
          ok: false,
          message: "leadId is required."
        });
        return;
      }

      const { leadRef, leadData } = await verifyLeadStaffAccess(leadId, staff.profile);
      const existingProjectSnap = await db.collection("projects").doc(leadId).get();

      if (existingProjectSnap.exists) {
        respondJson(response, 200, {
          ok: true,
          existing: true,
          projectId: leadId
        });
        return;
      }

      const customerLink = await ensureLeadCustomerLink(leadRef, leadData);

      if (customerLink.matchResult === "review_required") {
        respondJson(response, 409, {
          ok: false,
          message: "Customer review is required before converting this lead.",
          matchResult: customerLink.matchResult,
          customerMatchIds: customerLink.customerMatchIds
        });
        return;
      }

      const refreshedLeadSnap = await leadRef.get();
      const refreshedLead = refreshedLeadSnap.data();
      const leadOwnerUid = safeString(refreshedLead.assignedToUid || staff.profile.uid);
      const leadOwnerName = safeString(refreshedLead.assignedToName || staff.profile.displayName || staff.profile.email);
      const leadOwnerEmail = normaliseEmail(refreshedLead.assignedToEmail || staff.profile.email);
      const assignedWorkers = leadOwnerUid ? [{
        uid: leadOwnerUid,
        name: leadOwnerName,
        email: leadOwnerEmail,
        percent: 100
      }] : [];
      const allowedStaffUids = uniqueValues([
        leadOwnerUid,
        ...assignedWorkers.map((worker) => worker.uid)
      ]);
      const projectRef = db.collection("projects").doc(leadId);
      const batch = db.batch();

      batch.set(projectRef, {
        id: leadId,
        leadId,
        customerId: customerLink.customerId,
        customerName: customerLink.customerName,
        clientName: safeString(refreshedLead.clientName),
        clientEmail: normaliseEmail(refreshedLead.clientEmail),
        clientPhone: safeString(refreshedLead.clientPhone),
        projectAddress: safeString(refreshedLead.projectAddress),
        projectType: safeString(refreshedLead.projectType),
        status: "in_progress",
        jobValue: toNumber(refreshedLead.estimateSubtotal || 0),
        assignedLeadOwnerUid: leadOwnerUid || null,
        assignedWorkers,
        assignedWorkerIds: assignedWorkers.map((worker) => worker.uid).filter(Boolean),
        allowedStaffUids,
        financials: {
          totalExpenses: 0,
          totalPayments: 0,
          profit: 0,
          distributableProfit: 0,
          companyShare: 0,
          workerPool: 0,
          workerBreakdown: []
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      batch.set(leadRef, {
        status: "closed_won",
        statusLabel: statusLabel("closed_won"),
        customerId: customerLink.customerId,
        customerName: customerLink.customerName,
        wonProjectId: leadId,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      await batch.commit();

      await addLeadActivity(leadId, {
        activityType: "system",
        title: "Lead converted to job",
        body: "Won job created and linked to the customer record.",
        actorName: staff.profile.displayName,
        actorUid: staff.profile.uid,
        actorRole: staff.profile.role
      });

      respondJson(response, 200, {
        ok: true,
        existing: false,
        projectId: leadId,
        matchResult: customerLink.matchResult
      });
    } catch (error) {
      logger.error("Lead conversion failed.", error);
      respondJson(response, error.status || 500, {
        ok: false,
        message: error.message || "Could not convert the lead right now."
      });
    }
  }
);

exports.generateEstimateDraft = onRequest(
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
      const draft = fallbackEstimateDraft(lead, template);
      const generatedBy = "template";

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

      await Promise.all([
        db.collection("estimates").doc(leadId).set(estimatePayload, { merge: true }),
        db.collection("leads").doc(leadId).set({
          hasEstimate: true,
          estimateSubtotal: draft.subtotal,
          estimateTitle: draft.subject,
          estimateUpdatedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true }),
        addLeadActivity(leadId, {
          activityType: "estimate",
          title: "Estimate draft refreshed",
          body: "Estimate draft generated from the internal template.",
          actorName: staff.profile.displayName,
          actorUid: staff.profile.uid,
          actorRole: staff.profile.role
        })
      ]);

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

exports.syncProjectDerivedDataOnWrite = onDocumentWritten(
  {
    region: "us-central1",
    document: "projects/{projectId}"
  },
  async (event) => {
    if (!event.data.after.exists) {
      const beforeData = event.data.before.exists ? event.data.before.data() : null;
      if (beforeData && beforeData.customerId) {
        await syncCustomerSummary(beforeData.customerId);
      }
      return;
    }

    const beforeData = event.data.before.exists ? event.data.before.data() : {};
    const afterData = event.data.after.data();
    const beforeWorkers = JSON.stringify(beforeData.assignedWorkers || []);
    const afterWorkers = JSON.stringify(afterData.assignedWorkers || []);
    const desiredAccess = buildProjectAccessUids(afterData);
    const currentAccess = uniqueValues(afterData.allowedStaffUids || []);

    if (JSON.stringify(desiredAccess) !== JSON.stringify(currentAccess)) {
      await event.data.after.ref.set({
        allowedStaffUids: desiredAccess,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    if (!event.data.before.exists || beforeWorkers !== afterWorkers) {
      await syncProjectFinancials(event.params.projectId);
    }

    const customerIds = uniqueValues([beforeData.customerId, afterData.customerId]);
    await Promise.all(customerIds.map((customerId) => syncCustomerSummary(customerId)));
  }
);

exports.syncCustomerDataOnLeadWrite = onDocumentWritten(
  {
    region: "us-central1",
    document: "leads/{leadId}"
  },
  async (event) => {
    const beforeData = event.data.before.exists ? event.data.before.data() : {};
    const afterData = event.data.after.exists ? event.data.after.data() : {};
    const customerIds = uniqueValues([beforeData.customerId, afterData.customerId]);

    await Promise.all(customerIds.map((customerId) => syncCustomerSummary(customerId)));
  }
);
