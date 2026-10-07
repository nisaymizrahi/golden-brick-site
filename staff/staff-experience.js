import {
  getApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const VIEW_ROUTES = Object.freeze({
  "today-view": "/staff/today",
  "tasks-view": "/staff/tasks",
  "leads-view": "/staff/pipeline",
  "jobs-view": "/staff/projects",
  "calendar-view": "/staff/calendar",
  "customers-view": "/staff/contacts",
  "vendors-view": "/staff/vendors",
  "site-projects-view": "/staff/website-projects",
  "staff-view": "/staff/settings",
});

const ROUTE_VIEWS = new Map(
  Object.entries(VIEW_ROUTES).map(([viewId, pathname]) => [pathname, viewId]),
);

const VIEW_TITLES = Object.freeze({
  "today-view": "Today",
  "tasks-view": "My Tasks",
  "leads-view": "Pipeline",
  "jobs-view": "Projects",
  "calendar-view": "Calendar",
  "customers-view": "Investors & Clients",
  "vendors-view": "Vendors",
  "site-projects-view": "Website Projects",
  "staff-view": "Team & Settings",
});

const staffShell = document.getElementById("staff-shell");
const currentUserCard = document.getElementById("current-user-card");
const workspaceJumpButton = document.getElementById("workspace-jump-button");
const workspaceCreateButton = document.getElementById(
  "workspace-create-button",
);
const workspaceJumpDialog = document.getElementById("workspace-jump-dialog");
const workspaceJumpBackdrop = document.getElementById(
  "workspace-jump-backdrop",
);
const workspaceJumpClose = document.getElementById("workspace-jump-close");
const workspaceJumpSearch = document.getElementById("workspace-jump-search");
const workspaceJumpResults = document.getElementById("workspace-jump-results");
const workspaceJumpEmpty = document.getElementById("workspace-jump-empty");
const mobileCreateButton = document.getElementById("mobile-create-fab");
const jobWorkspaceMeta = document.getElementById("job-workspace-meta");
const jobRecordTitle = document.getElementById("job-record-title");
const customerPortalPreviewLink = document.getElementById(
  "customer-portal-preview-link",
);
const customerRecordShell = document.getElementById("customer-record-shell");
const customerPortalPanel = document.querySelector(".customer-portal-panel");
const customerPortalPublishingSummary = document.getElementById(
  "customer-portal-publishing-summary",
);

let lastFocusedElement = null;
let isRestoringRoute = false;
let hasAppliedInitialRoute = false;
let portalExperienceSyncQueued = false;

function ensureClientPortalWorkspaceStyles() {
  if (document.getElementById("client-portal-workspace-styles")) return;
  const stylesheet = document.createElement("link");
  stylesheet.id = "client-portal-workspace-styles";
  stylesheet.rel = "stylesheet";
  stylesheet.href = "/staff/client-portal-workspace.css?v=20260731-client-preview-1";
  document.head.append(stylesheet);
}

function selectedCustomerId() {
  return (
    document.querySelector(
      "#customer-list [data-customer-id].is-selected",
    )?.dataset.customerId || ""
  ).trim();
}

function selectedPortalContactId() {
  return (
    document.querySelector(
      "#customer-portal-contact-list .portal-contact-card.is-selected [data-contact-id]",
    )?.dataset.contactId || ""
  ).trim();
}

function showPortalExperienceToast(message, tone = "success") {
  const stack = document.getElementById("toast-stack");
  if (!stack) return;
  const toast = document.createElement("div");
  toast.className = `toast ${tone}`;
  toast.textContent = message;
  toast.setAttribute("role", tone === "error" ? "alert" : "status");
  stack.append(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

function syncPortalPreviewControl() {
  if (!customerPortalPreviewLink) return;
  const customerId = selectedCustomerId();
  const canPreview =
    Boolean(customerId) && document.body.dataset.staffRole === "admin";

  if (customerPortalPreviewLink.hidden === canPreview) {
    customerPortalPreviewLink.hidden = !canPreview;
  }
  if (customerPortalPreviewLink.getAttribute("aria-busy") === "true") {
    return;
  }
  if (customerPortalPreviewLink.textContent.trim() !== "View as client") {
    customerPortalPreviewLink.textContent = "View as client";
  }
  if (customerPortalPreviewLink.getAttribute("href") !== "#") {
    customerPortalPreviewLink.setAttribute("href", "#");
  }
  customerPortalPreviewLink.dataset.customerId = customerId;
  customerPortalPreviewLink.title = canPreview
    ? "Open a secure, read-only copy of this client portal"
    : "Select a saved customer first";
}

function ensurePortalSharingGuide() {
  if (!customerPortalPublishingSummary) return;
  const publishingPanel = customerPortalPublishingSummary.closest(".subpanel");
  if (!publishingPanel) return;

  const heading = publishingPanel.querySelector(":scope > .subpanel-head");
  const headingTitle = heading?.querySelector("h4");
  const headingCopy = heading?.querySelector("p");
  if (headingTitle && headingTitle.textContent.trim() !== "Shared with this client") {
    headingTitle.textContent = "Shared with this client";
  }
  const publishingCopy =
    "Choose exactly what appears in the portal, then use View as client to confirm the final experience before sending access.";
  if (headingCopy && headingCopy.textContent.trim() !== publishingCopy) {
    headingCopy.textContent = publishingCopy;
  }

  let guide = publishingPanel.querySelector(".portal-sharing-guide");
  if (!guide) {
    guide = document.createElement("nav");
    guide.className = "portal-sharing-guide";
    guide.setAttribute("aria-label", "Client sharing sections");
    guide.innerHTML = `
      <span>Manage shared content</span>
      <button type="button" data-portal-scroll-target="customer-portal-estimate-list">Approvals</button>
      <button type="button" data-portal-scroll-target="customer-portal-invoice-list">Billing</button>
      <button type="button" data-portal-scroll-target="customer-portal-change-order-list">Change orders</button>
      <button type="button" data-portal-scroll-target="customer-portal-document-list">Files</button>
    `;
    customerPortalPublishingSummary.insertAdjacentElement("afterend", guide);
  }
}

function decoratePortalPublishingItems() {
  customerPortalPanel
    ?.querySelectorAll(
      "#customer-portal-estimate-list .simple-item, #customer-portal-invoice-list .simple-item, #customer-portal-change-order-list .simple-item, #customer-portal-document-list .simple-item",
    )
    .forEach((item) => {
      const statusText = Array.from(item.querySelectorAll(".mini-pill"))
        .map((pill) => pill.textContent.trim().toLowerCase())
        .join(" ");
      item.classList.remove(
        "is-client-visible",
        "is-client-hidden",
        "is-client-draft",
        "is-client-signed",
      );
      if (/signed|paid|approved/.test(statusText)) {
        item.classList.add("is-client-signed");
      } else if (/visible|active|published/.test(statusText)) {
        item.classList.add("is-client-visible");
      } else if (/hidden|revoked|disabled/.test(statusText)) {
        item.classList.add("is-client-hidden");
      } else if (/draft|not visible/.test(statusText)) {
        item.classList.add("is-client-draft");
      }
    });
}

function syncClientPortalExperience() {
  const portalHeading = customerPortalPanel?.querySelector(
    ":scope > .subpanel-head h3",
  );
  const portalCopy = customerPortalPanel?.querySelector(
    ":scope > .subpanel-head p",
  );
  if (portalHeading && portalHeading.textContent.trim() !== "Client portal workspace") {
    portalHeading.textContent = "Client portal workspace";
  }
  const portalDescription =
    "Manage approved contacts, organize what is shared, and open a safe read-only preview of the exact portal this client sees.";
  if (portalCopy && portalCopy.textContent.trim() !== portalDescription) {
    portalCopy.textContent = portalDescription;
  }
  syncPortalPreviewControl();
  ensurePortalSharingGuide();
  decoratePortalPublishingItems();
}

function scheduleClientPortalExperienceSync() {
  if (portalExperienceSyncQueued) return;
  portalExperienceSyncQueued = true;
  window.requestAnimationFrame(() => {
    portalExperienceSyncQueued = false;
    syncClientPortalExperience();
  });
}

async function openSelectedClientPreview(event) {
  event.preventDefault();
  const customerId = selectedCustomerId();
  if (!customerId) {
    showPortalExperienceToast("Select a saved client first.", "error");
    return;
  }
  if (!getApps().length) {
    showPortalExperienceToast(
      "The staff session is still loading. Try again in a moment.",
      "error",
    );
    return;
  }

  const user = getAuth(getApp()).currentUser;
  if (!user) {
    showPortalExperienceToast("Sign in to the CRM again first.", "error");
    return;
  }

  const previewWindow = window.open("about:blank", "_blank");
  if (previewWindow) {
    previewWindow.opener = null;
    previewWindow.document.title = "Opening client preview…";
    previewWindow.document.body.textContent = "Opening secure client preview…";
  }

  const originalLabel = customerPortalPreviewLink.textContent;
  customerPortalPreviewLink.setAttribute("aria-busy", "true");
  customerPortalPreviewLink.textContent = "Opening preview…";

  try {
    const idToken = await user.getIdToken();
    const response = await fetch("/api/client/staff-preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        customerId,
        contactId: selectedPortalContactId() || undefined,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.previewUrl) {
      throw new Error(payload.message || "Could not open the client preview.");
    }

    if (previewWindow) {
      previewWindow.location.replace(payload.previewUrl);
    } else {
      window.open(payload.previewUrl, "_blank", "noopener,noreferrer");
    }
    showPortalExperienceToast(
      `Opened a read-only preview for ${payload.customerName || "this client"}.`,
    );
  } catch (error) {
    previewWindow?.close();
    showPortalExperienceToast(
      error.message || "Could not open the client preview.",
      "error",
    );
  } finally {
    customerPortalPreviewLink.removeAttribute("aria-busy");
    customerPortalPreviewLink.textContent = originalLabel;
    scheduleClientPortalExperienceSync();
  }
}

function normalisePathname(pathname = window.location.pathname) {
  const cleaned = pathname.replace(/\/+$/, "") || "/staff";
  if (cleaned === "/staff" || cleaned === "/staff/index.html") {
    return VIEW_ROUTES["today-view"];
  }
  return cleaned;
}

function viewIdFromPathname(pathname = window.location.pathname) {
  return ROUTE_VIEWS.get(normalisePathname(pathname)) || "today-view";
}

function routeButtonForView(viewId) {
  return document.querySelector(`.nav-button[data-view="${viewId}"]`);
}

function activeViewId() {
  return (
    document.querySelector(".view.is-active:not([hidden])")?.id ||
    viewIdFromPathname()
  );
}

function updateDocumentTitle(viewId = activeViewId()) {
  const workspaceTitle = VIEW_TITLES[viewId] || "Staff CRM";
  const recordTitle =
    viewId === "jobs-view" &&
    document.getElementById("jobs-view")?.classList.contains(
      "is-job-workspace-active",
    )
      ? jobRecordTitle?.textContent?.trim()
      : "";
  document.title = `${recordTitle || workspaceTitle} · Golden Brick Staff`;
}

function writeViewRoute(viewId, { replace = false } = {}) {
  const pathname = VIEW_ROUTES[viewId];
  if (!pathname) return;

  const url = new URL(window.location.href);
  url.pathname = pathname;

  if (viewId !== "jobs-view") {
    url.searchParams.delete("job");
    url.searchParams.delete("jobTab");
  }
  if (viewId !== "leads-view") {
    url.searchParams.delete("lead");
    url.searchParams.delete("leadTab");
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl === currentUrl) {
    updateDocumentTitle(viewId);
    return;
  }

  window.history[replace ? "replaceState" : "pushState"]({}, "", nextUrl);
  updateDocumentTitle(viewId);
}

function activateViewFromRoute({ replace = true } = {}) {
  const viewId = viewIdFromPathname();
  const button = routeButtonForView(viewId);
  if (!button || button.hidden || button.closest("[hidden]")) {
    writeViewRoute("today-view", { replace: true });
    return;
  }

  if (activeViewId() !== viewId) {
    isRestoringRoute = true;
    button.click();
    window.queueMicrotask(() => {
      isRestoringRoute = false;
      writeViewRoute(viewId, { replace });
    });
    return;
  }

  writeViewRoute(viewId, { replace });
}

function setStaffRoleFromCard() {
  const copy = currentUserCard?.textContent || "";
  if (/Admin access/i.test(copy)) {
    document.body.dataset.staffRole = "admin";
    return;
  }
  if (/Employee access/i.test(copy)) {
    document.body.dataset.staffRole = "employee";
    return;
  }
  delete document.body.dataset.staffRole;
}

function syncProjectAddressTitle() {
  if (
    !jobRecordTitle ||
    !jobWorkspaceMeta ||
    !document.getElementById("jobs-view")?.classList.contains(
      "is-job-workspace-active",
    )
  ) {
    return;
  }

  const address = (jobWorkspaceMeta.textContent || "").split(" · ")[0].trim();
  if (!address || /Address pending/i.test(address)) return;

  if (jobRecordTitle.textContent.trim() !== address) {
    jobRecordTitle.textContent = address;
  }
  updateDocumentTitle("jobs-view");
}

function visibleJumpButtons() {
  return Array.from(
    workspaceJumpResults?.querySelectorAll("[data-jump-view]") || [],
  ).filter((button) => !button.hidden && !button.closest("[hidden]"));
}

function filterWorkspaceJump() {
  const query = (workspaceJumpSearch?.value || "").trim().toLowerCase();
  let visibleCount = 0;

  visibleJumpButtons().forEach((button) => {
    const searchable = [
      button.dataset.jumpSearch || "",
      button.textContent || "",
    ]
      .join(" ")
      .toLowerCase();
    const isMatch = !query || searchable.includes(query);
    button.style.display = isMatch ? "" : "none";
    if (isMatch) visibleCount += 1;
  });

  if (workspaceJumpEmpty) {
    workspaceJumpEmpty.hidden = visibleCount > 0;
  }
}

function openWorkspaceJump() {
  if (!workspaceJumpDialog || !workspaceJumpBackdrop) return;
  lastFocusedElement = document.activeElement;
  workspaceJumpDialog.hidden = false;
  workspaceJumpBackdrop.hidden = false;
  workspaceJumpButton?.setAttribute("aria-expanded", "true");
  document.body.classList.add("workspace-jump-open");
  if (workspaceJumpSearch) {
    workspaceJumpSearch.value = "";
  }
  filterWorkspaceJump();
  window.requestAnimationFrame(() => workspaceJumpSearch?.focus());
}

function closeWorkspaceJump({ restoreFocus = true } = {}) {
  if (!workspaceJumpDialog || !workspaceJumpBackdrop) return;
  workspaceJumpDialog.hidden = true;
  workspaceJumpBackdrop.hidden = true;
  workspaceJumpButton?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("workspace-jump-open");
  if (restoreFocus && lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus();
  }
}

function openCreateDrawer() {
  if (!mobileCreateButton) return;
  mobileCreateButton.click();
}

function closeProjectAreaMenus(except = null) {
  document.querySelectorAll(".job-area-more[open]").forEach((details) => {
    if (details !== except) details.removeAttribute("open");
  });
}

function syncProjectAreaMenuTabStops(details) {
  const buttons = details.querySelectorAll("[data-job-tab]");
  buttons.forEach((button) => {
    button.tabIndex = details.open || button.classList.contains("is-active") ? 0 : -1;
  });
}

workspaceJumpButton?.addEventListener("click", () => {
  if (workspaceJumpDialog?.hidden === false) {
    closeWorkspaceJump();
    return;
  }
  openWorkspaceJump();
});

workspaceCreateButton?.addEventListener("click", openCreateDrawer);
workspaceJumpClose?.addEventListener("click", () => closeWorkspaceJump());
workspaceJumpBackdrop?.addEventListener("click", () => closeWorkspaceJump());
workspaceJumpSearch?.addEventListener("input", filterWorkspaceJump);

workspaceJumpResults?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-jump-view]");
  if (!button || button.hidden) return;
  const viewId = button.dataset.jumpView;
  const navButton = routeButtonForView(viewId);
  if (!navButton || navButton.hidden || navButton.closest("[hidden]")) return;

  closeWorkspaceJump({ restoreFocus: false });
  navButton.click();
});

document.addEventListener(
  "click",
  (event) => {
    const routeTarget = event.target.closest(
      "[data-view], [data-mobile-view], [data-drawer-view], [data-jump-view]",
    );
    if (routeTarget) {
      const viewId =
        routeTarget.dataset.view ||
        routeTarget.dataset.mobileView ||
        routeTarget.dataset.drawerView ||
        routeTarget.dataset.jumpView;
      const hadRecordRoute =
        new URL(window.location.href).searchParams.has("job") ||
        new URL(window.location.href).searchParams.has("lead");

      window.setTimeout(() => {
        if (!isRestoringRoute && VIEW_ROUTES[viewId]) {
          writeViewRoute(viewId, { replace: hadRecordRoute });
        }
      }, 0);
    }

    const projectTab = event.target.closest("[data-job-tab]");
    if (projectTab) {
      const details = projectTab.closest(".job-area-more");
      if (details) {
        details.removeAttribute("open");
        syncProjectAreaMenuTabStops(details);
      }
      window.setTimeout(() => {
        syncProjectAddressTitle();
        updateDocumentTitle("jobs-view");
      }, 0);
    }
  },
  true,
);

document.querySelectorAll(".job-area-more").forEach((details) => {
  details.addEventListener("toggle", () => {
    if (details.open) closeProjectAreaMenus(details);
    syncProjectAreaMenuTabStops(details);
  });
  syncProjectAreaMenuTabStops(details);
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable;

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openWorkspaceJump();
    return;
  }

  if (event.key === "/" && !isTyping && staffShell?.hidden === false) {
    event.preventDefault();
    openWorkspaceJump();
    return;
  }

  if (event.key === "Escape" && workspaceJumpDialog?.hidden === false) {
    event.preventDefault();
    closeWorkspaceJump();
  }
});

window.addEventListener("popstate", () => {
  window.setTimeout(() => activateViewFromRoute({ replace: true }), 0);
});

const roleObserver = new MutationObserver(() => {
  setStaffRoleFromCard();
  scheduleClientPortalExperienceSync();
});
if (currentUserCard) {
  roleObserver.observe(currentUserCard, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

const projectTitleObserver = new MutationObserver(syncProjectAddressTitle);
if (jobWorkspaceMeta) {
  projectTitleObserver.observe(jobWorkspaceMeta, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

if (document.getElementById("jobs-view")) {
  projectTitleObserver.observe(document.getElementById("jobs-view"), {
    attributes: true,
    attributeFilter: ["class", "hidden"],
  });
}

const shellObserver = new MutationObserver(() => {
  if (staffShell?.hidden === false && !hasAppliedInitialRoute) {
    hasAppliedInitialRoute = true;
    setStaffRoleFromCard();
    window.setTimeout(() => activateViewFromRoute({ replace: true }), 0);
  }
});

if (staffShell) {
  shellObserver.observe(staffShell, {
    attributes: true,
    attributeFilter: ["hidden"],
  });
}

customerPortalPreviewLink?.addEventListener("click", (event) => {
  openSelectedClientPreview(event).catch((error) => {
    showPortalExperienceToast(
      error.message || "Could not open the client preview.",
      "error",
    );
  });
});

customerPortalPanel?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-portal-scroll-target]");
  if (!button) return;
  const target = document.getElementById(button.dataset.portalScrollTarget);
  const section = target?.closest(".subpanel");
  if (!section) return;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  section.classList.remove("portal-section-highlight");
  window.requestAnimationFrame(() => {
    section.classList.add("portal-section-highlight");
    window.setTimeout(
      () => section.classList.remove("portal-section-highlight"),
      1400,
    );
  });
});

const clientPortalExperienceObserver = new MutationObserver(
  scheduleClientPortalExperienceSync,
);
if (customerRecordShell) {
  clientPortalExperienceObserver.observe(customerRecordShell, {
    attributes: true,
    attributeFilter: ["hidden"],
    childList: true,
    subtree: true,
  });
}

if (normalisePathname() !== window.location.pathname) {
  writeViewRoute("today-view", { replace: true });
}

ensureClientPortalWorkspaceStyles();
setStaffRoleFromCard();
syncClientPortalExperience();
syncProjectAddressTitle();
updateDocumentTitle();
