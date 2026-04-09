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

admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

const CRM_ADMIN_EMAILS = defineString("CRM_ADMIN_EMAILS", { default: "" });
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_DISABLED_MESSAGE =
  "Online Stripe checkout is temporarily unavailable. Please contact Golden Brick directly for payment coordination.";
const PENNSYLVANIA_LICENSE_NUMBER = "065157";

const STAFF_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const PUBLIC_CORS_HTTP_OPTIONS = {
  region: "us-central1",
  cors: true,
  invoker: "public",
};

const PUBLIC_HTTP_OPTIONS = {
  region: "us-central1",
  invoker: "public",
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
  "This estimate reflects the scope, quantities, access assumptions, and material quality level identified at the time it was prepared. Unless noted otherwise in writing, pricing assumes contractor-stock materials and standard installation conditions.",
  "Final pricing, sequencing, and production details remain subject to site verification, accurate field measurements, finish selections, structural discoveries, code requirements, utility conditions, and any revisions approved in writing after this estimate was issued.",
  "Unforeseen concealed, latent, or site conditions discovered after work begins are not included in this estimate. If those conditions affect scope, cost, sequencing, or duration, Golden Brick Construction will document the revision in writing before additional work proceeds.",
  "Permits, inspections, engineering input, specialty vendor work, and trade coordination are included only when specifically called for by the approved scope or later documented through written revisions.",
  "Any requested scope, material, or scheduling changes after estimate approval must be captured in writing and may require revised pricing or a formal change order before added work can begin.",
].join("\n");

const LEGACY_ESTIMATE_TEMPLATE_TERMS = new Set([
  "Pricing is a planning estimate until site conditions, access, finish selections, and final scope are confirmed.",
  "Pricing is a planning estimate until scope, access, existing conditions, and finish selections are confirmed on site.",
  LEGACY_DEFAULT_ESTIMATE_STANDARD_TERMS,
]);

const LEGACY_DEFAULT_AGREEMENT_TITLE = "Client authorization and agreement";
const DEFAULT_AGREEMENT_TITLE = "Estimate approval and project authorization";

const LEGACY_DEFAULT_AGREEMENT_INTRO = [
  "If you would like Golden Brick Construction to move forward from this estimate into the next planning and production step, please review and sign the agreement terms below.",
  "Your signature locks the estimate snapshot shown on this page into the project file so Golden Brick and the client are aligned on the approved scope and commercial terms at the time of acceptance.",
].join("\n");

const DEFAULT_AGREEMENT_INTRO = [
  "This page records the estimate snapshot Golden Brick Construction is asking you to approve. If the scope and pricing shown here match your direction, your signature authorizes Golden Brick to move this project into the next planning, scheduling, and coordination step.",
  "Once signed, the proposal summary, line items, assumptions, and agreement terms shown here are archived into the project file so both sides have one shared approval record.",
].join("\n");

const LEGACY_DEFAULT_AGREEMENT_TERMS = [
  "By signing below, you confirm that Golden Brick Construction may move forward based on the estimate scope and pricing snapshot shown on this page, subject to final field verification and any written revisions agreed by both parties.",
  "Any requested scope, material, pricing, or schedule changes after signature must be documented in writing and may require a revised estimate or change order before additional work proceeds.",
  "Scheduling, procurement, and start-date coordination remain subject to site access, deposit and payment coordination, municipal approvals, final measurements, and confirmed finish selections where applicable.",
].join("\n");

const DEFAULT_AGREEMENT_TERMS = [
  "By signing below, you approve the estimate scope and pricing snapshot shown on this page and authorize Golden Brick Construction to move forward into the next pre-construction, scheduling, procurement, and production coordination step for this project.",
  "This approval is tied to the scope, assumptions, and pricing shown on this page only. Any requested changes to scope, materials, quantities, schedule, or finish level after signature must be documented in writing and may require revised pricing, a revised estimate, or a formal change order before the changed work proceeds.",
  "Any pricing tied to allowances, contractor-stock materials, existing-condition assumptions, or standard installation methods may change if site conditions, code requirements, measurements, owner selections, or requested upgrades differ from the assumptions used to prepare this estimate.",
  "Golden Brick Construction is not responsible for concealed, latent, or previously unknown conditions discovered after work begins, including structural issues, moisture damage, outdated wiring, plumbing deficiencies, code deficiencies, or other conditions that were not visible at the time of estimating. If discovered, the project file will be updated in writing before additional affected work continues.",
  "Target start dates, sequencing, inspections, and completion timing are planning targets only and remain subject to site access, material availability, lead times, utility conditions, municipal approvals, weather, timely client selections, and prior work completion.",
  "Where permits, inspections, engineering input, or specialty vendor coordination are required for the approved scope, Golden Brick Construction will coordinate those next steps as applicable; however, municipal review timing, utility scheduling, and third-party delays remain outside the contractor's direct control.",
  "The client agrees to provide reasonable site access, timely design or finish decisions, timely responses to scope clarifications, and any owner-supplied selections or information needed to keep the project moving. Delays in access, selections, or approvals may affect schedule and cost.",
  "Deposits, milestone invoices, retainage, or other payment obligations, where applicable to this project, will follow the written payment schedule reflected in the project file, approved invoices, and any later signed revisions. Golden Brick Construction may pause procurement, scheduling, or active work if required payments or approvals are outstanding.",
  "Special-order materials, custom fabricated items, non-stock finishes, and approved purchases made specifically for this project may be non-refundable once ordered or fabricated.",
  `Golden Brick Construction is Pennsylvania licensed and insured, PA License #${PENNSYLVANIA_LICENSE_NUMBER}. Subcontractors, specialty trades, and vendor partners may be used where appropriate, but Golden Brick remains the coordinating contractor for the approved scope reflected here.`,
  "This signed estimate, together with any later written revisions, schedules, payment milestones, change orders, selections, and required statutory notices, becomes part of the final project record maintained by Golden Brick Construction.",
].join("\n");

const DEFAULT_CHANGE_ORDER_TERMS = [
  "This change order captures a written revision to the approved Golden Brick project record and becomes part of the signed client file once accepted.",
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
      "Please review the scope, note any revisions, and let us know if you want to move into the next planning step.",
    terms: DEFAULT_ESTIMATE_STANDARD_TERMS,
    agreementTitle: DEFAULT_AGREEMENT_TITLE,
    agreementIntro: DEFAULT_AGREEMENT_INTRO,
    agreementTerms: DEFAULT_AGREEMENT_TERMS,
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
  };
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

  return {
    id: shareData.id,
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
    updatedAt: serialiseDateValue(shareData.updatedAt),
    revokedAt: serialiseDateValue(shareData.revokedAt),
    replacedAt: serialiseDateValue(shareData.replacedAt),
    lastViewedAt: serialiseDateValue(shareData.lastViewedAt),
    signedAt: serialiseDateValue(shareData.signedAt),
    title,
    summary,
    subtotal,
    projectAddress,
    projectType,
    visibleInPortal,
    signable: safeString(shareData.status) === "active",
    portalStatus:
      safeString(shareData.status) === "signed"
        ? "approved"
        : safeString(shareData.status) === "active"
          ? "needs_approval"
          : safeString(shareData.status) || "hidden",
    signerName: safeString(shareData.signerName),
    signerEmail: normaliseEmail(shareData.signerEmail),
    signerRole: safeString(shareData.signerRole),
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
    return;
  }

  doc.addPage();
}

function renderPdfParagraph(doc, text, options = {}) {
  if (!safeString(text)) return;

  const fontSize = options.fontSize || 10;
  const color = options.color || "#554c43";
  const lineGap = options.lineGap ?? 4;
  const gapAfter = options.gapAfter ?? 12;

  doc
    .font(options.font || "Helvetica")
    .fontSize(fontSize)
    .fillColor(color)
    .text(text, {
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
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#c5a059")
      .text("•", { continued: true });
    doc.font("Helvetica").fontSize(10).fillColor("#554c43").text(` ${item}`, {
      lineGap: 4,
      indent: 10,
    });
    doc.moveDown(0.3);
  });
}

function renderPdfSectionHeading(doc, title, description = "") {
  ensurePdfSpace(doc, 80);
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#231d17").text(title);

  if (description) {
    doc
      .moveDown(0.2)
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#7b6f61")
      .text(description, {
        lineGap: 2,
      });
  }

  doc.moveDown(0.5);
}

function renderAgreementLineItems(doc, lineItems = []) {
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

  lineItems.forEach((item) => {
    ensurePdfSpace(doc, 80);
    const title = safeString(item.label) || "Line item";
    const description =
      safeString(item.description) || "Scope details to be confirmed.";

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#231d17")
      .text(title, doc.page.margins.left, doc.y, {
        width:
          doc.page.width - doc.page.margins.left - doc.page.margins.right - 110,
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#231d17")
      .text(
        formatCurrency(item.amount || 0),
        doc.page.width - doc.page.margins.right - 110,
        doc.y - 13,
        {
          width: 110,
          align: "right",
        },
      );

    doc
      .moveDown(0.1)
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#554c43")
      .text(description, {
        lineGap: 3,
      });

    doc.moveDown(0.65);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .lineWidth(0.6)
      .strokeColor("#e4d7c2")
      .stroke();
    doc.moveDown(0.55);
  });
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
}) {
  return new Promise((resolve, reject) => {
    const normalisedDocumentType = normaliseShareType(documentType);
    const isChangeOrder = normalisedDocumentType === "change_order";
    const approvalTitle = isChangeOrder
      ? "Signed change order approval"
      : "Signed estimate agreement";
    const introCopy = isChangeOrder
      ? "This PDF captures the exact change order and approval terms the client accepted through the Golden Brick client portal."
      : "This PDF captures the exact estimate and agreement snapshot that the client accepted through the Golden Brick client portal.";
    const totalLabel = isChangeOrder ? "Change total" : "Estimate total";
    const overviewHeading = isChangeOrder
      ? "Change order overview"
      : "Estimate overview";
    const scopeHeading = isChangeOrder
      ? "Change order line item"
      : "Estimate line items";
    const scopeDescription = isChangeOrder
      ? "The pricing revision below reflects the exact change order snapshot the client approved."
      : "Each scope line and amount shown here reflects the accepted estimate snapshot.";
    const doc = new PDFDocument({
      size: "LETTER",
      margin: 52,
      info: {
        Title: `Golden Brick ${approvalTitle.toLowerCase()} for ${safeString(leadData.projectAddress || leadData.clientName || "project")}`,
        Author: "Golden Brick Construction",
      },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#c5a059")
      .text("GOLDEN BRICK CONSTRUCTION");

    doc
      .moveDown(0.35)
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor("#231d17")
      .text(approvalTitle);

    renderPdfParagraph(doc, introCopy, {
      fontSize: 10,
      color: "#554c43",
      gapAfter: 10,
    });

    const summaryRows = [
      [
        "Client",
        safeString(
          leadData.clientName ||
            projectData.clientName ||
            projectData.customerName ||
            "Client",
        ),
      ],
      [
        "Property",
        safeString(
          leadData.projectAddress ||
            projectData.projectAddress ||
            "To be confirmed",
        ),
      ],
      [
        "Project type",
        safeString(
          leadData.projectType || projectData.projectType || "Renovation scope",
        ),
      ],
      ["Signed", formatDateTime(signedAt)],
      ["Signer", safeString(signerName)],
      [totalLabel, formatCurrency(estimateSnapshot.subtotal || 0)],
    ];

    summaryRows.forEach(([label, value]) => {
      ensurePdfSpace(doc, 26);
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#7b6f61").text(label, {
        continued: true,
        width: 90,
      });
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#231d17")
        .text(`  ${value}`);
    });

    doc.moveDown(0.7);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .lineWidth(0.8)
      .strokeColor("#e4d7c2")
      .stroke();
    doc.moveDown(0.8);

    renderPdfSectionHeading(
      doc,
      safeString(estimateSnapshot.subject) || overviewHeading,
      "The proposal language below is frozen as accepted by the client.",
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
    renderAgreementLineItems(doc, estimateSnapshot.lineItems);

    renderPdfSectionHeading(
      doc,
      "Proposal terms",
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
      "Project-specific assumptions and exclusions",
      "Any deal-specific assumptions recorded on the estimate are preserved here.",
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
      agreementSnapshot.title || "Agreement terms",
      agreementSnapshot.intro || "",
    );
    renderPdfBulletList(doc, splitMultilineText(agreementSnapshot.terms));

    renderPdfSectionHeading(
      doc,
      "Client signature",
      "This block records the acceptance captured in the client portal.",
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
    renderPdfParagraph(doc, `Signed at: ${formatDateTime(signedAt)}`, {
      fontSize: 10,
      color: "#554c43",
      gapAfter: 4,
    });
    renderPdfParagraph(
      doc,
      "Golden Brick Construction | info@goldenbrickc.com | (267) 715-5557",
      {
        fontSize: 9,
        color: "#7b6f61",
        gapAfter: 0,
      },
    );
    renderPdfParagraph(doc, `PA License #${PENNSYLVANIA_LICENSE_NUMBER}`, {
      fontSize: 9,
      color: "#7b6f61",
      gapAfter: 0,
    });

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
      profile: serialiseStaffProfile(userSnap.data()),
    };
  }

  if (!email) {
    throw new Error("User is not authorised for the staff portal.");
  }

  const allowedSnap = await db
    .collection("allowedStaff")
    .doc(sanitizeEmailKey(email))
    .get();
  if (!allowedSnap.exists || allowedSnap.data().active !== true) {
    throw new Error("User is not authorised for the staff portal.");
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
}) {
  const projectRef = db.collection("projects").doc(leadId);
  const existingProjectSnap = await projectRef.get();
  let customerLink = await ensureLeadCustomerLink(leadRef, leadData);

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
    db.collection("estimates").doc(leadId).get(),
  ]);
  const refreshedLead = refreshedLeadSnap.data() || leadData;
  const estimateData = estimateSnap.exists ? estimateSnap.data() : null;
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
      baseContractValue: toNumber(refreshedLead.estimateSubtotal || 0),
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
        "Golden Brick will confirm the next planning or construction step directly in the client portal.",
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
      clientEmail: normaliseEmail(leadData.clientEmail),
      clientPhone: safeString(leadData.clientPhone),
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
    },
    agreement: {
      title: safeString(agreementSnapshot.title),
      intro: safeString(agreementSnapshot.intro),
      terms: splitMultilineText(agreementSnapshot.terms),
    },
    support: {
      email: "info@goldenbrickc.com",
      phone: "(267) 715-5557",
      phoneHref: "+12677155557",
      licenseNumber: PENNSYLVANIA_LICENSE_NUMBER,
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
  } else if (shareType === "change_order") {
    if (!estimateSnapshot || !safeString(estimateSnapshot.title)) {
      const [projectSnap, changeOrderSnap] = await Promise.all([
        db.collection("projects").doc(shareData.projectId).get(),
        db
          .collection("projects")
          .doc(shareData.projectId)
          .collection("changeOrders")
          .doc(shareData.changeOrderId)
          .get(),
      ]);

      if (!projectSnap.exists || !changeOrderSnap.exists) {
        const error = new Error("This change order link is no longer available.");
        error.status = 404;
        throw error;
      }

      const projectData = projectSnap.data() || {};
      const changeOrderData = {
        id: changeOrderSnap.id,
        ...changeOrderSnap.data(),
      };
      leadData = minimalProjectSnapshot(projectData);
      estimateSnapshot = normaliseChangeOrderSnapshot(
        changeOrderData,
        projectData,
      );
      agreementSnapshot = normaliseChangeOrderAgreementSnapshot(
        projectData,
        changeOrderData,
      );
    }
  } else {
    const [leadSnap, estimateSnap, template] = await Promise.all([
      db.collection("leads").doc(shareData.leadId).get(),
      db.collection("estimates").doc(shareData.leadId).get(),
      fetchTemplate(),
    ]);

    if (!leadSnap.exists || !estimateSnap.exists) {
      const error = new Error("This estimate link is no longer available.");
      error.status = 404;
      throw error;
    }

    leadData = leadSnap.data() || {};
    estimateSnapshot = normaliseEstimateSnapshot(
      estimateSnap.data() || {},
      template,
    );
    agreementSnapshot = normaliseAgreementSnapshot(template);
  }

  if (!safeString(agreementSnapshot.title) || !safeString(agreementSnapshot.terms)) {
    agreementSnapshot =
      shareType === "change_order"
        ? normaliseChangeOrderAgreementSnapshot({}, estimateSnapshot)
        : agreementSnapshot;
  }

  await shareRef.set(
    {
      lastViewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return buildPublicEstimatePayload({
    request,
    shareData,
    leadData,
    estimateSnapshot,
    agreementSnapshot,
    signedAgreement,
  });
}

async function signPublicEstimatePayload(request, payload = {}) {
  const token = safeString(payload.token);
  const signerName = safeString(payload.signerName);
  const signerEmail = normaliseEmail(payload.signerEmail);
  const signerRole = safeString(payload.signerRole);
  const accepted =
    payload.accepted === true ||
    safeString(payload.accepted).toLowerCase() === "true" ||
    safeString(payload.accepted).toLowerCase() === "on";

  if (!token) {
    const error = new Error("token is required.");
    error.status = 400;
    throw error;
  }

  const { shareRef, shareData } = await fetchEstimateShareContext(token);
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
    const agreementData = agreementSnap.exists
      ? agreementSnap.data() || {}
      : {};

    return {
      ok: true,
      alreadySigned: true,
      status: "signed",
      agreementId: safeString(shareData.agreementId),
      signedAt: serialiseDateValue(
        shareData.signedAt || agreementData.signedAt,
      ),
      downloadHref: buildPublicAgreementDownloadHref(request, shareData.id),
    };
  }

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
  const portalActor = {
    uid: "client-portal",
    email: "portal@goldenbrick.local",
    displayName: "Golden Brick Client Portal",
    role: "system",
  };
  let leadData = {};
  let projectData = {};
  let projectResult = null;
  let estimateSnapshot = {};
  let agreementSnapshot = {};
  let changeOrderRef = null;

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
    const changeOrderData = {
      id: changeOrderSnap.id,
      ...changeOrderSnap.data(),
    };
    leadData = minimalProjectSnapshot(projectData);
    estimateSnapshot =
      shareData.changeOrderSnapshot &&
      safeString(shareData.changeOrderSnapshot.title)
        ? shareData.changeOrderSnapshot
        : normaliseChangeOrderSnapshot(changeOrderData, projectData);
    agreementSnapshot =
      shareData.agreementSnapshot && safeString(shareData.agreementSnapshot.terms)
        ? shareData.agreementSnapshot
        : normaliseChangeOrderAgreementSnapshot(projectData, changeOrderData);
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
    const [leadSnap, estimateSnap, template] = await Promise.all([
      db.collection("leads").doc(shareData.leadId).get(),
      db.collection("estimates").doc(shareData.leadId).get(),
      fetchTemplate(),
    ]);

    if (!leadSnap.exists || !estimateSnap.exists) {
      const error = new Error("This estimate is no longer available.");
      error.status = 404;
      throw error;
    }

    leadData = leadSnap.data() || {};
    projectResult = await ensureProjectForLead({
      leadId: shareData.leadId,
      leadRef: db.collection("leads").doc(shareData.leadId),
      leadData,
      actorProfile: portalActor,
      allowAmbiguousCustomerCreate: true,
    });
    const projectSnap = await db
      .collection("projects")
      .doc(projectResult.projectId)
      .get();
    projectData = projectSnap.exists
      ? projectSnap.data() || {}
      : projectResult.projectData || {};
    estimateSnapshot =
      shareData.estimateSnapshot && safeString(shareData.estimateSnapshot.subject)
        ? shareData.estimateSnapshot
        : normaliseEstimateSnapshot(estimateSnap.data() || {}, template);
    agreementSnapshot =
      shareData.agreementSnapshot && safeString(shareData.agreementSnapshot.terms)
        ? shareData.agreementSnapshot
        : normaliseAgreementSnapshot(template);
  }

  const signedAt = new Date();
  const agreementRef = db.collection("agreements").doc();
  const recordDocumentRef = db.collection("recordDocuments").doc();
  const bucket = admin.storage().bucket();
  const signaturePath = `agreements/${agreementRef.id}/signature.png`;
  const pdfPath = `agreements/${agreementRef.id}/signed-agreement.pdf`;
  const pdfDownloadToken = createOpaqueId(18);
  const pdfBuffer = await buildAgreementPdfBuffer({
    leadData,
    projectData,
    estimateSnapshot,
    agreementSnapshot,
    documentType: shareType,
    signerName,
    signedAt,
    signatureBuffer: signature.buffer,
  });
  const pdfUrl = await saveStorageFile(bucket, pdfPath, pdfBuffer, {
    contentType: "application/pdf",
    downloadToken: pdfDownloadToken,
    metadata: {
      agreementId: agreementRef.id,
      shareId: shareData.id,
    },
  });
  await saveStorageFile(bucket, signaturePath, signature.buffer, {
    contentType: signature.contentType,
    metadata: {
      agreementId: agreementRef.id,
      shareId: shareData.id,
    },
  });

  const leadSnapshot = minimalLeadSnapshot(leadData);
  const projectSnapshot = minimalProjectSnapshot(projectData, leadData);
  const audit = requestAuditMetadata(request);
  const batch = db.batch();
  const signedDocumentTitle =
    shareType === "change_order"
      ? `Signed change order - ${formatDateOnly(signedAt)}`
      : `Signed agreement - ${formatDateOnly(signedAt)}`;
  const signedDocumentCategory =
    shareType === "change_order" ? "change_order" : "agreement";
  const signedDocumentNote =
    shareType === "change_order"
      ? `Signed by ${signerName} through the client change order link.`
      : `Signed by ${signerName} through the client estimate link.`;

  batch.set(
    agreementRef,
    {
      id: agreementRef.id,
      type: shareType,
      status: "signed",
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
      estimateSnapshot: shareType === "estimate" ? estimateSnapshot : null,
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
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  batch.set(
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
      customerId: cleanNullableString(projectResult.customerLink.customerId),
      projectId: cleanNullableString(projectResult.projectId),
      agreementId: agreementRef.id,
      clientVisible: true,
      createdByUid: portalActor.uid,
      createdByName: portalActor.displayName,
      createdByRole: portalActor.role,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  batch.set(
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
      lastViewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (shareType === "change_order" && changeOrderRef) {
    batch.set(
      changeOrderRef,
      {
        status: "approved",
        customerId: safeString(projectData.customerId),
        customerName: safeString(projectData.customerName || projectData.clientName),
        projectAddress: safeString(projectData.projectAddress),
        portalShareId: shareData.id,
        portalStatus: "signed",
        portalVisible: true,
        publishedAt: shareData.publishedAt || shareData.createdAt || FieldValue.serverTimestamp(),
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

  await batch.commit();

  if (shareType === "estimate" && !projectResult.existing) {
    await addLeadActivity(shareData.leadId, {
      activityType: "system",
      title: "Lead converted to job",
      body: "The client signature converted this estimate into the operational job record.",
      actorName: portalActor.displayName,
      actorUid: portalActor.uid,
      actorRole: portalActor.role,
    });

    await addProjectActivity(projectResult.projectId, {
      activityType: "system",
      title: "Job created from client signature",
      body: projectResult.scopeItemCount
        ? `The client signature created the job record and copied ${projectResult.scopeItemCount} estimate items into the renovation scope tracker.`
        : "The client signature created the job record.",
      actorName: portalActor.displayName,
      actorUid: portalActor.uid,
      actorRole: portalActor.role,
    });
  }

  if (shareType === "estimate" && safeString(shareData.leadId)) {
    await addLeadActivity(shareData.leadId, {
      activityType: "agreement",
      title: "Client signed estimate agreement",
      body: `${signerName} accepted the estimate and signed the agreement through the client link.`,
      actorName: portalActor.displayName,
      actorUid: portalActor.uid,
      actorRole: portalActor.role,
    });
  }

  await addProjectActivity(projectResult.projectId, {
    activityType: "agreement",
    title:
      shareType === "change_order"
        ? "Client signed change order"
        : "Client agreement signed",
    body:
      shareType === "change_order"
        ? `${signerName} signed the published change order through the client portal.`
        : `${signerName} signed the estimate agreement through the client portal.`,
    actorName: portalActor.displayName,
    actorUid: portalActor.uid,
    actorRole: portalActor.role,
  });

  await addProjectActivity(projectResult.projectId, {
    activityType: "document",
    title:
      shareType === "change_order"
        ? "Signed change order filed"
        : "Signed agreement filed",
    body:
      shareType === "change_order"
        ? "The signed change order PDF was stored in the project documents and archived in the agreements folder."
        : "The signed agreement PDF was stored in the job documents and archived in the agreements folder.",
    actorName: portalActor.displayName,
    actorUid: portalActor.uid,
    actorRole: portalActor.role,
  });

  return {
    ok: true,
    status: "signed",
    type: shareType,
    agreementId: agreementRef.id,
    projectId: projectResult.projectId,
    signedAt: signedAt.toISOString(),
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

exports.publicLeadIntake = onRequest(
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

      const clientName = safeString(
        payload.clientName || payload.name || payload["entry.1938418565"],
      );
      const clientEmail = safeString(
        payload.clientEmail || payload.email || payload["entry.2064255771"],
      ).toLowerCase();
      const clientPhone = safeString(
        payload.clientPhone || payload.phone || payload["entry.940072979"],
      );
      const projectAddress = safeString(
        payload.projectAddress ||
          payload.address ||
          payload["entry.1570481540"],
      );
      const notes = safeString(
        payload.notes || payload.projectNotes || payload["entry.1309691449"],
      );
      const projectType = safeString(
        payload.projectType || payload.serviceType || payload.project_type,
      );
      const sourcePage = safeString(payload.sourcePage || payload.pageTitle);
      const sourcePath = safeString(payload.sourcePath || payload.pagePath);
      const formName = safeString(
        payload.formName || payload.sourceForm || "project_inquiry",
      );
      const consent =
        String(
          payload.consent || payload.contactConsent || "",
        ).toLowerCase() === "true" ||
        String(payload.consent || "").toLowerCase() === "agreed";

      if (!clientName || !clientPhone) {
        respondJson(response, 400, {
          ok: false,
          message: "Name and phone are required.",
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
        assignedToName: assignee
          ? safeString(assignee.displayName || assignee.name)
          : "",
        assignedToEmail: assignee
          ? safeString(assignee.email).toLowerCase()
          : "",
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
      const customerLink = await ensureLeadCustomerLink(leadRef, leadPayload);

      await addLeadActivity(leadRef.id, {
        activityType: "system",
        title: "Website lead created",
        body: "Lead captured from " + (sourcePage || formName) + ".",
        actorName: "Website Intake",
        actorUid: "website",
        actorRole: "system",
      });

      respondJson(response, 200, {
        ok: true,
        leadId: leadRef.id,
        customerId: customerLink.customerId || null,
        customerMatchResult: customerLink.matchResult,
      });
    } catch (error) {
      logger.error("Lead intake failed.", error);
      respondJson(response, 500, {
        ok: false,
        message: "We could not submit the lead right now.",
      });
    }
  },
);

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
      const authHeader = request.get("authorization") || "";
      const matches = authHeader.match(/^Bearer (.+)$/i);

      if (!matches) {
        respondJson(response, 401, {
          ok: false,
          authorised: false,
          message: "Missing auth token.",
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

      await Promise.all([
        ensureDefaultTemplate(),
        ensureDefaultServiceTemplates(),
      ]);

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
        profile: serialiseStaffProfile(profile),
      });
    } catch (error) {
      logger.error("Staff session sync failed.", error);
      respondJson(response, 500, {
        ok: false,
        authorised: false,
        message: "Could not verify this staff account.",
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
      respondJson(response, error.status || 500, {
        ok: false,
        message: error.message || "Could not sync the lead customer.",
      });
    }
  },
);

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
  let customerLink = null;
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
        body: "The unsigned client-facing change order version was deleted.",
        actorName: staff.profile.displayName,
        actorUid: staff.profile.uid,
        actorRole: staff.profile.role,
      });
    } else {
      await addLeadActivity(leadId, {
        activityType: "estimate_share",
        title: "Published estimate deleted",
        body: "The unsigned client-facing estimate version was deleted.",
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
        body: "The active client-facing change order link was revoked.",
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
          body: "The client-facing estimate share link was revoked for this project.",
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
        type: "change_order",
        status: "active",
        leadId: cleanNullableString(projectData.leadId),
        customerId: safeString(projectData.customerId) || null,
        customerName: safeString(projectData.customerName || projectData.clientName),
        projectId,
        changeOrderId,
        leadSnapshot: minimalProjectSnapshot(projectData),
        projectSnapshot: minimalProjectSnapshot(projectData),
        changeOrderSnapshot,
        agreementSnapshot,
        publishedVersion: nextVersion,
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

  const estimateSnap = await db.collection("estimates").doc(leadId).get();
  if (!estimateSnap.exists) {
    return {
      status: 400,
      payload: {
        ok: false,
        message: "Save the estimate before creating a share link.",
      },
    };
  }

  customerLink = await ensureLeadCustomerLink(leadRef, leadData);
  const template = await fetchTemplate();
  const estimateSnapshot = normaliseEstimateSnapshot(
    estimateSnap.data() || {},
    template,
  );
  const agreementSnapshot = normaliseAgreementSnapshot(template);
  const nextLeadStatus = ["new_lead", "follow_up"].includes(
    safeString(leadData.status),
  )
    ? "estimate_sent"
    : safeString(leadData.status || "estimate_sent");

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
      type: "estimate",
      status: "active",
      leadId,
      customerId: customerLink.customerId || null,
      customerName: customerLink.customerName || "",
      projectId: existingProjectSnap.exists ? leadId : null,
      leadSnapshot: minimalLeadSnapshot({
        ...leadData,
        customerId: customerLink.customerId,
        customerName: customerLink.customerName,
      }),
      projectSnapshot: existingProjectSnap.exists
        ? minimalProjectSnapshot(projectData, leadData)
        : {},
      estimateSnapshot,
      agreementSnapshot,
      publishedVersion: nextVersion,
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
    leadRef,
    {
      status: nextLeadStatus,
      statusLabel: statusLabel(nextLeadStatus),
      customerId: customerLink.customerId || null,
      customerName: customerLink.customerName || "",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();

  await addLeadActivity(leadId, {
    activityType: "estimate_share",
    title: "Estimate published to client",
    body: "A client-facing estimate version was published from the staff portal.",
    actorName: staff.profile.displayName,
    actorUid: staff.profile.uid,
    actorRole: staff.profile.role,
  });

  if (existingProjectSnap.exists) {
    await addProjectActivity(leadId, {
      activityType: "agreement",
      title: "Estimate published to client",
      body: "A client-facing estimate version was published for this project.",
      actorName: staff.profile.displayName,
      actorUid: staff.profile.uid,
      actorRole: staff.profile.role,
    });
  }

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
      respondJson(response, error.status || 500, {
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
