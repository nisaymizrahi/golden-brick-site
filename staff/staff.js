import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getFirestore,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getDownloadURL,
    getStorage,
    ref as storageRef,
    uploadBytes
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const VIEW_META = {
    "today-view": {
        title: "Today",
        subtitle: "Start with what is overdue, what is due today, which leads are fresh, and which jobs need attention."
    },
    "tasks-view": {
        title: "Tasks",
        subtitle: "Track next actions across leads, customers, and active jobs in one queue."
    },
    "leads-view": {
        title: "Leads",
        subtitle: "Work the pipeline from a full board, then open each lead in a focused workspace for planning, estimates, tasks, and job handoff."
    },
    "customers-view": {
        title: "Customers",
        subtitle: "Keep repeat-client history in one card with linked leads, jobs, payments, and active opportunities."
    },
    "jobs-view": {
        title: "Jobs",
        subtitle: "Operate won work from one record: staffing, expenses, payments, company share, and worker split."
    },
    "vendors-view": {
        title: "Vendors",
        subtitle: "Manage trade partners, what we owe them, and the agreements, insurance, and W-9 files that support the relationship."
    },
    "staff-view": {
        title: "Staff",
        subtitle: "Manage access, default lead routing, and the estimate template that powers proposal previews."
    }
};

const STATUS_META = {
    new_lead: "New Lead",
    follow_up: "Follow Up",
    estimate_sent: "Estimate Sent",
    closed_won: "Closed Won",
    closed_lost: "Closed Lost"
};

const TASK_STATUS_META = {
    open: "Open",
    in_progress: "In Progress",
    waiting: "Waiting",
    completed: "Completed"
};

const PRIORITY_META = {
    high: "High",
    medium: "Medium",
    low: "Low"
};

const JOB_STATUS_META = {
    in_progress: "In Progress",
    completed: "Completed"
};

const CHANGE_ORDER_STATUS_META = {
    draft: "Draft",
    approved: "Approved",
    void: "Void"
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
    other: "Other"
};

const DOCUMENT_SOURCE_META = {
    upload: "Uploaded file",
    link: "External link",
    manual: "Manual record"
};

const PAYMENT_TYPE_META = {
    deposit: "Deposit",
    progress: "Progress",
    final: "Final",
    adjustment: "Adjustment"
};

const VENDOR_STATUS_META = {
    active: "Active",
    inactive: "Inactive",
    on_hold: "On Hold",
    do_not_pay: "Do Not Pay"
};

const VENDOR_INSURANCE_STATUS_META = {
    compliant: "Compliant",
    in_progress: "In Progress",
    expired: "Expired",
    non_compliant: "Non-Compliant",
    undecided: "Undecided"
};

const VENDOR_PAYMENT_METHOD_META = {
    ach: "ACH",
    check: "Check",
    wire: "Wire",
    credit_card: "Credit Card",
    cash: "Cash",
    zelle: "Zelle",
    other: "Other"
};

const VENDOR_BILL_STATUS_META = {
    open: "Open",
    scheduled: "Scheduled",
    paid: "Paid",
    void: "Void"
};

const VENDOR_DOCUMENT_CATEGORY_META = {
    agreement: "Agreement",
    w9: "W-9",
    insurance: "Insurance",
    license: "License",
    invoice: "Invoice",
    quote: "Quote",
    other: "Other"
};

const VENDOR_DOCUMENT_ACCESS_META = {
    staff: "Staff",
    admin_only: "Admin Only"
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
    { id: "supplier", label: "Supplier" }
];

const EMPTY_TEMPLATE = {
    id: "estimate-default",
    name: "Investor Estimate Default",
    subjectTemplate: "Golden Brick estimate for {{projectType}} at {{projectAddress}}",
    greeting: "Hi {{clientName}},",
    intro: "Thanks for speaking with Golden Brick Construction. Based on the information shared so far, here is a working estimate outline for your project.",
    outro: "Please review the draft and let us know what you would like us to tighten before the next step.",
    terms: "Pricing is a planning estimate until site conditions, access, finish selections, and final scope are confirmed."
};

const COMPANY_INFO = {
    name: "Golden Brick Construction",
    phone: "(267) 715-5557",
    email: "info@goldenbrickc.com"
};

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
    todayScopeToggle: document.getElementById("today-scope-toggle"),
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
    taskRecordEmpty: document.getElementById("task-record-empty"),
    taskDetailShell: document.getElementById("task-detail-shell"),
    taskForm: document.getElementById("task-form"),
    taskTitleInput: document.getElementById("task-title-input"),
    taskAssigneeSelect: document.getElementById("task-assignee-select"),
    taskStatusSelect: document.getElementById("task-status-select"),
    taskPrioritySelect: document.getElementById("task-priority-select"),
    taskDueInput: document.getElementById("task-due-input"),
    taskLinkedTypeSelect: document.getElementById("task-linked-type-select"),
    taskLinkedRecordSelect: document.getElementById("task-linked-record-select"),
    taskDescriptionInput: document.getElementById("task-description-input"),
    taskRelatedSummary: document.getElementById("task-related-summary"),
    taskCompleteButton: document.getElementById("task-complete-button"),
    taskResetButton: document.getElementById("task-reset-button"),

    leadMetrics: document.getElementById("lead-metrics"),
    leadSearchInput: document.getElementById("lead-search-input"),
    leadStageFilter: document.getElementById("lead-stage-filter"),
    leadLayoutButtons: Array.from(document.querySelectorAll("[data-lead-layout]")),
    leadNewButton: document.getElementById("lead-new-button"),
    leadPipelineSurface: document.getElementById("lead-pipeline-surface"),
    leadWorkspacePanel: document.getElementById("lead-workspace-panel"),
    leadWorkspaceBackButton: document.getElementById("lead-workspace-back-button"),
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
    estimateAddLineButton: document.getElementById("estimate-add-line-button"),
    estimateCopyButton: document.getElementById("estimate-copy-button"),
    estimatePrintButton: document.getElementById("estimate-print-button"),
    estimateSubject: document.getElementById("estimate-subject"),
    estimateBody: document.getElementById("estimate-body"),
    estimateAssumptions: document.getElementById("estimate-assumptions"),
    estimateLines: document.getElementById("estimate-lines"),
    estimateSubtotal: document.getElementById("estimate-subtotal"),
    estimatePreview: document.getElementById("estimate-preview"),
    leadTaskList: document.getElementById("lead-task-list"),
    leadTaskDrawerButton: document.getElementById("lead-task-drawer-button"),
    noteForm: document.getElementById("note-form"),
    noteBody: document.getElementById("note-body"),
    noteList: document.getElementById("note-list"),
    leadJobSummary: document.getElementById("lead-job-summary"),
    leadMarkWonButton: document.getElementById("lead-mark-won-button"),
    leadMarkLostButton: document.getElementById("lead-mark-lost-button"),

    customerMetrics: document.getElementById("customer-metrics"),
    customerSearchInput: document.getElementById("customer-search-input"),
    customerNewButton: document.getElementById("customer-new-button"),
    customerList: document.getElementById("customer-list"),
    customerRecordTitle: document.getElementById("customer-record-title"),
    customerRecordBadge: document.getElementById("customer-record-badge"),
    customerRecordEmpty: document.getElementById("customer-record-empty"),
    customerRecordShell: document.getElementById("customer-record-shell"),
    customerForm: document.getElementById("customer-form"),
    customerNameInput: document.getElementById("customer-name-input"),
    customerEmailInput: document.getElementById("customer-email-input"),
    customerPhoneInput: document.getElementById("customer-phone-input"),
    customerAddressInput: document.getElementById("customer-address-input"),
    customerNotesInput: document.getElementById("customer-notes-input"),
    customerCreateLeadButton: document.getElementById("customer-create-lead-button"),
    customerRecordContext: document.getElementById("customer-record-context"),
    customerSummary: document.getElementById("customer-summary"),
    customerOpportunitiesList: document.getElementById("customer-opportunities-list"),
    customerJobsList: document.getElementById("customer-jobs-list"),
    customerCurrentEstimate: document.getElementById("customer-current-estimate"),
    customerTaskList: document.getElementById("customer-task-list"),
    customerTaskForm: document.getElementById("customer-task-form"),
    customerTaskTitle: document.getElementById("customer-task-title"),
    customerTaskDue: document.getElementById("customer-task-due"),
    customerTaskPriority: document.getElementById("customer-task-priority"),
    customerTaskAssignee: document.getElementById("customer-task-assignee"),

    jobMetrics: document.getElementById("job-metrics"),
    jobSearchInput: document.getElementById("job-search-input"),
    jobStatusFilter: document.getElementById("job-status-filter"),
    jobList: document.getElementById("job-list"),
    jobRecordTitle: document.getElementById("job-record-title"),
    jobRecordBadge: document.getElementById("job-record-badge"),
    jobRecordEmpty: document.getElementById("job-record-empty"),
    jobRecordShell: document.getElementById("job-record-shell"),
    jobAddExpenseButton: document.getElementById("job-add-expense-button"),
    jobAddPaymentButton: document.getElementById("job-add-payment-button"),
    jobAddDocumentButton: document.getElementById("job-add-document-button"),
    jobAddNoteButton: document.getElementById("job-add-note-button"),
    jobSummaryStrip: document.getElementById("job-summary-strip"),
    jobTabButtons: Array.from(document.querySelectorAll("[data-job-tab]")),
    jobCoreForm: document.getElementById("job-core-form"),
    jobStatusSelect: document.getElementById("job-status-select"),
    jobBaseContractInput: document.getElementById("job-base-contract-input"),
    jobOwnerSelect: document.getElementById("job-owner-select"),
    jobCustomerDisplay: document.getElementById("job-customer-display"),
    jobAddressDisplay: document.getElementById("job-address-display"),
    jobTotalRevenueDisplay: document.getElementById("job-total-revenue-display"),
    jobLinkedLeadDisplay: document.getElementById("job-linked-lead-display"),
    jobRecordContext: document.getElementById("job-record-context"),
    jobOverviewSummary: document.getElementById("job-overview-summary"),
    workerAssignmentList: document.getElementById("worker-assignment-list"),
    jobOpenLeadButton: document.getElementById("job-open-lead-button"),
    jobRevenueSummary: document.getElementById("job-revenue-summary"),
    changeOrderForm: document.getElementById("change-order-form"),
    changeOrderTitle: document.getElementById("change-order-title"),
    changeOrderAmount: document.getElementById("change-order-amount"),
    changeOrderStatus: document.getElementById("change-order-status"),
    changeOrderDate: document.getElementById("change-order-date"),
    changeOrderNote: document.getElementById("change-order-note"),
    changeOrderList: document.getElementById("change-order-list"),
    expenseForm: document.getElementById("expense-form"),
    expenseAmount: document.getElementById("expense-amount"),
    expenseDate: document.getElementById("expense-date"),
    expenseCategory: document.getElementById("expense-category"),
    expenseVendorSelect: document.getElementById("expense-vendor-select"),
    expenseVendor: document.getElementById("expense-vendor"),
    expenseReceiptSelect: document.getElementById("expense-receipt-select"),
    expenseNote: document.getElementById("expense-note"),
    expenseList: document.getElementById("expense-list"),
    paymentForm: document.getElementById("payment-form"),
    paymentAmount: document.getElementById("payment-amount"),
    paymentDate: document.getElementById("payment-date"),
    paymentType: document.getElementById("payment-type"),
    paymentMethod: document.getElementById("payment-method"),
    paymentNote: document.getElementById("payment-note"),
    paymentList: document.getElementById("payment-list"),
    jobTeamFinancialSummary: document.getElementById("job-team-financial-summary"),
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
    jobDocumentList: document.getElementById("job-document-list"),

    vendorMetrics: document.getElementById("vendor-metrics"),
    vendorSearchInput: document.getElementById("vendor-search-input"),
    vendorTradeFilter: document.getElementById("vendor-trade-filter"),
    vendorStatusFilter: document.getElementById("vendor-status-filter"),
    vendorBillFilter: document.getElementById("vendor-bill-filter"),
    vendorNewButton: document.getElementById("vendor-new-button"),
    vendorList: document.getElementById("vendor-list"),
    vendorRecordTitle: document.getElementById("vendor-record-title"),
    vendorRecordBadge: document.getElementById("vendor-record-badge"),
    vendorRecordEmpty: document.getElementById("vendor-record-empty"),
    vendorRecordShell: document.getElementById("vendor-record-shell"),
    vendorAddBillButton: document.getElementById("vendor-add-bill-button"),
    vendorAddDocumentButton: document.getElementById("vendor-add-document-button"),
    vendorRecordContext: document.getElementById("vendor-record-context"),
    vendorTabButtons: Array.from(document.querySelectorAll("[data-vendor-tab]")),
    vendorForm: document.getElementById("vendor-form"),
    vendorNameInput: document.getElementById("vendor-name-input"),
    vendorLegalNameInput: document.getElementById("vendor-legal-name-input"),
    vendorStatusInput: document.getElementById("vendor-status-input"),
    vendorPaymentMethodInput: document.getElementById("vendor-payment-method-input"),
    vendorTradeGrid: document.getElementById("vendor-trade-grid"),
    vendorTradeOtherInput: document.getElementById("vendor-trade-other-input"),
    vendorContactNameInput: document.getElementById("vendor-contact-name-input"),
    vendorPhoneInput: document.getElementById("vendor-phone-input"),
    vendorEmailInput: document.getElementById("vendor-email-input"),
    vendorAddressInput: document.getElementById("vendor-address-input"),
    vendorServiceAreaInput: document.getElementById("vendor-service-area-input"),
    vendorDefaultTermsInput: document.getElementById("vendor-default-terms-input"),
    vendorInsuranceStatusInput: document.getElementById("vendor-insurance-status-input"),
    vendorInsuranceExpirationInput: document.getElementById("vendor-insurance-expiration-input"),
    vendorLicenseExpirationInput: document.getElementById("vendor-license-expiration-input"),
    vendorInsuranceNoteInput: document.getElementById("vendor-insurance-note-input"),
    vendorNotesInput: document.getElementById("vendor-notes-input"),
    vendorSummary: document.getElementById("vendor-summary"),
    vendorJobList: document.getElementById("vendor-job-list"),
    vendorBillForm: document.getElementById("vendor-bill-form"),
    vendorBillAmountInput: document.getElementById("vendor-bill-amount-input"),
    vendorBillNumberInput: document.getElementById("vendor-bill-number-input"),
    vendorBillInvoiceDateInput: document.getElementById("vendor-bill-invoice-date-input"),
    vendorBillDueDateInput: document.getElementById("vendor-bill-due-date-input"),
    vendorBillStatusInput: document.getElementById("vendor-bill-status-input"),
    vendorBillProjectInput: document.getElementById("vendor-bill-project-input"),
    vendorBillCategoryInput: document.getElementById("vendor-bill-category-input"),
    vendorBillPaymentMethodInput: document.getElementById("vendor-bill-payment-method-input"),
    vendorBillPaymentReferenceInput: document.getElementById("vendor-bill-payment-reference-input"),
    vendorBillSourceTypeInput: document.getElementById("vendor-bill-source-type-input"),
    vendorBillUrlRow: document.getElementById("vendor-bill-url-row"),
    vendorBillUrlInput: document.getElementById("vendor-bill-url-input"),
    vendorBillFileRow: document.getElementById("vendor-bill-file-row"),
    vendorBillFileInput: document.getElementById("vendor-bill-file-input"),
    vendorBillNoteInput: document.getElementById("vendor-bill-note-input"),
    vendorPayableSummary: document.getElementById("vendor-payable-summary"),
    vendorBillList: document.getElementById("vendor-bill-list"),
    vendorDocumentSummary: document.getElementById("vendor-document-summary"),
    vendorDocumentForm: document.getElementById("vendor-document-form"),
    vendorDocumentCategoryInput: document.getElementById("vendor-document-category-input"),
    vendorDocumentAccessInput: document.getElementById("vendor-document-access-input"),
    vendorDocumentSourceTypeInput: document.getElementById("vendor-document-source-type-input"),
    vendorDocumentDateInput: document.getElementById("vendor-document-date-input"),
    vendorDocumentExpirationInput: document.getElementById("vendor-document-expiration-input"),
    vendorDocumentTitleInput: document.getElementById("vendor-document-title-input"),
    vendorDocumentUrlRow: document.getElementById("vendor-document-url-row"),
    vendorDocumentUrlInput: document.getElementById("vendor-document-url-input"),
    vendorDocumentFileRow: document.getElementById("vendor-document-file-row"),
    vendorDocumentFileInput: document.getElementById("vendor-document-file-input"),
    vendorDocumentNoteInput: document.getElementById("vendor-document-note-input"),
    vendorDocumentList: document.getElementById("vendor-document-list"),

    staffList: document.getElementById("staff-list"),
    staffAdminShell: document.getElementById("staff-admin-shell"),
    staffEmployeeMessage: document.getElementById("staff-employee-message"),
    staffForm: document.getElementById("staff-form"),
    staffEmail: document.getElementById("staff-email"),
    staffDisplayName: document.getElementById("staff-display-name"),
    staffRole: document.getElementById("staff-role"),
    staffDefaultAssignee: document.getElementById("staff-default-assignee"),
    staffActive: document.getElementById("staff-active"),
    staffFormReset: document.getElementById("staff-form-reset"),
    templateForm: document.getElementById("template-form"),
    templateName: document.getElementById("template-name"),
    templateSubject: document.getElementById("template-subject"),
    templateGreeting: document.getElementById("template-greeting"),
    templateIntro: document.getElementById("template-intro"),
    templateOutro: document.getElementById("template-outro"),
    templateTerms: document.getElementById("template-terms"),

    drawerBackdrop: document.getElementById("drawer-backdrop"),
    entityDrawer: document.getElementById("entity-drawer"),
    drawerKicker: document.getElementById("drawer-kicker"),
    drawerTitle: document.getElementById("drawer-title"),
    drawerSubtitle: document.getElementById("drawer-subtitle"),
    drawerCloseButton: document.getElementById("drawer-close-button"),
    drawerCancelButtons: Array.from(document.querySelectorAll(".drawer-cancel-button")),
    drawerLeadForm: document.getElementById("drawer-lead-form"),
    drawerLeadClientName: document.getElementById("drawer-lead-client-name"),
    drawerLeadClientPhone: document.getElementById("drawer-lead-client-phone"),
    drawerLeadClientEmail: document.getElementById("drawer-lead-client-email"),
    drawerLeadProjectAddress: document.getElementById("drawer-lead-project-address"),
    drawerLeadProjectType: document.getElementById("drawer-lead-project-type"),
    drawerLeadAssignee: document.getElementById("drawer-lead-assignee"),
    drawerLeadNotes: document.getElementById("drawer-lead-notes"),
    drawerLeadContext: document.getElementById("drawer-lead-context"),
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
    drawerVendorContactName: document.getElementById("drawer-vendor-contact-name"),
    drawerVendorPhone: document.getElementById("drawer-vendor-phone"),
    drawerVendorEmail: document.getElementById("drawer-vendor-email"),
    drawerVendorPaymentMethod: document.getElementById("drawer-vendor-payment-method"),
    drawerVendorDefaultTerms: document.getElementById("drawer-vendor-default-terms"),
    drawerVendorNotes: document.getElementById("drawer-vendor-notes"),
    drawerTaskForm: document.getElementById("drawer-task-form"),
    drawerTaskTitle: document.getElementById("drawer-task-title"),
    drawerTaskDue: document.getElementById("drawer-task-due"),
    drawerTaskAssignee: document.getElementById("drawer-task-assignee"),
    drawerTaskPriority: document.getElementById("drawer-task-priority"),
    drawerTaskLinkedType: document.getElementById("drawer-task-linked-type"),
    drawerTaskLinkedRecord: document.getElementById("drawer-task-linked-record"),
    drawerTaskContext: document.getElementById("drawer-task-context")
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
    tasks: [],
    staffRoster: [],
    template: { ...EMPTY_TEMPLATE },
    selectedLeadId: null,
    selectedProjectId: null,
    selectedCustomerId: null,
    selectedVendorId: null,
    selectedTaskId: null,
    selectedStaffKey: null,
    leadDraft: null,
    customerDraft: null,
    vendorDraft: null,
    taskDraft: null,
    leadWorkspaceOpen: false,
    pendingLeadRouteId: "",
    pendingLeadRouteTab: "overview",
    leadActivities: [],
    projectExpenses: [],
    projectPayments: [],
    projectChangeOrders: [],
    projectDocuments: [],
    projectNotes: [],
    projectActivities: [],
    projectLeadActivities: [],
    estimate: null,
    activeLeadTab: "overview",
    activeJobTab: "financials",
    activeView: "today-view",
    todayScope: "mine",
    leadLayout: "list",
    leadSearch: "",
    leadStage: "all",
    customerSearch: "",
    vendorSearch: "",
    vendorTrade: "all",
    vendorStatus: "active_only",
    vendorBillState: "all",
    jobSearch: "",
    jobStatus: "active",
    taskSearch: "",
    taskBucket: "open",
    activeVendorTab: "overview",
    dragLeadId: null,
    dragLeadOverStatus: null,
    drawer: {
        type: null,
        context: {},
        leadDraft: null,
        customerDraft: null,
        vendorDraft: null,
        taskDraft: null
    },
    sessionResetting: false,
    unsubs: {
        base: [],
        scopedProjects: [],
        leadDetail: [],
        projectDetail: []
    }
};

const initialLeadRoute = readLeadRouteState();
state.pendingLeadRouteId = initialLeadRoute.leadId;
state.pendingLeadRouteTab = initialLeadRoute.leadTab;
state.leadWorkspaceOpen = Boolean(initialLeadRoute.leadId);

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

function sanitiseEmailKey(email) {
    return safeString(email).toLowerCase();
}

function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
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
        ...snapshot.data()
    };
}

function formatDateTime(value) {
    if (!value) return "Not set";
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    }).format(date);
}

function formatDateOnly(value) {
    if (!value) return "No due date";
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "No due date";

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function formatDateOnlyInputValue(value) {
    if (!value) return "";
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(toNumber(value));
}

function formatDateInputValue(value) {
    if (!value) return "";
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
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

function isSameDay(leftValue, rightValue) {
    const left = typeof leftValue?.toDate === "function" ? leftValue.toDate() : new Date(leftValue);
    const right = typeof rightValue?.toDate === "function" ? rightValue.toDate() : new Date(rightValue);

    if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) {
        return false;
    }

    return left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
}

function uniqueValues(values = []) {
    return Array.from(new Set(values.map((value) => safeString(value)).filter(Boolean)));
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

function showAuthShell(message = "Only approved staff accounts can enter the portal.") {
    refs.authFeedback.textContent = message;
    refs.authShell.hidden = false;
    refs.staffShell.hidden = true;
}

function showStaffShell() {
    refs.authShell.hidden = true;
    refs.staffShell.hidden = false;
}

function normaliseStaffRole(value) {
    return safeString(value).toLowerCase() === "admin" ? "admin" : "employee";
}

function normaliseStaffProfile(user, source = {}) {
    return {
        uid: safeString(source.uid || user?.uid),
        email: safeString(source.email || user?.email).toLowerCase(),
        displayName: safeString(source.displayName || user?.displayName || user?.email),
        role: normaliseStaffRole(source.role),
        active: source.active !== false,
        defaultLeadAssignee: Boolean(source.defaultLeadAssignee)
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

function readLeadRouteState() {
    const url = new URL(window.location.href);
    return {
        leadId: safeString(url.searchParams.get("lead")),
        leadTab: safeString(url.searchParams.get("leadTab")) || "overview"
    };
}

function syncLeadRouteState() {
    const url = new URL(window.location.href);

    if (state.activeView === "leads-view" && state.leadWorkspaceOpen && state.selectedLeadId) {
        url.searchParams.set("lead", state.selectedLeadId);
        url.searchParams.set("leadTab", state.activeLeadTab || "overview");
    } else {
        url.searchParams.delete("lead");
        url.searchParams.delete("leadTab");
    }

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
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

    state.selectedLeadId = lead.id;
    state.leadDraft = null;
    state.activeLeadTab = state.pendingLeadRouteTab || "overview";
    state.leadWorkspaceOpen = true;
    switchView("leads-view");
    state.pendingLeadRouteId = "";
    state.pendingLeadRouteTab = "overview";
    subscribeLeadDetail();
    return true;
}

function setDrawerVisibility(isOpen) {
    refs.drawerBackdrop.hidden = !isOpen;
    refs.entityDrawer.hidden = !isOpen;
    refs.entityDrawer.setAttribute("aria-hidden", String(!isOpen));
    document.body.classList.toggle("drawer-open", isOpen);
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
    return error?.code === "permission-denied"
        || /permission[- ]denied/i.test(error?.message || "");
}

function shouldFallbackToFirestore(error) {
    return error?.status === 404
        || error?.status >= 500
        || isPermissionDeniedError(error)
        || /Failed to fetch/i.test(error?.message || "");
}

async function verifyClientStaffAccess(user, profile = {}) {
    const userRef = doc(state.db, "users", user.uid);
    const templateRef = doc(state.db, "emailTemplates", "estimate-default");
    const [userSnap] = await Promise.all([
        getDoc(userRef),
        getDoc(templateRef)
    ]);

    if (!userSnap.exists()) {
        const error = new Error("Your staff profile has not finished syncing yet. Please try again in a moment.");
        error.status = 503;
        throw error;
    }

    const userData = userSnap.data() || {};
    if (userData.active !== true) {
        const error = new Error("This Google account is not approved for the staff portal.");
        error.status = 403;
        throw error;
    }

    return normaliseStaffProfile(user, {
        ...profile,
        ...userData
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

function handleBaseSubscriptionError(context, error) {
    console.error(`${context} subscription failed.`, error);

    if (isPermissionDeniedError(error)) {
        void resetAuthSession("Your staff access is still finishing setup. Please sign in again after permissions sync.");
        return;
    }

    setSyncStatus("Sync issue");
    setBanner(`${context} could not load right now. Please refresh and try again.`, "error");
}

function handleDetailSubscriptionError(context, error, recover) {
    console.error(`${context} subscription failed.`, error);

    if (typeof recover === "function") {
        recover();
    }

    if (isPermissionDeniedError(error)) {
        setBanner(`You no longer have access to this ${context.toLowerCase()}.`, "error");
    } else {
        setBanner(`${context} could not load right now.`, "error");
    }
}

function applyRoleVisibility() {
    refs.adminOnly.forEach((node) => {
        node.hidden = !isAdmin();
    });
}

function currentLeadDoc() {
    return state.leads.find((lead) => lead.id === state.selectedLeadId) || null;
}

function currentLead() {
    return state.leadDraft || currentLeadDoc();
}

function currentProject() {
    return state.projects.find((project) => project.id === state.selectedProjectId) || null;
}

function currentCustomerDoc() {
    return state.customers.find((customer) => customer.id === state.selectedCustomerId) || null;
}

function currentCustomer() {
    return state.customerDraft || currentCustomerDoc();
}

function currentVendorDoc() {
    return state.vendors.find((vendor) => vendor.id === state.selectedVendorId) || null;
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
        return toMillis(right.updatedAt || right.createdAt) - toMillis(left.updatedAt || left.createdAt);
    });
}

function latestByUpdated(items) {
    return sortByUpdatedDesc(items)[0] || null;
}

function activeStaffOptions() {
    if (isAdmin()) {
        return state.staffRoster
            .filter((member) => member.active !== false)
            .sort((left, right) => (left.displayName || left.email || "").localeCompare(right.displayName || right.email || ""));
    }

    if (!state.profile) {
        return [];
    }

    return [{
        uid: state.profile.uid,
        email: state.profile.email,
        displayName: state.profile.displayName,
        role: state.profile.role,
        active: true,
        defaultLeadAssignee: Boolean(state.profile.defaultLeadAssignee)
    }];
}

function preferredLeadAssignee() {
    const options = activeStaffOptions();
    return options.find((member) => member.defaultLeadAssignee) || options[0] || null;
}

function relatedTasksForEntity(entityKey, entityId) {
    return sortByUpdatedDesc(state.tasks.filter((task) => safeString(task[entityKey]) === safeString(entityId)));
}

function projectForLead(lead) {
    if (!lead) return null;
    return state.projects.find((project) => project.leadId === lead.id || project.id === lead.wonProjectId || project.id === lead.id) || null;
}

function vendorTradeLabel(tradeId) {
    return VENDOR_TRADE_OPTIONS.find((option) => option.id === tradeId)?.label || tradeId;
}

function renderTradeCheckboxGrid(container, selectedTradeIds = []) {
    if (!container) return;

    const selected = new Set((selectedTradeIds || []).map((value) => safeString(value)));
    container.innerHTML = VENDOR_TRADE_OPTIONS.map((trade) => `
        <label class="checkbox-chip">
            <input type="checkbox" data-trade-id="${escapeHtml(trade.id)}" ${selected.has(trade.id) ? "checked" : ""}>
            <span>${escapeHtml(trade.label)}</span>
        </label>
    `).join("");
}

function selectedTradeIdsFromGrid(container) {
    if (!container) return [];

    return Array.from(container.querySelectorAll("input[type='checkbox'][data-trade-id]:checked"))
        .map((input) => input.dataset.tradeId)
        .filter(Boolean);
}

function vendorBillsForVendor(vendorId) {
    return [...state.vendorBills.filter((bill) => safeString(bill.vendorId) === safeString(vendorId))]
        .sort((left, right) => {
            const leftDue = toMillis(left.dueDate || left.invoiceDate || left.createdAt) || Number.MAX_SAFE_INTEGER;
            const rightDue = toMillis(right.dueDate || right.invoiceDate || right.createdAt) || Number.MAX_SAFE_INTEGER;
            return leftDue - rightDue;
        });
}

function vendorDocumentsForVendor(vendorId) {
    return sortByUpdatedDesc(state.vendorDocuments.filter((item) => safeString(item.vendorId) === safeString(vendorId)));
}

function vendorBillIsOverdue(bill) {
    if (!bill) return false;
    const status = safeString(bill.status || "open");
    if (status === "paid" || status === "void") return false;
    const dueMillis = toMillis(bill.dueDate);
    return dueMillis > 0 && dueMillis < Date.now() && !isSameDay(bill.dueDate, new Date());
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
    return dueDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate())
        && dueDate <= weekAhead;
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
            nextDueBill: null
        };
    }

    const bills = vendorBillsForVendor(vendor.id);
    const documents = vendorDocumentsForVendor(vendor.id);
    const openBills = bills.filter((bill) => {
        const status = safeString(bill.status || "open");
        return status === "open" || status === "scheduled";
    });
    const overdueBills = bills.filter((bill) => vendorBillIsOverdue(bill));
    const dueThisWeekBills = bills.filter((bill) => vendorBillIsDueThisWeek(bill));
    const scheduledBills = bills.filter((bill) => safeString(bill.status) === "scheduled");
    const paidBills = bills.filter((bill) => safeString(bill.status) === "paid");
    const projectIds = uniqueValues(bills.map((bill) => bill.projectId));
    const projects = projectIds
        .map((projectId) => state.projects.find((project) => project.id === projectId))
        .filter(Boolean);
    const totalOpenAmount = openBills.reduce((sum, bill) => sum + toNumber(bill.amount), 0);
    const totalPaidAmount = paidBills.reduce((sum, bill) => sum + toNumber(bill.amount), 0);
    const nextDueBill = [...openBills]
        .filter((bill) => toMillis(bill.dueDate) > 0)
        .sort((left, right) => toMillis(left.dueDate) - toMillis(right.dueDate))[0] || null;

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
        nextDueBill
    };
}

function customerRollup(customer) {
    if (!customer) {
        return {
            leads: [],
            projects: [],
            openLeads: [],
            lostLeads: [],
            totalWonSales: 0,
            totalPaymentsReceived: 0,
            currentEstimateLead: null
        };
    }

    const leads = sortByUpdatedDesc(state.leads.filter((lead) => lead.customerId === customer.id));
    const projects = sortByUpdatedDesc(state.projects.filter((project) => project.customerId === customer.id));
    const openLeads = leads.filter((lead) => ["new_lead", "follow_up", "estimate_sent"].includes(lead.status));
    const lostLeads = leads.filter((lead) => lead.status === "closed_lost");
    const currentEstimateLead = latestByUpdated(openLeads.filter((lead) => Boolean(lead.hasEstimate)));
    const totalWonSales = projects.reduce((sum, project) => {
        return sum + toNumber(project.totalContractRevenue || project.jobValue || project.baseContractValue);
    }, 0);
    const totalPaymentsReceived = projects.reduce((sum, project) => sum + toNumber(project.financials?.totalPayments), 0);

    return {
        leads,
        projects,
        openLeads,
        lostLeads,
        totalWonSales,
        totalPaymentsReceived,
        currentEstimateLead
    };
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
            updatedAt: null
        };
        const nextUpdatedAt = toMillis(source.updatedAt || source.createdAt) >= toMillis(existing.updatedAt || existing.createdAt)
            ? (source.updatedAt || source.createdAt || existing.updatedAt || existing.createdAt || null)
            : (existing.updatedAt || existing.createdAt || source.updatedAt || source.createdAt || null);

        customerMap.set(customerId, {
            ...existing,
            id: customerId,
            name: existing.name || safeString(source.customerName || source.clientName || "Unnamed customer"),
            primaryEmail: existing.primaryEmail || safeString(source.clientEmail),
            primaryPhone: existing.primaryPhone || safeString(source.clientPhone),
            primaryAddress: existing.primaryAddress || safeString(source.projectAddress),
            updatedAt: nextUpdatedAt
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
        ...state.tasks.map((task) => task.projectId)
    ]);

    if (!projectIds.length) {
        state.projects = [];
        refreshScopedCustomers();
        resetSelectionFromSnapshots();
        subscribeProjectDetail();
        renderAll();
        return;
    }

    const projectMap = new Map(state.projects.map((project) => [project.id, project]));
    const syncProjectState = () => {
        state.projects = sortByUpdatedDesc(Array.from(projectMap.values()));
        refreshScopedCustomers();
        resetSelectionFromSnapshots();
        subscribeProjectDetail();
        renderAll();
    };

    projectIds.forEach((projectId) => {
        state.unsubs.scopedProjects.push(onSnapshot(doc(state.db, "projects", projectId), (snapshot) => {
            if (snapshot.exists()) {
                projectMap.set(snapshot.id, normaliseFirestoreDoc(snapshot));
            } else {
                projectMap.delete(projectId);
            }
            syncProjectState();
        }, (error) => {
            console.error("Scoped job subscription failed.", error);
            projectMap.delete(projectId);
            syncProjectState();

            if (!isPermissionDeniedError(error)) {
                setBanner("Some job records could not load right now.", "error");
            }
        }));
    });
}

function defaultLeadDraft(customer = null) {
    const assignee = preferredLeadAssignee();
    return {
        customerId: customer?.id || null,
        customerName: customer?.name || "",
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
        updatedAt: null
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
        totalPaymentsReceived: 0
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
        updatedAt: null
    };
}

function defaultTaskDraft(linked = {}) {
    return {
        title: "",
        description: "",
        status: "open",
        priority: "high",
        assignedToUid: state.profile?.uid || "",
        assignedToName: state.profile?.displayName || "",
        assignedToEmail: state.profile?.email || "",
        dueAt: null,
        leadId: linked.leadId || null,
        customerId: linked.customerId || null,
        projectId: linked.projectId || null
    };
}

function closeDrawer() {
    state.drawer = {
        type: null,
        context: {},
        leadDraft: null,
        customerDraft: null,
        vendorDraft: null,
        taskDraft: null
    };
    setDrawerVisibility(false);
}

function openLeadDrawer({ customerId = null } = {}) {
    const customer = customerId ? state.customers.find((item) => item.id === customerId) : null;
    state.drawer = {
        type: "lead",
        context: { customerId: customer?.id || null },
        leadDraft: {
            ...defaultLeadDraft(customer || null),
            customerId: customer?.id || null,
            customerName: customer?.name || ""
        },
        customerDraft: null,
        vendorDraft: null,
        taskDraft: null
    };
    renderActiveDrawer();
    queueFocus(refs.drawerLeadClientName);
}

function openCustomerDrawer(seed = {}) {
    state.drawer = {
        type: "customer",
        context: {},
        leadDraft: null,
        customerDraft: {
            ...defaultCustomerDraft(),
            name: seed.name || "",
            primaryEmail: seed.primaryEmail || "",
            primaryPhone: seed.primaryPhone || "",
            primaryAddress: seed.primaryAddress || "",
            notes: seed.notes || ""
        },
        vendorDraft: null,
        taskDraft: null
    };
    renderActiveDrawer();
    queueFocus(refs.drawerCustomerName);
}

function openVendorDrawer(seed = {}) {
    state.drawer = {
        type: "vendor",
        context: {},
        leadDraft: null,
        customerDraft: null,
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
            notes: seed.notes || ""
        },
        taskDraft: null
    };
    renderActiveDrawer();
    queueFocus(refs.drawerVendorName);
}

function openTaskDrawer(linked = {}) {
    const preferredType = linked.preferredType
        || (linked.projectId ? "project" : linked.leadId ? "lead" : linked.customerId ? "customer" : "");
    state.drawer = {
        type: "task",
        context: { ...linked, preferredType },
        leadDraft: null,
        customerDraft: null,
        vendorDraft: null,
        taskDraft: defaultTaskDraft(linked)
    };
    renderActiveDrawer();
    queueFocus(refs.drawerTaskTitle);
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

function renderDrawerLead() {
    const leadDraft = state.drawer.leadDraft;
    refs.drawerLeadForm.hidden = false;
    refs.drawerCustomerForm.hidden = true;
    refs.drawerVendorForm.hidden = true;
    refs.drawerTaskForm.hidden = true;
    refs.drawerKicker.textContent = "Quick add";
    refs.drawerTitle.textContent = "New lead";
    refs.drawerSubtitle.textContent = "Capture the lead fast, then open the full lead workspace for estimate, tasks, planning, notes, and the won-job flow.";
    refs.drawerLeadClientName.value = leadDraft?.clientName || "";
    refs.drawerLeadClientPhone.value = leadDraft?.clientPhone || "";
    refs.drawerLeadClientEmail.value = leadDraft?.clientEmail || "";
    refs.drawerLeadProjectAddress.value = leadDraft?.projectAddress || "";
    refs.drawerLeadProjectType.value = leadDraft?.projectType || "";
    refs.drawerLeadNotes.value = leadDraft?.notes || "";

    const assignee = leadDraft?.assignedToUid || preferredLeadAssignee()?.uid || "";
    renderTaskAssigneeOptions(refs.drawerLeadAssignee, assignee);
    refs.drawerLeadAssignee.disabled = !isAdmin();

    const linkedCustomer = leadDraft?.customerId ? state.customers.find((item) => item.id === leadDraft.customerId) : null;
    refs.drawerLeadContext.innerHTML = linkedCustomer
        ? `<div><strong>Linked customer:</strong> ${escapeHtml(linkedCustomer.name || "Customer")}</div><div>${escapeHtml(linkedCustomer.primaryPhone || linkedCustomer.primaryEmail || linkedCustomer.primaryAddress || "Existing customer record will stay attached.")}</div>`
        : `This lead will look for an exact customer match by phone or email. If there is no exact match, the CRM will create a new customer automatically.`;
}

function renderDrawerCustomer() {
    const customerDraft = state.drawer.customerDraft;
    refs.drawerLeadForm.hidden = true;
    refs.drawerCustomerForm.hidden = false;
    refs.drawerVendorForm.hidden = true;
    refs.drawerTaskForm.hidden = true;
    refs.drawerKicker.textContent = "Quick add";
    refs.drawerTitle.textContent = "New customer";
    refs.drawerSubtitle.textContent = "Create a clean investor or owner record without leaving the CRM workspace behind.";
    refs.drawerCustomerName.value = customerDraft?.name || "";
    refs.drawerCustomerEmail.value = customerDraft?.primaryEmail || "";
    refs.drawerCustomerPhone.value = customerDraft?.primaryPhone || "";
    refs.drawerCustomerAddress.value = customerDraft?.primaryAddress || "";
    refs.drawerCustomerNotes.value = customerDraft?.notes || "";
}

function renderDrawerVendor() {
    const vendorDraft = state.drawer.vendorDraft;
    refs.drawerLeadForm.hidden = true;
    refs.drawerCustomerForm.hidden = true;
    refs.drawerVendorForm.hidden = false;
    refs.drawerTaskForm.hidden = true;
    refs.drawerKicker.textContent = "Quick add";
    refs.drawerTitle.textContent = "New vendor";
    refs.drawerSubtitle.textContent = "Create a clean vendor record for trade categorization, payables, and document tracking without leaving the workspace.";
    refs.drawerVendorName.value = vendorDraft?.name || "";
    refs.drawerVendorStatus.value = vendorDraft?.status || "active";
    refs.drawerVendorTradeOther.value = vendorDraft?.tradeOtherText || "";
    refs.drawerVendorContactName.value = vendorDraft?.primaryContactName || "";
    refs.drawerVendorPhone.value = vendorDraft?.primaryPhone || "";
    refs.drawerVendorEmail.value = vendorDraft?.primaryEmail || "";
    refs.drawerVendorPaymentMethod.value = vendorDraft?.preferredPaymentMethod || "";
    refs.drawerVendorDefaultTerms.value = vendorDraft?.defaultTerms || "";
    refs.drawerVendorNotes.value = vendorDraft?.notes || "";
    renderTradeCheckboxGrid(refs.drawerVendorTradeGrid, vendorDraft?.tradeIds || []);
}

function renderDrawerTaskRecordOptions() {
    const taskDraft = state.drawer.taskDraft;
    const linkedType = refs.drawerTaskLinkedType.value || drawerTaskLinkedType(taskDraft);
    const selectedId = linkedType === "lead"
        ? taskDraft?.leadId
        : linkedType === "customer"
            ? taskDraft?.customerId
            : linkedType === "project"
                ? taskDraft?.projectId
                : "";

    let options = [];

    if (linkedType === "lead") {
        options = sortByUpdatedDesc(state.leads).map((lead) => ({
            value: lead.id,
            label: `${lead.clientName || "Unnamed lead"} · ${lead.projectAddress || "Address pending"}`
        }));
    } else if (linkedType === "customer") {
        options = sortByUpdatedDesc(state.customers).map((customer) => ({
            value: customer.id,
            label: `${customer.name || "Unnamed customer"} · ${customer.primaryAddress || customer.primaryEmail || customer.primaryPhone || "No contact info"}`
        }));
    } else if (linkedType === "project") {
        options = sortByUpdatedDesc(state.projects).map((project) => ({
            value: project.id,
            label: `${project.clientName || "Unnamed job"} · ${project.projectAddress || "Address pending"}`
        }));
    }

    refs.drawerTaskLinkedRecord.disabled = !linkedType;
    refs.drawerTaskLinkedRecord.innerHTML = !linkedType
        ? `<option value="">No linked record</option>`
        : options.length
            ? options.map((option) => `
                <option value="${escapeHtml(option.value)}" ${selectedId === option.value ? "selected" : ""}>
                    ${escapeHtml(option.label)}
                </option>
            `).join("")
            : `<option value="">No visible records</option>`;
}

function renderDrawerTaskContext() {
    const taskDraft = state.drawer.taskDraft;
    const linkedType = refs.drawerTaskLinkedType.value || drawerTaskLinkedType(taskDraft);
    const linkedId = refs.drawerTaskLinkedRecord.value || (
        linkedType === "lead"
            ? taskDraft?.leadId
            : linkedType === "customer"
                ? taskDraft?.customerId
                : linkedType === "project"
                    ? taskDraft?.projectId
                    : ""
    );

    refs.drawerTaskContext.innerHTML = linkedId
        ? `<div><strong>Linked record:</strong> ${escapeHtml(drawerLinkedEntityLabel(linkedType, linkedId))}</div><div>The task will stay visible from this record and inside the main task queue.</div>`
        : `Create a general task or connect it to a lead, customer, or job.`;
}

function renderDrawerTask() {
    const taskDraft = state.drawer.taskDraft;
    refs.drawerLeadForm.hidden = true;
    refs.drawerCustomerForm.hidden = true;
    refs.drawerVendorForm.hidden = true;
    refs.drawerTaskForm.hidden = false;
    refs.drawerKicker.textContent = "Quick add";
    refs.drawerTitle.textContent = "New task";
    refs.drawerSubtitle.textContent = "Assign the next action without leaving the lead, customer, job, or dashboard context.";
    refs.drawerTaskTitle.value = taskDraft?.title || "";
    refs.drawerTaskDue.value = formatDateInputValue(taskDraft?.dueAt);
    refs.drawerTaskPriority.value = taskDraft?.priority || "high";
    renderTaskAssigneeOptions(refs.drawerTaskAssignee, taskDraft?.assignedToUid || state.profile?.uid || "");
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

function switchView(viewId) {
    if (viewId !== "leads-view") {
        state.leadWorkspaceOpen = false;
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
    syncLeadRouteState();
}

function renderWorkspaceTools() {
    const shouldShowTodayToggle = isAdmin() && state.activeView === "today-view";
    refs.todayScopeToggle.hidden = !shouldShowTodayToggle;

    Array.from(refs.todayScopeToggle.querySelectorAll("[data-today-scope]")).forEach((button) => {
        button.classList.toggle("is-active", button.dataset.todayScope === state.todayScope);
    });
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
    let tasks = [...state.tasks];

    if (search) {
        tasks = tasks.filter((task) => {
            const blob = [
                task.title,
                task.description,
                task.assignedToName,
                task.assignedToEmail,
                linkedTaskLabel(task)
            ].join(" ").toLowerCase();
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

    return tasks.sort((left, right) => taskSortValue(left) - taskSortValue(right));
}

function filteredLeads() {
    const search = state.leadSearch.trim().toLowerCase();
    let leads = [...state.leads];

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
                lead.planningNotes
            ].join(" ").toLowerCase();
            return blob.includes(search);
        });
    }

    if (state.leadStage === "open") {
        leads = leads.filter((lead) => ["new_lead", "follow_up", "estimate_sent"].includes(lead.status));
    } else if (state.leadStage !== "all") {
        leads = leads.filter((lead) => lead.status === state.leadStage);
    }

    return sortByUpdatedDesc(leads);
}

function filteredCustomers() {
    const search = state.customerSearch.trim().toLowerCase();
    const customers = sortByUpdatedDesc(state.customers);
    if (!search) return customers;

    return customers.filter((customer) => {
        const blob = [
            customer.name,
            customer.primaryEmail,
            customer.primaryPhone,
            customer.primaryAddress
        ].join(" ").toLowerCase();
        return blob.includes(search);
    });
}

function filteredProjects() {
    const search = state.jobSearch.trim().toLowerCase();
    let projects = [...state.projects];

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
                project.projectType
            ].join(" ").toLowerCase();
            return blob.includes(search);
        });
    }

    return sortByUpdatedDesc(projects);
}

function openLeadsForToday() {
    const scopeLeads = isAdmin() && state.todayScope === "team"
        ? state.leads
        : state.leads.filter((lead) => lead.assignedToUid === state.profile?.uid);

    return sortByUpdatedDesc(scopeLeads.filter((lead) => lead.status === "new_lead"));
}

function estimateReviewLeads() {
    const scopeLeads = isAdmin() && state.todayScope === "team"
        ? state.leads
        : state.leads.filter((lead) => lead.assignedToUid === state.profile?.uid);

    return sortByUpdatedDesc(scopeLeads.filter((lead) => {
        return ["new_lead", "follow_up", "estimate_sent"].includes(lead.status) && Boolean(lead.hasEstimate);
    }));
}

function taskScopeSet() {
    if (!state.profile) return [];
    if (isAdmin() && state.todayScope === "team") return state.tasks;
    return state.tasks.filter((task) => task.assignedToUid === state.profile.uid);
}

function projectScopeSet() {
    if (!state.profile) return [];
    if (isAdmin() && state.todayScope === "team") return state.projects;
    return state.projects.filter((project) => {
        const allowed = Array.isArray(project.allowedStaffUids) ? project.allowedStaffUids : [];
        return allowed.includes(state.profile.uid);
    });
}

function leadCounts(leads = state.leads) {
    return leads.reduce((totals, lead) => {
        const status = lead.status || "new_lead";
        totals[status] = (totals[status] || 0) + 1;
        return totals;
    }, {
        new_lead: 0,
        follow_up: 0,
        estimate_sent: 0,
        closed_won: 0,
        closed_lost: 0
    });
}

function linkedTaskLabel(task) {
    if (task.leadId) {
        const lead = state.leads.find((item) => item.id === task.leadId);
        return lead ? `Lead: ${lead.clientName || lead.projectAddress || lead.id}` : "Lead";
    }

    if (task.customerId) {
        const customer = state.customers.find((item) => item.id === task.customerId);
        return customer ? `Customer: ${customer.name || customer.id}` : "Customer";
    }

    if (task.projectId) {
        const project = state.projects.find((item) => item.id === task.projectId);
        return project ? `Job: ${project.clientName || project.projectAddress || project.id}` : "Job";
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
    const openTaskCount = state.tasks.filter((task) => !taskIsCompleted(task)).length;
    const customerCount = state.customers.length;
    const activeProjectCount = state.projects.filter((project) => project.status !== "completed").length;
    const activeVendorCount = state.vendors.filter((vendor) => safeString(vendor.status || "active") === "active").length;

    refs.sidebarSummary.innerHTML = `
        <div class="sidebar-stat"><span>Open leads</span><strong>${counts.new_lead + counts.follow_up + counts.estimate_sent}</strong></div>
        <div class="sidebar-stat"><span>Active jobs</span><strong>${activeProjectCount}</strong></div>
        <div class="sidebar-stat"><span>Customers</span><strong>${customerCount}</strong></div>
        <div class="sidebar-stat"><span>Active vendors</span><strong>${activeVendorCount}</strong></div>
        <div class="sidebar-stat"><span>Open tasks</span><strong>${openTaskCount}</strong></div>
    `;
}

function buildCommandAction(label, variant, dataAttrs = {}) {
    const attributes = Object.entries(dataAttrs).map(([key, value]) => `${key}="${escapeHtml(value)}"`).join(" ");
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

function buildContextCard({ label, title, meta = "", dataAttrs = {}, muted = false }) {
    const hasAction = !muted && Object.keys(dataAttrs).length > 0;
    const tagName = hasAction ? "button" : "article";
    const actionAttributes = hasAction
        ? ` type="button" ${Object.entries(dataAttrs).map(([key, value]) => `${key}="${escapeHtml(value)}"`).join(" ")}`
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
    return relatedTasksForEntity(entityKey, entityId).filter((task) => !taskIsCompleted(task));
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

    const openLeadCount = state.leads.filter((lead) => ["new_lead", "follow_up", "estimate_sent"].includes(lead.status)).length;
    const unassignedLeadCount = state.leads.filter((lead) => ["new_lead", "follow_up", "estimate_sent"].includes(lead.status) && !lead.assignedToUid).length;
    const commandTaskSource = state.activeView === "today-view" ? taskScopeSet() : state.tasks;
    const overdueCount = commandTaskSource.filter((task) => taskIsOverdue(task)).length;
    const dueTodayCount = commandTaskSource.filter((task) => taskIsDueToday(task)).length;
    const estimateReadyCount = state.leads.filter((lead) => {
        return ["new_lead", "follow_up", "estimate_sent"].includes(lead.status) && Boolean(lead.hasEstimate);
    }).length;
    const activeJobCount = state.projects.filter((project) => project.status !== "completed").length;
    const completedJobCount = state.projects.filter((project) => project.status === "completed").length;
    const repeatClientCount = state.customers.filter((customer) => {
        const rollup = customerRollup(customer);
        return (rollup.leads.length + rollup.projects.length) > 1;
    }).length;
    const totalPaymentsReceived = state.projects.reduce((sum, project) => sum + toNumber(project.financials?.totalPayments), 0);
    const taskOpenCount = state.tasks.filter((task) => !taskIsCompleted(task)).length;
    const taskCompletedCount = state.tasks.filter((task) => taskIsCompleted(task)).length;
    const selectedLead = state.activeView === "leads-view" && state.leadWorkspaceOpen ? currentLead() : null;
    const selectedCustomer = currentCustomerDoc();
    const selectedProject = currentProject();
    const selectedVendor = currentVendorDoc();
    const selectedTask = currentTaskDoc();
    const activeVendorCount = state.vendors.filter((vendor) => safeString(vendor.status || "active") === "active").length;
    const openVendorBillCount = state.vendorBills.filter((bill) => {
        const status = safeString(bill.status || "open");
        return status === "open" || status === "scheduled";
    }).length;
    const overdueVendorBillCount = state.vendorBills.filter((bill) => vendorBillIsOverdue(bill)).length;

    const actionButtons = [];
    const summaryChips = [];

    if (isAdmin()) {
        actionButtons.push(buildCommandAction("New lead", "primary-button", { "data-command": "start-lead-draft" }));
        actionButtons.push(buildCommandAction("New customer", "ghost-button", { "data-command": "start-customer-draft" }));
        actionButtons.push(buildCommandAction("New vendor", "ghost-button", { "data-command": "start-vendor-draft" }));
    }

    actionButtons.push(buildCommandAction("New task", isAdmin() ? "secondary-button" : "primary-button", { "data-command": "start-task-draft" }));

    if (state.activeView === "today-view") {
        actionButtons.push(buildCommandAction("Open leads", "ghost-button", { "data-command": "open-view", "data-target-view": "leads-view" }));
        actionButtons.push(buildCommandAction("Open jobs", "ghost-button", { "data-command": "open-view", "data-target-view": "jobs-view" }));
        summaryChips.push(buildCommandChip("Overdue tasks", overdueCount));
        summaryChips.push(buildCommandChip("Fresh leads", openLeadsForToday().length));
        summaryChips.push(buildCommandChip("Estimate review", estimateReviewLeads().length));
        summaryChips.push(buildCommandChip("Active jobs", activeJobCount));
    }

    if (state.activeView === "tasks-view") {
        if (selectedTask?.leadId) {
            actionButtons.push(buildCommandAction("Open lead", "ghost-button", {
                "data-open-lead": selectedTask.leadId,
                "data-open-view": "leads-view"
            }));
        } else if (selectedTask?.customerId) {
            actionButtons.push(buildCommandAction("Open customer", "ghost-button", {
                "data-open-customer": selectedTask.customerId,
                "data-open-view": "customers-view"
            }));
        } else if (selectedTask?.projectId) {
            actionButtons.push(buildCommandAction("Open job", "ghost-button", {
                "data-open-project": selectedTask.projectId,
                "data-open-view": "jobs-view"
            }));
        }

        summaryChips.push(buildCommandChip("Open queue", taskOpenCount));
        summaryChips.push(buildCommandChip("Overdue", overdueCount));
        summaryChips.push(buildCommandChip("Due today", dueTodayCount));
        summaryChips.push(buildCommandChip("Completed", taskCompletedCount));
    }

    if (state.activeView === "leads-view") {
        if (selectedLead?.id) {
            actionButtons.push(buildCommandAction("Open estimate", "ghost-button", { "data-command": "lead-open-estimate" }));
            actionButtons.push(buildCommandAction("Lead task", "ghost-button", { "data-command": "lead-create-task" }));

            if (selectedLead.customerId) {
                actionButtons.push(buildCommandAction("Open customer", "ghost-button", {
                    "data-open-customer": selectedLead.customerId,
                    "data-open-view": "customers-view"
                }));
            }

            const linkedProject = projectForLead(selectedLead);
            if (linkedProject) {
                actionButtons.push(buildCommandAction("Open job", "ghost-button", {
                    "data-open-project": linkedProject.id,
                    "data-open-view": "jobs-view"
                }));
            }
        }

        summaryChips.push(buildCommandChip("Open leads", openLeadCount));
        summaryChips.push(buildCommandChip("Unassigned", unassignedLeadCount));
        summaryChips.push(buildCommandChip("Estimate ready", estimateReadyCount));
        summaryChips.push(buildCommandChip("Won", state.leads.filter((lead) => lead.status === "closed_won").length));
    }

    if (state.activeView === "customers-view") {
        if (selectedCustomer?.id && isAdmin()) {
            actionButtons.push(buildCommandAction("Create lead for customer", "secondary-button", { "data-command": "customer-create-lead" }));
        }
        if (selectedCustomer?.id) {
            actionButtons.push(buildCommandAction("Customer task", "ghost-button", { "data-command": "customer-create-task" }));
        }

        const currentEstimateLead = selectedCustomer ? customerRollup(selectedCustomer).currentEstimateLead : null;
        const latestCustomerProject = selectedCustomer ? latestByUpdated(customerRollup(selectedCustomer).projects) : null;

        if (currentEstimateLead) {
            actionButtons.push(buildCommandAction("Open current lead", "ghost-button", {
                "data-open-lead": currentEstimateLead.id,
                "data-open-view": "leads-view"
            }));
        }

        if (latestCustomerProject) {
            actionButtons.push(buildCommandAction("Open latest job", "ghost-button", {
                "data-open-project": latestCustomerProject.id,
                "data-open-view": "jobs-view"
            }));
        }

        summaryChips.push(buildCommandChip("Customers", state.customers.length));
        summaryChips.push(buildCommandChip("Repeat clients", repeatClientCount));
        summaryChips.push(buildCommandChip("Open opportunities", state.leads.filter((lead) => ["new_lead", "follow_up", "estimate_sent"].includes(lead.status)).length));
        summaryChips.push(buildCommandChip("Payments received", formatCurrency(totalPaymentsReceived)));
    }

    if (state.activeView === "jobs-view") {
        if (selectedProject?.leadId) {
            actionButtons.push(buildCommandAction("Open lead", "ghost-button", {
                "data-open-lead": selectedProject.leadId,
                "data-open-view": "leads-view"
            }));
        }

        if (selectedProject?.customerId) {
            actionButtons.push(buildCommandAction("Open customer", "ghost-button", {
                "data-open-customer": selectedProject.customerId,
                "data-open-view": "customers-view"
            }));
        }

        if (selectedProject?.id) {
            actionButtons.push(buildCommandAction("Job task", "ghost-button", { "data-command": "job-create-task" }));
        }

        const jobsAwaitingPayment = state.projects.filter((project) => {
            return project.status !== "completed" && toNumber(project.financials?.totalPayments) < toNumber(project.jobValue);
        }).length;

        summaryChips.push(buildCommandChip("Active jobs", activeJobCount));
        summaryChips.push(buildCommandChip("Completed", completedJobCount));
        summaryChips.push(buildCommandChip("Awaiting payment", jobsAwaitingPayment));
        summaryChips.push(buildCommandChip("Client paid", formatCurrency(totalPaymentsReceived)));
    }

    if (state.activeView === "vendors-view") {
        if (selectedVendor?.id && isAdmin()) {
            actionButtons.push(buildCommandAction("Add payable", "secondary-button", { "data-command": "vendor-add-bill" }));
            actionButtons.push(buildCommandAction("Add document", "ghost-button", { "data-command": "vendor-add-document" }));
        }

        if (selectedVendor?.id && vendorRollup(selectedVendor).projects[0]) {
            actionButtons.push(buildCommandAction("Open latest job", "ghost-button", {
                "data-open-project": vendorRollup(selectedVendor).projects[0].id,
                "data-open-view": "jobs-view"
            }));
        }

        summaryChips.push(buildCommandChip("Active vendors", activeVendorCount));
        summaryChips.push(buildCommandChip("Open bills", openVendorBillCount));
        summaryChips.push(buildCommandChip("Overdue bills", overdueVendorBillCount));
        summaryChips.push(buildCommandChip("Documents", state.vendorDocuments.length));
    }

    if (state.activeView === "staff-view") {
        const activeStaff = isAdmin()
            ? state.staffRoster.filter((member) => member.active !== false).length
            : 1;
        const adminCount = isAdmin()
            ? state.staffRoster.filter((member) => member.active !== false && member.role === "admin").length
            : (state.profile?.role === "admin" ? 1 : 0);
        const defaultOwnerCount = isAdmin()
            ? state.staffRoster.filter((member) => member.defaultLeadAssignee && member.active !== false).length
            : Number(Boolean(state.profile?.defaultLeadAssignee));

        summaryChips.push(buildCommandChip("Active staff", activeStaff));
        summaryChips.push(buildCommandChip("Admins", adminCount));
        summaryChips.push(buildCommandChip("Default owners", defaultOwnerCount));
        summaryChips.push(buildCommandChip("Visible work", `${openLeadCount} leads / ${activeJobCount} jobs`));
    }

    refs.workspaceCommandBar.innerHTML = `
        <div class="command-cluster">
            <div class="command-actions">${actionButtons.join("")}</div>
            <div class="command-summary">${summaryChips.join("")}</div>
        </div>
    `;
}

function renderMetricStrip(container, metrics) {
    container.innerHTML = metrics.map((metric) => `
        <article class="metric-card">
            <span>${escapeHtml(metric.label)}</span>
            <strong>${escapeHtml(metric.value)}</strong>
        </article>
    `).join("");
}

function stackCardButton({ title, copy = "", meta = "", dataAttrs = {}, pill = "", secondaryPill = "" }) {
    const attributes = Object.entries(dataAttrs).map(([key, value]) => `${key}="${escapeHtml(value)}"`).join(" ");

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
    const overdueTasks = scopedTasks.filter((task) => taskIsOverdue(task)).sort((left, right) => taskSortValue(left) - taskSortValue(right));
    const dueTodayTasks = scopedTasks.filter((task) => taskIsDueToday(task)).sort((left, right) => taskSortValue(left) - taskSortValue(right));
    const newLeads = openLeadsForToday();
    const estimateLeads = estimateReviewLeads();
    const activeJobs = sortByUpdatedDesc(projectScopeSet().filter((project) => project.status !== "completed"));

    renderMetricStrip(refs.todayMetrics, [
        { label: "Overdue tasks", value: overdueTasks.length },
        { label: "Due today", value: dueTodayTasks.length },
        { label: "New leads", value: newLeads.length },
        { label: "Active jobs", value: activeJobs.length }
    ]);

    if (!overdueTasks.length) {
        renderEmptyList(refs.todayOverdueList, "No overdue tasks.");
    } else {
        refs.todayOverdueList.innerHTML = overdueTasks.slice(0, 8).map((task) => stackCardButton({
            title: task.title || "Untitled task",
            copy: linkedTaskLabel(task),
            pill: PRIORITY_META[task.priority] || "Task",
            secondaryPill: formatDateOnly(task.dueAt),
            dataAttrs: {
                "data-open-task": task.id,
                "data-open-view": "tasks-view"
            },
            meta: `<div>${escapeHtml(task.assignedToName || task.assignedToEmail || "Unassigned")}</div>`
        })).join("");
    }

    if (!dueTodayTasks.length) {
        renderEmptyList(refs.todayDueTodayList, "No tasks due today.");
    } else {
        refs.todayDueTodayList.innerHTML = dueTodayTasks.slice(0, 8).map((task) => stackCardButton({
            title: task.title || "Untitled task",
            copy: linkedTaskLabel(task),
            pill: TASK_STATUS_META[task.status] || "Task",
            secondaryPill: formatDateTime(task.dueAt),
            dataAttrs: {
                "data-open-task": task.id,
                "data-open-view": "tasks-view"
            },
            meta: `<div>${escapeHtml(task.assignedToName || task.assignedToEmail || "Unassigned")}</div>`
        })).join("");
    }

    if (!newLeads.length) {
        renderEmptyList(refs.todayNewLeadsList, "No new leads waiting.");
    } else {
        refs.todayNewLeadsList.innerHTML = newLeads.slice(0, 8).map((lead) => stackCardButton({
            title: lead.clientName || "Unnamed lead",
            copy: lead.projectAddress || "Address pending",
            pill: STATUS_META[lead.status] || "Lead",
            secondaryPill: lead.assignedToName || "Unassigned",
            dataAttrs: {
                "data-open-lead": lead.id,
                "data-open-view": "leads-view"
            },
            meta: `<div>${escapeHtml(lead.projectType || "General scope")}</div><div>${escapeHtml(formatDateTime(lead.createdAt))}</div>`
        })).join("");
    }

    if (!estimateLeads.length) {
        renderEmptyList(refs.todayEstimatesList, "No estimates waiting for review.");
    } else {
        refs.todayEstimatesList.innerHTML = estimateLeads.slice(0, 8).map((lead) => stackCardButton({
            title: lead.estimateTitle || lead.clientName || "Estimate draft",
            copy: lead.projectAddress || "Address pending",
            pill: "Estimate",
            secondaryPill: formatCurrency(lead.estimateSubtotal || 0),
            dataAttrs: {
                "data-open-lead": lead.id,
                "data-open-view": "leads-view"
            },
            meta: `<div>${escapeHtml(lead.assignedToName || "Unassigned")}</div>`
        })).join("");
    }

    if (!activeJobs.length) {
        renderEmptyList(refs.todayJobsList, "No active jobs need attention right now.");
    } else {
        refs.todayJobsList.innerHTML = activeJobs.slice(0, 8).map((project) => stackCardButton({
            title: project.clientName || "Unnamed job",
            copy: project.projectAddress || "Address pending",
            pill: project.status === "completed" ? "Completed" : "In Progress",
            secondaryPill: formatCurrency(project.financials?.profit || 0),
            dataAttrs: {
                "data-open-project": project.id,
                "data-open-view": "jobs-view"
            },
            meta: `<div>${escapeHtml(project.projectType || "Project")}</div><div>Paid ${escapeHtml(formatCurrency(project.financials?.totalPayments || 0))}</div>`
        })).join("");
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
    renderMetricStrip(refs.taskMetrics, [
        { label: "Open", value: state.tasks.filter((task) => !taskIsCompleted(task)).length },
        { label: "Overdue", value: state.tasks.filter((task) => taskIsOverdue(task)).length },
        { label: "Due today", value: state.tasks.filter((task) => taskIsDueToday(task)).length },
        { label: "Completed", value: state.tasks.filter((task) => taskIsCompleted(task)).length }
    ]);
}

function renderTaskList() {
    const tasks = filteredTasks();

    if (!tasks.length) {
        renderEmptyList(refs.taskList, "No tasks match the current filters.");
        return;
    }

    refs.taskList.innerHTML = tasks.map((task) => `
        <button type="button" class="record-button ${task.id === state.selectedTaskId ? "is-selected" : ""}" data-task-id="${escapeHtml(task.id)}">
            <div class="record-topline">
                <span class="priority-pill ${escapeHtml(task.priority || "medium")}">${escapeHtml(PRIORITY_META[task.priority] || "Task")}</span>
                <span class="mini-pill">${escapeHtml(TASK_STATUS_META[task.status] || "Open")}</span>
            </div>
            <span class="record-title">${escapeHtml(task.title || "Untitled task")}</span>
            <p class="record-copy">${escapeHtml(task.description || linkedTaskLabel(task))}</p>
            <div class="record-meta">${buildTaskMeta(task)}</div>
        </button>
    `).join("");
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
        ? options.map((member) => `
            <option value="${escapeHtml(member.uid || "")}" ${selectedUid === member.uid ? "selected" : ""} ${member.uid ? "" : "disabled"}>
                ${escapeHtml((member.displayName || member.email) + (member.uid ? "" : " (sign in once to activate)"))}
            </option>
        `).join("")
        : `<option value="">No staff available</option>`;
}

function renderTaskLinkedRecordOptions() {
    const task = currentTask();
    const linkedType = refs.taskLinkedTypeSelect.value || taskLinkedType(task);
    const selectedId = linkedType === "lead"
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
            label: `${lead.clientName || "Unnamed lead"} · ${lead.projectAddress || "Address pending"}`
        }));
    } else if (linkedType === "customer") {
        options = sortByUpdatedDesc(state.customers).map((customer) => ({
            value: customer.id,
            label: `${customer.name || "Unnamed customer"} · ${customer.primaryAddress || customer.primaryEmail || customer.primaryPhone || "No contact info"}`
        }));
    } else if (linkedType === "project") {
        options = sortByUpdatedDesc(state.projects).map((project) => ({
            value: project.id,
            label: `${project.clientName || "Unnamed job"} · ${project.projectAddress || "Address pending"}`
        }));
    }

    refs.taskLinkedRecordSelect.disabled = !linkedType;
    refs.taskLinkedRecordSelect.innerHTML = !linkedType
        ? `<option value="">Select a record type first</option>`
        : options.length
            ? options.map((option) => `
                <option value="${escapeHtml(option.value)}" ${selectedId === option.value ? "selected" : ""}>
                    ${escapeHtml(option.label)}
                </option>
            `).join("")
            : `<option value="">No visible records</option>`;
}

function currentTaskLinkedSelection() {
    const task = currentTask();
    const linkedType = refs.taskLinkedTypeSelect.value || taskLinkedType(task);
    const linkedId = refs.taskLinkedRecordSelect.value || (
        linkedType === "lead"
            ? task?.leadId
            : linkedType === "customer"
                ? task?.customerId
                : linkedType === "project"
                    ? task?.projectId
                    : ""
    );

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
        parts.push(`<div><strong>Lead:</strong> ${escapeHtml(lead?.clientName || lead?.projectAddress || linkedId)}</div>`);
    }

    if (linkedType === "customer" && linkedId) {
        const customer = state.customers.find((item) => item.id === linkedId);
        parts.push(`<div><strong>Customer:</strong> ${escapeHtml(customer?.name || linkedId)}</div>`);
    }

    if (linkedType === "project" && linkedId) {
        const project = state.projects.find((item) => item.id === linkedId);
        parts.push(`<div><strong>Job:</strong> ${escapeHtml(project?.clientName || project?.projectAddress || linkedId)}</div>`);
    }

    refs.taskRelatedSummary.innerHTML = parts.length ? parts.join("") : "No linked record.";
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
    refs.taskDetailBadge.textContent = task.id ? (TASK_STATUS_META[task.status] || "Open") : "Draft";
    refs.taskDetailBadge.className = task.id ? "status-pill" : "status-pill neutral";
    refs.taskTitleInput.value = task.title || "";
    refs.taskStatusSelect.value = task.status || "open";
    refs.taskPrioritySelect.value = task.priority || "high";
    refs.taskDueInput.value = formatDateInputValue(task.dueAt);
    refs.taskDescriptionInput.value = task.description || "";
    refs.taskLinkedTypeSelect.value = taskLinkedType(task);
    renderTaskAssigneeOptions(refs.taskAssigneeSelect, task.assignedToUid || state.profile?.uid || "");
    renderTaskLinkedRecordOptions();
    refs.taskLinkedRecordSelect.value = task.leadId || task.customerId || task.projectId || refs.taskLinkedRecordSelect.value;
    renderTaskRelatedSummary();
    refs.taskCompleteButton.hidden = !task.id;
}

function renderLeadMetrics() {
    const counts = leadCounts();
    const winRate = state.leads.length ? `${Math.round((counts.closed_won / state.leads.length) * 100)}%` : "0%";

    renderMetricStrip(refs.leadMetrics, [
        { label: "New leads", value: counts.new_lead },
        { label: "Follow up", value: counts.follow_up },
        { label: "Estimate sent", value: counts.estimate_sent },
        { label: "Win rate", value: winRate }
    ]);
}

function renderCustomerOptions(selectedId = null) {
    const lead = currentLead();
    const matchedCustomers = Array.isArray(lead?.customerMatchIds)
        ? lead.customerMatchIds
            .map((customerId) => state.customers.find((customer) => customer.id === customerId))
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
    const remainingCustomers = sortByUpdatedDesc(state.customers).filter((customer) => !matchedIds.has(customer.id));
    const matchedMarkup = matchedCustomers.length
        ? `
            <optgroup label="Review matches">
                ${matchedCustomers.map((customer) => `
                    <option value="${escapeHtml(customer.id)}" ${selectedId === customer.id ? "selected" : ""}>
                        ${escapeHtml(customer.name || "Unnamed customer")}
                    </option>
                `).join("")}
            </optgroup>
        `
        : "";

    refs.leadCustomerSelect.innerHTML = [
        `<option value="">No linked customer</option>`,
        matchedMarkup,
        remainingCustomers.map((customer) => `
            <option value="${escapeHtml(customer.id)}" ${selectedId === customer.id ? "selected" : ""}>
                ${escapeHtml(customer.name || "Unnamed customer")}
            </option>
        `).join("")
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
    refs.leadAssigneeSelect.innerHTML = [`<option value="">Unassigned</option>`].concat(
        activeStaffOptions().map((member) => `
            <option value="${escapeHtml(member.uid || "")}" ${selectedUid === member.uid ? "selected" : ""} ${member.uid ? "" : "disabled"}>
                ${escapeHtml((member.displayName || member.email) + (member.uid ? "" : " (sign in once to activate)"))}
            </option>
        `)
    ).join("");
}

function renderLeadStageOptions(lead) {
    const statusOptions = [
        "new_lead",
        "follow_up",
        "estimate_sent",
        "closed_lost"
    ];
    const visibleStatuses = lead?.status === "closed_won"
        ? [...statusOptions, "closed_won"]
        : statusOptions;

    refs.leadStageSelect.innerHTML = visibleStatuses.map((status) => `
        <option value="${escapeHtml(status)}" ${lead?.status === status ? "selected" : ""}>
            ${escapeHtml(STATUS_META[status])}
        </option>
    `).join("");

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
            .map((customerId) => state.customers.find((customer) => customer.id === customerId))
            .filter(Boolean)
        : [];

    if (lead.customerReviewRequired) {
        refs.leadCustomerMatch.hidden = false;
        refs.leadCustomerMatch.className = "detail-summary lead-customer-match review";
        refs.leadCustomerMatch.innerHTML = `
            <strong>Customer review needed</strong>
            <div>${escapeHtml(matchedCustomers.length ? `${matchedCustomers.length} exact matches were found by phone or email.` : "Multiple possible customer matches were found.")}</div>
            <div>${escapeHtml(isAdmin() ? "Use the Linked customer field in Overview to choose the correct customer card." : "An admin needs to choose the correct customer card for this lead.")}</div>
        `;
        return;
    }

    if (lead.customerMatchResult === "created" && lead.customerName) {
        refs.leadCustomerMatch.hidden = false;
        refs.leadCustomerMatch.className = "detail-summary lead-customer-match created";
        refs.leadCustomerMatch.innerHTML = `
            <strong>New customer created</strong>
            <div>${escapeHtml(`${lead.customerName} was created automatically from this lead so future jobs, payments, and repeat opportunities stay together.`)}</div>
        `;
        return;
    }

    if (lead.customerMatchResult === "linked" && lead.customerName) {
        refs.leadCustomerMatch.hidden = false;
        refs.leadCustomerMatch.className = "detail-summary lead-customer-match linked";
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

function renderLeadList() {
    const leads = filteredLeads();

    if (!leads.length) {
        renderEmptyList(refs.leadList, "No leads match the current filters.");
        return;
    }

    refs.leadList.innerHTML = leads.map((lead) => `
        <button type="button" class="record-button ${lead.id === state.selectedLeadId && state.leadWorkspaceOpen && !state.leadDraft ? "is-selected" : ""}" data-lead-id="${escapeHtml(lead.id)}">
            <div class="record-topline">
                <span class="mini-pill">${escapeHtml(STATUS_META[lead.status] || "Lead")}</span>
                <span class="mini-pill">${escapeHtml(lead.assignedToName || "Unassigned")}</span>
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
    `).join("");
}

function renderLeadBoard() {
    const leads = filteredLeads();
    const statuses = ["new_lead", "follow_up", "estimate_sent", "closed_won", "closed_lost"];

    refs.leadBoard.innerHTML = statuses.map((status) => {
        const laneLeads = leads.filter((lead) => (lead.status || "new_lead") === status);
        return `
            <section class="pipeline-lane ${state.dragLeadOverStatus === status ? "is-drop-target" : ""}" data-lane-status="${escapeHtml(status)}">
                <div class="lane-head">
                    <h3>${escapeHtml(STATUS_META[status])}</h3>
                    <span>${laneLeads.length}</span>
                </div>
                ${laneLeads.length ? laneLeads.map((lead) => `
                    <button
                        type="button"
                        class="record-button pipeline-card ${lead.id === state.selectedLeadId && state.leadWorkspaceOpen && !state.leadDraft ? "is-selected" : ""} ${state.dragLeadId === lead.id ? "is-dragging" : ""}"
                        data-lead-id="${escapeHtml(lead.id)}"
                        data-draggable-lead="${escapeHtml(lead.id)}"
                        draggable="true"
                    >
                        <div class="record-topline">
                            <span class="mini-pill">${escapeHtml(lead.projectType || "Lead")}</span>
                            <span class="mini-pill">${escapeHtml(lead.assignedToName || "Unassigned")}</span>
                        </div>
                        <span class="record-title">${escapeHtml(lead.clientName || "Unnamed lead")}</span>
                        <p class="record-copy">${escapeHtml(lead.projectAddress || "Address pending")}</p>
                        <div class="record-meta">
                            <div>${escapeHtml(lead.customerName || "No linked customer")}</div>
                            <div>${escapeHtml(formatCurrency(lead.estimateSubtotal || 0))} estimate</div>
                        </div>
                    </button>
                `).join("") : `<div class="empty-note">No leads in this stage.</div>`}
            </section>
        `;
    }).join("");
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
        refs.leadBoard.querySelector(`[data-draggable-lead="${CSS.escape(leadId)}"]`)?.classList.add("is-dragging");
    }

    if (laneStatus) {
        refs.leadBoard.querySelector(`[data-lane-status="${CSS.escape(laneStatus)}"]`)?.classList.add("is-drop-target");
    }
}

function renderLeadListShell() {
    renderLeadBoard();
    renderLeadList();
}

function renderLeadWorkspaceSurface() {
    const showWorkspace = state.activeView === "leads-view" && state.leadWorkspaceOpen;
    refs.leadMetrics.hidden = showWorkspace;
    refs.leadPipelineSurface.hidden = showWorkspace;
    refs.leadWorkspacePanel.hidden = !showWorkspace;
}

function renderLeadWorkspaceHeader(lead) {
    if (!state.leadWorkspaceOpen) {
        return;
    }

    if (!lead) {
        refs.leadRecordTitle.textContent = "Lead workspace";
        refs.leadWorkspaceMeta.textContent = "Open a lead from the board to work the record in a focused full-screen workspace.";
        return;
    }

    refs.leadRecordTitle.textContent = lead.clientName || "Lead workspace";
    refs.leadWorkspaceMeta.textContent = [
        STATUS_META[lead.status] || "Lead",
        lead.assignedToName || "Unassigned",
        lead.projectAddress || "Address pending"
    ].filter(Boolean).join(" · ");
}

function renderLeadOverviewSummary(lead) {
    const linkedProject = projectForLead(lead);
    const openLeadTasks = lead.id ? activeTasksForEntity("leadId", lead.id) : [];

    refs.leadOverviewSummary.innerHTML = [
        { label: "Assigned staff", value: lead.assignedToName || "Unassigned" },
        { label: "Linked customer", value: lead.customerName || "No linked customer" },
        { label: "Open tasks", value: openLeadTasks.length || "0" },
        { label: "Estimate total", value: formatCurrency(lead.estimateSubtotal || state.estimate?.subtotal || 0) },
        { label: "Job record", value: linkedProject ? (linkedProject.status === "completed" ? "Completed" : "In Progress") : "Not created" },
        { label: "Last updated", value: formatDateTime(lead.updatedAt || lead.createdAt) }
    ].map((item) => `
        <article class="summary-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `).join("");
}

function renderLeadRecordContext(lead) {
    if (!lead) {
        refs.leadRecordContext.innerHTML = "";
        return;
    }

    const linkedCustomer = lead.customerId ? state.customers.find((customer) => customer.id === lead.customerId) : null;
    const linkedProject = projectForLead(lead);
    const openLeadTasks = lead.id ? activeTasksForEntity("leadId", lead.id) : [];
    const estimateTitle = safeString(state.estimate?.subject || lead.estimateTitle) || "Estimate not drafted";
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
                    "data-open-view": "customers-view"
                }
                : {},
            muted: !linkedCustomer
        }),
        buildContextCard({
            label: "Estimate",
            title: lead.hasEstimate ? estimateTitle : "No estimate yet",
            meta: estimateMeta,
            dataAttrs: lead.id ? { "data-command": "lead-open-estimate" } : {},
            muted: !lead.id
        }),
        buildContextCard({
            label: "Open tasks",
            title: lead.id ? String(openLeadTasks.length) : "Save first",
            meta: lead.id
                ? (openLeadTasks[0]?.title ? `Next: ${openLeadTasks[0].title}` : "Create the next action for this lead.")
                : "Save the lead before creating tasks.",
            dataAttrs: lead.id ? { "data-command": "lead-create-task" } : {},
            muted: !lead.id
        }),
        buildContextCard({
            label: "Job record",
            title: linkedProject ? (linkedProject.status === "completed" ? "Completed job" : "In progress job") : "Not converted yet",
            meta: linkedProject
                ? `${formatCurrency(linkedProject.jobValue || 0)} contract value`
                : "Use Mark won to create the operational job record.",
            dataAttrs: linkedProject
                ? {
                    "data-open-project": linkedProject.id,
                    "data-open-view": "jobs-view"
                }
                : {},
            muted: !linkedProject
        })
    ].join("");
}

function renderActivityList(container, items, emptyMessage) {
    if (!items.length) {
        renderEmptyList(container, emptyMessage);
        return;
    }

    container.innerHTML = items.map((item) => `
        <article class="timeline-item">
            <strong>${escapeHtml(item.title || "Activity")}</strong>
            <p>${escapeHtml(item.body || "")}</p>
            <div class="timeline-meta">
                ${escapeHtml(item.activityType || "system")} · ${escapeHtml(item.actorName || "Team")} · ${escapeHtml(formatDateTime(item.createdAt))}
            </div>
        </article>
    `).join("");
}

function collectEstimateForm() {
    const lineItems = Array.from(refs.estimateLines.querySelectorAll(".line-item-row")).map((row) => {
        const label = row.querySelector('[data-line-field="label"]').value.trim();
        const description = row.querySelector('[data-line-field="description"]').value.trim();
        const amount = toNumber(row.querySelector('[data-line-field="amount"]').value);
        return { label, description, amount };
    }).filter((item) => item.label || item.description || item.amount);

    const subtotal = lineItems.reduce((sum, item) => sum + toNumber(item.amount), 0);

    return {
        subject: refs.estimateSubject.value.trim(),
        emailBody: refs.estimateBody.value.trim(),
        assumptions: refs.estimateAssumptions.value
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
        lineItems,
        subtotal: Number(subtotal.toFixed(2))
    };
}

function defaultEstimateTitle(lead) {
    const template = state.template || EMPTY_TEMPLATE;
    return (template.subjectTemplate || EMPTY_TEMPLATE.subjectTemplate)
        .replace("{{projectType}}", safeString(lead?.projectType) || "your project")
        .replace("{{projectAddress}}", safeString(lead?.projectAddress) || "your property");
}

function buildTemplateEstimateDraft(lead) {
    const projectType = safeString(lead?.projectType).toLowerCase();
    const template = state.template || EMPTY_TEMPLATE;
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

    const subtotal = lineItems.reduce((sum, item) => sum + toNumber(item.amount), 0);

    return {
        subject: defaultEstimateTitle(lead),
        emailBody: [
            (template.greeting || EMPTY_TEMPLATE.greeting).replace("{{clientName}}", safeString(lead?.clientName) || "there"),
            "",
            template.intro || EMPTY_TEMPLATE.intro,
            "",
            "This is a planning estimate based on the information currently available. We can tighten the pricing further after a site review, finish confirmation, and final scope check."
        ].join("\n"),
        assumptions: [safeString(template.terms || EMPTY_TEMPLATE.terms)].filter(Boolean),
        lineItems,
        subtotal: Number(subtotal.toFixed(2))
    };
}

function buildEstimatePreviewHtml(lead, estimateDraft) {
    const template = state.template || EMPTY_TEMPLATE;
    const leadName = safeString(lead?.clientName) || "Client";
    const title = safeString(estimateDraft.subject) || defaultEstimateTitle(lead);
    const overviewBlocks = (safeString(estimateDraft.emailBody) || safeString(template.intro))
        .split("\n")
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
    const assumptions = Array.isArray(estimateDraft.assumptions) && estimateDraft.assumptions.length
        ? estimateDraft.assumptions
        : (safeString(template.terms) ? [safeString(template.terms)] : []);
    const lineItems = Array.isArray(estimateDraft.lineItems) ? estimateDraft.lineItems : [];
    const rows = lineItems.length
        ? lineItems.map((item) => `
            <tr>
                <td>
                    <strong>${escapeHtml(item.label || "Line item")}</strong>
                    <span>${escapeHtml(item.description || "Scope to be confirmed.")}</span>
                </td>
                <td>${escapeHtml(formatCurrency(item.amount || 0))}</td>
            </tr>
        `).join("")
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
                        <div class="estimate-eyebrow">${escapeHtml(COMPANY_INFO.name)}</div>
                        <h3>${escapeHtml(title)}</h3>
                        <p class="estimate-subtitle">Investor-ready renovation proposal prepared for quick client review, browser print, and PDF export.</p>
                        <p class="estimate-greeting">${escapeHtml((template.greeting || EMPTY_TEMPLATE.greeting).replace("{{clientName}}", leadName))}</p>
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
                    <span>Client</span>
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
                    <h4>Overview / Scope</h4>
                    <p>Use this summary to align the client on the planned scope and pricing posture before final execution details.</p>
                </div>
                <div class="estimate-copy-block">
                    ${overviewBlocks.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
                </div>
            </section>

            <section class="estimate-section">
                <div class="estimate-section-heading">
                    <h4>Line items</h4>
                    <p>Each line item rolls into the current working estimate total.</p>
                </div>
                <table class="estimate-table">
                    <thead>
                        <tr>
                            <th>Scope</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                    <tfoot>
                        <tr class="estimate-total-row">
                            <td>Estimated Total</td>
                            <td>${escapeHtml(formatCurrency(estimateDraft.subtotal || 0))}</td>
                        </tr>
                    </tfoot>
                </table>
            </section>

            <section class="estimate-foot">
                <div class="estimate-section">
                    <div class="estimate-section-heading">
                        <h4>Assumptions / Exclusions</h4>
                        <p>These assumptions keep the estimate clean until site conditions and final selections are confirmed.</p>
                    </div>
                    <ul>${assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                </div>
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
                <div>Prepared for browser print and Save as PDF delivery.</div>
            </footer>
        </article>
    `;
}

function buildEstimatePlainText(lead, estimateDraft) {
    const template = state.template || EMPTY_TEMPLATE;
    const assumptions = Array.isArray(estimateDraft.assumptions) && estimateDraft.assumptions.length
        ? estimateDraft.assumptions
        : (safeString(template.terms) ? [safeString(template.terms)] : []);

    return [
        COMPANY_INFO.name,
        `Email: ${COMPANY_INFO.email}`,
        `Phone: ${COMPANY_INFO.phone}`,
        "",
        safeString(estimateDraft.subject) || defaultEstimateTitle(lead),
        "",
        (template.greeting || EMPTY_TEMPLATE.greeting).replace("{{clientName}}", safeString(lead?.clientName) || "Client"),
        "",
        safeString(estimateDraft.emailBody) || safeString(template.intro),
        "",
        "Project Address: " + (safeString(lead?.projectAddress) || "To be confirmed"),
        "Project Type: " + (safeString(lead?.projectType) || "General scope"),
        "",
        "Line Items",
        (estimateDraft.lineItems || []).map((item) => {
            return [
                `- ${item.label || "Line item"}: ${formatCurrency(item.amount || 0)}`,
                item.description ? `  ${item.description}` : ""
            ].filter(Boolean).join("\n");
        }).join("\n") || "- Scope pending",
        "",
        "Estimated Total: " + formatCurrency(estimateDraft.subtotal || 0),
        "",
        "Assumptions / Exclusions",
        assumptions.length ? assumptions.map((item) => `- ${item}`).join("\n") : "- None listed",
        "",
        safeString(template.outro || EMPTY_TEMPLATE.outro)
    ].join("\n");
}

function renderEstimateLines(lineItems) {
    const rows = lineItems.length ? lineItems : [{ label: "", description: "", amount: "" }];
    const editable = isAdmin();

    refs.estimateLines.innerHTML = rows.map((item, index) => `
        <div class="line-item-row" data-line-index="${index}">
            <input type="text" data-line-field="label" value="${escapeHtml(item.label || "")}" placeholder="Line item" ${editable ? "" : "disabled"}>
            <input type="text" data-line-field="description" value="${escapeHtml(item.description || "")}" placeholder="What is included" ${editable ? "" : "disabled"}>
            <input type="number" data-line-field="amount" value="${escapeHtml(item.amount ?? "")}" min="0" step="0.01" placeholder="0.00" ${editable ? "" : "disabled"}>
            <button type="button" class="ghost-button" data-remove-line="${index}" ${editable ? "" : "hidden disabled"}>Remove</button>
        </div>
    `).join("");

    Array.from(refs.estimateLines.querySelectorAll("[data-remove-line]")).forEach((button) => {
        button.addEventListener("click", () => {
            const lines = collectEstimateForm().lineItems;
            lines.splice(Number(button.dataset.removeLine), 1);
            renderEstimateLines(lines);
            updateEstimatePreview();
        });
    });

    Array.from(refs.estimateLines.querySelectorAll("input")).forEach((input) => {
        input.addEventListener("input", updateEstimatePreview);
    });
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
}

function renderEstimatePanel() {
    const lead = currentLead();
    const estimate = state.estimate || {
        subject: "",
        emailBody: "",
        assumptions: [],
        lineItems: []
    };

    refs.estimateSubject.value = estimate.subject || defaultEstimateTitle(lead);
    refs.estimateBody.value = estimate.emailBody || "";
    refs.estimateAssumptions.value = Array.isArray(estimate.assumptions) ? estimate.assumptions.join("\n") : "";
    refs.estimateSubject.readOnly = !isAdmin();
    refs.estimateBody.readOnly = !isAdmin();
    refs.estimateAssumptions.readOnly = !isAdmin();
    renderEstimateLines(Array.isArray(estimate.lineItems) ? estimate.lineItems : []);
    updateEstimatePreview();
}

function renderEntityTaskList(container, tasks, emptyMessage) {
    if (!tasks.length) {
        renderEmptyList(container, emptyMessage);
        return;
    }

    container.innerHTML = tasks.map((task) => `
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
    `).join("");
}

function renderLeadTabState() {
    refs.leadTabButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.leadTab === state.activeLeadTab);
    });

    Array.from(document.querySelectorAll("#lead-record-shell .tab-pane")).forEach((pane) => {
        pane.classList.toggle("is-active", pane.id === `lead-tab-${state.activeLeadTab}`);
    });
}

function openLeadTab(tab, focusTarget = null) {
    state.activeLeadTab = tab;
    renderLeadTabState();
    syncLeadRouteState();

    if (focusTarget) {
        queueFocus(focusTarget);
    }
}

function renderLeadJobSummary(lead) {
    const project = projectForLead(lead);

    if (!project) {
        refs.leadJobSummary.innerHTML = `<div class="empty-note">This lead has not been converted into a job yet.</div>`;
        return;
    }

    refs.leadJobSummary.innerHTML = `
        <div><strong>Job status:</strong> ${escapeHtml(project.status === "completed" ? "Completed" : "In Progress")}</div>
        <div><strong>Contract value:</strong> ${escapeHtml(formatCurrency(project.jobValue || 0))}</div>
        <div><strong>Client paid:</strong> ${escapeHtml(formatCurrency(project.financials?.totalPayments || 0))}</div>
        <div><strong>Profit tracked:</strong> ${escapeHtml(formatCurrency(project.financials?.profit || 0))}</div>
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
        refs.leadRecordEmpty.hidden = false;
        refs.leadRecordShell.hidden = true;
        return;
    }

    refs.leadRecordEmpty.hidden = true;
    refs.leadRecordShell.hidden = false;
    refs.leadRecordBadge.textContent = lead.id ? (STATUS_META[lead.status] || "Lead") : "Draft";
    refs.leadRecordBadge.className = lead.id ? "status-pill" : "status-pill neutral";
    refs.leadClientName.value = lead.clientName || "";
    refs.leadClientEmail.value = lead.clientEmail || "";
    refs.leadClientPhone.value = lead.clientPhone || "";
    refs.leadProjectAddress.value = lead.projectAddress || "";
    refs.leadProjectType.value = lead.projectType || "";
    renderLeadStageOptions(lead);
    refs.leadNotesInput.value = lead.notes || "";
    refs.leadPlanningNotesInput.value = lead.planningNotes || "";
    refs.leadSourceDisplay.value = lead.sourcePage || lead.sourceForm || "Staff CRM";
    refs.leadEstimateDisplay.value = formatCurrency(lead.estimateSubtotal || state.estimate?.subtotal || 0);
    renderLeadAssigneeOptions(lead.assignedToUid || "");
    renderCustomerOptions(lead.customerId || null);
    renderLeadCustomerMatch(lead);

    refs.leadMeta.innerHTML = `
        <div><strong>Created:</strong> ${escapeHtml(lead.createdAt ? formatDateTime(lead.createdAt) : "Not saved yet")}</div>
        <div><strong>Updated:</strong> ${escapeHtml(lead.updatedAt ? formatDateTime(lead.updatedAt) : "Not saved yet")}</div>
        <div><strong>Lead source:</strong> ${escapeHtml(lead.sourcePage || lead.sourceForm || "Staff CRM")}</div>
        <div><strong>Customer:</strong> ${escapeHtml(lead.customerName || "No linked customer")}</div>
        <div><strong>Match status:</strong> ${escapeHtml(lead.customerReviewRequired ? "Review required" : (lead.customerMatchResult || "Pending"))}</div>
    `;

    renderLeadRecordContext(lead);
    renderLeadOverviewSummary(lead);
    renderActivityList(refs.noteList, state.leadActivities, "No activity recorded yet.");
    renderEstimatePanel();
    renderEntityTaskList(refs.leadTaskList, lead.id ? relatedTasksForEntity("leadId", lead.id) : [], "Save the lead first to attach tasks.");
    renderLeadJobSummary(lead);
    renderLeadTabState();

    refs.noteForm.querySelector("button").disabled = !lead.id;
    refs.estimateAiButton.disabled = !lead.id || !isAdmin();
    refs.estimateAddLineButton.disabled = !isAdmin();
    refs.leadCreateTaskButton.disabled = !lead.id;
    refs.leadTaskDrawerButton.disabled = !lead.id;
    refs.leadMarkWonButton.disabled = !lead.id;
    refs.leadMarkLostButton.disabled = !lead.id;
}

function renderCustomerMetrics() {
    const totalSales = state.customers.reduce((sum, customer) => {
        return sum + toNumber(customer.totalWonSales || customerRollup(customer).totalWonSales);
    }, 0);
    const totalPayments = state.customers.reduce((sum, customer) => {
        return sum + toNumber(customer.totalPaymentsReceived || customerRollup(customer).totalPaymentsReceived);
    }, 0);

    renderMetricStrip(refs.customerMetrics, [
        { label: "Customers", value: state.customers.length },
        { label: "Open opportunities", value: state.leads.filter((lead) => ["new_lead", "follow_up", "estimate_sent"].includes(lead.status)).length },
        { label: "Won sales", value: formatCurrency(totalSales) },
        { label: "Payments received", value: formatCurrency(totalPayments) }
    ]);
}

function renderCustomerList() {
    const customers = filteredCustomers();

    if (!customers.length) {
        renderEmptyList(refs.customerList, "No customers match the current search.");
        return;
    }

    refs.customerList.innerHTML = customers.map((customer) => {
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
            </button>
        `;
    }).join("");
}

function renderCustomerRecordContext(customer, rollup) {
    if (!customer) {
        refs.customerRecordContext.innerHTML = "";
        return;
    }

    const latestLead = latestByUpdated(rollup.openLeads);
    const latestProject = latestByUpdated(rollup.projects);
    const openCustomerTasks = customer.id ? activeTasksForEntity("customerId", customer.id) : [];
    const contactValue = customer.primaryPhone || customer.primaryEmail || customer.primaryAddress || "Add contact details";
    const contactMeta = [customer.primaryEmail, customer.primaryAddress].filter(Boolean).join(" · ") || "Main investor contact details live here.";

    refs.customerRecordContext.innerHTML = [
        buildContextCard({
            label: "Primary contact",
            title: contactValue,
            meta: contactMeta,
            muted: true
        }),
        buildContextCard({
            label: "Current opportunity",
            title: latestLead ? (latestLead.clientName || latestLead.projectAddress || "Open lead") : "No open opportunity",
            meta: latestLead
                ? `${STATUS_META[latestLead.status] || "Lead"} · ${formatCurrency(latestLead.estimateSubtotal || 0)}`
                : "Create a new lead when this client has another project.",
            dataAttrs: latestLead
                ? {
                    "data-open-lead": latestLead.id,
                    "data-open-view": "leads-view"
                }
                : {},
            muted: !latestLead
        }),
        buildContextCard({
            label: "Latest job",
            title: latestProject ? (latestProject.projectAddress || latestProject.clientName || "Job record") : "No job yet",
            meta: latestProject
                ? `${latestProject.status === "completed" ? "Completed" : "In progress"} · Paid ${formatCurrency(latestProject.financials?.totalPayments || 0)}`
                : "Won work for this customer will appear here.",
            dataAttrs: latestProject
                ? {
                    "data-open-project": latestProject.id,
                    "data-open-view": "jobs-view"
                }
                : {},
            muted: !latestProject
        }),
        buildContextCard({
            label: "Open tasks",
            title: customer.id ? String(openCustomerTasks.length) : "Save first",
            meta: customer.id
                ? (openCustomerTasks[0]?.title ? `Next: ${openCustomerTasks[0].title}` : "No active account-level tasks.")
                : "Save the customer before creating tasks.",
            muted: true
        })
    ].join("");
}

function renderCustomerDetail() {
    const customer = currentCustomer();

    if (!customer) {
        refs.customerRecordTitle.textContent = "Select a customer";
        refs.customerRecordBadge.textContent = "No customer selected";
        refs.customerRecordBadge.className = "status-pill neutral";
        refs.customerRecordContext.innerHTML = "";
        refs.customerRecordEmpty.hidden = false;
        refs.customerRecordShell.hidden = true;
        return;
    }

    const rollup = customerRollup(customer);

    refs.customerRecordEmpty.hidden = true;
    refs.customerRecordShell.hidden = false;
    refs.customerRecordTitle.textContent = customer.name || "New customer";
    refs.customerRecordBadge.textContent = customer.id ? `${rollup.projects.length} jobs linked` : "Draft";
    refs.customerRecordBadge.className = customer.id ? "status-pill" : "status-pill neutral";
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
        { label: "Payments received", value: formatCurrency(rollup.totalPaymentsReceived) },
        { label: "Current estimate", value: rollup.currentEstimateLead ? formatCurrency(rollup.currentEstimateLead.estimateSubtotal || 0) : "None" }
    ].map((item) => `
        <article class="summary-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `).join("");

    if (!rollup.openLeads.length) {
        renderEmptyList(refs.customerOpportunitiesList, "No open opportunities linked to this customer.");
    } else {
        refs.customerOpportunitiesList.innerHTML = rollup.openLeads.map((lead) => stackCardButton({
            title: lead.clientName || "Unnamed lead",
            copy: lead.projectAddress || "Address pending",
            pill: STATUS_META[lead.status] || "Lead",
            secondaryPill: formatCurrency(lead.estimateSubtotal || 0),
            dataAttrs: {
                "data-open-lead": lead.id,
                "data-open-view": "leads-view"
            },
            meta: `<div>${escapeHtml(lead.projectType || "General scope")}</div>`
        })).join("");
    }

    if (!rollup.projects.length) {
        renderEmptyList(refs.customerJobsList, "No jobs linked to this customer yet.");
    } else {
        refs.customerJobsList.innerHTML = rollup.projects.map((project) => stackCardButton({
            title: project.clientName || "Unnamed job",
            copy: project.projectAddress || "Address pending",
            pill: project.status === "completed" ? "Completed" : "In Progress",
            secondaryPill: formatCurrency(project.jobValue || 0),
            dataAttrs: {
                "data-open-project": project.id,
                "data-open-view": "jobs-view"
            },
            meta: `<div>Paid ${escapeHtml(formatCurrency(project.financials?.totalPayments || 0))}</div>`
        })).join("");
    }

    refs.customerCurrentEstimate.innerHTML = rollup.currentEstimateLead
        ? `
            <div><strong>${escapeHtml(rollup.currentEstimateLead.estimateTitle || "Current estimate")}</strong></div>
            <div>${escapeHtml(rollup.currentEstimateLead.projectAddress || "Address pending")}</div>
            <div>${escapeHtml(formatCurrency(rollup.currentEstimateLead.estimateSubtotal || 0))}</div>
            <div><button type="button" class="secondary-button" data-open-lead="${escapeHtml(rollup.currentEstimateLead.id)}" data-open-view="leads-view">Open lead</button></div>
        `
        : "No active estimate linked to this customer.";

    renderEntityTaskList(refs.customerTaskList, customer.id ? relatedTasksForEntity("customerId", customer.id) : [], "Save the customer first to attach tasks.");
    renderTaskAssigneeOptions(refs.customerTaskAssignee, state.profile?.uid || "");
    refs.customerTaskForm.querySelector("button").disabled = !customer.id;
}

function renderJobMetrics() {
    const inProgress = state.projects.filter((project) => project.status !== "completed").length;
    const completed = state.projects.filter((project) => project.status === "completed").length;
    const totalRevenue = state.projects.reduce((sum, project) => sum + projectRevenueValue(project), 0);
    const totalPayments = state.projects.reduce((sum, project) => sum + toNumber(projectFinancials(project).totalPayments), 0);

    renderMetricStrip(refs.jobMetrics, [
        { label: "In progress", value: inProgress },
        { label: "Completed", value: completed },
        { label: "Contract revenue", value: formatCurrency(totalRevenue) },
        { label: "Payments received", value: formatCurrency(totalPayments) }
    ]);
}

function renderJobList() {
    const projects = filteredProjects();

    if (!projects.length) {
        renderEmptyList(refs.jobList, "No jobs match the current filters.");
        return;
    }

    refs.jobList.innerHTML = projects.map((project) => {
        const financials = projectFinancials(project);
        return `
            <button type="button" class="record-button ${project.id === state.selectedProjectId ? "is-selected" : ""}" data-project-id="${escapeHtml(project.id)}">
                <div class="record-topline">
                    <span class="mini-pill">${escapeHtml(JOB_STATUS_META[project.status] || "In Progress")}</span>
                    <span class="mini-pill">${escapeHtml(project.projectType || "Project")}</span>
                </div>
                <span class="record-title">${escapeHtml(project.clientName || "Unnamed job")}</span>
                <p class="record-copy">${escapeHtml(project.projectAddress || "Address pending")}</p>
                <div class="record-meta">
                    <div>${escapeHtml(project.customerName || "No linked customer")}</div>
                    <div>Revenue ${escapeHtml(formatCurrency(projectRevenueValue(project)))}</div>
                    <div>Balance ${escapeHtml(formatCurrency(financials.balanceRemaining || project.balanceRemaining || 0))}</div>
                    <div>Profit ${escapeHtml(formatCurrency(financials.projectedGrossProfit || financials.profit || 0))}</div>
                </div>
            </button>
        `;
    }).join("");
}

function renderWorkerAssignments(project) {
    const roster = isAdmin() ? activeStaffOptions() : (project.assignedWorkers || []).map((worker) => ({
        uid: worker.uid,
        email: worker.email,
        displayName: worker.name || worker.email
    }));

    if (!roster.length) {
        renderEmptyList(refs.workerAssignmentList, "No staff records available yet.");
        return;
    }

    refs.workerAssignmentList.innerHTML = roster.map((member) => {
        const key = member.uid || member.email || "";
        const assigned = (project.assignedWorkers || []).find((worker) => worker.uid === member.uid || worker.email === member.email);
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
    }).join("");
}

function projectFinancials(project) {
    return project?.financials || {};
}

function projectRevenueValue(project) {
    const financials = projectFinancials(project);
    return toNumber(financials.totalContractRevenue || project?.totalContractRevenue || project?.jobValue || project?.baseContractValue);
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
    refs.jobOwnerSelect.innerHTML = [`<option value="">Unassigned</option>`].concat(
        activeStaffOptions().map((member) => `
            <option value="${escapeHtml(member.uid || "")}" ${project.assignedLeadOwnerUid === member.uid ? "selected" : ""} ${member.uid ? "" : "disabled"}>
                ${escapeHtml((member.displayName || member.email) + (member.uid ? "" : " (sign in once to activate)"))}
            </option>
        `)
    ).join("");
}

function renderJobRecordContext(project) {
    if (!project) {
        refs.jobRecordContext.innerHTML = "";
        return;
    }

    const linkedLead = project.leadId ? state.leads.find((lead) => lead.id === project.leadId) : null;
    const linkedCustomer = project.customerId ? state.customers.find((customer) => customer.id === project.customerId) : null;
    const openProjectTasks = project.id ? activeTasksForEntity("projectId", project.id) : [];
    const assignedWorkers = Array.isArray(project.assignedWorkers) ? project.assignedWorkers.filter((worker) => safeString(worker.uid || worker.email)) : [];
    const financials = projectFinancials(project);

    refs.jobRecordContext.innerHTML = [
        buildContextCard({
            label: "Customer",
            title: linkedCustomer?.name || project.customerName || "No linked customer",
            meta: linkedCustomer
                ? `${customerRollup(linkedCustomer).openLeads.length} open opportunities`
                : "Linked customer keeps repeat work and payments connected.",
            dataAttrs: linkedCustomer
                ? {
                    "data-open-customer": linkedCustomer.id,
                    "data-open-view": "customers-view"
                }
                : {},
            muted: !linkedCustomer
        }),
        buildContextCard({
            label: "Linked lead",
            title: linkedLead?.clientName || linkedLead?.projectAddress || "Original lead",
            meta: linkedLead
                ? `${STATUS_META[linkedLead.status] || "Lead"} · ${formatCurrency(linkedLead.estimateSubtotal || 0)} estimate`
                : "This job was created from a won lead.",
            dataAttrs: linkedLead
                ? {
                    "data-open-lead": linkedLead.id,
                    "data-open-view": "leads-view"
                }
                : {},
            muted: !linkedLead
        }),
        buildContextCard({
            label: "Open tasks",
            title: String(openProjectTasks.length),
            meta: openProjectTasks[0]?.title ? `Next: ${openProjectTasks[0].title}` : "No active tasks linked to this job.",
            dataAttrs: project.id ? { "data-command": "job-create-task" } : {},
            muted: !project.id
        }),
        buildContextCard({
            label: "Cash position",
            title: formatCurrency(financials.cashPosition || project.cashPosition || 0),
            meta: assignedWorkers.length
                ? `${assignedWorkers.length} assigned · Balance ${formatCurrency(financials.balanceRemaining || project.balanceRemaining || 0)}`
                : "Assign workers and expenses to track the true margin.",
            muted: true
        })
    ].join("");
}

function renderJobSummaryStrip(project) {
    const financials = projectFinancials(project);
    refs.jobSummaryStrip.innerHTML = [
        { label: "Total contract revenue", value: formatCurrency(projectRevenueValue(project)) },
        { label: "Payments received", value: formatCurrency(financials.totalPayments || 0) },
        { label: "Expenses recorded", value: formatCurrency(financials.totalExpenses || 0) },
        { label: "Projected gross profit", value: formatCurrency(financials.projectedGrossProfit || financials.profit || 0) },
        { label: "Cash position", value: formatCurrency(financials.cashPosition || project.cashPosition || 0) },
        { label: "Balance remaining", value: formatCurrency(financials.balanceRemaining || project.balanceRemaining || 0) }
    ].map((item) => `
        <article class="finance-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `).join("");
}

function renderJobOverviewSummary(project) {
    const financials = projectFinancials(project);
    const linkedLead = project.leadId ? state.leads.find((lead) => lead.id === project.leadId) : null;
    const openTasks = relatedTasksForEntity("projectId", project.id).filter((task) => !taskIsCompleted(task));
    const documents = state.projectDocuments.length;
    const assignedWorkers = Array.isArray(project.assignedWorkers) ? project.assignedWorkers.length : 0;

    refs.jobOverviewSummary.innerHTML = [
        { label: "Lead owner", value: project.assignedWorkers?.find((worker) => worker.uid === project.assignedLeadOwnerUid)?.name || state.staffRoster.find((member) => member.uid === project.assignedLeadOwnerUid)?.displayName || "Unassigned" },
        { label: "Assigned workers", value: String(assignedWorkers) },
        { label: "Open tasks", value: String(openTasks.length) },
        { label: "Documents", value: String(documents) },
        { label: "Estimate total", value: linkedLead ? formatCurrency(linkedLead.estimateSubtotal || 0) : "No estimate" },
        { label: "Balance remaining", value: formatCurrency(financials.balanceRemaining || project.balanceRemaining || 0) }
    ].map((item) => `
        <article class="summary-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `).join("");
}

function renderJobTabState() {
    refs.jobTabButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.jobTab === state.activeJobTab);
    });

    Array.from(document.querySelectorAll("#job-record-shell .tab-pane")).forEach((pane) => {
        pane.classList.toggle("is-active", pane.id === `job-tab-${state.activeJobTab}`);
    });
}

function openJobTab(tab, focusTarget = null) {
    state.activeJobTab = tab;
    renderJobTabState();
    queueFocus(focusTarget);
}

function renderExpenseReceiptOptions() {
    const currentValue = refs.expenseReceiptSelect.value || "";
    const receiptDocuments = state.projectDocuments
        .filter((item) => item.category === "receipt")
        .sort((left, right) => toMillis(right.relatedDate || right.createdAt) - toMillis(left.relatedDate || left.createdAt));

    refs.expenseReceiptSelect.innerHTML = [`<option value="">No linked receipt</option>`].concat(
        receiptDocuments.map((item) => `
            <option value="${escapeHtml(item.id)}">${escapeHtml(item.title || "Receipt")} · ${escapeHtml(formatDateOnly(item.relatedDate || item.createdAt))}</option>
        `)
    ).join("");
    refs.expenseReceiptSelect.value = receiptDocuments.some((item) => item.id === currentValue) ? currentValue : "";
}

function renderRevenueSummary(project) {
    const financials = projectFinancials(project);
    refs.jobRevenueSummary.innerHTML = [
        { label: "Base contract", value: formatCurrency(project.baseContractValue || financials.baseContractValue || 0) },
        { label: "Approved change orders", value: formatCurrency(project.approvedChangeOrdersTotal || financials.approvedChangeOrdersTotal || 0) },
        { label: "Total revenue", value: formatCurrency(projectRevenueValue(project)) },
        { label: "Balance remaining", value: formatCurrency(financials.balanceRemaining || project.balanceRemaining || 0) }
    ].map((item) => `
        <article class="finance-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `).join("");
}

function renderChangeOrderList() {
    renderSimpleEntries(refs.changeOrderList, state.projectChangeOrders, (changeOrder) => `
        <article class="simple-item">
            <strong>${escapeHtml(changeOrder.title || "Change order")} · ${escapeHtml(formatCurrency(changeOrder.amount || 0))}</strong>
            <p>${escapeHtml(changeOrder.note || "")}</p>
            <div class="simple-meta">
                ${escapeHtml(CHANGE_ORDER_STATUS_META[changeOrder.status] || "Draft")} · ${escapeHtml(formatDateOnly(changeOrder.relatedDate || changeOrder.createdAt))}
            </div>
        </article>
    `, "No change orders recorded yet.");
}

function renderExpenseList() {
    renderSimpleEntries(refs.expenseList, state.projectExpenses, (expense) => {
        const href = documentHref(expense);
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
            </article>
        `;
    }, "No expenses added yet.");
}

function renderPaymentList() {
    renderSimpleEntries(refs.paymentList, state.projectPayments, (payment) => `
        <article class="simple-item">
            <strong>${escapeHtml(PAYMENT_TYPE_META[payment.paymentType] || payment.method || "Payment")} · ${escapeHtml(formatCurrency(payment.amount || 0))}</strong>
            <p>${escapeHtml(payment.note || "")}</p>
            <div class="simple-meta">
                ${escapeHtml(formatDateOnly(payment.relatedDate || payment.createdAt))} · ${escapeHtml(payment.method || "No method")}
            </div>
        </article>
    `, "No payments recorded yet.");
}

function renderTeamFinancialSummary(project) {
    const financials = projectFinancials(project);
    const myBreakdown = Array.isArray(financials.workerBreakdown)
        ? financials.workerBreakdown.find((worker) => worker.uid === state.profile?.uid)
        : null;

    refs.jobTeamFinancialSummary.innerHTML = [
        { label: "Company share", value: formatCurrency(financials.companyShare || 0) },
        { label: "Worker pool", value: formatCurrency(financials.workerPool || 0) },
        { label: "My projected payout", value: formatCurrency(myBreakdown?.amount || 0) },
        { label: "Lock state", value: project.commissionLocked ? "Locked" : "Projected" }
    ].map((item) => `
        <article class="finance-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `).join("");

    const breakdown = Array.isArray(financials.workerBreakdown) ? financials.workerBreakdown : [];
    refs.commissionBreakdown.innerHTML = breakdown.length
        ? breakdown.map((worker) => `
            <article class="simple-item">
                <strong>${escapeHtml(worker.name)}</strong>
                <p>${escapeHtml(`${worker.percent}% of worker pool`)}</p>
                <div class="simple-meta">${escapeHtml(formatCurrency(worker.amount || 0))}</div>
            </article>
        `).join("")
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

    refs.jobCommissionSnapshot.innerHTML = project.commissionLocked && snapshot
        ? `
            <div><strong>Locked revenue:</strong> ${escapeHtml(formatCurrency(snapshot.totalContractRevenue || 0))}</div>
            <div><strong>Locked profit:</strong> ${escapeHtml(formatCurrency(snapshot.projectedGrossProfit || 0))}</div>
            <div><strong>Locked worker pool:</strong> ${escapeHtml(formatCurrency(snapshot.workerPool || 0))}</div>
            <div><strong>Locked on:</strong> ${escapeHtml(formatDateTime(snapshot.lockedAt))}</div>
            <div><strong>Live gross profit now:</strong> ${escapeHtml(formatCurrency(financials.projectedGrossProfit || financials.profit || 0))}</div>
        `
        : "No locked commission snapshot yet.";

    refs.jobReopenUnlockButton.hidden = !(isAdmin() && project.commissionLocked && project.status === "completed");
}

function combinedProjectHistory(project) {
    if (!project) return [];

    return [
        ...state.projectLeadActivities.map((item) => ({
            ...item,
            historySource: "Lead history"
        })),
        ...state.projectActivities.map((item) => ({
            ...item,
            historySource: "Job activity"
        })),
        ...state.projectNotes.map((item) => ({
            ...item,
            title: item.title || "Job note",
            activityType: "note",
            actorName: item.createdByName || "Team",
            historySource: "Job note"
        }))
    ].sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
}

function renderJobHistory(project) {
    const items = combinedProjectHistory(project);
    if (!items.length) {
        renderEmptyList(refs.jobHistoryList, "No history recorded yet.");
        return;
    }

    refs.jobHistoryList.innerHTML = items.map((item) => `
        <article class="timeline-item">
            <strong>${escapeHtml(item.title || "History item")}</strong>
            <p>${escapeHtml(item.body || item.note || "")}</p>
            <div class="timeline-meta">
                ${escapeHtml(item.historySource || item.activityType || "system")} · ${escapeHtml(item.actorName || item.createdByName || "Team")} · ${escapeHtml(formatDateTime(item.createdAt))}
            </div>
        </article>
    `).join("");
}

function renderJobDocumentSourceFields() {
    const sourceType = refs.jobDocumentSourceType.value || "upload";
    refs.jobDocumentUrlRow.hidden = sourceType !== "link";
    refs.jobDocumentFileRow.hidden = sourceType !== "upload";
}

function renderJobDocumentSummary() {
    const categories = ["agreement", "receipt", "permit", "closeout"];
    refs.jobDocumentSummary.innerHTML = categories.map((category) => {
        const count = state.projectDocuments.filter((item) => item.category === category).length;
        return `
            <article class="summary-card">
                <span>${escapeHtml(DOCUMENT_CATEGORY_META[category])}</span>
                <strong>${escapeHtml(String(count))}</strong>
            </article>
        `;
    }).join("");
}

function renderJobDocumentList() {
    renderSimpleEntries(refs.jobDocumentList, state.projectDocuments, (item) => {
        const href = documentHref(item);
        return `
            <article class="simple-item">
                <strong>${escapeHtml(item.title || "Document")}</strong>
                <p>${escapeHtml(item.note || "")}</p>
                <div class="simple-meta">
                    ${escapeHtml(DOCUMENT_CATEGORY_META[item.category] || "Other")} · ${escapeHtml(DOCUMENT_SOURCE_META[item.sourceType] || "Manual record")} · ${escapeHtml(formatDateOnly(item.relatedDate || item.createdAt))}
                </div>
                ${href ? `<div class="simple-meta"><a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">Open document</a></div>` : ""}
            </article>
        `;
    }, "No documents saved on this job yet.");
}

function renderJobDetail() {
    const project = currentProject();

    if (!project) {
        refs.jobRecordTitle.textContent = "Select a job";
        refs.jobRecordBadge.textContent = "No job selected";
        refs.jobRecordBadge.className = "status-pill neutral";
        refs.jobRecordContext.innerHTML = "";
        refs.jobRecordEmpty.hidden = false;
        refs.jobRecordShell.hidden = true;
        return;
    }

    const linkedLead = project.leadId ? state.leads.find((lead) => lead.id === project.leadId) : null;
    const financials = projectFinancials(project);

    refs.jobRecordEmpty.hidden = true;
    refs.jobRecordShell.hidden = false;
    refs.jobRecordTitle.textContent = project.clientName || "Unnamed job";
    refs.jobRecordBadge.textContent = JOB_STATUS_META[project.status] || "In Progress";
    refs.jobRecordBadge.className = "status-pill";
    refs.jobStatusSelect.value = project.status || "in_progress";
    refs.jobStatusSelect.disabled = !isAdmin();
    refs.jobBaseContractInput.value = toNumber(project.baseContractValue || financials.baseContractValue || project.jobValue || 0);
    refs.jobBaseContractInput.readOnly = !isAdmin();
    refs.jobCustomerDisplay.value = project.customerName || "No linked customer";
    refs.jobAddressDisplay.value = project.projectAddress || "";
    refs.jobTotalRevenueDisplay.value = formatCurrency(projectRevenueValue(project));
    refs.jobLinkedLeadDisplay.value = linkedLead?.clientName || linkedLead?.projectAddress || "Lead record linked automatically from won conversion";
    renderJobOwnerOptions(project);
    renderWorkerAssignments(project);
    renderJobRecordContext(project);
    renderJobSummaryStrip(project);
    renderJobOverviewSummary(project);
    renderRevenueSummary(project);
    renderChangeOrderList();
    renderExpenseReceiptOptions();
    renderExpenseVendorOptions();
    renderExpenseList();
    renderPaymentList();
    renderTeamFinancialSummary(project);
    renderCommissionState(project);
    renderEntityTaskList(refs.jobTaskList, relatedTasksForEntity("projectId", project.id), "No tasks linked to this job yet.");
    renderJobHistory(project);
    renderJobDocumentSourceFields();
    renderJobDocumentSummary();
    renderJobDocumentList();
    renderJobTabState();
    refs.jobOpenLeadButton.hidden = !project.leadId;

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

    return sortByUpdatedDesc(state.vendors.filter((vendor) => {
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
            ...trades.map((tradeId) => vendorTradeLabel(tradeId))
        ].join(" ").toLowerCase();

        if (search && !searchBlob.includes(search)) {
            return false;
        }

        if (state.vendorStatus === "active_only" && status !== "active") {
            return false;
        }

        if (state.vendorStatus !== "all" && state.vendorStatus !== "active_only" && status !== state.vendorStatus) {
            return false;
        }

        if (state.vendorTrade !== "all" && !trades.includes(state.vendorTrade)) {
            return false;
        }

        if (state.vendorBillState === "no_open_bills") {
            return rollup.openBills.length === 0;
        }

        if (state.vendorBillState !== "all") {
            return rollup.bills.some((bill) => vendorBillMatchesFilter(bill, state.vendorBillState));
        }

        return true;
    }));
}

function renderVendorTradeFilterOptions() {
    const currentValue = refs.vendorTradeFilter.value || state.vendorTrade || "all";
    refs.vendorTradeFilter.innerHTML = [`<option value="all">All trades</option>`].concat(
        VENDOR_TRADE_OPTIONS.map((trade) => `
            <option value="${escapeHtml(trade.id)}">${escapeHtml(trade.label)}</option>
        `)
    ).join("");
    refs.vendorTradeFilter.value = VENDOR_TRADE_OPTIONS.some((trade) => trade.id === currentValue) ? currentValue : "all";
}

function renderVendorMetrics() {
    renderVendorTradeFilterOptions();

    const activeVendors = state.vendors.filter((vendor) => safeString(vendor.status || "active") === "active").length;
    const openBills = state.vendorBills.filter((bill) => {
        const status = safeString(bill.status || "open");
        return status === "open" || status === "scheduled";
    });
    const overdueBills = state.vendorBills.filter((bill) => vendorBillIsOverdue(bill));
    const dueThisWeek = state.vendorBills.filter((bill) => vendorBillIsDueThisWeek(bill));

    renderMetricStrip(refs.vendorMetrics, [
        { label: "Active vendors", value: activeVendors },
        { label: "Open bills", value: openBills.length },
        { label: "Overdue bills", value: overdueBills.length },
        { label: "Due this week", value: dueThisWeek.length }
    ]);
}

function renderVendorList() {
    const vendors = filteredVendors();

    if (!vendors.length) {
        renderEmptyList(refs.vendorList, "No vendors match the current filters.");
        return;
    }

    refs.vendorList.innerHTML = vendors.map((vendor) => {
        const rollup = vendorRollup(vendor);
        const trades = (vendor.tradeIds || []).slice(0, 2).map((tradeId) => vendorTradeLabel(tradeId));
        const tradeSummary = trades.length ? trades.join(" · ") : (safeString(vendor.tradeOtherText) || "Trade not set");
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
            </button>
        `;
    }).join("");
}

function renderVendorRecordContext(vendor, rollup) {
    if (!vendor) {
        refs.vendorRecordContext.innerHTML = "";
        return;
    }

    const trades = (vendor.tradeIds || []).map((tradeId) => vendorTradeLabel(tradeId));
    const nextDueText = rollup.nextDueBill
        ? `${formatCurrency(rollup.nextDueBill.amount || 0)} due ${formatDateOnly(rollup.nextDueBill.dueDate)}`
        : "No upcoming open bill.";
    const complianceText = [
        VENDOR_INSURANCE_STATUS_META[vendor.insuranceStatus] || "Undecided",
        vendor.insuranceExpirationDate ? `Insurance ${formatDateOnly(vendor.insuranceExpirationDate)}` : "",
        vendor.licenseExpirationDate ? `License ${formatDateOnly(vendor.licenseExpirationDate)}` : ""
    ].filter(Boolean).join(" · ");

    refs.vendorRecordContext.innerHTML = [
        buildContextCard({
            label: "Primary contact",
            title: vendor.primaryContactName || vendor.primaryEmail || vendor.primaryPhone || "Contact not set",
            meta: [vendor.primaryEmail, vendor.primaryPhone, vendor.address].filter(Boolean).join(" · ") || "Add contact and address details for purchasing follow-through.",
            muted: true
        }),
        buildContextCard({
            label: "Trades",
            title: trades.length ? trades.slice(0, 3).join(", ") : "Trades not set",
            meta: safeString(vendor.tradeOtherText) || "Use trade tags to keep the vendor directory easy to search.",
            muted: true
        }),
        buildContextCard({
            label: "Next bill due",
            title: rollup.nextDueBill ? (rollup.nextDueBill.billNumber || "Upcoming payable") : "No bill due",
            meta: nextDueText,
            muted: true
        }),
        buildContextCard({
            label: "Compliance",
            title: VENDOR_STATUS_META[vendor.status] || "Active",
            meta: complianceText || "Track insurance, license, and W-9 files in the document center.",
            muted: true
        })
    ].join("");
}

function renderVendorTabState() {
    refs.vendorTabButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.vendorTab === state.activeVendorTab);
    });

    Array.from(document.querySelectorAll("#vendor-record-shell .tab-pane")).forEach((pane) => {
        pane.classList.toggle("is-active", pane.id === `vendor-tab-${state.activeVendorTab}`);
    });
}

function openVendorTab(tab, focusTarget = null) {
    state.activeVendorTab = tab;
    renderVendorTabState();
    queueFocus(focusTarget);
}

function renderVendorProjectOptions(selectedProjectId = "") {
    const options = [`<option value="">No linked job</option>`].concat(
        sortByUpdatedDesc(state.projects).map((project) => `
            <option value="${escapeHtml(project.id)}">${escapeHtml(`${project.clientName || "Unnamed job"} · ${project.projectAddress || "Address pending"}`)}</option>
        `)
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
        refs.vendorNotesInput
    ].forEach((field) => {
        if (!field) return;
        if (field.tagName === "INPUT" || field.tagName === "TEXTAREA") {
            field.readOnly = !editable;
        } else {
            field.disabled = !editable;
        }
    });

    Array.from(refs.vendorTradeGrid.querySelectorAll("input[type='checkbox']")).forEach((input) => {
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
        { label: "Linked jobs", value: String(rollup.projects.length) }
    ].map((item) => `
        <article class="summary-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `).join("");

    if (!rollup.projects.length) {
        renderEmptyList(refs.vendorJobList, "No jobs are linked to this vendor yet.");
        return;
    }

    refs.vendorJobList.innerHTML = rollup.projects.map((project) => stackCardButton({
        title: project.clientName || "Job",
        copy: project.projectAddress || "Address pending",
        pill: project.status === "completed" ? "Completed" : "In Progress",
        secondaryPill: formatCurrency(projectRevenueValue(project)),
        dataAttrs: {
            "data-open-project": project.id,
            "data-open-view": "jobs-view"
        },
        meta: `<div>${escapeHtml(project.projectType || "Project")}</div><div>Paid ${escapeHtml(formatCurrency(project.financials?.totalPayments || 0))}</div>`
    })).join("");
}

function renderVendorPayableSummary(vendor, rollup) {
    refs.vendorPayableSummary.innerHTML = `
        <div><strong>Open:</strong> ${escapeHtml(`${rollup.openBills.length} bills for ${formatCurrency(rollup.totalOpenAmount)}`)}</div>
        <div><strong>Overdue:</strong> ${escapeHtml(String(rollup.overdueBills.length))}</div>
        <div><strong>Due this week:</strong> ${escapeHtml(String(rollup.dueThisWeekBills.length))}</div>
    `;
}

function renderVendorBillList(vendor, rollup) {
    renderSimpleEntries(refs.vendorBillList, rollup.bills, (bill) => {
        const linkedProject = bill.projectId ? state.projects.find((project) => project.id === bill.projectId) : null;
        const invoiceHref = safeString(bill.invoiceFileUrl || bill.invoiceExternalUrl);
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
    }, "No payables saved for this vendor yet.");
}

function renderVendorDocumentSummary(vendor, rollup) {
    const categories = ["agreement", "insurance", "license", "w9"];
    refs.vendorDocumentSummary.innerHTML = categories.map((category) => `
        <article class="summary-card">
            <span>${escapeHtml(VENDOR_DOCUMENT_CATEGORY_META[category])}</span>
            <strong>${escapeHtml(String(rollup.documents.filter((item) => item.category === category).length))}</strong>
        </article>
    `).join("");
}

function renderVendorDocumentList(vendor, rollup) {
    renderSimpleEntries(refs.vendorDocumentList, rollup.documents, (item) => {
        const href = documentHref(item);
        const expiryMeta = item.expirationDate ? ` · Expires ${formatDateOnly(item.expirationDate)}` : "";
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
            </article>
        `;
    }, "No vendor documents saved yet.");
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
    refs.vendorRecordBadge.textContent = vendor.id ? (VENDOR_STATUS_META[vendor.status] || "Active") : "Draft";
    refs.vendorRecordBadge.className = vendor.id ? "status-pill" : "status-pill neutral";
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
    refs.vendorInsuranceExpirationInput.value = formatDateOnlyInputValue(vendor.insuranceExpirationDate);
    refs.vendorLicenseExpirationInput.value = formatDateOnlyInputValue(vendor.licenseExpirationDate);
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

function renderTemplateForm() {
    refs.templateName.value = state.template.name || EMPTY_TEMPLATE.name;
    refs.templateSubject.value = state.template.subjectTemplate || EMPTY_TEMPLATE.subjectTemplate;
    refs.templateGreeting.value = state.template.greeting || EMPTY_TEMPLATE.greeting;
    refs.templateIntro.value = state.template.intro || EMPTY_TEMPLATE.intro;
    refs.templateOutro.value = state.template.outro || EMPTY_TEMPLATE.outro;
    refs.templateTerms.value = state.template.terms || EMPTY_TEMPLATE.terms;
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
        .sort((left, right) => (left.displayName || left.email || "").localeCompare(right.displayName || right.email || ""))
        .map((member) => `
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
        `).join("");
}

function renderAll() {
    renderWorkspaceTools();
    renderCurrentUserCard();
    renderSidebarSummary();
    renderWorkspaceCommandBar();
    renderTodayView();
    renderTaskMetrics();
    renderTaskList();
    renderTaskDetail();
    renderLeadMetrics();
    renderLeadListShell();
    renderLeadWorkspaceSurface();
    renderLeadDetail();
    renderCustomerMetrics();
    renderCustomerList();
    renderCustomerDetail();
    renderJobMetrics();
    renderJobList();
    renderJobDetail();
    renderVendorMetrics();
    renderVendorList();
    renderVendorDetail();
    renderTemplateForm();
    renderStaffList();
    if (state.drawer.type) {
        renderActiveDrawer();
    } else {
        setDrawerVisibility(false);
    }
}

async function apiPost(path, body) {
    const token = await state.currentUser.getIdToken();
    const response = await fetch(path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        },
        body: JSON.stringify(body || {})
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

function selectLead(leadId, { openWorkspace = true, preserveTab = false } = {}) {
    state.leadDraft = null;
    state.selectedLeadId = leadId;
    state.leadWorkspaceOpen = openWorkspace;
    if (!preserveTab) {
        state.activeLeadTab = "overview";
    }
    subscribeLeadDetail();
    renderAll();
    syncLeadRouteState();

    if (openWorkspace) {
        window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }
}

function closeLeadWorkspace() {
    if (!state.selectedLeadId) {
        state.leadDraft = null;
        state.leadActivities = [];
        state.estimate = null;
    }
    state.leadWorkspaceOpen = false;
    renderAll();
    syncLeadRouteState();
    window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

function selectProject(projectId) {
    state.selectedProjectId = projectId;
    state.activeJobTab = "financials";
    subscribeProjectDetail();
    renderAll();
}

function selectCustomer(customerId) {
    state.customerDraft = null;
    state.selectedCustomerId = customerId;
    renderAll();
}

function selectVendor(vendorId) {
    state.vendorDraft = null;
    state.selectedVendorId = vendorId;
    state.activeVendorTab = "overview";
    renderAll();
}

function selectTask(taskId) {
    state.taskDraft = null;
    state.selectedTaskId = taskId;
    renderAll();
}

function startLeadDraft(customerId = null) {
    const customer = customerId ? state.customers.find((item) => item.id === customerId) : null;
    state.selectedLeadId = null;
    state.leadDraft = defaultLeadDraft(customer || null);
    state.leadActivities = [];
    state.estimate = null;
    state.activeLeadTab = "overview";
    state.leadWorkspaceOpen = true;
    switchView("leads-view");
    renderAll();
}

function startCustomerDraft() {
    state.selectedCustomerId = null;
    state.customerDraft = defaultCustomerDraft();
    switchView("customers-view");
    renderAll();
}

function startVendorDraft() {
    state.selectedVendorId = null;
    state.vendorDraft = defaultVendorDraft();
    state.activeVendorTab = "overview";
    switchView("vendors-view");
    renderAll();
}

function startTaskDraft(linked = {}) {
    state.selectedTaskId = null;
    state.taskDraft = defaultTaskDraft(linked);
    switchView("tasks-view");
    renderAll();
}

async function syncSession(user) {
    const email = safeString(user.email).toLowerCase();
    const allowedRef = doc(state.db, "allowedStaff", sanitiseEmailKey(email));

    async function syncSessionViaApi() {
        const token = await user.getIdToken();
        const response = await fetch("/api/auth/sync-session", {
            method: "POST",
            headers: {
                Authorization: "Bearer " + token
            }
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            const error = new Error(payload.message || `Could not verify this staff account (${response.status}).`);
            error.status = response.status;
            throw error;
        }

        return {
            ...payload,
            mode: payload.mode || "api",
            claimsSynced: payload.claimsSynced !== false,
            profile: await verifyClientStaffAccess(user, payload.profile || {})
        };
    }

    async function syncSessionFromFirestore() {
        if (!email) {
            return {
                authorised: false,
                message: "This Google account does not have an email address."
            };
        }

        const allowedSnap = await getDoc(allowedRef);
        if (!allowedSnap.exists()) {
            return {
                authorised: false,
                message: "This Google account is not approved for the staff portal."
            };
        }

        const allowedData = allowedSnap.data() || {};
        if (allowedData.active !== true) {
            return {
                authorised: false,
                message: "This Google account is not approved for the staff portal."
            };
        }

        const profile = normaliseStaffProfile(user, allowedData);

        await Promise.all([
            setDoc(doc(state.db, "users", user.uid), {
                ...profile,
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true }),
            setDoc(allowedRef, {
                uid: user.uid,
                email,
                displayName: profile.displayName,
                lastLoginAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true })
        ]);

        return {
            ok: true,
            authorised: true,
            profile: await verifyClientStaffAccess(user, profile),
            mode: "firestore",
            claimsSynced: false
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
    if (state.selectedLeadId && !state.leads.some((lead) => lead.id === state.selectedLeadId)) {
        state.selectedLeadId = null;
        state.leadWorkspaceOpen = false;
        syncLeadRouteState();
    }

    if (state.selectedProjectId && !state.projects.some((project) => project.id === state.selectedProjectId)) {
        state.selectedProjectId = null;
    }

    if (state.selectedCustomerId && !state.customers.some((customer) => customer.id === state.selectedCustomerId)) {
        state.selectedCustomerId = null;
    }

    if (state.selectedVendorId && !state.vendors.some((vendor) => vendor.id === state.selectedVendorId)) {
        state.selectedVendorId = null;
    }

    if (state.selectedTaskId && !state.tasks.some((task) => task.id === state.selectedTaskId)) {
        state.selectedTaskId = null;
    }
}

function subscribeBaseData() {
    clearUnsubs(state.unsubs.base);
    state.unsubs.base = [];
    clearUnsubs(state.unsubs.scopedProjects);
    state.unsubs.scopedProjects = [];

    const leadSource = isAdmin()
        ? collection(state.db, "leads")
        : query(collection(state.db, "leads"), where("assignedToUid", "==", state.profile.uid));

    state.unsubs.base.push(onSnapshot(leadSource, (snapshot) => {
        state.leads = snapshot.docs.map(normaliseFirestoreDoc);
        refreshScopedCustomers();
        if (!isAdmin()) {
            syncScopedProjects();
        }
        restoreLeadWorkspaceFromRoute();
        resetSelectionFromSnapshots();
        subscribeLeadDetail();
        renderAll();
        setSyncStatus("Lead data live");
    }, (error) => {
        handleBaseSubscriptionError("Lead data", error);
    }));

    if (isAdmin()) {
        state.unsubs.base.push(onSnapshot(collection(state.db, "projects"), (snapshot) => {
            state.projects = snapshot.docs.map(normaliseFirestoreDoc);
            refreshScopedCustomers();
            resetSelectionFromSnapshots();
            subscribeProjectDetail();
            renderAll();
        }, (error) => {
            handleBaseSubscriptionError("Job data", error);
        }));
    } else {
        state.projects = [];
        syncScopedProjects();
    }

    if (isAdmin()) {
        state.unsubs.base.push(onSnapshot(collection(state.db, "customers"), (snapshot) => {
            state.customers = snapshot.docs.map(normaliseFirestoreDoc);
            resetSelectionFromSnapshots();
            renderAll();
        }, (error) => {
            handleBaseSubscriptionError("Customer data", error);
        }));
    } else {
        refreshScopedCustomers();
    }

    state.unsubs.base.push(onSnapshot(collection(state.db, "vendors"), (snapshot) => {
        state.vendors = snapshot.docs.map(normaliseFirestoreDoc);
        resetSelectionFromSnapshots();
        renderAll();
    }, (error) => {
        handleBaseSubscriptionError("Vendor data", error);
    }));

    state.unsubs.base.push(onSnapshot(collection(state.db, "vendorBills"), (snapshot) => {
        state.vendorBills = snapshot.docs.map(normaliseFirestoreDoc);
        renderAll();
    }, (error) => {
        handleBaseSubscriptionError("Vendor bill data", error);
    }));

    const vendorDocumentSource = isAdmin()
        ? collection(state.db, "vendorDocuments")
        : query(collection(state.db, "vendorDocuments"), where("accessLevel", "==", "staff"));

    state.unsubs.base.push(onSnapshot(vendorDocumentSource, (snapshot) => {
        state.vendorDocuments = snapshot.docs.map(normaliseFirestoreDoc);
        renderAll();
    }, (error) => {
        handleBaseSubscriptionError("Vendor document data", error);
    }));

    const taskSource = isAdmin()
        ? collection(state.db, "tasks")
        : query(collection(state.db, "tasks"), where("assignedToUid", "==", state.profile.uid));

    state.unsubs.base.push(onSnapshot(taskSource, (snapshot) => {
        state.tasks = snapshot.docs.map(normaliseFirestoreDoc);
        if (!isAdmin()) {
            syncScopedProjects();
        }
        resetSelectionFromSnapshots();
        renderAll();
    }, (error) => {
        handleBaseSubscriptionError("Task data", error);
    }));

    state.unsubs.base.push(onSnapshot(doc(state.db, "emailTemplates", "estimate-default"), (snapshot) => {
        state.template = snapshot.exists() ? normaliseFirestoreDoc(snapshot) : { ...EMPTY_TEMPLATE };
        renderTemplateForm();
    }, (error) => {
        handleBaseSubscriptionError("Estimate template", error);
    }));

    if (isAdmin()) {
        state.unsubs.base.push(onSnapshot(collection(state.db, "allowedStaff"), (snapshot) => {
            state.staffRoster = snapshot.docs.map(normaliseFirestoreDoc);
            renderAll();
        }, (error) => {
            handleBaseSubscriptionError("Staff roster", error);
        }));
    } else {
        state.staffRoster = [];
    }
}

function subscribeLeadDetail() {
    clearUnsubs(state.unsubs.leadDetail);
    state.unsubs.leadDetail = [];
    state.leadActivities = [];
    state.estimate = null;

    if (!state.selectedLeadId) {
        renderLeadDetail();
        return;
    }

    state.unsubs.leadDetail.push(onSnapshot(collection(state.db, "leads", state.selectedLeadId, "activities"), (snapshot) => {
        state.leadActivities = snapshot.docs
            .map(normaliseFirestoreDoc)
            .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
        renderLeadDetail();
    }, (error) => {
        handleDetailSubscriptionError("Lead activity", error, () => {
            state.leadActivities = [];
            renderLeadDetail();
        });
    }));

    state.unsubs.leadDetail.push(onSnapshot(doc(state.db, "estimates", state.selectedLeadId), (snapshot) => {
        state.estimate = snapshot.exists() ? normaliseFirestoreDoc(snapshot) : null;
        renderLeadDetail();
    }, (error) => {
        handleDetailSubscriptionError("Estimate", error, () => {
            state.estimate = null;
            renderLeadDetail();
        });
    }));
}

function subscribeProjectDetail() {
    clearUnsubs(state.unsubs.projectDetail);
    state.unsubs.projectDetail = [];
    state.projectExpenses = [];
    state.projectPayments = [];
    state.projectChangeOrders = [];
    state.projectDocuments = [];
    state.projectNotes = [];
    state.projectActivities = [];
    state.projectLeadActivities = [];

    if (!state.selectedProjectId) {
        renderJobDetail();
        return;
    }

    state.unsubs.projectDetail.push(onSnapshot(collection(state.db, "projects", state.selectedProjectId, "expenses"), (snapshot) => {
        state.projectExpenses = snapshot.docs
            .map(normaliseFirestoreDoc)
            .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
        renderJobDetail();
    }, (error) => {
        handleDetailSubscriptionError("Job expenses", error, () => {
            state.projectExpenses = [];
            renderJobDetail();
        });
    }));

    state.unsubs.projectDetail.push(onSnapshot(collection(state.db, "projects", state.selectedProjectId, "payments"), (snapshot) => {
        state.projectPayments = snapshot.docs
            .map(normaliseFirestoreDoc)
            .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
        renderJobDetail();
    }, (error) => {
        handleDetailSubscriptionError("Job payments", error, () => {
            state.projectPayments = [];
            renderJobDetail();
        });
    }));

    state.unsubs.projectDetail.push(onSnapshot(collection(state.db, "projects", state.selectedProjectId, "changeOrders"), (snapshot) => {
        state.projectChangeOrders = snapshot.docs
            .map(normaliseFirestoreDoc)
            .sort((left, right) => toMillis(right.relatedDate || right.createdAt) - toMillis(left.relatedDate || left.createdAt));
        renderJobDetail();
    }, (error) => {
        handleDetailSubscriptionError("Job change orders", error, () => {
            state.projectChangeOrders = [];
            renderJobDetail();
        });
    }));

    state.unsubs.projectDetail.push(onSnapshot(collection(state.db, "projects", state.selectedProjectId, "documents"), (snapshot) => {
        state.projectDocuments = snapshot.docs
            .map(normaliseFirestoreDoc)
            .sort((left, right) => toMillis(right.relatedDate || right.createdAt) - toMillis(left.relatedDate || left.createdAt));
        renderJobDetail();
    }, (error) => {
        handleDetailSubscriptionError("Job documents", error, () => {
            state.projectDocuments = [];
            renderJobDetail();
        });
    }));

    state.unsubs.projectDetail.push(onSnapshot(collection(state.db, "projects", state.selectedProjectId, "notes"), (snapshot) => {
        state.projectNotes = snapshot.docs
            .map(normaliseFirestoreDoc)
            .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
        renderJobDetail();
    }, (error) => {
        handleDetailSubscriptionError("Job notes", error, () => {
            state.projectNotes = [];
            renderJobDetail();
        });
    }));

    state.unsubs.projectDetail.push(onSnapshot(collection(state.db, "projects", state.selectedProjectId, "activities"), (snapshot) => {
        state.projectActivities = snapshot.docs
            .map(normaliseFirestoreDoc)
            .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
        renderJobDetail();
    }, (error) => {
        handleDetailSubscriptionError("Job history", error, () => {
            state.projectActivities = [];
            renderJobDetail();
        });
    }));

    const linkedLeadId = currentProject()?.leadId;
    if (linkedLeadId) {
        state.unsubs.projectDetail.push(onSnapshot(collection(state.db, "leads", linkedLeadId, "activities"), (snapshot) => {
            state.projectLeadActivities = snapshot.docs
                .map(normaliseFirestoreDoc)
                .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
            renderJobDetail();
        }, (error) => {
            handleDetailSubscriptionError("Lead-to-job history", error, () => {
                state.projectLeadActivities = [];
                renderJobDetail();
            });
        }));
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
        state.db = getFirestore(state.app);
        state.storage = getStorage(state.app);
        state.provider = new GoogleAuthProvider();
        state.provider.setCustomParameters({ prompt: "select_account" });

        refs.signInButton.disabled = false;
        refs.authFeedback.textContent = "Only approved staff accounts can enter the portal.";

        onAuthStateChanged(state.auth, async (user) => {
            clearUnsubs(state.unsubs.base);
            clearUnsubs(state.unsubs.scopedProjects);
            clearUnsubs(state.unsubs.leadDetail);
            clearUnsubs(state.unsubs.projectDetail);

            if (!user) {
                state.sessionResetting = false;
                state.currentUser = null;
                state.profile = null;
                state.leads = [];
                state.projects = [];
                state.customers = [];
                state.tasks = [];
                state.staffRoster = [];
                state.selectedLeadId = null;
                state.selectedProjectId = null;
                state.selectedCustomerId = null;
                state.selectedTaskId = null;
                state.leadDraft = null;
                state.customerDraft = null;
                state.taskDraft = null;
                state.leadActivities = [];
                state.projectExpenses = [];
                state.projectPayments = [];
                state.projectChangeOrders = [];
                state.projectDocuments = [];
                state.projectNotes = [];
                state.projectActivities = [];
                state.projectLeadActivities = [];
                state.activeJobTab = "financials";
                closeDrawer();
                setBanner("", "info");
                showAuthShell();
                return;
            }

            state.sessionResetting = false;
            state.currentUser = user;

            try {
                const session = await syncSession(user);

                if (!session.authorised) {
                    showAuthShell(session.message || "This Google account is not approved for the staff portal.");
                    await signOut(state.auth);
                    return;
                }

                state.profile = session.profile;
                state.todayScope = "mine";
                applyRoleVisibility();
                showStaffShell();
                switchView("today-view");
                setBanner(
                    session.mode === "firestore"
                        ? "Staff login is running from the approved Firestore staff list while backend permissions finish syncing."
                        : session.claimsSynced === false
                            ? "Staff login is working, but backend claims sync is still degraded. Core CRM access will keep working."
                        : ""
                );
                setSyncStatus("Syncing data");
                subscribeBaseData();
                renderAll();
            } catch (error) {
                showAuthShell(error.message || "Could not verify this staff account.");
                await signOut(state.auth);
            }
        });
    } catch (error) {
        refs.authFeedback.textContent = "Firebase could not load. Check Hosting setup and try again.";
        refs.signInButton.disabled = true;
        console.error(error);
    }
}

function selectedLeadAssignee() {
    const uid = refs.leadAssigneeSelect.value || "";
    return activeStaffOptions().find((member) => member.uid === uid) || null;
}

function collectLeadFormState(baseLead = currentLead()) {
    const assignee = isAdmin() ? selectedLeadAssignee() : null;
    const customerId = isAdmin() ? (refs.leadCustomerSelect.value || null) : baseLead?.customerId || null;
    const customer = customerId ? state.customers.find((item) => item.id === customerId) : null;
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
            : baseLead?.assignedToEmail || state.profile?.email || ""
    };
}

function selectedTaskAssignee(select) {
    const uid = select.value || "";
    return activeStaffOptions().find((member) => member.uid === uid) || null;
}

async function syncLeadCustomerLink(leadId, { quiet = false } = {}) {
    const payload = await apiPost("/api/staff/lead-customer-link", { leadId });

    if (!quiet) {
        if (payload.matchResult === "created") {
            showToast("Lead saved and new customer created.");
        } else if (payload.matchResult === "linked") {
            showToast("Lead saved and linked to the matching customer.");
        } else if (payload.matchResult === "review_required") {
            showToast("Multiple customer matches found. Review the linked customer on the lead record.", "error");
        }
    }

    return payload;
}

async function saveLeadDrawer(event) {
    event.preventDefault();

    if (!isAdmin()) {
        showToast("Only admins can create leads from the quick drawer.", "error");
        return;
    }

    const draft = state.drawer.leadDraft || {};
    const assignee = activeStaffOptions().find((member) => member.uid === refs.drawerLeadAssignee.value) || preferredLeadAssignee();
    const leadRef = doc(collection(state.db, "leads"));

    const payload = {
        id: leadRef.id,
        customerId: draft.customerId || null,
        customerName: draft.customerName || "",
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
        customerMatchResult: draft.customerId ? "linked" : "",
        customerReviewRequired: false,
        customerMatchIds: draft.customerId ? [draft.customerId] : [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
        createdAt: serverTimestamp()
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
        updatedAt: serverTimestamp()
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
        updatedAt: serverTimestamp()
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

    const assignee = selectedTaskAssignee(refs.drawerTaskAssignee) || activeStaffOptions()[0] || null;
    const linkedType = refs.drawerTaskLinkedType.value;
    const linkedId = refs.drawerTaskLinkedRecord.value || "";
    const linkedLead = linkedType === "lead" ? state.leads.find((item) => item.id === linkedId) : null;
    const linkedProject = linkedType === "project" ? state.projects.find((item) => item.id === linkedId) : null;
    const created = await createQuickTask({
        title: refs.drawerTaskTitle.value,
        dueValue: refs.drawerTaskDue.value,
        priority: refs.drawerTaskPriority.value,
        assigneeSelect: refs.drawerTaskAssignee,
        leadId: linkedType === "lead" ? linkedId : null,
        customerId: linkedType === "customer"
            ? linkedId
            : linkedLead?.customerId
                || linkedProject?.customerId
                || state.drawer.taskDraft?.customerId
                || null,
        projectId: linkedType === "project" ? linkedId : null
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

async function saveTask(event) {
    event.preventDefault();

    const existing = currentTaskDoc();
    const linkedType = refs.taskLinkedTypeSelect.value;
    const linkedId = refs.taskLinkedRecordSelect.value || "";
    const assignee = selectedTaskAssignee(refs.taskAssigneeSelect) || activeStaffOptions()[0] || null;
    const payload = {
        title: refs.taskTitleInput.value.trim(),
        description: refs.taskDescriptionInput.value.trim(),
        status: refs.taskStatusSelect.value,
        priority: refs.taskPrioritySelect.value,
        dueAt: parseDateInput(refs.taskDueInput.value),
        assignedToUid: assignee?.uid || state.profile?.uid || "",
        assignedToName: assignee?.displayName || assignee?.email || state.profile?.displayName || "",
        assignedToEmail: assignee?.email || state.profile?.email || "",
        leadId: linkedType === "lead" ? linkedId : null,
        customerId: linkedType === "customer" ? linkedId : null,
        projectId: linkedType === "project" ? linkedId : null,
        updatedAt: serverTimestamp()
    };

    if (!payload.title) {
        showToast("Task title is required.", "error");
        return;
    }

    if (state.taskDraft || !existing) {
        const taskRef = doc(collection(state.db, "tasks"));
        await setDoc(taskRef, {
            id: taskRef.id,
            ...payload,
            createdAt: serverTimestamp(),
            createdByUid: state.profile.uid,
            createdByName: state.profile.displayName
        }, { merge: true });

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
        updatedAt: serverTimestamp()
    });

    showToast("Task marked complete.");
}

async function createQuickTask({ title, dueValue, priority, assigneeSelect, leadId = null, customerId = null, projectId = null }) {
    const assignee = selectedTaskAssignee(assigneeSelect) || activeStaffOptions()[0] || null;
    const cleanTitle = safeString(title);

    if (!cleanTitle) {
        showToast("Task title is required.", "error");
        return false;
    }

    const taskRef = doc(collection(state.db, "tasks"));
    await setDoc(taskRef, {
        id: taskRef.id,
        title: cleanTitle,
        description: "",
        status: "open",
        priority,
        dueAt: parseDateInput(dueValue),
        assignedToUid: assignee?.uid || state.profile?.uid || "",
        assignedToName: assignee?.displayName || assignee?.email || state.profile?.displayName || "",
        assignedToEmail: assignee?.email || state.profile?.email || "",
        leadId,
        customerId,
        projectId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdByUid: state.profile.uid,
        createdByName: state.profile.displayName
    }, { merge: true });

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
        customerMatchIds: refs.leadCustomerSelect.value ? [refs.leadCustomerSelect.value] : [],
        updatedAt: serverTimestamp()
    };

    if (!payload.clientName || !payload.clientPhone) {
        showToast("Client name and phone are required.", "error");
        return;
    }

    if (!isAdmin() && existing && existing.status !== "closed_won" && payload.status === "closed_won") {
        showToast("Only admins can mark a lead won and create the linked job.", "error");
        refs.leadStageSelect.value = existing.status || "new_lead";
        return;
    }

    if (state.leadDraft || !existing) {
        const leadRef = doc(collection(state.db, "leads"));
        await setDoc(leadRef, {
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
            createdAt: serverTimestamp()
        }, { merge: true });

        await addDoc(collection(state.db, "leads", leadRef.id, "activities"), {
            activityType: "system",
            title: "Lead created in staff CRM",
            body: "Manual lead created inside the staff portal.",
            actorName: state.profile.displayName,
            actorUid: state.profile.uid,
            actorRole: state.profile.role,
            createdAt: serverTimestamp()
        });

        await syncLeadCustomerLink(leadRef.id, { quiet: true });
        state.leadDraft = null;
        state.selectedLeadId = leadRef.id;
        state.leadWorkspaceOpen = true;
        subscribeLeadDetail();
        syncLeadRouteState();
        showToast("Lead created.");
        return;
    }

    const statusChanged = existing.status !== payload.status;
    const reassigned = isAdmin() && existing.assignedToUid !== (payload.assignedToUid || null);
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
            createdAt: serverTimestamp()
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
            createdAt: serverTimestamp()
        });
    }

    if (customerChanged) {
        await addDoc(collection(state.db, "leads", existing.id, "activities"), {
            activityType: "system",
            title: "Customer link updated",
            body: payload.customerName ? `Linked to customer ${payload.customerName}.` : "Removed linked customer.",
            actorName: state.profile.displayName,
            actorUid: state.profile.uid,
            actorRole: state.profile.role,
            createdAt: serverTimestamp()
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
        customerMatchResult: (overrides.customerId || formState.customerId) ? "linked" : (lead.customerMatchResult || ""),
        customerReviewRequired: Boolean(overrides.customerReviewRequired || false),
        customerMatchIds: overrides.customerId || formState.customerId
            ? [overrides.customerId || formState.customerId]
            : (lead.customerMatchIds || []),
        updatedAt: serverTimestamp()
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
            updatedAt: serverTimestamp()
        });
    }

    await addDoc(collection(state.db, "leads", lead.id, "activities"), {
        activityType: "system",
        title: nextStatus === "closed_lost" ? "Lead marked lost" : "Lead stage updated",
        body: nextStatus === "closed_lost"
            ? `Lead was closed lost from the ${source === "drag" ? "pipeline board" : "record actions"}.`
            : `Moved to ${STATUS_META[nextStatus]} from the ${source === "drag" ? "pipeline board" : "record actions"}.`,
        actorName: state.profile.displayName,
        actorUid: state.profile.uid,
        actorRole: state.profile.role,
        createdAt: serverTimestamp()
    });

    showToast(nextStatus === "closed_lost" ? "Lead marked lost." : `Lead moved to ${STATUS_META[nextStatus]}.`);
}

async function convertLeadToProject(lead = currentLeadDoc()) {
    if (!lead?.id) {
        showToast("Save the lead first.", "error");
        return;
    }

    const existingProject = projectForLead(lead);
    if (existingProject) {
        state.selectedProjectId = existingProject.id;
        switchView("jobs-view");
        subscribeProjectDetail();
        showToast("This lead already has a job record.");
        return;
    }

    if (lead.id === state.selectedLeadId && !state.leadDraft) {
        const leadFormState = collectLeadFormState(lead);
        if (!leadFormState.clientName || !leadFormState.clientPhone) {
            showToast("Client name and phone are required before marking a lead won.", "error");
            return;
        }

        await updateDoc(doc(state.db, "leads", lead.id), {
            ...leadFormState,
            customerMatchResult: leadFormState.customerId ? "linked" : (lead.customerMatchResult || ""),
            customerReviewRequired: false,
            customerMatchIds: leadFormState.customerId ? [leadFormState.customerId] : (lead.customerMatchIds || []),
            updatedAt: serverTimestamp()
        });
    }

    const response = await apiPost("/api/staff/convert-lead", { leadId: lead.id });

    if (response.matchResult === "review_required") {
        showToast("Multiple customer matches were found. Review the linked customer first.", "error");
        return;
    }

    state.selectedProjectId = response.projectId;
    switchView("jobs-view");
    subscribeProjectDetail();
    showToast(response.existing ? "This lead already has a job record." : "Job created from won lead.");
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
        createdAt: serverTimestamp()
    });

    refs.noteBody.value = "";
    showToast("Internal note saved.");
}

async function saveEstimateDraft(event) {
    event.preventDefault();
    const lead = currentLeadDoc();

    if (!lead || !isAdmin()) {
        showToast("Save the lead first.", "error");
        return;
    }

    const estimate = collectEstimateForm();
    await setDoc(doc(state.db, "estimates", lead.id), {
        id: lead.id,
        leadId: lead.id,
        status: "draft",
        subject: estimate.subject,
        emailBody: estimate.emailBody,
        assumptions: estimate.assumptions,
        lineItems: estimate.lineItems,
        subtotal: estimate.subtotal,
        updatedAt: serverTimestamp(),
        createdAt: state.estimate?.createdAt || serverTimestamp(),
        lastEditedByUid: state.profile.uid,
        lastEditedByName: state.profile.displayName
    }, { merge: true });

    await updateDoc(doc(state.db, "leads", lead.id), {
        hasEstimate: true,
        estimateSubtotal: estimate.subtotal,
        estimateTitle: estimate.subject,
        estimateUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    await addDoc(collection(state.db, "leads", lead.id, "activities"), {
        activityType: "estimate",
        title: "Estimate updated",
        body: "Current estimate content was updated in the staff portal.",
        actorName: state.profile.displayName,
        actorUid: state.profile.uid,
        actorRole: state.profile.role,
        createdAt: serverTimestamp()
    });

    showToast("Estimate saved.");
}

async function createEstimateDraft() {
    const lead = currentLeadDoc();
    if (!lead || !isAdmin()) {
        showToast("Save the lead first.", "error");
        return;
    }

    refs.estimateAiButton.disabled = true;
    refs.estimateAiButton.textContent = "Creating...";

    try {
        const draft = buildTemplateEstimateDraft(lead);
        const estimatePayload = {
            id: lead.id,
            leadId: lead.id,
            status: "draft",
            generatedBy: "template",
            subject: draft.subject,
            emailBody: draft.emailBody,
            assumptions: draft.assumptions,
            lineItems: draft.lineItems,
            subtotal: draft.subtotal,
            updatedAt: serverTimestamp(),
            createdAt: state.estimate?.createdAt || serverTimestamp(),
            lastEditedByUid: state.profile.uid,
            lastEditedByName: state.profile.displayName
        };

        await Promise.all([
            setDoc(doc(state.db, "estimates", lead.id), estimatePayload, { merge: true }),
            updateDoc(doc(state.db, "leads", lead.id), {
                hasEstimate: true,
                estimateSubtotal: draft.subtotal,
                estimateTitle: draft.subject,
                estimateUpdatedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }),
            addDoc(collection(state.db, "leads", lead.id, "activities"), {
                activityType: "estimate",
                title: "Estimate draft refreshed",
                body: "Estimate draft generated from the internal template.",
                actorName: state.profile.displayName,
                actorUid: state.profile.uid,
                actorRole: state.profile.role,
                createdAt: serverTimestamp()
            })
        ]);

        state.estimate = {
            ...estimatePayload,
            updatedAt: new Date().toISOString()
        };
        renderLeadDetail();
        showToast("Estimate draft created.");
    } catch (error) {
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
        await navigator.clipboard.writeText(buildEstimatePlainText(lead, collectEstimateForm()));
        showToast("Estimate copied.");
    } catch (error) {
        showToast("Could not copy the estimate.", "error");
    }
}

function openEstimatePrintView() {
    const lead = currentLead();
    if (!lead) {
        showToast("Select a lead first.", "error");
        return;
    }

    const previewHtml = buildEstimatePreviewHtml(lead, collectEstimateForm());
    const printWindow = window.open("", "_blank", "noopener,noreferrer");

    if (!printWindow) {
        showToast("Pop-up blocked. Allow pop-ups to open the print view.", "error");
        return;
    }

    printWindow.document.write(`<!DOCTYPE html>
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
            --muted: #6d6356;
            --line: #e7dac4;
            --brand: #c5a059;
            --brand-deep: #8e6a2e;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 32px;
            background: #f4eee4;
            color: var(--ink);
            font-family: "Manrope", Arial, sans-serif;
        }
        .estimate-sheet {
            max-width: 960px;
            margin: 0 auto;
            padding: 32px;
            background: var(--paper);
            border-top: 4px solid var(--brand);
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
        .estimate-eyebrow {
            margin-bottom: 10px;
            color: var(--brand-deep);
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.18em;
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
        .estimate-print-foot {
            color: var(--muted);
            line-height: 1.7;
        }
        .estimate-company-card,
        .estimate-copy-block,
        .estimate-next-step {
            padding: 18px;
            background: #faf6ef;
            border: 1px solid var(--line);
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
            letter-spacing: 0.14em;
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
            padding: 16px;
            background: #faf6ef;
            border: 1px solid var(--line);
        }
        .estimate-table {
            width: 100%;
            border-collapse: collapse;
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
        .estimate-table tfoot td {
            border-bottom: 0;
            padding-top: 16px;
            font-size: 16px;
            font-weight: 800;
            color: var(--ink);
        }
        .estimate-table tfoot td:last-child {
            color: var(--brand-deep);
        }
        .estimate-foot {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 24px;
            margin-top: 28px;
        }
        .estimate-foot ul {
            margin: 0;
            padding-left: 18px;
        }
        .estimate-print-foot {
            display: flex;
            justify-content: space-between;
            gap: 18px;
            align-items: flex-end;
            margin-top: 28px;
            padding-top: 18px;
            border-top: 1px solid var(--line);
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
            .estimate-print-foot {
                display: grid;
            }
        }
    </style>
</head>
<body>${previewHtml}</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
        printWindow.print();
    }, 250);
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
        updatedAt: serverTimestamp()
    };

    if (!payload.name) {
        showToast("Customer name is required.", "error");
        return;
    }

    if (state.customerDraft || !existing) {
        const customerRef = doc(collection(state.db, "customers"));
        await setDoc(customerRef, {
            id: customerRef.id,
            ...payload,
            allowedStaffUids: uniqueValues([state.profile?.uid]),
            createdAt: serverTimestamp()
        }, { merge: true });

        state.customerDraft = null;
        state.selectedCustomerId = customerRef.id;
        showToast("Customer created.");
    } else {
        await updateDoc(doc(state.db, "customers", existing.id), payload);
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
        insuranceExpirationDate: parseDateOnlyInput(refs.vendorInsuranceExpirationInput.value),
        licenseExpirationDate: parseDateOnlyInput(refs.vendorLicenseExpirationInput.value),
        insuranceNote: refs.vendorInsuranceNoteInput.value.trim(),
        notes: refs.vendorNotesInput.value.trim(),
        updatedAt: serverTimestamp()
    };

    if (!payload.name) {
        showToast("Vendor name is required.", "error");
        return;
    }

    if (state.vendorDraft || !existing) {
        const vendorRef = doc(collection(state.db, "vendors"));
        await setDoc(vendorRef, {
            id: vendorRef.id,
            ...payload,
            createdAt: serverTimestamp()
        }, { merge: true });

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
    file = null
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
        const uploadRef = storageRef(state.storage, `vendors/${vendorId}/documents/${documentRef.id}/${safeFileName}`);
        await uploadBytes(uploadRef, file);
        fileUrl = await getDownloadURL(uploadRef);
        filePath = uploadRef.fullPath;
    }

    const finalTitle = title.trim() || VENDOR_DOCUMENT_CATEGORY_META[category] || "Document";

    await setDoc(documentRef, {
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
        createdAt: serverTimestamp()
    }, { merge: true });

    return {
        id: documentRef.id,
        title: finalTitle,
        externalUrl: resolvedExternalUrl,
        fileUrl
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
    const invoiceDate = parseDateOnlyInput(refs.vendorBillInvoiceDateInput.value) || new Date();
    const dueDate = parseDateOnlyInput(refs.vendorBillDueDateInput.value) || invoiceDate;
    const sourceType = refs.vendorBillSourceTypeInput.value || "none";
    let invoiceDocument = null;

    if (sourceType !== "none") {
        invoiceDocument = await createVendorDocumentRecord({
            vendorId: vendor.id,
            category: "invoice",
            accessLevel: "staff",
            sourceType,
            title: billNumber ? `${billNumber} invoice` : `${vendor.name || "Vendor"} invoice`,
            note: refs.vendorBillNoteInput.value.trim(),
            relatedDate: invoiceDate,
            externalUrl: refs.vendorBillUrlInput.value,
            file: refs.vendorBillFileInput.files?.[0] || null
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
        updatedAt: serverTimestamp()
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
        updatedAt: serverTimestamp()
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
    showToast(`Vendor bill marked ${VENDOR_BILL_STATUS_META[nextStatus] || nextStatus}.`);
}

async function saveVendorDocument(event) {
    event.preventDefault();

    const vendor = currentVendorDoc();
    if (!vendor || !isAdmin()) return;

    const category = refs.vendorDocumentCategoryInput.value || "other";
    const accessLevel = category === "w9"
        ? "admin_only"
        : (refs.vendorDocumentAccessInput.value || "staff");

    await createVendorDocumentRecord({
        vendorId: vendor.id,
        category,
        accessLevel,
        sourceType: refs.vendorDocumentSourceTypeInput.value || "upload",
        title: refs.vendorDocumentTitleInput.value.trim(),
        note: refs.vendorDocumentNoteInput.value.trim(),
        relatedDate: parseDateOnlyInput(refs.vendorDocumentDateInput.value) || new Date(),
        expirationDate: parseDateOnlyInput(refs.vendorDocumentExpirationInput.value),
        externalUrl: refs.vendorDocumentUrlInput.value,
        file: refs.vendorDocumentFileInput.files?.[0] || null
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
        actorRole: state.profile?.role || "employee"
    };
}

async function addProjectActivityEntry(projectId, activityType, title, body = "") {
    if (!projectId) return;

    await addDoc(collection(state.db, "projects", projectId, "activities"), {
        activityType,
        title,
        body,
        ...projectActorFields(),
        createdAt: serverTimestamp()
    });
}

function collectAssignedWorkers(project) {
    return Array.from(refs.workerAssignmentList.querySelectorAll("[data-worker-check]")).flatMap((checkbox) => {
        if (!checkbox.checked) return [];
        const key = checkbox.dataset.workerCheck;
        const percentInput = refs.workerAssignmentList.querySelector(`[data-worker-percent="${CSS.escape(key)}"]`);
        const member = activeStaffOptions().find((staff) => (staff.uid || staff.email) === key)
            || (project.assignedWorkers || []).find((worker) => (worker.uid || worker.email) === key);

        if (!member) {
            return [];
        }

        return [{
            uid: member.uid || "",
            name: member.displayName || member.name || member.email || "Assigned worker",
            email: member.email || "",
            percent: toNumber(percentInput?.value)
        }];
    });
}

function selectedReceiptDocument() {
    const receiptId = refs.expenseReceiptSelect.value || "";
    return receiptId ? state.projectDocuments.find((item) => item.id === receiptId) || null : null;
}

function selectedExpenseVendor() {
    if (!refs.expenseVendorSelect) {
        return null;
    }

    const vendorId = refs.expenseVendorSelect.value || "";
    return vendorId ? state.vendors.find((vendor) => vendor.id === vendorId) || null : null;
}

function renderExpenseVendorOptions(selectedVendorId = refs.expenseVendorSelect?.value || "") {
    if (!refs.expenseVendorSelect) {
        return;
    }

    refs.expenseVendorSelect.innerHTML = [`<option value="">No vendor record</option>`].concat(
        sortByUpdatedDesc(state.vendors).map((vendor) => `
            <option value="${escapeHtml(vendor.id)}">${escapeHtml(`${vendor.name || "Unnamed vendor"} · ${(vendor.tradeIds || []).slice(0, 2).map((tradeId) => vendorTradeLabel(tradeId)).join(", ") || (vendor.tradeOtherText || "Trade not set")}`)}</option>
        `)
    ).join("");
    refs.expenseVendorSelect.value = selectedVendorId || "";
}

async function saveProject(event) {
    event.preventDefault();
    const project = currentProject();
    if (!project || !isAdmin()) return;

    const ownerUid = refs.jobOwnerSelect.value || null;
    const nextStatus = refs.jobStatusSelect.value || "in_progress";
    const nextBaseContractValue = toNumber(refs.jobBaseContractInput.value);
    const assignedWorkers = collectAssignedWorkers(project);

    const allowedStaffUids = uniqueValues([
        ownerUid,
        ...assignedWorkers.map((worker) => worker.uid)
    ]);

    if (project.commissionLocked && project.status === "completed" && nextStatus !== "completed") {
        showToast("Use Reopen and recalculate to unlock a completed job.", "error");
        return;
    }

    await updateDoc(doc(state.db, "projects", project.id), {
        status: nextStatus,
        baseContractValue: nextBaseContractValue,
        jobValue: nextBaseContractValue,
        assignedLeadOwnerUid: ownerUid,
        assignedWorkers,
        assignedWorkerIds: assignedWorkers.map((worker) => worker.uid).filter(Boolean),
        allowedStaffUids,
        updatedAt: serverTimestamp()
    });

    const previousBaseContractValue = toNumber(project.baseContractValue || project.financials?.baseContractValue || project.jobValue || 0);
    const activityWrites = [];

    if (previousBaseContractValue !== nextBaseContractValue) {
        activityWrites.push(addProjectActivityEntry(
            project.id,
            "financials",
            "Base contract updated",
            `Contract value moved from ${formatCurrency(previousBaseContractValue)} to ${formatCurrency(nextBaseContractValue)}.`
        ));
    }

    if ((project.status || "in_progress") !== nextStatus) {
        activityWrites.push(addProjectActivityEntry(
            project.id,
            "status",
            "Job status updated",
            `Status moved from ${JOB_STATUS_META[project.status] || "In Progress"} to ${JOB_STATUS_META[nextStatus] || "In Progress"}.`
        ));
    }

    const previousWorkerKey = JSON.stringify((project.assignedWorkers || []).map((worker) => ({
        uid: worker.uid || "",
        email: worker.email || "",
        percent: toNumber(worker.percent)
    })));
    const nextWorkerKey = JSON.stringify(assignedWorkers.map((worker) => ({
        uid: worker.uid || "",
        email: worker.email || "",
        percent: toNumber(worker.percent)
    })));

    if ((project.assignedLeadOwnerUid || "") !== (ownerUid || "") || previousWorkerKey !== nextWorkerKey) {
        activityWrites.push(addProjectActivityEntry(
            project.id,
            "team",
            "Team setup updated",
            `${assignedWorkers.length} workers are assigned to this job.`
        ));
    }

    await Promise.all(activityWrites);
    showToast(nextStatus === "completed" ? "Job saved. Commission will lock after sync." : "Job setup saved.");
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

    await addDoc(collection(state.db, "projects", project.id, "expenses"), {
        amount,
        category,
        vendorId: selectedVendor?.id || null,
        vendor,
        note,
        relatedDate,
        receiptDocumentId: receiptDocument?.id || null,
        receiptTitle: receiptDocument?.title || "",
        receiptUrl: documentHref(receiptDocument),
        createdByUid: state.profile.uid,
        createdByName: state.profile.displayName,
        createdAt: serverTimestamp()
    });

    refs.expenseForm.reset();
    refs.expenseDate.value = todayDateInputValue();
    renderExpenseVendorOptions("");
    await addProjectActivityEntry(
        project.id,
        "expense",
        "Expense recorded",
        `${formatCurrency(amount)} recorded for ${category}${vendor ? ` with ${vendor}` : ""}.`
    );
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
    const note = refs.paymentNote.value.trim();
    const relatedDate = parseDateOnlyInput(refs.paymentDate.value) || new Date();

    await addDoc(collection(state.db, "projects", project.id, "payments"), {
        amount,
        paymentType,
        method,
        note,
        relatedDate,
        createdByUid: state.profile.uid,
        createdByName: state.profile.displayName,
        createdAt: serverTimestamp()
    });

    refs.paymentForm.reset();
    refs.paymentType.value = "progress";
    refs.paymentDate.value = todayDateInputValue();
    await addProjectActivityEntry(
        project.id,
        "payment",
        "Client payment recorded",
        `${formatCurrency(amount)} logged as ${PAYMENT_TYPE_META[paymentType] || "payment"}${method ? ` via ${method}` : ""}.`
    );
    showToast("Payment recorded.");
}

async function addChangeOrder(event) {
    event.preventDefault();
    const project = currentProject();
    if (!project || !isAdmin()) return;

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

    await addDoc(collection(state.db, "projects", project.id, "changeOrders"), {
        title,
        amount,
        status,
        note: refs.changeOrderNote.value.trim(),
        relatedDate: parseDateOnlyInput(refs.changeOrderDate.value) || new Date(),
        createdByUid: state.profile.uid,
        createdByName: state.profile.displayName,
        createdAt: serverTimestamp()
    });

    refs.changeOrderForm.reset();
    refs.changeOrderStatus.value = "draft";
    refs.changeOrderDate.value = todayDateInputValue();
    await addProjectActivityEntry(
        project.id,
        "change_order",
        "Change order added",
        `${title} for ${formatCurrency(amount)} is marked ${CHANGE_ORDER_STATUS_META[status] || "Draft"}.`
    );
    showToast("Change order saved.");
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
        createdAt: serverTimestamp()
    });

    refs.jobNoteForm.reset();
    showToast("Job note saved.");
}

async function saveJobDocument(event) {
    event.preventDefault();
    const project = currentProject();
    if (!project) return;

    const category = refs.jobDocumentCategory.value || "other";
    const sourceType = refs.jobDocumentSourceType.value || "upload";
    const title = refs.jobDocumentTitle.value.trim() || DOCUMENT_CATEGORY_META[category] || "Document";
    const note = refs.jobDocumentNote.value.trim();
    const relatedDate = parseDateOnlyInput(refs.jobDocumentDate.value) || new Date();
    const documentRef = doc(collection(state.db, "projects", project.id, "documents"));
    let externalUrl = "";
    let fileUrl = "";
    let filePath = "";
    let fileName = "";

    if (sourceType === "link") {
        externalUrl = refs.jobDocumentUrl.value.trim();
        if (!externalUrl) {
            showToast("Add the external document link first.", "error");
            return;
        }
    }

    if (sourceType === "upload") {
        const file = refs.jobDocumentFile.files?.[0];
        if (!file) {
            showToast("Choose a file to upload.", "error");
            return;
        }

        fileName = file.name;
        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
        const uploadRef = storageRef(state.storage, `projects/${project.id}/documents/${documentRef.id}/${safeFileName}`);
        await uploadBytes(uploadRef, file);
        fileUrl = await getDownloadURL(uploadRef);
        filePath = uploadRef.fullPath;
    }

    await setDoc(documentRef, {
        id: documentRef.id,
        category,
        sourceType,
        title,
        note,
        relatedDate,
        externalUrl,
        fileUrl,
        filePath,
        fileName,
        createdByUid: state.profile.uid,
        createdByName: state.profile.displayName,
        createdByRole: state.profile.role,
        createdAt: serverTimestamp()
    }, { merge: true });

    refs.jobDocumentForm.reset();
    refs.jobDocumentSourceType.value = "upload";
    refs.jobDocumentDate.value = todayDateInputValue();
    renderJobDocumentSourceFields();
    await addProjectActivityEntry(
        project.id,
        "document",
        "Document added",
        `${title} was added under ${DOCUMENT_CATEGORY_META[category] || "Other"}.`
    );
    showToast("Document saved.");
}

async function reopenAndUnlockCommission() {
    const project = currentProject();
    if (!project || !isAdmin()) return;

    await updateDoc(doc(state.db, "projects", project.id), {
        status: "in_progress",
        commissionLocked: false,
        lockedCommissionSnapshot: null,
        updatedAt: serverTimestamp()
    });

    await addProjectActivityEntry(
        project.id,
        "commission",
        "Commission reopened",
        "The commission snapshot was unlocked so the payout can be recalculated."
    );
    showToast("Job reopened and commission unlocked.");
}

async function saveTemplate(event) {
    event.preventDefault();
    if (!isAdmin()) return;

    await setDoc(doc(state.db, "emailTemplates", "estimate-default"), {
        id: "estimate-default",
        name: refs.templateName.value.trim(),
        subjectTemplate: refs.templateSubject.value.trim(),
        greeting: refs.templateGreeting.value.trim(),
        intro: refs.templateIntro.value.trim(),
        outro: refs.templateOutro.value.trim(),
        terms: refs.templateTerms.value.trim(),
        updatedAt: serverTimestamp(),
        createdAt: state.template?.createdAt || serverTimestamp()
    }, { merge: true });

    showToast("Estimate template saved.");
}

function resetStaffForm() {
    state.selectedStaffKey = null;
    refs.staffForm.reset();
    refs.staffActive.checked = true;
    refs.staffDefaultAssignee.checked = false;
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

    const key = sanitiseEmailKey(email);
    const existing = state.staffRoster.find((member) => member.id === key);
    const record = {
        id: key,
        email,
        displayName: refs.staffDisplayName.value.trim(),
        role: refs.staffRole.value,
        defaultLeadAssignee: refs.staffDefaultAssignee.checked,
        active: refs.staffActive.checked,
        createdAt: existing?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    if (record.defaultLeadAssignee) {
        const batch = writeBatch(state.db);
        batch.set(doc(state.db, "allowedStaff", key), record, { merge: true });

        state.staffRoster
            .filter((member) => member.id !== key && member.defaultLeadAssignee)
            .forEach((member) => {
                batch.set(doc(state.db, "allowedStaff", member.id), {
                    defaultLeadAssignee: false,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            });

        await batch.commit();
    } else {
        await setDoc(doc(state.db, "allowedStaff", key), record, { merge: true });
    }

    showToast(existing ? "Staff access updated." : "Staff access created.");
    resetStaffForm();
}

function openLeadTasksFromRecord() {
    const lead = currentLeadDoc();
    if (!lead) {
        showToast("Save the lead first.", "error");
        return;
    }

    openTaskDrawer({
        leadId: lead.id,
        customerId: lead.customerId || null
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
        leadId: project.leadId || null
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
    const targets = Array.isArray(refs[refKey]) && refs[refKey].length
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
        openTaskDrawer();
        return;
    }

    if (command === "start-customer-draft") {
        openCustomerDrawer();
        return;
    }

    if (command === "start-vendor-draft") {
        openVendorDrawer();
        return;
    }

    if (command === "open-view") {
        switchView(target.dataset.targetView);
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
        updateVendorBillStatus(target.dataset.billId, target.dataset.billStatus).catch((error) => showToast(error.message, "error"));
        return;
    }

    if (command === "job-create-task") {
        focusJobTaskForm();
    }
}

function handleRecordOpen(target) {
    if (target.dataset.command) {
        handleCommandAction(target);
        return;
    }

    const viewId = target.dataset.openView;
    if (target.dataset.openTask) {
        selectTask(target.dataset.openTask);
    }
    if (target.dataset.openLead) {
        selectLead(target.dataset.openLead);
    }
    if (target.dataset.openProject) {
        selectProject(target.dataset.openProject);
    }
    if (target.dataset.openCustomer) {
        selectCustomer(target.dataset.openCustomer);
    }
    if (target.dataset.openVendor) {
        selectVendor(target.dataset.openVendor);
    }
    if (viewId) {
        switchView(viewId);
    }
}

function bindUi() {
    refs.signInButton.addEventListener("click", async () => {
        try {
            await signInWithPopup(state.auth, state.provider);
        } catch (error) {
            if (error.code === "auth/popup-blocked" || error.code === "auth/cancelled-popup-request") {
                await signInWithRedirect(state.auth, state.provider);
                return;
            }

            showToast("Google sign-in could not start.", "error");
        }
    });

    refs.signOutButton.addEventListener("click", async () => {
        await signOut(state.auth);
        showAuthShell();
    });

    refs.navButtons.forEach((button) => {
        button.addEventListener("click", () => {
            if (button.dataset.view === "leads-view") {
                state.leadWorkspaceOpen = false;
            }
            switchView(button.dataset.view);
            renderAll();
        });
    });

    Array.from(refs.todayScopeToggle.querySelectorAll("[data-today-scope]")).forEach((button) => {
        button.addEventListener("click", () => {
            state.todayScope = button.dataset.todayScope;
            renderAll();
        });
    });

    [
        refs.workspaceCommandBar,
        refs.todayOverdueList,
        refs.todayDueTodayList,
        refs.todayNewLeadsList,
        refs.todayEstimatesList,
        refs.todayJobsList,
        refs.leadRecordContext,
        refs.customerRecordContext,
        refs.jobRecordContext,
        refs.customerOpportunitiesList,
        refs.customerJobsList,
        refs.customerCurrentEstimate,
        refs.leadJobSummary,
        refs.leadTaskList,
        refs.customerTaskList,
        refs.jobTaskList,
        refs.vendorRecordContext,
        refs.vendorJobList,
        refs.vendorBillList
    ].forEach((container) => {
        container.addEventListener("click", (event) => {
            const button = event.target.closest("[data-command], [data-open-view], [data-task-id], [data-open-project], [data-open-lead], [data-open-customer], [data-open-vendor]");
            if (!button) return;

            if (button.dataset.taskId) {
                selectTask(button.dataset.taskId);
                switchView("tasks-view");
                return;
            }

            handleRecordOpen(button);
        });
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

    refs.taskLinkedRecordSelect.addEventListener("change", renderTaskRelatedSummary);

    refs.taskCompleteButton.addEventListener("click", () => {
        markTaskComplete().catch((error) => showToast(error.message, "error"));
    });

    refs.taskResetButton.addEventListener("click", () => {
        startTaskDraft();
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
        const button = event.target.closest("[data-lead-id]");
        if (!button) return;
        selectLead(button.dataset.leadId);
    });

    refs.leadBoard.addEventListener("click", (event) => {
        const button = event.target.closest("[data-lead-id]");
        if (!button) return;
        selectLead(button.dataset.leadId);
    });

    refs.leadBoard.addEventListener("dragstart", (event) => {
        const card = event.target.closest("[data-draggable-lead]");
        if (!card) return;
        state.dragLeadId = card.dataset.draggableLead;
        state.dragLeadOverStatus = card.closest("[data-lane-status]")?.dataset.laneStatus || null;
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
        moveLeadToStatus(lead, lane.dataset.laneStatus, { source: "drag" }).catch((error) => showToast(error.message, "error"));
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
        moveLeadToStatus(lead, "closed_lost", { source: "button" }).catch((error) => showToast(error.message, "error"));
    });

    refs.leadMarkWonButton.addEventListener("click", () => {
        const lead = currentLeadDoc();
        if (!lead) return;
        moveLeadToStatus(lead, "closed_won", { source: "button" }).catch((error) => showToast(error.message, "error"));
    });

    refs.leadTabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            openLeadTab(button.dataset.leadTab);
        });
    });

    refs.noteForm.addEventListener("submit", (event) => {
        addNote(event).catch((error) => showToast(error.message, "error"));
    });

    refs.estimateForm.addEventListener("submit", (event) => {
        saveEstimateDraft(event).catch((error) => showToast(error.message, "error"));
    });

    refs.estimateAiButton.addEventListener("click", () => {
        createEstimateDraft().catch((error) => showToast(error.message, "error"));
    });

    refs.estimateAddLineButton.addEventListener("click", () => {
        const lines = collectEstimateForm().lineItems;
        lines.push({ label: "", description: "", amount: "" });
        renderEstimateLines(lines);
        updateEstimatePreview();
    });

    refs.estimateCopyButton.addEventListener("click", () => {
        copyEstimateToClipboard().catch((error) => showToast(error.message, "error"));
    });

    refs.estimatePrintButton.addEventListener("click", openEstimatePrintView);
    refs.estimateSubject.addEventListener("input", updateEstimatePreview);
    refs.estimateBody.addEventListener("input", updateEstimatePreview);
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

        const created = await createQuickTask({
            title: refs.customerTaskTitle.value,
            dueValue: refs.customerTaskDue.value,
            priority: refs.customerTaskPriority.value,
            assigneeSelect: refs.customerTaskAssignee,
            customerId: customer.id
        });

        if (created) {
            refs.customerTaskForm.reset();
            refs.customerTaskPriority.value = "high";
            renderTaskAssigneeOptions(refs.customerTaskAssignee, state.profile?.uid || "");
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
        saveVendorDocument(event).catch((error) => showToast(error.message, "error"));
    });

    refs.vendorBillSourceTypeInput.addEventListener("change", renderVendorBillSourceFields);
    refs.vendorDocumentSourceTypeInput.addEventListener("change", renderVendorDocumentSourceFields);
    refs.vendorDocumentCategoryInput.addEventListener("change", renderVendorDocumentAccessDefaults);

    bindRefEvent("jobSearchInput", "job-search-input", "input", (event) => {
        state.jobSearch = event.target.value || "";
        renderJobList();
    });

    bindRefEvent("jobStatusFilter", "job-status-filter", "change", (event) => {
        state.jobStatus = event.target.value;
        renderJobList();
    });

    bindRefEvent("jobList", "job-list", "click", (event) => {
        const button = event.target.closest("[data-project-id]");
        if (!button) return;
        selectProject(button.dataset.projectId);
    });

    bindRefEvent("jobCoreForm", "job-core-form", "submit", (event) => {
        saveProject(event).catch((error) => showToast(error.message, "error"));
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

    bindRefEvent("jobAddExpenseButton", "job-add-expense-button", "click", () => {
        if (!currentProject()) {
            showToast("Select a job first.", "error");
            return;
        }
        openJobTab("financials", refs.expenseAmount);
    });

    bindRefEvent("jobAddPaymentButton", "job-add-payment-button", "click", () => {
        if (!currentProject()) {
            showToast("Select a job first.", "error");
            return;
        }
        openJobTab("financials", refs.paymentAmount);
    });

    bindRefEvent("jobAddDocumentButton", "job-add-document-button", "click", () => {
        if (!currentProject()) {
            showToast("Select a job first.", "error");
            return;
        }
        openJobTab("documents", refs.jobDocumentTitle);
    });

    bindRefEvent("jobAddNoteButton", "job-add-note-button", "click", () => {
        if (!currentProject()) {
            showToast("Select a job first.", "error");
            return;
        }
        openJobTab("history", refs.jobNoteBody);
    });

    bindRefEvent("jobTaskDrawerButton", "job-task-drawer-button", "click", focusJobTaskForm);

    bindRefEvent("expenseForm", "expense-form", "submit", (event) => {
        addExpense(event).catch((error) => showToast(error.message, "error"));
    });

    bindRefEvent("expenseVendorSelect", "expense-vendor-select", "change", () => {
        const vendor = selectedExpenseVendor();
        if (vendor) {
            refs.expenseVendor.value = vendor.name || "";
        }
    });

    bindRefEvent("paymentForm", "payment-form", "submit", (event) => {
        addPayment(event).catch((error) => showToast(error.message, "error"));
    });

    bindRefEvent("changeOrderForm", "change-order-form", "submit", (event) => {
        addChangeOrder(event).catch((error) => showToast(error.message, "error"));
    });

    bindRefEvent("jobNoteForm", "job-note-form", "submit", (event) => {
        addJobNote(event).catch((error) => showToast(error.message, "error"));
    });

    bindRefEvent("jobDocumentForm", "job-document-form", "submit", (event) => {
        saveJobDocument(event).catch((error) => showToast(error.message, "error"));
    });

    bindRefEvent("jobDocumentSourceType", "job-document-source-type", "change", renderJobDocumentSourceFields);

    bindRefEvent("jobReopenUnlockButton", "job-reopen-unlock-button", "click", () => {
        reopenAndUnlockCommission().catch((error) => showToast(error.message, "error"));
    });

    refs.staffList.addEventListener("click", (event) => {
        const button = event.target.closest("[data-staff-key]");
        if (!button || !isAdmin()) return;
        const member = state.staffRoster.find((item) => item.id === button.dataset.staffKey);
        if (!member) return;
        state.selectedStaffKey = member.id;
        refs.staffEmail.value = member.email || "";
        refs.staffDisplayName.value = member.displayName || "";
        refs.staffRole.value = member.role || "employee";
        refs.staffDefaultAssignee.checked = Boolean(member.defaultLeadAssignee);
        refs.staffActive.checked = member.active !== false;
        renderStaffList();
    });

    refs.staffForm.addEventListener("submit", (event) => {
        saveStaff(event).catch((error) => showToast(error.message, "error"));
    });

    refs.staffFormReset.addEventListener("click", resetStaffForm);

    refs.templateForm.addEventListener("submit", (event) => {
        saveTemplate(event).catch((error) => showToast(error.message, "error"));
    });

    refs.drawerCloseButton.addEventListener("click", closeDrawer);
    refs.drawerBackdrop.addEventListener("click", closeDrawer);
    refs.drawerCancelButtons.forEach((button) => {
        button.addEventListener("click", closeDrawer);
    });

    refs.drawerLeadForm.addEventListener("submit", (event) => {
        saveLeadDrawer(event).catch((error) => showToast(error.message, "error"));
    });

    refs.drawerCustomerForm.addEventListener("submit", (event) => {
        saveCustomerDrawer(event).catch((error) => showToast(error.message, "error"));
    });

    refs.drawerVendorForm.addEventListener("submit", (event) => {
        saveVendorDrawer(event).catch((error) => showToast(error.message, "error"));
    });

    refs.drawerTaskForm.addEventListener("submit", (event) => {
        saveTaskDrawer(event).catch((error) => showToast(error.message, "error"));
    });

    refs.drawerTaskLinkedType.addEventListener("change", () => {
        renderDrawerTaskRecordOptions();
        renderDrawerTaskContext();
    });

    refs.drawerTaskLinkedRecord.addEventListener("change", renderDrawerTaskContext);

    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && state.drawer.type) {
            closeDrawer();
        }
    });
}

bindUi();
showAuthShell();
bootstrapFirebase();
