"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

process.env.NODE_ENV = "test";

const {
  __estimateLifecycleTest: {
    agreementReadinessBlockers,
    estimateSnapshotAvailable,
    estimateVersionContentHash,
    normaliseSubmittedEstimateDraft,
    validateImmutableShareSnapshots,
  },
} = require("../src/index");

function validDraft(overrides = {}) {
  return {
    id: "lead-1",
    leadId: "lead-1",
    subject: "123 Main Street renovation",
    emailBody: "Prepared for review.",
    contractDetails: {
      approximateStartDate: "2026-09-01",
      approximateCompletionDate: "2026-10-15",
      paymentSchedule: "Milestones listed in the estimate.",
    },
    assumptions: ["Permit timing is subject to municipal review."],
    lineItems: [
      {
        label: "Renovation scope",
        description: "Complete the approved work.",
        amount: 12500,
      },
    ],
    subtotal: 1,
    ...overrides,
  };
}

test("submitted estimate draft must belong to the authorized lead", () => {
  assert.throws(
    () =>
      normaliseSubmittedEstimateDraft(
        validDraft({ leadId: "" }),
        "lead-1",
      ),
    /missing its lead connection/i,
  );
  assert.throws(
    () =>
      normaliseSubmittedEstimateDraft(
        validDraft({ id: "lead-2", leadId: "lead-2" }),
        "lead-1",
      ),
    /different lead/i,
  );
});

test("submitted draft subtotal is calculated from its own line items", () => {
  const draft = normaliseSubmittedEstimateDraft(
    validDraft({
      lineItems: [
        { label: "First", amount: 100.25 },
        { label: "Second", amount: "49.75" },
      ],
      subtotal: 999999,
    }),
    "lead-1",
  );

  assert.equal(draft.leadId, "lead-1");
  assert.equal(draft.subtotal, 150);
});

test("submitted draft requires positive priced work and a positive total", () => {
  assert.throws(
    () =>
      normaliseSubmittedEstimateDraft(
        validDraft({
          lineItems: [
            { label: "Discount only", amount: -100 },
            { label: "No-cost note", amount: 0 },
          ],
        }),
        "lead-1",
      ),
    /priced scope line/i,
  );
  assert.throws(
    () =>
      normaliseSubmittedEstimateDraft(
        validDraft({
          lineItems: [
            { label: "Work", amount: 100 },
            { label: "Offset", amount: -100 },
          ],
        }),
        "lead-1",
      ),
    /greater than \$0/i,
  );
});

test("published estimate content hashes are deterministic and client-specific", () => {
  const base = {
    leadId: "lead-1",
    customerId: "customer-1",
    leadSnapshot: {
      leadId: "lead-1",
      customerId: "customer-1",
      projectAddress: "123 Main Street",
    },
    estimateSnapshot: {
      leadId: "lead-1",
      customerId: "customer-1",
      subject: "Estimate",
      lineItems: [{ label: "Scope", amount: 100 }],
    },
    agreementSnapshot: {
      title: "Agreement",
      terms: "Term one",
    },
    signingMode: "signature",
  };

  assert.equal(
    estimateVersionContentHash(base),
    estimateVersionContentHash({
      signingMode: "signature",
      agreementSnapshot: base.agreementSnapshot,
      estimateSnapshot: base.estimateSnapshot,
      leadSnapshot: base.leadSnapshot,
      customerId: "customer-1",
      leadId: "lead-1",
    }),
  );
  assert.notEqual(
    estimateVersionContentHash(base),
    estimateVersionContentHash({
      ...base,
      customerId: "customer-2",
    }),
  );
});

test("immutable share validation rejects cross-customer snapshots", () => {
  const share = {
    id: "share-1",
    type: "estimate",
    leadId: "lead-1",
    customerId: "customer-1",
    leadSnapshot: {
      leadId: "lead-1",
      customerId: "customer-2",
    },
    estimateSnapshot: {
      leadId: "lead-1",
      customerId: "customer-2",
      subject: "Estimate",
      lineItems: [{ label: "Scope", amount: 100 }],
    },
    agreementSnapshot: {
      title: "Agreement",
      terms: "Term one",
    },
  };

  assert.equal(estimateSnapshotAvailable(share), true);
  assert.throws(
    () => validateImmutableShareSnapshots(share),
    /invalid customer connection/i,
  );
});

test("unhashed shares validate lead and estimate identities independently", () => {
  const share = {
    id: "share-legacy-conflict",
    type: "estimate",
    leadId: "lead-1",
    customerId: "customer-1",
    leadSnapshot: {
      leadId: "lead-2",
      customerId: "customer-2",
    },
    estimateSnapshot: {
      leadId: "lead-1",
      customerId: "customer-1",
      subject: "Estimate",
      lineItems: [{ label: "Scope", amount: 100 }],
    },
    agreementSnapshot: {
      title: "Agreement",
      terms: "Term one",
    },
  };

  assert.equal(estimateSnapshotAvailable(share), true);
  assert.throws(
    () => validateImmutableShareSnapshots(share),
    /invalid lead connection/i,
  );
});

test("legacy snapshots without frozen lead and customer IDs require republish", () => {
  assert.throws(
    () =>
      validateImmutableShareSnapshots({
        id: "share-legacy",
        type: "estimate",
        leadId: "lead-1",
        customerId: "customer-1",
        leadSnapshot: {
          clientName: "Investor One",
        },
        estimateSnapshot: {
          subject: "Legacy estimate",
          lineItems: [{ label: "Scope", amount: 100 }],
        },
        agreementSnapshot: {
          title: "Agreement",
          terms: "Term one",
        },
      }),
    /frozen published version/i,
  );
});

test("schema-versioned shares reject frozen content tampering", () => {
  const share = {
    id: "share-1",
    versionId: "share-1",
    type: "estimate",
    schemaVersion: 2,
    leadId: "lead-1",
    customerId: "customer-1",
    signingMode: "signature",
    leadSnapshot: {
      leadId: "lead-1",
      customerId: "customer-1",
      clientName: "Investor One",
      projectAddress: "123 Main Street",
    },
    estimateSnapshot: {
      id: "lead-1",
      leadId: "lead-1",
      customerId: "customer-1",
      subject: "Estimate",
      lineItems: [{ label: "Scope", amount: 100 }],
      subtotal: 100,
      contractDetails: {
        approximateStartDate: "2026-09-01",
        approximateCompletionDate: "2026-10-15",
      },
    },
    agreementSnapshot: {
      title: "Agreement",
      terms: "Term one",
    },
  };
  share.contentHash = estimateVersionContentHash(share);

  assert.doesNotThrow(() => validateImmutableShareSnapshots(share));
  assert.throws(
    () =>
      validateImmutableShareSnapshots({
        ...share,
        estimateSnapshot: {
          ...share.estimateSnapshot,
          subtotal: 999,
        },
      }),
    /integrity check/i,
  );
});

test("agreement readiness validates required dates and their order", () => {
  assert.deepEqual(
    agreementReadinessBlockers({
      approximateStartDate: "2026-10-15",
      approximateCompletionDate: "2026-09-01",
    }),
    [
      "Approximate project completion date cannot be before the start date.",
    ],
  );
  assert.equal(
    agreementReadinessBlockers({
      approximateStartDate: "2026-09-01",
      approximateCompletionDate: "2026-10-15",
    }).length,
    0,
  );
});
