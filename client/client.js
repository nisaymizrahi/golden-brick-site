import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  GoogleAuthProvider,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const APP_VIEWS = {
  dashboard: {
    title: "Dashboard",
    subtitle:
      "Start with the updates that matter most right now: project progress, estimates waiting for review, invoices due, and recent client messages.",
  },
  estimates: {
    title: "Estimates",
    subtitle:
      "Review active estimates and change orders first, then keep signed approval history and older records in one place.",
  },
  jobs: {
    title: "Jobs",
    subtitle:
      "Follow each property through its client-facing phase, next step, target timing, and most recent shared update.",
  },
  billing: {
    title: "Billing",
    subtitle:
      "See invoices due, payments received, and your current billing snapshot in one clean ledger-style view.",
  },
  documents: {
    title: "Documents",
    subtitle:
      "Find shared agreements, invoices, receipts, and project files without digging through old email threads.",
  },
  messages: {
    title: "Messages",
    subtitle:
      "Keep billing questions, document follow-up, and project updates in one organized conversation history.",
  },
  account: {
    title: "Account",
    subtitle:
      "Review the contact details and support information tied to this client portal login.",
  },
};

const DOCUMENT_FILTERS = [
  { key: "all", label: "All" },
  { key: "estimates", label: "Estimates" },
  { key: "agreements", label: "Agreements" },
  { key: "invoices", label: "Invoices" },
  { key: "project", label: "Project docs" },
];

const CLIENT_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const CLIENT_SESSION_STORAGE_KEY = "goldenBrickClientPortal:lastActivityAt";
const CLIENT_SESSION_TIMEOUT_MESSAGE =
  "For security, your client portal session ended after 30 minutes of inactivity. Please sign in again.";
const CLIENT_SESSION_EVENTS = [
  "pointerdown",
  "keydown",
  "mousedown",
  "touchstart",
];

const state = {
  route: "login",
  authMode: "sign-in",
  inviteToken: "",
  invite: null,
  authAlert: null,
  portalBanner: null,
  app: null,
  auth: null,
  provider: null,
  currentUser: null,
  claimInFlight: false,
  loadingPortal: false,
  selectedView: "dashboard",
  selectedThreadId: null,
  selectedProjectId: "",
  selectedDocumentFilter: "all",
  portal: {
    bootstrap: null,
    estimates: [],
    jobs: [],
    billing: {
      summary: {},
      invoices: [],
      payments: [],
    },
    documents: [],
    threads: [],
  },
  session: {
    lastActivityAt: 0,
    timeoutId: 0,
    tracking: false,
    expiring: false,
    activityHandler: null,
    visibilityHandler: null,
    focusHandler: null,
  },
};

const refs = {
  authShell: document.getElementById("auth-shell"),
  authEyebrow: document.getElementById("auth-eyebrow"),
  authTitle: document.getElementById("auth-title"),
  authCopy: document.getElementById("auth-copy"),
  authPanelKicker: document.getElementById("auth-panel-kicker"),
  authPanelTitle: document.getElementById("auth-panel-title"),
  authPanelCopy: document.getElementById("auth-panel-copy"),
  authAlert: document.getElementById("auth-alert"),
  invitePreview: document.getElementById("invite-preview"),
  inviteCustomerName: document.getElementById("invite-customer-name"),
  inviteContactName: document.getElementById("invite-contact-name"),
  inviteEmail: document.getElementById("invite-email"),
  invitePhone: document.getElementById("invite-phone"),
  inviteScope: document.getElementById("invite-scope"),
  googleAuthButton: document.getElementById("google-auth-button"),
  googleHelper: document.getElementById("google-helper"),
  authModeToggle: document.getElementById("auth-mode-toggle"),
  authModeButtons: Array.from(document.querySelectorAll("[data-auth-mode]")),
  emailAuthForm: document.getElementById("email-auth-form"),
  displayNameRow: document.getElementById("display-name-row"),
  displayNameInput: document.getElementById("display-name-input"),
  emailInput: document.getElementById("email-input"),
  passwordInput: document.getElementById("password-input"),
  confirmPasswordRow: document.getElementById("confirm-password-row"),
  confirmPasswordInput: document.getElementById("confirm-password-input"),
  emailAuthSubmit: document.getElementById("email-auth-submit"),
  resetPasswordButton: document.getElementById("reset-password-button"),
  emailHelper: document.getElementById("email-helper"),

  portalShell: document.getElementById("portal-shell"),
  sidebarAccount: document.getElementById("sidebar-account"),
  sidebarHelp: document.getElementById("sidebar-help"),
  viewButtons: Array.from(document.querySelectorAll("[data-portal-view]")),
  portalEyebrow: document.getElementById("portal-eyebrow"),
  portalTitle: document.getElementById("portal-title"),
  portalSubtitle: document.getElementById("portal-subtitle"),
  callHelpButton: document.getElementById("call-help-button"),
  mobileCallHelpButton: document.getElementById("mobile-call-help-button"),
  signOutButton: document.getElementById("sign-out-button"),
  portalBanner: document.getElementById("portal-banner"),
  summaryStrip: document.getElementById("summary-strip"),
  portalViews: Array.from(document.querySelectorAll(".portal-view")),

  dashboardHeroTitle: document.getElementById("dashboard-hero-title"),
  dashboardHeroCopy: document.getElementById("dashboard-hero-copy"),
  dashboardAttentionList: document.getElementById("dashboard-attention-list"),
  dashboardProjectSwitcherWrap: document.getElementById(
    "dashboard-project-switcher-wrap",
  ),
  dashboardHelpCard: document.getElementById("dashboard-help-card"),
  dashboardProjectsHeading: document.getElementById(
    "dashboard-projects-heading",
  ),
  dashboardProjectSpotlight: document.getElementById(
    "dashboard-project-spotlight",
  ),
  dashboardBillingList: document.getElementById("dashboard-billing-list"),
  dashboardDocumentsList: document.getElementById("dashboard-documents-list"),
  dashboardMessagesList: document.getElementById("dashboard-messages-list"),

  estimatesReviewList: document.getElementById("estimates-review-list"),
  estimatesSignedList: document.getElementById("estimates-signed-list"),
  estimatesPastList: document.getElementById("estimates-past-list"),

  jobsProjectSwitcherWrap: document.getElementById(
    "jobs-project-switcher-wrap",
  ),
  jobsList: document.getElementById("jobs-list"),

  billingSummaryStrip: document.getElementById("billing-summary-strip"),
  invoiceList: document.getElementById("invoice-list"),
  paymentList: document.getElementById("payment-list"),

  documentsFilterBar: document.getElementById("documents-filter-bar"),
  documentsList: document.getElementById("documents-list"),

  threadList: document.getElementById("thread-list"),
  messageThreadSummary: document.getElementById("message-thread-summary"),
  messageList: document.getElementById("message-list"),
  messageForm: document.getElementById("message-form"),
  messageBody: document.getElementById("message-body"),
  messageSubmitButton: document.getElementById("message-submit-button"),

  accountSummaryGrid: document.getElementById("account-summary-grid"),
  accountHelpCard: document.getElementById("account-help-card"),
  accountAccessList: document.getElementById("account-access-list"),

  toastStack: document.getElementById("toast-stack"),
};

function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value) {
  return safeString(String(value ?? ""))
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toMillis(value) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value) {
  const millis = toMillis(value);
  if (!millis) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(millis));
}

function formatDateTime(value) {
  const millis = toMillis(value);
  if (!millis) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(millis));
}

function formatAccessScope(scope) {
  return safeString(scope) === "read_only"
    ? "Read-only portal access"
    : "Full client portal access";
}

function formatPortalRole(role, roleLabel = "") {
  if (safeString(roleLabel)) {
    return roleLabel;
  }

  const normalised = safeString(role).toLowerCase();
  if (normalised === "partner") {
    return "Partner";
  }
  if (normalised === "read_only") {
    return "Read-only";
  }
  return "Primary";
}

function approvalLabel(item = {}) {
  return safeString(item.type) === "change_order" ? "Change order" : "Estimate";
}

function capitalise(value) {
  const text = safeString(value);
  if (!text) return "";
  return text
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function emptyNote(copy) {
  return `<div class="empty-note">${escapeHtml(copy)}</div>`;
}

function summaryCard({ label, value, copy = "" }) {
  return `
        <article class="summary-card">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
            ${copy ? `<p>${escapeHtml(copy)}</p>` : ""}
        </article>
    `;
}

function readStoredSessionActivity() {
  try {
    const value = window.sessionStorage.getItem(CLIENT_SESSION_STORAGE_KEY);
    return value ? toNumber(value) : 0;
  } catch (_error) {
    return 0;
  }
}

function writeStoredSessionActivity(value) {
  try {
    window.sessionStorage.setItem(CLIENT_SESSION_STORAGE_KEY, String(value));
  } catch (_error) {
    // Ignore storage errors and keep session handling in-memory.
  }
}

function clearStoredSessionActivity() {
  try {
    window.sessionStorage.removeItem(CLIENT_SESSION_STORAGE_KEY);
  } catch (_error) {
    // Ignore storage errors and keep session handling in-memory.
  }
}

function clearPortalSessionTimer() {
  if (state.session.timeoutId) {
    window.clearTimeout(state.session.timeoutId);
    state.session.timeoutId = 0;
  }
}

function detachPortalSessionTracking() {
  clearPortalSessionTimer();

  if (state.session.activityHandler) {
    CLIENT_SESSION_EVENTS.forEach((eventName) => {
      window.removeEventListener(eventName, state.session.activityHandler);
    });
  }

  if (state.session.visibilityHandler) {
    document.removeEventListener(
      "visibilitychange",
      state.session.visibilityHandler,
    );
  }

  if (state.session.focusHandler) {
    window.removeEventListener("focus", state.session.focusHandler);
  }

  state.session.activityHandler = null;
  state.session.visibilityHandler = null;
  state.session.focusHandler = null;
  state.session.tracking = false;
}

async function expirePortalSession(
  message = CLIENT_SESSION_TIMEOUT_MESSAGE,
  type = "error",
) {
  if (state.session.expiring) {
    return;
  }

  state.session.expiring = true;
  detachPortalSessionTracking();
  clearStoredSessionActivity();
  state.session.lastActivityAt = 0;
  state.currentUser = null;
  setPortalBanner("");
  setAuthAlert(message, type);
  setPath("login", { replace: true });

  try {
    if (state.auth?.currentUser) {
      await signOut(state.auth);
    }
  } catch (error) {
    console.warn("Client portal sign-out failed.", error);
  } finally {
    state.session.expiring = false;
    renderAuthShell();
  }
}

function schedulePortalSessionTimer(referenceAt = readStoredSessionActivity()) {
  clearPortalSessionTimer();

  if (!state.currentUser) {
    return;
  }

  const lastActivityAt = referenceAt || Date.now();
  const remaining = CLIENT_SESSION_TIMEOUT_MS - (Date.now() - lastActivityAt);

  if (remaining <= 0) {
    void expirePortalSession();
    return;
  }

  state.session.timeoutId = window.setTimeout(() => {
    void expirePortalSession();
  }, remaining);
}

function recordPortalSessionActivity(timestamp = Date.now()) {
  if (!state.currentUser) {
    return;
  }

  state.session.lastActivityAt = timestamp;
  writeStoredSessionActivity(timestamp);
  schedulePortalSessionTimer(timestamp);
}

function enforcePortalSessionWindow() {
  if (!state.currentUser) {
    return;
  }

  const lastActivityAt =
    readStoredSessionActivity() || state.session.lastActivityAt;

  if (
    lastActivityAt &&
    Date.now() - lastActivityAt >= CLIENT_SESSION_TIMEOUT_MS
  ) {
    void expirePortalSession();
    return;
  }

  schedulePortalSessionTimer(lastActivityAt || Date.now());
}

function attachPortalSessionTracking() {
  if (state.session.tracking) {
    return;
  }

  state.session.activityHandler = () => {
    recordPortalSessionActivity();
  };

  state.session.visibilityHandler = () => {
    if (document.visibilityState === "visible") {
      enforcePortalSessionWindow();
    }
  };

  state.session.focusHandler = () => {
    enforcePortalSessionWindow();
  };

  CLIENT_SESSION_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, state.session.activityHandler);
  });
  document.addEventListener(
    "visibilitychange",
    state.session.visibilityHandler,
  );
  window.addEventListener("focus", state.session.focusHandler);

  state.session.tracking = true;
}

function statusPillMeta(status) {
  const normalised = safeString(status).toLowerCase();

  if (
    normalised === "paid" ||
    normalised === "signed" ||
    normalised === "completed"
  ) {
    return {
      label: normalised === "signed" ? "Signed" : capitalise(normalised),
      className: "pill success",
    };
  }

  if (normalised === "overdue") {
    return { label: "Overdue", className: "pill danger" };
  }

  if (normalised === "active") {
    return { label: "Needs review", className: "pill" };
  }

  if (normalised === "sent") {
    return { label: "Sent", className: "pill" };
  }

  if (normalised === "in_progress") {
    return { label: "In progress", className: "pill" };
  }

  if (normalised === "draft") {
    return { label: "Draft", className: "pill" };
  }

  return {
    label: capitalise(normalised || "Info"),
    className: "pill",
  };
}

function invoicePillMeta(invoice) {
  if (safeString(invoice.status).toLowerCase() === "paid") {
    return { label: "Paid", className: "pill success" };
  }

  const dueMillis = toMillis(invoice.dueDate);
  const today = Date.now();
  if (dueMillis && dueMillis < today) {
    return { label: "Overdue", className: "pill danger" };
  }

  if (dueMillis && dueMillis > today) {
    return { label: "Upcoming", className: "pill" };
  }

  return { label: "Open", className: "pill" };
}

function recordLink({
  kicker = "",
  title = "",
  copy = "",
  meta = "",
  actionHref = "",
  actionLabel = "",
  actionSecondaryHref = "",
  actionSecondaryLabel = "",
}) {
  return `
        <article class="record-link">
            <div class="record-link-row">
                <div>
                    ${kicker ? `<span>${escapeHtml(kicker)}</span>` : ""}
                    <strong>${escapeHtml(title)}</strong>
                </div>
                ${
                  actionHref || actionSecondaryHref
                    ? `
                <div class="inline-actions">
                    ${
                      actionHref
                        ? `<a class="ghost-button" href="${escapeHtml(actionHref)}" target="_blank" rel="noreferrer">${escapeHtml(actionLabel || "Open")}</a>`
                        : ""
                    }
                    ${
                      actionSecondaryHref
                        ? `<a class="ghost-button" href="${escapeHtml(actionSecondaryHref)}" target="_blank" rel="noreferrer">${escapeHtml(actionSecondaryLabel || "Download")}</a>`
                        : ""
                    }
                </div>
                `
                    : ""
                }
            </div>
            ${copy ? `<p class="record-copy">${escapeHtml(copy)}</p>` : ""}
            ${meta ? `<div class="record-meta">${meta}</div>` : ""}
        </article>
    `;
}

function helpButtonHref(help) {
  return help?.phoneHref || "tel:+12677155557";
}

function helpEmailHref(help) {
  return help?.emailHref || "mailto:info@goldenbrickc.com";
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function routeFromPath() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments[0] !== "client") return "login";
  if (segments[1] === "accept") return "accept";
  if (segments[1] === "login") return "login";
  return "app";
}

function routePath(route) {
  if (route === "accept") {
    return `/client/accept${state.inviteToken ? `?token=${encodeURIComponent(state.inviteToken)}` : ""}`;
  }
  if (route === "login") {
    return "/client/login";
  }
  return "/client/";
}

function setPath(route, { replace = false } = {}) {
  state.route = route;
  const nextPath = routePath(route);
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", nextPath);
}

function setAuthAlert(message = "", type = "error") {
  state.authAlert = message ? { message, type } : null;
  renderAuthAlert();
}

function renderAuthAlert() {
  if (!state.authAlert?.message) {
    refs.authAlert.hidden = true;
    refs.authAlert.textContent = "";
    refs.authAlert.className = "auth-alert";
    return;
  }

  refs.authAlert.hidden = false;
  refs.authAlert.textContent = state.authAlert.message;
  refs.authAlert.className = `auth-alert ${state.authAlert.type || "error"}`;
}

function setPortalBanner(message = "", type = "success") {
  state.portalBanner = message ? { message, type } : null;
  renderPortalBanner();
}

function renderPortalBanner() {
  if (!state.portalBanner?.message) {
    refs.portalBanner.hidden = true;
    refs.portalBanner.textContent = "";
    refs.portalBanner.className = "portal-banner";
    return;
  }

  refs.portalBanner.hidden = false;
  refs.portalBanner.textContent = state.portalBanner.message;
  refs.portalBanner.className = `portal-banner ${state.portalBanner.type || "success"}`;
}

function showToast(message, tone = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${tone}`;
  toast.textContent = message;
  refs.toastStack.append(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 3200);
}

function currentThread() {
  return (
    state.portal.threads.find(
      (thread) => thread.id === state.selectedThreadId,
    ) || null
  );
}

function accountProviderLabel() {
  const providerIds = new Set(
    (state.currentUser?.providerData || [])
      .map((entry) => safeString(entry.providerId))
      .filter(Boolean),
  );

  if (providerIds.has("google.com")) {
    return "Google sign-in";
  }

  if (providerIds.has("password")) {
    return "Email and password";
  }

  return "Portal login";
}

function activeJobs() {
  const jobs = Array.isArray(state.portal.jobs) ? state.portal.jobs : [];
  const nonCompleted = jobs.filter(
    (job) => safeString(job.status).toLowerCase() !== "completed",
  );
  return nonCompleted.length ? nonCompleted : jobs;
}

function ensureSelectedProject() {
  const jobs = activeJobs();
  if (!jobs.length) {
    state.selectedProjectId = "";
    return;
  }

  if (jobs.some((job) => job.id === state.selectedProjectId)) {
    return;
  }

  const preferred =
    safeString(state.portal.bootstrap?.primaryProjectId) || jobs[0]?.id || "";
  state.selectedProjectId = preferred;
}

function selectedProject() {
  const jobs = activeJobs();
  if (!jobs.length) return null;
  ensureSelectedProject();
  return jobs.find((job) => job.id === state.selectedProjectId) || jobs[0];
}

function orderedJobs() {
  const jobs = [...(Array.isArray(state.portal.jobs) ? state.portal.jobs : [])];
  return jobs.sort((left, right) => {
    if (left.id === state.selectedProjectId) return -1;
    if (right.id === state.selectedProjectId) return 1;
    return (
      toMillis(right.latestUpdateAt || right.updatedAt) -
      toMillis(left.latestUpdateAt || left.updatedAt)
    );
  });
}

function billingSnapshot() {
  const invoices = Array.isArray(state.portal.billing?.invoices)
    ? state.portal.billing.invoices
    : [];
  const payments = Array.isArray(state.portal.billing?.payments)
    ? state.portal.billing.payments
    : [];

  const openInvoices = invoices.filter(
    (invoice) => safeString(invoice.status).toLowerCase() !== "paid",
  );
  const now = Date.now();
  const dueNowInvoices = openInvoices.filter((invoice) => {
    const dueMillis = toMillis(invoice.dueDate);
    return !dueMillis || dueMillis <= now;
  });
  const upcomingInvoices = openInvoices.filter((invoice) => {
    const dueMillis = toMillis(invoice.dueDate);
    return dueMillis > now;
  });

  return {
    dueNow: dueNowInvoices.reduce(
      (sum, invoice) => sum + toNumber(invoice.subtotal),
      0,
    ),
    upcoming: upcomingInvoices.reduce(
      (sum, invoice) => sum + toNumber(invoice.subtotal),
      0,
    ),
    openCount: openInvoices.length,
    overdueCount: openInvoices.filter((invoice) => {
      const dueMillis = toMillis(invoice.dueDate);
      return dueMillis && dueMillis < now;
    }).length,
    paidToDate: payments.reduce(
      (sum, payment) => sum + toNumber(payment.amount),
      0,
    ),
  };
}

function documentFilterKey(documentItem) {
  const category = safeString(documentItem.category).toLowerCase();
  if (category.includes("estimate")) return "estimates";
  if (category.includes("agreement")) return "agreements";
  if (
    category.includes("invoice") ||
    category.includes("payment") ||
    category.includes("receipt")
  ) {
    return "invoices";
  }
  return "project";
}

function filteredDocuments() {
  if (state.selectedDocumentFilter === "all") {
    return state.portal.documents;
  }

  return state.portal.documents.filter(
    (documentItem) =>
      documentFilterKey(documentItem) === state.selectedDocumentFilter,
  );
}

function threadsForDisplay() {
  return [...state.portal.threads].sort((left, right) => {
    if (left.id === "general") return -1;
    if (right.id === "general") return 1;
    return (
      toMillis(right.lastMessageAt || right.updatedAt) -
      toMillis(left.lastMessageAt || left.updatedAt)
    );
  });
}

function requestJson(url, options = {}) {
  return fetch(url, options).then(async (response) => {
    const contentType = safeString(
      response.headers.get("content-type"),
    ).toLowerCase();
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => ({}))
      : { message: await response.text().catch(() => "Request failed.") };

    if (!response.ok) {
      const error = new Error(payload.message || "Request failed.");
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  });
}

async function authedRequest(path, options = {}) {
  if (!state.currentUser) {
    throw new Error("Sign in first.");
  }

  const token = await state.currentUser.getIdToken();
  return requestJson(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

async function authedPost(path, body = {}) {
  return authedRequest(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function applyAuthMode() {
  const isCreate = state.route === "accept" && state.authMode === "create";
  refs.authModeToggle.hidden = state.route !== "accept";
  refs.displayNameRow.hidden = !isCreate;
  refs.confirmPasswordRow.hidden = !isCreate;
  refs.resetPasswordButton.hidden = !(
    state.route === "login" || state.authMode === "sign-in"
  );

  refs.authModeButtons.forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.authMode === state.authMode,
    );
  });

  refs.emailAuthSubmit.textContent = isCreate
    ? "Create account and continue"
    : "Sign in with email";
}

function renderInvitePreview() {
  if (!state.invite) {
    refs.invitePreview.hidden = true;
    return;
  }

  refs.invitePreview.hidden = false;
  refs.inviteCustomerName.textContent =
    state.invite.customerName || "Golden Brick customer";
  refs.inviteContactName.textContent =
    state.invite.contactName || "Portal contact";
  refs.inviteEmail.textContent = state.invite.email || "Not provided";
  refs.invitePhone.textContent = state.invite.phone || "Not provided";
  refs.inviteScope.textContent = `${formatPortalRole(
    state.invite.role,
    state.invite.roleLabel,
  )} · ${formatAccessScope(state.invite.accessScope)}`;

  if (!safeString(refs.emailInput.value)) {
    refs.emailInput.value = state.invite.email || "";
  }
}

function renderAuthShell() {
  refs.authShell.hidden = false;
  refs.portalShell.hidden = true;
  renderAuthAlert();
  renderInvitePreview();

  if (state.route === "accept") {
    refs.authEyebrow.textContent = "Secure invite";
    refs.authTitle.textContent =
      "Claim your Golden Brick client portal access.";
    refs.authCopy.textContent =
      "Use the invited email address to finish setup. Once you claim access, you can come back anytime to review your projects, billing, documents, and message history. For security, inactive portal sessions sign out automatically after 30 minutes.";
    refs.authPanelKicker.textContent = "Invite claim";
    refs.authPanelTitle.textContent = "Finish setting up your portal login";
    refs.authPanelCopy.textContent =
      "This invite is tied to one approved customer contact. Use Google or create a password with the same email Golden Brick invited.";
    refs.googleHelper.textContent =
      "Google sign-in only works when the Google account email exactly matches the invited email address.";
    refs.emailHelper.textContent =
      "If you already created a password for this invited email, switch to Sign in. Otherwise create a password to finish claiming access.";
  } else {
    refs.authEyebrow.textContent = "Client portal";
    refs.authTitle.textContent =
      "Sign in to review your Golden Brick project updates and billing.";
    refs.authCopy.textContent =
      "This portal is invite-only. If Golden Brick has already approved your access, sign in with Google or the email/password you set up from your invite link. For security, inactive portal sessions sign out automatically after 30 minutes.";
    refs.authPanelKicker.textContent = "Customer login";
    refs.authPanelTitle.textContent = "Continue to your project hub";
    refs.authPanelCopy.textContent =
      "Sign in with the same email Golden Brick approved for this client portal. Need access? Ask the team for a fresh invite link.";
    refs.googleHelper.textContent =
      "Google sign-in works once your email has already been approved inside the client portal.";
    refs.emailHelper.textContent =
      "If you have not created your portal password yet, use the invite link Golden Brick sent you to finish account setup.";
    state.authMode = "sign-in";
  }

  applyAuthMode();
}

function renderSidebarAccount() {
  const account = state.portal.bootstrap?.account || {};
  refs.sidebarAccount.innerHTML = `
        <span class="mini-label">Signed in</span>
        <strong>${escapeHtml(account.customerName || "Golden Brick customer")}</strong>
        <p>${escapeHtml(account.displayName || account.contactName || account.email || "Client")}</p>
        <p>${escapeHtml(`${formatPortalRole(account.role, account.roleLabel)} · ${account.email || "No email"}`)}</p>
    `;
}

function renderHelpBlock(
  target,
  help = {},
  {
    headline = "Golden Brick support",
    title = "Need help understanding a document or next step?",
    copy = "Call or email Golden Brick if you need billing clarification, document help, or a conversation about what is coming next.",
  } = {},
) {
  target.innerHTML = `
        <div class="info-block">
            <span class="mini-label">${escapeHtml(headline)}</span>
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(copy)}</p>
            <div class="inline-actions">
                <a class="primary-button" href="${escapeHtml(helpButtonHref(help))}">${escapeHtml(help.phone || "Call Golden Brick")}</a>
                <a class="ghost-button" href="${escapeHtml(helpEmailHref(help))}">${escapeHtml(help.email || "Email Golden Brick")}</a>
            </div>
        </div>
    `;
}

function renderProjectSwitcher(
  target,
  { headline = "Project focus", detail = "", includeAll = false } = {},
) {
  const jobs = activeJobs();

  if (!jobs.length) {
    target.innerHTML = `
            <div class="info-block">
                <span class="mini-label">${escapeHtml(headline)}</span>
                <strong>No active projects are linked yet</strong>
                <p>Once Golden Brick opens a project for this account, it will appear here.</p>
            </div>
        `;
    return;
  }

  if (jobs.length === 1 && !includeAll) {
    const job = jobs[0];
    target.innerHTML = `
            <div class="switcher-block">
                <span class="mini-label">${escapeHtml(headline)}</span>
                <strong>${escapeHtml(job.address || "Project address pending")}</strong>
                <p class="helper-copy">${escapeHtml(detail || "This portal is currently tied to one active property.")}</p>
            </div>
        `;
    return;
  }

  const options = includeAll
    ? [
        { id: "all", label: "All properties" },
        ...jobs.map((job) => ({
          id: job.id,
          label: job.address || job.projectType || "Property",
        })),
      ]
    : jobs.map((job) => ({
        id: job.id,
        label: job.address || job.projectType || "Property",
      }));

  const selectedId = includeAll
    ? state.selectedProjectId || "all"
    : state.selectedProjectId;

  target.innerHTML = `
        <div class="switcher-block">
            <span class="mini-label">${escapeHtml(headline)}</span>
            <div class="filter-pills">
                ${options
                  .map(
                    (option) => `
                    <button
                        type="button"
                        class="project-select-button ${selectedId === option.id ? "is-active" : ""}"
                        data-project-select="${escapeHtml(option.id)}"
                    >
                        ${escapeHtml(option.label)}
                    </button>
                `,
                  )
                  .join("")}
            </div>
            ${detail ? `<p class="helper-copy">${escapeHtml(detail)}</p>` : ""}
        </div>
    `;
}

function renderSummaryStrip() {
  const summary = state.portal.bootstrap?.summary || {};
  const billing = state.portal.bootstrap?.billingSummary || billingSnapshot();
  refs.summaryStrip.innerHTML = [
    {
      label: "Estimates to review",
      value: String(toNumber(summary.estimatesToReview)),
      copy: "Current pricing awaiting feedback",
    },
    {
      label: "Active projects",
      value: String(
        toNumber(
          state.portal.bootstrap?.activeProjectCount || summary.activeJobs,
        ),
      ),
      copy: "Properties with live updates in this portal",
    },
    {
      label: "Due now",
      value: formatCurrency(billing.dueNow),
      copy: `${toNumber(billing.openCount)} open invoice${toNumber(billing.openCount) === 1 ? "" : "s"}`,
    },
    {
      label: "Paid to date",
      value: formatCurrency(billing.paidToDate),
      copy: "Payments received on this account",
    },
    {
      label: "Unread messages",
      value: String(toNumber(summary.unreadMessages)),
      copy: "New replies from Golden Brick",
    },
  ]
    .map(summaryCard)
    .join("");
}

function deriveAttentionItems() {
  const bootstrapItems = Array.isArray(state.portal.bootstrap?.attentionItems)
    ? state.portal.bootstrap.attentionItems
    : [];
  if (bootstrapItems.length) {
    return bootstrapItems.map((item) => ({
      label: item.label || "Portal item",
      title: item.title || "Open this section",
      copy: item.copy || "",
      view: item.view || "dashboard",
    }));
  }

  const summary = state.portal.bootstrap?.summary || {};
  const billing = billingSnapshot();
  const items = [];

  if (toNumber(summary.estimatesToReview) > 0) {
    items.push({
      label: "Review estimate",
      title: `${toNumber(summary.estimatesToReview)} estimate${toNumber(summary.estimatesToReview) === 1 ? "" : "s"} still need attention`,
      copy: "Open the estimate section to review scope, pricing, or signature status.",
      view: "estimates",
    });
  }

  if (toNumber(billing.openCount) > 0) {
    items.push({
      label: "Billing",
      title: `${toNumber(billing.openCount)} invoice${toNumber(billing.openCount) === 1 ? "" : "s"} still open`,
      copy: "See what is due now, what is upcoming, and which property each invoice belongs to.",
      view: "billing",
    });
  }

  if (toNumber(summary.unreadMessages) > 0) {
    items.push({
      label: "Messages",
      title: `${toNumber(summary.unreadMessages)} unread portal message${toNumber(summary.unreadMessages) === 1 ? "" : "s"}`,
      copy: "Read the latest reply or keep a billing and project question in one place.",
      view: "messages",
    });
  }

  if (!items.length) {
    items.push({
      label: "Everything looks organized",
      title: "No urgent portal items right now",
      copy: "You can still review jobs, documents, or billing history from the navigation at any time.",
      view: "documents",
    });
  }

  return items;
}

function renderDashboardHero() {
  const account = state.portal.bootstrap?.account || {};
  const jobs = activeJobs();
  const project = selectedProject();
  const customerName = account.customerName || "your Golden Brick account";

  if (project && jobs.length === 1) {
    refs.dashboardHeroTitle.textContent = `Follow ${project.address || "your project"} in one calm client portal.`;
    refs.dashboardHeroCopy.textContent =
      "See your current phase, next step, documents, invoices, and messages without chasing separate links or text chains.";
  } else if (jobs.length > 1) {
    refs.dashboardHeroTitle.textContent = `See what needs attention across ${jobs.length} active properties.`;
    refs.dashboardHeroCopy.textContent =
      "Switch between properties when you want a closer look, or keep the full portfolio organized from one client-facing hub.";
  } else {
    refs.dashboardHeroTitle.textContent = `Keep ${customerName} organized in one place.`;
    refs.dashboardHeroCopy.textContent =
      "When Golden Brick shares a new estimate, invoice, document, or message, it will land here in a clearer client view.";
  }

  refs.dashboardAttentionList.innerHTML = deriveAttentionItems()
    .map(
      (item) => `
        <button
            type="button"
            class="attention-card"
            data-target-view="${escapeHtml(item.view)}"
        >
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.copy)}</p>
        </button>
    `,
    )
    .join("");
}

function buildProjectTimingCopy(job) {
  if (safeString(job.targetWindow)) {
    return `Target window: ${job.targetWindow}`;
  }
  if (job.targetDate) {
    return `Target date: ${formatDate(job.targetDate)}`;
  }
  return "Golden Brick will keep the next timing update posted here.";
}

function renderDashboardProjectSpotlight() {
  const jobs = orderedJobs();
  if (!jobs.length) {
    refs.dashboardProjectsHeading.textContent = "Project overview";
    refs.dashboardProjectSpotlight.innerHTML = emptyNote(
      "No active projects are linked to this account yet.",
    );
    return;
  }

  const project = selectedProject() || jobs[0];
  const status = statusPillMeta(project.status);
  refs.dashboardProjectsHeading.textContent =
    jobs.length > 1 ? "Selected property overview" : "Project overview";

  const otherProjects = jobs.filter((job) => job.id !== project.id).slice(0, 3);

  refs.dashboardProjectSpotlight.innerHTML = `
        <article class="spotlight-card">
            <div class="spotlight-header">
                <div>
                    <span>${escapeHtml(project.projectType || "Project update")}</span>
                    <h3>${escapeHtml(project.address || "Project address pending")}</h3>
                </div>
                <span class="${status.className}">${escapeHtml(status.label)}</span>
            </div>

            <div class="spotlight-grid">
                <div class="spotlight-block">
                    <span>Current phase</span>
                    <strong>${escapeHtml(project.phaseLabel || "Planning and construction")}</strong>
                    <p>${escapeHtml(project.sharedStatusNote || "Golden Brick will keep your project summary updated here.")}</p>
                </div>
                <div class="spotlight-block">
                    <span>Next step</span>
                    <strong>${escapeHtml(project.nextStep || "Golden Brick will share the next step here.")}</strong>
                    <p>${escapeHtml(buildProjectTimingCopy(project))}</p>
                </div>
                <div class="spotlight-block">
                    <span>Billing context</span>
                    <strong>${escapeHtml(formatCurrency(project.totalPaymentsReceived))} received</strong>
                    <p>${escapeHtml(`${toNumber(project.openInvoiceCount)} open invoice${toNumber(project.openInvoiceCount) === 1 ? "" : "s"} connected to this property.`)}</p>
                </div>
                <div class="spotlight-block">
                    <span>Recent update</span>
                    <strong>${escapeHtml(formatDateTime(project.latestUpdateAt || project.updatedAt))}</strong>
                    <p>${escapeHtml(project.projectType || "Renovation project")} in your client portal.</p>
                </div>
            </div>
        </article>
        ${
          otherProjects.length
            ? `
            <section class="project-mini-list">
                <div class="section-heading">
                    <h3>Other properties on this account</h3>
                    <p>Select another property to bring its update to the top.</p>
                </div>
                ${otherProjects
                  .map((job) => {
                    const jobStatus = statusPillMeta(job.status);
                    return `
                        <button type="button" class="project-mini-card" data-project-select="${escapeHtml(job.id)}">
                            <div class="record-link-row">
                                <div>
                                    <span>${escapeHtml(job.projectType || "Project update")}</span>
                                    <strong>${escapeHtml(job.address || "Project address pending")}</strong>
                                </div>
                                <span class="${jobStatus.className}">${escapeHtml(jobStatus.label)}</span>
                            </div>
                            <p class="record-copy">${escapeHtml(job.nextStep || job.sharedStatusNote || "Golden Brick will share the next step here.")}</p>
                            <div class="record-meta">
                                <span>${escapeHtml(job.phaseLabel || "Planning and construction")}</span>
                                <span>${escapeHtml(buildProjectTimingCopy(job))}</span>
                            </div>
                        </button>
                    `;
                  })
                  .join("")}
            </section>
        `
            : ""
        }
    `;
}

function renderDashboardBilling() {
  const billing = billingSnapshot();
  const dueInvoices = [...state.portal.billing.invoices]
    .filter((invoice) => safeString(invoice.status).toLowerCase() !== "paid")
    .sort((left, right) => toMillis(left.dueDate) - toMillis(right.dueDate));

  const blocks = [
    summaryCard({
      label: "Due now",
      value: formatCurrency(billing.dueNow),
      copy: billing.overdueCount
        ? `${billing.overdueCount} invoice${billing.overdueCount === 1 ? "" : "s"} overdue`
        : "No overdue invoices",
    }),
    summaryCard({
      label: "Upcoming",
      value: formatCurrency(billing.upcoming),
      copy: `${billing.openCount} open invoice${billing.openCount === 1 ? "" : "s"} total`,
    }),
  ];

  const invoiceCards = dueInvoices.length
    ? dueInvoices
        .slice(0, 3)
        .map((invoice) => {
          const status = invoicePillMeta(invoice);
          return recordLink({
            kicker: invoice.invoiceNumber || "Invoice",
            title: invoice.title || "Project invoice",
            copy:
              invoice.projectAddress ||
              "Open the billing view for the full invoice history.",
            meta: [
              `<span class="${status.className}">${escapeHtml(status.label)}</span>`,
              invoice.dueDate
                ? `<span>Due ${escapeHtml(formatDate(invoice.dueDate))}</span>`
                : "",
              `<span>${escapeHtml(formatCurrency(invoice.subtotal))}</span>`,
            ]
              .filter(Boolean)
              .join(""),
          });
        })
        .join("")
    : emptyNote("No invoices are currently due.");

  refs.dashboardBillingList.innerHTML = blocks.join("") + invoiceCards;
}

function renderDashboardDocuments() {
  const documents = state.portal.documents.slice(0, 3);
  refs.dashboardDocumentsList.innerHTML = documents.length
    ? documents
        .map((documentItem) =>
          recordLink({
            kicker: capitalise(documentFilterKey(documentItem)),
            title: documentItem.title || "Shared file",
            copy:
              documentItem.projectAddress ||
              documentItem.note ||
              "Open this document to review the shared file.",
            meta: [
              documentItem.projectAddress
                ? `<span>${escapeHtml(documentItem.projectAddress)}</span>`
                : "",
              documentItem.relatedDate
                ? `<span>${escapeHtml(formatDate(documentItem.relatedDate))}</span>`
                : "",
            ]
              .filter(Boolean)
              .join(""),
            actionHref: documentItem.href,
            actionLabel: "Open file",
          }),
        )
        .join("")
    : emptyNote("No recent client-visible files have been shared yet.");
}

function renderDashboardMessages() {
  const threads = threadsForDisplay().slice(0, 3);
  refs.dashboardMessagesList.innerHTML = threads.length
    ? threads
        .map((thread) => {
          const unread = toNumber(thread.clientUnreadCount);
          return `
                <button
                    type="button"
                    class="thread-button"
                    data-dashboard-thread-id="${escapeHtml(thread.id)}"
                >
                    <div class="record-link-row">
                        <div>
                            <span>${escapeHtml(thread.threadType === "project" ? "Project thread" : "General updates")}</span>
                            <strong>${escapeHtml(thread.title || thread.projectAddress || "Conversation")}</strong>
                        </div>
                        <span class="${unread ? "pill" : "pill success"}">${escapeHtml(unread ? `${unread} unread` : "Read")}</span>
                    </div>
                    <p class="record-copy">${escapeHtml(thread.lastMessagePreview || "No messages yet.")}</p>
                    <div class="record-meta">
                        ${thread.projectAddress ? `<span>${escapeHtml(thread.projectAddress)}</span>` : ""}
                        <span>${escapeHtml(thread.lastMessageAt ? formatDateTime(thread.lastMessageAt) : "Waiting for first message")}</span>
                    </div>
                </button>
            `;
        })
        .join("")
    : emptyNote(
        "No message threads are active yet. Once Golden Brick sends a portal message, it will appear here.",
      );
}

function renderEstimateGroup(target, items, emptyCopy) {
  target.innerHTML = items.length
    ? items
        .map((estimate) => {
          const status = statusPillMeta(estimate.status);
          const label = approvalLabel(estimate);
          const lowerLabel = label.toLowerCase();
          return recordLink({
            kicker: estimate.projectType || label,
            title: estimate.subject || `${label} record`,
            copy:
              estimate.summary ||
              estimate.projectAddress ||
              "Property details will appear here when available.",
            meta: [
              `<span class="${status.className}">${escapeHtml(status.label)}</span>`,
              estimate.updatedAt
                ? `<span>Updated ${escapeHtml(formatDate(estimate.updatedAt))}</span>`
                : "",
              estimate.signedAt
                ? `<span>Signed ${escapeHtml(formatDate(estimate.signedAt))}</span>`
                : "",
              `<span>${escapeHtml(formatCurrency(estimate.subtotal))}</span>`,
            ]
              .filter(Boolean)
              .join(""),
            actionHref: estimate.shareUrl,
            actionLabel:
              safeString(estimate.status) === "active"
                ? `Review ${lowerLabel}`
                : `Open ${lowerLabel}`,
            actionSecondaryHref: estimate.agreementDownloadHref,
            actionSecondaryLabel:
              safeString(estimate.type) === "change_order"
                ? "Download signed change order"
                : "Download signed agreement",
          });
        })
        .join("")
    : emptyNote(emptyCopy);
}

function renderEstimates() {
  const review = state.portal.estimates.filter(
    (estimate) => safeString(estimate.status) === "active",
  );
  const signed = state.portal.estimates.filter(
    (estimate) => safeString(estimate.status) === "signed",
  );
  const past = state.portal.estimates.filter(
    (estimate) =>
      !["active", "signed"].includes(safeString(estimate.status).toLowerCase()),
  );

  renderEstimateGroup(
    refs.estimatesReviewList,
    review,
    "No estimates or change orders are currently waiting for review.",
  );
  renderEstimateGroup(
    refs.estimatesSignedList,
    signed,
    "No signed approvals are showing on this account yet.",
  );
  renderEstimateGroup(
    refs.estimatesPastList,
    past,
    "No older estimate or change-order records are available in this portal yet.",
  );
}

function renderJobsView() {
  renderProjectSwitcher(refs.jobsProjectSwitcherWrap, {
    headline: "Portfolio focus",
    detail:
      "Select a property to bring its job timeline to the top. You can still scan the rest of the portfolio below.",
  });

  const jobs = orderedJobs();
  if (!jobs.length) {
    refs.jobsList.innerHTML = emptyNote(
      "No active jobs are linked to this portal account yet.",
    );
    return;
  }

  refs.jobsList.innerHTML = jobs
    .map((job) => {
      const status = statusPillMeta(job.status);
      const isSelected = job.id === state.selectedProjectId;
      return `
            <article class="record-link timeline-card">
                <div class="record-link-row">
                    <div>
                        <span>${escapeHtml(job.projectType || "Project update")}</span>
                        <strong>${escapeHtml(job.address || "Project address pending")}</strong>
                    </div>
                    <div class="inline-actions">
                        ${isSelected ? '<span class="pill dark">Current focus</span>' : ""}
                        <span class="${status.className}">${escapeHtml(status.label)}</span>
                    </div>
                </div>
                <div class="timeline-grid">
                    <div class="timeline-step">
                        <span>Current phase</span>
                        <strong>${escapeHtml(job.phaseLabel || "Planning and construction")}</strong>
                        <p>${escapeHtml(job.sharedStatusNote || "Golden Brick will keep the latest shared note posted here.")}</p>
                    </div>
                    <div class="timeline-step">
                        <span>Next step</span>
                        <strong>${escapeHtml(job.nextStep || "Golden Brick will share the next step here.")}</strong>
                        <p>${escapeHtml(job.projectType || "Renovation project")} tied to this property.</p>
                    </div>
                    <div class="timeline-step">
                        <span>Timing</span>
                        <strong>${escapeHtml(buildProjectTimingCopy(job))}</strong>
                        <p>${escapeHtml(job.latestUpdateAt ? `Updated ${formatDateTime(job.latestUpdateAt)}` : "Awaiting the next portal update.")}</p>
                    </div>
                </div>
                <div class="record-meta">
                    <span>${escapeHtml(`${toNumber(job.openInvoiceCount)} open invoice${toNumber(job.openInvoiceCount) === 1 ? "" : "s"}`)}</span>
                    <span>${escapeHtml(`${formatCurrency(job.totalPaymentsReceived)} received`)}</span>
                </div>
            </article>
        `;
    })
    .join("");
}

function invoiceCardMarkup(invoice) {
  const status = invoicePillMeta(invoice);
  return `
        <article class="ledger-card">
            <div class="ledger-main">
                <div>
                    <span>${escapeHtml(invoice.invoiceNumber || "Invoice")}</span>
                    <strong>${escapeHtml(invoice.title || "Project invoice")}</strong>
                    <p class="record-copy">${escapeHtml(invoice.projectAddress || invoice.summary || "Billing item linked to this client account.")}</p>
                </div>
                <div class="ledger-amount">
                    <span class="${status.className}">${escapeHtml(status.label)}</span>
                    <strong>${escapeHtml(formatCurrency(invoice.subtotal))}</strong>
                </div>
            </div>
            <div class="ledger-details">
                <article class="ledger-detail">
                    <span>Issue date</span>
                    <strong>${escapeHtml(invoice.issueDate ? formatDate(invoice.issueDate) : "Not set")}</strong>
                </article>
                <article class="ledger-detail">
                    <span>Due date</span>
                    <strong>${escapeHtml(invoice.dueDate ? formatDate(invoice.dueDate) : "Not set")}</strong>
                </article>
                <article class="ledger-detail">
                    <span>Property</span>
                    <strong>${escapeHtml(invoice.projectAddress || "Customer account")}</strong>
                </article>
                <article class="ledger-detail">
                    <span>Status note</span>
                    <strong>${escapeHtml(invoice.paymentNote || invoice.notes || "Reach out if you need clarification.")}</strong>
                </article>
            </div>
        </article>
    `;
}

function renderBilling() {
  const invoices = Array.isArray(state.portal.billing.invoices)
    ? state.portal.billing.invoices
    : [];
  const payments = Array.isArray(state.portal.billing.payments)
    ? state.portal.billing.payments
    : [];
  const snapshot = billingSnapshot();
  const openInvoices = invoices.filter(
    (invoice) => safeString(invoice.status).toLowerCase() !== "paid",
  );
  const paidInvoices = invoices.filter(
    (invoice) => safeString(invoice.status).toLowerCase() === "paid",
  );

  refs.billingSummaryStrip.innerHTML = [
    summaryCard({
      label: "Due now",
      value: formatCurrency(snapshot.dueNow),
      copy: snapshot.overdueCount
        ? `${snapshot.overdueCount} overdue`
        : "No overdue invoices",
    }),
    summaryCard({
      label: "Upcoming",
      value: formatCurrency(snapshot.upcoming),
      copy: "Open invoices with future due dates",
    }),
    summaryCard({
      label: "Open invoices",
      value: String(snapshot.openCount),
      copy: "Read-only billing items in this portal",
    }),
    summaryCard({
      label: "Paid to date",
      value: formatCurrency(snapshot.paidToDate),
      copy: "Payments received on this account",
    }),
  ].join("");

  refs.invoiceList.innerHTML = `
        <section class="ledger-section">
            <div class="section-heading">
                <h3>Open invoices</h3>
                <p>Review current invoice balances and due dates connected to this account.</p>
            </div>
            <div class="stack-list">
                ${
                  openInvoices.length
                    ? openInvoices
                        .sort(
                          (left, right) =>
                            toMillis(left.dueDate) - toMillis(right.dueDate),
                        )
                        .map(invoiceCardMarkup)
                        .join("")
                    : emptyNote("No invoices are currently open.")
                }
            </div>
        </section>
        <section class="ledger-section">
            <div class="section-heading">
                <h3>Paid invoices</h3>
                <p>Completed invoice records stay here for reference.</p>
            </div>
            <div class="stack-list">
                ${
                  paidInvoices.length
                    ? paidInvoices
                        .sort(
                          (left, right) =>
                            toMillis(right.paidAt) - toMillis(left.paidAt),
                        )
                        .map(invoiceCardMarkup)
                        .join("")
                    : emptyNote("No paid invoice records are showing yet.")
                }
            </div>
        </section>
    `;

  refs.paymentList.innerHTML = payments.length
    ? payments
        .sort(
          (left, right) =>
            toMillis(right.relatedDate) - toMillis(left.relatedDate),
        )
        .map((payment) =>
          recordLink({
            kicker: capitalise(payment.paymentType || "payment"),
            title: formatCurrency(payment.amount),
            copy:
              payment.projectAddress ||
              payment.note ||
              "Payment received and logged on this client account.",
            meta: [
              payment.projectAddress
                ? `<span>${escapeHtml(payment.projectAddress)}</span>`
                : "",
              payment.method
                ? `<span>${escapeHtml(payment.method)}</span>`
                : "",
              payment.relatedDate
                ? `<span>${escapeHtml(formatDate(payment.relatedDate))}</span>`
                : "",
            ]
              .filter(Boolean)
              .join(""),
          }),
        )
        .join("")
    : emptyNote("No client payments have been logged on this account yet.");
}

function renderDocuments() {
  refs.documentsFilterBar.innerHTML = `
        <div class="filter-pills">
            ${DOCUMENT_FILTERS.map(
              (filter) => `
                <button
                    type="button"
                    class="filter-button ${state.selectedDocumentFilter === filter.key ? "is-active" : ""}"
                    data-document-filter="${escapeHtml(filter.key)}"
                >
                    ${escapeHtml(filter.label)}
                </button>
            `,
            ).join("")}
        </div>
    `;

  const documents = filteredDocuments();
  if (!documents.length) {
    refs.documentsList.innerHTML = emptyNote(
      "No client-visible documents match this filter yet.",
    );
    return;
  }

  const groups = new Map();
  documents.forEach((documentItem) => {
    const key = safeString(documentItem.projectAddress) || "Customer account";
    const list = groups.get(key) || [];
    list.push(documentItem);
    groups.set(key, list);
  });

  refs.documentsList.innerHTML = [...groups.entries()]
    .map(([groupLabel, items]) => {
      const sortedItems = [...items].sort(
        (left, right) =>
          toMillis(right.relatedDate) - toMillis(left.relatedDate),
      );
      return `
            <section class="document-group">
                <div class="section-heading">
                    <h3>${escapeHtml(groupLabel)}</h3>
                    <p>${escapeHtml(`${sortedItems.length} shared file${sortedItems.length === 1 ? "" : "s"}`)}</p>
                </div>
                <div class="stack-list">
                    ${sortedItems
                      .map((documentItem) =>
                        recordLink({
                          kicker: capitalise(documentFilterKey(documentItem)),
                          title: documentItem.title || "Shared file",
                          copy:
                            documentItem.note ||
                            "Open the file to review the shared document details.",
                          meta: [
                            documentItem.relatedDate
                              ? `<span>${escapeHtml(formatDate(documentItem.relatedDate))}</span>`
                              : "",
                            documentItem.fileName
                              ? `<span>${escapeHtml(documentItem.fileName)}</span>`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(""),
                          actionHref: documentItem.href,
                          actionLabel: "Open file",
                        }),
                      )
                      .join("")}
                </div>
            </section>
        `;
    })
    .join("");
}

function renderThreads() {
  const threads = threadsForDisplay();

  if (!threads.length) {
    refs.threadList.innerHTML = emptyNote(
      "No conversations have started yet. Once Golden Brick or your team sends a portal message, it will appear here.",
    );
    refs.messageThreadSummary.innerHTML = emptyNote(
      "No message thread is selected yet.",
    );
    refs.messageList.innerHTML = emptyNote(
      "Once a thread starts, the conversation history will show here.",
    );
    refs.messageBody.disabled = true;
    refs.messageSubmitButton.disabled = true;
    refs.messageSubmitButton.textContent = "Send message";
    return;
  }

  if (!threads.some((thread) => thread.id === state.selectedThreadId)) {
    const general = threads.find((thread) => thread.id === "general") || null;
    state.selectedThreadId = general?.id || threads[0].id;
  }

  refs.threadList.innerHTML = threads
    .map((thread) => {
      const isActive = thread.id === state.selectedThreadId;
      const unread = toNumber(thread.clientUnreadCount);
      return `
            <button
                type="button"
                class="thread-button ${isActive ? "is-active" : ""}"
                data-thread-id="${escapeHtml(thread.id)}"
            >
                <div class="record-link-row">
                    <div>
                        <span>${escapeHtml(thread.threadType === "project" ? "Project thread" : "General updates")}</span>
                        <strong>${escapeHtml(thread.title || thread.projectAddress || "Conversation")}</strong>
                    </div>
                    <span class="${unread ? "pill" : "pill success"}">${escapeHtml(unread ? `${unread} unread` : "Read")}</span>
                </div>
                <p class="record-copy">${escapeHtml(thread.lastMessagePreview || "No messages yet.")}</p>
                <div class="record-meta">
                    ${thread.projectAddress ? `<span>${escapeHtml(thread.projectAddress)}</span>` : ""}
                    <span>${escapeHtml(thread.lastMessageAt ? formatDateTime(thread.lastMessageAt) : "Waiting for first message")}</span>
                </div>
            </button>
        `;
    })
    .join("");

  const thread = currentThread();
  if (!thread) {
    refs.messageThreadSummary.innerHTML = emptyNote(
      "Select a message thread to see the conversation history.",
    );
    refs.messageList.innerHTML = emptyNote(
      "Once you select a thread, the message history will appear here.",
    );
    refs.messageBody.disabled = true;
    refs.messageSubmitButton.disabled = true;
    refs.messageSubmitButton.textContent = "Send message";
    return;
  }

  refs.messageThreadSummary.innerHTML = `
        <span class="mini-label">${escapeHtml(thread.threadType === "project" ? "Project thread" : "General updates")}</span>
        <strong>${escapeHtml(thread.title || thread.projectAddress || "Conversation")}</strong>
        <p>${escapeHtml(thread.projectAddress || "Use this thread for account-wide project or billing questions.")}</p>
        <div class="record-meta">
            <span>${escapeHtml(thread.lastMessageAt ? `Last activity ${formatDateTime(thread.lastMessageAt)}` : "No messages yet.")}</span>
            <span>${escapeHtml(toNumber(thread.clientUnreadCount) ? `${toNumber(thread.clientUnreadCount)} unread` : "No unread messages")}</span>
        </div>
    `;

  refs.messageList.innerHTML =
    Array.isArray(thread.messages) && thread.messages.length
      ? thread.messages
          .map(
            (message) => `
            <article class="message-item ${safeString(message.authorRole) === "staff" ? "is-staff" : "is-client"}">
                <span>${escapeHtml(safeString(message.authorRole) === "staff" ? "Golden Brick" : "Client message")}</span>
                <strong>${escapeHtml(message.authorName || "Portal user")}</strong>
                <p>${escapeHtml(message.body || "")}</p>
                <div class="record-meta">
                    <span>${escapeHtml(formatDateTime(message.createdAt))}</span>
                </div>
            </article>
        `,
          )
          .join("")
      : emptyNote("No messages are in this thread yet.");

  refs.messageList.scrollTop = refs.messageList.scrollHeight;

  const canMessage = state.portal.bootstrap?.account?.canMessage !== false;
  refs.messageBody.disabled = !canMessage;
  refs.messageSubmitButton.disabled = !canMessage;
  refs.messageSubmitButton.textContent = canMessage
    ? "Send message"
    : "Messaging unavailable";
  refs.messageBody.placeholder = canMessage
    ? "Ask a question about the project, billing, documents, or next steps."
    : "Messaging is not available for this portal contact.";
}

function renderAccount() {
  const account = state.portal.bootstrap?.account || {};
  const contacts = Array.isArray(state.portal.bootstrap?.contacts)
    ? state.portal.bootstrap.contacts
    : [];
  const fullAccessContacts = contacts.filter(
    (contact) => safeString(contact.role) !== "read_only",
  ).length;
  refs.accountSummaryGrid.innerHTML = [
    {
      label: "Customer account",
      value: account.customerName || "Golden Brick customer",
    },
    {
      label: "Portal contact",
      value: account.displayName || account.contactName || "Portal user",
    },
    { label: "Portal email", value: account.email || "Not provided" },
    {
      label: "Support phone",
      value: state.portal.bootstrap?.supportPhone || "(267) 715-5557",
    },
    {
      label: "Portal role",
      value: formatPortalRole(account.role, account.roleLabel),
    },
    {
      label: "Signature access",
      value: account.canSign ? "Can sign approvals" : "View only",
    },
    {
      label: "Properties in portal",
      value: String(toNumber(state.portal.jobs.length)),
    },
    {
      label: "Approved contacts",
      value: String(contacts.length || 1),
      copy: `${fullAccessContacts || (account.canSign ? 1 : 0)} full-access contact${fullAccessContacts === 1 ? "" : "s"}`,
    },
    { label: "Sign-in method", value: accountProviderLabel() },
  ]
    .map(summaryCard)
    .join("");

  renderHelpBlock(refs.accountHelpCard, state.portal.bootstrap?.help, {
    headline: "Golden Brick support",
    title: "Need a direct conversation?",
    copy: "Call or email if you need a clearer explanation of an invoice, estimate, document, or next step for your project.",
  });

  refs.accountAccessList.innerHTML = [
    {
      title: "Estimates and signed agreements",
      copy: "Review current estimates and change orders first, then keep signed approval history tied to the right property.",
    },
    {
      title: "Project timeline and updates",
      copy: "See the current phase, next step, target timing, and latest client-facing note from Golden Brick.",
    },
    {
      title: "Billing, documents, and messages",
      copy: "Keep invoices, payments received, shared files, and support conversations in one organized portal.",
    },
    ...contacts.map((contact) => ({
      kicker: "Approved contact",
      title: contact.name || contact.email || "Portal contact",
      copy: `${formatPortalRole(contact.role, contact.roleLabel)} · ${
        contact.canSign ? "Can sign approvals" : "View access only"
      } · ${contact.lastLoginAt ? `Last login ${formatDateTime(contact.lastLoginAt)}` : "Invite-based access"}`,
      meta: `${contact.email || "No email"}${contact.phone ? ` · ${contact.phone}` : ""}`,
    })),
  ]
    .map((item) =>
      item.kicker
        ? recordLink({
            kicker: item.kicker,
            title: item.title,
            copy: item.copy,
            meta: item.meta ? `<span>${escapeHtml(item.meta)}</span>` : "",
          })
        : recordLink({
            kicker: "Portal guide",
            title: item.title,
            copy: item.copy,
          }),
    )
    .join("");
}

function renderPortalShell() {
  refs.authShell.hidden = true;
  refs.portalShell.hidden = false;
  renderPortalBanner();
  renderSidebarAccount();
  renderHelpBlock(refs.sidebarHelp, state.portal.bootstrap?.help, {
    headline: "Need help?",
    title: "Talk with Golden Brick",
    copy: "Call or email if you need a faster conversation about project updates, billing, or a shared document.",
  });

  renderSummaryStrip();
  renderDashboardHero();
  renderProjectSwitcher(refs.dashboardProjectSwitcherWrap, {
    headline: "Project focus",
    detail:
      "Choose a property to keep its phase, next step, and billing context at the top of the dashboard.",
  });
  renderHelpBlock(refs.dashboardHelpCard, state.portal.bootstrap?.help, {
    headline: "Direct support",
    title: "Need help understanding this portal?",
    copy: "Golden Brick can help you interpret a document, invoice, or next-step update if anything feels unclear.",
  });
  renderDashboardProjectSpotlight();
  renderDashboardBilling();
  renderDashboardDocuments();
  renderDashboardMessages();
  renderEstimates();
  renderJobsView();
  renderBilling();
  renderDocuments();
  renderThreads();
  renderAccount();

  const activeMeta = APP_VIEWS[state.selectedView] || APP_VIEWS.dashboard;
  refs.portalTitle.textContent = activeMeta.title;
  refs.portalSubtitle.textContent = activeMeta.subtitle;
  refs.portalEyebrow.textContent = state.portal.bootstrap?.account?.customerName
    ? `${state.portal.bootstrap.account.customerName} portal`
    : "Client portal";

  const help = state.portal.bootstrap?.help || {};
  refs.callHelpButton.href = helpButtonHref(help);
  refs.callHelpButton.textContent = help.phone || "Call Golden Brick";
  refs.mobileCallHelpButton.href = helpButtonHref(help);

  refs.viewButtons.forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.portalView === state.selectedView,
    );
  });

  refs.portalViews.forEach((view) => {
    const isActive = view.id === `${state.selectedView}-view`;
    view.hidden = !isActive;
    view.classList.toggle("is-active", isActive);
  });

  document.title = `${activeMeta.title} | Golden Brick Client Portal`;
}

function openView(view) {
  state.selectedView = APP_VIEWS[view] ? view : "dashboard";
  renderPortalShell();
  if (state.selectedView === "messages") {
    void markThreadReadIfNeeded(state.selectedThreadId);
  }
  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

function setSelectedProject(projectId) {
  if (projectId === "all") {
    const first = activeJobs()[0];
    state.selectedProjectId = first?.id || "";
  } else {
    state.selectedProjectId = projectId;
  }
  renderPortalShell();
}

function setSelectedDocumentFilter(filterKey) {
  state.selectedDocumentFilter = DOCUMENT_FILTERS.some(
    (filter) => filter.key === filterKey,
  )
    ? filterKey
    : "all";
  renderPortalShell();
}

async function loadInvitePreview() {
  if (state.route !== "accept" || !state.inviteToken) {
    state.invite = null;
    renderInvitePreview();
    return;
  }

  try {
    const payload = await requestJson(
      `/api/client/invite-preview?token=${encodeURIComponent(state.inviteToken)}`,
    );
    state.invite = payload.invite || null;
    renderInvitePreview();
  } catch (error) {
    state.invite = null;
    setAuthAlert(
      error.message || "This invite link could not be loaded.",
      "error",
    );
    renderInvitePreview();
  }
}

async function loadBootstrap() {
  state.portal.bootstrap = await authedRequest("/api/client/bootstrap");
}

async function loadEstimates() {
  const payload = await authedRequest("/api/client/estimates");
  state.portal.estimates = Array.isArray(payload.estimates)
    ? payload.estimates
    : [];
}

async function loadJobs() {
  const payload = await authedRequest("/api/client/jobs");
  state.portal.jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
}

async function loadBilling() {
  const payload = await authedRequest("/api/client/billing");
  state.portal.billing = {
    summary: payload.summary || {},
    invoices: Array.isArray(payload.invoices) ? payload.invoices : [],
    payments: Array.isArray(payload.payments) ? payload.payments : [],
  };
}

async function loadDocuments() {
  const payload = await authedRequest("/api/client/documents");
  state.portal.documents = Array.isArray(payload.documents)
    ? payload.documents
    : [];
}

async function loadThreads() {
  const payload = await authedRequest("/api/client/threads");
  state.portal.threads = Array.isArray(payload.threads) ? payload.threads : [];
}

async function loadPortalData() {
  state.loadingPortal = true;
  await Promise.all([
    loadBootstrap(),
    loadEstimates(),
    loadJobs(),
    loadBilling(),
    loadDocuments(),
    loadThreads(),
  ]);
  state.loadingPortal = false;

  ensureSelectedProject();
  if (!state.selectedDocumentFilter) {
    state.selectedDocumentFilter = "all";
  }

  if (
    !state.selectedThreadId ||
    !state.portal.threads.some((thread) => thread.id === state.selectedThreadId)
  ) {
    const general =
      state.portal.threads.find((thread) => thread.id === "general") || null;
    state.selectedThreadId = general?.id || state.portal.threads[0]?.id || null;
  }
}

async function claimInviteIfNeeded() {
  if (
    state.route !== "accept" ||
    !state.inviteToken ||
    !state.currentUser ||
    state.claimInFlight
  ) {
    return;
  }

  state.claimInFlight = true;
  try {
    const result = await authedPost("/api/client/claim", {
      token: state.inviteToken,
      displayName: safeString(
        state.currentUser.displayName || refs.displayNameInput.value,
      ),
    });
    setPortalBanner(
      `Portal access claimed for ${result.customerName || "your account"}.`,
      "success",
    );
    setAuthAlert("");
    setPath("app", { replace: true });
  } finally {
    state.claimInFlight = false;
  }
}

async function showPortalFromCurrentUser() {
  try {
    await claimInviteIfNeeded();
    await loadPortalData();
    if (state.route !== "app") {
      setPath("app", { replace: true });
    }
    recordPortalSessionActivity();
    renderPortalShell();
    if (state.selectedView === "messages") {
      await markThreadReadIfNeeded(state.selectedThreadId);
    }
  } catch (error) {
    console.error("Client portal load failed.", error);
    const message =
      error.message || "Could not open the client portal right now.";
    setAuthAlert(message, "error");
    setPath(state.route === "accept" ? "accept" : "login", { replace: true });
    await signOut(state.auth).catch(() => {});
    renderAuthShell();
  }
}

async function markThreadReadIfNeeded(threadId) {
  const thread =
    state.portal.threads.find((item) => item.id === threadId) || null;
  if (!thread || toNumber(thread.clientUnreadCount) === 0) {
    return;
  }

  await authedPost(`/api/client/threads/${encodeURIComponent(thread.id)}/read`);
  await Promise.all([loadThreads(), loadBootstrap()]);
  renderPortalShell();
}

async function selectThread(threadId) {
  state.selectedThreadId = threadId;
  renderPortalShell();
  await markThreadReadIfNeeded(threadId);
}

async function handleEmailAuth(event) {
  event.preventDefault();
  setAuthAlert("");
  const email = safeString(refs.emailInput.value).toLowerCase();
  const password = refs.passwordInput.value;
  const confirmPassword = refs.confirmPasswordInput.value;
  const displayName = safeString(refs.displayNameInput.value);

  if (!email || !password) {
    setAuthAlert("Email and password are required.", "error");
    return;
  }

  refs.emailAuthSubmit.disabled = true;

  try {
    if (state.route === "accept" && state.authMode === "create") {
      if (password.length < 8) {
        throw new Error("Use at least 8 characters for the portal password.");
      }
      if (password !== confirmPassword) {
        throw new Error("Password confirmation does not match.");
      }

      const credential = await createUserWithEmailAndPassword(
        state.auth,
        email,
        password,
      );
      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }
    } else {
      await signInWithEmailAndPassword(state.auth, email, password);
    }
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      state.authMode = "sign-in";
      applyAuthMode();
      setAuthAlert(
        "That email already has a password. Switch to Sign in and use the existing password.",
        "error",
      );
    } else if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password"
    ) {
      setAuthAlert(
        "That email/password combination did not work. Check the password or send a reset link.",
        "error",
      );
    } else if (error.code === "auth/user-not-found") {
      setAuthAlert(
        "No password login exists for that email yet. Use the invite link to create the account first.",
        "error",
      );
    } else {
      setAuthAlert(
        error.message || "Email sign-in could not be completed.",
        "error",
      );
    }
  } finally {
    refs.emailAuthSubmit.disabled = false;
  }
}

async function handleResetPassword() {
  const email = safeString(refs.emailInput.value).toLowerCase();
  if (!email) {
    setAuthAlert(
      "Enter your email address first so Golden Brick can send the reset link to the right inbox.",
      "error",
    );
    refs.emailInput.focus();
    return;
  }

  try {
    await sendPasswordResetEmail(state.auth, email);
    setAuthAlert(
      "Password reset link sent. Check that inbox for the next step.",
      "success",
    );
  } catch (error) {
    setAuthAlert(
      error.message || "Could not send the reset link right now.",
      "error",
    );
  }
}

async function handleGoogleAuth() {
  setAuthAlert("");
  try {
    await signInWithPopup(state.auth, state.provider);
  } catch (error) {
    if (
      error.code === "auth/popup-blocked" ||
      error.code === "auth/cancelled-popup-request"
    ) {
      await signInWithRedirect(state.auth, state.provider);
      return;
    }

    setAuthAlert("Google sign-in could not start right now.", "error");
  }
}

async function handlePortalMessage(event) {
  event.preventDefault();
  const body = safeString(refs.messageBody.value);
  const thread = currentThread();

  if (!thread?.id) {
    showToast("Select a message thread first.", "error");
    return;
  }

  if (!body) {
    showToast("Write your message first.", "error");
    refs.messageBody.focus();
    return;
  }

  if (state.portal.bootstrap?.account?.canMessage === false) {
    showToast("Messaging is not available for this portal contact.", "error");
    return;
  }

  refs.messageSubmitButton.disabled = true;
  try {
    await authedPost(
      `/api/client/threads/${encodeURIComponent(thread.id)}/messages`,
      { body },
    );
    refs.messageBody.value = "";
    await Promise.all([loadThreads(), loadBootstrap()]);
    renderPortalShell();
    showToast("Message sent.");
  } catch (error) {
    showToast(error.message || "Could not send the message.", "error");
  } finally {
    refs.messageSubmitButton.disabled = false;
  }
}

function bindEvents() {
  refs.authModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.authMode;
      applyAuthMode();
      setAuthAlert("");
    });
  });

  refs.googleAuthButton.addEventListener("click", () => {
    handleGoogleAuth().catch((error) => {
      setAuthAlert(error.message || "Google sign-in could not start.", "error");
    });
  });

  refs.emailAuthForm.addEventListener("submit", (event) => {
    handleEmailAuth(event).catch((error) => {
      setAuthAlert(
        error.message || "Email sign-in could not be completed.",
        "error",
      );
    });
  });

  refs.resetPasswordButton.addEventListener("click", () => {
    handleResetPassword().catch((error) => {
      setAuthAlert(error.message || "Could not send the reset link.", "error");
    });
  });

  refs.viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      openView(button.dataset.portalView);
    });
  });

  refs.dashboardAttentionList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-target-view]");
    if (!button) return;
    openView(button.dataset.targetView);
  });

  refs.dashboardMessagesList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-dashboard-thread-id]");
    if (!button) return;
    state.selectedThreadId = button.dataset.dashboardThreadId;
    openView("messages");
  });

  const projectSelectionHandler = (event) => {
    const button = event.target.closest("[data-project-select]");
    if (!button) return;
    setSelectedProject(button.dataset.projectSelect);
  };

  refs.dashboardProjectSwitcherWrap.addEventListener(
    "click",
    projectSelectionHandler,
  );
  refs.jobsProjectSwitcherWrap.addEventListener(
    "click",
    projectSelectionHandler,
  );
  refs.dashboardProjectSpotlight.addEventListener(
    "click",
    projectSelectionHandler,
  );

  refs.documentsFilterBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-document-filter]");
    if (!button) return;
    setSelectedDocumentFilter(button.dataset.documentFilter);
  });

  refs.threadList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-thread-id]");
    if (!button) return;
    selectThread(button.dataset.threadId).catch((error) => {
      showToast(
        error.message || "Could not open that message thread.",
        "error",
      );
    });
  });

  refs.messageForm.addEventListener("submit", (event) => {
    handlePortalMessage(event).catch((error) => {
      showToast(error.message || "Could not send the message.", "error");
    });
  });

  refs.signOutButton.addEventListener("click", async () => {
    setPortalBanner("");
    setAuthAlert("");
    await expirePortalSession("", "success");
  });

  window.addEventListener("popstate", () => {
    state.route = routeFromPath();
    state.inviteToken = safeString(
      new URLSearchParams(window.location.search).get("token"),
    );
    if (state.route === "accept") {
      state.authMode = "create";
      void loadInvitePreview();
    }
    if (state.currentUser) {
      if (state.route === "login") {
        setPath("app", { replace: true });
      }
      renderPortalShell();
      return;
    }
    renderAuthShell();
  });
}

async function bootstrap() {
  bindEvents();
  state.route = routeFromPath();
  state.inviteToken = safeString(
    new URLSearchParams(window.location.search).get("token"),
  );
  state.authMode = state.route === "accept" ? "create" : "sign-in";

  if (state.route === "accept") {
    await loadInvitePreview();
  }

  renderAuthShell();

  const config = await requestJson("/__/firebase/init.json");
  state.app = initializeApp(config);
  state.auth = getAuth(state.app);
  await setPersistence(state.auth, browserSessionPersistence);
  state.provider = new GoogleAuthProvider();
  state.provider.setCustomParameters({ prompt: "select_account" });

  onAuthStateChanged(state.auth, async (user) => {
    state.currentUser = user;
    if (!user) {
      detachPortalSessionTracking();
      clearStoredSessionActivity();
      state.session.lastActivityAt = 0;
      if (state.route === "app") {
        setPath("login", { replace: true });
      }
      renderAuthShell();
      return;
    }

    const lastActivityAt = readStoredSessionActivity();
    if (
      lastActivityAt &&
      Date.now() - lastActivityAt >= CLIENT_SESSION_TIMEOUT_MS
    ) {
      await expirePortalSession();
      return;
    }

    attachPortalSessionTracking();
    recordPortalSessionActivity();
    await showPortalFromCurrentUser();
  });
}

bootstrap().catch((error) => {
  console.error("Client portal boot failed.", error);
  setAuthAlert(
    error.message || "Could not load the client portal right now.",
    "error",
  );
  renderAuthShell();
});
