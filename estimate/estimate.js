const state = {
  token: "",
  payload: null,
  loading: true,
  submitting: false,
  signatureDirty: false,
  activePointerId: null,
};

const refs = {
  pageTitle: document.getElementById("page-title"),
  pageSubtitle: document.getElementById("page-subtitle"),
  statusBanner: document.getElementById("status-banner"),
  unavailableCard: document.getElementById("unavailable-card"),
  unavailableCopy: document.getElementById("unavailable-copy"),
  estimateContent: document.getElementById("estimate-content"),
  decisionSummary: document.getElementById("decision-summary"),
  projectSummary: document.getElementById("project-summary"),
  estimateOverview: document.getElementById("estimate-overview"),
  lineItemList: document.getElementById("line-item-list"),
  estimateTotal: document.getElementById("estimate-total"),
  proposalTerms: document.getElementById("proposal-terms"),
  estimateAssumptions: document.getElementById("estimate-assumptions"),
  agreementTitle: document.getElementById("agreement-title"),
  agreementIntro: document.getElementById("agreement-intro"),
  agreementTerms: document.getElementById("agreement-terms"),
  signPanel: document.getElementById("sign-panel"),
  signatureForm: document.getElementById("signature-form"),
  agreementAccept: document.getElementById("agreement-accept"),
  signerName: document.getElementById("signer-name"),
  clearSignatureButton: document.getElementById("clear-signature-button"),
  signatureCanvas: document.getElementById("signature-canvas"),
  signSubmitButton: document.getElementById("sign-submit-button"),
  signedCard: document.getElementById("signed-card"),
  signedMeta: document.getElementById("signed-meta"),
  agreementDownloadLink: document.getElementById("agreement-download-link"),
  reviewSignLink: document.getElementById("review-sign-link"),
};

const canvasContext = refs.signatureCanvas.getContext("2d");

function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value) {
  return safeString(value)
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

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function splitParagraphs(value) {
  return safeString(value)
    .split(/\n{2,}|\r\n\r\n/)
    .map((entry) => safeString(entry))
    .filter(Boolean);
}

function stripHtml(value) {
  return safeString(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function friendlyRequestMessage(text, status = 0) {
  const plain = stripHtml(text);
  const lower = plain.toLowerCase();

  if (!plain) {
    return status === 404
      ? "This estimate link is no longer available."
      : "Could not load this estimate right now. Please contact Golden Brick Construction for a fresh secure link.";
  }

  if (
    lower.includes("forbidden") ||
    lower.includes("does not have permission")
  ) {
    return "This secure estimate link is not available right now. Please contact Golden Brick Construction for a fresh private link.";
  }

  if (lower.includes("not found") || lower.includes("no longer available")) {
    return "This estimate link is no longer available.";
  }

  if (lower.includes("revoked")) {
    return "This estimate link has been revoked. Please contact Golden Brick Construction for a new copy.";
  }

  return plain;
}

function setStatus(message) {
  refs.statusBanner.textContent = message;
}

function setUnavailable(message) {
  state.loading = false;
  refs.estimateContent.hidden = true;
  refs.unavailableCard.hidden = false;
  refs.signPanel.hidden = true;
  refs.signedCard.hidden = true;
  refs.reviewSignLink.hidden = true;
  refs.agreementDownloadLink.hidden = true;
  refs.agreementDownloadLink.href = "#";
  refs.signedMeta.textContent = "";
  refs.unavailableCopy.textContent =
    message ||
    "The link may have expired, been replaced, or been revoked. Please contact Golden Brick Construction for a fresh copy.";
  setStatus("This approval link is not available right now.");
  refs.pageTitle.textContent = "Approval unavailable";
  refs.pageSubtitle.textContent =
    "Please contact Golden Brick Construction for a fresh secure link.";
  document.title = "Approval unavailable | Golden Brick";
}

function tokenFromPath() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (
    segments[0] === "estimate" &&
    segments[1] &&
    segments[1] !== "index.html"
  ) {
    return decodeURIComponent(segments[1]);
  }
  return safeString(new URLSearchParams(window.location.search).get("token"));
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    cache: options.cache || "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = safeString(
    response.headers.get("content-type"),
  ).toLowerCase();
  let payload = null;

  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    const text = await response.text();
    payload = {
      ok: response.ok,
      message: friendlyRequestMessage(text, response.status),
    };
  }

  if (!response.ok) {
    const error = new Error(payload?.message || "Request failed.");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function createSummaryItem(label, value) {
  const item = document.createElement("div");
  item.className = "summary-item";

  const itemLabel = document.createElement("span");
  itemLabel.textContent = label;

  const itemValue = document.createElement("strong");
  itemValue.textContent = value || "Not provided";

  item.append(itemLabel, itemValue);
  return item;
}

function documentLabel(payload, fallback = "Estimate") {
  return safeString(payload?.documentLabel) || fallback;
}

function documentLabelLower(payload, fallback = "estimate") {
  return documentLabel(payload, fallback).toLowerCase();
}

function submitButtonLabel(payload = state.payload) {
  return safeString(payload?.documentType) === "change_order"
    ? "Approve and sign"
    : "Accept and sign";
}

function submitPendingLabel(payload = state.payload) {
  return safeString(payload?.documentType) === "change_order"
    ? "Saving approved change order..."
    : "Saving signed agreement...";
}

function renderSummary(payload) {
  const lead = payload.lead || {};
  const estimate = payload.estimate || {};
  const totalLabel =
    safeString(payload?.documentType) === "change_order"
      ? "Change amount"
      : "Estimate total";
  refs.projectSummary.replaceChildren(
    createSummaryItem("Client", safeString(lead.clientName) || "Client"),
    createSummaryItem(
      "Project address",
      safeString(lead.projectAddress) || "Address to be confirmed",
    ),
    createSummaryItem(
      "Project type",
      safeString(lead.projectType) || "Project details to be confirmed",
    ),
    createSummaryItem(totalLabel, formatCurrency(estimate.subtotal)),
    createSummaryItem("Email", safeString(lead.clientEmail) || "Not provided"),
    createSummaryItem("Phone", safeString(lead.clientPhone) || "Not provided"),
  );
}

function estimateStatusLabel(payload) {
  return payload?.readOnly
    ? `${documentLabel(payload)} signed and archived`
    : `${documentLabel(payload)} ready for review`;
}

function renderDecisionSummary(payload) {
  const support = payload?.support || {};

  refs.decisionSummary.replaceChildren(
    createSummaryItem("Current status", estimateStatusLabel(payload)),
    createSummaryItem(
      "Estimate total",
      formatCurrency(payload?.estimate?.subtotal),
    ),
    createSummaryItem(
      "Property",
      safeString(payload?.lead?.projectAddress) || "To be confirmed",
    ),
    createSummaryItem(
      "Project type",
      safeString(payload?.lead?.projectType) || "Renovation scope",
    ),
    createSummaryItem("Support", safeString(support.phone) || "(267) 715-5557"),
    createSummaryItem(
      "License",
      safeString(support.licenseNumber)
        ? `PA License #${safeString(support.licenseNumber)}`
        : "Licensed and insured",
    ),
  );
}

function renderOverview(payload) {
  const estimate = payload.estimate || {};
  const blocks = [];

  if (safeString(estimate.subject)) {
    blocks.push(estimate.subject);
  }
  blocks.push(...splitParagraphs(estimate.emailBody));

  const paragraphs = blocks.length
    ? blocks
    : [
        `Golden Brick Construction prepared this ${documentLabelLower(payload)} for your review.`,
        "Please review the scope, terms, and agreement details below before signing.",
      ];

  refs.estimateOverview.innerHTML = paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

function renderLineItems(payload) {
  const lineItems = Array.isArray(payload?.estimate?.lineItems)
    ? payload.estimate.lineItems
    : [];

  if (!lineItems.length) {
    const emptyCard = document.createElement("article");
    emptyCard.className = "line-item-card";
    emptyCard.innerHTML = `
            <div class="line-item-head">
                <h3 class="line-item-title">Scope pending</h3>
                <span class="line-item-amount">${escapeHtml(formatCurrency(0))}</span>
            </div>
            <p class="line-item-copy">Golden Brick Construction will provide the detailed scope directly.</p>
        `;
    refs.lineItemList.replaceChildren(emptyCard);
    refs.estimateTotal.textContent = formatCurrency(0);
    return;
  }

  const fragment = document.createDocumentFragment();
  lineItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = "line-item-card";

    const head = document.createElement("div");
    head.className = "line-item-head";

    const title = document.createElement("h3");
    title.className = "line-item-title";
    title.textContent = safeString(item.label) || "Line item";

    const amount = document.createElement("span");
    amount.className = "line-item-amount";
    amount.textContent = formatCurrency(item.amount);

    head.append(title, amount);
    card.append(head);

    const description = safeString(item.description);
    if (description) {
      const copy = document.createElement("p");
      copy.className = "line-item-copy";
      copy.textContent = description;
      card.append(copy);
    }

    fragment.append(card);
  });

  refs.lineItemList.replaceChildren(fragment);
  refs.estimateTotal.textContent = formatCurrency(payload?.estimate?.subtotal);
}

function renderList(target, values, emptyCopy) {
  const items = Array.isArray(values)
    ? values.map((entry) => safeString(entry)).filter(Boolean)
    : [];

  if (!items.length) {
    const fallback = document.createElement("li");
    fallback.textContent = emptyCopy;
    target.replaceChildren(fallback);
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    fragment.append(item);
  });
  target.replaceChildren(fragment);
}

function renderAgreement(payload) {
  const agreement = payload.agreement || {};
  refs.agreementTitle.textContent = safeString(agreement.title) || "Agreement";
  refs.agreementIntro.textContent =
    safeString(agreement.intro) || "Review the agreement terms below.";
  renderList(
    refs.agreementTerms,
    agreement.terms,
    "Agreement terms will be finalized with your Golden Brick Construction team.",
  );
}

function renderSignatureState(signature) {
  const signerName = safeString(signature?.signerName) || "Client";
  const signedAt = formatDateTime(signature?.signedAt);
  const lines = [
    `Signed by ${signerName}.`,
    signedAt ? `Signed on ${signedAt}.` : "",
  ].filter(Boolean);

  refs.signedMeta.textContent = lines.join(" ");
  refs.agreementDownloadLink.href = safeString(signature?.downloadHref) || "#";
  refs.agreementDownloadLink.textContent =
    safeString(state.payload?.documentType) === "change_order"
      ? "Download signed change order PDF"
      : "Download signed agreement PDF";
  refs.agreementDownloadLink.hidden = !safeString(signature?.downloadHref);
}

function resetSigningUi() {
  refs.signatureForm.reset();
  refs.signedMeta.textContent = "";
  refs.agreementDownloadLink.hidden = true;
  refs.agreementDownloadLink.href = "#";
  refs.reviewSignLink.hidden = false;
  refs.signPanel.hidden = false;
  refs.signedCard.hidden = true;
  refs.agreementAccept.disabled = false;
  refs.signerName.readOnly = false;
  refs.signerName.disabled = false;
  refs.clearSignatureButton.disabled = false;
  refs.signatureCanvas.style.pointerEvents = "auto";
  refs.signatureCanvas.setAttribute("aria-disabled", "false");
  refs.signSubmitButton.disabled = false;
  resetCanvas();
}

function applyReadOnlyMode(payload) {
  const readOnly = payload?.readOnly === true;
  refs.signPanel.hidden = readOnly;
  refs.signedCard.hidden = !readOnly;
  refs.reviewSignLink.hidden = readOnly;

  if (readOnly) {
    refs.agreementAccept.disabled = true;
    refs.signerName.readOnly = true;
    refs.signerName.disabled = true;
    refs.clearSignatureButton.disabled = true;
    refs.signatureCanvas.style.pointerEvents = "none";
    refs.signatureCanvas.setAttribute("aria-disabled", "true");
    refs.signSubmitButton.disabled = true;
    renderSignatureState(payload.signature);
    setStatus(`This ${documentLabelLower(payload)} has already been accepted and archived.`);
  } else {
    refs.agreementAccept.disabled = false;
    refs.signerName.readOnly = false;
    refs.signerName.disabled = false;
    refs.clearSignatureButton.disabled = false;
    refs.signatureCanvas.style.pointerEvents = "auto";
    refs.signatureCanvas.setAttribute("aria-disabled", "false");
    refs.signSubmitButton.disabled = false;
    refs.signedCard.hidden = true;
    refs.signedMeta.textContent = "";
    refs.agreementDownloadLink.hidden = true;
    refs.agreementDownloadLink.href = "#";
    setStatus(
      `Review the ${documentLabelLower(payload)} details below and sign when you are ready.`,
    );
  }
}

function renderPayload(payload) {
  state.payload = payload;
  state.loading = false;

  refs.unavailableCard.hidden = true;
  refs.estimateContent.hidden = false;
  resetSigningUi();

  const subject =
    safeString(payload?.estimate?.subject) ||
    `Project ${documentLabelLower(payload)}`;
  const clientName = safeString(payload?.lead?.clientName) || "Client";
  const address =
    safeString(payload?.lead?.projectAddress) || "Project details";

  refs.pageTitle.textContent = subject;
  refs.pageSubtitle.textContent = `${clientName} • ${address}`;
  document.title = `${subject} | Golden Brick`;
  refs.reviewSignLink.textContent = `Review ${documentLabelLower(payload)} and sign`;
  refs.signSubmitButton.textContent = submitButtonLabel(payload);

  renderSummary(payload);
  renderDecisionSummary(payload);
  renderOverview(payload);
  renderLineItems(payload);
  renderList(
    refs.proposalTerms,
    payload?.estimate?.terms,
    "Standard proposal terms will be confirmed directly with Golden Brick Construction.",
  );
  renderList(
    refs.estimateAssumptions,
    payload?.estimate?.assumptions,
    "No additional project assumptions were captured for this estimate.",
  );
  renderAgreement(payload);
  applyReadOnlyMode(payload);
}

function resetCanvas() {
  const { width, height } = refs.signatureCanvas;
  canvasContext.clearRect(0, 0, width, height);
  canvasContext.fillStyle = "#ffffff";
  canvasContext.fillRect(0, 0, width, height);
  canvasContext.strokeStyle = "#6f5430";
  canvasContext.lineWidth = 2.4;
  canvasContext.lineCap = "round";
  canvasContext.lineJoin = "round";
  state.signatureDirty = false;
}

function resizeSignatureCanvas() {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const existingDataUrl = state.signatureDirty
    ? refs.signatureCanvas.toDataURL("image/png")
    : "";
  const bounds = refs.signatureCanvas.getBoundingClientRect();
  const nextWidth = Math.max(Math.round(bounds.width * ratio), 1);
  const nextHeight = Math.max(Math.round(bounds.height * ratio), 1);

  if (
    refs.signatureCanvas.width === nextWidth &&
    refs.signatureCanvas.height === nextHeight
  ) {
    return;
  }

  refs.signatureCanvas.width = nextWidth;
  refs.signatureCanvas.height = nextHeight;
  resetCanvas();

  if (!existingDataUrl) {
    return;
  }

  const image = new Image();
  image.onload = () => {
    canvasContext.drawImage(
      image,
      0,
      0,
      refs.signatureCanvas.width,
      refs.signatureCanvas.height,
    );
    state.signatureDirty = true;
  };
  image.src = existingDataUrl;
}

function canvasPointFromEvent(event) {
  const bounds = refs.signatureCanvas.getBoundingClientRect();
  const scaleX = refs.signatureCanvas.width / Math.max(bounds.width, 1);
  const scaleY = refs.signatureCanvas.height / Math.max(bounds.height, 1);
  return {
    x: (event.clientX - bounds.left) * scaleX,
    y: (event.clientY - bounds.top) * scaleY,
  };
}

function startDrawing(event) {
  if (state.payload?.readOnly) return;

  state.activePointerId = event.pointerId;
  refs.signatureCanvas.setPointerCapture(event.pointerId);
  const point = canvasPointFromEvent(event);
  canvasContext.beginPath();
  canvasContext.moveTo(point.x, point.y);
  state.signatureDirty = true;
}

function continueDrawing(event) {
  if (state.payload?.readOnly) return;
  if (state.activePointerId !== event.pointerId) return;

  const point = canvasPointFromEvent(event);
  canvasContext.lineTo(point.x, point.y);
  canvasContext.stroke();
}

function stopDrawing(event) {
  if (state.activePointerId !== event.pointerId) return;
  try {
    refs.signatureCanvas.releasePointerCapture(event.pointerId);
  } catch (error) {
    // Ignore release failures when the browser has already ended capture.
  }
  state.activePointerId = null;
  canvasContext.closePath();
}

async function loadEstimate() {
  state.loading = true;
  refs.unavailableCard.hidden = true;
  refs.estimateContent.hidden = true;
  refs.signPanel.hidden = true;
  refs.signedCard.hidden = true;
  refs.reviewSignLink.hidden = true;
  setStatus("Loading your estimate...");

  const payload = await requestJson(
    `/api/client/public-estimate-view?token=${encodeURIComponent(state.token)}`,
  );
  renderPayload(payload);
}

async function submitSignature(event) {
  event.preventDefault();

  if (state.submitting || state.payload?.readOnly) {
    return;
  }

  if (!refs.agreementAccept.checked) {
    setStatus(
      "Please confirm that you agree to the estimate and agreement terms.",
    );
    refs.agreementAccept.focus();
    return;
  }

  if (!safeString(refs.signerName.value)) {
    setStatus("Please enter your full legal name before signing.");
    refs.signerName.focus();
    return;
  }

  if (!state.signatureDirty) {
    setStatus("Please draw your signature before submitting.");
    return;
  }

  state.submitting = true;
  refs.signSubmitButton.disabled = true;
  refs.signSubmitButton.textContent = submitPendingLabel(state.payload);
  setStatus(`Saving your signed ${documentLabelLower(state.payload)}...`);

  try {
    await requestJson("/api/client/public-estimate-sign", {
      method: "POST",
      body: JSON.stringify({
        token: state.token,
        signerName: safeString(refs.signerName.value),
        accepted: refs.agreementAccept.checked,
        signatureDataUrl: refs.signatureCanvas.toDataURL("image/png"),
      }),
    });

    await loadEstimate();
    setStatus("Your agreement has been signed and archived.");
  } catch (error) {
    if (error.status === 410) {
      setUnavailable(
        error.payload?.message || "This estimate link has been revoked.",
      );
      return;
    }

    if (error.payload?.status === "signed") {
      await loadEstimate();
      return;
    }

    setStatus(error.message || "Could not sign the agreement right now.");
  } finally {
    state.submitting = false;
    refs.signSubmitButton.disabled = false;
    refs.signSubmitButton.textContent = submitButtonLabel(state.payload);
  }
}

function clearSignature() {
  if (state.payload?.readOnly) {
    return;
  }
  resetCanvas();
  setStatus("Signature cleared. Draw your signature again when you are ready.");
}

function bindEvents() {
  refs.signatureForm.addEventListener("submit", (event) => {
    submitSignature(event).catch((error) => {
      console.error("Estimate sign submission failed.", error);
      setStatus(error.message || "Could not sign the agreement right now.");
    });
  });

  refs.clearSignatureButton.addEventListener("click", () => {
    clearSignature();
  });

  refs.signatureCanvas.style.touchAction = "none";
  refs.signatureCanvas.addEventListener("pointerdown", startDrawing);
  refs.signatureCanvas.addEventListener("pointermove", continueDrawing);
  refs.signatureCanvas.addEventListener("pointerup", stopDrawing);
  refs.signatureCanvas.addEventListener("pointerleave", stopDrawing);
  refs.signatureCanvas.addEventListener("pointercancel", stopDrawing);

  window.addEventListener("resize", () => {
    resizeSignatureCanvas();
  });
}

async function boot() {
  bindEvents();
  resizeSignatureCanvas();

  state.token = tokenFromPath();
  if (!state.token) {
    setUnavailable(
      "This estimate link is incomplete. Please use the full link from Golden Brick Construction.",
    );
    return;
  }

  try {
    await loadEstimate();
  } catch (error) {
    console.error("Estimate view failed.", error);

    if (error.status === 410 || error.payload?.status === "revoked") {
      setUnavailable(
        error.payload?.message || "This estimate link has been revoked.",
      );
      return;
    }

    if (error.status === 404) {
      setUnavailable(
        error.payload?.message || "This estimate link is no longer available.",
      );
      return;
    }

    setUnavailable(
      error.message ||
        "Could not load this estimate right now. Please contact Golden Brick Construction.",
    );
  }
}

boot().catch((error) => {
  console.error("Estimate page boot failed.", error);
  setUnavailable(
    "Could not load this estimate right now. Please contact Golden Brick Construction.",
  );
});
