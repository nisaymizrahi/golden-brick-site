"use strict";

const crypto = require("node:crypto");
const admin = require("firebase-admin");
const PDFDocument = require("pdfkit");
const Stripe = require("stripe");
const logger = require("firebase-functions/logger");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");
const { buildClientPortalApi } = require("./clientPortal");
const { buildPublicLeadIntake } = require("./publicLeadIntake");

admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;
const googleCalendarFunctions = require("./googleCalendar");
const googleReviewsFunctions = require("./googleReviews");
const staffAdminFunctions = require("./staffAdmin");

const CRM_ADMIN_EMAILS = defineString("CRM_ADMIN_EMAILS", { default: "" });
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_DISABLED_MESSAGE =
  "Online Stripe checkout is temporarily unavailable. Please contact Golden Brick directly for payment coordination.";
const PENNSYLVANIA_HIC_REGISTRATION_NUMBER = "PA212716";
const PHILADELPHIA_GC_LICENSE_NUMBER = "065157";
const PA_CONSUMER_PROTECTION_PHONE = "1-888-520-6680";
const CONTRACTOR_BUSINESS_ADDRESS = "5635 Chester Ave, Philadelphia, PA 19143";

const COMPANY_INFO = {
  name: "Golden Brick Construction",
  phone: "(267) 715-5557",
  phoneHref: "+12677155557",
  email: "info@goldenbrickc.com",
  paRegistrationNumber: PENNSYLVANIA_HIC_REGISTRATION_NUMBER,
  philadelphiaLicenseNumber: PHILADELPHIA_GC_LICENSE_NUMBER,
};

const ESTIMATE_VERSION_SCHEMA_VERSION = 2;
const ESTIMATE_SIGNING_LEASE_MS = 10 * 60 * 1000;

const DEFAULT_CONTRACT_PAYMENT_SCHEDULE = [
  "No deposit is listed for this estimate unless a deposit amount is written into this estimate or a later signed revision.",
  "No payment is due before the written agreement is signed by the owner and Golden Brick Construction.",
].join("\n");

const DEFAULT_CONTRACT_SPECIAL_ORDER_MATERIALS =
  "No special-order material advance is listed for this estimate unless a material and amount are written into this estimate or a later signed revision.";

const DEFAULT_CONTRACT_SUBCONTRACTORS =
  "No subcontractors are listed for this estimate unless identified in the scope, project notes, permit record, or a later signed revision.";

const COMPANY_INSURANCE_DISCLOSURE = [
  "Commercial general liability policy NXTX9PVPLX-00-GL is active Feb. 10, 2026 through Feb. 10, 2027, with $1,000,000 each occurrence and $1,000,000 general aggregate limits shown on the certificate.",
  "Contractors errors and omissions coverage is shown with $10,000 each occurrence and $20,000 aggregate limits.",
].join("\n");

const STAFF_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const PUBLIC_CORS_HTTP_OPTIONS = {
  region: "us-central1",
  cors: true,
};

const PUBLIC_HTTP_OPTIONS = {
  region: "us-central1",
};

const LEAD_STATUSES = {
  new_lead: "New Lead",
  follow_up: "Follow Up",
  estimate_sent: "Estimate Sent",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const LEGACY_DEFAULT_ESTIMATE_STANDARD_TERMS = [
  "This estimate is based on standard contractor-stock materials and finishes unless otherwise stated in writing.",
  "Pricing remains subject to final scope confirmation, field measurements, access conditions, and finish selections.",
  "Golden Brick Construction is not responsible for unforeseen concealed, latent, or site conditions discovered after work begins. Any resulting scope, schedule, or pricing adjustments must be documented in writing before additional work proceeds.",
].join("\n");

const DEFAULT_ESTIMATE_STANDARD_TERMS = [
  `Golden Brick Construction discloses Pennsylvania Home Improvement Contractor Registration No. ${PENNSYLVANIA_HIC_REGISTRATION_NUMBER} and Philadelphia General Contractor License No. ${PHILADELPHIA_GC_LICENSE_NUMBER}. The official registration number can be obtained from the Pennsylvania Office of Attorney General's Bureau of Consumer Protection by calling toll-free within Pennsylvania ${PA_CONSUMER_PROTECTION_PHONE}. Registration does not imply endorsement.`,
  "This estimate reflects the scope, quantities, access assumptions, and material quality level identified at the time it was prepared. Unless noted otherwise in writing, pricing assumes contractor-stock materials and standard installation conditions.",
  "Final pricing, sequencing, and production details remain subject to site verification, accurate field measurements, finish selections, structural discoveries, code requirements, utility conditions, and any revisions approved in writing after this estimate was issued.",
  "Unforeseen concealed, latent, or site conditions discovered after work begins are not included in this estimate. If those conditions affect scope, cost, sequencing, or duration, Golden Brick Construction will document the revision in writing before additional work proceeds.",
  "Permits, inspections, engineering input, specialty vendor work, and trade coordination are included only when specifically called for by the approved scope or later documented through written revisions.",
  "A signed approval is required before any home improvement work begins. Any requested scope, material, or scheduling changes after estimate approval must be captured in writing and may require revised pricing or a formal change order before added work can begin.",
].join("\n");

const LEGACY_ESTIMATE_TEMPLATE_TERMS = new Set([
  "Pricing is a planning estimate until site conditions, access, finish selections, and final scope are confirmed.",
  "Pricing is a planning estimate until scope, access, existing conditions, and finish selections are confirmed on site.",
  LEGACY_DEFAULT_ESTIMATE_STANDARD_TERMS,
]);

const LEGACY_DEFAULT_AGREEMENT_TITLE = ["Client", " authorization and agreement"].join("");
const DEFAULT_AGREEMENT_TITLE = "Estimate approval and home improvement agreement";

const LEGACY_DEFAULT_AGREEMENT_INTRO = [
  "If you would like Golden Brick Construction to move forward from this estimate into the next planning and production step, please review and sign the agreement terms below.",
  "Your signature locks the estimate snapshot shown on this page into the project file so Golden Brick and the client are aligned on the approved scope and commercial terms at the time of acceptance.",
].join("\n");

const DEFAULT_AGREEMENT_INTRO = [
  "This section records the estimate, agreement details, cancellation rights, and required notices for the project.",
  "Once signed, the estimate overview, line items, project notes, agreement details, cancellation notice, and signature record are kept together as the project approval record.",
].join("\n");

const LEGACY_DEFAULT_AGREEMENT_TERMS = [
  [
    "By signing below, you confirm that Golden Brick Construction may move forward based on the estimate scope and pricing snapshot shown on this page, subject to final field",
    " verification and any written revisions agreed by both parties.",
  ].join(""),
  "Any requested scope, material, pricing, or schedule changes after signature must be documented in writing and may require a revised estimate or change order before additional work proceeds.",
  "Scheduling, procurement, and start-date coordination remain subject to site access, deposit and payment coordination, municipal approvals, final measurements, and confirmed finish selections where applicable.",
].join("\n");

const DEFAULT_AGREEMENT_TERMS = [
  "By signing below, the owner or authorized signer approves the estimate scope and pricing snapshot shown on this page and authorizes Golden Brick Construction to move forward under the agreement details and required notices shown with this record.",
  "This approval is tied to the scope, specifications, assumptions, and pricing shown on this page only. Any requested changes to scope, materials, quantities, schedule, finish level, or specifications after signature must be documented in a written change order or signed revision before the changed work proceeds.",
  "Any pricing tied to allowances, contractor-stock materials, existing-condition assumptions, or standard installation methods may change if site conditions, code requirements, measurements, owner selections, or requested upgrades differ from the assumptions used to prepare this estimate.",
  "Golden Brick Construction is not responsible for concealed, latent, or previously unknown conditions discovered after work begins, including structural issues, moisture damage, outdated wiring, plumbing deficiencies, code deficiencies, or other conditions that were not visible at the time of estimating. If discovered, the project file will be updated in writing before additional affected work continues.",
  "The approximate start date and approximate completion date shown in the agreement details are planning dates for this project. Sequencing, inspections, and completion timing remain subject to site access, material availability, lead times, utility conditions, municipal approvals, weather, timely selections, and prior work completion.",
  "Where permits, inspections, engineering input, specialty vendor coordination, or Philadelphia contractor disclosures are required for the approved scope, Golden Brick Construction will coordinate those next steps as applicable; however, municipal review timing, utility scheduling, and third-party delays remain outside the contractor's direct control.",
  "The owner or authorized signer agrees to provide reasonable site access, timely design or finish decisions, timely responses to scope clarifications, and any owner-supplied selections or information needed to keep the project moving. Delays in access, selections, or approvals may affect schedule and cost.",
  "No payment is due before the written agreement is signed. Any deposit, special-order material advance, milestone invoice, retainage, or final payment must be listed in writing in this estimate, an approved invoice, or a later signed revision before it is due. Golden Brick Construction may pause procurement, scheduling, or active work if required payments or approvals are outstanding.",
  "Special-order materials, custom fabricated items, non-stock finishes, and approved purchases made specifically for this project may be non-refundable once ordered or fabricated.",
  `Golden Brick Construction is registered as Pennsylvania Home Improvement Contractor Registration No. ${PENNSYLVANIA_HIC_REGISTRATION_NUMBER} and holds Philadelphia General Contractor License No. ${PHILADELPHIA_GC_LICENSE_NUMBER}. Subcontractors, specialty trades, and vendor partners may be used where appropriate, but Golden Brick remains the coordinating contractor for the approved scope reflected here.`,
  "For work that disturbs painted surfaces in pre-1978 housing or child-occupied facilities, lead-safe requirements may apply. Lead paint, asbestos, mold, hazardous materials, hidden damage, or environmental remediation are included only when specifically written into the approved scope.",
  "The owner or authorized signer has the right to cancel a Pennsylvania home improvement contract within three business days of signing, except where a valid emergency authorization applies. Golden Brick will honor timely cancellation notice provided by any medium that gives Golden Brick actual notice.",
  "Golden Brick's delivery of this agreement records the contractor's approval to present these terms for signature. The owner signature and Golden Brick project record together form the signed approval record maintained for this project.",
  "This signed estimate, together with the agreement details, cancellation notice, insurance disclosure, registration disclosure, later written revisions, schedules, payment milestones, change orders, selections, and required statutory notices, becomes part of the final project record maintained by Golden Brick Construction.",
].join("\n");

const DEFAULT_CHANGE_ORDER_TERMS = [
  "This change order captures a written revision to the approved Golden Brick project record and becomes part of the signed project file once accepted.",
  "Only the change, scope clarification, or pricing adjustment shown on this page is being approved here. All other previously approved estimate, agreement, invoice, and project terms remain in effect unless separately revised in writing.",
  "If site conditions, concealed conditions, access limitations, code requirements, owner selections, or requested upgrades affect the revised work after this change order is issued, Golden Brick Construction will document any resulting revision in writing before the affected additional work proceeds.",
  "Scheduling, sequencing, procurement, and completion timing tied to this change order remain subject to site access, material lead times, inspections, municipal approvals, third-party coordination, and timely owner decisions where applicable.",
  "Once signed, this change order becomes an approved revenue revision in the project record and may be billed separately or folded into later invoices at Golden Brick's discretion.",
].join("\n");

const LEGACY_AGREEMENT_TEMPLATE_TITLES = new Set([
  LEGACY_DEFAULT_AGREEMENT_TITLE,
]);

const LEGACY_AGREEMENT_TEMPLATE_INTROS = new Set([
  LEGACY_DEFAULT_AGREEMENT_INTRO,
]);

const LEGACY_AGREEMENT_TEMPLATE_TERMS = new Set([
  LEGACY_DEFAULT_AGREEMENT_TERMS,
]);

const DEFAULT_SERVICE_TEMPLATES = [
  {
    id: "property-purchase-estimate-review",
    internalName: "Property Purchase Estimate Review",
    clientTitle: "Property Purchase Estimate Review",
    defaultPrice: 100,
    defaultInvoiceLines: [
      {
        label: "Property purchase estimate review",
        description:
          "Golden Brick reviews the property, outlines likely renovation needs, and provides a fast investor-ready estimate opinion before purchase.",
        amount: 100,
      },
    ],
    defaultSummary:
      "Golden Brick reviews the property and provides a focused estimate opinion before acquisition so you can pressure-test scope, timing, and risk.",
    defaultPlanningNotes:
      "Confirm property address, gather any listing photos or inspection notes, and send the client one concise take with the biggest renovation risks called out.",
    defaultPaymentRequirement: "upfront_required",
    active: true,
  },
  {
    id: "repair-scope-deal-analysis",
    internalName: "Repair Scope + Deal Analysis",
    clientTitle: "Repair Scope + Deal Analysis",
    defaultPrice: 250,
    defaultInvoiceLines: [
      {
        label: "Repair scope and recommendations",
        description:
          "Golden Brick defines the likely repair path based on the client's goals and outlines the most sensible scope options.",
        amount: 150,
      },
      {
        label: "Deal analysis and estimate options",
        description:
          "We prepare working budget ranges, tradeoff options, and investor-friendly deal numbers to support the decision.",
        amount: 100,
      },
    ],
    defaultSummary:
      "Golden Brick builds the repair scope around the client's goals, adds our recommendations, and returns practical pricing options plus deal-analysis numbers.",
    defaultPlanningNotes:
      "Collect the client's decision criteria, confirm whether this is wholesale, flip, or rental hold, and frame at least two realistic scope paths before delivering pricing.",
    defaultPaymentRequirement: "upfront_required",
    active: true,
  },
];

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

function httpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function httpStatusForError(error, fallback = 500) {
  if (Number.isInteger(error?.status)) {
    return error.status;
  }

  const code = safeString(error?.code).toLowerCase();
  if (
    code.includes("id-token-expired") ||
    code.includes("argument-error") ||
    code.includes("invalid-credential") ||
    code.includes("invalid-id-token")
  ) {
    return 401;
  }

  if (
    code.includes("insufficient-permission") ||
    code.includes("permission-denied") ||
    code.includes("user-disabled")
  ) {
    return 403;
  }

  if (
    code.includes("deadline-exceeded") ||
    code.includes("unavailable") ||
    code.includes("resource-exhausted")
  ) {
    return 503;
  }

  return fallback;
}

async function verifyStaffIdToken(request) {
  const authHeader = request.get("authorization") || "";
  const matches = authHeader.match(/^Bearer (.+)$/i);

  if (!matches) {
    throw httpError("Missing bearer token.", 401);
  }

  try {
    return await admin.auth().verifyIdToken(matches[1]);
  } catch (error) {
    logger.warn("Staff bearer token could not be verified.", error);
    throw httpError("Your staff session expired. Please sign in again.", 401);
  }
}

function normalisePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

function normalisePortalContactRole(value) {
  const role = safeString(value).toLowerCase();
  if (role === "primary" || role === "partner" || role === "read_only") {
    return role;
  }
  if (role === "read-only" || role === "readonly") {
    return "read_only";
  }
  if (role === "read_only") {
    return "read_only";
  }
  if (role === "customer") {
    return "primary";
  }
  return "primary";
}

function portalContactAccessScope(role) {
  return normalisePortalContactRole(role) === "read_only"
    ? "read_only"
    : "customer";
}

function portalContactCanSign(role) {
  const normalised = normalisePortalContactRole(role);
  return normalised === "primary" || normalised === "partner";
}

function normaliseShareType(value) {
  return safeString(value).toLowerCase() === "change_order"
    ? "change_order"
    : "estimate";
}

function normaliseChangeOrderStatus(value) {
  const status = safeString(value).toLowerCase();
  if (status === "approved" || status === "void") {
    return status;
  }
  return "draft";
}

function normaliseVendorBillStatus(value) {
  const status = safeString(value).toLowerCase();
  if (status === "scheduled" || status === "paid" || status === "void") {
    return status;
  }
  return "open";
}

function statusLabel(status) {
  return LEAD_STATUSES[status] || LEAD_STATUSES.new_lead;
}

function uniqueValues(values) {
  return Array.from(
    new Set((values || []).map((value) => safeString(value)).filter(Boolean)),
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
    return (
      normaliseMillis(right.updatedAt || right.createdAt) -
      normaliseMillis(left.updatedAt || left.createdAt)
    );
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
      const customerEmail = normaliseEmail(
        customer.searchEmail || customer.primaryEmail,
      );
      const customerPhone = normalisePhone(
        customer.searchPhone || customer.primaryPhone,
      );
      return (
        (normalisedLeadEmail && customerEmail === normalisedLeadEmail) ||
        (normalisedLeadPhone && customerPhone === normalisedLeadPhone)
      );
    });

  return matches.sort((left, right) => {
    return (
      normaliseMillis(right.updatedAt || right.createdAt) -
      normaliseMillis(left.updatedAt || left.createdAt)
    );
  });
}

function buildCustomerPayloadFromLead(leadData = {}, existingCustomer = {}) {
  return {
    name: safeString(
      existingCustomer.name ||
        leadData.customerName ||
        leadData.clientName ||
        "Unnamed customer",
    ),
    primaryEmail: safeString(
      existingCustomer.primaryEmail || leadData.clientEmail,
    ),
    primaryPhone: safeString(
      existingCustomer.primaryPhone || leadData.clientPhone,
    ),
    primaryAddress: safeString(
      existingCustomer.primaryAddress || leadData.projectAddress,
    ),
    notes: safeString(existingCustomer.notes),
    searchEmail: normaliseEmail(
      existingCustomer.searchEmail ||
        existingCustomer.primaryEmail ||
        leadData.clientEmail,
    ),
    searchPhone: normalisePhone(
      existingCustomer.searchPhone ||
        existingCustomer.primaryPhone ||
        leadData.clientPhone,
    ),
    allowedStaffUids: uniqueValues([
      ...(existingCustomer.allowedStaffUids || []),
      safeString(leadData.assignedToUid),
    ]),
  };
}

async function ensureCustomerDocument(customerRef, leadData = {}) {
  const customerSnap = await customerRef.get();
  const existingCustomer = customerSnap.exists ? customerSnap.data() : {};
  const payload = buildCustomerPayloadFromLead(leadData, existingCustomer);

  await customerRef.set(
    {
      id: customerRef.id,
      ...payload,
      createdAt: existingCustomer.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    id: customerRef.id,
    name: payload.name,
  };
}

async function ensureLeadCustomerLink(leadRef, leadData = {}) {
  if (leadData.customerId) {
    const linkedCustomer = await ensureCustomerDocument(
      db.collection("customers").doc(leadData.customerId),
      leadData,
    );

    await leadRef.set(
      {
        customerId: linkedCustomer.id,
        customerName: linkedCustomer.name,
        customerMatchResult: "linked",
        customerReviewRequired: false,
        customerMatchIds: [linkedCustomer.id],
      },
      { merge: true },
    );

    return {
      customerId: linkedCustomer.id,
      customerName: linkedCustomer.name,
      matchResult: "linked",
      reviewRequired: false,
      customerMatchIds: [linkedCustomer.id],
    };
  }

  const matches = await findMatchingCustomers(leadData);

  if (matches.length > 1) {
    const customerMatchIds = matches.map((customer) => customer.id);

    await leadRef.set(
      {
        customerId: null,
        customerName: "",
        customerMatchResult: "review_required",
        customerReviewRequired: true,
        customerMatchIds,
      },
      { merge: true },
    );

    return {
      customerId: null,
      customerName: "",
      matchResult: "review_required",
      reviewRequired: true,
      customerMatchIds,
    };
  }

  if (matches.length === 1) {
    const linkedCustomer = await ensureCustomerDocument(
      db.collection("customers").doc(matches[0].id),
      {
        ...leadData,
        customerId: matches[0].id,
        customerName: matches[0].name || leadData.clientName,
      },
    );

    await leadRef.set(
      {
        customerId: linkedCustomer.id,
        customerName: linkedCustomer.name,
        customerMatchResult: "linked",
        customerReviewRequired: false,
        customerMatchIds: [linkedCustomer.id],
      },
      { merge: true },
    );

    return {
      customerId: linkedCustomer.id,
      customerName: linkedCustomer.name,
      matchResult: "linked",
      reviewRequired: false,
      customerMatchIds: [linkedCustomer.id],
    };
  }

  const customerRef = db.collection("customers").doc();
  const createdCustomer = await ensureCustomerDocument(customerRef, leadData);

  await leadRef.set(
    {
      customerId: createdCustomer.id,
      customerName: createdCustomer.name,
      customerMatchResult: "created",
      customerReviewRequired: false,
      customerMatchIds: [createdCustomer.id],
    },
    { merge: true },
  );

  return {
    customerId: createdCustomer.id,
    customerName: createdCustomer.name,
    matchResult: "created",
    reviewRequired: false,
    customerMatchIds: [createdCustomer.id],
  };
}

function customerIdentityMatchesLead(customerData = {}, leadData = {}) {
  const leadEmail = normaliseEmail(leadData.clientEmail);
  const leadPhone = normalisePhone(leadData.clientPhone);
  const customerEmail = normaliseEmail(
    customerData.searchEmail || customerData.primaryEmail,
  );
  const customerPhone = normalisePhone(
    customerData.searchPhone || customerData.primaryPhone,
  );
  const comparableEmail = Boolean(leadEmail && customerEmail);
  const comparablePhone = Boolean(leadPhone && customerPhone);

  if (!comparableEmail && !comparablePhone) {
    return true;
  }

  return (
    (comparableEmail && leadEmail === customerEmail) ||
    (comparablePhone && leadPhone === customerPhone)
  );
}

async function resolveEstimatePublishCustomer(leadData = {}) {
  const linkedCustomerId = safeString(leadData.customerId);

  if (linkedCustomerId) {
    const customerRef = db.collection("customers").doc(linkedCustomerId);
    const customerSnap = await customerRef.get();
    const customerData = customerSnap.exists ? customerSnap.data() || {} : {};

    if (
      customerSnap.exists &&
      !customerIdentityMatchesLead(customerData, leadData)
    ) {
      const error = new Error(
        "The customer linked to this lead does not match the lead contact details. Review the customer connection before publishing.",
      );
      error.status = 409;
      error.matchResult = "review_required";
      error.customerMatchIds = [linkedCustomerId];
      throw error;
    }

    return {
      customerId: linkedCustomerId,
      customerName: safeString(
        customerData.name ||
          leadData.customerName ||
          leadData.clientName,
      ),
      customerRef,
    };
  }

  const matches = await findMatchingCustomers(leadData);
  if (matches.length > 1) {
    const error = new Error(
      "Multiple customers match this lead. Connect the correct customer before publishing the estimate.",
    );
    error.status = 409;
    error.matchResult = "review_required";
    error.customerMatchIds = matches.map((customer) => customer.id);
    throw error;
  }

  if (matches.length === 1) {
    return {
      customerId: matches[0].id,
      customerName: safeString(
        matches[0].name ||
          leadData.customerName ||
          leadData.clientName,
      ),
      customerRef: db.collection("customers").doc(matches[0].id),
    };
  }

  const customerRef = db.collection("customers").doc();
  return {
    customerId: customerRef.id,
    customerName: safeString(
      leadData.customerName ||
        leadData.clientName ||
        "Unnamed customer",
    ),
    customerRef,
  };
}

async function ensureServiceOrderCustomer(orderData = {}) {
  if (safeString(orderData.customerId)) {
    const linkedCustomer = await ensureCustomerDocument(
      db.collection("customers").doc(orderData.customerId),
      orderData,
    );
    return {
      customerId: linkedCustomer.id,
      customerName: linkedCustomer.name,
      matchResult: "linked",
      reviewRequired: false,
      customerMatchIds: [linkedCustomer.id],
    };
  }

  const matches = await findMatchingCustomers(orderData);

  if (matches.length > 1) {
    const error = new Error(
      "Multiple customer matches were found. Pick the customer first, then create the service order.",
    );
    error.status = 409;
    error.matchResult = "review_required";
    error.customerMatchIds = matches.map((customer) => customer.id);
    throw error;
  }

  if (matches.length === 1) {
    const linkedCustomer = await ensureCustomerDocument(
      db.collection("customers").doc(matches[0].id),
      {
        ...orderData,
        customerId: matches[0].id,
        customerName: matches[0].name || orderData.clientName,
      },
    );
    return {
      customerId: linkedCustomer.id,
      customerName: linkedCustomer.name,
      matchResult: "linked",
      reviewRequired: false,
      customerMatchIds: [linkedCustomer.id],
    };
  }

  const customerRef = db.collection("customers").doc();
  const createdCustomer = await ensureCustomerDocument(customerRef, orderData);
  return {
    customerId: createdCustomer.id,
    customerName: createdCustomer.name,
    matchResult: "created",
    reviewRequired: false,
    customerMatchIds: [createdCustomer.id],
  };
}

function defaultEstimateTemplate() {
  return {
    id: "estimate-default",
    name: "Investor Estimate Default",
    subjectTemplate:
      "Golden Brick estimate for {{projectType}} at {{projectAddress}}",
    greeting: "Hi {{clientName}},",
    intro:
      "Thanks for speaking with Golden Brick Construction. Based on the details you shared, here is a working estimate outline for the project.",
    outro:
      "Please review this estimate, note any revisions, and let us know if you want to move into the next planning step.",
    terms: DEFAULT_ESTIMATE_STANDARD_TERMS,
    agreementTitle: DEFAULT_AGREEMENT_TITLE,
    agreementIntro: DEFAULT_AGREEMENT_INTRO,
    agreementTerms: DEFAULT_AGREEMENT_TERMS,
    contractorBusinessAddress: CONTRACTOR_BUSINESS_ADDRESS,
  };
}

function resolveEstimateTemplateTerms(template = {}) {
  const terms = safeString(template.terms);
  if (!terms || LEGACY_ESTIMATE_TEMPLATE_TERMS.has(terms)) {
    return DEFAULT_ESTIMATE_STANDARD_TERMS;
  }
  return terms;
}

function resolveAgreementTemplateTitle(template = {}) {
  const title = safeString(template.agreementTitle);
  if (!title || LEGACY_AGREEMENT_TEMPLATE_TITLES.has(title)) {
    return DEFAULT_AGREEMENT_TITLE;
  }
  return title;
}

function resolveAgreementTemplateIntro(template = {}) {
  const intro = safeString(template.agreementIntro);
  if (!intro || LEGACY_AGREEMENT_TEMPLATE_INTROS.has(intro)) {
    return DEFAULT_AGREEMENT_INTRO;
  }
  return intro;
}

function resolveAgreementTemplateTerms(template = {}) {
  const terms = safeString(template.agreementTerms);
  if (!terms || LEGACY_AGREEMENT_TEMPLATE_TERMS.has(terms)) {
    return DEFAULT_AGREEMENT_TERMS;
  }
  return terms;
}

function defaultServiceTemplateSeed(template = {}) {
  const starter =
    DEFAULT_SERVICE_TEMPLATES.find((item) => item.id === template.id) ||
    DEFAULT_SERVICE_TEMPLATES[0];
  return {
    id: safeString(template.id || starter.id),
    internalName: safeString(template.internalName || starter.internalName),
    clientTitle: safeString(template.clientTitle || starter.clientTitle),
    defaultPrice: toNumber(template.defaultPrice || starter.defaultPrice),
    defaultInvoiceLines:
      Array.isArray(template.defaultInvoiceLines) &&
      template.defaultInvoiceLines.length
        ? template.defaultInvoiceLines.map((line) => ({
            label: safeString(line.label || line.title),
            description: safeString(line.description || line.note),
            amount: toNumber(line.amount),
          }))
        : starter.defaultInvoiceLines.map((line) => ({ ...line })),
    defaultSummary: safeString(
      template.defaultSummary || starter.defaultSummary,
    ),
    defaultPlanningNotes: safeString(
      template.defaultPlanningNotes || starter.defaultPlanningNotes,
    ),
    defaultPaymentRequirement:
      safeString(
        template.defaultPaymentRequirement || starter.defaultPaymentRequirement,
      ) || "upfront_required",
    active: template.active !== false,
  };
}

function normaliseServiceTemplateDoc(template = {}) {
  return {
    ...defaultServiceTemplateSeed(template),
    defaultPrice: toNumber(
      template.defaultPrice ??
        defaultServiceTemplateSeed(template).defaultPrice,
    ),
    defaultInvoiceLines:
      Array.isArray(template.defaultInvoiceLines) &&
      template.defaultInvoiceLines.length
        ? template.defaultInvoiceLines
            .map((line) => ({
              label: safeString(line.label || line.title),
              description: safeString(line.description || line.note),
              amount: toNumber(line.amount),
            }))
            .filter((line) => line.label || line.description || line.amount)
        : defaultServiceTemplateSeed(template).defaultInvoiceLines,
  };
}

function serviceTemplateLineItemsForAmount(
  template = {},
  overrideAmount = null,
) {
  const baseLines =
    Array.isArray(template.defaultInvoiceLines) &&
    template.defaultInvoiceLines.length
      ? template.defaultInvoiceLines.map((line) => ({
          label: safeString(line.label || line.title),
          description: safeString(line.description || line.note),
          amount: toNumber(line.amount),
        }))
      : [
          {
            label: safeString(
              template.clientTitle || template.internalName || "Service",
            ),
            description: safeString(
              template.defaultSummary || "Golden Brick professional service.",
            ),
            amount: toNumber(template.defaultPrice),
          },
        ];

  const targetAmount = toNumber(
    overrideAmount !== null && overrideAmount !== ""
      ? overrideAmount
      : template.defaultPrice,
  );
  const baseTotal = baseLines.reduce(
    (sum, line) => sum + toNumber(line.amount),
    0,
  );

  if (!targetAmount) {
    return baseLines;
  }

  if (baseLines.length === 1) {
    baseLines[0].amount = targetAmount;
    return baseLines;
  }

  const delta = Number((targetAmount - baseTotal).toFixed(2));
  if (Math.abs(delta) >= 0.01) {
    baseLines.push({
      label: delta > 0 ? "Pricing adjustment" : "Included discount",
      description:
        delta > 0
          ? "Adjustment to align the order with the confirmed client price."
          : "Discount applied to align the order with the confirmed client price.",
      amount: delta,
    });
  }

  return baseLines;
}

function buildInvoiceFingerprint(invoiceData = {}) {
  return JSON.stringify({
    title: safeString(invoiceData.title),
    issueDate: serialiseDateValue(invoiceData.issueDate),
    dueDate: serialiseDateValue(invoiceData.dueDate),
    summary: safeString(invoiceData.summary),
    notes: safeString(invoiceData.notes),
    customFields: Array.isArray(invoiceData.customFields)
      ? invoiceData.customFields.map((field) => ({
          label: safeString(field.label),
          value: safeString(field.value),
        }))
      : [],
    lineItems: Array.isArray(invoiceData.lineItems)
      ? invoiceData.lineItems.map((item) => ({
          label: safeString(item.label),
          description: safeString(item.description),
          amount: toNumber(item.amount),
        }))
      : [],
    subtotal: Number(toNumber(invoiceData.subtotal).toFixed(2)),
  });
}

function serviceOrderBillingStatus(
  paymentRequirement,
  totalRevenue = 0,
  totalPayments = 0,
  hasReadyLink = false,
) {
  if (
    toNumber(totalRevenue) > 0 &&
    toNumber(totalPayments) >= toNumber(totalRevenue) - 0.01
  ) {
    return "paid";
  }

  if (toNumber(totalPayments) > 0) {
    return "partially_paid";
  }

  if (hasReadyLink) {
    return "payment_link_ready";
  }

  return safeString(paymentRequirement) === "can_pay_later"
    ? "can_pay_later"
    : "awaiting_payment";
}

function createStripeClient() {
  const secretKey = safeString(STRIPE_SECRET_KEY.value());
  if (!secretKey) {
    const error = new Error("Stripe secret key is not configured.");
    error.status = 500;
    throw error;
  }

  return new Stripe(secretKey, {
    apiVersion: "2026-02-25.clover",
  });
}

async function ensureDefaultServiceTemplates() {
  const batch = db.batch();
  let writes = 0;

  for (const template of DEFAULT_SERVICE_TEMPLATES) {
    const templateRef = db.collection("serviceTemplates").doc(template.id);
    const templateSnap = await templateRef.get();
    if (templateSnap.exists) {
      continue;
    }

    writes += 1;
    batch.set(
      templateRef,
      {
        ...normaliseServiceTemplateDoc(template),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  if (writes) {
    await batch.commit();
  }
}

async function fetchServiceTemplate(templateId) {
  await ensureDefaultServiceTemplates();

  const serviceTemplateId = safeString(templateId);
  if (!serviceTemplateId) {
    const error = new Error("templateId is required.");
    error.status = 400;
    throw error;
  }

  const templateSnap = await db
    .collection("serviceTemplates")
    .doc(serviceTemplateId)
    .get();
  if (templateSnap.exists) {
    return normaliseServiceTemplateDoc({
      id: templateSnap.id,
      ...templateSnap.data(),
    });
  }

  const fallbackTemplate = DEFAULT_SERVICE_TEMPLATES.find(
    (item) => item.id === serviceTemplateId,
  );
  if (fallbackTemplate) {
    return normaliseServiceTemplateDoc(fallbackTemplate);
  }

  const error = new Error("Service template not found.");
  error.status = 404;
  throw error;
}

function normaliseStaffRole(value) {
  return safeString(value).toLowerCase() === "admin" ? "admin" : "employee";
}

function buildStaffProfile(decoded, allowedData = {}) {
  return {
    uid: safeString(decoded.uid),
    email: safeString(decoded.email).toLowerCase(),
    displayName: safeString(
      decoded.name ||
        decoded.email ||
        allowedData.displayName ||
        allowedData.email,
    ),
    role: normaliseStaffRole(allowedData.role),
    active: true,
    defaultLeadAssignee: Boolean(allowedData.defaultLeadAssignee),
    lastLoginAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function serialiseStaffProfile(profile = {}) {
  return {
    uid: safeString(profile.uid),
    email: safeString(profile.email).toLowerCase(),
    displayName: safeString(profile.displayName || profile.email),
    role: normaliseStaffRole(profile.role),
    active: profile.active !== false,
    defaultLeadAssignee: Boolean(profile.defaultLeadAssignee),
  };
}

async function fetchStaffSummariesByUid(uids = []) {
  const cleanUids = uniqueValues(uids);
  if (!cleanUids.length) {
    return [];
  }

  const userSnaps = await Promise.all(
    cleanUids.map((uid) => db.collection("users").doc(uid).get()),
  );

  return userSnaps
    .map((snapshot) => (snapshot.exists ? snapshot.data() : null))
    .filter(Boolean)
    .map((profile) => ({
      uid: safeString(profile.uid),
      email: normaliseEmail(profile.email),
      displayName: safeString(profile.displayName || profile.email),
      role: normaliseStaffRole(profile.role),
    }));
}

function buildAssignedWorkers(
  staffProfiles = [],
  ownerUid = "",
  fallbackProfile = null,
) {
  const orderedUids = uniqueValues([
    ownerUid,
    ...staffProfiles.map((profile) => safeString(profile.uid)),
  ]);
  const orderedProfiles = orderedUids
    .map((uid) => {
      const existing = staffProfiles.find(
        (profile) => safeString(profile.uid) === uid,
      );
      if (existing) {
        return existing;
      }

      if (fallbackProfile && safeString(fallbackProfile.uid) === uid) {
        return {
          uid,
          email: normaliseEmail(fallbackProfile.email),
          displayName: safeString(
            fallbackProfile.displayName || fallbackProfile.email,
          ),
          role: normaliseStaffRole(fallbackProfile.role),
        };
      }

      return null;
    })
    .filter(Boolean);

  if (!orderedProfiles.length) {
    return [];
  }

  const equalSplit = Number((100 / orderedProfiles.length).toFixed(2));
  let remaining = 100;

  return orderedProfiles.map((profile, index) => {
    const percent =
      index === orderedProfiles.length - 1
        ? Number(remaining.toFixed(2))
        : equalSplit;
    remaining -= percent;

    return {
      uid: safeString(profile.uid),
      name: safeString(
        profile.displayName || profile.email || "Assigned worker",
      ),
      email: normaliseEmail(profile.email),
      percent,
    };
  });
}

function normaliseAssignedWorkers(assignedWorkers = []) {
  return assignedWorkers
    .map((worker) => ({
      uid: safeString(worker.uid),
      name: safeString(worker.name),
      email: safeString(worker.email).toLowerCase(),
      percent: toNumber(worker.percent),
    }))
    .filter((worker) => worker.uid || worker.email || worker.name);
}

function buildProjectAccessUids(projectData = {}) {
  return uniqueValues([
    safeString(projectData.assignedLeadOwnerUid),
    ...(projectData.assignedWorkerIds || []).map((uid) => safeString(uid)),
  ]);
}

function buildLockedCommissionSnapshot(summary = {}) {
  return {
    baseContractValue: toNumber(summary.baseContractValue),
    approvedChangeOrdersTotal: toNumber(summary.approvedChangeOrdersTotal),
    totalContractRevenue: toNumber(summary.totalContractRevenue),
    totalExpenses: toNumber(summary.totalExpenses),
    totalPayments: toNumber(summary.totalPayments),
    projectedGrossProfit: toNumber(summary.projectedGrossProfit),
    cashPosition: toNumber(summary.cashPosition),
    balanceRemaining: toNumber(summary.balanceRemaining),
    companyShare: toNumber(summary.companyShare),
    workerPool: toNumber(summary.workerPool),
    workerBreakdown: Array.isArray(summary.workerBreakdown)
      ? summary.workerBreakdown.map((worker) => ({
          uid: safeString(worker.uid),
          name: safeString(worker.name),
          email: normaliseEmail(worker.email),
          percent: toNumber(worker.percent),
          amount: toNumber(worker.amount),
        }))
      : [],
    lockedAt: FieldValue.serverTimestamp(),
  };
}

function computeFinanceSummary(
  projectData,
  expenseDocs,
  paymentDocs,
  changeOrderDocs = [],
) {
  const baseContractValue = toNumber(
    projectData.baseContractValue || projectData.jobValue || 0,
  );
  const approvedChangeOrdersTotal = changeOrderDocs
    .filter((doc) => normaliseChangeOrderStatus(doc.status) === "approved")
    .reduce((sum, doc) => sum + toNumber(doc.amount), 0);
  const totalContractRevenue = baseContractValue + approvedChangeOrdersTotal;
  const totalExpenses = expenseDocs.reduce(
    (sum, doc) => sum + toNumber(doc.amount),
    0,
  );
  const totalPayments = paymentDocs.reduce(
    (sum, doc) => sum + toNumber(doc.amount),
    0,
  );
  const rawProfit = totalContractRevenue - totalExpenses;
  const distributableProfit = Math.max(rawProfit, 0);
  const companyShare = distributableProfit * 0.5;
  const workerPool = distributableProfit * 0.5;
  const cashPosition = totalPayments - totalExpenses;
  const balanceRemaining = totalContractRevenue - totalPayments;

  const assignedWorkers = normaliseAssignedWorkers(projectData.assignedWorkers);
  const totalPercent = assignedWorkers.reduce(
    (sum, worker) => sum + worker.percent,
    0,
  );
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
      amount,
    };
  });

  return {
    baseContractValue: Number(baseContractValue.toFixed(2)),
    approvedChangeOrdersTotal: Number(approvedChangeOrdersTotal.toFixed(2)),
    totalContractRevenue: Number(totalContractRevenue.toFixed(2)),
    totalExpenses: Number(totalExpenses.toFixed(2)),
    totalPayments: Number(totalPayments.toFixed(2)),
    profit: Number(rawProfit.toFixed(2)),
    projectedGrossProfit: Number(rawProfit.toFixed(2)),
    distributableProfit: Number(distributableProfit.toFixed(2)),
    cashPosition: Number(cashPosition.toFixed(2)),
    balanceRemaining: Number(balanceRemaining.toFixed(2)),
    companyShare: Number(companyShare.toFixed(2)),
    workerPool: Number(workerPool.toFixed(2)),
    workerBreakdown,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function ensureDefaultTemplate() {
  const templateRef = db.collection("emailTemplates").doc("estimate-default");
  const templateSnap = await templateRef.get();

  if (!templateSnap.exists) {
    await templateRef.set({
      ...defaultEstimateTemplate(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

async function fetchTemplate() {
  await ensureDefaultTemplate();
  const templateSnap = await db
    .collection("emailTemplates")
    .doc("estimate-default")
    .get();
  const data = templateSnap.data() || defaultEstimateTemplate();
  return {
    ...defaultEstimateTemplate(),
    ...data,
    terms: resolveEstimateTemplateTerms(data),
    agreementTitle: resolveAgreementTemplateTitle(data),
    agreementIntro: resolveAgreementTemplateIntro(data),
    agreementTerms: resolveAgreementTemplateTerms(data),
    contractorBusinessAddress:
      safeString(data.contractorBusinessAddress) || CONTRACTOR_BUSINESS_ADDRESS,
  };
}

function fallbackEstimateDraft(lead, template) {
  const projectType = safeString(lead.projectType).toLowerCase();
  let lineItems;

  if (projectType.includes("bath")) {
    lineItems = [
      {
        label: "Demolition and site prep",
        description:
          "Protect the property, demo existing bathroom finishes, and prepare the room for rebuild.",
        amount: 2200,
      },
      {
        label: "Rough plumbing and electrical coordination",
        description:
          "Reset utility locations as needed and coordinate inspections for rough work.",
        amount: 3600,
      },
      {
        label: "Tile, waterproofing, and finish installation",
        description:
          "Install waterproofing, tile, trim, vanity, fixtures, and closeout details.",
        amount: 8900,
      },
    ];
  } else if (projectType.includes("kitchen")) {
    lineItems = [
      {
        label: "Demolition and protection",
        description:
          "Protect occupied areas and prepare the kitchen for layout and rough work.",
        amount: 3800,
      },
      {
        label: "Trade rough-ins and build-back",
        description:
          "Coordinate electrical, plumbing, drywall, and prep for cabinetry and finishes.",
        amount: 8600,
      },
      {
        label: "Cabinet, finish, and closeout scope",
        description:
          "Install cabinets, finishes, fixtures, trim, and final punch items.",
        amount: 12400,
      },
    ];
  } else if (projectType.includes("full")) {
    lineItems = [
      {
        label: "Scope planning and protection",
        description:
          "Initial demolition planning, site protection, and sequencing setup for a larger renovation.",
        amount: 6200,
      },
      {
        label: "Core trade coordination",
        description:
          "Structural, mechanical, electrical, and plumbing coordination during the main construction phase.",
        amount: 18800,
      },
      {
        label: "Interior finish package and closeout",
        description:
          "Drywall, trim, paint, finish carpentry, and final delivery across the renovated spaces.",
        amount: 21400,
      },
    ];
  } else {
    lineItems = [
      {
        label: "Initial site prep and demolition",
        description:
          "Protect the property and open the work area for construction.",
        amount: 2500,
      },
      {
        label: "Construction and coordination",
        description:
          "Coordinate trade work, materials, and sequencing for the scope discussed.",
        amount: 7600,
      },
      {
        label: "Finish installation and closeout",
        description:
          "Install finish materials, punch items, and project closeout details.",
        amount: 6800,
      },
    ];
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    subject: template.subjectTemplate
      .replace(
        "{{projectType}}",
        safeString(lead.projectType) || "your project",
      )
      .replace(
        "{{projectAddress}}",
        safeString(lead.projectAddress) || "your property",
      ),
    emailBody: [
      template.greeting.replace(
        "{{clientName}}",
        safeString(lead.clientName) || "there",
      ),
      "",
      template.intro,
      "",
      "This is a planning estimate based on the information currently available. We can tighten the pricing further after a site review, finish confirmation, and final scope check.",
    ].join("\n"),
    lineItems,
    subtotal,
    assumptions: [],
  };
}

function normaliseEstimateScopeItems(estimateData = {}) {
  if (!Array.isArray(estimateData.lineItems)) {
    return [];
  }

  return estimateData.lineItems
    .map((item, index) => ({
      title: safeString(item.title || item.label) || `Scope item ${index + 1}`,
      description: safeString(item.description),
      amount: toNumber(item.amount),
      estimateIndex: index,
    }))
    .filter((item) => item.title || item.description || item.amount);
}

function queueProjectScopeSnapshot(
  batch,
  projectRef,
  leadId,
  estimateData = {},
  actorProfile = {},
) {
  const scopeItems = normaliseEstimateScopeItems(estimateData);

  scopeItems.forEach((item) => {
    const scopeRef = projectRef.collection("scopeItems").doc();
    batch.set(
      scopeRef,
      {
        id: scopeRef.id,
        title: item.title,
        description: item.description,
        amount: item.amount,
        estimateIndex: item.estimateIndex,
        completed: false,
        completedAt: null,
        note: "",
        sourceLeadId: safeString(leadId),
        createdByUid: safeString(actorProfile.uid || "system"),
        createdByName: safeString(
          actorProfile.displayName ||
            actorProfile.email ||
            "Golden Brick System",
        ),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  return scopeItems.length;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(toNumber(value));
}

function formatDateOnly(value) {
  const millis = normaliseMillis(value);
  if (!millis) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(millis));
}

function formatDateTime(value) {
  const millis = normaliseMillis(value);
  if (!millis) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(millis));
}

function splitMultilineText(value) {
  return safeString(value)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanNullableString(value) {
  const normalised = safeString(value);
  return normalised || null;
}

function estimateRecordDocumentId(leadId) {
  return `estimate-${safeString(leadId)}`;
}

function buildRecordDocumentLinksFromLeadRecord(
  leadId,
  leadData = {},
  projectData = null,
) {
  return {
    leadId: cleanNullableString(leadId),
    customerId: cleanNullableString(
      leadData.customerId || projectData?.customerId,
    ),
    projectId: cleanNullableString(projectData?.id || leadData.wonProjectId),
  };
}

function buildRecordDocumentLinksFromProjectRecord(
  projectId,
  projectData = {},
  leadData = null,
) {
  return {
    projectId: cleanNullableString(projectId),
    leadId: cleanNullableString(
      projectData.leadId || leadData?.id || projectId,
    ),
    customerId: cleanNullableString(
      projectData.customerId || leadData?.customerId,
    ),
  };
}

function buildEstimateRecordDocumentTitle(leadData = {}, estimateData = {}) {
  return safeString(
    estimateData.subject ||
      leadData.estimateTitle ||
      `Estimate for ${safeString(leadData.projectAddress || leadData.clientName || leadData.customerName || "project")}`,
  );
}

async function upsertEstimateRecordDocument(
  leadId,
  estimateData = {},
  leadData = null,
) {
  const recordId = estimateRecordDocumentId(leadId);
  const recordRef = db.collection("recordDocuments").doc(recordId);
  const [leadSnap, projectSnap, existingSnap] = await Promise.all([
    leadData ? Promise.resolve(null) : db.collection("leads").doc(leadId).get(),
    db.collection("projects").doc(leadId).get(),
    recordRef.get(),
  ]);

  const resolvedLeadData =
    leadData || (leadSnap?.exists ? leadSnap.data() : null);
  if (!resolvedLeadData) {
    return;
  }

  const projectData = projectSnap.exists
    ? { id: projectSnap.id, ...projectSnap.data() }
    : null;
  const existingData = existingSnap.exists ? existingSnap.data() || {} : {};
  const links = buildRecordDocumentLinksFromLeadRecord(
    leadId,
    resolvedLeadData,
    projectData,
  );
  const note =
    splitMultilineText(
      estimateData.emailBody || resolvedLeadData.estimateTitle || "",
    )[0] || "";

  await recordRef.set(
    {
      id: recordId,
      documentKind: "estimate",
      category: "estimate",
      sourceType: "generated",
      title: buildEstimateRecordDocumentTitle(resolvedLeadData, estimateData),
      note,
      relatedDate:
        estimateData.updatedAt ||
        estimateData.createdAt ||
        resolvedLeadData.estimateUpdatedAt ||
        existingData.relatedDate ||
        FieldValue.serverTimestamp(),
      externalUrl: "",
      fileUrl: "",
      filePath: "",
      fileName: "",
      leadId: links.leadId,
      customerId: links.customerId,
      projectId: links.projectId,
      estimateId: cleanNullableString(leadId),
      createdByUid: safeString(
        estimateData.lastEditedByUid || existingData.createdByUid || "system",
      ),
      createdByName: safeString(
        estimateData.lastEditedByName ||
          existingData.createdByName ||
          "Golden Brick System",
      ),
      createdByRole:
        safeString(
          existingData.createdByRole ||
            (estimateData.lastEditedByUid ? "staff" : "system"),
        ) || "system",
      createdAt:
        existingData.createdAt ||
        estimateData.createdAt ||
        FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function deleteEstimateRecordDocument(leadId) {
  if (!safeString(leadId)) {
    return;
  }

  await db
    .collection("recordDocuments")
    .doc(estimateRecordDocumentId(leadId))
    .delete()
    .catch(() => {});
}

async function syncRecordDocumentLinksForLead(leadId, leadData = {}) {
  const normalisedLeadId = cleanNullableString(leadId);
  if (!normalisedLeadId) {
    return;
  }

  const projectSnap = await db
    .collection("projects")
    .doc(normalisedLeadId)
    .get();
  const projectData = projectSnap.exists
    ? { id: projectSnap.id, ...projectSnap.data() }
    : null;
  const links = buildRecordDocumentLinksFromLeadRecord(
    normalisedLeadId,
    leadData,
    projectData,
  );
  const docsSnap = await db
    .collection("recordDocuments")
    .where("leadId", "==", normalisedLeadId)
    .get();

  if (docsSnap.empty) {
    return;
  }

  const batch = db.batch();
  let hasChanges = false;

  docsSnap.docs.forEach((snapshot) => {
    const data = snapshot.data() || {};
    const updates = {};

    if (cleanNullableString(data.customerId) !== links.customerId) {
      updates.customerId = links.customerId;
    }

    if (cleanNullableString(data.projectId) !== links.projectId) {
      updates.projectId = links.projectId;
    }

    if (Object.keys(updates).length) {
      hasChanges = true;
      batch.set(
        snapshot.ref,
        {
          ...updates,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  });

  if (hasChanges) {
    await batch.commit();
  }
}

async function syncRecordDocumentLinksForProject(projectId, projectData = {}) {
  const normalisedProjectId = cleanNullableString(projectId);
  if (!normalisedProjectId) {
    return;
  }

  const leadId = cleanNullableString(projectData.leadId || normalisedProjectId);
  const leadSnap = leadId
    ? await db.collection("leads").doc(leadId).get()
    : null;
  const leadData = leadSnap?.exists ? leadSnap.data() : null;
  const links = buildRecordDocumentLinksFromProjectRecord(
    normalisedProjectId,
    projectData,
    leadData,
  );
  const docsSnap = await db
    .collection("recordDocuments")
    .where("projectId", "==", normalisedProjectId)
    .get();

  if (docsSnap.empty) {
    return;
  }

  const batch = db.batch();
  let hasChanges = false;

  docsSnap.docs.forEach((snapshot) => {
    const data = snapshot.data() || {};
    const updates = {};

    if (cleanNullableString(data.leadId) !== links.leadId) {
      updates.leadId = links.leadId;
    }

    if (cleanNullableString(data.customerId) !== links.customerId) {
      updates.customerId = links.customerId;
    }

    if (Object.keys(updates).length) {
      hasChanges = true;
      batch.set(
        snapshot.ref,
        {
          ...updates,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  });

  if (hasChanges) {
    await batch.commit();
  }
}

async function migrateLegacyProjectDocuments(projectId, projectData = {}) {
  const normalisedProjectId = cleanNullableString(projectId);
  if (!normalisedProjectId) {
    return 0;
  }

  const legacySnap = await db
    .collection("projects")
    .doc(normalisedProjectId)
    .collection("documents")
    .get();

  if (legacySnap.empty) {
    return 0;
  }

  const leadId = cleanNullableString(projectData.leadId || normalisedProjectId);
  const customerId = cleanNullableString(projectData.customerId);
  let migratedCount = 0;

  for (const snapshot of legacySnap.docs) {
    const data = snapshot.data() || {};
    const recordRef = db.collection("recordDocuments").doc(snapshot.id);
    const recordSnap = await recordRef.get();
    const existingData = recordSnap.exists ? recordSnap.data() || {} : {};

    await recordRef.set(
      {
        id: snapshot.id,
        documentKind:
          safeString(data.documentKind || "file") === "estimate"
            ? "estimate"
            : "file",
        category: safeString(data.category || "other") || "other",
        sourceType: safeString(data.sourceType || "manual") || "manual",
        title: safeString(data.title || existingData.title || "Document"),
        note: safeString(data.note),
        relatedDate:
          data.relatedDate ||
          data.createdAt ||
          existingData.relatedDate ||
          null,
        externalUrl: safeString(data.externalUrl),
        fileUrl: safeString(data.fileUrl),
        filePath: safeString(data.filePath),
        fileName: safeString(data.fileName),
        leadId,
        customerId,
        projectId: normalisedProjectId,
        estimateId: cleanNullableString(
          data.estimateId || existingData.estimateId,
        ),
        agreementId: cleanNullableString(
          data.agreementId || existingData.agreementId,
        ),
        legacyProjectId: normalisedProjectId,
        legacyDocumentId: snapshot.id,
        createdByUid: safeString(
          data.createdByUid || existingData.createdByUid,
        ),
        createdByName: safeString(
          data.createdByName || existingData.createdByName,
        ),
        createdByRole: safeString(
          data.createdByRole || existingData.createdByRole,
        ),
        createdAt:
          existingData.createdAt ||
          data.createdAt ||
          FieldValue.serverTimestamp(),
        updatedAt:
          existingData.updatedAt ||
          data.updatedAt ||
          data.createdAt ||
          FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    migratedCount += 1;
  }

  return migratedCount;
}

async function ensureProjectRecordDocumentMigration(
  projectId,
  projectData = {},
) {
  if (
    !safeString(projectId) ||
    toNumber(projectData.recordDocumentsMigrationVersion) >= 1
  ) {
    return 0;
  }

  const migratedCount = await migrateLegacyProjectDocuments(
    projectId,
    projectData,
  );

  await db.collection("projects").doc(projectId).set(
    {
      recordDocumentsMigrationVersion: 1,
      recordDocumentsMigratedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return migratedCount;
}

async function deleteStoragePathIfPresent(filePath) {
  const resolvedPath = safeString(filePath);
  if (!resolvedPath) {
    return;
  }

  try {
    await admin.storage().bucket().file(resolvedPath).delete();
  } catch (error) {
    if (error?.code !== 404 && error?.statusCode !== 404) {
      logger.warn("Shared document storage cleanup failed.", {
        filePath: resolvedPath,
        error: error?.message || String(error),
      });
    }
  }
}

async function clearProjectExpenseReceiptReferences(projectId, documentId) {
  if (!safeString(projectId) || !safeString(documentId)) {
    return;
  }

  const expenseSnap = await db
    .collection("projects")
    .doc(projectId)
    .collection("expenses")
    .where("receiptDocumentId", "==", documentId)
    .get();

  if (expenseSnap.empty) {
    return;
  }

  const batch = db.batch();
  expenseSnap.docs.forEach((snapshot) => {
    batch.set(
      snapshot.ref,
      {
        receiptDocumentId: null,
        receiptTitle: "",
        receiptUrl: "",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
  await batch.commit();
}

async function clearVendorBillInvoiceReferences(documentId) {
  if (!safeString(documentId)) {
    return;
  }

  const billsSnap = await db
    .collection("vendorBills")
    .where("invoiceDocumentId", "==", documentId)
    .get();

  if (billsSnap.empty) {
    return;
  }

  const batch = db.batch();
  billsSnap.docs.forEach((snapshot) => {
    batch.set(
      snapshot.ref,
      {
        invoiceDocumentId: null,
        invoiceTitle: "",
        invoiceFileUrl: "",
        invoiceExternalUrl: "",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
  await batch.commit();

  await Promise.all(
    billsSnap.docs.map(async (snapshot) => {
      const billData = snapshot.data() || {};
      const projectId = safeString(billData.projectId);
      if (!projectId) {
        return;
      }

      await db
        .collection("projects")
        .doc(projectId)
        .collection("expenses")
        .doc(snapshot.id)
        .set(
          {
            receiptDocumentId: null,
            receiptTitle: "",
            receiptUrl: "",
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    }),
  );
}

async function cleanupDeletedRecordDocument(documentId, documentData = {}) {
  await Promise.all([
    deleteStoragePathIfPresent(documentData.filePath),
    clearProjectExpenseReceiptReferences(
      safeString(documentData.projectId),
      documentId,
    ),
  ]);
}

async function cleanupDeletedVendorDocument(documentId, documentData = {}) {
  await Promise.all([
    deleteStoragePathIfPresent(documentData.filePath),
    clearVendorBillInvoiceReferences(documentId),
  ]);
}

function serialiseDateValue(value) {
  const millis = normaliseMillis(value);
  return millis ? new Date(millis).toISOString() : null;
}

function createOpaqueId(byteCount = 24) {
  return crypto.randomBytes(byteCount).toString("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson(value[key])}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value === undefined ? null : value);
}

function sha256Hex(value) {
  return crypto
    .createHash("sha256")
    .update(typeof value === "string" ? value : canonicalJson(value))
    .digest("hex");
}

function estimatePublishRequestRef(staffUid, leadId, idempotencyKey) {
  const requestHash = sha256Hex({
    staffUid: safeString(staffUid),
    leadId: safeString(leadId),
    idempotencyKey: safeString(idempotencyKey),
  });
  return db.collection("estimatePublishRequests").doc(requestHash);
}

function requestProtocol(request) {
  return (
    safeString(request.get("x-forwarded-proto") || request.protocol || "https")
      .split(",")[0]
      .trim() || "https"
  );
}

function requestHost(request) {
  return safeString(request.get("x-forwarded-host") || request.get("host"));
}

function requestBaseUrl(request) {
  const origin = safeString(request.get("origin"));
  if (origin) {
    return origin.replace(/\/+$/, "");
  }

  const host = requestHost(request);
  if (!host) {
    return "";
  }

  return `${requestProtocol(request)}://${host}`;
}

function buildEstimateShareUrl(request, shareId) {
  const baseUrl = requestBaseUrl(request);
  return `${baseUrl}/estimate/${shareId}`;
}

function buildPublicAgreementDownloadHref(request, token) {
  const baseUrl = requestBaseUrl(request);
  return `${baseUrl}/api/client/public-agreement-document?token=${encodeURIComponent(token)}`;
}

function storageDownloadUrl(bucketName, filePath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
}

function requestAuditMetadata(request) {
  const forwardedFor = safeString(request.get("x-forwarded-for"));
  return {
    ipAddress: forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : safeString(request.ip),
    userAgent: safeString(request.get("user-agent")),
  };
}

function parseSignatureDataUrl(dataUrl) {
  const matches = safeString(dataUrl).match(
    /^data:(image\/png);base64,([A-Za-z0-9+/=]+)$/,
  );

  if (!matches) {
    const error = new Error("A drawn signature is required.");
    error.status = 400;
    throw error;
  }

  return {
    contentType: matches[1],
    buffer: Buffer.from(matches[2], "base64"),
  };
}

function normaliseContractDetails(estimateData = {}, template = {}) {
  const details = estimateData.contractDetails || {};
  return {
    contractorName: COMPANY_INFO.name,
    contractorBusinessAddress:
      safeString(details.contractorBusinessAddress) ||
      safeString(template.contractorBusinessAddress) ||
      CONTRACTOR_BUSINESS_ADDRESS,
    contractorPhone: COMPANY_INFO.phone,
    contractorEmail: COMPANY_INFO.email,
    paRegistrationNumber: COMPANY_INFO.paRegistrationNumber,
    philadelphiaLicenseNumber: COMPANY_INFO.philadelphiaLicenseNumber,
    approximateStartDate: safeString(
      details.approximateStartDate || details.startDate,
    ),
    approximateCompletionDate: safeString(
      details.approximateCompletionDate || details.completionDate,
    ),
    paymentSchedule:
      safeString(details.paymentSchedule) || DEFAULT_CONTRACT_PAYMENT_SCHEDULE,
    specialOrderMaterials:
      safeString(details.specialOrderMaterials) ||
      DEFAULT_CONTRACT_SPECIAL_ORDER_MATERIALS,
    knownSubcontractors:
      safeString(details.knownSubcontractors) ||
      DEFAULT_CONTRACT_SUBCONTRACTORS,
    insuranceDisclosure: COMPANY_INSURANCE_DISCLOSURE,
    consumerProtectionPhone: PA_CONSUMER_PROTECTION_PHONE,
  };
}

function contractDateDisplay(value, fallback = "Schedule to be confirmed") {
  return safeString(value) ? formatDateOnly(`${safeString(value)}T12:00:00`) : fallback;
}

function contractAddressDisplay(contractDetails = {}) {
  return (
    safeString(contractDetails.contractorBusinessAddress) ||
    CONTRACTOR_BUSINESS_ADDRESS
  );
}

function agreementReadinessBlockers(contractDetails = {}) {
  const blockers = [];
  const startDate = safeString(contractDetails.approximateStartDate);
  const completionDate = safeString(contractDetails.approximateCompletionDate);
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const isValidDate = (value) => {
    if (!datePattern.test(value)) {
      return false;
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  };

  if (!startDate) {
    blockers.push("Approximate project start date is required before signature.");
  } else if (!isValidDate(startDate)) {
    blockers.push("Approximate project start date must be a valid date.");
  }
  if (!completionDate) {
    blockers.push("Approximate project completion date is required before signature.");
  } else if (!isValidDate(completionDate)) {
    blockers.push("Approximate project completion date must be a valid date.");
  }
  if (
    isValidDate(startDate) &&
    isValidDate(completionDate) &&
    completionDate < startDate
  ) {
    blockers.push(
      "Approximate project completion date cannot be before the start date.",
    );
  }
  return blockers;
}

function addBusinessDays(dateValue, businessDays) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const nextDate = new Date(date);
  let remaining = businessDays;
  while (remaining > 0) {
    nextDate.setDate(nextDate.getDate() + 1);
    const day = nextDate.getDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }
  return nextDate;
}

function buildCancellationNotice(contractDetails = {}, signedAt = null) {
  const transactionDate = signedAt ? formatDateOnly(signedAt) : "Completed at signature";
  const cancelByDate = signedAt
    ? formatDateOnly(addBusinessDays(signedAt, 3))
    : "midnight of the third business day after signing";
  const sellerName = COMPANY_INFO.name;
  const sellerAddress = contractAddressDisplay(contractDetails);

  return {
    title: "Notice of Cancellation",
    transactionDate,
    cancelByDate,
    sellerName,
    sellerAddress,
    actualNotice:
      "Golden Brick will honor timely cancellation notice provided by any medium that gives Golden Brick actual notice within the three-business-day cancellation period.",
    statements: [
      `Date of transaction: ${transactionDate}`,
      "You may cancel this transaction, without any penalty or obligation, within three business days from the above date.",
      "If you cancel, any property traded in, any payments made by you under the contract or sale, and any negotiable instrument executed by you will be returned within ten business days following receipt by Golden Brick Construction of your cancellation notice, and any security interest arising out of the transaction will be cancelled.",
      "If you cancel, you must make available to Golden Brick Construction at your residence in substantially as good condition as when received, any goods delivered to you under this contract or sale; or you may, if you wish, comply with Golden Brick Construction's instructions regarding return shipment of the goods at Golden Brick Construction's expense and risk.",
      "If you make the goods available to Golden Brick Construction and Golden Brick Construction does not pick them up within twenty days of the date of your notice of cancellation, you may retain or dispose of the goods without any further obligation.",
      "If you fail to make the goods available to Golden Brick Construction, or if you agree to return the goods to Golden Brick Construction and fail to do so, then you remain liable for performance of all obligations under the contract.",
      `To cancel this transaction, provide notice to ${sellerName}, at ${sellerAddress}, not later than ${cancelByDate}.`,
      "I hereby cancel this transaction.",
      "Date: ______________________________",
      "Owner signature: ______________________________",
    ],
  };
}

function normaliseEstimateSnapshot(estimateData = {}, template = {}) {
  const lineItems = Array.isArray(estimateData.lineItems)
    ? estimateData.lineItems
        .map((item) => ({
          label: safeString(item.label || item.title),
          description: safeString(item.description || item.note),
          amount: toNumber(item.amount),
        }))
        .filter((item) => item.label || item.description || item.amount)
    : [];

  return {
    subject: safeString(estimateData.subject),
    emailBody: safeString(estimateData.emailBody),
    assumptions: Array.isArray(estimateData.assumptions)
      ? estimateData.assumptions.map((item) => safeString(item)).filter(Boolean)
      : [],
    lineItems,
    subtotal: toNumber(
      estimateData.subtotal ||
        lineItems.reduce((sum, item) => sum + toNumber(item.amount), 0),
    ),
    proposalTerms: resolveEstimateTemplateTerms(template),
    contractDetails: normaliseContractDetails(estimateData, template),
  };
}

function normaliseSubmittedEstimateDraft(rawDraft, leadId) {
  if (!rawDraft || typeof rawDraft !== "object" || Array.isArray(rawDraft)) {
    throw httpError(
      "The current estimate draft is required before publishing.",
      400,
    );
  }

  const expectedLeadId = safeString(leadId);
  if (!safeString(rawDraft.id) || !safeString(rawDraft.leadId)) {
    throw httpError(
      "The estimate draft is missing its lead connection. Reload the lead and try again.",
      409,
    );
  }
  const suppliedIds = uniqueValues([rawDraft.id, rawDraft.leadId]);
  if (suppliedIds.some((value) => value !== expectedLeadId)) {
    throw httpError(
      "This estimate draft belongs to a different lead and cannot be published here.",
      409,
    );
  }

  const lineItems = Array.isArray(rawDraft.lineItems)
    ? rawDraft.lineItems
        .map((item) => ({
          label: safeString(item?.label || item?.title),
          description: safeString(item?.description || item?.note),
          amount: Number(toNumber(item?.amount).toFixed(2)),
        }))
        .filter((item) => item.label || item.description || item.amount)
    : [];
  const assumptions = Array.isArray(rawDraft.assumptions)
    ? rawDraft.assumptions.map((item) => safeString(item)).filter(Boolean)
    : [];
  const rawContractDetails = rawDraft.contractDetails || {};
  const subtotal = Number(
    lineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2),
  );

  if (!safeString(rawDraft.subject)) {
    throw httpError("Add an estimate title before publishing.", 400);
  }
  if (!lineItems.length) {
    throw httpError(
      "Add at least one scope and pricing line before publishing.",
      400,
    );
  }
  if (
    !lineItems.some(
      (item) =>
        Boolean(item.label || item.description) &&
        item.amount > 0,
    )
  ) {
    throw httpError(
      "Add at least one priced scope line before publishing.",
      400,
    );
  }
  if (subtotal <= 0) {
    throw httpError(
      "The estimate total must be greater than $0 before publishing.",
      400,
    );
  }

  return {
    id: expectedLeadId,
    leadId: expectedLeadId,
    status: "draft",
    subject: safeString(rawDraft.subject),
    emailBody: safeString(rawDraft.emailBody),
    contractDetails: {
      approximateStartDate: safeString(
        rawContractDetails.approximateStartDate ||
          rawContractDetails.startDate,
      ),
      approximateCompletionDate: safeString(
        rawContractDetails.approximateCompletionDate ||
          rawContractDetails.completionDate,
      ),
      paymentSchedule: safeString(rawContractDetails.paymentSchedule),
      specialOrderMaterials: safeString(
        rawContractDetails.specialOrderMaterials,
      ),
      knownSubcontractors: safeString(
        rawContractDetails.knownSubcontractors,
      ),
    },
    assumptions,
    lineItems,
    subtotal,
  };
}

function estimateSnapshotAvailable(shareData = {}) {
  const type = normaliseShareType(shareData.type);
  if (type === "change_order") {
    return Boolean(
      shareData.changeOrderSnapshot &&
        safeString(
          shareData.changeOrderSnapshot.title ||
            shareData.changeOrderSnapshot.subject,
        ) &&
        shareData.agreementSnapshot &&
        safeString(shareData.agreementSnapshot.terms) &&
        safeString(shareData.projectId) &&
        safeString(shareData.customerId) &&
        safeString(shareData.projectSnapshot?.projectId) &&
        safeString(
          shareData.projectSnapshot?.customerId ||
            shareData.leadSnapshot?.customerId,
        ),
    );
  }

  return Boolean(
    shareData.estimateSnapshot &&
      safeString(shareData.estimateSnapshot.subject) &&
      Array.isArray(shareData.estimateSnapshot.lineItems) &&
      shareData.agreementSnapshot &&
      safeString(shareData.agreementSnapshot.terms) &&
      safeString(shareData.leadId) &&
      safeString(shareData.customerId) &&
      safeString(shareData.estimateSnapshot.leadId) &&
      safeString(shareData.estimateSnapshot.customerId) &&
      safeString(shareData.leadSnapshot?.leadId) &&
      safeString(shareData.leadSnapshot?.customerId),
  );
}

function validateImmutableShareSnapshots(shareData = {}) {
  if (!estimateSnapshotAvailable(shareData)) {
    const error = new Error(
      normaliseShareType(shareData.type) === "change_order"
        ? "This legacy change order is missing its frozen published version. Golden Brick must publish it again."
        : "This legacy estimate is missing its frozen published version. Golden Brick must publish it again.",
    );
    error.status = 409;
    error.clientStatus = "republish_required";
    throw error;
  }

  if (normaliseShareType(shareData.type) === "estimate") {
    const leadSnapshot = shareData.leadSnapshot || {};
    const shareLeadId = safeString(shareData.leadId);
    const shareCustomerId = safeString(shareData.customerId);
    const leadSnapshotLeadId = safeString(leadSnapshot.leadId);
    const estimateSnapshotLeadId = safeString(
      shareData.estimateSnapshot?.leadId,
    );
    const leadSnapshotCustomerId = safeString(
      leadSnapshot.customerId,
    );
    const estimateSnapshotCustomerId = safeString(
      shareData.estimateSnapshot?.customerId,
    );

    if (
      !leadSnapshotLeadId ||
      leadSnapshotLeadId !== shareLeadId ||
      !estimateSnapshotLeadId ||
      estimateSnapshotLeadId !== shareLeadId
    ) {
      const error = new Error(
        "This published estimate has an invalid lead connection and must be published again.",
      );
      error.status = 409;
      error.clientStatus = "republish_required";
      throw error;
    }
    if (
      !leadSnapshotCustomerId ||
      leadSnapshotCustomerId !== shareCustomerId ||
      !estimateSnapshotCustomerId ||
      estimateSnapshotCustomerId !== shareCustomerId
    ) {
      const error = new Error(
        "This published estimate has an invalid customer connection and must be published again.",
      );
      error.status = 409;
      error.clientStatus = "republish_required";
      throw error;
    }

    const schemaVersion = toNumber(shareData.schemaVersion);
    const storedContentHash = safeString(shareData.contentHash);
    if (
      schemaVersion >= ESTIMATE_VERSION_SCHEMA_VERSION &&
      !storedContentHash
    ) {
      const error = new Error(
        "This published estimate is missing its integrity record and must be published again.",
      );
      error.status = 409;
      error.clientStatus = "republish_required";
      throw error;
    }
    if (storedContentHash) {
      const signingMode =
        safeString(shareData.signingMode || shareData.publishMode) ||
        (agreementReadinessBlockers(
          shareData.estimateSnapshot?.contractDetails || {},
        ).length
          ? "review"
          : "signature");
      const expectedContentHash = estimateVersionContentHash({
        leadId: shareData.leadId,
        customerId: shareData.customerId,
        leadSnapshot,
        estimateSnapshot: shareData.estimateSnapshot,
        agreementSnapshot: shareData.agreementSnapshot,
        signingMode,
      });
      if (storedContentHash !== expectedContentHash) {
        const error = new Error(
          "This published estimate failed its integrity check and must be published again.",
        );
        error.status = 409;
        error.clientStatus = "republish_required";
        throw error;
      }
    }
  } else {
    if (
      safeString(shareData.projectSnapshot?.projectId) !==
      safeString(shareData.projectId)
    ) {
      const error = new Error(
        "This published change order has an invalid project connection and must be published again.",
      );
      error.status = 409;
      error.clientStatus = "republish_required";
      throw error;
    }
    const frozenCustomerId = safeString(
      shareData.projectSnapshot?.customerId ||
        shareData.leadSnapshot?.customerId,
    );
    if (
      !frozenCustomerId ||
      frozenCustomerId !== safeString(shareData.customerId)
    ) {
      const error = new Error(
        "This published change order has an invalid customer connection and must be published again.",
      );
      error.status = 409;
      error.clientStatus = "republish_required";
      throw error;
    }

    const schemaVersion = toNumber(shareData.schemaVersion);
    const storedContentHash = safeString(shareData.contentHash);
    if (
      schemaVersion >= ESTIMATE_VERSION_SCHEMA_VERSION &&
      !storedContentHash
    ) {
      const error = new Error(
        "This published change order is missing its integrity record and must be published again.",
      );
      error.status = 409;
      error.clientStatus = "republish_required";
      throw error;
    }
    if (storedContentHash) {
      const expectedContentHash = sha256Hex({
        schemaVersion: ESTIMATE_VERSION_SCHEMA_VERSION,
        type: "change_order",
        projectId: safeString(shareData.projectId),
        customerId: safeString(shareData.customerId),
        changeOrderSnapshot: shareData.changeOrderSnapshot,
        agreementSnapshot: shareData.agreementSnapshot,
      });
      if (storedContentHash !== expectedContentHash) {
        const error = new Error(
          "This published change order failed its integrity check and must be published again.",
        );
        error.status = 409;
        error.clientStatus = "republish_required";
        throw error;
      }
    }
  }
}

function estimateVersionContentHash({
  leadId,
  customerId,
  leadSnapshot,
  estimateSnapshot,
  agreementSnapshot,
  signingMode,
}) {
  return sha256Hex({
    schemaVersion: ESTIMATE_VERSION_SCHEMA_VERSION,
    leadId: safeString(leadId),
    customerId: safeString(customerId),
    leadSnapshot,
    estimateSnapshot,
    agreementSnapshot,
    signingMode: safeString(signingMode),
  });
}

function normaliseAgreementSnapshot(template = {}) {
  return {
    title: resolveAgreementTemplateTitle(template),
    intro: resolveAgreementTemplateIntro(template),
    terms: resolveAgreementTemplateTerms(template),
  };
}

function minimalLeadSnapshot(leadData = {}) {
  return {
    leadId: safeString(leadData.leadId || leadData.id),
    clientName: safeString(leadData.clientName || leadData.customerName),
    customerName: safeString(leadData.customerName || leadData.clientName),
    customerId: safeString(leadData.customerId),
    projectAddress: safeString(leadData.projectAddress),
    projectType: safeString(leadData.projectType),
    clientEmail: normaliseEmail(leadData.clientEmail),
    clientPhone: safeString(leadData.clientPhone),
  };
}

function minimalProjectSnapshot(projectData = {}, fallbackLead = {}) {
  return {
    projectId: safeString(
      projectData.projectId ||
        projectData.id ||
        fallbackLead.projectId,
    ),
    leadId: safeString(
      projectData.leadId ||
        fallbackLead.leadId ||
        fallbackLead.id,
    ),
    clientName: safeString(
      projectData.clientName ||
        projectData.customerName ||
        fallbackLead.clientName ||
        fallbackLead.customerName,
    ),
    customerName: safeString(
      projectData.customerName ||
        fallbackLead.customerName ||
        projectData.clientName ||
        fallbackLead.clientName,
    ),
    customerId: safeString(projectData.customerId || fallbackLead.customerId),
    projectAddress: safeString(
      projectData.projectAddress || fallbackLead.projectAddress,
    ),
    projectType: safeString(projectData.projectType || fallbackLead.projectType),
    clientEmail: normaliseEmail(
      projectData.clientEmail || fallbackLead.clientEmail,
    ),
    clientPhone: safeString(projectData.clientPhone || fallbackLead.clientPhone),
  };
}

function normaliseChangeOrderSnapshot(changeOrderData = {}, projectData = {}) {
  const title = safeString(changeOrderData.title || "Change order");
  const note = safeString(changeOrderData.note);
  const amount = toNumber(changeOrderData.amount);
  const relatedDate = changeOrderData.relatedDate || changeOrderData.createdAt;
  const projectAddress = safeString(projectData.projectAddress);
  const projectType = safeString(projectData.projectType || "Project");

  return {
    id: safeString(changeOrderData.id),
    title,
    note,
    amount,
    status: normaliseChangeOrderStatus(changeOrderData.status),
    relatedDate,
    projectAddress,
    projectType,
    subject: title,
    emailBody: note
      ? `Project revision for ${projectAddress || "the active job"}.\n\n${note}`
      : `Project revision prepared for ${projectAddress || "the active job"}. Please review the updated scope and pricing below before approving this change order.`,
    assumptions: [],
    lineItems: [
      {
        label: title,
        description:
          note ||
          "Written revision to the approved Golden Brick scope or pricing.",
        amount,
      },
    ],
    subtotal: amount,
    proposalTerms: DEFAULT_CHANGE_ORDER_TERMS,
  };
}

function normaliseChangeOrderAgreementSnapshot(projectData = {}, changeOrderData = {}) {
  return {
    title: "Change order approval",
    intro: safeString(
      changeOrderData.note
        ? `This change order updates the approved project at ${safeString(projectData.projectAddress) || "the active property"}. Review the revision details and sign if you want Golden Brick to move forward on the updated scope.`
        : `This change order updates the approved project at ${safeString(projectData.projectAddress) || "the active property"}. Review the revised amount and sign to approve the written change.`,
    ),
    terms: DEFAULT_CHANGE_ORDER_TERMS,
  };
}

function estimateSharePriority(shareData = {}) {
  if (shareData.status === "active") return 0;
  if (shareData.status === "signed") return 1;
  if (shareData.status === "replaced") return 2;
  if (shareData.status === "revoked") return 3;
  return 4;
}

function pickCurrentEstimateShare(shares = []) {
  return (
    [...shares].sort((left, right) => {
      const priorityDiff =
        estimateSharePriority(left) - estimateSharePriority(right);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return (
        normaliseMillis(right.updatedAt || right.createdAt) -
        normaliseMillis(left.updatedAt || left.createdAt)
      );
    })[0] || null
  );
}

function serialiseEstimateShare(shareData = {}, request) {
  if (!shareData || !shareData.id) {
    return null;
  }

  const type = normaliseShareType(shareData.type);
  const estimateSnapshot = shareData.estimateSnapshot || {};
  const changeOrderSnapshot = shareData.changeOrderSnapshot || {};
  const leadSnapshot = shareData.leadSnapshot || {};
  const projectSnapshot = shareData.projectSnapshot || {};
  const recordSnapshot =
    type === "change_order" ? changeOrderSnapshot : estimateSnapshot;
  const title =
    type === "change_order"
      ? safeString(
          changeOrderSnapshot.title || changeOrderSnapshot.subject || "Change order",
        )
      : safeString(estimateSnapshot.subject || "Estimate");
  const summary =
    type === "change_order"
      ? safeString(
          changeOrderSnapshot.note ||
            changeOrderSnapshot.emailBody ||
            "Client approval record for a project revision.",
        )
      : safeString(
          estimateSnapshot.emailBody ||
            estimateSnapshot.subject ||
            "Golden Brick estimate ready for review.",
        );
  const subtotal = toNumber(
    type === "change_order"
      ? changeOrderSnapshot.amount || changeOrderSnapshot.subtotal
      : estimateSnapshot.subtotal,
  );
  const projectAddress = safeString(
    recordSnapshot.projectAddress ||
      projectSnapshot.projectAddress ||
      leadSnapshot.projectAddress,
  );
  const projectType = safeString(
    recordSnapshot.projectType ||
      projectSnapshot.projectType ||
      leadSnapshot.projectType,
  );
  const visibleInPortal =
    safeString(shareData.status) === "signed"
      ? true
      : shareData.portalVisible !== false &&
        ["active", "signed"].includes(safeString(shareData.status));
  const snapshotAvailable = estimateSnapshotAvailable(shareData);
  const signingMode =
    safeString(shareData.signingMode || shareData.publishMode) ||
    (Array.isArray(shareData.readinessBlockers) &&
    shareData.readinessBlockers.length
      ? "review"
      : "signature");
  const blockers = Array.isArray(shareData.readinessBlockers)
    ? shareData.readinessBlockers.map((item) => safeString(item)).filter(Boolean)
    : [];
  const readyToSign =
    snapshotAvailable &&
    shareData.readyToSign !== false &&
    blockers.length === 0;
  const activeAndReady =
    safeString(shareData.status) === "active" && readyToSign;

  return {
    id: shareData.id,
    versionId: safeString(shareData.versionId || shareData.id),
    type,
    status: safeString(shareData.status || "active"),
    leadId: safeString(shareData.leadId),
    customerId: safeString(shareData.customerId),
    projectId: safeString(shareData.projectId),
    changeOrderId: safeString(shareData.changeOrderId),
    agreementId: safeString(shareData.agreementId),
    createdByUid: safeString(shareData.createdByUid),
    createdByName: safeString(shareData.createdByName),
    createdAt: serialiseDateValue(shareData.createdAt),
    publishedAt: serialiseDateValue(shareData.publishedAt || shareData.createdAt),
    publishedVersion: toNumber(shareData.publishedVersion),
    versionNumber: toNumber(
      shareData.versionNumber || shareData.publishedVersion,
    ),
    schemaVersion: toNumber(shareData.schemaVersion),
    contentHash: safeString(shareData.contentHash),
    signingMode,
    publishMode: signingMode,
    readyToSign,
    blockers,
    canSign: activeAndReady,
    snapshotAvailable,
    updatedAt: serialiseDateValue(shareData.updatedAt),
    revokedAt: serialiseDateValue(shareData.revokedAt),
    replacedAt: serialiseDateValue(shareData.replacedAt),
    lastViewedAt: serialiseDateValue(shareData.lastViewedAt),
    viewedAt: serialiseDateValue(shareData.lastViewedAt),
    signedAt: serialiseDateValue(shareData.signedAt),
    title,
    summary,
    subtotal,
    projectAddress,
    projectType,
    visibleInPortal,
    signable: activeAndReady,
    portalStatus:
      safeString(shareData.status) === "signed"
        ? "approved"
        : safeString(shareData.status) === "active"
          ? "needs_approval"
          : safeString(shareData.status) || "hidden",
    signerName: safeString(shareData.signerName),
    signerEmail: normaliseEmail(shareData.signerEmail),
    signerRole: safeString(shareData.signerRole),
    projectConversionStatus: safeString(
      shareData.projectConversionStatus,
    ),
    shareUrl: buildEstimateShareUrl(request, shareData.id),
    agreementDownloadHref:
      safeString(shareData.status) === "signed"
        ? buildPublicAgreementDownloadHref(request, shareData.id)
        : "",
  };
}

async function fetchLeadShares(leadId, type = "estimate") {
  const sharesSnap = await db
    .collection("estimateShares")
    .where("leadId", "==", leadId)
    .get();

  return sharesSnap.docs
    .map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
    }))
    .filter((share) => normaliseShareType(share.type) === normaliseShareType(type));
}

async function fetchChangeOrderShares(projectId, changeOrderId) {
  const sharesSnap = await db
    .collection("estimateShares")
    .where("projectId", "==", projectId)
    .where("changeOrderId", "==", changeOrderId)
    .get();

  return sharesSnap.docs
    .map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
    }))
    .filter((share) => normaliseShareType(share.type) === "change_order");
}

async function saveStorageFile(
  bucket,
  filePath,
  buffer,
  { contentType, downloadToken = null, metadata = {} } = {},
) {
  const file = bucket.file(filePath);
  const mergedMetadata = {
    contentType,
    cacheControl: "private, max-age=0",
    metadata: {
      ...metadata,
    },
  };

  if (downloadToken) {
    mergedMetadata.metadata.firebaseStorageDownloadTokens = downloadToken;
  }

  await file.save(buffer, {
    resumable: false,
    validation: false,
    metadata: mergedMetadata,
  });

  return downloadToken
    ? storageDownloadUrl(bucket.name, filePath, downloadToken)
    : "";
}

function ensurePdfSpace(doc, minimumSpace = 140) {
  const bottomLimit = doc.page.height - doc.page.margins.bottom;
  if (doc.y + minimumSpace <= bottomLimit) {
    return false;
  }

  doc.addPage();
  return true;
}

function renderPdfTopBar(doc) {
  doc.save();
  doc.rect(0, 0, doc.page.width, 8).fill("#c5a059");
  doc.restore();
}

function renderPdfBrickMark(doc, x, y, scale = 0.43) {
  const bricks = [
    [44, 1, 32, 14],
    [24, 22, 32, 14],
    [64, 22, 32, 14],
    [4, 43, 32, 14],
    [44, 43, 32, 14],
    [84, 43, 32, 14],
  ];

  doc.save().fillColor("#c5a059");
  bricks.forEach(([brickX, brickY, width, height]) => {
    doc.roundedRect(
      x + brickX * scale,
      y + brickY * scale,
      width * scale,
      height * scale,
      1,
    ).fill();
  });
  doc.restore();
}

function renderPdfLogo(doc, x, y) {
  renderPdfBrickMark(doc, x, y + 1);

  const wordmarkX = x + 60;
  doc
    .font("Times-Bold")
    .fontSize(18.5)
    .fillColor("#c5a059")
    .text("GOLDEN BRICK", wordmarkX, y + 7, {
      width: 170,
      lineBreak: false,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(7.6)
    .fillColor("#181510")
    .text("CONSTRUCTION", wordmarkX + 38, y + 25, {
      width: 88,
      lineBreak: false,
    });
  doc
    .moveTo(wordmarkX, y + 28)
    .lineTo(wordmarkX + 28, y + 28)
    .moveTo(wordmarkX + 126, y + 28)
    .lineTo(wordmarkX + 154, y + 28)
    .lineWidth(1.1)
    .strokeColor("#c5a059")
    .stroke();
}

function renderPdfFooter(doc, label = "Estimate approval") {
  const range = doc.bufferedPageRange();

  for (
    let pageIndex = range.start;
    pageIndex < range.start + range.count;
    pageIndex += 1
  ) {
    doc.switchToPage(pageIndex);
    const pageNumber = pageIndex - range.start + 1;
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const y = doc.page.height - doc.page.margins.bottom - 12;

    doc
      .save()
      .moveTo(left, y - 14)
      .lineTo(right, y - 14)
      .lineWidth(0.7)
      .strokeColor("#e5ded2")
      .stroke()
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor("#231d17")
      .text("Golden Brick Construction", left, y, {
        lineBreak: false,
      })
      .font("Helvetica")
      .fillColor("#756d62")
      .text(`${label} | Page ${pageNumber} of ${range.count}`, left, y, {
        width: right - left,
        align: "right",
        lineBreak: false,
      })
      .restore();
  }
}

function approvalDocumentDisplayTitle(value, fallback = "Project record") {
  return (
    safeString(value)
      .replace(/^golden brick estimate for\s+/i, "")
      .replace(/^estimate for\s+/i, "")
      .trim() || fallback
  );
}

function renderAgreementHero(
  doc,
  {
    title,
    projectTitle,
    introCopy,
    totalLabel,
    totalAmount,
  },
) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const contentWidth = right - left;
  const totalWidth = 174;
  const totalHeight = 66;
  const titleWidth = contentWidth - totalWidth - 28;
  const topY = doc.y;

  renderPdfLogo(doc, left, topY);

  doc
    .font("Helvetica-Bold")
    .fontSize(23)
    .fillColor("#17120d")
    .text(title, left, topY + 78, {
      width: titleWidth,
      lineGap: 1,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(12.5)
    .fillColor("#231d17")
    .text(projectTitle, left, doc.y + 6, {
      width: titleWidth,
      lineGap: 2,
    });

  doc
    .save()
    .roundedRect(right - totalWidth, topY + 6, totalWidth, totalHeight, 7)
    .fill("#181510")
    .restore();
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor("#c5a059")
    .text(totalLabel.toUpperCase(), right - totalWidth + 14, topY + 24, {
      width: totalWidth - 28,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(19)
    .fillColor("#fffaf0")
    .text(
      formatCurrency(totalAmount || 0),
      right - totalWidth + 14,
      topY + 46,
      {
        width: totalWidth - 28,
        align: "right",
        lineBreak: false,
      },
    );

  doc.y = Math.max(doc.y + 16, topY + 136);
  renderPdfParagraph(doc, introCopy, {
    fontSize: 10,
    color: "#554c43",
    gapAfter: 14,
  });
}

function renderPdfSummaryCards(doc, items, { columns = 3 } = {}) {
  const left = doc.page.margins.left;
  const contentWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const gap = 8;
  const cardHeight = 50;
  const cardWidth = (contentWidth - gap * (columns - 1)) / columns;

  for (let index = 0; index < items.length; index += columns) {
    ensurePdfSpace(doc, cardHeight + gap + 12);
    const y = doc.y;

    items.slice(index, index + columns).forEach((item, columnIndex) => {
      const x = left + columnIndex * (cardWidth + gap);

      doc
        .save()
        .roundedRect(x, y, cardWidth, cardHeight, 6)
        .fillAndStroke("#faf8f4", "#e5ded2")
        .restore();
      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor("#756d62")
        .text(String(item.label || "").toUpperCase(), x + 12, y + 13, {
          width: cardWidth - 24,
          lineBreak: false,
        });
      doc
        .font("Helvetica-Bold")
        .fontSize(9.8)
        .fillColor("#17120d")
        .text(String(item.value || "Not set"), x + 12, y + 30, {
          width: cardWidth - 24,
          height: 18,
          ellipsis: true,
        });
    });

    doc.y = y + cardHeight + gap;
  }
}

function renderPdfParagraph(doc, text, options = {}) {
  if (!safeString(text)) return;

  const fontSize = options.fontSize || 10;
  const color = options.color || "#554c43";
  const lineGap = options.lineGap ?? 4;
  const gapAfter = options.gapAfter ?? 12;
  const left = options.x || doc.page.margins.left;
  const y = options.y ?? doc.y;

  doc
    .font(options.font || "Helvetica")
    .fontSize(fontSize)
    .fillColor(color)
    .text(text, left, y, {
      width:
        options.width ||
        doc.page.width - doc.page.margins.left - doc.page.margins.right,
      lineGap,
    });

  doc.moveDown(gapAfter / 12);
}

function renderPdfBulletList(doc, items = [], minimumSpace = 100) {
  items.forEach((item) => {
    ensurePdfSpace(doc, minimumSpace);
    const left = doc.page.margins.left;
    const y = doc.y;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right - 18;
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#c5a059")
      .text("•", left, y, {
        lineBreak: false,
      });
    doc.font("Helvetica").fontSize(10).fillColor("#554c43").text(item, left + 14, y, {
      width,
      lineGap: 4,
    });
    doc.moveDown(0.3);
  });
}

function renderPdfSectionHeading(doc, title, description = "") {
  ensurePdfSpace(doc, 80);
  const left = doc.page.margins.left;
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#755928")
    .text(String(title || "").toUpperCase(), left, doc.y);

  if (description) {
    doc
      .moveDown(0.2)
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#7b6f61")
      .text(description, left, doc.y, {
        lineGap: 2,
      });
  }

  doc.moveDown(0.5);
}

function renderAgreementLineItems(
  doc,
  lineItems = [],
  { totalLabel = "Estimated total", subtotal = 0 } = {},
) {
  if (!lineItems.length) {
    renderPdfParagraph(
      doc,
      "No estimate line items were saved at the time of signature.",
      {
        fontSize: 10,
        color: "#7b6f61",
      },
    );
    return;
  }

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const contentWidth = right - left;
  const amountWidth = 112;
  const titleWidth = contentWidth - amountWidth - 32;
  const descriptionWidth = contentWidth - 28;

  function drawLineItemHeader(continued = false) {
    ensurePdfSpace(doc, 34);
    const y = doc.y;
    doc
      .moveTo(left, y)
      .lineTo(right, y)
      .lineWidth(0.7)
      .strokeColor("#d0c2a8")
      .stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor("#755928")
      .text(continued ? "SCOPE CONTINUED" : "SCOPE", left, y + 12, {
        lineBreak: false,
      })
      .text("AMOUNT", left, y + 12, {
        width: contentWidth,
        align: "right",
        lineBreak: false,
      });
    doc
      .moveTo(left, y + 25)
      .lineTo(right, y + 25)
      .lineWidth(0.7)
      .strokeColor("#e5ded2")
      .stroke();
    doc.y = y + 36;
  }

  drawLineItemHeader(false);

  lineItems.forEach((item) => {
    const title = safeString(item.label) || "Line item";
    const description =
      safeString(item.description) || "Scope details to be confirmed.";
    doc.font("Helvetica-Bold").fontSize(10.5);
    const titleHeight = doc.heightOfString(title, {
      width: titleWidth,
      lineGap: 1,
    });
    doc.font("Helvetica").fontSize(9.6);
    const descriptionHeight = doc.heightOfString(description, {
      width: descriptionWidth,
      lineGap: 3,
    });
    const rowHeight = Math.max(74, 28 + titleHeight + descriptionHeight);

    if (ensurePdfSpace(doc, rowHeight + 18)) {
      drawLineItemHeader(true);
    }

    const rowY = doc.y;
    doc
      .save()
      .roundedRect(left, rowY, contentWidth, rowHeight, 6)
      .fillAndStroke("#faf8f4", "#e5ded2")
      .restore();
    doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor("#17120d")
      .text(title, left + 14, rowY + 16, {
        width: titleWidth,
        lineGap: 1,
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(11.5)
      .fillColor("#17120d")
      .text(
        formatCurrency(item.amount || 0),
        right - amountWidth - 14,
        rowY + 16,
        {
          width: amountWidth,
          align: "right",
          lineBreak: false,
        },
      );

    doc
      .font("Helvetica")
      .fontSize(9.6)
      .fillColor("#554c43")
      .text(description, left + 14, rowY + 19 + titleHeight, {
        width: descriptionWidth,
        lineGap: 3,
      });

    doc.y = rowY + rowHeight + 10;
  });

  ensurePdfSpace(doc, 58);
  const totalY = doc.y;
  doc
    .save()
    .roundedRect(left, totalY, contentWidth, 46, 7)
    .fill("#181510")
    .restore();
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor("#c5a059")
    .text(
      String(totalLabel || "Estimated total").toUpperCase(),
      left + 16,
      totalY + 17,
      {
        lineBreak: false,
      },
    );
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#fffaf0")
    .text(formatCurrency(subtotal || 0), left + 16, totalY + 25, {
      width: contentWidth - 32,
      align: "right",
      lineBreak: false,
    });
  doc.y = totalY + 62;
}

function buildAgreementPdfBuffer({
  leadData = {},
  projectData = {},
  estimateSnapshot = {},
  agreementSnapshot = {},
  documentType = "estimate",
  signerName,
  signedAt,
  signatureBuffer,
  contractorRepresentativeName = "",
}) {
  return new Promise((resolve, reject) => {
    const normalisedDocumentType = normaliseShareType(documentType);
    const isChangeOrder = normalisedDocumentType === "change_order";
    const approvalTitle = isChangeOrder
      ? "Change order approval"
      : "Project estimate approval";
    const introCopy = isChangeOrder
      ? "This PDF captures the change order, pricing revision, authorization terms, and signature record accepted through Golden Brick."
      : "This PDF captures the estimate, agreement details, authorization terms, cancellation notice, and signature record accepted through Golden Brick.";
    const totalLabel = isChangeOrder ? "Change Total" : "Estimated Total";
    const overviewHeading = isChangeOrder
      ? "Change order overview"
      : "Estimate overview";
    const scopeHeading = isChangeOrder
      ? "Scope revision and pricing"
      : "Scope and pricing";
    const scopeDescription = isChangeOrder
      ? "The pricing revision below reflects the approved change order snapshot."
      : "Each scope line and amount shown here reflects the accepted estimate snapshot.";
    const doc = new PDFDocument({
      size: "LETTER",
      margin: 52,
      bufferPages: true,
      info: {
        Title: `Golden Brick ${approvalTitle.toLowerCase()} for ${safeString(leadData.projectAddress || leadData.clientName || "project")}`,
        Author: "Golden Brick Construction",
      },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.on("pageAdded", () => {
      renderPdfTopBar(doc);
    });

    renderPdfTopBar(doc);

    const preparedFor = safeString(
      leadData.clientName ||
        projectData.clientName ||
        projectData.customerName ||
        "Name to be confirmed",
    );
    const projectAddress = safeString(
      leadData.projectAddress ||
        projectData.projectAddress ||
        "To be confirmed",
    );
    const projectType = safeString(
      leadData.projectType || projectData.projectType || "Renovation scope",
    );
    const projectTitle = approvalDocumentDisplayTitle(
      estimateSnapshot.subject,
      projectType,
    );
    const contractDetails =
      estimateSnapshot.contractDetails || normaliseContractDetails({}, {});
    const cancellationNotice = buildCancellationNotice(contractDetails, signedAt);

    renderAgreementHero(doc, {
      title: approvalTitle,
      projectTitle,
      introCopy,
      totalLabel,
      totalAmount: estimateSnapshot.subtotal || 0,
    });

    renderPdfSummaryCards(doc, [
      { label: "Prepared for", value: preparedFor },
      { label: "Signed", value: formatDateTime(signedAt) },
      { label: "Signer", value: safeString(signerName) },
      { label: "Project address", value: projectAddress },
      { label: "Project type", value: projectType },
      { label: totalLabel, value: formatCurrency(estimateSnapshot.subtotal || 0) },
      {
        label: "PA HIC registration",
        value: contractDetails.paRegistrationNumber || COMPANY_INFO.paRegistrationNumber,
      },
      {
        label: "Philly GC license",
        value: `#${contractDetails.philadelphiaLicenseNumber || COMPANY_INFO.philadelphiaLicenseNumber}`,
      },
    ]);

    doc.moveDown(0.25);

    renderPdfSectionHeading(
      doc,
      overviewHeading,
      "Project notes preserved in the approval record.",
    );
    splitMultilineText(estimateSnapshot.emailBody).forEach((paragraph) => {
      renderPdfParagraph(doc, paragraph, {
        fontSize: 10,
        color: "#554c43",
        gapAfter: 8,
      });
    });

    renderPdfSectionHeading(
      doc,
      scopeHeading,
      scopeDescription,
    );
    renderAgreementLineItems(doc, estimateSnapshot.lineItems, {
      totalLabel,
      subtotal: estimateSnapshot.subtotal || 0,
    });

    if (!isChangeOrder) {
      renderPdfSectionHeading(
        doc,
        "Agreement details",
        "Contractor, timing, payment, subcontractor, insurance, and statutory disclosure details in effect at signing.",
      );
      renderPdfSummaryCards(doc, [
        {
          label: "Contractor",
          value: COMPANY_INFO.name,
        },
        {
          label: "Business address",
          value: contractAddressDisplay(contractDetails),
        },
        {
          label: "Approx. start",
          value: contractDateDisplay(contractDetails.approximateStartDate),
        },
        {
          label: "Approx. completion",
          value: contractDateDisplay(contractDetails.approximateCompletionDate),
        },
        {
          label: "PA registration",
          value: contractDetails.paRegistrationNumber || COMPANY_INFO.paRegistrationNumber,
        },
        {
          label: "Philly GC license",
          value: `#${contractDetails.philadelphiaLicenseNumber || COMPANY_INFO.philadelphiaLicenseNumber}`,
        },
      ]);
      [
        `Deposit / payment terms: ${contractDetails.paymentSchedule}`,
        `Special-order material advance: ${contractDetails.specialOrderMaterials}`,
        `Known subcontractors: ${contractDetails.knownSubcontractors}`,
        `Insurance disclosure: ${contractDetails.insuranceDisclosure}`,
        `Pennsylvania Bureau of Consumer Protection registration lookup: ${PA_CONSUMER_PROTECTION_PHONE}. Registration does not imply endorsement.`,
      ].forEach((item) => renderPdfParagraph(doc, item, {
        fontSize: 9.6,
        color: "#554c43",
        gapAfter: 8,
      }));
    }

    ensurePdfSpace(doc, 190);
    renderPdfSectionHeading(
      doc,
      "Standard terms",
      "These are the standard estimate terms included at the time of acceptance.",
    );
    renderPdfBulletList(
      doc,
      splitMultilineText(estimateSnapshot.proposalTerms),
    );

    const assumptions = Array.isArray(estimateSnapshot.assumptions)
      ? estimateSnapshot.assumptions
      : [];
    renderPdfSectionHeading(
      doc,
      "Project notes and exclusions",
      "Project-specific notes, exclusions, or selection assumptions recorded with this approval.",
    );
    if (assumptions.length) {
      renderPdfBulletList(doc, assumptions);
    } else {
      renderPdfParagraph(
        doc,
        "No project-specific assumptions or exclusions were saved at the time of signature.",
        {
          fontSize: 10,
          color: "#7b6f61",
        },
      );
    }

    renderPdfSectionHeading(
      doc,
      agreementSnapshot.title || "Authorization terms",
      agreementSnapshot.intro || "",
    );
    renderPdfBulletList(doc, splitMultilineText(agreementSnapshot.terms));

    if (!isChangeOrder) {
      renderPdfSectionHeading(
        doc,
        "Cancellation right",
        cancellationNotice.actualNotice,
      );
      renderPdfBulletList(doc, cancellationNotice.statements, 80);

      doc.addPage();
      renderPdfSectionHeading(
        doc,
        "Notice of Cancellation - Owner Copy",
        "Keep this completed notice with your signed agreement record.",
      );
      renderPdfBulletList(doc, cancellationNotice.statements, 80);

      doc.addPage();
      renderPdfSectionHeading(
        doc,
        "Notice of Cancellation - Golden Brick Copy",
        "Use this copy if you choose to cancel within the cancellation period.",
      );
      renderPdfBulletList(doc, cancellationNotice.statements, 80);
    }

    renderPdfSectionHeading(
      doc,
      "Signature record",
      "This block records the acceptance captured with the approval record.",
    );
    if (signatureBuffer?.length) {
      ensurePdfSpace(doc, 120);
      doc.image(signatureBuffer, {
        fit: [190, 70],
        align: "left",
      });
      doc.moveDown(0.4);
    }

    renderPdfParagraph(doc, `Signed by: ${safeString(signerName)}`, {
      font: "Helvetica-Bold",
      fontSize: 11,
      color: "#231d17",
      gapAfter: 4,
    });
    renderPdfParagraph(
      doc,
      `Contractor representative: ${safeString(contractorRepresentativeName) || COMPANY_INFO.name}`,
      {
        font: "Helvetica-Bold",
        fontSize: 11,
        color: "#231d17",
        gapAfter: 4,
      },
    );
    renderPdfParagraph(doc, `Signed at: ${formatDateTime(signedAt)}`, {
      fontSize: 10,
      color: "#554c43",
      gapAfter: 4,
    });
    renderPdfParagraph(
      doc,
      `${COMPANY_INFO.name} | ${COMPANY_INFO.email} | ${COMPANY_INFO.phone}`,
      {
        fontSize: 9,
        color: "#7b6f61",
        gapAfter: 0,
      },
    );
    renderPdfParagraph(doc, `PA HIC #${COMPANY_INFO.paRegistrationNumber} | Philadelphia GC License #${COMPANY_INFO.philadelphiaLicenseNumber}`, {
      fontSize: 9,
      color: "#7b6f61",
      gapAfter: 0,
    });

    renderPdfFooter(doc, isChangeOrder ? "Change order approval" : "Estimate approval");
    doc.end();
  });
}

async function addLeadActivity(leadId, data) {
  const activityRef = db
    .collection("leads")
    .doc(leadId)
    .collection("activities")
    .doc();

  await activityRef.set({
    ...data,
    body: safeString(data.body),
    title: safeString(data.title),
    activityType: safeString(data.activityType) || "system",
    visibility: safeString(data.visibility) || "staff",
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function addProjectActivity(projectId, data) {
  const activityRef = db
    .collection("projects")
    .doc(projectId)
    .collection("activities")
    .doc();

  await activityRef.set({
    ...data,
    body: safeString(data.body),
    title: safeString(data.title),
    activityType: safeString(data.activityType) || "system",
    visibility: safeString(data.visibility) || "staff",
    createdAt: FieldValue.serverTimestamp(),
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
  const decoded = await verifyStaffIdToken(request);
  const email = safeString(decoded.email).toLowerCase();
  const userSnap = await db.collection("users").doc(decoded.uid).get();

  if (userSnap.exists && userSnap.data().active === true) {
    return {
      token: decoded,
      profile: serialiseStaffProfile(userSnap.data()),
    };
  }

  if (!email) {
    throw httpError("User is not authorised for the staff portal.", 403);
  }

  const allowedSnap = await db
    .collection("allowedStaff")
    .doc(sanitizeEmailKey(email))
    .get();
  if (!allowedSnap.exists || allowedSnap.data().active !== true) {
    throw httpError("User is not authorised for the staff portal.", 403);
  }

  return {
    token: decoded,
    profile: serialiseStaffProfile(
      buildStaffProfile(decoded, allowedSnap.data()),
    ),
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
  const canAccess =
    profile.role === "admin" ||
    safeString(leadData.assignedToUid) === safeString(profile.uid);

  if (!canAccess) {
    const error = new Error("You do not have access to this lead.");
    error.status = 403;
    throw error;
  }

  return { leadRef, leadData };
}

async function verifyProjectStaffAccess(projectId, profile = {}) {
  const projectRef = db.collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    const error = new Error("Job not found.");
    error.status = 404;
    throw error;
  }

  const projectData = projectSnap.data() || {};
  const allowedStaff = uniqueValues([
    safeString(projectData.assignedLeadOwnerUid),
    ...(projectData.assignedWorkerIds || []),
    ...(projectData.allowedStaffUids || []),
  ]);
  const canAccess =
    profile.role === "admin" || allowedStaff.includes(safeString(profile.uid));

  if (!canAccess) {
    const error = new Error("You do not have access to this job.");
    error.status = 403;
    throw error;
  }

  return { projectRef, projectData };
}

async function ensureProjectForLead({
  leadId,
  leadRef,
  leadData,
  actorProfile = {},
  allowAmbiguousCustomerCreate = false,
  requiredCustomerId = "",
  estimateDataOverride = null,
}) {
  const projectRef = db.collection("projects").doc(leadId);
  const existingProjectSnap = await projectRef.get();
  const frozenCustomerId = safeString(requiredCustomerId);
  let customerLink;

  if (frozenCustomerId) {
    if (safeString(leadData.customerId) !== frozenCustomerId) {
      const error = new Error(
        "The lead customer no longer matches the customer on the signed estimate.",
      );
      error.status = 409;
      throw error;
    }

    const customerSnap = await db
      .collection("customers")
      .doc(frozenCustomerId)
      .get();
    if (!customerSnap.exists) {
      const error = new Error(
        "The customer connected to the signed estimate could not be found.",
      );
      error.status = 409;
      throw error;
    }

    const customerData = customerSnap.data() || {};
    customerLink = {
      customerId: frozenCustomerId,
      customerName: safeString(
        customerData.name ||
          leadData.customerName ||
          leadData.clientName,
      ),
      matchResult: "linked",
      reviewRequired: false,
      customerMatchIds: [frozenCustomerId],
    };
  } else {
    customerLink = await ensureLeadCustomerLink(leadRef, leadData);
  }

  if (customerLink.matchResult === "review_required") {
    if (allowAmbiguousCustomerCreate) {
      const customerRef = db.collection("customers").doc();
      const createdCustomer = await ensureCustomerDocument(
        customerRef,
        leadData,
      );
      await leadRef.set(
        {
          customerId: createdCustomer.id,
          customerName: createdCustomer.name,
          customerMatchResult: "created",
          customerReviewRequired: false,
          customerMatchIds: [createdCustomer.id],
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      customerLink = {
        customerId: createdCustomer.id,
        customerName: createdCustomer.name,
        matchResult: "created",
        reviewRequired: false,
        customerMatchIds: [createdCustomer.id],
      };
    } else {
      const error = new Error(
        "Customer review is required before converting this lead.",
      );
      error.status = 409;
      error.matchResult = customerLink.matchResult;
      error.customerMatchIds = customerLink.customerMatchIds;
      throw error;
    }
  }

  if (customerLink.matchResult === "review_required") {
    const error = new Error(
      "Customer review is required before converting this lead.",
    );
    error.status = 409;
    error.matchResult = customerLink.matchResult;
    error.customerMatchIds = customerLink.customerMatchIds;
    throw error;
  }

  if (
    existingProjectSnap.exists &&
    frozenCustomerId &&
    safeString(existingProjectSnap.data()?.customerId) !==
      frozenCustomerId
  ) {
    const error = new Error(
      "The existing job is connected to a different customer than the signed estimate.",
    );
    error.status = 409;
    throw error;
  }

  if (existingProjectSnap.exists) {
    await leadRef.set(
      {
        status: "closed_won",
        statusLabel: statusLabel("closed_won"),
        customerId: customerLink.customerId,
        customerName: customerLink.customerName,
        wonProjectId: leadId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const existingProjectData = {
      id: leadId,
      ...(existingProjectSnap.data() || {}),
    };

    await Promise.all([
      syncRecordDocumentLinksForLead(leadId, {
        ...leadData,
        customerId: customerLink.customerId,
        wonProjectId: leadId,
      }),
      syncRecordDocumentLinksForProject(leadId, existingProjectData),
      ensureProjectRecordDocumentMigration(leadId, existingProjectData),
    ]);

    return {
      existing: true,
      projectId: leadId,
      scopeItemCount: 0,
      customerLink,
      projectRef,
      projectData: existingProjectData,
    };
  }

  const [refreshedLeadSnap, estimateSnap] = await Promise.all([
    leadRef.get(),
    estimateDataOverride
      ? Promise.resolve(null)
      : db.collection("estimates").doc(leadId).get(),
  ]);
  const refreshedLead = refreshedLeadSnap.data() || leadData;
  const estimateData =
    estimateDataOverride ||
    (estimateSnap?.exists ? estimateSnap.data() : null);
  const leadOwnerUid = safeString(
    refreshedLead.assignedToUid || actorProfile.uid,
  );
  const leadOwnerName = safeString(
    refreshedLead.assignedToName ||
      actorProfile.displayName ||
      actorProfile.email,
  );
  const leadOwnerEmail = normaliseEmail(
    refreshedLead.assignedToEmail || actorProfile.email,
  );
  const assignedWorkers = leadOwnerUid
    ? [
        {
          uid: leadOwnerUid,
          name: leadOwnerName,
          email: leadOwnerEmail,
          percent: 100,
        },
      ]
    : [];
  const allowedStaffUids = uniqueValues([
    leadOwnerUid,
    ...assignedWorkers.map((worker) => worker.uid),
  ]);
  const batch = db.batch();
  const initialSummary = computeFinanceSummary(
    {
      baseContractValue: toNumber(
        estimateData?.subtotal || refreshedLead.estimateSubtotal || 0,
      ),
      assignedWorkers,
    },
    [],
    [],
    [],
  );
  const scopeItemCount = queueProjectScopeSnapshot(
    batch,
    projectRef,
    leadId,
    estimateData,
    actorProfile,
  );

  batch.set(
    projectRef,
    {
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
      baseContractValue: initialSummary.baseContractValue,
      approvedChangeOrdersTotal: initialSummary.approvedChangeOrdersTotal,
      totalContractRevenue: initialSummary.totalContractRevenue,
      cashPosition: initialSummary.cashPosition,
      balanceRemaining: initialSummary.balanceRemaining,
      jobValue: initialSummary.totalContractRevenue,
      assignedLeadOwnerUid: leadOwnerUid || null,
      assignedWorkers,
      assignedWorkerIds: assignedWorkers
        .map((worker) => worker.uid)
        .filter(Boolean),
      allowedStaffUids,
      phaseLabel: "Planning and construction",
      nextStep:
        "Golden Brick will confirm the next planning or construction step directly.",
      sharedStatusNote:
        "Your project record is open and the team will keep updates, billing, and documents organized here.",
      targetDate: null,
      targetWindow: "",
      commissionLocked: false,
      lockedCommissionSnapshot: null,
      financials: initialSummary,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  batch.set(
    leadRef,
    {
      status: "closed_won",
      statusLabel: statusLabel("closed_won"),
      customerId: customerLink.customerId,
      customerName: customerLink.customerName,
      wonProjectId: leadId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();

  const createdProjectData = {
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
    financials: initialSummary,
  };

  await Promise.all([
    syncRecordDocumentLinksForLead(leadId, {
      ...refreshedLead,
      customerId: customerLink.customerId,
      wonProjectId: leadId,
    }),
    syncRecordDocumentLinksForProject(leadId, createdProjectData),
    ensureProjectRecordDocumentMigration(leadId, createdProjectData),
  ]);

  return {
    existing: false,
    projectId: leadId,
    scopeItemCount,
    customerLink,
    projectRef,
    projectData: createdProjectData,
  };
}

function buildPublicEstimatePayload({
  request,
  shareData,
  leadData,
  estimateSnapshot,
  agreementSnapshot,
  signedAgreement = null,
}) {
  const type = normaliseShareType(shareData.type);
  const documentLabel = type === "change_order" ? "Change order" : "Estimate";
  const contractDetails =
    estimateSnapshot.contractDetails || normaliseContractDetails({}, {});
  const readinessBlockers =
    type === "estimate" ? agreementReadinessBlockers(contractDetails) : [];
  const signingMode =
    safeString(shareData.signingMode || shareData.publishMode) ||
    (readinessBlockers.length ? "review" : "signature");
  const readyToSign =
    signingMode === "signature" &&
    shareData.readyToSign !== false &&
    readinessBlockers.length === 0;
  const cancellationNotice = buildCancellationNotice(
    contractDetails,
    signedAgreement?.signedAt || null,
  );
  return {
    ok: true,
    documentType: type,
    documentLabel,
    readOnly: safeString(shareData.status) === "signed",
    share: serialiseEstimateShare(shareData, request),
    lead: {
      clientName: safeString(leadData.clientName || leadData.customerName),
      projectAddress: safeString(leadData.projectAddress),
      projectType: safeString(leadData.projectType),
    },
    estimate: {
      subject: safeString(estimateSnapshot.subject),
      emailBody: safeString(estimateSnapshot.emailBody),
      lineItems: Array.isArray(estimateSnapshot.lineItems)
        ? estimateSnapshot.lineItems
        : [],
      subtotal: toNumber(estimateSnapshot.subtotal),
      assumptions: Array.isArray(estimateSnapshot.assumptions)
        ? estimateSnapshot.assumptions
        : [],
      terms: splitMultilineText(estimateSnapshot.proposalTerms),
      contractDetails,
    },
    agreement: {
      title: safeString(agreementSnapshot.title),
      intro: safeString(agreementSnapshot.intro),
      terms: splitMultilineText(agreementSnapshot.terms),
      readyToSign,
      blockers: readinessBlockers,
      pendingMessage: !readyToSign
        ? readinessBlockers.length
          ? "This estimate is ready for review. Golden Brick will send the signable agreement copy after the project schedule is confirmed."
          : "This estimate was shared for review. Golden Brick will send a signature-ready version after any revisions are confirmed."
        : "",
      details: [
        { label: "Contractor", value: COMPANY_INFO.name },
        {
          label: "Contractor representative",
          value: safeString(shareData.createdByName) || COMPANY_INFO.name,
        },
        {
          label: "Business address",
          value: contractAddressDisplay(contractDetails),
        },
        {
          label: "PA HIC registration",
          value: contractDetails.paRegistrationNumber,
        },
        {
          label: "Philadelphia GC license",
          value: `#${contractDetails.philadelphiaLicenseNumber}`,
        },
        {
          label: "Approx. start",
          value: contractDateDisplay(contractDetails.approximateStartDate),
        },
        {
          label: "Approx. completion",
          value: contractDateDisplay(contractDetails.approximateCompletionDate),
        },
        {
          label: "Deposit / payment terms",
          value: contractDetails.paymentSchedule,
        },
        {
          label: "Special-order material advance",
          value: contractDetails.specialOrderMaterials,
        },
        {
          label: "Known subcontractors",
          value: contractDetails.knownSubcontractors,
        },
        {
          label: "Insurance disclosure",
          value: contractDetails.insuranceDisclosure,
        },
      ],
      cancellationNotice,
    },
    support: {
      email: COMPANY_INFO.email,
      phone: COMPANY_INFO.phone,
      phoneHref: COMPANY_INFO.phoneHref,
      paRegistrationNumber: COMPANY_INFO.paRegistrationNumber,
      philadelphiaLicenseNumber: COMPANY_INFO.philadelphiaLicenseNumber,
      consumerProtectionPhone: PA_CONSUMER_PROTECTION_PHONE,
    },
    signature: signedAgreement
      ? {
          signerName: safeString(signedAgreement.signerName),
          signerEmail: normaliseEmail(signedAgreement.signerEmail),
          signerRole: safeString(signedAgreement.signerRole),
          signedAt: serialiseDateValue(signedAgreement.signedAt),
          downloadHref: buildPublicAgreementDownloadHref(request, shareData.id),
        }
      : null,
  };
}

async function loadPublicEstimatePayload(request, token) {
  const shareToken = safeString(token);
  if (!shareToken) {
    const error = new Error("token is required.");
    error.status = 400;
    throw error;
  }

  const { shareRef, shareData } = await fetchEstimateShareContext(shareToken);
  const shareType = normaliseShareType(shareData.type);

  if (["revoked", "replaced", "void"].includes(safeString(shareData.status))) {
    const error = new Error(
      shareType === "change_order"
        ? "This change order link has been revoked."
        : "This estimate link has been revoked.",
    );
    error.status = 410;
    error.clientStatus = "revoked";
    throw error;
  }

  let leadData = shareData.leadSnapshot || shareData.projectSnapshot || {};
  let estimateSnapshot =
    shareType === "change_order"
      ? shareData.changeOrderSnapshot || {}
      : shareData.estimateSnapshot || {};
  let agreementSnapshot = shareData.agreementSnapshot || {};
  let signedAgreement = null;

  if (shareData.status === "signed" && safeString(shareData.agreementId)) {
    const agreementSnap = await db
      .collection("agreements")
      .doc(shareData.agreementId)
      .get();

    if (!agreementSnap.exists) {
      const error = new Error("The signed agreement could not be found.");
      error.status = 404;
      throw error;
    }

    const agreementData = agreementSnap.data() || {};
    if (
      safeString(agreementData.shareId) &&
      safeString(agreementData.shareId) !== safeString(shareData.id)
    ) {
      const error = new Error(
        "This signed agreement is not connected to this published estimate.",
      );
      error.status = 409;
      error.clientStatus = "republish_required";
      throw error;
    }
    if (
      safeString(agreementData.leadId) &&
      safeString(agreementData.leadId) !== safeString(shareData.leadId)
    ) {
      const error = new Error(
        "This signed agreement is not connected to this lead.",
      );
      error.status = 409;
      error.clientStatus = "republish_required";
      throw error;
    }
    leadData =
      agreementData.leadSnapshot ||
      agreementData.projectSnapshot ||
      leadData ||
      {};
    estimateSnapshot =
      agreementData.estimateSnapshot ||
      agreementData.changeOrderSnapshot ||
      estimateSnapshot ||
      {};
    agreementSnapshot = agreementData.agreementSnapshot || {};
    signedAgreement = {
      signerName: safeString(agreementData.signerName),
      signerEmail: normaliseEmail(agreementData.signerEmail),
      signerRole: safeString(agreementData.signerRole),
      signedAt: agreementData.signedAt || null,
    };
  }

  validateImmutableShareSnapshots({
    ...shareData,
    leadSnapshot: leadData,
    estimateSnapshot:
      shareType === "estimate" ? estimateSnapshot : shareData.estimateSnapshot,
    changeOrderSnapshot:
      shareType === "change_order"
        ? estimateSnapshot
        : shareData.changeOrderSnapshot,
    agreementSnapshot,
  });

  await shareRef.set(
    {
      lastViewedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return buildPublicEstimatePayload({
    request,
    shareData: {
      ...shareData,
      lastViewedAt: new Date(),
    },
    leadData,
    estimateSnapshot,
    agreementSnapshot,
    signedAgreement,
  });
}

async function authorisePublishedSigner(shareData = {}, signerEmail) {
  const email = normaliseEmail(signerEmail);
  if (!email) {
    throw httpError(
      "Enter the email address connected to this approval before signing.",
      400,
    );
  }

  const customerId = safeString(shareData.customerId);
  const frozenClientEmail = normaliseEmail(
    shareData.leadSnapshot?.clientEmail ||
      shareData.projectSnapshot?.clientEmail,
  );
  if (!customerId) {
    throw httpError(
      "This approval is not connected to a customer and must be published again.",
      409,
    );
  }

  const contactsSnap = await db
    .collection("customers")
    .doc(customerId)
    .collection("contacts")
    .get();
  const emailContacts = contactsSnap.docs
    .map((snapshot) => snapshot.data() || {})
    .filter((contact) => normaliseEmail(contact.email) === email);
  const matchingContacts = emailContacts
    .filter(
      (contact) =>
        !contact.disabledAt &&
        !contact.revokedAt &&
        safeString(contact.status || "active") !== "revoked",
    );
  const signableContact = matchingContacts.find((contact) =>
    portalContactCanSign(contact.role || contact.accessScope),
  );

  if (signableContact) {
    return {
      email,
      role: normalisePortalContactRole(
        signableContact.role || signableContact.accessScope,
      ),
    };
  }

  if (
    matchingContacts.some(
      (contact) =>
        normalisePortalContactRole(
          contact.role || contact.accessScope,
        ) === "read_only",
    )
  ) {
    throw httpError(
      "This portal contact has read-only access and cannot sign estimates.",
      403,
    );
  }

  if (emailContacts.length) {
    throw httpError(
      "This client contact is not active for estimate approvals.",
      403,
    );
  }

  if (frozenClientEmail && frozenClientEmail === email) {
    return {
      email,
      role: "primary",
    };
  }

  throw httpError(
    "Use the client email connected to this approval, or ask Golden Brick to update the authorized signer.",
    403,
  );
}

function signingLeaseExpired(shareData = {}) {
  const startedAt = normaliseMillis(shareData.signingStartedAt);
  return !startedAt || Date.now() - startedAt > ESTIMATE_SIGNING_LEASE_MS;
}

async function releaseSigningReservation(
  shareRef,
  signingAttemptId,
  error,
) {
  try {
    await db.runTransaction(async (transaction) => {
      const shareSnap = await transaction.get(shareRef);
      if (!shareSnap.exists) {
        return;
      }
      const shareData = shareSnap.data() || {};
      if (
        safeString(shareData.status) !== "signing" ||
        safeString(shareData.signingAttemptId) !==
          safeString(signingAttemptId)
      ) {
        return;
      }

      transaction.set(
        shareRef,
        {
          status: "active",
          signingAttemptId: null,
          signingRequestHash: null,
          signingStartedAt: null,
          pendingAgreementId: null,
          pendingRecordDocumentId: null,
          lastSigningError: safeString(error?.message || error),
          lastSigningFailedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });
  } catch (releaseError) {
    logger.error("Estimate signing reservation could not be released.", {
      shareId: shareRef.id,
      signingAttemptId,
      error: releaseError?.message || String(releaseError),
    });
  }
}

async function retrySignedEstimateProjectConversion(
  shareData = {},
  agreementData = {},
) {
  if (
    normaliseShareType(shareData.type) !== "estimate" ||
    safeString(agreementData.projectConversionStatus) === "complete"
  ) {
    return {
      status:
        safeString(agreementData.projectConversionStatus) ||
        "not_applicable",
      projectId: safeString(
        agreementData.projectId || shareData.projectId,
      ),
    };
  }

  const agreementId = safeString(
    agreementData.id || shareData.agreementId,
  );
  const leadId = safeString(shareData.leadId);
  const customerId = safeString(shareData.customerId);
  const estimateSnapshot =
    agreementData.estimateSnapshot || shareData.estimateSnapshot;
  const agreementRef = agreementId
    ? db.collection("agreements").doc(agreementId)
    : null;
  const recordDocumentId = safeString(
    agreementData.recordDocumentId ||
      agreementData.jobDocumentId,
  );
  const recordDocumentRef = recordDocumentId
    ? db.collection("recordDocuments").doc(recordDocumentId)
    : null;
  const leadRef = db.collection("leads").doc(leadId);
  const portalActor = {
    uid: "client-portal",
    email: "portal@goldenbrick.local",
    displayName: "Golden Brick Secure Estimate Page",
    role: "system",
  };

  try {
    validateImmutableShareSnapshots({
      ...shareData,
      leadSnapshot:
        agreementData.leadSnapshot || shareData.leadSnapshot,
      estimateSnapshot,
      agreementSnapshot:
        agreementData.agreementSnapshot ||
        shareData.agreementSnapshot,
    });
    const leadSnap = await leadRef.get();
    if (!leadSnap.exists) {
      throw httpError("Lead not found.", 404);
    }

    const projectResult = await ensureProjectForLead({
      leadId,
      leadRef,
      leadData: leadSnap.data() || {},
      actorProfile: portalActor,
      requiredCustomerId: customerId,
      estimateDataOverride: estimateSnapshot,
    });
    const updates = [];
    if (agreementRef) {
      updates.push(
        agreementRef.set(
          {
            projectId: projectResult.projectId,
            projectConversionStatus: "complete",
            projectConversionError: "",
            projectConvertedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
      );
    }
    updates.push(
      db
        .collection("estimateShares")
        .doc(shareData.id)
        .set(
          {
            projectId: projectResult.projectId,
            projectConversionStatus: "complete",
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
    );
    if (recordDocumentRef) {
      updates.push(
        recordDocumentRef.set(
          {
            projectId: projectResult.projectId,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
      );
    }
    await Promise.all(updates);

    return {
      status: "complete",
      projectId: projectResult.projectId,
    };
  } catch (error) {
    const projectConversionError = safeString(error?.message || error);
    logger.error("Signed estimate project conversion retry failed.", {
      shareId: shareData.id,
      agreementId,
      leadId,
      error: projectConversionError,
    });
    if (agreementRef) {
      await agreementRef
        .set(
          {
            projectConversionStatus: "pending",
            projectConversionError,
            projectConversionLastAttemptAt:
              FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
        .catch((writeError) => {
          logger.error(
            "Signed estimate conversion retry status could not be recorded.",
            writeError,
          );
        });
    }
    return {
      status: "pending",
      projectId: safeString(
        agreementData.projectId ||
          shareData.projectId ||
          leadId,
      ),
    };
  }
}

async function signPublicEstimatePayload(request, payload = {}) {
  const token = safeString(payload.token);
  const signerName = safeString(payload.signerName);
  const signerEmail = normaliseEmail(payload.signerEmail);
  let signerRole = safeString(payload.signerRole);
  const accepted =
    payload.accepted === true ||
    safeString(payload.accepted).toLowerCase() === "true" ||
    safeString(payload.accepted).toLowerCase() === "on";

  if (!token) {
    const error = new Error("token is required.");
    error.status = 400;
    throw error;
  }

  const { shareRef, shareData: initialShareData } =
    await fetchEstimateShareContext(token);
  let shareData = initialShareData;
  const shareType = normaliseShareType(shareData.type);

  if (["revoked", "replaced", "void"].includes(safeString(shareData.status))) {
    const error = new Error(
      shareType === "change_order"
        ? "This change order link has been revoked."
        : "This estimate link has been revoked.",
    );
    error.status = 410;
    error.clientStatus = "revoked";
    throw error;
  }

  if (shareData.status === "signed" && safeString(shareData.agreementId)) {
    const agreementSnap = await db
      .collection("agreements")
      .doc(shareData.agreementId)
      .get();
    if (!agreementSnap.exists) {
      throw httpError(
        "The signed agreement record could not be found.",
        404,
      );
    }
    const agreementData = agreementSnap.data() || {};
    const conversion = await retrySignedEstimateProjectConversion(
      shareData,
      {
        id: agreementSnap.id,
        ...agreementData,
      },
    );

    return {
      ok: true,
      alreadySigned: true,
      status: "signed",
      agreementId: safeString(shareData.agreementId),
      signedAt: serialiseDateValue(
        shareData.signedAt || agreementData.signedAt,
      ),
      projectConversionStatus: conversion.status,
      downloadHref: buildPublicAgreementDownloadHref(request, shareData.id),
    };
  }

  validateImmutableShareSnapshots(shareData);

  if (!accepted) {
    const error = new Error("You must agree to the terms before signing.");
    error.status = 400;
    throw error;
  }

  if (!signerName) {
    const error = new Error("Your full legal name is required.");
    error.status = 400;
    throw error;
  }

  const signature = parseSignatureDataUrl(payload.signatureDataUrl);
  if (shareType === "estimate") {
    const signingMode = safeString(
      shareData.signingMode || shareData.publishMode,
    );
    const blockers = agreementReadinessBlockers(
      shareData.estimateSnapshot?.contractDetails || {},
    );
    if (
      signingMode === "review" ||
      shareData.readyToSign === false ||
      blockers.length
    ) {
      const error = new Error(
        blockers.length
          ? "This estimate is available for review, but the signable agreement copy is not ready yet."
          : "This estimate was published for review only. Golden Brick must publish a signature-ready version before it can be signed.",
      );
      error.status = 409;
      error.clientStatus = "review_only";
      throw error;
    }

  }
  const signerAuthorization = await authorisePublishedSigner(
    shareData,
    signerEmail,
  );
  signerRole = signerAuthorization.role;

  const portalActor = {
    uid: "client-portal",
    email: "portal@goldenbrick.local",
    displayName: "Golden Brick Secure Estimate Page",
    role: "system",
  };
  let leadData = {};
  let projectData = {};
  let projectResult = null;
  let estimateSnapshot = {};
  let agreementSnapshot = {};
  let changeOrderRef = null;
  let currentLeadData = {};
  let currentLeadRef = null;

  if (shareType === "change_order") {
    const projectRef = db.collection("projects").doc(shareData.projectId);
    changeOrderRef = projectRef
      .collection("changeOrders")
      .doc(shareData.changeOrderId);
    const [projectSnap, changeOrderSnap] = await Promise.all([
      projectRef.get(),
      changeOrderRef.get(),
    ]);

    if (!projectSnap.exists || !changeOrderSnap.exists) {
      const error = new Error("This change order is no longer available.");
      error.status = 404;
      throw error;
    }

    projectData = projectSnap.data() || {};
    if (
      safeString(projectData.customerId) !==
      safeString(shareData.customerId)
    ) {
      throw httpError(
        "This change order is no longer connected to the published customer.",
        409,
      );
    }
    leadData =
      shareData.projectSnapshot ||
      shareData.leadSnapshot ||
      minimalProjectSnapshot(projectData);
    estimateSnapshot = shareData.changeOrderSnapshot;
    agreementSnapshot = shareData.agreementSnapshot;
    projectResult = {
      existing: true,
      projectId: shareData.projectId,
      customerLink: {
        customerId: safeString(projectData.customerId),
        customerName: safeString(projectData.customerName || projectData.clientName),
      },
      projectData,
    };
  } else {
    currentLeadRef = db.collection("leads").doc(shareData.leadId);
    const [leadSnap, customerSnap, projectSnap] = await Promise.all([
      currentLeadRef.get(),
      db.collection("customers").doc(shareData.customerId).get(),
      db.collection("projects").doc(shareData.leadId).get(),
    ]);

    if (!leadSnap.exists) {
      const error = new Error("This estimate is no longer available.");
      error.status = 404;
      throw error;
    }
    if (!customerSnap.exists) {
      throw httpError(
        "The customer connected to this estimate could not be found.",
        409,
      );
    }

    currentLeadData = leadSnap.data() || {};
    if (
      safeString(currentLeadData.customerId) !==
      safeString(shareData.customerId)
    ) {
      throw httpError(
        "This lead is no longer connected to the customer on the published estimate.",
        409,
      );
    }
    leadData = shareData.leadSnapshot;
    estimateSnapshot = shareData.estimateSnapshot;
    agreementSnapshot = shareData.agreementSnapshot;
    projectData = projectSnap.exists ? projectSnap.data() || {} : {};
    projectResult = {
      existing: projectSnap.exists,
      projectId: shareData.leadId,
      scopeItemCount: 0,
      customerLink: {
        customerId: shareData.customerId,
        customerName: safeString(
          shareData.customerName ||
            currentLeadData.customerName ||
            currentLeadData.clientName,
        ),
      },
      projectData,
    };
  }

  const signedAt = new Date();
  const proposedAgreementRef = db.collection("agreements").doc();
  const proposedRecordDocumentRef = db.collection("recordDocuments").doc();
  const signingAttemptId = createOpaqueId(18);
  const signingRequestHash = sha256Hex({
    shareId: shareData.id,
    signerName,
    signerEmail,
    signature: sha256Hex(signature.buffer),
  });
  const reservation = await db.runTransaction(async (transaction) => {
    const latestShareSnap = await transaction.get(shareRef);
    if (!latestShareSnap.exists) {
      throw httpError("This estimate link is not available.", 404);
    }

    const latestShareData = {
      id: latestShareSnap.id,
      ...latestShareSnap.data(),
    };
    if (
      latestShareData.status === "signed" &&
      safeString(latestShareData.agreementId)
    ) {
      return {
        alreadySigned: true,
        shareData: latestShareData,
      };
    }
    if (
      ["revoked", "replaced", "void"].includes(
        safeString(latestShareData.status),
      )
    ) {
      const error = new Error("This approval link is no longer active.");
      error.status = 410;
      error.clientStatus = "revoked";
      throw error;
    }

    validateImmutableShareSnapshots(latestShareData);
    if (
      latestShareData.status === "signing" &&
      !signingLeaseExpired(latestShareData)
    ) {
      throw httpError(
        "This signature is already being processed. Wait a moment before trying again.",
        409,
      );
    }
    if (
      latestShareData.status !== "active" &&
      latestShareData.status !== "signing"
    ) {
      throw httpError("This estimate is not available for signature.", 409);
    }

    const agreementId =
      latestShareData.status === "signing" &&
      safeString(latestShareData.pendingAgreementId)
        ? safeString(latestShareData.pendingAgreementId)
        : proposedAgreementRef.id;
    const recordDocumentId =
      latestShareData.status === "signing" &&
      safeString(latestShareData.pendingRecordDocumentId)
        ? safeString(latestShareData.pendingRecordDocumentId)
        : proposedRecordDocumentRef.id;

    transaction.set(
      shareRef,
      {
        status: "signing",
        signingAttemptId,
        signingRequestHash,
        signingStartedAt: FieldValue.serverTimestamp(),
        pendingAgreementId: agreementId,
        pendingRecordDocumentId: recordDocumentId,
        lastSigningError: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      alreadySigned: false,
      shareData: latestShareData,
      agreementId,
      recordDocumentId,
    };
  });

  if (reservation.alreadySigned) {
    const signedShare = reservation.shareData;
    const existingAgreementSnap = await db
      .collection("agreements")
      .doc(signedShare.agreementId)
      .get();
    if (!existingAgreementSnap.exists) {
      throw httpError(
        "The signed agreement record could not be found.",
        404,
      );
    }
    const existingAgreementData = {
      id: existingAgreementSnap.id,
      ...existingAgreementSnap.data(),
    };
    const conversion = await retrySignedEstimateProjectConversion(
      signedShare,
      existingAgreementData,
    );
    return {
      ok: true,
      alreadySigned: true,
      status: "signed",
      agreementId: safeString(signedShare.agreementId),
      signedAt: serialiseDateValue(signedShare.signedAt),
      projectConversionStatus: conversion.status,
      downloadHref: buildPublicAgreementDownloadHref(
        request,
        signedShare.id,
      ),
    };
  }

  shareData = {
    ...reservation.shareData,
    status: "signing",
    signingAttemptId,
  };
  const agreementRef = db
    .collection("agreements")
    .doc(reservation.agreementId);
  const recordDocumentRef = db
    .collection("recordDocuments")
    .doc(reservation.recordDocumentId);
  const bucket = admin.storage().bucket();
  const signaturePath = `agreements/${agreementRef.id}/signature.png`;
  const pdfPath = `agreements/${agreementRef.id}/signed-agreement.pdf`;
  const pdfDownloadToken = createOpaqueId(18);
  const leadSnapshot = minimalLeadSnapshot(leadData);
  const projectSnapshot = minimalProjectSnapshot(projectData, leadData);
  const audit = requestAuditMetadata(request);
  const signedDocumentTitle =
    shareType === "change_order"
      ? `Signed change order - ${formatDateOnly(signedAt)}`
      : `Signed agreement - ${formatDateOnly(signedAt)}`;
  const signedDocumentCategory =
    shareType === "change_order" ? "change_order" : "agreement";
  const signedDocumentNote =
    shareType === "change_order"
      ? `Signed by ${signerName} through the secure change order link.`
      : `Signed by ${signerName} through the secure estimate link.`;
  let pdfUrl = "";
  let signedCommitted = false;

  try {
    const pdfBuffer = await buildAgreementPdfBuffer({
      leadData,
      projectData,
      estimateSnapshot,
      agreementSnapshot,
      documentType: shareType,
      signerName,
      signedAt,
      signatureBuffer: signature.buffer,
      contractorRepresentativeName: safeString(shareData.createdByName),
    });
    pdfUrl = await saveStorageFile(bucket, pdfPath, pdfBuffer, {
      contentType: "application/pdf",
      downloadToken: pdfDownloadToken,
      metadata: {
        agreementId: agreementRef.id,
        shareId: shareData.id,
        versionId: safeString(shareData.versionId || shareData.id),
        contentHash: safeString(shareData.contentHash),
      },
    });
    await saveStorageFile(bucket, signaturePath, signature.buffer, {
      contentType: signature.contentType,
      metadata: {
        agreementId: agreementRef.id,
        shareId: shareData.id,
      },
    });

    await db.runTransaction(async (transaction) => {
      const latestShareSnap = await transaction.get(shareRef);
      if (!latestShareSnap.exists) {
        throw httpError("This estimate link is not available.", 404);
      }
      const latestShareData = latestShareSnap.data() || {};
      if (
        safeString(latestShareData.status) !== "signing" ||
        safeString(latestShareData.signingAttemptId) !==
          signingAttemptId ||
        safeString(latestShareData.pendingAgreementId) !==
          agreementRef.id
      ) {
        throw httpError(
          "This estimate signature was superseded by another request.",
          409,
        );
      }

      if (shareType === "change_order" && changeOrderRef) {
        const latestChangeOrderSnap = await transaction.get(changeOrderRef);
        if (!latestChangeOrderSnap.exists) {
          throw httpError(
            "This change order is no longer available.",
            404,
          );
        }
        if (
          normaliseChangeOrderStatus(
            latestChangeOrderSnap.data()?.status,
          ) === "void"
        ) {
          throw httpError(
            "This change order has been voided and cannot be signed.",
            409,
          );
        }
      }

      transaction.set(
        agreementRef,
        {
          id: agreementRef.id,
          type: shareType,
          status: "signed",
          schemaVersion:
            toNumber(shareData.schemaVersion) ||
            ESTIMATE_VERSION_SCHEMA_VERSION,
          versionId: safeString(shareData.versionId || shareData.id),
          versionNumber: toNumber(
            shareData.versionNumber || shareData.publishedVersion,
          ),
          contentHash: safeString(shareData.contentHash),
          leadId: cleanNullableString(shareData.leadId),
          projectId: projectResult.projectId,
          customerId: projectResult.customerLink.customerId,
          customerName: projectResult.customerLink.customerName,
          shareId: shareData.id,
          changeOrderId:
            shareType === "change_order"
              ? cleanNullableString(shareData.changeOrderId)
              : null,
          leadSnapshot,
          projectSnapshot,
          estimateSnapshot:
            shareType === "estimate" ? estimateSnapshot : null,
          changeOrderSnapshot:
            shareType === "change_order" ? estimateSnapshot : null,
          agreementSnapshot,
          signerName,
          signerEmail,
          signerRole,
          signedAt,
          signedIpAddress: audit.ipAddress,
          signedUserAgent: audit.userAgent,
          signaturePath,
          signatureContentType: signature.contentType,
          pdfPath,
          pdfUrl,
          pdfFileName: "signed-agreement.pdf",
          jobDocumentId: recordDocumentRef.id,
          recordDocumentId: recordDocumentRef.id,
          projectConversionStatus:
            shareType === "estimate" ? "pending" : "not_applicable",
          projectConversionError: "",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
      );

      transaction.set(
        recordDocumentRef,
        {
          id: recordDocumentRef.id,
          documentKind: "file",
          category: signedDocumentCategory,
          sourceType: "upload",
          title: signedDocumentTitle,
          note: signedDocumentNote,
          relatedDate: signedAt,
          externalUrl: "",
          fileUrl: pdfUrl,
          filePath: pdfPath,
          fileName: "signed-agreement.pdf",
          leadId: cleanNullableString(shareData.leadId),
          customerId: cleanNullableString(
            projectResult.customerLink.customerId,
          ),
          projectId: cleanNullableString(projectResult.projectId),
          agreementId: agreementRef.id,
          estimateVersionId: safeString(
            shareData.versionId || shareData.id,
          ),
          contentHash: safeString(shareData.contentHash),
          clientVisible: true,
          createdByUid: portalActor.uid,
          createdByName: portalActor.displayName,
          createdByRole: portalActor.role,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
      );

      transaction.set(
        shareRef,
        {
          status: "signed",
          signedAt,
          agreementId: agreementRef.id,
          projectId: projectResult.projectId,
          customerId: projectResult.customerLink.customerId,
          customerName: projectResult.customerLink.customerName,
          portalVisible: true,
          signerName,
          signerEmail,
          signerRole,
          signingAttemptId: null,
          signingRequestHash: null,
          signingStartedAt: null,
          pendingAgreementId: null,
          pendingRecordDocumentId: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      if (shareType === "change_order" && changeOrderRef) {
        transaction.set(
          changeOrderRef,
          {
            status: "approved",
            customerId: safeString(projectData.customerId),
            customerName: safeString(
              projectData.customerName || projectData.clientName,
            ),
            projectAddress: safeString(projectData.projectAddress),
            portalShareId: shareData.id,
            portalStatus: "signed",
            portalVisible: true,
            publishedAt:
              shareData.publishedAt ||
              shareData.createdAt ||
              FieldValue.serverTimestamp(),
            agreementId: agreementRef.id,
            signedAt,
            signerName,
            signerEmail,
            signerRole,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    });
    signedCommitted = true;
  } catch (error) {
    let signingStateConfirmed = false;
    try {
      const [latestShareSnap, latestAgreementSnap] =
        await Promise.all([
          shareRef.get(),
          agreementRef.get(),
        ]);
      const latestShareData = latestShareSnap.exists
        ? latestShareSnap.data() || {}
        : {};
      if (
        latestShareData.status === "signed" &&
        safeString(latestShareData.agreementId) ===
          agreementRef.id &&
        latestAgreementSnap.exists
      ) {
        signedCommitted = true;
        logger.warn(
          "Estimate signature commit returned an error but the signed record was verified.",
          {
            shareId: shareData.id,
            agreementId: agreementRef.id,
            error: error?.message || String(error),
          },
        );
      } else {
        signingStateConfirmed = true;
      }
    } catch (verificationError) {
      logger.error(
        "Estimate signature outcome could not be verified after an error.",
        {
          shareId: shareData.id,
          agreementId: agreementRef.id,
          error: verificationError?.message || String(verificationError),
        },
      );
    }

    if (!signedCommitted && signingStateConfirmed) {
      await Promise.all([
        deleteStoragePathIfPresent(pdfPath),
        deleteStoragePathIfPresent(signaturePath),
      ]);
      await releaseSigningReservation(
        shareRef,
        signingAttemptId,
        error,
      );
    }
    if (!signedCommitted) {
      throw error;
    }
  }

  let projectConversionStatus =
    shareType === "estimate" ? "pending" : "not_applicable";
  let projectConversionError = "";
  let createdProject = false;

  if (shareType === "estimate") {
    try {
      projectResult = await ensureProjectForLead({
        leadId: shareData.leadId,
        leadRef: currentLeadRef,
        leadData: currentLeadData,
        actorProfile: portalActor,
        requiredCustomerId: shareData.customerId,
        estimateDataOverride: estimateSnapshot,
      });
      createdProject = !projectResult.existing;
      projectConversionStatus = "complete";

      await Promise.all([
        agreementRef.set(
          {
            projectId: projectResult.projectId,
            projectConversionStatus,
            projectConversionError: "",
            projectConvertedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
        shareRef.set(
          {
            projectId: projectResult.projectId,
            projectConversionStatus,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
        recordDocumentRef.set(
          {
            projectId: projectResult.projectId,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
      ]);
    } catch (error) {
      projectConversionError = safeString(error?.message || error);
      logger.error(
        "Signed estimate project conversion will need retry.",
        {
          shareId: shareData.id,
          agreementId: agreementRef.id,
          leadId: shareData.leadId,
          error: projectConversionError,
        },
      );
      await Promise.allSettled([
        agreementRef.set(
          {
            projectConversionStatus: "pending",
            projectConversionError,
            projectConversionLastAttemptAt:
              FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
        shareRef.set(
          {
            projectConversionStatus: "pending",
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
      ]);
    }
  }

  const activityWrites = [];
  if (shareType === "estimate" && createdProject) {
    activityWrites.push(
      addLeadActivity(shareData.leadId, {
        activityType: "system",
        title: "Lead converted to job",
        body: "The signed estimate created the operational job from the exact published version.",
        actorName: portalActor.displayName,
        actorUid: portalActor.uid,
        actorRole: portalActor.role,
      }),
      addProjectActivity(projectResult.projectId, {
        activityType: "system",
        title: "Job created from signed estimate",
        body: projectResult.scopeItemCount
          ? `The job was created from the signed version and copied ${projectResult.scopeItemCount} estimate items into the scope tracker.`
          : "The job was created from the signed estimate version.",
        actorName: portalActor.displayName,
        actorUid: portalActor.uid,
        actorRole: portalActor.role,
      }),
    );
  }
  if (shareType === "estimate" && safeString(shareData.leadId)) {
    activityWrites.push(
      addLeadActivity(shareData.leadId, {
        activityType: "agreement",
        title: "Estimate agreement signed",
        body: `${signerName} signed estimate version ${toNumber(shareData.versionNumber || shareData.publishedVersion)}.`,
        actorName: portalActor.displayName,
        actorUid: portalActor.uid,
        actorRole: portalActor.role,
      }),
    );
  }
  if (
    shareType === "change_order" ||
    projectConversionStatus === "complete"
  ) {
    activityWrites.push(
      addProjectActivity(projectResult.projectId, {
        activityType: "agreement",
        title:
          shareType === "change_order"
            ? "Change order signed"
            : "Estimate agreement signed",
        body:
          shareType === "change_order"
            ? `${signerName} signed the published change order through the secure approval page.`
            : `${signerName} signed the exact published estimate version.`,
        actorName: portalActor.displayName,
        actorUid: portalActor.uid,
        actorRole: portalActor.role,
      }),
      addProjectActivity(projectResult.projectId, {
        activityType: "document",
        title:
          shareType === "change_order"
            ? "Signed change order filed"
            : "Signed agreement filed",
        body:
          "The signed PDF was stored with the immutable approval record.",
        actorName: portalActor.displayName,
        actorUid: portalActor.uid,
        actorRole: portalActor.role,
      }),
    );
  }
  const activityResults = await Promise.allSettled(activityWrites);
  activityResults
    .filter((result) => result.status === "rejected")
    .forEach((result) => {
      logger.warn(
        "Signed estimate activity could not be recorded.",
        result.reason,
      );
    });

  return {
    ok: true,
    status: "signed",
    type: shareType,
    agreementId: agreementRef.id,
    projectId: projectResult.projectId,
    versionId: safeString(shareData.versionId || shareData.id),
    contentHash: safeString(shareData.contentHash),
    signedAt: signedAt.toISOString(),
    projectConversionStatus,
    downloadHref: buildPublicAgreementDownloadHref(request, shareData.id),
  };
}

async function loadPublicAgreementDocumentData(token) {
  const shareToken = safeString(token);
  if (!shareToken) {
    const error = new Error("token is required.");
    error.status = 400;
    throw error;
  }

  const { shareData } = await fetchEstimateShareContext(shareToken);
  if (shareData.status !== "signed" || !safeString(shareData.agreementId)) {
    const error = new Error("Agreement not available.");
    error.status = 404;
    throw error;
  }

  const agreementSnap = await db
    .collection("agreements")
    .doc(shareData.agreementId)
    .get();
  if (!agreementSnap.exists) {
    const error = new Error("Agreement not available.");
    error.status = 404;
    throw error;
  }

  const agreementData = agreementSnap.data() || {};
  const pdfPath = safeString(agreementData.pdfPath);
  if (!pdfPath) {
    const error = new Error("Agreement file missing.");
    error.status = 404;
    throw error;
  }

  return {
    pdfPath,
    fileName: safeString(agreementData.pdfFileName) || "signed-agreement.pdf",
  };
}

async function fetchEstimateShareContext(token) {
  const shareId = safeString(token);
  const shareRef = db.collection("estimateShares").doc(shareId);
  const shareSnap = await shareRef.get();

  if (!shareSnap.exists) {
    const error = new Error("This estimate link is not available.");
    error.status = 404;
    throw error;
  }

  const shareData = {
    id: shareSnap.id,
    ...shareSnap.data(),
  };

  const shareType = normaliseShareType(shareData.type);

  if (!["estimate", "change_order"].includes(shareType)) {
    const error = new Error("This approval link is not supported.");
    error.status = 400;
    throw error;
  }

  shareData.type = shareType;

  return {
    shareRef,
    shareData,
  };
}

function vendorBillShouldMirrorExpense(vendorBillData = {}) {
  return (
    safeString(vendorBillData.projectId) !== "" &&
    normaliseVendorBillStatus(vendorBillData.status) !== "void"
  );
}

async function deleteMirroredVendorExpense(projectId, billId) {
  if (!projectId || !billId) {
    return;
  }

  await db
    .collection("projects")
    .doc(projectId)
    .collection("expenses")
    .doc(billId)
    .delete();
}

function buildMirroredVendorExpensePayload(
  vendorBillId,
  vendorBillData = {},
  existingExpense = {},
) {
  return {
    id: vendorBillId,
    amount: toNumber(vendorBillData.amount),
    category: safeString(vendorBillData.category || "vendor_bill"),
    vendor: safeString(vendorBillData.vendorName || "Vendor"),
    vendorId: safeString(vendorBillData.vendorId),
    vendorBillId,
    billNumber: safeString(vendorBillData.billNumber),
    billStatus: normaliseVendorBillStatus(vendorBillData.status),
    source: "vendor_bill",
    note: safeString(vendorBillData.note),
    relatedDate:
      vendorBillData.dueDate ||
      vendorBillData.invoiceDate ||
      existingExpense.relatedDate ||
      FieldValue.serverTimestamp(),
    receiptDocumentId: safeString(vendorBillData.invoiceDocumentId) || null,
    receiptTitle: safeString(
      vendorBillData.invoiceTitle ||
        vendorBillData.billNumber ||
        "Vendor invoice",
    ),
    receiptUrl: safeString(
      vendorBillData.invoiceFileUrl || vendorBillData.invoiceExternalUrl,
    ),
    createdByUid: safeString(
      vendorBillData.createdByUid || existingExpense.createdByUid || "system",
    ),
    createdByName: safeString(
      vendorBillData.createdByName ||
        existingExpense.createdByName ||
        "Golden Brick System",
    ),
    createdAt:
      existingExpense.createdAt ||
      vendorBillData.createdAt ||
      FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function syncVendorBillExpenseMirror(
  vendorBillId,
  beforeData = {},
  afterData = {},
) {
  const beforeProjectId = safeString(beforeData.projectId);
  const afterProjectId = safeString(afterData.projectId);
  const shouldMirrorAfter = vendorBillShouldMirrorExpense(afterData);

  if (
    beforeProjectId &&
    (!shouldMirrorAfter || beforeProjectId !== afterProjectId)
  ) {
    await deleteMirroredVendorExpense(beforeProjectId, vendorBillId);
  }

  if (!shouldMirrorAfter) {
    if (safeString(afterData.linkedExpenseId) !== "") {
      await db.collection("vendorBills").doc(vendorBillId).set(
        {
          linkedExpenseId: null,
        },
        { merge: true },
      );
    }
    return;
  }

  const projectRef = db.collection("projects").doc(afterProjectId);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    logger.warn(
      "Vendor bill mirror skipped because the linked project does not exist.",
      {
        vendorBillId,
        projectId: afterProjectId,
      },
    );
    return;
  }

  const expenseRef = projectRef.collection("expenses").doc(vendorBillId);
  const expenseSnap = await expenseRef.get();
  const existingExpense = expenseSnap.exists ? expenseSnap.data() : {};

  await expenseRef.set(
    buildMirroredVendorExpensePayload(vendorBillId, afterData, existingExpense),
    { merge: true },
  );

  if (safeString(afterData.linkedExpenseId) !== vendorBillId) {
    await db.collection("vendorBills").doc(vendorBillId).set(
      {
        linkedExpenseId: vendorBillId,
      },
      { merge: true },
    );
  }
}

async function syncProjectFinancials(projectId) {
  const projectRef = db.collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    return;
  }

  const [expensesSnap, paymentsSnap, changeOrdersSnap] = await Promise.all([
    projectRef.collection("expenses").get(),
    projectRef.collection("payments").get(),
    projectRef.collection("changeOrders").get(),
  ]);

  const summary = computeFinanceSummary(
    projectSnap.data(),
    expensesSnap.docs.map((snapshot) => snapshot.data()),
    paymentsSnap.docs.map((snapshot) => snapshot.data()),
    changeOrdersSnap.docs.map((snapshot) => snapshot.data()),
  );
  const projectData = projectSnap.data() || {};
  const updates = {
    baseContractValue: summary.baseContractValue,
    approvedChangeOrdersTotal: summary.approvedChangeOrdersTotal,
    totalContractRevenue: summary.totalContractRevenue,
    cashPosition: summary.cashPosition,
    balanceRemaining: summary.balanceRemaining,
    jobValue: summary.totalContractRevenue,
    financials: summary,
    updatedAt: FieldValue.serverTimestamp(),
  };
  const shouldAutoLockCommission =
    projectData.commissionLocked !== true &&
    safeString(projectData.status) === "completed";

  if (shouldAutoLockCommission) {
    updates.commissionLocked = true;
    updates.lockedCommissionSnapshot = buildLockedCommissionSnapshot(summary);
  }

  await projectRef.set(updates, { merge: true });

  if (shouldAutoLockCommission) {
    await addProjectActivity(projectId, {
      activityType: "commission",
      title: "Commission locked",
      body: "The job was marked completed and the payout snapshot was locked.",
      actorName: "Golden Brick System",
      actorUid: "system",
      actorRole: "system",
    });
  }
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
    db.collection("projects").where("customerId", "==", customerId).get(),
  ]);

  const leads = leadSnap.docs.map((snapshot) => ({
    id: snapshot.id,
    ...snapshot.data(),
  }));
  const projects = projectSnap.docs.map((snapshot) => ({
    id: snapshot.id,
    ...snapshot.data(),
  }));
  const existing = customerSnap.data() || {};
  const latestLead = latestByUpdated(leads);
  const latestProject = latestByUpdated(projects);
  const openLeads = leads.filter((lead) =>
    ["new_lead", "follow_up", "estimate_sent"].includes(lead.status),
  );
  const wonLeadIds = leads
    .filter((lead) => lead.status === "closed_won")
    .map((lead) => lead.id);
  const lostLeadIds = leads
    .filter((lead) => lead.status === "closed_lost")
    .map((lead) => lead.id);
  const leadIds = leads.map((lead) => lead.id);
  const jobIds = projects.map((project) => project.id);
  const allowedStaffUids = uniqueValues([
    ...leads.map((lead) => lead.assignedToUid),
    ...projects.flatMap((project) => [
      project.assignedLeadOwnerUid,
      ...(project.assignedWorkerIds || []),
      ...(project.allowedStaffUids || []),
    ]),
  ]);
  const estimateLead = latestByUpdated(
    openLeads.filter((lead) => Boolean(lead.hasEstimate)),
  );
  const totalWonSales = projects.reduce((sum, project) => {
    return (
      sum +
      toNumber(
        project.totalContractRevenue ||
          project.jobValue ||
          project.baseContractValue ||
          0,
      )
    );
  }, 0);
  const totalPaymentsReceived = projects.reduce(
    (sum, project) =>
      sum + toNumber(project.financials && project.financials.totalPayments),
    0,
  );

  await customerRef.set(
    {
      name: safeString(
        existing.name ||
          latestLead?.clientName ||
          latestProject?.clientName ||
          "Unnamed customer",
      ),
      primaryEmail: safeString(
        existing.primaryEmail ||
          latestLead?.clientEmail ||
          latestProject?.clientEmail,
      ),
      primaryPhone: safeString(
        existing.primaryPhone ||
          latestLead?.clientPhone ||
          latestProject?.clientPhone,
      ),
      primaryAddress: safeString(
        existing.primaryAddress ||
          latestLead?.projectAddress ||
          latestProject?.projectAddress,
      ),
      searchEmail: normaliseEmail(
        existing.searchEmail ||
          existing.primaryEmail ||
          latestLead?.clientEmail ||
          latestProject?.clientEmail,
      ),
      searchPhone: normalisePhone(
        existing.searchPhone ||
          existing.primaryPhone ||
          latestLead?.clientPhone ||
          latestProject?.clientPhone,
      ),
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
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

function buildServiceOrderInvoiceNumber(projectId, issueDate = new Date()) {
  const projectKey = safeString(projectId).slice(-4).toUpperCase() || "JOB";
  const datePart = new Intl.DateTimeFormat("en-CA")
    .format(issueDate)
    .replaceAll("-", "");
  return `GB-${datePart}-${projectKey}-SO1`;
}

async function createServiceOrderArtifacts({
  payload = {},
  serviceTemplate,
  customerLink,
  actorProfile = {},
}) {
  const createdAt = FieldValue.serverTimestamp();
  const projectRef = db.collection("projects").doc();
  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + 7);
  const ownerUid = safeString(payload.assignedLeadOwnerUid || actorProfile.uid);
  const requestedWorkerUids = uniqueValues([
    ownerUid,
    ...(Array.isArray(payload.assignedWorkerUids)
      ? payload.assignedWorkerUids
      : []),
  ]);
  const staffProfiles = await fetchStaffSummariesByUid(requestedWorkerUids);
  const assignedWorkers = buildAssignedWorkers(
    staffProfiles,
    ownerUid,
    actorProfile,
  );
  const allowedStaffUids = uniqueValues([
    ownerUid,
    ...assignedWorkers.map((worker) => worker.uid),
  ]);
  const lineItems = serviceTemplateLineItemsForAmount(
    serviceTemplate,
    payload.priceOverride,
  );
  const subtotal = Number(
    lineItems.reduce((sum, item) => sum + toNumber(item.amount), 0).toFixed(2),
  );
  const financials = computeFinanceSummary(
    {
      baseContractValue: subtotal,
      assignedWorkers,
    },
    [],
    [],
    [],
  );
  const paymentRequirement =
    safeString(
      payload.paymentRequirement || serviceTemplate.defaultPaymentRequirement,
    ) || "upfront_required";
  const billingStatus = serviceOrderBillingStatus(
    paymentRequirement,
    financials.totalContractRevenue,
    0,
    false,
  );
  const serviceTemplateSnapshot = {
    id: serviceTemplate.id,
    internalName: serviceTemplate.internalName,
    clientTitle: serviceTemplate.clientTitle,
    defaultPrice: toNumber(serviceTemplate.defaultPrice),
    defaultSummary: safeString(serviceTemplate.defaultSummary),
    defaultPlanningNotes: safeString(serviceTemplate.defaultPlanningNotes),
    defaultPaymentRequirement: safeString(
      serviceTemplate.defaultPaymentRequirement,
    ),
    defaultInvoiceLines: serviceTemplate.defaultInvoiceLines || [],
    resolvedLineItems: lineItems,
    resolvedSubtotal: subtotal,
  };
  const projectPayload = {
    id: projectRef.id,
    leadId: null,
    customerId: customerLink.customerId,
    customerName: customerLink.customerName,
    clientName: safeString(payload.clientName),
    clientEmail: normaliseEmail(payload.clientEmail),
    clientPhone: safeString(payload.clientPhone),
    projectAddress: safeString(payload.clientAddress),
    projectType: safeString(serviceTemplate.clientTitle || "Service order"),
    status: "in_progress",
    jobKind: "service_order",
    serviceTemplateId: serviceTemplate.id,
    serviceTemplateSnapshot,
    paymentRequirement,
    billingStatus,
    planningNotes: safeString(serviceTemplate.defaultPlanningNotes),
    baseContractValue: financials.baseContractValue,
    approvedChangeOrdersTotal: financials.approvedChangeOrdersTotal,
    totalContractRevenue: financials.totalContractRevenue,
    cashPosition: financials.cashPosition,
    balanceRemaining: financials.balanceRemaining,
    jobValue: financials.totalContractRevenue,
    assignedLeadOwnerUid: ownerUid || null,
    assignedWorkers,
    assignedWorkerIds: assignedWorkers
      .map((worker) => worker.uid)
      .filter(Boolean),
    allowedStaffUids,
    phaseLabel: "Service order",
    nextStep:
      paymentRequirement === "upfront_required"
        ? "Generate and send the payment link before starting delivery."
        : "Delivery can begin now or once the client approves the scope.",
    sharedStatusNote:
      paymentRequirement === "upfront_required"
        ? "This service order is ready. Send the Stripe payment link from the invoice tab to collect payment."
        : "This service order is open. The team can begin work and collect payment using the invoice tab when ready.",
    commissionLocked: false,
    lockedCommissionSnapshot: null,
    financials,
    createdAt,
    updatedAt: createdAt,
  };
  const invoiceRef = projectRef.collection("invoices").doc();
  const invoicePayload = {
    id: invoiceRef.id,
    projectId: projectRef.id,
    leadId: null,
    customerId: customerLink.customerId,
    customerName: customerLink.customerName,
    clientName: safeString(payload.clientName),
    projectAddress: safeString(payload.clientAddress),
    projectType: safeString(serviceTemplate.clientTitle || "Service order"),
    title: `${safeString(serviceTemplate.clientTitle || serviceTemplate.internalName || "Service order")} invoice`,
    invoiceNumber: buildServiceOrderInvoiceNumber(projectRef.id, issueDate),
    status: "draft",
    issueDate,
    dueDate,
    summary: safeString(serviceTemplate.defaultSummary),
    customFields: [
      {
        label: "Service",
        value: safeString(
          serviceTemplate.clientTitle ||
            serviceTemplate.internalName ||
            "Service order",
        ),
      },
      {
        label: "Billing",
        value:
          paymentRequirement === "upfront_required"
            ? "Upfront payment required"
            : "Can pay later",
      },
    ],
    lineItems,
    subtotal,
    notes:
      paymentRequirement === "upfront_required"
        ? "Payment is required before delivery begins. Use the Golden Brick payment link when you are ready to collect."
        : "This invoice can be sent now or after delivery, depending on the service arrangement.",
    paymentRequirement,
    paidAt: null,
    paymentMethod: "",
    paymentReference: "",
    paymentNote: "",
    paymentRecordId: null,
    stripeCheckoutUrl: "",
    stripeCheckoutSessionId: "",
    stripePaymentStatus: "",
    stripeCheckoutFingerprint: buildInvoiceFingerprint({
      title: `${safeString(serviceTemplate.clientTitle || serviceTemplate.internalName || "Service order")} invoice`,
      issueDate,
      dueDate,
      summary: safeString(serviceTemplate.defaultSummary),
      customFields: [
        {
          label: "Service",
          value: safeString(
            serviceTemplate.clientTitle ||
              serviceTemplate.internalName ||
              "Service order",
          ),
        },
        {
          label: "Billing",
          value:
            paymentRequirement === "upfront_required"
              ? "Upfront payment required"
              : "Can pay later",
        },
      ],
      lineItems,
      subtotal,
      notes:
        paymentRequirement === "upfront_required"
          ? "Payment is required before delivery begins. Use the Golden Brick payment link when you are ready to collect."
          : "This invoice can be sent now or after delivery, depending on the service arrangement.",
    }),
    stripeLinkCreatedAt: null,
    createdAt,
    updatedAt: createdAt,
    createdByUid: actorProfile.uid,
    createdByName: actorProfile.displayName,
  };

  const batch = db.batch();
  batch.set(projectRef, projectPayload, { merge: true });
  batch.set(invoiceRef, invoicePayload, { merge: true });
  await batch.commit();

  await addProjectActivity(projectRef.id, {
    activityType: "system",
    title: "Service order created",
    body: `${safeString(serviceTemplate.clientTitle || serviceTemplate.internalName || "Service order")} was opened with a draft invoice for ${formatCurrency(subtotal)}.`,
    actorName: actorProfile.displayName,
    actorUid: actorProfile.uid,
    actorRole: actorProfile.role,
  });

  return {
    projectId: projectRef.id,
    invoiceId: invoiceRef.id,
    projectPayload,
    invoicePayload,
    billingStatus,
    subtotal,
  };
}

async function expireCheckoutSessionIfNeeded(stripe, sessionId) {
  const checkoutSessionId = safeString(sessionId);
  if (!checkoutSessionId) {
    return;
  }

  try {
    await stripe.checkout.sessions.expire(checkoutSessionId);
  } catch (error) {
    logger.warn("Stripe checkout session could not be expired.", {
      sessionId: checkoutSessionId,
      error: error?.message || String(error),
    });
  }
}

exports.createServiceOrder = onRequest(
  PUBLIC_CORS_HTTP_OPTIONS,
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
          message: "Only admins can create service orders.",
        });
        return;
      }

      const payload = await parseRequestPayload(request);
      if (!safeString(payload.clientName)) {
        respondJson(response, 400, {
          ok: false,
          message: "Client name is required.",
        });
        return;
      }

      if (
        !safeString(payload.clientPhone) &&
        !safeString(payload.clientEmail)
      ) {
        respondJson(response, 400, {
          ok: false,
          message: "Client phone or email is required.",
        });
        return;
      }

      const serviceTemplate = await fetchServiceTemplate(payload.templateId);
      const customerLink = await ensureServiceOrderCustomer({
        customerId: safeString(payload.customerId),
        clientName: safeString(payload.clientName),
        clientEmail: safeString(payload.clientEmail),
        clientPhone: safeString(payload.clientPhone),
        projectAddress: safeString(payload.clientAddress),
        assignedToUid: safeString(
          payload.assignedLeadOwnerUid || staff.profile.uid,
        ),
      });
      const created = await createServiceOrderArtifacts({
        payload,
        serviceTemplate,
        customerLink,
        actorProfile: staff.profile,
      });

      respondJson(response, 200, {
        ok: true,
        projectId: created.projectId,
        invoiceId: created.invoiceId,
        customerId: customerLink.customerId,
        customerName: customerLink.customerName,
        matchResult: customerLink.matchResult,
        billingStatus: created.billingStatus,
      });
    } catch (error) {
      logger.error("Service order creation failed.", error);
      respondJson(response, error.status || 500, {
        ok: false,
        message: error.message || "Could not create the service order.",
        matchResult: error.matchResult || null,
        customerMatchIds: error.customerMatchIds || [],
      });
    }
  },
);

exports.createServiceCheckout = onRequest(
  PUBLIC_CORS_HTTP_OPTIONS,
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
          message: "Only admins can generate payment links.",
        });
        return;
      }

      logger.warn(
        "Stripe checkout requested while Stripe is temporarily disabled.",
        {
          requestedByUid: staff.profile.uid,
          requestedByRole: staff.profile.role,
        },
      );

      respondJson(response, 503, {
        ok: false,
        disabled: true,
        message: STRIPE_DISABLED_MESSAGE,
      });
    } catch (error) {
      logger.error("Stripe checkout generation failed.", error);
      respondJson(response, error.status || 500, {
        ok: false,
        message: error.message || "Could not create the payment link.",
      });
    }
  },
);

exports.stripeWebhook = onRequest(
  {
    ...PUBLIC_HTTP_OPTIONS,
    cors: false,
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).send("Method not allowed.");
      return;
    }

    logger.warn("Stripe webhook hit while Stripe is temporarily disabled.");
    response.status(200).json({
      received: false,
      disabled: true,
      message: STRIPE_DISABLED_MESSAGE,
    });
  },
);

exports.publicLeadIntake = buildPublicLeadIntake({
  db,
  FieldValue,
  resolveLeadAssignee,
  ensureLeadCustomerLink,
  addLeadActivity,
  statusLabel,
  parseRequestPayload,
  logger,
});

exports.syncStaffSession = onRequest(
  PUBLIC_CORS_HTTP_OPTIONS,
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
      const decoded = await verifyStaffIdToken(request);
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
          updatedAt: FieldValue.serverTimestamp(),
        };
        await allowedRef.set(allowedData, { merge: true });
      }

      if (!allowedData || allowedData.active !== true) {
        respondJson(response, 403, {
          ok: false,
          authorised: false,
          message: "This Google account is not approved for the staff portal.",
        });
        return;
      }

      let templateSynced = true;
      try {
        await Promise.all([
          ensureDefaultTemplate(),
          ensureDefaultServiceTemplates(),
        ]);
      } catch (error) {
        templateSynced = false;
        logger.warn(
          "Default estimate template sync degraded during staff login.",
          error,
        );
      }

      const profile = buildStaffProfile(decoded, allowedData);

      await Promise.all([
        db
          .collection("users")
          .doc(decoded.uid)
          .set(
            {
              ...profile,
              createdAt: allowedData.createdAt || FieldValue.serverTimestamp(),
            },
            { merge: true },
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
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
      ]);

      let claimsSynced = true;
      try {
        await admin.auth().setCustomUserClaims(decoded.uid, {
          role: profile.role,
          staff: true,
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
        templateSynced,
        profile: serialiseStaffProfile(profile),
      });
    } catch (error) {
      logger.error("Staff session sync failed.", error);
      const status = httpStatusForError(error, 503);
      respondJson(response, status, {
        ok: false,
        authorised: false,
        message: error.message || "Could not verify this staff account.",
      });
    }
  },
);

exports.syncLeadCustomerLink = onRequest(
  PUBLIC_CORS_HTTP_OPTIONS,
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
          message: "leadId is required.",
        });
        return;
      }

      const { leadRef, leadData } = await verifyLeadStaffAccess(
        leadId,
        staff.profile,
      );
      const customerLink = await ensureLeadCustomerLink(leadRef, leadData);
      await syncRecordDocumentLinksForLead(leadId, {
        ...leadData,
        customerId: customerLink.customerId || null,
        customerName: customerLink.customerName || "",
        wonProjectId: leadData.wonProjectId || null,
      });

      respondJson(response, 200, {
        ok: true,
        ...customerLink,
      });
    } catch (error) {
      logger.error("Lead customer sync failed.", error);
      respondJson(response, httpStatusForError(error), {
        ok: false,
        message: error.message || "Could not sync the lead customer.",
      });
    }
  },
);

function normaliseEstimateSigningMode(value, readinessBlockers = []) {
  const requested = safeString(value).toLowerCase();
  if (requested && !["review", "signature"].includes(requested)) {
    throw httpError("Unsupported estimate publishing mode.", 400);
  }
  if (requested === "signature" && readinessBlockers.length) {
    throw httpError(
      "Complete the signable agreement details before publishing for signature.",
      400,
    );
  }
  return requested || (readinessBlockers.length ? "review" : "signature");
}

function estimateLeadIdentityHash(leadData = {}) {
  return sha256Hex({
    customerId: safeString(leadData.customerId),
    clientName: safeString(leadData.clientName),
    clientEmail: normaliseEmail(leadData.clientEmail),
    clientPhone: normalisePhone(leadData.clientPhone),
    projectAddress: safeString(leadData.projectAddress),
    projectType: safeString(leadData.projectType),
  });
}

async function publishEstimateDraftVersion({
  request,
  payload,
  staff,
  leadId,
  initialLeadData,
}) {
  // Publishing accepts the editor's current draft and commits that draft plus
  // its frozen client version together. It must never re-read a different
  // estimate document as the source of the published content.
  const idempotencyKey = safeString(payload.idempotencyKey);
  if (!idempotencyKey) {
    throw httpError(
      "A publishing request key is required. Reload the estimate and try again.",
      400,
    );
  }
  if (idempotencyKey.length > 200) {
    throw httpError("The publishing request key is invalid.", 400);
  }

  const draft = normaliseSubmittedEstimateDraft(
    payload.estimateDraft || payload.draft,
    leadId,
  );
  const draftHash = sha256Hex({
    schemaVersion: ESTIMATE_VERSION_SCHEMA_VERSION,
    leadId,
    draft,
    requestedSigningMode: safeString(
      payload.signingMode || payload.publishMode,
    ).toLowerCase(),
  });
  const requestRef = estimatePublishRequestRef(
    staff.profile.uid,
    leadId,
    idempotencyKey,
  );
  const existingRequestSnap = await requestRef.get();

  if (existingRequestSnap.exists) {
    const existingRequest = existingRequestSnap.data() || {};
    if (
      safeString(existingRequest.leadId) !== leadId ||
      safeString(existingRequest.draftHash) !== draftHash
    ) {
      throw httpError(
        "This publishing request key was already used for different estimate content.",
        409,
      );
    }

    const existingShareId = safeString(existingRequest.shareId);
    const [existingShareSnap, savedDraftSnap] = await Promise.all([
      db.collection("estimateShares").doc(existingShareId).get(),
      db.collection("estimates").doc(leadId).get(),
    ]);
    if (existingShareSnap.exists) {
      const existingShare = {
        id: existingShareSnap.id,
        ...existingShareSnap.data(),
      };
      const frozenDraft = existingShare.estimateSnapshot || {};
      return {
        share: serialiseEstimateShare(existingShare, request),
        draft: frozenDraft.subject
          ? {
              id: leadId,
              leadId,
              status: "draft",
              subject: frozenDraft.subject,
              emailBody: frozenDraft.emailBody,
              contractDetails: frozenDraft.contractDetails,
              assumptions: frozenDraft.assumptions,
              lineItems: frozenDraft.lineItems,
              subtotal: frozenDraft.subtotal,
              updatedAt:
                existingShare.publishedAt ||
                existingShare.createdAt,
            }
          : savedDraftSnap.exists
          ? {
              id: savedDraftSnap.id,
              ...savedDraftSnap.data(),
            }
          : draft,
        versionId: safeString(
          existingShare.versionId || existingShare.id,
        ),
        versionNumber: toNumber(
          existingShare.versionNumber ||
            existingShare.publishedVersion,
        ),
        contentHash: safeString(existingShare.contentHash),
        unchanged: Boolean(existingRequest.unchanged),
        idempotent: true,
        createdVersion: false,
        projectExists: Boolean(existingShare.projectId),
      };
    }
  }

  const [template, customerResolution] = await Promise.all([
    fetchTemplate(),
    resolveEstimatePublishCustomer(initialLeadData),
  ]);
  const leadIdentityHash = estimateLeadIdentityHash(initialLeadData);
  const leadSnapshot = minimalLeadSnapshot({
    id: leadId,
    ...initialLeadData,
    customerId: customerResolution.customerId,
    customerName: customerResolution.customerName,
  });
  const estimateSnapshot = {
    ...normaliseEstimateSnapshot(draft, template),
    id: leadId,
    leadId,
    customerId: customerResolution.customerId,
    schemaVersion: ESTIMATE_VERSION_SCHEMA_VERSION,
  };
  const agreementSnapshot = {
    ...normaliseAgreementSnapshot(template),
    schemaVersion: ESTIMATE_VERSION_SCHEMA_VERSION,
  };
  const readinessBlockers = agreementReadinessBlockers(
    estimateSnapshot.contractDetails || {},
  );
  const signingMode = normaliseEstimateSigningMode(
    payload.signingMode || payload.publishMode,
    readinessBlockers,
  );
  if (signingMode === "signature" && !leadSnapshot.clientEmail) {
    const contactsSnap = await customerResolution.customerRef
      .collection("contacts")
      .get();
    const hasAuthorizedSigner = contactsSnap.docs.some((snapshot) => {
      const contact = snapshot.data() || {};
      return Boolean(
        normaliseEmail(contact.email) &&
          !contact.disabledAt &&
          !contact.revokedAt &&
          safeString(contact.status || "active") !== "revoked" &&
          portalContactCanSign(contact.role || contact.accessScope),
      );
    });
    if (!hasAuthorizedSigner) {
      throw httpError(
        "Add a client email or an active primary or partner portal contact before publishing for signature.",
        400,
      );
    }
  }
  const readyToSign =
    signingMode === "signature" && readinessBlockers.length === 0;
  const contentHash = estimateVersionContentHash({
    leadId,
    customerId: customerResolution.customerId,
    leadSnapshot,
    estimateSnapshot,
    agreementSnapshot,
    signingMode,
  });
  const proposedShareId = createOpaqueId();
  const proposedShareRef = db
    .collection("estimateShares")
    .doc(proposedShareId);
  const estimateRef = db.collection("estimates").doc(leadId);
  const leadRef = db.collection("leads").doc(leadId);
  const projectRef = db.collection("projects").doc(leadId);
  const sharesQuery = db
    .collection("estimateShares")
    .where("leadId", "==", leadId);

  const transactionResult = await db.runTransaction(async (transaction) => {
    const requestSnap = await transaction.get(requestRef);
    if (requestSnap.exists) {
      const requestData = requestSnap.data() || {};
      if (
        safeString(requestData.leadId) !== leadId ||
        safeString(requestData.draftHash) !== draftHash
      ) {
        throw httpError(
          "This publishing request key was already used for different estimate content.",
          409,
        );
      }

      const requestShareId = safeString(requestData.shareId);
      const requestShareSnap = await transaction.get(
        db.collection("estimateShares").doc(requestShareId),
      );
      if (!requestShareSnap.exists) {
        throw httpError(
          "The prior publishing request is incomplete. Use a new request key.",
          409,
        );
      }

      const requestShareData = {
        id: requestShareSnap.id,
        ...requestShareSnap.data(),
      };
      return {
        shareId: requestShareSnap.id,
        versionId: safeString(
          requestShareData.versionId || requestShareSnap.id,
        ),
        versionNumber: toNumber(
          requestShareData.versionNumber ||
            requestShareData.publishedVersion,
        ),
        contentHash: safeString(requestShareData.contentHash),
        unchanged: Boolean(requestData.unchanged),
        idempotent: true,
        createdVersion: false,
        projectExists: Boolean(requestShareData.projectId),
      };
    }

    const [
      currentLeadSnap,
      currentEstimateSnap,
      customerSnap,
      currentProjectSnap,
      sharesSnap,
    ] = await Promise.all([
      transaction.get(leadRef),
      transaction.get(estimateRef),
      transaction.get(customerResolution.customerRef),
      transaction.get(projectRef),
      transaction.get(sharesQuery),
    ]);

    if (!currentLeadSnap.exists) {
      throw httpError("Lead not found.", 404);
    }

    const currentLeadData = currentLeadSnap.data() || {};
    const canAccess =
      staff.profile.role === "admin" ||
      safeString(currentLeadData.assignedToUid) ===
        safeString(staff.profile.uid);
    if (!canAccess) {
      throw httpError("You do not have access to this lead.", 403);
    }
    if (estimateLeadIdentityHash(currentLeadData) !== leadIdentityHash) {
      throw httpError(
        "The lead or customer changed while this estimate was being published. Reload the lead and review it before publishing.",
        409,
      );
    }
    if (
      safeString(currentLeadData.customerId) &&
      safeString(currentLeadData.customerId) !==
        customerResolution.customerId
    ) {
      throw httpError(
        "This lead is connected to a different customer. Reload the lead before publishing.",
        409,
      );
    }

    const currentCustomerData = customerSnap.exists
      ? customerSnap.data() || {}
      : {};
    if (
      customerSnap.exists &&
      !customerIdentityMatchesLead(currentCustomerData, currentLeadData)
    ) {
      const error = new Error(
        "The connected customer no longer matches this lead. Review the customer connection before publishing.",
      );
      error.status = 409;
      error.matchResult = "review_required";
      error.customerMatchIds = [customerResolution.customerId];
      throw error;
    }

    const estimateShares = sharesSnap.docs
      .map((snapshot) => ({
        id: snapshot.id,
        ...snapshot.data(),
      }))
      .filter(
        (share) => normaliseShareType(share.type) === "estimate",
      );
    const activeShares = estimateShares.filter(
      (share) => safeString(share.status) === "active",
    );
    const signingShares = estimateShares.filter(
      (share) => safeString(share.status) === "signing",
    );
    const inFlightSignature = signingShares.find(
      (share) => !signingLeaseExpired(share),
    );
    if (inFlightSignature) {
      throw httpError(
        "This estimate is currently being signed. Wait for that signature to finish before publishing another version.",
        409,
      );
    }
    const replaceableShares = [
      ...activeShares,
      ...signingShares.filter((share) =>
        signingLeaseExpired(share),
      ),
    ];
    const mismatchedActiveShare = replaceableShares.find(
      (share) =>
        safeString(share.customerId) !== customerResolution.customerId,
    );
    if (mismatchedActiveShare) {
      throw httpError(
        "An active estimate for this lead is connected to a different customer. Revoke that link before publishing.",
        409,
      );
    }

    const sameActiveShare = activeShares.find(
      (share) =>
        safeString(share.leadId) === leadId &&
        safeString(share.customerId) ===
          customerResolution.customerId &&
        safeString(share.contentHash) === contentHash &&
        safeString(share.signingMode || share.publishMode) ===
          signingMode &&
        estimateSnapshotAvailable(share),
    );
    const nextVersion =
      estimateShares.reduce(
        (maxVersion, share) =>
          Math.max(
            maxVersion,
            toNumber(
              share.versionNumber || share.publishedVersion,
            ),
          ),
        0,
      ) + 1;
    const nextLeadStatus = ["new_lead", "follow_up"].includes(
      safeString(currentLeadData.status),
    )
      ? "estimate_sent"
      : safeString(currentLeadData.status || "estimate_sent");
    const customerPayload = buildCustomerPayloadFromLead(
      currentLeadData,
      currentCustomerData,
    );
    const draftPayload = {
      ...draft,
      draftContentHash: draftHash,
      createdAt: currentEstimateSnap.exists
        ? currentEstimateSnap.data()?.createdAt ||
          FieldValue.serverTimestamp()
        : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastEditedByUid: staff.profile.uid,
      lastEditedByName: staff.profile.displayName,
    };

    transaction.set(
      customerResolution.customerRef,
      {
        id: customerResolution.customerId,
        ...customerPayload,
        createdAt:
          currentCustomerData.createdAt ||
          FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(estimateRef, draftPayload);
    transaction.set(
      leadRef,
      {
        status: nextLeadStatus,
        statusLabel: statusLabel(nextLeadStatus),
        customerId: customerResolution.customerId,
        customerName: customerResolution.customerName,
        customerMatchResult: customerSnap.exists ? "linked" : "created",
        customerReviewRequired: false,
        customerMatchIds: [customerResolution.customerId],
        hasEstimate: true,
        estimateSubtotal: draft.subtotal,
        estimateTitle: draft.subject,
        estimateUpdatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (sameActiveShare) {
      transaction.set(
        estimateRef,
        {
          lastPublishedVersionId: safeString(
            sameActiveShare.versionId || sameActiveShare.id,
          ),
          lastPublishedVersionNumber: toNumber(
            sameActiveShare.versionNumber ||
              sameActiveShare.publishedVersion,
          ),
          lastPublishedContentHash: contentHash,
          lastPublishedAt:
            sameActiveShare.publishedAt ||
            sameActiveShare.createdAt ||
            FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      transaction.set(
        requestRef,
        {
          id: requestRef.id,
          idempotencyKeyHash: sha256Hex(idempotencyKey),
          leadId,
          customerId: customerResolution.customerId,
          shareId: sameActiveShare.id,
          versionId: safeString(
            sameActiveShare.versionId || sameActiveShare.id,
          ),
          versionNumber: toNumber(
            sameActiveShare.versionNumber ||
              sameActiveShare.publishedVersion,
          ),
          draftHash,
          contentHash,
          unchanged: true,
          createdByUid: staff.profile.uid,
          createdAt: FieldValue.serverTimestamp(),
        },
      );
      return {
        shareId: sameActiveShare.id,
        versionId: safeString(
          sameActiveShare.versionId || sameActiveShare.id,
        ),
        versionNumber: toNumber(
          sameActiveShare.versionNumber ||
            sameActiveShare.publishedVersion,
        ),
        contentHash,
        unchanged: true,
        idempotent: false,
        createdVersion: false,
        projectExists: currentProjectSnap.exists,
      };
    }

    replaceableShares.forEach((share) => {
      transaction.set(
        db.collection("estimateShares").doc(share.id),
        {
          status: "replaced",
          portalVisible: false,
          replacedAt: FieldValue.serverTimestamp(),
          replacedByShareId: proposedShareId,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    transaction.set(
      proposedShareRef,
      {
        id: proposedShareId,
        versionId: proposedShareId,
        type: "estimate",
        status: "active",
        schemaVersion: ESTIMATE_VERSION_SCHEMA_VERSION,
        contentHash,
        leadId,
        customerId: customerResolution.customerId,
        customerName: customerResolution.customerName,
        projectId: currentProjectSnap.exists ? leadId : null,
        leadSnapshot,
        projectSnapshot: currentProjectSnap.exists
          ? minimalProjectSnapshot(
              currentProjectSnap.data() || {},
              leadSnapshot,
            )
          : {},
        estimateSnapshot,
        agreementSnapshot,
        publishedVersion: nextVersion,
        versionNumber: nextVersion,
        signingMode,
        publishMode: signingMode,
        readyToSign,
        readinessBlockers,
        publishedAt: FieldValue.serverTimestamp(),
        portalVisible: true,
        createdByUid: staff.profile.uid,
        createdByName: staff.profile.displayName,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        revokedAt: null,
        replacedAt: null,
        lastViewedAt: null,
        signedAt: null,
        agreementId: null,
      },
    );
    transaction.set(
      estimateRef,
      {
        lastPublishedVersionId: proposedShareId,
        lastPublishedVersionNumber: nextVersion,
        lastPublishedContentHash: contentHash,
        lastPublishedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(
      requestRef,
      {
        id: requestRef.id,
        idempotencyKeyHash: sha256Hex(idempotencyKey),
        leadId,
        customerId: customerResolution.customerId,
        shareId: proposedShareId,
        versionId: proposedShareId,
        versionNumber: nextVersion,
        draftHash,
        contentHash,
        unchanged: false,
        createdByUid: staff.profile.uid,
        createdAt: FieldValue.serverTimestamp(),
      },
    );

    return {
      shareId: proposedShareId,
      versionId: proposedShareId,
      versionNumber: nextVersion,
      contentHash,
      unchanged: false,
      idempotent: false,
      createdVersion: true,
      projectExists: currentProjectSnap.exists,
    };
  });

  const [publishedShareSnap, savedDraftSnap] = await Promise.all([
    db
      .collection("estimateShares")
      .doc(transactionResult.shareId)
      .get(),
    estimateRef.get(),
  ]);
  if (!publishedShareSnap.exists) {
    throw httpError(
      "The estimate was saved, but its published version could not be loaded.",
      503,
    );
  }

  const publishedShare = {
    id: publishedShareSnap.id,
    ...publishedShareSnap.data(),
  };
  const publishedDraftSnapshot =
    publishedShare.estimateSnapshot || {};
  return {
    ...transactionResult,
    share: serialiseEstimateShare(publishedShare, request),
    draft: safeString(publishedDraftSnapshot.subject)
      ? {
          id: leadId,
          leadId,
          status: "draft",
          subject: publishedDraftSnapshot.subject,
          emailBody: publishedDraftSnapshot.emailBody,
          contractDetails: publishedDraftSnapshot.contractDetails,
          assumptions: publishedDraftSnapshot.assumptions,
          lineItems: publishedDraftSnapshot.lineItems,
          subtotal: publishedDraftSnapshot.subtotal,
          updatedAt:
            publishedShare.publishedAt ||
            publishedShare.createdAt,
        }
      : savedDraftSnap.exists
        ? {
            id: savedDraftSnap.id,
            ...savedDraftSnap.data(),
          }
        : draft,
  };
}

async function handleEstimateShareRequest({ request, payload, staff }) {
  const recordType = normaliseShareType(payload.type);
  const leadId = safeString(payload.leadId);
  const projectId = safeString(payload.projectId);
  const changeOrderId = safeString(payload.changeOrderId);
  const requestedShareId = safeString(payload.shareId);
  const action = safeString(payload.action || "get").toLowerCase();

  let leadRef = null;
  let leadData = {};
  let projectData = {};
  let shares = [];
  let existingProjectSnap = null;

  if (recordType === "change_order") {
    if (!projectId || !changeOrderId) {
      return {
        status: 400,
        payload: {
          ok: false,
          message: "projectId and changeOrderId are required.",
        },
      };
    }

    const projectContext = await verifyProjectStaffAccess(
      projectId,
      staff.profile,
    );
    projectData = projectContext.projectData || {};
    shares = await fetchChangeOrderShares(projectId, changeOrderId);
  } else {
    if (!leadId) {
      return {
        status: 400,
        payload: {
          ok: false,
          message: "leadId is required.",
        },
      };
    }

    const leadContext = await verifyLeadStaffAccess(leadId, staff.profile);
    leadRef = leadContext.leadRef;
    leadData = leadContext.leadData;
    existingProjectSnap = await db.collection("projects").doc(leadId).get();
    if (existingProjectSnap.exists) {
      projectData = existingProjectSnap.data() || {};
    }
    shares = await fetchLeadShares(leadId, "estimate");
  }

  const currentShare = pickCurrentEstimateShare(shares);
  const targetShare = requestedShareId
    ? shares.find((share) => safeString(share.id) === requestedShareId) || null
    : currentShare;

  if (requestedShareId && !targetShare) {
    return {
      status: 404,
      payload: {
        ok: false,
        message: "Published client record not found.",
      },
    };
  }

  if (action === "get") {
    return {
      status: 200,
      payload: {
        ok: true,
        share: currentShare ? serialiseEstimateShare(currentShare, request) : null,
      },
    };
  }

  if (staff.profile.role !== "admin") {
    return {
      status: 403,
      payload: {
        ok: false,
        message: "Only admins can manage client publishing.",
      },
    };
  }

  if (action === "delete") {
    if (!targetShare) {
      return {
        status: 200,
        payload: {
          ok: true,
          deleted: false,
          share: null,
        },
      };
    }

    if (safeString(targetShare.status) === "signed") {
      return {
        status: 409,
        payload: {
          ok: false,
          message: "Signed approvals are archived and cannot be deleted.",
        },
      };
    }

    await db.collection("estimateShares").doc(targetShare.id).delete();

    if (recordType === "change_order") {
      const mutatingCurrentShare =
        safeString(targetShare.id) === safeString(currentShare?.id);
      await db
        .collection("projects")
        .doc(projectId)
        .collection("changeOrders")
        .doc(changeOrderId)
        .set(
          {
            portalShareId: mutatingCurrentShare
              ? null
              : safeString(currentShare?.id) || null,
            portalStatus: mutatingCurrentShare ? "draft" : "published",
            portalVisible: mutatingCurrentShare ? false : true,
            ...(mutatingCurrentShare ? { publishedAt: null } : {}),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

      await addProjectActivity(projectId, {
        activityType: "change_order",
        title: "Published change order deleted",
        body: "The unsigned published change order version was deleted.",
        actorName: staff.profile.displayName,
        actorUid: staff.profile.uid,
        actorRole: staff.profile.role,
      });
    } else {
      await addLeadActivity(leadId, {
        activityType: "estimate_share",
        title: "Published estimate deleted",
        body: "The unsigned published estimate version was deleted.",
        actorName: staff.profile.displayName,
        actorUid: staff.profile.uid,
        actorRole: staff.profile.role,
      });
    }

    return {
      status: 200,
      payload: {
        ok: true,
        deleted: true,
        share: null,
      },
    };
  }

  if (action === "revoke") {
    if (!targetShare || targetShare.status !== "active") {
      return {
        status: 200,
        payload: {
          ok: true,
          share: targetShare ? serialiseEstimateShare(targetShare, request) : null,
        },
      };
    }

    await db.collection("estimateShares").doc(targetShare.id).set(
      {
        status: "revoked",
        portalVisible: false,
        revokedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (recordType === "change_order") {
      const mutatingCurrentShare =
        safeString(targetShare.id) === safeString(currentShare?.id);
      await db
        .collection("projects")
        .doc(projectId)
        .collection("changeOrders")
        .doc(changeOrderId)
        .set(
          {
            portalShareId: mutatingCurrentShare
              ? null
              : safeString(currentShare?.id) || null,
            portalStatus: mutatingCurrentShare ? "revoked" : "published",
            portalVisible: mutatingCurrentShare ? false : true,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

      await addProjectActivity(projectId, {
        activityType: "change_order",
        title: "Change order link revoked",
        body: "The active shared change order link was revoked.",
        actorName: staff.profile.displayName,
        actorUid: staff.profile.uid,
        actorRole: staff.profile.role,
      });
    } else {
      await addLeadActivity(leadId, {
        activityType: "estimate_share",
        title: "Estimate share link revoked",
        body: "The active client estimate link was revoked from the staff portal.",
        actorName: staff.profile.displayName,
        actorUid: staff.profile.uid,
        actorRole: staff.profile.role,
      });

      if (existingProjectSnap.exists) {
        await addProjectActivity(leadId, {
          activityType: "agreement",
          title: "Estimate share link revoked",
          body: "The shared estimate link was revoked for this project.",
          actorName: staff.profile.displayName,
          actorUid: staff.profile.uid,
          actorRole: staff.profile.role,
        });
      }
    }

    const revokedSnap = await db.collection("estimateShares").doc(targetShare.id).get();
    return {
      status: 200,
      payload: {
        ok: true,
        share: serialiseEstimateShare(
          {
            id: revokedSnap.id,
            ...revokedSnap.data(),
          },
          request,
        ),
      },
    };
  }

  if (action !== "create") {
    return {
      status: 400,
      payload: {
        ok: false,
        message: "Unsupported estimate share action.",
      },
    };
  }

  if (recordType === "estimate") {
    const published = await publishEstimateDraftVersion({
      request,
      payload,
      staff,
      leadId,
      initialLeadData: leadData,
    });

    if (published.createdVersion) {
      const activityWrites = [
        addLeadActivity(leadId, {
          activityType: "estimate_share",
          title: "Estimate saved and published",
          body: `Estimate version ${published.versionNumber} was saved from the current editor and published for the connected customer.`,
          actorName: staff.profile.displayName,
          actorUid: staff.profile.uid,
          actorRole: staff.profile.role,
        }),
      ];
      if (published.projectExists) {
        activityWrites.push(
          addProjectActivity(leadId, {
            activityType: "agreement",
            title: "Estimate saved and published",
            body: `Estimate version ${published.versionNumber} was published for this project.`,
            actorName: staff.profile.displayName,
            actorUid: staff.profile.uid,
            actorRole: staff.profile.role,
          }),
        );
      }

      const activityResults = await Promise.allSettled(activityWrites);
      activityResults
        .filter((result) => result.status === "rejected")
        .forEach((result) => {
          logger.warn(
            "Estimate publish activity could not be recorded.",
            result.reason,
          );
        });
    }

    return {
      status: 200,
      payload: {
        ok: true,
        share: published.share,
        draft: {
          id: leadId,
          leadId,
          status: "draft",
          subject: safeString(published.draft?.subject),
          emailBody: safeString(published.draft?.emailBody),
          contractDetails: {
            approximateStartDate: safeString(
              published.draft?.contractDetails
                ?.approximateStartDate,
            ),
            approximateCompletionDate: safeString(
              published.draft?.contractDetails
                ?.approximateCompletionDate,
            ),
            paymentSchedule: safeString(
              published.draft?.contractDetails?.paymentSchedule,
            ),
            specialOrderMaterials: safeString(
              published.draft?.contractDetails
                ?.specialOrderMaterials,
            ),
            knownSubcontractors: safeString(
              published.draft?.contractDetails
                ?.knownSubcontractors,
            ),
          },
          assumptions: Array.isArray(published.draft?.assumptions)
            ? published.draft.assumptions
            : [],
          lineItems: Array.isArray(published.draft?.lineItems)
            ? published.draft.lineItems
            : [],
          subtotal: toNumber(published.draft?.subtotal),
          savedAt: serialiseDateValue(published.draft?.updatedAt),
          updatedAt: serialiseDateValue(
            published.draft?.updatedAt,
          ),
        },
        version: {
          id: published.versionId,
          versionId: published.versionId,
          number: published.versionNumber,
          versionNumber: published.versionNumber,
          contentHash: published.contentHash,
        },
        unchanged: published.unchanged,
        idempotent: published.idempotent,
      },
    };
  }

  const batch = db.batch();
  const nextVersion =
    shares.reduce(
      (maxVersion, share) =>
        Math.max(maxVersion, toNumber(share.publishedVersion)),
      0,
    ) + 1;
  const shareId = createOpaqueId();
  const shareRef = db.collection("estimateShares").doc(shareId);

  if (recordType === "change_order") {
    const changeOrderRef = db
      .collection("projects")
      .doc(projectId)
      .collection("changeOrders")
      .doc(changeOrderId);
    const changeOrderSnap = await changeOrderRef.get();
    if (!changeOrderSnap.exists) {
      return {
        status: 404,
        payload: {
          ok: false,
          message: "Change order not found.",
        },
      };
    }

    const changeOrderData = {
      id: changeOrderSnap.id,
      ...changeOrderSnap.data(),
    };
    const changeOrderSnapshot = normaliseChangeOrderSnapshot(
      changeOrderData,
      projectData,
    );
    const agreementSnapshot = normaliseChangeOrderAgreementSnapshot(
      projectData,
      changeOrderData,
    );
    const changeOrderContentHash = sha256Hex({
      schemaVersion: ESTIMATE_VERSION_SCHEMA_VERSION,
      type: "change_order",
      projectId,
      customerId: safeString(projectData.customerId),
      changeOrderSnapshot,
      agreementSnapshot,
    });
    shares
      .filter((share) => share.status === "active")
      .forEach((share) => {
        batch.set(
          db.collection("estimateShares").doc(share.id),
          {
            status: "replaced",
            portalVisible: false,
            replacedAt: FieldValue.serverTimestamp(),
            replacedByShareId: shareId,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });

    batch.set(
      shareRef,
      {
        id: shareId,
        versionId: shareId,
        type: "change_order",
        status: "active",
        schemaVersion: ESTIMATE_VERSION_SCHEMA_VERSION,
        contentHash: changeOrderContentHash,
        leadId: cleanNullableString(projectData.leadId),
        customerId: safeString(projectData.customerId) || null,
        customerName: safeString(projectData.customerName || projectData.clientName),
        projectId,
        changeOrderId,
        leadSnapshot: minimalProjectSnapshot({
          id: projectId,
          ...projectData,
        }),
        projectSnapshot: minimalProjectSnapshot({
          id: projectId,
          ...projectData,
        }),
        changeOrderSnapshot,
        agreementSnapshot,
        publishedVersion: nextVersion,
        versionNumber: nextVersion,
        signingMode: "signature",
        publishMode: "signature",
        readyToSign: true,
        readinessBlockers: [],
        publishedAt: FieldValue.serverTimestamp(),
        portalVisible: true,
        createdByUid: staff.profile.uid,
        createdByName: staff.profile.displayName,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        revokedAt: null,
        replacedAt: null,
        lastViewedAt: null,
        signedAt: null,
        agreementId: null,
      },
      { merge: true },
    );

    batch.set(
      changeOrderRef,
      {
        customerId: safeString(projectData.customerId),
        customerName: safeString(projectData.customerName || projectData.clientName),
        projectAddress: safeString(projectData.projectAddress),
        portalShareId: shareId,
        portalStatus: "published",
        portalVisible: true,
        publishedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await batch.commit();

    await addProjectActivity(projectId, {
      activityType: "change_order",
      title: "Change order published to client",
      body: `${safeString(changeOrderData.title || "Change order")} was published for client approval.`,
      actorName: staff.profile.displayName,
      actorUid: staff.profile.uid,
      actorRole: staff.profile.role,
    });

    const createdSnap = await shareRef.get();
    return {
      status: 200,
      payload: {
        ok: true,
        share: serialiseEstimateShare(
          {
            id: createdSnap.id,
            ...createdSnap.data(),
          },
          request,
        ),
      },
    };
  }

  throw httpError("Unsupported estimate publishing record.", 400);
}

exports.estimateShare = onRequest(
  PUBLIC_CORS_HTTP_OPTIONS,
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
      const payload = await parseRequestPayload(request);
      const result = await handleEstimateShareRequest({
        request,
        payload,
        staff,
      });
      respondJson(response, result.status, result.payload);
    } catch (error) {
      logger.error("Estimate share request failed.", error);
      respondJson(response, error.status || 500, {
        ok: false,
        message: error.message || "Could not manage the estimate share link.",
        matchResult: error.matchResult || null,
        customerMatchIds: error.customerMatchIds || [],
      });
    }
  },
);

exports.convertLeadToProject = onRequest(
  PUBLIC_CORS_HTTP_OPTIONS,
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
      const payload = await parseRequestPayload(request);
      const leadId = safeString(payload.leadId);

      if (!leadId) {
        respondJson(response, 400, {
          ok: false,
          message: "leadId is required.",
        });
        return;
      }

      const { leadRef, leadData } = await verifyLeadStaffAccess(
        leadId,
        staff.profile,
      );
      const result = await ensureProjectForLead({
        leadId,
        leadRef,
        leadData,
        actorProfile: staff.profile,
      });

      if (!result.existing) {
        await addLeadActivity(leadId, {
          activityType: "system",
          title: "Lead converted to job",
          body: "Won job created and linked to the customer record.",
          actorName: staff.profile.displayName,
          actorUid: staff.profile.uid,
          actorRole: staff.profile.role,
        });

        await addProjectActivity(leadId, {
          activityType: "system",
          title: "Job created from won lead",
          body: result.scopeItemCount
            ? `The won lead was converted into the operational job record and ${result.scopeItemCount} estimate items were copied into the renovation scope tracker.`
            : "The won lead was converted into the operational job record.",
          actorName: staff.profile.displayName,
          actorUid: staff.profile.uid,
          actorRole: staff.profile.role,
        });
      }

      respondJson(response, 200, {
        ok: true,
        existing: result.existing,
        projectId: leadId,
        matchResult: result.customerLink.matchResult,
        scopeItemCount: result.scopeItemCount,
      });
    } catch (error) {
      logger.error("Lead conversion failed.", error);
      respondJson(response, httpStatusForError(error), {
        ok: false,
        message: error.message || "Could not convert the lead right now.",
        matchResult: error.matchResult || null,
        customerMatchIds: error.customerMatchIds || [],
      });
    }
  },
);

exports.publicEstimateView = onRequest(
  PUBLIC_CORS_HTTP_OPTIONS,
  async (request, response) => {
    applyCors(response);

    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    if (request.method !== "GET") {
      response.status(405).send("Method not allowed.");
      return;
    }

    try {
      const payload = await loadPublicEstimatePayload(
        request,
        request.query.token,
      );
      respondJson(response, 200, payload);
    } catch (error) {
      logger.error("Public estimate view failed.", error);
      respondJson(response, error.status || 500, {
        ok: false,
        status:
          error.clientStatus || (error.status === 410 ? "revoked" : "invalid"),
        message: error.message || "Could not load this estimate.",
      });
    }
  },
);

exports.publicEstimateSign = onRequest(
  PUBLIC_CORS_HTTP_OPTIONS,
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
      const result = await signPublicEstimatePayload(request, payload);
      respondJson(response, 200, result);
    } catch (error) {
      logger.error("Public estimate sign failed.", error);
      respondJson(response, error.status || 500, {
        ok: false,
        status: error.clientStatus || "invalid",
        message: error.message || "Could not sign the agreement right now.",
      });
    }
  },
);

exports.publicAgreementDocument = onRequest(
  PUBLIC_CORS_HTTP_OPTIONS,
  async (request, response) => {
    applyCors(response);

    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    if (request.method !== "GET") {
      response.status(405).send("Method not allowed.");
      return;
    }

    try {
      const { pdfPath, fileName } = await loadPublicAgreementDocumentData(
        request.query.token,
      );

      response.setHeader("Content-Type", "application/pdf");
      response.setHeader(
        "Content-Disposition",
        `inline; filename=\"${fileName}\"`,
      );

      admin
        .storage()
        .bucket()
        .file(pdfPath)
        .createReadStream()
        .on("error", (streamError) => {
          logger.error("Agreement PDF stream failed.", streamError);
          if (!response.headersSent) {
            response.status(500).send("Could not stream the agreement.");
          } else {
            response.end();
          }
        })
        .pipe(response);
    } catch (error) {
      logger.error("Public agreement document request failed.", error);
      response
        .status(error.status || 500)
        .send(error.message || "Could not load the agreement.");
    }
  },
);

exports.clientPortalApi = buildClientPortalApi({
  admin,
  db,
  FieldValue,
  logger,
  onRequest,
  verifyStaffRequest,
  handleEstimateShareRequest,
  buildEstimateShareUrl,
  buildPublicAgreementDownloadHref,
  loadPublicEstimatePayload,
  signPublicEstimatePayload,
  loadPublicAgreementDocumentData,
});

exports.googleCalendarStatus = onRequest(
  PUBLIC_CORS_HTTP_OPTIONS,
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
      const connectionSnap = await db
        .collection("googleCalendarConnections")
        .doc(staff.profile.uid)
        .get();
      const connection = connectionSnap.exists ? connectionSnap.data() : {};

      respondJson(response, 200, {
        ok: true,
        connected: connection.status === "connected",
        status: connection.status || "not_connected",
        email: safeString(connection.email || staff.profile.email),
        timeZone: safeString(connection.timeZone || "America/New_York"),
        lastSyncAt: serialiseDateValue(connection.lastSyncAt),
        lastError: safeString(connection.lastError),
      });
    } catch (error) {
      logger.error("Google Calendar status request failed.", error);
      respondJson(response, error.status || 500, {
        ok: false,
        message: error.message || "Google Calendar status could not load.",
      });
    }
  },
);

// Keep optional integrations on their own Cloud Run revisions so a missing
// Calendar secret cannot take down lead archiving or the client portal.
exports.googleCalendarConnection =
  googleCalendarFunctions.googleCalendarConnection;
exports.googleCalendarCallback = googleCalendarFunctions.googleCalendarCallback;
exports.syncTaskToGoogleCalendar =
  googleCalendarFunctions.syncTaskToGoogleCalendar;
exports.syncCalendarEventToGoogleCalendar =
  googleCalendarFunctions.syncCalendarEventToGoogleCalendar;
exports.publicGoogleReviews = googleReviewsFunctions.publicGoogleReviews;
exports.refreshGoogleReviews = googleReviewsFunctions.refreshGoogleReviews;
exports.deleteStaffAccess = staffAdminFunctions.deleteStaffAccess;

exports.generateEstimateDraft = onRequest(
  PUBLIC_CORS_HTTP_OPTIONS,
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
          message: "Only admins can draft estimates.",
        });
        return;
      }

      const payload = request.body || {};
      const leadId = safeString(payload.leadId);

      if (!leadId) {
        respondJson(response, 400, {
          ok: false,
          message: "leadId is required.",
        });
        return;
      }

      const [leadSnap, template] = await Promise.all([
        db.collection("leads").doc(leadId).get(),
        fetchTemplate(),
      ]);

      if (!leadSnap.exists) {
        respondJson(response, 404, {
          ok: false,
          message: "Lead not found.",
        });
        return;
      }

      const lead = leadSnap.data();
      const draft = fallbackEstimateDraft(lead, template);
      const generatedBy = "template";

      const existingEstimateSnap = await db
        .collection("estimates")
        .doc(leadId)
        .get();
      const existingEstimate = existingEstimateSnap.exists
        ? existingEstimateSnap.data()
        : null;
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
        createdAt:
          existingEstimate && existingEstimate.createdAt
            ? existingEstimate.createdAt
            : FieldValue.serverTimestamp(),
        lastEditedByUid: staff.profile.uid,
        lastEditedByName: staff.profile.displayName,
      };

      await Promise.all([
        db
          .collection("estimates")
          .doc(leadId)
          .set(estimatePayload, { merge: true }),
        db.collection("leads").doc(leadId).set(
          {
            hasEstimate: true,
            estimateSubtotal: draft.subtotal,
            estimateTitle: draft.subject,
            estimateUpdatedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
        addLeadActivity(leadId, {
          activityType: "estimate",
          title: "Estimate draft refreshed",
          body: "Estimate draft generated from the internal template.",
          actorName: staff.profile.displayName,
          actorUid: staff.profile.uid,
          actorRole: staff.profile.role,
        }),
      ]);

      respondJson(response, 200, {
        ok: true,
        estimate: {
          ...estimatePayload,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("Estimate draft request failed.", error);
      respondJson(response, 500, {
        ok: false,
        message: "Could not generate the estimate draft.",
      });
    }
  },
);

exports.syncStaffAccessOnWrite = onDocumentWritten(
  {
    region: "us-central1",
    document: "allowedStaff/{staffKey}",
  },
  async (event) => {
    const beforeData = event.data.before.exists ? event.data.before.data() : {};
    const afterData = event.data.after.exists ? event.data.after.data() : {};
    const uid = safeString(afterData.uid || beforeData.uid);

    // A staff record receives its UID after the person's first successful
    // login. Until then there is no Firebase Auth account to synchronise.
    if (!uid) {
      return;
    }

    const active = event.data.after.exists && afterData.active === true;
    const role = normaliseStaffRole(afterData.role || beforeData.role);
    const email = safeString(afterData.email || beforeData.email).toLowerCase();
    const displayName = safeString(
      afterData.displayName || beforeData.displayName || email,
    );

    await db
      .collection("users")
      .doc(uid)
      .set(
        {
          email,
          displayName,
          role,
          active,
          defaultLeadAssignee:
            active && Boolean(afterData.defaultLeadAssignee),
          accessUpdatedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    try {
      await admin.auth().setCustomUserClaims(uid, {
        role,
        staff: active,
      });
      if (!active) {
        await admin.auth().revokeRefreshTokens(uid);
      }
    } catch (error) {
      logger.error("Staff access token synchronisation failed.", {
        uid,
        active,
        error: error?.message || String(error),
      });
      throw error;
    }
  },
);

exports.syncEstimateRecordDocumentOnWrite = onDocumentWritten(
  {
    region: "us-central1",
    document: "estimates/{leadId}",
  },
  async (event) => {
    if (!event.data.after.exists) {
      await deleteEstimateRecordDocument(event.params.leadId);
      return;
    }

    await upsertEstimateRecordDocument(
      event.params.leadId,
      event.data.after.data() || {},
    );
  },
);

exports.cleanupRecordDocumentOnWrite = onDocumentWritten(
  {
    region: "us-central1",
    document: "recordDocuments/{documentId}",
  },
  async (event) => {
    if (event.data.after.exists) {
      return;
    }

    const beforeData = event.data.before.exists ? event.data.before.data() : {};
    await cleanupDeletedRecordDocument(event.params.documentId, beforeData);
  },
);

exports.cleanupVendorDocumentOnWrite = onDocumentWritten(
  {
    region: "us-central1",
    document: "vendorDocuments/{documentId}",
  },
  async (event) => {
    if (event.data.after.exists) {
      return;
    }

    const beforeData = event.data.before.exists ? event.data.before.data() : {};
    await cleanupDeletedVendorDocument(event.params.documentId, beforeData);
  },
);

exports.syncProjectFinancialsOnExpenses = onDocumentWritten(
  {
    region: "us-central1",
    document: "projects/{projectId}/expenses/{expenseId}",
  },
  async (event) => {
    await syncProjectFinancials(event.params.projectId);
  },
);

exports.syncProjectFinancialsOnPayments = onDocumentWritten(
  {
    region: "us-central1",
    document: "projects/{projectId}/payments/{paymentId}",
  },
  async (event) => {
    await syncProjectFinancials(event.params.projectId);
  },
);

exports.syncProjectFinancialsOnChangeOrders = onDocumentWritten(
  {
    region: "us-central1",
    document: "projects/{projectId}/changeOrders/{changeOrderId}",
  },
  async (event) => {
    await syncProjectFinancials(event.params.projectId);
  },
);

exports.syncServiceOrderInvoiceCheckoutState = onDocumentWritten(
  {
    region: "us-central1",
    document: "projects/{projectId}/invoices/{invoiceId}",
    secrets: [STRIPE_SECRET_KEY],
  },
  async (event) => {
    if (!event.data.before.exists || !event.data.after.exists) {
      return;
    }

    const beforeData = event.data.before.data() || {};
    const afterData = event.data.after.data() || {};
    const previousSessionId = safeString(beforeData.stripeCheckoutSessionId);

    if (!previousSessionId || safeString(beforeData.status) === "paid") {
      return;
    }

    const beforeFingerprint =
      safeString(beforeData.stripeCheckoutFingerprint) ||
      buildInvoiceFingerprint(beforeData);
    const afterFingerprint =
      safeString(afterData.stripeCheckoutFingerprint) ||
      buildInvoiceFingerprint(afterData);
    const shouldExpire =
      safeString(afterData.status) !== "paid" &&
      (safeString(afterData.stripePaymentStatus) === "stale" ||
        beforeFingerprint !== afterFingerprint);

    if (!shouldExpire) {
      return;
    }

    try {
      const stripe = createStripeClient();
      await expireCheckoutSessionIfNeeded(stripe, previousSessionId);
    } catch (error) {
      logger.warn("Service order checkout invalidation skipped.", {
        invoiceId: event.params.invoiceId,
        error: error?.message || String(error),
      });
    }

    const projectRef = db.collection("projects").doc(event.params.projectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      return;
    }

    const projectData = projectSnap.data() || {};
    await projectRef.set(
      {
        billingStatus: serviceOrderBillingStatus(
          projectData.paymentRequirement,
          toNumber(
            projectData.totalContractRevenue ||
              projectData.jobValue ||
              projectData.baseContractValue,
          ),
          toNumber(
            projectData.financials && projectData.financials.totalPayments,
          ),
          false,
        ),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  },
);

exports.syncProjectDerivedDataOnWrite = onDocumentWritten(
  {
    region: "us-central1",
    document: "projects/{projectId}",
  },
  async (event) => {
    if (!event.data.after.exists) {
      const beforeData = event.data.before.exists
        ? event.data.before.data()
        : null;
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
    const beforeRevenue = toNumber(
      beforeData.baseContractValue || beforeData.jobValue || 0,
    );
    const afterRevenue = toNumber(
      afterData.baseContractValue || afterData.jobValue || 0,
    );
    const statusChanged =
      safeString(beforeData.status) !== safeString(afterData.status);
    const commissionLockChanged =
      Boolean(beforeData.commissionLocked) !==
      Boolean(afterData.commissionLocked);

    if (JSON.stringify(desiredAccess) !== JSON.stringify(currentAccess)) {
      await event.data.after.ref.set(
        {
          allowedStaffUids: desiredAccess,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    if (
      !event.data.before.exists ||
      beforeWorkers !== afterWorkers ||
      beforeRevenue !== afterRevenue ||
      statusChanged ||
      commissionLockChanged
    ) {
      await syncProjectFinancials(event.params.projectId);
    }

    await ensureProjectRecordDocumentMigration(event.params.projectId, {
      id: event.params.projectId,
      ...afterData,
    });
    await syncRecordDocumentLinksForProject(event.params.projectId, {
      id: event.params.projectId,
      ...afterData,
    });

    const customerIds = uniqueValues([
      beforeData.customerId,
      afterData.customerId,
    ]);
    await Promise.all(
      customerIds.map((customerId) => syncCustomerSummary(customerId)),
    );
  },
);

exports.syncCustomerDataOnLeadWrite = onDocumentWritten(
  {
    region: "us-central1",
    document: "leads/{leadId}",
  },
  async (event) => {
    const beforeData = event.data.before.exists ? event.data.before.data() : {};
    const afterData = event.data.after.exists ? event.data.after.data() : {};
    const customerIds = uniqueValues([
      beforeData.customerId,
      afterData.customerId,
    ]);

    if (event.data.after.exists) {
      await syncRecordDocumentLinksForLead(event.params.leadId, afterData);
    }

    await Promise.all(
      customerIds.map((customerId) => syncCustomerSummary(customerId)),
    );
  },
);

exports.syncVendorBillExpenseMirror = onDocumentWritten(
  {
    region: "us-central1",
    document: "vendorBills/{vendorBillId}",
  },
  async (event) => {
    const beforeData = event.data.before.exists ? event.data.before.data() : {};
    const afterData = event.data.after.exists ? event.data.after.data() : {};

    if (!event.data.after.exists) {
      await deleteMirroredVendorExpense(
        safeString(beforeData.projectId),
        event.params.vendorBillId,
      );
      return;
    }

    await syncVendorBillExpenseMirror(
      event.params.vendorBillId,
      beforeData,
      afterData,
    );
  },
);

exports.syncTaskToGoogleCalendar =
  googleCalendarFunctions.syncTaskToGoogleCalendar;
exports.syncCalendarEventToGoogleCalendar =
  googleCalendarFunctions.syncCalendarEventToGoogleCalendar;

if (process.env.NODE_ENV === "test") {
  exports.__estimateLifecycleTest = {
    agreementReadinessBlockers,
    canonicalJson,
    estimateSnapshotAvailable,
    estimateVersionContentHash,
    normaliseSubmittedEstimateDraft,
    validateImmutableShareSnapshots,
  };
}
