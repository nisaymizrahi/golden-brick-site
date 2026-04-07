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
    Timestamp,
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const VIEW_META = {
    "dashboard-view": {
        title: "Pipeline dashboard",
        subtitle: "New leads, follow-up cadence, estimate movement, and win/loss visibility."
    },
    "projects-view": {
        title: "Won projects",
        subtitle: "In-progress work, completed jobs, expenses, payments, and commission snapshots."
    },
    "templates-view": {
        title: "Estimate template",
        subtitle: "The default email framing for proposals sent to clients."
    },
    "staff-view": {
        title: "Staff access",
        subtitle: "Approved staff accounts, roles, SMS numbers, and default routing."
    }
};

const STATUS_META = {
    new_lead: "New Lead",
    follow_up: "Follow Up",
    estimate_sent: "Estimate Sent",
    closed_won: "Closed Won",
    closed_lost: "Closed Lost"
};

const EMPTY_TEMPLATE = {
    id: "estimate-default",
    name: "Investor Estimate Default",
    subjectTemplate: "Golden Brick estimate for {{projectType}} at {{projectAddress}}",
    greeting: "Hi {{clientName}},",
    intro: "Thanks for speaking with Golden Brick Construction. Based on the information shared so far, here is a working estimate outline for your project.",
    outro: "Please review the draft and let us know what you would like us to tighten before the next step.",
    terms: "Pricing is a planning estimate until site conditions, access, finish selections, and final scope are confirmed."
};

const refs = {
    authShell: document.getElementById("auth-shell"),
    authFeedback: document.getElementById("auth-feedback"),
    signInButton: document.getElementById("sign-in-button"),
    staffShell: document.getElementById("staff-shell"),
    signOutButton: document.getElementById("sign-out-button"),
    syncStatus: document.getElementById("sync-status"),
    currentUserCard: document.getElementById("current-user-card"),
    sidebarSummary: document.getElementById("sidebar-summary"),
    navButtons: Array.from(document.querySelectorAll(".nav-button")),
    workspaceTitle: document.getElementById("workspace-title"),
    workspaceSubtitle: document.getElementById("workspace-subtitle"),
    appBanner: document.getElementById("app-banner"),
    dashboardMetrics: document.getElementById("dashboard-metrics"),
    projectMetrics: document.getElementById("project-metrics"),
    leadSearchInput: document.getElementById("lead-search-input"),
    leadVisibilityFilter: document.getElementById("lead-visibility-filter"),
    pipelineBoard: document.getElementById("pipeline-board"),
    selectedLeadTitle: document.getElementById("selected-lead-title"),
    selectedLeadBadge: document.getElementById("selected-lead-badge"),
    leadEmptyState: document.getElementById("lead-empty-state"),
    leadDetailShell: document.getElementById("lead-detail-shell"),
    leadCoreForm: document.getElementById("lead-core-form"),
    leadClientName: document.getElementById("lead-client-name"),
    leadClientEmail: document.getElementById("lead-client-email"),
    leadClientPhone: document.getElementById("lead-client-phone"),
    leadProjectAddress: document.getElementById("lead-project-address"),
    leadProjectType: document.getElementById("lead-project-type"),
    leadStatusSelect: document.getElementById("lead-status-select"),
    leadAssigneeSelect: document.getElementById("lead-assignee-select"),
    leadSourceDisplay: document.getElementById("lead-source-display"),
    leadNotesInput: document.getElementById("lead-notes-input"),
    leadInfoMeta: document.getElementById("lead-info-meta"),
    leadMarkWonButton: document.getElementById("lead-mark-won-button"),
    leadMarkLostButton: document.getElementById("lead-mark-lost-button"),
    leadTabButtons: Array.from(document.querySelectorAll("[data-lead-tab]")),
    communicationForm: document.getElementById("communication-form"),
    communicationType: document.getElementById("communication-type"),
    communicationBody: document.getElementById("communication-body"),
    communicationList: document.getElementById("communication-list"),
    noteForm: document.getElementById("note-form"),
    noteBody: document.getElementById("note-body"),
    noteList: document.getElementById("note-list"),
    followupForm: document.getElementById("followup-form"),
    followupAt: document.getElementById("followup-at"),
    followupMessage: document.getElementById("followup-message"),
    reminderList: document.getElementById("reminder-list"),
    estimateForm: document.getElementById("estimate-form"),
    estimateAiButton: document.getElementById("estimate-ai-button"),
    estimateAddLineButton: document.getElementById("estimate-add-line-button"),
    estimateSubject: document.getElementById("estimate-subject"),
    estimateBody: document.getElementById("estimate-body"),
    estimateLines: document.getElementById("estimate-lines"),
    estimateSubtotal: document.getElementById("estimate-subtotal"),
    estimateSendButton: document.getElementById("estimate-send-button"),
    projectList: document.getElementById("project-list"),
    selectedProjectTitle: document.getElementById("selected-project-title"),
    selectedProjectStatus: document.getElementById("selected-project-status"),
    projectEmptyState: document.getElementById("project-empty-state"),
    projectDetailShell: document.getElementById("project-detail-shell"),
    projectCoreForm: document.getElementById("project-core-form"),
    projectStatusSelect: document.getElementById("project-status-select"),
    projectAddressDisplay: document.getElementById("project-address-display"),
    workerAssignmentList: document.getElementById("worker-assignment-list"),
    financeSummary: document.getElementById("finance-summary"),
    expenseForm: document.getElementById("expense-form"),
    expenseAmount: document.getElementById("expense-amount"),
    expenseCategory: document.getElementById("expense-category"),
    expenseNote: document.getElementById("expense-note"),
    expenseList: document.getElementById("expense-list"),
    paymentForm: document.getElementById("payment-form"),
    paymentAmount: document.getElementById("payment-amount"),
    paymentMethod: document.getElementById("payment-method"),
    paymentNote: document.getElementById("payment-note"),
    paymentList: document.getElementById("payment-list"),
    commissionBreakdown: document.getElementById("commission-breakdown"),
    templateForm: document.getElementById("template-form"),
    templateName: document.getElementById("template-name"),
    templateSubject: document.getElementById("template-subject"),
    templateGreeting: document.getElementById("template-greeting"),
    templateIntro: document.getElementById("template-intro"),
    templateOutro: document.getElementById("template-outro"),
    templateTerms: document.getElementById("template-terms"),
    staffList: document.getElementById("staff-list"),
    staffForm: document.getElementById("staff-form"),
    staffEmail: document.getElementById("staff-email"),
    staffDisplayName: document.getElementById("staff-display-name"),
    staffRole: document.getElementById("staff-role"),
    staffSmsNumber: document.getElementById("staff-sms-number"),
    staffDefaultAssignee: document.getElementById("staff-default-assignee"),
    staffActive: document.getElementById("staff-active"),
    staffFormReset: document.getElementById("staff-form-reset"),
    toastStack: document.getElementById("toast-stack"),
    views: Array.from(document.querySelectorAll(".view")),
    adminOnly: Array.from(document.querySelectorAll(".admin-only"))
};

const state = {
    app: null,
    auth: null,
    db: null,
    provider: null,
    currentUser: null,
    profile: null,
    leads: [],
    projects: [],
    staffRoster: [],
    template: { ...EMPTY_TEMPLATE },
    selectedLeadId: null,
    selectedProjectId: null,
    selectedStaffKey: null,
    leadActivities: [],
    leadReminders: [],
    projectExpenses: [],
    projectPayments: [],
    estimate: null,
    activeLeadTab: "info",
    activeView: "dashboard-view",
    leadSearch: "",
    leadFilter: "all",
    unsubs: {
        base: [],
        leadDetail: [],
        projectDetail: []
    }
};

function isAdmin() {
    return state.profile && state.profile.role === "admin";
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function sanitiseEmailKey(email) {
    return String(email || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function formatDateTime(value) {
    if (!value) return "Not set";
    const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not set";
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    }).format(date);
}

function formatDateForInput(value) {
    if (!value) return "";
    const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(Number(value || 0));
}

function normaliseFirestoreDoc(snapshot) {
    return {
        id: snapshot.id,
        ...snapshot.data()
    };
}

function currentLead() {
    return state.leads.find((lead) => lead.id === state.selectedLeadId) || null;
}

function currentProject() {
    return state.projects.find((project) => project.id === state.selectedProjectId) || null;
}

function activeStaffOptions() {
    return state.staffRoster
        .filter((member) => member.active !== false)
        .sort((left, right) => (left.displayName || left.email || "").localeCompare(right.displayName || right.email || ""));
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
    refs.appBanner.className = "app-banner " + variant;
}

function showToast(message, variant = "success") {
    const toast = document.createElement("div");
    toast.className = "toast " + variant;
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

function applyRoleVisibility() {
    const admin = isAdmin();

    refs.adminOnly.forEach((node) => {
        node.hidden = !admin;
    });

    if (!admin && (state.activeView === "templates-view" || state.activeView === "staff-view")) {
        switchView("dashboard-view");
    }
}

function switchView(viewId) {
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
}

function filteredLeads() {
    const queryText = state.leadSearch.trim().toLowerCase();

    return state.leads.filter((lead) => {
        const textBlob = [
            lead.clientName,
            lead.projectAddress,
            lead.projectType,
            lead.clientPhone,
            lead.clientEmail,
            lead.notes
        ].join(" ").toLowerCase();

        const matchesSearch = !queryText || textBlob.includes(queryText);

        if (!matchesSearch) {
            return false;
        }

        if (state.leadFilter === "open") {
            return lead.status !== "closed_won" && lead.status !== "closed_lost";
        }

        if (state.leadFilter === "needs_follow_up") {
            return lead.status === "new_lead" || lead.status === "follow_up";
        }

        if (state.leadFilter === "won_lost") {
            return lead.status === "closed_won" || lead.status === "closed_lost";
        }

        return true;
    });
}

function pipelineCounts(leads = state.leads) {
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
    const counts = pipelineCounts();
    const openLeadCount = counts.new_lead + counts.follow_up + counts.estimate_sent;
    const activeProjectCount = state.projects.filter((project) => project.status === "in_progress").length;

    refs.sidebarSummary.innerHTML = `
        <div class="sidebar-stat"><span>Open leads</span><strong>${openLeadCount}</strong></div>
        <div class="sidebar-stat"><span>Won projects</span><strong>${counts.closed_won}</strong></div>
        <div class="sidebar-stat"><span>In progress</span><strong>${activeProjectCount}</strong></div>
        <div class="sidebar-stat"><span>Closed lost</span><strong>${counts.closed_lost}</strong></div>
    `;
}

function renderDashboardMetrics() {
    const counts = pipelineCounts();
    const metrics = [
        { label: "New leads", value: counts.new_lead },
        { label: "Follow-up queue", value: counts.follow_up },
        { label: "Estimates sent", value: counts.estimate_sent },
        { label: "Won rate", value: state.leads.length ? Math.round((counts.closed_won / state.leads.length) * 100) + "%" : "0%" }
    ];

    refs.dashboardMetrics.innerHTML = metrics.map((metric) => `
        <article class="metric-card">
            <span>${escapeHtml(metric.label)}</span>
            <strong>${escapeHtml(metric.value)}</strong>
        </article>
    `).join("");
}

function renderProjectMetrics() {
    const inProgress = state.projects.filter((project) => project.status === "in_progress").length;
    const completed = state.projects.filter((project) => project.status === "completed").length;
    const totalPayments = state.projects.reduce((sum, project) => sum + Number(project.financials?.totalPayments || 0), 0);
    const totalProfit = state.projects.reduce((sum, project) => sum + Number(project.financials?.profit || 0), 0);

    refs.projectMetrics.innerHTML = [
        { label: "In progress", value: inProgress },
        { label: "Completed", value: completed },
        { label: "Client paid", value: formatCurrency(totalPayments) },
        { label: "Profit tracked", value: formatCurrency(totalProfit) }
    ].map((metric) => `
        <article class="metric-card">
            <span>${escapeHtml(metric.label)}</span>
            <strong>${escapeHtml(metric.value)}</strong>
        </article>
    `).join("");
}

function renderPipeline() {
    const leads = filteredLeads();
    const statuses = ["new_lead", "follow_up", "estimate_sent", "closed_won", "closed_lost"];

    refs.pipelineBoard.innerHTML = statuses.map((status) => {
        const laneLeads = leads
            .filter((lead) => (lead.status || "new_lead") === status)
            .sort((left, right) => {
                const leftTime = left.updatedAt && typeof left.updatedAt.toMillis === "function" ? left.updatedAt.toMillis() : 0;
                const rightTime = right.updatedAt && typeof right.updatedAt.toMillis === "function" ? right.updatedAt.toMillis() : 0;
                return rightTime - leftTime;
            });

        const cards = laneLeads.length
            ? laneLeads.map((lead) => `
                <button type="button" class="lead-card ${lead.id === state.selectedLeadId ? "is-selected" : ""}" data-lead-id="${escapeHtml(lead.id)}">
                    <div class="card-topline">
                        <span class="mini-pill">${escapeHtml(lead.projectType || "General")}</span>
                        <span class="mini-pill">${escapeHtml(lead.assignedToName || "Unassigned")}</span>
                    </div>
                    <h3 class="card-title">${escapeHtml(lead.clientName || "Unnamed lead")}</h3>
                    <p class="card-copy">${escapeHtml(lead.projectAddress || "Address pending")}</p>
                    <div class="card-meta">
                        <div>${escapeHtml(lead.clientPhone || "No phone")}</div>
                        <div>${escapeHtml(lead.clientEmail || "No email")}</div>
                        <div>Updated ${escapeHtml(formatDateTime(lead.updatedAt || lead.createdAt))}</div>
                    </div>
                </button>
            `).join("")
            : `<div class="empty-note">No leads in this stage.</div>`;

        return `
            <section class="pipeline-lane">
                <div class="lane-head">
                    <h3>${escapeHtml(STATUS_META[status])}</h3>
                    <span class="lane-count">${laneLeads.length}</span>
                </div>
                ${cards}
            </section>
        `;
    }).join("");

    Array.from(refs.pipelineBoard.querySelectorAll("[data-lead-id]")).forEach((button) => {
        button.addEventListener("click", () => {
            selectLead(button.dataset.leadId);
        });
    });
}

function renderLeadAssigneeOptions(lead) {
    if (!lead) {
        refs.leadAssigneeSelect.innerHTML = `<option value="">Unassigned</option>`;
        return;
    }

    if (!isAdmin()) {
        const optionLabel = lead.assignedToName || state.profile?.displayName || "Assigned staff";
        const optionValue = lead.assignedToUid || state.profile?.uid || "";
        refs.leadAssigneeSelect.innerHTML = `<option value="${escapeHtml(optionValue)}">${escapeHtml(optionLabel)}</option>`;
        refs.leadAssigneeSelect.disabled = true;
        return;
    }

    const options = [`<option value="">Unassigned</option>`].concat(
        activeStaffOptions().map((member) => `
            <option
                value="${escapeHtml(member.uid || "")}"
                ${lead.assignedToUid === member.uid ? "selected" : ""}
                ${member.uid ? "" : "disabled"}
            >
                ${escapeHtml((member.displayName || member.email) + (member.uid ? "" : " (sign in once to activate)"))}
            </option>
        `)
    );

    refs.leadAssigneeSelect.innerHTML = options.join("");
    refs.leadAssigneeSelect.disabled = false;
}

function renderLeadMeta(lead) {
    refs.leadInfoMeta.innerHTML = [
        ["Lead created", formatDateTime(lead.createdAt)],
        ["Last updated", formatDateTime(lead.updatedAt || lead.createdAt)],
        ["Lead source", lead.sourcePage || lead.sourceForm || "Website"],
        ["Assigned staff", lead.assignedToName || "Unassigned"],
        ["Consent", lead.consent ? "Yes" : "Not recorded"],
        ["Current follow-up", lead.followUpAt ? formatDateTime(lead.followUpAt) : "Not scheduled"]
    ].map(([key, value]) => `
        <div class="meta-row">
            <div class="meta-key">${escapeHtml(key)}</div>
            <div class="meta-value">${escapeHtml(value)}</div>
        </div>
    `).join("");
}

function renderActivityList(container, items, emptyMessage) {
    if (!items.length) {
        container.innerHTML = `<div class="empty-note">${escapeHtml(emptyMessage)}</div>`;
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

function renderReminderList() {
    const reminders = [...state.leadReminders].sort((left, right) => {
        const leftTime = left.remindAt && typeof left.remindAt.toMillis === "function" ? left.remindAt.toMillis() : 0;
        const rightTime = right.remindAt && typeof right.remindAt.toMillis === "function" ? right.remindAt.toMillis() : 0;
        return rightTime - leftTime;
    });

    if (!reminders.length) {
        refs.reminderList.innerHTML = `<div class="empty-note">No reminders set yet.</div>`;
        return;
    }

    refs.reminderList.innerHTML = reminders.map((reminder) => `
        <article class="timeline-item">
            <strong>${escapeHtml(formatDateTime(reminder.remindAt))}</strong>
            <p>${escapeHtml(reminder.message || "Follow up with the client.")}</p>
            <div class="timeline-meta">
                ${escapeHtml(reminder.status || "scheduled")} · Assigned to ${escapeHtml(reminder.assignedToName || "staff")}
            </div>
        </article>
    `).join("");
}

function renderEstimateLines(lineItems) {
    const rows = lineItems.length ? lineItems : [{ label: "", description: "", amount: "" }];

    refs.estimateLines.innerHTML = rows.map((item, index) => `
        <div class="line-item-row" data-line-index="${index}">
            <input type="text" data-line-field="label" value="${escapeHtml(item.label || "")}" placeholder="Line item">
            <input type="text" data-line-field="description" value="${escapeHtml(item.description || "")}" placeholder="What is included">
            <input type="number" data-line-field="amount" value="${escapeHtml(item.amount ?? "")}" min="0" step="0.01" placeholder="0.00">
            <button type="button" class="ghost-button" data-remove-line="${index}">Remove</button>
        </div>
    `).join("");

    Array.from(refs.estimateLines.querySelectorAll("[data-remove-line]")).forEach((button) => {
        button.addEventListener("click", () => {
            const currentLines = collectEstimateForm().lineItems;
            currentLines.splice(Number(button.dataset.removeLine), 1);
            renderEstimateLines(currentLines);
            updateEstimateSubtotal();
        });
    });

    Array.from(refs.estimateLines.querySelectorAll("input")).forEach((input) => {
        input.addEventListener("input", updateEstimateSubtotal);
    });

    updateEstimateSubtotal();
}

function collectEstimateForm() {
    const lineItems = Array.from(refs.estimateLines.querySelectorAll(".line-item-row")).map((row) => {
        const label = row.querySelector('[data-line-field="label"]').value.trim();
        const description = row.querySelector('[data-line-field="description"]').value.trim();
        const amount = Number(row.querySelector('[data-line-field="amount"]').value || 0);
        return { label, description, amount };
    }).filter((item) => item.label || item.description || item.amount);

    const subtotal = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
        subject: refs.estimateSubject.value.trim(),
        emailBody: refs.estimateBody.value.trim(),
        lineItems,
        subtotal: Number(subtotal.toFixed(2))
    };
}

function updateEstimateSubtotal() {
    refs.estimateSubtotal.textContent = formatCurrency(collectEstimateForm().subtotal);
}

function renderEstimatePanel() {
    const estimate = state.estimate || {
        subject: "",
        emailBody: "",
        lineItems: []
    };

    refs.estimateSubject.value = estimate.subject || "";
    refs.estimateBody.value = estimate.emailBody || "";
    renderEstimateLines(Array.isArray(estimate.lineItems) ? estimate.lineItems : []);
}

function renderLeadDetail() {
    const lead = currentLead();

    if (!lead) {
        refs.selectedLeadTitle.textContent = "Select a lead";
        refs.selectedLeadBadge.textContent = "No lead selected";
        refs.selectedLeadBadge.className = "status-pill neutral";
        refs.leadEmptyState.hidden = false;
        refs.leadDetailShell.hidden = true;
        return;
    }

    refs.leadEmptyState.hidden = true;
    refs.leadDetailShell.hidden = false;
    refs.selectedLeadTitle.textContent = lead.clientName || "Unnamed lead";
    refs.selectedLeadBadge.textContent = STATUS_META[lead.status || "new_lead"];
    refs.selectedLeadBadge.className = "status-pill";

    refs.leadClientName.value = lead.clientName || "";
    refs.leadClientEmail.value = lead.clientEmail || "";
    refs.leadClientPhone.value = lead.clientPhone || "";
    refs.leadProjectAddress.value = lead.projectAddress || "";
    refs.leadProjectType.value = lead.projectType || "";
    refs.leadStatusSelect.value = lead.status || "new_lead";
    refs.leadSourceDisplay.value = lead.sourcePage || lead.sourceForm || "Website";
    refs.leadNotesInput.value = lead.notes || "";
    renderLeadAssigneeOptions(lead);
    renderLeadMeta(lead);

    const communicationEntries = state.leadActivities.filter((activity) => ["call", "text", "email", "site_visit"].includes(activity.activityType));
    const noteEntries = state.leadActivities.filter((activity) => activity.activityType === "note");
    renderActivityList(refs.communicationList, communicationEntries, "No communication logged yet.");
    renderActivityList(refs.noteList, noteEntries, "No internal notes yet.");

    refs.followupAt.value = formatDateForInput(lead.followUpAt);
    renderReminderList();
    renderEstimatePanel();
}

function renderProjectList() {
    const sorted = [...state.projects].sort((left, right) => {
        const leftTime = left.updatedAt && typeof left.updatedAt.toMillis === "function" ? left.updatedAt.toMillis() : 0;
        const rightTime = right.updatedAt && typeof right.updatedAt.toMillis === "function" ? right.updatedAt.toMillis() : 0;
        return rightTime - leftTime;
    });

    if (!sorted.length) {
        refs.projectList.innerHTML = `<div class="empty-note">No won projects yet.</div>`;
        return;
    }

    refs.projectList.innerHTML = sorted.map((project) => `
        <button type="button" class="project-card ${project.id === state.selectedProjectId ? "is-selected" : ""}" data-project-id="${escapeHtml(project.id)}">
            <div class="card-topline">
                <span class="mini-pill">${escapeHtml(project.status === "completed" ? "Completed" : "In Progress")}</span>
                <span class="mini-pill">${escapeHtml(project.projectType || "Project")}</span>
            </div>
            <h3 class="card-title">${escapeHtml(project.clientName || "Unnamed project")}</h3>
            <p class="card-copy">${escapeHtml(project.projectAddress || "Address pending")}</p>
            <div class="card-meta">
                <div>Payments ${escapeHtml(formatCurrency(project.financials?.totalPayments || 0))}</div>
                <div>Expenses ${escapeHtml(formatCurrency(project.financials?.totalExpenses || 0))}</div>
                <div>Profit ${escapeHtml(formatCurrency(project.financials?.profit || 0))}</div>
            </div>
        </button>
    `).join("");

    Array.from(refs.projectList.querySelectorAll("[data-project-id]")).forEach((button) => {
        button.addEventListener("click", () => {
            selectProject(button.dataset.projectId);
        });
    });
}

function renderWorkerAssignments(project) {
    const roster = isAdmin()
        ? activeStaffOptions()
        : normaliseWorkers(project.assignedWorkers || []);

    if (!roster.length) {
        refs.workerAssignmentList.innerHTML = `<div class="empty-note">No staff records available yet.</div>`;
        return;
    }

    refs.workerAssignmentList.innerHTML = roster.map((member) => {
        const uid = member.uid || "";
        const assigned = (project.assignedWorkers || []).find((worker) => worker.uid === uid || worker.email === member.email);
        const checked = Boolean(assigned);
        const percent = assigned ? Number(assigned.percent || 0) : 0;
        const editable = isAdmin() && Boolean(uid);

        return `
            <div class="worker-row">
                <label>
                    <input type="checkbox" data-worker-check="${escapeHtml(uid || member.email || "")}" ${checked ? "checked" : ""} ${editable ? "" : "disabled"}>
                    <span>${escapeHtml((member.displayName || member.name || member.email) + (isAdmin() && !uid ? " (sign in once to activate)" : ""))}</span>
                </label>
                <input type="number" data-worker-percent="${escapeHtml(uid || member.email || "")}" min="0" step="0.01" value="${checked ? escapeHtml(percent) : ""}" placeholder="% split" ${editable ? "" : "disabled"}>
            </div>
        `;
    }).join("");
}

function normaliseWorkers(workers) {
    return (workers || []).map((worker) => ({
        uid: worker.uid || "",
        displayName: worker.name || worker.displayName || worker.email || "Assigned worker",
        email: worker.email || "",
        percent: Number(worker.percent || 0)
    }));
}

function renderFinanceSummary(project) {
    const financials = project.financials || {};
    const cards = [
        ["Client paid", formatCurrency(financials.totalPayments || 0)],
        ["Expenses", formatCurrency(financials.totalExpenses || 0)],
        ["Profit", formatCurrency(financials.profit || 0)],
        ["Company share", formatCurrency(financials.companyShare || 0)],
        ["Worker pool", formatCurrency(financials.workerPool || 0)]
    ];

    refs.financeSummary.innerHTML = cards.map(([label, value]) => `
        <article class="finance-card">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
        </article>
    `).join("");

    const workerBreakdown = Array.isArray(financials.workerBreakdown) ? financials.workerBreakdown : [];
    refs.commissionBreakdown.innerHTML = workerBreakdown.length
        ? workerBreakdown.map((worker) => `
            <article class="simple-item">
                <strong>${escapeHtml(worker.name)}</strong>
                <p>${escapeHtml(worker.percent)}% of worker pool</p>
                <div class="simple-meta">${escapeHtml(formatCurrency(worker.amount || 0))}</div>
            </article>
        `).join("")
        : `<div class="empty-note">No worker commission split saved yet.</div>`;
}

function renderSimpleEntries(container, items, formatter) {
    if (!items.length) {
        container.innerHTML = `<div class="empty-note">Nothing added yet.</div>`;
        return;
    }

    container.innerHTML = items.map((item) => formatter(item)).join("");
}

function renderProjectDetail() {
    const project = currentProject();

    if (!project) {
        refs.selectedProjectTitle.textContent = "Select a project";
        refs.selectedProjectStatus.textContent = "No project selected";
        refs.selectedProjectStatus.className = "status-pill neutral";
        refs.projectEmptyState.hidden = false;
        refs.projectDetailShell.hidden = true;
        return;
    }

    refs.projectEmptyState.hidden = true;
    refs.projectDetailShell.hidden = false;
    refs.selectedProjectTitle.textContent = project.clientName || "Unnamed project";
    refs.selectedProjectStatus.textContent = project.status === "completed" ? "Completed" : "In Progress";
    refs.selectedProjectStatus.className = "status-pill";
    refs.projectStatusSelect.value = project.status || "in_progress";
    refs.projectAddressDisplay.value = project.projectAddress || "";

    renderWorkerAssignments(project);
    renderFinanceSummary(project);

    renderSimpleEntries(refs.expenseList, state.projectExpenses, (expense) => `
        <article class="simple-item">
            <strong>${escapeHtml(expense.category || "Expense")} · ${escapeHtml(formatCurrency(expense.amount || 0))}</strong>
            <p>${escapeHtml(expense.note || "")}</p>
            <div class="simple-meta">${escapeHtml(formatDateTime(expense.createdAt))}</div>
        </article>
    `);

    renderSimpleEntries(refs.paymentList, state.projectPayments, (payment) => `
        <article class="simple-item">
            <strong>${escapeHtml(payment.method || "Payment")} · ${escapeHtml(formatCurrency(payment.amount || 0))}</strong>
            <p>${escapeHtml(payment.note || "")}</p>
            <div class="simple-meta">${escapeHtml(formatDateTime(payment.createdAt))}</div>
        </article>
    `);
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
        refs.staffList.innerHTML = `<div class="empty-note">Only admins can manage staff access.</div>`;
        return;
    }

    if (!state.staffRoster.length) {
        refs.staffList.innerHTML = `<div class="empty-note">No staff records created yet.</div>`;
        return;
    }

    refs.staffList.innerHTML = [...state.staffRoster]
        .sort((left, right) => (left.displayName || left.email || "").localeCompare(right.displayName || right.email || ""))
        .map((member) => `
            <button type="button" class="staff-card ${member.id === state.selectedStaffKey ? "is-selected" : ""}" data-staff-key="${escapeHtml(member.id)}">
                <div class="card-topline">
                    <span class="mini-pill">${escapeHtml(member.role || "employee")}</span>
                    <span class="mini-pill">${escapeHtml(member.active === false ? "Inactive" : "Active")}</span>
                </div>
                <h3 class="card-title">${escapeHtml(member.displayName || member.email)}</h3>
                <p class="card-copy">${escapeHtml(member.email)}</p>
                <div class="card-meta">
                    <div>SMS ${escapeHtml(member.smsNumber || "Not set")}</div>
                    <div>${escapeHtml(member.defaultLeadAssignee ? "Default lead assignee" : "Not default assignee")}</div>
                    <div>${escapeHtml(member.uid ? "Signed in at least once" : "Waiting for first sign-in")}</div>
                </div>
            </button>
        `).join("");

    Array.from(refs.staffList.querySelectorAll("[data-staff-key]")).forEach((button) => {
        button.addEventListener("click", () => {
            const member = state.staffRoster.find((item) => item.id === button.dataset.staffKey);
            if (!member) return;
            state.selectedStaffKey = member.id;
            refs.staffEmail.value = member.email || "";
            refs.staffDisplayName.value = member.displayName || "";
            refs.staffRole.value = member.role || "employee";
            refs.staffSmsNumber.value = member.smsNumber || "";
            refs.staffDefaultAssignee.checked = Boolean(member.defaultLeadAssignee);
            refs.staffActive.checked = member.active !== false;
            renderStaffList();
        });
    });
}

function renderAll() {
    renderCurrentUserCard();
    renderSidebarSummary();
    renderDashboardMetrics();
    renderProjectMetrics();
    renderPipeline();
    renderLeadDetail();
    renderProjectList();
    renderProjectDetail();
    renderTemplateForm();
    renderStaffList();
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
        throw new Error(payload.message || "Request failed.");
    }

    return payload;
}

function selectLead(leadId) {
    state.selectedLeadId = leadId;
    subscribeLeadDetail();
    renderAll();
}

function selectProject(projectId) {
    state.selectedProjectId = projectId;
    subscribeProjectDetail();
    renderAll();
}

async function syncSession(user) {
    const token = await user.getIdToken();
    const response = await fetch("/api/auth/sync-session", {
        method: "POST",
        headers: {
            Authorization: "Bearer " + token
        }
    });
    return response.json();
}

function subscribeBaseData() {
    clearUnsubs(state.unsubs.base);
    state.unsubs.base = [];

    const leadSource = isAdmin()
        ? collection(state.db, "leads")
        : query(collection(state.db, "leads"), where("assignedToUid", "==", state.profile.uid));

    state.unsubs.base.push(onSnapshot(leadSource, (snapshot) => {
        state.leads = snapshot.docs.map(normaliseFirestoreDoc);

        if (!state.selectedLeadId && state.leads.length) {
            state.selectedLeadId = state.leads[0].id;
        } else if (state.selectedLeadId && !state.leads.some((lead) => lead.id === state.selectedLeadId)) {
            state.selectedLeadId = state.leads[0] ? state.leads[0].id : null;
        }

        subscribeLeadDetail();
        renderAll();
        setSyncStatus("Lead data live");
    }));

    const projectSource = isAdmin()
        ? collection(state.db, "projects")
        : query(collection(state.db, "projects"), where("assignedWorkerIds", "array-contains", state.profile.uid));

    state.unsubs.base.push(onSnapshot(projectSource, (snapshot) => {
        state.projects = snapshot.docs.map(normaliseFirestoreDoc);

        if (!state.selectedProjectId && state.projects.length) {
            state.selectedProjectId = state.projects[0].id;
        } else if (state.selectedProjectId && !state.projects.some((project) => project.id === state.selectedProjectId)) {
            state.selectedProjectId = state.projects[0] ? state.projects[0].id : null;
        }

        subscribeProjectDetail();
        renderAll();
    }));

    state.unsubs.base.push(onSnapshot(doc(state.db, "emailTemplates", "estimate-default"), (snapshot) => {
        state.template = snapshot.exists() ? normaliseFirestoreDoc(snapshot) : { ...EMPTY_TEMPLATE };
        renderTemplateForm();
    }));

    if (isAdmin()) {
        state.unsubs.base.push(onSnapshot(collection(state.db, "allowedStaff"), (snapshot) => {
            state.staffRoster = snapshot.docs.map(normaliseFirestoreDoc);
            renderAll();
        }));
    } else {
        state.staffRoster = [];
    }
}

function subscribeLeadDetail() {
    clearUnsubs(state.unsubs.leadDetail);
    state.unsubs.leadDetail = [];
    state.leadActivities = [];
    state.leadReminders = [];
    state.estimate = null;

    if (!state.selectedLeadId) {
        renderLeadDetail();
        return;
    }

    state.unsubs.leadDetail.push(onSnapshot(collection(state.db, "leads", state.selectedLeadId, "activities"), (snapshot) => {
        state.leadActivities = snapshot.docs
            .map(normaliseFirestoreDoc)
            .sort((left, right) => {
                const leftTime = left.createdAt && typeof left.createdAt.toMillis === "function" ? left.createdAt.toMillis() : 0;
                const rightTime = right.createdAt && typeof right.createdAt.toMillis === "function" ? right.createdAt.toMillis() : 0;
                return rightTime - leftTime;
            });
        renderLeadDetail();
    }));

    state.unsubs.leadDetail.push(onSnapshot(query(collection(state.db, "reminders"), where("leadId", "==", state.selectedLeadId)), (snapshot) => {
        state.leadReminders = snapshot.docs.map(normaliseFirestoreDoc);
        renderLeadDetail();
    }));

    state.unsubs.leadDetail.push(onSnapshot(doc(state.db, "estimates", state.selectedLeadId), (snapshot) => {
        state.estimate = snapshot.exists() ? normaliseFirestoreDoc(snapshot) : null;
        renderLeadDetail();
    }));
}

function subscribeProjectDetail() {
    clearUnsubs(state.unsubs.projectDetail);
    state.unsubs.projectDetail = [];
    state.projectExpenses = [];
    state.projectPayments = [];

    if (!state.selectedProjectId) {
        renderProjectDetail();
        return;
    }

    state.unsubs.projectDetail.push(onSnapshot(collection(state.db, "projects", state.selectedProjectId, "expenses"), (snapshot) => {
        state.projectExpenses = snapshot.docs
            .map(normaliseFirestoreDoc)
            .sort((left, right) => {
                const leftTime = left.createdAt && typeof left.createdAt.toMillis === "function" ? left.createdAt.toMillis() : 0;
                const rightTime = right.createdAt && typeof right.createdAt.toMillis === "function" ? right.createdAt.toMillis() : 0;
                return rightTime - leftTime;
            });
        renderProjectDetail();
    }));

    state.unsubs.projectDetail.push(onSnapshot(collection(state.db, "projects", state.selectedProjectId, "payments"), (snapshot) => {
        state.projectPayments = snapshot.docs
            .map(normaliseFirestoreDoc)
            .sort((left, right) => {
                const leftTime = left.createdAt && typeof left.createdAt.toMillis === "function" ? left.createdAt.toMillis() : 0;
                const rightTime = right.createdAt && typeof right.createdAt.toMillis === "function" ? right.createdAt.toMillis() : 0;
                return rightTime - leftTime;
            });
        renderProjectDetail();
    }));
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
        state.provider = new GoogleAuthProvider();
        state.provider.setCustomParameters({
            prompt: "select_account"
        });

        refs.signInButton.disabled = false;
        refs.authFeedback.textContent = "Only approved staff accounts can enter the portal.";

        onAuthStateChanged(state.auth, async (user) => {
            clearUnsubs(state.unsubs.base);
            clearUnsubs(state.unsubs.leadDetail);
            clearUnsubs(state.unsubs.projectDetail);

            if (!user) {
                state.currentUser = null;
                state.profile = null;
                showAuthShell();
                return;
            }

            state.currentUser = user;
            refs.authFeedback.textContent = "Verifying your staff access...";

            try {
                const session = await syncSession(user);

                if (!session.authorised) {
                    showAuthShell(session.message || "This Google account is not approved for the staff portal.");
                    await signOut(state.auth);
                    return;
                }

                state.profile = session.profile;
                applyRoleVisibility();
                showStaffShell();
                switchView("dashboard-view");
                setBanner("", "info");
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

async function saveLead(event) {
    event.preventDefault();
    const lead = currentLead();

    if (!lead) return;

    const assigneeUid = refs.leadAssigneeSelect.value || "";
    const assignee = activeStaffOptions().find((member) => member.uid === assigneeUid);
    const nextStatus = refs.leadStatusSelect.value;
    const updates = {
        clientName: refs.leadClientName.value.trim(),
        clientEmail: refs.leadClientEmail.value.trim(),
        clientPhone: refs.leadClientPhone.value.trim(),
        projectAddress: refs.leadProjectAddress.value.trim(),
        projectType: refs.leadProjectType.value.trim(),
        notes: refs.leadNotesInput.value.trim(),
        status: nextStatus,
        statusLabel: STATUS_META[nextStatus],
        updatedAt: serverTimestamp()
    };

    if (isAdmin()) {
        updates.assignedToUid = assigneeUid || null;
        updates.assignedToName = assignee ? assignee.displayName || assignee.email : "";
        updates.assignedToEmail = assignee ? assignee.email || "" : "";
    }

    await updateDoc(doc(state.db, "leads", lead.id), updates);

    if (lead.status !== nextStatus) {
        await addDoc(collection(state.db, "leads", lead.id, "activities"), {
            activityType: "system",
            title: "Lead status updated",
            body: "Moved to " + STATUS_META[nextStatus] + ".",
            actorName: state.profile.displayName,
            actorUid: state.profile.uid,
            actorRole: state.profile.role,
            createdAt: serverTimestamp()
        });
    }

    if (isAdmin() && lead.assignedToUid !== (assigneeUid || null)) {
        await addDoc(collection(state.db, "leads", lead.id, "activities"), {
            activityType: "system",
            title: "Lead reassigned",
            body: "Assigned to " + (updates.assignedToName || "Unassigned") + ".",
            actorName: state.profile.displayName,
            actorUid: state.profile.uid,
            actorRole: state.profile.role,
            createdAt: serverTimestamp()
        });
    }

    showToast("Lead updated.");
}

async function markLeadLost() {
    const lead = currentLead();
    if (!lead) return;

    await updateDoc(doc(state.db, "leads", lead.id), {
        status: "closed_lost",
        statusLabel: STATUS_META.closed_lost,
        updatedAt: serverTimestamp()
    });

    await addDoc(collection(state.db, "leads", lead.id, "activities"), {
        activityType: "system",
        title: "Lead marked lost",
        body: "Lead was closed lost.",
        actorName: state.profile.displayName,
        actorUid: state.profile.uid,
        actorRole: state.profile.role,
        createdAt: serverTimestamp()
    });

    showToast("Lead marked lost.");
}

async function convertLeadToProject() {
    const lead = currentLead();

    if (!lead || !isAdmin()) return;

    const assignee = activeStaffOptions().find((member) => member.uid === (lead.assignedToUid || refs.leadAssigneeSelect.value));
    const assignedWorkers = assignee ? [{
        uid: assignee.uid,
        name: assignee.displayName || assignee.email,
        email: assignee.email || "",
        percent: 100
    }] : [];

    const batch = writeBatch(state.db);
    const projectRef = doc(state.db, "projects", lead.id);
    const leadRef = doc(state.db, "leads", lead.id);

    batch.set(projectRef, {
        id: lead.id,
        leadId: lead.id,
        clientName: lead.clientName || refs.leadClientName.value.trim(),
        clientEmail: lead.clientEmail || refs.leadClientEmail.value.trim(),
        clientPhone: lead.clientPhone || refs.leadClientPhone.value.trim(),
        projectAddress: lead.projectAddress || refs.leadProjectAddress.value.trim(),
        projectType: lead.projectType || refs.leadProjectType.value.trim(),
        status: "in_progress",
        assignedWorkers,
        assignedWorkerIds: assignedWorkers.map((worker) => worker.uid).filter(Boolean),
        assignedLeadOwnerUid: lead.assignedToUid || assignee?.uid || null,
        financials: {
            totalExpenses: 0,
            totalPayments: 0,
            profit: 0,
            distributableProfit: 0,
            companyShare: 0,
            workerPool: 0,
            workerBreakdown: []
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    }, { merge: true });

    batch.update(leadRef, {
        status: "closed_won",
        statusLabel: STATUS_META.closed_won,
        wonProjectId: lead.id,
        updatedAt: serverTimestamp()
    });

    await batch.commit();

    await addDoc(collection(state.db, "leads", lead.id, "activities"), {
        activityType: "system",
        title: "Lead converted to project",
        body: "Won project created and moved into the project register.",
        actorName: state.profile.displayName,
        actorUid: state.profile.uid,
        actorRole: state.profile.role,
        createdAt: serverTimestamp()
    });

    state.selectedProjectId = lead.id;
    switchView("projects-view");
    subscribeProjectDetail();
    showToast("Project created from won lead.");
}

async function addCommunication(event) {
    event.preventDefault();
    const lead = currentLead();
    const body = refs.communicationBody.value.trim();

    if (!lead || !body) return;

    await addDoc(collection(state.db, "leads", lead.id, "activities"), {
        activityType: refs.communicationType.value,
        title: refs.communicationType.options[refs.communicationType.selectedIndex].text + " logged",
        body,
        actorName: state.profile.displayName,
        actorUid: state.profile.uid,
        actorRole: state.profile.role,
        createdAt: serverTimestamp()
    });

    refs.communicationBody.value = "";
    showToast("Communication logged.");
}

async function addNote(event) {
    event.preventDefault();
    const lead = currentLead();
    const body = refs.noteBody.value.trim();

    if (!lead || !body) return;

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

async function scheduleFollowup(event) {
    event.preventDefault();
    const lead = currentLead();
    if (!lead) return;

    const followUpDate = refs.followupAt.value ? Timestamp.fromDate(new Date(refs.followupAt.value)) : null;
    const message = refs.followupMessage.value.trim() || "Follow up with this lead.";

    if (!followUpDate) {
        showToast("Choose a reminder date and time first.", "error");
        return;
    }

    const reminderQuery = query(
        collection(state.db, "reminders"),
        where("leadId", "==", lead.id),
        where("status", "==", "scheduled")
    );
    const existingReminders = await getDocs(reminderQuery);
    const batch = writeBatch(state.db);

    existingReminders.forEach((snapshot) => {
        batch.update(snapshot.ref, {
            status: "cancelled",
            updatedAt: serverTimestamp()
        });
    });

    batch.update(doc(state.db, "leads", lead.id), {
        followUpAt: followUpDate,
        reminderState: "scheduled",
        status: lead.status === "new_lead" ? "follow_up" : lead.status,
        statusLabel: lead.status === "new_lead" ? STATUS_META.follow_up : STATUS_META[lead.status || "new_lead"],
        updatedAt: serverTimestamp()
    });

    const reminderRef = doc(collection(state.db, "reminders"));
    batch.set(reminderRef, {
        id: reminderRef.id,
        leadId: lead.id,
        clientName: lead.clientName || "",
        projectAddress: lead.projectAddress || "",
        assignedToUid: lead.assignedToUid || state.profile.uid,
        assignedToName: lead.assignedToName || state.profile.displayName,
        message,
        remindAt: followUpDate,
        status: "scheduled",
        createdByUid: state.profile.uid,
        createdByName: state.profile.displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    await batch.commit();

    await addDoc(collection(state.db, "leads", lead.id, "activities"), {
        activityType: "follow_up",
        title: "Follow-up scheduled",
        body: message,
        actorName: state.profile.displayName,
        actorUid: state.profile.uid,
        actorRole: state.profile.role,
        createdAt: serverTimestamp()
    });

    refs.followupMessage.value = "";
    showToast("Follow-up reminder scheduled.");
}

async function saveEstimateDraft(event) {
    event.preventDefault();
    const lead = currentLead();
    if (!lead || !isAdmin()) return;

    const estimate = collectEstimateForm();

    await setDoc(doc(state.db, "estimates", lead.id), {
        id: lead.id,
        leadId: lead.id,
        status: "draft",
        subject: estimate.subject,
        emailBody: estimate.emailBody,
        lineItems: estimate.lineItems,
        subtotal: estimate.subtotal,
        updatedAt: serverTimestamp(),
        createdAt: state.estimate?.createdAt || serverTimestamp(),
        lastEditedByUid: state.profile.uid,
        lastEditedByName: state.profile.displayName
    }, { merge: true });

    showToast("Estimate draft saved.");
}

async function draftEstimateWithAi() {
    const lead = currentLead();
    if (!lead || !isAdmin()) return;

    refs.estimateAiButton.disabled = true;
    refs.estimateAiButton.textContent = "Drafting...";

    try {
        const payload = await apiPost("/api/staff/estimate-draft", { leadId: lead.id });
        state.estimate = payload.estimate;
        renderEstimatePanel();
        showToast(payload.estimate.generatedBy === "openai" ? "AI estimate draft ready." : "Fallback estimate draft created.");
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        refs.estimateAiButton.disabled = false;
        refs.estimateAiButton.textContent = "Draft with AI";
    }
}

async function sendEstimate() {
    const lead = currentLead();
    if (!lead || !isAdmin()) return;

    const estimate = collectEstimateForm();

    if (!estimate.subject || !estimate.emailBody || !estimate.lineItems.length) {
        showToast("Complete the estimate subject, body, and at least one line item before sending.", "error");
        return;
    }

    refs.estimateSendButton.disabled = true;
    refs.estimateSendButton.textContent = "Sending...";

    try {
        const payload = await apiPost("/api/staff/send-estimate", {
            leadId: lead.id,
            subject: estimate.subject,
            emailBody: estimate.emailBody,
            lineItems: estimate.lineItems
        });

        if (payload.delivery?.simulated) {
            showToast("Estimate marked sent in simulation mode. Add Resend config for live email.", "success");
            setBanner("Estimate delivery is running in simulation mode. Configure Resend to send live client emails.", "info");
        } else {
            showToast("Estimate email sent.");
        }
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        refs.estimateSendButton.disabled = false;
        refs.estimateSendButton.textContent = "Send estimate email";
    }
}

async function saveProject(event) {
    event.preventDefault();
    const project = currentProject();
    if (!project || !isAdmin()) return;

    const assignedWorkers = Array.from(refs.workerAssignmentList.querySelectorAll("[data-worker-check]")).flatMap((checkbox) => {
        const checked = checkbox.checked;
        const key = checkbox.dataset.workerCheck;
        if (!checked) return [];
        const percentInput = refs.workerAssignmentList.querySelector(`[data-worker-percent="${CSS.escape(key)}"]`);
        const member = state.staffRoster.find((staff) => (staff.uid || staff.email) === key) || project.assignedWorkers?.find((staff) => (staff.uid || staff.email) === key);
        return [{
            uid: member?.uid || "",
            name: member?.displayName || member?.name || member?.email || "Assigned worker",
            email: member?.email || "",
            percent: Number(percentInput?.value || 0)
        }];
    });

    await updateDoc(doc(state.db, "projects", project.id), {
        status: refs.projectStatusSelect.value,
        assignedWorkers,
        assignedWorkerIds: assignedWorkers.map((worker) => worker.uid).filter(Boolean),
        updatedAt: serverTimestamp()
    });

    showToast("Project setup saved.");
}

async function addExpense(event) {
    event.preventDefault();
    const project = currentProject();
    if (!project) return;

    const amount = Number(refs.expenseAmount.value || 0);
    const category = refs.expenseCategory.value.trim();
    const note = refs.expenseNote.value.trim();

    if (!amount) {
        showToast("Enter an expense amount first.", "error");
        return;
    }

    await addDoc(collection(state.db, "projects", project.id, "expenses"), {
        amount,
        category,
        note,
        createdByUid: state.profile.uid,
        createdByName: state.profile.displayName,
        createdAt: serverTimestamp()
    });

    refs.expenseForm.reset();
    showToast("Expense added.");
}

async function addPayment(event) {
    event.preventDefault();
    const project = currentProject();
    if (!project || !isAdmin()) return;

    const amount = Number(refs.paymentAmount.value || 0);
    const method = refs.paymentMethod.value.trim();
    const note = refs.paymentNote.value.trim();

    if (!amount) {
        showToast("Enter a payment amount first.", "error");
        return;
    }

    await addDoc(collection(state.db, "projects", project.id, "payments"), {
        amount,
        method,
        note,
        createdByUid: state.profile.uid,
        createdByName: state.profile.displayName,
        createdAt: serverTimestamp()
    });

    refs.paymentForm.reset();
    showToast("Payment recorded.");
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
        smsNumber: refs.staffSmsNumber.value.trim(),
        defaultLeadAssignee: refs.staffDefaultAssignee.checked,
        active: refs.staffActive.checked,
        createdAt: existing?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    if (refs.staffDefaultAssignee.checked) {
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
        button.addEventListener("click", () => switchView(button.dataset.view));
    });

    refs.leadSearchInput.addEventListener("input", (event) => {
        state.leadSearch = event.target.value || "";
        renderPipeline();
    });

    refs.leadVisibilityFilter.addEventListener("change", (event) => {
        state.leadFilter = event.target.value;
        renderPipeline();
    });

    refs.leadCoreForm.addEventListener("submit", (event) => {
        saveLead(event).catch((error) => showToast(error.message, "error"));
    });
    refs.leadMarkLostButton.addEventListener("click", () => {
        markLeadLost().catch((error) => showToast(error.message, "error"));
    });
    refs.leadMarkWonButton.addEventListener("click", () => {
        convertLeadToProject().catch((error) => showToast(error.message, "error"));
    });
    refs.communicationForm.addEventListener("submit", (event) => {
        addCommunication(event).catch((error) => showToast(error.message, "error"));
    });
    refs.noteForm.addEventListener("submit", (event) => {
        addNote(event).catch((error) => showToast(error.message, "error"));
    });
    refs.followupForm.addEventListener("submit", (event) => {
        scheduleFollowup(event).catch((error) => showToast(error.message, "error"));
    });
    refs.estimateForm.addEventListener("submit", (event) => {
        saveEstimateDraft(event).catch((error) => showToast(error.message, "error"));
    });
    refs.estimateAiButton.addEventListener("click", () => {
        draftEstimateWithAi().catch((error) => showToast(error.message, "error"));
    });
    refs.estimateAddLineButton.addEventListener("click", () => {
        const lines = collectEstimateForm().lineItems;
        lines.push({ label: "", description: "", amount: "" });
        renderEstimateLines(lines);
    });
    refs.estimateSendButton.addEventListener("click", () => {
        sendEstimate().catch((error) => showToast(error.message, "error"));
    });

    refs.leadTabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            state.activeLeadTab = button.dataset.leadTab;
            refs.leadTabButtons.forEach((tabButton) => {
                tabButton.classList.toggle("is-active", tabButton.dataset.leadTab === state.activeLeadTab);
            });
            Array.from(document.querySelectorAll(".tab-pane")).forEach((pane) => {
                pane.classList.toggle("is-active", pane.id === "lead-tab-" + state.activeLeadTab);
            });
        });
    });

    refs.projectCoreForm.addEventListener("submit", (event) => {
        saveProject(event).catch((error) => showToast(error.message, "error"));
    });
    refs.expenseForm.addEventListener("submit", (event) => {
        addExpense(event).catch((error) => showToast(error.message, "error"));
    });
    refs.paymentForm.addEventListener("submit", (event) => {
        addPayment(event).catch((error) => showToast(error.message, "error"));
    });
    refs.templateForm.addEventListener("submit", (event) => {
        saveTemplate(event).catch((error) => showToast(error.message, "error"));
    });
    refs.staffForm.addEventListener("submit", (event) => {
        saveStaff(event).catch((error) => showToast(error.message, "error"));
    });
    refs.staffFormReset.addEventListener("click", resetStaffForm);
}

bindUi();
showAuthShell();
bootstrapFirebase();
