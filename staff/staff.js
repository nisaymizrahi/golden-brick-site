import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  initializeFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { buildPolishedEstimatePdf } from "./estimate-pdf.mjs";
import {
  buildPaymentReceiptHtml,
  buildPaymentReceiptNumber,
  buildPaymentReceiptPdf,
  paymentReceiptFilename,
} from "./payment-receipt.mjs";

const VIEW_META = {
  "today-view": {
    title: "Dashboard",
    subtitle:
      "Start with what needs attention next: fresh leads, follow-ups, today's schedule, client messages, and active jobs.",
  },
  "tasks-view": {
    title: "Tasks",
    subtitle:
      "Track next actions across leads, customers, and active jobs in one queue.",
  },
  "leads-view": {
    title: "Pipeline",
    subtitle:
      "Search, filter, assign, update, and safely archive leads from a cleaner list-first workflow.",
  },
  "customers-view": {
    title: "Customers",
    subtitle:
      "Keep repeat-client history in one card with linked leads, jobs, payments, and active opportunities.",
  },
  "jobs-view": {
    title: "Projects",
    subtitle:
      "Run active work from a focused job workspace with schedule, client updates, tasks, documents, billing, and safe archive controls.",
  },
  "site-projects-view": {
    title: "Site Projects",
    subtitle:
      "Publish upcoming and finished investor-facing projects to the public website with clean descriptions and approved photos.",
  },
  "calendar-view": {
    title: "Calendar",
    subtitle:
      "Schedule crew work, estimate appointments, inspections, deliveries, milestones, and client-visible job updates.",
  },
  "vendors-view": {
    title: "Vendors",
    subtitle:
      "Manage trade partners, what we owe them, and the agreements, insurance, and W-9 files that support the relationship.",
  },
  "staff-view": {
    title: "Settings",
    subtitle:
      "Manage staff access, portal queue, service templates, team workload, and the restore-safe trash area.",
  },
};

const STATUS_META = {
  new_lead: "New Lead",
  follow_up: "Follow Up",
  estimate_sent: "Estimate Sent",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const TASK_STATUS_META = {
  open: "Open",
  in_progress: "In Progress",
  waiting: "Waiting",
  completed: "Completed",
};

const PRIORITY_META = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const JOB_STATUS_META = {
  planning: "Planning",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
};

const CALENDAR_TYPE_META = {
  job_work: "Job work",
  estimate_appointment: "Estimate appointment",
  milestone: "Milestone",
  inspection: "Inspection",
  delivery: "Delivery",
  client_update: "Client update",
  internal: "Internal",
};

const CALENDAR_STATUS_META = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  needs_attention: "Needs attention",
  completed: "Completed",
};

const CHANGE_ORDER_STATUS_META = {
  draft: "Draft",
  approved: "Approved",
  void: "Void",
};

const DOCUMENT_CATEGORY_META = {
  agreement: "Agreement",
  estimate: "Estimate",
  change_order: "Change Order",
  receipt: "Receipt",
  permit: "Permit",
  invoice: "Invoice",
  photo: "Photo",
  closeout: "Closeout",
  other: "Other",
};

const DOCUMENT_SOURCE_META = {
  upload: "Uploaded file",
  link: "External link",
  manual: "Manual record",
};

const PAYMENT_TYPE_META = {
  deposit: "Deposit",
  progress: "Progress",
  final: "Final",
  adjustment: "Adjustment",
};

const INVOICE_STATUS_META = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
};

const SERVICE_PAYMENT_RULE_META = {
  upfront_required: "Upfront required",
  can_pay_later: "Can pay later",
};

const SERVICE_BILLING_META = {
  awaiting_payment: "Awaiting payment",
  payment_link_ready: "Payment link ready",
  partially_paid: "Partially paid",
  paid: "Paid",
  can_pay_later: "Can pay later",
};

const JOB_KIND_META = {
  service_order: "Service order",
  standard: "Project",
};

const VENDOR_STATUS_META = {
  active: "Active",
  inactive: "Inactive",
  on_hold: "On Hold",
  do_not_pay: "Do Not Pay",
};

const VENDOR_INSURANCE_STATUS_META = {
  compliant: "Compliant",
  in_progress: "In Progress",
  expired: "Expired",
  non_compliant: "Non-Compliant",
  undecided: "Undecided",
};

const VENDOR_PAYMENT_METHOD_META = {
  ach: "ACH",
  check: "Check",
  wire: "Wire",
  credit_card: "Credit Card",
  cash: "Cash",
  zelle: "Zelle",
  other: "Other",
};

const VENDOR_BILL_STATUS_META = {
  open: "Open",
  scheduled: "Scheduled",
  paid: "Paid",
  void: "Void",
};

const VENDOR_DOCUMENT_CATEGORY_META = {
  agreement: "Agreement",
  w9: "W-9",
  insurance: "Insurance",
  license: "License",
  invoice: "Invoice",
  quote: "Quote",
  other: "Other",
};

const VENDOR_DOCUMENT_ACCESS_META = {
  staff: "Staff",
  admin_only: "Admin Only",
};

const VENDOR_TRADE_OPTIONS = [
  { id: "plumbing", label: "Plumbing" },
  { id: "electrical", label: "Electrical" },
  { id: "hvac", label: "HVAC" },
  { id: "roofing", label: "Roofing" },
  { id: "framing", label: "Framing" },
  { id: "drywall", label: "Drywall" },
  { id: "painting", label: "Painting" },
  { id: "flooring", label: "Flooring" },
  { id: "tile", label: "Tile" },
  { id: "carpentry", label: "Carpentry" },
  { id: "demolition", label: "Demolition" },
  { id: "dumpster", label: "Dumpster" },
  { id: "materials", label: "Materials" },
  { id: "windows_doors", label: "Windows & Doors" },
  { id: "masonry", label: "Masonry" },
  { id: "permits", label: "Permits / Expediting" },
  { id: "cleaning", label: "Cleaning / Turnover" },
  { id: "supplier", label: "Supplier" },
];

const PENNSYLVANIA_HIC_REGISTRATION_NUMBER = "PA212716";
const PHILADELPHIA_GC_LICENSE_NUMBER = "065157";
const PA_CONSUMER_PROTECTION_PHONE = "1-888-520-6680";
const CONTRACTOR_BUSINESS_ADDRESS = "5635 Chester Ave, Philadelphia, PA 19143";

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

const DEFAULT_ESTIMATE_STANDARD_TERMS = [
  `Golden Brick Construction discloses Pennsylvania Home Improvement Contractor Registration No. ${PENNSYLVANIA_HIC_REGISTRATION_NUMBER} and Philadelphia General Contractor License No. ${PHILADELPHIA_GC_LICENSE_NUMBER}. The official registration number can be obtained from the Pennsylvania Office of Attorney General's Bureau of Consumer Protection by calling toll-free within Pennsylvania ${PA_CONSUMER_PROTECTION_PHONE}. Registration does not imply endorsement.`,
  "This estimate reflects the scope, quantities, access assumptions, and material quality level identified at the time it was prepared. Unless noted otherwise in writing, pricing assumes contractor-stock materials and standard installation conditions.",
  "Final pricing, sequencing, and production details remain subject to site verification, accurate field measurements, finish selections, structural discoveries, code requirements, utility conditions, and any revisions approved in writing after this estimate was issued.",
  "Unforeseen concealed, latent, or site conditions discovered after work begins are not included in this estimate. If those conditions affect scope, cost, sequencing, or duration, Golden Brick Construction will document the revision in writing before additional work proceeds.",
  "Permits, inspections, engineering input, specialty vendor work, and trade coordination are included only when specifically called for by the approved scope or later documented through written revisions.",
  "A signed approval is required before any home improvement work begins. Any requested scope, material, or scheduling changes after estimate approval must be captured in writing and may require revised pricing or a formal change order before added work can begin.",
].join("\n");

const DEFAULT_AGREEMENT_TITLE = "Estimate approval and home improvement agreement";

const DEFAULT_AGREEMENT_INTRO = [
  "This section records the estimate, agreement details, cancellation rights, and required notices for the project.",
  "Once signed, the estimate overview, line items, project notes, agreement details, cancellation notice, and signature record are kept together as the project approval record.",
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

const LEGACY_AGREEMENT_TEMPLATE_TITLES = new Set([
  ["Client", " authorization and agreement"].join(""),
]);

const LEGACY_AGREEMENT_TEMPLATE_INTROS = new Set([
  [
    "If you would like Golden Brick Construction to move forward from this estimate into the next planning and production step, please review and sign the agreement terms below.",
    "Your signature locks the estimate snapshot shown on the client page into the project file so Golden Brick and the client are aligned on the approved scope and commercial terms at the time of acceptance.",
  ].join("\n"),
]);

const LEGACY_AGREEMENT_TEMPLATE_TERMS = new Set([
  [
    [
      "By signing below, you confirm that Golden Brick Construction may move forward based on the estimate scope and pricing snapshot shown on this page, subject to final field",
      " verification and any written revisions agreed by both parties.",
    ].join(""),
    "Any requested scope, material, pricing, or schedule changes after signature must be documented in writing and may require a revised estimate or change order before additional work proceeds.",
    "Scheduling, procurement, and start-date coordination remain subject to site access, deposit and payment coordination, municipal approvals, final measurements, and confirmed finish selections where applicable.",
  ].join("\n"),
]);

const LEGACY_ESTIMATE_TEMPLATE_TERMS = [
  "Pricing is a planning estimate until site conditions, access, finish selections, and final scope are confirmed.",
  "Pricing is a planning estimate until scope, access, existing conditions, and finish selections are confirmed on site.",
  [
    "This estimate is based on standard contractor-stock materials and finishes unless otherwise stated in writing.",
    "Pricing remains subject to final scope confirmation, field measurements, access conditions, and finish selections.",
    "Golden Brick Construction is not responsible for unforeseen concealed, latent, or site conditions discovered after work begins. Any resulting scope, schedule, or pricing adjustments must be documented in writing before additional work proceeds.",
  ].join("\n"),
];

const EMPTY_TEMPLATE = {
  id: "estimate-default",
  name: "Investor Estimate Default",
  subjectTemplate:
    "Golden Brick estimate for {{projectType}} at {{projectAddress}}",
  greeting: "Hi {{clientName}},",
  intro:
    "Thanks for speaking with Golden Brick Construction. Based on the information shared so far, here is a working estimate outline for your project.",
  outro:
    "Please review this estimate and let us know what you would like Golden Brick to adjust before the next step.",
  terms: DEFAULT_ESTIMATE_STANDARD_TERMS,
  agreementTitle: DEFAULT_AGREEMENT_TITLE,
  agreementIntro: DEFAULT_AGREEMENT_INTRO,
  agreementTerms: DEFAULT_AGREEMENT_TERMS,
  contractorBusinessAddress: CONTRACTOR_BUSINESS_ADDRESS,
};

const COMPANY_INFO = {
  name: "Golden Brick Construction",
  phone: "(267) 715-5557",
  email: "info@goldenbrickc.com",
  paRegistrationNumber: PENNSYLVANIA_HIC_REGISTRATION_NUMBER,
  philadelphiaLicenseNumber: PHILADELPHIA_GC_LICENSE_NUMBER,
  insuranceDisclosure: COMPANY_INSURANCE_DISCLOSURE,
};

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
          "Golden Brick reviews the property before purchase, frames likely renovation scope, and gives a fast pricing read so the client can evaluate the deal with more confidence.",
        amount: 100,
      },
    ],
    defaultSummary:
      "This service gives the client a fast Golden Brick review of the property before purchase so they can understand likely construction cost exposure and next-step planning before moving forward on the deal.",
    defaultPlanningNotes:
      "Confirm the property address, investor timeline, and decision deadline. Gather photos, walkthrough notes, MLS details, and any scope priorities before delivering the review.",
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
        label: "Repair scope review",
        description:
          "Golden Brick identifies the likely work required based on the client's goals, project condition, and expected construction path.",
        amount: 175,
      },
      {
        label: "Deal analysis and options",
        description:
          "We provide pricing options, recommended strategy, and deal-analysis guidance so the client can compare renovation directions before making a move.",
        amount: 75,
      },
    ],
    defaultSummary:
      "This service combines scope analysis, pricing direction, and investor-oriented recommendations so the client can compare repair paths, understand likely cost drivers, and make a cleaner deal decision.",
    defaultPlanningNotes:
      "Clarify the client goal first: resale, rental hold, or pre-purchase negotiation. Confirm what level of options analysis they want and whether they need value-engineered ranges or a more decision-ready breakdown.",
    defaultPaymentRequirement: "upfront_required",
    active: true,
  },
];

const ESTIMATE_PDF_THEME = {
  brand: [197, 160, 89],
  brandDeep: [117, 89, 40],
  ink: [23, 18, 13],
  muted: [81, 75, 67],
  soft: [117, 109, 98],
  panel: [250, 248, 244],
  panelStrong: [244, 239, 231],
  line: [229, 222, 210],
  lineStrong: [208, 194, 168],
  dark: [24, 21, 16],
  white: [255, 250, 240],
};

const MOBILE_BREAKPOINT = 860;
const MOBILE_PRIMARY_VIEWS = [
  "today-view",
  "leads-view",
  "jobs-view",
  "calendar-view",
];
const MOBILE_MORE_VIEWS = [
  "tasks-view",
  "customers-view",
  "site-projects-view",
  "staff-view",
  "vendors-view",
];

let jsPdfModulePromise = null;

const refs = {
  authShell: document.getElementById("auth-shell"),
  authFeedback: document.getElementById("auth-feedback"),
  signInButton: document.getElementById("sign-in-button"),
  staffShell: document.getElementById("staff-shell"),
  signOutButton: document.getElementById("sign-out-button"),
  syncStatus: document.getElementById("sync-status"),
  appBanner: document.getElementById("app-banner"),
  workspaceTitle: document.getElementById("workspace-title"),
  workspaceSubtitle: document.getElementById("workspace-subtitle"),
  workspaceCommandBar: document.getElementById("workspace-command-bar"),
  notificationButton: document.getElementById("notification-button"),
  notificationCount: document.getElementById("notification-count"),
  notificationPanel: document.getElementById("notification-panel"),
  notificationList: document.getElementById("notification-list"),
  notificationMarkReadButton: document.getElementById(
    "notification-mark-read-button",
  ),
  todayScopeToggle: document.getElementById("today-scope-toggle"),
  staffFocusShell: document.getElementById("staff-focus-shell"),
  staffFocusSelect: document.getElementById("staff-focus-select"),
  sidebarSummary: document.getElementById("sidebar-summary"),
  currentUserCard: document.getElementById("current-user-card"),
  navButtons: Array.from(document.querySelectorAll(".nav-button")),
  views: Array.from(document.querySelectorAll(".view")),
  adminOnly: Array.from(document.querySelectorAll(".admin-only")),
  toastStack: document.getElementById("toast-stack"),

  todayMetrics: document.getElementById("today-metrics"),
  todayOverdueList: document.getElementById("today-overdue-list"),
  todayDueTodayList: document.getElementById("today-due-today-list"),
  todayNewLeadsList: document.getElementById("today-new-leads-list"),
  todayEstimatesList: document.getElementById("today-estimates-list"),
  todayJobsList: document.getElementById("today-jobs-list"),

  taskMetrics: document.getElementById("task-metrics"),
  taskSearchInput: document.getElementById("task-search-input"),
  taskBucketFilter: document.getElementById("task-bucket-filter"),
  taskNewButton: document.getElementById("task-new-button"),
  taskList: document.getElementById("task-list"),
  taskDetailTitle: document.getElementById("task-detail-title"),
  taskDetailBadge: document.getElementById("task-detail-badge"),
  taskMobileBackButton: document.getElementById("task-mobile-back-button"),
  taskRecordEmpty: document.getElementById("task-record-empty"),
  taskDetailShell: document.getElementById("task-detail-shell"),
  taskForm: document.getElementById("task-form"),
  taskTitleInput: document.getElementById("task-title-input"),
  taskAssigneeSelect: document.getElementById("task-assignee-select"),
  taskStatusSelect: document.getElementById("task-status-select"),
  taskPrioritySelect: document.getElementById("task-priority-select"),
  taskDueDate: document.getElementById("task-due-date"),
  taskDueTime: document.getElementById("task-due-time"),
  taskDuePreview: document.getElementById("task-due-preview"),
  taskLinkedTypeSelect: document.getElementById("task-linked-type-select"),
  taskLinkedRecordSelect: document.getElementById("task-linked-record-select"),
  taskDescriptionInput: document.getElementById("task-description-input"),
  taskRelatedSummary: document.getElementById("task-related-summary"),
  taskCompleteButton: document.getElementById("task-complete-button"),
  taskResetButton: document.getElementById("task-reset-button"),

  leadMetrics: document.getElementById("lead-metrics"),
  leadsView: document.getElementById("leads-view"),
  leadSearchInput: document.getElementById("lead-search-input"),
  leadStageFilter: document.getElementById("lead-stage-filter"),
  leadLayoutToggle: document.getElementById("lead-layout-toggle"),
  leadLayoutButtons: Array.from(
    document.querySelectorAll("[data-lead-layout]"),
  ),
  leadNewButton: document.getElementById("lead-new-button"),
  leadPipelineSurface: document.getElementById("lead-pipeline-surface"),
  leadBoardWrap: document.getElementById("lead-board-wrap"),
  leadResultShell: document.getElementById("lead-result-shell"),
  leadWorkspacePanel: document.getElementById("lead-workspace-panel"),
  leadWorkspaceBackButton: document.getElementById(
    "lead-workspace-back-button",
  ),
  leadWorkspaceMeta: document.getElementById("lead-workspace-meta"),
  leadList: document.getElementById("lead-list"),
  leadBoard: document.getElementById("lead-board"),
  leadRecordTitle: document.getElementById("lead-record-title"),
  leadRecordBadge: document.getElementById("lead-record-badge"),
  leadRecordEmpty: document.getElementById("lead-record-empty"),
  leadRecordShell: document.getElementById("lead-record-shell"),
  leadCoreForm: document.getElementById("lead-core-form"),
  leadCreateTaskButton: document.getElementById("lead-create-task-button"),
  leadClientName: document.getElementById("lead-client-name"),
  leadClientEmail: document.getElementById("lead-client-email"),
  leadClientPhone: document.getElementById("lead-client-phone"),
  leadProjectAddress: document.getElementById("lead-project-address"),
  leadProjectType: document.getElementById("lead-project-type"),
  leadStageSelect: document.getElementById("lead-stage-select"),
  leadAssigneeSelect: document.getElementById("lead-assignee-select"),
  leadCustomerSelect: document.getElementById("lead-customer-select"),
  leadSourceDisplay: document.getElementById("lead-source-display"),
  leadEstimateDisplay: document.getElementById("lead-estimate-display"),
  leadNotesInput: document.getElementById("lead-notes-input"),
  leadPlanningNotesInput: document.getElementById("lead-planning-notes-input"),
  leadMeta: document.getElementById("lead-meta"),
  leadCustomerMatch: document.getElementById("lead-customer-match"),
  leadRecordContext: document.getElementById("lead-record-context"),
  leadOverviewSummary: document.getElementById("lead-overview-summary"),
  leadTabButtons: Array.from(document.querySelectorAll("[data-lead-tab]")),
  estimateForm: document.getElementById("estimate-form"),
  estimateAiButton: document.getElementById("estimate-ai-button"),
  estimateShareStatusPill: document.getElementById(
    "estimate-share-status-pill",
  ),
  estimateSharePanel: document.getElementById("estimate-share-panel"),
  estimateShareMeta: document.getElementById("estimate-share-meta"),
  estimateWorkflowIdentity: document.getElementById(
    "estimate-workflow-identity",
  ),
  estimateSaveState: document.getElementById("estimate-save-state"),
  estimateWorkflowMessage: document.getElementById(
    "estimate-workflow-message",
  ),
  estimatePublishPreflight: document.getElementById(
    "estimate-publish-preflight",
  ),
  estimateShareLinkInput: document.getElementById("estimate-share-link-input"),
  estimateShareCreateButton: document.getElementById(
    "estimate-share-create-button",
  ),
  estimateShareCopyButton: document.getElementById(
    "estimate-share-copy-button",
  ),
  estimateShareRevokeButton: document.getElementById(
    "estimate-share-revoke-button",
  ),
  leadEstimateClientSummary: document.getElementById(
    "lead-estimate-client-summary",
  ),
  leadEstimateClientList: document.getElementById("lead-estimate-client-list"),
  estimateAddLineButton: document.getElementById("estimate-add-line-button"),
  estimateCopyButton: document.getElementById("estimate-copy-button"),
  estimatePrintButton: document.getElementById("estimate-print-button"),
  estimateSubject: document.getElementById("estimate-subject"),
  estimateBody: document.getElementById("estimate-body"),
  estimateStartDate: document.getElementById("estimate-start-date"),
  estimateCompletionDate: document.getElementById("estimate-completion-date"),
  estimatePaymentSchedule: document.getElementById("estimate-payment-schedule"),
  estimateSpecialOrderMaterials: document.getElementById(
    "estimate-special-order-materials",
  ),
  estimateKnownSubcontractors: document.getElementById(
    "estimate-known-subcontractors",
  ),
  estimateAssumptions: document.getElementById("estimate-assumptions"),
  estimateStandardTermsDisplay: document.getElementById(
    "estimate-standard-terms-display",
  ),
  estimateLines: document.getElementById("estimate-lines"),
  estimateSubtotal: document.getElementById("estimate-subtotal"),
  estimatePreview: document.getElementById("estimate-preview"),
  estimateMobileAddLineButton: document.getElementById(
    "estimate-mobile-add-line-button",
  ),
  estimateMobileDownloadButton: document.getElementById(
    "estimate-mobile-download-button",
  ),
  estimatePreviewToggle: document.getElementById("estimate-preview-toggle"),
  estimateSaveButtons: Array.from(
    document.querySelectorAll("[data-estimate-save-button]"),
  ),
  leadTaskList: document.getElementById("lead-task-list"),
  leadTaskDrawerButton: document.getElementById("lead-task-drawer-button"),
  leadDocumentSummary: document.getElementById("lead-document-summary"),
  leadDocumentForm: document.getElementById("lead-document-form"),
  leadDocumentCategory: document.getElementById("lead-document-category"),
  leadDocumentSourceType: document.getElementById("lead-document-source-type"),
  leadDocumentDate: document.getElementById("lead-document-date"),
  leadDocumentTitle: document.getElementById("lead-document-title"),
  leadDocumentUrlRow: document.getElementById("lead-document-url-row"),
  leadDocumentUrl: document.getElementById("lead-document-url"),
  leadDocumentFileRow: document.getElementById("lead-document-file-row"),
  leadDocumentFile: document.getElementById("lead-document-file"),
  leadDocumentNote: document.getElementById("lead-document-note"),
  leadDocumentClientVisible: document.getElementById(
    "lead-document-client-visible",
  ),
  leadDocumentList: document.getElementById("lead-document-list"),
  noteForm: document.getElementById("note-form"),
  noteBody: document.getElementById("note-body"),
  noteList: document.getElementById("note-list"),
  leadJobSummary: document.getElementById("lead-job-summary"),
  leadMarkWonButton: document.getElementById("lead-mark-won-button"),
  leadMarkLostButton: document.getElementById("lead-mark-lost-button"),
  leadArchiveButton: document.getElementById("lead-archive-button"),

  customerMetrics: document.getElementById("customer-metrics"),
  customerSearchInput: document.getElementById("customer-search-input"),
  customerNewButton: document.getElementById("customer-new-button"),
  customerList: document.getElementById("customer-list"),
  customerRecordTitle: document.getElementById("customer-record-title"),
  customerRecordBadge: document.getElementById("customer-record-badge"),
  customerMobileBackButton: document.getElementById(
    "customer-mobile-back-button",
  ),
  customerRecordEmpty: document.getElementById("customer-record-empty"),
  customerRecordShell: document.getElementById("customer-record-shell"),
  customerForm: document.getElementById("customer-form"),
  customerNameInput: document.getElementById("customer-name-input"),
  customerEmailInput: document.getElementById("customer-email-input"),
  customerPhoneInput: document.getElementById("customer-phone-input"),
  customerAddressInput: document.getElementById("customer-address-input"),
  customerNotesInput: document.getElementById("customer-notes-input"),
  customerCreateLeadButton: document.getElementById(
    "customer-create-lead-button",
  ),
  customerRecordContext: document.getElementById("customer-record-context"),
  customerSummary: document.getElementById("customer-summary"),
  customerOpportunitiesList: document.getElementById(
    "customer-opportunities-list",
  ),
  customerJobsList: document.getElementById("customer-jobs-list"),
  customerCurrentEstimate: document.getElementById("customer-current-estimate"),
  customerTaskList: document.getElementById("customer-task-list"),
  customerPortalPreviewLink: document.getElementById(
    "customer-portal-preview-link",
  ),
  customerPortalSummary: document.getElementById("customer-portal-summary"),
  customerPortalContactForm: document.getElementById(
    "customer-portal-contact-form",
  ),
  customerPortalContactName: document.getElementById(
    "customer-portal-contact-name",
  ),
  customerPortalContactEmail: document.getElementById(
    "customer-portal-contact-email",
  ),
  customerPortalContactPhone: document.getElementById(
    "customer-portal-contact-phone",
  ),
  customerPortalContactRole: document.getElementById(
    "customer-portal-contact-role",
  ),
  customerPortalContactResetButton: document.getElementById(
    "customer-portal-contact-reset-button",
  ),
  customerPortalContactList: document.getElementById(
    "customer-portal-contact-list",
  ),
  customerPortalPublishingSummary: document.getElementById(
    "customer-portal-publishing-summary",
  ),
  customerPortalEstimateList: document.getElementById(
    "customer-portal-estimate-list",
  ),
  customerPortalInvoiceList: document.getElementById(
    "customer-portal-invoice-list",
  ),
  customerPortalChangeOrderList: document.getElementById(
    "customer-portal-change-order-list",
  ),
  customerPortalDocumentList: document.getElementById(
    "customer-portal-document-list",
  ),
  customerPortalMarkReadButton: document.getElementById(
    "customer-portal-mark-read-button",
  ),
  customerPortalThreadList: document.getElementById(
    "customer-portal-thread-list",
  ),
  customerPortalThreadSummary: document.getElementById(
    "customer-portal-thread-summary",
  ),
  customerPortalMessageList: document.getElementById(
    "customer-portal-message-list",
  ),
  customerPortalMessageForm: document.getElementById(
    "customer-portal-message-form",
  ),
  customerPortalMessageBody: document.getElementById(
    "customer-portal-message-body",
  ),
  customerDocumentForm: document.getElementById("customer-document-form"),
  customerDocumentTargetSelect: document.getElementById(
    "customer-document-target-select",
  ),
  customerDocumentCategory: document.getElementById(
    "customer-document-category",
  ),
  customerDocumentSourceType: document.getElementById(
    "customer-document-source-type",
  ),
  customerDocumentDate: document.getElementById("customer-document-date"),
  customerDocumentTitle: document.getElementById("customer-document-title"),
  customerDocumentUrlRow: document.getElementById("customer-document-url-row"),
  customerDocumentUrl: document.getElementById("customer-document-url"),
  customerDocumentFileRow: document.getElementById(
    "customer-document-file-row",
  ),
  customerDocumentFile: document.getElementById("customer-document-file"),
  customerDocumentNote: document.getElementById("customer-document-note"),
  customerDocumentClientVisible: document.getElementById(
    "customer-document-client-visible",
  ),
  customerDocumentSummary: document.getElementById("customer-document-summary"),
  customerDocumentList: document.getElementById("customer-document-list"),
  customerTaskForm: document.getElementById("customer-task-form"),
  customerTaskTitle: document.getElementById("customer-task-title"),
  customerTaskDueDate: document.getElementById("customer-task-due-date"),
  customerTaskDueTime: document.getElementById("customer-task-due-time"),
  customerTaskDuePreview: document.getElementById(
    "customer-task-due-preview",
  ),
  customerTaskPriority: document.getElementById("customer-task-priority"),
  customerTaskAssignee: document.getElementById("customer-task-assignee"),

  jobMetrics: document.getElementById("job-metrics"),
  jobsView: document.getElementById("jobs-view"),
  jobSearchInput: document.getElementById("job-search-input"),
  jobStatusFilterButtons: Array.from(
    document.querySelectorAll("[data-job-status-filter]"),
  ),
  jobNewButton: document.getElementById("job-new-button"),
  jobNewServiceOrderButton: document.getElementById(
    "job-new-service-order-button",
  ),
  jobList: document.getElementById("job-list"),
  jobListHeading: document.getElementById("job-list-heading"),
  jobProjectSwitcherSelect: document.getElementById(
    "job-project-switcher-select",
  ),
  jobRecordTitle: document.getElementById("job-record-title"),
  jobWorkspaceMeta: document.getElementById("job-workspace-meta"),
  jobWorkspaceBackButton: document.getElementById("job-workspace-back-button"),
  jobRecordBadge: document.getElementById("job-record-badge"),
  jobMobileBackButton: document.getElementById("job-mobile-back-button"),
  jobRecordEmpty: document.getElementById("job-record-empty"),
  jobRecordShell: document.getElementById("job-record-shell"),
  jobAddExpenseButton: document.getElementById("job-add-expense-button"),
  jobAddChangeOrderButton: document.getElementById(
    "job-add-change-order-button",
  ),
  jobAddCalendarButton: document.getElementById("job-add-calendar-button"),
  jobCompleteButton: document.getElementById("job-complete-button"),
  jobAddPaymentButton: document.getElementById("job-add-payment-button"),
  jobAddInvoiceButton: document.getElementById("job-add-invoice-button"),
  jobAddDocumentButton: document.getElementById("job-add-document-button"),
  jobAddNoteButton: document.getElementById("job-add-note-button"),
  jobSummaryStrip: document.getElementById("job-summary-strip"),
  jobTabButtons: Array.from(document.querySelectorAll("[data-job-tab]")),
  jobOpenEstimateButton: document.getElementById("job-open-estimate-button"),
  jobDeleteButton: document.getElementById("job-delete-button"),
  jobCoreForm: document.getElementById("job-core-form"),
  jobStatusSelect: document.getElementById("job-status-select"),
  jobBaseContractInput: document.getElementById("job-base-contract-input"),
  jobOwnerSelect: document.getElementById("job-owner-select"),
  jobCustomerSelect: document.getElementById("job-customer-select"),
  jobClientNameInput: document.getElementById("job-client-name-input"),
  jobClientPhoneInput: document.getElementById("job-client-phone-input"),
  jobClientEmailInput: document.getElementById("job-client-email-input"),
  jobProjectTypeInput: document.getElementById("job-project-type-input"),
  jobProjectAddressInput: document.getElementById("job-project-address-input"),
  jobTotalRevenueDisplay: document.getElementById("job-total-revenue-display"),
  jobLinkedLeadDisplay: document.getElementById("job-linked-lead-display"),
  jobPlanningNotesInput: document.getElementById("job-planning-notes-input"),
  jobPhaseLabelInput: document.getElementById("job-phase-label-input"),
  jobTargetWindowInput: document.getElementById("job-target-window-input"),
  jobTargetDateInput: document.getElementById("job-target-date-input"),
  jobNextStepInput: document.getElementById("job-next-step-input"),
  jobSharedStatusNoteInput: document.getElementById(
    "job-shared-status-note-input",
  ),
  jobRecordContext: document.getElementById("job-record-context"),
  jobOverviewSummary: document.getElementById("job-overview-summary"),
  jobWorkSummary: document.getElementById("job-work-summary"),
  jobWorkTaskList: document.getElementById("job-work-task-list"),
  jobWorkScheduleList: document.getElementById("job-work-schedule-list"),
  jobWorkFinancials: document.getElementById("job-work-financials"),
  jobWorkCalendarButton: document.getElementById("job-work-calendar-button"),
  jobCalendarSummary: document.getElementById("job-calendar-summary"),
  jobCalendarList: document.getElementById("job-calendar-list"),
  jobCalendarFocusButton: document.getElementById("job-calendar-focus-button"),
  jobEstimateSummary: document.getElementById("job-estimate-summary"),
  jobEstimateStatus: document.getElementById("job-estimate-status"),
  jobEstimatePreview: document.getElementById("job-estimate-preview"),
  jobEstimateActions: document.getElementById("job-estimate-actions"),
  jobEstimateOpenLeadButton: document.getElementById(
    "job-estimate-open-lead-button",
  ),
  jobEstimateDownloadButton: document.getElementById(
    "job-estimate-download-button",
  ),
  jobGenerateCloseoutButton: document.getElementById(
    "job-generate-closeout-button",
  ),
  workerAssignmentList: document.getElementById("worker-assignment-list"),
  jobOpenLeadButton: document.getElementById("job-open-lead-button"),
  jobRevenueSummary: document.getElementById("job-revenue-summary"),
  changeOrderForm: document.getElementById("change-order-form"),
  changeOrderTitle: document.getElementById("change-order-title"),
  changeOrderAmount: document.getElementById("change-order-amount"),
  changeOrderStatus: document.getElementById("change-order-status"),
  changeOrderDate: document.getElementById("change-order-date"),
  changeOrderNote: document.getElementById("change-order-note"),
  changeOrderSubmitButton: document.getElementById(
    "change-order-submit-button",
  ),
  changeOrderResetButton: document.getElementById("change-order-reset-button"),
  changeOrderList: document.getElementById("change-order-list"),
  jobChangeOrderFocusButton: document.getElementById(
    "job-change-order-focus-button",
  ),
  expenseForm: document.getElementById("expense-form"),
  expenseAmount: document.getElementById("expense-amount"),
  expenseDate: document.getElementById("expense-date"),
  expenseCategory: document.getElementById("expense-category"),
  expenseVendorSelect: document.getElementById("expense-vendor-select"),
  expenseVendor: document.getElementById("expense-vendor"),
  expenseReceiptSelect: document.getElementById("expense-receipt-select"),
  expenseNote: document.getElementById("expense-note"),
  expenseSubmitButton: document.getElementById("expense-submit-button"),
  expenseResetButton: document.getElementById("expense-reset-button"),
  expenseList: document.getElementById("expense-list"),
  paymentForm: document.getElementById("payment-form"),
  paymentAmount: document.getElementById("payment-amount"),
  paymentDate: document.getElementById("payment-date"),
  paymentType: document.getElementById("payment-type"),
  paymentMethod: document.getElementById("payment-method"),
  paymentReference: document.getElementById("payment-reference"),
  paymentNote: document.getElementById("payment-note"),
  paymentGenerateReceipt: document.getElementById(
    "payment-generate-receipt",
  ),
  paymentSendReceipt: document.getElementById("payment-send-receipt"),
  paymentReceiptDeliveryCopy: document.getElementById(
    "payment-receipt-delivery-copy",
  ),
  paymentList: document.getElementById("payment-list"),
  jobInvoiceSummary: document.getElementById("job-invoice-summary"),
  jobInvoiceList: document.getElementById("job-invoice-list"),
  invoiceForm: document.getElementById("invoice-form"),
  invoiceNewButton: document.getElementById("invoice-new-button"),
  invoiceImportEstimateButton: document.getElementById(
    "invoice-import-estimate-button",
  ),
  invoiceAddLineButton: document.getElementById("invoice-add-line-button"),
  invoiceAddCustomFieldButton: document.getElementById(
    "invoice-add-custom-field-button",
  ),
  invoiceGenerateLinkButton: document.getElementById(
    "invoice-generate-link-button",
  ),
  invoiceCopyLinkButton: document.getElementById("invoice-copy-link-button"),
  invoiceDownloadButton: document.getElementById("invoice-download-button"),
  invoiceReceiptButton: document.getElementById("invoice-receipt-button"),
  invoiceSendReceiptButton: document.getElementById(
    "invoice-send-receipt-button",
  ),
  invoiceMarkPaidButton: document.getElementById("invoice-mark-paid-button"),
  invoiceBillingState: document.getElementById("invoice-billing-state"),
  invoiceTitle: document.getElementById("invoice-title"),
  invoiceNumber: document.getElementById("invoice-number"),
  invoiceStatusDisplay: document.getElementById("invoice-status-display"),
  invoiceIssueDate: document.getElementById("invoice-issue-date"),
  invoiceDueDate: document.getElementById("invoice-due-date"),
  invoiceSummary: document.getElementById("invoice-summary"),
  invoiceCustomFields: document.getElementById("invoice-custom-fields"),
  invoiceLines: document.getElementById("invoice-lines"),
  invoiceSubtotal: document.getElementById("invoice-subtotal"),
  invoiceNotes: document.getElementById("invoice-notes"),
  invoicePaidDate: document.getElementById("invoice-paid-date"),
  invoicePaymentMethod: document.getElementById("invoice-payment-method"),
  invoicePaymentReference: document.getElementById("invoice-payment-reference"),
  invoicePaymentNote: document.getElementById("invoice-payment-note"),
  invoicePreview: document.getElementById("invoice-preview"),
  jobScopeSummary: document.getElementById("job-scope-summary"),
  jobScopeList: document.getElementById("job-scope-list"),
  jobScopeImportButton: document.getElementById("job-scope-import-button"),
  jobTeamFinancialSummary: document.getElementById(
    "job-team-financial-summary",
  ),
  jobCommissionStatus: document.getElementById("job-commission-status"),
  commissionBreakdown: document.getElementById("commission-breakdown"),
  jobCommissionSnapshot: document.getElementById("job-commission-snapshot"),
  jobReopenUnlockButton: document.getElementById("job-reopen-unlock-button"),
  jobTaskList: document.getElementById("job-task-list"),
  jobTaskDrawerButton: document.getElementById("job-task-drawer-button"),
  jobNoteForm: document.getElementById("job-note-form"),
  jobNoteBody: document.getElementById("job-note-body"),
  jobHistoryList: document.getElementById("job-history-list"),
  jobDocumentSummary: document.getElementById("job-document-summary"),
  jobDocumentForm: document.getElementById("job-document-form"),
  jobDocumentCategory: document.getElementById("job-document-category"),
  jobDocumentSourceType: document.getElementById("job-document-source-type"),
  jobDocumentDate: document.getElementById("job-document-date"),
  jobDocumentTitle: document.getElementById("job-document-title"),
  jobDocumentUrlRow: document.getElementById("job-document-url-row"),
  jobDocumentUrl: document.getElementById("job-document-url"),
  jobDocumentFileRow: document.getElementById("job-document-file-row"),
  jobDocumentFile: document.getElementById("job-document-file"),
  jobDocumentNote: document.getElementById("job-document-note"),
  jobDocumentClientVisible: document.getElementById(
    "job-document-client-visible",
  ),
  jobDocumentList: document.getElementById("job-document-list"),

  calendarMetrics: document.getElementById("calendar-metrics"),
  calendarScopeFilter: document.getElementById("calendar-scope-filter"),
  calendarStatusFilter: document.getElementById("calendar-status-filter"),
  calendarStaffFilter: document.getElementById("calendar-staff-filter"),
  calendarProjectFilter: document.getElementById("calendar-project-filter"),
  calendarList: document.getElementById("calendar-list"),
  calendarEventForm: document.getElementById("calendar-event-form"),
  calendarTitleInput: document.getElementById("calendar-title-input"),
  calendarTypeSelect: document.getElementById("calendar-type-select"),
  calendarEventStatusSelect: document.getElementById(
    "calendar-event-status-select",
  ),
  calendarStartInput: document.getElementById("calendar-start-input"),
  calendarEndInput: document.getElementById("calendar-end-input"),
  calendarAllDayInput: document.getElementById("calendar-all-day-input"),
  calendarLinkedProjectSelect: document.getElementById(
    "calendar-linked-project-select",
  ),
  calendarLinkedLeadSelect: document.getElementById(
    "calendar-linked-lead-select",
  ),
  calendarLinkedCustomerSelect: document.getElementById(
    "calendar-linked-customer-select",
  ),
  calendarAssignedStaffSelect: document.getElementById(
    "calendar-assigned-staff-select",
  ),
  calendarClientVisibleInput: document.getElementById(
    "calendar-client-visible-input",
  ),
  calendarClientTitleInput: document.getElementById(
    "calendar-client-title-input",
  ),
  calendarClientNoteInput: document.getElementById(
    "calendar-client-note-input",
  ),
  calendarInternalNoteInput: document.getElementById(
    "calendar-internal-note-input",
  ),
  calendarResetButton: document.getElementById("calendar-reset-button"),
  googleCalendarConnection: document.getElementById(
    "google-calendar-connection",
  ),
  googleCalendarStatusTitle: document.getElementById(
    "google-calendar-status-title",
  ),
  googleCalendarStatusCopy: document.getElementById(
    "google-calendar-status-copy",
  ),
  googleCalendarConnectButton: document.getElementById(
    "google-calendar-connect-button",
  ),
  googleCalendarDisconnectButton: document.getElementById(
    "google-calendar-disconnect-button",
  ),

  vendorMetrics: document.getElementById("vendor-metrics"),
  vendorSearchInput: document.getElementById("vendor-search-input"),
  vendorTradeFilter: document.getElementById("vendor-trade-filter"),
  vendorStatusFilter: document.getElementById("vendor-status-filter"),
  vendorBillFilter: document.getElementById("vendor-bill-filter"),
  vendorNewButton: document.getElementById("vendor-new-button"),
  vendorList: document.getElementById("vendor-list"),
  vendorRecordTitle: document.getElementById("vendor-record-title"),
  vendorRecordBadge: document.getElementById("vendor-record-badge"),
  vendorMobileBackButton: document.getElementById("vendor-mobile-back-button"),
  vendorRecordEmpty: document.getElementById("vendor-record-empty"),
  vendorRecordShell: document.getElementById("vendor-record-shell"),
  vendorAddBillButton: document.getElementById("vendor-add-bill-button"),
  vendorAddDocumentButton: document.getElementById(
    "vendor-add-document-button",
  ),
  vendorRecordContext: document.getElementById("vendor-record-context"),
  vendorTabButtons: Array.from(document.querySelectorAll("[data-vendor-tab]")),
  vendorForm: document.getElementById("vendor-form"),
  vendorNameInput: document.getElementById("vendor-name-input"),
  vendorLegalNameInput: document.getElementById("vendor-legal-name-input"),
  vendorStatusInput: document.getElementById("vendor-status-input"),
  vendorPaymentMethodInput: document.getElementById(
    "vendor-payment-method-input",
  ),
  vendorTradeGrid: document.getElementById("vendor-trade-grid"),
  vendorTradeOtherInput: document.getElementById("vendor-trade-other-input"),
  vendorContactNameInput: document.getElementById("vendor-contact-name-input"),
  vendorPhoneInput: document.getElementById("vendor-phone-input"),
  vendorEmailInput: document.getElementById("vendor-email-input"),
  vendorAddressInput: document.getElementById("vendor-address-input"),
  vendorServiceAreaInput: document.getElementById("vendor-service-area-input"),
  vendorDefaultTermsInput: document.getElementById(
    "vendor-default-terms-input",
  ),
  vendorInsuranceStatusInput: document.getElementById(
    "vendor-insurance-status-input",
  ),
  vendorInsuranceExpirationInput: document.getElementById(
    "vendor-insurance-expiration-input",
  ),
  vendorLicenseExpirationInput: document.getElementById(
    "vendor-license-expiration-input",
  ),
  vendorInsuranceNoteInput: document.getElementById(
    "vendor-insurance-note-input",
  ),
  vendorNotesInput: document.getElementById("vendor-notes-input"),
  vendorSummary: document.getElementById("vendor-summary"),
  vendorJobList: document.getElementById("vendor-job-list"),
  vendorBillForm: document.getElementById("vendor-bill-form"),
  vendorBillAmountInput: document.getElementById("vendor-bill-amount-input"),
  vendorBillNumberInput: document.getElementById("vendor-bill-number-input"),
  vendorBillInvoiceDateInput: document.getElementById(
    "vendor-bill-invoice-date-input",
  ),
  vendorBillDueDateInput: document.getElementById("vendor-bill-due-date-input"),
  vendorBillStatusInput: document.getElementById("vendor-bill-status-input"),
  vendorBillProjectInput: document.getElementById("vendor-bill-project-input"),
  vendorBillCategoryInput: document.getElementById(
    "vendor-bill-category-input",
  ),
  vendorBillPaymentMethodInput: document.getElementById(
    "vendor-bill-payment-method-input",
  ),
  vendorBillPaymentReferenceInput: document.getElementById(
    "vendor-bill-payment-reference-input",
  ),
  vendorBillSourceTypeInput: document.getElementById(
    "vendor-bill-source-type-input",
  ),
  vendorBillUrlRow: document.getElementById("vendor-bill-url-row"),
  vendorBillUrlInput: document.getElementById("vendor-bill-url-input"),
  vendorBillFileRow: document.getElementById("vendor-bill-file-row"),
  vendorBillFileInput: document.getElementById("vendor-bill-file-input"),
  vendorBillNoteInput: document.getElementById("vendor-bill-note-input"),
  vendorPayableSummary: document.getElementById("vendor-payable-summary"),
  vendorBillList: document.getElementById("vendor-bill-list"),
  vendorDocumentSummary: document.getElementById("vendor-document-summary"),
  vendorDocumentForm: document.getElementById("vendor-document-form"),
  vendorDocumentCategoryInput: document.getElementById(
    "vendor-document-category-input",
  ),
  vendorDocumentAccessInput: document.getElementById(
    "vendor-document-access-input",
  ),
  vendorDocumentSourceTypeInput: document.getElementById(
    "vendor-document-source-type-input",
  ),
  vendorDocumentDateInput: document.getElementById(
    "vendor-document-date-input",
  ),
  vendorDocumentExpirationInput: document.getElementById(
    "vendor-document-expiration-input",
  ),
  vendorDocumentTitleInput: document.getElementById(
    "vendor-document-title-input",
  ),
  vendorDocumentUrlRow: document.getElementById("vendor-document-url-row"),
  vendorDocumentUrlInput: document.getElementById("vendor-document-url-input"),
  vendorDocumentFileRow: document.getElementById("vendor-document-file-row"),
  vendorDocumentFileInput: document.getElementById(
    "vendor-document-file-input",
  ),
  vendorDocumentNoteInput: document.getElementById(
    "vendor-document-note-input",
  ),
  vendorDocumentList: document.getElementById("vendor-document-list"),

  staffList: document.getElementById("staff-list"),
  staffAdminShell: document.getElementById("staff-admin-shell"),
  adminSectionButtons: Array.from(
    document.querySelectorAll("[data-admin-section]"),
  ),
  staffEmployeeMessage: document.getElementById("staff-employee-message"),
  portalQueueSummary: document.getElementById("portal-queue-summary"),
  portalQueueList: document.getElementById("portal-queue-list"),
  trashSummary: document.getElementById("trash-summary"),
  trashList: document.getElementById("trash-list"),
  staffWorkloadSummary: document.getElementById("staff-workload-summary"),
  staffWorkloadList: document.getElementById("staff-workload-list"),
  staffClearFocusButton: document.getElementById("staff-clear-focus-button"),
  staffForm: document.getElementById("staff-form"),
  staffEmail: document.getElementById("staff-email"),
  staffDisplayName: document.getElementById("staff-display-name"),
  staffRole: document.getElementById("staff-role"),
  staffDefaultAssignee: document.getElementById("staff-default-assignee"),
  staffActive: document.getElementById("staff-active"),
  staffFormReset: document.getElementById("staff-form-reset"),
  staffDeleteButton: document.getElementById("staff-delete-button"),
  serviceTemplateSummary: document.getElementById("service-template-summary"),
  serviceTemplateList: document.getElementById("service-template-list"),
  serviceTemplateForm: document.getElementById("service-template-form"),
  serviceTemplateName: document.getElementById("service-template-name"),
  serviceTemplateClientTitle: document.getElementById(
    "service-template-client-title",
  ),
  serviceTemplatePrice: document.getElementById("service-template-price"),
  serviceTemplatePaymentRule: document.getElementById(
    "service-template-payment-rule",
  ),
  serviceTemplateActive: document.getElementById("service-template-active"),
  serviceTemplateSummaryInput: document.getElementById(
    "service-template-summary-input",
  ),
  serviceTemplatePlanningNotes: document.getElementById(
    "service-template-planning-notes",
  ),
  serviceTemplateLines: document.getElementById("service-template-lines"),
  serviceTemplateAddLineButton: document.getElementById(
    "service-template-add-line-button",
  ),
  serviceTemplateNewButton: document.getElementById(
    "service-template-new-button",
  ),
  serviceTemplateResetButton: document.getElementById(
    "service-template-reset-button",
  ),
  templateForm: document.getElementById("template-form"),
  templateName: document.getElementById("template-name"),
  templateSubject: document.getElementById("template-subject"),
  templateGreeting: document.getElementById("template-greeting"),
  templateIntro: document.getElementById("template-intro"),
  templateOutro: document.getElementById("template-outro"),
  templateTerms: document.getElementById("template-terms"),
  templateAgreementTitle: document.getElementById("template-agreement-title"),
  templateAgreementIntro: document.getElementById("template-agreement-intro"),
  templateAgreementTerms: document.getElementById("template-agreement-terms"),
  templateContractorAddress: document.getElementById(
    "template-contractor-address",
  ),

  mobileActionDock: document.getElementById("mobile-action-dock"),
  mobileCreateFab: document.getElementById("mobile-create-fab"),
  mobileContextActionButtons: Array.from(
    document.querySelectorAll("[data-mobile-context-action]"),
  ),
  mobileTabBar: document.getElementById("mobile-tab-bar"),
  mobileTabButtons: Array.from(document.querySelectorAll("[data-mobile-view]")),
  mobileMoreButton: document.getElementById("mobile-more-button"),

  drawerBackdrop: document.getElementById("drawer-backdrop"),
  entityDrawer: document.getElementById("entity-drawer"),
  drawerKicker: document.getElementById("drawer-kicker"),
  drawerTitle: document.getElementById("drawer-title"),
  drawerSubtitle: document.getElementById("drawer-subtitle"),
  drawerCloseButton: document.getElementById("drawer-close-button"),
  drawerCancelButtons: Array.from(
    document.querySelectorAll(".drawer-cancel-button"),
  ),
  drawerMenuPanel: document.getElementById("drawer-menu-panel"),
  drawerMenuList: document.getElementById("drawer-menu-list"),
  drawerExpenseForm: document.getElementById("drawer-expense-form"),
  drawerExpenseProjectSearch: document.getElementById(
    "drawer-expense-project-search",
  ),
  drawerExpenseProject: document.getElementById("drawer-expense-project"),
  drawerExpenseContext: document.getElementById("drawer-expense-context"),
  drawerExpenseAmount: document.getElementById("drawer-expense-amount"),
  drawerExpenseDate: document.getElementById("drawer-expense-date"),
  drawerExpenseCategory: document.getElementById("drawer-expense-category"),
  drawerExpenseVendorSelect: document.getElementById(
    "drawer-expense-vendor-select",
  ),
  drawerExpenseVendor: document.getElementById("drawer-expense-vendor"),
  drawerExpenseNote: document.getElementById("drawer-expense-note"),
  drawerLeadForm: document.getElementById("drawer-lead-form"),
  drawerLeadCustomerSearch: document.getElementById(
    "drawer-lead-customer-search",
  ),
  drawerLeadCustomerSelect: document.getElementById(
    "drawer-lead-customer-select",
  ),
  drawerLeadClientName: document.getElementById("drawer-lead-client-name"),
  drawerLeadClientPhone: document.getElementById("drawer-lead-client-phone"),
  drawerLeadClientEmail: document.getElementById("drawer-lead-client-email"),
  drawerLeadProjectAddress: document.getElementById(
    "drawer-lead-project-address",
  ),
  drawerLeadProjectType: document.getElementById("drawer-lead-project-type"),
  drawerLeadAssignee: document.getElementById("drawer-lead-assignee"),
  drawerLeadNotes: document.getElementById("drawer-lead-notes"),
  drawerLeadContext: document.getElementById("drawer-lead-context"),
  drawerJobForm: document.getElementById("drawer-job-form"),
  drawerJobCustomerSearch: document.getElementById(
    "drawer-job-customer-search",
  ),
  drawerJobCustomerSelect: document.getElementById(
    "drawer-job-customer-select",
  ),
  drawerJobClientName: document.getElementById("drawer-job-client-name"),
  drawerJobProjectType: document.getElementById("drawer-job-project-type"),
  drawerJobClientPhone: document.getElementById("drawer-job-client-phone"),
  drawerJobClientEmail: document.getElementById("drawer-job-client-email"),
  drawerJobClientAddress: document.getElementById("drawer-job-client-address"),
  drawerJobBaseContract: document.getElementById("drawer-job-base-contract"),
  drawerJobStatus: document.getElementById("drawer-job-status"),
  drawerJobOwner: document.getElementById("drawer-job-owner"),
  drawerJobStaffGrid: document.getElementById("drawer-job-staff-grid"),
  drawerJobPlanningNotes: document.getElementById("drawer-job-planning-notes"),
  drawerJobContext: document.getElementById("drawer-job-context"),
  drawerServiceOrderForm: document.getElementById("drawer-service-order-form"),
  drawerServiceTemplate: document.getElementById("drawer-service-template"),
  drawerServicePaymentRule: document.getElementById(
    "drawer-service-payment-rule",
  ),
  drawerServiceCustomerSearch: document.getElementById(
    "drawer-service-customer-search",
  ),
  drawerServiceCustomerSelect: document.getElementById(
    "drawer-service-customer-select",
  ),
  drawerServiceClientName: document.getElementById(
    "drawer-service-client-name",
  ),
  drawerServiceClientPhone: document.getElementById(
    "drawer-service-client-phone",
  ),
  drawerServiceClientEmail: document.getElementById(
    "drawer-service-client-email",
  ),
  drawerServiceClientAddress: document.getElementById(
    "drawer-service-client-address",
  ),
  drawerServicePrice: document.getElementById("drawer-service-price"),
  drawerServiceOwner: document.getElementById("drawer-service-owner"),
  drawerServiceStaffGrid: document.getElementById("drawer-service-staff-grid"),
  drawerServiceContext: document.getElementById("drawer-service-context"),
  drawerCustomerForm: document.getElementById("drawer-customer-form"),
  drawerCustomerName: document.getElementById("drawer-customer-name"),
  drawerCustomerEmail: document.getElementById("drawer-customer-email"),
  drawerCustomerPhone: document.getElementById("drawer-customer-phone"),
  drawerCustomerAddress: document.getElementById("drawer-customer-address"),
  drawerCustomerNotes: document.getElementById("drawer-customer-notes"),
  drawerVendorForm: document.getElementById("drawer-vendor-form"),
  drawerVendorName: document.getElementById("drawer-vendor-name"),
  drawerVendorStatus: document.getElementById("drawer-vendor-status"),
  drawerVendorTradeGrid: document.getElementById("drawer-vendor-trade-grid"),
  drawerVendorTradeOther: document.getElementById("drawer-vendor-trade-other"),
  drawerVendorContactName: document.getElementById(
    "drawer-vendor-contact-name",
  ),
  drawerVendorPhone: document.getElementById("drawer-vendor-phone"),
  drawerVendorEmail: document.getElementById("drawer-vendor-email"),
  drawerVendorPaymentMethod: document.getElementById(
    "drawer-vendor-payment-method",
  ),
  drawerVendorDefaultTerms: document.getElementById(
    "drawer-vendor-default-terms",
  ),
  drawerVendorNotes: document.getElementById("drawer-vendor-notes"),
  drawerTaskForm: document.getElementById("drawer-task-form"),
  drawerTaskTitle: document.getElementById("drawer-task-title"),
  drawerTaskDueDate: document.getElementById("drawer-task-due-date"),
  drawerTaskDueTime: document.getElementById("drawer-task-due-time"),
  drawerTaskDuePreview: document.getElementById("drawer-task-due-preview"),
  drawerTaskAssignee: document.getElementById("drawer-task-assignee"),
  drawerTaskPriority: document.getElementById("drawer-task-priority"),
  drawerTaskLinkedType: document.getElementById("drawer-task-linked-type"),
  drawerTaskLinkedRecord: document.getElementById("drawer-task-linked-record"),
  drawerTaskContext: document.getElementById("drawer-task-context"),
  drawerCommunicationForm: document.getElementById(
    "drawer-communication-form",
  ),
  drawerCommunicationRecordSearch: document.getElementById(
    "drawer-communication-record-search",
  ),
  drawerCommunicationLinkedType: document.getElementById(
    "drawer-communication-linked-type",
  ),
  drawerCommunicationLinkedRecord: document.getElementById(
    "drawer-communication-linked-record",
  ),
  drawerCommunicationContext: document.getElementById(
    "drawer-communication-context",
  ),
  drawerCommunicationType: document.getElementById(
    "drawer-communication-type",
  ),
  drawerCommunicationDirection: document.getElementById(
    "drawer-communication-direction",
  ),
  drawerCommunicationHappenedAt: document.getElementById(
    "drawer-communication-happened-at",
  ),
  drawerCommunicationContactName: document.getElementById(
    "drawer-communication-contact-name",
  ),
  drawerCommunicationContactMethod: document.getElementById(
    "drawer-communication-contact-method",
  ),
  drawerCommunicationBody: document.getElementById(
    "drawer-communication-body",
  ),
  drawerCommunicationOutcome: document.getElementById(
    "drawer-communication-outcome",
  ),
  drawerCommunicationFollowUpRequired: document.getElementById(
    "drawer-communication-follow-up-required",
  ),
  drawerCommunicationFollowUpAt: document.getElementById(
    "drawer-communication-follow-up-at",
  ),
  drawerCommunicationClientVisible: document.getElementById(
    "drawer-communication-client-visible",
  ),
};

const state = {
  app: null,
  auth: null,
  db: null,
  storage: null,
  provider: null,
  currentUser: null,
  profile: null,
  leads: [],
  projects: [],
  customers: [],
  vendors: [],
  vendorBills: [],
  vendorDocuments: [],
  serviceTemplates: [],
  tasks: [],
  calendarEvents: [],
  staffRoster: [],
  template: { ...EMPTY_TEMPLATE },
  selectedLeadId: null,
  selectedProjectId: null,
  selectedProjectInvoiceId: null,
  selectedCustomerId: null,
  selectedVendorId: null,
  selectedTaskId: null,
  selectedStaffKey: null,
  selectedServiceTemplateId: null,
  staffFocusUid: "",
  leadDraft: null,
  customerDraft: null,
  vendorDraft: null,
  taskDraft: null,
  serviceTemplateDraft: null,
  leadWorkspaceOpen: false,
  pendingLeadRouteId: "",
  pendingLeadRouteTab: "overview",
  pendingJobRouteId: "",
  pendingJobRouteTab: "work",
  leadActivities: [],
  leadEstimateShares: [],
  projectExpenses: [],
  projectPayments: [],
  projectInvoices: [],
  projectChangeOrders: [],
  projectDetailLoaded: {
    expenses: false,
    payments: false,
    changeOrders: false,
  },
  projectScopeItems: [],
  projectDocuments: [],
  leadDocuments: [],
  customerDocuments: [],
  projectLeadEstimate: null,
  projectLeadEstimateShares: [],
  customerPortalContacts: [],
  customerPortalEstimateShares: [],
  customerPortalInvoices: [],
  customerPortalChangeOrders: [],
  customerPortalThreads: [],
  customerPortalMessages: {},
  selectedCustomerPortalContactId: null,
  selectedCustomerPortalThreadId: null,
  projectNotes: [],
  projectActivities: [],
  projectLeadActivities: [],
  projectInvoiceDraft: null,
  editingChangeOrderId: null,
  editingExpenseId: null,
  portalQueueEstimateShares: [],
  portalQueueInvoices: [],
  portalQueueThreads: [],
  portalQueueContacts: [],
  estimate: null,
  estimateShare: null,
  estimateWorkflow: {
    leadId: "",
    status: "loading",
    dirty: false,
    operation: "",
    message: "",
    error: "",
    lastPublishedShareId: "",
  },
  leadDetailSubscriptionId: "",
  notificationPanelOpen: false,
  notificationReadMap: {},
  activeLeadTab: "overview",
  activeJobTab: "work",
  activeView: "today-view",
  todayScope: "mine",
  leadLayout: isMobileViewport() ? "list" : "board",
  leadSearch: "",
  leadStage: "all",
  customerSearch: "",
  vendorSearch: "",
  vendorTrade: "all",
  vendorStatus: "active_only",
  vendorBillState: "all",
  jobSearch: "",
  jobStatus: "active",
  calendarScope: "upcoming",
  calendarStatus: "all",
  calendarStaffUid: "",
  calendarProjectId: "",
  googleCalendar: {
    loaded: false,
    loading: false,
    connected: false,
    status: "not_connected",
    email: "",
    lastSyncAt: null,
    lastError: "",
  },
  taskSearch: "",
  taskBucket: "open",
  activeVendorTab: "overview",
  activeAdminSection: "team",
  dragLeadId: null,
  dragLeadOverStatus: null,
  drawer: {
    type: null,
    context: {},
    restoreFocus: null,
    expenseDraft: null,
    leadDraft: null,
    jobDraft: null,
    serviceOrderDraft: null,
    customerDraft: null,
    vendorDraft: null,
    taskDraft: null,
    communicationDraft: null,
  },
  sessionResetting: false,
  unsubs: {
    base: [],
    portalQueues: [],
    scopedProjects: [],
    leadDetail: [],
    customerDetail: [],
    customerPortalMessages: [],
    projectDetail: [],
  },
};

const pendingEstimateOperations = new Map();

const initialLeadRoute = readLeadRouteState();
state.pendingLeadRouteId = initialLeadRoute.leadId;
state.pendingLeadRouteTab = initialLeadRoute.leadTab;
state.pendingJobRouteId = initialLeadRoute.jobId;
state.pendingJobRouteTab = initialLeadRoute.jobTab;
state.leadWorkspaceOpen = Boolean(initialLeadRoute.leadId);

let stableAppViewportHeight = 0;
let stableAppViewportWidth = 0;

function isMobileViewport() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
}

function drawerKeyboardFieldIsFocused() {
  const activeElement = document.activeElement;
  if (
    !state.drawer.type ||
    !refs.entityDrawer?.contains(activeElement) ||
    !(activeElement instanceof HTMLElement)
  ) {
    return false;
  }

  return activeElement.matches(
    'input:not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]), textarea, select',
  );
}

function syncViewportHeightVar() {
  const root = document.documentElement;
  const layoutHeight = Math.round(
    window.innerHeight || root.clientHeight || 0,
  );
  const visualHeight = Math.round(
    window.visualViewport?.height || layoutHeight,
  );
  const viewportWidth = Math.round(window.innerWidth || root.clientWidth || 0);
  const widthChanged =
    stableAppViewportWidth > 0 &&
    Math.abs(viewportWidth - stableAppViewportWidth) > 72;
  const keyboardIsOpen = Boolean(
    isMobileViewport() &&
      !widthChanged &&
      drawerKeyboardFieldIsFocused() &&
      stableAppViewportHeight > 0 &&
      visualHeight < stableAppViewportHeight - 120,
  );

  if (!keyboardIsOpen) {
    stableAppViewportHeight = Math.max(layoutHeight, visualHeight);
    stableAppViewportWidth = viewportWidth;
  }

  const appHeight = keyboardIsOpen
    ? stableAppViewportHeight
    : Math.max(layoutHeight, visualHeight);
  const keyboardInset = keyboardIsOpen
    ? Math.max(
        0,
        appHeight -
          visualHeight -
          Math.round(window.visualViewport?.offsetTop || 0),
      )
    : 0;

  if (appHeight > 0) {
    root.style.setProperty("--crm-app-height", `${appHeight}px`);
  }
  root.style.setProperty("--crm-keyboard-inset", `${keyboardInset}px`);
  root.classList.toggle("crm-keyboard-open", keyboardIsOpen);
}

function rememberedFocusElement() {
  return document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
}

function defaultExpenseDrawerDraft(projectId = null) {
  return {
    projectId,
    projectSearch: "",
    amount: "",
    relatedDate: todayDateInputValue(),
    category: "",
    vendorId: "",
    vendor: "",
    note: "",
  };
}

function addDays(value, dayCount) {
  const baseDate =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(baseDate.getTime())) {
    return new Date();
  }
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + dayCount);
  return nextDate;
}

function projectInvoiceSequence(project) {
  const projectKey =
    safeString(project?.id || "job")
      .slice(-4)
      .toUpperCase() || "JOB";
  return `${projectKey}-${String((state.projectInvoices?.length || 0) + 1).padStart(2, "0")}`;
}

function defaultProjectInvoiceDraft(project, seed = {}) {
  const issueDate = seed.issueDate || new Date();
  const dueDate = seed.dueDate || addDays(issueDate, 7);
  const projectLineItems = Array.isArray(seed.lineItems)
    ? seed.lineItems.map((item) => ({
        label: safeString(item.label || item.title),
        description: safeString(item.description || item.note),
        amount: toNumber(item.amount),
      }))
    : [];
  const subtotal = projectLineItems.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0,
  );

  return {
    id: seed.id || null,
    projectId: project?.id || null,
    leadId: project?.leadId || null,
    customerId: project?.customerId || null,
    title:
      seed.title ||
      `Invoice for ${safeString(project?.projectAddress) || safeString(project?.clientName) || "current project"}`,
    invoiceNumber:
      seed.invoiceNumber ||
      `GB-${formatDateOnlyInputValue(issueDate).replaceAll("-", "")}-${projectInvoiceSequence(project)}`,
    status: seed.status || "draft",
    issueDate,
    dueDate,
    summary:
      seed.summary ||
      "Please review the billing breakdown below for the current Golden Brick Construction scope. This invoice reflects the approved work and can be paid using the method noted below.",
    customFields: Array.isArray(seed.customFields)
      ? seed.customFields.map((field) => ({
          label: safeString(field.label),
          value: safeString(field.value),
        }))
      : [
          {
            label: "Project type",
            value: safeString(project?.projectType) || "Renovation scope",
          },
          {
            label: "Billing stage",
            value:
              safeString(
                project?.status === "completed"
                  ? "Final billing"
                  : "Progress billing",
              ) || "Progress billing",
          },
        ],
    lineItems: projectLineItems,
    subtotal: Number(subtotal.toFixed(2)),
    notes:
      seed.notes ||
      "Thank you for working with Golden Brick Construction. Please contact us with any billing questions or if you need revised documentation for your records.",
    paidAt: seed.paidAt || null,
    paymentMethod: seed.paymentMethod || "",
    paymentReference: seed.paymentReference || "",
    paymentNote: seed.paymentNote || "",
    paymentRecordId: seed.paymentRecordId || null,
    stripeCheckoutUrl: seed.stripeCheckoutUrl || "",
    stripeCheckoutSessionId: seed.stripeCheckoutSessionId || "",
    stripePaymentStatus: seed.stripePaymentStatus || "",
    stripeLinkCreatedAt: seed.stripeLinkCreatedAt || null,
  };
}

function defaultServiceTemplateDraft(seed = {}) {
  const starter =
    DEFAULT_SERVICE_TEMPLATES.find((item) => item.id === seed.id) ||
    DEFAULT_SERVICE_TEMPLATES[0];
  return {
    id: seed.id || null,
    internalName: seed.internalName || starter.internalName || "",
    clientTitle: seed.clientTitle || starter.clientTitle || "",
    defaultPrice: toNumber(seed.defaultPrice || starter.defaultPrice || 0),
    defaultInvoiceLines: Array.isArray(seed.defaultInvoiceLines)
      ? seed.defaultInvoiceLines.map((line) => ({
          label: safeString(line.label || line.title),
          description: safeString(line.description || line.note),
          amount: toNumber(line.amount),
        }))
      : starter.defaultInvoiceLines.map((line) => ({ ...line })),
    defaultSummary: safeString(seed.defaultSummary || starter.defaultSummary),
    defaultPlanningNotes: safeString(
      seed.defaultPlanningNotes || starter.defaultPlanningNotes,
    ),
    defaultPaymentRequirement:
      safeString(
        seed.defaultPaymentRequirement || starter.defaultPaymentRequirement,
      ) || "upfront_required",
    active: seed.active !== false,
  };
}

function serviceTemplateCatalog() {
  const source = state.serviceTemplates.length
    ? state.serviceTemplates
    : DEFAULT_SERVICE_TEMPLATES;
  return source.map((template) => normaliseServiceTemplateDoc(template));
}

function currentServiceTemplateDoc() {
  return (
    serviceTemplateCatalog().find(
      (template) => template.id === state.selectedServiceTemplateId,
    ) || null
  );
}

function activeServiceTemplates() {
  return sortByUpdatedDesc(serviceTemplateCatalog())
    .filter((template) => template.active !== false)
    .sort((left, right) => {
      return safeString(left.clientTitle || left.internalName).localeCompare(
        safeString(right.clientTitle || right.internalName),
      );
    });
}

function serviceTemplateSubtotal(template = {}) {
  return (template.defaultInvoiceLines || []).reduce(
    (sum, item) => sum + toNumber(item.amount),
    0,
  );
}

function serviceTemplateLineItemsForAmount(
  template = {},
  overrideAmount = null,
) {
  const baseLines =
    Array.isArray(template.defaultInvoiceLines) &&
    template.defaultInvoiceLines.length
      ? template.defaultInvoiceLines.map((item) => ({
          label: safeString(item.label || item.title),
          description: safeString(item.description || item.note),
          amount: toNumber(item.amount),
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
    overrideAmount != null && overrideAmount !== ""
      ? overrideAmount
      : template.defaultPrice || serviceTemplateSubtotal(template),
  );
  const baseTotal = baseLines.reduce(
    (sum, item) => sum + toNumber(item.amount),
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
          ? "Adjustment to align this order with the confirmed client price."
          : "Discount applied to align this order with the confirmed client price.",
      amount: delta,
    });
  }

  return baseLines;
}

function defaultServiceOrderDrawerDraft(seed = {}) {
  const preferredTemplate =
    serviceTemplateCatalog().find((item) => item.id === seed.templateId) ||
    activeServiceTemplates()[0] ||
    defaultServiceTemplateDraft();
  const preferredOwner =
    seed.assignedLeadOwnerUid ||
    preferredLeadAssignee()?.uid ||
    state.profile?.uid ||
    "";
  return {
    templateId: preferredTemplate?.id || "",
    customerSearch: "",
    customerId: seed.customerId || null,
    customerName: seed.customerName || "",
    clientName: seed.clientName || "",
    clientPhone: seed.clientPhone || "",
    clientEmail: seed.clientEmail || "",
    clientAddress: seed.clientAddress || "",
    priceOverride:
      seed.priceOverride ?? (preferredTemplate?.defaultPrice || ""),
    paymentRequirement:
      seed.paymentRequirement ||
      preferredTemplate?.defaultPaymentRequirement ||
      "upfront_required",
    assignedLeadOwnerUid: preferredOwner,
    assignedWorkerUids:
      Array.isArray(seed.assignedWorkerUids) && seed.assignedWorkerUids.length
        ? seed.assignedWorkerUids
        : preferredOwner
          ? [preferredOwner]
          : [],
  };
}

function defaultJobDrawerDraft(seed = {}) {
  const preferredOwner =
    seed.assignedLeadOwnerUid ||
    preferredLeadAssignee()?.uid ||
    state.profile?.uid ||
    "";

  return {
    customerSearch: "",
    customerId: seed.customerId || null,
    customerName: seed.customerName || "",
    clientName: seed.clientName || "",
    clientPhone: seed.clientPhone || "",
    clientEmail: seed.clientEmail || "",
    clientAddress: seed.clientAddress || "",
    projectType: seed.projectType || "",
    baseContractValue:
      seed.baseContractValue ?? seed.priceOverride ?? seed.estimateSubtotal ?? "",
    status: seed.status || "planning",
    assignedLeadOwnerUid: preferredOwner,
    assignedWorkerUids:
      Array.isArray(seed.assignedWorkerUids) && seed.assignedWorkerUids.length
        ? seed.assignedWorkerUids
        : preferredOwner
          ? [preferredOwner]
          : [],
    planningNotes: seed.planningNotes || "",
  };
}

function openLeadsListSurface() {
  state.leadLayout = "list";
  state.leadWorkspaceOpen = false;
}

function mobileViewHasDetail(viewId) {
  if (viewId === "tasks-view") return Boolean(currentTask());
  if (viewId === "customers-view") return Boolean(currentCustomer());
  if (viewId === "jobs-view") return Boolean(currentProject());
  if (viewId === "vendors-view") return Boolean(currentVendor());
  return false;
}

function mobileDockActions() {
  if (state.activeView === "leads-view" && state.leadWorkspaceOpen) {
    return [
      { label: "Log", action: "log-communication", primary: true },
      { label: "Task", action: "add-task" },
      { label: "Estimate", action: "lead-open-estimate" },
      { label: "Won", action: "lead-mark-won" },
    ];
  }

  if (state.activeView === "jobs-view" && currentProject()) {
    return [
      { label: "Expense", action: "add-expense", primary: true },
      { label: "Log", action: "log-communication" },
      { label: "Task", action: "add-task" },
      { label: "Document", action: "job-add-document" },
      { label: "Update", action: "job-update-client" },
    ];
  }

  return [
    { label: "Lead", action: "add-lead", primary: true },
    { label: "Expense", action: "add-expense" },
    { label: "Task", action: "add-task" },
    { label: "Log", action: "log-communication" },
  ];
}

function renderMobileActionDock() {
  if (!refs.mobileActionDock) {
    return;
  }

  refs.mobileContextActionButtons.forEach((button, index) => {
    const action = mobileDockActions()[index];
    if (!action) {
      button.hidden = true;
      return;
    }

    button.hidden = false;
    button.textContent = action.label;
    button.dataset.mobileContextAction = action.action;
    button.classList.toggle("is-primary", Boolean(action.primary));
  });
}

function syncMobileChrome() {
  const isMobile = isMobileViewport();
  const hideCommandBar =
    isMobile &&
    (mobileViewHasDetail(state.activeView) ||
      (state.activeView === "leads-view" && state.leadWorkspaceOpen));
  document.body.classList.toggle("mobile-viewport", isMobile);

  refs.views.forEach((view) => {
    view.classList.toggle(
      "is-mobile-detail-active",
      isMobile && mobileViewHasDetail(view.id),
    );
  });

  if (refs.taskMobileBackButton) {
    refs.taskMobileBackButton.hidden = !(isMobile && currentTask());
  }
  if (refs.customerMobileBackButton) {
    refs.customerMobileBackButton.hidden = !(isMobile && currentCustomer());
  }
  if (refs.jobMobileBackButton) {
    refs.jobMobileBackButton.hidden = !(isMobile && currentProject());
  }
  if (refs.vendorMobileBackButton) {
    refs.vendorMobileBackButton.hidden = !(isMobile && currentVendor());
  }

  if (refs.mobileTabBar) {
    refs.mobileTabBar.hidden = !(isMobile && state.profile);
  }
  if (refs.mobileActionDock) {
    refs.mobileActionDock.hidden = !(
      isMobile &&
      state.profile &&
      !state.drawer.type
    );
  }
  if (refs.mobileCreateFab) {
    refs.mobileCreateFab.hidden = !(isMobile && state.profile && !state.drawer.type);
  }
  renderMobileActionDock();

  if (refs.workspaceCommandBar && state.profile) {
    refs.workspaceCommandBar.hidden = hideCommandBar;
    refs.workspaceCommandBar.classList.toggle(
      "is-mobile-summary",
      isMobile && !hideCommandBar,
    );
  }

  refs.mobileTabButtons.forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.mobileView === state.activeView,
    );
  });

  if (refs.mobileMoreButton) {
    refs.mobileMoreButton.classList.toggle(
      "is-active",
      state.drawer.type === "mobile-more" ||
        MOBILE_MORE_VIEWS.includes(state.activeView),
    );
  }

  renderLeadWorkspaceSurface();
}

function clearMobileDetailForView(viewId) {
  if (viewId === "tasks-view") {
    state.selectedTaskId = null;
    state.taskDraft = null;
  } else if (viewId === "customers-view") {
    state.selectedCustomerId = null;
    state.customerDraft = null;
    clearUnsubs(state.unsubs.customerDetail);
    state.customerDocuments = [];
  } else if (viewId === "jobs-view") {
    state.selectedProjectId = null;
    clearUnsubs(state.unsubs.projectDetail);
    state.projectExpenses = [];
    state.projectPayments = [];
    state.projectChangeOrders = [];
    state.projectScopeItems = [];
    state.projectDocuments = [];
    state.projectNotes = [];
    state.projectActivities = [];
    state.projectLeadActivities = [];
    state.projectLeadEstimate = null;
    state.projectLeadEstimateShares = [];
  } else if (viewId === "vendors-view") {
    state.selectedVendorId = null;
    state.vendorDraft = null;
  } else if (viewId === "leads-view") {
    closeLeadWorkspace();
    return;
  }

  renderAll();
}

function closeJobWorkspace({ historyMode = "push" } = {}) {
  clearSelectedProjectWorkspace({ historyMode });
  renderAll();
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function isAdmin() {
  return state.profile?.role === "admin";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeString(value) {
  return String(value || "").trim();
}

function capitalise(value) {
  const text = safeString(value);
  if (!text) return "";
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function sanitiseEmailKey(email) {
  return safeString(email).toLowerCase();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (value == null || value === "") {
      continue;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function normaliseChangeOrderStatus(value) {
  const status = safeString(value).toLowerCase();
  if (status === "approved" || status === "void") {
    return status;
  }
  return "draft";
}

function changeOrderIsPublished(changeOrder = {}) {
  return safeString(changeOrder?.portalStatus) === "published";
}

function changeOrderIsSigned(changeOrder = {}) {
  return (
    safeString(changeOrder?.portalStatus) === "signed" ||
    Boolean(safeString(changeOrder?.agreementId))
  );
}

function setActionButtonLabel(button, text) {
  if (button) {
    button.textContent = text;
  }
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function normaliseFirestoreDoc(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

function formatDateTime(value) {
  if (!value) return "Not set";
  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDateOnly(value) {
  if (!value) return "No due date";
  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateOnlyInputValue(value) {
  if (!value) return "";
  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(toNumber(value));
}

function formatDateInputValue(value) {
  if (!value) return "";
  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDateInput(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateOnlyInput(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTimeInputValue(value) {
  if (!value) return "09:00";
  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "09:00";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function taskScheduleControls(target) {
  const controlMap = {
    main: {
      dateInput: refs.taskDueDate,
      timeSelect: refs.taskDueTime,
      preview: refs.taskDuePreview,
      form: refs.taskForm,
    },
    customer: {
      dateInput: refs.customerTaskDueDate,
      timeSelect: refs.customerTaskDueTime,
      preview: refs.customerTaskDuePreview,
      form: refs.customerTaskForm,
    },
    drawer: {
      dateInput: refs.drawerTaskDueDate,
      timeSelect: refs.drawerTaskDueTime,
      preview: refs.drawerTaskDuePreview,
      form: refs.drawerTaskForm,
    },
  };
  return controlMap[target] || null;
}

function taskTimeLabel(value) {
  const [hoursValue, minutesValue] = String(value || "09:00").split(":");
  const date = new Date(2000, 0, 1, Number(hoursValue), Number(minutesValue));
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function populateTaskTimeSelect(select, selectedValue = "09:00") {
  if (!select) return;

  const values = [];
  for (let totalMinutes = 6 * 60; totalMinutes <= 20 * 60; totalMinutes += 30) {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minutes = String(totalMinutes % 60).padStart(2, "0");
    values.push(`${hours}:${minutes}`);
  }

  const cleanSelected = /^\d{2}:\d{2}$/.test(selectedValue)
    ? selectedValue
    : "09:00";
  if (!values.includes(cleanSelected)) {
    values.push(cleanSelected);
    values.sort();
  }

  select.innerHTML = values
    .map(
      (value) =>
        `<option value="${value}">${escapeHtml(taskTimeLabel(value))}</option>`,
    )
    .join("");
  select.value = cleanSelected;
}

function readTaskSchedule(target) {
  const controls = taskScheduleControls(target);
  if (!controls?.dateInput || !controls?.timeSelect) {
    return {
      valid: false,
      value: null,
      error: "The follow-up date controls are unavailable. Refresh and try again.",
    };
  }

  const { dateInput, timeSelect } = controls;
  const dateValue = dateInput.value || "";
  const timeValue = timeSelect.value || "09:00";

  if (dateInput.validity?.badInput) {
    return {
      valid: false,
      value: null,
      error: "Choose a complete follow-up date from the calendar.",
    };
  }

  if (!dateValue) {
    return { valid: true, value: null, error: "" };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return {
      valid: false,
      value: null,
      error: "Choose a complete follow-up date from the calendar.",
    };
  }

  const parsed = new Date(`${dateValue}T${timeValue}:00`);
  if (Number.isNaN(parsed.getTime())) {
    return {
      valid: false,
      value: null,
      error: "Choose a valid follow-up date and time.",
    };
  }

  return { valid: true, value: parsed, error: "" };
}

function renderTaskSchedulePreview(target, overrideError = "") {
  const controls = taskScheduleControls(target);
  if (!controls?.preview) return;

  const schedule = readTaskSchedule(target);
  const error = overrideError || (!schedule.valid ? schedule.error : "");
  controls.preview.classList.toggle("is-error", Boolean(error));

  if (error) {
    controls.preview.textContent = error;
    return;
  }

  if (!schedule.value) {
    controls.preview.textContent =
      "No follow-up scheduled. You can still save this task.";
    return;
  }

  controls.preview.textContent = `Follow up ${new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(schedule.value)}. The assigned staff member's connected Google Calendar will sync automatically.`;
}

function setTaskScheduleValue(target, value) {
  const controls = taskScheduleControls(target);
  if (!controls?.dateInput || !controls?.timeSelect) return;

  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  const validDate = value && !Number.isNaN(date.getTime()) ? date : null;
  const timeValue = formatTimeInputValue(validDate);
  populateTaskTimeSelect(controls.timeSelect, timeValue);
  controls.dateInput.value = validDate
    ? formatDateOnlyInputValue(validDate)
    : "";
  renderTaskSchedulePreview(target);
}

function taskSchedulePresetDate(preset) {
  if (preset === "clear") return null;

  const now = new Date();
  const date = new Date(now);
  date.setSeconds(0, 0);

  if (preset === "later_today") {
    date.setMinutes(Math.ceil(date.getMinutes() / 30) * 30);
    date.setHours(date.getHours() + 2);
    if (date.getDate() !== now.getDate() || date.getHours() > 20) {
      date.setTime(now.getTime());
      date.setDate(date.getDate() + 1);
      date.setHours(9, 0, 0, 0);
    }
    return date;
  }

  if (preset === "tomorrow") {
    date.setDate(date.getDate() + 1);
  } else if (preset === "next_workday") {
    date.setDate(date.getDate() + 1);
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }
  } else if (preset === "next_week") {
    date.setDate(date.getDate() + 7);
  }

  date.setHours(9, 0, 0, 0);
  return date;
}

function bindTaskSchedulePickers() {
  ["main", "customer", "drawer"].forEach((target) => {
    const controls = taskScheduleControls(target);
    if (!controls?.dateInput || !controls?.timeSelect) return;

    populateTaskTimeSelect(controls.timeSelect, controls.timeSelect.value);
    renderTaskSchedulePreview(target);

    controls.dateInput.addEventListener("input", () => {
      renderTaskSchedulePreview(target);
    });
    controls.dateInput.addEventListener("change", () => {
      renderTaskSchedulePreview(target);
    });
    controls.timeSelect.addEventListener("change", () => {
      renderTaskSchedulePreview(target);
    });
  });

  document.querySelectorAll("[data-task-calendar-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const controls = taskScheduleControls(button.dataset.taskCalendarTarget);
      if (!controls?.dateInput) return;
      try {
        if (typeof controls.dateInput.showPicker === "function") {
          controls.dateInput.showPicker();
        } else {
          controls.dateInput.focus();
          controls.dateInput.click();
        }
      } catch (error) {
        controls.dateInput.focus();
      }
    });
  });

  document
    .querySelectorAll("[data-task-schedule-preset]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.taskScheduleTarget;
        const preset = button.dataset.taskSchedulePreset;
        const controls = taskScheduleControls(target);
        if (!controls) return;
        setTaskScheduleValue(target, taskSchedulePresetDate(preset));
        controls.form?.classList.add("is-dirty");
      });
    });
}

function isSameDay(leftValue, rightValue) {
  const left =
    typeof leftValue?.toDate === "function"
      ? leftValue.toDate()
      : new Date(leftValue);
  const right =
    typeof rightValue?.toDate === "function"
      ? rightValue.toDate()
      : new Date(rightValue);

  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) {
    return false;
  }

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function uniqueValues(values = []) {
  return Array.from(
    new Set(values.map((value) => safeString(value)).filter(Boolean)),
  );
}

function notificationStorageKey() {
  return `golden-brick-notifications:${safeString(state.profile?.uid || "guest")}`;
}

function loadNotificationReadMap() {
  try {
    const stored = window.localStorage.getItem(notificationStorageKey());
    const parsed = stored ? JSON.parse(stored) : {};
    state.notificationReadMap =
      parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    state.notificationReadMap = {};
  }
}

function persistNotificationReadMap() {
  try {
    window.localStorage.setItem(
      notificationStorageKey(),
      JSON.stringify(state.notificationReadMap || {}),
    );
  } catch (error) {
    // Ignore storage failures so the CRM keeps working in restricted browsers.
  }
}

function markNotificationsRead(notificationIds = []) {
  const ids = uniqueValues(notificationIds);
  if (!ids.length) {
    return;
  }

  ids.forEach((notificationId) => {
    state.notificationReadMap[notificationId] = new Date().toISOString();
  });
  persistNotificationReadMap();
}

function mergeLeadIntoState(leadId, patch = {}) {
  const current = state.leads.find((lead) => lead.id === leadId) || null;
  if (!current) {
    return null;
  }

  const merged = { ...current, ...patch };
  state.leads = state.leads.map((lead) => (lead.id === leadId ? merged : lead));
  return merged;
}

function applyLeadEstimateStateLocally(leadId, estimate = null) {
  if (!leadId || !estimate) {
    return null;
  }

  return mergeLeadIntoState(leadId, {
    hasEstimate: true,
    estimateSubtotal: toNumber(estimate.subtotal),
    estimateTitle: safeString(estimate.subject),
    estimateUpdatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function notificationReadAt(notificationId) {
  return state.notificationReadMap[safeString(notificationId)] || "";
}

function clearUnsubs(list) {
  list.forEach((unsubscribe) => {
    if (typeof unsubscribe === "function") {
      unsubscribe();
    }
  });
}

function setSyncStatus(message) {
  refs.syncStatus.textContent = message;
}

function setBanner(message = "", variant = "info") {
  if (!message) {
    refs.appBanner.hidden = true;
    refs.appBanner.textContent = "";
    refs.appBanner.className = "app-banner";
    return;
  }

  refs.appBanner.hidden = false;
  refs.appBanner.textContent = message;
  refs.appBanner.className = `app-banner ${variant}`;
}

function showToast(message, variant = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${variant}`;
  toast.textContent = message;
  refs.toastStack.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3600);
}

function configureTabSemantics(buttons, tabPrefix, panePrefix) {
  buttons.forEach((button) => {
    const tabKey = button.dataset[tabPrefix];
    if (!tabKey) return;
    const pane = document.getElementById(`${panePrefix}${tabKey}`);
    const buttonId = `${panePrefix}${tabKey}-button`;
    button.id = buttonId;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", pane?.id || "");
    button.parentElement?.setAttribute("role", "tablist");
    if (pane) {
      pane.setAttribute("role", "tabpanel");
      pane.setAttribute("aria-labelledby", buttonId);
    }
  });
}

function bindFormStateTracking() {
  const forms = Array.from(document.querySelectorAll("form"));

  forms.forEach((form) => {
    const markDirty = (event) => {
      if (event?.isTrusted === false) return;
      form.classList.add("is-dirty");
    };
    const clearDirty = () => form.classList.remove("is-dirty");

    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    form.addEventListener("submit", () => {
      if (form !== refs.estimateForm) {
        clearDirty();
      }
    });
    form.addEventListener("reset", clearDirty);
  });

  window.addEventListener("beforeunload", (event) => {
    if (!document.querySelector("form.is-dirty")) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

function trapDrawerFocus(event) {
  if (event.key !== "Tab" || !state.drawer.type || refs.entityDrawer.hidden) {
    return;
  }

  const focusable = Array.from(
    refs.entityDrawer.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hidden && element.offsetParent !== null);

  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function showAuthShell(
  message = "Only approved staff accounts can enter the portal.",
) {
  refs.authFeedback.textContent = message;
  refs.authShell.hidden = false;
  refs.staffShell.hidden = true;
  refs.mobileTabBar.hidden = true;
  refs.mobileCreateFab.hidden = true;
  syncMobileChrome();
}

function showStaffShell() {
  refs.authShell.hidden = true;
  refs.staffShell.hidden = false;
  syncMobileChrome();
}

function authErrorMessage(prefix, error) {
  const code = safeString(error?.code);
  const message = safeString(error?.message);
  const detail = [code, message].filter(Boolean).join(" - ");
  return detail ? `${prefix} (${detail})` : prefix;
}

function normaliseStaffRole(value) {
  return safeString(value).toLowerCase() === "admin" ? "admin" : "employee";
}

function normaliseStaffProfile(user, source = {}) {
  return {
    uid: safeString(user?.uid || source.uid),
    email: safeString(source.email || user?.email).toLowerCase(),
    displayName: safeString(
      source.displayName || user?.displayName || user?.email,
    ),
    role: normaliseStaffRole(source.role),
    active: source.active !== false,
    defaultLeadAssignee: Boolean(source.defaultLeadAssignee),
  };
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

function matchingCustomersForClientRecord({
  clientName = "",
  clientEmail = "",
  clientPhone = "",
  projectAddress = "",
} = {}) {
  const name = safeString(clientName).toLowerCase();
  const email = normaliseEmail(clientEmail);
  const phone = normalisePhone(clientPhone);
  const address = safeString(projectAddress).toLowerCase();

  const scoredMatches = state.customers
    .map((customer) => {
      let score = 0;
      if (email && normaliseEmail(customer.primaryEmail) === email) {
        score += 4;
      }
      if (phone && normalisePhone(customer.primaryPhone) === phone) {
        score += 4;
      }
      if (name && safeString(customer.name).toLowerCase() === name) {
        score += 2;
      }
      if (address && safeString(customer.primaryAddress).toLowerCase() === address) {
        score += 1;
      }
      return { customer, score };
    })
    .filter(({ score }) => score >= 4 || (!email && !phone && score >= 3))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return (
        toMillis(right.customer.updatedAt || right.customer.createdAt) -
        toMillis(left.customer.updatedAt || left.customer.createdAt)
      );
    });

  return scoredMatches.map(({ customer }) => customer);
}

function matchingCustomersForLead(lead = {}) {
  return matchingCustomersForClientRecord({
    clientName: lead.clientName,
    clientEmail: lead.clientEmail,
    clientPhone: lead.clientPhone,
    projectAddress: lead.projectAddress,
  });
}

async function writeCustomerFromClientRecord(
  customerRef,
  record = {},
  existingCustomer = {},
) {
  const customerName = safeString(
    record.customerName || record.clientName || existingCustomer.name,
  );
  const primaryEmail = safeString(record.clientEmail || existingCustomer.primaryEmail);
  const primaryPhone = safeString(record.clientPhone || existingCustomer.primaryPhone);
  const primaryAddress = safeString(
    record.projectAddress || record.clientAddress || existingCustomer.primaryAddress,
  );
  const notes = safeString(
    record.customerNotes || record.notes || existingCustomer.notes,
  );
  const allowedStaffUids = uniqueValues([
    ...(Array.isArray(existingCustomer.allowedStaffUids)
      ? existingCustomer.allowedStaffUids
      : []),
    state.profile?.uid || "",
  ]);

  const payload = {
    id: customerRef.id,
    name: customerName || "Unnamed customer",
    primaryEmail,
    primaryPhone,
    primaryAddress,
    notes,
    searchEmail: normaliseEmail(primaryEmail),
    searchPhone: normalisePhone(primaryPhone),
    allowedStaffUids,
    updatedAt: serverTimestamp(),
  };

  if (!existingCustomer?.createdAt) {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(customerRef, payload, { merge: true });

  return {
    id: customerRef.id,
    ...existingCustomer,
    ...payload,
    name: payload.name,
  };
}

async function writeCustomerFromLead(customerRef, leadData, existingCustomer = {}) {
  return writeCustomerFromClientRecord(
    customerRef,
    {
      customerName: leadData.customerName,
      clientName: leadData.clientName,
      clientEmail: leadData.clientEmail,
      clientPhone: leadData.clientPhone,
      projectAddress: leadData.projectAddress,
      notes: leadData.notes,
    },
    existingCustomer,
  );
}

function readLeadRouteState() {
  const url = new URL(window.location.href);
  return {
    leadId: safeString(url.searchParams.get("lead")),
    leadTab: safeString(url.searchParams.get("leadTab")) || "overview",
    jobId: safeString(url.searchParams.get("job")),
    jobTab: safeString(url.searchParams.get("jobTab")) || "work",
  };
}

function syncLeadRouteState({ historyMode = "replace" } = {}) {
  const url = new URL(window.location.href);

  if (
    state.activeView === "leads-view" &&
    state.leadWorkspaceOpen &&
    state.selectedLeadId
  ) {
    url.searchParams.set("lead", state.selectedLeadId);
    url.searchParams.set("leadTab", state.activeLeadTab || "overview");
  } else {
    url.searchParams.delete("lead");
    url.searchParams.delete("leadTab");
  }

  if (state.activeView === "jobs-view" && state.selectedProjectId) {
    url.searchParams.set("job", state.selectedProjectId);
    url.searchParams.set("jobTab", state.activeJobTab || "work");
  } else {
    url.searchParams.delete("job");
    url.searchParams.delete("jobTab");
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl === currentUrl) {
    return;
  }

  if (historyMode === "push") {
    window.history.pushState({}, "", nextUrl);
    return;
  }

  window.history.replaceState({}, "", nextUrl);
}

function restoreLeadWorkspaceFromRoute() {
  if (!state.pendingLeadRouteId) {
    return false;
  }

  const lead = state.leads.find((item) => item.id === state.pendingLeadRouteId);
  if (!lead) {
    return false;
  }

  const previousLeadId = safeString(state.selectedLeadId);
  state.selectedLeadId = lead.id;
  if (previousLeadId !== safeString(lead.id)) {
    resetEstimateWorkflowForLead(lead.id);
  }
  state.leadDraft = null;
  state.activeLeadTab = state.pendingLeadRouteTab || "overview";
  state.leadWorkspaceOpen = true;
  switchView("leads-view", { historyMode: "replace" });
  state.pendingLeadRouteId = "";
  state.pendingLeadRouteTab = "overview";
  subscribeLeadDetail();
  return true;
}

function restoreProjectWorkspaceFromRoute() {
  if (!state.pendingJobRouteId) {
    return false;
  }

  const project = state.projects.find(
    (item) => item.id === state.pendingJobRouteId,
  );
  if (!project) {
    return false;
  }

  state.selectedProjectId = project.id;
  state.selectedProjectInvoiceId = null;
  state.projectInvoiceDraft = null;
  state.activeJobTab = state.pendingJobRouteTab || "work";
  switchView("jobs-view", { historyMode: "replace" });
  state.pendingJobRouteId = "";
  state.pendingJobRouteTab = "work";
  subscribeProjectDetail();
  return true;
}

function setDrawerVisibility(isOpen) {
  refs.drawerBackdrop.hidden = !isOpen;
  refs.entityDrawer.hidden = !isOpen;
  refs.entityDrawer.setAttribute("aria-hidden", String(!isOpen));
  refs.entityDrawer.setAttribute("aria-modal", String(isOpen));
  document.body.classList.toggle("drawer-open", isOpen);
  syncMobileChrome();
}

function drawerLinkedEntityLabel(type, id) {
  if (!type || !id) {
    return "No linked record";
  }

  if (type === "lead") {
    const lead = state.leads.find((item) => item.id === id);
    return lead?.clientName || lead?.projectAddress || "Lead record";
  }

  if (type === "customer") {
    const customer = state.customers.find((item) => item.id === id);
    return customer?.name || "Customer record";
  }

  if (type === "project") {
    const project = state.projects.find((item) => item.id === id);
    return project?.clientName || project?.projectAddress || "Job record";
  }

  return "No linked record";
}

function isPermissionDeniedError(error) {
  return (
    error?.code === "permission-denied" ||
    /permission[- ]denied/i.test(error?.message || "")
  );
}

function shouldFallbackToFirestore(error) {
  return (
    error?.status === 404 ||
    error?.status === 401 ||
    error?.status === 403 ||
    error?.status === 429 ||
    error?.status >= 500 ||
    isPermissionDeniedError(error) ||
    /Failed to fetch/i.test(error?.message || "")
  );
}

async function verifyClientStaffAccess(user, profile = {}) {
  const userRef = doc(state.db, "users", user.uid);
  const templateRef = doc(state.db, "emailTemplates", "estimate-default");
  const [userSnap] = await Promise.all([getDoc(userRef), getDoc(templateRef)]);

  if (!userSnap.exists()) {
    const error = new Error(
      "Your staff profile has not finished syncing yet. Please try again in a moment.",
    );
    error.status = 503;
    throw error;
  }

  const userData = userSnap.data() || {};
  if (userData.active !== true) {
    const error = new Error(
      "This Google account is not approved for the staff portal.",
    );
    error.status = 403;
    throw error;
  }

  return normaliseStaffProfile(user, {
    ...profile,
    ...userData,
  });
}

async function resetAuthSession(message) {
  if (state.sessionResetting) {
    return;
  }

  state.sessionResetting = true;
  clearUnsubs(state.unsubs.base);
  clearUnsubs(state.unsubs.scopedProjects);
  clearUnsubs(state.unsubs.leadDetail);
  clearUnsubs(state.unsubs.customerDetail);
  clearUnsubs(state.unsubs.projectDetail);
  closeDrawer();
  setBanner("", "info");
  setSyncStatus("Access blocked");
  showAuthShell(message);

  if (state.auth?.currentUser) {
    try {
      await signOut(state.auth);
    } catch (error) {
      console.error("Could not sign out after staff access failed.", error);
    }
  }
}

function handleBaseSubscriptionError(context, error, options = {}) {
  console.error(`${context} subscription failed.`, error);

  if (isPermissionDeniedError(error)) {
    if (options.signOutOnPermissionDenied === true) {
      void resetAuthSession(
        "Your staff access is still finishing setup. Please sign in again after permissions sync.",
      );
      return;
    }

    setSyncStatus("Core data live");
    setBanner(
      options.permissionMessage ||
        `${context} could not load for this staff account. The rest of the portal is still available.`,
      "error",
    );
    return;
  }

  setSyncStatus("Sync issue");
  setBanner(
    `${context} could not load right now. Please refresh and try again.`,
    "error",
  );
}

function handleServiceTemplateSubscriptionError(error) {
  console.error("Service templates subscription failed.", error);

  state.serviceTemplates = [];

  if (
    state.selectedServiceTemplateId &&
    !serviceTemplateCatalog().some(
      (template) => template.id === state.selectedServiceTemplateId,
    )
  ) {
    state.selectedServiceTemplateId = activeServiceTemplates()[0]?.id || null;
  }

  renderAll();
  setSyncStatus("Core data live");

  if (isPermissionDeniedError(error)) {
    setBanner(
      "Service templates are temporarily using the built-in defaults while Firestore permissions finish syncing.",
      "info",
    );
    return;
  }

  setBanner(
    "Service templates could not load right now. The built-in defaults are still available.",
    "error",
  );
}

function handleDetailSubscriptionError(context, error, recover) {
  console.error(`${context} subscription failed.`, error);

  if (typeof recover === "function") {
    recover();
  }

  if (isPermissionDeniedError(error)) {
    setBanner(
      `You no longer have access to this ${context.toLowerCase()}.`,
      "error",
    );
  } else {
    setBanner(`${context} could not load right now.`, "error");
  }
}

function applyRoleVisibility() {
  refs.adminOnly.forEach((node) => {
    node.hidden = !isAdmin();
  });

  if (
    !isAdmin() &&
    ["site-projects-view", "staff-view"].includes(state.activeView)
  ) {
    switchView("today-view", { historyMode: "replace" });
  }
}

function currentLeadDoc() {
  return state.leads.find((lead) => lead.id === state.selectedLeadId) || null;
}

function currentLead() {
  return state.leadDraft || currentLeadDoc();
}

function canWorkLead(lead = currentLead()) {
  return Boolean(
    lead &&
      (isAdmin() ||
        safeString(lead.assignedToUid) === safeString(state.profile?.uid)),
  );
}

function canEditEstimateForLead(lead = currentLead()) {
  return Boolean(lead?.id && canWorkLead(lead));
}

function currentProject() {
  return (
    state.projects.find((project) => project.id === state.selectedProjectId) ||
    null
  );
}

function currentProjectInvoiceDoc() {
  return (
    state.projectInvoices.find(
      (invoice) => invoice.id === state.selectedProjectInvoiceId,
    ) || null
  );
}

function currentProjectInvoice() {
  return state.projectInvoiceDraft || currentProjectInvoiceDoc();
}

function currentCustomerDoc() {
  return (
    state.customers.find(
      (customer) => customer.id === state.selectedCustomerId,
    ) || null
  );
}

function currentCustomer() {
  return state.customerDraft || currentCustomerDoc();
}

function currentCustomerPortalContact() {
  return (
    state.customerPortalContacts.find(
      (contact) => contact.id === state.selectedCustomerPortalContactId,
    ) || null
  );
}

function currentCustomerPortalThread() {
  return (
    state.customerPortalThreads.find(
      (thread) => thread.id === state.selectedCustomerPortalThreadId,
    ) || null
  );
}

function currentCustomerPortalMessages(
  threadId = state.selectedCustomerPortalThreadId,
) {
  return Array.isArray(state.customerPortalMessages[threadId])
    ? state.customerPortalMessages[threadId]
    : [];
}

function currentVendorDoc() {
  return (
    state.vendors.find((vendor) => vendor.id === state.selectedVendorId) || null
  );
}

function currentVendor() {
  return state.vendorDraft || currentVendorDoc();
}

function currentTaskDoc() {
  return state.tasks.find((task) => task.id === state.selectedTaskId) || null;
}

function currentTask() {
  return state.taskDraft || currentTaskDoc();
}

function sortByUpdatedDesc(items) {
  return [...items].sort((left, right) => {
    return (
      toMillis(right.updatedAt || right.createdAt) -
      toMillis(left.updatedAt || left.createdAt)
    );
  });
}

function latestByUpdated(items) {
  return sortByUpdatedDesc(items)[0] || null;
}

function activeStaffOptions() {
  if (isAdmin()) {
    return state.staffRoster
      .filter((member) => member.active !== false)
      .sort((left, right) =>
        (left.displayName || left.email || "").localeCompare(
          right.displayName || right.email || "",
        ),
      );
  }

  if (!state.profile) {
    return [];
  }

  return [
    {
      uid: state.profile.uid,
      email: state.profile.email,
      displayName: state.profile.displayName,
      role: state.profile.role,
      active: true,
      defaultLeadAssignee: Boolean(state.profile.defaultLeadAssignee),
    },
  ];
}

function currentStaffFocusUid() {
  if (!isAdmin()) {
    return "";
  }

  return safeString(state.staffFocusUid);
}

function currentStaffFocusMember() {
  const focusUid = currentStaffFocusUid();
  if (!focusUid) return null;

  return (
    activeStaffOptions().find(
      (member) => safeString(member.uid) === focusUid,
    ) || null
  );
}

function leadMatchesStaffFocus(lead, staffUid = currentStaffFocusUid()) {
  if (!staffUid) return true;
  return safeString(lead?.assignedToUid) === staffUid;
}

function taskMatchesStaffFocus(task, staffUid = currentStaffFocusUid()) {
  if (!staffUid) return true;
  return safeString(task?.assignedToUid) === staffUid;
}

function projectMatchesStaffFocus(project, staffUid = currentStaffFocusUid()) {
  if (!staffUid) return true;

  const allowedStaff = Array.isArray(project?.allowedStaffUids)
    ? project.allowedStaffUids
    : [];
  const assignedWorkers = Array.isArray(project?.assignedWorkers)
    ? project.assignedWorkers
    : [];
  return (
    allowedStaff.includes(staffUid) ||
    safeString(project?.assignedLeadOwnerUid) === staffUid ||
    assignedWorkers.some((worker) => safeString(worker?.uid) === staffUid)
  );
}

function customerMatchesStaffFocus(
  customer,
  staffUid = currentStaffFocusUid(),
) {
  if (!staffUid) return true;

  const allowedStaff = Array.isArray(customer?.allowedStaffUids)
    ? customer.allowedStaffUids
    : [];
  if (allowedStaff.includes(staffUid)) {
    return true;
  }

  return (
    state.leads.some(
      (lead) =>
        lead.customerId === customer?.id &&
        leadMatchesStaffFocus(lead, staffUid),
    ) ||
    state.projects.some(
      (project) =>
        project.customerId === customer?.id &&
        projectMatchesStaffFocus(project, staffUid),
    )
  );
}

function recordIsArchived(record) {
  return Boolean(record?.archivedAt);
}

function activeRecords(records = []) {
  return records.filter((record) => !recordIsArchived(record));
}

function archivedRecords(records = []) {
  return records.filter(recordIsArchived);
}

function visibleLeads() {
  const focusUid = currentStaffFocusUid();
  const leads = activeRecords(state.leads);
  return focusUid
    ? leads.filter((lead) => leadMatchesStaffFocus(lead, focusUid))
    : leads;
}

function visibleTasks() {
  const focusUid = currentStaffFocusUid();
  return focusUid
    ? state.tasks.filter((task) => taskMatchesStaffFocus(task, focusUid))
    : state.tasks;
}

function visibleProjects() {
  const focusUid = currentStaffFocusUid();
  const projects = activeRecords(state.projects);
  return focusUid
    ? projects.filter((project) =>
        projectMatchesStaffFocus(project, focusUid),
      )
    : projects;
}

function calendarEventMatchesStaffFocus(
  event,
  staffUid = currentStaffFocusUid(),
) {
  if (!staffUid) return true;
  const assignedStaffUids = Array.isArray(event?.assignedStaffUids)
    ? event.assignedStaffUids
    : [];
  if (assignedStaffUids.includes(staffUid)) {
    return true;
  }
  if (event?.projectId) {
    const project = state.projects.find(
      (item) => safeString(item.id) === safeString(event.projectId),
    );
    return projectMatchesStaffFocus(project, staffUid);
  }
  if (event?.leadId) {
    const lead = state.leads.find(
      (item) => safeString(item.id) === safeString(event.leadId),
    );
    return leadMatchesStaffFocus(lead, staffUid);
  }
  return false;
}

function visibleCalendarEvents() {
  const focusUid = currentStaffFocusUid();
  const events = activeRecords(state.calendarEvents);
  return focusUid
    ? events.filter((event) => calendarEventMatchesStaffFocus(event, focusUid))
    : events;
}

function visibleCustomers() {
  const focusUid = currentStaffFocusUid();
  return focusUid
    ? state.customers.filter((customer) =>
        customerMatchesStaffFocus(customer, focusUid),
      )
    : state.customers;
}

function preferredLeadAssignee() {
  const focusMember = currentStaffFocusMember();
  if (focusMember) {
    return focusMember;
  }

  const options = activeStaffOptions();
  return (
    options.find((member) => member.defaultLeadAssignee) || options[0] || null
  );
}

function relatedTasksForEntity(entityKey, entityId) {
  return sortByUpdatedDesc(
    state.tasks.filter(
      (task) => safeString(task[entityKey]) === safeString(entityId),
    ),
  );
}

function projectForLead(lead) {
  if (!lead) return null;
  return (
    state.projects.find(
      (project) =>
        project.leadId === lead.id ||
        project.id === lead.wonProjectId ||
        project.id === lead.id,
    ) || null
  );
}

function vendorTradeLabel(tradeId) {
  return (
    VENDOR_TRADE_OPTIONS.find((option) => option.id === tradeId)?.label ||
    tradeId
  );
}

function renderTradeCheckboxGrid(container, selectedTradeIds = []) {
  if (!container) return;

  const selected = new Set(
    (selectedTradeIds || []).map((value) => safeString(value)),
  );
  container.innerHTML = VENDOR_TRADE_OPTIONS.map(
    (trade) => `
        <label class="checkbox-chip">
            <input type="checkbox" data-trade-id="${escapeHtml(trade.id)}" ${selected.has(trade.id) ? "checked" : ""}>
            <span>${escapeHtml(trade.label)}</span>
        </label>
    `,
  ).join("");
}

function selectedTradeIdsFromGrid(container) {
  if (!container) return [];

  return Array.from(
    container.querySelectorAll("input[type='checkbox'][data-trade-id]:checked"),
  )
    .map((input) => input.dataset.tradeId)
    .filter(Boolean);
}

function vendorBillsForVendor(vendorId) {
  return [
    ...state.vendorBills.filter(
      (bill) => safeString(bill.vendorId) === safeString(vendorId),
    ),
  ].sort((left, right) => {
    const leftDue =
      toMillis(left.dueDate || left.invoiceDate || left.createdAt) ||
      Number.MAX_SAFE_INTEGER;
    const rightDue =
      toMillis(right.dueDate || right.invoiceDate || right.createdAt) ||
      Number.MAX_SAFE_INTEGER;
    return leftDue - rightDue;
  });
}

function vendorDocumentsForVendor(vendorId) {
  return sortByUpdatedDesc(
    state.vendorDocuments.filter(
      (item) => safeString(item.vendorId) === safeString(vendorId),
    ),
  );
}

function vendorBillIsOverdue(bill) {
  if (!bill) return false;
  const status = safeString(bill.status || "open");
  if (status === "paid" || status === "void") return false;
  const dueMillis = toMillis(bill.dueDate);
  return (
    dueMillis > 0 &&
    dueMillis < Date.now() &&
    !isSameDay(bill.dueDate, new Date())
  );
}

function vendorBillIsDueThisWeek(bill) {
  if (!bill) return false;
  const status = safeString(bill.status || "open");
  if (status === "paid" || status === "void") return false;
  const dueMillis = toMillis(bill.dueDate);
  if (!dueMillis) return false;
  const dueDate = new Date(dueMillis);
  const today = new Date();
  const weekAhead = new Date();
  weekAhead.setDate(today.getDate() + 7);
  return (
    dueDate >=
      new Date(today.getFullYear(), today.getMonth(), today.getDate()) &&
    dueDate <= weekAhead
  );
}

function vendorBillMatchesFilter(bill, filterValue) {
  if (filterValue === "all") return true;
  if (filterValue === "overdue") return vendorBillIsOverdue(bill);
  if (filterValue === "due_this_week") return vendorBillIsDueThisWeek(bill);
  if (filterValue === "no_open_bills") return false;
  return safeString(bill.status || "open") === filterValue;
}

function vendorRollup(vendor) {
  if (!vendor) {
    return {
      bills: [],
      documents: [],
      openBills: [],
      overdueBills: [],
      dueThisWeekBills: [],
      scheduledBills: [],
      paidBills: [],
      projectIds: [],
      projects: [],
      totalOpenAmount: 0,
      totalPaidAmount: 0,
      nextDueBill: null,
    };
  }

  const bills = vendorBillsForVendor(vendor.id);
  const documents = vendorDocumentsForVendor(vendor.id);
  const openBills = bills.filter((bill) => {
    const status = safeString(bill.status || "open");
    return status === "open" || status === "scheduled";
  });
  const overdueBills = bills.filter((bill) => vendorBillIsOverdue(bill));
  const dueThisWeekBills = bills.filter((bill) =>
    vendorBillIsDueThisWeek(bill),
  );
  const scheduledBills = bills.filter(
    (bill) => safeString(bill.status) === "scheduled",
  );
  const paidBills = bills.filter((bill) => safeString(bill.status) === "paid");
  const projectIds = uniqueValues(bills.map((bill) => bill.projectId));
  const projects = projectIds
    .map((projectId) =>
      state.projects.find((project) => project.id === projectId),
    )
    .filter(Boolean);
  const totalOpenAmount = openBills.reduce(
    (sum, bill) => sum + toNumber(bill.amount),
    0,
  );
  const totalPaidAmount = paidBills.reduce(
    (sum, bill) => sum + toNumber(bill.amount),
    0,
  );
  const nextDueBill =
    [...openBills]
      .filter((bill) => toMillis(bill.dueDate) > 0)
      .sort(
        (left, right) => toMillis(left.dueDate) - toMillis(right.dueDate),
      )[0] || null;

  return {
    bills,
    documents,
    openBills,
    overdueBills,
    dueThisWeekBills,
    scheduledBills,
    paidBills,
    projectIds,
    projects,
    totalOpenAmount,
    totalPaidAmount,
    nextDueBill,
  };
}

function customerRollup(customer, options = {}) {
  if (!customer) {
    return {
      leads: [],
      projects: [],
      openLeads: [],
      lostLeads: [],
      estimateLeads: [],
      openEstimateLeads: [],
      latestEstimateLead: null,
      totalWonSales: 0,
      totalPaymentsReceived: 0,
      currentEstimateLead: null,
    };
  }

  const leadSource = Array.isArray(options.leads)
    ? options.leads
    : visibleLeads();
  const projectSource = Array.isArray(options.projects)
    ? options.projects
    : visibleProjects();
  const leads = sortByUpdatedDesc(
    leadSource.filter((lead) => lead.customerId === customer.id),
  );
  const projects = sortByUpdatedDesc(
    projectSource.filter((project) => project.customerId === customer.id),
  );
  const openLeads = leads.filter((lead) =>
    ["new_lead", "follow_up", "estimate_sent"].includes(lead.status),
  );
  const lostLeads = leads.filter((lead) => lead.status === "closed_lost");
  const estimateLeads = leads.filter((lead) => Boolean(lead.hasEstimate));
  const openEstimateLeads = openLeads.filter((lead) => Boolean(lead.hasEstimate));
  const latestEstimateLead = latestByUpdated(estimateLeads);
  const currentEstimateLead =
    latestByUpdated(openEstimateLeads) || latestEstimateLead;
  const totalWonSales = projects.reduce((sum, project) => {
    return (
      sum +
      toNumber(
        project.totalContractRevenue ||
          project.jobValue ||
          project.baseContractValue,
      )
    );
  }, 0);
  const totalPaymentsReceived = projects.reduce(
    (sum, project) => sum + toNumber(project.financials?.totalPayments),
    0,
  );

  return {
    leads,
    projects,
    openLeads,
    lostLeads,
    estimateLeads,
    openEstimateLeads,
    latestEstimateLead,
    totalWonSales,
    totalPaymentsReceived,
    currentEstimateLead,
  };
}

function leadForProject(project) {
  if (!project) return null;

  return (
    state.leads.find((lead) => {
      return (
        safeString(lead.id) === safeString(project.leadId) ||
        safeString(lead.wonProjectId) === safeString(project.id) ||
        safeString(lead.id) === safeString(project.id)
      );
    }) || null
  );
}

function recordDocumentSortValue(item) {
  return toMillis(item?.relatedDate || item?.updatedAt || item?.createdAt);
}

function sortRecordDocuments(items = []) {
  return [...items].sort(
    (left, right) =>
      recordDocumentSortValue(right) - recordDocumentSortValue(left),
  );
}

function isEstimateRecordDocument(item) {
  return (
    safeString(item?.documentKind) === "estimate" ||
    safeString(item?.category) === "estimate"
  );
}

function defaultRecordDocumentTitle(category = "other") {
  return DOCUMENT_CATEGORY_META[category] || "Document";
}

function estimateRecordDocumentId(leadId) {
  return `estimate-${safeString(leadId)}`;
}

function buildRecordDocumentLinksFromLead(lead) {
  const linkedProject = projectForLead(lead);

  return {
    leadId: safeString(lead?.id) || null,
    customerId:
      safeString(lead?.customerId || linkedProject?.customerId) || null,
    projectId: safeString(linkedProject?.id || lead?.wonProjectId) || null,
  };
}

function buildRecordDocumentLinksFromProject(project) {
  const linkedLead = leadForProject(project);

  return {
    projectId: safeString(project?.id) || null,
    leadId:
      safeString(project?.leadId || linkedLead?.id || project?.id) || null,
    customerId:
      safeString(project?.customerId || linkedLead?.customerId) || null,
  };
}

function customerDocumentTargetOptions(
  customer,
  rollup = customerRollup(customer),
) {
  const options = [];

  sortRecordDocuments(rollup.projects).forEach((project) => {
    options.push({
      value: `project:${project.id}`,
      label: `Job · ${project.projectAddress || project.clientName || "Property pending"}`,
    });
  });

  sortRecordDocuments(rollup.leads).forEach((lead) => {
    options.push({
      value: `lead:${lead.id}`,
      label: `Lead · ${lead.projectAddress || lead.clientName || "Opportunity pending"}`,
    });
  });

  if (!options.length && customer?.id) {
    options.push({
      value: `customer:${customer.id}`,
      label: "Customer only · Account-level record",
    });
  }

  return options;
}

function parseRecordDocumentTarget(value) {
  const [type, ...rest] = safeString(value).split(":");
  return {
    type: safeString(type),
    id: safeString(rest.join(":")),
  };
}

function buildRecordDocumentLinksFromCustomerTarget(customer, targetValue) {
  const target = parseRecordDocumentTarget(targetValue);

  if (target.type === "project" && target.id) {
    const project =
      state.projects.find((item) => item.id === target.id) || null;
    if (project) {
      return {
        ...buildRecordDocumentLinksFromProject(project),
        customerId: safeString(customer?.id || project.customerId) || null,
      };
    }
  }

  if (target.type === "lead" && target.id) {
    const lead = state.leads.find((item) => item.id === target.id) || null;
    if (lead) {
      return {
        ...buildRecordDocumentLinksFromLead(lead),
        customerId: safeString(customer?.id || lead.customerId) || null,
      };
    }
  }

  if (customer?.id) {
    return {
      leadId: null,
      customerId: customer.id,
      projectId: null,
    };
  }

  return {
    leadId: null,
    customerId: null,
    projectId: null,
  };
}

function recordDocumentScopeLabel(item) {
  const scopes = [];

  if (safeString(item?.customerId)) scopes.push("Customer");
  if (safeString(item?.leadId)) scopes.push("Lead");
  if (safeString(item?.projectId)) scopes.push("Job");

  return scopes.length ? scopes.join(" + ") : "Standalone record";
}

function recordDocumentSourceLabel(item) {
  if (isEstimateRecordDocument(item)) {
    return "Live estimate";
  }

  return DOCUMENT_SOURCE_META[item?.sourceType] || "Manual record";
}

function buildRecordDocumentSummaryMarkup(documents = []) {
  const items = [
    { label: "All records", value: String(documents.length) },
    {
      label: "Live estimates",
      value: String(documents.filter(isEstimateRecordDocument).length),
    },
    {
      label: "Agreements",
      value: String(
        documents.filter((item) => item.category === "agreement").length,
      ),
    },
    {
      label: "Receipts",
      value: String(
        documents.filter((item) => item.category === "receipt").length,
      ),
    },
  ];

  return items
    .map(
      (item) => `
        <article class="summary-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `,
    )
    .join("");
}

function buildRecordDocumentCard(item) {
  const href = documentHref(item);
  const isEstimate = isEstimateRecordDocument(item);
  const canOpenEstimate =
    safeString(item?.leadId) &&
    (isAdmin() || state.leads.some((lead) => lead.id === item.leadId));
  const meta = [
    DOCUMENT_CATEGORY_META[item?.category] || "Other",
    recordDocumentSourceLabel(item),
    formatDateOnly(item?.relatedDate || item?.updatedAt || item?.createdAt),
    recordDocumentScopeLabel(item),
    item?.clientVisible === true ? "Secure portal visible" : "",
  ].filter(Boolean);
  const note = safeString(item?.note);
  const actions = [];

  if (isEstimate && canOpenEstimate) {
    actions.push(`
            <button type="button" class="secondary-button" data-record-document-open-estimate="${escapeHtml(item.id)}" data-lead-id="${escapeHtml(item.leadId)}">
                Open estimate
            </button>
        `);
    actions.push(`
            <button type="button" class="ghost-button" data-record-document-download-estimate="${escapeHtml(item.id)}" data-lead-id="${escapeHtml(item.leadId)}">
                Download PDF
            </button>
        `);
  } else if (href) {
    actions.push(`
            <a class="secondary-button" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">
                Open document
            </a>
        `);
  }

  if (isAdmin()) {
    actions.push(`
            <button type="button" class="ghost-button" data-record-document-delete="${escapeHtml(item.id)}">
                Delete
            </button>
        `);
  }

  return `
        <article class="document-card ${isEstimate ? "is-estimate" : ""}">
            <div class="document-card-head">
                <div class="document-card-title-wrap">
                    <div class="document-card-kicker">${escapeHtml(isEstimate ? "Shared estimate record" : "Shared document")}</div>
                    <strong class="document-card-title">${escapeHtml(item.title || defaultRecordDocumentTitle(item.category))}</strong>
                    ${note ? `<p class="document-card-note">${escapeHtml(note)}</p>` : ""}
                </div>
                ${actions.length ? `<div class="document-card-actions">${actions.join("")}</div>` : ""}
            </div>
            <div class="document-card-meta">${meta.map((entry) => `<span>${escapeHtml(entry)}</span>`).join("")}</div>
            <div class="document-card-links">
                Added by ${escapeHtml(item.createdByName || "Golden Brick")}
            </div>
        </article>
    `;
}

function renderRecordDocumentList(container, documents = [], emptyMessage) {
  const items = sortRecordDocuments(documents);

  if (!items.length) {
    renderEmptyList(container, emptyMessage);
    return;
  }

  container.innerHTML = items
    .map((item) => buildRecordDocumentCard(item))
    .join("");
}

function toggleRecordDocumentSourceFields(sourceField, urlRow, fileRow) {
  const sourceType = sourceField?.value || "upload";
  if (urlRow) {
    urlRow.hidden = sourceType !== "link";
  }
  if (fileRow) {
    fileRow.hidden = sourceType !== "upload";
  }
}

function renderLeadDocumentSourceFields() {
  toggleRecordDocumentSourceFields(
    refs.leadDocumentSourceType,
    refs.leadDocumentUrlRow,
    refs.leadDocumentFileRow,
  );
}

function renderCustomerDocumentSourceFields() {
  toggleRecordDocumentSourceFields(
    refs.customerDocumentSourceType,
    refs.customerDocumentUrlRow,
    refs.customerDocumentFileRow,
  );
}

async function uploadRecordDocumentFile(documentId, file) {
  const safeFileName = safeString(file?.name).replace(/[^a-zA-Z0-9._-]+/g, "-");
  const uploadRef = storageRef(
    state.storage,
    `recordDocuments/${documentId}/${safeFileName}`,
  );
  await uploadBytes(uploadRef, file);

  return {
    fileUrl: await getDownloadURL(uploadRef),
    filePath: uploadRef.fullPath,
    fileName: file.name,
  };
}

async function createRecordDocument({
  links,
  category = "other",
  sourceType = "manual",
  title = "",
  note = "",
  relatedDate = new Date(),
  externalUrl = "",
  file = null,
  clientVisible = false,
}) {
  const documentRef = doc(collection(state.db, "recordDocuments"));
  let resolvedExternalUrl = "";
  const basePayload = {
    id: documentRef.id,
    documentKind: "file",
    category,
    sourceType,
    title: title.trim() || defaultRecordDocumentTitle(category),
    note: note.trim(),
    relatedDate,
    externalUrl: "",
    fileUrl: "",
    filePath: "",
    fileName: "",
    leadId: links?.leadId || null,
    customerId: links?.customerId || null,
    projectId: links?.projectId || null,
    clientVisible: clientVisible === true,
    estimateId: null,
    createdByUid: state.profile?.uid || "",
    createdByName:
      state.profile?.displayName || state.profile?.email || "Golden Brick",
    createdByRole: state.profile?.role || "employee",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (sourceType === "link") {
    resolvedExternalUrl = safeString(externalUrl);
    if (!resolvedExternalUrl) {
      throw new Error("Add the external document link first.");
    }
  }

  if (sourceType === "upload") {
    if (!file) {
      throw new Error("Choose a file to upload.");
    }

    await setDoc(documentRef, basePayload, { merge: true });

    try {
      const upload = await uploadRecordDocumentFile(documentRef.id, file);
      await setDoc(
        documentRef,
        {
          externalUrl: "",
          fileUrl: upload.fileUrl,
          filePath: upload.filePath,
          fileName: upload.fileName,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      await deleteDoc(documentRef).catch(() => {});
      throw error;
    }

    return documentRef.id;
  }

  await setDoc(
    documentRef,
    {
      ...basePayload,
      externalUrl: resolvedExternalUrl,
    },
    { merge: true },
  );

  return documentRef.id;
}

async function resolveEstimateRecordContext(leadId) {
  const lead = state.leads.find((item) => item.id === leadId) || null;
  if (!lead) {
    throw new Error("Linked lead not found for this estimate.");
  }

  if (
    state.selectedLeadId === leadId &&
    state.estimate &&
    estimateBelongsToLead(state.estimate, leadId)
  ) {
    return {
      lead,
      estimate: state.estimate,
    };
  }

  const estimateSnap = await getDoc(doc(state.db, "estimates", leadId));
  if (!estimateSnap.exists()) {
    throw new Error("No estimate is saved for this lead yet.");
  }
  const estimateData = estimateSnap.data() || {};
  const storedLeadId = safeString(estimateData.leadId || estimateData.id || leadId);
  if (storedLeadId !== safeString(leadId)) {
    throw new Error(
      "This saved estimate points to a different lead and cannot be opened.",
    );
  }

  return {
    lead,
    estimate: {
      ...estimateData,
      id: leadId,
      leadId,
    },
  };
}

async function downloadEstimatePdfForLead(leadId) {
  const { lead, estimate } = await resolveEstimateRecordContext(leadId);

  try {
    const { jsPDF } = await loadJsPdfModule();
    const pdf = new jsPDF({
      unit: "pt",
      format: "letter",
    });

    buildEstimatePdf(pdf, lead, estimate);
    pdf.save(estimateDownloadFilename(lead, estimate, "pdf"));
    return "pdf";
  } catch (error) {
    console.error(
      "Estimate PDF download failed from shared document card.",
      error,
    );
    downloadEstimateHtmlFallback(lead, estimate);
    return "html";
  }
}

async function createJobCloseoutPacket() {
  const project = currentProject();
  if (!project) {
    showToast("Select a job first.", "error");
    return;
  }

  if (safeString(project.status) !== "completed") {
    showToast(
      "Mark the job completed first so the closeout packet closes the record correctly.",
      "error",
    );
    openJobTab("overview", refs.jobStatusSelect);
    return;
  }

  if (!projectIsPaidInFull(project)) {
    showToast(
      "Record final payment and bring the job balance to $0.00 before generating the paid-in-full closeout packet.",
      "error",
    );
    openJobTab("financials", refs.paymentAmount);
    return;
  }

  const incompleteScopeCount = state.projectScopeItems.filter(
    (item) => !item.completed,
  ).length;
  if (state.projectScopeItems.length && incompleteScopeCount > 0) {
    const confirmed = window.confirm(
      `${incompleteScopeCount} scope item${incompleteScopeCount === 1 ? "" : "s"} are not marked complete in the live job tracker. Generate the closeout packet anyway?`,
    );
    if (!confirmed) {
      return;
    }
  }

  let estimate = state.projectLeadEstimate;
  if (!estimate && safeString(project.leadId)) {
    const estimateSnap = await getDoc(doc(state.db, "estimates", project.leadId));
    estimate = estimateSnap.exists() ? normaliseFirestoreDoc(estimateSnap) : null;
  }

  const linkedLead = safeString(project.leadId)
    ? state.leads.find((lead) => lead.id === project.leadId) || null
    : null;
  const approvedChangeOrders = state.projectChangeOrders.filter(
    (item) => normaliseChangeOrderStatus(item.status) === "approved",
  );
  const financials = projectFinancials(project);
  const clientVisibleDocuments = state.projectDocuments.filter(
    (item) => item.clientVisible,
  );
  const context = {
    project,
    linkedLead,
    estimate,
    scopeItems: state.projectScopeItems,
    payments: state.projectPayments,
    approvedChangeOrders,
    financials,
    clientVisibleDocumentCount: clientVisibleDocuments.length,
    clientVisiblePhotoCount: clientVisibleDocuments.filter(
      (item) => safeString(item.category) === "photo",
    ).length,
    invoiceCount: state.projectInvoices.length,
  };

  const { jsPDF } = await loadJsPdfModule();
  const pdf = new jsPDF({
    unit: "pt",
    format: "letter",
  });
  buildProjectCloseoutPdf(pdf, context);
  const pdfBlob = pdf.output("blob");
  const closeoutFile = new File(
    [pdfBlob],
    closeoutDownloadFilename(project, "pdf"),
    { type: "application/pdf" },
  );
  const closeoutTitle = closeoutDocumentTitle(project);
  const closeoutNote =
    "Final paid-in-full closeout packet generated from the live job record, linked estimate history, approved change orders, and client-visible portal record.";
  const clientVisible = Boolean(safeString(project.customerId));

  await createRecordDocument({
    links: buildRecordDocumentLinksFromProject(project),
    category: "closeout",
    sourceType: "upload",
    title: closeoutTitle,
    note: closeoutNote,
    relatedDate: projectCloseoutDate(project) || new Date(),
    file: closeoutFile,
    clientVisible,
  });

  await Promise.all([
    addProjectActivityEntry(
      project.id,
      "closeout",
      "Closeout packet generated",
      clientVisible
        ? "A final paid-in-full closeout PDF was generated and shared to the secure portal."
        : "A final paid-in-full closeout PDF was generated and saved to the job record.",
    ),
    clientVisible
      ? postCustomerPortalThreadUpdateSafe({
          customerId: project.customerId,
          projectId: project.id,
          body: buildClientPortalDocumentUpdateMessage({
            project,
            category: "closeout",
            title: closeoutTitle,
            note: closeoutNote,
          }),
        })
      : Promise.resolve(),
  ]);

  openJobTab("documents", refs.jobDocumentTitle);
  showToast(
    clientVisible
      ? "Closeout PDF saved and shared to the secure portal."
      : "Closeout PDF saved to job documents.",
  );
}

function openEstimateRecordFromDocument(leadId) {
  if (!safeString(leadId)) {
    showToast("This estimate is not linked to a lead yet.", "error");
    return;
  }

  selectLead(leadId, { openWorkspace: true, preserveTab: true });
  switchView("leads-view");
  openLeadTab("estimate", refs.estimateSubject);
}

async function safeDeleteStoragePath(path) {
  if (!safeString(path)) {
    return;
  }

  try {
    await deleteObject(storageRef(state.storage, path));
  } catch (error) {
    if (error?.code !== "storage/object-not-found") {
      throw error;
    }
  }
}

async function clearRecordDocumentExpenseLinks(documentItem) {
  if (!safeString(documentItem?.projectId) || !safeString(documentItem?.id)) {
    return;
  }

  const expensesSnap = await getDocs(
    query(
      collection(state.db, "projects", documentItem.projectId, "expenses"),
      where("receiptDocumentId", "==", documentItem.id),
    ),
  );

  await Promise.all(
    expensesSnap.docs.map((snapshot) =>
      updateDoc(snapshot.ref, {
        receiptDocumentId: null,
        receiptTitle: "",
        receiptUrl: "",
        updatedAt: serverTimestamp(),
      }),
    ),
  );
}

async function clearVendorDocumentBillLinks(documentId) {
  if (!safeString(documentId)) {
    return;
  }

  const billsSnap = await getDocs(
    query(
      collection(state.db, "vendorBills"),
      where("invoiceDocumentId", "==", documentId),
    ),
  );

  await Promise.all(
    billsSnap.docs.map((snapshot) =>
      updateDoc(snapshot.ref, {
        invoiceDocumentId: null,
        invoiceTitle: "",
        invoiceFileUrl: "",
        invoiceExternalUrl: "",
        updatedAt: serverTimestamp(),
      }),
    ),
  );
}

async function deleteRecordDocument(item) {
  if (!isAdmin()) {
    showToast("Only admins can delete shared documents.", "error");
    return;
  }

  if (!item?.id) {
    showToast("Document not found.", "error");
    return;
  }

  const confirmed = window.confirm(
    `Delete "${item.title || "this document"}" everywhere it appears?`,
  );
  if (!confirmed) {
    return;
  }

  await safeDeleteStoragePath(item.filePath);
  await clearRecordDocumentExpenseLinks(item);
  await deleteDoc(doc(state.db, "recordDocuments", item.id));
  showToast("Shared document deleted.");
}

async function deleteVendorDocument(item) {
  if (!isAdmin()) {
    showToast("Only admins can delete vendor documents.", "error");
    return;
  }

  if (!item?.id) {
    showToast("Vendor document not found.", "error");
    return;
  }

  const confirmed = window.confirm(
    `Delete "${item.title || "this vendor document"}"?`,
  );
  if (!confirmed) {
    return;
  }

  await safeDeleteStoragePath(item.filePath);
  await clearVendorDocumentBillLinks(item.id);
  await deleteDoc(doc(state.db, "vendorDocuments", item.id));
  showToast("Vendor document deleted.");
}

async function upsertEstimateRecordDocumentForLead(
  leadId,
  estimateData,
  leadData = null,
) {
  const lead =
    leadData || state.leads.find((item) => item.id === leadId) || null;
  if (!lead?.id) {
    return;
  }

  const recordId = estimateRecordDocumentId(lead.id);
  const recordRef = doc(state.db, "recordDocuments", recordId);
  const existingSnap = await getDoc(recordRef);
  const links = buildRecordDocumentLinksFromLead(lead);
  const note =
    splitEstimateMultilineText(
      estimateData?.emailBody || lead.estimateTitle || "",
    )[0] || "";

  await setDoc(
    recordRef,
    {
      id: recordId,
      documentKind: "estimate",
      category: "estimate",
      sourceType: "generated",
      title: safeString(
        estimateData?.subject ||
          lead.estimateTitle ||
          `Estimate for ${lead.projectAddress || lead.clientName || "project"}`,
      ),
      note,
      relatedDate:
        estimateData?.updatedAt || lead.estimateUpdatedAt || new Date(),
      externalUrl: "",
      fileUrl: "",
      filePath: "",
      fileName: "",
      leadId: links.leadId,
      customerId: links.customerId,
      projectId: links.projectId,
      estimateId: lead.id,
      createdByUid: state.profile?.uid || "system",
      createdByName: state.profile?.displayName || "Golden Brick System",
      createdByRole: state.profile?.role || "system",
      createdAt: existingSnap.exists()
        ? existingSnap.data()?.createdAt || serverTimestamp()
        : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function buildEmployeeCustomerRecords() {
  const customerMap = new Map();

  function mergeCustomerRecord(source = {}) {
    const customerId = safeString(source.customerId);
    if (!customerId) {
      return;
    }

    const existing = customerMap.get(customerId) || {
      id: customerId,
      name: "",
      primaryEmail: "",
      primaryPhone: "",
      primaryAddress: "",
      notes: "",
      createdAt: null,
      updatedAt: null,
    };
    const nextUpdatedAt =
      toMillis(source.updatedAt || source.createdAt) >=
      toMillis(existing.updatedAt || existing.createdAt)
        ? source.updatedAt ||
          source.createdAt ||
          existing.updatedAt ||
          existing.createdAt ||
          null
        : existing.updatedAt ||
          existing.createdAt ||
          source.updatedAt ||
          source.createdAt ||
          null;

    customerMap.set(customerId, {
      ...existing,
      id: customerId,
      name:
        existing.name ||
        safeString(
          source.customerName || source.clientName || "Unnamed customer",
        ),
      primaryEmail: existing.primaryEmail || safeString(source.clientEmail),
      primaryPhone: existing.primaryPhone || safeString(source.clientPhone),
      primaryAddress:
        existing.primaryAddress || safeString(source.projectAddress),
      updatedAt: nextUpdatedAt,
    });
  }

  state.leads.forEach(mergeCustomerRecord);
  state.projects.forEach(mergeCustomerRecord);

  return Array.from(customerMap.values());
}

function refreshScopedCustomers() {
  if (isAdmin()) {
    return;
  }

  state.customers = buildEmployeeCustomerRecords();
}

function syncScopedProjects() {
  clearUnsubs(state.unsubs.scopedProjects);
  state.unsubs.scopedProjects = [];

  if (isAdmin()) {
    return;
  }

  const projectIds = uniqueValues([
    ...state.leads.flatMap((lead) => {
      const ids = [lead.wonProjectId];
      if ((lead.status === "closed_won" || lead.wonProjectId) && lead.id) {
        ids.push(lead.id);
      }
      return ids;
    }),
    ...state.tasks.map((task) => task.projectId),
  ]);

  if (!projectIds.length) {
    state.projects = [];
    refreshScopedCustomers();
    resetSelectionFromSnapshots();
    subscribeProjectDetail();
    renderAll();
    return;
  }

  const projectMap = new Map(
    state.projects.map((project) => [project.id, project]),
  );
  const syncProjectState = () => {
    state.projects = sortByUpdatedDesc(Array.from(projectMap.values()));
    refreshScopedCustomers();
    restoreProjectWorkspaceFromRoute();
    resetSelectionFromSnapshots();
    subscribeProjectDetail();
    renderAll();
  };

  projectIds.forEach((projectId) => {
    state.unsubs.scopedProjects.push(
      onSnapshot(
        doc(state.db, "projects", projectId),
        (snapshot) => {
          if (snapshot.exists()) {
            projectMap.set(snapshot.id, normaliseFirestoreDoc(snapshot));
          } else {
            projectMap.delete(projectId);
          }
          syncProjectState();
        },
        (error) => {
          console.error("Scoped job subscription failed.", error);
          projectMap.delete(projectId);
          syncProjectState();

          if (!isPermissionDeniedError(error)) {
            setBanner("Some job records could not load right now.", "error");
          }
        },
      ),
    );
  });
}

function defaultLeadDraft(customer = null) {
  const assignee = isAdmin()
    ? preferredLeadAssignee()
    : state.profile
      ? {
          uid: state.profile.uid,
          email: state.profile.email,
          displayName: state.profile.displayName,
        }
      : preferredLeadAssignee();
  return {
    customerId: customer?.id || null,
    customerName: customer?.name || "",
    customerSearch: customer?.name || "",
    clientName: customer?.name || "",
    clientEmail: customer?.primaryEmail || "",
    clientPhone: customer?.primaryPhone || "",
    projectAddress: customer?.primaryAddress || "",
    projectType: "",
    notes: "",
    planningNotes: "",
    sourceForm: "manual_entry",
    sourcePage: "Staff CRM",
    sourcePath: "/staff",
    status: "new_lead",
    statusLabel: STATUS_META.new_lead,
    assignedToUid: assignee?.uid || null,
    assignedToName: assignee?.displayName || assignee?.email || "",
    assignedToEmail: assignee?.email || "",
    hasEstimate: false,
    estimateSubtotal: 0,
    estimateTitle: "",
    createdAt: null,
    updatedAt: null,
  };
}

function defaultCustomerDraft() {
  return {
    name: "",
    primaryEmail: "",
    primaryPhone: "",
    primaryAddress: "",
    notes: "",
    totalWonSales: 0,
    totalPaymentsReceived: 0,
  };
}

function defaultVendorDraft() {
  return {
    name: "",
    legalName: "",
    status: "active",
    tradeIds: [],
    tradeOtherText: "",
    primaryContactName: "",
    primaryPhone: "",
    primaryEmail: "",
    address: "",
    serviceArea: "",
    preferredPaymentMethod: "",
    defaultTerms: "",
    insuranceStatus: "undecided",
    insuranceExpirationDate: null,
    licenseExpirationDate: null,
    insuranceNote: "",
    notes: "",
    createdAt: null,
    updatedAt: null,
  };
}

function defaultTaskDraft(linked = {}) {
  const focusMember = currentStaffFocusMember();
  return {
    title: "",
    description: "",
    status: "open",
    priority: "high",
    assignedToUid:
      linked.assignedToUid || focusMember?.uid || state.profile?.uid || "",
    assignedToName:
      linked.assignedToName ||
      focusMember?.displayName ||
      focusMember?.email ||
      state.profile?.displayName ||
      "",
    assignedToEmail:
      linked.assignedToEmail ||
      focusMember?.email ||
      state.profile?.email ||
      "",
    dueAt: null,
    leadId: linked.leadId || null,
    customerId: linked.customerId || null,
    projectId: linked.projectId || null,
  };
}

function defaultCommunicationDrawerDraft(linked = {}) {
  const project = linked.projectId
    ? state.projects.find((item) => item.id === linked.projectId)
    : null;
  const lead = linked.leadId
    ? state.leads.find((item) => item.id === linked.leadId)
    : null;
  const activeProject =
    state.activeView === "jobs-view" ? currentProject() : null;
  const activeLead =
    state.activeView === "leads-view" && state.leadWorkspaceOpen
      ? currentLeadDoc()
      : null;
  const targetProject = project || activeProject || null;
  const targetLead = lead || (!targetProject ? activeLead : null);
  const linkedType = targetProject ? "project" : "lead";
  const linkedId = targetProject?.id || targetLead?.id || "";
  const contactSource = targetProject || targetLead || {};

  return {
    linkedType,
    linkedId,
    recordSearch: "",
    communicationType: "call",
    direction: "outbound",
    happenedAt: formatDateInputValue(new Date()),
    contactName:
      contactSource.clientName ||
      contactSource.customerName ||
      contactSource.name ||
      "",
    contactMethod:
      contactSource.clientPhone ||
      contactSource.primaryPhone ||
      contactSource.clientEmail ||
      contactSource.primaryEmail ||
      "",
    body: "",
    outcome: "",
    followUpRequired: false,
    followUpAt: "",
    clientVisible: false,
  };
}

function resetDrawerState(overrides = {}) {
  return {
    type: null,
    context: {},
    restoreFocus: null,
    expenseDraft: null,
    leadDraft: null,
    jobDraft: null,
    serviceOrderDraft: null,
    customerDraft: null,
    vendorDraft: null,
    taskDraft: null,
    communicationDraft: null,
    ...overrides,
  };
}

function closeDrawer() {
  const restoreFocus = state.drawer.restoreFocus;
  state.drawer = resetDrawerState();
  setDrawerVisibility(false);

  if (restoreFocus && typeof restoreFocus.focus === "function") {
    window.requestAnimationFrame(() => {
      restoreFocus.focus({ preventScroll: true });
    });
  }
}

function openLeadDrawer({ customerId = null } = {}) {
  const customer = customerId
    ? state.customers.find((item) => item.id === customerId)
    : null;
  state.drawer = resetDrawerState({
    type: "lead",
    context: { customerId: customer?.id || null },
    restoreFocus: rememberedFocusElement(),
    leadDraft: {
      ...defaultLeadDraft(customer || null),
      customerId: customer?.id || null,
      customerName: customer?.name || "",
    },
  });
  renderActiveDrawer();
  queueFocus(refs.drawerLeadClientName);
}

function openCustomerDrawer(seed = {}) {
  state.drawer = resetDrawerState({
    type: "customer",
    context: {},
    restoreFocus: rememberedFocusElement(),
    customerDraft: {
      ...defaultCustomerDraft(),
      name: seed.name || "",
      primaryEmail: seed.primaryEmail || "",
      primaryPhone: seed.primaryPhone || "",
      primaryAddress: seed.primaryAddress || "",
      notes: seed.notes || "",
    },
  });
  renderActiveDrawer();
  queueFocus(refs.drawerCustomerName);
}

function openVendorDrawer(seed = {}) {
  state.drawer = resetDrawerState({
    type: "vendor",
    context: {},
    restoreFocus: rememberedFocusElement(),
    vendorDraft: {
      ...defaultVendorDraft(),
      name: seed.name || "",
      legalName: seed.legalName || "",
      status: seed.status || "active",
      tradeIds: Array.isArray(seed.tradeIds) ? seed.tradeIds : [],
      tradeOtherText: seed.tradeOtherText || "",
      primaryContactName: seed.primaryContactName || "",
      primaryPhone: seed.primaryPhone || "",
      primaryEmail: seed.primaryEmail || "",
      address: seed.address || "",
      serviceArea: seed.serviceArea || "",
      preferredPaymentMethod: seed.preferredPaymentMethod || "",
      defaultTerms: seed.defaultTerms || "",
      notes: seed.notes || "",
    },
  });
  renderActiveDrawer();
  queueFocus(refs.drawerVendorName);
}

function openTaskDrawer(linked = {}) {
  const preferredType =
    linked.preferredType ||
    (linked.projectId
      ? "project"
      : linked.leadId
        ? "lead"
        : linked.customerId
          ? "customer"
          : "");
  state.drawer = resetDrawerState({
    type: "task",
    context: { ...linked, preferredType },
    restoreFocus: rememberedFocusElement(),
    taskDraft: defaultTaskDraft(linked),
  });
  renderActiveDrawer();
  queueFocus(refs.drawerTaskTitle);
}

function openCommunicationDrawer(linked = {}) {
  state.drawer = resetDrawerState({
    type: "communication",
    context: { ...linked },
    restoreFocus: rememberedFocusElement(),
    communicationDraft: defaultCommunicationDrawerDraft(linked),
  });
  renderActiveDrawer();
  queueFocus(refs.drawerCommunicationType);
}

function openExpenseDrawer({
  projectId = state.selectedProjectId || null,
} = {}) {
  state.drawer = resetDrawerState({
    type: "expense",
    context: {},
    restoreFocus: rememberedFocusElement(),
    expenseDraft: defaultExpenseDrawerDraft(projectId),
  });
  renderActiveDrawer();
  queueFocus(
    isMobileViewport()
      ? refs.drawerCloseButton
      : projectId
        ? refs.drawerExpenseAmount
        : refs.drawerExpenseProjectSearch,
  );
}

function openServiceOrderDrawer(seed = {}) {
  if (!isAdmin()) {
    showToast("Only admins can create service orders.", "error");
    return;
  }

  state.drawer = resetDrawerState({
    type: "service-order",
    context: {},
    restoreFocus: rememberedFocusElement(),
    serviceOrderDraft: defaultServiceOrderDrawerDraft(seed),
  });
  renderActiveDrawer();
  queueFocus(refs.drawerServiceTemplate);
}

function openJobDrawer(seed = {}) {
  if (!isAdmin()) {
    showToast("Only admins can create jobs directly.", "error");
    return;
  }

  state.drawer = resetDrawerState({
    type: "job",
    context: {},
    restoreFocus: rememberedFocusElement(),
    jobDraft: defaultJobDrawerDraft(seed),
  });
  renderActiveDrawer();
  queueFocus(refs.drawerJobClientName);
}

function openMobileCreateDrawer() {
  state.drawer = resetDrawerState({
    type: "mobile-create",
    context: {},
    restoreFocus: rememberedFocusElement(),
  });
  renderActiveDrawer();
  queueFocus(refs.drawerMenuList?.querySelector("[data-drawer-action]"));
}

function openMobileMoreDrawer() {
  state.drawer = resetDrawerState({
    type: "mobile-more",
    context: {},
    restoreFocus: rememberedFocusElement(),
  });
  renderActiveDrawer();
  queueFocus(refs.drawerMenuList?.querySelector("[data-drawer-view]"));
}

function drawerTaskLinkedType(taskDraft) {
  const preferredType = state.drawer.context?.preferredType;
  if (preferredType === "project" && taskDraft?.projectId) return "project";
  if (preferredType === "lead" && taskDraft?.leadId) return "lead";
  if (preferredType === "customer" && taskDraft?.customerId) return "customer";
  if (taskDraft?.projectId) return "project";
  if (taskDraft?.leadId) return "lead";
  if (taskDraft?.customerId) return "customer";
  return "";
}

function hideDrawerPanels() {
  refs.drawerMenuPanel.hidden = true;
  refs.drawerExpenseForm.hidden = true;
  refs.drawerLeadForm.hidden = true;
  refs.drawerJobForm.hidden = true;
  refs.drawerServiceOrderForm.hidden = true;
  refs.drawerCustomerForm.hidden = true;
  refs.drawerVendorForm.hidden = true;
  refs.drawerTaskForm.hidden = true;
  refs.drawerCommunicationForm.hidden = true;
}

function renderDrawerMenu() {
  renderDrawerActionMenu({
    kicker: "Navigation",
    title: "More sections",
    subtitle:
      "Jump to the rest of the CRM without wrestling with the desktop sidebar.",
    items: [
      { label: "Tasks", view: "tasks-view" },
      { label: "Customers", view: "customers-view" },
      { label: "Vendors", view: "vendors-view" },
      ...(isAdmin()
        ? [
            { label: "Website Projects", view: "site-projects-view" },
            { label: "Settings", view: "staff-view" },
          ]
        : []),
    ],
  });
}

function renderDrawerCreateMenu() {
  renderDrawerActionMenu({
    kicker: "Quick add",
    title: "Create something",
    subtitle: "Start the most common updates from one clean mobile menu.",
    items: [
      { label: "Add lead", action: "lead" },
      { label: "Add expense", action: "expense" },
      { label: "Add task", action: "task" },
      { label: "Log communication", action: "communication" },
      { label: "New job", action: "job" },
      { label: "New service order", action: "service-order" },
      { label: "Add customer", action: "customer" },
      { label: "Add vendor", action: "vendor" },
    ],
  });
}

function renderDrawerActionMenu({ kicker, title, subtitle, items = [] }) {
  hideDrawerPanels();
  refs.drawerMenuPanel.hidden = false;
  refs.drawerKicker.textContent = kicker;
  refs.drawerTitle.textContent = title;
  refs.drawerSubtitle.textContent = subtitle;
  refs.drawerMenuList.innerHTML = items
    .map((item) => {
      const attrs = item.view
        ? `data-drawer-view="${escapeHtml(item.view)}"`
        : `data-drawer-action="${escapeHtml(item.action)}"`;
      return `<button type="button" class="drawer-menu-button" ${attrs}>${escapeHtml(item.label)}</button>`;
    })
    .join("");
}

function collectDrawerLeadDraftFromInputs() {
  return {
    ...(state.drawer.leadDraft || defaultLeadDraft()),
    customerSearch:
      refs.drawerLeadCustomerSearch?.value ||
      state.drawer.leadDraft?.customerSearch ||
      "",
    clientName:
      refs.drawerLeadClientName?.value ??
      state.drawer.leadDraft?.clientName ??
      "",
    clientPhone:
      refs.drawerLeadClientPhone?.value ??
      state.drawer.leadDraft?.clientPhone ??
      "",
    clientEmail:
      refs.drawerLeadClientEmail?.value ??
      state.drawer.leadDraft?.clientEmail ??
      "",
    projectAddress:
      refs.drawerLeadProjectAddress?.value ??
      state.drawer.leadDraft?.projectAddress ??
      "",
    projectType:
      refs.drawerLeadProjectType?.value ??
      state.drawer.leadDraft?.projectType ??
      "",
    notes: refs.drawerLeadNotes?.value ?? state.drawer.leadDraft?.notes ?? "",
    assignedToUid:
      refs.drawerLeadAssignee?.value ||
      state.drawer.leadDraft?.assignedToUid ||
      "",
  };
}

function renderDrawerLeadCustomerOptions() {
  const leadDraft = state.drawer.leadDraft || defaultLeadDraft();
  const search = safeString(
    refs.drawerLeadCustomerSearch?.value || leadDraft.customerSearch,
  ).toLowerCase();
  const selectedCustomerId = leadDraft.customerId || "";
  const customers = sortByUpdatedDesc(visibleCustomers()).filter((customer) => {
    if (!search) return true;
    const blob = [
      customer.name,
      customer.primaryEmail,
      customer.primaryPhone,
      customer.primaryAddress,
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(search);
  });

  refs.drawerLeadCustomerSelect.innerHTML = [
    `<option value="">Create / auto-match customer</option>`,
  ]
    .concat(
      customers.map(
        (customer) => `
            <option value="${escapeHtml(customer.id)}">
                ${escapeHtml(`${customer.name || "Unnamed customer"} · ${customer.primaryPhone || customer.primaryEmail || customer.primaryAddress || "No contact info"}`)}
            </option>
        `,
      ),
    )
    .join("");

  refs.drawerLeadCustomerSelect.value = selectedCustomerId || "";
}

function applyDrawerLeadCustomerSelection(customerId) {
  const currentDraft = collectDrawerLeadDraftFromInputs();
  const customer = customerId
    ? state.customers.find((item) => item.id === customerId)
    : null;

  state.drawer.leadDraft = {
    ...currentDraft,
    customerId: customer?.id || null,
    customerName: customer?.name || "",
    customerSearch: refs.drawerLeadCustomerSearch.value || customer?.name || "",
    clientName: customer
      ? customer.name || currentDraft.clientName
      : currentDraft.clientName,
    clientEmail: customer
      ? customer.primaryEmail || currentDraft.clientEmail
      : currentDraft.clientEmail,
    clientPhone: customer
      ? customer.primaryPhone || currentDraft.clientPhone
      : currentDraft.clientPhone,
    projectAddress: customer
      ? currentDraft.projectAddress || customer.primaryAddress || ""
      : currentDraft.projectAddress,
  };

  renderDrawerLead();
}

function collectDrawerJobDraftFromInputs() {
  return {
    ...(state.drawer.jobDraft || defaultJobDrawerDraft()),
    customerSearch:
      refs.drawerJobCustomerSearch?.value ||
      state.drawer.jobDraft?.customerSearch ||
      "",
    customerId:
      refs.drawerJobCustomerSelect?.value ||
      state.drawer.jobDraft?.customerId ||
      null,
    clientName:
      refs.drawerJobClientName?.value ?? state.drawer.jobDraft?.clientName ?? "",
    projectType:
      refs.drawerJobProjectType?.value ??
      state.drawer.jobDraft?.projectType ??
      "",
    clientPhone:
      refs.drawerJobClientPhone?.value ??
      state.drawer.jobDraft?.clientPhone ??
      "",
    clientEmail:
      refs.drawerJobClientEmail?.value ??
      state.drawer.jobDraft?.clientEmail ??
      "",
    clientAddress:
      refs.drawerJobClientAddress?.value ??
      state.drawer.jobDraft?.clientAddress ??
      "",
    baseContractValue:
      refs.drawerJobBaseContract?.value ??
      state.drawer.jobDraft?.baseContractValue ??
      "",
    status:
      refs.drawerJobStatus?.value || state.drawer.jobDraft?.status || "planning",
    assignedLeadOwnerUid:
      refs.drawerJobOwner?.value ||
      state.drawer.jobDraft?.assignedLeadOwnerUid ||
      "",
    assignedWorkerUids: selectedDrawerJobWorkerUids(),
    planningNotes:
      refs.drawerJobPlanningNotes?.value ??
      state.drawer.jobDraft?.planningNotes ??
      "",
  };
}

function renderDrawerJobCustomerOptions() {
  const draft = state.drawer.jobDraft || defaultJobDrawerDraft();
  const search = safeString(
    refs.drawerJobCustomerSearch?.value || draft.customerSearch,
  ).toLowerCase();
  const selectedCustomerId = draft.customerId || "";
  const customers = sortByUpdatedDesc(state.customers).filter((customer) => {
    if (!search) return true;
    const blob = [
      customer.name,
      customer.primaryEmail,
      customer.primaryPhone,
      customer.primaryAddress,
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(search);
  });

  refs.drawerJobCustomerSelect.innerHTML = [
    `<option value="">Auto-create / auto-match customer</option>`,
  ]
    .concat(
      customers.map(
        (customer) => `
            <option value="${escapeHtml(customer.id)}">
                ${escapeHtml(`${customer.name || "Unnamed customer"} · ${customer.primaryPhone || customer.primaryEmail || customer.primaryAddress || "No contact info"}`)}
            </option>
        `,
      ),
    )
    .join("");

  refs.drawerJobCustomerSelect.value = selectedCustomerId || "";
}

function renderDrawerJobStaffGrid(selectedUids = [], ownerUid = "") {
  const owner = safeString(ownerUid);
  const selected = new Set([owner, ...selectedUids].filter(Boolean));
  const staff = activeStaffOptions().filter((member) => safeString(member.uid));

  refs.drawerJobStaffGrid.innerHTML = staff.length
    ? staff
        .map(
          (member) => `
            <label class="drawer-staff-chip">
                <input type="checkbox" data-drawer-job-worker="${escapeHtml(member.uid)}" ${selected.has(member.uid) ? "checked" : ""}>
                <span>${escapeHtml(member.displayName || member.email || "Assigned staff")}</span>
            </label>
        `,
        )
        .join("")
    : `<div class="empty-note">No active staff records are ready for assignment yet.</div>`;
}

function selectedDrawerJobWorkerUids() {
  return Array.from(
    refs.drawerJobStaffGrid?.querySelectorAll(
      "[data-drawer-job-worker]:checked",
    ) || [],
  )
    .map((checkbox) => checkbox.dataset.drawerJobWorker || "")
    .filter(Boolean);
}

function applyDrawerJobCustomerSelection(customerId) {
  const currentDraft = collectDrawerJobDraftFromInputs();
  const customer = customerId
    ? state.customers.find((item) => item.id === customerId)
    : null;

  state.drawer.jobDraft = {
    ...currentDraft,
    customerId: customer?.id || null,
    customerName: customer?.name || "",
    customerSearch: refs.drawerJobCustomerSearch.value || customer?.name || "",
    clientName: customer
      ? customer.name || currentDraft.clientName
      : currentDraft.clientName,
    clientEmail: customer
      ? customer.primaryEmail || currentDraft.clientEmail
      : currentDraft.clientEmail,
    clientPhone: customer
      ? customer.primaryPhone || currentDraft.clientPhone
      : currentDraft.clientPhone,
    clientAddress: customer
      ? currentDraft.clientAddress || customer.primaryAddress || ""
      : currentDraft.clientAddress,
  };

  renderDrawerJob();
}

function renderDrawerJobContext() {
  const draft = state.drawer.jobDraft || defaultJobDrawerDraft();
  const owner =
    activeStaffOptions().find(
      (member) => member.uid === draft.assignedLeadOwnerUid,
    ) || null;
  const linkedCustomer = draft.customerId
    ? state.customers.find((item) => item.id === draft.customerId)
    : null;
  const baseContractValue = toNumber(draft.baseContractValue);

  refs.drawerJobContext.innerHTML = `
        <div><strong>Job status:</strong> ${escapeHtml(JOB_STATUS_META[draft.status] || "Planning")} · <strong>Starting revenue:</strong> ${escapeHtml(formatCurrency(baseContractValue))}</div>
        <div><strong>Lead owner:</strong> ${escapeHtml(owner?.displayName || owner?.email || "Unassigned")}${linkedCustomer ? ` · <strong>Customer:</strong> ${escapeHtml(linkedCustomer.name || "Linked customer")}` : ""}</div>
        <div>${escapeHtml(linkedCustomer ? "This job will stay linked to the selected customer account." : "If no customer is selected, the CRM will auto-match by phone or email or create a new customer account for this job.")}</div>
    `;
}

function renderDrawerJob() {
  const draft = state.drawer.jobDraft || defaultJobDrawerDraft();

  hideDrawerPanels();
  refs.drawerJobForm.hidden = false;
  refs.drawerKicker.textContent = "Quick add";
  refs.drawerTitle.textContent = "New job";
  refs.drawerSubtitle.textContent =
    "Create a standard job directly from the jobs workspace, then keep billing, expenses, documents, and status updates under one clean record.";

  refs.drawerJobCustomerSearch.value = draft.customerSearch || "";
  renderDrawerJobCustomerOptions();
  refs.drawerJobClientName.value = draft.clientName || "";
  refs.drawerJobProjectType.value = draft.projectType || "";
  refs.drawerJobClientPhone.value = draft.clientPhone || "";
  refs.drawerJobClientEmail.value = draft.clientEmail || "";
  refs.drawerJobClientAddress.value = draft.clientAddress || "";
  refs.drawerJobBaseContract.value =
    draft.baseContractValue === "" ? "" : toNumber(draft.baseContractValue || 0);
  refs.drawerJobStatus.value = draft.status || "planning";
  renderTaskAssigneeOptions(
    refs.drawerJobOwner,
    draft.assignedLeadOwnerUid ||
      preferredLeadAssignee()?.uid ||
      state.profile?.uid ||
      "",
  );
  renderDrawerJobStaffGrid(
    draft.assignedWorkerUids || [],
    refs.drawerJobOwner.value || draft.assignedLeadOwnerUid || "",
  );
  refs.drawerJobPlanningNotes.value = draft.planningNotes || "";
  renderDrawerJobContext();
}

function collectDrawerServiceOrderDraftFromInputs() {
  return {
    ...(state.drawer.serviceOrderDraft || defaultServiceOrderDrawerDraft()),
    templateId:
      refs.drawerServiceTemplate?.value ||
      state.drawer.serviceOrderDraft?.templateId ||
      "",
    paymentRequirement:
      refs.drawerServicePaymentRule?.value ||
      state.drawer.serviceOrderDraft?.paymentRequirement ||
      "upfront_required",
    customerSearch:
      refs.drawerServiceCustomerSearch?.value ||
      state.drawer.serviceOrderDraft?.customerSearch ||
      "",
    customerId:
      refs.drawerServiceCustomerSelect?.value ||
      state.drawer.serviceOrderDraft?.customerId ||
      null,
    clientName:
      refs.drawerServiceClientName?.value ??
      state.drawer.serviceOrderDraft?.clientName ??
      "",
    clientPhone:
      refs.drawerServiceClientPhone?.value ??
      state.drawer.serviceOrderDraft?.clientPhone ??
      "",
    clientEmail:
      refs.drawerServiceClientEmail?.value ??
      state.drawer.serviceOrderDraft?.clientEmail ??
      "",
    clientAddress:
      refs.drawerServiceClientAddress?.value ??
      state.drawer.serviceOrderDraft?.clientAddress ??
      "",
    priceOverride:
      refs.drawerServicePrice?.value ??
      state.drawer.serviceOrderDraft?.priceOverride ??
      "",
    assignedLeadOwnerUid:
      refs.drawerServiceOwner?.value ||
      state.drawer.serviceOrderDraft?.assignedLeadOwnerUid ||
      "",
    assignedWorkerUids: selectedDrawerServiceWorkerUids(),
  };
}

function renderDrawerServiceTemplateOptions(selectedTemplateId = "") {
  const templates = isAdmin()
    ? sortByUpdatedDesc(serviceTemplateCatalog())
    : activeServiceTemplates();
  refs.drawerServiceTemplate.innerHTML = templates.length
    ? templates
        .map(
          (template) => `
            <option value="${escapeHtml(template.id)}" ${selectedTemplateId === template.id ? "selected" : ""}>
                ${escapeHtml(`${template.clientTitle || template.internalName || "Service template"} · ${formatCurrency(template.defaultPrice || serviceTemplateSubtotal(template))}`)}
            </option>
        `,
        )
        .join("")
    : `<option value="">No service templates yet</option>`;
}

function renderDrawerServiceCustomerOptions() {
  const draft =
    state.drawer.serviceOrderDraft || defaultServiceOrderDrawerDraft();
  const search = safeString(
    refs.drawerServiceCustomerSearch?.value || draft.customerSearch,
  ).toLowerCase();
  const selectedCustomerId = draft.customerId || "";
  const customers = sortByUpdatedDesc(visibleCustomers()).filter((customer) => {
    if (!search) return true;
    const blob = [
      customer.name,
      customer.primaryEmail,
      customer.primaryPhone,
      customer.primaryAddress,
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(search);
  });

  refs.drawerServiceCustomerSelect.innerHTML = [
    `<option value="">Create / auto-match customer</option>`,
  ]
    .concat(
      customers.map(
        (customer) => `
            <option value="${escapeHtml(customer.id)}">
                ${escapeHtml(`${customer.name || "Unnamed customer"} · ${customer.primaryPhone || customer.primaryEmail || customer.primaryAddress || "No contact info"}`)}
            </option>
        `,
      ),
    )
    .join("");

  refs.drawerServiceCustomerSelect.value = selectedCustomerId || "";
}

function renderDrawerServiceStaffGrid(selectedUids = [], ownerUid = "") {
  const owner = safeString(ownerUid);
  const selected = new Set([owner, ...selectedUids].filter(Boolean));
  const staff = activeStaffOptions().filter((member) => safeString(member.uid));

  refs.drawerServiceStaffGrid.innerHTML = staff.length
    ? staff
        .map(
          (member) => `
            <label class="drawer-staff-chip">
                <input type="checkbox" data-drawer-service-worker="${escapeHtml(member.uid)}" ${selected.has(member.uid) ? "checked" : ""}>
                <span>${escapeHtml(member.displayName || member.email || "Assigned staff")}</span>
            </label>
        `,
        )
        .join("")
    : `<div class="empty-note">No active staff records are ready for assignment yet.</div>`;
}

function selectedDrawerServiceWorkerUids() {
  return Array.from(
    refs.drawerServiceStaffGrid?.querySelectorAll(
      "[data-drawer-service-worker]:checked",
    ) || [],
  )
    .map((checkbox) => checkbox.dataset.drawerServiceWorker || "")
    .filter(Boolean);
}

function applyDrawerServiceCustomerSelection(customerId) {
  const currentDraft = collectDrawerServiceOrderDraftFromInputs();
  const customer = customerId
    ? state.customers.find((item) => item.id === customerId)
    : null;

  state.drawer.serviceOrderDraft = {
    ...currentDraft,
    customerId: customer?.id || null,
    customerName: customer?.name || "",
    customerSearch:
      refs.drawerServiceCustomerSearch.value || customer?.name || "",
    clientName: customer
      ? customer.name || currentDraft.clientName
      : currentDraft.clientName,
    clientEmail: customer
      ? customer.primaryEmail || currentDraft.clientEmail
      : currentDraft.clientEmail,
    clientPhone: customer
      ? customer.primaryPhone || currentDraft.clientPhone
      : currentDraft.clientPhone,
    clientAddress: customer
      ? customer.primaryAddress || currentDraft.clientAddress
      : currentDraft.clientAddress,
  };

  renderDrawerServiceOrder();
}

function renderDrawerServiceContext() {
  const draft =
    state.drawer.serviceOrderDraft || defaultServiceOrderDrawerDraft();
  const template =
    serviceTemplateCatalog().find((item) => item.id === draft.templateId) ||
    DEFAULT_SERVICE_TEMPLATES.find((item) => item.id === draft.templateId) ||
    defaultServiceTemplateDraft();
  const lineItems = serviceTemplateLineItemsForAmount(
    template,
    draft.priceOverride,
  );
  const subtotal = lineItems.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0,
  );
  const owner =
    activeStaffOptions().find(
      (member) => member.uid === draft.assignedLeadOwnerUid,
    ) || null;
  const linkedCustomer = draft.customerId
    ? state.customers.find((item) => item.id === draft.customerId)
    : null;

  refs.drawerServiceContext.innerHTML = `
        <div><strong>Displayed service:</strong> ${escapeHtml(template.clientTitle || template.internalName || "Service order")}</div>
        <div><strong>Invoice total:</strong> ${escapeHtml(formatCurrency(subtotal))} · <strong>Payment rule:</strong> ${escapeHtml(SERVICE_PAYMENT_RULE_META[draft.paymentRequirement] || "Upfront required")}</div>
        <div><strong>Order owner:</strong> ${escapeHtml(owner?.displayName || owner?.email || "Unassigned")} ${linkedCustomer ? `· <strong>Customer:</strong> ${escapeHtml(linkedCustomer.name || "Linked customer")}` : ""}</div>
        <div>${escapeHtml(template.defaultSummary || "Select a service template to preview the order summary.")}</div>
    `;
}

function renderDrawerServiceOrder() {
  const draft =
    state.drawer.serviceOrderDraft || defaultServiceOrderDrawerDraft();
  const template =
    serviceTemplateCatalog().find((item) => item.id === draft.templateId) ||
    DEFAULT_SERVICE_TEMPLATES.find((item) => item.id === draft.templateId) ||
    defaultServiceTemplateDraft();

  hideDrawerPanels();
  refs.drawerServiceOrderForm.hidden = false;
  refs.drawerKicker.textContent = "Productized service";
  refs.drawerTitle.textContent = "New service order";
  refs.drawerSubtitle.textContent =
    "Spin up a repeatable phone-service job with billing already framed, then generate a Stripe payment link from the invoice tab.";

  renderDrawerServiceTemplateOptions(draft.templateId || template.id || "");
  refs.drawerServicePaymentRule.value =
    draft.paymentRequirement ||
    template.defaultPaymentRequirement ||
    "upfront_required";
  refs.drawerServiceCustomerSearch.value = draft.customerSearch || "";
  renderDrawerServiceCustomerOptions();
  refs.drawerServiceClientName.value = draft.clientName || "";
  refs.drawerServiceClientPhone.value = draft.clientPhone || "";
  refs.drawerServiceClientEmail.value = draft.clientEmail || "";
  refs.drawerServiceClientAddress.value = draft.clientAddress || "";
  refs.drawerServicePrice.value =
    draft.priceOverride === ""
      ? ""
      : toNumber(draft.priceOverride || template.defaultPrice || 0);
  renderTaskAssigneeOptions(
    refs.drawerServiceOwner,
    draft.assignedLeadOwnerUid ||
      preferredLeadAssignee()?.uid ||
      state.profile?.uid ||
      "",
  );
  renderDrawerServiceStaffGrid(
    draft.assignedWorkerUids || [],
    refs.drawerServiceOwner.value || draft.assignedLeadOwnerUid || "",
  );
  renderDrawerServiceContext();
}

function renderDrawerExpenseProjectOptions() {
  const expenseDraft = state.drawer.expenseDraft || defaultExpenseDrawerDraft();
  const search = safeString(
    refs.drawerExpenseProjectSearch.value || expenseDraft.projectSearch,
  ).toLowerCase();
  const selectedProjectId =
    refs.drawerExpenseProject.value || expenseDraft.projectId || "";
  const options = sortByUpdatedDesc(
    visibleProjects().filter((project) => project.status !== "completed"),
  ).filter((project) => {
    if (!search) return true;
    const blob = [
      project.clientName,
      project.customerName,
      project.projectAddress,
      project.projectType,
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(search);
  });

  refs.drawerExpenseProject.innerHTML = options.length
    ? [`<option value="">Select an active property</option>`]
        .concat(
          options.map(
            (project) => `
            <option value="${escapeHtml(project.id)}" ${selectedProjectId === project.id ? "selected" : ""}>
                ${escapeHtml(`${project.clientName || "Unnamed job"} · ${project.projectAddress || "Address pending"}`)}
            </option>
        `,
          ),
        )
        .join("")
    : `<option value="">No matching active jobs</option>`;

  refs.drawerExpenseProject.value = options.some(
    (project) => project.id === selectedProjectId,
  )
    ? selectedProjectId
    : "";
}

function selectedExpenseVendorFromSelect(select) {
  if (!select) {
    return null;
  }

  const vendorId = select.value || "";
  return vendorId
    ? state.vendors.find((vendor) => vendor.id === vendorId) || null
    : null;
}

function renderVendorSelectOptions(select, selectedVendorId = "") {
  if (!select) {
    return;
  }

  select.innerHTML = [`<option value="">No vendor record</option>`]
    .concat(
      sortByUpdatedDesc(state.vendors).map(
        (vendor) => `
            <option value="${escapeHtml(vendor.id)}">${escapeHtml(
              `${vendor.name || "Unnamed vendor"} · ${
                (vendor.tradeIds || [])
                  .slice(0, 2)
                  .map((tradeId) => vendorTradeLabel(tradeId))
                  .join(", ") ||
                vendor.tradeOtherText ||
                "Trade not set"
              }`,
            )}</option>
        `,
      ),
    )
    .join("");
  select.value = selectedVendorId || "";
}

function renderDrawerExpenseContext() {
  const projectId =
    refs.drawerExpenseProject.value ||
    state.drawer.expenseDraft?.projectId ||
    "";
  const project = projectId
    ? state.projects.find((item) => item.id === projectId)
    : null;
  refs.drawerExpenseContext.innerHTML = project
    ? `
            <div><strong>Client:</strong> ${escapeHtml(project.clientName || project.customerName || "Unnamed job")}</div>
            <div>${escapeHtml(project.projectAddress || "Address pending")} · ${escapeHtml(project.projectType || "Project")}</div>
        `
    : "Pick the property first so the expense lands in the correct job record.";
}

function renderDrawerExpense() {
  const expenseDraft = state.drawer.expenseDraft || defaultExpenseDrawerDraft();
  hideDrawerPanels();
  refs.drawerExpenseForm.hidden = false;
  refs.drawerKicker.textContent = "Quick add";
  refs.drawerTitle.textContent = "Add expense";
  refs.drawerSubtitle.textContent =
    "Choose the property, record the cost, and drop it straight into the right job financials.";
  refs.drawerExpenseProjectSearch.value = expenseDraft.projectSearch || "";
  refs.drawerExpenseAmount.value = expenseDraft.amount || "";
  refs.drawerExpenseDate.value =
    expenseDraft.relatedDate || todayDateInputValue();
  refs.drawerExpenseCategory.value = expenseDraft.category || "";
  refs.drawerExpenseVendor.value = expenseDraft.vendor || "";
  refs.drawerExpenseNote.value = expenseDraft.note || "";
  renderDrawerExpenseProjectOptions();
  renderVendorSelectOptions(
    refs.drawerExpenseVendorSelect,
    expenseDraft.vendorId || "",
  );
  renderDrawerExpenseContext();
}

function communicationRecordOptions(type, search = "") {
  const normalisedSearch = safeString(search).toLowerCase();
  const source = type === "project" ? visibleProjects() : visibleLeads();
  return sortByUpdatedDesc(source).filter((item) => {
    if (!normalisedSearch) return true;
    const blob =
      type === "project"
        ? [
            item.clientName,
            item.customerName,
            item.projectAddress,
            item.projectType,
            item.clientPhone,
            item.clientEmail,
          ]
        : [
            item.clientName,
            item.customerName,
            item.projectAddress,
            item.projectType,
            item.clientPhone,
            item.clientEmail,
            item.notes,
          ];
    return blob.join(" ").toLowerCase().includes(normalisedSearch);
  });
}

function renderDrawerCommunicationRecordOptions() {
  const draft =
    state.drawer.communicationDraft || defaultCommunicationDrawerDraft();
  const type = refs.drawerCommunicationLinkedType.value || draft.linkedType || "lead";
  const search =
    refs.drawerCommunicationRecordSearch.value || draft.recordSearch || "";
  const selectedId =
    refs.drawerCommunicationLinkedRecord.value || draft.linkedId || "";
  const options = communicationRecordOptions(type, search);

  refs.drawerCommunicationLinkedRecord.innerHTML = options.length
    ? [`<option value="">Select ${type === "project" ? "a job" : "a lead"}</option>`]
        .concat(
          options.map((item) => {
            const title =
              item.clientName || item.customerName || item.name || "Unnamed";
            const meta = item.projectAddress || item.projectType || "No address";
            return `
              <option value="${escapeHtml(item.id)}" ${selectedId === item.id ? "selected" : ""}>
                ${escapeHtml(`${title} · ${meta}`)}
              </option>
            `;
          }),
        )
        .join("")
    : `<option value="">No matching records</option>`;

  refs.drawerCommunicationLinkedRecord.value = options.some(
    (item) => item.id === selectedId,
  )
    ? selectedId
    : "";
}

function selectedCommunicationRecord() {
  const type = refs.drawerCommunicationLinkedType.value || "lead";
  const id = refs.drawerCommunicationLinkedRecord.value || "";
  if (!id) {
    return { type, record: null };
  }
  return {
    type,
    record:
      type === "project"
        ? state.projects.find((item) => item.id === id) || null
        : state.leads.find((item) => item.id === id) || null,
  };
}

function renderDrawerCommunicationContext() {
  const { type, record } = selectedCommunicationRecord();
  if (!record) {
    refs.drawerCommunicationContext.innerHTML =
      "Choose the lead or job this communication belongs to.";
    return;
  }

  refs.drawerCommunicationContext.innerHTML = `
    <div><strong>${escapeHtml(type === "project" ? "Job" : "Lead")}:</strong> ${escapeHtml(record.clientName || record.customerName || "Unnamed record")}</div>
    <div>${escapeHtml(record.projectAddress || "Address pending")} · ${escapeHtml(record.projectType || (type === "project" ? "Job" : "Lead"))}</div>
  `;
}

function renderDrawerCommunication() {
  const draft =
    state.drawer.communicationDraft || defaultCommunicationDrawerDraft();
  hideDrawerPanels();
  refs.drawerCommunicationForm.hidden = false;
  refs.drawerKicker.textContent = "Activity log";
  refs.drawerTitle.textContent = "Log communication";
  refs.drawerSubtitle.textContent =
    "Capture calls, texts, emails, visits, and client updates before the detail gets lost.";
  refs.drawerCommunicationRecordSearch.value = draft.recordSearch || "";
  refs.drawerCommunicationLinkedType.value = draft.linkedType || "lead";
  renderDrawerCommunicationRecordOptions();
  refs.drawerCommunicationLinkedRecord.value = draft.linkedId || "";
  refs.drawerCommunicationType.value = draft.communicationType || "call";
  refs.drawerCommunicationDirection.value = draft.direction || "outbound";
  refs.drawerCommunicationHappenedAt.value =
    draft.happenedAt || formatDateInputValue(new Date());
  refs.drawerCommunicationContactName.value = draft.contactName || "";
  refs.drawerCommunicationContactMethod.value = draft.contactMethod || "";
  refs.drawerCommunicationBody.value = draft.body || "";
  refs.drawerCommunicationOutcome.value = draft.outcome || "";
  refs.drawerCommunicationFollowUpRequired.checked = Boolean(
    draft.followUpRequired,
  );
  refs.drawerCommunicationFollowUpAt.value = draft.followUpAt || "";
  refs.drawerCommunicationClientVisible.checked = Boolean(draft.clientVisible);
  renderDrawerCommunicationContext();
}

function renderDrawerLead() {
  const leadDraft = state.drawer.leadDraft;
  hideDrawerPanels();
  refs.drawerLeadForm.hidden = false;
  refs.drawerKicker.textContent = "Quick add";
  refs.drawerTitle.textContent = "New lead";
  refs.drawerSubtitle.textContent =
    "Capture the lead fast, then open the full lead workspace for estimate, tasks, planning, notes, and the won-job flow.";
  refs.drawerLeadCustomerSearch.value = leadDraft?.customerSearch || "";
  renderDrawerLeadCustomerOptions();
  refs.drawerLeadCustomerSearch.disabled = !isAdmin();
  refs.drawerLeadCustomerSelect.disabled = !isAdmin();
  refs.drawerLeadClientName.value = leadDraft?.clientName || "";
  refs.drawerLeadClientPhone.value = leadDraft?.clientPhone || "";
  refs.drawerLeadClientEmail.value = leadDraft?.clientEmail || "";
  refs.drawerLeadProjectAddress.value = leadDraft?.projectAddress || "";
  refs.drawerLeadProjectType.value = leadDraft?.projectType || "";
  refs.drawerLeadNotes.value = leadDraft?.notes || "";

  const assignee = isAdmin()
    ? leadDraft?.assignedToUid || preferredLeadAssignee()?.uid || ""
    : state.profile?.uid || leadDraft?.assignedToUid || "";
  renderTaskAssigneeOptions(refs.drawerLeadAssignee, assignee);
  refs.drawerLeadAssignee.disabled = !isAdmin();

  const linkedCustomer = leadDraft?.customerId
    ? state.customers.find((item) => item.id === leadDraft.customerId)
    : null;
  refs.drawerLeadContext.innerHTML = linkedCustomer
    ? `<div><strong>Linked customer:</strong> ${escapeHtml(linkedCustomer.name || "Customer")}</div><div>${escapeHtml(linkedCustomer.primaryPhone || linkedCustomer.primaryEmail || linkedCustomer.primaryAddress || "Existing customer record will stay attached.")}</div>`
    : isAdmin()
      ? `Pick an existing customer above for repeat business, or leave it empty and the CRM will still auto-match by phone or email after save.`
      : `This lead will be assigned to you and the CRM will auto-match the customer by phone or email after save.`;
}

function renderDrawerCustomer() {
  const customerDraft = state.drawer.customerDraft;
  hideDrawerPanels();
  refs.drawerCustomerForm.hidden = false;
  refs.drawerKicker.textContent = "Quick add";
  refs.drawerTitle.textContent = "New customer";
  refs.drawerSubtitle.textContent =
    "Create a clean investor or owner record without leaving the CRM workspace behind.";
  refs.drawerCustomerName.value = customerDraft?.name || "";
  refs.drawerCustomerEmail.value = customerDraft?.primaryEmail || "";
  refs.drawerCustomerPhone.value = customerDraft?.primaryPhone || "";
  refs.drawerCustomerAddress.value = customerDraft?.primaryAddress || "";
  refs.drawerCustomerNotes.value = customerDraft?.notes || "";
}

function renderDrawerVendor() {
  const vendorDraft = state.drawer.vendorDraft;
  hideDrawerPanels();
  refs.drawerVendorForm.hidden = false;
  refs.drawerKicker.textContent = "Quick add";
  refs.drawerTitle.textContent = "New vendor";
  refs.drawerSubtitle.textContent =
    "Create a clean vendor record for trade categorization, payables, and document tracking without leaving the workspace.";
  refs.drawerVendorName.value = vendorDraft?.name || "";
  refs.drawerVendorStatus.value = vendorDraft?.status || "active";
  refs.drawerVendorTradeOther.value = vendorDraft?.tradeOtherText || "";
  refs.drawerVendorContactName.value = vendorDraft?.primaryContactName || "";
  refs.drawerVendorPhone.value = vendorDraft?.primaryPhone || "";
  refs.drawerVendorEmail.value = vendorDraft?.primaryEmail || "";
  refs.drawerVendorPaymentMethod.value =
    vendorDraft?.preferredPaymentMethod || "";
  refs.drawerVendorDefaultTerms.value = vendorDraft?.defaultTerms || "";
  refs.drawerVendorNotes.value = vendorDraft?.notes || "";
  renderTradeCheckboxGrid(
    refs.drawerVendorTradeGrid,
    vendorDraft?.tradeIds || [],
  );
}

function renderDrawerTaskRecordOptions() {
  const taskDraft = state.drawer.taskDraft;
  const linkedType =
    refs.drawerTaskLinkedType.value || drawerTaskLinkedType(taskDraft);
  const selectedId =
    linkedType === "lead"
      ? taskDraft?.leadId
      : linkedType === "customer"
        ? taskDraft?.customerId
        : linkedType === "project"
          ? taskDraft?.projectId
          : "";

  let options = [];

  if (linkedType === "lead") {
    options = sortByUpdatedDesc(visibleLeads()).map((lead) => ({
      value: lead.id,
      label: `${lead.clientName || "Unnamed lead"} · ${lead.projectAddress || "Address pending"}`,
    }));
  } else if (linkedType === "customer") {
    options = sortByUpdatedDesc(visibleCustomers()).map((customer) => ({
      value: customer.id,
      label: `${customer.name || "Unnamed customer"} · ${customer.primaryAddress || customer.primaryEmail || customer.primaryPhone || "No contact info"}`,
    }));
  } else if (linkedType === "project") {
    options = sortByUpdatedDesc(visibleProjects()).map((project) => ({
      value: project.id,
      label: `${project.clientName || "Unnamed job"} · ${project.projectAddress || "Address pending"}`,
    }));
  }

  refs.drawerTaskLinkedRecord.disabled = !linkedType;
  refs.drawerTaskLinkedRecord.innerHTML = !linkedType
    ? `<option value="">No linked record</option>`
    : options.length
      ? options
          .map(
            (option) => `
                <option value="${escapeHtml(option.value)}" ${selectedId === option.value ? "selected" : ""}>
                    ${escapeHtml(option.label)}
                </option>
            `,
          )
          .join("")
      : `<option value="">No visible records</option>`;
}

function renderDrawerTaskContext() {
  const taskDraft = state.drawer.taskDraft;
  const linkedType =
    refs.drawerTaskLinkedType.value || drawerTaskLinkedType(taskDraft);
  const linkedId =
    refs.drawerTaskLinkedRecord.value ||
    (linkedType === "lead"
      ? taskDraft?.leadId
      : linkedType === "customer"
        ? taskDraft?.customerId
        : linkedType === "project"
          ? taskDraft?.projectId
          : "");

  refs.drawerTaskContext.innerHTML = linkedId
    ? `<div><strong>Linked record:</strong> ${escapeHtml(drawerLinkedEntityLabel(linkedType, linkedId))}</div><div>The task will stay visible from this record and inside the main task queue.</div>`
    : `Create a general task or connect it to a lead, customer, or job.`;
}

function renderDrawerTask() {
  const taskDraft = state.drawer.taskDraft;
  hideDrawerPanels();
  refs.drawerTaskForm.hidden = false;
  refs.drawerKicker.textContent = "Quick add";
  refs.drawerTitle.textContent = "New task";
  refs.drawerSubtitle.textContent =
    "Assign the next action without leaving the lead, customer, job, or dashboard context.";
  refs.drawerTaskTitle.value = taskDraft?.title || "";
  setTaskScheduleValue("drawer", taskDraft?.dueAt);
  refs.drawerTaskPriority.value = taskDraft?.priority || "high";
  renderTaskAssigneeOptions(
    refs.drawerTaskAssignee,
    taskDraft?.assignedToUid || state.profile?.uid || "",
  );
  refs.drawerTaskLinkedType.value = drawerTaskLinkedType(taskDraft);
  renderDrawerTaskRecordOptions();
  renderDrawerTaskContext();
}

function renderActiveDrawer() {
  const drawerType = state.drawer.type;

  if (!drawerType) {
    closeDrawer();
    return;
  }

  setDrawerVisibility(true);

  if (drawerType === "lead") {
    renderDrawerLead();
    return;
  }

  if (drawerType === "mobile-create") {
    renderDrawerCreateMenu();
    return;
  }

  if (drawerType === "mobile-more") {
    renderDrawerMenu();
    return;
  }

  if (drawerType === "expense") {
    renderDrawerExpense();
    return;
  }

  if (drawerType === "communication") {
    renderDrawerCommunication();
    return;
  }

  if (drawerType === "job") {
    renderDrawerJob();
    return;
  }

  if (drawerType === "service-order") {
    renderDrawerServiceOrder();
    return;
  }

  if (drawerType === "customer") {
    renderDrawerCustomer();
    return;
  }

  if (drawerType === "vendor") {
    renderDrawerVendor();
    return;
  }

  renderDrawerTask();
}

function switchView(viewId, { historyMode = "push" } = {}) {
  if (viewId !== "leads-view") {
    state.leadWorkspaceOpen = false;
  } else if (isMobileViewport() && !state.leadWorkspaceOpen) {
    state.leadLayout = "list";
  }

  state.activeView = viewId;
  const meta = VIEW_META[viewId];

  refs.views.forEach((view) => {
    const isActive = view.id === viewId;
    view.hidden = !isActive;
    view.classList.toggle("is-active", isActive);
  });

  refs.navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewId);
  });

  if (meta) {
    refs.workspaceTitle.textContent = meta.title;
    refs.workspaceSubtitle.textContent = meta.subtitle;
  }

  renderWorkspaceTools();
  renderWorkspaceCommandBar();
  syncMobileChrome();
  syncLeadRouteState({ historyMode });
}

function renderStaffFocusOptions() {
  if (!refs.staffFocusShell || !refs.staffFocusSelect) {
    return;
  }

  const supportedViews = [
    "today-view",
    "tasks-view",
    "leads-view",
    "customers-view",
    "jobs-view",
    "calendar-view",
    "staff-view",
  ];
  const shouldShow = isAdmin() && supportedViews.includes(state.activeView);
  refs.staffFocusShell.hidden = !shouldShow;

  if (!shouldShow) {
    return;
  }

  const members = activeStaffOptions().filter((member) =>
    safeString(member.uid),
  );
  if (
    state.staffFocusUid &&
    !members.some((member) => member.uid === state.staffFocusUid)
  ) {
    state.staffFocusUid = "";
  }
  refs.staffFocusSelect.innerHTML = [`<option value="">All staff</option>`]
    .concat(
      members.map(
        (member) => `
            <option value="${escapeHtml(member.uid)}">${escapeHtml(member.displayName || member.email || "Staff member")}</option>
        `,
      ),
    )
    .join("");

  const focusUid = currentStaffFocusUid();
  refs.staffFocusSelect.value = members.some(
    (member) => member.uid === focusUid,
  )
    ? focusUid
    : "";
}

function renderWorkspaceTools() {
  const shouldShowTodayToggle =
    isAdmin() && state.activeView === "today-view" && !currentStaffFocusUid();
  refs.todayScopeToggle.hidden = !shouldShowTodayToggle;

  Array.from(
    refs.todayScopeToggle.querySelectorAll("[data-today-scope]"),
  ).forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.todayScope === state.todayScope,
    );
  });

  renderStaffFocusOptions();
}

function taskIsCompleted(task) {
  return task?.status === "completed";
}

function taskIsOverdue(task) {
  if (!task || taskIsCompleted(task) || !task.dueAt) return false;
  const due = toMillis(task.dueAt);
  return due > 0 && due < Date.now() && !isSameDay(task.dueAt, new Date());
}

function taskIsDueToday(task) {
  if (!task || taskIsCompleted(task) || !task.dueAt) return false;
  return isSameDay(task.dueAt, new Date());
}

function taskSortValue(task) {
  const dueMillis = toMillis(task.dueAt);
  return dueMillis || toMillis(task.updatedAt || task.createdAt);
}

function filteredTasks() {
  const search = state.taskSearch.trim().toLowerCase();
  let tasks = [...visibleTasks()];

  if (search) {
    tasks = tasks.filter((task) => {
      const blob = [
        task.title,
        task.description,
        task.assignedToName,
        task.assignedToEmail,
        linkedTaskLabel(task),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(search);
    });
  }

  if (state.taskBucket === "open") {
    tasks = tasks.filter((task) => !taskIsCompleted(task));
  } else if (state.taskBucket === "overdue") {
    tasks = tasks.filter((task) => taskIsOverdue(task));
  } else if (state.taskBucket === "today") {
    tasks = tasks.filter((task) => taskIsDueToday(task));
  } else if (state.taskBucket === "completed") {
    tasks = tasks.filter((task) => taskIsCompleted(task));
  }

  return tasks.sort(
    (left, right) => taskSortValue(left) - taskSortValue(right),
  );
}

function filteredLeads() {
  const search = state.leadSearch.trim().toLowerCase();
  let leads = [...visibleLeads()];

  if (search) {
    leads = leads.filter((lead) => {
      const blob = [
        lead.clientName,
        lead.projectAddress,
        lead.projectType,
        lead.clientPhone,
        lead.clientEmail,
        lead.customerName,
        lead.notes,
        lead.planningNotes,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(search);
    });
  }

  if (state.leadStage === "open") {
    leads = leads.filter((lead) =>
      ["new_lead", "follow_up", "estimate_sent"].includes(lead.status),
    );
  } else if (state.leadStage !== "all") {
    leads = leads.filter((lead) => lead.status === state.leadStage);
  }

  return sortByUpdatedDesc(leads);
}

function filteredCustomers() {
  const search = state.customerSearch.trim().toLowerCase();
  const customers = sortByUpdatedDesc(visibleCustomers());
  if (!search) return customers;

  return customers.filter((customer) => {
    const blob = [
      customer.name,
      customer.primaryEmail,
      customer.primaryPhone,
      customer.primaryAddress,
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(search);
  });
}

function filteredProjects() {
  const search = state.jobSearch.trim().toLowerCase();
  let projects = [...visibleProjects()];

  if (state.jobStatus === "active") {
    projects = projects.filter((project) => project.status !== "completed");
  } else if (state.jobStatus === "completed") {
    projects = projects.filter((project) => project.status === "completed");
  }

  if (search) {
    projects = projects.filter((project) => {
      const blob = [
        project.clientName,
        project.customerName,
        project.projectAddress,
        project.projectType,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(search);
    });
  }

  return sortByUpdatedDesc(projects);
}

function calendarEventStartMillis(event) {
  return toMillis(event?.startAt || event?.eventDate || event?.createdAt);
}

function calendarEventsForProject(projectId) {
  const targetProjectId = safeString(projectId);
  if (!targetProjectId) return [];
  return visibleCalendarEvents()
    .filter((event) => safeString(event.projectId) === targetProjectId)
    .sort(
      (left, right) =>
        calendarEventStartMillis(left) - calendarEventStartMillis(right),
    );
}

function filteredCalendarEvents() {
  const now = Date.now();
  const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
  let events = [...visibleCalendarEvents()];

  if (state.calendarProjectId) {
    events = events.filter(
      (event) => safeString(event.projectId) === safeString(state.calendarProjectId),
    );
  }

  if (state.calendarStaffUid) {
    events = events.filter((event) => {
      const assignedStaffUids = Array.isArray(event.assignedStaffUids)
        ? event.assignedStaffUids
        : [];
      return assignedStaffUids.includes(state.calendarStaffUid);
    });
  }

  if (state.calendarStatus !== "all") {
    events = events.filter(
      (event) => safeString(event.status || "scheduled") === state.calendarStatus,
    );
  }

  if (state.calendarScope === "today") {
    events = events.filter((event) => isSameDay(event.startAt, new Date()));
  } else if (state.calendarScope === "week") {
    events = events.filter((event) => {
      const startMillis = calendarEventStartMillis(event);
      return startMillis >= now && startMillis <= weekFromNow;
    });
  } else if (state.calendarScope === "past") {
    events = events.filter((event) => {
      const startMillis = calendarEventStartMillis(event);
      return startMillis > 0 && startMillis < now;
    });
  } else if (state.calendarScope !== "all") {
    events = events.filter((event) => {
      const startMillis = calendarEventStartMillis(event);
      return !startMillis || startMillis >= now;
    });
  }

  return events.sort(
    (left, right) =>
      calendarEventStartMillis(left) - calendarEventStartMillis(right),
  );
}

function clearSelectedProjectWorkspace({ historyMode = "replace" } = {}) {
  state.selectedProjectId = null;
  state.selectedProjectInvoiceId = null;
  state.projectScopeItems = [];
  state.projectInvoices = [];
  state.projectInvoiceDraft = null;
  state.projectExpenses = [];
  state.projectPayments = [];
  state.projectChangeOrders = [];
  state.projectDocuments = [];
  state.projectNotes = [];
  state.projectActivities = [];
  state.projectLeadActivities = [];
  state.projectLeadEstimate = null;
  state.projectLeadEstimateShares = [];
  subscribeProjectDetail();
  syncLeadRouteState({ historyMode });
}

function syncSelectedProjectWithJobFilters({ historyMode = "replace" } = {}) {
  if (!state.selectedProjectId) {
    return false;
  }

  const projects = filteredProjects();
  if (projects.some((project) => project.id === state.selectedProjectId)) {
    return false;
  }

  clearSelectedProjectWorkspace({ historyMode });
  renderAll();
  return true;
}

function openLeadsForToday() {
  const focusUid = currentStaffFocusUid();
  if (focusUid) {
    return sortByUpdatedDesc(
      visibleLeads().filter((lead) => lead.status === "new_lead"),
    );
  }

  const scopeLeads =
    isAdmin() && state.todayScope === "team"
      ? activeRecords(state.leads)
      : activeRecords(state.leads).filter(
          (lead) =>
            lead.assignedToUid === state.profile?.uid ||
            (isAdmin() && !lead.assignedToUid),
        );

  return sortByUpdatedDesc(
    scopeLeads.filter((lead) => lead.status === "new_lead"),
  );
}

function estimateReviewLeads() {
  const focusUid = currentStaffFocusUid();
  if (focusUid) {
    return sortByUpdatedDesc(
      visibleLeads().filter((lead) => {
        return (
          ["new_lead", "follow_up", "estimate_sent"].includes(lead.status) &&
          Boolean(lead.hasEstimate)
        );
      }),
    );
  }

  const scopeLeads =
    isAdmin() && state.todayScope === "team"
      ? activeRecords(state.leads)
      : activeRecords(state.leads).filter(
          (lead) => lead.assignedToUid === state.profile?.uid,
        );

  return sortByUpdatedDesc(
    scopeLeads.filter((lead) => {
      return (
        ["new_lead", "follow_up", "estimate_sent"].includes(lead.status) &&
        Boolean(lead.hasEstimate)
      );
    }),
  );
}

function taskScopeSet() {
  if (!state.profile) return [];
  const focusUid = currentStaffFocusUid();
  if (focusUid) return visibleTasks();
  if (isAdmin() && state.todayScope === "team") return state.tasks;
  return state.tasks.filter((task) => task.assignedToUid === state.profile.uid);
}

function projectScopeSet() {
  if (!state.profile) return [];
  const focusUid = currentStaffFocusUid();
  if (focusUid) return visibleProjects();
  const projects = activeRecords(state.projects);
  if (isAdmin() && state.todayScope === "team") return projects;
  return projects.filter((project) => {
    const allowed = Array.isArray(project.allowedStaffUids)
      ? project.allowedStaffUids
      : [];
    return allowed.includes(state.profile.uid);
  });
}

function leadCounts(leads = visibleLeads()) {
  return leads.reduce(
    (totals, lead) => {
      const status = lead.status || "new_lead";
      totals[status] = (totals[status] || 0) + 1;
      return totals;
    },
    {
      new_lead: 0,
      follow_up: 0,
      estimate_sent: 0,
      closed_won: 0,
      closed_lost: 0,
    },
  );
}

function linkedTaskLabel(task) {
  if (task.leadId) {
    const lead = state.leads.find((item) => item.id === task.leadId);
    return lead
      ? `Lead: ${lead.clientName || lead.projectAddress || lead.id}`
      : "Lead";
  }

  if (task.customerId) {
    const customer = state.customers.find(
      (item) => item.id === task.customerId,
    );
    return customer ? `Customer: ${customer.name || customer.id}` : "Customer";
  }

  if (task.projectId) {
    const project = state.projects.find((item) => item.id === task.projectId);
    return project
      ? `Job: ${project.clientName || project.projectAddress || project.id}`
      : "Job";
  }

  return "No linked record";
}

function taskLinkedType(task) {
  if (task.leadId) return "lead";
  if (task.customerId) return "customer";
  if (task.projectId) return "project";
  return "";
}

function renderCurrentUserCard() {
  if (!state.profile) {
    refs.currentUserCard.innerHTML = "";
    return;
  }

  refs.currentUserCard.innerHTML = `
        <strong>${escapeHtml(state.profile.displayName || state.profile.email)}</strong>
        <p>${escapeHtml(state.profile.role === "admin" ? "Admin access" : "Employee access")}</p>
        <p>${escapeHtml(state.profile.email)}</p>
    `;
}

function renderSidebarSummary() {
  const counts = leadCounts();
  const openTaskCount = visibleTasks().filter(
    (task) => !taskIsCompleted(task),
  ).length;
  const customerCount = visibleCustomers().length;
  const activeProjectCount = visibleProjects().filter(
    (project) => project.status !== "completed",
  ).length;
  const activeVendorCount = state.vendors.filter(
    (vendor) => safeString(vendor.status || "active") === "active",
  ).length;

  refs.sidebarSummary.innerHTML = `
        <div class="sidebar-stat"><span>Open leads</span><strong>${counts.new_lead + counts.follow_up + counts.estimate_sent}</strong></div>
        <div class="sidebar-stat"><span>Active jobs</span><strong>${activeProjectCount}</strong></div>
        <div class="sidebar-stat"><span>Customers</span><strong>${customerCount}</strong></div>
        <div class="sidebar-stat"><span>Active vendors</span><strong>${activeVendorCount}</strong></div>
        <div class="sidebar-stat"><span>Open tasks</span><strong>${openTaskCount}</strong></div>
    `;
}

function buildCommandAction(label, variant, dataAttrs = {}) {
  const attributes = Object.entries(dataAttrs)
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(" ");
  return `<button type="button" class="${variant}" ${attributes}>${escapeHtml(label)}</button>`;
}

function buildCommandChip(label, value) {
  return `
        <article class="command-chip">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
        </article>
    `;
}

function buildContextCard({
  label,
  title,
  meta = "",
  dataAttrs = {},
  muted = false,
}) {
  const hasAction = !muted && Object.keys(dataAttrs).length > 0;
  const tagName = hasAction ? "button" : "article";
  const actionAttributes = hasAction
    ? ` type="button" ${Object.entries(dataAttrs)
        .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
        .join(" ")}`
    : "";

  return `
        <${tagName} class="context-card${muted ? " is-muted" : ""}"${actionAttributes}>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(title)}</strong>
            <em>${escapeHtml(meta)}</em>
        </${tagName}>
    `;
}

function activeTasksForEntity(entityKey, entityId) {
  if (!entityId) return [];
  return relatedTasksForEntity(entityKey, entityId).filter(
    (task) => !taskIsCompleted(task),
  );
}

function queueFocus(element) {
  if (!element) return;

  window.requestAnimationFrame(() => {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof element.focus === "function") {
      element.focus({ preventScroll: true });
    }
  });
}

function renderWorkspaceCommandBar() {
  if (!refs.workspaceCommandBar || !state.profile) {
    return;
  }

  const isMobile = isMobileViewport();
  const visibleLeadSet = visibleLeads();
  const visibleTaskSet = visibleTasks();
  const visibleProjectSet = visibleProjects();
  const visibleCustomerSet = visibleCustomers();
  const openLeadCount = visibleLeadSet.filter((lead) =>
    ["new_lead", "follow_up", "estimate_sent"].includes(lead.status),
  ).length;
  const unassignedLeadCount = visibleLeadSet.filter(
    (lead) =>
      ["new_lead", "follow_up", "estimate_sent"].includes(lead.status) &&
      !lead.assignedToUid,
  ).length;
  const commandTaskSource =
    state.activeView === "today-view" ? taskScopeSet() : visibleTaskSet;
  const overdueCount = commandTaskSource.filter((task) =>
    taskIsOverdue(task),
  ).length;
  const dueTodayCount = commandTaskSource.filter((task) =>
    taskIsDueToday(task),
  ).length;
  const estimateReadyCount = visibleLeadSet.filter((lead) => {
    return (
      ["new_lead", "follow_up", "estimate_sent"].includes(lead.status) &&
      Boolean(lead.hasEstimate)
    );
  }).length;
  const activeJobCount = visibleProjectSet.filter(
    (project) => project.status !== "completed",
  ).length;
  const completedJobCount = visibleProjectSet.filter(
    (project) => project.status === "completed",
  ).length;
  const repeatClientCount = visibleCustomerSet.filter((customer) => {
    const rollup = customerRollup(customer);
    return rollup.leads.length + rollup.projects.length > 1;
  }).length;
  const totalPaymentsReceived = visibleProjectSet.reduce(
    (sum, project) => sum + toNumber(project.financials?.totalPayments),
    0,
  );
  const taskOpenCount = visibleTaskSet.filter(
    (task) => !taskIsCompleted(task),
  ).length;
  const taskCompletedCount = visibleTaskSet.filter((task) =>
    taskIsCompleted(task),
  ).length;
  const selectedLead =
    state.activeView === "leads-view" && state.leadWorkspaceOpen
      ? currentLead()
      : null;
  const selectedCustomer = currentCustomerDoc();
  const selectedProject = currentProject();
  const selectedVendor = currentVendorDoc();
  const selectedTask = currentTaskDoc();
  const activeVendorCount = state.vendors.filter(
    (vendor) => safeString(vendor.status || "active") === "active",
  ).length;
  const openVendorBillCount = state.vendorBills.filter((bill) => {
    const status = safeString(bill.status || "open");
    return status === "open" || status === "scheduled";
  }).length;
  const overdueVendorBillCount = state.vendorBills.filter((bill) =>
    vendorBillIsOverdue(bill),
  ).length;
  const focusMember = currentStaffFocusMember();

  const actionButtons = [];
  const summaryChips = [];

  if (isAdmin() && !isMobile) {
    actionButtons.push(
      buildCommandAction("New job", "secondary-button", {
        "data-command": "start-job-draft",
      }),
    );
    actionButtons.push(
      buildCommandAction("New service order", "primary-button", {
        "data-command": "start-service-order",
      }),
    );
    actionButtons.push(
      buildCommandAction("New lead", "primary-button", {
        "data-command": "start-lead-draft",
      }),
    );
    actionButtons.push(
      buildCommandAction("New customer", "ghost-button", {
        "data-command": "start-customer-draft",
      }),
    );
    actionButtons.push(
      buildCommandAction("New vendor", "ghost-button", {
        "data-command": "start-vendor-draft",
      }),
    );
  }

  if (focusMember && !isMobile) {
    actionButtons.push(
      buildCommandAction("Show full team", "ghost-button", {
        "data-command": "clear-staff-focus",
      }),
    );
  }

  if (!isMobile) {
    actionButtons.push(
      buildCommandAction(
        "New task",
        isAdmin() ? "secondary-button" : "primary-button",
        { "data-command": "start-task-draft" },
      ),
    );
  }

  if (focusMember) {
    summaryChips.push(
      buildCommandChip(
        "Staff focus",
        focusMember.displayName || focusMember.email || "Staff",
      ),
    );
  }

  if (state.activeView === "today-view") {
    if (!isMobile) {
      actionButtons.push(
        buildCommandAction("Open leads", "ghost-button", {
          "data-command": "open-view",
          "data-target-view": "leads-view",
        }),
      );
      actionButtons.push(
        buildCommandAction("Open jobs", "ghost-button", {
          "data-command": "open-view",
          "data-target-view": "jobs-view",
        }),
      );
    }
    summaryChips.push(buildCommandChip("Overdue tasks", overdueCount));
    summaryChips.push(
      buildCommandChip("Fresh leads", openLeadsForToday().length),
    );
    summaryChips.push(
      buildCommandChip("Estimate review", estimateReviewLeads().length),
    );
    summaryChips.push(buildCommandChip("Active jobs", activeJobCount));
  }

  if (state.activeView === "tasks-view") {
    if (!isMobile && selectedTask?.leadId) {
      actionButtons.push(
        buildCommandAction("Open lead", "ghost-button", {
          "data-open-lead": selectedTask.leadId,
          "data-open-view": "leads-view",
        }),
      );
    } else if (!isMobile && selectedTask?.customerId) {
      actionButtons.push(
        buildCommandAction("Open customer", "ghost-button", {
          "data-open-customer": selectedTask.customerId,
          "data-open-view": "customers-view",
        }),
      );
    } else if (!isMobile && selectedTask?.projectId) {
      actionButtons.push(
        buildCommandAction("Open job", "ghost-button", {
          "data-open-project": selectedTask.projectId,
          "data-open-view": "jobs-view",
        }),
      );
    }

    summaryChips.push(buildCommandChip("Open queue", taskOpenCount));
    summaryChips.push(buildCommandChip("Overdue", overdueCount));
    summaryChips.push(buildCommandChip("Due today", dueTodayCount));
    summaryChips.push(buildCommandChip("Completed", taskCompletedCount));
  }

  if (state.activeView === "leads-view") {
    if (!isMobile && selectedLead?.id) {
      actionButtons.push(
        buildCommandAction("Open estimate", "ghost-button", {
          "data-command": "lead-open-estimate",
        }),
      );
      actionButtons.push(
        buildCommandAction("Lead task", "ghost-button", {
          "data-command": "lead-create-task",
        }),
      );

      if (selectedLead.customerId) {
        actionButtons.push(
          buildCommandAction("Open customer", "ghost-button", {
            "data-open-customer": selectedLead.customerId,
            "data-open-view": "customers-view",
          }),
        );
      }

      const linkedProject = projectForLead(selectedLead);
      if (linkedProject) {
        actionButtons.push(
          buildCommandAction("Open job", "ghost-button", {
            "data-open-project": linkedProject.id,
            "data-open-view": "jobs-view",
          }),
        );
      }
    }

    summaryChips.push(buildCommandChip("Open leads", openLeadCount));
    summaryChips.push(buildCommandChip("Unassigned", unassignedLeadCount));
    summaryChips.push(buildCommandChip("Estimate ready", estimateReadyCount));
    summaryChips.push(
      buildCommandChip(
        "Won",
        visibleLeadSet.filter((lead) => lead.status === "closed_won").length,
      ),
    );
  }

  if (state.activeView === "customers-view") {
    if (!isMobile && selectedCustomer?.id && isAdmin()) {
      actionButtons.push(
        buildCommandAction("Create lead for customer", "secondary-button", {
          "data-command": "customer-create-lead",
        }),
      );
    }
    if (!isMobile && selectedCustomer?.id) {
      actionButtons.push(
        buildCommandAction("Customer task", "ghost-button", {
          "data-command": "customer-create-task",
        }),
      );
    }

    const currentEstimateLead = selectedCustomer
      ? customerRollup(selectedCustomer).latestEstimateLead
      : null;
    const latestCustomerProject = selectedCustomer
      ? latestByUpdated(customerRollup(selectedCustomer).projects)
      : null;

    if (!isMobile && currentEstimateLead) {
      actionButtons.push(
        buildCommandAction("Open estimate lead", "ghost-button", {
          "data-open-lead": currentEstimateLead.id,
          "data-open-view": "leads-view",
        }),
      );
    }

    if (!isMobile && latestCustomerProject) {
      actionButtons.push(
        buildCommandAction("Open latest job", "ghost-button", {
          "data-open-project": latestCustomerProject.id,
          "data-open-view": "jobs-view",
        }),
      );
    }

    summaryChips.push(buildCommandChip("Customers", visibleCustomerSet.length));
    summaryChips.push(buildCommandChip("Repeat clients", repeatClientCount));
    summaryChips.push(
      buildCommandChip(
        "Open opportunities",
        visibleLeadSet.filter((lead) =>
          ["new_lead", "follow_up", "estimate_sent"].includes(lead.status),
        ).length,
      ),
    );
    summaryChips.push(
      buildCommandChip(
        "Payments received",
        formatCurrency(totalPaymentsReceived),
      ),
    );
  }

  if (state.activeView === "jobs-view") {
    if (!isMobile && selectedProject?.leadId) {
      actionButtons.push(
        buildCommandAction("Open lead", "ghost-button", {
          "data-open-lead": selectedProject.leadId,
          "data-open-view": "leads-view",
        }),
      );
    }

    if (!isMobile && selectedProject?.customerId) {
      actionButtons.push(
        buildCommandAction("Open customer", "ghost-button", {
          "data-open-customer": selectedProject.customerId,
          "data-open-view": "customers-view",
        }),
      );
    }

    if (!isMobile && selectedProject?.id) {
      actionButtons.push(
        buildCommandAction("Job task", "ghost-button", {
          "data-command": "job-create-task",
        }),
      );
    }

    const jobsAwaitingPayment = visibleProjectSet.filter((project) => {
      return (
        project.status !== "completed" &&
        toNumber(projectFinancials(project).totalPayments) <
          projectRevenueValue(project)
      );
    }).length;

    summaryChips.push(buildCommandChip("Active jobs", activeJobCount));
    summaryChips.push(buildCommandChip("Completed", completedJobCount));
    summaryChips.push(
      buildCommandChip("Awaiting payment", jobsAwaitingPayment),
    );
    summaryChips.push(
      buildCommandChip("Client paid", formatCurrency(totalPaymentsReceived)),
    );
  }

  if (state.activeView === "vendors-view") {
    if (!isMobile && selectedVendor?.id && isAdmin()) {
      actionButtons.push(
        buildCommandAction("Add payable", "secondary-button", {
          "data-command": "vendor-add-bill",
        }),
      );
      actionButtons.push(
        buildCommandAction("Add document", "ghost-button", {
          "data-command": "vendor-add-document",
        }),
      );
    }

    if (
      !isMobile &&
      selectedVendor?.id &&
      vendorRollup(selectedVendor).projects[0]
    ) {
      actionButtons.push(
        buildCommandAction("Open latest job", "ghost-button", {
          "data-open-project": vendorRollup(selectedVendor).projects[0].id,
          "data-open-view": "jobs-view",
        }),
      );
    }

    summaryChips.push(buildCommandChip("Active vendors", activeVendorCount));
    summaryChips.push(buildCommandChip("Open bills", openVendorBillCount));
    summaryChips.push(
      buildCommandChip("Overdue bills", overdueVendorBillCount),
    );
    summaryChips.push(
      buildCommandChip("Documents", state.vendorDocuments.length),
    );
  }

  if (state.activeView === "staff-view") {
    const activeStaff = isAdmin()
      ? state.staffRoster.filter((member) => member.active !== false).length
      : 1;
    const adminCount = isAdmin()
      ? state.staffRoster.filter(
          (member) => member.active !== false && member.role === "admin",
        ).length
      : state.profile?.role === "admin"
        ? 1
        : 0;
    const defaultOwnerCount = isAdmin()
      ? state.staffRoster.filter(
          (member) => member.defaultLeadAssignee && member.active !== false,
        ).length
      : Number(Boolean(state.profile?.defaultLeadAssignee));

    summaryChips.push(buildCommandChip("Active staff", activeStaff));
    summaryChips.push(buildCommandChip("Admins", adminCount));
    summaryChips.push(buildCommandChip("Default owners", defaultOwnerCount));
    summaryChips.push(
      buildCommandChip(
        "Visible work",
        `${openLeadCount} leads / ${activeJobCount} jobs`,
      ),
    );
  }

  refs.workspaceCommandBar.innerHTML = `
        <div class="command-cluster">
            <div class="command-actions">${actionButtons.join("")}</div>
            <div class="command-summary">${summaryChips.join("")}</div>
        </div>
    `;
}

function renderMetricStrip(container, metrics) {
  container.innerHTML = metrics
    .map(
      (metric) => `
        <article class="metric-card">
            <span>${escapeHtml(metric.label)}</span>
            <strong>${escapeHtml(metric.value)}</strong>
        </article>
    `,
    )
    .join("");
}

function stackCardButton({
  title,
  copy = "",
  meta = "",
  dataAttrs = {},
  pill = "",
  secondaryPill = "",
}) {
  const attributes = Object.entries(dataAttrs)
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(" ");

  return `
        <button type="button" class="record-button" ${attributes}>
            <div class="record-topline">
                ${pill ? `<span class="mini-pill">${escapeHtml(pill)}</span>` : `<span class="mini-pill">Item</span>`}
                ${secondaryPill ? `<span class="mini-pill">${escapeHtml(secondaryPill)}</span>` : ""}
            </div>
            <span class="record-title">${escapeHtml(title)}</span>
            ${copy ? `<p class="record-copy">${escapeHtml(copy)}</p>` : ""}
            ${meta ? `<div class="record-meta">${meta}</div>` : ""}
        </button>
    `;
}

function renderEmptyList(container, message) {
  container.innerHTML = `<div class="empty-note">${escapeHtml(message)}</div>`;
}

function renderTodayView() {
  const scopedTasks = taskScopeSet();
  const overdueTasks = scopedTasks
    .filter((task) => taskIsOverdue(task))
    .sort((left, right) => taskSortValue(left) - taskSortValue(right));
  const dueTodayTasks = scopedTasks
    .filter((task) => taskIsDueToday(task))
    .sort((left, right) => taskSortValue(left) - taskSortValue(right));
  const newLeads = openLeadsForToday();
  const estimateLeads = estimateReviewLeads();
  const activeJobs = sortByUpdatedDesc(
    projectScopeSet().filter((project) => project.status !== "completed"),
  );
  const scheduledToday = visibleCalendarEvents().filter((event) =>
    isSameDay(event.startAt, new Date()),
  );

  renderMetricStrip(refs.todayMetrics, [
    { label: "Overdue tasks", value: overdueTasks.length },
    { label: "Due today", value: dueTodayTasks.length },
    { label: "Scheduled today", value: scheduledToday.length },
    { label: "New leads", value: newLeads.length },
    { label: "Active jobs", value: activeJobs.length },
  ]);

  if (!overdueTasks.length) {
    renderEmptyList(refs.todayOverdueList, "No overdue tasks.");
  } else {
    refs.todayOverdueList.innerHTML = overdueTasks
      .slice(0, 8)
      .map((task) =>
        stackCardButton({
          title: task.title || "Untitled task",
          copy: linkedTaskLabel(task),
          pill: PRIORITY_META[task.priority] || "Task",
          secondaryPill: formatDateOnly(task.dueAt),
          dataAttrs: {
            "data-open-task": task.id,
            "data-open-view": "tasks-view",
          },
          meta: `<div>${escapeHtml(task.assignedToName || task.assignedToEmail || "Unassigned")}</div>`,
        }),
      )
      .join("");
  }

  if (!dueTodayTasks.length) {
    renderEmptyList(refs.todayDueTodayList, "No tasks due today.");
  } else {
    refs.todayDueTodayList.innerHTML = dueTodayTasks
      .slice(0, 8)
      .map((task) =>
        stackCardButton({
          title: task.title || "Untitled task",
          copy: linkedTaskLabel(task),
          pill: TASK_STATUS_META[task.status] || "Task",
          secondaryPill: formatDateTime(task.dueAt),
          dataAttrs: {
            "data-open-task": task.id,
            "data-open-view": "tasks-view",
          },
          meta: `<div>${escapeHtml(task.assignedToName || task.assignedToEmail || "Unassigned")}</div>`,
        }),
      )
      .join("");
  }

  if (!newLeads.length) {
    renderEmptyList(refs.todayNewLeadsList, "No new leads waiting.");
  } else {
    refs.todayNewLeadsList.innerHTML = newLeads
      .slice(0, 8)
      .map((lead) =>
        stackCardButton({
          title: lead.clientName || "Unnamed lead",
          copy: lead.projectAddress || "Address pending",
          pill: STATUS_META[lead.status] || "Lead",
          secondaryPill: lead.assignedToName || "Unassigned",
          dataAttrs: {
            "data-open-lead": lead.id,
            "data-open-view": "leads-view",
          },
          meta: `<div>${escapeHtml(lead.projectType || "General scope")}</div><div>${escapeHtml(formatDateTime(lead.createdAt))}</div>`,
        }),
      )
      .join("");
  }

  if (!estimateLeads.length) {
    renderEmptyList(
      refs.todayEstimatesList,
      "No estimates waiting for review.",
    );
  } else {
    refs.todayEstimatesList.innerHTML = estimateLeads
      .slice(0, 8)
      .map((lead) =>
        stackCardButton({
          title: lead.estimateTitle || lead.clientName || "Estimate draft",
          copy: lead.projectAddress || "Address pending",
          pill: "Estimate",
          secondaryPill: formatCurrency(lead.estimateSubtotal || 0),
          dataAttrs: {
            "data-open-lead": lead.id,
            "data-open-view": "leads-view",
          },
          meta: `<div>${escapeHtml(lead.assignedToName || "Unassigned")}</div>`,
        }),
      )
      .join("");
  }

  if (!activeJobs.length) {
    renderEmptyList(
      refs.todayJobsList,
      "No active jobs need attention right now.",
    );
  } else {
    refs.todayJobsList.innerHTML = activeJobs
      .slice(0, 8)
      .map((project) => {
        const nextEvent = calendarEventsForProject(project.id).find(
          (event) => calendarEventStartMillis(event) >= Date.now(),
        );
        return stackCardButton({
          title: project.clientName || "Unnamed job",
          copy: project.projectAddress || "Address pending",
          pill: JOB_STATUS_META[project.status] || "In Progress",
          secondaryPill: nextEvent
            ? formatDateTime(nextEvent.startAt)
            : formatCurrency(project.financials?.profit || 0),
          dataAttrs: {
            "data-open-project": project.id,
            "data-open-view": "jobs-view",
          },
          meta: `<div>${escapeHtml(project.projectType || "Project")}</div><div>${escapeHtml(nextEvent ? `Next: ${nextEvent.title || "Scheduled event"}` : `Paid ${formatCurrency(project.financials?.totalPayments || 0)}`)}</div>`,
        });
      })
      .join("");
  }
}

function buildTaskMeta(task) {
  return `
        <div>${escapeHtml(linkedTaskLabel(task))}</div>
        <div>${escapeHtml(task.assignedToName || task.assignedToEmail || "Unassigned")}</div>
        <div>${escapeHtml(task.dueAt ? formatDateTime(task.dueAt) : "No due date")}</div>
    `;
}

function renderTaskMetrics() {
  const tasks = visibleTasks();
  renderMetricStrip(refs.taskMetrics, [
    {
      label: "Open",
      value: tasks.filter((task) => !taskIsCompleted(task)).length,
    },
    {
      label: "Overdue",
      value: tasks.filter((task) => taskIsOverdue(task)).length,
    },
    {
      label: "Due today",
      value: tasks.filter((task) => taskIsDueToday(task)).length,
    },
    {
      label: "Completed",
      value: tasks.filter((task) => taskIsCompleted(task)).length,
    },
  ]);
}

function renderTaskList() {
  const tasks = filteredTasks();

  if (!tasks.length) {
    renderEmptyList(refs.taskList, "No tasks match the current filters.");
    return;
  }

  refs.taskList.innerHTML = tasks
    .map(
      (task) => `
        <button type="button" class="record-button ${task.id === state.selectedTaskId ? "is-selected" : ""}" data-task-id="${escapeHtml(task.id)}">
            <div class="record-topline">
                <span class="priority-pill ${escapeHtml(task.priority || "medium")}">${escapeHtml(PRIORITY_META[task.priority] || "Task")}</span>
                <span class="mini-pill">${escapeHtml(TASK_STATUS_META[task.status] || "Open")}</span>
            </div>
            <span class="record-title">${escapeHtml(task.title || "Untitled task")}</span>
            <p class="record-copy">${escapeHtml(task.description || linkedTaskLabel(task))}</p>
            <div class="record-meta">${buildTaskMeta(task)}</div>
            <span class="record-edit-affordance">Open &amp; edit</span>
        </button>
    `,
    )
    .join("");
}

function renderTaskAssigneeOptions(select, selectedUid = "") {
  const options = activeStaffOptions();

  if (!isAdmin()) {
    const me = options[0];
    select.innerHTML = `<option value="${escapeHtml(me?.uid || "")}">${escapeHtml(me?.displayName || me?.email || "Me")}</option>`;
    select.disabled = true;
    return;
  }

  select.disabled = false;
  select.innerHTML = options.length
    ? options
        .map(
          (member) => `
            <option value="${escapeHtml(member.uid || "")}" ${selectedUid === member.uid ? "selected" : ""} ${member.uid ? "" : "disabled"}>
                ${escapeHtml((member.displayName || member.email) + (member.uid ? "" : " (sign in once to activate)"))}
            </option>
        `,
        )
        .join("")
    : `<option value="">No staff available</option>`;
}

function renderTaskLinkedRecordOptions() {
  const task = currentTask();
  const linkedType = refs.taskLinkedTypeSelect.value || taskLinkedType(task);
  const selectedId =
    linkedType === "lead"
      ? task?.leadId
      : linkedType === "customer"
        ? task?.customerId
        : linkedType === "project"
          ? task?.projectId
          : "";

  let options = [];

  if (linkedType === "lead") {
    options = sortByUpdatedDesc(state.leads).map((lead) => ({
      value: lead.id,
      label: `${lead.clientName || "Unnamed lead"} · ${lead.projectAddress || "Address pending"}`,
    }));
  } else if (linkedType === "customer") {
    options = sortByUpdatedDesc(state.customers).map((customer) => ({
      value: customer.id,
      label: `${customer.name || "Unnamed customer"} · ${customer.primaryAddress || customer.primaryEmail || customer.primaryPhone || "No contact info"}`,
    }));
  } else if (linkedType === "project") {
    options = sortByUpdatedDesc(state.projects).map((project) => ({
      value: project.id,
      label: `${project.clientName || "Unnamed job"} · ${project.projectAddress || "Address pending"}`,
    }));
  }

  refs.taskLinkedRecordSelect.disabled = !linkedType;
  refs.taskLinkedRecordSelect.innerHTML = !linkedType
    ? `<option value="">Select a record type first</option>`
    : options.length
      ? options
          .map(
            (option) => `
                <option value="${escapeHtml(option.value)}" ${selectedId === option.value ? "selected" : ""}>
                    ${escapeHtml(option.label)}
                </option>
            `,
          )
          .join("")
      : `<option value="">No visible records</option>`;
}

function currentTaskLinkedSelection() {
  const task = currentTask();
  const linkedType = refs.taskLinkedTypeSelect.value || taskLinkedType(task);
  const linkedId =
    refs.taskLinkedRecordSelect.value ||
    (linkedType === "lead"
      ? task?.leadId
      : linkedType === "customer"
        ? task?.customerId
        : linkedType === "project"
          ? task?.projectId
          : "");

  return { linkedType, linkedId };
}

function renderTaskRelatedSummary() {
  const task = currentTask();
  if (!task) {
    refs.taskRelatedSummary.innerHTML = "";
    return;
  }

  const { linkedType, linkedId } = currentTaskLinkedSelection();
  const parts = [];

  if (linkedType === "lead" && linkedId) {
    const lead = state.leads.find((item) => item.id === linkedId);
    parts.push(
      `<div><strong>Lead:</strong> ${escapeHtml(lead?.clientName || lead?.projectAddress || linkedId)}</div>`,
    );
  }

  if (linkedType === "customer" && linkedId) {
    const customer = state.customers.find((item) => item.id === linkedId);
    parts.push(
      `<div><strong>Customer:</strong> ${escapeHtml(customer?.name || linkedId)}</div>`,
    );
  }

  if (linkedType === "project" && linkedId) {
    const project = state.projects.find((item) => item.id === linkedId);
    parts.push(
      `<div><strong>Job:</strong> ${escapeHtml(project?.clientName || project?.projectAddress || linkedId)}</div>`,
    );
  }

  refs.taskRelatedSummary.innerHTML = parts.length
    ? parts.join("")
    : "No linked record.";
}

function renderTaskDetail() {
  const task = currentTask();

  if (!task) {
    refs.taskDetailTitle.textContent = "Select a task";
    refs.taskDetailBadge.textContent = "No task selected";
    refs.taskDetailBadge.className = "status-pill neutral";
    refs.taskRecordEmpty.hidden = false;
    refs.taskDetailShell.hidden = true;
    return;
  }

  refs.taskRecordEmpty.hidden = true;
  refs.taskDetailShell.hidden = false;
  refs.taskDetailTitle.textContent = task.title || "New task";
  refs.taskDetailBadge.textContent = task.id
    ? TASK_STATUS_META[task.status] || "Open"
    : "Draft";
  refs.taskDetailBadge.className = task.id
    ? "status-pill"
    : "status-pill neutral";
  refs.taskTitleInput.value = task.title || "";
  refs.taskStatusSelect.value = task.status || "open";
  refs.taskPrioritySelect.value = task.priority || "high";
  setTaskScheduleValue("main", task.dueAt);
  refs.taskDescriptionInput.value = task.description || "";
  refs.taskLinkedTypeSelect.value = taskLinkedType(task);
  renderTaskAssigneeOptions(
    refs.taskAssigneeSelect,
    task.assignedToUid || state.profile?.uid || "",
  );
  renderTaskLinkedRecordOptions();
  refs.taskLinkedRecordSelect.value =
    task.leadId ||
    task.customerId ||
    task.projectId ||
    refs.taskLinkedRecordSelect.value;
  renderTaskRelatedSummary();
  refs.taskCompleteButton.hidden = !task.id;
}

function renderLeadMetrics() {
  const leads = visibleLeads();
  const counts = leadCounts(leads);
  const winRate = leads.length
    ? `${Math.round((counts.closed_won / leads.length) * 100)}%`
    : "0%";

  renderMetricStrip(refs.leadMetrics, [
    { label: "New leads", value: counts.new_lead },
    { label: "Follow up", value: counts.follow_up },
    { label: "Estimate sent", value: counts.estimate_sent },
    { label: "Win rate", value: winRate },
  ]);
}

function renderCustomerOptions(selectedId = null) {
  const lead = currentLead();
  const matchedCustomers = Array.isArray(lead?.customerMatchIds)
    ? lead.customerMatchIds
        .map((customerId) =>
          state.customers.find((customer) => customer.id === customerId),
        )
        .filter(Boolean)
    : [];

  if (!isAdmin()) {
    refs.leadCustomerSelect.innerHTML = lead?.customerId
      ? `<option value="${escapeHtml(lead.customerId)}">${escapeHtml(lead.customerName || "Linked customer")}</option>`
      : `<option value="">No linked customer</option>`;
    refs.leadCustomerSelect.disabled = true;
    return;
  }

  refs.leadCustomerSelect.disabled = false;
  const matchedIds = new Set(matchedCustomers.map((customer) => customer.id));
  const remainingCustomers = sortByUpdatedDesc(visibleCustomers()).filter(
    (customer) => !matchedIds.has(customer.id),
  );
  const matchedMarkup = matchedCustomers.length
    ? `
            <optgroup label="Review matches">
                ${matchedCustomers
                  .map(
                    (customer) => `
                    <option value="${escapeHtml(customer.id)}" ${selectedId === customer.id ? "selected" : ""}>
                        ${escapeHtml(customer.name || "Unnamed customer")}
                    </option>
                `,
                  )
                  .join("")}
            </optgroup>
        `
    : "";

  refs.leadCustomerSelect.innerHTML = [
    `<option value="">No linked customer</option>`,
    matchedMarkup,
    remainingCustomers
      .map(
        (customer) => `
            <option value="${escapeHtml(customer.id)}" ${selectedId === customer.id ? "selected" : ""}>
                ${escapeHtml(customer.name || "Unnamed customer")}
            </option>
        `,
      )
      .join(""),
  ].join("");
}

function renderLeadAssigneeOptions(selectedUid = "") {
  if (!isAdmin()) {
    const lead = currentLead();
    refs.leadAssigneeSelect.innerHTML = `<option value="${escapeHtml(lead?.assignedToUid || state.profile?.uid || "")}">${escapeHtml(lead?.assignedToName || state.profile?.displayName || "Assigned staff")}</option>`;
    refs.leadAssigneeSelect.disabled = true;
    return;
  }

  refs.leadAssigneeSelect.disabled = false;
  refs.leadAssigneeSelect.innerHTML = [`<option value="">Unassigned</option>`]
    .concat(
      activeStaffOptions().map(
        (member) => `
            <option value="${escapeHtml(member.uid || "")}" ${selectedUid === member.uid ? "selected" : ""} ${member.uid ? "" : "disabled"}>
                ${escapeHtml((member.displayName || member.email) + (member.uid ? "" : " (sign in once to activate)"))}
            </option>
        `,
      ),
    )
    .join("");
}

function renderLeadStageOptions(lead) {
  const statusOptions = [
    "new_lead",
    "follow_up",
    "estimate_sent",
    "closed_lost",
  ];
  const visibleStatuses =
    lead?.status === "closed_won"
      ? [...statusOptions, "closed_won"]
      : statusOptions;

  refs.leadStageSelect.innerHTML = visibleStatuses
    .map(
      (status) => `
        <option value="${escapeHtml(status)}" ${lead?.status === status ? "selected" : ""}>
            ${escapeHtml(STATUS_META[status])}
        </option>
    `,
    )
    .join("");

  refs.leadStageSelect.disabled = !isAdmin() && lead?.status === "closed_won";
}

function renderLeadCustomerMatch(lead) {
  if (!lead) {
    refs.leadCustomerMatch.hidden = true;
    refs.leadCustomerMatch.className = "detail-summary lead-customer-match";
    refs.leadCustomerMatch.innerHTML = "";
    return;
  }

  const matchedCustomers = Array.isArray(lead.customerMatchIds)
    ? lead.customerMatchIds
        .map((customerId) =>
          state.customers.find((customer) => customer.id === customerId),
        )
        .filter(Boolean)
    : [];

  if (lead.customerReviewRequired) {
    refs.leadCustomerMatch.hidden = false;
    refs.leadCustomerMatch.className =
      "detail-summary lead-customer-match review";
    refs.leadCustomerMatch.innerHTML = `
            <strong>Customer review needed</strong>
            <div>${escapeHtml(matchedCustomers.length ? `${matchedCustomers.length} exact matches were found by phone or email.` : "Multiple possible customer matches were found.")}</div>
            <div>${escapeHtml(isAdmin() ? "Use the Linked customer field in Overview to choose the correct customer card." : "An admin needs to choose the correct customer card for this lead.")}</div>
        `;
    return;
  }

  if (lead.customerMatchResult === "created" && lead.customerName) {
    refs.leadCustomerMatch.hidden = false;
    refs.leadCustomerMatch.className =
      "detail-summary lead-customer-match created";
    refs.leadCustomerMatch.innerHTML = `
            <strong>New customer created</strong>
            <div>${escapeHtml(`${lead.customerName} was created automatically from this lead so future jobs, payments, and repeat opportunities stay together.`)}</div>
        `;
    return;
  }

  if (lead.customerMatchResult === "linked" && lead.customerName) {
    refs.leadCustomerMatch.hidden = false;
    refs.leadCustomerMatch.className =
      "detail-summary lead-customer-match linked";
    refs.leadCustomerMatch.innerHTML = `
            <strong>Customer linked</strong>
            <div>${escapeHtml(`${lead.customerName} is already connected to this lead, so repeat-client history will stay on one card.`)}</div>
        `;
    return;
  }

  refs.leadCustomerMatch.hidden = true;
  refs.leadCustomerMatch.className = "detail-summary lead-customer-match";
  refs.leadCustomerMatch.innerHTML = "";
}

function nextFollowUpLabelForLead(lead) {
  const nextTask = relatedTasksForEntity("leadId", lead.id)
    .filter((task) => !taskIsCompleted(task) && task.dueAt)
    .sort((left, right) => toMillis(left.dueAt) - toMillis(right.dueAt))[0];
  return nextTask?.dueAt ? `Next ${formatDateTime(nextTask.dueAt)}` : "No follow-up";
}

function leadContactActionsMarkup(lead) {
  const phone = safeString(lead.clientPhone);
  const email = safeString(lead.clientEmail);
  return `
    <div class="record-quick-actions" aria-label="Lead quick actions">
      <button type="button" class="record-quick-action is-edit" data-lead-id="${escapeHtml(lead.id)}">Open &amp; edit</button>
      ${
        phone
          ? `<a href="tel:${escapeHtml(phone)}" class="record-quick-action">Call</a>
             <a href="sms:${escapeHtml(phone)}" class="record-quick-action">Text</a>`
          : `<span class="record-quick-action is-disabled">Call</span>
             <span class="record-quick-action is-disabled">Text</span>`
      }
      ${
        email
          ? `<a href="mailto:${escapeHtml(email)}" class="record-quick-action">Email</a>`
          : `<span class="record-quick-action is-disabled">Email</span>`
      }
      <button type="button" class="record-quick-action" data-lead-log-communication="${escapeHtml(lead.id)}">Log</button>
      ${
        isAdmin()
          ? `<button type="button" class="record-quick-action is-danger" data-lead-archive="${escapeHtml(lead.id)}" title="Move this lead to Trash">Delete</button>`
          : ""
      }
    </div>
  `;
}

function leadQuickStageMarkup(lead) {
  const statuses = [
    "new_lead",
    "follow_up",
    "estimate_sent",
    ...(isAdmin() || lead.status === "closed_won" ? ["closed_won"] : []),
    "closed_lost",
  ];
  if (lead.status && !statuses.includes(lead.status)) {
    statuses.unshift(lead.status);
  }

  return `
    <label class="lead-card-stage-control">
      <span>Stage</span>
      <select
        data-lead-quick-stage="${escapeHtml(lead.id)}"
        aria-label="Change stage for ${escapeHtml(lead.clientName || "lead")}"
        ${!isAdmin() && lead.status === "closed_won" ? "disabled" : ""}
      >
        ${statuses
          .map(
            (status) => `
              <option value="${escapeHtml(status)}" ${lead.status === status ? "selected" : ""}>
                ${escapeHtml(STATUS_META[status] || capitalise(status))}
              </option>
            `,
          )
          .join("")}
      </select>
    </label>
  `;
}

function renderLeadList() {
  const leads = filteredLeads();

  if (!leads.length) {
    renderEmptyList(refs.leadList, "No leads match the current filters.");
    return;
  }

  refs.leadList.innerHTML = leads
    .map(
      (lead) => `
        <article class="record-button lead-record-card ${lead.id === state.selectedLeadId && state.leadWorkspaceOpen && !state.leadDraft ? "is-selected" : ""}">
          <button type="button" class="record-open-area" data-lead-id="${escapeHtml(lead.id)}">
            <div class="record-topline">
                <span class="mini-pill">${escapeHtml(STATUS_META[lead.status] || "Lead")}</span>
                <span class="mini-pill">${escapeHtml(lead.assignedToName || "Unassigned")}</span>
                <span class="mini-pill">${escapeHtml(nextFollowUpLabelForLead(lead))}</span>
            </div>
            <span class="record-title">${escapeHtml(lead.clientName || "Unnamed lead")}</span>
            <p class="record-copy">${escapeHtml(lead.projectAddress || "Address pending")}</p>
            <div class="record-meta">
                <div>${escapeHtml(lead.projectType || "General scope")}</div>
                <div>${escapeHtml(lead.customerName || "No linked customer")}</div>
                <div>${escapeHtml(formatCurrency(lead.estimateSubtotal || 0))} estimate</div>
                <div>${escapeHtml(formatDateTime(lead.updatedAt || lead.createdAt))}</div>
            </div>
          </button>
          ${leadQuickStageMarkup(lead)}
          ${leadContactActionsMarkup(lead)}
        </article>
    `,
    )
    .join("");
}

function renderLeadBoard() {
  const leads = filteredLeads();
  const statuses = [
    "new_lead",
    "follow_up",
    "estimate_sent",
    "closed_won",
    "closed_lost",
  ];

  refs.leadBoard.innerHTML = statuses
    .map((status) => {
      const laneLeads = leads.filter(
        (lead) => (lead.status || "new_lead") === status,
      );
      return `
            <section class="pipeline-lane ${state.dragLeadOverStatus === status ? "is-drop-target" : ""}" data-lane-status="${escapeHtml(status)}">
                <div class="lane-head">
                    <h3>${escapeHtml(STATUS_META[status])}</h3>
                    <span>${laneLeads.length}</span>
                </div>
                ${
                  laneLeads.length
                    ? laneLeads
                        .map(
                          (lead) => `
                    <article
                        class="record-button pipeline-card ${lead.id === state.selectedLeadId && state.leadWorkspaceOpen && !state.leadDraft ? "is-selected" : ""} ${state.dragLeadId === lead.id ? "is-dragging" : ""}"
                        data-draggable-lead="${escapeHtml(lead.id)}"
                        draggable="true"
                    >
                        <button type="button" class="record-open-area" data-lead-id="${escapeHtml(lead.id)}">
                        <div class="record-topline">
                            <span class="mini-pill">${escapeHtml(lead.projectType || "Lead")}</span>
                            <span class="mini-pill">${escapeHtml(lead.assignedToName || "Unassigned")}</span>
                            <span class="mini-pill">${escapeHtml(nextFollowUpLabelForLead(lead))}</span>
                        </div>
                        <span class="record-title">${escapeHtml(lead.clientName || "Unnamed lead")}</span>
                        <p class="record-copy">${escapeHtml(lead.projectAddress || "Address pending")}</p>
                        <div class="record-meta">
                            <div>${escapeHtml(lead.customerName || "No linked customer")}</div>
                            <div>${escapeHtml(formatCurrency(lead.estimateSubtotal || 0))} estimate</div>
                        </div>
                        </button>
                        ${leadContactActionsMarkup(lead)}
                    </article>
                `,
                        )
                        .join("")
                    : `<div class="empty-note">No leads in this stage.</div>`
                }
            </section>
        `;
    })
    .join("");
}

function clearLeadBoardDragClasses() {
  refs.leadBoard.querySelectorAll(".pipeline-lane").forEach((lane) => {
    lane.classList.remove("is-drop-target");
  });
  refs.leadBoard.querySelectorAll(".pipeline-card").forEach((card) => {
    card.classList.remove("is-dragging");
  });
}

function markLeadBoardDragState(leadId, laneStatus = null) {
  clearLeadBoardDragClasses();

  if (leadId) {
    refs.leadBoard
      .querySelector(`[data-draggable-lead="${CSS.escape(leadId)}"]`)
      ?.classList.add("is-dragging");
  }

  if (laneStatus) {
    refs.leadBoard
      .querySelector(`[data-lane-status="${CSS.escape(laneStatus)}"]`)
      ?.classList.add("is-drop-target");
  }
}

function renderLeadListShell() {
  renderLeadBoard();
  renderLeadList();

  const shouldUseMobileLayout = isMobileViewport() && !state.leadWorkspaceOpen;
  const activeLeadLayout = state.leadLayout === "board" ? "board" : "list";

  if (refs.leadLayoutToggle) {
    refs.leadLayoutToggle.hidden = !shouldUseMobileLayout;
  }

  refs.leadLayoutButtons.forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.leadLayout === activeLeadLayout,
    );
  });

  if (refs.leadPipelineSurface) {
    refs.leadPipelineSurface.classList.toggle(
      "is-mobile-list-layout",
      shouldUseMobileLayout && activeLeadLayout === "list",
    );
    refs.leadPipelineSurface.classList.toggle(
      "is-mobile-board-layout",
      shouldUseMobileLayout && activeLeadLayout === "board",
    );
  }
}

function renderLeadWorkspaceSurface() {
  const showWorkspace =
    state.activeView === "leads-view" && state.leadWorkspaceOpen;
  const keepListVisible = showWorkspace && !isMobileViewport();
  refs.leadsView.classList.toggle("is-lead-workspace-active", showWorkspace);
  refs.leadMetrics.hidden = showWorkspace;
  refs.leadPipelineSurface.hidden = showWorkspace && !keepListVisible;
  refs.leadWorkspacePanel.hidden = !showWorkspace;
}

function renderLeadWorkspaceHeader(lead) {
  if (!state.leadWorkspaceOpen) {
    return;
  }

  if (!lead) {
    refs.leadRecordTitle.textContent = "Lead workspace";
    refs.leadWorkspaceMeta.textContent =
      "Open a lead from the board to work the record in a focused full-screen workspace.";
    return;
  }

  refs.leadRecordTitle.textContent = lead.clientName || "Lead workspace";
  refs.leadWorkspaceMeta.textContent = [
    STATUS_META[lead.status] || "Lead",
    lead.assignedToName || "Unassigned",
    lead.projectAddress || "Address pending",
  ]
    .filter(Boolean)
    .join(" · ");
}

function renderLeadOverviewSummary(lead) {
  const linkedProject = projectForLead(lead);
  const openLeadTasks = lead.id ? activeTasksForEntity("leadId", lead.id) : [];

  refs.leadOverviewSummary.innerHTML = [
    { label: "Assigned staff", value: lead.assignedToName || "Unassigned" },
    {
      label: "Linked customer",
      value: lead.customerName || "No linked customer",
    },
    { label: "Open tasks", value: openLeadTasks.length || "0" },
    {
      label: "Estimate total",
      value: formatCurrency(
        lead.estimateSubtotal || state.estimate?.subtotal || 0,
      ),
    },
    {
      label: "Job record",
      value: linkedProject
        ? linkedProject.status === "completed"
          ? "Completed"
          : "In Progress"
        : "Not created",
    },
    {
      label: "Last updated",
      value: formatDateTime(lead.updatedAt || lead.createdAt),
    },
  ]
    .map(
      (item) => `
        <article class="summary-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `,
    )
    .join("");
}

function renderLeadRecordContext(lead) {
  if (!lead) {
    refs.leadRecordContext.innerHTML = "";
    return;
  }

  const linkedCustomer = lead.customerId
    ? state.customers.find((customer) => customer.id === lead.customerId)
    : null;
  const linkedProject = projectForLead(lead);
  const openLeadTasks = lead.id ? activeTasksForEntity("leadId", lead.id) : [];
  const estimateTitle =
    safeString(state.estimate?.subject || lead.estimateTitle) ||
    "Estimate not drafted";
  const estimateMeta = lead.hasEstimate
    ? `${formatCurrency(lead.estimateSubtotal || state.estimate?.subtotal || 0)} ready to review`
    : "Draft an estimate when the scope is clear.";

  refs.leadRecordContext.innerHTML = [
    buildContextCard({
      label: "Linked customer",
      title: linkedCustomer?.name || "No linked customer",
      meta: linkedCustomer
        ? `${customerRollup(linkedCustomer).openLeads.length} open opportunities · ${customerRollup(linkedCustomer).projects.length} jobs`
        : "Link this lead to keep repeat work under one customer card.",
      dataAttrs: linkedCustomer
        ? {
            "data-open-customer": linkedCustomer.id,
            "data-open-view": "customers-view",
          }
        : {},
      muted: !linkedCustomer,
    }),
    buildContextCard({
      label: "Estimate",
      title: lead.hasEstimate ? estimateTitle : "No estimate yet",
      meta: estimateMeta,
      dataAttrs: lead.id ? { "data-command": "lead-open-estimate" } : {},
      muted: !lead.id,
    }),
    buildContextCard({
      label: "Open tasks",
      title: lead.id ? String(openLeadTasks.length) : "Save first",
      meta: lead.id
        ? openLeadTasks[0]?.title
          ? `Next: ${openLeadTasks[0].title}`
          : "Create the next action for this lead."
        : "Save the lead before creating tasks.",
      dataAttrs: lead.id ? { "data-command": "lead-create-task" } : {},
      muted: !lead.id,
    }),
    buildContextCard({
      label: "Job record",
      title: linkedProject
        ? linkedProject.status === "completed"
          ? "Completed job"
          : "In progress job"
        : "Not converted yet",
      meta: linkedProject
        ? `${formatCurrency(projectRevenueValue(linkedProject))} contract value`
        : "Use Mark won to create the operational job record.",
      dataAttrs: linkedProject
        ? {
            "data-open-project": linkedProject.id,
            "data-open-view": "jobs-view",
          }
        : {},
      muted: !linkedProject,
    }),
  ].join("");
}

function activityDetailMarkup(item) {
  if (item.activityType !== "communication") {
    return "";
  }

  const details = [
    communicationTypeLabel(item.communicationType),
    communicationDirectionLabel(item.direction),
    item.happenedAt ? formatDateTime(item.happenedAt) : "",
    item.contactName || "",
    item.contactMethod || "",
    item.outcome ? `Outcome: ${item.outcome}` : "",
    item.followUpRequired
      ? `Follow-up${item.followUpAt ? ` ${formatDateTime(item.followUpAt)}` : " required"}`
      : "",
  ].filter(Boolean);

  return details.length
    ? `<div class="communication-detail">${details.map((detail) => `<span>${escapeHtml(detail)}</span>`).join("")}</div>`
    : "";
}

function renderActivityList(container, items, emptyMessage) {
  if (!items.length) {
    renderEmptyList(container, emptyMessage);
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
        <article class="timeline-item">
            <strong>${escapeHtml(item.title || "Activity")}</strong>
            <p>${escapeHtml(item.body || "")}</p>
            ${activityDetailMarkup(item)}
            <div class="timeline-meta">
                ${escapeHtml(item.activityType || "system")} · ${escapeHtml(item.actorName || "Team")} · ${escapeHtml(formatDateTime(item.createdAt))}
            </div>
        </article>
    `,
    )
    .join("");
}

function contractorBusinessAddress(template = state.template || EMPTY_TEMPLATE) {
  return safeString(template?.contractorBusinessAddress) || CONTRACTOR_BUSINESS_ADDRESS;
}

function contractDetailValue(value, fallback) {
  return safeString(value) || fallback;
}

function contractDetailsForEstimate(estimateDraft = {}) {
  const details = estimateDraft.contractDetails || {};
  return {
    approximateStartDate: safeString(details.approximateStartDate),
    approximateCompletionDate: safeString(details.approximateCompletionDate),
    paymentSchedule: contractDetailValue(
      details.paymentSchedule,
      DEFAULT_CONTRACT_PAYMENT_SCHEDULE,
    ),
    specialOrderMaterials: contractDetailValue(
      details.specialOrderMaterials,
      DEFAULT_CONTRACT_SPECIAL_ORDER_MATERIALS,
    ),
    knownSubcontractors: contractDetailValue(
      details.knownSubcontractors,
      DEFAULT_CONTRACT_SUBCONTRACTORS,
    ),
    contractorBusinessAddress:
      contractorBusinessAddress(),
    paRegistrationNumber: COMPANY_INFO.paRegistrationNumber,
    philadelphiaLicenseNumber: COMPANY_INFO.philadelphiaLicenseNumber,
    insuranceDisclosure: COMPANY_INFO.insuranceDisclosure,
  };
}

function contractDateDisplay(value, fallback = "Schedule to be confirmed") {
  return safeString(value) ? formatDateOnly(`${safeString(value)}T12:00:00`) : fallback;
}

function contractDetailsRows(lead, estimateDraft = {}) {
  const details = contractDetailsForEstimate(estimateDraft);
  return [
    {
      label: "Contractor",
      value: COMPANY_INFO.name,
    },
    {
      label: "Business address",
      value: details.contractorBusinessAddress,
    },
    {
      label: "Prepared for",
      value: safeString(lead?.clientName) || "Name to be confirmed",
    },
    {
      label: "Project address",
      value: safeString(lead?.projectAddress) || "To be confirmed",
    },
    {
      label: "Approx. start",
      value: contractDateDisplay(details.approximateStartDate),
    },
    {
      label: "Approx. completion",
      value: contractDateDisplay(details.approximateCompletionDate),
    },
    {
      label: "PA registration",
      value: details.paRegistrationNumber,
    },
    {
      label: "Philly GC license",
      value: `#${details.philadelphiaLicenseNumber}`,
    },
  ];
}

function estimateBelongsToLead(estimate = {}, leadId = "") {
  const expectedLeadId = safeString(leadId);
  if (!expectedLeadId || !estimate) {
    return false;
  }

  const storedLeadId = safeString(estimate.leadId || estimate.id);
  return !storedLeadId || storedLeadId === expectedLeadId;
}

function estimateEditorIsBoundToLead(leadId = state.selectedLeadId) {
  return Boolean(
    refs.estimateForm &&
      safeString(refs.estimateForm.dataset.estimateLeadId) ===
        safeString(leadId) &&
      safeString(state.estimateWorkflow.leadId) === safeString(leadId),
  );
}

function estimateOperationIsPending(leadId = state.selectedLeadId) {
  const operationLeadId = safeString(state.estimateWorkflow.leadId);
  return Boolean(
    operationLeadId &&
      operationLeadId === safeString(leadId) &&
      ["saving", "publishing"].includes(state.estimateWorkflow.status),
  );
}

function resetEstimateWorkflowForLead(
  leadId,
  { status = "loading", message = "" } = {},
) {
  const nextLeadId = safeString(leadId);
  state.estimateWorkflow = {
    leadId: nextLeadId,
    status: nextLeadId ? status : "loading",
    dirty: false,
    operation: "",
    message,
    error: "",
    lastPublishedShareId: "",
  };

  if (refs.estimateForm) {
    refs.estimateForm.dataset.estimateLeadId = nextLeadId;
    refs.estimateForm.classList.remove("is-dirty");
  }
}

function setEstimateWorkflowState(patch = {}) {
  state.estimateWorkflow = {
    ...state.estimateWorkflow,
    ...patch,
  };

  const lead = currentLead();
  if (safeString(lead?.id) === safeString(state.estimateWorkflow.leadId)) {
    renderEstimateWorkflowStatus(lead);
  }
}

function markEstimateDirty() {
  const lead = currentLeadDoc();
  if (
    !lead?.id ||
    !estimateEditorIsBoundToLead(lead.id) ||
    estimateOperationIsPending(lead.id)
  ) {
    return;
  }

  state.estimateWorkflow = {
    ...state.estimateWorkflow,
    leadId: lead.id,
    status: "unsaved",
    dirty: true,
    operation: "",
    message:
      "These edits are only in this browser. Save them, or use Save & publish to publish this exact version.",
    error: "",
  };
  refs.estimateForm.classList.add("is-dirty");
  renderEstimateWorkflowStatus(lead);
}

function estimateDraftForLead(leadId, draft = {}) {
  const targetLeadId = safeString(leadId);
  return {
    ...draft,
    id: targetLeadId,
    leadId: targetLeadId,
    status: "draft",
  };
}

function currentVisibleEstimateDraft(lead = currentLeadDoc()) {
  if (!lead?.id) {
    return null;
  }

  if (estimateEditorIsBoundToLead(lead.id)) {
    return estimateDraftForLead(lead.id, collectEstimateForm());
  }

  if (state.estimate && estimateBelongsToLead(state.estimate, lead.id)) {
    return estimateDraftForLead(lead.id, state.estimate);
  }

  return null;
}

function estimatePublishReadiness(lead, estimateDraft = {}) {
  const blockers = [];
  const warnings = [];
  const lineItems = Array.isArray(estimateDraft.lineItems)
    ? estimateDraft.lineItems
    : [];
  const calculatedSubtotal = lineItems.reduce(
    (sum, item) => sum + toNumber(item?.amount),
    0,
  );
  const hasMeaningfulLineItem = lineItems.some(
    (item) =>
      Boolean(safeString(item?.label || item?.description)) &&
      toNumber(item?.amount) > 0,
  );
  const contractDetails = estimateDraft.contractDetails || {};
  const startDate = safeString(contractDetails.approximateStartDate);
  const completionDate = safeString(contractDetails.approximateCompletionDate);
  const hasClientEmail = Boolean(safeString(lead?.clientEmail));

  if (!lead?.id) {
    blockers.push("Select a saved lead before publishing.");
  }
  if (!safeString(lead?.clientName)) {
    blockers.push("Add the client name to the lead.");
  }
  if (!safeString(lead?.projectAddress)) {
    blockers.push("Add the property address to the lead.");
  }
  if (lead?.customerReviewRequired === true) {
    blockers.push("Resolve the customer match before publishing.");
  }
  if (refs.leadCoreForm?.classList.contains("is-dirty")) {
    blockers.push(
      "Save the lead details first so the client and property connection is current.",
    );
  }
  if (!safeString(estimateDraft.subject)) {
    blockers.push("Add an estimate title.");
  }
  if (!hasMeaningfulLineItem) {
    blockers.push("Add at least one priced estimate line item.");
  }
  if (calculatedSubtotal <= 0) {
    blockers.push("The estimate total must be greater than $0.");
  }

  if (startDate && completionDate && completionDate < startDate) {
    blockers.push("The completion date cannot be before the start date.");
  }

  const readyToSign = Boolean(
    !blockers.length && startDate && completionDate && hasClientEmail,
  );

  if (!startDate || !completionDate) {
    warnings.push(
      "This can be published for review, but signing stays unavailable until both project dates are saved.",
    );
  }
  if (!hasClientEmail) {
    warnings.push(
      "This can be published for review, but signing stays unavailable until a client email is saved to the lead.",
    );
  }
  if (!safeString(lead?.customerId)) {
    warnings.push(
      "No customer is linked yet. Publishing must connect this lead to its client record.",
    );
  }

  return {
    blockers,
    warnings,
    readyToSign,
    modeLabel: readyToSign ? "Ready for signature" : "Review only",
  };
}

function estimateWorkflowStatusMeta() {
  const workflow = state.estimateWorkflow;

  if (workflow.status === "unsaved") {
    return {
      label: "Unsaved",
      message:
        workflow.message ||
        "These browser edits have not been saved or published yet.",
    };
  }
  if (workflow.status === "saving") {
    return {
      label: "Saving",
      message:
        workflow.message ||
        "Saving this exact estimate to the selected lead.",
    };
  }
  if (workflow.status === "publishing") {
    return {
      label: "Publishing",
      message:
        workflow.message ||
        "The saved draft is being published as this lead's next client version.",
    };
  }
  if (workflow.status === "published") {
    return {
      label: "Published",
      message:
        workflow.message ||
        "This exact estimate is saved and published for the connected client.",
    };
  }
  if (workflow.status === "failed") {
    return {
      label: "Failed",
      message:
        workflow.error ||
        workflow.message ||
        "The estimate was not published. Your visible edits are still here.",
    };
  }
  if (workflow.status === "saved") {
    return {
      label: "Saved",
      message:
        workflow.message ||
        "This draft is saved to the selected lead and is not client-visible until published.",
    };
  }

  return {
    label: "Loading",
    message:
      workflow.message || "Loading the draft saved specifically for this lead.",
  };
}

function setEstimateEditorInteractivity(lead = currentLead()) {
  const editable = canEditEstimateForLead(lead);
  const busy = estimateOperationIsPending(lead?.id);
  const loading =
    safeString(state.estimateWorkflow.leadId) === safeString(lead?.id) &&
    state.estimateWorkflow.status === "loading";
  const readOnly = !editable || busy || loading;
  const textFields = [
    refs.estimateSubject,
    refs.estimateBody,
    refs.estimatePaymentSchedule,
    refs.estimateSpecialOrderMaterials,
    refs.estimateKnownSubcontractors,
    refs.estimateAssumptions,
  ];

  textFields.forEach((field) => {
    field.readOnly = readOnly;
  });
  refs.estimateStartDate.disabled = readOnly;
  refs.estimateCompletionDate.disabled = readOnly;
  refs.estimateLines
    .querySelectorAll("input, textarea, button[data-remove-line]")
    .forEach((field) => {
      field.disabled = readOnly;
    });
  refs.estimateAiButton.disabled = readOnly;
  refs.estimateAddLineButton.disabled = readOnly;
  if (refs.estimateMobileAddLineButton) {
    refs.estimateMobileAddLineButton.disabled = readOnly;
  }
}

function renderEstimateWorkflowStatus(lead = currentLead()) {
  if (!refs.estimateSaveState || !refs.estimatePublishPreflight) {
    return;
  }

  const leadId = safeString(lead?.id);
  const boundToLead = Boolean(leadId && estimateEditorIsBoundToLead(leadId));
  const draft = boundToLead ? currentVisibleEstimateDraft(lead) : null;
  const readiness = estimatePublishReadiness(lead, draft || {});
  const busy = estimateOperationIsPending(leadId);
  const currentShare = state.estimateShare;
  const matchesPublished = Boolean(
    draft &&
      currentShare &&
      estimateDraftMatchesShareSnapshot(draft, currentShare),
  );
  if (
    matchesPublished &&
    safeString(currentShare?.status) === "active" &&
    !state.estimateWorkflow.dirty &&
    !busy &&
    ["loading", "saved"].includes(state.estimateWorkflow.status)
  ) {
    state.estimateWorkflow = {
      ...state.estimateWorkflow,
      status: "published",
      message:
        "This saved draft is the exact version currently published to the client.",
      error: "",
      lastPublishedShareId: safeString(currentShare.id),
    };
  }
  const statusMeta = estimateWorkflowStatusMeta();
  const leadIdentity = lead
    ? [
        safeString(lead.clientName) || "Client name missing",
        safeString(lead.projectAddress) || "Property address missing",
        leadId ? `Lead ${leadId.slice(-6)}` : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "Select a lead";
  const lineItemCount = Array.isArray(draft?.lineItems)
    ? draft.lineItems.length
    : 0;
  const versionLabel = currentShare
    ? matchesPublished
      ? "Matches published"
      : state.estimateWorkflow.dirty
        ? "Unpublished edits"
        : "Newer saved draft"
    : state.estimateWorkflow.dirty
      ? "Unsaved draft"
      : "Draft only";
  const clientLabel = lead?.customerReviewRequired
    ? "Match needs review"
    : lead?.customerId
      ? safeString(lead.customerName) || "Linked client"
      : "Link client at publish";

  refs.estimateWorkflowIdentity.textContent = leadIdentity;
  refs.estimateSaveState.textContent = statusMeta.label;
  refs.estimateSaveState.dataset.state = state.estimateWorkflow.status;
  refs.estimateWorkflowMessage.textContent = statusMeta.message;
  refs.estimateSharePanel.setAttribute("aria-busy", String(busy));
  refs.estimatePublishPreflight.innerHTML = `
    <div class="estimate-preflight-item">
      <span>Current version</span>
      <strong>${escapeHtml(versionLabel)}</strong>
    </div>
    <div class="estimate-preflight-item">
      <span>Scope</span>
      <strong>${escapeHtml(`${lineItemCount} item${lineItemCount === 1 ? "" : "s"} · ${formatCurrency(draft?.subtotal || 0)}`)}</strong>
    </div>
    <div class="estimate-preflight-item ${lead?.customerReviewRequired ? "is-blocked" : ""}">
      <span>Connected client</span>
      <strong>${escapeHtml(clientLabel)}</strong>
    </div>
    <div class="estimate-preflight-item ${readiness.readyToSign ? "" : "is-warning"}">
      <span>Client action</span>
      <strong>${escapeHtml(readiness.modeLabel)}</strong>
    </div>
    ${
      readiness.blockers.length
        ? `<div class="estimate-preflight-item is-blocked"><span>Before publishing</span><strong>${escapeHtml(readiness.blockers.join(" "))}</strong></div>`
        : readiness.warnings.length
          ? `<div class="estimate-preflight-item is-warning"><span>Publishing note</span><strong>${escapeHtml(readiness.warnings.join(" "))}</strong></div>`
          : ""
    }
  `;

  const canPublish = Boolean(
    isAdmin() &&
      leadId &&
      boundToLead &&
      !busy &&
      state.estimateWorkflow.status !== "loading" &&
      !readiness.blockers.length,
  );
  const idlePublishLabel =
    safeString(currentShare?.status) === "active"
      ? "Save & replace live version"
      : safeString(currentShare?.status) === "signed"
        ? "Save & publish revision"
        : "Save & publish exact version";
  refs.estimateShareCreateButton.textContent =
    state.estimateWorkflow.operation === "publish" &&
    state.estimateWorkflow.status === "saving"
      ? "Saving current estimate…"
      : state.estimateWorkflow.operation === "publish" &&
          state.estimateWorkflow.status === "publishing"
        ? "Publishing exact version…"
        : idlePublishLabel;
  refs.estimateShareCreateButton.disabled = !canPublish;
  refs.estimateSaveButtons.forEach((button) => {
    if (!button.dataset.idleLabel) {
      button.dataset.idleLabel = button.textContent.trim();
    }
    button.textContent =
      state.estimateWorkflow.operation === "save" &&
      state.estimateWorkflow.status === "saving"
        ? "Saving…"
        : button.dataset.idleLabel;
    button.disabled =
      !canEditEstimateForLead(lead) ||
      !boundToLead ||
      busy ||
      state.estimateWorkflow.status === "loading";
  });
  setEstimateEditorInteractivity(lead);
}

function collectEstimateForm() {
  const lineItems = Array.from(
    refs.estimateLines.querySelectorAll(".line-item-row"),
  )
    .map((row) => {
      const label = row.querySelector('[data-line-field="label"]').value.trim();
      const description = row
        .querySelector('[data-line-field="description"]')
        .value.trim();
      const amount = toNumber(
        row.querySelector('[data-line-field="amount"]').value,
      );
      return { label, description, amount };
    })
    .filter((item) => item.label || item.description || item.amount);

  const subtotal = lineItems.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0,
  );

  return {
    subject: refs.estimateSubject.value.trim(),
    emailBody: refs.estimateBody.value.trim(),
    contractDetails: {
      approximateStartDate: refs.estimateStartDate.value,
      approximateCompletionDate: refs.estimateCompletionDate.value,
      paymentSchedule: refs.estimatePaymentSchedule.value.trim(),
      specialOrderMaterials: refs.estimateSpecialOrderMaterials.value.trim(),
      knownSubcontractors: refs.estimateKnownSubcontractors.value.trim(),
    },
    assumptions: refs.estimateAssumptions.value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
    lineItems,
    subtotal: Number(subtotal.toFixed(2)),
  };
}

function defaultEstimateTitle(lead) {
  const template = state.template || EMPTY_TEMPLATE;
  return (template.subjectTemplate || EMPTY_TEMPLATE.subjectTemplate)
    .replace("{{projectType}}", safeString(lead?.projectType) || "your project")
    .replace(
      "{{projectAddress}}",
      safeString(lead?.projectAddress) || "your property",
    );
}

function estimateOverviewParagraphs(
  estimateDraft,
  template = state.template || EMPTY_TEMPLATE,
) {
  return (safeString(estimateDraft.emailBody) || safeString(template.intro))
    .split("\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function normaliseEstimateCompareValue(value) {
  return safeString(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function normaliseEstimateLineItemsForCompare(lineItems = []) {
  return (Array.isArray(lineItems) ? lineItems : [])
    .map((item) => ({
      label: normaliseEstimateCompareValue(item?.label || item?.title),
      description: normaliseEstimateCompareValue(
        item?.description || item?.note,
      ),
      amount: Number(toNumber(item?.amount).toFixed(2)),
    }))
    .filter((item) => item.label || item.description || item.amount);
}

function normaliseEstimateAssumptionsForCompare(assumptions = []) {
  return (Array.isArray(assumptions) ? assumptions : [])
    .map((item) => normaliseEstimateCompareValue(item))
    .filter(Boolean);
}

function normaliseEstimateContractDetailsForCompare(details = {}) {
  return {
    approximateStartDate: normaliseEstimateCompareValue(
      details?.approximateStartDate,
    ),
    approximateCompletionDate: normaliseEstimateCompareValue(
      details?.approximateCompletionDate,
    ),
    paymentSchedule: normaliseEstimateCompareValue(details?.paymentSchedule),
    specialOrderMaterials: normaliseEstimateCompareValue(
      details?.specialOrderMaterials,
    ),
    knownSubcontractors: normaliseEstimateCompareValue(
      details?.knownSubcontractors,
    ),
  };
}

function estimateDraftMatchesShareSnapshot(estimateDraft = {}, share = {}) {
  if (safeString(share?.type || "estimate") !== "estimate") {
    return false;
  }

  const shareSnapshot = share?.estimateSnapshot || share || {};
  const estimateSubject = normaliseEstimateCompareValue(estimateDraft?.subject);
  const shareSubject = normaliseEstimateCompareValue(shareSnapshot?.subject);

  if (!estimateSubject || !shareSubject) {
    return false;
  }

  return (
    estimateSubject === shareSubject &&
    normaliseEstimateCompareValue(estimateDraft?.emailBody) ===
      normaliseEstimateCompareValue(shareSnapshot?.emailBody) &&
    Number(toNumber(estimateDraft?.subtotal).toFixed(2)) ===
      Number(toNumber(shareSnapshot?.subtotal).toFixed(2)) &&
    JSON.stringify(
      normaliseEstimateAssumptionsForCompare(estimateDraft?.assumptions),
    ) ===
      JSON.stringify(
        normaliseEstimateAssumptionsForCompare(shareSnapshot?.assumptions),
      ) &&
    JSON.stringify(
      normaliseEstimateLineItemsForCompare(estimateDraft?.lineItems),
    ) ===
      JSON.stringify(
        normaliseEstimateLineItemsForCompare(shareSnapshot?.lineItems),
      ) &&
    JSON.stringify(
      normaliseEstimateContractDetailsForCompare(
        estimateDraft?.contractDetails,
      ),
    ) ===
      JSON.stringify(
        normaliseEstimateContractDetailsForCompare(
          shareSnapshot?.contractDetails,
        ),
      )
  );
}

function splitEstimateMultilineText(value) {
  return safeString(value)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function estimateTemplateTermsText(
  template = state.template || EMPTY_TEMPLATE,
) {
  const storedTerms = safeString(template?.terms);
  const storedKey = normaliseEstimateCompareValue(storedTerms);
  const legacyKeys = new Set(
    LEGACY_ESTIMATE_TEMPLATE_TERMS.map(normaliseEstimateCompareValue),
  );

  if (!storedTerms || legacyKeys.has(storedKey)) {
    return EMPTY_TEMPLATE.terms;
  }

  return storedTerms;
}

function estimateStandardTerms(template = state.template || EMPTY_TEMPLATE) {
  return splitEstimateMultilineText(estimateTemplateTermsText(template));
}

function estimateProjectAssumptionList(
  estimateDraft,
  template = state.template || EMPTY_TEMPLATE,
) {
  const standardKeys = new Set(
    [...estimateStandardTerms(template), ...LEGACY_ESTIMATE_TEMPLATE_TERMS].map(
      normaliseEstimateCompareValue,
    ),
  );

  return (
    Array.isArray(estimateDraft.assumptions) ? estimateDraft.assumptions : []
  )
    .flatMap((item) => splitEstimateMultilineText(item))
    .filter((item) => !standardKeys.has(normaliseEstimateCompareValue(item)));
}

function estimateStandardTermsMarkup(
  template = state.template || EMPTY_TEMPLATE,
) {
  return estimateStandardTerms(template)
    .map(
      (item) => `<div class="estimate-standard-term">${escapeHtml(item)}</div>`,
    )
    .join("");
}

function goldenBrickLogoMarkup(extraClass = "") {
  const className = ["golden-brick-logo", extraClass].filter(Boolean).join(" ");

  return `
    <div class="${className}" aria-label="Golden Brick Construction">
        <svg class="golden-brick-mark" viewBox="0 0 120 58" aria-hidden="true">
            <rect x="44" y="1" width="32" height="14" rx="1.5"></rect>
            <rect x="24" y="22" width="32" height="14" rx="1.5"></rect>
            <rect x="64" y="22" width="32" height="14" rx="1.5"></rect>
            <rect x="4" y="43" width="32" height="14" rx="1.5"></rect>
            <rect x="44" y="43" width="32" height="14" rx="1.5"></rect>
            <rect x="84" y="43" width="32" height="14" rx="1.5"></rect>
        </svg>
        <span class="golden-brick-wordmark">
            <span class="golden-brick-name">Golden Brick</span>
            <span class="golden-brick-trade">Construction</span>
        </span>
    </div>
  `;
}

function estimateAgreementTitle(template = state.template || EMPTY_TEMPLATE) {
  const title = safeString(template?.agreementTitle);
  if (!title || LEGACY_AGREEMENT_TEMPLATE_TITLES.has(title)) {
    return EMPTY_TEMPLATE.agreementTitle;
  }
  return title;
}

function estimateAgreementIntro(template = state.template || EMPTY_TEMPLATE) {
  const intro = safeString(template?.agreementIntro);
  if (!intro || LEGACY_AGREEMENT_TEMPLATE_INTROS.has(intro)) {
    return EMPTY_TEMPLATE.agreementIntro;
  }
  return intro;
}

function estimateAgreementTermsText(
  template = state.template || EMPTY_TEMPLATE,
) {
  const terms = safeString(template?.agreementTerms);
  if (!terms || LEGACY_AGREEMENT_TEMPLATE_TERMS.has(terms)) {
    return EMPTY_TEMPLATE.agreementTerms;
  }
  return terms;
}

function estimateAgreementTerms(template = state.template || EMPTY_TEMPLATE) {
  return splitEstimateMultilineText(estimateAgreementTermsText(template));
}

function estimateShareStatusMeta(share = state.estimateShare) {
  const status = safeString(share?.status || "not_shared");

  if (status === "active") {
    return {
      label: "Live version",
      copy:
        "The private link opens this lead's exact published version. Later draft edits stay internal until you publish again.",
    };
  }

  if (status === "signed") {
    return {
      label: "Signed",
      copy: "The client completed the agreement and the signed document is archived.",
    };
  }

  if (status === "replaced") {
    return {
      label: "Replaced",
      copy: "A newer published estimate replaced this unsigned version.",
    };
  }

  if (status === "revoked") {
    return {
      label: "Revoked",
      copy: "This link is no longer available to the client.",
    };
  }

  return {
    label: "Not shared",
    copy:
      "No client version is live. Save and publish the estimate currently shown when it is ready for review.",
  };
}

function estimateSharePriority(share = {}) {
  const status = safeString(share.status);

  if (status === "active") return 0;
  if (status === "signed") return 1;
  if (status === "replaced") return 2;
  if (status === "revoked") return 3;
  return 4;
}

function pickCurrentEstimateShare(shares = []) {
  return [...shares].sort((left, right) => {
    const priorityDiff =
      estimateSharePriority(left) - estimateSharePriority(right);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return (
      toMillis(right.updatedAt || right.createdAt) -
      toMillis(left.updatedAt || left.createdAt)
    );
  })[0] || null;
}

function estimateShareUrl(shareId) {
  return shareId
    ? `${window.location.origin}/estimate/${encodeURIComponent(shareId)}`
    : "";
}

function hydrateEstimateShare(snapshot) {
  const share = {
    ...(snapshot.data() || {}),
    id: snapshot.id,
  };
  return {
    ...share,
    shareUrl: estimateShareUrl(share.id),
  };
}

async function fetchCurrentEstimateShare(leadId) {
  return pickCurrentEstimateShare(await fetchEstimateSharesForLead(leadId));
}

function sanitiseDownloadName(value) {
  return safeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function estimateDownloadFilename(lead, estimateDraft, extension = "pdf") {
  const preferredStem = sanitiseDownloadName(
    safeString(estimateDraft.subject) || defaultEstimateTitle(lead),
  );
  const fallbackStem = sanitiseDownloadName(
    [safeString(lead?.clientName), safeString(lead?.projectType), "estimate"]
      .filter(Boolean)
      .join(" "),
  );
  const dateStamp = formatDateOnlyInputValue(new Date()) || "estimate";
  const fileStem = preferredStem || fallbackStem || "golden-brick-estimate";
  return `${fileStem}-${dateStamp}.${extension}`;
}

function closeoutDocumentTitle(project) {
  const projectLabel =
    safeString(project?.projectAddress) ||
    safeString(project?.clientName) ||
    safeString(project?.projectType) ||
    "project";
  return `Project closeout packet for ${projectLabel}`;
}

function projectCloseoutDate(project) {
  return (
    project?.lockedCommissionSnapshot?.lockedAt ||
    project?.updatedAt ||
    project?.createdAt ||
    new Date()
  );
}

function closeoutDownloadFilename(project, extension = "pdf") {
  const preferredStem = sanitiseDownloadName(
    [
      safeString(project?.projectAddress),
      safeString(project?.clientName),
      "closeout-packet",
    ]
      .filter(Boolean)
      .join(" "),
  );
  const dateStamp =
    formatDateOnlyInputValue(projectCloseoutDate(project) || new Date()) ||
    formatDateOnlyInputValue(new Date()) ||
    "closeout";
  const fileStem = preferredStem || "golden-brick-closeout-packet";
  return `${fileStem}-${dateStamp}.${extension}`;
}

function projectIsPaidInFull(project) {
  if (!project) {
    return false;
  }

  const financials = projectFinancials(project);
  const totalRevenue = projectRevenueValue(project);
  const totalPayments = toNumber(financials.totalPayments || 0);
  return totalRevenue > 0 && totalPayments >= totalRevenue - 0.01;
}

function latestPaymentEntry(payments = []) {
  return payments
    .slice()
    .sort(
      (left, right) =>
        toMillis(right.relatedDate || right.createdAt) -
        toMillis(left.relatedDate || left.createdAt),
    )[0];
}

function buildProjectCloseoutScopeItems({
  project,
  scopeItems = [],
  estimate = null,
  linkedLead = null,
}) {
  if (scopeItems.length) {
    return scopeItems.map((item, index) => {
      const details = [safeString(item.description)];

      if (safeString(item.note)) {
        details.push(`Field closeout note: ${safeString(item.note)}`);
      }

      details.push(
        item.completed
          ? `Marked complete ${formatDateOnly(item.completedAt || item.updatedAt)}.`
          : "Not marked complete in the live scope tracker.",
      );

      return {
        label: scopeItemTitle(item, index),
        description: details.filter(Boolean).join(" "),
        amount: toNumber(item.amount),
      };
    });
  }

  const estimateItems = estimateScopeItems(estimate);
  if (estimateItems.length) {
    return estimateItems.map((item, index) => ({
      label: scopeItemTitle(item, index),
      description:
        safeString(item.description) ||
        "Completed scope carried from the linked estimate snapshot.",
      amount: toNumber(item.amount),
    }));
  }

  return [
    {
      label:
        safeString(project?.projectType) ||
        safeString(linkedLead?.projectType) ||
        "Completed scope",
      description:
        safeString(project?.planningNotes) ||
        safeString(project?.sharedStatusNote) ||
        "Golden Brick completed the work recorded in the live job file and is closing the project record for reference.",
      amount: projectRevenueValue(project),
    },
  ];
}

function buildTemplateEstimateDraft(lead) {
  const projectType = safeString(lead?.projectType).toLowerCase();
  const template = state.template || EMPTY_TEMPLATE;
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

  const subtotal = lineItems.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0,
  );

  return {
    subject: defaultEstimateTitle(lead),
    emailBody: [
      (template.greeting || EMPTY_TEMPLATE.greeting).replace(
        "{{clientName}}",
        safeString(lead?.clientName) || "there",
      ),
      "",
      template.intro || EMPTY_TEMPLATE.intro,
      "",
      "This is a planning estimate based on the information currently available. We can tighten the pricing further after a site review, finish confirmation, and final scope check.",
    ].join("\n"),
    contractDetails: {
      approximateStartDate: "",
      approximateCompletionDate: "",
      paymentSchedule: DEFAULT_CONTRACT_PAYMENT_SCHEDULE,
      specialOrderMaterials: DEFAULT_CONTRACT_SPECIAL_ORDER_MATERIALS,
      knownSubcontractors: DEFAULT_CONTRACT_SUBCONTRACTORS,
    },
    assumptions: [],
    lineItems,
    subtotal: Number(subtotal.toFixed(2)),
  };
}

function buildEstimatePreviewHtml(lead, estimateDraft) {
  const template = state.template || EMPTY_TEMPLATE;
  const leadName = safeString(lead?.clientName) || "Name to be confirmed";
  const greetingName = safeString(lead?.clientName) || "there";
  const title = safeString(estimateDraft.subject) || defaultEstimateTitle(lead);
  const overviewBlocks = estimateOverviewParagraphs(estimateDraft, template);
  const standardTerms = estimateStandardTerms(template);
  const contractDetails = contractDetailsForEstimate(estimateDraft);
  const contractRows = contractDetailsRows(lead, estimateDraft);
  const projectAssumptions = estimateProjectAssumptionList(
    estimateDraft,
    template,
  );
  const lineItems = Array.isArray(estimateDraft.lineItems)
    ? estimateDraft.lineItems
    : [];
  const rows = lineItems.length
    ? lineItems
        .map(
          (item) => `
            <tr>
                <td>
                    <strong>${escapeHtml(item.label || "Line item")}</strong>
                    <span>${escapeHtml(item.description || "Scope to be confirmed.")}</span>
                </td>
                <td>${escapeHtml(formatCurrency(item.amount || 0))}</td>
            </tr>
        `,
        )
        .join("")
    : `
            <tr>
                <td>
                    <strong>Scope pending</strong>
                    <span>Add line items or create a draft estimate to start the scope.</span>
                </td>
                <td>${escapeHtml(formatCurrency(0))}</td>
            </tr>
        `;
  const preparedDate = formatDateOnly(new Date());

  return `
        <article class="estimate-sheet">
            <header class="estimate-sheet-header">
                <div class="estimate-brand-bar">
                    <div class="estimate-company-lockup">
                        ${goldenBrickLogoMarkup("estimate-document-logo")}
                        <div class="estimate-eyebrow">Project estimate</div>
                        <h3>${escapeHtml(title)}</h3>
                        <p class="estimate-subtitle">Prepared by Golden Brick Construction for a clear review of scope, pricing, terms, and next steps.</p>
                        <p class="estimate-greeting">${escapeHtml((template.greeting || EMPTY_TEMPLATE.greeting).replace("{{clientName}}", greetingName))}</p>
                    </div>
                </div>
                <div class="estimate-company-card">
                    <div class="estimate-contact-row">
                        <span>Prepared by</span>
                        <strong>${escapeHtml(COMPANY_INFO.name)}</strong>
                    </div>
                    <div class="estimate-contact-list">
                        <div class="estimate-contact-row">
                            <span>Email</span>
                            <strong>${escapeHtml(COMPANY_INFO.email)}</strong>
                        </div>
                        <div class="estimate-contact-row">
                            <span>Phone</span>
                            <strong>${escapeHtml(COMPANY_INFO.phone)}</strong>
                        </div>
                        <div class="estimate-contact-row">
                            <span>Date</span>
                            <strong>${escapeHtml(preparedDate)}</strong>
                        </div>
                    </div>
                </div>
            </header>

            <section class="estimate-project-grid">
                <article class="estimate-project-card">
                    <span>Prepared for</span>
                    <strong>${escapeHtml(leadName)}</strong>
                </article>
                <article class="estimate-project-card">
                    <span>Project address</span>
                    <strong>${escapeHtml(lead?.projectAddress || "To be confirmed")}</strong>
                </article>
                <article class="estimate-project-card">
                    <span>Project type</span>
                    <strong>${escapeHtml(lead?.projectType || "General scope")}</strong>
                </article>
                <article class="estimate-project-card">
                    <span>Estimated total</span>
                    <strong>${escapeHtml(formatCurrency(estimateDraft.subtotal || 0))}</strong>
                </article>
            </section>

            <section class="estimate-section">
                <div class="estimate-section-heading">
                    <h4>Estimate overview</h4>
                    <p>Scope and pricing notes prepared for this project.</p>
                </div>
                <div class="estimate-section-shell">
                    <div class="estimate-copy-block">
                        ${overviewBlocks.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
                    </div>
                </div>
            </section>

            <section class="estimate-section">
                <div class="estimate-section-heading">
                    <h4>Scope and pricing</h4>
                    <p>Each scope line contributes to the estimated total shown below.</p>
                </div>
                <div class="estimate-section-shell">
                    <table class="estimate-table">
                        <thead>
                            <tr>
                                <th>Scope</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </section>

            <section class="estimate-section">
                <div class="estimate-total-panel">
                    <span>Estimated total</span>
                    <strong>${escapeHtml(formatCurrency(estimateDraft.subtotal || 0))}</strong>
                    <p>This working estimate reflects the current scope and will be refined further if final selections, field measurements, or access conditions shift.</p>
                </div>
            </section>

            <section class="estimate-section">
                <div class="estimate-section-heading">
                    <h4>Agreement details</h4>
                    <p>Project agreement details that accompany this estimate.</p>
                </div>
                <div class="estimate-project-grid estimate-contract-grid">
                    ${contractRows.map((item) => `
                        <article class="estimate-project-card">
                            <span>${escapeHtml(item.label)}</span>
                            <strong>${escapeHtml(item.value)}</strong>
                        </article>
                    `).join("")}
                </div>
                <div class="estimate-section-shell">
                    <div class="estimate-copy-block">
                        <p><strong>Deposit / payment terms:</strong> ${escapeHtml(contractDetails.paymentSchedule)}</p>
                        <p><strong>Special-order material advance:</strong> ${escapeHtml(contractDetails.specialOrderMaterials)}</p>
                        <p><strong>Known subcontractors:</strong> ${escapeHtml(contractDetails.knownSubcontractors)}</p>
                        <p><strong>Insurance disclosure:</strong> ${escapeHtml(contractDetails.insuranceDisclosure)}</p>
                    </div>
                </div>
            </section>

            <section class="estimate-foot">
                <div class="estimate-section">
                    <div class="estimate-section-heading">
                        <h4>Standard terms</h4>
                        <p>Standard terms included with this estimate.</p>
                    </div>
                    <div class="estimate-section-shell">
                        <div class="estimate-standard-terms-list">
                            ${standardTerms.map((item) => `<div class="estimate-standard-term">${escapeHtml(item)}</div>`).join("")}
                        </div>
                    </div>
                </div>

                <div class="estimate-section">
                    <div class="estimate-section-heading">
                        <h4>Project notes and exclusions</h4>
                        <p>Project-specific notes, exclusions, or selection assumptions recorded with this estimate.</p>
                    </div>
                    <div class="estimate-section-shell">
                        ${
                          projectAssumptions.length
                            ? `<ul class="estimate-assumption-list">${projectAssumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
                            : `<div class="estimate-note-empty">No project-specific notes or exclusions have been added yet.</div>`
                        }
                    </div>
                </div>
            </section>

            <section class="estimate-section">
                <div class="estimate-next-step">
                    <div class="estimate-section-heading">
                        <h4>Next step</h4>
                        <p>${escapeHtml(template.outro || EMPTY_TEMPLATE.outro)}</p>
                    </div>
                </div>
            </section>

            <footer class="estimate-print-foot">
                <div>
                    <strong>${escapeHtml(COMPANY_INFO.name)}</strong>
                    <div>${escapeHtml(COMPANY_INFO.email)} · ${escapeHtml(COMPANY_INFO.phone)}</div>
                </div>
                <div>Prepared by Golden Brick Construction.</div>
            </footer>
        </article>
    `;
}

function buildEstimatePlainText(lead, estimateDraft) {
  const template = state.template || EMPTY_TEMPLATE;
  const standardTerms = estimateStandardTerms(template);
  const contractDetails = contractDetailsForEstimate(estimateDraft);
  const projectAssumptions = estimateProjectAssumptionList(
    estimateDraft,
    template,
  );

  return [
    COMPANY_INFO.name,
    `Email: ${COMPANY_INFO.email}`,
    `Phone: ${COMPANY_INFO.phone}`,
    "",
    safeString(estimateDraft.subject) || defaultEstimateTitle(lead),
    "",
    `Prepared: ${formatDateOnly(new Date())}`,
    `Prepared For: ${safeString(lead?.clientName) || "Name to be confirmed"}`,
    "Project Address: " +
      (safeString(lead?.projectAddress) || "To be confirmed"),
    "Project Type: " + (safeString(lead?.projectType) || "General scope"),
    "",
    (template.greeting || EMPTY_TEMPLATE.greeting).replace(
      "{{clientName}}",
      safeString(lead?.clientName) || "there",
    ),
    "",
    "Estimate Overview",
    safeString(estimateDraft.emailBody) || safeString(template.intro),
    "",
    "Scope and Pricing",
    (estimateDraft.lineItems || [])
      .map((item) => {
        return [
          `- ${item.label || "Line item"}: ${formatCurrency(item.amount || 0)}`,
          item.description ? `  ${item.description}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n") || "- Scope pending",
    "",
    "Estimated Total: " + formatCurrency(estimateDraft.subtotal || 0),
    "",
    "Agreement Details",
    `Contractor: ${COMPANY_INFO.name}`,
    `Contractor Business Address: ${contractDetails.contractorBusinessAddress}`,
    `Pennsylvania Home Improvement Contractor Registration: ${contractDetails.paRegistrationNumber}`,
    `Philadelphia General Contractor License: #${contractDetails.philadelphiaLicenseNumber}`,
    `Approximate Start Date: ${contractDateDisplay(contractDetails.approximateStartDate)}`,
    `Approximate Completion Date: ${contractDateDisplay(contractDetails.approximateCompletionDate)}`,
    `Deposit / Payment Terms: ${contractDetails.paymentSchedule}`,
    `Special-Order Material Advance: ${contractDetails.specialOrderMaterials}`,
    `Known Subcontractors: ${contractDetails.knownSubcontractors}`,
    `Insurance Disclosure: ${contractDetails.insuranceDisclosure}`,
    "",
    "Standard Terms",
    standardTerms.length
      ? standardTerms.map((item) => `- ${item}`).join("\n")
      : "- None listed",
    "",
    "Project Notes and Exclusions",
    projectAssumptions.length
      ? projectAssumptions.map((item) => `- ${item}`).join("\n")
      : "- None added",
    "",
    "Next step",
    safeString(template.outro || EMPTY_TEMPLATE.outro),
    "",
    `${COMPANY_INFO.name} · ${COMPANY_INFO.email} · ${COMPANY_INFO.phone}`,
  ].join("\n");
}

function buildEstimateDocumentHtml(lead, estimateDraft) {
  const previewHtml = buildEstimatePreviewHtml(lead, estimateDraft);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(defaultEstimateTitle(lead))}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --paper: #ffffff;
            --ink: #17120d;
            --muted: #514b43;
            --line: #e5ded2;
            --brand: #c5a059;
            --brand-deep: #765928;
            --surface: #faf8f4;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 32px;
            background: #f4f5f1;
            color: var(--ink);
            font-family: "Manrope", Arial, sans-serif;
        }
        .estimate-sheet {
            max-width: 960px;
            margin: 0 auto;
            padding: 34px;
            background: var(--paper);
            border: 1px solid var(--line);
            border-top: 4px solid var(--brand);
            border-radius: 10px;
            box-shadow: 0 20px 40px rgba(24, 19, 15, 0.08);
        }
        .estimate-sheet-header {
            display: grid;
            grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
            gap: 24px;
            align-items: start;
            margin-bottom: 24px;
        }
        .estimate-brand-bar,
        .estimate-company-lockup,
        .estimate-company-card,
        .estimate-contact-list,
        .estimate-project-grid,
        .estimate-section,
        .estimate-section-heading {
            display: grid;
            gap: 12px;
        }
        .golden-brick-logo {
            display: inline-grid;
            gap: 8px;
            width: max-content;
            max-width: 100%;
            justify-items: center;
        }
        .golden-brick-mark {
            width: 108px;
            height: auto;
            fill: var(--brand);
        }
        .golden-brick-wordmark {
            display: grid;
            gap: 4px;
            justify-items: center;
        }
        .golden-brick-name {
            color: var(--brand);
            font-family: "Times New Roman", Georgia, serif;
            font-size: 34px;
            line-height: 0.9;
            text-transform: uppercase;
            white-space: nowrap;
        }
        .golden-brick-trade {
            display: flex;
            align-items: center;
            gap: 12px;
            color: var(--ink);
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            white-space: nowrap;
        }
        .golden-brick-trade::before,
        .golden-brick-trade::after {
            content: "";
            width: 42px;
            height: 2px;
            background: var(--brand);
        }
        .estimate-eyebrow {
            margin-top: 4px;
            margin-bottom: 4px;
            color: var(--brand-deep);
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
        }
        .estimate-sheet h3 {
            margin: 0 0 10px;
            font-family: "Fraunces", Georgia, serif;
            font-size: 30px;
            line-height: 1.1;
        }
        .estimate-subtitle {
            margin: 0;
            color: var(--muted);
        }
        .estimate-greeting,
        .estimate-copy-block p,
        .estimate-foot p,
        .estimate-foot li,
        .estimate-section-heading p,
        .estimate-print-foot,
        .estimate-total-panel p {
            color: var(--muted);
            line-height: 1.7;
        }
        .estimate-company-card,
        .estimate-section-shell,
        .estimate-next-step,
        .estimate-total-panel {
            padding: 20px;
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: 8px;
        }
        .estimate-contact-row,
        .estimate-project-card {
            display: grid;
            gap: 4px;
        }
        .estimate-contact-row span,
        .estimate-project-card span,
        .estimate-table th,
        .estimate-section-heading h4 {
            color: var(--brand-deep);
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
        }
        .estimate-contact-row strong,
        .estimate-project-card strong {
            display: block;
            margin-top: 6px;
            font-size: 15px;
            color: var(--ink);
        }
        .estimate-project-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            margin-bottom: 24px;
        }
        .estimate-project-card {
            padding: 18px;
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: 8px;
        }
        .estimate-copy-block {
            display: grid;
            gap: 12px;
        }
        .estimate-copy-block p {
            margin: 0;
        }
        .estimate-table {
            width: 100%;
            border-collapse: collapse;
            background: rgba(255, 255, 255, 0.96);
        }
        .estimate-table th,
        .estimate-table td {
            padding: 14px 0;
            border-bottom: 1px solid var(--line);
            vertical-align: top;
            text-align: left;
        }
        .estimate-table th:last-child,
        .estimate-table td:last-child {
            text-align: right;
            white-space: nowrap;
        }
        .estimate-table td span {
            display: block;
            margin-top: 6px;
            color: var(--muted);
            font-size: 14px;
        }
        .estimate-total-panel {
            display: grid;
            gap: 8px;
            background: #181510;
        }
        .estimate-total-panel span {
            color: #d8c9ae;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
        }
        .estimate-total-panel strong {
            color: #fffaf0;
            font-family: "Fraunces", Georgia, serif;
            font-size: 38px;
            line-height: 1;
        }
        .estimate-foot {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 24px;
            margin-top: 28px;
        }
        .estimate-standard-terms-list,
        .estimate-assumption-list,
        .estimate-foot ul {
            margin: 0;
            padding-left: 18px;
            display: grid;
            gap: 10px;
        }
        .estimate-standard-terms-list {
            padding-left: 0;
        }
        .estimate-standard-term,
        .estimate-note-empty {
            padding: 14px 16px;
            background: rgba(255, 253, 249, 0.95);
            border: 1px solid var(--line);
            color: var(--muted);
            line-height: 1.65;
        }
        .estimate-note-empty {
            border-style: dashed;
        }
        .estimate-print-foot {
            display: flex;
            justify-content: space-between;
            gap: 18px;
            align-items: flex-end;
            margin-top: 28px;
            padding-top: 18px;
            border-top: 1px solid var(--line);
            font-size: 14px;
        }
        .estimate-print-foot strong {
            color: var(--ink);
        }
        @media print {
            body {
                padding: 0;
                background: #ffffff;
            }
            .estimate-sheet {
                box-shadow: none;
                max-width: none;
                margin: 0;
            }
        }
        @media (max-width: 800px) {
            body {
                padding: 16px;
            }
            .estimate-sheet-header,
            .estimate-project-grid,
            .estimate-foot {
                grid-template-columns: 1fr;
            }
            .estimate-sheet {
                padding: 24px;
            }
            .estimate-print-foot {
                display: grid;
            }
        }
    </style>
</head>
<body>${previewHtml}</body>
</html>`;
}

function downloadBlobFile(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function downloadEstimateHtmlFallback(lead, estimateDraft) {
  const fileName = estimateDownloadFilename(lead, estimateDraft, "html");
  downloadBlobFile(
    fileName,
    buildEstimateDocumentHtml(lead, estimateDraft),
    "text/html;charset=utf-8",
  );
}

async function loadJsPdfModule() {
  if (!jsPdfModulePromise) {
    jsPdfModulePromise =
      import("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm");
  }

  return jsPdfModulePromise;
}

function applyEstimatePdfTopBar(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...ESTIMATE_PDF_THEME.brand);
  doc.rect(0, 0, pageWidth, 8, "F");
}

function ensureEstimatePdfSpace(doc, cursor, requiredHeight = 24) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (cursor.y + requiredHeight <= pageHeight - cursor.bottom) {
    return false;
  }

  doc.addPage();
  applyEstimatePdfTopBar(doc);
  cursor.y = cursor.top;
  return true;
}

function drawEstimatePdfFooter(doc, label = "Estimate") {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 54;
  const right = pageWidth - 54;
  const y = pageHeight - 34;

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setDrawColor(...ESTIMATE_PDF_THEME.line);
    doc.setLineWidth(0.7);
    doc.line(left, y - 14, right, y - 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
    doc.text(COMPANY_INFO.name, left, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...ESTIMATE_PDF_THEME.soft);
    doc.text(`${label} | Page ${pageNumber} of ${pageCount}`, right, y, {
      align: "right",
    });
  }
}

function drawEstimatePdfBrickMark(doc, x, y, scale = 0.43) {
  const bricks = [
    [44, 1, 32, 14],
    [24, 22, 32, 14],
    [64, 22, 32, 14],
    [4, 43, 32, 14],
    [44, 43, 32, 14],
    [84, 43, 32, 14],
  ];

  doc.setFillColor(...ESTIMATE_PDF_THEME.brand);
  bricks.forEach(([brickX, brickY, width, height]) => {
    doc.roundedRect(
      x + brickX * scale,
      y + brickY * scale,
      width * scale,
      height * scale,
      1,
      1,
      "F",
    );
  });
}

function drawEstimatePdfLogo(doc, x, y) {
  drawEstimatePdfBrickMark(doc, x, y + 1);

  const wordmarkX = x + 60;
  doc.setFont("times", "bold");
  doc.setFontSize(18.5);
  doc.setTextColor(...ESTIMATE_PDF_THEME.brand);
  doc.text("GOLDEN BRICK", wordmarkX, y + 17);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
  doc.text("CONSTRUCTION", wordmarkX + 38, y + 31);

  doc.setDrawColor(...ESTIMATE_PDF_THEME.brand);
  doc.setLineWidth(1.1);
  doc.line(wordmarkX, y + 28, wordmarkX + 28, y + 28);
  doc.line(wordmarkX + 126, y + 28, wordmarkX + 154, y + 28);
}

function drawEstimatePdfParagraph(
  doc,
  cursor,
  text,
  {
    fontSize = 11,
    lineHeight = 16,
    color = ESTIMATE_PDF_THEME.muted,
    fontStyle = "normal",
    gapAfter = 10,
    indent = 0,
    maxWidth = cursor.width,
  } = {},
) {
  const cleanText = safeString(text);
  if (!cleanText) {
    cursor.y += gapAfter;
    return;
  }

  doc.setFont("helvetica", fontStyle);
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(cleanText, maxWidth - indent);
  ensureEstimatePdfSpace(doc, cursor, lines.length * lineHeight + gapAfter);
  doc.text(lines, cursor.left + indent, cursor.y);
  cursor.y += lines.length * lineHeight + gapAfter;
}

function drawEstimatePdfSectionHeading(
  doc,
  cursor,
  title,
  copy = "",
  { gapBefore = 4 } = {},
) {
  cursor.y += gapBefore;
  ensureEstimatePdfSpace(doc, cursor, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...ESTIMATE_PDF_THEME.brandDeep);
  doc.text(String(title || "").toUpperCase(), cursor.left, cursor.y);
  cursor.y += 15;

  if (copy) {
    drawEstimatePdfParagraph(doc, cursor, copy, {
      fontSize: 10,
      lineHeight: 14,
      color: ESTIMATE_PDF_THEME.soft,
      gapAfter: 12,
    });
  }
}

function drawEstimatePdfBulletItem(doc, cursor, text) {
  const cleanText = safeString(text);
  if (!cleanText) {
    return;
  }

  const bulletIndent = 14;
  const lineHeight = 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...ESTIMATE_PDF_THEME.muted);
  const lines = doc.splitTextToSize(cleanText, cursor.width - bulletIndent);
  ensureEstimatePdfSpace(doc, cursor, lines.length * lineHeight + 8);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ESTIMATE_PDF_THEME.brandDeep);
  doc.text("•", cursor.left, cursor.y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...ESTIMATE_PDF_THEME.muted);
  doc.text(lines, cursor.left + bulletIndent, cursor.y);
  cursor.y += lines.length * lineHeight + 8;
}

function drawEstimatePdfMetaCards(
  doc,
  cursor,
  items,
  { columns = 2, cardHeight = 58, gap = 12 } = {},
) {
  const cardWidth = (cursor.width - gap * (columns - 1)) / columns;

  for (let index = 0; index < items.length; index += columns) {
    ensureEstimatePdfSpace(doc, cursor, cardHeight + gap);

    items.slice(index, index + columns).forEach((item, columnIndex) => {
      if (!item) return;

      const x = cursor.left + columnIndex * (cardWidth + gap);
      const y = cursor.y;

      doc.setFillColor(...ESTIMATE_PDF_THEME.panel);
      doc.setDrawColor(...ESTIMATE_PDF_THEME.line);
      doc.roundedRect(x, y, cardWidth, cardHeight, 6, 6, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...ESTIMATE_PDF_THEME.soft);
      doc.text(String(item.label || "").toUpperCase(), x + 12, y + 16);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(columns > 2 ? 10 : 12);
      doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
      const valueLines = doc.splitTextToSize(
        String(item.value || "Not set"),
        cardWidth - 24,
      );
      doc.text(valueLines.slice(0, 2), x + 12, y + 34);
    });

    cursor.y += cardHeight + gap;
  }
}

function estimatePdfDisplayTitle(value) {
  return (
    safeString(value)
      .replace(/^golden brick estimate for\s+/i, "")
      .replace(/^estimate for\s+/i, "")
      .trim() || "Project estimate"
  );
}

function drawEstimatePdfHero(doc, cursor, { title, preparedFor, subtotal }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - 54;
  const totalWidth = 168;
  const totalHeight = 62;
  const titleWidth = cursor.width - totalWidth - 28;
  const heroTop = cursor.y;

  drawEstimatePdfLogo(doc, cursor.left, heroTop);

  doc.setFillColor(...ESTIMATE_PDF_THEME.dark);
  doc.roundedRect(rightX - totalWidth, heroTop + 2, totalWidth, totalHeight, 7, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...ESTIMATE_PDF_THEME.brand);
  doc.text("ESTIMATED TOTAL", rightX - totalWidth + 14, heroTop + 23);
  doc.setFontSize(20);
  doc.setTextColor(...ESTIMATE_PDF_THEME.white);
  doc.text(formatCurrency(subtotal || 0), rightX - 14, heroTop + 49, {
    align: "right",
  });

  cursor.y = heroTop + 86;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(23);
  doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
  doc.text("Project Estimate", cursor.left, cursor.y);
  cursor.y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
  const titleLines = doc.splitTextToSize(
    estimatePdfDisplayTitle(title),
    titleWidth,
  );
  doc.text(titleLines.slice(0, 3), cursor.left, cursor.y);
  cursor.y += Math.min(titleLines.length, 3) * 17 + 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...ESTIMATE_PDF_THEME.muted);
  const subtitle = `${preparedFor} | ${COMPANY_INFO.email} | ${COMPANY_INFO.phone}`;
  doc.text(doc.splitTextToSize(subtitle, titleWidth), cursor.left, cursor.y);
  cursor.y += 35;
}

function drawEstimatePdfLineItems(
  doc,
  cursor,
  lineItems,
  subtotal,
  {
    heading = "Scope and pricing",
    copy = "Each scope line contributes to the estimated total shown below.",
    totalLabel = "Estimated Total",
  } = {},
) {
  const amountColumnWidth = 116;
  const titleWidth = cursor.width - amountColumnWidth - 32;
  const descriptionWidth = cursor.width - 28;

  function rowHeightFor(item) {
    const titleLines = doc.splitTextToSize(
      item.label || "Line item",
      titleWidth,
    );
    const descriptionLines = doc.splitTextToSize(
      item.description || "Scope to be confirmed.",
      descriptionWidth,
    );
    return Math.max(
      68,
      28 + titleLines.length * 13 + descriptionLines.length * 12,
    );
  }

  function drawTableHeader(continued = false) {
    ensureEstimatePdfSpace(doc, cursor, 32);
    doc.setDrawColor(...ESTIMATE_PDF_THEME.lineStrong);
    doc.setLineWidth(0.7);
    doc.line(cursor.left, cursor.y, cursor.left + cursor.width, cursor.y);
    cursor.y += 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...ESTIMATE_PDF_THEME.brandDeep);
    doc.text(continued ? "SCOPE CONTINUED" : "SCOPE", cursor.left, cursor.y);
    doc.text("AMOUNT", cursor.left + cursor.width, cursor.y, {
      align: "right",
    });
    cursor.y += 10;
    doc.setDrawColor(...ESTIMATE_PDF_THEME.line);
    doc.line(cursor.left, cursor.y, cursor.left + cursor.width, cursor.y);
    cursor.y += 12;
  }

  const firstRowHeight = lineItems.length ? rowHeightFor(lineItems[0]) : 68;
  ensureEstimatePdfSpace(doc, cursor, 80 + firstRowHeight);
  drawEstimatePdfSectionHeading(doc, cursor, heading, copy, { gapBefore: 8 });
  drawTableHeader(false);

  lineItems.forEach((item) => {
    const titleLines = doc.splitTextToSize(
      item.label || "Line item",
      titleWidth,
    );
    const descriptionLines = doc.splitTextToSize(
      item.description || "Scope to be confirmed.",
      descriptionWidth,
    );
    const rowHeight = rowHeightFor(item);

    if (ensureEstimatePdfSpace(doc, cursor, rowHeight + 18)) {
      drawTableHeader(true);
    }

    doc.setFillColor(...ESTIMATE_PDF_THEME.panel);
    doc.setDrawColor(...ESTIMATE_PDF_THEME.line);
    doc.roundedRect(cursor.left, cursor.y, cursor.width, rowHeight, 6, 6, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
    doc.text(titleLines, cursor.left + 14, cursor.y + 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.6);
    doc.setTextColor(...ESTIMATE_PDF_THEME.muted);
    doc.text(
      descriptionLines,
      cursor.left + 14,
      cursor.y + 20 + titleLines.length * 13,
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
    doc.text(
      formatCurrency(item.amount || 0),
      cursor.left + cursor.width - 14,
      cursor.y + 18,
      { align: "right" },
    );

    cursor.y += rowHeight + 10;
  });

  ensureEstimatePdfSpace(doc, cursor, 58);
  doc.setFillColor(...ESTIMATE_PDF_THEME.dark);
  doc.roundedRect(cursor.left, cursor.y, cursor.width, 46, 7, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...ESTIMATE_PDF_THEME.brand);
  doc.text(String(totalLabel || "Estimated Total").toUpperCase(), cursor.left + 16, cursor.y + 18);
  doc.setFontSize(18);
  doc.setTextColor(...ESTIMATE_PDF_THEME.white);
  doc.text(
    formatCurrency(subtotal || 0),
    cursor.left + cursor.width - 16,
    cursor.y + 30,
    { align: "right" },
  );
  cursor.y += 62;
}

function buildEstimatePdf(doc, lead, estimateDraft) {
  const title = safeString(estimateDraft.subject) || defaultEstimateTitle(lead);
  const leadName = safeString(lead?.clientName) || "Name to be confirmed";
  const preparedDate = formatDateOnly(new Date());
  const overviewBlocks = estimateOverviewParagraphs(estimateDraft);
  const standardTerms = estimateStandardTerms();
  const contractDetails = contractDetailsForEstimate(estimateDraft);
  const projectAssumptions = estimateProjectAssumptionList(estimateDraft);
  const lineItems =
    Array.isArray(estimateDraft.lineItems) && estimateDraft.lineItems.length
      ? estimateDraft.lineItems
      : [
          {
            label: "Scope pending",
            description:
              "Add line items or create a draft estimate to start the scope.",
            amount: 0,
          },
        ];

  buildPolishedEstimatePdf(doc, {
    title,
    preparedFor: leadName,
    preparedDate,
    projectAddress: safeString(lead?.projectAddress) || "To be confirmed",
    projectType: safeString(lead?.projectType) || "General scope",
    subtotal: estimateDraft.subtotal || 0,
    overviewBlocks,
    lineItems,
    agreementFacts: [
      {
        label: "Business address",
        value: contractDetails.contractorBusinessAddress,
      },
      {
        label: "Approx. start",
        value: contractDateDisplay(contractDetails.approximateStartDate),
      },
      {
        label: "Approx. completion",
        value: contractDateDisplay(contractDetails.approximateCompletionDate),
      },
    ],
    agreementNotes: [
      {
        label: "Payment terms",
        value: contractDetails.paymentSchedule,
      },
      {
        label: "Special-order materials",
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
    standardTerms,
    projectAssumptions,
    nextStep: safeString(state.template.outro || EMPTY_TEMPLATE.outro),
    company: COMPANY_INFO,
  });
}

function buildProjectCloseoutPdf(doc, context) {
  const {
    project,
    linkedLead,
    estimate,
    scopeItems,
    payments,
    approvedChangeOrders,
    financials,
    clientVisibleDocumentCount,
    clientVisiblePhotoCount,
    invoiceCount,
  } = context;
  const title = closeoutDocumentTitle(project);
  const closeoutDate = projectCloseoutDate(project);
  const closeoutScopeItems = buildProjectCloseoutScopeItems({
    project,
    scopeItems,
    estimate,
    linkedLead,
  });
  const scopeSubtotal = closeoutScopeItems.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0,
  );
  const estimateSubtotal = firstFiniteNumber(
    estimate?.subtotal,
    linkedLead?.estimateSubtotal,
    0,
  );
  const totalRevenue = projectRevenueValue(project);
  const totalPayments = toNumber(financials.totalPayments || 0);
  const balanceRemaining = Math.max(
    toNumber(financials.balanceRemaining || 0),
    0,
  );
  const lastPayment = latestPaymentEntry(payments);
  const changeOrderTotal = approvedChangeOrders.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0,
  );
  const overviewBlocks = estimate ? estimateOverviewParagraphs(estimate) : [];
  const projectAssumptions = estimate
    ? estimateProjectAssumptionList(estimate)
    : [];
  const cursor = {
    left: 54,
    top: 46,
    bottom: 52,
    width: doc.internal.pageSize.getWidth() - 108,
    y: 46,
  };

  doc.setProperties({
    title,
    subject: `${COMPANY_INFO.name} closeout packet`,
    author: COMPANY_INFO.name,
    creator: COMPANY_INFO.name,
  });

  applyEstimatePdfTopBar(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...ESTIMATE_PDF_THEME.brandDeep);
  doc.text(COMPANY_INFO.name.toUpperCase(), cursor.left, cursor.y);
  cursor.y += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
  const titleLines = doc.splitTextToSize(title, cursor.width);
  doc.text(titleLines, cursor.left, cursor.y);
  cursor.y += titleLines.length * 28;

  drawEstimatePdfParagraph(
    doc,
    cursor,
    "Final client closeout packet prepared from the live Golden Brick job record, estimate history, and project financials.",
    {
      fontSize: 11,
      lineHeight: 15,
      color: ESTIMATE_PDF_THEME.muted,
      gapAfter: 14,
    },
  );

  drawEstimatePdfMetaCards(doc, cursor, [
    {
      label: "Client",
      value: safeString(project?.clientName) || "Client",
    },
    {
      label: "Project address",
      value: safeString(project?.projectAddress) || "Property on file",
    },
    {
      label: "Project type",
      value:
        safeString(project?.projectType) ||
        safeString(linkedLead?.projectType) ||
        "Renovation project",
    },
    {
      label: "Closed on",
      value: formatDateOnly(closeoutDate),
    },
    {
      label: "Contract status",
      value: "Paid in full",
    },
    {
      label: "Final revenue",
      value: formatCurrency(totalRevenue),
    },
  ]);

  drawEstimatePdfSectionHeading(
    doc,
    cursor,
    "Thank you / closeout summary",
    "This packet closes the internal job record and gives the client a polished summary of the work, billing, and retained portal reference material.",
  );
  [
    `Thank you for trusting ${COMPANY_INFO.name} with ${clientPortalProjectLabel(project)}.`,
    `Based on the live job record, this project is marked complete and closed as of ${formatDateOnly(closeoutDate)}, and final payment has been received in full.`,
    estimate
      ? "The sections below preserve the original estimate direction, the final completed scope, any approved change orders, and the final paid receipt for the client file."
      : "The sections below preserve the final completed scope, any approved change orders, and the final paid receipt for the client file.",
  ].forEach((paragraph) => {
    drawEstimatePdfParagraph(doc, cursor, paragraph, {
      fontSize: 11,
      lineHeight: 16,
      color: ESTIMATE_PDF_THEME.muted,
      gapAfter: 10,
    });
  });

  if (overviewBlocks.length) {
    drawEstimatePdfSectionHeading(
      doc,
      cursor,
      "Original estimate direction",
      "This section carries forward the original estimate narrative that framed the work before delivery.",
    );
    overviewBlocks.forEach((paragraph) => {
      drawEstimatePdfParagraph(doc, cursor, paragraph, {
        fontSize: 11,
        lineHeight: 16,
        color: ESTIMATE_PDF_THEME.muted,
        gapAfter: 10,
      });
    });
  }

  drawEstimatePdfLineItems(doc, cursor, closeoutScopeItems, scopeSubtotal, {
    heading: "Completed scope",
    copy:
      "The completed scope below comes from the live job tracker when available, otherwise the linked estimate snapshot is used.",
    totalLabel: "Recorded scope value",
  });

  if (approvedChangeOrders.length) {
    drawEstimatePdfSectionHeading(
      doc,
      cursor,
      "Approved change orders",
      "Approved pricing revisions are listed separately so the final record is easy to audit later.",
    );
    approvedChangeOrders.forEach((item) => {
      const line = `${safeString(item.title || "Approved change order")} - ${formatCurrency(item.amount || 0)}${safeString(item.note) ? ` (${safeString(item.note)})` : ""}`;
      drawEstimatePdfBulletItem(doc, cursor, line);
    });
    cursor.y += 4;
  }

  drawEstimatePdfSectionHeading(
    doc,
    cursor,
    "Financial closeout",
    "This final ledger summary captures the estimate base, approved revisions, payments received, and the zero-balance closeout state.",
  );
  drawEstimatePdfMetaCards(doc, cursor, [
    {
      label: "Original estimate",
      value: formatCurrency(estimateSubtotal),
    },
    {
      label: "Approved change orders",
      value: formatCurrency(changeOrderTotal),
    },
    {
      label: "Final contract revenue",
      value: formatCurrency(totalRevenue),
    },
    {
      label: "Payments received",
      value: formatCurrency(totalPayments),
    },
    {
      label: "Balance remaining",
      value: formatCurrency(balanceRemaining),
    },
    {
      label: "Latest payment",
      value: lastPayment
        ? `${formatDateOnly(lastPayment.relatedDate || lastPayment.createdAt)}${safeString(lastPayment.method) ? ` · ${safeString(lastPayment.method)}` : ""}`
        : "Paid record saved",
    },
  ]);

  drawEstimatePdfSectionHeading(
    doc,
    cursor,
    "Portal record retained",
    "Most construction closeout packages keep supporting records together. This packet also points the client back to the portal record that stays live after completion.",
  );
  [
    `${invoiceCount} invoice${invoiceCount === 1 ? "" : "s"} retained in the job record.`,
    `${approvedChangeOrders.length} approved change order${approvedChangeOrders.length === 1 ? "" : "s"} retained with the project financial history.`,
    `${clientVisiblePhotoCount} client-visible progress photo${clientVisiblePhotoCount === 1 ? "" : "s"} available in the portal.`,
    `${clientVisibleDocumentCount} client-visible document${clientVisibleDocumentCount === 1 ? "" : "s"} available in the portal after closeout.`,
  ].forEach((item) => {
    drawEstimatePdfBulletItem(doc, cursor, item);
  });
  cursor.y += 4;

  if (projectAssumptions.length) {
    drawEstimatePdfSectionHeading(
      doc,
      cursor,
      "Estimate assumptions carried into the file",
      "These estimate-specific notes stay with the closed record for future reference.",
    );
    projectAssumptions.forEach((item) => {
      drawEstimatePdfBulletItem(doc, cursor, item);
    });
    cursor.y += 4;
  }

  drawEstimatePdfSectionHeading(
    doc,
    cursor,
    "Final paid receipt and contractor waiver",
    "This section gives the client a clean paid-in-full record while keeping the waiver language tied to payment actually received.",
  );
  [
    `Golden Brick's internal ledger reflects that the work described in this packet has been paid in full as of ${formatDateOnly(lastPayment?.relatedDate || closeoutDate)}.`,
    `To the extent permitted by applicable law and only to the extent that payment has actually been received, ${COMPANY_INFO.name} waives and releases any mechanics' lien rights it may have against the property described in this packet for labor, services, materials, and equipment furnished by Golden Brick through the closeout date shown above.`,
    "This packet covers Golden Brick's own project record only. Any separate subcontractor, vendor, supplier, lender, title-company, or contract-required waiver forms should be handled separately in writing if requested.",
  ].forEach((paragraph) => {
    drawEstimatePdfParagraph(doc, cursor, paragraph, {
      fontSize: 11,
      lineHeight: 16,
      color: ESTIMATE_PDF_THEME.muted,
      gapAfter: 10,
    });
  });

  ensureEstimatePdfSpace(doc, cursor, 32);
  doc.setDrawColor(...ESTIMATE_PDF_THEME.line);
  doc.line(cursor.left, cursor.y, cursor.left + cursor.width, cursor.y);
  cursor.y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
  doc.text(COMPANY_INFO.name, cursor.left, cursor.y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...ESTIMATE_PDF_THEME.muted);
  doc.text(
    `${COMPANY_INFO.email} | ${COMPANY_INFO.phone}`,
    cursor.left + cursor.width,
    cursor.y,
    { align: "right" },
  );
}

function renderEstimateLines(lineItems) {
  const rows = lineItems.length
    ? lineItems
    : [{ label: "", description: "", amount: "" }];
  const editable =
    canEditEstimateForLead() && !estimateOperationIsPending(state.selectedLeadId);

  refs.estimateLines.innerHTML = rows
    .map(
      (item, index) => `
        <div class="line-item-row" data-line-index="${index}">
            <div class="line-item-main-fields">
                <label class="line-item-field">
                    <span>Line item</span>
                    <input type="text" data-line-field="label" value="${escapeHtml(item.label || "")}" placeholder="Cabinet install, demolition, tile package, trim, etc." ${editable ? "" : "disabled"}>
                </label>
                <label class="line-item-field line-item-amount-field">
                    <span>Amount</span>
                    <input type="number" data-line-field="amount" value="${escapeHtml(item.amount ?? "")}" min="0" step="0.01" placeholder="0.00" ${editable ? "" : "disabled"}>
                </label>
            </div>
            <label class="line-item-field line-item-description-field">
                <span>What's included</span>
                <textarea data-line-field="description" rows="4" placeholder="Spell out what is included, material level, prep, installation, and closeout details so the client can understand the scope." ${editable ? "" : "disabled"}>${escapeHtml(item.description || "")}</textarea>
            </label>
            <div class="line-item-actions">
                <button type="button" class="ghost-button" data-remove-line="${index}" ${editable ? "" : "hidden disabled"}>Remove</button>
            </div>
        </div>
    `,
    )
    .join("");

  Array.from(refs.estimateLines.querySelectorAll("[data-remove-line]")).forEach(
    (button) => {
      button.addEventListener("click", () => {
        const lines = collectEstimateForm().lineItems;
        lines.splice(Number(button.dataset.removeLine), 1);
        renderEstimateLines(lines);
        markEstimateDirty();
        updateEstimatePreview();
      });
    },
  );

  Array.from(refs.estimateLines.querySelectorAll("input, textarea")).forEach(
    (field) => {
      if (field.tagName === "TEXTAREA") {
        field.style.height = "auto";
        field.style.height = `${Math.max(field.scrollHeight, 110)}px`;
      }
      field.addEventListener("input", () => {
        if (field.tagName === "TEXTAREA") {
          field.style.height = "auto";
          field.style.height = `${Math.max(field.scrollHeight, 110)}px`;
        }
        updateEstimatePreview();
      });
    },
  );
}

function updateEstimatePreview() {
  const lead = currentLead();
  if (!lead) {
    refs.estimatePreview.innerHTML = `<div class="empty-note">Save or select a lead to preview the estimate.</div>`;
    refs.estimateSubtotal.textContent = formatCurrency(0);
    return;
  }

  const estimate = collectEstimateForm();
  refs.estimateSubtotal.textContent = formatCurrency(estimate.subtotal);
  refs.estimatePreview.innerHTML = buildEstimatePreviewHtml(lead, estimate);
  renderEstimateWorkflowStatus(lead);
}

function addEstimateLineItem() {
  if (!canEditEstimateForLead()) {
    showToast("Select an assigned lead before editing the estimate.", "error");
    return;
  }
  const lines = collectEstimateForm().lineItems;
  lines.push({ label: "", description: "", amount: "" });
  renderEstimateLines(lines);
  markEstimateDirty();
  updateEstimatePreview();
  const lastLine = refs.estimateLines.querySelector(
    ".line-item-row:last-child input",
  );
  queueFocus(lastLine);
}

function renderEstimateSharePanel(lead = currentLead()) {
  const share = state.estimateShare;
  const statusMeta = estimateShareStatusMeta(share);
  const linkAvailable = ["active", "signed"].includes(
    safeString(share?.status || ""),
  );
  const detailBits = [];
  const estimateDraft = currentVisibleEstimateDraft(lead);
  const draftMatchesShare = estimateDraftMatchesShareSnapshot(
    estimateDraft,
    share,
  );

  if (share?.createdAt) {
    detailBits.push(`Created ${formatDateTime(share.createdAt)}`);
  }
  if (share?.lastViewedAt) {
    detailBits.push(`Last viewed ${formatDateTime(share.lastViewedAt)}`);
  }
  if (share?.signedAt) {
    detailBits.push(`Signed ${formatDateTime(share.signedAt)}`);
  }
  if (share?.replacedAt) {
    detailBits.push(`Replaced ${formatDateTime(share.replacedAt)}`);
  }
  if (share?.revokedAt) {
    detailBits.push(`Revoked ${formatDateTime(share.revokedAt)}`);
  }

  if (safeString(share?.status) === "active" && estimateDraft) {
    detailBits.unshift(
      draftMatchesShare
        ? "The estimate shown matches the live client version"
        : state.estimateWorkflow.dirty
          ? "The estimate shown has unsaved edits that are not live"
          : "The saved draft has newer edits than the live client version",
    );
  }

  if (safeString(share?.status) === "signed" && estimateDraft) {
    detailBits.unshift(
      draftMatchesShare
        ? "This signed version matches the estimate shown"
        : state.estimateWorkflow.dirty
          ? "The estimate shown has unsaved edits newer than the signed record"
          : "This signed version is older than the current saved draft",
    );
  }

  refs.estimateShareStatusPill.textContent = statusMeta.label;
  refs.estimateShareMeta.textContent = detailBits.length
    ? `${statusMeta.copy} ${detailBits.join(" · ")}`
    : statusMeta.copy;
  refs.estimateShareLinkInput.value = linkAvailable ? share?.shareUrl || "" : "";
  refs.estimateShareLinkInput.placeholder = linkAvailable && share?.shareUrl
    ? ""
    : "No active link yet";

  const canShareLead = Boolean(
    lead?.id && estimateDraft,
  );
  refs.estimateShareCreateButton.disabled =
    !isAdmin() || !canShareLead || estimateOperationIsPending(lead?.id);
  refs.estimateShareCopyButton.disabled = !linkAvailable || !share?.shareUrl;
  refs.estimateShareRevokeButton.disabled =
    !isAdmin() ||
    estimateOperationIsPending(lead?.id) ||
    safeString(share?.status) !== "active";
  refs.estimateShareCreateButton.textContent =
    share?.status === "active"
      ? "Save & replace live version"
      : share?.status === "signed"
        ? "Save & publish revision"
        : "Save & publish exact version";
  renderEstimateWorkflowStatus(lead);
}

function renderLeadEstimateClientRecords(lead = currentLead()) {
  if (!lead?.id) {
    refs.leadEstimateClientSummary.innerHTML = "";
    renderEmptyList(
      refs.leadEstimateClientList,
      "Select a lead to review what the client can see.",
    );
    return;
  }

  const shares = estimateSharesForLead(lead.id);
  const currentShare = pickCurrentEstimateShare(shares);
  const currentShareStatus = safeString(currentShare?.status);
  const currentDraft = currentVisibleEstimateDraft(lead);
  const currentDraftMatchesShare = estimateDraftMatchesShareSnapshot(
    currentDraft,
    currentShare,
  );
  const activeShares = shares.filter(
    (share) => safeString(share.status) === "active",
  );
  const signedShares = shares.filter(
    (share) => safeString(share.status) === "signed",
  );
  const archivedShares = shares.filter((share) =>
    ["replaced", "revoked"].includes(safeString(share.status)),
  );

  refs.leadEstimateClientSummary.innerHTML = [
    {
      label: "Internal draft",
      value: currentDraft ? "Ready" : lead.hasEstimate ? "Saved" : "Missing",
    },
    { label: "Live approvals", value: String(activeShares.length) },
    { label: "Signed", value: String(signedShares.length) },
    { label: "Archived", value: String(archivedShares.length) },
  ]
    .map(
      (item) => `
        <article class="summary-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `,
    )
    .join("");

  let draftStatusLabel = "Draft only";
  let draftMetaCopy = currentDraft
    ? state.estimateWorkflow.dirty
      ? "Unsaved browser edits. Save them or publish this exact version from Review & publish above."
      : "Saved internally. The client cannot see this version until you publish it."
    : "This lead has an estimate saved, but the full draft has not loaded yet.";

  if (currentDraft && currentShareStatus === "active") {
    draftStatusLabel = currentDraftMatchesShare
      ? "Published now"
      : "Updated since publish";
    draftMetaCopy = currentDraftMatchesShare
      ? "This saved draft matches the live client version in the portal."
      : "The client is still seeing an older published version. Publish again to send these latest edits.";
  } else if (currentShareStatus === "active") {
    draftStatusLabel = "Published now";
    draftMetaCopy =
      "A live client version exists for this lead. Open the portal record below to review it.";
  } else if (currentDraft && currentShareStatus === "signed") {
    draftStatusLabel = currentDraftMatchesShare
      ? "Signed record"
      : "Revised after signing";
    draftMetaCopy = currentDraftMatchesShare
      ? "This estimate was signed and archived. Publish a new version only if the scope changes."
      : "A signed version is archived, but this draft has newer edits that are not client-visible yet.";
  } else if (currentShareStatus === "signed") {
    draftStatusLabel = "Signed record";
    draftMetaCopy =
      "A signed estimate record is archived for this lead.";
  } else if (currentShareStatus === "replaced") {
    draftStatusLabel = "Draft ready";
    draftMetaCopy =
      "The last published version was replaced or removed. Publish this draft to make it visible again.";
  } else if (currentShareStatus === "revoked") {
    draftStatusLabel = "Draft ready";
    draftMetaCopy =
      "The last published version was revoked. Publish this draft to make it visible again.";
  }

  const draftCard = (currentDraft || lead.hasEstimate)
    ? `
      <article class="simple-item">
        <div class="record-topline">
          <span class="mini-pill">${escapeHtml(draftStatusLabel)}</span>
          <span class="mini-pill">${escapeHtml(formatCurrency(currentDraft?.subtotal || lead.estimateSubtotal || 0))}</span>
        </div>
        <strong>${escapeHtml(currentDraft?.subject || lead.estimateTitle || "Current estimate draft")}</strong>
        <p>${escapeHtml(lead.projectAddress || "Address pending")}</p>
        <div class="simple-meta">${escapeHtml(draftMetaCopy)}</div>
        <div class="inline-actions">
          <button type="button" class="ghost-button" data-estimate-review-publish-focus>Review before publishing</button>
          <button type="button" class="ghost-button" data-open-customer="${escapeHtml(lead.customerId || "")}" data-open-view="customers-view" ${lead.customerId ? "" : "disabled"}>Open customer</button>
        </div>
      </article>
    `
    : "";

  const shareCards = shares.map((share) => {
    const shareUrl = estimateShareUrl(share.id);
    const agreementUrl = estimateShareAgreementUrl(share.id);
    const isSigned = safeString(share.status) === "signed";
    const isActive = safeString(share.status) === "active";
    const shareContractDetails =
      share.estimateSnapshot?.contractDetails || {};
    const shareStartDate = safeString(
      shareContractDetails.approximateStartDate,
    );
    const shareCompletionDate = safeString(
      shareContractDetails.approximateCompletionDate,
    );
    const shareReadyToSign = Boolean(
      shareStartDate &&
        shareCompletionDate &&
        shareCompletionDate >= shareStartDate,
    );

    return `
      <article class="simple-item">
        <div class="record-topline">
          <span class="mini-pill">${escapeHtml(isSigned ? "Signed record" : "Portal record")}</span>
          <span class="mini-pill">${escapeHtml(estimateShareStatusLabel(share))}</span>
        </div>
        <strong>${escapeHtml(share.estimateSnapshot?.subject || share.title || lead.estimateTitle || "Estimate")}</strong>
        <p>${escapeHtml(share.projectAddress || lead.projectAddress || "Address pending")}</p>
        <div class="simple-meta">${escapeHtml(
          isSigned
            ? `Signed ${formatDateTime(share.signedAt || share.updatedAt)}`
            : shareVisibleInPortal(share)
              ? shareReadyToSign
                ? "Visible in the secure portal and ready for signature."
                : "Visible in the secure portal for review. Signing is not available until the required agreement details are published."
              : "Saved in portal history but not currently published.",
        )}</div>
        <div class="inline-actions">
          ${
            shareUrl
              ? `<a class="ghost-button" href="${escapeHtml(shareUrl)}" target="_blank" rel="noreferrer">${escapeHtml(isActive ? "Open portal view" : "Open record")}</a>`
              : ""
          }
          ${
            isActive && isAdmin()
              ? customerPortalActionButton({
                  action: "revoke-estimate",
                  label: "Unpublish",
                  targetType: "estimate-share",
                  targetId: share.id,
                  leadId: lead.id,
                })
              : ""
          }
          ${
            !isSigned && isAdmin()
              ? customerPortalActionButton({
                  action: "delete-estimate",
                  label: "Delete",
                  targetType: "estimate-share",
                  targetId: share.id,
                  leadId: lead.id,
                })
              : agreementUrl
                ? `<a class="ghost-button" href="${escapeHtml(agreementUrl)}" target="_blank" rel="noreferrer">Signed PDF</a>`
                : ""
          }
        </div>
      </article>
    `;
  });

  const cards = [draftCard, ...shareCards].filter(Boolean);
  if (!cards.length) {
    renderEmptyList(
      refs.leadEstimateClientList,
      "No estimate has been published or archived for this lead yet.",
    );
    return;
  }

  refs.leadEstimateClientList.innerHTML = cards.join("");
}

function renderEstimatePanel() {
  const lead = currentLead();
  const leadId = safeString(lead?.id);
  const estimate =
    state.estimate && estimateBelongsToLead(state.estimate, leadId)
      ? state.estimate
      : {
          subject: "",
          emailBody: "",
          contractDetails: {},
          assumptions: [],
          lineItems: [],
        };
  const contractDetails = contractDetailsForEstimate(estimate);
  const boundToLead = estimateEditorIsBoundToLead(leadId);

  if (!boundToLead) {
    resetEstimateWorkflowForLead(leadId, {
      status: leadId ? "loading" : "loading",
    });
  }

  const preserveVisibleDraft = Boolean(
    leadId &&
      estimateEditorIsBoundToLead(leadId) &&
      (state.estimateWorkflow.dirty || estimateOperationIsPending(leadId)),
  );

  if (!preserveVisibleDraft) {
    refs.estimateSubject.value =
      estimate.subject || defaultEstimateTitle(lead);
    refs.estimateBody.value = estimate.emailBody || "";
    refs.estimateStartDate.value = safeString(
      contractDetails.approximateStartDate,
    );
    refs.estimateCompletionDate.value = safeString(
      contractDetails.approximateCompletionDate,
    );
    refs.estimatePaymentSchedule.value = safeString(
      contractDetails.paymentSchedule,
    );
    refs.estimateSpecialOrderMaterials.value = safeString(
      contractDetails.specialOrderMaterials,
    );
    refs.estimateKnownSubcontractors.value = safeString(
      contractDetails.knownSubcontractors,
    );
    refs.estimateAssumptions.value = Array.isArray(estimate.assumptions)
      ? estimate.assumptions.join("\n")
      : "";
    renderEstimateLines(
      Array.isArray(estimate.lineItems) ? estimate.lineItems : [],
    );
  }

  refs.estimateStandardTermsDisplay.innerHTML = estimateStandardTermsMarkup();
  setEstimateEditorInteractivity(lead);
  renderEstimateSharePanel(lead);
  renderLeadEstimateClientRecords(lead);
  updateEstimatePreview();
}

function invoiceClientName(project) {
  return (
    safeString(
      project?.clientName ||
        project?.customerName ||
        state.customers.find((item) => item.id === project?.customerId)?.name,
    ) || "Client"
  );
}

function invoiceProjectAddress(project) {
  return safeString(project?.projectAddress) || "To be confirmed";
}

function hydrateProjectInvoice(project, invoice = {}) {
  const draft = defaultProjectInvoiceDraft(project, invoice);
  const lineItems = Array.isArray(invoice.lineItems)
    ? invoice.lineItems
        .map((item) => ({
          label: safeString(item.label || item.title),
          description: safeString(item.description || item.note),
          amount: toNumber(item.amount),
        }))
        .filter((item) => item.label || item.description || item.amount)
    : draft.lineItems;
  const customFields = Array.isArray(invoice.customFields)
    ? invoice.customFields
        .map((field) => ({
          label: safeString(field.label),
          value: safeString(field.value),
        }))
        .filter((field) => field.label || field.value)
    : draft.customFields;
  const subtotal = lineItems.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0,
  );

  return {
    ...draft,
    ...invoice,
    status: safeString(invoice.status) || draft.status,
    issueDate: invoice.issueDate || draft.issueDate,
    dueDate: invoice.dueDate || draft.dueDate,
    lineItems,
    customFields,
    subtotal: Number(subtotal.toFixed(2)),
    summary: safeString(invoice.summary || draft.summary),
    notes: safeString(invoice.notes || draft.notes),
    paymentMethod: safeString(invoice.paymentMethod || draft.paymentMethod),
    paymentReference: safeString(
      invoice.paymentReference || draft.paymentReference,
    ),
    paymentNote: safeString(invoice.paymentNote || draft.paymentNote),
    paidAt: invoice.paidAt || draft.paidAt || null,
    paymentRecordId: invoice.paymentRecordId || draft.paymentRecordId || null,
    stripeCheckoutUrl: safeString(
      invoice.stripeCheckoutUrl || draft.stripeCheckoutUrl,
    ),
    stripeCheckoutSessionId: safeString(
      invoice.stripeCheckoutSessionId || draft.stripeCheckoutSessionId,
    ),
    stripePaymentStatus: safeString(
      invoice.stripePaymentStatus || draft.stripePaymentStatus,
    ),
    stripeCheckoutFingerprint: safeString(
      invoice.stripeCheckoutFingerprint || draft.stripeCheckoutFingerprint,
    ),
    stripeLinkCreatedAt:
      invoice.stripeLinkCreatedAt || draft.stripeLinkCreatedAt || null,
  };
}

function renderInvoiceCustomFields(customFields, editable = isAdmin()) {
  const rows = customFields.length
    ? customFields
    : editable
      ? [{ label: "", value: "" }]
      : [];

  if (!rows.length) {
    refs.invoiceCustomFields.innerHTML = `<div class="empty-note">No extra invoice detail fields have been added to this invoice yet.</div>`;
    return;
  }

  refs.invoiceCustomFields.innerHTML = rows
    .map(
      (field, index) => `
        <div class="invoice-custom-field-row" data-invoice-custom-index="${index}">
            <label class="line-item-field">
                <span>Field label</span>
                <input type="text" data-invoice-custom-field="label" value="${escapeHtml(field.label || "")}" placeholder="Billing stage, property nickname, phase, project manager" ${editable ? "" : "disabled"}>
            </label>
            <label class="line-item-field">
                <span>Field value</span>
                <input type="text" data-invoice-custom-field="value" value="${escapeHtml(field.value || "")}" placeholder="Kitchen draw 1, 712 N Preston, Phase 2, etc." ${editable ? "" : "disabled"}>
            </label>
            <div class="line-item-actions">
                <button type="button" class="ghost-button" data-remove-invoice-custom="${index}" ${editable ? "" : "hidden disabled"}>Remove</button>
            </div>
        </div>
    `,
    )
    .join("");

  Array.from(
    refs.invoiceCustomFields.querySelectorAll("[data-remove-invoice-custom]"),
  ).forEach((button) => {
    button.addEventListener("click", () => {
      const fields = collectInvoiceForm().customFields;
      fields.splice(Number(button.dataset.removeInvoiceCustom), 1);
      renderInvoiceCustomFields(fields, editable);
      updateInvoicePreview();
    });
  });

  Array.from(refs.invoiceCustomFields.querySelectorAll("input")).forEach(
    (field) => {
      field.addEventListener("input", () => {
        syncProjectInvoiceDraftFromForm();
      });
    },
  );
}

function renderInvoiceLines(lineItems, editable = isAdmin()) {
  const rows = lineItems.length
    ? lineItems
    : editable
      ? [{ label: "", description: "", amount: "" }]
      : [];

  if (!rows.length) {
    refs.invoiceLines.innerHTML = `<div class="empty-note">No invoice lines have been added yet.</div>`;
    return;
  }

  refs.invoiceLines.innerHTML = rows
    .map(
      (item, index) => `
        <div class="line-item-row" data-invoice-line-index="${index}">
            <div class="line-item-main-fields">
                <label class="line-item-field">
                    <span>Invoice line</span>
                    <input type="text" data-invoice-line-field="label" value="${escapeHtml(item.label || "")}" placeholder="Deposit, demolition draw, progress payment, final completion billing" ${editable ? "" : "disabled"}>
                </label>
                <label class="line-item-field line-item-amount-field">
                    <span>Amount</span>
                    <input type="number" data-invoice-line-field="amount" value="${escapeHtml(item.amount ?? "")}" min="0" step="0.01" placeholder="0.00" ${editable ? "" : "disabled"}>
                </label>
            </div>
            <label class="line-item-field line-item-description-field">
                <span>What's included</span>
                <textarea data-invoice-line-field="description" rows="4" placeholder="Describe what this billing line covers so the client understands the draw, phase, or approved scope behind the amount." ${editable ? "" : "disabled"}>${escapeHtml(item.description || "")}</textarea>
            </label>
            <div class="line-item-actions">
                <button type="button" class="ghost-button" data-remove-invoice-line="${index}" ${editable ? "" : "hidden disabled"}>Remove</button>
            </div>
        </div>
    `,
    )
    .join("");

  Array.from(
    refs.invoiceLines.querySelectorAll("[data-remove-invoice-line]"),
  ).forEach((button) => {
    button.addEventListener("click", () => {
      const lines = collectInvoiceForm().lineItems;
      lines.splice(Number(button.dataset.removeInvoiceLine), 1);
      renderInvoiceLines(lines, editable);
      updateInvoicePreview();
    });
  });

  Array.from(refs.invoiceLines.querySelectorAll("input, textarea")).forEach(
    (field) => {
      if (field.tagName === "TEXTAREA") {
        field.style.height = "auto";
        field.style.height = `${Math.max(field.scrollHeight, 110)}px`;
      }
      field.addEventListener("input", () => {
        if (field.tagName === "TEXTAREA") {
          field.style.height = "auto";
          field.style.height = `${Math.max(field.scrollHeight, 110)}px`;
        }
        syncProjectInvoiceDraftFromForm();
      });
    },
  );
}

function collectInvoiceForm(baseInvoice = currentProjectInvoice()) {
  const lineItems = Array.from(
    refs.invoiceLines.querySelectorAll("[data-invoice-line-index]"),
  )
    .map((row) => ({
      label: row
        .querySelector('[data-invoice-line-field="label"]')
        .value.trim(),
      description: row
        .querySelector('[data-invoice-line-field="description"]')
        .value.trim(),
      amount: toNumber(
        row.querySelector('[data-invoice-line-field="amount"]').value,
      ),
    }))
    .filter((item) => item.label || item.description || item.amount);

  const customFields = Array.from(
    refs.invoiceCustomFields.querySelectorAll("[data-invoice-custom-index]"),
  )
    .map((row) => ({
      label: row
        .querySelector('[data-invoice-custom-field="label"]')
        .value.trim(),
      value: row
        .querySelector('[data-invoice-custom-field="value"]')
        .value.trim(),
    }))
    .filter((field) => field.label || field.value);

  const subtotal = lineItems.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0,
  );

  return hydrateProjectInvoice(currentProject(), {
    ...(baseInvoice || {}),
    title: refs.invoiceTitle.value.trim(),
    invoiceNumber: refs.invoiceNumber.value.trim(),
    issueDate:
      parseDateOnlyInput(refs.invoiceIssueDate.value) ||
      baseInvoice?.issueDate ||
      new Date(),
    dueDate:
      parseDateOnlyInput(refs.invoiceDueDate.value) ||
      baseInvoice?.dueDate ||
      addDays(new Date(), 7),
    summary: refs.invoiceSummary.value.trim(),
    customFields,
    lineItems,
    subtotal: Number(subtotal.toFixed(2)),
    notes: refs.invoiceNotes.value.trim(),
    paidAt:
      parseDateOnlyInput(refs.invoicePaidDate.value) ||
      baseInvoice?.paidAt ||
      null,
    paymentMethod: refs.invoicePaymentMethod.value.trim(),
    paymentReference: refs.invoicePaymentReference.value.trim(),
    paymentNote: refs.invoicePaymentNote.value.trim(),
  });
}

function syncProjectInvoiceDraftFromForm({ updatePreview = true } = {}) {
  const project = currentProject();
  if (!project) {
    return null;
  }

  const baseInvoice =
    currentProjectInvoiceDoc() ||
    currentProjectInvoice() ||
    defaultProjectInvoiceDraft(project);
  state.projectInvoiceDraft = collectInvoiceForm(baseInvoice);

  if (updatePreview) {
    refs.invoiceSubtotal.textContent = formatCurrency(
      state.projectInvoiceDraft.subtotal || 0,
    );
    refs.invoicePreview.innerHTML = buildInvoicePreviewHtml(
      project,
      state.projectInvoiceDraft,
    );
    updateInvoiceBillingState(project, state.projectInvoiceDraft);
  }

  return state.projectInvoiceDraft;
}

function invoiceEditorFingerprint(invoice = {}) {
  return JSON.stringify({
    title: safeString(invoice.title),
    issueDate: formatDateOnlyInputValue(invoice.issueDate),
    dueDate: formatDateOnlyInputValue(invoice.dueDate),
    summary: safeString(invoice.summary),
    notes: safeString(invoice.notes),
    customFields: Array.isArray(invoice.customFields)
      ? invoice.customFields.map((field) => ({
          label: safeString(field.label),
          value: safeString(field.value),
        }))
      : [],
    lineItems: Array.isArray(invoice.lineItems)
      ? invoice.lineItems.map((item) => ({
          label: safeString(item.label),
          description: safeString(item.description),
          amount: toNumber(item.amount),
        }))
      : [],
    subtotal: Number(toNumber(invoice.subtotal).toFixed(2)),
  });
}

function invoiceRequiresCheckoutRefresh(existingInvoice = {}, draftInvoice = {}) {
  if (!safeString(existingInvoice.stripeCheckoutSessionId)) {
    return false;
  }

  if (safeString(existingInvoice.status) === "paid") {
    return false;
  }

  return invoiceEditorFingerprint(existingInvoice) !== invoiceEditorFingerprint(draftInvoice);
}

function invoiceBillingStateMarkup(project, invoiceDraft) {
  const billingState = projectBillingState(project, [invoiceDraft]);
  const linkReady = safeString(invoiceDraft.stripeCheckoutUrl);
  const refreshRequired =
    safeString(invoiceDraft.stripePaymentStatus) === "stale";
  const paymentRequirement =
    SERVICE_PAYMENT_RULE_META[project?.paymentRequirement] ||
    SERVICE_PAYMENT_RULE_META.upfront_required;
  const serviceBadge = isServiceOrderProject(project)
    ? `<span class="mini-pill">Service order</span>`
    : "";
  const linkMeta = linkReady
    ? `Link generated ${formatDateTime(invoiceDraft.stripeLinkCreatedAt || invoiceDraft.updatedAt || new Date())}.`
    : "No payment link created yet.";

  return `
    <div class="invoice-billing-state-copy">
      <div class="invoice-billing-head">
        <div>
          <strong>${escapeHtml(billingState?.label || "Awaiting payment setup")}</strong>
          <p>${escapeHtml(linkMeta)}</p>
        </div>
        <div class="invoice-billing-pills">
          ${serviceBadge}
          <span class="mini-pill">${escapeHtml(paymentRequirement)}</span>
          ${
            linkReady
              ? `<span class="mini-pill">Stripe Checkout ready</span>`
              : ""
          }
          ${
            refreshRequired
              ? `<span class="mini-pill">Refresh required</span>`
              : ""
          }
        </div>
      </div>
      <div class="invoice-billing-actions-copy">
        ${
          linkReady
            ? escapeHtml(
                "Copy the link and send it manually to the client. If you edit pricing or line items after link creation, generate a fresh checkout link before sending.",
              )
            : escapeHtml(
                "Save the invoice, then generate a Stripe payment link when you are ready to collect funds.",
              )
        }
      </div>
      ${
        linkReady
          ? `<a href="${escapeHtml(invoiceDraft.stripeCheckoutUrl)}" target="_blank" rel="noreferrer">${escapeHtml(invoiceDraft.stripeCheckoutUrl)}</a>`
          : ""
      }
    </div>
  `;
}

function updateInvoiceBillingState(project, invoiceDraft) {
  if (!refs.invoiceBillingState) {
    return;
  }

  refs.invoiceBillingState.innerHTML =
    project && invoiceDraft
      ? invoiceBillingStateMarkup(project, invoiceDraft)
      : "Payment links will appear here after you save the invoice and generate a Stripe Checkout session.";
}

function invoiceDownloadFilename(
  project,
  invoiceDraft,
  extension = "pdf",
  prefix = "invoice",
) {
  const stem =
    sanitiseDownloadName(
      `${invoiceDraft.invoiceNumber || prefix}-${invoiceClientName(project)}-${project?.projectAddress || project?.projectType || "project"}`,
    ) || `golden-brick-${prefix}`;
  const dateStamp =
    formatDateOnlyInputValue(
      invoiceDraft.paidAt || invoiceDraft.issueDate || new Date(),
    ) || "document";
  return `${stem}-${dateStamp}.${extension}`;
}

function invoiceCustomFieldMarkup(invoiceDraft) {
  return invoiceDraft.customFields.length
    ? `<ul class="invoice-custom-field-list">${invoiceDraft.customFields
        .map(
          (field) => `
            <li>
                <span>${escapeHtml(field.label || "Detail")}</span>
                <strong>${escapeHtml(field.value || "Not set")}</strong>
            </li>
        `,
        )
        .join("")}</ul>`
    : `<div class="estimate-note-empty">No extra invoice detail fields have been added to this billing package yet.</div>`;
}

function buildInvoicePreviewHtml(project, invoiceDraft) {
  const preparedDate = formatDateOnly(invoiceDraft.issueDate);
  const dueDate = formatDateOnly(invoiceDraft.dueDate);
  const paymentDate = invoiceDraft.paidAt
    ? formatDateOnly(invoiceDraft.paidAt)
    : "Pending";
  const rows = invoiceDraft.lineItems.length
    ? invoiceDraft.lineItems
        .map(
          (item) => `
            <tr>
                <td>
                    <strong>${escapeHtml(item.label || "Invoice line")}</strong>
                    <span>${escapeHtml(item.description || "Billing details to be confirmed.")}</span>
                </td>
                <td>${escapeHtml(formatCurrency(item.amount || 0))}</td>
            </tr>
        `,
        )
        .join("")
    : `
            <tr>
                <td>
                    <strong>Invoice scope pending</strong>
                    <span>Add line items or import the estimate lines to build this invoice.</span>
                </td>
                <td>${escapeHtml(formatCurrency(0))}</td>
            </tr>
        `;

  return `
        <article class="estimate-sheet invoice-sheet">
            <header class="invoice-sheet-header">
                <div class="invoice-brand-bar">
                    <div class="estimate-eyebrow">${escapeHtml(COMPANY_INFO.name)}</div>
                    <div class="invoice-brand-copy">
                        <div class="invoice-status-pill ${escapeHtml(invoiceDraft.status)}">${escapeHtml(INVOICE_STATUS_META[invoiceDraft.status] || "Draft")}</div>
                        <h3>${escapeHtml(invoiceDraft.title || "Invoice")}</h3>
                        <p>Client-ready billing prepared from the current Golden Brick job record, with payment details and receipts kept in the same project file.</p>
                    </div>
                </div>

                <div class="invoice-company-card">
                    <div>
                        <span>Prepared by</span>
                        <strong>${escapeHtml(COMPANY_INFO.name)}</strong>
                    </div>
                    <div>
                        <span>Email</span>
                        <strong>${escapeHtml(COMPANY_INFO.email)}</strong>
                    </div>
                    <div>
                        <span>Phone</span>
                        <strong>${escapeHtml(COMPANY_INFO.phone)}</strong>
                    </div>
                </div>
            </header>

            <section class="invoice-meta-grid">
                <article class="invoice-meta-card">
                    <span>Invoice number</span>
                    <strong>${escapeHtml(invoiceDraft.invoiceNumber || "Pending save")}</strong>
                </article>
                <article class="invoice-meta-card">
                    <span>Issue date</span>
                    <strong>${escapeHtml(preparedDate)}</strong>
                </article>
                <article class="invoice-meta-card">
                    <span>Due date</span>
                    <strong>${escapeHtml(dueDate)}</strong>
                </article>
                <article class="invoice-meta-card">
                    <span>Client</span>
                    <strong>${escapeHtml(invoiceClientName(project))}</strong>
                </article>
            </section>

            <section class="invoice-summary-grid">
                <article class="invoice-summary-card">
                    <span>Project address</span>
                    <strong>${escapeHtml(invoiceProjectAddress(project))}</strong>
                </article>
                <article class="invoice-summary-card">
                    <span>Project type</span>
                    <strong>${escapeHtml(project?.projectType || "Renovation scope")}</strong>
                </article>
                <article class="invoice-summary-card">
                    <span>Total due</span>
                    <strong>${escapeHtml(formatCurrency(invoiceDraft.subtotal || 0))}</strong>
                </article>
                <article class="invoice-summary-card">
                    <span>Payment status</span>
                    <strong>${escapeHtml(invoiceDraft.status === "paid" ? `Paid ${paymentDate}` : "Awaiting payment")}</strong>
                </article>
            </section>

            <section class="invoice-section">
                <div class="invoice-section-heading">
                    <span>Invoice overview</span>
                    <p>This summary explains the billing stage, related work, and payment milestone.</p>
                </div>
                <div class="invoice-summary-shell">
                    <p>${escapeHtml(invoiceDraft.summary || "No invoice summary added yet.")}</p>
                </div>
            </section>

            <section class="invoice-section">
                <div class="invoice-section-heading">
                    <span>Custom details</span>
                    <p>Flexible invoice metadata for draw names, phases, property nicknames, terms, or other billing context the client should see.</p>
                </div>
                <div class="invoice-summary-shell">
                    ${invoiceCustomFieldMarkup(invoiceDraft)}
                </div>
            </section>

            <section class="invoice-section">
                <div class="invoice-section-heading">
                    <span>Invoice lines</span>
                    <p>Each invoice line explains exactly what is being billed in this draw, milestone, or final payment request.</p>
                </div>
                <div class="invoice-summary-shell">
                    <table class="invoice-line-item-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </section>

            <section class="invoice-section">
                <div class="invoice-total-shell">
                    <span>Total due</span>
                    <strong>${escapeHtml(formatCurrency(invoiceDraft.subtotal || 0))}</strong>
                    <p>${escapeHtml(invoiceDraft.notes || "Payment instructions and billing notes will appear here.")}</p>
                </div>
            </section>

            <section class="invoice-footer-grid">
                <div class="invoice-section">
                    <div class="invoice-section-heading">
                        <span>Payment instructions</span>
                        <p>Use this section to clarify payment expectations, timing, and remittance notes for the client.</p>
                    </div>
                    <div class="invoice-summary-shell">
                        <p>${escapeHtml(invoiceDraft.notes || "No payment instructions added yet.")}</p>
                    </div>
                </div>

                <div class="invoice-section">
                    <div class="invoice-section-heading">
                        <span>${escapeHtml(invoiceDraft.status === "paid" ? "Receipt status" : "Next step")}</span>
                        <p>${escapeHtml(
                          invoiceDraft.status === "paid"
                            ? "This invoice has been marked paid, so the receipt can be saved to the job file and shared with the client."
                            : "After payment is received, mark this invoice paid to record the collection and generate the receipt.",
                        )}</p>
                    </div>
                    <div class="invoice-receipt-panel">
                        <div><span>Paid date</span><strong>${escapeHtml(paymentDate)}</strong></div>
                        <div><span>Payment method</span><strong>${escapeHtml(invoiceDraft.paymentMethod || "Pending")}</strong></div>
                        <div><span>Reference</span><strong>${escapeHtml(invoiceDraft.paymentReference || "Not set")}</strong></div>
                        <p>${escapeHtml(invoiceDraft.paymentNote || "No receipt note has been added.")}</p>
                    </div>
                </div>
            </section>

            <footer class="estimate-print-foot">
                <div>
                    <strong>${escapeHtml(COMPANY_INFO.name)}</strong>
                    <div>${escapeHtml(COMPANY_INFO.email)} · ${escapeHtml(COMPANY_INFO.phone)}</div>
                </div>
                <div>${escapeHtml(invoiceDraft.status === "paid" ? "Paid receipt ready for the client file." : "Invoice ready for client delivery.")}</div>
            </footer>
        </article>
    `;
}

function buildInvoiceReceiptHtml(project, invoiceDraft) {
  return `
        <article class="estimate-sheet invoice-sheet">
            <header class="invoice-sheet-header">
                <div class="invoice-brand-bar">
                    <div class="estimate-eyebrow">${escapeHtml(COMPANY_INFO.name)}</div>
                    <div class="invoice-brand-copy">
                        <div class="invoice-status-pill paid">Paid receipt</div>
                        <h3>Receipt for ${escapeHtml(invoiceDraft.invoiceNumber || "invoice")}</h3>
                        <p>This receipt confirms payment received by Golden Brick Construction for the invoice and project shown below.</p>
                    </div>
                </div>
                <div class="invoice-company-card">
                    <div>
                        <span>Client</span>
                        <strong>${escapeHtml(invoiceClientName(project))}</strong>
                    </div>
                    <div>
                        <span>Project address</span>
                        <strong>${escapeHtml(invoiceProjectAddress(project))}</strong>
                    </div>
                    <div>
                        <span>Receipt date</span>
                        <strong>${escapeHtml(formatDateOnly(invoiceDraft.paidAt || new Date()))}</strong>
                    </div>
                </div>
            </header>

            <section class="invoice-meta-grid">
                <article class="invoice-meta-card">
                    <span>Invoice number</span>
                    <strong>${escapeHtml(invoiceDraft.invoiceNumber || "Pending save")}</strong>
                </article>
                <article class="invoice-meta-card">
                    <span>Amount received</span>
                    <strong>${escapeHtml(formatCurrency(invoiceDraft.subtotal || 0))}</strong>
                </article>
                <article class="invoice-meta-card">
                    <span>Payment method</span>
                    <strong>${escapeHtml(invoiceDraft.paymentMethod || "Not set")}</strong>
                </article>
                <article class="invoice-meta-card">
                    <span>Reference</span>
                    <strong>${escapeHtml(invoiceDraft.paymentReference || "Not set")}</strong>
                </article>
            </section>

            <section class="invoice-section">
                <div class="invoice-section-heading">
                    <span>Receipt summary</span>
                    <p>Payment received for the following Golden Brick invoice and job scope.</p>
                </div>
                <div class="invoice-summary-shell">
                    <p>${escapeHtml(invoiceDraft.paymentNote || invoiceDraft.summary || "Payment received and applied to the linked project invoice.")}</p>
                </div>
            </section>

            <section class="invoice-section">
                <div class="invoice-total-shell">
                    <span>Received total</span>
                    <strong>${escapeHtml(formatCurrency(invoiceDraft.subtotal || 0))}</strong>
                    <p>Thank you for your payment. This receipt can be kept for your accounting and project records.</p>
                </div>
            </section>

            <footer class="estimate-print-foot">
                <div>
                    <strong>${escapeHtml(COMPANY_INFO.name)}</strong>
                    <div>${escapeHtml(COMPANY_INFO.email)} · ${escapeHtml(COMPANY_INFO.phone)}</div>
                </div>
                <div>Receipt issued for client records.</div>
            </footer>
        </article>
    `;
}

function buildInvoiceDocumentHtml(project, invoiceDraft, mode = "invoice") {
  const previewHtml =
    mode === "receipt"
      ? buildInvoiceReceiptHtml(project, invoiceDraft)
      : buildInvoicePreviewHtml(project, invoiceDraft);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(mode === "receipt" ? `Receipt - ${invoiceDraft.invoiceNumber || "invoice"}` : invoiceDraft.title || "Invoice")}</title>
    <style>
        :root {
            --brand: #c5a059;
            --brand-deep: #8e6a2e;
            --ink: #17120d;
            --muted: #6d6356;
            --line: #e7dac5;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 28px;
            background: #f5eee5;
            color: var(--ink);
            font-family: "Manrope", "Helvetica Neue", Arial, sans-serif;
        }
        .estimate-sheet {
            display: grid;
            gap: 24px;
            max-width: 960px;
            margin: 0 auto;
            padding: 34px;
            background: #fffdf9;
            border: 1px solid rgba(70, 53, 34, 0.08);
            border-top: 4px solid var(--brand);
            border-radius: 18px;
            box-shadow: 0 20px 40px rgba(26, 21, 16, 0.08);
        }
        .estimate-eyebrow,
        .invoice-meta-card span,
        .invoice-summary-card span,
        .invoice-section-heading span {
            color: var(--brand-deep);
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.16em;
            text-transform: uppercase;
        }
        .invoice-sheet-header,
        .invoice-meta-grid,
        .invoice-summary-grid,
        .invoice-footer-grid {
            display: grid;
            gap: 18px;
        }
        .invoice-sheet-header {
            grid-template-columns: minmax(0, 1.12fr) minmax(300px, 0.88fr);
        }
        .invoice-brand-copy,
        .invoice-company-card,
        .invoice-section,
        .invoice-section-heading,
        .invoice-receipt-panel {
            display: grid;
            gap: 12px;
        }
        .invoice-brand-copy h3 {
            margin: 0;
            font-family: "Fraunces", Georgia, serif;
            font-size: 34px;
            line-height: 1.06;
        }
        .invoice-status-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 30px;
            padding: 6px 12px;
            width: max-content;
            border-radius: 999px;
            background: rgba(197, 160, 89, 0.14);
            color: var(--brand-deep);
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.14em;
            text-transform: uppercase;
        }
        .invoice-status-pill.paid {
            background: rgba(47, 107, 69, 0.12);
            color: #2f6b45;
        }
        .invoice-company-card,
        .invoice-summary-shell,
        .invoice-total-shell,
        .invoice-receipt-panel,
        .invoice-meta-card,
        .invoice-summary-card,
        .invoice-custom-field-list li {
            padding: 18px;
            background: #faf6ef;
            border: 1px solid var(--line);
            border-radius: 14px;
        }
        .invoice-meta-grid,
        .invoice-summary-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .invoice-meta-card strong,
        .invoice-summary-card strong,
        .invoice-company-card strong {
            display: block;
            margin-top: 4px;
            font-size: 16px;
        }
        .invoice-section-heading p,
        .invoice-summary-shell p,
        .invoice-brand-copy p,
        .invoice-company-card p,
        .invoice-line-item-table td span,
        .invoice-receipt-panel p {
            margin: 0;
            color: var(--muted);
            line-height: 1.7;
        }
        .invoice-line-item-table {
            width: 100%;
            border-collapse: collapse;
        }
        .invoice-line-item-table th,
        .invoice-line-item-table td {
            padding: 14px 0;
            border-bottom: 1px solid var(--line);
            vertical-align: top;
            text-align: left;
        }
        .invoice-line-item-table th:last-child,
        .invoice-line-item-table td:last-child {
            text-align: right;
            white-space: nowrap;
        }
        .invoice-total-shell strong {
            font-family: "Fraunces", Georgia, serif;
            font-size: 38px;
            line-height: 1;
        }
        .invoice-footer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .invoice-custom-field-list {
            margin: 0;
            padding: 0;
            list-style: none;
            display: grid;
            gap: 10px;
        }
        .invoice-custom-field-list li {
            display: flex;
            justify-content: space-between;
            gap: 14px;
        }
        .estimate-print-foot {
            display: flex;
            justify-content: space-between;
            gap: 18px;
            align-items: flex-end;
            padding-top: 18px;
            border-top: 1px solid var(--line);
            color: var(--muted);
            font-size: 14px;
        }
        @media print {
            body {
                padding: 0;
                background: #ffffff;
            }
            .estimate-sheet {
                box-shadow: none;
                max-width: none;
                margin: 0;
            }
        }
        @media (max-width: 820px) {
            body { padding: 16px; }
            .invoice-sheet-header,
            .invoice-meta-grid,
            .invoice-summary-grid,
            .invoice-footer-grid {
                grid-template-columns: 1fr;
            }
            .estimate-print-foot {
                display: grid;
            }
        }
    </style>
</head>
<body>${previewHtml}</body>
</html>`;
}

function downloadInvoiceHtmlFallback(project, invoiceDraft, mode = "invoice") {
  const prefix = mode === "receipt" ? "receipt" : "invoice";
  downloadBlobFile(
    invoiceDownloadFilename(project, invoiceDraft, "html", prefix),
    buildInvoiceDocumentHtml(project, invoiceDraft, mode),
    "text/html;charset=utf-8",
  );
}

function buildInvoicePdf(doc, project, invoiceDraft) {
  const cursor = {
    left: 54,
    top: 46,
    bottom: 52,
    width: doc.internal.pageSize.getWidth() - 108,
    y: 46,
  };

  doc.setProperties({
    title: invoiceDraft.title || "Invoice",
    subject: `${COMPANY_INFO.name} invoice`,
    author: COMPANY_INFO.name,
    creator: COMPANY_INFO.name,
  });

  applyEstimatePdfTopBar(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...ESTIMATE_PDF_THEME.brandDeep);
  doc.text(COMPANY_INFO.name.toUpperCase(), cursor.left, cursor.y);
  cursor.y += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
  doc.text(
    doc.splitTextToSize(invoiceDraft.title || "Invoice", cursor.width),
    cursor.left,
    cursor.y,
  );
  cursor.y += 30;

  drawEstimatePdfParagraph(
    doc,
    cursor,
    "Professional client invoice prepared directly from the live Golden Brick job record.",
    {
      fontSize: 11,
      lineHeight: 15,
      color: ESTIMATE_PDF_THEME.muted,
      gapAfter: 14,
    },
  );

  drawEstimatePdfMetaCards(doc, cursor, [
    {
      label: "Invoice number",
      value: invoiceDraft.invoiceNumber || "Pending save",
    },
    {
      label: "Status",
      value: INVOICE_STATUS_META[invoiceDraft.status] || "Draft",
    },
    { label: "Issue date", value: formatDateOnly(invoiceDraft.issueDate) },
    { label: "Due date", value: formatDateOnly(invoiceDraft.dueDate) },
    { label: "Client", value: invoiceClientName(project) },
    { label: "Project address", value: invoiceProjectAddress(project) },
  ]);

  drawEstimatePdfSectionHeading(
    doc,
    cursor,
    "Invoice overview",
    "This summary explains what this billing package covers.",
  );
  drawEstimatePdfParagraph(
    doc,
    cursor,
    invoiceDraft.summary || "No invoice overview added yet.",
    {
      fontSize: 11,
      lineHeight: 16,
      color: ESTIMATE_PDF_THEME.muted,
      gapAfter: 14,
    },
  );

  if (invoiceDraft.customFields.length) {
    drawEstimatePdfSectionHeading(
      doc,
      cursor,
      "Custom details",
      "Flexible invoice fields for milestone naming, terms, or project context.",
    );
    invoiceDraft.customFields.forEach((field) => {
      drawEstimatePdfBulletItem(
        doc,
        cursor,
        `${field.label || "Detail"}: ${field.value || "Not set"}`,
      );
    });
    cursor.y += 4;
  }

  drawEstimatePdfSectionHeading(
    doc,
    cursor,
    "Invoice lines",
    "Each line item explains exactly what is being billed in this invoice.",
  );
  doc.setDrawColor(...ESTIMATE_PDF_THEME.line);
  doc.line(cursor.left, cursor.y, cursor.left + cursor.width, cursor.y);
  cursor.y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...ESTIMATE_PDF_THEME.brandDeep);
  doc.text("DESCRIPTION", cursor.left, cursor.y);
  doc.text("AMOUNT", cursor.left + cursor.width, cursor.y, { align: "right" });
  cursor.y += 10;
  doc.line(cursor.left, cursor.y, cursor.left + cursor.width, cursor.y);
  cursor.y += 18;

  (invoiceDraft.lineItems.length
    ? invoiceDraft.lineItems
    : [
        {
          label: "Invoice scope pending",
          description: "Add billing lines or import the estimate lines.",
          amount: 0,
        },
      ]
  ).forEach((item) => {
    const titleLines = doc.splitTextToSize(
      item.label || "Invoice line",
      cursor.width - 120,
    );
    const descriptionLines = doc.splitTextToSize(
      item.description || "Billing details pending.",
      cursor.width - 120,
    );
    const rowHeight = (titleLines.length + descriptionLines.length) * 14 + 16;

    ensureEstimatePdfSpace(doc, cursor, rowHeight + 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
    doc.text(titleLines, cursor.left, cursor.y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...ESTIMATE_PDF_THEME.muted);
    doc.text(descriptionLines, cursor.left, cursor.y + titleLines.length * 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
    doc.text(
      formatCurrency(item.amount || 0),
      cursor.left + cursor.width,
      cursor.y,
      { align: "right" },
    );
    cursor.y += rowHeight;
    doc.line(cursor.left, cursor.y, cursor.left + cursor.width, cursor.y);
    cursor.y += 14;
  });

  ensureEstimatePdfSpace(doc, cursor, 44);
  doc.setFillColor(...ESTIMATE_PDF_THEME.panel);
  doc.setDrawColor(...ESTIMATE_PDF_THEME.line);
  doc.roundedRect(cursor.left, cursor.y, cursor.width, 34, 8, 8, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
  doc.text("Total due", cursor.left + 16, cursor.y + 22);
  doc.text(
    formatCurrency(invoiceDraft.subtotal || 0),
    cursor.left + cursor.width - 16,
    cursor.y + 22,
    { align: "right" },
  );
  cursor.y += 50;

  drawEstimatePdfSectionHeading(doc, cursor, "Payment instructions", "");
  drawEstimatePdfParagraph(
    doc,
    cursor,
    invoiceDraft.notes ||
      "Contact Golden Brick Construction for remittance and billing questions.",
    {
      fontSize: 11,
      lineHeight: 16,
      color: ESTIMATE_PDF_THEME.muted,
      gapAfter: 18,
    },
  );

  ensureEstimatePdfSpace(doc, cursor, 32);
  doc.setDrawColor(...ESTIMATE_PDF_THEME.line);
  doc.line(cursor.left, cursor.y, cursor.left + cursor.width, cursor.y);
  cursor.y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
  doc.text(COMPANY_INFO.name, cursor.left, cursor.y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...ESTIMATE_PDF_THEME.muted);
  doc.text(
    `${COMPANY_INFO.email} | ${COMPANY_INFO.phone}`,
    cursor.left + cursor.width,
    cursor.y,
    { align: "right" },
  );
}

function buildInvoiceReceiptPdf(doc, project, invoiceDraft) {
  const cursor = {
    left: 54,
    top: 46,
    bottom: 52,
    width: doc.internal.pageSize.getWidth() - 108,
    y: 46,
  };

  doc.setProperties({
    title: `Receipt ${invoiceDraft.invoiceNumber || ""}`.trim(),
    subject: `${COMPANY_INFO.name} receipt`,
    author: COMPANY_INFO.name,
    creator: COMPANY_INFO.name,
  });

  applyEstimatePdfTopBar(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...ESTIMATE_PDF_THEME.brandDeep);
  doc.text(COMPANY_INFO.name.toUpperCase(), cursor.left, cursor.y);
  cursor.y += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
  doc.text(
    doc.splitTextToSize(
      `Receipt for ${invoiceDraft.invoiceNumber || "invoice"}`,
      cursor.width,
    ),
    cursor.left,
    cursor.y,
  );
  cursor.y += 30;

  drawEstimatePdfParagraph(
    doc,
    cursor,
    "Payment receipt confirming funds received for the invoice below.",
    {
      fontSize: 11,
      lineHeight: 15,
      color: ESTIMATE_PDF_THEME.muted,
      gapAfter: 14,
    },
  );

  drawEstimatePdfMetaCards(doc, cursor, [
    { label: "Client", value: invoiceClientName(project) },
    { label: "Project address", value: invoiceProjectAddress(project) },
    {
      label: "Invoice number",
      value: invoiceDraft.invoiceNumber || "Pending save",
    },
    {
      label: "Receipt date",
      value: formatDateOnly(invoiceDraft.paidAt || new Date()),
    },
    { label: "Payment method", value: invoiceDraft.paymentMethod || "Not set" },
    {
      label: "Amount received",
      value: formatCurrency(invoiceDraft.subtotal || 0),
    },
  ]);

  drawEstimatePdfSectionHeading(doc, cursor, "Receipt summary", "");
  drawEstimatePdfParagraph(
    doc,
    cursor,
    invoiceDraft.paymentNote ||
      invoiceDraft.summary ||
      "Payment received and applied to the linked Golden Brick invoice.",
    {
      fontSize: 11,
      lineHeight: 16,
      color: ESTIMATE_PDF_THEME.muted,
      gapAfter: 18,
    },
  );

  ensureEstimatePdfSpace(doc, cursor, 44);
  doc.setFillColor(...ESTIMATE_PDF_THEME.panel);
  doc.setDrawColor(...ESTIMATE_PDF_THEME.line);
  doc.roundedRect(cursor.left, cursor.y, cursor.width, 34, 8, 8, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
  doc.text("Received total", cursor.left + 16, cursor.y + 22);
  doc.text(
    formatCurrency(invoiceDraft.subtotal || 0),
    cursor.left + cursor.width - 16,
    cursor.y + 22,
    { align: "right" },
  );
  cursor.y += 50;

  ensureEstimatePdfSpace(doc, cursor, 32);
  doc.setDrawColor(...ESTIMATE_PDF_THEME.line);
  doc.line(cursor.left, cursor.y, cursor.left + cursor.width, cursor.y);
  cursor.y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...ESTIMATE_PDF_THEME.ink);
  doc.text(COMPANY_INFO.name, cursor.left, cursor.y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...ESTIMATE_PDF_THEME.muted);
  doc.text(
    `${COMPANY_INFO.email} | ${COMPANY_INFO.phone}`,
    cursor.left + cursor.width,
    cursor.y,
    { align: "right" },
  );
}

async function createInvoiceReceiptFile(project, invoiceDraft) {
  const { jsPDF } = await loadJsPdfModule();
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  buildInvoiceReceiptPdf(pdf, project, invoiceDraft);
  const receiptFileName = invoiceDownloadFilename(
    project,
    invoiceDraft,
    "pdf",
    "receipt",
  );
  return new File([pdf.output("blob")], receiptFileName, {
    type: "application/pdf",
  });
}

function invoiceReceiptTitle(invoiceDraft) {
  return `Receipt ${invoiceDraft.invoiceNumber || "Golden Brick invoice"}`.trim();
}

function invoiceReceiptNote(invoiceDraft) {
  return [
    `Paid receipt for ${invoiceDraft.invoiceNumber || "the linked invoice"}.`,
    `Amount received: ${formatCurrency(invoiceDraft.subtotal || 0)}.`,
    invoiceDraft.paymentMethod ? `Method: ${invoiceDraft.paymentMethod}.` : "",
    invoiceDraft.paymentReference
      ? `Reference: ${invoiceDraft.paymentReference}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

async function saveAndShareInvoiceReceipt(invoiceOverride = null) {
  const project = currentProject();
  const activeInvoice = invoiceOverride || currentProjectInvoice();
  if (!project || !activeInvoice) {
    showToast("Create or select an invoice first.", "error");
    return null;
  }

  const invoiceDraft = hydrateProjectInvoice(project, activeInvoice);
  if (invoiceDraft.status !== "paid") {
    showToast("Mark the invoice paid before saving a receipt.", "error");
    return null;
  }

  const receiptFile = await createInvoiceReceiptFile(project, invoiceDraft);
  const receiptTitle = invoiceReceiptTitle(invoiceDraft);
  const receiptNote = invoiceReceiptNote(invoiceDraft);
  const clientVisible = Boolean(safeString(project.customerId));
  const documentId = await createRecordDocument({
    links: buildRecordDocumentLinksFromProject(project),
    category: "receipt",
    sourceType: "upload",
    title: receiptTitle,
    note: receiptNote,
    relatedDate: invoiceDraft.paidAt || new Date(),
    file: receiptFile,
    clientVisible,
  });

  await addProjectActivityEntry(
    project.id,
    "invoice",
    clientVisible ? "Receipt shared" : "Receipt saved",
    clientVisible
      ? `${receiptTitle} was saved to documents and shared to the secure client portal.`
      : `${receiptTitle} was saved to job documents. Link a customer record to share it through the secure client portal.`,
  );

  if (clientVisible) {
    await postCustomerPortalThreadUpdateSafe({
      customerId: project.customerId,
      projectId: project.id,
      body: buildClientPortalDocumentUpdateMessage({
        project,
        category: "receipt",
        title: receiptTitle,
        note: receiptNote,
      }),
    });
  }

  if (!clientVisible) {
    downloadBlobFile(receiptFile.name, receiptFile, "application/pdf");
  }

  renderJobDocumentSummary();
  renderJobDocumentList();
  showToast(
    clientVisible
      ? "Receipt saved and shared to the client portal."
      : "Receipt saved to job documents and downloaded.",
  );
  return documentId;
}

function updateInvoicePreview() {
  const project = currentProject();
  if (!project) {
    refs.invoicePreview.innerHTML = `<div class="invoice-preview-empty">Select a job first to create or review invoices.</div>`;
    refs.invoiceSubtotal.textContent = formatCurrency(0);
    updateInvoiceBillingState(null, null);
    return;
  }

  const invoiceDraft =
    state.projectInvoiceDraft ||
    collectInvoiceForm(
      currentProjectInvoice() || defaultProjectInvoiceDraft(project),
    );
  refs.invoiceSubtotal.textContent = formatCurrency(invoiceDraft.subtotal);
  refs.invoicePreview.innerHTML = buildInvoicePreviewHtml(
    project,
    invoiceDraft,
  );
  updateInvoiceBillingState(project, invoiceDraft);
}

function renderProjectInvoiceSummary(project) {
  const invoices = sortByUpdatedDesc(state.projectInvoices);
  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
  const outstandingInvoices = invoices.filter(
    (invoice) => invoice.status !== "paid",
  );
  const totalBilled = invoices.reduce(
    (sum, invoice) => sum + toNumber(invoice.subtotal),
    0,
  );
  const totalCollected = paidInvoices.reduce(
    (sum, invoice) => sum + toNumber(invoice.subtotal),
    0,
  );

  refs.jobInvoiceSummary.innerHTML = [
    { label: "Invoices", value: String(invoices.length) },
    { label: "Outstanding", value: String(outstandingInvoices.length) },
    { label: "Total billed", value: formatCurrency(totalBilled) },
    { label: "Collected", value: formatCurrency(totalCollected) },
  ]
    .map(
      (item) => `
        <article class="summary-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `,
    )
    .join("");
}

function renderProjectInvoiceList(project) {
  if (!state.projectInvoices.length) {
    refs.jobInvoiceList.innerHTML = `<div class="empty-note">No invoices saved on this job yet. Create one here, import the estimate lines, and send a polished billing package.</div>`;
    return;
  }

  const activeInvoiceId =
    currentProjectInvoice()?.id || state.selectedProjectInvoiceId || "";
  refs.jobInvoiceList.innerHTML = sortByUpdatedDesc(state.projectInvoices)
    .map(
      (invoice) => `
        <button type="button" class="record-button invoice-record-button ${activeInvoiceId === invoice.id ? "is-selected" : ""}" data-project-invoice-id="${escapeHtml(invoice.id)}">
            <div class="record-topline">
                <span class="mini-pill">${escapeHtml(invoice.invoiceNumber || "Invoice")}</span>
                <span class="mini-pill">${escapeHtml(INVOICE_STATUS_META[invoice.status] || "Draft")}</span>
            </div>
            <span class="record-title">${escapeHtml(invoice.title || "Invoice")}</span>
            <p class="record-copy">${escapeHtml(invoice.summary || invoiceProjectAddress(project))}</p>
            <div class="record-meta">
                <div>${escapeHtml(formatCurrency(invoice.subtotal || 0))}</div>
                <div>Issued ${escapeHtml(formatDateOnly(invoice.issueDate || invoice.createdAt))}</div>
                <div>${escapeHtml(invoice.status === "paid" ? `Paid ${formatDateOnly(invoice.paidAt || invoice.updatedAt)}` : `Due ${formatDateOnly(invoice.dueDate || invoice.issueDate || invoice.createdAt)}`)}</div>
            </div>
        </button>
    `,
    )
    .join("");
}

function setInvoiceFormEditable(editable) {
  [
    refs.invoiceTitle,
    refs.invoiceNumber,
    refs.invoiceIssueDate,
    refs.invoiceDueDate,
    refs.invoiceSummary,
    refs.invoiceNotes,
    refs.invoicePaidDate,
    refs.invoicePaymentMethod,
    refs.invoicePaymentReference,
    refs.invoicePaymentNote,
  ].forEach((field) => {
    if (!field) return;
    field.readOnly = !editable;
    field.disabled = !editable && field.type === "date";
  });
}

function renderInvoicePanel(project) {
  if (!project) {
    refs.invoiceStatusDisplay.value = "";
    refs.invoicePreview.innerHTML = `<div class="invoice-preview-empty">Select a job first to create or review invoices.</div>`;
    refs.invoiceSubtotal.textContent = formatCurrency(0);
    refs.jobInvoiceSummary.innerHTML = "";
    refs.jobInvoiceList.innerHTML = `<div class="empty-note">Select a job to load invoices.</div>`;
    updateInvoiceBillingState(null, null);
    refs.invoiceGenerateLinkButton.disabled = true;
    refs.invoiceCopyLinkButton.disabled = true;
    refs.invoiceSendReceiptButton.disabled = true;
    return;
  }

  if (
    !state.projectInvoiceDraft &&
    !state.selectedProjectInvoiceId &&
    state.projectInvoices.length
  ) {
    state.selectedProjectInvoiceId =
      sortByUpdatedDesc(state.projectInvoices)[0]?.id || null;
  }

  let invoice = currentProjectInvoice();
  if (!invoice && isAdmin() && state.activeJobTab === "invoices") {
    state.projectInvoiceDraft = defaultProjectInvoiceDraft(project);
    invoice = state.projectInvoiceDraft;
  }

  renderProjectInvoiceSummary(project);
  renderProjectInvoiceList(project);

  const editable = isAdmin();
  setInvoiceFormEditable(editable);

  if (!invoice) {
    refs.invoiceTitle.value = "";
    refs.invoiceNumber.value = "";
    refs.invoiceStatusDisplay.value = "No invoice selected";
    refs.invoiceIssueDate.value = "";
    refs.invoiceDueDate.value = "";
    refs.invoiceSummary.value = "";
    refs.invoiceNotes.value = "";
    refs.invoicePaidDate.value = "";
    refs.invoicePaymentMethod.value = "";
    refs.invoicePaymentReference.value = "";
    refs.invoicePaymentNote.value = "";
    renderInvoiceCustomFields([], editable);
    renderInvoiceLines([], editable);
    refs.invoicePreview.innerHTML = `<div class="invoice-preview-empty">No invoice is selected for this job yet.</div>`;
    refs.invoiceSubtotal.textContent = formatCurrency(0);
    refs.invoiceDownloadButton.disabled = true;
    refs.invoiceReceiptButton.disabled = true;
    refs.invoiceSendReceiptButton.disabled = true;
    refs.invoiceMarkPaidButton.disabled = true;
    refs.invoiceImportEstimateButton.disabled = !editable;
    refs.invoiceAddLineButton.disabled = !editable;
    refs.invoiceAddCustomFieldButton.disabled = !editable;
    refs.invoiceGenerateLinkButton.disabled = true;
    refs.invoiceCopyLinkButton.disabled = true;
    updateInvoiceBillingState(project, null);
    return;
  }

  const hydrated = hydrateProjectInvoice(project, invoice);
  refs.invoiceTitle.value = hydrated.title || "";
  refs.invoiceNumber.value = hydrated.invoiceNumber || "";
  refs.invoiceStatusDisplay.value =
    INVOICE_STATUS_META[hydrated.status] || "Draft";
  refs.invoiceIssueDate.value = formatDateOnlyInputValue(hydrated.issueDate);
  refs.invoiceDueDate.value = formatDateOnlyInputValue(hydrated.dueDate);
  refs.invoiceSummary.value = hydrated.summary || "";
  refs.invoiceNotes.value = hydrated.notes || "";
  refs.invoicePaidDate.value = formatDateOnlyInputValue(hydrated.paidAt);
  refs.invoicePaymentMethod.value = hydrated.paymentMethod || "";
  refs.invoicePaymentReference.value = hydrated.paymentReference || "";
  refs.invoicePaymentNote.value = hydrated.paymentNote || "";
  renderInvoiceCustomFields(hydrated.customFields, editable);
  renderInvoiceLines(hydrated.lineItems, editable);
  refs.invoiceSubtotal.textContent = formatCurrency(hydrated.subtotal || 0);
  refs.invoicePreview.innerHTML = buildInvoicePreviewHtml(project, hydrated);
  refs.invoiceDownloadButton.disabled = false;
  refs.invoiceReceiptButton.disabled = hydrated.status !== "paid";
  refs.invoiceSendReceiptButton.disabled = !editable || hydrated.status !== "paid";
  refs.invoiceMarkPaidButton.disabled = !editable || hydrated.status === "paid";
  refs.invoiceImportEstimateButton.disabled =
    !editable || (!project.leadId && !state.projectScopeItems.length);
  refs.invoiceAddLineButton.disabled = !editable;
  refs.invoiceAddCustomFieldButton.disabled = !editable;
  refs.invoiceGenerateLinkButton.disabled =
    !editable || !hydrated.id || hydrated.status === "paid";
  refs.invoiceCopyLinkButton.disabled = !safeString(hydrated.stripeCheckoutUrl);
  updateInvoiceBillingState(project, hydrated);
}

async function invoiceImportSourceItems(project) {
  if (state.projectScopeItems.length) {
    return state.projectScopeItems
      .slice()
      .sort(
        (left, right) =>
          toNumber(left.estimateIndex) - toNumber(right.estimateIndex),
      )
      .map((item) => ({
        label: safeString(item.title || item.label),
        description: safeString(item.description || item.note),
        amount: toNumber(item.amount),
      }))
      .filter((item) => item.label || item.description || item.amount);
  }

  if (!project?.leadId) {
    return [];
  }

  const estimateSnap = await getDoc(doc(state.db, "estimates", project.leadId));
  if (!estimateSnap.exists()) {
    return [];
  }

  return estimateScopeItems(normaliseFirestoreDoc(estimateSnap)).map(
    (item) => ({
      label: safeString(item.label || item.title),
      description: safeString(item.description),
      amount: toNumber(item.amount),
    }),
  );
}

async function importInvoiceLinesFromEstimate() {
  const project = currentProject();
  if (!project || !isAdmin()) {
    showToast(
      "Only admins can import estimate lines into an invoice.",
      "error",
    );
    return;
  }

  const lineItems = await invoiceImportSourceItems(project);
  if (!lineItems.length) {
    showToast("No estimate lines were found for this job yet.", "error");
    return;
  }

  if (!currentProjectInvoice()) {
    state.projectInvoiceDraft = defaultProjectInvoiceDraft(project, {
      lineItems,
    });
  }

  const baseInvoice =
    currentProjectInvoiceDoc() ||
    state.projectInvoiceDraft ||
    currentProjectInvoice() ||
    defaultProjectInvoiceDraft(project);
  state.projectInvoiceDraft = hydrateProjectInvoice(project, {
    ...baseInvoice,
    lineItems,
  });
  renderInvoiceLines(lineItems, true);
  updateInvoicePreview();
  await addProjectActivityEntry(
    project.id,
    "invoice",
    "Invoice lines imported",
    `Invoice draft pulled ${lineItems.length} line items from the estimate scope for billing prep.`,
  );
  showToast("Estimate lines imported into the invoice.");
}

async function persistProjectInvoice({ forceStatus = null } = {}) {
  const project = currentProject();
  if (!project || !isAdmin()) {
    throw new Error("Select a job first.");
  }

  const existing = currentProjectInvoiceDoc();
  const draft = collectInvoiceForm(
    existing || currentProjectInvoice() || defaultProjectInvoiceDraft(project),
  );
  const invoiceRef = existing
    ? doc(state.db, "projects", project.id, "invoices", existing.id)
    : doc(collection(state.db, "projects", project.id, "invoices"));
  const nextStatus = forceStatus || draft.status || "draft";
  const fingerprint = invoiceEditorFingerprint(draft);
  const invalidateCheckout = invoiceRequiresCheckoutRefresh(existing || {}, draft);
  const payload = {
    id: invoiceRef.id,
    projectId: project.id,
    leadId: project.leadId || null,
    customerId: project.customerId || null,
    customerName: project.customerName || "",
    clientName: project.clientName || "",
    projectAddress: project.projectAddress || "",
    projectType: project.projectType || "",
    title: draft.title,
    invoiceNumber: draft.invoiceNumber,
    status: nextStatus,
    issueDate: draft.issueDate,
    dueDate: draft.dueDate,
    summary: draft.summary,
    customFields: draft.customFields,
    lineItems: draft.lineItems,
    subtotal: draft.subtotal,
    notes: draft.notes,
    paidAt:
      nextStatus === "paid" ? draft.paidAt || new Date() : draft.paidAt || null,
    paymentMethod: draft.paymentMethod,
    paymentReference: draft.paymentReference,
    paymentNote: draft.paymentNote,
    paymentRecordId:
      existing?.paymentRecordId ||
      state.projectInvoiceDraft?.paymentRecordId ||
      draft.paymentRecordId ||
      null,
    stripeCheckoutUrl: invalidateCheckout
      ? ""
      : safeString(
          draft.stripeCheckoutUrl ||
            existing?.stripeCheckoutUrl ||
            state.projectInvoiceDraft?.stripeCheckoutUrl,
        ),
    stripeCheckoutSessionId: invalidateCheckout
      ? ""
      : safeString(
          draft.stripeCheckoutSessionId ||
            existing?.stripeCheckoutSessionId ||
            state.projectInvoiceDraft?.stripeCheckoutSessionId,
        ),
    stripePaymentStatus:
      nextStatus === "paid"
        ? "paid"
        : invalidateCheckout
          ? "stale"
          : safeString(
              draft.stripePaymentStatus ||
                existing?.stripePaymentStatus ||
                state.projectInvoiceDraft?.stripePaymentStatus,
            ),
    stripeCheckoutFingerprint:
      nextStatus === "paid"
        ? fingerprint
        : invalidateCheckout
          ? ""
          : safeString(
              draft.stripeCheckoutFingerprint ||
                existing?.stripeCheckoutFingerprint ||
                fingerprint,
            ),
    stripeLinkCreatedAt:
      nextStatus === "paid"
        ? draft.stripeLinkCreatedAt ||
          existing?.stripeLinkCreatedAt ||
          state.projectInvoiceDraft?.stripeLinkCreatedAt ||
          null
        : invalidateCheckout
          ? null
          : draft.stripeLinkCreatedAt ||
            existing?.stripeLinkCreatedAt ||
            state.projectInvoiceDraft?.stripeLinkCreatedAt ||
            null,
    updatedAt: serverTimestamp(),
    createdAt:
      existing?.createdAt ||
      state.projectInvoiceDraft?.createdAt ||
      serverTimestamp(),
    createdByUid: existing?.createdByUid || state.profile.uid,
    createdByName: existing?.createdByName || state.profile.displayName,
  };

  if (!payload.title) {
    throw new Error("Invoice title is required.");
  }

  if (!payload.invoiceNumber) {
    throw new Error("Invoice number is required.");
  }

  await setDoc(invoiceRef, payload, { merge: true });

  if (isServiceOrderProject(project)) {
    const nextBillingStatus =
      nextStatus === "paid"
        ? "paid"
        : safeString(project.paymentRequirement) === "can_pay_later"
          ? "can_pay_later"
          : "awaiting_payment";
    await updateDoc(doc(state.db, "projects", project.id), {
      billingStatus: nextBillingStatus,
      updatedAt: serverTimestamp(),
    });
  }

  state.projectInvoiceDraft = null;
  state.selectedProjectInvoiceId = invoiceRef.id;

  await addProjectActivityEntry(
    project.id,
    "invoice",
    existing ? "Invoice updated" : "Invoice created",
    `${payload.invoiceNumber} is ${existing ? "updated" : "ready"} for ${formatCurrency(payload.subtotal || 0)}.`,
  );

  return {
    id: invoiceRef.id,
    created: !existing,
    invoice: hydrateProjectInvoice(project, payload),
  };
}

async function saveProjectInvoice(event) {
  event.preventDefault();

  try {
    const result = await persistProjectInvoice();
    showToast(result.created ? "Invoice created." : "Invoice updated.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function markInvoicePaid() {
  const project = currentProject();
  if (!project || !isAdmin()) return;

  const activeInvoice = currentProjectInvoice();
  if (!activeInvoice) {
    showToast("Create or select an invoice first.", "error");
    return;
  }

  if (activeInvoice.status === "paid" || activeInvoice.paymentRecordId) {
    showToast("This invoice is already marked paid.", "error");
    return;
  }

  const saved = await persistProjectInvoice({ forceStatus: "paid" });
  const invoice = saved.invoice;

  const paymentRef = doc(
    collection(state.db, "projects", project.id, "payments"),
  );
  await setDoc(
    paymentRef,
    {
      id: paymentRef.id,
      amount: invoice.subtotal,
      paymentType: "progress",
      method: invoice.paymentMethod,
      reference: invoice.paymentReference,
      note: `Applied to invoice ${invoice.invoiceNumber}${invoice.paymentNote ? ` · ${invoice.paymentNote}` : ""}`,
      relatedDate: invoice.paidAt || new Date(),
      invoiceId: saved.id,
      invoiceNumber: invoice.invoiceNumber,
      createdByUid: state.profile.uid,
      createdByName: state.profile.displayName,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  await updateDoc(doc(state.db, "projects", project.id, "invoices", saved.id), {
    status: "paid",
    paidAt: invoice.paidAt || new Date(),
    paymentRecordId: paymentRef.id,
    stripePaymentStatus: "paid",
    updatedAt: serverTimestamp(),
  });

  if (isServiceOrderProject(project)) {
    await updateDoc(doc(state.db, "projects", project.id), {
      billingStatus: "paid",
      updatedAt: serverTimestamp(),
    });
  }

  await addProjectActivityEntry(
    project.id,
    "invoice",
    "Invoice marked paid",
    `${invoice.invoiceNumber} was marked paid for ${formatCurrency(invoice.subtotal || 0)}${invoice.paymentMethod ? ` via ${invoice.paymentMethod}` : ""}.`,
  );
  await syncProjectFinancialSnapshot(project.id, { projectData: project });

  const paidInvoice = hydrateProjectInvoice(project, {
    ...invoice,
    id: saved.id,
    status: "paid",
    paymentRecordId: paymentRef.id,
  });
  const shouldSendReceipt = window.confirm(
    project.customerId
      ? "Invoice marked paid. Save and send the receipt to the secure client portal now?"
      : "Invoice marked paid. Save the receipt to job documents and download a copy now?",
  );

  if (shouldSendReceipt) {
    await saveAndShareInvoiceReceipt(paidInvoice);
    return;
  }

  showToast("Invoice marked paid and payment recorded.");
}

async function generateServiceCheckoutLink() {
  const project = currentProject();
  const activeInvoice = currentProjectInvoiceDoc();

  if (!project || !activeInvoice?.id) {
    showToast("Save the invoice first, then generate a payment link.", "error");
    return;
  }

  if (!isAdmin()) {
    showToast("Only admins can generate Stripe payment links.", "error");
    return;
  }

  if (safeString(activeInvoice.status) === "paid") {
    showToast("This invoice is already paid.", "error");
    return;
  }

  const response = await apiPost("/api/staff/create-service-checkout", {
    projectId: project.id,
    invoiceId: activeInvoice.id,
  });

  state.projectInvoiceDraft = hydrateProjectInvoice(project, {
    ...activeInvoice,
    ...response.invoice,
  });
  updateInvoicePreview();
  renderInvoicePanel(project);
  showToast("Stripe payment link generated.");
}

async function copyServiceCheckoutLink() {
  const invoice = currentProjectInvoice();
  await copyTextToClipboard(
    invoice?.stripeCheckoutUrl,
    "Payment link copied.",
  );
}

async function downloadInvoicePdf(mode = "invoice") {
  const project = currentProject();
  const activeInvoice = currentProjectInvoice();
  if (!project || !activeInvoice) {
    showToast("Create or select an invoice first.", "error");
    return;
  }

  const invoiceDraft = collectInvoiceForm(activeInvoice);
  if (mode === "receipt" && invoiceDraft.status !== "paid") {
    showToast("Mark the invoice paid before downloading a receipt.", "error");
    return;
  }

  const button =
    mode === "receipt" ? refs.invoiceReceiptButton : refs.invoiceDownloadButton;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent =
    mode === "receipt" ? "Preparing receipt..." : "Preparing PDF...";

  try {
    const { jsPDF } = await loadJsPdfModule();
    const pdf = new jsPDF({ unit: "pt", format: "letter" });
    if (mode === "receipt") {
      buildInvoiceReceiptPdf(pdf, project, invoiceDraft);
    } else {
      buildInvoicePdf(pdf, project, invoiceDraft);
    }
    pdf.save(
      invoiceDownloadFilename(
        project,
        invoiceDraft,
        "pdf",
        mode === "receipt" ? "receipt" : "invoice",
      ),
    );
    showToast(
      mode === "receipt"
        ? "Receipt PDF downloaded."
        : "Invoice PDF downloaded.",
    );
  } catch (error) {
    console.error(
      `${mode === "receipt" ? "Receipt" : "Invoice"} PDF download failed.`,
      error,
    );
    downloadInvoiceHtmlFallback(project, invoiceDraft, mode);
    showToast(
      `${mode === "receipt" ? "Receipt" : "Invoice"} PDF failed. HTML file downloaded instead.`,
      "error",
    );
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

function renderEntityTaskList(container, tasks, emptyMessage) {
  if (!tasks.length) {
    renderEmptyList(container, emptyMessage);
    return;
  }

  container.innerHTML = tasks
    .map(
      (task) => `
        <button type="button" class="record-button" data-task-id="${escapeHtml(task.id)}" data-open-view="tasks-view">
            <div class="record-topline">
                <span class="priority-pill ${escapeHtml(task.priority || "medium")}">${escapeHtml(PRIORITY_META[task.priority] || "Task")}</span>
                <span class="mini-pill">${escapeHtml(TASK_STATUS_META[task.status] || "Open")}</span>
            </div>
            <span class="record-title">${escapeHtml(task.title || "Untitled task")}</span>
            <p class="record-copy">${escapeHtml(task.description || linkedTaskLabel(task))}</p>
            <div class="record-meta">
                <div>${escapeHtml(task.assignedToName || task.assignedToEmail || "Unassigned")}</div>
                <div>${escapeHtml(task.dueAt ? formatDateTime(task.dueAt) : "No due date")}</div>
            </div>
        </button>
    `,
    )
    .join("");
}

function renderLeadTabState() {
  refs.leadTabButtons.forEach((button) => {
    const isActive = button.dataset.leadTab === state.activeLeadTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });

  Array.from(document.querySelectorAll("#lead-record-shell .tab-pane")).forEach(
    (pane) => {
      const isActive = pane.id === `lead-tab-${state.activeLeadTab}`;
      pane.classList.toggle("is-active", isActive);
      pane.setAttribute("aria-hidden", String(!isActive));
    },
  );
}

function openLeadTab(tab, focusTarget = null) {
  state.activeLeadTab = tab;
  renderLeadTabState();
  syncLeadRouteState();

  if (focusTarget) {
    queueFocus(focusTarget);
  } else {
    resetRecordWorkspaceScroll(refs.leadRecordShell, { smooth: true });
  }
}

function renderLeadJobSummary(lead) {
  const project = projectForLead(lead);

  if (!project) {
    refs.leadJobSummary.innerHTML = `<div class="empty-note">This lead has not been converted into a job yet.</div>`;
    return;
  }

  refs.leadJobSummary.innerHTML = `
        <div><strong>Job status:</strong> ${escapeHtml(JOB_STATUS_META[project.status] || "In Progress")}</div>
        <div><strong>Contract value:</strong> ${escapeHtml(formatCurrency(projectRevenueValue(project)))}</div>
        <div><strong>Client paid:</strong> ${escapeHtml(formatCurrency(firstFiniteNumber(projectFinancials(project).totalPayments, 0)))}</div>
        <div><strong>Profit tracked:</strong> ${escapeHtml(formatCurrency(firstFiniteNumber(projectFinancials(project).projectedGrossProfit, projectFinancials(project).profit, 0)))}</div>
        <div><button type="button" class="secondary-button" data-open-project="${escapeHtml(project.id)}" data-open-view="jobs-view">Open job record</button></div>
    `;
}

function renderLeadDetail() {
  const lead = currentLead();
  renderLeadWorkspaceHeader(lead);

  if (!lead) {
    refs.leadRecordBadge.textContent = "No lead selected";
    refs.leadRecordBadge.className = "status-pill neutral";
    renderLeadCustomerMatch(null);
    refs.leadRecordContext.innerHTML = "";
    refs.leadPlanningNotesInput.value = "";
    renderEstimateSharePanel(null);
    refs.leadEstimateClientSummary.innerHTML = "";
    renderEmptyList(
      refs.leadEstimateClientList,
      "Select a lead to review what the client can see.",
    );
    refs.leadDocumentSummary.innerHTML = "";
    renderEmptyList(
    refs.leadDocumentList,
      "Select or save a lead to manage shared documents.",
    );
    refs.leadDocumentForm.querySelector("button").disabled = true;
    if (refs.leadArchiveButton) {
      refs.leadArchiveButton.disabled = true;
    }
    refs.leadRecordEmpty.hidden = false;
    refs.leadRecordShell.hidden = true;
    return;
  }

  refs.leadRecordEmpty.hidden = true;
  refs.leadRecordShell.hidden = false;
  refs.leadRecordBadge.textContent = lead.id
    ? STATUS_META[lead.status] || "Lead"
    : "Draft";
  refs.leadRecordBadge.className = lead.id
    ? "status-pill"
    : "status-pill neutral";
  refs.leadClientName.value = lead.clientName || "";
  refs.leadClientEmail.value = lead.clientEmail || "";
  refs.leadClientPhone.value = lead.clientPhone || "";
  refs.leadProjectAddress.value = lead.projectAddress || "";
  refs.leadProjectType.value = lead.projectType || "";
  renderLeadStageOptions(lead);
  refs.leadNotesInput.value = lead.notes || "";
  refs.leadPlanningNotesInput.value = lead.planningNotes || "";
  refs.leadSourceDisplay.value =
    lead.sourcePage || lead.sourceForm || "Staff CRM";
  refs.leadEstimateDisplay.value = formatCurrency(
    lead.estimateSubtotal || state.estimate?.subtotal || 0,
  );
  renderLeadAssigneeOptions(lead.assignedToUid || "");
  renderCustomerOptions(lead.customerId || null);
  renderLeadCustomerMatch(lead);

  refs.leadMeta.innerHTML = `
        <div><strong>Created:</strong> ${escapeHtml(lead.createdAt ? formatDateTime(lead.createdAt) : "Not saved yet")}</div>
        <div><strong>Updated:</strong> ${escapeHtml(lead.updatedAt ? formatDateTime(lead.updatedAt) : "Not saved yet")}</div>
        <div><strong>Lead source:</strong> ${escapeHtml(lead.sourcePage || lead.sourceForm || "Staff CRM")}</div>
        <div><strong>Customer:</strong> ${escapeHtml(lead.customerName || "No linked customer")}</div>
        <div><strong>Match status:</strong> ${escapeHtml(lead.customerReviewRequired ? "Review required" : lead.customerMatchResult || "Pending")}</div>
    `;

  renderLeadRecordContext(lead);
  renderLeadOverviewSummary(lead);
  renderActivityList(
    refs.noteList,
    state.leadActivities,
    "No activity recorded yet.",
  );
  renderEstimatePanel();
  renderEntityTaskList(
    refs.leadTaskList,
    lead.id ? relatedTasksForEntity("leadId", lead.id) : [],
    "Save the lead first to attach tasks.",
  );
  renderLeadDocumentSourceFields();
  renderLeadDocumentSummary();
  renderLeadDocumentList();
  renderLeadJobSummary(lead);
  renderLeadTabState();

  refs.noteForm.querySelector("button").disabled = !lead.id;
  refs.leadDocumentForm.querySelector("button").disabled = !lead.id;
  const estimateBusy =
    estimateOperationIsPending(lead.id) ||
    state.estimateWorkflow.status === "loading";
  refs.estimateAiButton.disabled =
    !canEditEstimateForLead(lead) || estimateBusy;
  refs.estimateAddLineButton.disabled =
    !canEditEstimateForLead(lead) || estimateBusy;
  if (refs.estimateMobileAddLineButton) {
    refs.estimateMobileAddLineButton.disabled =
      !canEditEstimateForLead(lead) || estimateBusy;
  }
  refs.leadCreateTaskButton.disabled = !lead.id;
  refs.leadTaskDrawerButton.disabled = !lead.id;
  refs.leadMarkWonButton.disabled = !lead.id;
  refs.leadMarkLostButton.disabled = !lead.id;
  if (refs.leadArchiveButton) {
    refs.leadArchiveButton.disabled = !lead.id || !isAdmin();
  }

  if (!refs.leadDocumentDate.value) {
    refs.leadDocumentDate.value = todayDateInputValue();
  }
  if (!refs.leadDocumentSourceType.value) {
    refs.leadDocumentSourceType.value = "upload";
    renderLeadDocumentSourceFields();
  }
}

function renderCustomerMetrics() {
  const customers = visibleCustomers();
  const visibleLeadSet = visibleLeads();
  const totalSales = customers.reduce((sum, customer) => {
    return (
      sum +
      toNumber(customer.totalWonSales || customerRollup(customer).totalWonSales)
    );
  }, 0);
  const totalPayments = customers.reduce((sum, customer) => {
    return (
      sum +
      toNumber(
        customer.totalPaymentsReceived ||
          customerRollup(customer).totalPaymentsReceived,
      )
    );
  }, 0);

  renderMetricStrip(refs.customerMetrics, [
    { label: "Customers", value: customers.length },
    {
      label: "Open opportunities",
      value: visibleLeadSet.filter((lead) =>
        ["new_lead", "follow_up", "estimate_sent"].includes(lead.status),
      ).length,
    },
    { label: "Won sales", value: formatCurrency(totalSales) },
    { label: "Payments received", value: formatCurrency(totalPayments) },
  ]);
}

function portalRoleLabel(role) {
  const normalised = safeString(role);
  if (normalised === "partner") return "Partner";
  if (normalised === "read_only") return "Read-only";
  return "Primary";
}

function invoiceVisibleInPortal(invoice = {}) {
  if (invoice.clientVisibleOverride === true) return true;
  if (invoice.clientVisibleOverride === false) return false;
  const status = safeString(invoice.status).toLowerCase();
  return status === "sent" || status === "paid";
}

function shareVisibleInPortal(share = {}) {
  if (safeString(share.status) === "signed") return true;
  if (share.portalVisible === false) return false;
  return safeString(share.status) === "active";
}

function estimateShareStatusLabel(share = {}) {
  const status = safeString(share.status || "draft");
  if (status === "active") return "Needs signature";
  if (status === "signed") return "Signed";
  if (status === "replaced") return "Replaced";
  if (status === "revoked") return "Removed";
  return capitalise(status || "draft");
}

function publishedEstimateSharesForCustomer(customerId = state.selectedCustomerId) {
  return state.customerPortalEstimateShares
    .filter(
      (share) =>
        safeString(share.customerId) === safeString(customerId) &&
        safeString(share.type || "estimate") === "estimate",
    )
    .sort(
      (left, right) =>
        toMillis(right.updatedAt || right.publishedAt || right.createdAt) -
        toMillis(left.updatedAt || left.publishedAt || left.createdAt),
    );
}

function publishedChangeOrdersForCustomer(customerId = state.selectedCustomerId) {
  return state.customerPortalChangeOrders
    .filter(
      (entry) => safeString(entry.customerId) === safeString(customerId),
    )
    .sort(
      (left, right) =>
        toMillis(right.updatedAt || right.relatedDate || right.createdAt) -
        toMillis(left.updatedAt || left.relatedDate || left.createdAt),
    );
}

function portalInvoicesForCustomer(customerId = state.selectedCustomerId) {
  return state.customerPortalInvoices
    .filter(
      (invoice) => safeString(invoice.customerId) === safeString(customerId),
    )
    .sort(
      (left, right) =>
        toMillis(right.updatedAt || right.issueDate || right.createdAt) -
        toMillis(left.updatedAt || left.issueDate || left.createdAt),
    );
}

function estimateSharesForLead(leadId = state.selectedLeadId) {
  return sortByUpdatedDesc(
    state.leadEstimateShares.filter(
      (share) => safeString(share.leadId) === safeString(leadId),
    ),
  );
}

function estimateShareMapByLead(shares = []) {
  const shareMap = new Map();
  shares.forEach((share) => {
    const leadId = safeString(share.leadId);
    if (!leadId) {
      return;
    }
    const existing = shareMap.get(leadId);
    shareMap.set(
      leadId,
      pickCurrentEstimateShare([share, existing].filter(Boolean)),
    );
  });
  return shareMap;
}

function customerPortalActionButton({
  action,
  label,
  targetType,
  targetId,
  projectId = "",
  leadId = "",
}) {
  return `<button type="button" class="ghost-button" data-customer-portal-action="${escapeHtml(action)}" data-target-type="${escapeHtml(targetType)}" data-target-id="${escapeHtml(targetId)}" data-project-id="${escapeHtml(projectId)}" data-lead-id="${escapeHtml(leadId)}">${escapeHtml(label)}</button>`;
}

function portalInviteStatusLabel(contact = {}) {
  if (contact.disabledAt) return "Disabled";
  if (
    safeString(contact.inviteStatus) === "claimed" ||
    safeString(contact.authUid)
  )
    return "Claimed";
  if (safeString(contact.inviteStatus) === "revoked") return "Revoked";
  if (safeString(contact.inviteStatus) === "invited") return "Invited";
  return "Not invited";
}

function portalThreadTitle(thread = {}) {
  if (safeString(thread.threadType) === "project") {
    return (
      safeString(thread.title || thread.projectAddress || "Project updates") ||
      "Project updates"
    );
  }
  return (
    safeString(thread.title || "General project updates") ||
    "General project updates"
  );
}

function setCustomerPortalPreviewLink(contact = null) {
  const href = safeString(contact?.loginUrl || contact?.inviteUrl || "");
  refs.customerPortalPreviewLink.hidden = !href;
  refs.customerPortalPreviewLink.href = href || "#";
  refs.customerPortalPreviewLink.textContent = safeString(contact?.authUid)
    ? "Open secure portal"
    : "Open portal invite";
}

function resetCustomerPortalContactForm() {
  state.selectedCustomerPortalContactId = null;
  refs.customerPortalContactForm?.reset();
  if (refs.customerPortalContactRole) {
    refs.customerPortalContactRole.value = "primary";
  }
  setCustomerPortalPreviewLink(null);
}

async function copyTextToClipboard(value, successMessage = "Copied.") {
  const text = safeString(value);
  if (!text) {
    throw new Error("Nothing to copy yet.");
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
    return true;
  }

  const temp = document.createElement("textarea");
  temp.value = text;
  temp.setAttribute("readonly", "readonly");
  temp.style.position = "fixed";
  temp.style.opacity = "0";
  document.body.append(temp);
  temp.select();
  temp.setSelectionRange(0, temp.value.length);
  document.execCommand("copy");
  temp.remove();
  showToast(successMessage);
  return true;
}

function selectCustomerPortalContact(contactId) {
  const contact =
    state.customerPortalContacts.find((entry) => entry.id === contactId) ||
    null;
  state.selectedCustomerPortalContactId = contact?.id || null;

  if (!contact) {
    resetCustomerPortalContactForm();
    renderCustomerPortalContactList(currentCustomer());
    return;
  }

  refs.customerPortalContactName.value = contact.name || "";
  refs.customerPortalContactEmail.value = contact.email || "";
  refs.customerPortalContactPhone.value = contact.phone || "";
  refs.customerPortalContactRole.value = contact.role || "primary";
  setCustomerPortalPreviewLink(contact);
  renderCustomerPortalContactList(currentCustomer());
}

async function ensureCustomerPortalThread(customerId, projectId = "") {
  const customer =
    state.customers.find((entry) => entry.id === customerId) || null;
  if (!customer) {
    throw new Error("Customer not found.");
  }

  const project = projectId
    ? state.projects.find(
        (entry) => entry.id === projectId && entry.customerId === customerId,
      )
    : null;
  const threadId = project ? `project-${project.id}` : "general";
  const ref = doc(state.db, "customers", customerId, "threads", threadId);

  await setDoc(
    ref,
    {
      id: threadId,
      customerId,
      threadType: project ? "project" : "general",
      projectId: project?.id || null,
      projectAddress: project?.projectAddress || "",
      projectType: project?.projectType || "",
      title: project?.projectAddress || "General project updates",
      lastMessagePreview: "",
      lastAuthorRole: "",
      lastMessageAt: null,
      clientUnreadCount: 0,
      staffUnreadCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return threadId;
}

async function postCustomerPortalThreadUpdate({
  customerId,
  projectId = "",
  body = "",
}) {
  const messageBody = safeString(body);
  if (!customerId || !messageBody) {
    return;
  }

  const threadId = await ensureCustomerPortalThread(customerId, projectId);
  const activeProject = currentProject();
  const project =
    (projectId &&
      (state.projects.find(
        (entry) => entry.id === projectId && entry.customerId === customerId,
      ) ||
        (activeProject?.id === projectId ? activeProject : null))) ||
    null;
  const thread = {
    id: threadId,
    threadType: project ? "project" : "general",
    projectId: project?.id || null,
    projectAddress: project?.projectAddress || "",
    projectType: project?.projectType || "",
    title: project?.projectAddress || "General project updates",
  };
  const messageRef = doc(
    collection(
      state.db,
      "customers",
      customerId,
      "threads",
      threadId,
      "messages",
    ),
  );
  const threadRef = doc(state.db, "customers", customerId, "threads", threadId);
  const authorName =
    state.profile?.displayName || state.profile?.email || "Golden Brick";

  const batch = writeBatch(state.db);
  batch.set(
    messageRef,
    {
      id: messageRef.id,
      body: messageBody,
      authorRole: "staff",
      authorUid: state.profile?.uid || "",
      authorName,
      readByClientAt: null,
      readByStaffAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
  batch.set(
    threadRef,
    {
      customerId,
      threadType: thread.threadType,
      projectId: thread.projectId,
      projectAddress: thread.projectAddress,
      projectType: thread.projectType,
      title: portalThreadTitle(thread),
      lastMessageAt: serverTimestamp(),
      lastMessagePreview: messageBody.slice(0, 240),
      lastAuthorRole: "staff",
      clientUnreadCount: increment(1),
      staffUnreadCount: 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();
}

async function postCustomerPortalThreadUpdateSafe(payload) {
  try {
    await postCustomerPortalThreadUpdate(payload);
  } catch (error) {
    console.error("Customer portal thread update failed.", error);
  }
}

async function selectCustomerPortalThread(threadId, { markRead = false } = {}) {
  const customer = currentCustomerDoc();
  if (!customer?.id) {
    return;
  }

  let nextThreadId = safeString(threadId);
  if (!nextThreadId) {
    nextThreadId = await ensureCustomerPortalThread(customer.id);
  }

  state.selectedCustomerPortalThreadId = nextThreadId;
  renderCustomerPortalThreadList(customer);
  renderCustomerPortalConversation(customer);

  if (markRead) {
    await markCustomerPortalThreadRead();
  }
}

async function runCustomerPortalInviteAction(action, contact) {
  const customer = currentCustomerDoc();
  if (!customer?.id) {
    throw new Error("Save the customer first.");
  }

  const payload = {
    action,
    customerId: customer.id,
    contactId: contact?.id || "",
    name: contact?.name || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
    role: contact?.role || "primary",
  };

  const response = await apiPost("/api/client/invite", payload);
  if (response.contact?.id) {
    state.selectedCustomerPortalContactId = response.contact.id;
    setCustomerPortalPreviewLink(response.contact);
  }

  const actionMessages = {
    create: "Portal invite created.",
    resend: "Portal invite refreshed.",
    copy: safeString(response.contact?.authUid)
      ? "Portal login link copied."
      : "Portal invite copied.",
    revoke: "Portal access revoked.",
    disable: "Portal access disabled.",
    enable: "Portal access re-enabled.",
  };

  if (
    ["create", "resend", "copy"].includes(action) &&
    response.contact?.inviteUrl
  ) {
    await copyTextToClipboard(
      response.contact.inviteUrl,
      action === "copy" && safeString(response.contact.authUid)
        ? "Portal login link copied."
        : "Portal invite copied.",
    );
  } else {
    showToast(actionMessages[action] || "Portal access updated.");
  }

  return response;
}

async function saveCustomerPortalContact(event) {
  event.preventDefault();
  const customer = currentCustomerDoc();
  if (!customer?.id) {
    showToast("Save the customer first.", "error");
    return;
  }

  if (!isAdmin()) {
    showToast("Only admins can manage portal contacts.", "error");
    return;
  }

  const existing = currentCustomerPortalContact();
  const payload = {
    id: existing?.id || "",
    name: refs.customerPortalContactName.value.trim(),
    email: refs.customerPortalContactEmail.value.trim(),
    phone: refs.customerPortalContactPhone.value.trim(),
    role: refs.customerPortalContactRole.value || "primary",
    authUid: existing?.authUid || "",
    inviteUrl: existing?.inviteUrl || "",
  };

  if (!payload.email) {
    showToast("Portal contact email is required.", "error");
    refs.customerPortalContactEmail.focus();
    return;
  }

  const emailChanged =
    normaliseEmail(payload.email) !== normaliseEmail(existing?.email);
  const action = existing?.authUid && !emailChanged ? "copy" : "create";
  const response = await runCustomerPortalInviteAction(action, payload);
  if (response.contact?.id) {
    selectCustomerPortalContact(response.contact.id);
  }
}

async function markCustomerPortalThreadRead() {
  const customer = currentCustomerDoc();
  const thread = currentCustomerPortalThread();

  if (!customer?.id || !thread?.id) {
    return;
  }

  await setDoc(
    doc(state.db, "customers", customer.id, "threads", thread.id),
    {
      staffUnreadCount: 0,
      lastStaffReadAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  showToast("Thread marked read.");
}

async function saveCustomerPortalMessage(event) {
  event.preventDefault();
  const customer = currentCustomerDoc();

  if (!customer?.id) {
    showToast("Save the customer first.", "error");
    return;
  }

  let thread = currentCustomerPortalThread();
  if (!thread) {
    const threadId = await ensureCustomerPortalThread(customer.id);
    state.selectedCustomerPortalThreadId = threadId;
    thread = currentCustomerPortalThread() || {
      id: threadId,
      threadType: "general",
    };
  }

  const body = refs.customerPortalMessageBody.value.trim();
  if (!body) {
    showToast("Write the shared message first.", "error");
    refs.customerPortalMessageBody.focus();
    return;
  }

  const messageRef = doc(
    collection(
      state.db,
      "customers",
      customer.id,
      "threads",
      thread.id,
      "messages",
    ),
  );
  const threadRef = doc(
    state.db,
    "customers",
    customer.id,
    "threads",
    thread.id,
  );
  const authorName =
    state.profile?.displayName || state.profile?.email || "Golden Brick";

  const batch = writeBatch(state.db);
  batch.set(
    messageRef,
    {
      id: messageRef.id,
      body,
      authorRole: "staff",
      authorUid: state.profile?.uid || "",
      authorName,
      readByClientAt: null,
      readByStaffAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
  batch.set(
    threadRef,
    {
      customerId: customer.id,
      threadType: thread.threadType || "general",
      projectId: thread.projectId || null,
      projectAddress: thread.projectAddress || "",
      projectType: thread.projectType || "",
      title: portalThreadTitle(thread),
      lastMessageAt: serverTimestamp(),
      lastMessagePreview: body.slice(0, 240),
      lastAuthorRole: "staff",
      clientUnreadCount: increment(1),
      staffUnreadCount: 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();

  refs.customerPortalMessageBody.value = "";
  showToast("Client message sent.");
}

function renderCustomerPortalSummary(customer, rollup) {
  if (!customer?.id) {
    refs.customerPortalSummary.innerHTML = "";
    return;
  }

  const contacts = state.customerPortalContacts;
  const claimedCount = contacts.filter((contact) =>
    safeString(contact.authUid),
  ).length;
  const invitedCount = contacts.filter(
    (contact) =>
      safeString(contact.inviteStatus) === "invited" && !contact.disabledAt,
  ).length;
  const unreadThreads = state.customerPortalThreads.filter(
    (thread) => toNumber(thread.staffUnreadCount) > 0,
  ).length;
  const clientVisibleDocuments = state.customerDocuments.filter(
    (document) =>
      document.clientVisible === true || safeString(document.agreementId),
  ).length;

  refs.customerPortalSummary.innerHTML = [
    { label: "Portal contacts", value: String(contacts.length) },
    { label: "Claimed logins", value: String(claimedCount) },
    { label: "Invites out", value: String(invitedCount) },
    { label: "Unread client threads", value: String(unreadThreads) },
    { label: "Active jobs in portal", value: String(rollup.projects.length) },
    { label: "Visible documents", value: String(clientVisibleDocuments) },
  ]
    .map(
      (item) => `
        <article class="summary-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `,
    )
    .join("");
}

function renderCustomerPortalContactList(customer) {
  if (!customer?.id) {
    renderEmptyList(
      refs.customerPortalContactList,
      "Save the customer first to manage portal access.",
    );
    return;
  }

  if (!isAdmin()) {
    renderEmptyList(
      refs.customerPortalContactList,
      "Portal contact management is available to admins.",
    );
    return;
  }

  if (!state.customerPortalContacts.length) {
    renderEmptyList(
      refs.customerPortalContactList,
      "No portal contacts added yet.",
    );
    return;
  }

  refs.customerPortalContactList.innerHTML = state.customerPortalContacts
    .slice()
    .sort(
      (left, right) =>
        toMillis(right.updatedAt || right.createdAt) -
        toMillis(left.updatedAt || left.createdAt),
    )
    .map((contact) => {
      const isSelected = contact.id === state.selectedCustomerPortalContactId;
      const status = portalInviteStatusLabel(contact);
      const actionLabel = safeString(contact.authUid)
        ? "Copy login"
        : safeString(contact.inviteStatus) === "invited"
          ? "Copy invite"
          : "Create invite";
      return `
                <article class="simple-item portal-contact-card ${isSelected ? "is-selected" : ""}">
                    <div class="record-topline">
                        <span class="mini-pill">${escapeHtml(status)}</span>
                        <span class="mini-pill">${escapeHtml(contact.roleLabel || portalRoleLabel(contact.role))}</span>
                    </div>
                    <strong>${escapeHtml(contact.name || contact.email || "Portal contact")}</strong>
                    <p>${escapeHtml(contact.email || "No email added")}</p>
                    <div class="simple-meta">
                        ${escapeHtml(contact.phone || "No phone")} ·
                        ${escapeHtml(
                          contact.lastLoginAt
                            ? `Last login ${formatDateTime(contact.lastLoginAt)}`
                            : contact.lastInvitedAt
                              ? `Last invite ${formatDateTime(contact.lastInvitedAt)}`
                              : "No invite sent yet",
                        )}
                    </div>
                    <div class="inline-actions portal-contact-actions">
                        <button type="button" class="ghost-button" data-portal-contact-action="edit" data-contact-id="${escapeHtml(contact.id)}">Edit</button>
                        <button type="button" class="secondary-button" data-portal-contact-action="copy" data-contact-id="${escapeHtml(contact.id)}">${escapeHtml(actionLabel)}</button>
                        <button type="button" class="ghost-button" data-portal-contact-action="${contact.disabledAt ? "enable" : "disable"}" data-contact-id="${escapeHtml(contact.id)}">
                            ${escapeHtml(contact.disabledAt ? "Re-enable" : "Disable")}
                        </button>
                        <button type="button" class="ghost-button" data-portal-contact-action="revoke" data-contact-id="${escapeHtml(contact.id)}">Revoke</button>
                    </div>
                </article>
            `;
    })
    .join("");
}

function estimateShareAgreementUrl(shareId) {
  return shareId
    ? `${window.location.origin}/api/client/public-agreement-document?token=${encodeURIComponent(shareId)}`
    : "";
}

function renderCustomerPortalPublishingPanel(customer, rollup) {
  if (!customer?.id) {
    refs.customerPortalPublishingSummary.innerHTML = "";
    return;
  }

  const estimateShares = publishedEstimateSharesForCustomer(customer.id);
  const estimateLeadIds = new Set(
    estimateShares.map((share) => safeString(share.leadId)).filter(Boolean),
  );
  const draftEstimateLeads = rollup.openEstimateLeads.filter(
    (lead) => lead.hasEstimate && !estimateLeadIds.has(safeString(lead.id)),
  );
  const invoices = portalInvoicesForCustomer(customer.id);
  const changeOrders = publishedChangeOrdersForCustomer(customer.id);
  const visibleDocuments = state.customerDocuments.filter(
    (document) =>
      document.clientVisible === true || safeString(document.agreementId),
  );

  refs.customerPortalPublishingSummary.innerHTML = [
    {
      label: "Approvals live",
      value: String(
        estimateShares.filter((share) => safeString(share.status) === "active")
          .length +
          changeOrders.filter((entry) => safeString(entry.portalStatus) === "published")
            .length,
      ),
    },
    {
      label: "Signed records",
      value: String(
        estimateShares.filter((share) => safeString(share.status) === "signed")
          .length +
          changeOrders.filter((entry) => safeString(entry.portalStatus) === "signed")
            .length,
      ),
    },
    {
      label: "Visible invoices",
      value: String(invoices.filter(invoiceVisibleInPortal).length),
    },
    {
      label: "Visible documents",
      value: String(visibleDocuments.length),
    },
  ]
    .map(
      (item) => `
        <article class="summary-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `,
    )
    .join("");

  refs.customerPortalEstimateList.innerHTML = [
    ...draftEstimateLeads.map((lead) => {
      return `
        <article class="simple-item">
          <div class="record-topline">
            <span class="mini-pill">Draft only</span>
            <span class="mini-pill">${escapeHtml(formatCurrency(lead.estimateSubtotal || 0))}</span>
          </div>
          <strong>${escapeHtml(lead.estimateTitle || lead.clientName || "Current estimate")}</strong>
          <p>${escapeHtml(lead.projectAddress || "Address pending")}</p>
          <div class="simple-meta">${escapeHtml("Not visible in the secure portal yet.")}</div>
          <div class="inline-actions">
            ${customerPortalActionButton({
              action: "publish-estimate",
              label: "Review & publish",
              targetType: "estimate",
              targetId: lead.id,
              leadId: lead.id,
            })}
            <button type="button" class="ghost-button" data-open-lead="${escapeHtml(lead.id)}" data-open-view="leads-view">Open lead</button>
          </div>
        </article>
      `;
    }),
    ...estimateShares.map((share) => {
      const shareUrl = estimateShareUrl(share.id);
      const agreementUrl = estimateShareAgreementUrl(share.id);
      const lead = state.leads.find((entry) => entry.id === share.leadId) || null;
      const isSigned = safeString(share.status) === "signed";
      const isActive = safeString(share.status) === "active";
      const statusLabel = estimateShareStatusLabel(share);
      return `
        <article class="simple-item">
          <div class="record-topline">
            <span class="mini-pill">${escapeHtml(isSigned ? "Signed estimate" : "Estimate")}</span>
            <span class="mini-pill">${escapeHtml(statusLabel)}</span>
          </div>
          <strong>${escapeHtml(share.estimateSnapshot?.subject || share.title || "Estimate")}</strong>
          <p>${escapeHtml(share.projectAddress || lead?.projectAddress || "Address pending")}</p>
          <div class="simple-meta">${escapeHtml(
            isSigned
              ? `Signed ${formatDateTime(share.signedAt)}`
              : shareVisibleInPortal(share)
                ? "Visible and signable in the secure portal."
                : "Not currently visible in the secure portal.",
          )}</div>
          <div class="inline-actions">
            ${customerPortalActionButton({
              action: "publish-estimate",
              label: isActive ? "Review replacement" : "Review & publish",
              targetType: "estimate",
              targetId: share.leadId,
              leadId: share.leadId,
            })}
            ${
              shareUrl
                ? `<a class="ghost-button" href="${escapeHtml(shareUrl)}" target="_blank" rel="noreferrer">${escapeHtml(isActive ? "Open portal" : "Open record")}</a>`
                : ""
            }
            ${
              isActive
                ? customerPortalActionButton({
                    action: "revoke-estimate",
                    label: "Unpublish",
                    targetType: "estimate-share",
                    targetId: share.id,
                    leadId: share.leadId,
                  })
                : ""
            }
            ${
              !isSigned
                ? customerPortalActionButton({
                    action: "delete-estimate",
                    label: "Delete",
                    targetType: "estimate-share",
                    targetId: share.id,
                    leadId: share.leadId,
                  })
                : agreementUrl
                  ? `<a class="ghost-button" href="${escapeHtml(agreementUrl)}" target="_blank" rel="noreferrer">Signed PDF</a>`
                  : ""
            }
          </div>
        </article>
      `;
    }),
  ].join("") || `<div class="empty-note">No published estimate records are active on this customer yet.</div>`;

  refs.customerPortalInvoiceList.innerHTML =
    invoices.length
      ? invoices
          .map((invoice) => {
            const visible = invoiceVisibleInPortal(invoice);
            return `
              <article class="simple-item">
                <div class="record-topline">
                  <span class="mini-pill">${escapeHtml(invoice.invoiceNumber || "Invoice")}</span>
                  <span class="mini-pill">${escapeHtml(visible ? "Visible" : "Hidden")}</span>
                </div>
                <strong>${escapeHtml(invoice.title || "Invoice")}</strong>
                <p>${escapeHtml(invoice.projectAddress || invoice.summary || "Billing record")}</p>
                <div class="simple-meta">${escapeHtml(
                  `${formatCurrency(invoice.subtotal || 0)} · ${INVOICE_STATUS_META[invoice.status] || "Draft"}`,
                )}</div>
                <div class="inline-actions">
                  ${customerPortalActionButton({
                    action: visible ? "hide-invoice" : "show-invoice",
                    label: visible ? "Hide" : "Show",
                    targetType: "invoice",
                    targetId: invoice.id,
                    projectId: invoice.projectId,
                  })}
                  <button type="button" class="ghost-button" data-open-project="${escapeHtml(invoice.projectId)}" data-open-view="jobs-view">Open job</button>
                </div>
              </article>
            `;
          })
          .join("")
      : `<div class="empty-note">No invoices are tied to this customer yet.</div>`;

  refs.customerPortalChangeOrderList.innerHTML =
    changeOrders.length
      ? changeOrders
          .map((changeOrder) => {
            const share =
              state.customerPortalEstimateShares.find(
                (entry) =>
                  safeString(entry.id) === safeString(changeOrder.portalShareId) &&
                  safeString(entry.type) === "change_order",
              ) || null;
            const shareUrl = share ? estimateShareUrl(share.id) : "";
            const agreementUrl = share ? estimateShareAgreementUrl(share.id) : "";
            const status =
              safeString(changeOrder.portalStatus) ||
              (safeString(changeOrder.status) === "approved" && safeString(changeOrder.agreementId)
                ? "signed"
                : "draft");
            return `
              <article class="simple-item">
                <div class="record-topline">
                  <span class="mini-pill">Change order</span>
                  <span class="mini-pill">${escapeHtml(estimateShareStatusLabel({ status }))}</span>
                </div>
                <strong>${escapeHtml(changeOrder.title || "Change order")}</strong>
                <p>${escapeHtml(changeOrder.projectAddress || "Project revision")}</p>
                <div class="simple-meta">${escapeHtml(
                  `${formatCurrency(changeOrder.amount || 0)} · ${changeOrder.note || "Written project revision"}`,
                )}</div>
                <div class="inline-actions">
                  ${customerPortalActionButton({
                    action: "publish-change-order",
                    label: status === "published" ? "Republish" : "Publish",
                    targetType: "change-order",
                    targetId: changeOrder.id,
                    projectId: changeOrder.projectId,
                  })}
                  ${
                    shareUrl
                      ? `<a class="ghost-button" href="${escapeHtml(shareUrl)}" target="_blank" rel="noreferrer">${escapeHtml(status === "signed" ? "Open record" : "Open portal")}</a>`
                      : ""
                  }
                  ${
                    status === "published"
                      ? customerPortalActionButton({
                          action: "revoke-change-order",
                          label: "Unpublish",
                          targetType: "change-order",
                          targetId: changeOrder.id,
                          projectId: changeOrder.projectId,
                        })
                      : ""
                  }
                  ${
                    status !== "signed"
                      ? customerPortalActionButton({
                          action: "delete-change-order",
                          label: "Delete",
                          targetType: "change-order",
                          targetId: changeOrder.id,
                          projectId: changeOrder.projectId,
                        })
                      : agreementUrl
                        ? `<a class="ghost-button" href="${escapeHtml(agreementUrl)}" target="_blank" rel="noreferrer">Signed PDF</a>`
                        : ""
                  }
                </div>
              </article>
            `;
          })
          .join("")
      : `<div class="empty-note">No change orders are tied to this customer yet.</div>`;

  refs.customerPortalDocumentList.innerHTML =
    state.customerDocuments.length
      ? state.customerDocuments
          .map((document) => {
            const forcedVisible = Boolean(safeString(document.agreementId));
            const visible = forcedVisible || document.clientVisible === true;
            return `
              <article class="simple-item">
                <div class="record-topline">
                  <span class="mini-pill">${escapeHtml(DOCUMENT_CATEGORY_META[document.category] || "Document")}</span>
                  <span class="mini-pill">${escapeHtml(visible ? "Visible" : "Hidden")}</span>
                </div>
                <strong>${escapeHtml(document.title || "Document")}</strong>
                <p>${escapeHtml(document.projectAddress || document.note || "Shared file")}</p>
                <div class="simple-meta">${escapeHtml(
                  forcedVisible
                    ? "Signed portal record stays visible automatically."
                    : visible
                      ? "Visible in the secure portal."
                      : "Hidden from the secure portal.",
                )}</div>
                <div class="inline-actions">
                  ${
                    forcedVisible
                      ? `<span class="ghost-button" aria-disabled="true">Protected</span>`
                      : customerPortalActionButton({
                          action: visible ? "hide-document" : "show-document",
                          label: visible ? "Hide" : "Show",
                          targetType: "document",
                          targetId: document.id,
                        })
                  }
                  ${
                    safeString(document.fileUrl || document.externalUrl)
                      ? `<a class="ghost-button" href="${escapeHtml(document.fileUrl || document.externalUrl)}" target="_blank" rel="noreferrer">Open file</a>`
                      : ""
                  }
                </div>
              </article>
            `;
          })
          .join("")
      : `<div class="empty-note">No customer documents are available to manage yet.</div>`;
}

function notificationItemFromLead(
  lead,
  { idPrefix, pill, copy, secondaryPill = "", timestamp } = {},
) {
  return {
    id: `${idPrefix}:${safeString(lead.id)}`,
    title:
      safeString(lead.clientName || lead.projectAddress || "Lead update") ||
      "Lead update",
    copy:
      safeString(copy || lead.projectAddress || lead.projectType) ||
      "Lead activity",
    pill,
    secondaryPill,
    timestamp: toMillis(timestamp || lead.updatedAt || lead.createdAt),
    dataAttrs: {
      "data-open-lead": safeString(lead.id),
      "data-open-view": "leads-view",
    },
  };
}

function notificationItemFromProject(
  project,
  { idPrefix, pill, copy, secondaryPill = "", timestamp } = {},
) {
  return {
    id: `${idPrefix}:${safeString(project.id)}`,
    title:
      safeString(
        project.projectAddress || project.clientName || project.customerName,
      ) || "Job update",
    copy:
      safeString(copy || project.clientName || project.customerName) ||
      "Job activity",
    pill,
    secondaryPill,
    timestamp: toMillis(timestamp || project.updatedAt || project.createdAt),
    dataAttrs: {
      "data-open-project": safeString(project.id),
      "data-open-view": "jobs-view",
    },
  };
}

function recentNotificationItems() {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 14;
  const items = [];

  visibleLeads()
    .filter((lead) => toMillis(lead.createdAt || lead.updatedAt) >= cutoff)
    .forEach((lead) => {
      items.push(
        notificationItemFromLead(lead, {
          idPrefix: "lead-created",
          pill: "New lead",
          copy:
            lead.projectAddress ||
            `${lead.projectType || "Project"} lead was added to the CRM.`,
          secondaryPill: formatDateTime(lead.createdAt || lead.updatedAt),
          timestamp: lead.createdAt || lead.updatedAt,
        }),
      );
    });

  visibleLeads()
    .filter((lead) => {
      const updatedAt = toMillis(lead.updatedAt);
      const createdAt = toMillis(lead.createdAt);
      return (
        safeString(lead.assignedToUid) &&
        updatedAt >= cutoff &&
        updatedAt > createdAt + 60000
      );
    })
    .forEach((lead) => {
      items.push(
        notificationItemFromLead(lead, {
          idPrefix: "lead-assigned",
          pill: "Assigned",
          copy: `Assigned to ${lead.assignedToName || lead.assignedToEmail || "staff"}.`,
          secondaryPill: formatDateTime(lead.updatedAt),
          timestamp: lead.updatedAt,
        }),
      );
    });

  visibleProjects()
    .filter((project) => toMillis(project.createdAt || project.updatedAt) >= cutoff)
    .forEach((project) => {
      items.push(
        notificationItemFromProject(project, {
          idPrefix: "job-created",
          pill: "Job won",
          copy:
            project.clientName ||
            project.customerName ||
            "Lead converted into a live job.",
          secondaryPill: formatDateTime(project.createdAt || project.updatedAt),
          timestamp: project.createdAt || project.updatedAt,
        }),
      );
    });

  if (isAdmin()) {
    state.portalQueueEstimateShares.forEach((share) => {
      const lead =
        state.leads.find((item) => item.id === share.leadId) || null;
      const project = lead ? projectForLead(lead) : null;
      const status = safeString(share.status);
      const type = safeString(share.type || "estimate");
      const timestamp =
        share.signedAt || share.updatedAt || share.publishedAt || share.createdAt;

      if (!["active", "signed"].includes(status)) {
        return;
      }

      items.push({
        id: `${type}:${safeString(share.id)}`,
        title:
          safeString(
            share.estimateSnapshot?.subject ||
              share.title ||
              lead?.projectAddress ||
              "Client approval",
          ) || "Client approval",
        copy:
          status === "signed"
            ? type === "change_order"
              ? "Client signed the published change order."
              : "Client signed the estimate agreement."
            : type === "change_order"
              ? "A published change order is awaiting signature."
              : "A published estimate is awaiting signature.",
        pill:
          status === "signed"
            ? "Client signed"
            : type === "change_order"
              ? "Change order"
              : "Awaiting signature",
        secondaryPill: formatDateTime(timestamp),
        timestamp: toMillis(timestamp),
        dataAttrs:
          status === "signed" && project?.id
            ? {
                "data-open-project": safeString(project.id),
                "data-open-view": "jobs-view",
              }
            : {
                "data-open-lead": safeString(share.leadId),
                "data-open-view": "leads-view",
              },
      });
    });

    state.portalQueueThreads
      .filter((thread) => toNumber(thread.staffUnreadCount) > 0)
      .forEach((thread) => {
        items.push({
          id: `thread:${safeString(thread.id)}`,
          title: portalThreadTitle(thread),
          copy: safeString(thread.lastMessagePreview || "Client reply waiting."),
          pill: "Client reply",
          secondaryPill: `${toNumber(thread.staffUnreadCount)} unread`,
          timestamp: toMillis(
            thread.lastMessageAt || thread.updatedAt || thread.createdAt,
          ),
          dataAttrs: {
            "data-open-customer": safeString(thread.customerId),
            "data-open-view": "customers-view",
          },
        });
      });

    state.portalQueueContacts
      .filter((contact) => {
        if (
          contact.disabledAt ||
          safeString(contact.inviteStatus) === "revoked"
        ) {
          return true;
        }
        return (
          safeString(contact.inviteStatus) === "invited" &&
          toMillis(contact.lastInvitedAt) >= cutoff
        );
      })
      .forEach((contact) => {
        items.push({
          id: `contact:${safeString(contact.id)}`,
          title: safeString(contact.name || contact.email || "Portal contact"),
          copy: safeString(contact.email || "Customer portal access update."),
          pill: "Portal access",
          secondaryPill: portalInviteStatusLabel(contact),
          timestamp: toMillis(
            contact.updatedAt || contact.lastInvitedAt || contact.createdAt,
          ),
          dataAttrs: {
            "data-open-customer": safeString(contact.customerId),
            "data-open-view": "customers-view",
          },
        });
      });
  }

  return items
    .filter((item) => item.timestamp >= cutoff)
    .sort((left, right) => right.timestamp - left.timestamp)
    .filter(
      (item, index, source) =>
        source.findIndex((candidate) => candidate.id === item.id) === index,
    )
    .slice(0, 24);
}

function markAllNotificationsRead() {
  const items = recentNotificationItems();
  markNotificationsRead(items.map((item) => item.id));
  renderNotificationCenter();
}

function toggleNotificationPanel(forceOpen = null) {
  const nextOpen =
    typeof forceOpen === "boolean" ? forceOpen : !state.notificationPanelOpen;
  state.notificationPanelOpen = nextOpen;

  if (nextOpen) {
    markAllNotificationsRead();
    return;
  }

  renderNotificationCenter();
}

function renderNotificationCenter() {
  if (
    !refs.notificationButton ||
    !refs.notificationPanel ||
    !refs.notificationList
  ) {
    return;
  }

  const items = recentNotificationItems();
  const unreadCount = items.filter(
    (item) => !safeString(notificationReadAt(item.id)),
  ).length;

  refs.notificationButton.hidden = !state.profile;
  refs.notificationButton.setAttribute(
    "aria-expanded",
    String(state.notificationPanelOpen),
  );
  refs.notificationCount.textContent = String(unreadCount);
  refs.notificationCount.hidden = unreadCount === 0;
  refs.notificationMarkReadButton.disabled = !items.length || unreadCount === 0;
  refs.notificationPanel.hidden = !state.notificationPanelOpen;

  if (!state.notificationPanelOpen) {
    return;
  }

  if (!items.length) {
    renderEmptyList(refs.notificationList, "No live notifications right now.");
    return;
  }

  refs.notificationList.innerHTML = items
    .map((item) => {
      const attributes = Object.entries({
        ...item.dataAttrs,
        "data-notification-id": item.id,
      })
        .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
        .join(" ");
      const isUnread = !safeString(notificationReadAt(item.id));

      return `
        <button type="button" class="record-button" ${attributes}>
          <div class="record-topline">
            <span class="mini-pill">${escapeHtml(item.pill || "Update")}</span>
            <span class="mini-pill">${escapeHtml(isUnread ? "New" : "Viewed")}</span>
          </div>
          <span class="record-title">${escapeHtml(item.title)}</span>
          <p class="record-copy">${escapeHtml(item.copy)}</p>
          <div class="record-meta">
            <div>${escapeHtml(item.secondaryPill || "")}</div>
            <div>${escapeHtml(formatDateTime(item.timestamp))}</div>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderCustomerPortalThreadList(customer) {
  if (!customer?.id) {
    renderEmptyList(
      refs.customerPortalThreadList,
      "Save the customer first to open portal communication.",
    );
    return;
  }

  if (!state.customerPortalThreads.length) {
    renderEmptyList(
      refs.customerPortalThreadList,
      "No portal conversations have started yet.",
    );
    return;
  }

  refs.customerPortalThreadList.innerHTML = state.customerPortalThreads
    .slice()
    .sort(
      (left, right) =>
        toMillis(right.lastMessageAt || right.updatedAt || right.createdAt) -
        toMillis(left.lastMessageAt || left.updatedAt || left.createdAt),
    )
    .map((thread) => {
      const unread = toNumber(thread.staffUnreadCount);
      const isSelected = thread.id === state.selectedCustomerPortalThreadId;
      return `
                <button type="button" class="record-button portal-thread-button ${isSelected ? "is-selected" : ""}" data-portal-thread-id="${escapeHtml(thread.id)}">
                    <div class="record-topline">
                        <span class="mini-pill">${escapeHtml(safeString(thread.threadType) === "project" ? "Project thread" : "General")}</span>
                        <span class="mini-pill">${escapeHtml(unread ? `${unread} unread` : "Read")}</span>
                    </div>
                    <span class="record-title">${escapeHtml(portalThreadTitle(thread))}</span>
                    <p class="record-copy">${escapeHtml(thread.lastMessagePreview || "No messages yet. The secure portal will keep project communication here.")}</p>
                    <div class="record-meta">
                        <div>${escapeHtml(thread.projectAddress || "Customer-wide communication")}</div>
                        <div>${escapeHtml(thread.lastMessageAt ? formatDateTime(thread.lastMessageAt) : "Waiting for first message")}</div>
                    </div>
                </button>
            `;
    })
    .join("");
}

function renderCustomerPortalConversation(customer) {
  const thread = currentCustomerPortalThread();

  if (!customer?.id || !thread) {
    refs.customerPortalThreadSummary.innerHTML =
      "Select a portal thread to read or reply.";
    renderEmptyList(
      refs.customerPortalMessageList,
      "No client conversation selected yet.",
    );
    refs.customerPortalMessageBody.value = "";
    refs.customerPortalMessageForm.querySelector("button").disabled = true;
    refs.customerPortalMarkReadButton.disabled = true;
    return;
  }

  refs.customerPortalThreadSummary.innerHTML = `
        <div><strong>${escapeHtml(portalThreadTitle(thread))}</strong></div>
        <div>${escapeHtml(thread.projectAddress || "General customer communication")}</div>
        <div>${escapeHtml(thread.lastMessageAt ? `Last activity ${formatDateTime(thread.lastMessageAt)}` : "No messages yet.")}</div>
    `;

  const messages = currentCustomerPortalMessages(thread.id);
  if (!messages.length) {
    renderEmptyList(
      refs.customerPortalMessageList,
      "No messages in this thread yet.",
    );
  } else {
    refs.customerPortalMessageList.innerHTML = messages
      .map(
        (message) => `
            <article class="timeline-item portal-message-item ${safeString(message.authorRole) === "staff" ? "is-staff" : "is-client"}">
                <strong>${escapeHtml(message.authorName || (safeString(message.authorRole) === "staff" ? "Golden Brick" : "Client"))}</strong>
                <p>${escapeHtml(message.body || "")}</p>
                <div class="timeline-meta">
                    ${escapeHtml(safeString(message.authorRole) === "staff" ? "Staff reply" : "Client message")} · ${escapeHtml(formatDateTime(message.createdAt))}
                </div>
            </article>
        `,
      )
      .join("");
  }

  refs.customerPortalMessageForm.querySelector("button").disabled = false;
  refs.customerPortalMarkReadButton.disabled =
    toNumber(thread.staffUnreadCount) === 0;
}

function renderPortalQueuePanel() {
  if (!isAdmin()) {
    refs.portalQueueSummary.innerHTML = "";
    refs.portalQueueList.innerHTML = "";
    return;
  }

  const awaitingSignature = state.portalQueueEstimateShares.filter(
    (share) => safeString(share.status) === "active",
  );
  const invoiceDue = state.portalQueueInvoices.filter(
    (invoice) => safeString(invoice.status) !== "paid",
  );
  const unreadThreads = state.portalQueueThreads.filter(
    (thread) => toNumber(thread.staffUnreadCount) > 0,
  );
  const accessIssues = state.portalQueueContacts.filter((contact) => {
    if (contact.disabledAt || safeString(contact.inviteStatus) === "revoked") {
      return true;
    }
    if (
      safeString(contact.inviteStatus) === "invited" &&
      toMillis(contact.lastInvitedAt) &&
      Date.now() - toMillis(contact.lastInvitedAt) > 1000 * 60 * 60 * 24 * 7
    ) {
      return true;
    }
    return false;
  });

  refs.portalQueueSummary.innerHTML = [
    { label: "Awaiting signature", value: String(awaitingSignature.length) },
    { label: "Invoices due", value: String(invoiceDue.length) },
    { label: "Unread client threads", value: String(unreadThreads.length) },
    { label: "Access issues", value: String(accessIssues.length) },
  ]
    .map(
      (item) => `
        <article class="summary-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `,
    )
    .join("");

  const queueCards = [
    ...awaitingSignature.slice(0, 4).map((share) => {
      const lead = state.leads.find((item) => item.id === share.leadId);
      return stackCardButton({
        title:
          lead?.clientName ||
          lead?.projectAddress ||
          "Estimate awaiting signature",
        copy: lead?.projectAddress || "Client estimate share is still active.",
        pill: "Awaiting signature",
        secondaryPill: formatDateTime(share.createdAt || share.updatedAt),
        dataAttrs: {
          "data-open-lead": share.leadId,
          "data-open-view": "leads-view",
        },
        meta: `<div>${escapeHtml(lead?.customerName || "Lead record")}</div>`,
      });
    }),
    ...invoiceDue.slice(0, 4).map((invoice) => {
      const project =
        state.projects.find((entry) => entry.id === invoice.projectId) || null;
      return stackCardButton({
        title: invoice.title || invoice.invoiceNumber || "Invoice due",
        copy:
          invoice.projectAddress ||
          project?.projectAddress ||
          "Customer billing follow-up is needed.",
        pill: "Invoice due",
        secondaryPill: formatCurrency(invoice.subtotal || 0),
        dataAttrs: {
          "data-open-project": invoice.projectId,
          "data-open-view": "jobs-view",
        },
        meta: `<div>${escapeHtml(invoice.dueDate ? `Due ${formatDateOnly(invoice.dueDate)}` : "No due date")}</div>`,
      });
    }),
    ...unreadThreads.slice(0, 4).map((thread) => {
      return stackCardButton({
        title: portalThreadTitle(thread),
        copy: thread.lastMessagePreview || "New client reply waiting.",
        pill: "Client reply",
        secondaryPill: `${toNumber(thread.staffUnreadCount)} unread`,
        dataAttrs: {
          "data-open-customer": thread.customerId,
          "data-open-view": "customers-view",
        },
        meta: `<div>${escapeHtml(thread.projectAddress || "General customer thread")}</div>`,
      });
    }),
    ...accessIssues.slice(0, 4).map((contact) => {
      return stackCardButton({
        title: contact.name || contact.email || "Portal contact",
        copy: contact.email || "Portal access issue",
        pill: "Access issue",
        secondaryPill: portalInviteStatusLabel(contact),
        dataAttrs: {
          "data-open-customer": contact.customerId,
          "data-open-view": "customers-view",
        },
        meta: `<div>${escapeHtml(contact.lastInvitedAt ? `Last invite ${formatDateOnly(contact.lastInvitedAt)}` : "No invite sent yet")}</div>`,
      });
    }),
  ];

  if (!queueCards.length) {
    renderEmptyList(
      refs.portalQueueList,
      "The secure portal queue is clear right now.",
    );
    return;
  }

  refs.portalQueueList.innerHTML = queueCards.join("");
}

function renderTrashPanel() {
  if (!refs.trashSummary || !refs.trashList) {
    return;
  }

  if (!isAdmin()) {
    refs.trashSummary.innerHTML = "";
    refs.trashList.innerHTML = "";
    return;
  }

  const archivedLeads = archivedRecords(state.leads);
  const archivedProjects = archivedRecords(state.projects);
  const archivedEvents = archivedRecords(state.calendarEvents);
  const trashItems = [
    ...archivedLeads.map((lead) => ({
      type: "lead",
      id: lead.id,
      title: lead.clientName || lead.projectAddress || "Archived lead",
      copy: lead.projectType || lead.clientPhone || "Lead archived",
      archivedAt: lead.archivedAt,
      archivedByName: lead.archivedByName,
      reason: lead.archiveReason,
      pill: "Lead",
    })),
    ...archivedProjects.map((project) => ({
      type: "project",
      id: project.id,
      title: project.clientName || project.projectAddress || "Archived job",
      copy: project.projectType || project.customerName || "Job archived",
      archivedAt: project.archivedAt,
      archivedByName: project.archivedByName,
      reason: project.archiveReason,
      pill: "Job",
    })),
    ...archivedEvents.map((event) => ({
      type: "calendarEvent",
      id: event.id,
      title: event.title || event.clientTitle || "Archived calendar event",
      copy: calendarEventRelationLabel(event),
      archivedAt: event.archivedAt,
      archivedByName: event.archivedByName,
      reason: event.archiveReason,
      pill: "Calendar",
    })),
  ].sort((left, right) => toMillis(right.archivedAt) - toMillis(left.archivedAt));

  refs.trashSummary.innerHTML = [
    { label: "Archived leads", value: String(archivedLeads.length) },
    { label: "Archived jobs", value: String(archivedProjects.length) },
    { label: "Archived events", value: String(archivedEvents.length) },
  ]
    .map(
      (item) => `
        <article class="summary-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `,
    )
    .join("");

  if (!trashItems.length) {
    renderEmptyList(refs.trashList, "Trash is empty. Archived records will appear here.");
    return;
  }

  refs.trashList.innerHTML = trashItems
    .map(
      (item) => `
        <article class="trash-card">
          <div>
            <div class="record-topline">
              <span class="mini-pill">${escapeHtml(item.pill)}</span>
              <span class="mini-pill">${escapeHtml(item.archivedAt ? formatDateTime(item.archivedAt) : "Archived")}</span>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.copy)}</p>
            <div class="record-meta">
              <div>${escapeHtml(item.archivedByName ? `Archived by ${item.archivedByName}` : "Archived by staff")}</div>
              <div>${escapeHtml(item.reason || "No reason entered")}</div>
            </div>
          </div>
          <button
            type="button"
            class="secondary-button"
            data-trash-restore="${escapeHtml(item.type)}"
            data-trash-id="${escapeHtml(item.id)}"
          >
            Restore
          </button>
        </article>
      `,
    )
    .join("");
}

function renderCustomerList() {
  const customers = filteredCustomers();

  if (!customers.length) {
    renderEmptyList(
      refs.customerList,
      "No customers match the current search.",
    );
    return;
  }

  refs.customerList.innerHTML = customers
    .map((customer) => {
      const rollup = customerRollup(customer);
      return `
            <button type="button" class="record-button ${customer.id === state.selectedCustomerId && !state.customerDraft ? "is-selected" : ""}" data-customer-id="${escapeHtml(customer.id)}">
                <div class="record-topline">
                    <span class="mini-pill">${escapeHtml(`${rollup.openLeads.length} open`)}</span>
                    <span class="mini-pill">${escapeHtml(`${rollup.projects.length} jobs`)}</span>
                </div>
                <span class="record-title">${escapeHtml(customer.name || "Unnamed customer")}</span>
                <p class="record-copy">${escapeHtml(customer.primaryAddress || customer.primaryEmail || customer.primaryPhone || "No contact info")}</p>
                <div class="record-meta">
                    <div>${escapeHtml(customer.primaryPhone || "No phone")}</div>
                    <div>${escapeHtml(formatCurrency(rollup.totalWonSales))} won sales</div>
                    <div>${escapeHtml(formatCurrency(rollup.totalPaymentsReceived))} payments received</div>
                </div>
                <span class="record-edit-affordance">Open &amp; edit</span>
            </button>
        `;
    })
    .join("");
}

function renderCustomerRecordContext(customer, rollup) {
  if (!customer) {
    refs.customerRecordContext.innerHTML = "";
    return;
  }

  const latestLead = latestByUpdated(rollup.openLeads);
  const latestProject = latestByUpdated(rollup.projects);
  const openCustomerTasks = customer.id
    ? activeTasksForEntity("customerId", customer.id)
    : [];
  const contactValue =
    customer.primaryPhone ||
    customer.primaryEmail ||
    customer.primaryAddress ||
    "Add contact details";
  const contactMeta =
    [customer.primaryEmail, customer.primaryAddress]
      .filter(Boolean)
      .join(" · ") || "Main investor contact details live here.";

  refs.customerRecordContext.innerHTML = [
    buildContextCard({
      label: "Primary contact",
      title: contactValue,
      meta: contactMeta,
      muted: true,
    }),
    buildContextCard({
      label: "Current opportunity",
      title: latestLead
        ? latestLead.clientName || latestLead.projectAddress || "Open lead"
        : "No open opportunity",
      meta: latestLead
        ? `${STATUS_META[latestLead.status] || "Lead"} · ${formatCurrency(latestLead.estimateSubtotal || 0)}`
        : "Create a new lead when this client has another project.",
      dataAttrs: latestLead
        ? {
            "data-open-lead": latestLead.id,
            "data-open-view": "leads-view",
          }
        : {},
      muted: !latestLead,
    }),
    buildContextCard({
      label: "Latest job",
      title: latestProject
        ? latestProject.projectAddress ||
          latestProject.clientName ||
          "Job record"
        : "No job yet",
      meta: latestProject
        ? `${latestProject.status === "completed" ? "Completed" : "In progress"} · Paid ${formatCurrency(latestProject.financials?.totalPayments || 0)}`
        : "Won work for this customer will appear here.",
      dataAttrs: latestProject
        ? {
            "data-open-project": latestProject.id,
            "data-open-view": "jobs-view",
          }
        : {},
      muted: !latestProject,
    }),
    buildContextCard({
      label: "Open tasks",
      title: customer.id ? String(openCustomerTasks.length) : "Save first",
      meta: customer.id
        ? openCustomerTasks[0]?.title
          ? `Next: ${openCustomerTasks[0].title}`
          : "No active account-level tasks."
        : "Save the customer before creating tasks.",
      muted: true,
    }),
  ].join("");
}

function renderCustomerDetail() {
  const customer = currentCustomer();

  if (!customer) {
    refs.customerRecordTitle.textContent = "Select a customer";
    refs.customerRecordBadge.textContent = "No customer selected";
    refs.customerRecordBadge.className = "status-pill neutral";
    refs.customerRecordContext.innerHTML = "";
    refs.customerDocumentTargetSelect.innerHTML = `<option value="">Save the customer first</option>`;
    refs.customerDocumentTargetSelect.disabled = true;
    refs.customerPortalSummary.innerHTML = "";
    refs.customerPortalPublishingSummary.innerHTML = "";
    setCustomerPortalPreviewLink(null);
    refs.customerPortalContactForm.reset();
    refs.customerPortalContactRole.value = "primary";
    renderEmptyList(
      refs.customerPortalContactList,
      "Select a customer to manage portal access.",
    );
    renderEmptyList(
      refs.customerPortalEstimateList,
      "Select a customer to manage published estimates.",
    );
    renderEmptyList(
      refs.customerPortalInvoiceList,
      "Select a customer to manage invoice visibility.",
    );
    renderEmptyList(
      refs.customerPortalChangeOrderList,
      "Select a customer to manage published change orders.",
    );
    renderEmptyList(
      refs.customerPortalDocumentList,
      "Select a customer to manage client-visible documents.",
    );
    renderEmptyList(
      refs.customerPortalThreadList,
      "Select a customer to open portal communication.",
    );
    refs.customerPortalThreadSummary.innerHTML =
      "Select a customer to open portal communication.";
    renderEmptyList(
      refs.customerPortalMessageList,
      "Select a customer to open portal communication.",
    );
    refs.customerDocumentSummary.innerHTML = "";
    renderEmptyList(
      refs.customerDocumentList,
      "Select a customer to manage shared documents.",
    );
    refs.customerPortalMessageForm.querySelector("button").disabled = true;
    refs.customerPortalMarkReadButton.disabled = true;
    refs.customerDocumentForm.querySelector("button").disabled = true;
    refs.customerRecordEmpty.hidden = false;
    refs.customerRecordShell.hidden = true;
    return;
  }

  const rollup = customerRollup(customer);

  refs.customerRecordEmpty.hidden = true;
  refs.customerRecordShell.hidden = false;
  refs.customerRecordTitle.textContent = customer.name || "New customer";
  refs.customerRecordBadge.textContent = customer.id
    ? `${rollup.projects.length} jobs linked`
    : "Draft";
  refs.customerRecordBadge.className = customer.id
    ? "status-pill"
    : "status-pill neutral";
  refs.customerNameInput.value = customer.name || "";
  refs.customerEmailInput.value = customer.primaryEmail || "";
  refs.customerPhoneInput.value = customer.primaryPhone || "";
  refs.customerAddressInput.value = customer.primaryAddress || "";
  refs.customerNotesInput.value = customer.notes || "";

  renderCustomerRecordContext(customer, rollup);
  refs.customerSummary.innerHTML = [
    { label: "Open opportunities", value: rollup.openLeads.length },
    { label: "Won jobs", value: rollup.projects.length },
    { label: "Lost leads", value: rollup.lostLeads.length },
    { label: "Won sales", value: formatCurrency(rollup.totalWonSales) },
    {
      label: "Payments received",
      value: formatCurrency(rollup.totalPaymentsReceived),
    },
    {
      label: "Estimate leads",
      value: String(rollup.estimateLeads.length),
    },
  ]
    .map(
      (item) => `
        <article class="summary-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `,
    )
    .join("");

  if (!rollup.openLeads.length) {
    renderEmptyList(
      refs.customerOpportunitiesList,
      "No open opportunities linked to this customer.",
    );
  } else {
    refs.customerOpportunitiesList.innerHTML = rollup.openLeads
      .map((lead) =>
        stackCardButton({
          title: lead.clientName || "Unnamed lead",
          copy: lead.projectAddress || "Address pending",
          pill: STATUS_META[lead.status] || "Lead",
          secondaryPill: formatCurrency(lead.estimateSubtotal || 0),
          dataAttrs: {
            "data-open-lead": lead.id,
            "data-open-view": "leads-view",
          },
          meta: `<div>${escapeHtml(lead.projectType || "General scope")}</div>`,
        }),
      )
      .join("");
  }

  if (!rollup.projects.length) {
    renderEmptyList(
      refs.customerJobsList,
      "No jobs linked to this customer yet.",
    );
  } else {
    refs.customerJobsList.innerHTML = rollup.projects
      .map((project) =>
        stackCardButton({
          title: project.clientName || "Unnamed job",
          copy: project.projectAddress || "Address pending",
          pill: JOB_STATUS_META[project.status] || "In Progress",
          secondaryPill: formatCurrency(projectRevenueValue(project)),
          dataAttrs: {
            "data-open-project": project.id,
            "data-open-view": "jobs-view",
          },
          meta: `<div>Paid ${escapeHtml(formatCurrency(project.financials?.totalPayments || 0))}</div>`,
        }),
      )
      .join("");
  }

  const shareByLead = estimateShareMapByLead(
    publishedEstimateSharesForCustomer(customer.id),
  );
  refs.customerCurrentEstimate.innerHTML = rollup.estimateLeads.length
    ? rollup.estimateLeads
        .map((estimateLead) => {
          const share = shareByLead.get(safeString(estimateLead.id)) || null;
          const status = share
            ? estimateShareStatusLabel(share)
            : "Draft only";
          return `
            <button type="button" class="record-button" data-open-lead="${escapeHtml(estimateLead.id)}" data-open-view="leads-view">
              <div class="record-topline">
                <span class="mini-pill">${escapeHtml(status)}</span>
                <span class="mini-pill">${escapeHtml(formatCurrency(estimateLead.estimateSubtotal || 0))}</span>
              </div>
              <span class="record-title">${escapeHtml(estimateLead.estimateTitle || estimateLead.clientName || "Estimate")}</span>
              <p class="record-copy">${escapeHtml(estimateLead.projectAddress || "Address pending")}</p>
              <div class="record-meta">
                <div>${escapeHtml(share ? "Published history available" : "Internal draft only")}</div>
                <div>${escapeHtml(formatDateTime(estimateLead.estimateUpdatedAt || estimateLead.updatedAt || estimateLead.createdAt))}</div>
              </div>
            </button>
          `;
        })
        .join("")
    : "No estimate linked to this customer yet.";

  renderEntityTaskList(
    refs.customerTaskList,
    customer.id ? relatedTasksForEntity("customerId", customer.id) : [],
    "Save the customer first to attach tasks.",
  );
  renderCustomerPortalSummary(customer, rollup);
  renderCustomerPortalContactList(customer);
  renderCustomerPortalPublishingPanel(customer, rollup);
  renderCustomerPortalThreadList(customer);
  renderCustomerPortalConversation(customer);
  renderCustomerDocumentTargetOptions(customer, rollup);
  renderCustomerDocumentSourceFields();
  renderCustomerDocumentSummary();
  renderCustomerDocumentList();
  renderTaskAssigneeOptions(
    refs.customerTaskAssignee,
    currentStaffFocusUid() || state.profile?.uid || "",
  );
  refs.customerTaskForm.querySelector("button").disabled = !customer.id;
  refs.customerPortalContactForm.querySelector("button").disabled =
    !customer.id;
  refs.customerDocumentForm.querySelector("button").disabled =
    !customer.id || !refs.customerDocumentTargetSelect.value;

  const selectedPortalContact = currentCustomerPortalContact();
  if (selectedPortalContact) {
    refs.customerPortalContactName.value = selectedPortalContact.name || "";
    refs.customerPortalContactEmail.value = selectedPortalContact.email || "";
    refs.customerPortalContactPhone.value = selectedPortalContact.phone || "";
    refs.customerPortalContactRole.value =
      selectedPortalContact.role || "primary";
    setCustomerPortalPreviewLink(selectedPortalContact);
  } else {
    refs.customerPortalContactForm.reset();
    refs.customerPortalContactRole.value = "primary";
    setCustomerPortalPreviewLink(null);
  }

  if (!refs.customerDocumentDate.value) {
    refs.customerDocumentDate.value = todayDateInputValue();
  }
  if (!refs.customerDocumentSourceType.value) {
    refs.customerDocumentSourceType.value = "upload";
    renderCustomerDocumentSourceFields();
  }
}

function renderJobMetrics() {
  const projects = visibleProjects();
  const inProgress = projects.filter(
    (project) => project.status !== "completed",
  ).length;
  const completed = projects.filter(
    (project) => project.status === "completed",
  ).length;
  const totalRevenue = projects.reduce(
    (sum, project) => sum + projectRevenueValue(project),
    0,
  );
  const totalPayments = projects.reduce(
    (sum, project) => sum + toNumber(projectFinancials(project).totalPayments),
    0,
  );

  renderMetricStrip(refs.jobMetrics, [
    { label: "Open jobs", value: inProgress },
    { label: "Completed jobs", value: completed },
    { label: "Contract revenue", value: formatCurrency(totalRevenue) },
    { label: "Payments received", value: formatCurrency(totalPayments) },
  ]);
}

function renderJobList() {
  const projects = filteredProjects();
  refs.jobStatusFilterButtons.forEach((button) => {
    const isActive = button.dataset.jobStatusFilter === state.jobStatus;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  if (refs.jobListHeading) {
    refs.jobListHeading.textContent =
      state.jobStatus === "completed"
        ? "Completed projects"
        : "Active projects";
  }

  if (!projects.length) {
    renderEmptyList(refs.jobList, "No jobs match the current filters.");
    return;
  }

  refs.jobList.innerHTML = projects
    .map((project) => {
      const financials = projectFinancials(project);
      const billingState = projectBillingState(project);
      const kindLabel = projectWorkflowLabel(project);
      const openTasks = relatedTasksForEntity("projectId", project.id).filter(
        (task) => !taskIsCompleted(task),
      );
      const statusLabel = JOB_STATUS_META[project.status] || "In Progress";
      return `
            <button type="button" class="record-button job-record-card ${project.id === state.selectedProjectId ? "is-selected" : ""}" data-project-id="${escapeHtml(project.id)}">
                <div class="job-card-main">
                    <div>
                        <div class="record-topline">
                            <span class="mini-pill">${escapeHtml(statusLabel)}</span>
                            <span class="mini-pill">${escapeHtml(kindLabel)}</span>
                            ${billingState ? `<span class="mini-pill">${escapeHtml(billingState.label)}</span>` : ""}
                        </div>
                        <span class="record-title">${escapeHtml(project.projectAddress || "Address pending")}</span>
                        <p class="record-copy">${escapeHtml(project.clientName || project.customerName || "Unnamed client")} · ${escapeHtml(project.projectType || "Project")}</p>
                    </div>
                    <span class="job-open-affordance">Open &amp; edit</span>
                </div>
                <div class="job-card-kpis">
                    <span><strong>${escapeHtml(formatCurrency(projectRevenueValue(project)))}</strong> Contract</span>
                    <span><strong>${escapeHtml(formatCurrency(firstFiniteNumber(financials.balanceRemaining, project.balanceRemaining, 0)))}</strong> Balance</span>
                    <span><strong>${escapeHtml(formatCurrency(firstFiniteNumber(financials.projectedGrossProfit, financials.profit, 0)))}</strong> Profit</span>
                    <span><strong>${escapeHtml(String(openTasks.length))}</strong> Open tasks</span>
                </div>
                <div class="record-meta">
                    <div>${escapeHtml(project.customerName || "No linked customer")}</div>
                    <div>${escapeHtml(project.projectType || "Project scope not set")}</div>
                </div>
            </button>
        `;
    })
    .join("");
}

function renderJobProjectSwitcher(project = currentProject()) {
  if (!refs.jobProjectSwitcherSelect) return;

  const completedView = project?.status === "completed";
  const options = sortByUpdatedDesc(
    visibleProjects().filter((item) =>
      completedView
        ? item.status === "completed"
        : item.status !== "completed",
    ),
  );
  refs.jobProjectSwitcherSelect.innerHTML = options.length
    ? options
        .map(
          (item) => `
            <option value="${escapeHtml(item.id)}">${escapeHtml(item.projectAddress || "Address pending")} — ${escapeHtml(item.clientName || item.customerName || "Unnamed client")}</option>
          `,
        )
        .join("")
    : `<option value="">No projects available</option>`;
  refs.jobProjectSwitcherSelect.value = options.some(
    (item) => item.id === project?.id,
  )
    ? project.id
    : options[0]?.id || "";
}

function calendarStatusLabel(status) {
  return CALENDAR_STATUS_META[safeString(status || "scheduled")] || "Scheduled";
}

function calendarTypeLabel(type) {
  return CALENDAR_TYPE_META[safeString(type || "job_work")] || "Job work";
}

function calendarEventRelationLabel(event) {
  const project = event.projectId
    ? state.projects.find((item) => item.id === event.projectId)
    : null;
  const lead = event.leadId
    ? state.leads.find((item) => item.id === event.leadId)
    : null;
  const customer = event.customerId
    ? state.customers.find((item) => item.id === event.customerId)
    : null;

  return (
    project?.projectAddress ||
    project?.clientName ||
    lead?.projectAddress ||
    lead?.clientName ||
    customer?.name ||
    "No linked record"
  );
}

function calendarAssignedStaffLabel(event) {
  const assignedUids = Array.isArray(event.assignedStaffUids)
    ? event.assignedStaffUids
    : [];
  const names = assignedUids
    .map((uid) => {
      const member = state.staffRoster.find((item) => item.uid === uid);
      return member?.displayName || member?.email || "";
    })
    .filter(Boolean);

  if (names.length) {
    return names.slice(0, 3).join(", ");
  }

  return event.assignedStaffNames?.slice?.(0, 3)?.join(", ") || "Unassigned";
}

function renderCalendarFilterOptions() {
  if (!refs.calendarStaffFilter || !refs.calendarProjectFilter) {
    return;
  }

  const staffOptions = [`<option value="">All staff</option>`].concat(
    activeStaffOptions().map(
      (member) => `
        <option value="${escapeHtml(member.uid)}">${escapeHtml(member.displayName || member.email || "Staff member")}</option>
      `,
    ),
  );
  refs.calendarStaffFilter.innerHTML = staffOptions.join("");
  refs.calendarStaffFilter.value = activeStaffOptions().some(
    (member) => member.uid === state.calendarStaffUid,
  )
    ? state.calendarStaffUid
    : "";

  refs.calendarProjectFilter.innerHTML = [`<option value="">All jobs</option>`]
    .concat(
      visibleProjects().map(
        (project) => `
          <option value="${escapeHtml(project.id)}">${escapeHtml(project.projectAddress || "Address pending")} — ${escapeHtml(project.clientName || project.customerName || "Unnamed client")}</option>
        `,
      ),
    )
    .join("");
  refs.calendarProjectFilter.value = visibleProjects().some(
    (project) => project.id === state.calendarProjectId,
  )
    ? state.calendarProjectId
    : "";
}

function renderCalendarFormOptions() {
  if (!refs.calendarLinkedProjectSelect) {
    return;
  }

  const selectedProjectId =
    refs.calendarLinkedProjectSelect.value || state.calendarProjectId || "";
  const selectedProject = visibleProjects().find(
    (project) => project.id === selectedProjectId,
  );
  const selectedCustomerId =
    refs.calendarLinkedCustomerSelect.value ||
    selectedProject?.customerId ||
    "";

  refs.calendarLinkedCustomerSelect.innerHTML = [
    `<option value="">Choose a client</option>`,
  ]
    .concat(
      visibleCustomers().map(
        (customer) => `
          <option value="${escapeHtml(customer.id)}">${escapeHtml(customer.name || customer.primaryEmail || "Unnamed client")}</option>
        `,
      ),
    )
    .join("");
  refs.calendarLinkedCustomerSelect.value = visibleCustomers().some(
    (customer) => customer.id === selectedCustomerId,
  )
    ? selectedCustomerId
    : "";

  const selectedCustomer = visibleCustomers().find(
    (customer) => customer.id === refs.calendarLinkedCustomerSelect.value,
  );
  const matchingProjects = visibleProjects().filter((project) => {
    if (project.status === "completed") return false;
    if (!selectedCustomer) return true;
    return (
      project.customerId === selectedCustomer.id ||
      safeString(project.customerName || project.clientName).toLowerCase() ===
        safeString(selectedCustomer.name).toLowerCase()
    );
  });
  refs.calendarLinkedProjectSelect.innerHTML = [
    `<option value="">${selectedCustomer ? "Choose a project address" : "Choose a client first or view all projects"}</option>`,
  ]
    .concat(
      matchingProjects.map(
        (project) => `
          <option value="${escapeHtml(project.id)}">${escapeHtml(project.projectAddress || "Address pending")} — ${escapeHtml(project.clientName || project.customerName || "Unnamed client")}</option>
        `,
      ),
    )
    .join("");
  refs.calendarLinkedProjectSelect.value = matchingProjects.some(
    (project) => project.id === selectedProjectId,
  )
    ? selectedProjectId
    : "";

  const selectedLeadId = refs.calendarLinkedLeadSelect.value || "";
  const matchingLeads = visibleLeads().filter((lead) => {
    if (!selectedCustomer) return true;
    return (
      lead.customerId === selectedCustomer.id ||
      safeString(lead.clientName).toLowerCase() ===
        safeString(selectedCustomer.name).toLowerCase()
    );
  });
  refs.calendarLinkedLeadSelect.innerHTML = [`<option value="">No linked lead</option>`]
    .concat(
      matchingLeads.map(
        (lead) => `
          <option value="${escapeHtml(lead.id)}">${escapeHtml(lead.projectAddress || "Address pending")} — ${escapeHtml(lead.clientName || "Unnamed lead")}</option>
        `,
      ),
    )
    .join("");
  refs.calendarLinkedLeadSelect.value = matchingLeads.some(
    (lead) => lead.id === selectedLeadId,
  )
    ? selectedLeadId
    : "";

  const selectedStaffUids = new Set(
    Array.from(refs.calendarAssignedStaffSelect.selectedOptions || []).map(
      (option) => option.value,
    ),
  );
  refs.calendarAssignedStaffSelect.innerHTML = activeStaffOptions()
    .map(
      (member) => `
        <option value="${escapeHtml(member.uid)}">${escapeHtml(member.displayName || member.email || "Staff member")}</option>
      `,
    )
    .join("");
  Array.from(refs.calendarAssignedStaffSelect.options || []).forEach(
    (option) => {
      option.selected = selectedStaffUids.has(option.value);
    },
  );
}

function renderCalendarMetrics() {
  const events = visibleCalendarEvents();
  const today = events.filter((event) => isSameDay(event.startAt, new Date()));
  const upcoming = events.filter(
    (event) => calendarEventStartMillis(event) >= Date.now(),
  );
  const clientVisible = events.filter((event) => event.clientVisible === true);
  const needsAttention = events.filter(
    (event) => safeString(event.status) === "needs_attention",
  );

  renderMetricStrip(refs.calendarMetrics, [
    { label: "Today", value: today.length },
    { label: "Upcoming", value: upcoming.length },
    { label: "Client-visible", value: clientVisible.length },
    { label: "Needs attention", value: needsAttention.length },
  ]);
}

function renderCalendarList() {
  const events = filteredCalendarEvents();
  if (!events.length) {
    renderEmptyList(
      refs.calendarList,
      "No schedule events match the current filters.",
    );
    return;
  }

  refs.calendarList.innerHTML = events
    .map((event) => {
      const relationLabel = calendarEventRelationLabel(event);
      const projectButton = event.projectId
        ? `<button type="button" class="ghost-button" data-open-project="${escapeHtml(event.projectId)}" data-open-view="jobs-view">Open job</button>`
        : "";
      const leadButton =
        !event.projectId && event.leadId
          ? `<button type="button" class="ghost-button" data-open-lead="${escapeHtml(event.leadId)}" data-open-view="leads-view">Open lead</button>`
          : "";
      const archiveButton = isAdmin()
        ? `<button type="button" class="danger-link" data-calendar-archive="${escapeHtml(event.id)}">Archive event</button>`
        : "";
      return `
        <article class="calendar-event-card">
          <div class="calendar-event-time">
            <strong>${escapeHtml(formatDateTime(event.startAt))}</strong>
            <span>${escapeHtml(event.endAt ? `Ends ${formatDateTime(event.endAt)}` : event.allDay ? "All day" : "No end time")}</span>
          </div>
          <div class="calendar-event-body">
            <div class="record-topline">
              <span class="mini-pill">${escapeHtml(calendarTypeLabel(event.type))}</span>
              <span class="mini-pill">${escapeHtml(calendarStatusLabel(event.status))}</span>
              ${event.clientVisible ? `<span class="mini-pill">Client-visible</span>` : ""}
            </div>
            <h3>${escapeHtml(event.title || event.clientTitle || "Scheduled event")}</h3>
            <p>${escapeHtml(event.internalNote || event.clientNote || relationLabel)}</p>
            <div class="record-meta">
              <div>${escapeHtml(relationLabel)}</div>
              <div>${escapeHtml(calendarAssignedStaffLabel(event))}</div>
            </div>
            <div class="inline-actions calendar-event-actions">
              ${projectButton}
              ${leadButton}
              ${archiveButton}
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCalendarView() {
  if (!refs.calendarMetrics) {
    return;
  }
  renderGoogleCalendarConnection();
  refs.calendarScopeFilter.value = state.calendarScope;
  refs.calendarStatusFilter.value = state.calendarStatus;
  renderCalendarFilterOptions();
  renderCalendarFormOptions();
  if (!refs.calendarStartInput.value) {
    refs.calendarStartInput.value = formatDateInputValue(new Date());
  }
  if (
    !Array.from(refs.calendarAssignedStaffSelect.selectedOptions || []).length &&
    state.profile?.uid
  ) {
    Array.from(refs.calendarAssignedStaffSelect.options || []).forEach(
      (option) => {
        option.selected = option.value === state.profile.uid;
      },
    );
  }
  refs.calendarClientVisibleInput.disabled = !isAdmin();
  refs.calendarClientTitleInput.disabled = !isAdmin();
  refs.calendarClientNoteInput.disabled = !isAdmin();
  renderCalendarMetrics();
  renderCalendarList();
}

function renderJobCalendarPanel(project) {
  if (!refs.jobCalendarSummary || !refs.jobCalendarList) {
    return;
  }
  if (!project?.id) {
    refs.jobCalendarSummary.innerHTML = "";
    renderEmptyList(refs.jobCalendarList, "Select a job to see its schedule.");
    return;
  }

  const events = calendarEventsForProject(project.id);
  const upcoming = events.filter(
    (event) => calendarEventStartMillis(event) >= Date.now(),
  );
  const clientVisible = events.filter((event) => event.clientVisible === true);
  const nextEvent = upcoming[0] || null;

  refs.jobCalendarSummary.innerHTML = [
    { label: "Upcoming", value: String(upcoming.length) },
    { label: "Client-visible", value: String(clientVisible.length) },
    {
      label: "Next event",
      value: nextEvent ? formatDateTime(nextEvent.startAt) : "Not scheduled",
    },
  ]
    .map(
      (item) => `
        <article class="summary-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `,
    )
    .join("");

  if (!events.length) {
    renderEmptyList(
      refs.jobCalendarList,
      "No events yet. Add crew work, appointments, milestones, inspections, or client updates from Calendar.",
    );
    return;
  }

  refs.jobCalendarList.innerHTML = events
    .slice(0, 5)
    .map(
      (event) => `
        <article class="timeline-item">
          <strong>${escapeHtml(event.title || event.clientTitle || "Scheduled event")}</strong>
          <p>${escapeHtml(calendarTypeLabel(event.type))} · ${escapeHtml(calendarStatusLabel(event.status))}</p>
          <div class="timeline-meta">
            ${escapeHtml(formatDateTime(event.startAt))}
            ${event.clientVisible ? " · Client-visible" : ""}
          </div>
        </article>
      `,
    )
    .join("");
}

function renderWorkerAssignments(project) {
  const roster = isAdmin()
    ? activeStaffOptions()
    : (project.assignedWorkers || []).map((worker) => ({
        uid: worker.uid,
        email: worker.email,
        displayName: worker.name || worker.email,
      }));

  if (!roster.length) {
    renderEmptyList(
      refs.workerAssignmentList,
      "No staff records available yet.",
    );
    return;
  }

  refs.workerAssignmentList.innerHTML = roster
    .map((member) => {
      const key = member.uid || member.email || "";
      const assigned = (project.assignedWorkers || []).find(
        (worker) => worker.uid === member.uid || worker.email === member.email,
      );
      const editable = isAdmin() && Boolean(member.uid);
      return `
            <div class="worker-row">
                <label>
                    <input type="checkbox" data-worker-check="${escapeHtml(key)}" ${assigned ? "checked" : ""} ${editable ? "" : "disabled"}>
                    <span>${escapeHtml((member.displayName || member.email || "Assigned worker") + (isAdmin() && !member.uid ? " (sign in once to activate)" : ""))}</span>
                </label>
                <input type="number" data-worker-percent="${escapeHtml(key)}" min="0" step="0.01" value="${escapeHtml(assigned?.percent ?? "")}" placeholder="% split" ${editable ? "" : "disabled"}>
            </div>
        `;
    })
    .join("");
}

function normaliseAssignedProjectWorkers(project) {
  const storedWorkers = Array.isArray(project?.financials?.workerBreakdown)
    ? project.financials.workerBreakdown
    : [];
  const source =
    Array.isArray(project?.assignedWorkers) && project.assignedWorkers.length
      ? project.assignedWorkers
      : storedWorkers;

  return source
    .filter((worker) => safeString(worker?.uid || worker?.email || worker?.name))
    .map((worker, index) => ({
      uid: safeString(worker.uid || `worker-${index + 1}`),
      name: safeString(worker.name || worker.email || "Assigned worker"),
      email: safeString(worker.email),
      percent: toNumber(worker.percent),
    }));
}

function calculateProjectFinancialSnapshot({
  baseContractValue = 0,
  assignedWorkers = [],
  expenses = [],
  payments = [],
  changeOrders = [],
  storedFinancials = {},
} = {}) {
  const safeBaseContractValue = firstFiniteNumber(
    baseContractValue,
    storedFinancials.baseContractValue,
    0,
  );
  const approvedChangeOrdersTotal = changeOrders
    .filter(
      (changeOrder) =>
        normaliseChangeOrderStatus(changeOrder?.status) === "approved",
    )
    .reduce((sum, changeOrder) => sum + toNumber(changeOrder.amount), 0);
  const totalContractRevenue = safeBaseContractValue + approvedChangeOrdersTotal;
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + toNumber(expense.amount),
    0,
  );
  const totalPayments = payments.reduce(
    (sum, payment) => sum + toNumber(payment.amount),
    0,
  );
  const rawProfit = totalContractRevenue - totalExpenses;
  const distributableProfit = Math.max(rawProfit, 0);
  const companyShare = distributableProfit * 0.5;
  const workerPool = distributableProfit * 0.5;
  const cashPosition = totalPayments - totalExpenses;
  const balanceRemaining = totalContractRevenue - totalPayments;
  const team = Array.isArray(assignedWorkers) ? assignedWorkers : [];
  const totalPercent = team.reduce((sum, worker) => sum + toNumber(worker.percent), 0);
  const workerBreakdown = team.map((worker, index) => {
    let effectivePercent = toNumber(worker.percent);

    if (team.length === 1 && totalPercent <= 0) {
      effectivePercent = 100;
    } else if (totalPercent > 0) {
      effectivePercent = (toNumber(worker.percent) / totalPercent) * 100;
    }

    return {
      uid: safeString(worker.uid || `worker-${index + 1}`),
      name: safeString(worker.name || worker.email || "Assigned worker"),
      email: safeString(worker.email),
      percent: Number(effectivePercent.toFixed(2)),
      amount: Number(((workerPool * effectivePercent) / 100).toFixed(2)),
    };
  });

  return {
    ...storedFinancials,
    baseContractValue: Number(safeBaseContractValue.toFixed(2)),
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
  };
}

function initialProjectFinancials(baseContractValue = 0, assignedWorkers = []) {
  return calculateProjectFinancialSnapshot({
    baseContractValue,
    assignedWorkers,
    expenses: [],
    payments: [],
    changeOrders: [],
    storedFinancials: {},
  });
}

function selectedProjectFinancialsReady(project) {
  return Boolean(
    project?.id &&
      project.id === state.selectedProjectId &&
      state.projectDetailLoaded.expenses &&
      state.projectDetailLoaded.payments &&
      state.projectDetailLoaded.changeOrders,
  );
}

function computeSelectedProjectFinancials(project) {
  const storedFinancials = project?.financials || {};
  if (!selectedProjectFinancialsReady(project)) {
    return storedFinancials;
  }

  return calculateProjectFinancialSnapshot({
    baseContractValue: firstFiniteNumber(
      project?.baseContractValue,
      storedFinancials.baseContractValue,
      project?.jobValue,
      0,
    ),
    assignedWorkers: normaliseAssignedProjectWorkers(project),
    expenses: state.projectExpenses,
    payments: state.projectPayments,
    changeOrders: state.projectChangeOrders,
    storedFinancials,
  });
}

function projectFinancials(project) {
  return computeSelectedProjectFinancials(project);
}

async function loadProjectDetailDocs(projectId, childCollection) {
  const snapshot = await getDocs(
    collection(state.db, "projects", projectId, childCollection),
  );
  return snapshot.docs.map(normaliseFirestoreDoc);
}

async function syncProjectFinancialSnapshot(
  projectId,
  {
    projectData = null,
    baseContractValue = null,
    assignedWorkers = null,
    expenses = null,
    payments = null,
    changeOrders = null,
  } = {},
) {
  if (!projectId) {
    return null;
  }

  let project =
    projectData ||
    (state.selectedProjectId === projectId ? currentProject() : null) ||
    state.projects.find((entry) => entry.id === projectId) ||
    null;

  if (!project) {
    const projectSnapshot = await getDoc(doc(state.db, "projects", projectId));
    if (!projectSnapshot.exists()) {
      return null;
    }
    project = normaliseFirestoreDoc(projectSnapshot);
  }

  const resolvedExpenses = Array.isArray(expenses)
    ? expenses
    : state.selectedProjectId === projectId && state.projectDetailLoaded.expenses
      ? state.projectExpenses
      : await loadProjectDetailDocs(projectId, "expenses");
  const resolvedPayments = Array.isArray(payments)
    ? payments
    : state.selectedProjectId === projectId && state.projectDetailLoaded.payments
      ? state.projectPayments
      : await loadProjectDetailDocs(projectId, "payments");
  const resolvedChangeOrders = Array.isArray(changeOrders)
    ? changeOrders
    : state.selectedProjectId === projectId &&
        state.projectDetailLoaded.changeOrders
      ? state.projectChangeOrders
      : await loadProjectDetailDocs(projectId, "changeOrders");
  const resolvedAssignedWorkers = Array.isArray(assignedWorkers)
    ? assignedWorkers
    : normaliseAssignedProjectWorkers(project);
  const resolvedBaseContractValue = firstFiniteNumber(
    baseContractValue,
    project?.baseContractValue,
    project?.financials?.baseContractValue,
    project?.jobValue,
    0,
  );
  const financials = calculateProjectFinancialSnapshot({
    baseContractValue: resolvedBaseContractValue,
    assignedWorkers: resolvedAssignedWorkers,
    expenses: resolvedExpenses,
    payments: resolvedPayments,
    changeOrders: resolvedChangeOrders,
    storedFinancials: project?.financials || {},
  });

  await updateDoc(doc(state.db, "projects", projectId), {
    baseContractValue: financials.baseContractValue,
    approvedChangeOrdersTotal: financials.approvedChangeOrdersTotal,
    totalContractRevenue: financials.totalContractRevenue,
    cashPosition: financials.cashPosition,
    balanceRemaining: financials.balanceRemaining,
    jobValue: financials.totalContractRevenue,
    financials,
    updatedAt: serverTimestamp(),
  });

  return financials;
}

function isServiceOrderProject(project) {
  return safeString(project?.jobKind) === "service_order";
}

function projectRevenueValue(project) {
  const financials = projectFinancials(project);
  return firstFiniteNumber(
    financials.totalContractRevenue,
    project?.totalContractRevenue,
    project?.jobValue,
    project?.baseContractValue,
    0,
  );
}

function projectKindLabel(project) {
  return isServiceOrderProject(project)
    ? JOB_KIND_META.service_order
    : JOB_KIND_META.standard;
}

function projectWorkflowLabel(project) {
  if (!project) {
    return JOB_KIND_META.standard;
  }

  if (isServiceOrderProject(project)) {
    return JOB_KIND_META.service_order;
  }

  return safeString(project.leadId) ? "Lead-linked job" : "Direct job";
}

function projectBillingState(project, invoices = null) {
  if (!project) return null;

  const financials = projectFinancials(project);
  const totalRevenue = projectRevenueValue(project);
  const totalPayments = toNumber(financials.totalPayments || 0);
  const invoiceSet = Array.isArray(invoices) ? invoices : [];
  const hasReadyLink =
    invoiceSet.some(
      (invoice) =>
        safeString(invoice.stripeCheckoutUrl) &&
        safeString(invoice.status) !== "paid",
    ) || safeString(project.billingStatus) === "payment_link_ready";

  if (totalRevenue > 0 && totalPayments >= totalRevenue - 0.01) {
    return {
      key: "paid",
      label: SERVICE_BILLING_META.paid,
    };
  }

  if (totalPayments > 0) {
    return {
      key: "partially_paid",
      label: SERVICE_BILLING_META.partially_paid,
    };
  }

  if (hasReadyLink) {
    return {
      key: "payment_link_ready",
      label: SERVICE_BILLING_META.payment_link_ready,
    };
  }

  if (safeString(project.paymentRequirement) === "can_pay_later") {
    return {
      key: "can_pay_later",
      label: SERVICE_BILLING_META.can_pay_later,
    };
  }

  if (
    isServiceOrderProject(project) ||
    safeString(project.paymentRequirement) === "upfront_required"
  ) {
    return {
      key: "awaiting_payment",
      label: SERVICE_BILLING_META.awaiting_payment,
    };
  }

  return null;
}

function lockedCommissionSnapshot(project) {
  return project?.lockedCommissionSnapshot || null;
}

function documentHref(item) {
  return safeString(item?.fileUrl || item?.externalUrl || item?.receiptUrl);
}

function renderSimpleEntries(container, items, formatter, emptyMessage) {
  if (!items.length) {
    renderEmptyList(container, emptyMessage);
    return;
  }

  container.innerHTML = items.map((item) => formatter(item)).join("");
}

function renderJobOwnerOptions(project) {
  if (!isAdmin()) {
    refs.jobOwnerSelect.innerHTML = `<option value="${escapeHtml(project.assignedLeadOwnerUid || state.profile?.uid || "")}">${escapeHtml(project.assignedWorkers?.[0]?.name || state.profile?.displayName || "Lead owner")}</option>`;
    refs.jobOwnerSelect.disabled = true;
    return;
  }

  refs.jobOwnerSelect.disabled = false;
  refs.jobOwnerSelect.innerHTML = [`<option value="">Unassigned</option>`]
    .concat(
      activeStaffOptions().map(
        (member) => `
            <option value="${escapeHtml(member.uid || "")}" ${project.assignedLeadOwnerUid === member.uid ? "selected" : ""} ${member.uid ? "" : "disabled"}>
                ${escapeHtml((member.displayName || member.email) + (member.uid ? "" : " (sign in once to activate)"))}
            </option>
        `,
      ),
    )
    .join("");
}

function renderJobCustomerOptions(project) {
  const currentCustomerId = safeString(project?.customerId);
  const currentCustomer =
    currentCustomerId &&
    state.customers.find((customer) => customer.id === currentCustomerId);

  if (!isAdmin()) {
    refs.jobCustomerSelect.innerHTML = currentCustomerId
      ? `<option value="${escapeHtml(currentCustomerId)}">${escapeHtml(currentCustomer?.name || project?.customerName || "Linked customer")}</option>`
      : `<option value="">No linked customer</option>`;
    refs.jobCustomerSelect.disabled = true;
    return;
  }

  const customers = sortByUpdatedDesc(state.customers);
  const missingCurrentOption =
    currentCustomerId &&
    !customers.some((customer) => customer.id === currentCustomerId)
      ? `
            <option value="${escapeHtml(currentCustomerId)}" selected>
                ${escapeHtml(currentCustomer?.name || project?.customerName || "Linked customer")}
            </option>
        `
      : "";

  refs.jobCustomerSelect.disabled = false;
  refs.jobCustomerSelect.innerHTML = [
    `<option value="">No linked customer</option>`,
    missingCurrentOption,
    customers
      .map(
        (customer) => `
            <option value="${escapeHtml(customer.id)}" ${customer.id === currentCustomerId ? "selected" : ""}>
                ${escapeHtml(`${customer.name || "Unnamed customer"} · ${customer.primaryPhone || customer.primaryEmail || customer.primaryAddress || "No contact info"}`)}
            </option>
        `,
      )
      .join(""),
  ].join("");

  refs.jobCustomerSelect.value = currentCustomerId || "";
}

function applyJobCustomerSelection(customerId) {
  if (!isAdmin()) {
    return;
  }

  const customer = customerId
    ? state.customers.find((item) => item.id === customerId)
    : null;
  if (!customer) {
    return;
  }

  refs.jobClientNameInput.value = customer.name || refs.jobClientNameInput.value;

  if (!safeString(refs.jobClientPhoneInput.value)) {
    refs.jobClientPhoneInput.value = customer.primaryPhone || "";
  }

  if (!safeString(refs.jobClientEmailInput.value)) {
    refs.jobClientEmailInput.value = customer.primaryEmail || "";
  }

  if (!safeString(refs.jobProjectAddressInput.value)) {
    refs.jobProjectAddressInput.value = customer.primaryAddress || "";
  }
}

function renderJobRecordContext(project) {
  if (!project) {
    refs.jobRecordContext.innerHTML = "";
    return;
  }

  const linkedLead = project.leadId
    ? state.leads.find((lead) => lead.id === project.leadId)
    : null;
  const linkedCustomer = project.customerId
    ? state.customers.find((customer) => customer.id === project.customerId)
    : null;
  const openProjectTasks = project.id
    ? activeTasksForEntity("projectId", project.id)
    : [];
  const assignedWorkers = Array.isArray(project.assignedWorkers)
    ? project.assignedWorkers.filter((worker) =>
        safeString(worker.uid || worker.email),
      )
    : [];
  const financials = projectFinancials(project);
  const billingState = projectBillingState(project);

  refs.jobRecordContext.innerHTML = [
    buildContextCard({
      label: "Customer",
      title:
        linkedCustomer?.name || project.customerName || "No linked customer",
      meta: linkedCustomer
        ? `${customerRollup(linkedCustomer).openLeads.length} open opportunities`
        : "Linked customer keeps repeat work and payments connected.",
      dataAttrs: linkedCustomer
        ? {
            "data-open-customer": linkedCustomer.id,
            "data-open-view": "customers-view",
          }
        : {},
      muted: !linkedCustomer,
    }),
    buildContextCard({
      label: "Linked lead",
      title: linkedLead
        ? linkedLead.clientName || linkedLead.projectAddress || "Original lead"
        : "No linked lead",
      meta: linkedLead
        ? `${STATUS_META[linkedLead.status] || "Lead"} · ${formatCurrency(linkedLead.estimateSubtotal || 0)} estimate`
        : "This job was created directly from the jobs workspace.",
      dataAttrs: linkedLead
        ? {
            "data-open-lead": linkedLead.id,
            "data-open-view": "leads-view",
          }
        : {},
      muted: !linkedLead,
    }),
    buildContextCard({
      label: "Open tasks",
      title: String(openProjectTasks.length),
      meta: openProjectTasks[0]?.title
        ? `Next: ${openProjectTasks[0].title}`
        : "No active tasks linked to this job.",
      dataAttrs: project.id ? { "data-command": "job-create-task" } : {},
      muted: !project.id,
    }),
    buildContextCard({
      label: "Job type",
      title: projectWorkflowLabel(project),
      meta: isServiceOrderProject(project)
        ? `${SERVICE_PAYMENT_RULE_META[project.paymentRequirement] || "Upfront required"} · ${billingState?.label || SERVICE_BILLING_META.awaiting_payment}`
        : linkedLead
          ? "Operational job converted from a won lead."
          : "Operational job created directly in the jobs workspace.",
      muted: true,
    }),
    buildContextCard({
      label: "Cash position",
      title: formatCurrency(
        financials.cashPosition || project.cashPosition || 0,
      ),
      meta: assignedWorkers.length
        ? `${assignedWorkers.length} assigned · Balance ${formatCurrency(firstFiniteNumber(financials.balanceRemaining, project.balanceRemaining, 0))}`
        : "Assign workers and expenses to track the true margin.",
      muted: true,
    }),
  ].join("");
}

function renderJobSummaryStrip(project) {
  const financials = projectFinancials(project);
  refs.jobSummaryStrip.innerHTML = [
    {
      label: "Total contract revenue",
      value: formatCurrency(projectRevenueValue(project)),
    },
    {
      label: "Payments received",
      value: formatCurrency(firstFiniteNumber(financials.totalPayments, 0)),
    },
    {
      label: "Expenses recorded",
      value: formatCurrency(firstFiniteNumber(financials.totalExpenses, 0)),
    },
    {
      label: "Projected gross profit",
      value: formatCurrency(
        financials.projectedGrossProfit || financials.profit || 0,
      ),
    },
    {
      label: "Cash position",
      value: formatCurrency(
        financials.cashPosition || project.cashPosition || 0,
      ),
    },
    {
      label: "Balance remaining",
      value: formatCurrency(
        financials.balanceRemaining || project.balanceRemaining || 0,
      ),
    },
  ]
    .map(
      (item) => `
        <article class="finance-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `,
    )
    .join("");
}

function renderJobOverviewSummary(project) {
  const financials = projectFinancials(project);
  const linkedLead = project.leadId
    ? state.leads.find((lead) => lead.id === project.leadId)
    : null;
  const openTasks = relatedTasksForEntity("projectId", project.id).filter(
    (task) => !taskIsCompleted(task),
  );
  const assignedWorkers = Array.isArray(project.assignedWorkers)
    ? project.assignedWorkers.length
    : 0;

  refs.jobOverviewSummary.innerHTML = [
    {
      label: "Job kind",
      value: projectWorkflowLabel(project),
    },
    {
      label: "Lead owner",
      value:
        project.assignedWorkers?.find(
          (worker) => worker.uid === project.assignedLeadOwnerUid,
        )?.name ||
        state.staffRoster.find(
          (member) => member.uid === project.assignedLeadOwnerUid,
        )?.displayName ||
        "Unassigned",
    },
    { label: "Assigned workers", value: String(assignedWorkers) },
    { label: "Open tasks", value: String(openTasks.length) },
    {
      label: "Billing state",
      value:
        projectBillingState(project, state.projectInvoices)?.label ||
        "Not billed",
    },
    {
      label: "Estimate total",
      value: linkedLead
        ? formatCurrency(linkedLead.estimateSubtotal || 0)
        : "No estimate",
    },
    {
      label: "Balance remaining",
      value: formatCurrency(
        financials.balanceRemaining || project.balanceRemaining || 0,
      ),
    },
  ]
    .map(
      (item) => `
        <article class="summary-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `,
    )
    .join("");
}

function renderJobWorkPanel(project) {
  if (!refs.jobWorkSummary || !refs.jobWorkTaskList) {
    return;
  }

  if (!project?.id) {
    refs.jobWorkSummary.innerHTML = "";
    refs.jobWorkFinancials.innerHTML = "";
    renderEmptyList(refs.jobWorkTaskList, "Select a job to see open work.");
    renderEmptyList(refs.jobWorkScheduleList, "Select a job to see schedule.");
    return;
  }

  const financials = projectFinancials(project);
  const openTasks = relatedTasksForEntity("projectId", project.id)
    .filter((task) => !taskIsCompleted(task))
    .sort((left, right) => toMillis(left.dueAt) - toMillis(right.dueAt));
  const events = calendarEventsForProject(project.id).filter(
    (event) => calendarEventStartMillis(event) >= Date.now(),
  );

  refs.jobWorkSummary.innerHTML = [
    {
      label: "Phase",
      value: project.phaseLabel || JOB_STATUS_META[project.status] || "Active",
    },
    { label: "Next step", value: project.nextStep || "Not set" },
    {
      label: "Target",
      value:
        project.targetWindow ||
        (project.targetDate ? formatDateOnly(project.targetDate) : "Not set"),
    },
    {
      label: "Balance",
      value: formatCurrency(
        firstFiniteNumber(financials.balanceRemaining, project.balanceRemaining, 0),
      ),
    },
  ]
    .map(
      (item) => `
        <article class="summary-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `,
    )
    .join("");

  refs.jobWorkFinancials.innerHTML = [
    { label: "Contract", value: formatCurrency(projectRevenueValue(project)) },
    {
      label: "Paid",
      value: formatCurrency(firstFiniteNumber(financials.totalPayments, 0)),
    },
    {
      label: "Expenses",
      value: formatCurrency(firstFiniteNumber(financials.totalExpenses, 0)),
    },
    {
      label: "Profit",
      value: formatCurrency(
        firstFiniteNumber(
          financials.projectedGrossProfit,
          financials.profit,
          0,
        ),
      ),
    },
  ]
    .map(
      (item) => `
        <article class="finance-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `,
    )
    .join("");

  renderEntityTaskList(
    refs.jobWorkTaskList,
    openTasks.slice(0, 5),
    "No open tasks linked to this job.",
  );

  if (!events.length) {
    renderEmptyList(refs.jobWorkScheduleList, "No upcoming events for this job.");
  } else {
    refs.jobWorkScheduleList.innerHTML = events
      .slice(0, 4)
      .map(
        (event) => `
          <article class="timeline-item">
            <strong>${escapeHtml(event.title || event.clientTitle || "Scheduled event")}</strong>
            <p>${escapeHtml(calendarTypeLabel(event.type))} · ${escapeHtml(calendarStatusLabel(event.status))}</p>
            <div class="timeline-meta">${escapeHtml(formatDateTime(event.startAt))}${event.clientVisible ? " · Client-visible" : ""}</div>
          </article>
        `,
      )
      .join("");
  }
}

function renderJobEstimatePanel(project) {
  if (!project) {
    refs.jobEstimateSummary.innerHTML = "";
    refs.jobEstimateStatus.innerHTML =
      "Select a job first to load the original estimate.";
    refs.jobEstimatePreview.innerHTML = `<div class="empty-note">Select a job to review the original estimate.</div>`;
    refs.jobEstimateActions.innerHTML = "";
    return;
  }

  const linkedLead = leadForProject(project);
  const estimate = state.projectLeadEstimate;
  const share = pickCurrentEstimateShare(state.projectLeadEstimateShares);
  const hasEstimate = Boolean(linkedLead?.hasEstimate || estimate);
  const shareUrl = estimateShareUrl(share?.id);
  const signedPdfUrl =
    safeString(share?.status) === "signed" ? estimateShareAgreementUrl(share?.id) : "";
  const previewLead =
    linkedLead || {
      clientName: project.clientName,
      projectAddress: project.projectAddress,
      projectType: project.projectType,
    };
  const lineItems = Array.isArray(estimate?.lineItems) ? estimate.lineItems : [];
  const scopeCount = state.projectScopeItems.length;
  const importedScopeCopy = scopeCount
    ? `${scopeCount} scope item${scopeCount === 1 ? "" : "s"} already imported into this job tracker.`
    : "Scope tracker has not imported the estimate lines yet.";

  refs.jobEstimateSummary.innerHTML = [
    {
      label: "Estimate total",
      value: formatCurrency(
        firstFiniteNumber(estimate?.subtotal, linkedLead?.estimateSubtotal, 0),
      ),
    },
    {
      label: "Portal state",
      value: share
        ? estimateShareStatusLabel(share)
        : hasEstimate
          ? "Draft only"
          : "Missing",
    },
    {
      label: "Line items",
      value: String(lineItems.length || 0),
    },
    {
      label: "Job scope import",
      value: scopeCount ? "Imported" : "Not imported",
    },
  ]
    .map(
      (item) => `
        <article class="summary-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `,
    )
    .join("");

  if (!linkedLead?.id) {
    refs.jobEstimateStatus.innerHTML = `
        <strong>No original estimate on this job</strong>
        <div>This job was created directly in the jobs workspace, so there is no lead estimate attached to compare against here.</div>
    `;
    refs.jobEstimatePreview.innerHTML = `<div class="empty-note">Direct jobs do not start with a lead estimate. Use the overview, financials, invoices, and scope tabs to manage the work from here.</div>`;
    refs.jobEstimateActions.innerHTML = `
        <article class="simple-item">
            <strong>Direct job workflow</strong>
            <p>This job was opened without a lead first, so there is no estimate handoff history. You can still run status updates, billing, expenses, documents, and scope tracking from this record.</p>
        </article>
    `;
    return;
  }

  refs.jobEstimateStatus.innerHTML = hasEstimate
    ? `
        <strong>${escapeHtml(estimate?.subject || linkedLead.estimateTitle || "Original estimate available")}</strong>
        <div>${escapeHtml(
          share
            ? `${estimateShareStatusLabel(share)} in the secure portal. ${importedScopeCopy}`
            : `Internal estimate only. ${importedScopeCopy}`,
        )}</div>
    `
    : `
        <strong>No saved estimate yet</strong>
        <div>This linked lead has not saved an estimate yet, so the job is running without an original proposal snapshot here.</div>
    `;

  refs.jobEstimatePreview.innerHTML =
    estimate && linkedLead
      ? buildEstimatePreviewHtml(previewLead, estimate)
      : `<div class="empty-note">The linked lead exists, but no full estimate draft is loaded yet. Open the lead workspace to create or refresh the estimate.</div>`;

  refs.jobEstimateActions.innerHTML = [
    `
        <article class="simple-item">
            <strong>Source lead record</strong>
            <p>Open the original lead workspace when you need to revise scope, publish a new client estimate, or compare this job against the first proposal.</p>
            <div class="simple-meta">${escapeHtml(
              `${linkedLead.clientName || linkedLead.projectAddress || "Linked lead"} · ${STATUS_META[linkedLead.status] || "Lead"}`,
            )}</div>
            <div class="inline-actions">
                <button type="button" class="secondary-button" data-open-lead="${escapeHtml(linkedLead.id)}" data-open-view="leads-view">
                    Open lead workspace
                </button>
            </div>
        </article>
    `,
    `
        <article class="simple-item">
            <strong>Published version</strong>
            <p>${
              shareUrl
                ? escapeHtml(
                    safeString(share?.status) === "signed"
                      ? "This estimate record is signed. You can open the archived review page or the signed PDF."
                      : "This estimate already has a published version. Open it directly when you need to confirm what was shared.",
                  )
                : escapeHtml(
                    "No published estimate link is active right now. Publish from the lead if you need a new review link.",
                  )
            }</p>
            <div class="simple-meta">${escapeHtml(
              share
                ? `${estimateShareStatusLabel(share)} · ${formatDateTime(share.updatedAt || share.createdAt)}`
                : "Lead estimate only",
            )}</div>
            <div class="inline-actions">
                ${
                  shareUrl
                    ? `<a class="ghost-button" href="${escapeHtml(shareUrl)}" target="_blank" rel="noreferrer">Open client view</a>`
                    : ""
                }
                ${
                  signedPdfUrl
                    ? `<a class="ghost-button" href="${escapeHtml(signedPdfUrl)}" target="_blank" rel="noreferrer">Signed PDF</a>`
                    : ""
                }
            </div>
        </article>
    `,
    `
        <article class="simple-item">
            <strong>Estimate-to-job handoff</strong>
            <p>Use the estimate tab to keep change orders, scope tracking, and billing anchored to the original proposal instead of reconstructing it from memory.</p>
            <div class="simple-meta">${escapeHtml(importedScopeCopy)}</div>
        </article>
    `,
  ].join("");
}

function renderJobTabState() {
  refs.jobTabButtons.forEach((button) => {
    const isActive = button.dataset.jobTab === state.activeJobTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });

  Array.from(document.querySelectorAll("#job-record-shell .tab-pane")).forEach(
    (pane) => {
      const isActive = pane.id === `job-tab-${state.activeJobTab}`;
      pane.classList.toggle("is-active", isActive);
      pane.setAttribute("aria-hidden", String(!isActive));
    },
  );
}

function openJobTab(tab, focusTarget = null) {
  state.activeJobTab = tab;
  renderJobTabState();
  syncLeadRouteState();
  if (!focusTarget) {
    resetRecordWorkspaceScroll(refs.jobRecordShell, { smooth: true });
  }
  queueFocus(focusTarget);
}

function renderExpenseReceiptOptions() {
  const currentValue = refs.expenseReceiptSelect.value || "";
  const receiptDocuments = state.projectDocuments
    .filter((item) => item.category === "receipt")
    .sort(
      (left, right) =>
        toMillis(right.relatedDate || right.createdAt) -
        toMillis(left.relatedDate || left.createdAt),
    );

  refs.expenseReceiptSelect.innerHTML = [
    `<option value="">No linked receipt</option>`,
  ]
    .concat(
      receiptDocuments.map(
        (item) => `
            <option value="${escapeHtml(item.id)}">${escapeHtml(item.title || "Receipt")} · ${escapeHtml(formatDateOnly(item.relatedDate || item.createdAt))}</option>
        `,
      ),
    )
    .join("");
  refs.expenseReceiptSelect.value = receiptDocuments.some(
    (item) => item.id === currentValue,
  )
    ? currentValue
    : "";
}

function renderRevenueSummary(project) {
  const financials = projectFinancials(project);
  refs.jobRevenueSummary.innerHTML = [
    {
      label: "Base contract",
      value: formatCurrency(
        project.baseContractValue || financials.baseContractValue || 0,
      ),
    },
    {
      label: "Approved change orders",
      value: formatCurrency(
        project.approvedChangeOrdersTotal ||
          financials.approvedChangeOrdersTotal ||
          0,
      ),
    },
    {
      label: "Total revenue",
      value: formatCurrency(projectRevenueValue(project)),
    },
    {
      label: "Balance remaining",
      value: formatCurrency(
        financials.balanceRemaining || project.balanceRemaining || 0,
      ),
    },
  ]
    .map(
      (item) => `
        <article class="finance-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `,
    )
    .join("");
}

function renderChangeOrderList() {
  renderSimpleEntries(
    refs.changeOrderList,
    state.projectChangeOrders,
    (changeOrder) => {
      const signed = changeOrderIsSigned(changeOrder);
      const published = changeOrderIsPublished(changeOrder);
      const canEdit = isAdmin() && !published && !signed;
      const canDelete = isAdmin() && !signed;
      const meta = [
        CHANGE_ORDER_STATUS_META[changeOrder.status] || "Draft",
        published ? "Client approval live" : "",
        signed ? "Client approved and signed" : "",
        formatDateOnly(changeOrder.relatedDate || changeOrder.createdAt),
      ].filter(Boolean);

      return `
        <article class="simple-item">
            <strong>${escapeHtml(changeOrder.title || "Change order")} · ${escapeHtml(formatCurrency(changeOrder.amount || 0))}</strong>
            <p>${escapeHtml(changeOrder.note || "")}</p>
            <div class="simple-meta">${meta.map((item) => escapeHtml(item)).join(" · ")}</div>
            ${
              canEdit || canDelete
                ? `
                    <div class="inline-actions">
                        ${
                          canEdit
                            ? `<button type="button" class="ghost-button" data-project-change-order-edit="${escapeHtml(changeOrder.id)}">Edit</button>`
                            : ""
                        }
                        ${
                          canDelete
                            ? `<button type="button" class="ghost-button" data-project-change-order-delete="${escapeHtml(changeOrder.id)}">Delete</button>`
                            : ""
                        }
                    </div>
                `
                : ""
            }
        </article>
    `;
    },
    "No change orders recorded yet.",
  );
}

function renderExpenseList() {
  renderSimpleEntries(
    refs.expenseList,
    state.projectExpenses,
    (expense) => {
      const href = documentHref(expense);
      const lockedVendorBill = safeString(expense.source) === "vendor_bill";
      const canManage = isAdmin() && !lockedVendorBill;
      return `
            <article class="simple-item">
                <strong>${escapeHtml(expense.category || "Expense")} · ${escapeHtml(formatCurrency(expense.amount || 0))}</strong>
                <p>${escapeHtml(expense.note || "")}</p>
                <div class="simple-meta">
                    ${escapeHtml(formatDateOnly(expense.relatedDate || expense.createdAt))} · ${escapeHtml(expense.vendor || "No vendor")}
                    ${expense.source === "vendor_bill" ? " · Mirrored vendor bill" : ""}
                    ${expense.receiptTitle ? ` · Receipt: ${escapeHtml(expense.receiptTitle)}` : ""}
                </div>
                ${href ? `<div class="simple-meta"><a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">Open receipt</a></div>` : ""}
                ${
                  canManage
                    ? `
                        <div class="inline-actions">
                            <button type="button" class="ghost-button" data-project-expense-edit="${escapeHtml(expense.id)}">Edit</button>
                            <button type="button" class="ghost-button" data-project-expense-delete="${escapeHtml(expense.id)}">Delete</button>
                        </div>
                    `
                    : ""
                }
            </article>
        `;
    },
    "No expenses added yet.",
  );
}

function paymentReceiptNumberFor(payment) {
  return (
    safeString(payment?.receiptNumber) ||
    buildPaymentReceiptNumber(
      safeString(payment?.id) || "payment",
      payment?.relatedDate || payment?.createdAt || new Date(),
    )
  );
}

function paymentReceiptProjectTotal(project) {
  const financials = projectFinancials(project);
  const linkedLead = leadForProject(project);
  const baseContractValue = [
    project?.baseContractValue,
    linkedLead?.estimateSubtotal,
    financials?.baseContractValue,
  ]
    .map(toNumber)
    .find((value) => value > 0);

  if (baseContractValue) {
    const approvedChangeOrdersTotal = selectedProjectFinancialsReady(project)
      ? state.projectChangeOrders
          .filter(
            (changeOrder) =>
              normaliseChangeOrderStatus(changeOrder?.status) === "approved",
          )
          .reduce(
            (sum, changeOrder) => sum + toNumber(changeOrder?.amount),
            0,
          )
      : firstFiniteNumber(
          project?.approvedChangeOrdersTotal,
          financials?.approvedChangeOrdersTotal,
          0,
        );
    return Math.max(0, baseContractValue + approvedChangeOrdersTotal);
  }

  return Math.max(
    0,
    [
      project?.totalContractRevenue,
      financials?.totalContractRevenue,
      project?.jobValue,
    ]
      .map(toNumber)
      .find((value) => value > 0) || 0,
  );
}

function paymentReceiptData(project, payment) {
  const paymentId = safeString(payment?.id);
  const amount = toNumber(payment?.amount);
  const payments = state.projectPayments.some(
    (entry) => safeString(entry.id) === paymentId,
  )
    ? state.projectPayments
    : [...state.projectPayments, payment];
  const totalReceived = payments.reduce(
    (sum, entry) => sum + toNumber(entry.amount),
    0,
  );
  const contractValue = paymentReceiptProjectTotal(project);

  return {
    company: {
      name: COMPANY_INFO.name,
      email: COMPANY_INFO.email,
      phone: COMPANY_INFO.phone,
    },
    receipt: {
      number: paymentReceiptNumberFor(payment),
      date: payment?.relatedDate || payment?.createdAt || new Date(),
      amount,
      type:
        PAYMENT_TYPE_META[payment?.paymentType] ||
        safeString(payment?.paymentType) ||
        "Payment",
      method: safeString(payment?.method),
      reference: safeString(
        payment?.reference || payment?.paymentReference,
      ),
      note: safeString(payment?.note),
    },
    client: {
      name: invoiceClientName(project),
    },
    project: {
      address: invoiceProjectAddress(project),
      type: safeString(project?.projectType) || "Construction project",
      label:
        [
          safeString(project?.projectType),
          invoiceProjectAddress(project),
        ]
          .filter(Boolean)
          .join(" - ") || "Construction project",
      contractValue,
      previouslyReceived: Math.max(0, totalReceived - amount),
      totalReceived,
      balanceRemaining: Math.max(0, contractValue - totalReceived),
    },
  };
}

function paymentReceiptTitle(payment) {
  return `Payment Receipt ${paymentReceiptNumberFor(payment)}`;
}

function paymentReceiptNote(payment) {
  return [
    `${PAYMENT_TYPE_META[payment?.paymentType] || "Payment"} receipt for ${formatCurrency(payment?.amount || 0)}.`,
    payment?.method ? `Method: ${payment.method}.` : "",
    payment?.reference || payment?.paymentReference
      ? `Reference: ${payment.reference || payment.paymentReference}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

async function createPaymentReceiptFile(project, payment) {
  const data = paymentReceiptData(project, payment);
  const { jsPDF } = await loadJsPdfModule();
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  buildPaymentReceiptPdf(pdf, data);
  return new File([pdf.output("blob")], paymentReceiptFilename(data), {
    type: "application/pdf",
  });
}

async function downloadPaymentReceipt(payment, button = null) {
  const project = currentProject();
  if (!project || !payment) {
    showToast("Select a recorded payment first.", "error");
    return;
  }

  const originalLabel = button?.textContent || "";
  if (button) {
    button.disabled = true;
    button.textContent = "Preparing receipt...";
  }

  try {
    const receiptFile = await createPaymentReceiptFile(project, payment);
    downloadBlobFile(receiptFile.name, receiptFile, "application/pdf");
    showToast("Payment receipt downloaded.");
  } catch (error) {
    console.error("Payment receipt PDF generation failed.", error);
    const data = paymentReceiptData(project, payment);
    const fallbackName = paymentReceiptFilename(data).replace(/\.pdf$/i, ".html");
    downloadBlobFile(
      fallbackName,
      buildPaymentReceiptHtml(data),
      "text/html;charset=utf-8",
    );
    showToast(
      "Receipt PDF failed. A styled HTML receipt was downloaded instead.",
      "error",
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }
}

async function existingPaymentReceiptDocument(payment) {
  const documentId = safeString(payment?.receiptDocumentId);
  if (!documentId) {
    return null;
  }

  const loaded = state.projectDocuments.find(
    (item) => safeString(item.id) === documentId,
  );
  if (loaded) {
    return loaded;
  }

  const snapshot = await getDoc(doc(state.db, "recordDocuments", documentId));
  return snapshot.exists() ? normaliseFirestoreDoc(snapshot) : null;
}

async function saveAndSharePaymentReceipt(payment, button = null) {
  const project = currentProject();
  if (!project || !payment?.id || !isAdmin()) {
    showToast("Select a recorded payment first.", "error");
    return null;
  }

  const originalLabel = button?.textContent || "";
  if (button) {
    button.disabled = true;
    button.textContent = project.customerId ? "Sending receipt..." : "Saving receipt...";
  }

  try {
    const clientVisible = Boolean(safeString(project.customerId));
    const receiptTitle = paymentReceiptTitle(payment);
    const receiptNote = paymentReceiptNote(payment);
    let receiptDocument = await existingPaymentReceiptDocument(payment);
    let documentId = safeString(receiptDocument?.id);

    if (!documentId) {
      const receiptFile = await createPaymentReceiptFile(project, payment);
      documentId = await createRecordDocument({
        links: buildRecordDocumentLinksFromProject(project),
        category: "receipt",
        sourceType: "upload",
        title: receiptTitle,
        note: receiptNote,
        relatedDate: payment.relatedDate || payment.createdAt || new Date(),
        file: receiptFile,
        clientVisible,
      });
    } else if (clientVisible && receiptDocument?.clientVisible !== true) {
      await updateDoc(doc(state.db, "recordDocuments", documentId), {
        clientVisible: true,
        customerId: project.customerId,
        updatedAt: serverTimestamp(),
      });
    }

    await updateDoc(
      doc(state.db, "projects", project.id, "payments", payment.id),
      {
        receiptNumber: paymentReceiptNumberFor(payment),
        receiptDocumentId: documentId,
        receiptSharedToPortal: clientVisible,
        receiptUpdatedAt: serverTimestamp(),
      },
    );

    await addProjectActivityEntry(
      project.id,
      "payment",
      clientVisible ? "Payment receipt shared" : "Payment receipt saved",
      clientVisible
        ? `${receiptTitle} was saved to Documents and shared through the secure client portal.`
        : `${receiptTitle} was saved to job Documents. Link a customer account to send it through the secure client portal.`,
    );

    if (clientVisible) {
      await postCustomerPortalThreadUpdateSafe({
        customerId: project.customerId,
        projectId: project.id,
        body: buildClientPortalDocumentUpdateMessage({
          project,
          category: "receipt",
          title: receiptTitle,
          note: receiptNote,
        }),
      });
    } else {
      await downloadPaymentReceipt(payment);
    }

    renderJobDocumentSummary();
    renderJobDocumentList();
    showToast(
      clientVisible
        ? "Receipt saved and sent to the client portal."
        : "Receipt saved to Documents and downloaded.",
    );
    return documentId;
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }
}

function renderPaymentReceiptOptions(project) {
  if (!refs.paymentSendReceipt || !refs.paymentReceiptDeliveryCopy) {
    return;
  }

  const canSend = Boolean(safeString(project?.customerId));
  refs.paymentSendReceipt.disabled = !canSend;
  if (!canSend) {
    refs.paymentSendReceipt.checked = false;
  }
  refs.paymentReceiptDeliveryCopy.textContent = canSend
    ? `Sending saves the PDF to Documents and shares it with ${invoiceClientName(project)} in the secure client portal.`
    : "Link this job to a customer account to send receipts. You can still generate and download the PDF.";
}

function renderPaymentList() {
  const project = currentProject();
  renderSimpleEntries(
    refs.paymentList,
    state.projectPayments,
    (payment) => {
      const receiptShared = payment.receiptSharedToPortal === true;
      const receiptSaved = Boolean(safeString(payment.receiptDocumentId));
      const sendLabel = project?.customerId
        ? receiptShared
          ? "Send again"
          : "Send receipt"
        : receiptSaved
          ? "Saved to Documents"
          : "Save receipt";
      const sendDisabled = !project?.customerId && receiptSaved;
      return `
        <article class="simple-item payment-record">
            <div class="payment-record-head">
                <div>
                    <strong>${escapeHtml(PAYMENT_TYPE_META[payment.paymentType] || payment.method || "Payment")} · ${escapeHtml(formatCurrency(payment.amount || 0))}</strong>
                    <div class="simple-meta">${escapeHtml(paymentReceiptNumberFor(payment))}</div>
                </div>
                <span class="payment-receipt-state ${receiptShared ? "is-shared" : ""}">${escapeHtml(receiptShared ? "Receipt shared" : receiptSaved ? "Receipt saved" : "Receipt available")}</span>
            </div>
            <p>${escapeHtml(payment.note || "")}</p>
            <div class="simple-meta">
                ${escapeHtml(formatDateOnly(payment.relatedDate || payment.createdAt))} · ${escapeHtml(payment.method || "No method")}${payment.reference || payment.paymentReference ? ` · Ref ${escapeHtml(payment.reference || payment.paymentReference)}` : ""}${payment.invoiceNumber ? ` · ${escapeHtml(payment.invoiceNumber)}` : ""}
            </div>
            <div class="payment-record-actions">
                <button type="button" class="ghost-button" data-payment-receipt-download="${escapeHtml(payment.id)}">Download receipt</button>
                ${
                  isAdmin()
                    ? `<button type="button" class="secondary-button" data-payment-receipt-send="${escapeHtml(payment.id)}" ${sendDisabled ? "disabled" : ""}>${escapeHtml(sendLabel)}</button>`
                    : ""
                }
            </div>
        </article>
    `;
    },
    "No payments recorded yet.",
  );
}

function estimateScopeItems(estimateData) {
  return Array.isArray(estimateData?.lineItems)
    ? estimateData.lineItems.filter(
        (item) =>
          safeString(item?.label) ||
          safeString(item?.description) ||
          toNumber(item?.amount),
      )
    : [];
}

function scopeItemTitle(item, index) {
  return safeString(item?.title || item?.label) || `Scope item ${index + 1}`;
}

function canImportProjectScope(project) {
  if (
    !isAdmin() ||
    !project?.id ||
    !project?.leadId ||
    state.projectScopeItems.length
  ) {
    return false;
  }

  const linkedLead = state.leads.find((lead) => lead.id === project.leadId);
  return Boolean(linkedLead?.hasEstimate);
}

function renderJobScopeSummary(project) {
  const scopeItems = state.projectScopeItems;
  const completedItems = scopeItems.filter((item) => item.completed);
  const pendingItems = scopeItems.length - completedItems.length;
  const totalScopeAmount = scopeItems.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0,
  );
  const linkedLead = project?.leadId
    ? state.leads.find((lead) => lead.id === project.leadId)
    : null;
  const showImport = canImportProjectScope(project);

  refs.jobScopeImportButton.hidden = !showImport;

  if (!scopeItems.length) {
    if (showImport) {
      refs.jobScopeSummary.innerHTML = `
                <div><strong>Scope snapshot missing:</strong> This older job does not have renovation checklist items yet.</div>
                <div>Import the linked estimate to create a field-friendly checklist without changing the published proposal.</div>
            `;
      return;
    }

    refs.jobScopeSummary.innerHTML = linkedLead?.hasEstimate
      ? "No scope items are saved on this job yet."
      : "No estimate scope is available for this job yet.";
    return;
  }

  refs.jobScopeSummary.innerHTML = `
        <div><strong>Completed:</strong> ${escapeHtml(`${completedItems.length} of ${scopeItems.length}`)}</div>
        <div><strong>Pending:</strong> ${escapeHtml(String(pendingItems))}</div>
        <div><strong>Estimated scope value:</strong> ${escapeHtml(formatCurrency(totalScopeAmount))}</div>
        <div><strong>Source estimate:</strong> ${escapeHtml(linkedLead?.estimateTitle || "Working estimate snapshot")}</div>
    `;
}

function renderJobScopeList(project) {
  const scopeItems = state.projectScopeItems;

  if (!scopeItems.length) {
    renderEmptyList(
      refs.jobScopeList,
      canImportProjectScope(project)
        ? "Import the estimate items to start tracking renovation progress on this job."
        : "No scope items are saved on this job yet.",
    );
    return;
  }

  refs.jobScopeList.innerHTML = scopeItems
    .map(
      (item, index) => `
        <article class="scope-item-card">
            <div class="scope-item-head">
                <label class="scope-item-check">
                    <input type="checkbox" data-scope-complete="${escapeHtml(item.id)}" ${item.completed ? "checked" : ""}>
                    <span class="scope-item-title">${escapeHtml(scopeItemTitle(item, index))}</span>
                </label>
                <div class="scope-item-amount">${escapeHtml(formatCurrency(item.amount || 0))}</div>
            </div>
            <p class="scope-item-copy">${escapeHtml(item.description || "No description on the estimate line item.")}</p>
            <div class="scope-item-meta">
                ${escapeHtml(
                  item.completed
                    ? `Completed ${formatDateTime(item.completedAt || item.updatedAt)}`
                    : "Open for field completion",
                )}
                · ${escapeHtml(`Estimate line ${toNumber(item.estimateIndex) + 1}`)}
            </div>
            <label class="scope-item-note-field">
                <span>Field note</span>
                <textarea data-scope-note="${escapeHtml(item.id)}" rows="3" placeholder="Add field notes, finish details, punch items, or update context.">${escapeHtml(item.note || "")}</textarea>
            </label>
            <div class="inline-actions">
                <button type="button" class="ghost-button" data-scope-save="${escapeHtml(item.id)}">Save note</button>
            </div>
        </article>
    `,
    )
    .join("");
}

async function importProjectScopeFromEstimate() {
  const project = currentProject();
  if (!project?.id || !project.leadId) {
    showToast("This job needs a linked lead with an estimate first.", "error");
    return;
  }

  if (!isAdmin()) {
    showToast("Only admins can import estimate items.", "error");
    return;
  }

  if (state.projectScopeItems.length) {
    showToast("Scope items already exist on this job.", "error");
    return;
  }

  const estimateSnap = await getDoc(doc(state.db, "estimates", project.leadId));
  if (!estimateSnap.exists()) {
    showToast("No estimate was found for this job's linked lead.", "error");
    return;
  }

  const lineItems = estimateScopeItems(estimateSnap.data());
  if (!lineItems.length) {
    showToast("The linked estimate does not have any line items yet.", "error");
    return;
  }

  const batch = writeBatch(state.db);
  lineItems.forEach((item, index) => {
    const scopeRef = doc(
      collection(state.db, "projects", project.id, "scopeItems"),
    );
    batch.set(
      scopeRef,
      {
        id: scopeRef.id,
        title: scopeItemTitle(item, index),
        description: safeString(item.description),
        amount: toNumber(item.amount),
        estimateIndex: index,
        completed: false,
        completedAt: null,
        note: "",
        sourceLeadId: project.leadId,
        createdByUid: state.profile.uid,
        createdByName: state.profile.displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
  await batch.commit();

  await addProjectActivityEntry(
    project.id,
    "scope",
    "Scope items imported",
    `${lineItems.length} estimate line items were copied into the renovation scope tracker.`,
  );
  showToast("Estimate items imported into the job scope tracker.");
}

async function toggleProjectScopeComplete(scopeItemId, completed) {
  const project = currentProject();
  if (!project?.id || !scopeItemId) return;

  await updateDoc(
    doc(state.db, "projects", project.id, "scopeItems", scopeItemId),
    {
      completed,
      completedAt: completed ? new Date() : null,
      updatedAt: serverTimestamp(),
    },
  );

  showToast(completed ? "Scope item marked complete." : "Scope item reopened.");
}

async function saveProjectScopeNote(scopeItemId) {
  const project = currentProject();
  if (!project?.id || !scopeItemId) return;

  const noteField = refs.jobScopeList.querySelector(
    `[data-scope-note="${CSS.escape(scopeItemId)}"]`,
  );
  if (!noteField) return;

  await updateDoc(
    doc(state.db, "projects", project.id, "scopeItems", scopeItemId),
    {
      note: noteField.value.trim(),
      updatedAt: serverTimestamp(),
    },
  );

  showToast("Scope note saved.");
}

function renderTeamFinancialSummary(project) {
  const financials = projectFinancials(project);
  const myBreakdown = Array.isArray(financials.workerBreakdown)
    ? financials.workerBreakdown.find(
        (worker) => worker.uid === state.profile?.uid,
      )
    : null;

  refs.jobTeamFinancialSummary.innerHTML = [
    {
      label: "Company share",
      value: formatCurrency(firstFiniteNumber(financials.companyShare, 0)),
    },
    { label: "Worker pool", value: formatCurrency(firstFiniteNumber(financials.workerPool, 0)) },
    {
      label: "My projected payout",
      value: formatCurrency(firstFiniteNumber(myBreakdown?.amount, 0)),
    },
    {
      label: "Lock state",
      value: project.commissionLocked ? "Locked" : "Projected",
    },
  ]
    .map(
      (item) => `
        <article class="finance-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `,
    )
    .join("");

  const breakdown = Array.isArray(financials.workerBreakdown)
    ? financials.workerBreakdown
    : [];
  refs.commissionBreakdown.innerHTML = breakdown.length
    ? breakdown
        .map(
          (worker) => `
            <article class="simple-item">
                <strong>${escapeHtml(worker.name)}</strong>
                <p>${escapeHtml(`${worker.percent}% of worker pool`)}</p>
                <div class="simple-meta">${escapeHtml(formatCurrency(worker.amount || 0))}</div>
            </article>
        `,
        )
        .join("")
    : `<div class="empty-note">No worker split saved yet.</div>`;
}

function renderCommissionState(project) {
  const financials = projectFinancials(project);
  const snapshot = lockedCommissionSnapshot(project);

  refs.jobCommissionStatus.innerHTML = project.commissionLocked
    ? `
            <div><strong>Commission locked</strong></div>
            <div>The current payout split was locked when this job was marked completed.</div>
        `
    : `
            <div><strong>Projected payout</strong></div>
            <div>The split is still live and will lock automatically when the job is marked completed.</div>
        `;

  refs.jobCommissionSnapshot.innerHTML =
    project.commissionLocked && snapshot
      ? `
            <div><strong>Locked revenue:</strong> ${escapeHtml(formatCurrency(firstFiniteNumber(snapshot.totalContractRevenue, 0)))}</div>
            <div><strong>Locked profit:</strong> ${escapeHtml(formatCurrency(firstFiniteNumber(snapshot.projectedGrossProfit, 0)))}</div>
            <div><strong>Locked worker pool:</strong> ${escapeHtml(formatCurrency(firstFiniteNumber(snapshot.workerPool, 0)))}</div>
            <div><strong>Locked on:</strong> ${escapeHtml(formatDateTime(snapshot.lockedAt))}</div>
            <div><strong>Live gross profit now:</strong> ${escapeHtml(formatCurrency(firstFiniteNumber(financials.projectedGrossProfit, financials.profit, 0)))}</div>
        `
      : "No locked commission snapshot yet.";

  refs.jobReopenUnlockButton.hidden = !(
    isAdmin() &&
    project.commissionLocked &&
    project.status === "completed"
  );
}

function combinedProjectHistory(project) {
  if (!project) return [];

  return [
    ...state.projectLeadActivities.map((item) => ({
      ...item,
      historySource: "Lead history",
    })),
    ...state.projectActivities.map((item) => ({
      ...item,
      historySource: "Job activity",
    })),
    ...state.projectNotes.map((item) => ({
      ...item,
      title: item.title || "Job note",
      activityType: "note",
      actorName: item.createdByName || "Team",
      historySource: "Job note",
    })),
  ].sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
}

function renderJobHistory(project) {
  const items = combinedProjectHistory(project);
  if (!items.length) {
    renderEmptyList(refs.jobHistoryList, "No history recorded yet.");
    return;
  }

  refs.jobHistoryList.innerHTML = items
    .map(
      (item) => `
        <article class="timeline-item">
            <strong>${escapeHtml(item.title || "History item")}</strong>
            <p>${escapeHtml(item.body || item.note || "")}</p>
            ${activityDetailMarkup(item)}
            <div class="timeline-meta">
                ${escapeHtml(item.historySource || item.activityType || "system")} · ${escapeHtml(item.actorName || item.createdByName || "Team")} · ${escapeHtml(formatDateTime(item.createdAt))}
            </div>
        </article>
    `,
    )
    .join("");
}

function renderJobDocumentSourceFields() {
  const sourceType = refs.jobDocumentSourceType.value || "upload";
  refs.jobDocumentUrlRow.hidden = sourceType !== "link";
  refs.jobDocumentFileRow.hidden = sourceType !== "upload";
}

function renderLeadDocumentSummary() {
  refs.leadDocumentSummary.innerHTML = buildRecordDocumentSummaryMarkup(
    state.leadDocuments,
  );
}

function renderLeadDocumentList() {
  renderRecordDocumentList(
    refs.leadDocumentList,
    state.leadDocuments,
    "No shared documents are linked to this lead yet.",
  );
}

function renderCustomerDocumentTargetOptions(
  customer,
  rollup = customerRollup(customer),
) {
  const options = customerDocumentTargetOptions(customer, rollup);
  const currentValue = refs.customerDocumentTargetSelect.value || "";

  refs.customerDocumentTargetSelect.disabled = !options.length;
  refs.customerDocumentTargetSelect.innerHTML = options.length
    ? options
        .map(
          (option) => `
            <option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>
        `,
        )
        .join("")
    : `<option value="">No linked lead or job yet</option>`;

  refs.customerDocumentTargetSelect.value = options.some(
    (option) => option.value === currentValue,
  )
    ? currentValue
    : options[0]?.value || "";
}

function renderCustomerDocumentSummary() {
  refs.customerDocumentSummary.innerHTML = buildRecordDocumentSummaryMarkup(
    state.customerDocuments,
  );
}

function renderCustomerDocumentList() {
  renderRecordDocumentList(
    refs.customerDocumentList,
    state.customerDocuments,
    "No shared documents are linked to this customer yet.",
  );
}

function renderJobDocumentSummary() {
  refs.jobDocumentSummary.innerHTML = buildRecordDocumentSummaryMarkup(
    state.projectDocuments,
  );
}

function renderJobDocumentList() {
  renderRecordDocumentList(
    refs.jobDocumentList,
    state.projectDocuments,
    "No shared documents are linked to this job yet.",
  );
}

function renderJobDetail() {
  const project = currentProject();
  refs.jobsView.classList.toggle("is-job-workspace-active", Boolean(project));
  renderJobProjectSwitcher(project);

  if (!project) {
    resetChangeOrderForm();
    resetExpenseForm();
    refs.jobRecordTitle.textContent = "Select a job";
    if (refs.jobWorkspaceMeta) {
      refs.jobWorkspaceMeta.textContent =
        "Open a job to manage scope, client updates, billing, expenses, documents, and payout history in one focused workspace.";
    }
    refs.jobRecordBadge.textContent = "No job selected";
    refs.jobRecordBadge.className = "status-pill neutral";
    refs.jobRecordContext.innerHTML = "";
    renderJobWorkPanel(null);
    renderJobCalendarPanel(null);
    refs.jobEstimateSummary.innerHTML = "";
    refs.jobEstimateStatus.innerHTML =
      "Select a job first to load the original estimate.";
    refs.jobEstimatePreview.innerHTML = `<div class="empty-note">Select a job to review the original estimate.</div>`;
    refs.jobEstimateActions.innerHTML = "";
    refs.jobScopeSummary.innerHTML = "";
    refs.jobScopeImportButton.hidden = true;
    refs.jobInvoiceSummary.innerHTML = "";
    refs.jobInvoiceList.innerHTML = "";
    refs.invoicePreview.innerHTML = `<div class="invoice-preview-empty">Select a job first to create or review invoices.</div>`;
    refs.invoiceSubtotal.textContent = formatCurrency(0);
    refs.jobDocumentSummary.innerHTML = "";
    renderEmptyList(
      refs.jobDocumentList,
      "Select a job to load shared documents.",
    );
    if (refs.jobGenerateCloseoutButton) {
      refs.jobGenerateCloseoutButton.disabled = true;
      refs.jobGenerateCloseoutButton.textContent = "Create closeout PDF";
    }
    if (refs.jobDeleteButton) {
      refs.jobDeleteButton.disabled = true;
    }
    if (refs.jobCompleteButton) {
      refs.jobCompleteButton.hidden = true;
      refs.jobCompleteButton.disabled = true;
    }
    refs.jobStatusSelect.value = "in_progress";
    refs.jobStatusSelect.disabled = true;
    refs.jobCustomerSelect.innerHTML = `<option value="">No linked customer</option>`;
    refs.jobCustomerSelect.disabled = true;
    refs.jobBaseContractInput.value = "";
    refs.jobClientNameInput.value = "";
    refs.jobClientPhoneInput.value = "";
    refs.jobClientEmailInput.value = "";
    refs.jobProjectTypeInput.value = "";
    refs.jobProjectAddressInput.value = "";
    refs.jobTotalRevenueDisplay.value = "";
    refs.jobLinkedLeadDisplay.value = "";
    refs.jobPhaseLabelInput.value = "";
    refs.jobTargetWindowInput.value = "";
    refs.jobTargetDateInput.value = "";
    refs.jobNextStepInput.value = "";
    refs.jobSharedStatusNoteInput.value = "";
    refs.jobPlanningNotesInput.value = "";
    refs.jobRecordEmpty.hidden = false;
    refs.jobRecordShell.hidden = true;
    return;
  }

  const linkedLead = project.leadId
    ? state.leads.find((lead) => lead.id === project.leadId)
    : null;
  const financials = projectFinancials(project);

  refs.jobRecordEmpty.hidden = true;
  refs.jobRecordShell.hidden = false;
  refs.jobRecordTitle.textContent = project.clientName || "Unnamed job";
  if (refs.jobWorkspaceMeta) {
    refs.jobWorkspaceMeta.textContent = [
      project.projectAddress || "Address pending",
      project.projectType || projectWorkflowLabel(project),
      project.customerName || "",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  refs.jobRecordBadge.textContent = [
    JOB_STATUS_META[project.status] || "In Progress",
    isServiceOrderProject(project) ? "Service order" : "",
  ]
    .filter(Boolean)
    .join(" · ");
  refs.jobRecordBadge.className = "status-pill";
  refs.jobStatusSelect.value = project.status || "in_progress";
  refs.jobStatusSelect.disabled = !isAdmin();
  refs.jobBaseContractInput.value = toNumber(
    project.baseContractValue ||
      financials.baseContractValue ||
      project.jobValue ||
      0,
  );
  refs.jobBaseContractInput.readOnly = !isAdmin();
  renderJobCustomerOptions(project);
  refs.jobClientNameInput.value = project.clientName || "";
  refs.jobClientPhoneInput.value = project.clientPhone || "";
  refs.jobClientEmailInput.value = project.clientEmail || "";
  refs.jobProjectTypeInput.value = project.projectType || "";
  refs.jobProjectAddressInput.value = project.projectAddress || "";
  refs.jobTotalRevenueDisplay.value = formatCurrency(
    projectRevenueValue(project),
  );
  refs.jobLinkedLeadDisplay.value =
    linkedLead?.clientName ||
    linkedLead?.projectAddress ||
    "No linked lead. This job was created directly in Jobs.";
  refs.jobPhaseLabelInput.value = project.phaseLabel || "";
  refs.jobTargetWindowInput.value = project.targetWindow || "";
  refs.jobTargetDateInput.value = formatDateOnlyInputValue(project.targetDate);
  refs.jobNextStepInput.value = project.nextStep || "";
  refs.jobSharedStatusNoteInput.value = project.sharedStatusNote || "";
  refs.jobPlanningNotesInput.value = project.planningNotes || "";
  refs.jobClientNameInput.readOnly = !isAdmin();
  refs.jobClientPhoneInput.readOnly = !isAdmin();
  refs.jobClientEmailInput.readOnly = !isAdmin();
  refs.jobProjectTypeInput.readOnly = !isAdmin();
  refs.jobProjectAddressInput.readOnly = !isAdmin();
  refs.jobPhaseLabelInput.readOnly = false;
  refs.jobTargetWindowInput.readOnly = false;
  refs.jobTargetDateInput.disabled = false;
  refs.jobNextStepInput.readOnly = false;
  refs.jobSharedStatusNoteInput.readOnly = false;
  refs.jobPlanningNotesInput.readOnly = false;
  renderJobOwnerOptions(project);
  renderWorkerAssignments(project);
  renderJobRecordContext(project);
  renderJobSummaryStrip(project);
  renderJobOverviewSummary(project);
  renderJobWorkPanel(project);
  renderJobCalendarPanel(project);
  renderJobEstimatePanel(project);
  renderRevenueSummary(project);
  renderChangeOrderList();
  renderExpenseReceiptOptions();
  renderExpenseVendorOptions();
  renderExpenseList();
  if (
    state.editingChangeOrderId &&
    !state.projectChangeOrders.some(
      (changeOrder) => changeOrder.id === state.editingChangeOrderId,
    )
  ) {
    resetChangeOrderForm();
  } else if (!state.editingChangeOrderId) {
    setActionButtonLabel(refs.changeOrderSubmitButton, "Save change order");
    if (refs.changeOrderResetButton) {
      refs.changeOrderResetButton.hidden = true;
    }
  }
  if (
    state.editingExpenseId &&
    !state.projectExpenses.some((expense) => expense.id === state.editingExpenseId)
  ) {
    resetExpenseForm();
  } else if (!state.editingExpenseId) {
    setActionButtonLabel(refs.expenseSubmitButton, "Add expense");
    if (refs.expenseResetButton) {
      refs.expenseResetButton.hidden = true;
    }
  }
  renderPaymentReceiptOptions(project);
  renderPaymentList();
  renderInvoicePanel(project);
  renderJobScopeSummary(project);
  renderJobScopeList(project);
  renderTeamFinancialSummary(project);
  renderCommissionState(project);
  renderEntityTaskList(
    refs.jobTaskList,
    relatedTasksForEntity("projectId", project.id),
    "No tasks linked to this job yet.",
  );
  renderJobHistory(project);
  renderJobDocumentSourceFields();
  renderJobDocumentSummary();
  renderJobDocumentList();
  renderJobTabState();
  refs.jobOpenLeadButton.hidden = !project.leadId;
  refs.jobOpenEstimateButton.disabled = !project.leadId;
  refs.jobEstimateOpenLeadButton.disabled = !project.leadId;
  refs.jobEstimateDownloadButton.disabled =
    !project.leadId || !Boolean(state.projectLeadEstimate);
  if (refs.jobGenerateCloseoutButton) {
    refs.jobGenerateCloseoutButton.disabled = !project.id;
    refs.jobGenerateCloseoutButton.textContent =
      safeString(project.status) !== "completed"
        ? "Mark complete first"
        : projectIsPaidInFull(project)
          ? "Create closeout PDF"
          : "Record final payment first";
  }
  if (refs.jobDeleteButton) {
    refs.jobDeleteButton.disabled = !project.id || !isAdmin();
  }
  if (refs.jobCompleteButton) {
    refs.jobCompleteButton.hidden = !isAdmin() || project.status === "completed";
    refs.jobCompleteButton.disabled = !project.id || project.status === "completed";
  }

  if (!refs.changeOrderDate.value) {
    refs.changeOrderDate.value = todayDateInputValue();
  }
  if (!refs.expenseDate.value) {
    refs.expenseDate.value = todayDateInputValue();
  }
  if (!refs.paymentDate.value) {
    refs.paymentDate.value = todayDateInputValue();
  }
  if (!refs.jobDocumentDate.value) {
    refs.jobDocumentDate.value = todayDateInputValue();
  }
  if (!refs.jobDocumentSourceType.value) {
    refs.jobDocumentSourceType.value = "upload";
    renderJobDocumentSourceFields();
  }
}

function filteredVendors() {
  const search = safeString(state.vendorSearch).toLowerCase();

  return sortByUpdatedDesc(
    state.vendors.filter((vendor) => {
      const status = safeString(vendor.status || "active");
      const trades = Array.isArray(vendor.tradeIds) ? vendor.tradeIds : [];
      const rollup = vendorRollup(vendor);
      const searchBlob = [
        vendor.name,
        vendor.legalName,
        vendor.primaryContactName,
        vendor.primaryEmail,
        vendor.primaryPhone,
        vendor.address,
        vendor.serviceArea,
        vendor.notes,
        vendor.tradeOtherText,
        ...trades.map((tradeId) => vendorTradeLabel(tradeId)),
      ]
        .join(" ")
        .toLowerCase();

      if (search && !searchBlob.includes(search)) {
        return false;
      }

      if (state.vendorStatus === "active_only" && status !== "active") {
        return false;
      }

      if (
        state.vendorStatus !== "all" &&
        state.vendorStatus !== "active_only" &&
        status !== state.vendorStatus
      ) {
        return false;
      }

      if (state.vendorTrade !== "all" && !trades.includes(state.vendorTrade)) {
        return false;
      }

      if (state.vendorBillState === "no_open_bills") {
        return rollup.openBills.length === 0;
      }

      if (state.vendorBillState !== "all") {
        return rollup.bills.some((bill) =>
          vendorBillMatchesFilter(bill, state.vendorBillState),
        );
      }

      return true;
    }),
  );
}

function renderVendorTradeFilterOptions() {
  const currentValue =
    refs.vendorTradeFilter.value || state.vendorTrade || "all";
  refs.vendorTradeFilter.innerHTML = [`<option value="all">All trades</option>`]
    .concat(
      VENDOR_TRADE_OPTIONS.map(
        (trade) => `
            <option value="${escapeHtml(trade.id)}">${escapeHtml(trade.label)}</option>
        `,
      ),
    )
    .join("");
  refs.vendorTradeFilter.value = VENDOR_TRADE_OPTIONS.some(
    (trade) => trade.id === currentValue,
  )
    ? currentValue
    : "all";
}

function renderVendorMetrics() {
  renderVendorTradeFilterOptions();

  const activeVendors = state.vendors.filter(
    (vendor) => safeString(vendor.status || "active") === "active",
  ).length;
  const openBills = state.vendorBills.filter((bill) => {
    const status = safeString(bill.status || "open");
    return status === "open" || status === "scheduled";
  });
  const overdueBills = state.vendorBills.filter((bill) =>
    vendorBillIsOverdue(bill),
  );
  const dueThisWeek = state.vendorBills.filter((bill) =>
    vendorBillIsDueThisWeek(bill),
  );

  renderMetricStrip(refs.vendorMetrics, [
    { label: "Active vendors", value: activeVendors },
    { label: "Open bills", value: openBills.length },
    { label: "Overdue bills", value: overdueBills.length },
    { label: "Due this week", value: dueThisWeek.length },
  ]);
}

function renderVendorList() {
  const vendors = filteredVendors();

  if (!vendors.length) {
    renderEmptyList(refs.vendorList, "No vendors match the current filters.");
    return;
  }

  refs.vendorList.innerHTML = vendors
    .map((vendor) => {
      const rollup = vendorRollup(vendor);
      const trades = (vendor.tradeIds || [])
        .slice(0, 2)
        .map((tradeId) => vendorTradeLabel(tradeId));
      const tradeSummary = trades.length
        ? trades.join(" · ")
        : safeString(vendor.tradeOtherText) || "Trade not set";
      return `
            <button type="button" class="record-button ${vendor.id === state.selectedVendorId && !state.vendorDraft ? "is-selected" : ""}" data-vendor-id="${escapeHtml(vendor.id)}">
                <div class="record-topline">
                    <span class="mini-pill">${escapeHtml(VENDOR_STATUS_META[vendor.status] || "Active")}</span>
                    <span class="mini-pill">${escapeHtml(`${rollup.openBills.length} open`)}</span>
                </div>
                <span class="record-title">${escapeHtml(vendor.name || "Unnamed vendor")}</span>
                <p class="record-copy">${escapeHtml(tradeSummary)}</p>
                <div class="record-meta">
                    <div>${escapeHtml(vendor.primaryContactName || vendor.primaryEmail || vendor.primaryPhone || "No contact set")}</div>
                    <div>${escapeHtml(formatCurrency(rollup.totalOpenAmount))} open payables</div>
                    <div>${escapeHtml(`${rollup.overdueBills.length} overdue`)}</div>
                </div>
                <span class="record-edit-affordance">Open &amp; edit</span>
            </button>
        `;
    })
    .join("");
}

function renderVendorRecordContext(vendor, rollup) {
  if (!vendor) {
    refs.vendorRecordContext.innerHTML = "";
    return;
  }

  const trades = (vendor.tradeIds || []).map((tradeId) =>
    vendorTradeLabel(tradeId),
  );
  const nextDueText = rollup.nextDueBill
    ? `${formatCurrency(rollup.nextDueBill.amount || 0)} due ${formatDateOnly(rollup.nextDueBill.dueDate)}`
    : "No upcoming open bill.";
  const complianceText = [
    VENDOR_INSURANCE_STATUS_META[vendor.insuranceStatus] || "Undecided",
    vendor.insuranceExpirationDate
      ? `Insurance ${formatDateOnly(vendor.insuranceExpirationDate)}`
      : "",
    vendor.licenseExpirationDate
      ? `License ${formatDateOnly(vendor.licenseExpirationDate)}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  refs.vendorRecordContext.innerHTML = [
    buildContextCard({
      label: "Primary contact",
      title:
        vendor.primaryContactName ||
        vendor.primaryEmail ||
        vendor.primaryPhone ||
        "Contact not set",
      meta:
        [vendor.primaryEmail, vendor.primaryPhone, vendor.address]
          .filter(Boolean)
          .join(" · ") ||
        "Add contact and address details for purchasing follow-through.",
      muted: true,
    }),
    buildContextCard({
      label: "Trades",
      title: trades.length ? trades.slice(0, 3).join(", ") : "Trades not set",
      meta:
        safeString(vendor.tradeOtherText) ||
        "Use trade tags to keep the vendor directory easy to search.",
      muted: true,
    }),
    buildContextCard({
      label: "Next bill due",
      title: rollup.nextDueBill
        ? rollup.nextDueBill.billNumber || "Upcoming payable"
        : "No bill due",
      meta: nextDueText,
      muted: true,
    }),
    buildContextCard({
      label: "Compliance",
      title: VENDOR_STATUS_META[vendor.status] || "Active",
      meta:
        complianceText ||
        "Track insurance, license, and W-9 files in the document center.",
      muted: true,
    }),
  ].join("");
}

function renderVendorTabState() {
  refs.vendorTabButtons.forEach((button) => {
    const isActive = button.dataset.vendorTab === state.activeVendorTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });

  Array.from(
    document.querySelectorAll("#vendor-record-shell .tab-pane"),
  ).forEach((pane) => {
    const isActive = pane.id === `vendor-tab-${state.activeVendorTab}`;
    pane.classList.toggle("is-active", isActive);
    pane.setAttribute("aria-hidden", String(!isActive));
  });
}

function openVendorTab(tab, focusTarget = null) {
  state.activeVendorTab = tab;
  renderVendorTabState();
  if (!focusTarget) {
    resetRecordWorkspaceScroll(refs.vendorRecordShell, { smooth: true });
  }
  queueFocus(focusTarget);
}

function renderVendorProjectOptions(selectedProjectId = "") {
  const options = [`<option value="">No linked job</option>`].concat(
    sortByUpdatedDesc(state.projects).map(
      (project) => `
            <option value="${escapeHtml(project.id)}">${escapeHtml(`${project.clientName || "Unnamed job"} · ${project.projectAddress || "Address pending"}`)}</option>
        `,
    ),
  );
  refs.vendorBillProjectInput.innerHTML = options.join("");
  refs.vendorBillProjectInput.value = selectedProjectId || "";
}

function renderVendorBillSourceFields() {
  const sourceType = refs.vendorBillSourceTypeInput.value || "none";
  refs.vendorBillUrlRow.hidden = sourceType !== "link";
  refs.vendorBillFileRow.hidden = sourceType !== "upload";
}

function renderVendorDocumentSourceFields() {
  const sourceType = refs.vendorDocumentSourceTypeInput.value || "upload";
  refs.vendorDocumentUrlRow.hidden = sourceType !== "link";
  refs.vendorDocumentFileRow.hidden = sourceType !== "upload";
}

function renderVendorDocumentAccessDefaults() {
  if (refs.vendorDocumentCategoryInput.value === "w9") {
    refs.vendorDocumentAccessInput.value = "admin_only";
  }
}

function setVendorFormEditable(editable) {
  [
    refs.vendorNameInput,
    refs.vendorLegalNameInput,
    refs.vendorStatusInput,
    refs.vendorPaymentMethodInput,
    refs.vendorTradeOtherInput,
    refs.vendorContactNameInput,
    refs.vendorPhoneInput,
    refs.vendorEmailInput,
    refs.vendorAddressInput,
    refs.vendorServiceAreaInput,
    refs.vendorDefaultTermsInput,
    refs.vendorInsuranceStatusInput,
    refs.vendorInsuranceExpirationInput,
    refs.vendorLicenseExpirationInput,
    refs.vendorInsuranceNoteInput,
    refs.vendorNotesInput,
  ].forEach((field) => {
    if (!field) return;
    if (field.tagName === "INPUT" || field.tagName === "TEXTAREA") {
      field.readOnly = !editable;
    } else {
      field.disabled = !editable;
    }
  });

  Array.from(
    refs.vendorTradeGrid.querySelectorAll("input[type='checkbox']"),
  ).forEach((input) => {
    input.disabled = !editable;
  });
}

function renderVendorSummary(vendor, rollup) {
  refs.vendorSummary.innerHTML = [
    { label: "Open bills", value: String(rollup.openBills.length) },
    { label: "Overdue", value: String(rollup.overdueBills.length) },
    { label: "Open amount", value: formatCurrency(rollup.totalOpenAmount) },
    { label: "Paid to date", value: formatCurrency(rollup.totalPaidAmount) },
    { label: "Documents", value: String(rollup.documents.length) },
    { label: "Linked jobs", value: String(rollup.projects.length) },
  ]
    .map(
      (item) => `
        <article class="summary-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `,
    )
    .join("");

  if (!rollup.projects.length) {
    renderEmptyList(
      refs.vendorJobList,
      "No jobs are linked to this vendor yet.",
    );
    return;
  }

  refs.vendorJobList.innerHTML = rollup.projects
    .map((project) =>
      stackCardButton({
        title: project.clientName || "Job",
        copy: project.projectAddress || "Address pending",
        pill: JOB_STATUS_META[project.status] || "In Progress",
        secondaryPill: formatCurrency(projectRevenueValue(project)),
        dataAttrs: {
          "data-open-project": project.id,
          "data-open-view": "jobs-view",
        },
        meta: `<div>${escapeHtml(project.projectType || "Project")}</div><div>Paid ${escapeHtml(formatCurrency(project.financials?.totalPayments || 0))}</div>`,
      }),
    )
    .join("");
}

function renderVendorPayableSummary(vendor, rollup) {
  refs.vendorPayableSummary.innerHTML = `
        <div><strong>Open:</strong> ${escapeHtml(`${rollup.openBills.length} bills for ${formatCurrency(rollup.totalOpenAmount)}`)}</div>
        <div><strong>Overdue:</strong> ${escapeHtml(String(rollup.overdueBills.length))}</div>
        <div><strong>Due this week:</strong> ${escapeHtml(String(rollup.dueThisWeekBills.length))}</div>
    `;
}

function renderVendorBillList(vendor, rollup) {
  renderSimpleEntries(
    refs.vendorBillList,
    rollup.bills,
    (bill) => {
      const linkedProject = bill.projectId
        ? state.projects.find((project) => project.id === bill.projectId)
        : null;
      const invoiceHref = safeString(
        bill.invoiceFileUrl || bill.invoiceExternalUrl,
      );
      const actions = isAdmin()
        ? `
                <div class="inline-actions">
                    ${bill.status !== "scheduled" ? `<button type="button" class="ghost-button" data-command="vendor-bill-status" data-bill-id="${escapeHtml(bill.id)}" data-bill-status="scheduled">Mark scheduled</button>` : ""}
                    ${bill.status !== "paid" ? `<button type="button" class="secondary-button" data-command="vendor-bill-status" data-bill-id="${escapeHtml(bill.id)}" data-bill-status="paid">Mark paid</button>` : ""}
                    ${bill.status !== "open" ? `<button type="button" class="ghost-button" data-command="vendor-bill-status" data-bill-id="${escapeHtml(bill.id)}" data-bill-status="open">Reopen</button>` : ""}
                    ${bill.status !== "void" ? `<button type="button" class="ghost-button" data-command="vendor-bill-status" data-bill-id="${escapeHtml(bill.id)}" data-bill-status="void">Void</button>` : ""}
                </div>
            `
        : "";
      return `
            <article class="simple-item">
                <strong>${escapeHtml(bill.billNumber || "Vendor payable")} · ${escapeHtml(formatCurrency(bill.amount || 0))}</strong>
                <p>${escapeHtml(bill.note || "")}</p>
                <div class="simple-meta">
                    ${escapeHtml(VENDOR_BILL_STATUS_META[bill.status] || "Open")} · Due ${escapeHtml(formatDateOnly(bill.dueDate || bill.invoiceDate || bill.createdAt))}
                    ${linkedProject ? ` · Job: ${escapeHtml(linkedProject.projectAddress || linkedProject.clientName || linkedProject.id)}` : ""}
                </div>
                <div class="simple-meta">
                    ${escapeHtml(bill.paymentMethod || vendor.preferredPaymentMethod ? `Method: ${VENDOR_PAYMENT_METHOD_META[bill.paymentMethod] || bill.paymentMethod || VENDOR_PAYMENT_METHOD_META[vendor.preferredPaymentMethod] || vendor.preferredPaymentMethod}` : "Method not set")}
                    ${bill.paymentReference ? ` · Ref: ${escapeHtml(bill.paymentReference)}` : ""}
                </div>
                ${linkedProject ? `<div class="simple-meta"><button type="button" class="ghost-button" data-open-project="${escapeHtml(linkedProject.id)}" data-open-view="jobs-view">Open linked job</button></div>` : ""}
                ${invoiceHref ? `<div class="simple-meta"><a href="${escapeHtml(invoiceHref)}" target="_blank" rel="noreferrer">Open invoice</a></div>` : ""}
                ${actions}
            </article>
        `;
    },
    "No payables saved for this vendor yet.",
  );
}

function renderVendorDocumentSummary(vendor, rollup) {
  const categories = ["agreement", "insurance", "license", "w9"];
  refs.vendorDocumentSummary.innerHTML = categories
    .map(
      (category) => `
        <article class="summary-card">
            <span>${escapeHtml(VENDOR_DOCUMENT_CATEGORY_META[category])}</span>
            <strong>${escapeHtml(String(rollup.documents.filter((item) => item.category === category).length))}</strong>
        </article>
    `,
    )
    .join("");
}

function renderVendorDocumentList(vendor, rollup) {
  renderSimpleEntries(
    refs.vendorDocumentList,
    rollup.documents,
    (item) => {
      const href = documentHref(item);
      const expiryMeta = item.expirationDate
        ? ` · Expires ${formatDateOnly(item.expirationDate)}`
        : "";
      const actions = isAdmin()
        ? `
                <div class="inline-actions">
                    <button type="button" class="ghost-button" data-vendor-document-delete="${escapeHtml(item.id)}">Delete</button>
                </div>
            `
        : "";
      return `
            <article class="simple-item">
                <strong>${escapeHtml(item.title || "Document")}</strong>
                <p>${escapeHtml(item.note || "")}</p>
                <div class="simple-meta">
                    ${escapeHtml(VENDOR_DOCUMENT_CATEGORY_META[item.category] || "Document")} · ${escapeHtml(DOCUMENT_SOURCE_META[item.sourceType] || "Manual")}
                    ${isAdmin() ? ` · ${escapeHtml(VENDOR_DOCUMENT_ACCESS_META[item.accessLevel] || "Staff")}` : ""}
                    ${expiryMeta ? expiryMeta : ""}
                </div>
                ${href ? `<div class="simple-meta"><a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">Open document</a></div>` : ""}
                ${actions}
            </article>
        `;
    },
    "No vendor documents saved yet.",
  );
}

function renderVendorDetail() {
  const vendor = currentVendor();

  if (!vendor) {
    refs.vendorRecordTitle.textContent = "Select a vendor";
    refs.vendorRecordBadge.textContent = "No vendor selected";
    refs.vendorRecordBadge.className = "status-pill neutral";
    refs.vendorRecordContext.innerHTML = "";
    refs.vendorRecordEmpty.hidden = false;
    refs.vendorRecordShell.hidden = true;
    return;
  }

  const editable = isAdmin();
  const rollup = vendorRollup(vendor);

  refs.vendorRecordEmpty.hidden = true;
  refs.vendorRecordShell.hidden = false;
  refs.vendorRecordTitle.textContent = vendor.name || "New vendor";
  refs.vendorRecordBadge.textContent = vendor.id
    ? VENDOR_STATUS_META[vendor.status] || "Active"
    : "Draft";
  refs.vendorRecordBadge.className = vendor.id
    ? "status-pill"
    : "status-pill neutral";
  refs.vendorNameInput.value = vendor.name || "";
  refs.vendorLegalNameInput.value = vendor.legalName || "";
  refs.vendorStatusInput.value = vendor.status || "active";
  refs.vendorPaymentMethodInput.value = vendor.preferredPaymentMethod || "";
  refs.vendorTradeOtherInput.value = vendor.tradeOtherText || "";
  refs.vendorContactNameInput.value = vendor.primaryContactName || "";
  refs.vendorPhoneInput.value = vendor.primaryPhone || "";
  refs.vendorEmailInput.value = vendor.primaryEmail || "";
  refs.vendorAddressInput.value = vendor.address || "";
  refs.vendorServiceAreaInput.value = vendor.serviceArea || "";
  refs.vendorDefaultTermsInput.value = vendor.defaultTerms || "";
  refs.vendorInsuranceStatusInput.value = vendor.insuranceStatus || "undecided";
  refs.vendorInsuranceExpirationInput.value = formatDateOnlyInputValue(
    vendor.insuranceExpirationDate,
  );
  refs.vendorLicenseExpirationInput.value = formatDateOnlyInputValue(
    vendor.licenseExpirationDate,
  );
  refs.vendorInsuranceNoteInput.value = vendor.insuranceNote || "";
  refs.vendorNotesInput.value = vendor.notes || "";
  renderTradeCheckboxGrid(refs.vendorTradeGrid, vendor.tradeIds || []);
  setVendorFormEditable(editable);
  renderVendorRecordContext(vendor, rollup);
  renderVendorSummary(vendor, rollup);
  renderVendorProjectOptions("");
  renderVendorPayableSummary(vendor, rollup);
  renderVendorBillList(vendor, rollup);
  renderVendorDocumentSummary(vendor, rollup);
  renderVendorDocumentList(vendor, rollup);
  renderVendorBillSourceFields();
  renderVendorDocumentSourceFields();
  renderVendorDocumentAccessDefaults();
  renderVendorTabState();

  if (!refs.vendorBillInvoiceDateInput.value) {
    refs.vendorBillInvoiceDateInput.value = todayDateInputValue();
  }
  if (!refs.vendorBillDueDateInput.value) {
    refs.vendorBillDueDateInput.value = todayDateInputValue();
  }
  if (!refs.vendorDocumentDateInput.value) {
    refs.vendorDocumentDateInput.value = todayDateInputValue();
  }
}

function blankServiceTemplateDraft() {
  return {
    id: null,
    internalName: "",
    clientTitle: "",
    defaultPrice: 0,
    defaultInvoiceLines: [
      {
        label: "",
        description: "",
        amount: 0,
      },
    ],
    defaultSummary: "",
    defaultPlanningNotes: "",
    defaultPaymentRequirement: "upfront_required",
    active: true,
  };
}

function normaliseServiceTemplateDoc(template = {}) {
  return {
    ...blankServiceTemplateDraft(),
    ...defaultServiceTemplateDraft(template),
    ...template,
    defaultPrice: toNumber(
      template.defaultPrice ??
        defaultServiceTemplateDraft(template).defaultPrice,
    ),
    defaultInvoiceLines:
      Array.isArray(template.defaultInvoiceLines) &&
      template.defaultInvoiceLines.length
        ? template.defaultInvoiceLines.map((line) => ({
            label: safeString(line.label || line.title),
            description: safeString(line.description || line.note),
            amount: toNumber(line.amount),
          }))
        : blankServiceTemplateDraft().defaultInvoiceLines.map((line) => ({
            ...line,
          })),
    defaultSummary: safeString(
      template.defaultSummary ||
        defaultServiceTemplateDraft(template).defaultSummary,
    ),
    defaultPlanningNotes: safeString(
      template.defaultPlanningNotes ||
        defaultServiceTemplateDraft(template).defaultPlanningNotes,
    ),
    defaultPaymentRequirement:
      safeString(
        template.defaultPaymentRequirement ||
          defaultServiceTemplateDraft(template).defaultPaymentRequirement,
      ) || "upfront_required",
    active: template.active !== false,
  };
}

function currentServiceTemplateEditorValue() {
  if (state.serviceTemplateDraft) {
    return normaliseServiceTemplateDoc(state.serviceTemplateDraft);
  }

  if (state.selectedServiceTemplateId) {
    const existing = currentServiceTemplateDoc();
    if (existing) {
      return normaliseServiceTemplateDoc(existing);
    }
  }

  const fallback =
    activeServiceTemplates()[0] || serviceTemplateCatalog()[0] || null;
  if (fallback) {
    state.selectedServiceTemplateId = fallback.id;
    return normaliseServiceTemplateDoc(fallback);
  }

  return blankServiceTemplateDraft();
}

function renderServiceTemplateLineItems(lineItems = []) {
  const rows = lineItems.length
    ? lineItems
    : blankServiceTemplateDraft().defaultInvoiceLines;
  refs.serviceTemplateLines.innerHTML = rows
    .map(
      (item, index) => `
        <div class="line-item-row" data-service-template-line-index="${escapeHtml(String(index))}">
            <div class="line-item-main-fields">
                <label class="line-item-field">
                    <span>Line title</span>
                    <input type="text" data-service-template-line-field="label" value="${escapeHtml(item.label || "")}" placeholder="Property estimate review, deal analysis, repair scope">
                </label>
                <label class="line-item-field line-item-amount-field">
                    <span>Amount</span>
                    <input type="number" data-service-template-line-field="amount" value="${escapeHtml(item.amount ?? "")}" min="0" step="0.01" placeholder="0.00">
                </label>
            </div>
            <label class="line-item-field line-item-description-field">
                <span>What's included</span>
                <textarea data-service-template-line-field="description" rows="4" placeholder="Describe the repeatable service clearly so the invoice and job record open with a polished scope note.">${escapeHtml(item.description || "")}</textarea>
            </label>
            <div class="line-item-actions">
                <button type="button" class="ghost-button" data-service-template-line-remove="${escapeHtml(String(index))}">Remove line</button>
            </div>
        </div>
    `,
    )
    .join("");

  Array.from(
    refs.serviceTemplateLines.querySelectorAll(
      "[data-service-template-line-remove]",
    ),
  ).forEach((button) => {
    button.addEventListener("click", () => {
      const nextTemplate = collectServiceTemplateFormState(
        currentServiceTemplateDoc() || state.serviceTemplateDraft,
      );
      nextTemplate.defaultInvoiceLines.splice(
        Number(button.dataset.serviceTemplateLineRemove),
        1,
      );
      state.serviceTemplateDraft = normaliseServiceTemplateDoc(nextTemplate);
      renderServiceTemplateManager();
    });
  });

  Array.from(
    refs.serviceTemplateLines.querySelectorAll("input, textarea"),
  ).forEach((field) => {
    if (field.tagName === "TEXTAREA") {
      field.style.height = "auto";
      field.style.height = `${Math.max(field.scrollHeight, 110)}px`;
    }
    field.addEventListener("input", () => {
      if (field.tagName === "TEXTAREA") {
        field.style.height = "auto";
        field.style.height = `${Math.max(field.scrollHeight, 110)}px`;
      }
      state.serviceTemplateDraft = collectServiceTemplateFormState(
        currentServiceTemplateDoc() || state.serviceTemplateDraft,
      );
    });
  });
}

function collectServiceTemplateFormState(
  baseTemplate = currentServiceTemplateDoc(),
) {
  const defaultInvoiceLines = Array.from(
    refs.serviceTemplateLines.querySelectorAll(
      "[data-service-template-line-index]",
    ),
  )
    .map((row) => ({
      label: row
        .querySelector('[data-service-template-line-field="label"]')
        .value.trim(),
      description: row
        .querySelector('[data-service-template-line-field="description"]')
        .value.trim(),
      amount: toNumber(
        row.querySelector('[data-service-template-line-field="amount"]').value,
      ),
    }))
    .filter((item) => item.label || item.description || item.amount);

  return normaliseServiceTemplateDoc({
    ...(baseTemplate || {}),
    id:
      baseTemplate?.id ||
      state.selectedServiceTemplateId ||
      state.serviceTemplateDraft?.id ||
      null,
    internalName: refs.serviceTemplateName.value.trim(),
    clientTitle: refs.serviceTemplateClientTitle.value.trim(),
    defaultPrice: toNumber(refs.serviceTemplatePrice.value),
    defaultPaymentRequirement:
      refs.serviceTemplatePaymentRule.value || "upfront_required",
    active: refs.serviceTemplateActive.checked,
    defaultSummary: refs.serviceTemplateSummaryInput.value.trim(),
    defaultPlanningNotes: refs.serviceTemplatePlanningNotes.value.trim(),
    defaultInvoiceLines: defaultInvoiceLines.length
      ? defaultInvoiceLines
      : blankServiceTemplateDraft().defaultInvoiceLines,
  });
}

function renderServiceTemplateManager() {
  if (
    !refs.serviceTemplateSummary ||
    !refs.serviceTemplateList ||
    !refs.serviceTemplateForm
  ) {
    return;
  }

  if (!isAdmin()) {
    refs.serviceTemplateSummary.innerHTML = "";
    refs.serviceTemplateList.innerHTML =
      '<div class="empty-note">Only admins can manage reusable service templates.</div>';
    refs.serviceTemplateForm.reset();
    renderServiceTemplateLineItems(
      blankServiceTemplateDraft().defaultInvoiceLines,
    );
    return;
  }

  const templates = sortByUpdatedDesc(serviceTemplateCatalog()).sort(
    (left, right) =>
      safeString(left.clientTitle || left.internalName).localeCompare(
        safeString(right.clientTitle || right.internalName),
      ),
  );
  const activeTemplates = templates.filter(
    (template) => template.active !== false,
  );
  const upfrontTemplates = activeTemplates.filter(
    (template) => template.defaultPaymentRequirement === "upfront_required",
  );
  const template = currentServiceTemplateEditorValue();
  const selectedId = state.serviceTemplateDraft
    ? null
    : state.selectedServiceTemplateId || template.id || "";

  refs.serviceTemplateSummary.innerHTML = [
    { label: "Active templates", value: String(activeTemplates.length) },
    { label: "Upfront payment", value: String(upfrontTemplates.length) },
    {
      label: "Pay later",
      value: String(activeTemplates.length - upfrontTemplates.length),
    },
    {
      label: "Selected default",
      value: formatCurrency(
        template.defaultPrice || serviceTemplateSubtotal(template),
      ),
    },
  ]
    .map(
      (item) => `
        <article class="summary-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `,
    )
    .join("");

  refs.serviceTemplateList.innerHTML = templates.length
    ? templates
        .map(
          (item) => `
            <button type="button" class="record-button ${selectedId === item.id ? "is-selected" : ""}" data-service-template-id="${escapeHtml(item.id)}">
                <div class="record-topline">
                    <span class="mini-pill">${escapeHtml(SERVICE_PAYMENT_RULE_META[item.defaultPaymentRequirement] || "Upfront required")}</span>
                    <span class="mini-pill">${escapeHtml(item.active === false ? "Inactive" : "Active")}</span>
                </div>
                <span class="record-title">${escapeHtml(item.clientTitle || item.internalName || "Service template")}</span>
                <p class="record-copy">${escapeHtml(item.defaultSummary || "No default summary yet.")}</p>
                <div class="record-meta">
                    <div>${escapeHtml(item.internalName || "Internal name pending")}</div>
                    <div>${escapeHtml(formatCurrency(item.defaultPrice || serviceTemplateSubtotal(item)))}</div>
                    <div>${escapeHtml(`${(item.defaultInvoiceLines || []).length} invoice lines`)}</div>
                </div>
            </button>
        `,
        )
        .join("")
    : `<div class="empty-note">No service templates saved yet. Start with the seeded services or build your own repeatable offering here.</div>`;

  refs.serviceTemplateName.value = template.internalName || "";
  refs.serviceTemplateClientTitle.value = template.clientTitle || "";
  refs.serviceTemplatePrice.value = template.defaultPrice || "";
  refs.serviceTemplatePaymentRule.value =
    template.defaultPaymentRequirement || "upfront_required";
  refs.serviceTemplateActive.checked = template.active !== false;
  refs.serviceTemplateSummaryInput.value = template.defaultSummary || "";
  refs.serviceTemplatePlanningNotes.value = template.defaultPlanningNotes || "";
  renderServiceTemplateLineItems(template.defaultInvoiceLines);
}

function renderTemplateForm() {
  refs.templateName.value = state.template.name || EMPTY_TEMPLATE.name;
  refs.templateSubject.value =
    state.template.subjectTemplate || EMPTY_TEMPLATE.subjectTemplate;
  refs.templateGreeting.value =
    state.template.greeting || EMPTY_TEMPLATE.greeting;
  refs.templateIntro.value = state.template.intro || EMPTY_TEMPLATE.intro;
  refs.templateOutro.value = state.template.outro || EMPTY_TEMPLATE.outro;
  refs.templateTerms.value = estimateTemplateTermsText(state.template);
  refs.templateAgreementTitle.value = estimateAgreementTitle(state.template);
  refs.templateAgreementIntro.value = estimateAgreementIntro(state.template);
  refs.templateAgreementTerms.value = estimateAgreementTermsText(
    state.template,
  );
  refs.templateContractorAddress.value = contractorBusinessAddress(
    state.template,
  );
}

function staffWorkloadForMember(member) {
  const staffUid = safeString(member?.uid);
  const tasks = sortByUpdatedDesc(
    state.tasks.filter((task) => taskMatchesStaffFocus(task, staffUid)),
  );
  const openTasks = tasks.filter((task) => !taskIsCompleted(task));
  const overdueTasks = openTasks
    .filter((task) => taskIsOverdue(task))
    .sort((left, right) => taskSortValue(left) - taskSortValue(right));
  const dueTodayTasks = openTasks
    .filter((task) => taskIsDueToday(task))
    .sort((left, right) => taskSortValue(left) - taskSortValue(right));
  const leads = sortByUpdatedDesc(
    state.leads.filter((lead) => leadMatchesStaffFocus(lead, staffUid)),
  );
  const openLeads = leads.filter((lead) =>
    ["new_lead", "follow_up", "estimate_sent"].includes(lead.status),
  );
  const activeJobs = sortByUpdatedDesc(
    state.projects.filter((project) => {
      return (
        project.status !== "completed" &&
        projectMatchesStaffFocus(project, staffUid)
      );
    }),
  );
  const customers = state.customers.filter((customer) =>
    customerMatchesStaffFocus(customer, staffUid),
  );

  return {
    member,
    openTasks,
    overdueTasks,
    dueTodayTasks,
    openLeads,
    activeJobs,
    customers,
    estimateReadyCount: openLeads.filter((lead) => Boolean(lead.hasEstimate))
      .length,
    newestLead: leads[0] || null,
    nextTask:
      overdueTasks[0] ||
      openTasks.sort(
        (left, right) => taskSortValue(left) - taskSortValue(right),
      )[0] ||
      null,
  };
}

function applyStaffFocus(staffUid = "") {
  state.staffFocusUid = safeString(staffUid);

  const visibleLeadIds = new Set(visibleLeads().map((lead) => lead.id));
  const visibleTaskIds = new Set(visibleTasks().map((task) => task.id));
  const visibleProjectIds = new Set(
    visibleProjects().map((project) => project.id),
  );
  const visibleCustomerIds = new Set(
    visibleCustomers().map((customer) => customer.id),
  );

  if (state.selectedLeadId && !visibleLeadIds.has(state.selectedLeadId)) {
    clearUnsubs(state.unsubs.leadDetail);
    state.selectedLeadId = null;
    state.leadWorkspaceOpen = false;
    state.leadDocuments = [];
    syncLeadRouteState();
  }

  if (state.selectedTaskId && !visibleTaskIds.has(state.selectedTaskId)) {
    state.selectedTaskId = null;
  }

  if (
    state.selectedProjectId &&
    !visibleProjectIds.has(state.selectedProjectId)
  ) {
    clearUnsubs(state.unsubs.projectDetail);
    state.selectedProjectId = null;
    state.selectedProjectInvoiceId = null;
    state.projectScopeItems = [];
    state.projectInvoices = [];
    state.projectInvoiceDraft = null;
  }

  if (
    state.selectedCustomerId &&
    !visibleCustomerIds.has(state.selectedCustomerId)
  ) {
    clearUnsubs(state.unsubs.customerDetail);
    state.selectedCustomerId = null;
    state.customerDocuments = [];
  }

  renderAll();
}

function renderStaffWorkloadPanel() {
  if (
    !refs.staffWorkloadSummary ||
    !refs.staffWorkloadList ||
    !refs.staffClearFocusButton
  ) {
    return;
  }

  if (!isAdmin()) {
    refs.staffWorkloadSummary.innerHTML = "";
    refs.staffWorkloadList.innerHTML = "";
    refs.staffClearFocusButton.hidden = true;
    return;
  }

  const focusUid = currentStaffFocusUid();
  const focusMember = currentStaffFocusMember();
  const members = activeStaffOptions().filter((member) =>
    safeString(member.uid),
  );
  const workloadMembers = focusUid
    ? members.filter((member) => safeString(member.uid) === focusUid)
    : members;

  refs.staffClearFocusButton.hidden = !focusUid;

  if (!workloadMembers.length) {
    refs.staffWorkloadSummary.innerHTML = "";
    renderEmptyList(
      refs.staffWorkloadList,
      "No signed-in staff members are available for workload tracking yet.",
    );
    return;
  }

  const workloads = workloadMembers.map((member) =>
    staffWorkloadForMember(member),
  );
  const totals = workloads.reduce(
    (summary, workload) => {
      summary.staff += 1;
      summary.openTasks += workload.openTasks.length;
      summary.overdueTasks += workload.overdueTasks.length;
      summary.openLeads += workload.openLeads.length;
      summary.activeJobs += workload.activeJobs.length;
      return summary;
    },
    {
      staff: 0,
      openTasks: 0,
      overdueTasks: 0,
      openLeads: 0,
      activeJobs: 0,
    },
  );

  refs.staffWorkloadSummary.innerHTML = [
    {
      label: focusMember ? "Focused staff" : "Tracked staff",
      value: focusMember?.displayName || String(totals.staff),
    },
    { label: "Open tasks", value: String(totals.openTasks) },
    { label: "Overdue tasks", value: String(totals.overdueTasks) },
    { label: "Open leads", value: String(totals.openLeads) },
  ]
    .map(
      (item) => `
        <article class="summary-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `,
    )
    .join("");

  refs.staffWorkloadList.innerHTML = workloads
    .map((workload) => {
      const { member } = workload;
      const isFocused = focusUid && safeString(member.uid) === focusUid;
      const nextTaskLabel = workload.nextTask
        ? `${workload.nextTask.title || "Untitled task"}${workload.nextTask.dueAt ? ` · ${formatDateTime(workload.nextTask.dueAt)}` : ""}`
        : "No open tasks assigned";
      const newestLeadLabel = workload.newestLead
        ? `${workload.newestLead.clientName || workload.newestLead.projectAddress || "Open lead"} · ${STATUS_META[workload.newestLead.status] || "Lead"}`
        : "No assigned leads right now";

      return `
            <article class="simple-item staff-workload-card ${isFocused ? "is-focused" : ""}">
                <div class="record-topline">
                    <span class="mini-pill">${escapeHtml(member.role || "employee")}</span>
                    <span class="mini-pill">${escapeHtml(isFocused ? "CRM focused" : member.defaultLeadAssignee ? "Default lead owner" : "Active staff")}</span>
                </div>
                <strong>${escapeHtml(member.displayName || member.email || "Staff member")}</strong>
                <p>${escapeHtml(member.email || "")}</p>
                <div class="staff-workload-grid">
                    <article class="staff-workload-metric">
                        <span>Open tasks</span>
                        <strong>${escapeHtml(String(workload.openTasks.length))}</strong>
                    </article>
                    <article class="staff-workload-metric">
                        <span>Overdue</span>
                        <strong>${escapeHtml(String(workload.overdueTasks.length))}</strong>
                    </article>
                    <article class="staff-workload-metric">
                        <span>Due today</span>
                        <strong>${escapeHtml(String(workload.dueTodayTasks.length))}</strong>
                    </article>
                    <article class="staff-workload-metric">
                        <span>Open leads</span>
                        <strong>${escapeHtml(String(workload.openLeads.length))}</strong>
                    </article>
                    <article class="staff-workload-metric">
                        <span>Active jobs</span>
                        <strong>${escapeHtml(String(workload.activeJobs.length))}</strong>
                    </article>
                </div>
                <div class="staff-workload-notes">
                    <div><strong>Next task:</strong> ${escapeHtml(nextTaskLabel)}</div>
                    <div><strong>Newest lead:</strong> ${escapeHtml(newestLeadLabel)}</div>
                    <div><strong>Customers in view:</strong> ${escapeHtml(String(workload.customers.length))} · <strong>Estimate-ready leads:</strong> ${escapeHtml(String(workload.estimateReadyCount))}</div>
                </div>
                <div class="staff-workload-actions">
                    <button
                        type="button"
                        class="${isFocused ? "secondary-button" : "ghost-button"}"
                        data-command="${isFocused ? "clear-staff-focus" : "focus-staff"}"
                        data-staff-focus-uid="${escapeHtml(member.uid)}"
                    >
                        ${escapeHtml(isFocused ? "Show full team" : "Focus CRM")}
                    </button>
                    <button
                        type="button"
                        class="primary-button"
                        data-command="start-task-draft"
                        data-task-assignee-uid="${escapeHtml(member.uid)}"
                        data-task-assignee-name="${escapeHtml(member.displayName || member.email || "Assigned staff")}"
                        data-task-assignee-email="${escapeHtml(member.email || "")}"
                    >
                        Add task
                    </button>
                </div>
            </article>
        `;
    })
    .join("");
}

function renderStaffList() {
  if (!isAdmin()) {
    refs.staffList.innerHTML = `
            <article class="simple-item">
                <strong>${escapeHtml(state.profile?.displayName || state.profile?.email || "Signed in")}</strong>
                <p>${escapeHtml(state.profile?.email || "")}</p>
                <div class="simple-meta">${escapeHtml(state.profile?.role === "admin" ? "Admin" : "Employee")}</div>
            </article>
        `;
    refs.staffAdminShell.hidden = true;
    refs.staffEmployeeMessage.hidden = false;
    return;
  }

  refs.staffAdminShell.hidden = false;
  refs.staffEmployeeMessage.hidden = true;

  if (!state.staffRoster.length) {
    renderEmptyList(refs.staffList, "No staff records created yet.");
    return;
  }

  refs.staffList.innerHTML = sortByUpdatedDesc(state.staffRoster)
    .sort((left, right) =>
      (left.displayName || left.email || "").localeCompare(
        right.displayName || right.email || "",
      ),
    )
    .map(
      (member) => `
            <button type="button" class="record-button ${member.id === state.selectedStaffKey ? "is-selected" : ""}" data-staff-key="${escapeHtml(member.id)}">
                <div class="record-topline">
                    <span class="mini-pill">${escapeHtml(member.role || "employee")}</span>
                    <span class="mini-pill">${escapeHtml(member.active === false ? "Inactive" : "Active")}</span>
                </div>
                <span class="record-title">${escapeHtml(member.displayName || member.email)}</span>
                <p class="record-copy">${escapeHtml(member.email || "")}</p>
                <div class="record-meta">
                    <div>${escapeHtml(member.defaultLeadAssignee ? "Default lead assignee" : "Not default assignee")}</div>
                    <div>${escapeHtml(member.uid ? "Signed in at least once" : "Waiting for first sign-in")}</div>
                </div>
            </button>
        `,
    )
    .join("");
}

function renderAdminSectionState() {
  if (!refs.staffAdminShell || !isAdmin()) return;

  const sectionSelectors = {
    team: [".team-ops-panel", "#staff-form"],
    portal: [".portal-queue-panel"],
    templates: [".service-template-panel", "#template-form"],
    archive: [".trash-panel"],
  };
  const activeSection = sectionSelectors[state.activeAdminSection]
    ? state.activeAdminSection
    : "team";
  const allSelectors = Object.values(sectionSelectors).flat();

  allSelectors.forEach((selector) => {
    const panel = refs.staffAdminShell.querySelector(selector);
    const shouldShow = sectionSelectors[activeSection].includes(selector);
    panel?.classList.toggle("admin-section-panel-hidden", !shouldShow);
  });

  refs.adminSectionButtons.forEach((button) => {
    const isActive = button.dataset.adminSection === activeSection;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function renderAll() {
  renderWorkspaceTools();
  renderCurrentUserCard();
  renderSidebarSummary();
  renderWorkspaceCommandBar();
  renderNotificationCenter();

  if (state.activeView === "today-view") {
    renderTodayView();
  } else if (state.activeView === "tasks-view") {
    renderTaskMetrics();
    renderTaskList();
    renderTaskDetail();
  } else if (state.activeView === "leads-view") {
    renderLeadMetrics();
    renderLeadListShell();
    renderLeadWorkspaceSurface();
    renderLeadDetail();
  } else if (state.activeView === "customers-view") {
    renderCustomerMetrics();
    renderCustomerList();
    renderCustomerDetail();
  } else if (state.activeView === "jobs-view") {
    renderJobMetrics();
    renderJobList();
    renderJobDetail();
  } else if (state.activeView === "calendar-view") {
    renderCalendarView();
  } else if (state.activeView === "vendors-view") {
    renderVendorMetrics();
    renderVendorList();
    renderVendorDetail();
  } else if (state.activeView === "staff-view") {
    renderServiceTemplateManager();
    renderTemplateForm();
    renderPortalQueuePanel();
    renderTrashPanel();
    renderStaffWorkloadPanel();
    renderStaffList();
    renderAdminSectionState();
  }

  if (state.drawer.type) {
    renderActiveDrawer();
  } else {
    setDrawerVisibility(false);
  }
  syncMobileChrome();
}

function shouldRetryApiRequest(error) {
  return (
    error?.status === 401 ||
    error?.status === 403 ||
    error?.status === 408 ||
    error?.status === 429 ||
    error?.status >= 500 ||
    /Failed to fetch/i.test(error?.message || "")
  );
}

async function apiPostOnce(path, body, { forceRefresh = false } = {}) {
  if (!state.currentUser) {
    const error = new Error(
      "Your staff session is not active. Please sign in again.",
    );
    error.status = 401;
    throw error;
  }

  const token = await state.currentUser.getIdToken(forceRefresh);
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(body || {}),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || "Request failed.");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function apiPost(path, body) {
  try {
    return await apiPostOnce(path, body);
  } catch (error) {
    if (!shouldRetryApiRequest(error)) {
      throw error;
    }

    return apiPostOnce(path, body, { forceRefresh: true });
  }
}

function renderGoogleCalendarConnection() {
  if (!refs.googleCalendarConnection) return;

  const connection = state.googleCalendar;
  refs.googleCalendarConnection.classList.toggle(
    "is-connected",
    connection.connected,
  );
  refs.googleCalendarConnection.classList.toggle(
    "has-error",
    Boolean(connection.lastError),
  );
  refs.googleCalendarConnectButton.disabled = connection.loading;
  refs.googleCalendarDisconnectButton.disabled = connection.loading;
  refs.googleCalendarDisconnectButton.hidden = !connection.connected;
  refs.googleCalendarConnectButton.hidden = connection.connected;

  if (connection.loading && !connection.loaded) {
    refs.googleCalendarStatusTitle.textContent = "Checking Google Calendar";
    refs.googleCalendarStatusCopy.textContent =
      "Confirming whether this staff account is connected.";
    refs.googleCalendarConnectButton.textContent = "Checking…";
    return;
  }

  refs.googleCalendarConnectButton.textContent = connection.lastError
    ? "Reconnect Google Calendar"
    : "Connect Google Calendar";

  if (connection.connected) {
    refs.googleCalendarStatusTitle.textContent = "Google Calendar connected";
    refs.googleCalendarStatusCopy.textContent = [
      connection.email || state.profile?.email || "Your Google account",
      connection.lastSyncAt
        ? `Last synced ${formatDateTime(connection.lastSyncAt)}`
        : "New assigned tasks and schedule events sync automatically",
    ]
      .filter(Boolean)
      .join(" · ");
    return;
  }

  refs.googleCalendarStatusTitle.textContent = connection.lastError
    ? "Google Calendar needs attention"
    : "Google Calendar not connected";
  refs.googleCalendarStatusCopy.textContent =
    connection.lastError ||
    "Connect once to automatically add assigned tasks and schedule events to your Google Calendar.";
}

async function loadGoogleCalendarStatus() {
  if (!state.currentUser || state.googleCalendar.loading) return;
  state.googleCalendar.loading = true;
  renderGoogleCalendarConnection();
  try {
    const payload = await apiPost("/api/staff/google-calendar/status", {});
    state.googleCalendar = {
      loaded: true,
      loading: false,
      connected: payload.connected === true,
      status: payload.status || "not_connected",
      email: payload.email || state.profile?.email || "",
      lastSyncAt: payload.lastSyncAt ? new Date(payload.lastSyncAt) : null,
      lastError: payload.lastError || "",
    };
  } catch (error) {
    state.googleCalendar = {
      ...state.googleCalendar,
      loaded: true,
      loading: false,
      connected: false,
      lastError: error.message || "Google Calendar status could not load.",
    };
  }
  renderGoogleCalendarConnection();
}

async function connectGoogleCalendar() {
  if (state.googleCalendar.loading) return;
  state.googleCalendar.loading = true;
  renderGoogleCalendarConnection();
  try {
    const payload = await apiPost("/api/staff/google-calendar", {
      action: "begin",
    });
    if (!payload.authUrl) {
      throw new Error("Google Calendar authorization could not start.");
    }
    window.location.assign(payload.authUrl);
  } catch (error) {
    state.googleCalendar.loading = false;
    state.googleCalendar.lastError = error.message;
    renderGoogleCalendarConnection();
    throw error;
  }
}

async function disconnectGoogleCalendar() {
  const confirmed = window.confirm(
    "Disconnect Google Calendar? Existing Google events will remain, but new CRM changes will stop syncing until you reconnect.",
  );
  if (!confirmed) return;

  state.googleCalendar.loading = true;
  renderGoogleCalendarConnection();
  await apiPost("/api/staff/google-calendar", { action: "disconnect" });
  state.googleCalendar = {
    loaded: true,
    loading: false,
    connected: false,
    status: "not_connected",
    email: state.profile?.email || "",
    lastSyncAt: null,
    lastError: "",
  };
  renderGoogleCalendarConnection();
  showToast("Google Calendar disconnected.");
}

function consumeGoogleCalendarCallbackNotice() {
  const url = new URL(window.location.href);
  const result = url.searchParams.get("googleCalendar");
  if (!result) return;

  if (result === "connected") {
    showToast("Google Calendar connected. Existing upcoming work is syncing.");
  } else if (result === "cancelled") {
    showToast("Google Calendar connection was cancelled.", "error");
  } else {
    showToast(
      "Google Calendar could not connect. Check the integration setup and try again.",
      "error",
    );
  }
  url.searchParams.delete("googleCalendar");
  window.history.replaceState(window.history.state, "", url);
}

const pendingArchiveActions = new Map();

async function writeArchiveActionOnce({
  recordType,
  recordId,
  action,
  reason = "",
}) {
  const payload = {
    recordType,
    recordId,
    action,
    reason,
  };

  try {
    return await apiPost("/api/staff/archive-record", payload);
  } catch (error) {
    const canUseDirectFallback =
      isAdmin() &&
      (error?.status === 408 ||
        error?.status === 429 ||
        error?.status >= 500 ||
        /Failed to fetch/i.test(error?.message || ""));

    if (!canUseDirectFallback) {
      throw error;
    }

    const configByRecordType = {
      lead: {
        collectionName: "leads",
        activityCollectionName: "activities",
        label: "Lead",
      },
      project: {
        collectionName: "projects",
        activityCollectionName: "activities",
        label: "Job",
      },
      calendarEvent: {
        collectionName: "calendarEvents",
        activityCollectionName: "",
        label: "Calendar event",
      },
    };
    const config = configByRecordType[recordType];
    if (!config || !recordId || !["archive", "restore"].includes(action)) {
      throw error;
    }

    const recordRef = doc(state.db, config.collectionName, recordId);
    const recordSnapshot = await getDoc(recordRef);
    if (!recordSnapshot.exists()) {
      throw new Error(`${config.label} not found.`);
    }

    const actorName =
      state.profile?.displayName || state.profile?.email || "Team";
    const updatePayload =
      action === "restore"
        ? {
            archivedAt: null,
            archivedByUid: null,
            archivedByName: "",
            archiveReason: "",
            restoredAt: serverTimestamp(),
            restoredByUid: state.profile?.uid || null,
            restoredByName: actorName,
            updatedAt: serverTimestamp(),
          }
        : {
            archivedAt: serverTimestamp(),
            archivedByUid: state.profile?.uid || null,
            archivedByName: actorName,
            archiveReason: reason.slice(0, 500),
            restoredAt: null,
            restoredByUid: null,
            restoredByName: "",
            updatedAt: serverTimestamp(),
          };
    const batch = writeBatch(state.db);
    batch.set(recordRef, updatePayload, { merge: true });

    if (config.activityCollectionName) {
      const activityRef = doc(
        collection(
          state.db,
          config.collectionName,
          recordId,
          config.activityCollectionName,
        ),
      );
      batch.set(activityRef, {
        activityType: "system",
        title:
          action === "restore"
            ? `${config.label} restored`
            : `${config.label} archived`,
        body:
          action === "restore"
            ? "This record was restored from Trash."
            : reason
              ? `Archived reason: ${reason.slice(0, 500)}`
              : "This record was archived and moved to Trash.",
        actorName,
        actorUid: state.profile?.uid || "",
        actorRole: state.profile?.role || "employee",
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
    setBanner(
      "The record was saved directly because the staff API is temporarily unavailable.",
      "info",
    );
    return {
      ok: true,
      recordType,
      recordId,
      action,
      fallback: "firestore",
    };
  }
}

function writeArchiveAction(payload) {
  const requestKey = [
    payload?.recordType,
    payload?.recordId,
    payload?.action,
  ].join(":");
  const pendingRequest = pendingArchiveActions.get(requestKey);
  if (pendingRequest) {
    return pendingRequest;
  }

  const request = writeArchiveActionOnce(payload).finally(() => {
    pendingArchiveActions.delete(requestKey);
  });
  pendingArchiveActions.set(requestKey, request);
  return request;
}

async function archiveCurrentLead() {
  const lead = currentLead();
  if (!lead?.id || !isAdmin()) {
    return;
  }

  const reason = window.prompt(
    `Archive lead "${lead.clientName || lead.projectAddress || "this lead"}"?\n\nReason for the audit log:`,
    "No longer active",
  );
  if (reason === null) {
    return;
  }

  await writeArchiveAction({
    recordType: "lead",
    recordId: lead.id,
    action: "archive",
    reason,
  });
  state.selectedLeadId = null;
  state.leadWorkspaceOpen = false;
  resetEstimateWorkflowForLead("");
  subscribeLeadDetail();
  renderAll();
  showToast("Lead archived. You can restore it from Settings → Archive.");
}

async function archiveLeadFromPipeline(leadId) {
  if (!leadId || !isAdmin()) {
    return;
  }

  const lead = state.leads.find((item) => item.id === leadId);
  if (!lead) {
    showToast("That lead is no longer available.", "error");
    return;
  }

  const confirmed = window.confirm(
    `Delete "${lead.clientName || lead.projectAddress || "this lead"}" from the pipeline?\n\nIt will move to Settings → Archive and can be restored later.`,
  );
  if (!confirmed) {
    return;
  }

  await writeArchiveAction({
    recordType: "lead",
    recordId: lead.id,
    action: "archive",
    reason: "Removed from the pipeline quick action",
  });

  state.leads = state.leads.map((item) =>
    item.id === lead.id
      ? {
          ...item,
          archivedAt: new Date(),
          archivedByName: state.profile?.displayName || state.profile?.email,
          archiveReason: "Removed from the pipeline quick action",
        }
      : item,
  );

  if (state.selectedLeadId === lead.id) {
    state.selectedLeadId = null;
    state.leadWorkspaceOpen = false;
    resetEstimateWorkflowForLead("");
    subscribeLeadDetail();
  }

  renderAll();
  showToast("Lead moved to Trash. It can be restored from Settings → Archive.");
}

async function archiveCurrentProject() {
  const project = currentProject();
  if (!project?.id || !isAdmin()) {
    return;
  }

  const reason = window.prompt(
    `Archive job "${project.projectAddress || project.clientName || "this job"}"?\n\nReason for the audit log:`,
    "Closed or no longer active",
  );
  if (reason === null) {
    return;
  }

  await writeArchiveAction({
    recordType: "project",
    recordId: project.id,
    action: "archive",
    reason,
  });
  clearSelectedProjectWorkspace();
  renderAll();
  showToast("Job archived. You can restore it from Settings → Archive.");
}

async function archiveCalendarEvent(eventId) {
  if (!eventId || !isAdmin()) {
    return;
  }

  const event = state.calendarEvents.find((item) => item.id === eventId);
  const reason = window.prompt(
    `Archive event "${event?.title || event?.clientTitle || "this event"}"?\n\nReason for the audit log:`,
    "No longer needed",
  );
  if (reason === null) {
    return;
  }

  await writeArchiveAction({
    recordType: "calendarEvent",
    recordId: eventId,
    action: "archive",
    reason,
  });
  showToast("Calendar event archived.");
}

async function restoreArchivedRecord(recordType, recordId) {
  if (!recordType || !recordId || !isAdmin()) {
    return;
  }

  await writeArchiveAction({
    recordType,
    recordId,
    action: "restore",
  });
  showToast("Record restored.");
}

function resetRecordWorkspaceScroll(recordShell, { smooth = false } = {}) {
  window.requestAnimationFrame(() => {
    recordShell?.scrollTo({
      top: 0,
      left: 0,
      behavior: smooth ? "smooth" : "auto",
    });
    if (isMobileViewport()) {
      window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
    }
  });
}

function selectLead(
  leadId,
  { openWorkspace = true, preserveTab = false, historyMode = "push" } = {},
) {
  const nextLeadId = safeString(leadId);
  const currentLeadId = safeString(state.selectedLeadId);
  const switchingLeads = Boolean(
    currentLeadId && nextLeadId && currentLeadId !== nextLeadId,
  );
  const hasUnsavedEstimate =
    switchingLeads && state.estimateWorkflow.dirty;
  const hasUnsavedLeadDetails =
    switchingLeads && refs.leadCoreForm?.classList.contains("is-dirty");

  if (switchingLeads && estimateOperationIsPending(currentLeadId)) {
    showToast(
      "Wait for the current estimate save or publish to finish before changing leads.",
      "error",
    );
    return false;
  }

  if (
    (hasUnsavedEstimate || hasUnsavedLeadDetails) &&
    !window.confirm(
      "This lead has unsaved changes. Leave the lead and discard those changes?",
    )
  ) {
    return false;
  }

  state.leadDraft = null;
  state.selectedLeadId = nextLeadId;
  state.leadWorkspaceOpen = openWorkspace;
  if (currentLeadId !== nextLeadId) {
    refs.leadCoreForm?.classList.remove("is-dirty");
    resetEstimateWorkflowForLead(nextLeadId);
  }
  if (!preserveTab) {
    state.activeLeadTab = "overview";
  }
  subscribeLeadDetail();
  renderAll();
  syncLeadRouteState({ historyMode });

  if (openWorkspace) {
    resetRecordWorkspaceScroll(refs.leadRecordShell);
  }
  return true;
}

function closeLeadWorkspace({ historyMode = "push" } = {}) {
  if (!state.selectedLeadId) {
    state.leadDraft = null;
    state.leadActivities = [];
    state.estimate = null;
  }
  if (isMobileViewport()) {
    state.leadLayout = "list";
  }
  state.leadWorkspaceOpen = false;
  renderAll();
  syncLeadRouteState({ historyMode });
  resetRecordWorkspaceScroll(refs.leadRecordShell, { smooth: true });
}

function selectProject(projectId, { historyMode = "push" } = {}) {
  state.selectedProjectId = projectId;
  state.selectedProjectInvoiceId = null;
  state.projectInvoiceDraft = null;
  state.activeJobTab = isServiceOrderProject(
    state.projects.find((project) => project.id === projectId),
  )
    ? "invoices"
    : "work";
  subscribeProjectDetail();
  renderAll();
  syncLeadRouteState({ historyMode });
  resetRecordWorkspaceScroll(refs.jobRecordShell);
}

function selectProjectInvoice(invoiceId, { openTab = true } = {}) {
  state.selectedProjectInvoiceId = invoiceId;
  state.projectInvoiceDraft = null;
  if (openTab) {
    state.activeJobTab = "invoices";
  }
  renderJobDetail();
  syncLeadRouteState({ historyMode: "push" });
}

function startProjectInvoiceDraft(seed = {}) {
  const project = currentProject();
  if (!project) {
    showToast("Select a job first.", "error");
    return;
  }

  state.selectedProjectInvoiceId = null;
  state.projectInvoiceDraft = defaultProjectInvoiceDraft(project, seed);
  state.activeJobTab = "invoices";
  renderJobDetail();
}

function selectCustomer(customerId) {
  state.customerDraft = null;
  state.selectedCustomerId = customerId;
  subscribeCustomerDetail();
  renderAll();
  resetRecordWorkspaceScroll(refs.customerRecordShell);
}

function selectVendor(vendorId) {
  state.vendorDraft = null;
  state.selectedVendorId = vendorId;
  state.activeVendorTab = "overview";
  renderAll();
  resetRecordWorkspaceScroll(refs.vendorRecordShell);
}

function selectTask(taskId) {
  state.taskDraft = null;
  state.selectedTaskId = taskId;
  renderAll();
  resetRecordWorkspaceScroll(refs.taskDetailShell);
}

function startLeadDraft(customerId = null) {
  const customer = customerId
    ? state.customers.find((item) => item.id === customerId)
    : null;
  clearUnsubs(state.unsubs.leadDetail);
  state.selectedLeadId = null;
  state.leadDraft = defaultLeadDraft(customer || null);
  state.leadActivities = [];
  state.estimate = null;
  state.estimateShare = null;
  resetEstimateWorkflowForLead("");
  state.leadDocuments = [];
  state.activeLeadTab = "overview";
  state.leadWorkspaceOpen = true;
  switchView("leads-view");
  renderAll();
  resetRecordWorkspaceScroll(refs.leadRecordShell);
}

function startCustomerDraft() {
  clearUnsubs(state.unsubs.customerDetail);
  state.selectedCustomerId = null;
  state.customerDraft = defaultCustomerDraft();
  state.customerDocuments = [];
  switchView("customers-view");
  renderAll();
  resetRecordWorkspaceScroll(refs.customerRecordShell);
}

function startVendorDraft() {
  state.selectedVendorId = null;
  state.vendorDraft = defaultVendorDraft();
  state.activeVendorTab = "overview";
  switchView("vendors-view");
  renderAll();
  resetRecordWorkspaceScroll(refs.vendorRecordShell);
}

function startTaskDraft(linked = {}) {
  state.selectedTaskId = null;
  state.taskDraft = defaultTaskDraft(linked);
  switchView("tasks-view");
  renderAll();
  resetRecordWorkspaceScroll(refs.taskDetailShell);
}

async function syncSession(user) {
  const email = safeString(user.email).toLowerCase();
  const allowedRef = doc(state.db, "allowedStaff", sanitiseEmailKey(email));

  async function syncSessionViaApi() {
    const token = await user.getIdToken();
    const response = await fetch("/api/auth/sync-session", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
      },
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        payload.message ||
          `Could not verify this staff account (${response.status}).`,
      );
      error.status = response.status;
      throw error;
    }

    return {
      ...payload,
      mode: payload.mode || "api",
      claimsSynced: payload.claimsSynced !== false,
      profile: await verifyClientStaffAccess(user, payload.profile || {}),
    };
  }

  async function syncSessionFromFirestore() {
    if (!email) {
      return {
        authorised: false,
        message: "This Google account does not have an email address.",
      };
    }

    const allowedSnap = await getDoc(allowedRef);
    if (!allowedSnap.exists()) {
      return {
        authorised: false,
        message: "This Google account is not approved for the staff portal.",
      };
    }

    const allowedData = allowedSnap.data() || {};
    if (allowedData.active !== true) {
      return {
        authorised: false,
        message: "This Google account is not approved for the staff portal.",
      };
    }

    const profile = normaliseStaffProfile(user, allowedData);

    await Promise.all([
      setDoc(
        doc(state.db, "users", user.uid),
        {
          ...profile,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
      setDoc(
        allowedRef,
        {
          uid: user.uid,
          email,
          displayName: profile.displayName,
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    ]);

    return {
      ok: true,
      authorised: true,
      profile: await verifyClientStaffAccess(user, profile),
      mode: "firestore",
      claimsSynced: false,
    };
  }

  try {
    return await syncSessionViaApi();
  } catch (error) {
    if (!shouldFallbackToFirestore(error)) {
      throw error;
    }

    return syncSessionFromFirestore();
  }
}

function resetSelectionFromSnapshots() {
  if (
    state.selectedLeadId &&
    !state.leads.some((lead) => lead.id === state.selectedLeadId)
  ) {
    state.selectedLeadId = null;
    state.leadWorkspaceOpen = false;
    state.estimateShare = null;
    state.leadDocuments = [];
    resetEstimateWorkflowForLead("");
    state.leadDetailSubscriptionId = "";
    syncLeadRouteState();
  }

  if (
    state.selectedProjectId &&
    !state.projects.some((project) => project.id === state.selectedProjectId)
  ) {
    state.selectedProjectId = null;
    state.selectedProjectInvoiceId = null;
    state.projectScopeItems = [];
    state.projectInvoices = [];
    state.projectInvoiceDraft = null;
    syncLeadRouteState();
  }

  if (
    state.selectedCustomerId &&
    !state.customers.some(
      (customer) => customer.id === state.selectedCustomerId,
    )
  ) {
    state.selectedCustomerId = null;
    state.customerDocuments = [];
    state.customerPortalContacts = [];
    state.customerPortalThreads = [];
    state.customerPortalMessages = {};
    state.selectedCustomerPortalContactId = null;
    state.selectedCustomerPortalThreadId = null;
  }

  if (
    state.selectedVendorId &&
    !state.vendors.some((vendor) => vendor.id === state.selectedVendorId)
  ) {
    state.selectedVendorId = null;
  }

  if (
    state.selectedTaskId &&
    !state.tasks.some((task) => task.id === state.selectedTaskId)
  ) {
    state.selectedTaskId = null;
  }
}

function subscribeBaseData() {
  clearUnsubs(state.unsubs.base);
  state.unsubs.base = [];
  clearUnsubs(state.unsubs.portalQueues);
  state.unsubs.portalQueues = [];
  clearUnsubs(state.unsubs.scopedProjects);
  state.unsubs.scopedProjects = [];

  const leadSource = isAdmin()
    ? collection(state.db, "leads")
    : query(
        collection(state.db, "leads"),
        where("assignedToUid", "==", state.profile.uid),
      );

  state.unsubs.base.push(
    onSnapshot(
      leadSource,
      (snapshot) => {
        state.leads = snapshot.docs.map(normaliseFirestoreDoc);
        refreshScopedCustomers();
        if (!isAdmin()) {
          syncScopedProjects();
        }
        restoreLeadWorkspaceFromRoute();
        resetSelectionFromSnapshots();
        subscribeLeadDetail();
        subscribeCustomerDetail();
        renderAll();
        setSyncStatus("Lead data live");
      },
      (error) => {
        handleBaseSubscriptionError("Lead data", error);
      },
    ),
  );

  if (isAdmin()) {
    state.unsubs.base.push(
      onSnapshot(
        collection(state.db, "projects"),
        (snapshot) => {
          state.projects = snapshot.docs.map(normaliseFirestoreDoc);
          refreshScopedCustomers();
          restoreProjectWorkspaceFromRoute();
          resetSelectionFromSnapshots();
          subscribeProjectDetail();
          subscribeCustomerDetail();
          renderAll();
        },
        (error) => {
          handleBaseSubscriptionError("Job data", error);
        },
      ),
    );
  } else {
    state.projects = [];
    syncScopedProjects();
  }

  if (isAdmin()) {
    state.unsubs.base.push(
      onSnapshot(
        collection(state.db, "customers"),
        (snapshot) => {
          state.customers = snapshot.docs.map(normaliseFirestoreDoc);
          resetSelectionFromSnapshots();
          subscribeCustomerDetail();
          renderAll();
        },
        (error) => {
          handleBaseSubscriptionError("Customer data", error);
        },
      ),
    );
  } else {
    refreshScopedCustomers();
  }

  state.unsubs.base.push(
    onSnapshot(
      collection(state.db, "vendors"),
      (snapshot) => {
        state.vendors = snapshot.docs.map(normaliseFirestoreDoc);
        resetSelectionFromSnapshots();
        renderAll();
      },
      (error) => {
        handleBaseSubscriptionError("Vendor data", error);
      },
    ),
  );

  state.unsubs.base.push(
    onSnapshot(
      collection(state.db, "vendorBills"),
      (snapshot) => {
        state.vendorBills = snapshot.docs.map(normaliseFirestoreDoc);
        renderAll();
      },
      (error) => {
        handleBaseSubscriptionError("Vendor bill data", error);
      },
    ),
  );

  const vendorDocumentSource = isAdmin()
    ? collection(state.db, "vendorDocuments")
    : query(
        collection(state.db, "vendorDocuments"),
        where("accessLevel", "==", "staff"),
      );

  state.unsubs.base.push(
    onSnapshot(
      vendorDocumentSource,
      (snapshot) => {
        state.vendorDocuments = snapshot.docs.map(normaliseFirestoreDoc);
        renderAll();
      },
      (error) => {
        handleBaseSubscriptionError("Vendor document data", error);
      },
    ),
  );

  const taskSource = isAdmin()
    ? collection(state.db, "tasks")
    : query(
        collection(state.db, "tasks"),
        where("assignedToUid", "==", state.profile.uid),
      );

  state.unsubs.base.push(
    onSnapshot(
      taskSource,
      (snapshot) => {
        state.tasks = snapshot.docs.map(normaliseFirestoreDoc);
        if (!isAdmin()) {
          syncScopedProjects();
        }
        resetSelectionFromSnapshots();
        renderAll();
      },
      (error) => {
        handleBaseSubscriptionError("Task data", error);
      },
    ),
  );

  const calendarSource = isAdmin()
    ? collection(state.db, "calendarEvents")
    : query(
        collection(state.db, "calendarEvents"),
        where("assignedStaffUids", "array-contains", state.profile.uid),
      );

  state.unsubs.base.push(
    onSnapshot(
      calendarSource,
      (snapshot) => {
        state.calendarEvents = snapshot.docs.map(normaliseFirestoreDoc);
        renderAll();
      },
      (error) => {
        state.calendarEvents = [];
        state.googleCalendar = {
          loaded: false,
          loading: false,
          connected: false,
          status: "not_connected",
          email: "",
          lastSyncAt: null,
          lastError: "",
        };
        renderAll();
        handleBaseSubscriptionError("Calendar data", error, {
          signOutOnPermissionDenied: false,
          permissionMessage:
            "Calendar could not load for this staff account. Leads, jobs, tasks, and the rest of the portal are still available.",
        });
      },
    ),
  );

  state.unsubs.base.push(
    onSnapshot(
      doc(state.db, "emailTemplates", "estimate-default"),
      (snapshot) => {
        state.template = snapshot.exists()
          ? normaliseFirestoreDoc(snapshot)
          : { ...EMPTY_TEMPLATE };
        renderTemplateForm();
      },
      (error) => {
        handleBaseSubscriptionError("Estimate template", error);
      },
    ),
  );

  state.unsubs.base.push(
    onSnapshot(
      collection(state.db, "serviceTemplates"),
      (snapshot) => {
        state.serviceTemplates = snapshot.docs
          .map(normaliseFirestoreDoc)
          .map((item) => normaliseServiceTemplateDoc(item));
        if (
          state.selectedServiceTemplateId &&
          !state.serviceTemplates.some(
            (template) => template.id === state.selectedServiceTemplateId,
          )
        ) {
          state.selectedServiceTemplateId = null;
        }
        renderAll();
      },
      (error) => {
        handleServiceTemplateSubscriptionError(error);
      },
    ),
  );

  if (isAdmin()) {
    state.unsubs.base.push(
      onSnapshot(
        collection(state.db, "allowedStaff"),
        (snapshot) => {
          state.staffRoster = snapshot.docs.map(normaliseFirestoreDoc);
          renderAll();
        },
        (error) => {
          handleBaseSubscriptionError("Staff roster", error);
        },
      ),
    );

    state.unsubs.portalQueues.push(
      onSnapshot(
        collection(state.db, "estimateShares"),
        (snapshot) => {
          state.portalQueueEstimateShares = snapshot.docs
            .map(normaliseFirestoreDoc)
            .sort(
              (left, right) =>
                toMillis(right.updatedAt || right.createdAt) -
                toMillis(left.updatedAt || left.createdAt),
            );
          renderPortalQueuePanel();
        },
        (error) => {
          handleBaseSubscriptionError("Portal estimate queue", error);
        },
      ),
    );

    state.unsubs.portalQueues.push(
      onSnapshot(
        collectionGroup(state.db, "invoices"),
        (snapshot) => {
          state.portalQueueInvoices = snapshot.docs
            .map(normaliseFirestoreDoc)
            .sort(
              (left, right) =>
                toMillis(right.updatedAt || right.createdAt) -
                toMillis(left.updatedAt || left.createdAt),
            );
          renderPortalQueuePanel();
        },
        (error) => {
          handleBaseSubscriptionError("Portal invoice queue", error);
        },
      ),
    );

    state.unsubs.portalQueues.push(
      onSnapshot(
        collectionGroup(state.db, "threads"),
        (snapshot) => {
          state.portalQueueThreads = snapshot.docs
            .map(normaliseFirestoreDoc)
            .sort(
              (left, right) =>
                toMillis(
                  right.lastMessageAt || right.updatedAt || right.createdAt,
                ) -
                toMillis(
                  left.lastMessageAt || left.updatedAt || left.createdAt,
                ),
            );
          renderPortalQueuePanel();
        },
        (error) => {
          handleBaseSubscriptionError("Portal thread queue", error);
        },
      ),
    );

    state.unsubs.portalQueues.push(
      onSnapshot(
        collectionGroup(state.db, "contacts"),
        (snapshot) => {
          state.portalQueueContacts = snapshot.docs
            .map(normaliseFirestoreDoc)
            .sort(
              (left, right) =>
                toMillis(right.updatedAt || right.createdAt) -
                toMillis(left.updatedAt || left.createdAt),
            );
          renderPortalQueuePanel();
        },
        (error) => {
          handleBaseSubscriptionError("Portal contact queue", error);
        },
      ),
    );
  } else {
    state.staffRoster = [];
    state.portalQueueEstimateShares = [];
    state.portalQueueInvoices = [];
    state.portalQueueThreads = [];
    state.portalQueueContacts = [];
  }
}

function subscribeLeadDetail() {
  const subscribedLeadId = safeString(state.selectedLeadId);
  const isSameLeadSubscription =
    safeString(state.leadDetailSubscriptionId) === subscribedLeadId;
  clearUnsubs(state.unsubs.leadDetail);
  state.unsubs.leadDetail = [];
  state.leadActivities = [];
  if (!isSameLeadSubscription) {
    state.estimate = null;
    state.estimateShare = null;
    state.leadEstimateShares = [];
  }
  state.leadDocuments = [];
  state.leadDetailSubscriptionId = subscribedLeadId;

  if (!subscribedLeadId) {
    renderLeadDetail();
    return;
  }

  void refreshEstimateShareState(subscribedLeadId);

  state.unsubs.leadDetail.push(
    onSnapshot(
      collection(state.db, "leads", subscribedLeadId, "activities"),
      (snapshot) => {
        if (safeString(state.selectedLeadId) !== subscribedLeadId) {
          return;
        }
        state.leadActivities = snapshot.docs
          .map(normaliseFirestoreDoc)
          .sort(
            (left, right) =>
              toMillis(right.createdAt) - toMillis(left.createdAt),
          );
        renderLeadDetail();
      },
      (error) => {
        if (safeString(state.selectedLeadId) !== subscribedLeadId) {
          return;
        }
        handleDetailSubscriptionError("Lead activity", error, () => {
          state.leadActivities = [];
          renderLeadDetail();
        });
      },
    ),
  );

  state.unsubs.leadDetail.push(
    onSnapshot(
      doc(state.db, "estimates", subscribedLeadId),
      (snapshot) => {
        if (safeString(state.selectedLeadId) !== subscribedLeadId) {
          return;
        }

        if (!snapshot.exists()) {
          state.estimate = null;
          if (
            !state.estimateWorkflow.dirty &&
            !estimateOperationIsPending(subscribedLeadId)
          ) {
            setEstimateWorkflowState({
              leadId: subscribedLeadId,
              status: "unsaved",
              dirty: false,
              operation: "",
              message:
                "No draft is saved for this lead yet. Complete the estimate, then save or publish it.",
              error: "",
            });
          }
          renderLeadDetail();
          return;
        }

        const estimateData = snapshot.data() || {};
        const storedLeadId = safeString(
          estimateData.leadId || estimateData.id || subscribedLeadId,
        );
        if (storedLeadId !== subscribedLeadId) {
          state.estimate = null;
          setEstimateWorkflowState({
            leadId: subscribedLeadId,
            status: "failed",
            dirty: false,
            operation: "",
            message: "",
            error:
              "This saved estimate points to a different lead and was not loaded. Review the record before publishing.",
          });
          renderLeadDetail();
          return;
        }

        state.estimate = {
          ...estimateData,
          id: subscribedLeadId,
          leadId: subscribedLeadId,
        };
        if (
          !state.estimateWorkflow.dirty &&
          !estimateOperationIsPending(subscribedLeadId)
        ) {
          state.estimateWorkflow = {
            ...state.estimateWorkflow,
            leadId: subscribedLeadId,
            status: "saved",
            dirty: false,
            operation: "",
            message:
              "This draft is saved to this lead. The client sees it only after you publish.",
            error: "",
          };
          refs.estimateForm.classList.remove("is-dirty");
        }
        renderLeadDetail();
      },
      (error) => {
        if (safeString(state.selectedLeadId) !== subscribedLeadId) {
          return;
        }
        handleDetailSubscriptionError("Estimate", error, () => {
          state.estimate = null;
          setEstimateWorkflowState({
            leadId: subscribedLeadId,
            status: "failed",
            dirty: false,
            operation: "",
            message: "",
            error:
              "This lead's estimate could not be loaded. Refresh before editing or publishing.",
          });
          renderLeadDetail();
        });
      },
    ),
  );

  state.unsubs.leadDetail.push(
    onSnapshot(
      query(
        collection(state.db, "estimateShares"),
        where("leadId", "==", subscribedLeadId),
      ),
      (snapshot) => {
        if (safeString(state.selectedLeadId) !== subscribedLeadId) {
          return;
        }
        syncLeadEstimateShareState(
          subscribedLeadId,
          snapshot.docs
            .map((entry) => hydrateEstimateShare(entry))
            .filter(
              (share) =>
                safeString(share.type || "estimate") === "estimate" &&
                safeString(share.leadId) === subscribedLeadId,
            ),
        );
      },
      (error) => {
        if (safeString(state.selectedLeadId) !== subscribedLeadId) {
          return;
        }
        handleDetailSubscriptionError("Estimate publishing", error, () => {
          state.leadEstimateShares = [];
          state.estimateShare = null;
          renderLeadDetail();
        });
      },
    ),
  );

  state.unsubs.leadDetail.push(
    onSnapshot(
      query(
        collection(state.db, "recordDocuments"),
        where("leadId", "==", subscribedLeadId),
      ),
      (snapshot) => {
        if (safeString(state.selectedLeadId) !== subscribedLeadId) {
          return;
        }
        state.leadDocuments = snapshot.docs
          .map(normaliseFirestoreDoc)
          .sort(
            (left, right) =>
              toMillis(
                right.relatedDate || right.updatedAt || right.createdAt,
              ) -
              toMillis(left.relatedDate || left.updatedAt || left.createdAt),
          );
        renderLeadDetail();
      },
      (error) => {
        if (safeString(state.selectedLeadId) !== subscribedLeadId) {
          return;
        }
        handleDetailSubscriptionError("Lead documents", error, () => {
          state.leadDocuments = [];
          renderLeadDetail();
        });
      },
    ),
  );
}

function subscribeCustomerDetail() {
  const subscribedCustomerId = safeString(state.selectedCustomerId);
  clearUnsubs(state.unsubs.customerDetail);
  state.unsubs.customerDetail = [];
  clearUnsubs(state.unsubs.customerPortalMessages);
  state.unsubs.customerPortalMessages = [];
  state.customerDocuments = [];
  state.customerPortalContacts = [];
  state.customerPortalEstimateShares = [];
  state.customerPortalInvoices = [];
  state.customerPortalChangeOrders = [];
  state.customerPortalThreads = [];
  state.customerPortalMessages = {};
  state.selectedCustomerPortalContactId = null;
  state.selectedCustomerPortalThreadId = null;

  if (!subscribedCustomerId) {
    renderCustomerDetail();
    return;
  }

  state.unsubs.customerDetail.push(
    onSnapshot(
      query(
        collection(state.db, "recordDocuments"),
        where("customerId", "==", state.selectedCustomerId),
      ),
      (snapshot) => {
        state.customerDocuments = snapshot.docs
          .map(normaliseFirestoreDoc)
          .sort(
            (left, right) =>
              toMillis(
                right.relatedDate || right.updatedAt || right.createdAt,
              ) -
              toMillis(left.relatedDate || left.updatedAt || left.createdAt),
          );
        renderCustomerDetail();
      },
      (error) => {
        handleDetailSubscriptionError("Customer documents", error, () => {
          state.customerDocuments = [];
          renderCustomerDetail();
        });
      },
    ),
  );

  state.unsubs.customerDetail.push(
    onSnapshot(
      query(
        collection(state.db, "estimateShares"),
        where("customerId", "==", subscribedCustomerId),
      ),
      (snapshot) => {
        if (safeString(state.selectedCustomerId) !== subscribedCustomerId) {
          return;
        }
        state.customerPortalEstimateShares = snapshot.docs
          .map((entry) => hydrateEstimateShare(entry))
          .filter(
            (share) =>
              safeString(share.customerId) === subscribedCustomerId &&
              safeString(share.type || "estimate") === "estimate",
          )
          .sort(
            (left, right) =>
              toMillis(right.updatedAt || right.publishedAt || right.createdAt) -
              toMillis(left.updatedAt || left.publishedAt || left.createdAt),
          );
        renderCustomerDetail();
      },
      (error) => {
        if (safeString(state.selectedCustomerId) !== subscribedCustomerId) {
          return;
        }
        handleDetailSubscriptionError("Customer portal estimates", error, () => {
          state.customerPortalEstimateShares = [];
          renderCustomerDetail();
        });
      },
    ),
  );

  state.unsubs.customerDetail.push(
    onSnapshot(
      query(
        collectionGroup(state.db, "invoices"),
        where("customerId", "==", state.selectedCustomerId),
      ),
      (snapshot) => {
        state.customerPortalInvoices = snapshot.docs
          .map(normaliseFirestoreDoc)
          .sort(
            (left, right) =>
              toMillis(right.updatedAt || right.issueDate || right.createdAt) -
              toMillis(left.updatedAt || left.issueDate || left.createdAt),
          );
        renderCustomerDetail();
      },
      (error) => {
        handleDetailSubscriptionError("Customer portal invoices", error, () => {
          state.customerPortalInvoices = [];
          renderCustomerDetail();
        });
      },
    ),
  );

  state.unsubs.customerDetail.push(
    onSnapshot(
      query(
        collectionGroup(state.db, "changeOrders"),
        where("customerId", "==", state.selectedCustomerId),
      ),
      (snapshot) => {
        state.customerPortalChangeOrders = snapshot.docs
          .map(normaliseFirestoreDoc)
          .sort(
            (left, right) =>
              toMillis(right.updatedAt || right.relatedDate || right.createdAt) -
              toMillis(left.updatedAt || left.relatedDate || left.createdAt),
          );
        renderCustomerDetail();
      },
      (error) => {
        handleDetailSubscriptionError(
          "Customer portal change orders",
          error,
          () => {
            state.customerPortalChangeOrders = [];
            renderCustomerDetail();
          },
        );
      },
    ),
  );

  if (isAdmin()) {
    state.unsubs.customerDetail.push(
      onSnapshot(
        collection(state.db, "customers", state.selectedCustomerId, "contacts"),
        (snapshot) => {
          state.customerPortalContacts = snapshot.docs
            .map(normaliseFirestoreDoc)
            .sort(
              (left, right) =>
                toMillis(right.updatedAt || right.createdAt) -
                toMillis(left.updatedAt || left.createdAt),
            );

          if (
            state.selectedCustomerPortalContactId &&
            !state.customerPortalContacts.some(
              (contact) => contact.id === state.selectedCustomerPortalContactId,
            )
          ) {
            state.selectedCustomerPortalContactId = null;
          }

          if (
            !state.selectedCustomerPortalContactId &&
            state.customerPortalContacts.length
          ) {
            state.selectedCustomerPortalContactId =
              state.customerPortalContacts[0].id;
          }

          if (state.selectedCustomerPortalContactId) {
            const selected =
              state.customerPortalContacts.find(
                (contact) =>
                  contact.id === state.selectedCustomerPortalContactId,
              ) || null;
            setCustomerPortalPreviewLink(selected);
          } else {
            setCustomerPortalPreviewLink(null);
          }

          renderCustomerDetail();
        },
        (error) => {
          handleDetailSubscriptionError("Portal contacts", error, () => {
            state.customerPortalContacts = [];
            state.selectedCustomerPortalContactId = null;
            setCustomerPortalPreviewLink(null);
            renderCustomerDetail();
          });
        },
      ),
    );
  }

  state.unsubs.customerDetail.push(
    onSnapshot(
      collection(state.db, "customers", state.selectedCustomerId, "threads"),
      (snapshot) => {
        clearUnsubs(state.unsubs.customerPortalMessages);
        state.unsubs.customerPortalMessages = [];
        state.customerPortalMessages = {};

        state.customerPortalThreads = snapshot.docs
          .map(normaliseFirestoreDoc)
          .sort(
            (left, right) =>
              toMillis(
                right.lastMessageAt || right.updatedAt || right.createdAt,
              ) -
              toMillis(left.lastMessageAt || left.updatedAt || left.createdAt),
          );

        if (
          state.selectedCustomerPortalThreadId &&
          !state.customerPortalThreads.some(
            (thread) => thread.id === state.selectedCustomerPortalThreadId,
          )
        ) {
          state.selectedCustomerPortalThreadId = null;
        }

        if (
          !state.selectedCustomerPortalThreadId &&
          state.customerPortalThreads.length
        ) {
          const generalThread =
            state.customerPortalThreads.find(
              (thread) => thread.id === "general",
            ) || null;
          state.selectedCustomerPortalThreadId =
            generalThread?.id || state.customerPortalThreads[0].id;
        }

        state.customerPortalThreads.forEach((thread) => {
          state.unsubs.customerPortalMessages.push(
            onSnapshot(
              collection(
                state.db,
                "customers",
                state.selectedCustomerId,
                "threads",
                thread.id,
                "messages",
              ),
              (messageSnapshot) => {
                state.customerPortalMessages[thread.id] = messageSnapshot.docs
                  .map(normaliseFirestoreDoc)
                  .sort(
                    (left, right) =>
                      toMillis(left.createdAt) - toMillis(right.createdAt),
                  );
                renderCustomerDetail();
              },
              (error) => {
                handleDetailSubscriptionError("Portal messages", error, () => {
                  state.customerPortalMessages[thread.id] = [];
                  renderCustomerDetail();
                });
              },
            ),
          );
        });

        renderCustomerDetail();
      },
      (error) => {
        handleDetailSubscriptionError("Portal threads", error, () => {
          clearUnsubs(state.unsubs.customerPortalMessages);
          state.unsubs.customerPortalMessages = [];
          state.customerPortalThreads = [];
          state.customerPortalMessages = {};
          state.selectedCustomerPortalThreadId = null;
          renderCustomerDetail();
        });
      },
    ),
  );
}

function subscribeProjectDetail() {
  const subscribedProjectId = safeString(state.selectedProjectId);
  clearUnsubs(state.unsubs.projectDetail);
  state.unsubs.projectDetail = [];
  state.projectExpenses = [];
  state.projectPayments = [];
  state.projectInvoices = [];
  state.projectChangeOrders = [];
  state.projectDetailLoaded = {
    expenses: false,
    payments: false,
    changeOrders: false,
  };
  state.projectScopeItems = [];
  state.projectDocuments = [];
  state.projectNotes = [];
  state.projectActivities = [];
  state.projectLeadActivities = [];
  state.projectLeadEstimate = null;
  state.projectLeadEstimateShares = [];
  state.projectInvoiceDraft = null;
  state.selectedProjectInvoiceId = null;
  state.editingChangeOrderId = null;
  state.editingExpenseId = null;
  resetChangeOrderForm();
  resetExpenseForm();

  if (!subscribedProjectId) {
    renderJobDetail();
    return;
  }

  state.unsubs.projectDetail.push(
    onSnapshot(
      collection(state.db, "projects", state.selectedProjectId, "expenses"),
      (snapshot) => {
        state.projectExpenses = snapshot.docs
          .map(normaliseFirestoreDoc)
          .sort(
            (left, right) =>
              toMillis(right.createdAt) - toMillis(left.createdAt),
          );
        state.projectDetailLoaded.expenses = true;
        renderJobMetrics();
        renderJobList();
        renderJobDetail();
      },
      (error) => {
        handleDetailSubscriptionError("Job expenses", error, () => {
          state.projectExpenses = [];
          renderJobMetrics();
          renderJobList();
          renderJobDetail();
        });
      },
    ),
  );

  state.unsubs.projectDetail.push(
    onSnapshot(
      collection(state.db, "projects", state.selectedProjectId, "payments"),
      (snapshot) => {
        state.projectPayments = snapshot.docs
          .map(normaliseFirestoreDoc)
          .sort(
            (left, right) =>
              toMillis(right.createdAt) - toMillis(left.createdAt),
          );
        state.projectDetailLoaded.payments = true;
        renderJobMetrics();
        renderJobList();
        renderJobDetail();
      },
      (error) => {
        handleDetailSubscriptionError("Job payments", error, () => {
          state.projectPayments = [];
          renderJobMetrics();
          renderJobList();
          renderJobDetail();
        });
      },
    ),
  );

  state.unsubs.projectDetail.push(
    onSnapshot(
      collection(state.db, "projects", state.selectedProjectId, "invoices"),
      (snapshot) => {
        state.projectInvoices = snapshot.docs
          .map(normaliseFirestoreDoc)
          .map((item) => hydrateProjectInvoice(currentProject(), item))
          .sort(
            (left, right) =>
              toMillis(right.updatedAt || right.createdAt) -
              toMillis(left.updatedAt || left.createdAt),
          );

        if (
          state.selectedProjectInvoiceId &&
          !state.projectInvoices.some(
            (invoice) => invoice.id === state.selectedProjectInvoiceId,
          )
        ) {
          state.selectedProjectInvoiceId = null;
        }
        if (
          !state.projectInvoiceDraft &&
          !state.selectedProjectInvoiceId &&
          state.projectInvoices.length
        ) {
          state.selectedProjectInvoiceId = state.projectInvoices[0].id;
        }
        renderJobDetail();
      },
      (error) => {
        handleDetailSubscriptionError("Job invoices", error, () => {
          state.projectInvoices = [];
          state.selectedProjectInvoiceId = null;
          state.projectInvoiceDraft = null;
          renderJobDetail();
        });
      },
    ),
  );

  state.unsubs.projectDetail.push(
    onSnapshot(
      collection(state.db, "projects", state.selectedProjectId, "changeOrders"),
      (snapshot) => {
        state.projectChangeOrders = snapshot.docs
          .map(normaliseFirestoreDoc)
          .sort(
            (left, right) =>
              toMillis(right.relatedDate || right.createdAt) -
              toMillis(left.relatedDate || left.createdAt),
          );
        state.projectDetailLoaded.changeOrders = true;
        renderJobMetrics();
        renderJobList();
        renderJobDetail();
      },
      (error) => {
        handleDetailSubscriptionError("Job change orders", error, () => {
          state.projectChangeOrders = [];
          renderJobMetrics();
          renderJobList();
          renderJobDetail();
        });
      },
    ),
  );

  state.unsubs.projectDetail.push(
    onSnapshot(
      collection(state.db, "projects", state.selectedProjectId, "scopeItems"),
      (snapshot) => {
        state.projectScopeItems = snapshot.docs
          .map(normaliseFirestoreDoc)
          .sort((left, right) => {
            const indexDiff =
              toNumber(left.estimateIndex) - toNumber(right.estimateIndex);
            if (indexDiff !== 0) return indexDiff;
            return toMillis(left.createdAt) - toMillis(right.createdAt);
          });
        renderJobDetail();
      },
      (error) => {
        handleDetailSubscriptionError("Job scope", error, () => {
          state.projectScopeItems = [];
          renderJobDetail();
        });
      },
    ),
  );

  state.unsubs.projectDetail.push(
    onSnapshot(
      query(
        collection(state.db, "recordDocuments"),
        where("projectId", "==", state.selectedProjectId),
      ),
      (snapshot) => {
        state.projectDocuments = snapshot.docs
          .map(normaliseFirestoreDoc)
          .sort(
            (left, right) =>
              toMillis(
                right.relatedDate || right.updatedAt || right.createdAt,
              ) -
              toMillis(left.relatedDate || left.updatedAt || left.createdAt),
          );
        renderJobDetail();
      },
      (error) => {
        handleDetailSubscriptionError("Job documents", error, () => {
          state.projectDocuments = [];
          renderJobDetail();
        });
      },
    ),
  );

  state.unsubs.projectDetail.push(
    onSnapshot(
      collection(state.db, "projects", state.selectedProjectId, "notes"),
      (snapshot) => {
        state.projectNotes = snapshot.docs
          .map(normaliseFirestoreDoc)
          .sort(
            (left, right) =>
              toMillis(right.createdAt) - toMillis(left.createdAt),
          );
        renderJobDetail();
      },
      (error) => {
        handleDetailSubscriptionError("Job notes", error, () => {
          state.projectNotes = [];
          renderJobDetail();
        });
      },
    ),
  );

  state.unsubs.projectDetail.push(
    onSnapshot(
      collection(state.db, "projects", state.selectedProjectId, "activities"),
      (snapshot) => {
        state.projectActivities = snapshot.docs
          .map(normaliseFirestoreDoc)
          .sort(
            (left, right) =>
              toMillis(right.createdAt) - toMillis(left.createdAt),
          );
        renderJobDetail();
      },
      (error) => {
        handleDetailSubscriptionError("Job history", error, () => {
          state.projectActivities = [];
          renderJobDetail();
        });
      },
    ),
  );

  const linkedLeadId = safeString(
    state.projects.find((project) => project.id === subscribedProjectId)?.leadId,
  );
  if (linkedLeadId) {
    state.unsubs.projectDetail.push(
      onSnapshot(
        doc(state.db, "estimates", linkedLeadId),
        (snapshot) => {
          if (safeString(state.selectedProjectId) !== subscribedProjectId) {
            return;
          }
          const estimateData = snapshot.exists() ? snapshot.data() || {} : null;
          const storedLeadId = safeString(
            estimateData?.leadId || estimateData?.id || linkedLeadId,
          );
          state.projectLeadEstimate =
            estimateData && storedLeadId === linkedLeadId
              ? {
                  ...estimateData,
                  id: linkedLeadId,
                  leadId: linkedLeadId,
                }
              : null;
          renderJobDetail();
        },
        (error) => {
          if (safeString(state.selectedProjectId) !== subscribedProjectId) {
            return;
          }
          handleDetailSubscriptionError("Original estimate", error, () => {
            state.projectLeadEstimate = null;
            renderJobDetail();
          });
        },
      ),
    );

    state.unsubs.projectDetail.push(
      onSnapshot(
        query(
          collection(state.db, "estimateShares"),
          where("leadId", "==", linkedLeadId),
        ),
        (snapshot) => {
          if (safeString(state.selectedProjectId) !== subscribedProjectId) {
            return;
          }
          state.projectLeadEstimateShares = snapshot.docs
            .map((entry) => hydrateEstimateShare(entry))
            .filter(
              (share) =>
                safeString(share.type || "estimate") === "estimate" &&
                safeString(share.leadId) === linkedLeadId,
            );
          renderJobDetail();
        },
        (error) => {
          if (safeString(state.selectedProjectId) !== subscribedProjectId) {
            return;
          }
          handleDetailSubscriptionError("Estimate publishing", error, () => {
            state.projectLeadEstimateShares = [];
            renderJobDetail();
          });
        },
      ),
    );

    state.unsubs.projectDetail.push(
      onSnapshot(
        collection(state.db, "leads", linkedLeadId, "activities"),
        (snapshot) => {
          state.projectLeadActivities = snapshot.docs
            .map(normaliseFirestoreDoc)
            .sort(
              (left, right) =>
                toMillis(right.createdAt) - toMillis(left.createdAt),
            );
          renderJobDetail();
        },
        (error) => {
          handleDetailSubscriptionError("Lead-to-job history", error, () => {
            state.projectLeadActivities = [];
            renderJobDetail();
          });
        },
      ),
    );
  }
}

async function bootstrapFirebase() {
  try {
    refs.signInButton.disabled = true;
    refs.authFeedback.textContent = "Loading Firebase configuration...";
    const configResponse = await fetch("/__/firebase/init.json");
    const firebaseConfig = await configResponse.json();

    state.app = initializeApp(firebaseConfig);
    state.auth = getAuth(state.app);
    state.db = initializeFirestore(state.app, {
      experimentalForceLongPolling: true,
    });
    state.storage = getStorage(state.app);
    state.provider = new GoogleAuthProvider();
    state.provider.setCustomParameters({ prompt: "select_account" });

    refs.signInButton.disabled = false;
    refs.authFeedback.textContent =
      "Only approved staff accounts can enter the portal.";

    onAuthStateChanged(state.auth, async (user) => {
      clearUnsubs(state.unsubs.base);
      clearUnsubs(state.unsubs.portalQueues);
      clearUnsubs(state.unsubs.scopedProjects);
      clearUnsubs(state.unsubs.leadDetail);
      clearUnsubs(state.unsubs.customerDetail);
      clearUnsubs(state.unsubs.customerPortalMessages);
      clearUnsubs(state.unsubs.projectDetail);

      if (!user) {
        state.sessionResetting = false;
        state.currentUser = null;
        state.profile = null;
        state.leads = [];
        state.projects = [];
        state.customers = [];
        state.vendors = [];
        state.vendorBills = [];
        state.vendorDocuments = [];
        state.serviceTemplates = [];
        state.tasks = [];
        state.calendarEvents = [];
        state.staffRoster = [];
        state.selectedLeadId = null;
        state.selectedProjectId = null;
        state.selectedProjectInvoiceId = null;
        state.selectedCustomerId = null;
        state.selectedVendorId = null;
        state.selectedTaskId = null;
        state.selectedStaffKey = null;
        state.selectedServiceTemplateId = null;
        state.staffFocusUid = "";
        state.leadDraft = null;
        state.customerDraft = null;
        state.vendorDraft = null;
        state.taskDraft = null;
        state.serviceTemplateDraft = null;
        state.leadActivities = [];
        state.leadEstimateShares = [];
        state.estimate = null;
        state.projectExpenses = [];
        state.projectPayments = [];
        state.projectInvoices = [];
        state.projectChangeOrders = [];
        state.projectScopeItems = [];
        state.projectDocuments = [];
        state.leadDocuments = [];
        state.customerDocuments = [];
        state.projectLeadEstimate = null;
        state.projectLeadEstimateShares = [];
        state.customerPortalContacts = [];
        state.customerPortalEstimateShares = [];
        state.customerPortalInvoices = [];
        state.customerPortalChangeOrders = [];
        state.customerPortalThreads = [];
        state.customerPortalMessages = {};
        state.selectedCustomerPortalContactId = null;
        state.selectedCustomerPortalThreadId = null;
        state.projectNotes = [];
        state.projectActivities = [];
        state.projectLeadActivities = [];
        state.projectInvoiceDraft = null;
        state.editingChangeOrderId = null;
        state.editingExpenseId = null;
        state.portalQueueEstimateShares = [];
        state.portalQueueInvoices = [];
        state.portalQueueThreads = [];
        state.portalQueueContacts = [];
        state.estimateShare = null;
        resetEstimateWorkflowForLead("");
        state.leadDetailSubscriptionId = "";
        state.notificationPanelOpen = false;
        state.notificationReadMap = {};
        state.leadWorkspaceOpen = false;
        state.activeLeadTab = "overview";
        state.activeJobTab = "work";
        state.activeVendorTab = "overview";
        state.activeAdminSection = "team";
        state.activeView = "today-view";
        closeDrawer();
        setBanner("", "info");
        showAuthShell();
        publishStaffContext();
        return;
      }

      state.sessionResetting = false;
      state.currentUser = user;

      try {
        const session = await syncSession(user);

        if (!session.authorised) {
          showAuthShell(
            session.message ||
              "This Google account is not approved for the staff portal.",
          );
          await signOut(state.auth);
          return;
        }

        state.profile = session.profile;
        state.todayScope = isAdmin() ? "team" : "mine";
        applyRoleVisibility();
        showStaffShell();
        switchView("today-view");
        setBanner(
          session.mode === "firestore"
            ? "Staff login is running from the approved Firestore staff list while backend permissions finish syncing."
            : "",
        );
        setSyncStatus("Syncing data");
        subscribeBaseData();
        renderAll();
        publishStaffContext();
        consumeGoogleCalendarCallbackNotice();
        loadGoogleCalendarStatus();
      } catch (error) {
        console.error("Staff session verification failed.", error);
        showAuthShell(
          authErrorMessage("Could not verify this staff account.", error),
        );
        await signOut(state.auth);
      }
    });
  } catch (error) {
    refs.authFeedback.textContent =
      "Firebase could not load. Check Hosting setup and try again.";
    refs.signInButton.disabled = true;
    console.error(error);
  }
}

function publishStaffContext() {
  const detail = {
    app: state.app,
    auth: state.auth,
    db: state.db,
    storage: state.storage,
    currentUser: state.currentUser,
    profile: state.profile,
    isAdmin: isAdmin(),
  };

  window.GoldenBrickStaffContext = detail;
  window.dispatchEvent(
    new CustomEvent("goldenbrick:staff-context", { detail }),
  );
}

function selectedLeadAssignee() {
  const uid = refs.leadAssigneeSelect.value || "";
  return activeStaffOptions().find((member) => member.uid === uid) || null;
}

function collectLeadFormState(baseLead = currentLead()) {
  const assignee = isAdmin() ? selectedLeadAssignee() : null;
  const customerId = isAdmin()
    ? refs.leadCustomerSelect.value || null
    : baseLead?.customerId || null;
  const customer = customerId
    ? state.customers.find((item) => item.id === customerId)
    : null;
  const status = refs.leadStageSelect.value || baseLead?.status || "new_lead";

  return {
    clientName: refs.leadClientName.value.trim(),
    clientEmail: refs.leadClientEmail.value.trim(),
    clientPhone: refs.leadClientPhone.value.trim(),
    projectAddress: refs.leadProjectAddress.value.trim(),
    projectType: refs.leadProjectType.value.trim(),
    notes: refs.leadNotesInput.value.trim(),
    planningNotes: refs.leadPlanningNotesInput.value.trim(),
    status,
    statusLabel: STATUS_META[status],
    customerId,
    customerName: customer?.name || baseLead?.customerName || "",
    assignedToUid: isAdmin()
      ? assignee?.uid || null
      : baseLead?.assignedToUid || state.profile?.uid || null,
    assignedToName: isAdmin()
      ? assignee?.displayName || assignee?.email || ""
      : baseLead?.assignedToName || state.profile?.displayName || "",
    assignedToEmail: isAdmin()
      ? assignee?.email || ""
      : baseLead?.assignedToEmail || state.profile?.email || "",
  };
}

function selectedTaskAssignee(select) {
  const uid = select.value || "";
  return activeStaffOptions().find((member) => member.uid === uid) || null;
}

async function syncLeadCustomerLinkDirect(leadId) {
  if (!isAdmin()) {
    const error = new Error(
      "Backend customer linking is unavailable, and only admins can use the direct Firestore fallback.",
    );
    error.status = 503;
    throw error;
  }

  const leadRef = doc(state.db, "leads", leadId);
  const leadSnap = await getDoc(leadRef);
  if (!leadSnap.exists()) {
    const error = new Error("Lead not found.");
    error.status = 404;
    throw error;
  }

  const leadData = {
    id: leadSnap.id,
    ...leadSnap.data(),
  };

  if (leadData.customerId) {
    const existingCustomer =
      state.customers.find((customer) => customer.id === leadData.customerId) ||
      {};
    const linkedCustomer = await writeCustomerFromLead(
      doc(state.db, "customers", leadData.customerId),
      leadData,
      existingCustomer,
    );

    await setDoc(
      leadRef,
      {
        customerId: linkedCustomer.id,
        customerName: linkedCustomer.name,
        customerMatchResult: "linked",
        customerReviewRequired: false,
        customerMatchIds: [linkedCustomer.id],
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return {
      ok: true,
      customerId: linkedCustomer.id,
      customerName: linkedCustomer.name,
      matchResult: "linked",
      reviewRequired: false,
      customerMatchIds: [linkedCustomer.id],
      fallback: "firestore",
    };
  }

  const matches = matchingCustomersForLead(leadData);

  if (matches.length > 1) {
    const customerMatchIds = matches.map((customer) => customer.id);
    await setDoc(
      leadRef,
      {
        customerId: null,
        customerName: "",
        customerMatchResult: "review_required",
        customerReviewRequired: true,
        customerMatchIds,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return {
      ok: true,
      customerId: null,
      customerName: "",
      matchResult: "review_required",
      reviewRequired: true,
      customerMatchIds,
      fallback: "firestore",
    };
  }

  const targetCustomer = matches[0] || null;
  const customerRef = targetCustomer
    ? doc(state.db, "customers", targetCustomer.id)
    : doc(collection(state.db, "customers"));
  const linkedCustomer = await writeCustomerFromLead(
    customerRef,
    {
      ...leadData,
      customerId: targetCustomer?.id || "",
      customerName: targetCustomer?.name || leadData.clientName,
    },
    targetCustomer || {},
  );
  const matchResult = targetCustomer ? "linked" : "created";

  await setDoc(
    leadRef,
    {
      customerId: linkedCustomer.id,
      customerName: linkedCustomer.name,
      customerMatchResult: matchResult,
      customerReviewRequired: false,
      customerMatchIds: [linkedCustomer.id],
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return {
    ok: true,
    customerId: linkedCustomer.id,
    customerName: linkedCustomer.name,
    matchResult,
    reviewRequired: false,
    customerMatchIds: [linkedCustomer.id],
    fallback: "firestore",
  };
}

async function syncLeadCustomerLink(leadId, { quiet = false } = {}) {
  let payload;

  try {
    payload = await apiPost("/api/staff/lead-customer-link", { leadId });
  } catch (error) {
    if (!shouldRetryApiRequest(error) || !isAdmin()) {
      throw error;
    }

    payload = await syncLeadCustomerLinkDirect(leadId);
    setBanner(
      "Customer linking used the direct Firestore fallback because the staff API is temporarily unavailable.",
      "info",
    );
  }

  if (!quiet) {
    if (payload.matchResult === "created") {
      showToast("Lead saved and new customer created.");
    } else if (payload.matchResult === "linked") {
      showToast("Lead saved and linked to the matching customer.");
    } else if (payload.matchResult === "review_required") {
      showToast(
        "Multiple customer matches found. Review the linked customer on the lead record.",
        "error",
      );
    }
  }

  return payload;
}

async function saveLeadDrawer(event) {
  event.preventDefault();

  const draft = state.drawer.leadDraft || {};
  const assignee = isAdmin()
    ? activeStaffOptions().find(
        (member) => member.uid === refs.drawerLeadAssignee.value,
      ) || preferredLeadAssignee()
    : activeStaffOptions()[0] || null;
  const leadRef = doc(collection(state.db, "leads"));
  const selectedCustomerId = isAdmin()
    ? refs.drawerLeadCustomerSelect?.value || draft.customerId || null
    : null;
  const selectedCustomer = selectedCustomerId
    ? state.customers.find((customer) => customer.id === selectedCustomerId) ||
      null
    : null;

  const payload = {
    id: leadRef.id,
    customerId: selectedCustomer?.id || null,
    customerName: selectedCustomer?.name || "",
    clientName: refs.drawerLeadClientName.value.trim(),
    clientEmail: refs.drawerLeadClientEmail.value.trim(),
    clientPhone: refs.drawerLeadClientPhone.value.trim(),
    projectAddress: refs.drawerLeadProjectAddress.value.trim(),
    projectType: refs.drawerLeadProjectType.value.trim(),
    notes: refs.drawerLeadNotes.value.trim(),
    planningNotes: "",
    sourceForm: "manual_entry",
    sourcePage: "Staff CRM",
    sourcePath: "/staff",
    consent: false,
    status: "new_lead",
    statusLabel: STATUS_META.new_lead,
    inquiryChannel: "staff",
    assignedToUid: assignee?.uid || null,
    assignedToName: assignee?.displayName || assignee?.email || "",
    assignedToEmail: assignee?.email || "",
    hasEstimate: false,
    estimateSubtotal: 0,
    estimateTitle: "",
    customerMatchResult: selectedCustomer ? "linked" : "",
    customerReviewRequired: false,
    customerMatchIds: selectedCustomer ? [selectedCustomer.id] : [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (!payload.clientName || !payload.clientPhone) {
    showToast("Client name and phone are required.", "error");
    return;
  }

  await setDoc(leadRef, payload, { merge: true });
  await addDoc(collection(state.db, "leads", leadRef.id, "activities"), {
    activityType: "system",
    title: "Lead created in staff CRM",
    body: "Manual lead created from the quick-add drawer.",
    actorName: state.profile.displayName,
    actorUid: state.profile.uid,
    actorRole: state.profile.role,
    createdAt: serverTimestamp(),
  });

  await syncLeadCustomerLink(leadRef.id, { quiet: true });
  closeDrawer();
  switchView("leads-view");
  selectLead(leadRef.id);
  showToast("Lead created.");
}

async function saveCustomerDrawer(event) {
  event.preventDefault();

  if (!isAdmin()) {
    showToast("Only admins can create customers.", "error");
    return;
  }

  const customerRef = doc(collection(state.db, "customers"));
  const primaryEmail = refs.drawerCustomerEmail.value.trim();
  const primaryPhone = refs.drawerCustomerPhone.value.trim();
  const payload = {
    id: customerRef.id,
    name: refs.drawerCustomerName.value.trim(),
    primaryEmail,
    primaryPhone,
    primaryAddress: refs.drawerCustomerAddress.value.trim(),
    notes: refs.drawerCustomerNotes.value.trim(),
    searchEmail: normaliseEmail(primaryEmail),
    searchPhone: normalisePhone(primaryPhone),
    allowedStaffUids: uniqueValues([state.profile?.uid]),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (!payload.name) {
    showToast("Customer name is required.", "error");
    return;
  }

  await setDoc(customerRef, payload, { merge: true });
  closeDrawer();
  switchView("customers-view");
  selectCustomer(customerRef.id);
  showToast("Customer created.");
}

async function saveVendorDrawer(event) {
  event.preventDefault();

  if (!isAdmin()) {
    showToast("Only admins can create vendors.", "error");
    return;
  }

  const vendorRef = doc(collection(state.db, "vendors"));
  const payload = {
    id: vendorRef.id,
    name: refs.drawerVendorName.value.trim(),
    legalName: "",
    status: refs.drawerVendorStatus.value || "active",
    tradeIds: selectedTradeIdsFromGrid(refs.drawerVendorTradeGrid),
    tradeOtherText: refs.drawerVendorTradeOther.value.trim(),
    primaryContactName: refs.drawerVendorContactName.value.trim(),
    primaryPhone: refs.drawerVendorPhone.value.trim(),
    primaryEmail: refs.drawerVendorEmail.value.trim(),
    address: "",
    serviceArea: "",
    preferredPaymentMethod: refs.drawerVendorPaymentMethod.value || "",
    defaultTerms: refs.drawerVendorDefaultTerms.value.trim(),
    insuranceStatus: "undecided",
    insuranceExpirationDate: null,
    licenseExpirationDate: null,
    insuranceNote: "",
    notes: refs.drawerVendorNotes.value.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (!payload.name) {
    showToast("Vendor name is required.", "error");
    return;
  }

  await setDoc(vendorRef, payload, { merge: true });
  closeDrawer();
  switchView("vendors-view");
  selectVendor(vendorRef.id);
  showToast("Vendor created.");
}

async function saveTaskDrawer(event) {
  event.preventDefault();

  const schedule = readTaskSchedule("drawer");
  if (!schedule.valid) {
    renderTaskSchedulePreview("drawer", schedule.error);
    showToast(schedule.error, "error");
    refs.drawerTaskDueDate.focus();
    return;
  }

  const assignee =
    selectedTaskAssignee(refs.drawerTaskAssignee) ||
    activeStaffOptions()[0] ||
    null;
  const linkedType = refs.drawerTaskLinkedType.value;
  const linkedId = refs.drawerTaskLinkedRecord.value || "";
  const linkedLead =
    linkedType === "lead"
      ? state.leads.find((item) => item.id === linkedId)
      : null;
  const linkedProject =
    linkedType === "project"
      ? state.projects.find((item) => item.id === linkedId)
      : null;
  const created = await createQuickTask({
    title: refs.drawerTaskTitle.value,
    dueAt: schedule.value,
    priority: refs.drawerTaskPriority.value,
    assigneeSelect: refs.drawerTaskAssignee,
    leadId: linkedType === "lead" ? linkedId : null,
    customerId:
      linkedType === "customer"
        ? linkedId
        : linkedLead?.customerId ||
          linkedProject?.customerId ||
          state.drawer.taskDraft?.customerId ||
          null,
    projectId: linkedType === "project" ? linkedId : null,
  });

  if (!created) {
    return;
  }

  closeDrawer();

  if (linkedType === "lead" && linkedId) {
    const lead = state.leads.find((item) => item.id === linkedId);
    if (lead) {
      selectLead(lead.id);
      switchView("leads-view");
      state.activeLeadTab = "tasks";
      renderLeadTabState();
    }
  } else if (linkedType === "customer" && linkedId) {
    selectCustomer(linkedId);
    switchView("customers-view");
  } else if (linkedType === "project" && linkedId) {
    selectProject(linkedId);
    switchView("jobs-view");
  } else if (assignee?.uid) {
    switchView("tasks-view");
  }
}

async function saveExpenseDrawer(event) {
  event.preventDefault();

  const projectId = refs.drawerExpenseProject.value || "";
  const project = projectId
    ? state.projects.find((item) => item.id === projectId)
    : null;
  if (!project) {
    showToast("Choose the property first.", "error");
    return;
  }

  const amount = toNumber(refs.drawerExpenseAmount.value);
  if (!amount) {
    showToast("Enter an expense amount first.", "error");
    return;
  }

  const category = refs.drawerExpenseCategory.value.trim() || "general";
  const selectedVendor = selectedDrawerExpenseVendor();
  const customVendor = refs.drawerExpenseVendor.value.trim();
  const vendor = selectedVendor?.name || customVendor;

  await createProjectExpenseEntry({
    projectId: project.id,
    amount,
    category,
    vendorId: selectedVendor?.id || null,
    vendor,
    note: refs.drawerExpenseNote.value.trim(),
    relatedDate: parseDateOnlyInput(refs.drawerExpenseDate.value) || new Date(),
    receiptDocument: null,
  });

  closeDrawer();
  selectProject(project.id);
  switchView("jobs-view");
  openJobTab("financials", refs.expenseList);
  showToast("Expense added.");
}

function communicationTypeLabel(type) {
  const labels = {
    call: "Call",
    text: "Text",
    email: "Email",
    site_visit: "Site visit",
    client_message: "Client message",
    other: "Communication",
  };
  return labels[safeString(type)] || "Communication";
}

function communicationDirectionLabel(direction) {
  const labels = {
    inbound: "Inbound",
    outbound: "Outbound",
    internal: "Internal",
  };
  return labels[safeString(direction)] || "Communication";
}

function communicationActivityTitle(type, direction) {
  return `${communicationDirectionLabel(direction)} ${communicationTypeLabel(type).toLowerCase()}`;
}

async function saveCommunicationDrawer(event) {
  event.preventDefault();

  const linkedType = refs.drawerCommunicationLinkedType.value || "lead";
  const linkedId = refs.drawerCommunicationLinkedRecord.value || "";
  const { record } = selectedCommunicationRecord();
  const body = refs.drawerCommunicationBody.value.trim();

  if (!record || !linkedId) {
    showToast("Choose the lead or job first.", "error");
    return;
  }

  if (!body) {
    showToast("Add the communication details first.", "error");
    return;
  }

  const communicationType = refs.drawerCommunicationType.value || "call";
  const direction = refs.drawerCommunicationDirection.value || "outbound";
  const happenedAt =
    parseDateInput(refs.drawerCommunicationHappenedAt.value) || new Date();
  const contactName = refs.drawerCommunicationContactName.value.trim();
  const contactMethod = refs.drawerCommunicationContactMethod.value.trim();
  const outcome = refs.drawerCommunicationOutcome.value.trim();
  const followUpRequired =
    refs.drawerCommunicationFollowUpRequired.checked || false;
  const followUpAt = parseDateInput(refs.drawerCommunicationFollowUpAt.value);
  const clientVisible = refs.drawerCommunicationClientVisible.checked || false;
  const title = communicationActivityTitle(communicationType, direction);
  const collectionPath =
    linkedType === "project"
      ? collection(state.db, "projects", linkedId, "activities")
      : collection(state.db, "leads", linkedId, "activities");

  await addDoc(collectionPath, {
    activityType: "communication",
    communicationType,
    direction,
    happenedAt,
    contactName,
    contactMethod,
    body,
    outcome,
    followUpRequired,
    followUpAt: followUpAt || null,
    clientVisible,
    title,
    actorName: state.profile.displayName,
    actorUid: state.profile.uid,
    actorRole: state.profile.role,
    createdAt: serverTimestamp(),
  });

  if (followUpRequired) {
    const recordName =
      record.clientName ||
      record.customerName ||
      record.projectAddress ||
      "this record";
    await createQuickTask({
      title: `Follow up: ${recordName}`,
      dueAt: followUpAt,
      priority: "high",
      assigneeSelect: null,
      leadId: linkedType === "lead" ? linkedId : record.leadId || null,
      customerId: record.customerId || null,
      projectId: linkedType === "project" ? linkedId : null,
    });
  }

  closeDrawer();

  if (linkedType === "project") {
    selectProject(linkedId);
    switchView("jobs-view");
    openJobTab("history", refs.jobHistoryList);
  } else {
    selectLead(linkedId, { preserveTab: true, openWorkspace: true });
    switchView("leads-view");
    openLeadTab("activity", refs.noteList);
  }

  showToast("Communication logged.");
}

async function saveJobDrawer(event) {
  event.preventDefault();

  if (!isAdmin()) {
    showToast("Only admins can create jobs directly.", "error");
    return;
  }

  const draft = collectDrawerJobDraftFromInputs();
  const clientName = safeString(draft.clientName);
  if (!clientName) {
    showToast("Client name is required.", "error");
    return;
  }

  const ownerUid =
    safeString(draft.assignedLeadOwnerUid) ||
    preferredLeadAssignee()?.uid ||
    state.profile?.uid ||
    "";
  const assignedWorkers = buildAssignedWorkersFromSelectedUids(
    draft.assignedWorkerUids || [],
    ownerUid,
  );
  const linkedCustomer = await resolveJobDrawerCustomerLink({
    ...draft,
    assignedLeadOwnerUid: ownerUid,
  });
  const baseContractValue = toNumber(draft.baseContractValue);
  const financials = initialProjectFinancials(baseContractValue, assignedWorkers);
  const projectRef = doc(collection(state.db, "projects"));

  await setDoc(
    projectRef,
    {
      id: projectRef.id,
      leadId: null,
      customerId: linkedCustomer?.id || null,
      customerName: linkedCustomer?.name || clientName,
      clientName,
      clientPhone: safeString(draft.clientPhone),
      clientEmail: safeString(draft.clientEmail),
      projectAddress: safeString(draft.clientAddress),
      projectType: safeString(draft.projectType),
      jobKind: "standard",
      status: draft.status || "planning",
      baseContractValue: financials.baseContractValue,
      approvedChangeOrdersTotal: financials.approvedChangeOrdersTotal,
      totalContractRevenue: financials.totalContractRevenue,
      cashPosition: financials.cashPosition,
      balanceRemaining: financials.balanceRemaining,
      jobValue: financials.totalContractRevenue,
      assignedLeadOwnerUid: ownerUid || null,
      assignedWorkers,
      assignedWorkerIds: assignedWorkers.map((worker) => worker.uid).filter(Boolean),
      allowedStaffUids: uniqueValues([
        state.profile?.uid || "",
        ownerUid,
        ...assignedWorkers.map((worker) => worker.uid),
      ]),
      commissionLocked: false,
      lockedCommissionSnapshot: null,
      phaseLabel: JOB_STATUS_META[draft.status] || "Planning",
      targetWindow: "",
      targetDate: null,
      nextStep: "",
      sharedStatusNote: "",
      planningNotes: safeString(draft.planningNotes),
      financials,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await addProjectActivityEntry(
    projectRef.id,
    "system",
    "Job created directly",
    "A standard job was created directly from the jobs workspace without a lead conversion.",
  );

  closeDrawer();
  switchView("jobs-view");
  selectProject(projectRef.id, { historyMode: "replace" });
  openJobTab("overview", refs.jobClientNameInput);
  showToast("Job created.");
}

async function saveServiceOrderDrawer(event) {
  event.preventDefault();

  if (!isAdmin()) {
    showToast("Only admins can create service orders.", "error");
    return;
  }

  const draft = collectDrawerServiceOrderDraftFromInputs();
  const template =
    serviceTemplateCatalog().find((item) => item.id === draft.templateId) ||
    activeServiceTemplates()[0] ||
    null;

  if (!template) {
    showToast("Choose a service template first.", "error");
    return;
  }

  if (!safeString(draft.clientName)) {
    showToast("Client name is required.", "error");
    return;
  }

  if (!safeString(draft.clientPhone) && !safeString(draft.clientEmail)) {
    showToast("Add a client phone or email so billing can be sent cleanly.", "error");
    return;
  }

  const response = await apiPost("/api/staff/create-service-order", {
    templateId: template.id,
    paymentRequirement: draft.paymentRequirement,
    customerId: draft.customerId || null,
    clientName: draft.clientName,
    clientPhone: draft.clientPhone,
    clientEmail: draft.clientEmail,
    clientAddress: draft.clientAddress,
    priceOverride: draft.priceOverride,
    assignedLeadOwnerUid: draft.assignedLeadOwnerUid || null,
    assignedWorkerUids: draft.assignedWorkerUids || [],
  });

  closeDrawer();
  switchView("jobs-view");
  state.selectedProjectId = response.projectId;
  state.selectedProjectInvoiceId = response.invoiceId || null;
  state.projectInvoiceDraft = null;
  state.activeJobTab = "invoices";
  subscribeProjectDetail();
  renderAll();
  showToast("Service order created.");
}

async function saveTask(event) {
  event.preventDefault();

  const schedule = readTaskSchedule("main");
  if (!schedule.valid) {
    renderTaskSchedulePreview("main", schedule.error);
    showToast(schedule.error, "error");
    refs.taskDueDate.focus();
    return;
  }

  const existing = currentTaskDoc();
  const linkedType = refs.taskLinkedTypeSelect.value;
  const linkedId = refs.taskLinkedRecordSelect.value || "";
  const assignee =
    selectedTaskAssignee(refs.taskAssigneeSelect) ||
    activeStaffOptions()[0] ||
    null;
  const payload = {
    title: refs.taskTitleInput.value.trim(),
    description: refs.taskDescriptionInput.value.trim(),
    status: refs.taskStatusSelect.value,
    priority: refs.taskPrioritySelect.value,
    dueAt: schedule.value,
    assignedToUid: assignee?.uid || state.profile?.uid || "",
    assignedToName:
      assignee?.displayName ||
      assignee?.email ||
      state.profile?.displayName ||
      "",
    assignedToEmail: assignee?.email || state.profile?.email || "",
    leadId: linkedType === "lead" ? linkedId : null,
    customerId: linkedType === "customer" ? linkedId : null,
    projectId: linkedType === "project" ? linkedId : null,
    updatedAt: serverTimestamp(),
  };

  if (!payload.title) {
    showToast("Task title is required.", "error");
    return;
  }

  if (state.taskDraft || !existing) {
    const taskRef = doc(collection(state.db, "tasks"));
    await setDoc(
      taskRef,
      {
        id: taskRef.id,
        ...payload,
        createdAt: serverTimestamp(),
        createdByUid: state.profile.uid,
        createdByName: state.profile.displayName,
      },
      { merge: true },
    );

    state.taskDraft = null;
    state.selectedTaskId = taskRef.id;
    showToast("Task created.");
  } else {
    await updateDoc(doc(state.db, "tasks", existing.id), payload);
    showToast("Task updated.");
  }
}

async function markTaskComplete() {
  const task = currentTaskDoc();
  if (!task) return;

  await updateDoc(doc(state.db, "tasks", task.id), {
    status: "completed",
    updatedAt: serverTimestamp(),
  });

  showToast("Task marked complete.");
}

async function createQuickTask({
  title,
  dueAt,
  priority,
  assigneeSelect,
  leadId = null,
  customerId = null,
  projectId = null,
}) {
  const defaultAssignee = state.profile
    ? {
        uid: state.profile.uid,
        email: state.profile.email,
        displayName: state.profile.displayName,
      }
    : null;
  const assignee =
    (assigneeSelect ? selectedTaskAssignee(assigneeSelect) : null) ||
    defaultAssignee ||
    activeStaffOptions()[0] ||
    null;
  const cleanTitle = safeString(title);

  if (!cleanTitle) {
    showToast("Task title is required.", "error");
    return false;
  }

  const taskRef = doc(collection(state.db, "tasks"));
  await setDoc(
    taskRef,
    {
      id: taskRef.id,
      title: cleanTitle,
      description: "",
      status: "open",
      priority,
      dueAt: dueAt || null,
      assignedToUid: assignee?.uid || state.profile?.uid || "",
      assignedToName:
        assignee?.displayName ||
        assignee?.email ||
        state.profile?.displayName ||
        "",
      assignedToEmail: assignee?.email || state.profile?.email || "",
      leadId,
      customerId,
      projectId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdByUid: state.profile.uid,
      createdByName: state.profile.displayName,
    },
    { merge: true },
  );

  showToast("Task created.");
  return true;
}

async function saveLead(event) {
  event.preventDefault();

  const existing = currentLeadDoc();
  const payload = {
    ...collectLeadFormState(existing || currentLead()),
    customerMatchResult: refs.leadCustomerSelect.value ? "linked" : "",
    customerReviewRequired: false,
    customerMatchIds: refs.leadCustomerSelect.value
      ? [refs.leadCustomerSelect.value]
      : [],
    updatedAt: serverTimestamp(),
  };

  if (!payload.clientName || !payload.clientPhone) {
    showToast("Client name and phone are required.", "error");
    return;
  }

  if (
    !isAdmin() &&
    existing &&
    existing.status !== "closed_won" &&
    payload.status === "closed_won"
  ) {
    showToast(
      "Only admins can mark a lead won and create the linked job.",
      "error",
    );
    refs.leadStageSelect.value = existing.status || "new_lead";
    return;
  }

  if (state.leadDraft || !existing) {
    const leadRef = doc(collection(state.db, "leads"));
    await setDoc(
      leadRef,
      {
        id: leadRef.id,
        ...payload,
        sourceForm: "manual_entry",
        sourcePage: "Staff CRM",
        sourcePath: "/staff",
        consent: false,
        inquiryChannel: "staff",
        hasEstimate: false,
        estimateSubtotal: 0,
        estimateTitle: "",
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );

    await addDoc(collection(state.db, "leads", leadRef.id, "activities"), {
      activityType: "system",
      title: "Lead created in staff CRM",
      body: "Manual lead created inside the staff portal.",
      actorName: state.profile.displayName,
      actorUid: state.profile.uid,
      actorRole: state.profile.role,
      createdAt: serverTimestamp(),
    });

    await syncLeadCustomerLink(leadRef.id, { quiet: true });
    state.leadDraft = null;
    state.selectedLeadId = leadRef.id;
    resetEstimateWorkflowForLead(leadRef.id);
    state.leadWorkspaceOpen = true;
    subscribeLeadDetail();
    syncLeadRouteState();
    showToast("Lead created.");
    return;
  }

  const statusChanged = existing.status !== payload.status;
  const reassigned =
    isAdmin() && existing.assignedToUid !== (payload.assignedToUid || null);
  const customerChanged = existing.customerId !== payload.customerId;

  await updateDoc(doc(state.db, "leads", existing.id), payload);

  if (statusChanged) {
    await addDoc(collection(state.db, "leads", existing.id, "activities"), {
      activityType: "system",
      title: "Lead status updated",
      body: `Moved to ${STATUS_META[payload.status]}.`,
      actorName: state.profile.displayName,
      actorUid: state.profile.uid,
      actorRole: state.profile.role,
      createdAt: serverTimestamp(),
    });
  }

  if (reassigned) {
    await addDoc(collection(state.db, "leads", existing.id, "activities"), {
      activityType: "system",
      title: "Lead reassigned",
      body: `Assigned to ${payload.assignedToName || "Unassigned"}.`,
      actorName: state.profile.displayName,
      actorUid: state.profile.uid,
      actorRole: state.profile.role,
      createdAt: serverTimestamp(),
    });
  }

  if (customerChanged) {
    await addDoc(collection(state.db, "leads", existing.id, "activities"), {
      activityType: "system",
      title: "Customer link updated",
      body: payload.customerName
        ? `Linked to customer ${payload.customerName}.`
        : "Removed linked customer.",
      actorName: state.profile.displayName,
      actorUid: state.profile.uid,
      actorRole: state.profile.role,
      createdAt: serverTimestamp(),
    });
  }

  await syncLeadCustomerLink(existing.id, { quiet: true });
  showToast("Lead updated.");
}

async function persistSelectedLeadForm(lead, overrides = {}) {
  if (!lead?.id || lead.id !== state.selectedLeadId || state.leadDraft) {
    return;
  }

  const formState = collectLeadFormState(lead);
  await updateDoc(doc(state.db, "leads", lead.id), {
    ...formState,
    ...overrides,
    status: overrides.status || formState.status,
    statusLabel: STATUS_META[overrides.status || formState.status],
    customerMatchResult:
      overrides.customerId || formState.customerId
        ? "linked"
        : lead.customerMatchResult || "",
    customerReviewRequired: Boolean(overrides.customerReviewRequired || false),
    customerMatchIds:
      overrides.customerId || formState.customerId
        ? [overrides.customerId || formState.customerId]
        : lead.customerMatchIds || [],
    updatedAt: serverTimestamp(),
  });
}

async function moveLeadToStatus(lead, nextStatus, { source = "button" } = {}) {
  if (!lead?.id) {
    showToast("Select a lead first.", "error");
    return;
  }

  if (lead.status === nextStatus && nextStatus !== "closed_won") {
    return;
  }

  if (nextStatus === "closed_won") {
    await convertLeadToProject(lead);
    return;
  }

  if (lead.id === state.selectedLeadId && !state.leadDraft) {
    await persistSelectedLeadForm(lead, { status: nextStatus });
  } else {
    await updateDoc(doc(state.db, "leads", lead.id), {
      status: nextStatus,
      statusLabel: STATUS_META[nextStatus],
      updatedAt: serverTimestamp(),
    });
  }

  const sourceLabel =
    source === "drag"
      ? "pipeline board"
      : source === "pipeline list"
        ? "pipeline list"
        : "record actions";

  await addDoc(collection(state.db, "leads", lead.id, "activities"), {
    activityType: "system",
    title:
      nextStatus === "closed_lost" ? "Lead marked lost" : "Lead stage updated",
    body:
      nextStatus === "closed_lost"
        ? `Lead was closed lost from the ${sourceLabel}.`
        : `Moved to ${STATUS_META[nextStatus]} from the ${sourceLabel}.`,
    actorName: state.profile.displayName,
    actorUid: state.profile.uid,
    actorRole: state.profile.role,
    createdAt: serverTimestamp(),
  });

  showToast(
    nextStatus === "closed_lost"
      ? "Lead marked lost."
      : `Lead moved to ${STATUS_META[nextStatus]}.`,
  );
}

async function convertLeadToProjectDirect(leadId) {
  if (!isAdmin()) {
    const error = new Error(
      "Backend lead conversion is unavailable, and only admins can use the direct Firestore fallback.",
    );
    error.status = 503;
    throw error;
  }

  const leadRef = doc(state.db, "leads", leadId);
  const projectRef = doc(state.db, "projects", leadId);
  const existingProjectSnap = await getDoc(projectRef);
  if (existingProjectSnap.exists()) {
    return {
      ok: true,
      existing: true,
      projectId: leadId,
      fallback: "firestore",
    };
  }

  const customerLink = await syncLeadCustomerLinkDirect(leadId);
  if (customerLink.matchResult === "review_required") {
    return customerLink;
  }

  const refreshedLeadSnap = await getDoc(leadRef);
  if (!refreshedLeadSnap.exists()) {
    const error = new Error("Lead not found.");
    error.status = 404;
    throw error;
  }

  const refreshedLead = refreshedLeadSnap.data() || {};
  const leadOwnerUid = safeString(
    refreshedLead.assignedToUid || state.profile?.uid,
  );
  const leadOwnerName = safeString(
    refreshedLead.assignedToName ||
      state.profile?.displayName ||
      state.profile?.email,
  );
  const leadOwnerEmail = normaliseEmail(
    refreshedLead.assignedToEmail || state.profile?.email,
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
  const financials = initialProjectFinancials(
    refreshedLead.estimateSubtotal || 0,
    assignedWorkers,
  );
  const batch = writeBatch(state.db);

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
      baseContractValue: financials.baseContractValue,
      approvedChangeOrdersTotal: financials.approvedChangeOrdersTotal,
      totalContractRevenue: financials.totalContractRevenue,
      cashPosition: financials.cashPosition,
      balanceRemaining: financials.balanceRemaining,
      jobValue: financials.totalContractRevenue,
      assignedLeadOwnerUid: leadOwnerUid || null,
      assignedWorkers,
      assignedWorkerIds: assignedWorkers.map((worker) => worker.uid).filter(Boolean),
      allowedStaffUids: uniqueValues([
        leadOwnerUid,
        ...assignedWorkers.map((worker) => worker.uid),
      ]),
      commissionLocked: false,
      lockedCommissionSnapshot: null,
      financials,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  batch.set(
    leadRef,
    {
      status: "closed_won",
      statusLabel: STATUS_META.closed_won,
      customerId: customerLink.customerId,
      customerName: customerLink.customerName,
      wonProjectId: leadId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();

  await Promise.all([
    addDoc(collection(state.db, "leads", leadId, "activities"), {
      activityType: "system",
      title: "Lead converted to job",
      body: "Won job created and linked to the customer record.",
      actorName: state.profile?.displayName || state.profile?.email || "Team",
      actorUid: state.profile?.uid || "",
      actorRole: state.profile?.role || "employee",
      createdAt: serverTimestamp(),
    }),
    addProjectActivityEntry(
      leadId,
      "system",
      "Job created from won lead",
      "The won lead was converted into the operational job record.",
    ),
  ]);

  return {
    ok: true,
    existing: false,
    projectId: leadId,
    matchResult: customerLink.matchResult,
    fallback: "firestore",
  };
}

async function convertLeadToProject(lead = currentLeadDoc()) {
  if (!lead?.id) {
    showToast("Save the lead first.", "error");
    return;
  }

  const existingProject = projectForLead(lead);
  if (existingProject) {
    selectProject(existingProject.id, { historyMode: "replace" });
    switchView("jobs-view", { historyMode: "push" });
    showToast("This lead already has a job record.");
    return;
  }

  if (lead.id === state.selectedLeadId && !state.leadDraft) {
    const leadFormState = collectLeadFormState(lead);
    if (!leadFormState.clientName || !leadFormState.clientPhone) {
      showToast(
        "Client name and phone are required before marking a lead won.",
        "error",
      );
      return;
    }

    await updateDoc(doc(state.db, "leads", lead.id), {
      ...leadFormState,
      customerMatchResult: leadFormState.customerId
        ? "linked"
        : lead.customerMatchResult || "",
      customerReviewRequired: false,
      customerMatchIds: leadFormState.customerId
        ? [leadFormState.customerId]
        : lead.customerMatchIds || [],
      updatedAt: serverTimestamp(),
    });
  }

  let response;

  try {
    response = await apiPost("/api/staff/convert-lead", {
      leadId: lead.id,
    });
  } catch (error) {
    if (!shouldRetryApiRequest(error) || !isAdmin()) {
      throw error;
    }

    response = await convertLeadToProjectDirect(lead.id);
    setBanner(
      "Lead conversion used the direct Firestore fallback because the staff API is temporarily unavailable.",
      "info",
    );
  }

  if (response.matchResult === "review_required") {
    showToast(
      "Multiple customer matches were found. Review the linked customer first.",
      "error",
    );
    return;
  }

  selectProject(response.projectId, { historyMode: "replace" });
  switchView("jobs-view", { historyMode: "push" });
  showToast(
    response.existing
      ? "This lead already has a job record."
      : "Job created from won lead.",
  );
}

async function addNote(event) {
  event.preventDefault();
  const lead = currentLeadDoc();
  const body = refs.noteBody.value.trim();

  if (!lead) {
    showToast("Save the lead first.", "error");
    return;
  }

  if (!body) {
    showToast("Note text is required.", "error");
    return;
  }

  await addDoc(collection(state.db, "leads", lead.id, "activities"), {
    activityType: "note",
    title: "Internal note",
    body,
    actorName: state.profile.displayName,
    actorUid: state.profile.uid,
    actorRole: state.profile.role,
    createdAt: serverTimestamp(),
  });

  refs.noteBody.value = "";
  showToast("Internal note saved.");
}

async function persistEstimateDraftForLead(lead, estimate) {
  const leadId = safeString(lead?.id);
  if (
    !leadId ||
    !estimateBelongsToLead(estimate, leadId) ||
    safeString(estimate.id) !== leadId ||
    safeString(estimate.leadId) !== leadId
  ) {
    throw new Error(
      "Estimate identity check failed. Reload this lead before saving.",
    );
  }

  const estimateRef = doc(state.db, "estimates", leadId);
  const leadRef = doc(state.db, "leads", leadId);
  const saveBatch = writeBatch(state.db);

  saveBatch.set(
    estimateRef,
    {
      id: leadId,
      leadId,
      customerId: safeString(lead.customerId) || null,
      clientName: safeString(lead.clientName),
      projectAddress: safeString(lead.projectAddress),
      status: "draft",
      subject: estimate.subject,
      emailBody: estimate.emailBody,
      contractDetails: estimate.contractDetails,
      assumptions: estimate.assumptions,
      lineItems: estimate.lineItems,
      subtotal: estimate.subtotal,
      updatedAt: serverTimestamp(),
      createdAt:
        state.estimate && estimateBelongsToLead(state.estimate, leadId)
          ? state.estimate.createdAt || serverTimestamp()
          : serverTimestamp(),
      lastEditedByUid: state.profile.uid,
      lastEditedByName: state.profile.displayName,
    },
    { merge: true },
  );

  saveBatch.set(
    leadRef,
    {
      hasEstimate: true,
      estimateSubtotal: estimate.subtotal,
      estimateTitle: estimate.subject,
      estimateUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await saveBatch.commit();

  const sideEffects = await Promise.allSettled([
    addDoc(collection(state.db, "leads", leadId, "activities"), {
      activityType: "estimate",
      title: "Estimate updated",
      body: "Current estimate content was updated in the staff portal.",
      actorName: state.profile.displayName,
      actorUid: state.profile.uid,
      actorRole: state.profile.role,
      createdAt: serverTimestamp(),
    }),
    upsertEstimateRecordDocumentForLead(
      leadId,
      {
        ...estimate,
        updatedAt: new Date(),
        lastEditedByUid: state.profile.uid,
        lastEditedByName: state.profile.displayName,
      },
      {
        ...lead,
        hasEstimate: true,
        estimateSubtotal: estimate.subtotal,
        estimateTitle: estimate.subject,
        estimateUpdatedAt: new Date(),
      },
    ),
  ]);
  const sideEffectFailures = sideEffects.filter(
    (result) => result.status === "rejected",
  );
  if (sideEffectFailures.length) {
    console.warn(
      "Estimate saved, but supporting activity or document records did not finish syncing.",
      sideEffectFailures.map((result) => result.reason),
    );
  }

  return {
    sideEffectWarning: Boolean(sideEffectFailures.length),
  };
}

async function saveEstimateDraft(event) {
  event.preventDefault();
  const lead = currentLeadDoc();
  const leadId = safeString(lead?.id);

  if (!lead || !canEditEstimateForLead(lead)) {
    showToast("Save the lead first.", "error");
    return;
  }
  if (!estimateEditorIsBoundToLead(leadId)) {
    showToast(
      "This editor is not bound to the selected lead. Reload the lead before saving.",
      "error",
    );
    return;
  }
  if (state.estimateWorkflow.status === "loading") {
    showToast("Wait for this lead's saved estimate to finish loading.", "error");
    return;
  }
  if (estimateOperationIsPending(leadId)) {
    showToast("This estimate is already being saved or published.", "error");
    return;
  }

  const estimate = estimateDraftForLead(leadId, collectEstimateForm());
  setEstimateWorkflowState({
    leadId,
    status: "saving",
    dirty: true,
    operation: "save",
    message: "Saving this exact draft to the selected lead.",
    error: "",
  });

  try {
    const saveResult = await persistEstimateDraftForLead(lead, estimate);

    if (safeString(state.selectedLeadId) !== leadId) {
      throw new Error(
        "The selected lead changed before saving finished. Reopen the estimate to verify it.",
      );
    }

    state.estimate = {
      ...estimate,
      customerId: safeString(lead.customerId) || null,
      clientName: safeString(lead.clientName),
      projectAddress: safeString(lead.projectAddress),
      updatedAt: new Date().toISOString(),
      createdAt:
        state.estimate && estimateBelongsToLead(state.estimate, leadId)
          ? state.estimate.createdAt || new Date().toISOString()
          : new Date().toISOString(),
      lastEditedByUid: state.profile.uid,
      lastEditedByName: state.profile.displayName,
    };
    applyLeadEstimateStateLocally(leadId, state.estimate);
    state.estimateWorkflow = {
      ...state.estimateWorkflow,
      leadId,
      status: "saved",
      dirty: false,
      operation: "",
      message:
        "This exact draft is saved to this lead. It is not client-visible until published.",
      error: "",
    };
    refs.estimateForm.classList.remove("is-dirty");
    renderLeadDetail();
    if (saveResult.sideEffectWarning) {
      setBanner(
        "The estimate is saved. Its supporting activity or document record is still catching up.",
        "info",
      );
    }
    showToast("Estimate saved to this lead.");
  } catch (error) {
    setEstimateWorkflowState({
      leadId,
      status: "failed",
      dirty: true,
      operation: "",
      message: "",
      error:
        error?.message ||
        "The estimate could not be saved. Your visible edits are still here.",
    });
    refs.estimateForm.classList.add("is-dirty");
    throw error;
  }
}

async function createEstimateDraft() {
  const lead = currentLeadDoc();
  if (!lead || !canEditEstimateForLead(lead)) {
    showToast("Save the lead first.", "error");
    return;
  }
  if (estimateOperationIsPending(lead.id)) {
    showToast("This estimate is already being saved or published.", "error");
    return;
  }
  if (state.estimateWorkflow.status === "loading") {
    showToast("Wait for this lead's saved estimate to finish loading.", "error");
    return;
  }
  if (
    state.estimateWorkflow.dirty &&
    !window.confirm(
      "Replace the unsaved estimate currently shown with a new template draft?",
    )
  ) {
    return;
  }

  refs.estimateAiButton.disabled = true;
  refs.estimateAiButton.textContent = "Creating...";
  setEstimateWorkflowState({
    leadId: lead.id,
    status: "saving",
    dirty: state.estimateWorkflow.dirty,
    operation: "save",
    message: "Creating and saving a new draft for this lead.",
    error: "",
  });

  try {
    const draft = buildTemplateEstimateDraft(lead);
    const estimatePayload = {
      id: lead.id,
      leadId: lead.id,
      customerId: safeString(lead.customerId) || null,
      clientName: safeString(lead.clientName),
      projectAddress: safeString(lead.projectAddress),
      status: "draft",
      generatedBy: "template",
      subject: draft.subject,
      emailBody: draft.emailBody,
      contractDetails: draft.contractDetails,
      assumptions: draft.assumptions,
      lineItems: draft.lineItems,
      subtotal: draft.subtotal,
      updatedAt: serverTimestamp(),
      createdAt: state.estimate?.createdAt || serverTimestamp(),
      lastEditedByUid: state.profile.uid,
      lastEditedByName: state.profile.displayName,
    };

    await Promise.all([
      setDoc(doc(state.db, "estimates", lead.id), estimatePayload, {
        merge: true,
      }),
      updateDoc(doc(state.db, "leads", lead.id), {
        hasEstimate: true,
        estimateSubtotal: draft.subtotal,
        estimateTitle: draft.subject,
        estimateUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      addDoc(collection(state.db, "leads", lead.id, "activities"), {
        activityType: "estimate",
        title: "Estimate draft refreshed",
        body: "Estimate draft generated from the internal template.",
        actorName: state.profile.displayName,
        actorUid: state.profile.uid,
        actorRole: state.profile.role,
        createdAt: serverTimestamp(),
      }),
    ]);

    await upsertEstimateRecordDocumentForLead(
      lead.id,
      {
        ...draft,
        updatedAt: new Date(),
        lastEditedByUid: state.profile.uid,
        lastEditedByName: state.profile.displayName,
      },
      {
        ...lead,
        hasEstimate: true,
        estimateSubtotal: draft.subtotal,
        estimateTitle: draft.subject,
        estimateUpdatedAt: new Date(),
      },
    );

    state.estimate = {
      ...estimatePayload,
      subtotal: draft.subtotal,
      updatedAt: new Date().toISOString(),
    };
    applyLeadEstimateStateLocally(lead.id, {
      ...state.estimate,
      subject: draft.subject,
      subtotal: draft.subtotal,
    });
    state.estimateWorkflow = {
      ...state.estimateWorkflow,
      leadId: lead.id,
      status: "saved",
      dirty: false,
      operation: "",
      message:
        "The new template draft is saved specifically to this lead.",
      error: "",
    };
    refs.estimateForm.classList.remove("is-dirty");
    renderLeadDetail();
    showToast("Estimate draft created.");
  } catch (error) {
    setEstimateWorkflowState({
      leadId: lead.id,
      status: "failed",
      dirty: true,
      operation: "",
      message: "",
      error:
        error?.message ||
        "The estimate draft could not be created. Review the visible estimate before trying again.",
    });
    refs.estimateForm.classList.add("is-dirty");
    showToast(error.message, "error");
  } finally {
    refs.estimateAiButton.disabled = false;
    refs.estimateAiButton.textContent = "Draft estimate";
  }
}

async function copyEstimateToClipboard() {
  const lead = currentLead();
  if (!lead) {
    showToast("Select a lead first.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(
      buildEstimatePlainText(lead, collectEstimateForm()),
    );
    showToast("Estimate copied.");
  } catch (error) {
    showToast("Could not copy the estimate.", "error");
  }
}

async function openEstimatePrintView() {
  const lead = currentLead();
  if (!lead) {
    showToast("Select a lead first.", "error");
    return;
  }

  const estimateDraft = collectEstimateForm();
  const originalLabel = refs.estimatePrintButton.textContent;

  refs.estimatePrintButton.disabled = true;
  refs.estimatePrintButton.textContent = "Preparing PDF...";

  try {
    const { jsPDF } = await loadJsPdfModule();
    const pdf = new jsPDF({
      unit: "pt",
      format: "letter",
    });

    buildEstimatePdf(pdf, lead, estimateDraft);
    pdf.save(estimateDownloadFilename(lead, estimateDraft, "pdf"));
    showToast("Estimate PDF downloaded.");
  } catch (error) {
    console.error("Estimate PDF download failed.", error);
    downloadEstimateHtmlFallback(lead, estimateDraft);
    showToast(
      "PDF download failed. HTML estimate downloaded instead.",
      "error",
    );
  } finally {
    refs.estimatePrintButton.disabled = false;
    refs.estimatePrintButton.textContent = originalLabel;
  }
}

async function fetchEstimateSharesForLead(leadId) {
  if (!leadId) {
    return [];
  }

  const sharesSnap = await getDocs(
    query(
      collection(state.db, "estimateShares"),
      where("leadId", "==", leadId),
    ),
  );

  return sharesSnap.docs
    .map((snapshot) => hydrateEstimateShare(snapshot))
    .filter(
      (share) =>
        safeString(share.type || "estimate") === "estimate" &&
        safeString(share.leadId) === safeString(leadId),
    );
}

function syncLeadEstimateShareState(leadId, shares = []) {
  if (state.selectedLeadId !== leadId) {
    return null;
  }

  state.leadEstimateShares = sortByUpdatedDesc(
    shares.filter(
      (share) =>
        safeString(share.leadId) === safeString(leadId) &&
        safeString(share.type || "estimate") === "estimate",
    ),
  );
  state.estimateShare = pickCurrentEstimateShare(state.leadEstimateShares);
  renderEstimateSharePanel(currentLead());
  renderLeadEstimateClientRecords(currentLead());
  return state.estimateShare;
}

function applySelectedLeadEstimateShareState(
  leadId,
  incomingShare = null,
  { removeShareId = "" } = {},
) {
  if (state.selectedLeadId !== leadId) {
    return null;
  }

  const incomingShareId = safeString(incomingShare?.id);
  if (
    incomingShare &&
    safeString(incomingShare.leadId) !== safeString(leadId)
  ) {
    throw new Error(
      "The publish response belongs to a different lead. Nothing was applied to this estimate.",
    );
  }
  const nextShares = state.leadEstimateShares
    .filter(
      (share) =>
        safeString(share.id) !== safeString(removeShareId) &&
        safeString(share.id) !== incomingShareId,
    )
    .map((share) => {
      if (
        incomingShare &&
        safeString(incomingShare.status) === "active" &&
        safeString(share.status) === "active"
      ) {
        return {
          ...share,
          status: "replaced",
          portalVisible: false,
          visibleInPortal: false,
          replacedAt:
            incomingShare.publishedAt ||
            incomingShare.updatedAt ||
            new Date().toISOString(),
          updatedAt:
            incomingShare.updatedAt ||
            incomingShare.publishedAt ||
            share.updatedAt,
        };
      }
      return share;
    });

  if (incomingShare) {
    nextShares.push({
      ...incomingShare,
      shareUrl: incomingShare.shareUrl || estimateShareUrl(incomingShare.id),
    });
  }

  return syncLeadEstimateShareState(leadId, nextShares);
}

async function refreshEstimateShareState(leadId = state.selectedLeadId) {
  if (!state.currentUser || !leadId) {
    state.leadEstimateShares = [];
    state.estimateShare = null;
    renderEstimateSharePanel(currentLead());
    renderLeadEstimateClientRecords(currentLead());
    return null;
  }

  try {
    const shares = await fetchEstimateSharesForLead(leadId);
    if (state.selectedLeadId !== leadId) {
      return pickCurrentEstimateShare(shares) || null;
    }

    return syncLeadEstimateShareState(leadId, shares);
  } catch (error) {
    console.error("Estimate share refresh failed.", error);
    if (state.selectedLeadId === leadId) {
      state.leadEstimateShares = [];
      state.estimateShare = null;
      renderEstimateSharePanel(currentLead());
      renderLeadEstimateClientRecords(currentLead());
    }
    return null;
  }
}

function estimatePublishIdempotencyKey(leadId) {
  const randomPart =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `estimate-publish:${safeString(leadId)}:${randomPart}`;
}

async function publishCurrentEstimateForLead() {
  const lead = currentLeadDoc();
  const leadId = safeString(lead?.id);
  if (!leadId) {
    showToast("Select a saved lead before publishing.", "error");
    return;
  }

  if (!isAdmin()) {
    showToast("Only admins can publish estimates.", "error");
    return;
  }

  if (
    safeString(state.selectedLeadId) !== leadId ||
    !estimateEditorIsBoundToLead(leadId)
  ) {
    showToast(
      "The visible estimate is not bound to this lead. Reopen the estimate before publishing.",
      "error",
    );
    return;
  }
  if (state.estimateWorkflow.status === "loading") {
    showToast("Wait for this lead's saved estimate to finish loading.", "error");
    return;
  }

  const pendingKey = `publish:${leadId}`;
  const pendingOperation = pendingEstimateOperations.get(pendingKey);
  if (pendingOperation) {
    return pendingOperation;
  }

  const draft = estimateDraftForLead(leadId, collectEstimateForm());
  const wasDirtyBeforePublish = state.estimateWorkflow.dirty;
  const readiness = estimatePublishReadiness(lead, draft);
  if (readiness.blockers.length) {
    const message = readiness.blockers.join(" ");
    setEstimateWorkflowState({
      leadId,
      status: "failed",
      dirty: wasDirtyBeforePublish,
      operation: "",
      message: "",
      error: message,
    });
    refs.estimateForm.classList.toggle("is-dirty", wasDirtyBeforePublish);
    showToast(message, "error");
    return;
  }

  const idempotencyKey = estimatePublishIdempotencyKey(leadId);
  const publishOperation = (async () => {
    setEstimateWorkflowState({
      leadId,
      status: "saving",
      dirty: wasDirtyBeforePublish,
      operation: "publish",
      message:
        "Saving the estimate currently shown to this lead before publishing it.",
      error: "",
    });

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    setEstimateWorkflowState({
      leadId,
      status: "publishing",
      dirty: wasDirtyBeforePublish,
      operation: "publish",
      message:
        "Publishing the same saved draft as this lead's exact client version.",
      error: "",
    });

    const response = await apiPost("/api/staff/estimate-share", {
      action: "create",
      type: "estimate",
      leadId,
      estimateDraft: draft,
      signingMode: readiness.readyToSign ? "signature" : "review",
      idempotencyKey,
    });
    const responseShare = response.share || null;
    const responseDraft = response.draft || null;
    const publishWasUnchanged =
      response.unchanged === true || response.idempotent === true;

    if (
      responseShare &&
      safeString(responseShare.leadId) !== leadId
    ) {
      throw new Error(
        "The server returned a version for a different lead. This estimate was not applied.",
      );
    }
    if (
      responseShare?.estimateSnapshot &&
      !estimateDraftMatchesShareSnapshot(draft, responseShare)
    ) {
      throw new Error(
        "The published version did not match the estimate shown. Reload before trying again.",
      );
    }
    if (
      responseDraft &&
      (safeString(responseDraft.id) !== leadId ||
        safeString(responseDraft.leadId) !== leadId ||
        !estimateDraftMatchesShareSnapshot(draft, {
          type: "estimate",
          estimateSnapshot: responseDraft,
        }))
    ) {
      throw new Error(
        "The saved server draft did not match the estimate shown. Reload before trying again.",
      );
    }
    if (safeString(state.selectedLeadId) !== leadId) {
      throw new Error(
        "The selected lead changed before publishing finished. Reopen the estimate to verify it.",
      );
    }

    applySelectedLeadEstimateShareState(leadId, responseShare);
    const refreshedShare = await refreshEstimateShareState(leadId);
    const publishedShare = refreshedShare || responseShare;

    if (!publishedShare || safeString(publishedShare.leadId) !== leadId) {
      throw new Error(
        "The new client version could not be verified for this lead.",
      );
    }
    if (!publishedShare.estimateSnapshot) {
      throw new Error(
        "The server did not return a frozen estimate version. Nothing was marked published.",
      );
    }
    if (safeString(publishedShare.status) !== "active") {
      throw new Error(
        "The server did not return an active client version. Nothing was marked published.",
      );
    }
    if (!estimateDraftMatchesShareSnapshot(draft, publishedShare)) {
      throw new Error(
        "The verified client version differs from the estimate shown. Nothing was marked published.",
      );
    }

    state.estimate = {
      ...draft,
      customerId: safeString(lead.customerId) || null,
      clientName: safeString(lead.clientName),
      projectAddress: safeString(lead.projectAddress),
      createdAt:
        state.estimate && estimateBelongsToLead(state.estimate, leadId)
          ? state.estimate.createdAt || new Date().toISOString()
          : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastEditedByUid: state.profile.uid,
      lastEditedByName: state.profile.displayName,
    };
    applyLeadEstimateStateLocally(leadId, state.estimate);
    state.estimateWorkflow = {
      ...state.estimateWorkflow,
      leadId,
      status: "published",
      dirty: false,
      operation: "",
      message: publishWasUnchanged
        ? "This exact estimate was already the current published client version."
        : readiness.readyToSign
          ? "This exact estimate is saved and published for client review and signature."
          : "This exact estimate is saved and published for review. Signing remains unavailable until both project dates are added and republished.",
      error: "",
      lastPublishedShareId: safeString(publishedShare.id),
    };
    refs.estimateForm.classList.remove("is-dirty");
    renderLeadDetail();
    showToast(
      publishWasUnchanged
        ? "This exact estimate is already published."
        : readiness.readyToSign
          ? "Exact estimate saved and published for review and signature."
          : "Exact estimate saved and published for client review.",
    );
    return publishedShare;
  })()
    .catch((error) => {
      if (safeString(state.selectedLeadId) === leadId) {
        const observedShare = state.estimateShare;
        if (
          safeString(observedShare?.leadId) === leadId &&
          safeString(observedShare?.status) === "active" &&
          observedShare?.estimateSnapshot &&
          estimateDraftMatchesShareSnapshot(draft, observedShare)
        ) {
          state.estimate = {
            ...draft,
            customerId: safeString(lead.customerId) || null,
            clientName: safeString(lead.clientName),
            projectAddress: safeString(lead.projectAddress),
            createdAt:
              state.estimate &&
              estimateBelongsToLead(state.estimate, leadId)
                ? state.estimate.createdAt || new Date().toISOString()
                : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastEditedByUid: state.profile.uid,
            lastEditedByName: state.profile.displayName,
          };
          applyLeadEstimateStateLocally(leadId, state.estimate);
          state.estimateWorkflow = {
            ...state.estimateWorkflow,
            leadId,
            status: "published",
            dirty: false,
            operation: "",
            message:
              "The exact client version was verified after the confirmation response was interrupted.",
            error: "",
            lastPublishedShareId: safeString(observedShare.id),
          };
          refs.estimateForm.classList.remove("is-dirty");
          renderLeadDetail();
          showToast("Exact estimate published and verified.");
          return observedShare;
        }

        setEstimateWorkflowState({
          leadId,
          status: "failed",
          dirty: wasDirtyBeforePublish,
          operation: "",
          message: "",
          error:
            error?.message ||
            "The estimate was not published. Your visible edits are still here.",
        });
        refs.estimateForm.classList.toggle(
          "is-dirty",
          wasDirtyBeforePublish,
        );
      }
      throw error;
    })
    .finally(() => {
      pendingEstimateOperations.delete(pendingKey);
    });

  pendingEstimateOperations.set(pendingKey, publishOperation);
  return publishOperation;
}

async function createEstimateShareLink() {
  return publishCurrentEstimateForLead();
}

async function copyEstimateShareLink() {
  if (!state.estimateShare?.shareUrl) {
    showToast("Publish this estimate before copying its client link.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(state.estimateShare.shareUrl);
    showToast("Estimate link copied.");
  } catch (error) {
    showToast("Could not copy the estimate link.", "error");
  }
}

async function revokeEstimateShareLink() {
  const lead = currentLeadDoc();
  if (!lead?.id || !state.estimateShare?.id) {
    showToast("No active share link to revoke.", "error");
    return;
  }

  if (!isAdmin()) {
    showToast("Only admins can revoke share links.", "error");
    return;
  }

  const response = await apiPost("/api/staff/estimate-share", {
    action: "revoke",
    type: "estimate",
    leadId: lead.id,
    shareId: state.estimateShare.id,
  });

  applySelectedLeadEstimateShareState(lead.id, response.share || null);
  await refreshEstimateShareState(lead.id);
  showToast("Estimate link revoked.");
}

async function deleteEstimateShareLink(leadId, shareId) {
  if (!leadId || !shareId) {
    showToast("Estimate record not found.", "error");
    return;
  }

  if (!isAdmin()) {
    showToast("Only admins can delete published estimates.", "error");
    return;
  }

  const confirmed = window.confirm(
    "Delete this unsigned published estimate from the portal history?",
  );
  if (!confirmed) {
    return;
  }

  await apiPost("/api/staff/estimate-share", {
    action: "delete",
    type: "estimate",
    leadId,
    shareId,
  });

  if (state.selectedLeadId === leadId) {
    applySelectedLeadEstimateShareState(leadId, null, {
      removeShareId: shareId,
    });
    await refreshEstimateShareState(leadId);
  }

  showToast("Published estimate deleted.");
}

async function publishCustomerEstimateFromLead(leadId) {
  if (!leadId) {
    showToast("Lead not found.", "error");
    return;
  }

  const lead = state.leads.find(
    (entry) => safeString(entry.id) === safeString(leadId),
  );
  if (!lead) {
    showToast("That lead is no longer available.", "error");
    return;
  }

  const didSelect = selectLead(lead.id, {
    openWorkspace: true,
    preserveTab: true,
  });
  if (didSelect === false) {
    return;
  }

  state.activeLeadTab = "estimate";
  switchView("leads-view");
  renderLeadDetail();
  syncLeadRouteState();
  queueFocus(refs.estimateShareCreateButton);
  showToast(
    "Review this lead's exact estimate, then use Save & publish exact version.",
  );
}

async function setCustomerPortalInvoiceVisibility(projectId, invoiceId, visible) {
  if (!projectId || !invoiceId) {
    showToast("Invoice not found.", "error");
    return;
  }

  if (!isAdmin()) {
    showToast("Only admins can manage invoice visibility.", "error");
    return;
  }

  await updateDoc(doc(state.db, "projects", projectId, "invoices", invoiceId), {
    clientVisibleOverride: visible,
    updatedAt: serverTimestamp(),
  });

  showToast(
    visible
      ? "Invoice is now visible in the secure portal."
      : "Invoice is now hidden from the secure portal.",
  );
}

async function setCustomerPortalDocumentVisibility(documentId, visible) {
  if (!documentId) {
    showToast("Document not found.", "error");
    return;
  }

  if (!isAdmin()) {
    showToast("Only admins can manage document visibility.", "error");
    return;
  }

  const documentRef = doc(state.db, "recordDocuments", documentId);
  const documentSnap = await getDoc(documentRef);
  if (!documentSnap.exists()) {
    showToast("Document not found.", "error");
    return;
  }

  const recordDocument = {
    id: documentSnap.id,
    ...documentSnap.data(),
  };
  const wasVisible = recordDocument.clientVisible === true;

  await updateDoc(documentRef, {
    clientVisible: visible === true,
    updatedAt: serverTimestamp(),
  });

  if (visible === true && !wasVisible) {
    let project =
      safeString(recordDocument.projectId) &&
      state.projects.find((entry) => entry.id === recordDocument.projectId);

    if (!project && safeString(recordDocument.projectId)) {
      const projectSnap = await getDoc(
        doc(state.db, "projects", recordDocument.projectId),
      );
      if (projectSnap.exists()) {
        project = {
          id: projectSnap.id,
          ...projectSnap.data(),
        };
      }
    }

    const customerId = safeString(recordDocument.customerId || project?.customerId);
    const threadProjectId = safeString(recordDocument.projectId || project?.id);
    const messageBody = buildClientPortalDocumentUpdateMessage({
      project,
      category: recordDocument.category,
      title: recordDocument.title,
      note: recordDocument.note,
    });

    if (customerId && messageBody) {
      await postCustomerPortalThreadUpdateSafe({
        customerId,
        projectId: threadProjectId,
        body: messageBody,
      });
    }
  }

  showToast(
    visible
      ? "Document is now visible in the secure portal."
      : "Document is now hidden from the secure portal.",
  );
}

async function publishCustomerChangeOrder(projectId, changeOrderId) {
  if (!projectId || !changeOrderId) {
    showToast("Change order not found.", "error");
    return;
  }

  await apiPost("/api/staff/estimate-share", {
    action: "create",
    type: "change_order",
    projectId,
    changeOrderId,
  });

  showToast("Change order published for client approval.");
}

async function revokeCustomerChangeOrder(projectId, changeOrderId) {
  if (!projectId || !changeOrderId) {
    showToast("Change order not found.", "error");
    return;
  }

  await apiPost("/api/staff/estimate-share", {
    action: "revoke",
    type: "change_order",
    projectId,
    changeOrderId,
  });

  showToast("Change order removed from active client approval.");
}

async function deleteCustomerChangeOrder(projectId, changeOrderId) {
  if (!projectId || !changeOrderId) {
    showToast("Change order not found.", "error");
    return;
  }

  const confirmed = window.confirm(
    "Delete this unsigned published change order from the secure portal?",
  );
  if (!confirmed) {
    return;
  }

  await apiPost("/api/staff/estimate-share", {
    action: "delete",
    type: "change_order",
    projectId,
    changeOrderId,
  });

  showToast("Published change order deleted.");
}

async function saveCustomer(event) {
  event.preventDefault();

  if (!isAdmin()) return;

  const existing = currentCustomerDoc();
  const payload = {
    name: refs.customerNameInput.value.trim(),
    primaryEmail: refs.customerEmailInput.value.trim(),
    primaryPhone: refs.customerPhoneInput.value.trim(),
    primaryAddress: refs.customerAddressInput.value.trim(),
    notes: refs.customerNotesInput.value.trim(),
    searchEmail: normaliseEmail(refs.customerEmailInput.value.trim()),
    searchPhone: normalisePhone(refs.customerPhoneInput.value.trim()),
    updatedAt: serverTimestamp(),
  };

  if (!payload.name) {
    showToast("Customer name is required.", "error");
    return;
  }

  if (state.customerDraft || !existing) {
    const customerRef = doc(collection(state.db, "customers"));
    await setDoc(
      customerRef,
      {
        id: customerRef.id,
        ...payload,
        allowedStaffUids: uniqueValues([state.profile?.uid]),
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );

    state.customerDraft = null;
    state.selectedCustomerId = customerRef.id;
    subscribeCustomerDetail();
    showToast("Customer created.");
  } else {
    await updateDoc(doc(state.db, "customers", existing.id), payload);
    subscribeCustomerDetail();
    showToast("Customer updated.");
  }
}

async function saveVendor(event) {
  event.preventDefault();

  if (!isAdmin()) return;

  const existing = currentVendorDoc();
  const payload = {
    name: refs.vendorNameInput.value.trim(),
    legalName: refs.vendorLegalNameInput.value.trim(),
    status: refs.vendorStatusInput.value || "active",
    tradeIds: selectedTradeIdsFromGrid(refs.vendorTradeGrid),
    tradeOtherText: refs.vendorTradeOtherInput.value.trim(),
    primaryContactName: refs.vendorContactNameInput.value.trim(),
    primaryPhone: refs.vendorPhoneInput.value.trim(),
    primaryEmail: refs.vendorEmailInput.value.trim(),
    address: refs.vendorAddressInput.value.trim(),
    serviceArea: refs.vendorServiceAreaInput.value.trim(),
    preferredPaymentMethod: refs.vendorPaymentMethodInput.value || "",
    defaultTerms: refs.vendorDefaultTermsInput.value.trim(),
    insuranceStatus: refs.vendorInsuranceStatusInput.value || "undecided",
    insuranceExpirationDate: parseDateOnlyInput(
      refs.vendorInsuranceExpirationInput.value,
    ),
    licenseExpirationDate: parseDateOnlyInput(
      refs.vendorLicenseExpirationInput.value,
    ),
    insuranceNote: refs.vendorInsuranceNoteInput.value.trim(),
    notes: refs.vendorNotesInput.value.trim(),
    updatedAt: serverTimestamp(),
  };

  if (!payload.name) {
    showToast("Vendor name is required.", "error");
    return;
  }

  if (state.vendorDraft || !existing) {
    const vendorRef = doc(collection(state.db, "vendors"));
    await setDoc(
      vendorRef,
      {
        id: vendorRef.id,
        ...payload,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );

    state.vendorDraft = null;
    state.selectedVendorId = vendorRef.id;
    showToast("Vendor created.");
  } else {
    await updateDoc(doc(state.db, "vendors", existing.id), payload);
    showToast("Vendor updated.");
  }
}

async function createVendorDocumentRecord({
  vendorId,
  category = "other",
  accessLevel = "staff",
  sourceType = "manual",
  title = "",
  note = "",
  relatedDate = new Date(),
  expirationDate = null,
  externalUrl = "",
  file = null,
}) {
  if (!vendorId) {
    throw new Error("Select a vendor first.");
  }

  const documentRef = doc(collection(state.db, "vendorDocuments"));
  let resolvedExternalUrl = "";
  let fileUrl = "";
  let filePath = "";
  let fileName = "";

  if (sourceType === "link") {
    resolvedExternalUrl = safeString(externalUrl);
    if (!resolvedExternalUrl) {
      throw new Error("Add the external document link first.");
    }
  }

  if (sourceType === "upload") {
    if (!file) {
      throw new Error("Choose a file to upload.");
    }

    fileName = file.name;
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const uploadRef = storageRef(
      state.storage,
      `vendors/${vendorId}/documents/${documentRef.id}/${safeFileName}`,
    );
    await uploadBytes(uploadRef, file);
    fileUrl = await getDownloadURL(uploadRef);
    filePath = uploadRef.fullPath;
  }

  const finalTitle =
    title.trim() || VENDOR_DOCUMENT_CATEGORY_META[category] || "Document";

  await setDoc(
    documentRef,
    {
      id: documentRef.id,
      vendorId,
      category,
      accessLevel,
      sourceType,
      title: finalTitle,
      note: note.trim(),
      relatedDate,
      expirationDate,
      externalUrl: resolvedExternalUrl,
      fileUrl,
      filePath,
      fileName,
      createdByUid: state.profile.uid,
      createdByName: state.profile.displayName,
      createdByRole: state.profile.role,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  return {
    id: documentRef.id,
    title: finalTitle,
    externalUrl: resolvedExternalUrl,
    fileUrl,
  };
}

async function saveVendorBill(event) {
  event.preventDefault();

  const vendor = currentVendorDoc();
  if (!vendor || !isAdmin()) return;

  const amount = toNumber(refs.vendorBillAmountInput.value);
  if (!amount) {
    showToast("Enter a payable amount first.", "error");
    return;
  }

  const status = refs.vendorBillStatusInput.value || "open";
  const billNumber = refs.vendorBillNumberInput.value.trim();
  const invoiceDate =
    parseDateOnlyInput(refs.vendorBillInvoiceDateInput.value) || new Date();
  const dueDate =
    parseDateOnlyInput(refs.vendorBillDueDateInput.value) || invoiceDate;
  const sourceType = refs.vendorBillSourceTypeInput.value || "none";
  let invoiceDocument = null;

  if (sourceType !== "none") {
    invoiceDocument = await createVendorDocumentRecord({
      vendorId: vendor.id,
      category: "invoice",
      accessLevel: "staff",
      sourceType,
      title: billNumber
        ? `${billNumber} invoice`
        : `${vendor.name || "Vendor"} invoice`,
      note: refs.vendorBillNoteInput.value.trim(),
      relatedDate: invoiceDate,
      externalUrl: refs.vendorBillUrlInput.value,
      file: refs.vendorBillFileInput.files?.[0] || null,
    });
  }

  await addDoc(collection(state.db, "vendorBills"), {
    vendorId: vendor.id,
    vendorName: vendor.name || "",
    projectId: refs.vendorBillProjectInput.value || null,
    billNumber,
    invoiceDate,
    dueDate,
    amount,
    status,
    category: refs.vendorBillCategoryInput.value.trim() || "vendor_bill",
    paymentMethod: refs.vendorBillPaymentMethodInput.value.trim(),
    paymentReference: refs.vendorBillPaymentReferenceInput.value.trim(),
    scheduledDate: status === "scheduled" ? new Date() : null,
    paidDate: status === "paid" ? new Date() : null,
    invoiceDocumentId: invoiceDocument?.id || null,
    invoiceTitle: invoiceDocument?.title || "",
    invoiceFileUrl: invoiceDocument?.fileUrl || "",
    invoiceExternalUrl: invoiceDocument?.externalUrl || "",
    linkedExpenseId: null,
    note: refs.vendorBillNoteInput.value.trim(),
    createdByUid: state.profile.uid,
    createdByName: state.profile.displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  refs.vendorBillForm.reset();
  refs.vendorBillStatusInput.value = "open";
  refs.vendorBillSourceTypeInput.value = "none";
  refs.vendorBillInvoiceDateInput.value = todayDateInputValue();
  refs.vendorBillDueDateInput.value = todayDateInputValue();
  renderVendorProjectOptions("");
  renderVendorBillSourceFields();
  showToast("Vendor payable saved.");
}

async function updateVendorBillStatus(billId, nextStatus) {
  if (!isAdmin()) return;

  const bill = state.vendorBills.find((item) => item.id === billId);
  if (!bill) {
    showToast("Vendor bill not found.", "error");
    return;
  }

  const updates = {
    status: nextStatus,
    updatedAt: serverTimestamp(),
  };

  if (nextStatus === "scheduled") {
    updates.scheduledDate = new Date();
    updates.paidDate = null;
  } else if (nextStatus === "paid") {
    updates.paidDate = new Date();
  } else if (nextStatus === "open") {
    updates.scheduledDate = null;
    updates.paidDate = null;
  } else if (nextStatus === "void") {
    updates.scheduledDate = null;
    updates.paidDate = null;
  }

  await updateDoc(doc(state.db, "vendorBills", billId), updates);
  showToast(
    `Vendor bill marked ${VENDOR_BILL_STATUS_META[nextStatus] || nextStatus}.`,
  );
}

async function saveVendorDocument(event) {
  event.preventDefault();

  const vendor = currentVendorDoc();
  if (!vendor || !isAdmin()) return;

  const category = refs.vendorDocumentCategoryInput.value || "other";
  const accessLevel =
    category === "w9"
      ? "admin_only"
      : refs.vendorDocumentAccessInput.value || "staff";

  await createVendorDocumentRecord({
    vendorId: vendor.id,
    category,
    accessLevel,
    sourceType: refs.vendorDocumentSourceTypeInput.value || "upload",
    title: refs.vendorDocumentTitleInput.value.trim(),
    note: refs.vendorDocumentNoteInput.value.trim(),
    relatedDate:
      parseDateOnlyInput(refs.vendorDocumentDateInput.value) || new Date(),
    expirationDate: parseDateOnlyInput(
      refs.vendorDocumentExpirationInput.value,
    ),
    externalUrl: refs.vendorDocumentUrlInput.value,
    file: refs.vendorDocumentFileInput.files?.[0] || null,
  });

  refs.vendorDocumentForm.reset();
  refs.vendorDocumentCategoryInput.value = "agreement";
  refs.vendorDocumentAccessInput.value = "staff";
  refs.vendorDocumentSourceTypeInput.value = "upload";
  refs.vendorDocumentDateInput.value = todayDateInputValue();
  renderVendorDocumentSourceFields();
  renderVendorDocumentAccessDefaults();
  showToast("Vendor document saved.");
}

function todayDateInputValue() {
  return formatDateOnlyInputValue(new Date());
}

function projectActorFields() {
  return {
    actorName: state.profile?.displayName || state.profile?.email || "Team",
    actorUid: state.profile?.uid || "",
    actorRole: state.profile?.role || "employee",
  };
}

function ensureSentence(value) {
  const text = safeString(value);
  if (!text) {
    return "";
  }
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function clientPortalProjectLabel(project = null) {
  return (
    safeString(
      project?.projectAddress || project?.clientName || project?.projectType,
    ) || "your property"
  );
}

function buildClientPortalProjectUpdateMessage({
  project,
  nextStatus = "in_progress",
  nextPhaseLabel = "",
  nextTargetWindow = "",
  nextTargetDate = null,
  nextNextStep = "",
  nextSharedStatusNote = "",
}) {
  const statusChanged =
    safeString(project?.status || "in_progress") !== safeString(nextStatus);
  const projectLabel = clientPortalProjectLabel(project);
  const statusLabel =
    JOB_STATUS_META[nextStatus] ||
    capitalise(safeString(nextStatus || "in_progress").replace(/_/g, " "));
  const sentences = [];

  if (statusChanged && safeString(nextStatus) === "completed") {
    sentences.push(
      `Project update for ${projectLabel}: this job is now marked complete in your secure portal.`,
    );
  } else if (statusChanged) {
    sentences.push(
      `Project update for ${projectLabel}: status is now ${statusLabel}.`,
    );
  } else {
    sentences.push(`Project update for ${projectLabel}.`);
  }

  if (safeString(nextPhaseLabel)) {
    sentences.push(`Current phase: ${safeString(nextPhaseLabel)}.`);
  }

  if (safeString(nextNextStep)) {
    sentences.push(`Next step: ${safeString(nextNextStep)}.`);
  }

  if (safeString(nextTargetWindow)) {
    sentences.push(`Target window: ${safeString(nextTargetWindow)}.`);
  } else if (nextTargetDate) {
    sentences.push(`Target date: ${formatDateOnly(nextTargetDate)}.`);
  }

  if (safeString(nextSharedStatusNote)) {
    sentences.push(ensureSentence(nextSharedStatusNote));
  } else if (safeString(nextStatus) === "completed") {
    sentences.push(
      "You can review closeout notes, photos, and documents from the jobs section anytime.",
    );
  }

  return sentences.join(" ").replace(/\s+/g, " ").trim();
}

function buildClientPortalDocumentUpdateMessage({
  project = null,
  category = "other",
  title = "",
  note = "",
}) {
  const normalisedCategory = safeString(category || "other");
  const documentTitle =
    safeString(title) || defaultRecordDocumentTitle(normalisedCategory);
  const projectLabel = project ? clientPortalProjectLabel(project) : "your portal";
  const sentences = [];

  if (normalisedCategory === "photo") {
    sentences.push(
      documentTitle &&
        documentTitle !== DOCUMENT_CATEGORY_META.photo &&
        documentTitle !== "Photo"
        ? `New progress photo shared for ${projectLabel}: ${documentTitle}.`
        : `New progress photo shared for ${projectLabel}.`,
    );
    sentences.push(
      safeString(note)
        ? ensureSentence(note)
        : "Open the jobs section to review the latest photo update.",
    );
  } else if (normalisedCategory === "closeout") {
    sentences.push(
      project
        ? `A closeout document was shared for ${projectLabel}: ${documentTitle}.`
        : `A closeout document was shared to your portal: ${documentTitle}.`,
    );
    if (safeString(note)) {
      sentences.push(ensureSentence(note));
    }
  } else if (normalisedCategory === "receipt") {
    sentences.push(
      project
        ? `A paid receipt was shared for ${projectLabel}: ${documentTitle}.`
        : `A paid receipt was shared to your portal: ${documentTitle}.`,
    );
    if (safeString(note)) {
      sentences.push(ensureSentence(note));
    }
  } else {
    sentences.push(
      project
        ? `A new client document was shared for ${projectLabel}: ${documentTitle}.`
        : `A new client document was shared to your portal: ${documentTitle}.`,
    );
    if (safeString(note)) {
      sentences.push(ensureSentence(note));
    }
  }

  return sentences.join(" ").replace(/\s+/g, " ").trim();
}

async function addProjectActivityEntry(
  projectId,
  activityType,
  title,
  body = "",
) {
  if (!projectId) return;

  await addDoc(collection(state.db, "projects", projectId, "activities"), {
    activityType,
    title,
    body,
    ...projectActorFields(),
    createdAt: serverTimestamp(),
  });
}

async function createProjectExpenseEntry({
  projectId,
  amount,
  category = "general",
  vendorId = null,
  vendor = "",
  note = "",
  relatedDate = new Date(),
  receiptDocument = null,
}) {
  if (!projectId) {
    throw new Error("Select a job first.");
  }

  await addDoc(collection(state.db, "projects", projectId, "expenses"), {
    amount,
    category,
    vendorId,
    vendor,
    note,
    relatedDate,
    receiptDocumentId: receiptDocument?.id || null,
    receiptTitle: receiptDocument?.title || "",
    receiptUrl: documentHref(receiptDocument),
    createdByUid: state.profile.uid,
    createdByName: state.profile.displayName,
    createdAt: serverTimestamp(),
  });

  await addProjectActivityEntry(
    projectId,
    "expense",
    "Expense recorded",
    `${formatCurrency(amount)} recorded for ${category}${vendor ? ` with ${vendor}` : ""}.`,
  );
}

function collectAssignedWorkers(project) {
  return Array.from(
    refs.workerAssignmentList.querySelectorAll("[data-worker-check]"),
  ).flatMap((checkbox) => {
    if (!checkbox.checked) return [];
    const key = checkbox.dataset.workerCheck;
    const percentInput = refs.workerAssignmentList.querySelector(
      `[data-worker-percent="${CSS.escape(key)}"]`,
    );
    const member =
      activeStaffOptions().find(
        (staff) => (staff.uid || staff.email) === key,
      ) ||
      (project.assignedWorkers || []).find(
        (worker) => (worker.uid || worker.email) === key,
      );

    if (!member) {
      return [];
    }

    return [
      {
        uid: member.uid || "",
        name:
          member.displayName ||
          member.name ||
          member.email ||
          "Assigned worker",
        email: member.email || "",
        percent: toNumber(percentInput?.value),
      },
    ];
  });
}

function buildAssignedWorkersFromSelectedUids(selectedUids = [], ownerUid = "") {
  const uids = uniqueValues([ownerUid, ...selectedUids].filter(Boolean));
  return uids
    .map((uid, index) => {
      const member = activeStaffOptions().find((staff) => staff.uid === uid);
      if (!member) {
        return null;
      }

      return {
        uid: member.uid || "",
        name: member.displayName || member.email || "Assigned worker",
        email: member.email || "",
        percent: uid === ownerUid || (!ownerUid && index === 0) ? 100 : 0,
      };
    })
    .filter(Boolean);
}

async function resolveJobDrawerCustomerLink(draft) {
  const selectedCustomer = draft.customerId
    ? state.customers.find((customer) => customer.id === draft.customerId) ||
      null
    : null;

  if (selectedCustomer?.id) {
    return writeCustomerFromClientRecord(
      doc(state.db, "customers", selectedCustomer.id),
      {
        customerName: selectedCustomer.name,
        clientName: draft.clientName,
        clientEmail: draft.clientEmail,
        clientPhone: draft.clientPhone,
        projectAddress: draft.clientAddress,
      },
      selectedCustomer,
    );
  }

  const matches = matchingCustomersForClientRecord({
    clientName: draft.clientName,
    clientEmail: draft.clientEmail,
    clientPhone: draft.clientPhone,
    projectAddress: draft.clientAddress,
  });

  if (matches.length > 1) {
    throw new Error(
      "Multiple customer matches were found. Pick the correct customer account before creating this job.",
    );
  }

  const matchedCustomer = matches[0] || null;
  const customerRef = matchedCustomer
    ? doc(state.db, "customers", matchedCustomer.id)
    : doc(collection(state.db, "customers"));

  return writeCustomerFromClientRecord(
    customerRef,
    {
      customerName: matchedCustomer?.name || draft.clientName,
      clientName: draft.clientName,
      clientEmail: draft.clientEmail,
      clientPhone: draft.clientPhone,
      projectAddress: draft.clientAddress,
    },
    matchedCustomer || {},
  );
}

function selectedReceiptDocument() {
  const receiptId = refs.expenseReceiptSelect.value || "";
  return receiptId
    ? state.projectDocuments.find((item) => item.id === receiptId) || null
    : null;
}

function selectedExpenseVendor() {
  return selectedExpenseVendorFromSelect(refs.expenseVendorSelect);
}

function selectedDrawerExpenseVendor() {
  return selectedExpenseVendorFromSelect(refs.drawerExpenseVendorSelect);
}

function renderExpenseVendorOptions(
  selectedVendorId = refs.expenseVendorSelect?.value || "",
) {
  renderVendorSelectOptions(refs.expenseVendorSelect, selectedVendorId);
}

function resetChangeOrderForm() {
  state.editingChangeOrderId = null;
  refs.changeOrderForm?.reset();
  refs.changeOrderStatus.value = "draft";
  refs.changeOrderDate.value = todayDateInputValue();
  setActionButtonLabel(refs.changeOrderSubmitButton, "Save change order");
  if (refs.changeOrderResetButton) {
    refs.changeOrderResetButton.hidden = true;
  }
}

function startChangeOrderEdit(changeOrder) {
  if (!changeOrder?.id) {
    showToast("Change order not found.", "error");
    return;
  }

  if (changeOrderIsPublished(changeOrder) || changeOrderIsSigned(changeOrder)) {
    showToast(
      "Unpublish or replace this change order before editing the published record.",
      "error",
    );
    return;
  }

  state.editingChangeOrderId = changeOrder.id;
  refs.changeOrderTitle.value = changeOrder.title || "";
  refs.changeOrderAmount.value = toNumber(changeOrder.amount || 0);
  refs.changeOrderStatus.value =
    normaliseChangeOrderStatus(changeOrder.status) || "draft";
  refs.changeOrderDate.value = formatDateOnlyInputValue(
    changeOrder.relatedDate || changeOrder.createdAt,
  );
  refs.changeOrderNote.value = changeOrder.note || "";
  setActionButtonLabel(refs.changeOrderSubmitButton, "Save changes");
  if (refs.changeOrderResetButton) {
    refs.changeOrderResetButton.hidden = false;
  }
  openJobTab("financials", refs.changeOrderTitle);
}

function resetExpenseForm() {
  state.editingExpenseId = null;
  refs.expenseForm?.reset();
  refs.expenseDate.value = todayDateInputValue();
  renderExpenseVendorOptions("");
  setActionButtonLabel(refs.expenseSubmitButton, "Add expense");
  if (refs.expenseResetButton) {
    refs.expenseResetButton.hidden = true;
  }
}

function startExpenseEdit(expense) {
  if (!expense?.id) {
    showToast("Expense not found.", "error");
    return;
  }

  if (safeString(expense.source) === "vendor_bill") {
    showToast(
      "This expense is mirrored from vendor payables. Edit it from the vendor bill instead.",
      "error",
    );
    return;
  }

  state.editingExpenseId = expense.id;
  refs.expenseAmount.value = toNumber(expense.amount || 0);
  refs.expenseDate.value = formatDateOnlyInputValue(
    expense.relatedDate || expense.createdAt,
  );
  refs.expenseCategory.value = expense.category || "";
  refs.expenseVendor.value = expense.vendor || "";
  renderExpenseVendorOptions(expense.vendorId || "");
  refs.expenseVendorSelect.value = expense.vendorId || "";
  refs.expenseReceiptSelect.value = expense.receiptDocumentId || "";
  refs.expenseNote.value = expense.note || "";
  setActionButtonLabel(refs.expenseSubmitButton, "Save expense changes");
  if (refs.expenseResetButton) {
    refs.expenseResetButton.hidden = false;
  }
  openJobTab("financials", refs.expenseAmount);
}

async function deleteCurrentProject() {
  return archiveCurrentProject();
}

function resetCalendarEventForm(seed = {}) {
  if (!refs.calendarEventForm) {
    return;
  }
  refs.calendarEventForm.reset();
  const projectId = seed.projectId || state.calendarProjectId || "";
  const project = projectId
    ? state.projects.find((item) => item.id === projectId) || null
    : null;
  refs.calendarTypeSelect.value = seed.type || "job_work";
  refs.calendarEventStatusSelect.value = seed.status || "scheduled";
  refs.calendarTitleInput.value = seed.title || "";
  refs.calendarLinkedCustomerSelect.value =
    seed.customerId || project?.customerId || "";
  refs.calendarLinkedProjectSelect.value = projectId;
  refs.calendarLinkedLeadSelect.value = seed.leadId || project?.leadId || "";
  renderCalendarFormOptions();
  refs.calendarLinkedCustomerSelect.value =
    seed.customerId || project?.customerId || "";
  renderCalendarFormOptions();
  refs.calendarLinkedProjectSelect.value = projectId;
  refs.calendarLinkedLeadSelect.value = seed.leadId || project?.leadId || "";
  refs.calendarClientVisibleInput.checked = false;
  refs.calendarStartInput.value = formatDateInputValue(seed.startAt || new Date());
  refs.calendarEndInput.value = "";
  Array.from(refs.calendarAssignedStaffSelect.options || []).forEach(
    (option) => {
      option.selected = seed.assignedStaffUids?.includes(option.value) || false;
    },
  );
}

async function saveCalendarEvent(event) {
  event.preventDefault();

  const title = refs.calendarTitleInput.value.trim();
  const startAt = parseDateInput(refs.calendarStartInput.value);
  const endAt = parseDateInput(refs.calendarEndInput.value);
  const projectId = refs.calendarLinkedProjectSelect.value || "";
  const leadId = refs.calendarLinkedLeadSelect.value || "";
  const project = projectId
    ? state.projects.find((item) => item.id === projectId) || null
    : null;
  const lead = leadId
    ? state.leads.find((item) => item.id === leadId) || null
    : null;
  const selectedCustomerId = refs.calendarLinkedCustomerSelect.value || "";
  const customerId =
    project?.customerId || lead?.customerId || selectedCustomerId || "";
  const selectedStaffUids = uniqueValues(
    Array.from(refs.calendarAssignedStaffSelect.selectedOptions || []).map(
      (option) => option.value,
    ),
  );
  const assignedStaffUids = isAdmin()
    ? selectedStaffUids
    : uniqueValues([state.profile?.uid]);
  const assignedStaffNames = assignedStaffUids
    .map((uid) => {
      const member =
        state.staffRoster.find((item) => item.uid === uid) ||
        activeStaffOptions().find((item) => item.uid === uid);
      return member?.displayName || member?.email || "";
    })
    .filter(Boolean);
  const clientVisible = isAdmin()
    ? refs.calendarClientVisibleInput.checked
    : false;

  if (!title) {
    showToast("Add an event title.", "error");
    return;
  }

  if (!startAt) {
    showToast("Add a valid start date and time.", "error");
    return;
  }

  if (endAt && endAt.getTime() < startAt.getTime()) {
    showToast("End time must be after start time.", "error");
    return;
  }

  if (!assignedStaffUids.length) {
    showToast("Assign at least one staff member.", "error");
    return;
  }

  await addDoc(collection(state.db, "calendarEvents"), {
    title,
    type: refs.calendarTypeSelect.value || "job_work",
    status: refs.calendarEventStatusSelect.value || "scheduled",
    startAt,
    endAt,
    allDay: refs.calendarAllDayInput.checked,
    projectId,
    leadId,
    customerId,
    assignedStaffUids,
    assignedStaffNames,
    clientVisible,
    clientTitle: refs.calendarClientTitleInput.value.trim(),
    clientNote: refs.calendarClientNoteInput.value.trim(),
    internalNote: refs.calendarInternalNoteInput.value.trim(),
    createdByUid: state.profile?.uid || "",
    createdByName: state.profile?.displayName || state.profile?.email || "",
    updatedByUid: state.profile?.uid || "",
    updatedByName: state.profile?.displayName || state.profile?.email || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  resetCalendarEventForm({ projectId: state.calendarProjectId });
  showToast("Calendar event saved.");
}

async function saveProject(event) {
  event.preventDefault();
  const project = currentProject();
  if (!project) return false;

  if (!isAdmin()) {
    await updateDoc(doc(state.db, "projects", project.id), {
      phaseLabel: refs.jobPhaseLabelInput.value.trim(),
      targetWindow: refs.jobTargetWindowInput.value.trim(),
      targetDate: parseDateOnlyInput(refs.jobTargetDateInput.value),
      nextStep: refs.jobNextStepInput.value.trim(),
      sharedStatusNote: refs.jobSharedStatusNoteInput.value.trim(),
      planningNotes: refs.jobPlanningNotesInput.value.trim(),
      updatedAt: serverTimestamp(),
    });
    await addDoc(collection(state.db, "projects", project.id, "activities"), {
      activityType: "system",
      title: "Job updates saved",
      body: "Operational job notes and shared schedule details were updated.",
      actorName: state.profile?.displayName || state.profile?.email || "Team",
      actorUid: state.profile?.uid || "",
      actorRole: state.profile?.role || "employee",
      createdAt: serverTimestamp(),
    });
    showToast("Job updates saved.");
    return true;
  }

  const customerId = refs.jobCustomerSelect.value || null;
  const selectedCustomer = customerId
    ? state.customers.find((customer) => customer.id === customerId) || null
    : null;
  if (customerId && !selectedCustomer) {
    showToast("The selected customer is no longer available.", "error");
    return false;
  }
  const ownerUid = refs.jobOwnerSelect.value || null;
  const nextStatus = refs.jobStatusSelect.value || "in_progress";
  const nextBaseContractValue = toNumber(refs.jobBaseContractInput.value);
  const nextClientName =
    refs.jobClientNameInput.value.trim() || selectedCustomer?.name || "";
  const nextClientPhone = refs.jobClientPhoneInput.value.trim();
  const nextClientEmail = refs.jobClientEmailInput.value.trim();
  const nextProjectType = refs.jobProjectTypeInput.value.trim();
  const nextProjectAddress = refs.jobProjectAddressInput.value.trim();
  const nextPhaseLabel = refs.jobPhaseLabelInput.value.trim();
  const nextTargetWindow = refs.jobTargetWindowInput.value.trim();
  const nextTargetDate = parseDateOnlyInput(refs.jobTargetDateInput.value);
  const nextNextStep = refs.jobNextStepInput.value.trim();
  const nextSharedStatusNote = refs.jobSharedStatusNoteInput.value.trim();
  const nextPlanningNotes = refs.jobPlanningNotesInput.value.trim();
  const assignedWorkers = collectAssignedWorkers(project);
  let linkedCustomer = null;

  const allowedStaffUids = uniqueValues([
    state.profile?.uid || "",
    ownerUid,
    ...assignedWorkers.map((worker) => worker.uid),
  ]);

  if (
    project.commissionLocked &&
    project.status === "completed" &&
    nextStatus !== "completed"
  ) {
    showToast("Use Reopen and recalculate to unlock a completed job.", "error");
    return false;
  }

  if (!nextClientName) {
    showToast("Client name is required.", "error");
    return false;
  }

  if (selectedCustomer?.id) {
    linkedCustomer = await writeCustomerFromClientRecord(
      doc(state.db, "customers", selectedCustomer.id),
      {
        customerName: selectedCustomer.name,
        clientName: nextClientName,
        clientEmail: nextClientEmail,
        clientPhone: nextClientPhone,
        projectAddress: nextProjectAddress,
      },
      selectedCustomer,
    );
  }

  await updateDoc(doc(state.db, "projects", project.id), {
    status: nextStatus,
    completedAt:
      nextStatus === "completed"
        ? project.completedAt || serverTimestamp()
        : null,
    baseContractValue: nextBaseContractValue,
    jobValue: nextBaseContractValue,
    customerId: linkedCustomer?.id || customerId || null,
    customerName: linkedCustomer?.name || selectedCustomer?.name || "",
    clientName: nextClientName,
    clientPhone: nextClientPhone,
    clientEmail: nextClientEmail,
    projectType: nextProjectType,
    projectAddress: nextProjectAddress,
    assignedLeadOwnerUid: ownerUid,
    assignedWorkers,
    assignedWorkerIds: assignedWorkers
      .map((worker) => worker.uid)
      .filter(Boolean),
    phaseLabel: nextPhaseLabel,
    targetWindow: nextTargetWindow,
    targetDate: nextTargetDate,
    nextStep: nextNextStep,
    sharedStatusNote: nextSharedStatusNote,
    planningNotes: nextPlanningNotes,
    allowedStaffUids,
    updatedAt: serverTimestamp(),
  });

  const syncedFinancials = await syncProjectFinancialSnapshot(project.id, {
    projectData: project,
    baseContractValue: nextBaseContractValue,
    assignedWorkers,
  });

  const previousBaseContractValue = toNumber(
    project.baseContractValue ||
      project.financials?.baseContractValue ||
      project.jobValue ||
      0,
  );
  const activityWrites = [];
  const nextCustomerId = linkedCustomer?.id || customerId || null;
  const nextCustomerName = linkedCustomer?.name || selectedCustomer?.name || "";
  const customerChanged =
    safeString(project.customerId) !== safeString(nextCustomerId) ||
    safeString(project.customerName) !== safeString(nextCustomerName);
  const previousClientProfileKey = JSON.stringify({
    clientName: safeString(project.clientName),
    clientPhone: safeString(project.clientPhone),
    clientEmail: safeString(project.clientEmail),
    projectType: safeString(project.projectType),
    projectAddress: safeString(project.projectAddress),
  });
  const nextClientProfileKey = JSON.stringify({
    clientName: nextClientName,
    clientPhone: nextClientPhone,
    clientEmail: nextClientEmail,
    projectType: nextProjectType,
    projectAddress: nextProjectAddress,
  });

  if (previousBaseContractValue !== nextBaseContractValue) {
    activityWrites.push(
      addProjectActivityEntry(
        project.id,
        "financials",
        "Base contract updated",
        `Contract value moved from ${formatCurrency(previousBaseContractValue)} to ${formatCurrency(nextBaseContractValue)}.`,
      ),
    );
  }

  if ((project.status || "in_progress") !== nextStatus) {
    activityWrites.push(
      addProjectActivityEntry(
        project.id,
        "status",
        "Job status updated",
        `Status moved from ${JOB_STATUS_META[project.status] || "In Progress"} to ${JOB_STATUS_META[nextStatus] || "In Progress"}.`,
      ),
    );
  }

  if (customerChanged || previousClientProfileKey !== nextClientProfileKey) {
    activityWrites.push(
      addProjectActivityEntry(
        project.id,
        "client",
        "Client details updated",
        `${nextClientName || "This job"} now points to ${nextCustomerName || "no linked customer"} with refreshed contact and property details.`,
      ),
    );
  }

  const previousWorkerKey = JSON.stringify(
    (project.assignedWorkers || []).map((worker) => ({
      uid: worker.uid || "",
      email: worker.email || "",
      percent: toNumber(worker.percent),
    })),
  );
  const nextWorkerKey = JSON.stringify(
    assignedWorkers.map((worker) => ({
      uid: worker.uid || "",
      email: worker.email || "",
      percent: toNumber(worker.percent),
    })),
  );

  if (
    (project.assignedLeadOwnerUid || "") !== (ownerUid || "") ||
    previousWorkerKey !== nextWorkerKey
  ) {
    activityWrites.push(
      addProjectActivityEntry(
        project.id,
        "team",
        "Team setup updated",
        `${assignedWorkers.length} workers are assigned to this job.`,
      ),
    );
  }

  const previousClientFacingKey = JSON.stringify({
    phaseLabel: safeString(project.phaseLabel),
    targetWindow: safeString(project.targetWindow),
    targetDate: formatDateOnlyInputValue(project.targetDate),
    nextStep: safeString(project.nextStep),
    sharedStatusNote: safeString(project.sharedStatusNote),
  });
  const nextClientFacingKey = JSON.stringify({
    phaseLabel: nextPhaseLabel,
    targetWindow: nextTargetWindow,
    targetDate: formatDateOnlyInputValue(nextTargetDate),
    nextStep: nextNextStep,
    sharedStatusNote: nextSharedStatusNote,
  });
  const clientFacingChanged = previousClientFacingKey !== nextClientFacingKey;
  const statusChanged =
    safeString(project.status || "in_progress") !== safeString(nextStatus);

  if (clientFacingChanged) {
    activityWrites.push(
      addProjectActivityEntry(
        project.id,
        "client_update",
        "Shared project update refreshed",
        "The shared phase, next step, and project update were refreshed.",
      ),
    );
  }

  if (safeString(project.planningNotes) !== nextPlanningNotes) {
    activityWrites.push(
      addProjectActivityEntry(
        project.id,
        "planning",
        "Internal planning updated",
        "The internal planning notes on this job were refreshed.",
      ),
    );
  }

  if (nextStatus === "completed" && !project.commissionLocked && syncedFinancials) {
    await updateDoc(doc(state.db, "projects", project.id), {
      commissionLocked: true,
      lockedCommissionSnapshot: {
        totalContractRevenue: firstFiniteNumber(
          syncedFinancials.totalContractRevenue,
          0,
        ),
        projectedGrossProfit: firstFiniteNumber(
          syncedFinancials.projectedGrossProfit,
          syncedFinancials.profit,
          0,
        ),
        workerPool: firstFiniteNumber(syncedFinancials.workerPool, 0),
        companyShare: firstFiniteNumber(syncedFinancials.companyShare, 0),
        workerBreakdown: Array.isArray(syncedFinancials.workerBreakdown)
          ? syncedFinancials.workerBreakdown
          : [],
        lockedAt: new Date(),
      },
      updatedAt: serverTimestamp(),
    });
    activityWrites.push(
      addProjectActivityEntry(
        project.id,
        "commission",
        "Commission locked",
        "This job was marked completed, so the current payout snapshot was locked for payroll history.",
      ),
    );
  }

  const clientPortalMessage =
    safeString(nextCustomerId) && (clientFacingChanged || statusChanged)
      ? buildClientPortalProjectUpdateMessage({
          project,
          nextStatus,
          nextPhaseLabel,
          nextTargetWindow,
          nextTargetDate,
          nextNextStep,
          nextSharedStatusNote,
        })
      : "";

  if (clientPortalMessage) {
    activityWrites.push(
      postCustomerPortalThreadUpdateSafe({
        customerId: nextCustomerId,
        projectId: project.id,
        body: clientPortalMessage,
      }),
    );
  }

  await Promise.all(activityWrites);
  showToast(
    nextStatus === "completed"
      ? "Job completed and moved to Completed jobs."
      : statusChanged
        ? `Job status changed to ${JOB_STATUS_META[nextStatus] || "In Progress"}.`
        : "Job setup saved.",
  );
  return true;
}

async function changeCurrentProjectStatus() {
  const project = currentProject();
  if (!project || !isAdmin()) return;

  const previousStatus = project.status || "in_progress";
  const nextStatus = refs.jobStatusSelect.value || "in_progress";
  if (nextStatus === previousStatus) return;

  if (nextStatus === "completed") {
    await completeCurrentProject();
    return;
  }

  refs.jobStatusSelect.disabled = true;
  try {
    const saved = await saveProject({ preventDefault() {} });
    if (!saved) {
      refs.jobStatusSelect.value = previousStatus;
    }
  } catch (error) {
    refs.jobStatusSelect.value = previousStatus;
    throw error;
  } finally {
    if (currentProject()?.id === project.id) {
      refs.jobStatusSelect.disabled = !isAdmin();
    }
  }
}

async function completeCurrentProject() {
  const project = currentProject();
  if (!project || !isAdmin()) return;
  if (project.status === "completed") {
    showToast("This job is already completed.");
    return;
  }

  const confirmed = window.confirm(
    `Mark ${project.projectAddress || project.clientName || "this job"} complete? It will leave Active projects and move to Completed jobs.`,
  );
  if (!confirmed) {
    refs.jobStatusSelect.value = project.status || "in_progress";
    return;
  }

  refs.jobCompleteButton.disabled = true;
  refs.jobStatusSelect.value = "completed";
  const saved = await saveProject({ preventDefault() {} });
  if (!saved) {
    refs.jobCompleteButton.disabled = false;
    refs.jobStatusSelect.value = project.status || "in_progress";
    return;
  }

  state.jobStatus = "active";
  closeJobWorkspace({ historyMode: "replace" });
}

async function addExpense(event) {
  event.preventDefault();
  const project = currentProject();
  if (!project) return;

  const amount = toNumber(refs.expenseAmount.value);
  if (!amount) {
    showToast("Enter an expense amount first.", "error");
    return;
  }

  const category = refs.expenseCategory.value.trim() || "general";
  const selectedVendor = selectedExpenseVendor();
  const customVendor = refs.expenseVendor.value.trim();
  const vendor = selectedVendor?.name || customVendor;
  const note = refs.expenseNote.value.trim();
  const relatedDate = parseDateOnlyInput(refs.expenseDate.value) || new Date();
  const receiptDocument = selectedReceiptDocument();

  if (state.editingExpenseId) {
    const existing =
      state.projectExpenses.find((expense) => expense.id === state.editingExpenseId) ||
      null;
    if (!existing) {
      resetExpenseForm();
      showToast("That expense is no longer available.", "error");
      return;
    }
    if (safeString(existing.source) === "vendor_bill") {
      showToast(
        "This expense is mirrored from vendor payables. Edit it from the vendor bill instead.",
        "error",
      );
      return;
    }

    await updateDoc(
      doc(state.db, "projects", project.id, "expenses", state.editingExpenseId),
      {
        amount,
        category,
        vendorId: selectedVendor?.id || null,
        vendor,
        note,
        relatedDate,
        receiptDocumentId: receiptDocument?.id || null,
        receiptTitle: receiptDocument?.title || "",
        receiptUrl: documentHref(receiptDocument),
        updatedAt: serverTimestamp(),
      },
    );
    await addProjectActivityEntry(
      project.id,
      "expense",
      "Expense updated",
      `${formatCurrency(amount)} expense updated for ${category}${vendor ? ` with ${vendor}` : ""}.`,
    );
    await syncProjectFinancialSnapshot(project.id, { projectData: project });
    resetExpenseForm();
    showToast("Expense updated.");
    return;
  }

  await createProjectExpenseEntry({
    projectId: project.id,
    amount,
    category,
    vendorId: selectedVendor?.id || null,
    vendor,
    note,
    relatedDate,
    receiptDocument,
  });
  await syncProjectFinancialSnapshot(project.id, { projectData: project });
  resetExpenseForm();
  showToast("Expense added.");
}

async function addPayment(event) {
  event.preventDefault();
  const project = currentProject();
  if (!project || !isAdmin()) return;

  const amount = toNumber(refs.paymentAmount.value);
  if (!amount) {
    showToast("Enter a payment amount first.", "error");
    return;
  }

  const paymentType = refs.paymentType.value || "progress";
  const method = refs.paymentMethod.value.trim();
  const reference = refs.paymentReference.value.trim();
  const note = refs.paymentNote.value.trim();
  const relatedDate = parseDateOnlyInput(refs.paymentDate.value) || new Date();
  const shouldGenerateReceipt = refs.paymentGenerateReceipt?.checked === true;
  const shouldSendReceipt = refs.paymentSendReceipt?.checked === true;
  const paymentRef = doc(
    collection(state.db, "projects", project.id, "payments"),
  );
  const payment = {
    id: paymentRef.id,
    amount,
    paymentType,
    method,
    reference,
    note,
    relatedDate,
    receiptNumber: buildPaymentReceiptNumber(paymentRef.id, relatedDate),
    createdByUid: state.profile.uid,
    createdByName: state.profile.displayName,
    createdAt: serverTimestamp(),
  };

  await setDoc(paymentRef, payment, { merge: true });

  refs.paymentForm.reset();
  refs.paymentType.value = "progress";
  refs.paymentDate.value = todayDateInputValue();
  await addProjectActivityEntry(
    project.id,
    "payment",
    "Client payment recorded",
    `${formatCurrency(amount)} logged as ${PAYMENT_TYPE_META[paymentType] || "payment"}${method ? ` via ${method}` : ""}.`,
  );
  await syncProjectFinancialSnapshot(project.id, { projectData: project });
  renderPaymentReceiptOptions(project);

  if (shouldSendReceipt) {
    try {
      await saveAndSharePaymentReceipt(payment);
    } catch (error) {
      console.error("Payment receipt delivery failed.", error);
      showToast(
        "Payment recorded, but the receipt could not be sent. Use Send receipt from the payment list to try again.",
        "error",
      );
    }
    return;
  }

  if (shouldGenerateReceipt) {
    try {
      await downloadPaymentReceipt(payment);
    } catch (error) {
      console.error("Payment receipt download failed.", error);
      showToast(
        "Payment recorded, but the receipt could not be downloaded. Use Download receipt from the payment list to try again.",
        "error",
      );
    }
    return;
  }

  showToast("Payment recorded.");
}

async function addChangeOrder(event) {
  event.preventDefault();
  const project = currentProject();
  if (!project) return;

  const title = refs.changeOrderTitle.value.trim();
  const amount = toNumber(refs.changeOrderAmount.value);
  const status = refs.changeOrderStatus.value || "draft";

  if (!title) {
    showToast("Add a change order title first.", "error");
    return;
  }

  if (!amount) {
    showToast("Add a change order amount.", "error");
    return;
  }

  const note = refs.changeOrderNote.value.trim();
  const relatedDate = parseDateOnlyInput(refs.changeOrderDate.value) || new Date();

  if (state.editingChangeOrderId) {
    const existing =
      state.projectChangeOrders.find(
        (changeOrder) => changeOrder.id === state.editingChangeOrderId,
      ) || null;
    if (!existing) {
      resetChangeOrderForm();
      showToast("That change order is no longer available.", "error");
      return;
    }
    if (changeOrderIsPublished(existing) || changeOrderIsSigned(existing)) {
      showToast(
        "Unpublish or replace this change order before editing the published record.",
        "error",
      );
      return;
    }

    await updateDoc(
      doc(
        state.db,
        "projects",
        project.id,
        "changeOrders",
        state.editingChangeOrderId,
      ),
      {
        title,
        amount,
        status,
        note,
        relatedDate,
        updatedAt: serverTimestamp(),
      },
    );
    await addProjectActivityEntry(
      project.id,
      "change_order",
      "Change order updated",
      `${title} was updated to ${formatCurrency(amount)} and marked ${CHANGE_ORDER_STATUS_META[status] || "Draft"}.`,
    );
    await syncProjectFinancialSnapshot(project.id, { projectData: project });
    resetChangeOrderForm();
    showToast("Change order updated.");
    return;
  }

  await addDoc(collection(state.db, "projects", project.id, "changeOrders"), {
    projectId: project.id,
    leadId: safeString(project.leadId),
    customerId: safeString(project.customerId),
    customerName: safeString(project.customerName || project.clientName),
    projectAddress: safeString(project.projectAddress),
    projectType: safeString(project.projectType),
    title,
    amount,
    status,
    note,
    portalShareId: null,
    portalStatus: "draft",
    portalVisible: false,
    agreementId: null,
    signedAt: null,
    signerName: "",
    signerEmail: "",
    signerRole: "",
    relatedDate,
    createdByUid: state.profile.uid,
    createdByName: state.profile.displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  resetChangeOrderForm();
  await addProjectActivityEntry(
    project.id,
    "change_order",
    "Change order added",
    `${title} for ${formatCurrency(amount)} is marked ${CHANGE_ORDER_STATUS_META[status] || "Draft"}.`,
  );
  await syncProjectFinancialSnapshot(project.id, { projectData: project });
  showToast("Change order saved.");
}

async function deleteProjectExpense(expenseId) {
  const project = currentProject();
  if (!project || !isAdmin() || !expenseId) {
    return;
  }

  const expense =
    state.projectExpenses.find((entry) => entry.id === expenseId) || null;
  if (!expense) {
    showToast("Expense not found.", "error");
    return;
  }

  if (safeString(expense.source) === "vendor_bill") {
    showToast(
      "This expense is mirrored from vendor payables. Delete the vendor bill instead.",
      "error",
    );
    return;
  }

  const confirmed = window.confirm(
    `Delete the ${expense.category || "expense"} for ${formatCurrency(expense.amount || 0)}?`,
  );
  if (!confirmed) {
    return;
  }

  await deleteDoc(doc(state.db, "projects", project.id, "expenses", expense.id));
  await addProjectActivityEntry(
    project.id,
    "expense",
    "Expense deleted",
    `${formatCurrency(expense.amount || 0)} expense removed from the job total.`,
  );
  await syncProjectFinancialSnapshot(project.id, { projectData: project });
  if (state.editingExpenseId === expense.id) {
    resetExpenseForm();
  }
  showToast("Expense deleted.");
}

async function deleteProjectChangeOrder(changeOrderId) {
  const project = currentProject();
  if (!project || !isAdmin() || !changeOrderId) {
    return;
  }

  const changeOrder =
    state.projectChangeOrders.find((entry) => entry.id === changeOrderId) || null;
  if (!changeOrder) {
    showToast("Change order not found.", "error");
    return;
  }

  if (changeOrderIsSigned(changeOrder)) {
    showToast(
      "Signed change orders should stay in the job history. Void it instead of deleting it.",
      "error",
    );
    return;
  }

  const confirmed = window.confirm(
    `Delete "${changeOrder.title || "this change order"}" for ${formatCurrency(changeOrder.amount || 0)}?`,
  );
  if (!confirmed) {
    return;
  }

  if (safeString(changeOrder.portalShareId)) {
    await deleteDoc(doc(state.db, "estimateShares", changeOrder.portalShareId));
  }

  await deleteDoc(
    doc(state.db, "projects", project.id, "changeOrders", changeOrder.id),
  );
  await addProjectActivityEntry(
    project.id,
    "change_order",
    "Change order deleted",
    `${changeOrder.title || "Change order"} was removed from the project revenue plan.`,
  );
  await syncProjectFinancialSnapshot(project.id, { projectData: project });
  if (state.editingChangeOrderId === changeOrder.id) {
    resetChangeOrderForm();
  }
  showToast("Change order deleted.");
}

async function addJobNote(event) {
  event.preventDefault();
  const project = currentProject();
  if (!project) return;

  const body = refs.jobNoteBody.value.trim();
  if (!body) {
    showToast("Add note text first.", "error");
    return;
  }

  await addDoc(collection(state.db, "projects", project.id, "notes"), {
    title: "Job note",
    body,
    createdByUid: state.profile.uid,
    createdByName: state.profile.displayName,
    createdByRole: state.profile.role,
    createdAt: serverTimestamp(),
  });

  refs.jobNoteForm.reset();
  showToast("Job note saved.");
}

async function saveLeadDocument(event) {
  event.preventDefault();
  const lead = currentLeadDoc();

  if (!lead?.id) {
    showToast("Save the lead first.", "error");
    return;
  }

  const category = refs.leadDocumentCategory.value || "other";
  const sourceType = refs.leadDocumentSourceType.value || "upload";

  await createRecordDocument({
    links: buildRecordDocumentLinksFromLead(lead),
    category,
    sourceType,
    title: refs.leadDocumentTitle.value.trim(),
    note: refs.leadDocumentNote.value.trim(),
    relatedDate: parseDateOnlyInput(refs.leadDocumentDate.value) || new Date(),
    externalUrl: refs.leadDocumentUrl.value,
    file: refs.leadDocumentFile.files?.[0] || null,
    clientVisible: refs.leadDocumentClientVisible.checked,
  });

  refs.leadDocumentForm.reset();
  refs.leadDocumentCategory.value = "agreement";
  refs.leadDocumentSourceType.value = "upload";
  refs.leadDocumentDate.value = todayDateInputValue();
  refs.leadDocumentClientVisible.checked = false;
  renderLeadDocumentSourceFields();
  showToast("Shared document saved to this lead.");
}

async function saveCustomerDocument(event) {
  event.preventDefault();
  const customer = currentCustomerDoc();

  if (!customer?.id) {
    showToast("Save the customer first.", "error");
    return;
  }

  const targetValue = refs.customerDocumentTargetSelect.value || "";
  const links = buildRecordDocumentLinksFromCustomerTarget(
    customer,
    targetValue,
  );

  if (!links.customerId && !links.leadId && !links.projectId) {
    showToast(
      "Choose where this customer document should attach first.",
      "error",
    );
    return;
  }

  await createRecordDocument({
    links,
    category: refs.customerDocumentCategory.value || "other",
    sourceType: refs.customerDocumentSourceType.value || "upload",
    title: refs.customerDocumentTitle.value.trim(),
    note: refs.customerDocumentNote.value.trim(),
    relatedDate:
      parseDateOnlyInput(refs.customerDocumentDate.value) || new Date(),
    externalUrl: refs.customerDocumentUrl.value,
    file: refs.customerDocumentFile.files?.[0] || null,
    clientVisible: refs.customerDocumentClientVisible.checked,
  });

  refs.customerDocumentForm.reset();
  refs.customerDocumentCategory.value = "agreement";
  refs.customerDocumentSourceType.value = "upload";
  refs.customerDocumentDate.value = todayDateInputValue();
  refs.customerDocumentClientVisible.checked = false;
  renderCustomerDocumentTargetOptions(customer, customerRollup(customer));
  renderCustomerDocumentSourceFields();
  showToast("Shared document saved to this customer record.");
}

async function handleCustomerPortalPublishingAction(button) {
  const action = safeString(button?.dataset.customerPortalAction);
  const targetId = safeString(button?.dataset.targetId);
  const projectId = safeString(button?.dataset.projectId);
  const leadId = safeString(button?.dataset.leadId);

  if (!action) {
    return;
  }

  if (!isAdmin()) {
    showToast("Only admins can manage client publishing.", "error");
    return;
  }

  if (action === "publish-estimate") {
    await publishCustomerEstimateFromLead(leadId || targetId);
    return;
  }

  if (action === "revoke-estimate") {
    const response = await apiPost("/api/staff/estimate-share", {
      action: "revoke",
      type: "estimate",
      leadId,
      shareId: targetId,
    });
    if (state.selectedLeadId === leadId) {
      applySelectedLeadEstimateShareState(leadId, response.share || null);
      await refreshEstimateShareState(leadId);
    }
    showToast("Estimate removed from active client approval.");
    return;
  }

  if (action === "delete-estimate") {
    await deleteEstimateShareLink(leadId, targetId);
    return;
  }

  if (action === "show-invoice") {
    await setCustomerPortalInvoiceVisibility(projectId, targetId, true);
    return;
  }

  if (action === "hide-invoice") {
    await setCustomerPortalInvoiceVisibility(projectId, targetId, false);
    return;
  }

  if (action === "publish-change-order") {
    await publishCustomerChangeOrder(projectId, targetId);
    return;
  }

  if (action === "revoke-change-order") {
    await revokeCustomerChangeOrder(projectId, targetId);
    return;
  }

  if (action === "delete-change-order") {
    await deleteCustomerChangeOrder(projectId, targetId);
    return;
  }

  if (action === "show-document") {
    await setCustomerPortalDocumentVisibility(targetId, true);
    return;
  }

  if (action === "hide-document") {
    await setCustomerPortalDocumentVisibility(targetId, false);
    return;
  }
}

async function saveJobDocument(event) {
  event.preventDefault();
  const project = currentProject();
  if (!project) return;

  const category = refs.jobDocumentCategory.value || "other";
  const title =
    refs.jobDocumentTitle.value.trim() || defaultRecordDocumentTitle(category);
  const note = refs.jobDocumentNote.value.trim();
  const clientVisible = refs.jobDocumentClientVisible.checked;

  await createRecordDocument({
    links: buildRecordDocumentLinksFromProject(project),
    category,
    sourceType: refs.jobDocumentSourceType.value || "upload",
    title,
    note,
    relatedDate: parseDateOnlyInput(refs.jobDocumentDate.value) || new Date(),
    externalUrl: refs.jobDocumentUrl.value,
    file: refs.jobDocumentFile.files?.[0] || null,
    clientVisible,
  });

  refs.jobDocumentForm.reset();
  refs.jobDocumentSourceType.value = "upload";
  refs.jobDocumentDate.value = todayDateInputValue();
  refs.jobDocumentClientVisible.checked = false;
  renderJobDocumentSourceFields();
  await Promise.all([
    addProjectActivityEntry(
      project.id,
      "document",
      "Document added",
      `${title} was added under ${DOCUMENT_CATEGORY_META[category] || "Other"}.`,
    ),
    clientVisible && safeString(project.customerId)
      ? postCustomerPortalThreadUpdateSafe({
          customerId: project.customerId,
          projectId: project.id,
          body: buildClientPortalDocumentUpdateMessage({
            project,
            category,
            title,
            note,
          }),
        })
      : Promise.resolve(),
  ]);
  showToast("Document saved.");
}

async function reopenAndUnlockCommission() {
  const project = currentProject();
  if (!project || !isAdmin()) return;

  await updateDoc(doc(state.db, "projects", project.id), {
    status: "in_progress",
    commissionLocked: false,
    lockedCommissionSnapshot: null,
    updatedAt: serverTimestamp(),
  });

  await addProjectActivityEntry(
    project.id,
    "commission",
    "Commission reopened",
    "The commission snapshot was unlocked so the payout can be recalculated.",
  );
  showToast("Job reopened and commission unlocked.");
}

async function saveServiceTemplate(event) {
  event.preventDefault();
  if (!isAdmin()) return;

  const currentTemplate =
    currentServiceTemplateDoc() || state.serviceTemplateDraft || null;
  const payload = collectServiceTemplateFormState(currentTemplate);
  const internalName = safeString(payload.internalName);
  const clientTitle = safeString(payload.clientTitle);

  if (!internalName || !clientTitle) {
    showToast("Internal name and displayed title are required.", "error");
    return;
  }

  const templateRef = payload.id
    ? doc(state.db, "serviceTemplates", payload.id)
    : doc(collection(state.db, "serviceTemplates"));

  const nextPrice =
    toNumber(payload.defaultPrice) || serviceTemplateSubtotal(payload);

  await setDoc(
    templateRef,
    {
      id: templateRef.id,
      internalName,
      clientTitle,
      defaultPrice: nextPrice,
      defaultInvoiceLines: payload.defaultInvoiceLines,
      defaultSummary: payload.defaultSummary,
      defaultPlanningNotes: payload.defaultPlanningNotes,
      defaultPaymentRequirement:
        payload.defaultPaymentRequirement || "upfront_required",
      active: payload.active !== false,
      createdAt: currentTemplate?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  state.selectedServiceTemplateId = templateRef.id;
  state.serviceTemplateDraft = null;
  showToast(
    currentTemplate?.id ? "Service template updated." : "Service template created.",
  );
}

async function saveTemplate(event) {
  event.preventDefault();
  if (!isAdmin()) return;

  await setDoc(
    doc(state.db, "emailTemplates", "estimate-default"),
    {
      id: "estimate-default",
      name: refs.templateName.value.trim(),
      subjectTemplate: refs.templateSubject.value.trim(),
      greeting: refs.templateGreeting.value.trim(),
      intro: refs.templateIntro.value.trim(),
      outro: refs.templateOutro.value.trim(),
      terms: refs.templateTerms.value.trim() || EMPTY_TEMPLATE.terms,
      agreementTitle:
        refs.templateAgreementTitle.value.trim() ||
        EMPTY_TEMPLATE.agreementTitle,
      agreementIntro:
        refs.templateAgreementIntro.value.trim() ||
        EMPTY_TEMPLATE.agreementIntro,
      agreementTerms:
        refs.templateAgreementTerms.value.trim() ||
        EMPTY_TEMPLATE.agreementTerms,
      contractorBusinessAddress: refs.templateContractorAddress.value.trim(),
      updatedAt: serverTimestamp(),
      createdAt: state.template?.createdAt || serverTimestamp(),
    },
    { merge: true },
  );

  showToast("Estimate template saved.");
}

function resetStaffForm() {
  state.selectedStaffKey = null;
  refs.staffForm.reset();
  refs.staffEmail.readOnly = false;
  refs.staffEmail.removeAttribute("title");
  refs.staffActive.checked = true;
  refs.staffDefaultAssignee.checked = false;
  refs.staffDeleteButton.hidden = true;
  refs.staffDeleteButton.disabled = false;
  renderStaffList();
}

async function saveStaff(event) {
  event.preventDefault();
  if (!isAdmin()) return;

  const email = refs.staffEmail.value.trim().toLowerCase();
  if (!email) {
    showToast("Staff email is required.", "error");
    return;
  }

  const key = state.selectedStaffKey || sanitiseEmailKey(email);
  const existing = state.staffRoster.find((member) => member.id === key);
  const record = {
    id: key,
    email,
    displayName: refs.staffDisplayName.value.trim(),
    role: refs.staffRole.value,
    defaultLeadAssignee: refs.staffDefaultAssignee.checked,
    active: refs.staffActive.checked,
    createdAt: existing?.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (
    existing?.uid === state.profile?.uid &&
    (record.active === false || record.role !== "admin")
  ) {
    showToast(
      "Keep your own admin access active. Ask another admin to change your role or deactivate your account.",
      "error",
    );
    return;
  }

  const batch = writeBatch(state.db);
  batch.set(doc(state.db, "allowedStaff", key), record, { merge: true });

  if (existing?.uid) {
    batch.set(
      doc(state.db, "users", existing.uid),
      {
        email,
        displayName: record.displayName || existing.displayName || email,
        role: record.role,
        active: record.active,
        defaultLeadAssignee: record.defaultLeadAssignee,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  if (record.defaultLeadAssignee) {
    state.staffRoster
      .filter((member) => member.id !== key && member.defaultLeadAssignee)
      .forEach((member) => {
        batch.set(
          doc(state.db, "allowedStaff", member.id),
          {
            defaultLeadAssignee: false,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        if (member.uid) {
          batch.set(
            doc(state.db, "users", member.uid),
            {
              defaultLeadAssignee: false,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
      });
  }

  await batch.commit();

  showToast(existing ? "Staff access updated." : "Staff access created.");
  resetStaffForm();
}

async function deleteSelectedStaff() {
  if (!isAdmin() || !state.selectedStaffKey) return;
  const member = state.staffRoster.find(
    (item) => item.id === state.selectedStaffKey,
  );
  if (!member) {
    showToast("This employee record no longer exists.", "error");
    resetStaffForm();
    return;
  }
  if (member.uid && member.uid === state.profile?.uid) {
    showToast("You cannot delete your own administrator access.", "error");
    return;
  }

  const confirmed = window.confirm(
    `Delete ${member.displayName || member.email || "this employee"}? Their staff access and Google Calendar connection will be removed immediately. Historical jobs, tasks, and activity records will stay intact.`,
  );
  if (!confirmed) return;

  refs.staffDeleteButton.disabled = true;
  await apiPost("/api/staff/delete-access", { staffKey: member.id });
  resetStaffForm();
  showToast("Employee access deleted.");
}

function openLeadTasksFromRecord() {
  const lead = currentLeadDoc();
  if (!lead) {
    showToast("Save the lead first.", "error");
    return;
  }

  openTaskDrawer({
    leadId: lead.id,
    customerId: lead.customerId || null,
  });
}

function openLeadEstimatePanel() {
  const lead = currentLead();
  if (!lead?.id) {
    showToast("Save the lead first.", "error");
    return;
  }

  state.leadWorkspaceOpen = true;
  switchView("leads-view");
  renderAll();
  openLeadTab("estimate", refs.estimateSubject);
}

function focusJobTaskForm() {
  const project = currentProject();
  if (!project?.id) {
    showToast("Select a job first.", "error");
    return;
  }

  openTaskDrawer({
    projectId: project.id,
    customerId: project.customerId || null,
    leadId: project.leadId || null,
  });
}

function openCalendarEventForProject(project = currentProject()) {
  if (!project?.id) {
    showToast("Select a project first.", "error");
    return;
  }

  state.calendarProjectId = project.id;
  state.calendarScope = "all";
  switchView("calendar-view");
  renderAll();
  resetCalendarEventForm({
    projectId: project.id,
    customerId: project.customerId || "",
    leadId: project.leadId || "",
    assignedStaffUids: uniqueValues([state.profile?.uid]),
  });
  window.requestAnimationFrame(() => {
    refs.calendarTitleInput.focus();
    refs.calendarEventForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function bindRefEvent(refKey, id, eventName, handler) {
  const target = refs[refKey] || document.getElementById(id);
  if (!target || typeof target.addEventListener !== "function") {
    console.warn(`Skipped binding for ${refKey}. Missing #${id}.`);
    return null;
  }

  refs[refKey] = target;
  target.addEventListener(eventName, handler);
  return target;
}

function bindRefCollection(refKey, selector, binder) {
  const targets =
    Array.isArray(refs[refKey]) && refs[refKey].length
      ? refs[refKey]
      : Array.from(document.querySelectorAll(selector));

  refs[refKey] = targets;
  targets.forEach((target) => {
    if (!target || typeof target.addEventListener !== "function") {
      return;
    }
    binder(target);
  });
}

function handleCommandAction(target) {
  const command = target.dataset.command;
  if (!command) return;

  if (command === "start-lead-draft") {
    openLeadDrawer();
    return;
  }

  if (command === "start-task-draft") {
    openTaskDrawer({
      assignedToUid: target.dataset.taskAssigneeUid || "",
      assignedToName: target.dataset.taskAssigneeName || "",
      assignedToEmail: target.dataset.taskAssigneeEmail || "",
    });
    return;
  }

  if (command === "start-expense-draft") {
    openExpenseDrawer({ projectId: currentProject()?.id || null });
    return;
  }

  if (command === "log-communication") {
    const project = currentProject();
    const lead =
      state.activeView === "leads-view" && state.leadWorkspaceOpen
        ? currentLeadDoc()
        : null;
    openCommunicationDrawer({
      projectId: state.activeView === "jobs-view" ? project?.id || null : null,
      leadId: lead?.id || null,
    });
    return;
  }

  if (command === "start-customer-draft") {
    openCustomerDrawer();
    return;
  }

  if (command === "start-job-draft") {
    openJobDrawer();
    return;
  }

  if (command === "start-service-order") {
    openServiceOrderDrawer();
    return;
  }

  if (command === "start-vendor-draft") {
    openVendorDrawer();
    return;
  }

  if (command === "open-view") {
    const targetView = target.dataset.targetView;
    if (targetView === "leads-view" && isMobileViewport()) {
      openLeadsListSurface();
    }
    switchView(targetView);
    return;
  }

  if (command === "focus-staff") {
    applyStaffFocus(target.dataset.staffFocusUid || "");
    return;
  }

  if (command === "clear-staff-focus") {
    applyStaffFocus("");
    return;
  }

  if (command === "lead-create-task") {
    openLeadTasksFromRecord();
    return;
  }

  if (command === "lead-open-estimate") {
    openLeadEstimatePanel();
    return;
  }

  if (command === "lead-mark-won") {
    const lead = currentLeadDoc();
    if (!lead) {
      showToast("Select a lead first.", "error");
      return;
    }
    moveLeadToStatus(lead, "closed_won").catch((error) =>
      showToast(error.message, "error"),
    );
    return;
  }

  if (command === "customer-create-lead") {
    const customer = currentCustomerDoc();
    if (!customer) {
      showToast("Save the customer first.", "error");
      return;
    }
    openLeadDrawer({ customerId: customer.id });
    return;
  }

  if (command === "customer-create-task") {
    const customer = currentCustomerDoc();
    if (!customer?.id) {
      showToast("Select a customer first.", "error");
      return;
    }
    openTaskDrawer({ customerId: customer.id });
    return;
  }

  if (command === "vendor-add-bill") {
    const vendor = currentVendorDoc();
    if (!vendor?.id) {
      showToast("Select a vendor first.", "error");
      return;
    }
    openVendorTab("payables", refs.vendorBillAmountInput);
    return;
  }

  if (command === "vendor-add-document") {
    const vendor = currentVendorDoc();
    if (!vendor?.id) {
      showToast("Select a vendor first.", "error");
      return;
    }
    openVendorTab("documents", refs.vendorDocumentTitleInput);
    return;
  }

  if (command === "vendor-bill-status") {
    updateVendorBillStatus(
      target.dataset.billId,
      target.dataset.billStatus,
    ).catch((error) => showToast(error.message, "error"));
    return;
  }

  if (command === "job-create-task") {
    focusJobTaskForm();
    return;
  }

  if (command === "job-add-document") {
    const project = currentProject();
    if (!project?.id) {
      showToast("Select a job first.", "error");
      return;
    }
    openJobTab("documents", refs.jobDocumentTitle);
    return;
  }

  if (command === "job-update-client") {
    const project = currentProject();
    if (!project?.id) {
      showToast("Select a job first.", "error");
      return;
    }
    openJobTab("overview", refs.jobPhaseLabelInput);
  }
}

function handleRecordOpen(target) {
  if (target.dataset.command) {
    handleCommandAction(target);
    return;
  }

  const viewId = safeString(target.dataset.openView);
  const notificationId = safeString(target.dataset.notificationId);
  const shouldSwitchView = Boolean(viewId && viewId !== state.activeView);

  if (notificationId) {
    markNotificationsRead([notificationId]);
    state.notificationPanelOpen = false;
  }

  if (target.dataset.openTask) {
    selectTask(target.dataset.openTask);
    if (shouldSwitchView) {
      switchView(viewId);
    } else if (notificationId) {
      renderNotificationCenter();
    }
    return;
  }
  if (target.dataset.openLead) {
    selectLead(target.dataset.openLead, {
      historyMode: shouldSwitchView ? "replace" : "push",
    });
    if (shouldSwitchView) {
      switchView(viewId, { historyMode: "push" });
    } else if (notificationId) {
      renderNotificationCenter();
    }
    return;
  }
  if (target.dataset.openProject) {
    selectProject(target.dataset.openProject, {
      historyMode: shouldSwitchView ? "replace" : "push",
    });
    if (shouldSwitchView) {
      switchView(viewId, { historyMode: "push" });
    } else if (notificationId) {
      renderNotificationCenter();
    }
    return;
  }
  if (target.dataset.openCustomer) {
    selectCustomer(target.dataset.openCustomer);
    if (shouldSwitchView) {
      switchView(viewId);
    } else if (notificationId) {
      renderNotificationCenter();
    }
    return;
  }
  if (target.dataset.openVendor) {
    selectVendor(target.dataset.openVendor);
    if (shouldSwitchView) {
      switchView(viewId);
    } else if (notificationId) {
      renderNotificationCenter();
    }
    return;
  }
  if (viewId) {
    switchView(viewId);
  } else if (notificationId) {
    renderNotificationCenter();
  }
}

function bindRecordDocumentListActions(container, resolveItems) {
  if (!container) {
    return;
  }

  container.addEventListener("click", (event) => {
    const actionTarget = event.target.closest(
      "[data-record-document-open-estimate], [data-record-document-download-estimate], [data-record-document-delete]",
    );
    if (!actionTarget) {
      return;
    }

    const items = typeof resolveItems === "function" ? resolveItems() : [];
    const documentId =
      actionTarget.dataset.recordDocumentOpenEstimate ||
      actionTarget.dataset.recordDocumentDownloadEstimate ||
      actionTarget.dataset.recordDocumentDelete ||
      "";
    const documentItem = items.find((item) => item.id === documentId) || null;

    if (actionTarget.dataset.recordDocumentOpenEstimate) {
      openEstimateRecordFromDocument(
        actionTarget.dataset.leadId || documentItem?.leadId || "",
      );
      return;
    }

    if (actionTarget.dataset.recordDocumentDownloadEstimate) {
      downloadEstimatePdfForLead(
        actionTarget.dataset.leadId || documentItem?.leadId || "",
      )
        .then((mode) => {
          showToast(
            mode === "html"
              ? "PDF download failed. HTML estimate downloaded instead."
              : "Estimate PDF downloaded.",
          );
        })
        .catch((error) => showToast(error.message, "error"));
      return;
    }

    if (actionTarget.dataset.recordDocumentDelete) {
      deleteRecordDocument(documentItem).catch((error) =>
        showToast(error.message, "error"),
      );
    }
  });
}

function bindUi() {
  configureTabSemantics(refs.leadTabButtons, "leadTab", "lead-tab-");
  configureTabSemantics(refs.jobTabButtons, "jobTab", "job-tab-");
  configureTabSemantics(refs.vendorTabButtons, "vendorTab", "vendor-tab-");
  bindFormStateTracking();
  bindTaskSchedulePickers();

  refs.signInButton.addEventListener("click", async () => {
    refs.signInButton.disabled = true;
    refs.authFeedback.textContent = "Opening Google sign-in...";

    try {
      await signInWithPopup(state.auth, state.provider);
    } catch (error) {
      console.error("Google sign-in could not start.", error);
      refs.signInButton.disabled = false;
      showAuthShell(
        authErrorMessage(
          "Google sign-in could not start. Please refresh and try again.",
          error,
        ),
      );
      showToast("Google sign-in could not start.", "error");
    }
  });

  refs.signOutButton.addEventListener("click", async () => {
    await signOut(state.auth);
    showAuthShell();
  });

  refs.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (state.drawer.type) {
        closeDrawer();
      }
      if (button.dataset.view === "leads-view") {
        openLeadsListSurface();
      }
      switchView(button.dataset.view);
      renderAll();
    });
  });

  refs.mobileTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (state.drawer.type) {
        closeDrawer();
      }
      if (button.dataset.mobileView === "leads-view") {
        openLeadsListSurface();
      }
      switchView(button.dataset.mobileView);
      renderAll();
    });
  });

  refs.mobileMoreButton.addEventListener("click", () => {
    if (state.drawer.type === "mobile-more") {
      closeDrawer();
      return;
    }
    openMobileMoreDrawer();
  });

  refs.mobileActionDock?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mobile-context-action]");
    if (!button) return;
    const action = button.dataset.mobileContextAction;
    if (action === "add-lead") {
      openLeadDrawer();
      return;
    }
    if (action === "add-expense") {
      openExpenseDrawer({ projectId: currentProject()?.id || null });
      return;
    }
    if (action === "add-task") {
      if (state.activeView === "jobs-view" && currentProject()?.id) {
        focusJobTaskForm();
        return;
      }
      if (state.activeView === "leads-view" && currentLeadDoc()?.id) {
        openLeadTasksFromRecord();
        return;
      }
      openTaskDrawer();
      return;
    }
    if (action === "log-communication") {
      handleCommandAction({ dataset: { command: "log-communication" } });
      return;
    }
    if (action === "lead-open-estimate") {
      openLeadEstimatePanel();
      return;
    }
    if (action === "lead-mark-won") {
      handleCommandAction({ dataset: { command: "lead-mark-won" } });
      return;
    }
    if (action === "job-add-document") {
      handleCommandAction({ dataset: { command: "job-add-document" } });
      return;
    }
    if (action === "job-update-client") {
      handleCommandAction({ dataset: { command: "job-update-client" } });
    }
  });

  refs.mobileCreateFab.addEventListener("click", () => {
    if (state.drawer.type === "mobile-create") {
      closeDrawer();
      return;
    }
    openMobileCreateDrawer();
  });

  refs.notificationButton?.addEventListener("click", () => {
    toggleNotificationPanel();
  });

  refs.notificationMarkReadButton?.addEventListener("click", () => {
    markAllNotificationsRead();
  });

  refs.taskMobileBackButton.addEventListener("click", () => {
    clearMobileDetailForView("tasks-view");
  });

  refs.customerMobileBackButton.addEventListener("click", () => {
    clearMobileDetailForView("customers-view");
  });

  refs.jobMobileBackButton.addEventListener("click", () => {
    closeJobWorkspace();
  });

  refs.jobWorkspaceBackButton?.addEventListener("click", () => {
    closeJobWorkspace();
  });

  refs.vendorMobileBackButton.addEventListener("click", () => {
    clearMobileDetailForView("vendors-view");
  });

  Array.from(
    refs.todayScopeToggle.querySelectorAll("[data-today-scope]"),
  ).forEach((button) => {
    button.addEventListener("click", () => {
      state.todayScope = button.dataset.todayScope;
      renderAll();
    });
  });

  if (refs.staffFocusSelect) {
    refs.staffFocusSelect.addEventListener("change", (event) => {
      applyStaffFocus(event.target.value || "");
    });
  }

  [
    refs.workspaceCommandBar,
    refs.todayOverdueList,
    refs.todayDueTodayList,
    refs.todayNewLeadsList,
    refs.todayEstimatesList,
    refs.todayJobsList,
    refs.leadRecordContext,
    refs.jobRecordShell,
    refs.customerRecordContext,
    refs.jobRecordContext,
    refs.customerOpportunitiesList,
    refs.customerJobsList,
    refs.customerCurrentEstimate,
    refs.leadJobSummary,
    refs.leadTaskList,
    refs.customerTaskList,
    refs.jobTaskList,
    refs.jobCalendarList,
    refs.staffWorkloadList,
    refs.portalQueueList,
    refs.notificationList,
    refs.calendarList,
    refs.vendorRecordContext,
    refs.vendorJobList,
    refs.vendorBillList,
  ].forEach((container) => {
    container.addEventListener("click", (event) => {
      const button = event.target.closest(
        "[data-command], [data-notification-id], [data-open-view], [data-task-id], [data-open-project], [data-open-lead], [data-open-customer], [data-open-vendor]",
      );
      if (!button) return;

      if (button.dataset.taskId) {
        selectTask(button.dataset.taskId);
        switchView("tasks-view");
        return;
      }

      handleRecordOpen(button);
    });
  });

  refs.calendarList?.addEventListener("click", (event) => {
    const archiveButton = event.target.closest("[data-calendar-archive]");
    if (!archiveButton) return;
    archiveCalendarEvent(archiveButton.dataset.calendarArchive).catch((error) =>
      showToast(error.message || "Could not archive calendar event.", "error"),
    );
  });

  refs.trashList?.addEventListener("click", (event) => {
    const restoreButton = event.target.closest("[data-trash-restore]");
    if (!restoreButton) return;
    restoreArchivedRecord(
      restoreButton.dataset.trashRestore,
      restoreButton.dataset.trashId,
    ).catch((error) =>
      showToast(error.message || "Could not restore this record.", "error"),
    );
  });

  refs.taskSearchInput.addEventListener("input", (event) => {
    state.taskSearch = event.target.value || "";
    renderTaskList();
  });

  refs.taskBucketFilter.addEventListener("change", (event) => {
    state.taskBucket = event.target.value;
    renderTaskList();
  });

  refs.taskNewButton.addEventListener("click", () => {
    openTaskDrawer();
  });

  refs.taskList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-task-id]");
    if (!button) return;
    selectTask(button.dataset.taskId);
  });

  refs.taskForm.addEventListener("submit", (event) => {
    saveTask(event).catch((error) => showToast(error.message, "error"));
  });

  refs.taskLinkedTypeSelect.addEventListener("change", () => {
    renderTaskLinkedRecordOptions();
    renderTaskRelatedSummary();
  });

  refs.taskLinkedRecordSelect.addEventListener(
    "change",
    renderTaskRelatedSummary,
  );

  refs.taskCompleteButton.addEventListener("click", () => {
    markTaskComplete().catch((error) => showToast(error.message, "error"));
  });

  refs.taskResetButton.addEventListener("click", () => {
    startTaskDraft();
  });

  refs.drawerMenuList.addEventListener("click", (event) => {
    const button = event.target.closest(
      "[data-drawer-view], [data-drawer-action]",
    );
    if (!button) return;

    const drawerAction = button.dataset.drawerAction;
    if (drawerAction === "expense") {
      openExpenseDrawer();
      return;
    }
    if (drawerAction === "job") {
      openJobDrawer();
      return;
    }
    if (drawerAction === "service-order") {
      openServiceOrderDrawer();
      return;
    }
    if (drawerAction === "lead") {
      openLeadDrawer();
      return;
    }
    if (drawerAction === "task") {
      openTaskDrawer();
      return;
    }
    if (drawerAction === "communication") {
      openCommunicationDrawer();
      return;
    }
    if (drawerAction === "customer") {
      openCustomerDrawer();
      return;
    }
    if (drawerAction === "vendor") {
      openVendorDrawer();
      return;
    }

    closeDrawer();
    if (button.dataset.drawerView === "leads-view" && isMobileViewport()) {
      openLeadsListSurface();
    }
    switchView(button.dataset.drawerView);
    renderAll();
  });

  refs.drawerExpenseProjectSearch.addEventListener("input", (event) => {
    state.drawer.expenseDraft = {
      ...(state.drawer.expenseDraft || defaultExpenseDrawerDraft()),
      projectSearch: event.target.value || "",
      projectId:
        refs.drawerExpenseProject.value ||
        state.drawer.expenseDraft?.projectId ||
        null,
    };
    renderDrawerExpenseProjectOptions();
    state.drawer.expenseDraft.projectId =
      refs.drawerExpenseProject.value || null;
    renderDrawerExpenseContext();
  });

  refs.drawerExpenseProject.addEventListener("change", (event) => {
    state.drawer.expenseDraft = {
      ...(state.drawer.expenseDraft || defaultExpenseDrawerDraft()),
      projectId: event.target.value || null,
    };
    renderDrawerExpenseContext();
  });

  refs.drawerExpenseVendorSelect.addEventListener("change", () => {
    const vendor = selectedDrawerExpenseVendor();
    if (vendor) {
      refs.drawerExpenseVendor.value = vendor.name || "";
    }
  });

  refs.drawerExpenseForm.addEventListener("submit", (event) => {
    saveExpenseDrawer(event).catch((error) =>
      showToast(error.message, "error"),
    );
  });

  refs.drawerCommunicationRecordSearch.addEventListener("input", (event) => {
    state.drawer.communicationDraft = {
      ...(state.drawer.communicationDraft || defaultCommunicationDrawerDraft()),
      recordSearch: event.target.value || "",
      linkedType: refs.drawerCommunicationLinkedType.value || "lead",
      linkedId: refs.drawerCommunicationLinkedRecord.value || "",
    };
    renderDrawerCommunicationRecordOptions();
    state.drawer.communicationDraft.linkedId =
      refs.drawerCommunicationLinkedRecord.value || "";
    renderDrawerCommunicationContext();
  });

  refs.drawerCommunicationLinkedType.addEventListener("change", (event) => {
    state.drawer.communicationDraft = {
      ...(state.drawer.communicationDraft || defaultCommunicationDrawerDraft()),
      linkedType: event.target.value || "lead",
      linkedId: "",
    };
    renderDrawerCommunicationRecordOptions();
    renderDrawerCommunicationContext();
  });

  refs.drawerCommunicationLinkedRecord.addEventListener("change", () => {
    state.drawer.communicationDraft = {
      ...(state.drawer.communicationDraft || defaultCommunicationDrawerDraft()),
      linkedType: refs.drawerCommunicationLinkedType.value || "lead",
      linkedId: refs.drawerCommunicationLinkedRecord.value || "",
    };
    renderDrawerCommunicationContext();
  });

  refs.drawerCommunicationFollowUpRequired.addEventListener("change", () => {
    if (
      refs.drawerCommunicationFollowUpRequired.checked &&
      !refs.drawerCommunicationFollowUpAt.value
    ) {
      refs.drawerCommunicationFollowUpAt.value = formatDateInputValue(
        addDays(new Date(), 1),
      );
    }
  });

  refs.drawerCommunicationForm.addEventListener("submit", (event) => {
    saveCommunicationDrawer(event).catch((error) =>
      showToast(error.message, "error"),
    );
  });

  refs.drawerLeadCustomerSearch.addEventListener("input", (event) => {
    state.drawer.leadDraft = {
      ...collectDrawerLeadDraftFromInputs(),
      customerSearch: event.target.value || "",
    };
    renderDrawerLeadCustomerOptions();
  });

  refs.drawerLeadCustomerSelect.addEventListener("change", (event) => {
    applyDrawerLeadCustomerSelection(event.target.value || "");
  });

  refs.leadSearchInput.addEventListener("input", (event) => {
    state.leadSearch = event.target.value || "";
    renderLeadListShell();
  });

  refs.leadStageFilter.addEventListener("change", (event) => {
    state.leadStage = event.target.value;
    renderLeadListShell();
  });

  refs.leadLayoutButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.leadLayout = button.dataset.leadLayout;
      renderLeadListShell();
    });
  });

  refs.leadNewButton.addEventListener("click", () => {
    openLeadDrawer();
  });

  refs.leadWorkspaceBackButton.addEventListener("click", closeLeadWorkspace);

  refs.leadList.addEventListener("click", (event) => {
    const archiveButton = event.target.closest("[data-lead-archive]");
    if (archiveButton) {
      archiveLeadFromPipeline(archiveButton.dataset.leadArchive).catch(
        (error) =>
          showToast(error.message || "Could not move this lead to Trash.", "error"),
      );
      return;
    }
    const logButton = event.target.closest("[data-lead-log-communication]");
    if (logButton) {
      selectLead(logButton.dataset.leadLogCommunication, {
        preserveTab: true,
      });
      openCommunicationDrawer({ leadId: logButton.dataset.leadLogCommunication });
      return;
    }
    const button = event.target.closest("[data-lead-id]");
    if (!button) return;
    selectLead(button.dataset.leadId);
  });

  refs.leadList.addEventListener("change", (event) => {
    const stageSelect = event.target.closest("[data-lead-quick-stage]");
    if (!stageSelect) return;
    const lead = state.leads.find(
      (item) => item.id === stageSelect.dataset.leadQuickStage,
    );
    if (!lead || lead.status === stageSelect.value) return;

    const previousStatus = lead.status || "new_lead";
    stageSelect.disabled = true;
    moveLeadToStatus(lead, stageSelect.value, { source: "pipeline list" })
      .catch((error) => {
        stageSelect.value = previousStatus;
        showToast(error.message || "Could not update this lead stage.", "error");
      })
      .finally(() => {
        if (stageSelect.isConnected) {
          stageSelect.disabled = !isAdmin() && stageSelect.value === "closed_won";
        }
      });
  });

  refs.leadBoard.addEventListener("click", (event) => {
    const archiveButton = event.target.closest("[data-lead-archive]");
    if (archiveButton) {
      archiveLeadFromPipeline(archiveButton.dataset.leadArchive).catch(
        (error) =>
          showToast(error.message || "Could not move this lead to Trash.", "error"),
      );
      return;
    }
    const logButton = event.target.closest("[data-lead-log-communication]");
    if (logButton) {
      selectLead(logButton.dataset.leadLogCommunication, {
        preserveTab: true,
      });
      openCommunicationDrawer({ leadId: logButton.dataset.leadLogCommunication });
      return;
    }
    const button = event.target.closest("[data-lead-id]");
    if (!button) return;
    selectLead(button.dataset.leadId);
  });

  refs.leadBoard.addEventListener("dragstart", (event) => {
    const card = event.target.closest("[data-draggable-lead]");
    if (!card) return;
    state.dragLeadId = card.dataset.draggableLead;
    state.dragLeadOverStatus =
      card.closest("[data-lane-status]")?.dataset.laneStatus || null;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", card.dataset.draggableLead);
    markLeadBoardDragState(state.dragLeadId, state.dragLeadOverStatus);
  });

  refs.leadBoard.addEventListener("dragover", (event) => {
    const lane = event.target.closest("[data-lane-status]");
    if (!lane) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (state.dragLeadOverStatus !== lane.dataset.laneStatus) {
      state.dragLeadOverStatus = lane.dataset.laneStatus;
      markLeadBoardDragState(state.dragLeadId, state.dragLeadOverStatus);
    }
  });

  refs.leadBoard.addEventListener("dragleave", (event) => {
    const lane = event.target.closest("[data-lane-status]");
    if (!lane) return;
    if (lane.contains(event.relatedTarget)) return;
    if (state.dragLeadOverStatus === lane.dataset.laneStatus) {
      state.dragLeadOverStatus = null;
      markLeadBoardDragState(state.dragLeadId, null);
    }
  });

  refs.leadBoard.addEventListener("drop", (event) => {
    const lane = event.target.closest("[data-lane-status]");
    if (!lane) return;
    event.preventDefault();
    const leadId = event.dataTransfer.getData("text/plain") || state.dragLeadId;
    const lead = state.leads.find((item) => item.id === leadId);
    state.dragLeadId = null;
    state.dragLeadOverStatus = null;
    clearLeadBoardDragClasses();
    if (!lead) return;
    moveLeadToStatus(lead, lane.dataset.laneStatus, { source: "drag" }).catch(
      (error) => showToast(error.message, "error"),
    );
  });

  refs.leadBoard.addEventListener("dragend", () => {
    state.dragLeadId = null;
    state.dragLeadOverStatus = null;
    clearLeadBoardDragClasses();
  });

  refs.leadCoreForm.addEventListener("submit", (event) => {
    saveLead(event).catch((error) => showToast(error.message, "error"));
  });

  refs.leadCreateTaskButton.addEventListener("click", openLeadTasksFromRecord);
  refs.leadTaskDrawerButton.addEventListener("click", openLeadTasksFromRecord);

  refs.leadMarkLostButton.addEventListener("click", () => {
    const lead = currentLeadDoc();
    if (!lead) return;
    moveLeadToStatus(lead, "closed_lost", { source: "button" }).catch((error) =>
      showToast(error.message, "error"),
    );
  });

  refs.leadMarkWonButton.addEventListener("click", () => {
    const lead = currentLeadDoc();
    if (!lead) return;
    moveLeadToStatus(lead, "closed_won", { source: "button" }).catch((error) =>
      showToast(error.message, "error"),
    );
  });

  refs.leadArchiveButton?.addEventListener("click", () => {
    archiveCurrentLead().catch((error) =>
      showToast(error.message || "Could not archive this lead.", "error"),
    );
  });

  refs.leadTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      openLeadTab(button.dataset.leadTab);
    });
  });

  refs.noteForm.addEventListener("submit", (event) => {
    addNote(event).catch((error) => showToast(error.message, "error"));
  });

  refs.leadDocumentForm.addEventListener("submit", (event) => {
    saveLeadDocument(event).catch((error) => showToast(error.message, "error"));
  });

  refs.leadDocumentSourceType.addEventListener(
    "change",
    renderLeadDocumentSourceFields,
  );

  refs.estimateForm.addEventListener("input", (event) => {
    if (event.target === refs.estimateShareLinkInput) {
      return;
    }
    markEstimateDirty();
  });
  refs.estimateForm.addEventListener("change", (event) => {
    if (event.target === refs.estimateShareLinkInput) {
      return;
    }
    markEstimateDirty();
  });

  refs.estimateForm.addEventListener("submit", (event) => {
    saveEstimateDraft(event).catch((error) =>
      showToast(error.message, "error"),
    );
  });

  refs.estimateAiButton.addEventListener("click", () => {
    createEstimateDraft().catch((error) => showToast(error.message, "error"));
  });

  refs.estimateShareCreateButton.addEventListener("click", () => {
    createEstimateShareLink().catch((error) =>
      showToast(error.message, "error"),
    );
  });

  refs.estimateShareCopyButton.addEventListener("click", () => {
    copyEstimateShareLink().catch((error) => showToast(error.message, "error"));
  });

  refs.estimateShareRevokeButton.addEventListener("click", () => {
    revokeEstimateShareLink().catch((error) =>
      showToast(error.message, "error"),
    );
  });

  refs.leadEstimateClientList.addEventListener("click", (event) => {
    const focusButton = event.target.closest(
      "[data-estimate-review-publish-focus]",
    );
    if (focusButton) {
      refs.estimateSharePanel.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      queueFocus(refs.estimateShareCreateButton);
      return;
    }

    const customerButton = event.target.closest("[data-open-customer]");
    if (customerButton?.dataset.openCustomer) {
      selectCustomer(customerButton.dataset.openCustomer);
      switchView(customerButton.dataset.openView || "customers-view");
      return;
    }

    const actionButton = event.target.closest("[data-customer-portal-action]");
    if (!actionButton) {
      return;
    }
    handleCustomerPortalPublishingAction(actionButton).catch((error) =>
      showToast(error.message, "error"),
    );
  });

  refs.estimateAddLineButton.addEventListener("click", () => {
    addEstimateLineItem();
  });

  refs.estimateMobileAddLineButton?.addEventListener("click", () => {
    addEstimateLineItem();
  });

  refs.estimateCopyButton.addEventListener("click", () => {
    copyEstimateToClipboard().catch((error) =>
      showToast(error.message, "error"),
    );
  });

  refs.estimatePrintButton.addEventListener("click", openEstimatePrintView);
  refs.estimateMobileDownloadButton?.addEventListener(
    "click",
    openEstimatePrintView,
  );
  refs.estimatePreviewToggle?.addEventListener("click", () => {
    const panel = refs.estimatePreviewToggle.closest(".estimate-preview-panel");
    const collapsed = !panel.classList.toggle("is-preview-collapsed");
    refs.estimatePreviewToggle.setAttribute("aria-expanded", String(collapsed));
    refs.estimatePreviewToggle.textContent = collapsed
      ? "Hide preview"
      : "Show preview";
  });
  refs.estimateSubject.addEventListener("input", updateEstimatePreview);
  refs.estimateBody.addEventListener("input", updateEstimatePreview);
  refs.estimateStartDate.addEventListener("input", updateEstimatePreview);
  refs.estimateCompletionDate.addEventListener("input", updateEstimatePreview);
  refs.estimatePaymentSchedule.addEventListener("input", updateEstimatePreview);
  refs.estimateSpecialOrderMaterials.addEventListener(
    "input",
    updateEstimatePreview,
  );
  refs.estimateKnownSubcontractors.addEventListener(
    "input",
    updateEstimatePreview,
  );
  refs.estimateAssumptions.addEventListener("input", updateEstimatePreview);

  refs.customerSearchInput.addEventListener("input", (event) => {
    state.customerSearch = event.target.value || "";
    renderCustomerList();
  });

  refs.customerNewButton.addEventListener("click", openCustomerDrawer);
  refs.customerList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-customer-id]");
    if (!button) return;
    selectCustomer(button.dataset.customerId);
  });

  refs.customerForm.addEventListener("submit", (event) => {
    saveCustomer(event).catch((error) => showToast(error.message, "error"));
  });

  refs.customerDocumentForm.addEventListener("submit", (event) => {
    saveCustomerDocument(event).catch((error) =>
      showToast(error.message, "error"),
    );
  });

  refs.customerDocumentSourceType.addEventListener(
    "change",
    renderCustomerDocumentSourceFields,
  );
  refs.customerDocumentTargetSelect.addEventListener("change", () => {
    refs.customerDocumentForm.querySelector("button").disabled =
      !refs.customerDocumentTargetSelect.value;
  });
  refs.customerPortalContactForm.addEventListener("submit", (event) => {
    saveCustomerPortalContact(event).catch((error) =>
      showToast(error.message, "error"),
    );
  });
  refs.customerPortalContactResetButton.addEventListener("click", () => {
    resetCustomerPortalContactForm();
    renderCustomerPortalContactList(currentCustomer());
  });
  refs.customerPortalContactList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-portal-contact-action]");
    if (!button) return;
    const contact =
      state.customerPortalContacts.find(
        (entry) => entry.id === button.dataset.contactId,
      ) || null;
    if (!contact) return;

    const action = button.dataset.portalContactAction;
    if (action === "edit") {
      selectCustomerPortalContact(contact.id);
      return;
    }

    runCustomerPortalInviteAction(action, contact).catch((error) =>
      showToast(error.message, "error"),
    );
  });
  [
    refs.customerPortalEstimateList,
    refs.customerPortalInvoiceList,
    refs.customerPortalChangeOrderList,
    refs.customerPortalDocumentList,
  ].forEach((target) => {
    target.addEventListener("click", (event) => {
      const leadButton = event.target.closest("[data-open-lead]");
      if (leadButton) {
        selectLead(leadButton.dataset.openLead, {
          openWorkspace: true,
          preserveTab: true,
        });
        switchView(leadButton.dataset.openView || "leads-view");
        return;
      }

      const projectButton = event.target.closest("[data-open-project]");
      if (projectButton) {
        selectProject(projectButton.dataset.openProject, {
          historyMode: "replace",
        });
        switchView(projectButton.dataset.openView || "jobs-view", {
          historyMode: "push",
        });
        return;
      }

      const actionButton = event.target.closest("[data-customer-portal-action]");
      if (!actionButton) return;
      handleCustomerPortalPublishingAction(actionButton).catch((error) =>
        showToast(error.message, "error"),
      );
    });
  });
  refs.customerPortalThreadList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-portal-thread-id]");
    if (!button) return;
    selectCustomerPortalThread(button.dataset.portalThreadId).catch((error) =>
      showToast(error.message, "error"),
    );
  });
  refs.customerPortalMessageForm.addEventListener("submit", (event) => {
    saveCustomerPortalMessage(event).catch((error) =>
      showToast(error.message, "error"),
    );
  });
  refs.customerPortalMarkReadButton.addEventListener("click", () => {
    markCustomerPortalThreadRead().catch((error) =>
      showToast(error.message, "error"),
    );
  });

  refs.customerCreateLeadButton.addEventListener("click", () => {
    const customer = currentCustomerDoc();
    if (!customer) {
      showToast("Save the customer first.", "error");
      return;
    }
    openLeadDrawer({ customerId: customer.id });
  });

  refs.customerTaskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const customer = currentCustomerDoc();
    if (!customer) {
      showToast("Save the customer first.", "error");
      return;
    }

    const schedule = readTaskSchedule("customer");
    if (!schedule.valid) {
      renderTaskSchedulePreview("customer", schedule.error);
      showToast(schedule.error, "error");
      refs.customerTaskDueDate.focus();
      return;
    }

    const created = await createQuickTask({
      title: refs.customerTaskTitle.value,
      dueAt: schedule.value,
      priority: refs.customerTaskPriority.value,
      assigneeSelect: refs.customerTaskAssignee,
      customerId: customer.id,
    });

    if (created) {
      refs.customerTaskForm.reset();
      refs.customerTaskPriority.value = "high";
      setTaskScheduleValue("customer", null);
      renderTaskAssigneeOptions(
        refs.customerTaskAssignee,
        state.profile?.uid || "",
      );
    }
  });

  refs.vendorSearchInput.addEventListener("input", (event) => {
    state.vendorSearch = event.target.value || "";
    renderVendorList();
  });

  refs.vendorTradeFilter.addEventListener("change", (event) => {
    state.vendorTrade = event.target.value || "all";
    renderVendorList();
  });

  refs.vendorStatusFilter.addEventListener("change", (event) => {
    state.vendorStatus = event.target.value || "active_only";
    renderVendorList();
  });

  refs.vendorBillFilter.addEventListener("change", (event) => {
    state.vendorBillState = event.target.value || "all";
    renderVendorList();
  });

  refs.vendorNewButton.addEventListener("click", () => {
    openVendorDrawer();
  });

  refs.vendorList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-vendor-id]");
    if (!button) return;
    selectVendor(button.dataset.vendorId);
  });

  refs.vendorForm.addEventListener("submit", (event) => {
    saveVendor(event).catch((error) => showToast(error.message, "error"));
  });

  refs.vendorTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      openVendorTab(button.dataset.vendorTab);
    });
  });

  refs.vendorAddBillButton.addEventListener("click", () => {
    if (!currentVendorDoc()) {
      showToast("Select a vendor first.", "error");
      return;
    }
    openVendorTab("payables", refs.vendorBillAmountInput);
  });

  refs.vendorAddDocumentButton.addEventListener("click", () => {
    if (!currentVendorDoc()) {
      showToast("Select a vendor first.", "error");
      return;
    }
    openVendorTab("documents", refs.vendorDocumentTitleInput);
  });

  refs.vendorBillForm.addEventListener("submit", (event) => {
    saveVendorBill(event).catch((error) => showToast(error.message, "error"));
  });

  refs.vendorDocumentForm.addEventListener("submit", (event) => {
    saveVendorDocument(event).catch((error) =>
      showToast(error.message, "error"),
    );
  });

  refs.vendorDocumentList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-vendor-document-delete]");
    if (!button) return;
    const documentItem =
      state.vendorDocuments.find(
        (item) => item.id === button.dataset.vendorDocumentDelete,
      ) || null;
    deleteVendorDocument(documentItem).catch((error) =>
      showToast(error.message, "error"),
    );
  });

  refs.vendorBillSourceTypeInput.addEventListener(
    "change",
    renderVendorBillSourceFields,
  );
  refs.vendorDocumentSourceTypeInput.addEventListener(
    "change",
    renderVendorDocumentSourceFields,
  );
  refs.vendorDocumentCategoryInput.addEventListener(
    "change",
    renderVendorDocumentAccessDefaults,
  );

  bindRefEvent("jobSearchInput", "job-search-input", "input", (event) => {
    state.jobSearch = event.target.value || "";
    if (!syncSelectedProjectWithJobFilters()) {
      renderJobList();
    }
  });

  bindRefCollection("jobStatusFilterButtons", "[data-job-status-filter]", (button) => {
    button.addEventListener("click", () => {
      state.jobStatus = button.dataset.jobStatusFilter || "active";
      if (!syncSelectedProjectWithJobFilters()) {
        renderJobList();
      }
    });
  });

  bindRefEvent(
    "calendarScopeFilter",
    "calendar-scope-filter",
    "change",
    (event) => {
      state.calendarScope = event.target.value || "upcoming";
      renderCalendarView();
    },
  );

  bindRefEvent(
    "calendarStatusFilter",
    "calendar-status-filter",
    "change",
    (event) => {
      state.calendarStatus = event.target.value || "all";
      renderCalendarView();
    },
  );

  bindRefEvent(
    "calendarStaffFilter",
    "calendar-staff-filter",
    "change",
    (event) => {
      state.calendarStaffUid = event.target.value || "";
      renderCalendarView();
    },
  );

  bindRefEvent(
    "calendarProjectFilter",
    "calendar-project-filter",
    "change",
    (event) => {
      state.calendarProjectId = event.target.value || "";
      renderCalendarView();
    },
  );

  bindRefEvent(
    "calendarLinkedCustomerSelect",
    "calendar-linked-customer-select",
    "change",
    () => {
      renderCalendarFormOptions();
    },
  );

  bindRefEvent(
    "calendarLinkedProjectSelect",
    "calendar-linked-project-select",
    "change",
    (event) => {
      const project = state.projects.find(
        (item) => item.id === (event.target.value || ""),
      );
      if (project) {
        refs.calendarLinkedCustomerSelect.value = project.customerId || "";
        refs.calendarLinkedLeadSelect.value = project.leadId || "";
      }
      renderCalendarFormOptions();
      refs.calendarLinkedProjectSelect.value = project?.id || "";
      if (project?.leadId) {
        refs.calendarLinkedLeadSelect.value = project.leadId;
      }
    },
  );

  bindRefEvent(
    "calendarLinkedLeadSelect",
    "calendar-linked-lead-select",
    "change",
    (event) => {
      const lead = state.leads.find(
        (item) => item.id === (event.target.value || ""),
      );
      if (lead?.customerId) {
        refs.calendarLinkedCustomerSelect.value = lead.customerId;
        renderCalendarFormOptions();
        refs.calendarLinkedLeadSelect.value = lead.id;
      }
    },
  );

  bindRefEvent(
    "googleCalendarConnectButton",
    "google-calendar-connect-button",
    "click",
    () => {
      connectGoogleCalendar().catch((error) =>
        showToast(error.message, "error"),
      );
    },
  );

  bindRefEvent(
    "googleCalendarDisconnectButton",
    "google-calendar-disconnect-button",
    "click",
    () => {
      disconnectGoogleCalendar().catch((error) =>
        showToast(error.message, "error"),
      );
    },
  );

  bindRefEvent(
    "calendarEventForm",
    "calendar-event-form",
    "submit",
    (event) => {
      saveCalendarEvent(event).catch((error) =>
        showToast(error.message || "Could not save calendar event.", "error"),
      );
    },
  );

  bindRefEvent("calendarResetButton", "calendar-reset-button", "click", () => {
    resetCalendarEventForm({ projectId: state.calendarProjectId });
  });

  bindRefEvent("jobNewButton", "job-new-button", "click", () => {
    openJobDrawer();
  });

  bindRefEvent(
    "jobScopeImportButton",
    "job-scope-import-button",
    "click",
    () => {
      importProjectScopeFromEstimate().catch((error) =>
        showToast(error.message, "error"),
      );
    },
  );

  bindRefEvent("jobScopeList", "job-scope-list", "change", (event) => {
    const checkbox = event.target.closest("[data-scope-complete]");
    if (!checkbox) return;
    toggleProjectScopeComplete(
      checkbox.dataset.scopeComplete,
      checkbox.checked,
    ).catch((error) => showToast(error.message, "error"));
  });

  bindRefEvent("jobScopeList", "job-scope-list", "click", (event) => {
    const button = event.target.closest("[data-scope-save]");
    if (!button) return;
    saveProjectScopeNote(button.dataset.scopeSave).catch((error) =>
      showToast(error.message, "error"),
    );
  });

  bindRefEvent("jobScopeList", "job-scope-list", "keydown", (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") {
      return;
    }

    const noteField = event.target.closest("[data-scope-note]");
    if (!noteField) return;
    event.preventDefault();
    saveProjectScopeNote(noteField.dataset.scopeNote).catch((error) =>
      showToast(error.message, "error"),
    );
  });

  bindRefEvent("jobList", "job-list", "click", (event) => {
    const button = event.target.closest("[data-project-id]");
    if (!button) return;
    selectProject(button.dataset.projectId);
  });

  bindRefEvent(
    "jobProjectSwitcherSelect",
    "job-project-switcher-select",
    "change",
    (event) => {
      if (event.target.value) {
        selectProject(event.target.value);
      }
    },
  );

  bindRefEvent("jobCoreForm", "job-core-form", "submit", (event) => {
    saveProject(event).catch((error) => showToast(error.message, "error"));
  });

  bindRefEvent("jobStatusSelect", "job-status-select", "change", () => {
    changeCurrentProjectStatus().catch((error) => {
      const project = currentProject();
      if (project) {
        refs.jobStatusSelect.value = project.status || "in_progress";
        refs.jobStatusSelect.disabled = !isAdmin();
      }
      showToast(error.message || "Could not change the job status.", "error");
    });
  });

  bindRefCollection("jobTabButtons", "[data-job-tab]", (button) => {
    button.addEventListener("click", () => {
      openJobTab(button.dataset.jobTab);
    });
  });

  bindRefEvent("jobOpenLeadButton", "job-open-lead-button", "click", () => {
    const project = currentProject();
    if (!project?.leadId) return;
    selectLead(project.leadId);
    switchView("leads-view");
  });

  bindRefEvent(
    "jobOpenEstimateButton",
    "job-open-estimate-button",
    "click",
    () => {
      if (!currentProject()) {
        showToast("Select a job first.", "error");
        return;
      }
      openJobTab("estimate", refs.jobEstimatePreview);
    },
  );

  bindRefEvent(
    "jobEstimateOpenLeadButton",
    "job-estimate-open-lead-button",
    "click",
    () => {
      const project = currentProject();
      if (!project?.leadId) {
        showToast("This job does not have a linked lead estimate yet.", "error");
        return;
      }
      selectLead(project.leadId, { preserveTab: true, openWorkspace: true });
      switchView("leads-view");
      openLeadTab("estimate", refs.estimateSubject);
    },
  );

  bindRefEvent(
    "jobEstimateDownloadButton",
    "job-estimate-download-button",
    "click",
    () => {
      const project = currentProject();
      if (!project?.leadId) {
        showToast("This job does not have a linked estimate to download.", "error");
        return;
      }
      downloadEstimatePdfForLead(project.leadId).catch((error) =>
        showToast(error.message, "error"),
      );
    },
  );

  bindRefEvent("jobEstimateActions", "job-estimate-actions", "click", (event) => {
    const leadButton = event.target.closest("[data-open-lead]");
    if (!leadButton) return;
    selectLead(leadButton.dataset.openLead, {
      openWorkspace: true,
      preserveTab: true,
    });
    switchView(leadButton.dataset.openView || "leads-view");
    openLeadTab("estimate", refs.estimateSubject);
  });

  bindRefEvent(
    "jobCalendarFocusButton",
    "job-calendar-focus-button",
    "click",
    () => {
      const project = currentProject();
      if (!project?.id) {
        showToast("Select a job first.", "error");
        return;
      }
      state.calendarProjectId = project.id;
      state.calendarScope = "all";
      switchView("calendar-view");
      renderAll();
    },
  );

  bindRefEvent(
    "jobWorkCalendarButton",
    "job-work-calendar-button",
    "click",
    () => {
      openCalendarEventForProject();
    },
  );

  bindRefEvent(
    "jobAddCalendarButton",
    "job-add-calendar-button",
    "click",
    () => {
      openCalendarEventForProject();
    },
  );

  bindRefEvent("jobCompleteButton", "job-complete-button", "click", () => {
    completeCurrentProject().catch((error) => {
      refs.jobCompleteButton.disabled = false;
      showToast(error.message || "Could not complete this job.", "error");
    });
  });

  bindRefEvent("jobDeleteButton", "job-delete-button", "click", () => {
    archiveCurrentProject().catch((error) =>
      showToast(error.message || "Could not archive this job.", "error"),
    );
  });

  bindRefEvent("jobAddExpenseButton", "job-add-expense-button", "click", () => {
    if (!currentProject()) {
      showToast("Select a job first.", "error");
      return;
    }
    if (isMobileViewport()) {
      openExpenseDrawer({ projectId: currentProject().id });
      return;
    }
    openJobTab("financials", refs.expenseAmount);
  });

  bindRefEvent(
    "jobAddChangeOrderButton",
    "job-add-change-order-button",
    "click",
    () => {
      if (!currentProject()) {
        showToast("Select a job first.", "error");
        return;
      }
      openJobTab("financials", refs.changeOrderTitle);
    },
  );

  bindRefEvent(
    "jobChangeOrderFocusButton",
    "job-change-order-focus-button",
    "click",
    () => {
      if (!currentProject()) {
        showToast("Select a job first.", "error");
        return;
      }
      openJobTab("financials", refs.changeOrderTitle);
    },
  );

  bindRefEvent("jobAddPaymentButton", "job-add-payment-button", "click", () => {
    if (!currentProject()) {
      showToast("Select a job first.", "error");
      return;
    }
    openJobTab("financials", refs.paymentAmount);
  });

  bindRefEvent("jobAddInvoiceButton", "job-add-invoice-button", "click", () => {
    if (!currentProject()) {
      showToast("Select a job first.", "error");
      return;
    }
    startProjectInvoiceDraft();
    openJobTab("invoices", refs.invoiceTitle);
  });

  bindRefEvent(
    "jobNewServiceOrderButton",
    "job-new-service-order-button",
    "click",
    () => {
      openServiceOrderDrawer();
    },
  );

  bindRefEvent(
    "jobAddDocumentButton",
    "job-add-document-button",
    "click",
    () => {
      if (!currentProject()) {
        showToast("Select a job first.", "error");
        return;
      }
      openJobTab("documents", refs.jobDocumentTitle);
    },
  );

  bindRefEvent(
    "jobGenerateCloseoutButton",
    "job-generate-closeout-button",
    "click",
    () => {
      createJobCloseoutPacket().catch((error) =>
        showToast(error.message, "error"),
      );
    },
  );

  bindRefEvent("jobAddNoteButton", "job-add-note-button", "click", () => {
    if (!currentProject()) {
      showToast("Select a job first.", "error");
      return;
    }
    openJobTab("history", refs.jobNoteBody);
  });

  bindRefEvent(
    "jobTaskDrawerButton",
    "job-task-drawer-button",
    "click",
    focusJobTaskForm,
  );

  bindRefEvent("expenseForm", "expense-form", "submit", (event) => {
    addExpense(event).catch((error) => showToast(error.message, "error"));
  });

  bindRefEvent(
    "expenseResetButton",
    "expense-reset-button",
    "click",
    resetExpenseForm,
  );

  bindRefEvent("expenseVendorSelect", "expense-vendor-select", "change", () => {
    const vendor = selectedExpenseVendor();
    if (vendor) {
      refs.expenseVendor.value = vendor.name || "";
    }
  });

  bindRefEvent("paymentForm", "payment-form", "submit", (event) => {
    addPayment(event).catch((error) => showToast(error.message, "error"));
  });

  bindRefEvent(
    "paymentGenerateReceipt",
    "payment-generate-receipt",
    "change",
    () => {
      if (!refs.paymentGenerateReceipt.checked) {
        refs.paymentSendReceipt.checked = false;
      }
    },
  );

  bindRefEvent(
    "paymentSendReceipt",
    "payment-send-receipt",
    "change",
    () => {
      if (refs.paymentSendReceipt.checked) {
        refs.paymentGenerateReceipt.checked = true;
      }
    },
  );

  bindRefEvent("paymentList", "payment-list", "click", (event) => {
    const downloadButton = event.target.closest(
      "[data-payment-receipt-download]",
    );
    if (downloadButton) {
      const payment = state.projectPayments.find(
        (entry) => entry.id === downloadButton.dataset.paymentReceiptDownload,
      );
      downloadPaymentReceipt(payment, downloadButton).catch((error) =>
        showToast(error.message, "error"),
      );
      return;
    }

    const sendButton = event.target.closest("[data-payment-receipt-send]");
    if (!sendButton) return;
    const payment = state.projectPayments.find(
      (entry) => entry.id === sendButton.dataset.paymentReceiptSend,
    );
    saveAndSharePaymentReceipt(payment, sendButton).catch((error) =>
      showToast(error.message, "error"),
    );
  });

  bindRefEvent("jobInvoiceList", "job-invoice-list", "click", (event) => {
    const button = event.target.closest("[data-project-invoice-id]");
    if (!button) return;
    selectProjectInvoice(button.dataset.projectInvoiceId);
  });

  bindRefEvent("invoiceNewButton", "invoice-new-button", "click", () => {
    startProjectInvoiceDraft();
    openJobTab("invoices", refs.invoiceTitle);
  });

  bindRefEvent(
    "invoiceImportEstimateButton",
    "invoice-import-estimate-button",
    "click",
    () => {
      importInvoiceLinesFromEstimate().catch((error) =>
        showToast(error.message, "error"),
      );
    },
  );

  bindRefEvent(
    "invoiceAddLineButton",
    "invoice-add-line-button",
    "click",
    () => {
      const lines = collectInvoiceForm().lineItems;
      lines.push({ label: "", description: "", amount: "" });
      renderInvoiceLines(lines, isAdmin());
      syncProjectInvoiceDraftFromForm();
    },
  );

  bindRefEvent(
    "invoiceAddCustomFieldButton",
    "invoice-add-custom-field-button",
    "click",
    () => {
      const fields = collectInvoiceForm().customFields;
      fields.push({ label: "", value: "" });
      renderInvoiceCustomFields(fields, isAdmin());
      syncProjectInvoiceDraftFromForm();
    },
  );

  bindRefEvent("invoiceForm", "invoice-form", "submit", saveProjectInvoice);

  bindRefEvent(
    "invoiceGenerateLinkButton",
    "invoice-generate-link-button",
    "click",
    () => {
      generateServiceCheckoutLink().catch((error) =>
        showToast(error.message, "error"),
      );
    },
  );

  bindRefEvent("invoiceCopyLinkButton", "invoice-copy-link-button", "click", () => {
    copyServiceCheckoutLink().catch((error) =>
      showToast(error.message, "error"),
    );
  });

  bindRefEvent(
    "invoiceMarkPaidButton",
    "invoice-mark-paid-button",
    "click",
    () => {
      markInvoicePaid().catch((error) => showToast(error.message, "error"));
    },
  );

  bindRefEvent(
    "invoiceDownloadButton",
    "invoice-download-button",
    "click",
    () => {
      downloadInvoicePdf("invoice").catch((error) =>
        showToast(error.message, "error"),
      );
    },
  );

  bindRefEvent(
    "invoiceReceiptButton",
    "invoice-receipt-button",
    "click",
    () => {
      downloadInvoicePdf("receipt").catch((error) =>
        showToast(error.message, "error"),
      );
    },
  );

  bindRefEvent(
    "invoiceSendReceiptButton",
    "invoice-send-receipt-button",
    "click",
    () => {
      saveAndShareInvoiceReceipt().catch((error) =>
        showToast(error.message, "error"),
      );
    },
  );

  [
    "invoiceTitle",
    "invoiceNumber",
    "invoiceIssueDate",
    "invoiceDueDate",
    "invoiceSummary",
    "invoiceNotes",
    "invoicePaidDate",
    "invoicePaymentMethod",
    "invoicePaymentReference",
    "invoicePaymentNote",
  ].forEach((key) => {
    const field = refs[key];
    if (!field) return;
    field.addEventListener("input", () => {
      syncProjectInvoiceDraftFromForm();
    });
    field.addEventListener("change", () => {
      syncProjectInvoiceDraftFromForm();
    });
  });

  bindRefEvent("changeOrderForm", "change-order-form", "submit", (event) => {
    addChangeOrder(event).catch((error) => showToast(error.message, "error"));
  });

  bindRefEvent(
    "changeOrderResetButton",
    "change-order-reset-button",
    "click",
    resetChangeOrderForm,
  );

  bindRefEvent("changeOrderList", "change-order-list", "click", (event) => {
    const editButton = event.target.closest("[data-project-change-order-edit]");
    if (editButton) {
      const changeOrder =
        state.projectChangeOrders.find(
          (entry) => entry.id === editButton.dataset.projectChangeOrderEdit,
        ) || null;
      if (changeOrder) {
        startChangeOrderEdit(changeOrder);
      }
      return;
    }

    const deleteButton = event.target.closest(
      "[data-project-change-order-delete]",
    );
    if (deleteButton) {
      deleteProjectChangeOrder(
        deleteButton.dataset.projectChangeOrderDelete,
      ).catch((error) => showToast(error.message, "error"));
    }
  });

  bindRefEvent("expenseList", "expense-list", "click", (event) => {
    const editButton = event.target.closest("[data-project-expense-edit]");
    if (editButton) {
      const expense =
        state.projectExpenses.find(
          (entry) => entry.id === editButton.dataset.projectExpenseEdit,
        ) || null;
      if (expense) {
        startExpenseEdit(expense);
      }
      return;
    }

    const deleteButton = event.target.closest("[data-project-expense-delete]");
    if (deleteButton) {
      deleteProjectExpense(deleteButton.dataset.projectExpenseDelete).catch(
        (error) => showToast(error.message, "error"),
      );
    }
  });

  bindRefEvent("jobNoteForm", "job-note-form", "submit", (event) => {
    addJobNote(event).catch((error) => showToast(error.message, "error"));
  });

  bindRefEvent("jobDocumentForm", "job-document-form", "submit", (event) => {
    saveJobDocument(event).catch((error) => showToast(error.message, "error"));
  });

  bindRefEvent(
    "jobDocumentSourceType",
    "job-document-source-type",
    "change",
    renderJobDocumentSourceFields,
  );

  bindRefEvent(
    "jobReopenUnlockButton",
    "job-reopen-unlock-button",
    "click",
    () => {
      reopenAndUnlockCommission().catch((error) =>
        showToast(error.message, "error"),
      );
    },
  );

  refs.staffList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-staff-key]");
    if (!button || !isAdmin()) return;
    const member = state.staffRoster.find(
      (item) => item.id === button.dataset.staffKey,
    );
    if (!member) return;
    state.selectedStaffKey = member.id;
    refs.staffEmail.value = member.email || "";
    refs.staffEmail.readOnly = true;
    refs.staffEmail.title =
      "Email identifies this staff account and cannot be changed after access is created.";
    refs.staffDisplayName.value = member.displayName || "";
    refs.staffRole.value = member.role || "employee";
    refs.staffDefaultAssignee.checked = Boolean(member.defaultLeadAssignee);
    refs.staffActive.checked = member.active !== false;
    refs.staffDeleteButton.hidden = member.uid === state.profile?.uid;
    refs.staffDeleteButton.disabled = false;
    state.activeAdminSection = "team";
    renderStaffList();
    renderAdminSectionState();
    refs.staffForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  refs.adminSectionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.activeAdminSection = button.dataset.adminSection || "team";
      renderAdminSectionState();
      refs.staffAdminShell
        ?.closest(".record-shell")
        ?.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  refs.staffForm.addEventListener("submit", (event) => {
    saveStaff(event).catch((error) => showToast(error.message, "error"));
  });

  refs.staffFormReset.addEventListener("click", resetStaffForm);
  refs.staffDeleteButton.addEventListener("click", () => {
    deleteSelectedStaff().catch((error) => {
      refs.staffDeleteButton.disabled = false;
      showToast(error.message || "Could not delete employee access.", "error");
    });
  });
  bindRefEvent(
    "staffClearFocusButton",
    "staff-clear-focus-button",
    "click",
    () => {
      applyStaffFocus("");
    },
  );

  refs.templateForm.addEventListener("submit", (event) => {
    saveTemplate(event).catch((error) => showToast(error.message, "error"));
  });

  refs.serviceTemplateList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-service-template-id]");
    if (!button || !isAdmin()) return;
    state.selectedServiceTemplateId = button.dataset.serviceTemplateId || null;
    state.serviceTemplateDraft = null;
    renderServiceTemplateManager();
  });

  refs.serviceTemplateForm.addEventListener("submit", (event) => {
    saveServiceTemplate(event).catch((error) =>
      showToast(error.message, "error"),
    );
  });

  refs.serviceTemplateForm.addEventListener("input", () => {
    if (!isAdmin()) return;
    state.serviceTemplateDraft = collectServiceTemplateFormState(
      currentServiceTemplateDoc() || state.serviceTemplateDraft,
    );
  });

  refs.serviceTemplateForm.addEventListener("change", () => {
    if (!isAdmin()) return;
    state.serviceTemplateDraft = collectServiceTemplateFormState(
      currentServiceTemplateDoc() || state.serviceTemplateDraft,
    );
  });

  refs.serviceTemplateAddLineButton.addEventListener("click", () => {
    const nextTemplate = collectServiceTemplateFormState(
      currentServiceTemplateDoc() || state.serviceTemplateDraft,
    );
    nextTemplate.defaultInvoiceLines.push({
      label: "",
      description: "",
      amount: 0,
    });
    state.serviceTemplateDraft = normaliseServiceTemplateDoc(nextTemplate);
    renderServiceTemplateManager();
  });

  refs.serviceTemplateNewButton.addEventListener("click", () => {
    state.selectedServiceTemplateId = null;
    state.serviceTemplateDraft = blankServiceTemplateDraft();
    renderServiceTemplateManager();
    queueFocus(refs.serviceTemplateName);
  });

  refs.serviceTemplateResetButton.addEventListener("click", () => {
    state.serviceTemplateDraft = null;
    renderServiceTemplateManager();
  });

  bindRecordDocumentListActions(
    refs.leadDocumentList,
    () => state.leadDocuments,
  );
  bindRecordDocumentListActions(
    refs.customerDocumentList,
    () => state.customerDocuments,
  );
  bindRecordDocumentListActions(
    refs.jobDocumentList,
    () => state.projectDocuments,
  );

  refs.drawerCloseButton.addEventListener("click", closeDrawer);
  refs.drawerBackdrop.addEventListener("click", closeDrawer);
  refs.drawerCancelButtons.forEach((button) => {
    button.addEventListener("click", closeDrawer);
  });

  refs.drawerLeadForm.addEventListener("submit", (event) => {
    saveLeadDrawer(event).catch((error) => showToast(error.message, "error"));
  });

  refs.drawerJobForm.addEventListener("submit", (event) => {
    saveJobDrawer(event).catch((error) => showToast(error.message, "error"));
  });

  refs.drawerCustomerForm.addEventListener("submit", (event) => {
    saveCustomerDrawer(event).catch((error) =>
      showToast(error.message, "error"),
    );
  });

  refs.drawerVendorForm.addEventListener("submit", (event) => {
    saveVendorDrawer(event).catch((error) => showToast(error.message, "error"));
  });

  refs.drawerTaskForm.addEventListener("submit", (event) => {
    saveTaskDrawer(event).catch((error) => showToast(error.message, "error"));
  });

  refs.drawerServiceOrderForm.addEventListener("submit", (event) => {
    saveServiceOrderDrawer(event).catch((error) =>
      showToast(error.message, "error"),
    );
  });

  refs.drawerServiceTemplate.addEventListener("change", (event) => {
    const template =
      serviceTemplateCatalog().find(
        (item) => item.id === (event.target.value || ""),
      ) || activeServiceTemplates()[0];
    const currentDraft = collectDrawerServiceOrderDraftFromInputs();
    state.drawer.serviceOrderDraft = {
      ...defaultServiceOrderDrawerDraft({
        templateId: template?.id || "",
        assignedLeadOwnerUid:
          currentDraft.assignedLeadOwnerUid || state.profile?.uid || "",
      }),
      ...currentDraft,
      templateId: template?.id || "",
      paymentRequirement:
        currentDraft.paymentRequirement ||
        template?.defaultPaymentRequirement ||
        "upfront_required",
      priceOverride: template?.defaultPrice || currentDraft.priceOverride || "",
      assignedWorkerUids:
        currentDraft.assignedWorkerUids?.length
          ? currentDraft.assignedWorkerUids
          : uniqueValues([
              currentDraft.assignedLeadOwnerUid || state.profile?.uid || "",
            ]),
    };
    renderDrawerServiceOrder();
  });

  [
    refs.drawerServicePaymentRule,
    refs.drawerServiceClientName,
    refs.drawerServiceClientPhone,
    refs.drawerServiceClientEmail,
    refs.drawerServiceClientAddress,
    refs.drawerServicePrice,
  ].forEach((field) => {
    field.addEventListener("input", () => {
      state.drawer.serviceOrderDraft = collectDrawerServiceOrderDraftFromInputs();
      renderDrawerServiceContext();
    });
    field.addEventListener("change", () => {
      state.drawer.serviceOrderDraft = collectDrawerServiceOrderDraftFromInputs();
      renderDrawerServiceContext();
    });
  });

  refs.drawerServiceCustomerSearch.addEventListener("input", (event) => {
    state.drawer.serviceOrderDraft = {
      ...collectDrawerServiceOrderDraftFromInputs(),
      customerSearch: event.target.value || "",
    };
    renderDrawerServiceCustomerOptions();
  });

  refs.drawerServiceCustomerSelect.addEventListener("change", (event) => {
    applyDrawerServiceCustomerSelection(event.target.value || "");
  });

  refs.drawerServiceOwner.addEventListener("change", () => {
    const currentDraft = collectDrawerServiceOrderDraftFromInputs();
    const ownerUid = refs.drawerServiceOwner.value || "";
    state.drawer.serviceOrderDraft = {
      ...currentDraft,
      assignedLeadOwnerUid: ownerUid,
      assignedWorkerUids: uniqueValues([
        ownerUid,
        ...selectedDrawerServiceWorkerUids(),
      ]),
    };
    renderDrawerServiceOrder();
  });

  refs.drawerServiceStaffGrid.addEventListener("change", () => {
    state.drawer.serviceOrderDraft = collectDrawerServiceOrderDraftFromInputs();
    renderDrawerServiceContext();
  });

  refs.drawerJobCustomerSearch.addEventListener("input", (event) => {
    state.drawer.jobDraft = {
      ...collectDrawerJobDraftFromInputs(),
      customerSearch: event.target.value || "",
    };
    renderDrawerJobCustomerOptions();
  });

  refs.drawerJobCustomerSelect.addEventListener("change", (event) => {
    applyDrawerJobCustomerSelection(event.target.value || "");
  });

  refs.drawerJobOwner.addEventListener("change", () => {
    const currentDraft = collectDrawerJobDraftFromInputs();
    const ownerUid = refs.drawerJobOwner.value || "";
    state.drawer.jobDraft = {
      ...currentDraft,
      assignedLeadOwnerUid: ownerUid,
      assignedWorkerUids: uniqueValues([
        ownerUid,
        ...selectedDrawerJobWorkerUids(),
      ]),
    };
    renderDrawerJob();
  });

  refs.drawerJobStaffGrid.addEventListener("change", () => {
    state.drawer.jobDraft = collectDrawerJobDraftFromInputs();
    renderDrawerJobContext();
  });

  [
    refs.drawerJobClientName,
    refs.drawerJobProjectType,
    refs.drawerJobClientPhone,
    refs.drawerJobClientEmail,
    refs.drawerJobClientAddress,
    refs.drawerJobBaseContract,
    refs.drawerJobStatus,
    refs.drawerJobPlanningNotes,
  ].forEach((field) => {
    field.addEventListener("input", () => {
      state.drawer.jobDraft = collectDrawerJobDraftFromInputs();
      renderDrawerJobContext();
    });
    field.addEventListener("change", () => {
      state.drawer.jobDraft = collectDrawerJobDraftFromInputs();
      renderDrawerJobContext();
    });
  });

  refs.jobCustomerSelect.addEventListener("change", (event) => {
    applyJobCustomerSelection(event.target.value || "");
  });

  refs.drawerTaskLinkedType.addEventListener("change", () => {
    renderDrawerTaskRecordOptions();
    renderDrawerTaskContext();
  });

  refs.drawerTaskLinkedRecord.addEventListener(
    "change",
    renderDrawerTaskContext,
  );

  document.addEventListener("click", (event) => {
    if (!state.notificationPanelOpen) {
      return;
    }

    const clickedInsidePanel = refs.notificationPanel?.contains(event.target);
    const clickedButton = refs.notificationButton?.contains(event.target);
    if (clickedInsidePanel || clickedButton) {
      return;
    }

    state.notificationPanelOpen = false;
    renderNotificationCenter();
  });

  window.addEventListener("resize", () => {
    syncViewportHeightVar();
    syncMobileChrome();
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncViewportHeightVar);
    window.visualViewport.addEventListener("scroll", syncViewportHeightVar);
  }

  window.addEventListener("keydown", (event) => {
    trapDrawerFocus(event);

    if (event.key === "Escape" && state.drawer.type) {
      closeDrawer();
    }

    if (event.key === "Escape" && state.notificationPanelOpen) {
      state.notificationPanelOpen = false;
      renderNotificationCenter();
    }
  });

  window.addEventListener("popstate", () => {
    const route = readLeadRouteState();
    state.pendingLeadRouteId = route.leadId;
    state.pendingLeadRouteTab = route.leadTab || "overview";
    state.pendingJobRouteId = route.jobId;
    state.pendingJobRouteTab = route.jobTab || "work";

    if (route.jobId) {
      if (!restoreProjectWorkspaceFromRoute()) {
        switchView("jobs-view", { historyMode: "replace" });
      }
      return;
    }

    if (route.leadId) {
      if (!restoreLeadWorkspaceFromRoute()) {
        switchView("leads-view", { historyMode: "replace" });
      }
      return;
    }

    let didChange = false;

    if (state.selectedProjectId) {
      state.selectedProjectId = null;
      state.selectedProjectInvoiceId = null;
      state.projectScopeItems = [];
      state.projectInvoices = [];
      state.projectInvoiceDraft = null;
      subscribeProjectDetail();
      didChange = true;
    }

    if (state.selectedLeadId || state.leadWorkspaceOpen) {
      state.selectedLeadId = null;
      state.leadWorkspaceOpen = false;
      state.leadActivities = [];
      state.estimate = null;
      state.estimateShare = null;
      state.leadEstimateShares = [];
      state.leadDocuments = [];
      resetEstimateWorkflowForLead("");
      subscribeLeadDetail();
      didChange = true;
    }

    if (didChange) {
      renderAll();
    }
  });
}

syncViewportHeightVar();
bindUi();
showAuthShell();
bootstrapFirebase();
