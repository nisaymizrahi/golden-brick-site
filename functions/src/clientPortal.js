"use strict";

function buildClientPortalApi({
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
}) {
  const COMPANY_INFO = {
    name: "Golden Brick Construction",
    phone: "(267) 715-5557",
    phoneHref: "tel:+12677155557",
    email: "info@goldenbrickc.com",
    emailHref: "mailto:info@goldenbrickc.com",
  };

  const PORTAL_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  function applyCors(response) {
    Object.entries(PORTAL_HEADERS).forEach(([key, value]) => {
      response.setHeader(key, value);
    });
  }

  function respondJson(response, status, payload) {
    applyCors(response);
    response.status(status).json(payload);
  }

  function safeString(value) {
    return String(value || "").trim();
  }

  function cleanNullableString(value) {
    const normalised = safeString(value);
    return normalised || null;
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

  function normalisePortalRole(value) {
    const role = safeString(value).toLowerCase();
    if (role === "primary" || role === "partner" || role === "read_only") {
      return role;
    }
    if (role === "read-only" || role === "readonly") {
      return "read_only";
    }
    if (role === "customer") {
      return "primary";
    }
    return "primary";
  }

  function portalRoleLabel(role) {
    const normalised = normalisePortalRole(role);
    if (normalised === "partner") {
      return "Partner";
    }
    if (normalised === "read_only") {
      return "Read-only";
    }
    return "Primary";
  }

  function portalAccessScopeForRole(role) {
    return normalisePortalRole(role) === "read_only"
      ? "read_only"
      : "customer";
  }

  function portalRoleCanSign(role) {
    const normalised = normalisePortalRole(role);
    return normalised === "primary" || normalised === "partner";
  }

  function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normaliseMillis(value) {
    if (!value) return 0;

    if (typeof value.toMillis === "function") {
      return value.toMillis();
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  function serialiseDateValue(value) {
    const millis = normaliseMillis(value);
    return millis ? new Date(millis).toISOString() : null;
  }

  function createOpaqueId(byteCount = 18) {
    return admin.app().options.projectId
      ? require("node:crypto").randomBytes(byteCount).toString("hex")
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function parseRequestPayload(request) {
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

  function requestProtocol(request) {
    return (
      safeString(
        request.get("x-forwarded-proto") || request.protocol || "https",
      )
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

  function latestByUpdated(items = []) {
    if (!items.length) return null;

    return (
      [...items].sort((left, right) => {
        return (
          normaliseMillis(right.updatedAt || right.createdAt) -
          normaliseMillis(left.updatedAt || left.createdAt)
        );
      })[0] || null
    );
  }

  function clientUserRef(uid) {
    return db.collection("clientUsers").doc(uid);
  }

  function customerRef(customerId) {
    return db.collection("customers").doc(customerId);
  }

  function contactRef(customerId, contactId) {
    return customerRef(customerId).collection("contacts").doc(contactId);
  }

  function threadsCollection(customerId) {
    return customerRef(customerId).collection("threads");
  }

  function threadRef(customerId, threadId) {
    return threadsCollection(customerId).doc(threadId);
  }

  function messagesCollection(customerId, threadId) {
    return threadRef(customerId, threadId).collection("messages");
  }

  function inviteStatusLabel(contactData = {}) {
    if (contactData.disabledAt) {
      return "disabled";
    }

    const status = safeString(contactData.inviteStatus);
    if (status) {
      return status;
    }

    if (safeString(contactData.authUid)) {
      return "claimed";
    }

    return "not_invited";
  }

  function buildClientAcceptUrl(request, token) {
    return `${requestBaseUrl(request)}/client/accept?token=${encodeURIComponent(token)}`;
  }

  function buildClientLoginUrl(request) {
    return `${requestBaseUrl(request)}/client/login`;
  }

  function createInviteToken(customerId, contactId) {
    return `${customerId}.${contactId}.${createOpaqueId(16)}`;
  }

  function serialisePortalContact(contact, request) {
    const data = contact?.data || contact || {};
    const id = contact?.id || data.id || "";
    const role = normalisePortalRole(data.role || data.accessScope);
    return {
      id,
      customerId: safeString(data.customerId),
      name: safeString(data.name),
      email: normaliseEmail(data.email),
      phone: safeString(data.phone),
      role,
      roleLabel: portalRoleLabel(role),
      accessScope: portalAccessScopeForRole(role),
      canSign: portalRoleCanSign(role),
      canMessage: true,
      authUid: safeString(data.authUid),
      inviteStatus: inviteStatusLabel(data),
      lastInvitedAt: serialiseDateValue(data.lastInvitedAt),
      claimedAt: serialiseDateValue(data.claimedAt),
      disabledAt: serialiseDateValue(data.disabledAt),
      revokedAt: serialiseDateValue(data.revokedAt),
      lastLoginAt: serialiseDateValue(data.lastLoginAt),
      inviteUrl: safeString(data.inviteUrl),
      loginUrl: buildClientLoginUrl(request),
      hasAccount: Boolean(safeString(data.authUid)),
      createdAt: serialiseDateValue(data.createdAt),
      updatedAt: serialiseDateValue(data.updatedAt),
    };
  }

  function serialisePortalMessage(message) {
    const data = message?.data || message || {};
    const id = message?.id || data.id || "";
    return {
      id,
      body: safeString(data.body),
      authorRole: safeString(data.authorRole || "client"),
      authorName: safeString(
        data.authorName ||
          (safeString(data.authorRole) === "staff"
            ? COMPANY_INFO.name
            : "Client"),
      ),
      authorUid: safeString(data.authorUid),
      createdAt: serialiseDateValue(data.createdAt),
      readByClientAt: serialiseDateValue(data.readByClientAt),
      readByStaffAt: serialiseDateValue(data.readByStaffAt),
    };
  }

  function serialisePortalThread(thread, messages = []) {
    const data = thread?.data || thread || {};
    const id = thread?.id || data.id || "";
    return {
      id,
      customerId: safeString(data.customerId),
      threadType: safeString(data.threadType || "general"),
      title: safeString(
        data.title ||
          (safeString(data.threadType) === "project"
            ? "Project updates"
            : "General updates"),
      ),
      projectId: safeString(data.projectId),
      projectAddress: safeString(data.projectAddress),
      projectType: safeString(data.projectType),
      lastMessageAt: serialiseDateValue(data.lastMessageAt),
      lastMessagePreview: safeString(data.lastMessagePreview),
      lastAuthorRole: safeString(data.lastAuthorRole),
      clientUnreadCount: toNumber(data.clientUnreadCount),
      staffUnreadCount: toNumber(data.staffUnreadCount),
      createdAt: serialiseDateValue(data.createdAt),
      updatedAt: serialiseDateValue(data.updatedAt),
      messages: messages.map(serialisePortalMessage),
    };
  }

  function defaultPhaseLabel(projectData = {}) {
    return (
      safeString(projectData.phaseLabel) ||
      (safeString(projectData.status) === "completed"
        ? "Project completed"
        : "Planning and construction")
    );
  }

  function defaultNextStep(projectData = {}) {
    return (
      safeString(projectData.nextStep) ||
      (safeString(projectData.status) === "completed"
        ? "Golden Brick will coordinate any final closeout details from here."
        : "Golden Brick will confirm the next planning or construction step directly in this portal.")
    );
  }

  function defaultSharedStatusNote(projectData = {}) {
    return (
      safeString(projectData.sharedStatusNote) ||
      "This portal is meant to keep your project updates, billing, and paperwork in one clean place."
    );
  }

  function buildClientJobPayload(
    projectData = {},
    invoices = [],
    payments = [],
  ) {
    const activeInvoices = invoices.filter(
      (invoice) => safeString(invoice.status) !== "paid",
    );
    const latestInvoice = latestByUpdated(invoices);
    const latestPayment = latestByUpdated(payments);
    const totalPaymentsReceived = payments.reduce(
      (sum, payment) => sum + toNumber(payment.amount),
      0,
    );
    const updatedAt = serialiseDateValue(
      projectData.updatedAt || projectData.createdAt,
    );

    return {
      id: safeString(projectData.id),
      address: safeString(projectData.projectAddress),
      projectType: safeString(projectData.projectType),
      status: safeString(projectData.status || "in_progress"),
      phaseLabel: defaultPhaseLabel(projectData),
      nextStep: defaultNextStep(projectData),
      sharedStatusNote: defaultSharedStatusNote(projectData),
      targetDate: serialiseDateValue(projectData.targetDate),
      targetWindow: safeString(projectData.targetWindow),
      latestUpdateAt: updatedAt,
      updatedAt,
      invoiceCount: invoices.length,
      openInvoiceCount: activeInvoices.length,
      totalPaymentsReceived,
      latestInvoiceDueAt: serialiseDateValue(latestInvoice?.dueDate),
      latestPaymentAt: serialiseDateValue(
        latestPayment?.relatedDate || latestPayment?.createdAt,
      ),
    };
  }

  function buildClientInvoicePayload(invoice = {}, projectData = {}) {
    const visibleInPortal = isClientVisibleInvoice(invoice);
    return {
      id: safeString(invoice.id),
      projectId: safeString(invoice.projectId || projectData.id),
      projectAddress: safeString(
        invoice.projectAddress || projectData.projectAddress,
      ),
      title: safeString(invoice.title || "Invoice"),
      invoiceNumber: safeString(invoice.invoiceNumber),
      status: safeString(invoice.status || "draft"),
      issueDate: serialiseDateValue(invoice.issueDate),
      dueDate: serialiseDateValue(invoice.dueDate),
      subtotal: toNumber(invoice.subtotal),
      summary: safeString(invoice.summary),
      notes: safeString(invoice.notes),
      paymentMethod: safeString(invoice.paymentMethod),
      paymentReference: safeString(invoice.paymentReference),
      paymentNote: safeString(invoice.paymentNote),
      paidAt: serialiseDateValue(invoice.paidAt),
      visibleInPortal,
      visibilityMode:
        invoice.clientVisibleOverride === true
          ? "forced_visible"
          : invoice.clientVisibleOverride === false
            ? "hidden"
            : "auto",
      updatedAt: serialiseDateValue(invoice.updatedAt || invoice.createdAt),
    };
  }

  function buildClientPaymentPayload(payment = {}, projectData = {}) {
    return {
      id: safeString(payment.id),
      projectId: safeString(projectData.id || payment.projectId),
      projectAddress: safeString(
        projectData.projectAddress || payment.projectAddress,
      ),
      amount: toNumber(payment.amount),
      paymentType: safeString(payment.paymentType || "payment"),
      method: safeString(payment.method),
      note: safeString(payment.note),
      relatedDate: serialiseDateValue(payment.relatedDate || payment.createdAt),
      createdAt: serialiseDateValue(payment.createdAt),
    };
  }

  function buildClientBillingSnapshot(invoices = [], totalPaid = 0) {
    const now = Date.now();
    const openInvoices = invoices.filter(
      (invoice) => safeString(invoice.status) !== "paid",
    );
    const dueNowInvoices = openInvoices.filter((invoice) => {
      const dueMillis = normaliseMillis(invoice.dueDate);
      return !dueMillis || dueMillis <= now;
    });
    const upcomingInvoices = openInvoices.filter((invoice) => {
      const dueMillis = normaliseMillis(invoice.dueDate);
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
      paidToDate: toNumber(totalPaid),
      dueCount: openInvoices.length,
      overdueCount: openInvoices.filter((invoice) => {
        const dueMillis = normaliseMillis(invoice.dueDate);
        return dueMillis && dueMillis < now;
      }).length,
    };
  }

  function buildClientAttentionItems({
    estimates = [],
    jobs = [],
    threads = [],
    billingSummary = {},
  }) {
    const items = [];
    const approvalsToReview = estimates.filter(
      (entry) => safeString(entry.status) === "active",
    ).length;
    const unreadMessages = threads.reduce(
      (sum, thread) => sum + toNumber(thread.clientUnreadCount),
      0,
    );

    if (approvalsToReview > 0) {
      items.push({
        label: "Needs approval",
        title: `${approvalsToReview} approval${approvalsToReview === 1 ? "" : "s"} still need attention`,
        copy: "Open the estimates section to review pricing, scope revisions, or agreement status.",
        view: "estimates",
      });
    }

    if (toNumber(billingSummary.dueCount) > 0) {
      const dueCount = toNumber(billingSummary.dueCount);
      items.push({
        label: "Billing",
        title: `${dueCount} invoice${dueCount === 1 ? "" : "s"} still open`,
        copy: "See what is due now, what is upcoming, and which property each invoice belongs to.",
        view: "billing",
      });
    }

    if (unreadMessages > 0) {
      items.push({
        label: "Messages",
        title: `${unreadMessages} unread portal message${unreadMessages === 1 ? "" : "s"}`,
        copy: "Open the message center to read the latest reply from Golden Brick.",
        view: "messages",
      });
    }

    if (!items.length && jobs.length > 0) {
      items.push({
        label: "Project update",
        title: "Review your current phase and next step",
        copy: "The dashboard and jobs view keep each property update, note, and target timing together.",
        view: "jobs",
      });
    }

    if (!items.length) {
      items.push({
        label: "Portal overview",
        title: "Everything looks organized right now",
        copy: "You can still review documents, billing, or message history anytime from the navigation.",
        view: "documents",
      });
    }

    return items.slice(0, 3);
  }

  function isClientVisibleDocument(documentData = {}) {
    return (
      documentData.clientVisible === true ||
      safeString(documentData.agreementId) !== ""
    );
  }

  function isClientVisibleInvoice(invoice = {}) {
    const override = invoice.clientVisibleOverride;
    if (override === true) {
      return true;
    }
    if (override === false) {
      return false;
    }

    const status = safeString(invoice.status).toLowerCase();
    return status === "sent" || status === "paid";
  }

  function buildClientDocumentPayload(documentData = {}) {
    return {
      id: safeString(documentData.id),
      title: safeString(documentData.title || "Document"),
      category: safeString(documentData.category || "other"),
      note: safeString(documentData.note),
      relatedDate: serialiseDateValue(
        documentData.relatedDate || documentData.createdAt,
      ),
      projectId: safeString(documentData.projectId),
      projectAddress: safeString(documentData.projectAddress),
      href: safeString(documentData.fileUrl || documentData.externalUrl),
      fileName: safeString(documentData.fileName),
      sourceType: safeString(documentData.sourceType || "manual"),
    };
  }

  function pickCurrentEstimateShare(shares = []) {
    return (
      [...shares].sort((left, right) => {
        const leftStatus = safeString(left.status);
        const rightStatus = safeString(right.status);
        const leftPriority =
          leftStatus === "active"
            ? 0
            : leftStatus === "signed"
              ? 1
              : leftStatus === "revoked"
                ? 2
                : 3;
        const rightPriority =
          rightStatus === "active"
            ? 0
            : rightStatus === "signed"
              ? 1
              : rightStatus === "revoked"
                ? 2
                : 3;
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }
        return (
          normaliseMillis(right.updatedAt || right.createdAt) -
          normaliseMillis(left.updatedAt || left.createdAt)
        );
      })[0] || null
    );
  }

  function shareDocumentTitle(share = {}) {
    if (safeString(share.type) === "change_order") {
      return safeString(
        share.title || share.changeOrderSnapshot?.title || "Change order",
      );
    }
    return safeString(share.title || share.estimateSnapshot?.subject || "Estimate");
  }

  function shareProjectAddress(share = {}) {
    return safeString(
      share.projectAddress ||
        share.changeOrderSnapshot?.projectAddress ||
        share.projectSnapshot?.projectAddress ||
        share.leadSnapshot?.projectAddress,
    );
  }

  function shareProjectType(share = {}) {
    return safeString(
      share.projectType ||
        share.changeOrderSnapshot?.projectType ||
        share.projectSnapshot?.projectType ||
        share.leadSnapshot?.projectType,
    );
  }

  function shareSubtotal(share = {}) {
    if (safeString(share.type) === "change_order") {
      return toNumber(
        share.subtotal ||
          share.changeOrderSnapshot?.amount ||
          share.changeOrderSnapshot?.subtotal,
      );
    }
    return toNumber(share.subtotal || share.estimateSnapshot?.subtotal);
  }

  function isPortalVisibleShare(share = {}) {
    const status = safeString(share.status);
    if (status === "signed") {
      return true;
    }
    if (share.portalVisible === false) {
      return false;
    }
    return status === "active";
  }

  async function verifyBearerToken(request) {
    const authHeader = request.get("authorization") || "";
    const matches = authHeader.match(/^Bearer (.+)$/i);

    if (!matches) {
      const error = new Error("Missing bearer token.");
      error.status = 401;
      throw error;
    }

    return admin.auth().verifyIdToken(matches[1]);
  }

  async function verifyClientRequest(request) {
    const decoded = await verifyBearerToken(request);
    const email = normaliseEmail(decoded.email);
    const userSnap = await clientUserRef(decoded.uid).get();

    if (!userSnap.exists) {
      const error = new Error(
        "This account does not have client portal access yet.",
      );
      error.status = 403;
      throw error;
    }

    const userData = userSnap.data() || {};
    if (safeString(userData.status || "active") !== "active") {
      const error = new Error("This client portal account is not active.");
      error.status = 403;
      throw error;
    }

    if (normaliseEmail(userData.email) !== email) {
      const error = new Error(
        "This sign-in does not match the approved portal email.",
      );
      error.status = 403;
      throw error;
    }

    const customerId = safeString(userData.customerId);
    const contactId = safeString(userData.contactId);
    if (!customerId || !contactId) {
      const error = new Error(
        "This client portal account is missing its customer link.",
      );
      error.status = 403;
      throw error;
    }

    const [contactSnap, customerSnap] = await Promise.all([
      contactRef(customerId, contactId).get(),
      customerRef(customerId).get(),
    ]);

    if (!contactSnap.exists || !customerSnap.exists) {
      const error = new Error(
        "The linked customer portal record could not be found.",
      );
      error.status = 404;
      throw error;
    }

    const contactData = contactSnap.data() || {};
    if (contactData.disabledAt) {
      const error = new Error(
        "This contact has been disabled for the client portal.",
      );
      error.status = 403;
      throw error;
    }

    if (
      safeString(contactData.authUid) &&
      safeString(contactData.authUid) !== safeString(decoded.uid)
    ) {
      const error = new Error(
        "This sign-in no longer matches the active client portal login for this contact.",
      );
      error.status = 403;
      throw error;
    }

    if (normaliseEmail(contactData.email) !== email) {
      const error = new Error(
        "This sign-in does not match the invited client contact email.",
      );
      error.status = 403;
      throw error;
    }

    await Promise.all([
      clientUserRef(decoded.uid).set(
        {
          lastLoginAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
      contactRef(customerId, contactId).set(
        {
          lastLoginAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
    ]);

    return {
      decoded,
      clientUser: {
        uid: decoded.uid,
        ...userData,
      },
      customerId,
      contactId,
      contactRef: contactRef(customerId, contactId),
      contactData,
      customerData: customerSnap.data() || {},
    };
  }

  async function ensurePortalThread(customerId, projectData = null) {
    const isProjectThread = Boolean(projectData?.id);
    const nextThreadId = isProjectThread
      ? `project-${projectData.id}`
      : "general";
    const ref = threadRef(customerId, nextThreadId);
    const snapshot = await ref.get();
    const basePayload = {
      id: nextThreadId,
      customerId,
      threadType: isProjectThread ? "project" : "general",
      projectId: isProjectThread ? safeString(projectData.id) : null,
      projectAddress: isProjectThread
        ? safeString(projectData.projectAddress)
        : "",
      projectType: isProjectThread ? safeString(projectData.projectType) : "",
      title: isProjectThread
        ? safeString(
            projectData.projectAddress ||
              projectData.clientName ||
              "Project updates",
          )
        : "General project updates",
      lastMessagePreview: snapshot.exists
        ? safeString(snapshot.data()?.lastMessagePreview)
        : "",
      lastAuthorRole: snapshot.exists
        ? safeString(snapshot.data()?.lastAuthorRole)
        : "",
      lastMessageAt: snapshot.exists
        ? snapshot.data()?.lastMessageAt || null
        : null,
      clientUnreadCount: snapshot.exists
        ? toNumber(snapshot.data()?.clientUnreadCount)
        : 0,
      staffUnreadCount: snapshot.exists
        ? toNumber(snapshot.data()?.staffUnreadCount)
        : 0,
      createdAt: snapshot.exists
        ? snapshot.data()?.createdAt || FieldValue.serverTimestamp()
        : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await ref.set(basePayload, { merge: true });
    const refreshed = await ref.get();
    return {
      id: refreshed.id,
      data: refreshed.data() || {},
    };
  }

  async function ensurePortalThreadsForCustomer(customerId, projects = []) {
    const ensuredThreads = [];
    ensuredThreads.push(await ensurePortalThread(customerId, null));

    for (const project of projects) {
      ensuredThreads.push(await ensurePortalThread(customerId, project));
    }

    return ensuredThreads;
  }

  async function loadCustomerProjects(customerId) {
    const projectsSnap = await db
      .collection("projects")
      .where("customerId", "==", customerId)
      .get();

    return projectsSnap.docs.map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
    }));
  }

  async function loadCustomerLeads(customerId) {
    const leadsSnap = await db
      .collection("leads")
      .where("customerId", "==", customerId)
      .get();

    return leadsSnap.docs.map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
    }));
  }

  async function loadProjectInvoices(projectId) {
    const invoicesSnap = await db
      .collection("projects")
      .doc(projectId)
      .collection("invoices")
      .get();

    return invoicesSnap.docs.map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
    }));
  }

  async function loadProjectPayments(projectId) {
    const paymentsSnap = await db
      .collection("projects")
      .doc(projectId)
      .collection("payments")
      .get();

    return paymentsSnap.docs.map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
    }));
  }

  async function loadCustomerBilling(customerId) {
    const projects = await loadCustomerProjects(customerId);
    const billingEntries = await Promise.all(
      projects.map(async (project) => {
        const [invoices, payments] = await Promise.all([
          loadProjectInvoices(project.id),
          loadProjectPayments(project.id),
        ]);

        return {
          project,
          invoices,
          payments,
        };
      }),
    );

    const invoices = billingEntries
      .flatMap(({ project, invoices }) => {
        return invoices.map((invoice) =>
          buildClientInvoicePayload(invoice, project),
        );
      })
      .filter((invoice) => invoice.visibleInPortal)
      .sort((left, right) => {
        return (
          normaliseMillis(right.updatedAt || right.issueDate) -
          normaliseMillis(left.updatedAt || left.issueDate)
        );
      });

    const payments = billingEntries
      .flatMap(({ project, payments }) => {
        return payments.map((payment) =>
          buildClientPaymentPayload(payment, project),
        );
      })
      .sort((left, right) => {
        return (
          normaliseMillis(right.relatedDate || right.createdAt) -
          normaliseMillis(left.relatedDate || left.createdAt)
        );
      });

    const totalDue = invoices
      .filter((invoice) => safeString(invoice.status) !== "paid")
      .reduce((sum, invoice) => sum + toNumber(invoice.subtotal), 0);
    const totalPaid = payments.reduce(
      (sum, payment) => sum + toNumber(payment.amount),
      0,
    );

    return {
      projects,
      invoices,
      payments,
      summary: {
        invoiceCount: invoices.length,
        invoicesDue: invoices.filter(
          (invoice) => safeString(invoice.status) !== "paid",
        ).length,
        totalDue,
        totalPaid,
      },
    };
  }

  async function loadCustomerJobs(customerId) {
    const billing = await loadCustomerBilling(customerId);
    const invoiceMap = new Map();
    const paymentMap = new Map();

    billing.invoices.forEach((invoice) => {
      const list = invoiceMap.get(invoice.projectId) || [];
      list.push(invoice);
      invoiceMap.set(invoice.projectId, list);
    });

    billing.payments.forEach((payment) => {
      const list = paymentMap.get(payment.projectId) || [];
      list.push(payment);
      paymentMap.set(payment.projectId, list);
    });

    return {
      jobs: billing.projects
        .map((project) => {
          return buildClientJobPayload(
            project,
            invoiceMap.get(project.id) || [],
            paymentMap.get(project.id) || [],
          );
        })
        .sort((left, right) => {
          return (
            normaliseMillis(right.latestUpdateAt) -
            normaliseMillis(left.latestUpdateAt)
          );
        }),
      billing,
    };
  }

  async function loadCustomerDocuments(customerId) {
    const [projects, documentsSnap] = await Promise.all([
      loadCustomerProjects(customerId),
      db
        .collection("recordDocuments")
        .where("customerId", "==", customerId)
        .get(),
    ]);

    const projectMap = new Map(
      projects.map((project) => [project.id, project]),
    );

    return documentsSnap.docs
      .map((snapshot) => ({
        id: snapshot.id,
        ...snapshot.data(),
      }))
      .filter(isClientVisibleDocument)
      .map((documentData) =>
        buildClientDocumentPayload({
          ...documentData,
          projectAddress:
            projectMap.get(safeString(documentData.projectId))
              ?.projectAddress || "",
        }),
      )
      .filter((documentData) => safeString(documentData.href))
      .sort((left, right) => {
        return (
          normaliseMillis(right.relatedDate) - normaliseMillis(left.relatedDate)
        );
      });
  }

  async function loadCustomerEstimates(customerId, request) {
    const sharesSnap = await db
      .collection("estimateShares")
      .where("customerId", "==", customerId)
      .get();

    return sharesSnap.docs
      .map((snapshot) => ({
        id: snapshot.id,
        ...snapshot.data(),
      }))
      .filter(isPortalVisibleShare)
      .map((share) => ({
        id: safeString(share.id),
        type: safeString(share.type || "estimate"),
        leadId: safeString(share.leadId),
        projectId: safeString(share.projectId),
        changeOrderId: safeString(share.changeOrderId),
        projectAddress: shareProjectAddress(share),
        projectType: shareProjectType(share),
        subject: shareDocumentTitle(share),
        summary: safeString(
          share.summary ||
            share.changeOrderSnapshot?.note ||
            share.estimateSnapshot?.emailBody,
        ),
        subtotal: shareSubtotal(share),
        status: safeString(share.status),
        portalStatus:
          safeString(share.status) === "signed"
            ? "approved"
            : safeString(share.status) === "active"
              ? "needs_approval"
              : safeString(share.status),
        shareUrl: buildEstimateShareUrl(request, share.id),
        agreementDownloadHref:
          safeString(share.status) === "signed"
            ? buildPublicAgreementDownloadHref(request, share.id)
            : "",
        signedAt: serialiseDateValue(share.signedAt),
        updatedAt: serialiseDateValue(share.updatedAt || share.createdAt),
        publishedAt: serialiseDateValue(share.publishedAt || share.createdAt),
      }))
      .sort((left, right) => {
      return normaliseMillis(right.updatedAt) - normaliseMillis(left.updatedAt);
    });
  }

  async function loadCustomerThreads(customerId, includeMessages = false) {
    const projects = await loadCustomerProjects(customerId);
    await ensurePortalThreadsForCustomer(customerId, projects);

    const threadsSnap = await threadsCollection(customerId).get();
    const threads = threadsSnap.docs.map((snapshot) => ({
      id: snapshot.id,
      data: snapshot.data() || {},
    }));

    if (!includeMessages) {
      return threads
        .map((thread) => serialisePortalThread(thread))
        .sort((left, right) => {
          return (
            normaliseMillis(right.lastMessageAt || right.updatedAt) -
            normaliseMillis(left.lastMessageAt || left.updatedAt)
          );
        });
    }

    const withMessages = await Promise.all(
      threads.map(async (thread) => {
        const messagesSnap = await messagesCollection(
          customerId,
          thread.id,
        ).get();
        const messages = messagesSnap.docs
          .map((snapshot) => ({
            id: snapshot.id,
            data: snapshot.data() || {},
          }))
          .sort((left, right) => {
            return (
              normaliseMillis(left.data.createdAt) -
              normaliseMillis(right.data.createdAt)
            );
          });

        return serialisePortalThread(thread, messages);
      }),
    );

    return withMessages.sort((left, right) => {
      return (
        normaliseMillis(right.lastMessageAt || right.updatedAt) -
        normaliseMillis(left.lastMessageAt || left.updatedAt)
      );
    });
  }

  async function loadCustomerPortalContacts(customerId, request) {
    const contactsSnap = await customerRef(customerId).collection("contacts").get();
    return contactsSnap.docs
      .map((snapshot) =>
        serialisePortalContact(
          {
            id: snapshot.id,
            data: snapshot.data() || {},
          },
          request,
        ),
      )
      .filter((contact) => !contact.disabledAt && !contact.revokedAt)
      .sort((left, right) => {
        return (
          normaliseMillis(right.updatedAt || right.createdAt) -
          normaliseMillis(left.updatedAt || left.createdAt)
        );
      });
  }

  async function claimPortalAccess(request, payload) {
    const decoded = await verifyBearerToken(request);
    const token = safeString(payload.token);

    if (!token) {
      const error = new Error("Invite token is required.");
      error.status = 400;
      throw error;
    }

    const [customerId, contactId] = token.split(".");
    if (!safeString(customerId) || !safeString(contactId)) {
      const error = new Error("This invite link is not valid.");
      error.status = 400;
      throw error;
    }

    const contactSnapshot = await contactRef(customerId, contactId).get();
    if (!contactSnapshot.exists) {
      const error = new Error("This invite link could not be found.");
      error.status = 404;
      throw error;
    }

    const contactData = contactSnapshot.data() || {};
    if (contactData.disabledAt) {
      const error = new Error(
        "This contact has been disabled for the client portal.",
      );
      error.status = 403;
      throw error;
    }

    if (safeString(contactData.inviteToken) !== token) {
      const error = new Error("This invite link is no longer active.");
      error.status = 410;
      throw error;
    }

    const decodedEmail = normaliseEmail(decoded.email);
    if (!decodedEmail || decodedEmail !== normaliseEmail(contactData.email)) {
      const error = new Error(
        "Sign in with the same email address that was invited to the portal.",
      );
      error.status = 403;
      throw error;
    }

    const existingUserSnap = await clientUserRef(decoded.uid).get();
    if (existingUserSnap.exists) {
      const existingData = existingUserSnap.data() || {};
      const existingCustomerId = safeString(existingData.customerId);
      if (existingCustomerId && existingCustomerId !== customerId) {
        const error = new Error(
          "This account is already linked to a different customer portal.",
        );
        error.status = 409;
        throw error;
      }
    }

    const batch = db.batch();

    if (
      safeString(contactData.authUid) &&
      safeString(contactData.authUid) !== safeString(decoded.uid)
    ) {
      batch.set(
        clientUserRef(contactData.authUid),
        {
          status: "replaced",
          replacedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    batch.set(
      clientUserRef(decoded.uid),
      {
        uid: decoded.uid,
        customerId,
        contactId,
        email: decodedEmail,
        role: normalisePortalRole(contactData.role || contactData.accessScope),
        accessScope: portalAccessScopeForRole(
          contactData.role || contactData.accessScope,
        ),
        displayName: safeString(
          decoded.name ||
            payload.displayName ||
            contactData.name ||
            decoded.email,
        ),
        status: "active",
        lastLoginAt: FieldValue.serverTimestamp(),
        createdAt: existingUserSnap.exists
          ? existingUserSnap.data()?.createdAt || FieldValue.serverTimestamp()
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    batch.set(
      contactRef(customerId, contactId),
      {
        authUid: decoded.uid,
        inviteStatus: "claimed",
        inviteToken: "",
        inviteUrl: "",
        claimedAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await batch.commit();
    await ensurePortalThread(customerId, null);

    const customerSnap = await customerRef(customerId).get();
    return {
      ok: true,
      customerId,
      contactId,
      customerName: safeString(customerSnap.data()?.name),
      loginUrl: buildClientLoginUrl(request),
    };
  }

  async function previewPortalInvite(request) {
    const token = safeString(request.query?.token || "");

    if (!token) {
      const error = new Error("Invite token is required.");
      error.status = 400;
      throw error;
    }

    const [customerId, contactId] = token.split(".");
    if (!safeString(customerId) || !safeString(contactId)) {
      const error = new Error("This invite link is not valid.");
      error.status = 400;
      throw error;
    }

    const [contactSnapshot, customerSnapshot] = await Promise.all([
      contactRef(customerId, contactId).get(),
      customerRef(customerId).get(),
    ]);

    if (!contactSnapshot.exists || !customerSnapshot.exists) {
      const error = new Error("This invite link could not be found.");
      error.status = 404;
      throw error;
    }

    const contactData = contactSnapshot.data() || {};
    if (contactData.disabledAt) {
      const error = new Error(
        "This contact has been disabled for the client portal.",
      );
      error.status = 403;
      throw error;
    }

    if (safeString(contactData.inviteToken) !== token) {
      const error = new Error("This invite link is no longer active.");
      error.status = 410;
      throw error;
    }

    return {
      ok: true,
      invite: {
        token,
        customerId,
        contactId,
        customerName: safeString(customerSnapshot.data()?.name),
        contactName: safeString(
          contactData.name || customerSnapshot.data()?.name || "Portal contact",
        ),
        email: normaliseEmail(contactData.email),
        phone: safeString(contactData.phone),
        role: normalisePortalRole(contactData.role || contactData.accessScope),
        roleLabel: portalRoleLabel(
          contactData.role || contactData.accessScope,
        ),
        accessScope: portalAccessScopeForRole(
          contactData.role || contactData.accessScope,
        ),
        loginUrl: buildClientLoginUrl(request),
      },
    };
  }

  async function mutatePortalInvite(request, payload, staff) {
    if (safeString(staff.profile?.role) !== "admin") {
      const error = new Error("Only admins can manage client portal access.");
      error.status = 403;
      throw error;
    }

    const action = safeString(payload.action || "copy").toLowerCase();
    const customerId = safeString(payload.customerId);
    const requestedContactId = safeString(payload.contactId);

    if (!customerId) {
      const error = new Error("customerId is required.");
      error.status = 400;
      throw error;
    }

    const customerSnapshot = await customerRef(customerId).get();
    if (!customerSnapshot.exists) {
      const error = new Error("Customer not found.");
      error.status = 404;
      throw error;
    }

    const customerData = customerSnapshot.data() || {};

    if (action === "create" || action === "resend" || action === "copy") {
      const ref = requestedContactId
        ? contactRef(customerId, requestedContactId)
        : customerRef(customerId).collection("contacts").doc();
      const snapshot = await ref.get();
      const existing = snapshot.exists ? snapshot.data() || {} : {};
      const email = normaliseEmail(payload.email || existing.email);
      const existingAuthUid = safeString(existing.authUid);
      const preserveClaim = Boolean(existingAuthUid) && action === "copy";

      if (!email) {
        const error = new Error("Contact email is required.");
        error.status = 400;
        throw error;
      }

      const token = createInviteToken(customerId, ref.id);
      const inviteUrl = buildClientAcceptUrl(request, token);
      const nextPayload = {
        id: ref.id,
        customerId,
        name: safeString(
          payload.name ||
            existing.name ||
            customerData.name ||
            "Portal contact",
        ),
        email,
        phone: safeString(payload.phone || existing.phone),
        role: normalisePortalRole(
          payload.role || payload.accessScope || existing.role || existing.accessScope,
        ),
        accessScope: portalAccessScopeForRole(
          payload.role || payload.accessScope || existing.role || existing.accessScope,
        ),
        authUid: preserveClaim ? existingAuthUid : "",
        inviteStatus: preserveClaim ? "claimed" : "invited",
        inviteToken: preserveClaim ? safeString(existing.inviteToken) : token,
        inviteUrl: preserveClaim
          ? safeString(existing.inviteUrl || buildClientLoginUrl(request))
          : inviteUrl,
        lastInvitedAt: preserveClaim
          ? existing.lastInvitedAt || null
          : FieldValue.serverTimestamp(),
        claimedAt: preserveClaim ? existing.claimedAt || null : null,
        lastLoginAt: preserveClaim ? existing.lastLoginAt || null : null,
        disabledAt: null,
        revokedAt: null,
        createdAt: existing.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      const batch = db.batch();

      if (existingAuthUid && !preserveClaim) {
        batch.set(
          clientUserRef(existingAuthUid),
          {
            status: "replaced",
            replacedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      batch.set(ref, nextPayload, { merge: true });
      await batch.commit();
      await ensurePortalThread(customerId, null);

      const refreshed = await ref.get();
      return {
        ok: true,
        action,
        contact: serialisePortalContact(
          {
            id: refreshed.id,
            data: refreshed.data() || {},
          },
          request,
        ),
      };
    }

    if (!requestedContactId) {
      const error = new Error("contactId is required.");
      error.status = 400;
      throw error;
    }

    const ref = contactRef(customerId, requestedContactId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      const error = new Error("Portal contact not found.");
      error.status = 404;
      throw error;
    }

    const existing = snapshot.data() || {};
    const batch = db.batch();

    if (action === "revoke") {
      batch.set(
        ref,
        {
          inviteStatus: "revoked",
          inviteToken: "",
          inviteUrl: "",
          revokedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      if (safeString(existing.authUid)) {
        batch.set(
          clientUserRef(existing.authUid),
          {
            status: "revoked",
            revokedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    } else if (action === "disable") {
      batch.set(
        ref,
        {
          inviteStatus: "disabled",
          inviteToken: "",
          inviteUrl: "",
          disabledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      if (safeString(existing.authUid)) {
        batch.set(
          clientUserRef(existing.authUid),
          {
            status: "disabled",
            disabledAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    } else if (action === "enable") {
      batch.set(
        ref,
        {
          inviteStatus: safeString(existing.authUid)
            ? "claimed"
            : "not_invited",
          disabledAt: null,
          revokedAt: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      if (safeString(existing.authUid)) {
        batch.set(
          clientUserRef(existing.authUid),
          {
            status: "active",
            disabledAt: null,
            revokedAt: null,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    } else {
      const error = new Error("Unsupported invite action.");
      error.status = 400;
      throw error;
    }

    await batch.commit();
    const refreshed = await ref.get();
    return {
      ok: true,
      action,
      contact: serialisePortalContact(
        {
          id: refreshed.id,
          data: refreshed.data() || {},
        },
        request,
      ),
    };
  }

  async function addClientThreadMessage(
    customerId,
    threadId,
    clientProfile,
    payload,
  ) {
    const ref = threadRef(customerId, threadId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      const error = new Error("Conversation not found.");
      error.status = 404;
      throw error;
    }

    const body = safeString(payload.body);
    if (!body) {
      const error = new Error("Message text is required.");
      error.status = 400;
      throw error;
    }

    const messageRef = messagesCollection(customerId, threadId).doc();
    const batch = db.batch();

    batch.set(
      messageRef,
      {
        id: messageRef.id,
        body,
        authorRole: "client",
        authorUid: safeString(clientProfile.clientUser.uid),
        authorName: safeString(
          clientProfile.contactData.name ||
            clientProfile.clientUser.displayName ||
            "Client",
        ),
        readByClientAt: FieldValue.serverTimestamp(),
        readByStaffAt: null,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    batch.set(
      ref,
      {
        lastMessageAt: FieldValue.serverTimestamp(),
        lastMessagePreview: body.slice(0, 240),
        lastAuthorRole: "client",
        clientUnreadCount: 0,
        staffUnreadCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await batch.commit();

    return {
      ok: true,
      threadId,
      messageId: messageRef.id,
    };
  }

  async function markClientThreadRead(customerId, threadId) {
    const ref = threadRef(customerId, threadId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      const error = new Error("Conversation not found.");
      error.status = 404;
      throw error;
    }

    await ref.set(
      {
        clientUnreadCount: 0,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      ok: true,
      threadId,
    };
  }

  async function buildBootstrapPayload(request, clientProfile) {
    const [jobsPayload, estimates, documents, threads, contacts] = await Promise.all([
      loadCustomerJobs(clientProfile.customerId),
      loadCustomerEstimates(clientProfile.customerId, request),
      loadCustomerDocuments(clientProfile.customerId),
      loadCustomerThreads(clientProfile.customerId, false),
      loadCustomerPortalContacts(clientProfile.customerId, request),
    ]);
    const activeJobs = jobsPayload.jobs.filter(
      (job) => safeString(job.status) !== "completed",
    );
    const primaryProject = activeJobs[0] || jobsPayload.jobs[0] || null;
    const billingSummary = buildClientBillingSnapshot(
      jobsPayload.billing.invoices,
      jobsPayload.billing.summary.totalPaid,
    );
    const unreadMessages = threads.reduce(
      (sum, thread) => sum + toNumber(thread.clientUnreadCount),
      0,
    );

    const summary = {
      estimatesToReview: estimates.filter(
        (entry) => entry.status === "active",
      ).length,
      activeJobs: activeJobs.length,
      invoicesDue: jobsPayload.billing.summary.invoicesDue,
      totalDue: jobsPayload.billing.summary.totalDue,
      paymentsReceived: jobsPayload.billing.summary.totalPaid,
      recentDocuments: documents.length,
      unreadMessages,
    };

    return {
      ok: true,
      customerDisplayName: safeString(
        clientProfile.clientUser.displayName ||
          clientProfile.contactData.name ||
          clientProfile.customerData.name,
      ),
      supportPhone: COMPANY_INFO.phone,
      activeProjectCount: activeJobs.length,
      primaryProjectId: safeString(primaryProject?.id),
      account: {
        displayName: safeString(
          clientProfile.clientUser.displayName ||
            clientProfile.contactData.name ||
            clientProfile.contactData.email,
        ),
        email: normaliseEmail(clientProfile.contactData.email),
        contactName: safeString(clientProfile.contactData.name),
        phone: safeString(clientProfile.contactData.phone),
        role: normalisePortalRole(
          clientProfile.contactData.role || clientProfile.contactData.accessScope,
        ),
        roleLabel: portalRoleLabel(
          clientProfile.contactData.role || clientProfile.contactData.accessScope,
        ),
        canSign: portalRoleCanSign(
          clientProfile.contactData.role || clientProfile.contactData.accessScope,
        ),
        canMessage: true,
        accessScope: portalAccessScopeForRole(
          clientProfile.contactData.role || clientProfile.contactData.accessScope,
        ),
        customerName: safeString(clientProfile.customerData.name),
        customerEmail: safeString(clientProfile.customerData.primaryEmail),
        customerPhone: safeString(clientProfile.customerData.primaryPhone),
        customerAddress: safeString(clientProfile.customerData.primaryAddress),
        lastLoginAt: serialiseDateValue(clientProfile.contactData.lastLoginAt),
      },
      contacts,
      help: {
        name: COMPANY_INFO.name,
        phone: COMPANY_INFO.phone,
        phoneHref: COMPANY_INFO.phoneHref,
        email: COMPANY_INFO.email,
        emailHref: COMPANY_INFO.emailHref,
      },
      summary,
      attentionItems: buildClientAttentionItems({
        estimates,
        jobs: activeJobs,
        threads,
        billingSummary,
      }),
      billingSummary,
      recentDocuments: documents.slice(0, 4),
      recentThreads: threads.slice(0, 4),
    };
  }

  function routeSegments(request) {
    const pathname = new URL(
      request.originalUrl,
      `${requestProtocol(request)}://${requestHost(request) || "localhost"}`,
    ).pathname;
    return pathname.split("/").filter(Boolean).slice(2);
  }

  return onRequest(
    {
      region: "us-central1",
      cors: true,
    },
    async (request, response) => {
      applyCors(response);

      if (request.method === "OPTIONS") {
        response.status(204).send("");
        return;
      }

      const segments = routeSegments(request);
      const [resource, resourceId, subresource] = segments;

      try {
        if (request.method === "POST" && resource === "invite") {
          const staff = await verifyStaffRequest(request);
          const payload = parseRequestPayload(request);
          const result = await mutatePortalInvite(request, payload, staff);
          respondJson(response, 200, result);
          return;
        }

        if (request.method === "POST" && resource === "estimate-share") {
          const staff = await verifyStaffRequest(request);
          const payload = parseRequestPayload(request);
          const result = await handleEstimateShareRequest({
            request,
            payload,
            staff,
          });
          respondJson(response, result.status, result.payload);
          return;
        }

        if (request.method === "POST" && resource === "claim") {
          const payload = parseRequestPayload(request);
          const result = await claimPortalAccess(request, payload);
          respondJson(response, 200, result);
          return;
        }

        if (request.method === "GET" && resource === "invite-preview") {
          const result = await previewPortalInvite(request);
          respondJson(response, 200, result);
          return;
        }

        if (
          request.method === "GET" &&
          ["public-estimate-view", "estimate-view"].includes(resource)
        ) {
          const payload = await loadPublicEstimatePayload(
            request,
            request.query?.token,
          );
          respondJson(response, 200, payload);
          return;
        }

        if (
          request.method === "POST" &&
          ["public-estimate-sign", "estimate-sign"].includes(resource)
        ) {
          const payload = parseRequestPayload(request);
          const result = await signPublicEstimatePayload(request, payload);
          respondJson(response, 200, result);
          return;
        }

        if (
          request.method === "GET" &&
          ["public-agreement-document", "agreement-document"].includes(resource)
        ) {
          const { pdfPath, fileName } = await loadPublicAgreementDocumentData(
            request.query?.token,
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
          return;
        }

        const clientProfile = await verifyClientRequest(request);

        if (request.method === "GET" && resource === "bootstrap") {
          const payload = await buildBootstrapPayload(request, clientProfile);
          respondJson(response, 200, payload);
          return;
        }

        if (request.method === "GET" && resource === "estimates") {
          const estimates = await loadCustomerEstimates(
            clientProfile.customerId,
            request,
          );
          respondJson(response, 200, {
            ok: true,
            estimates,
          });
          return;
        }

        if (request.method === "GET" && resource === "jobs") {
          const jobsPayload = await loadCustomerJobs(clientProfile.customerId);
          respondJson(response, 200, {
            ok: true,
            jobs: jobsPayload.jobs,
          });
          return;
        }

        if (request.method === "GET" && resource === "billing") {
          const billing = await loadCustomerBilling(clientProfile.customerId);
          respondJson(response, 200, {
            ok: true,
            summary: billing.summary,
            invoices: billing.invoices,
            payments: billing.payments,
          });
          return;
        }

        if (request.method === "GET" && resource === "documents") {
          const documents = await loadCustomerDocuments(
            clientProfile.customerId,
          );
          respondJson(response, 200, {
            ok: true,
            documents,
          });
          return;
        }

        if (request.method === "GET" && resource === "threads") {
          const threads = await loadCustomerThreads(
            clientProfile.customerId,
            true,
          );
          respondJson(response, 200, {
            ok: true,
            threads,
          });
          return;
        }

        if (
          request.method === "POST" &&
          resource === "threads" &&
          resourceId &&
          subresource === "messages"
        ) {
          const payload = parseRequestPayload(request);
          const result = await addClientThreadMessage(
            clientProfile.customerId,
            resourceId,
            clientProfile,
            payload,
          );
          respondJson(response, 200, result);
          return;
        }

        if (
          request.method === "POST" &&
          resource === "threads" &&
          resourceId &&
          subresource === "read"
        ) {
          const result = await markClientThreadRead(
            clientProfile.customerId,
            resourceId,
          );
          respondJson(response, 200, result);
          return;
        }

        respondJson(response, 404, {
          ok: false,
          message: "Client portal route not found.",
        });
      } catch (error) {
        logger.error("Client portal request failed.", error);
        respondJson(response, error.status || 500, {
          ok: false,
          message:
            error.message || "Could not complete the client portal request.",
        });
      }
    },
  );
}

module.exports = {
  buildClientPortalApi,
};
