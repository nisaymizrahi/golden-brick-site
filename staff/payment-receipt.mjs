const RECEIPT_THEME = Object.freeze({
  brand: [197, 160, 89],
  brandDeep: [126, 92, 40],
  ink: [23, 18, 13],
  muted: [92, 82, 69],
  soft: [126, 115, 100],
  panel: [250, 247, 241],
  panelStrong: [244, 238, 228],
  line: [229, 220, 205],
  dark: [28, 24, 19],
  white: [255, 250, 240],
  success: [47, 107, 69],
  successSoft: [225, 239, 230],
});

function safeText(value, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeNumber(value));
}

function normaliseDate(value) {
  if (value && typeof value.toDate === "function") {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(normaliseDate(value));
}

function dateStamp(value) {
  const date = normaliseDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function receiptSuffix(paymentId) {
  const cleaned = safeText(paymentId, "PAYMENT")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  return (cleaned.slice(-6) || "PAYMENT").padStart(6, "0");
}

export function buildPaymentReceiptNumber(paymentId, receivedAt = new Date()) {
  return `GB-R-${dateStamp(receivedAt)}-${receiptSuffix(paymentId)}`;
}

function safeFilenamePart(value, fallback = "receipt") {
  return (
    safeText(value, fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

export function paymentReceiptFilename(data = {}) {
  const receipt = data.receipt || {};
  const client = data.client || {};
  const project = data.project || {};
  const stem = [
    safeFilenamePart(receipt.number, "golden-brick-receipt"),
    safeFilenamePart(client.name, "client"),
    safeFilenamePart(project.address || project.type, "project"),
  ]
    .filter(Boolean)
    .join("-");
  return `${stem}.pdf`;
}

function clampLines(doc, text, maxWidth, maxLines = 2) {
  const lines = doc.splitTextToSize(safeText(text, "Not provided"), maxWidth);
  if (lines.length <= maxLines) {
    return lines;
  }
  const clipped = lines.slice(0, maxLines);
  const lastLine = safeText(clipped[maxLines - 1]).replace(/[. ]+$/g, "");
  clipped[maxLines - 1] = `${lastLine}...`;
  return clipped;
}

function drawBrickMark(doc, x, y, scale = 0.34) {
  const bricks = [
    [44, 1, 32, 14],
    [24, 22, 32, 14],
    [64, 22, 32, 14],
    [4, 43, 32, 14],
    [44, 43, 32, 14],
    [84, 43, 32, 14],
  ];
  doc.setFillColor(...RECEIPT_THEME.brand);
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

function drawLabel(doc, label, x, y, color = RECEIPT_THEME.soft) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...color);
  doc.text(safeText(label).toUpperCase(), x, y);
}

function drawInfoCard(doc, { x, y, width, height, label, value }) {
  doc.setFillColor(...RECEIPT_THEME.panel);
  doc.setDrawColor(...RECEIPT_THEME.line);
  doc.setLineWidth(0.7);
  doc.roundedRect(x, y, width, height, 7, 7, "FD");
  drawLabel(doc, label, x + 13, y + 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...RECEIPT_THEME.ink);
  doc.text(clampLines(doc, value, width - 26, 2), x + 13, y + 39);
}

function drawSummaryCell(doc, { x, y, width, label, value, emphasize = false }) {
  if (emphasize) {
    doc.setFillColor(...RECEIPT_THEME.panelStrong);
    doc.roundedRect(x, y, width, 66, 7, 7, "F");
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.6);
  doc.setTextColor(...RECEIPT_THEME.brandDeep);
  const labelLines = doc
    .splitTextToSize(safeText(label).toUpperCase(), width - 24)
    .slice(0, 2);
  doc.text(labelLines, x + 12, y + 17, { lineHeightFactor: 1.05 });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...RECEIPT_THEME.ink);
  doc.text(
    clampLines(doc, value, width - 24, 2),
    x + 12,
    y + (labelLines.length > 1 ? 49 : 43),
  );
}

function drawFooter(doc, company, receiptNumber) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 48;
  const right = pageWidth - 48;
  const y = pageHeight - 36;
  doc.setDrawColor(...RECEIPT_THEME.line);
  doc.setLineWidth(0.7);
  doc.line(left, y - 16, right, y - 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...RECEIPT_THEME.ink);
  doc.text(safeText(company.name, "Golden Brick Construction"), left, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...RECEIPT_THEME.soft);
  doc.text(safeText(receiptNumber, "Payment receipt"), right, y, {
    align: "right",
  });
}

export function buildPaymentReceiptPdf(doc, data = {}) {
  const company = data.company || {};
  const receipt = data.receipt || {};
  const client = data.client || {};
  const project = data.project || {};
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 48;
  const width = pageWidth - 96;
  const gap = 12;
  const half = (width - gap) / 2;

  doc.setProperties({
    title: `Payment Receipt ${safeText(receipt.number)}`.trim(),
    subject: `${safeText(company.name, "Golden Brick Construction")} payment receipt`,
    author: safeText(company.name, "Golden Brick Construction"),
    creator: safeText(company.name, "Golden Brick Construction"),
  });

  doc.setFillColor(...RECEIPT_THEME.brand);
  doc.rect(0, 0, pageWidth, 8, "F");

  const heroY = 32;
  const heroHeight = 132;
  doc.setFillColor(...RECEIPT_THEME.dark);
  doc.roundedRect(left, heroY, width, heroHeight, 10, 10, "F");
  drawBrickMark(doc, left + 18, heroY + 18);

  doc.setFont("times", "bold");
  doc.setFontSize(15.5);
  doc.setTextColor(...RECEIPT_THEME.brand);
  doc.text("GOLDEN BRICK", left + 65, heroY + 34);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(...RECEIPT_THEME.white);
  doc.text("CONSTRUCTION", left + 98, heroY + 47);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...RECEIPT_THEME.brand);
  doc.text("PAYMENT RECEIPT", left + 20, heroY + 78);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.setTextColor(...RECEIPT_THEME.white);
  doc.text(safeText(receipt.number, "Receipt pending"), left + 20, heroY + 103);

  const badgeWidth = 56;
  doc.setFillColor(...RECEIPT_THEME.success);
  doc.roundedRect(left + width - badgeWidth - 20, heroY + 18, badgeWidth, 24, 12, 12, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...RECEIPT_THEME.white);
  doc.text("PAID", left + width - badgeWidth / 2 - 20, heroY + 34, {
    align: "center",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...RECEIPT_THEME.brand);
  doc.text("AMOUNT RECEIVED", left + width - 20, heroY + 78, { align: "right" });
  doc.setFont("times", "bold");
  doc.setFontSize(27);
  doc.setTextColor(...RECEIPT_THEME.white);
  doc.text(formatCurrency(receipt.amount), left + width - 20, heroY + 108, {
    align: "right",
  });

  let y = 184;
  drawInfoCard(doc, {
    x: left,
    y,
    width: half,
    height: 72,
    label: "Received from",
    value: safeText(client.name, "Client"),
  });
  drawInfoCard(doc, {
    x: left + half + gap,
    y,
    width: half,
    height: 72,
    label: "Project address",
    value: safeText(project.address, "To be confirmed"),
  });

  y += 88;
  const detailWidth = (width - gap * 2) / 3;
  [
    ["Receipt date", formatDate(receipt.date)],
    ["Payment type", safeText(receipt.type, "Payment")],
    ["Payment method", safeText(receipt.method, "Not provided")],
    ["Reference", safeText(receipt.reference, "Not provided")],
    ["Project", safeText(project.label || project.type, "Construction project")],
    ["Project type", safeText(project.type, "Construction project")],
  ].forEach(([label, value], index) => {
    const row = Math.floor(index / 3);
    const column = index % 3;
    drawInfoCard(doc, {
      x: left + column * (detailWidth + gap),
      y: y + row * 72,
      width: detailWidth,
      height: 60,
      label,
      value,
    });
  });

  y += 158;
  drawLabel(doc, "Payment note", left, y, RECEIPT_THEME.brandDeep);
  y += 10;
  const note = safeText(
    receipt.note,
    "Payment received and applied to the Golden Brick project shown above.",
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const noteLines = clampLines(doc, note, width - 28, 4);
  const noteHeight = Math.max(62, 28 + noteLines.length * 14);
  doc.setFillColor(...RECEIPT_THEME.panel);
  doc.setDrawColor(...RECEIPT_THEME.line);
  doc.roundedRect(left, y, width, noteHeight, 7, 7, "FD");
  doc.setTextColor(...RECEIPT_THEME.muted);
  doc.text(noteLines, left + 14, y + 23);

  y += noteHeight + 24;
  drawLabel(doc, "Project payment summary", left, y, RECEIPT_THEME.brandDeep);
  y += 10;
  doc.setFillColor(...RECEIPT_THEME.panel);
  doc.setDrawColor(...RECEIPT_THEME.line);
  doc.roundedRect(left, y, width, 66, 8, 8, "FD");
  const summaryGap = 6;
  const summaryWidth = (width - summaryGap * 3) / 4;
  [
    ["Project total", formatCurrency(project.contractValue)],
    ["Previously received", formatCurrency(project.previouslyReceived)],
    ["Total received", formatCurrency(project.totalReceived)],
    [
      "Remaining balance for project",
      formatCurrency(project.balanceRemaining),
      true,
    ],
  ].forEach(([label, value, emphasize], index) => {
    drawSummaryCell(doc, {
      x: left + index * (summaryWidth + summaryGap),
      y,
      width: summaryWidth,
      label,
      value,
      emphasize,
    });
  });

  y += 88;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...RECEIPT_THEME.muted);
  const thanks = `Thank you for your payment. Keep this receipt for your project and accounting records. Questions can be directed to ${safeText(company.email, "info@goldenbrickc.com")} or ${safeText(company.phone, "(267) 715-5557")}.`;
  doc.text(clampLines(doc, thanks, width, 3), left, y);

  drawFooter(doc, company, receipt.number);
  return doc;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildPaymentReceiptHtml(data = {}) {
  const company = data.company || {};
  const receipt = data.receipt || {};
  const client = data.client || {};
  const project = data.project || {};
  const details = [
    ["Receipt date", formatDate(receipt.date)],
    ["Payment type", safeText(receipt.type, "Payment")],
    ["Payment method", safeText(receipt.method, "Not provided")],
    ["Reference", safeText(receipt.reference, "Not provided")],
    ["Project", safeText(project.label || project.type, "Construction project")],
    ["Project type", safeText(project.type, "Construction project")],
  ];
  const summary = [
    ["Project total", formatCurrency(project.contractValue)],
    ["Previously received", formatCurrency(project.previouslyReceived)],
    ["Total received", formatCurrency(project.totalReceived)],
    [
      "Remaining balance for project",
      formatCurrency(project.balanceRemaining),
    ],
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Payment Receipt ${escapeHtml(receipt.number)}</title>
  <style>
    :root { --gold:#c5a059; --gold-deep:#7e5c28; --ink:#17120d; --copy:#5c5245; --line:#e5dccd; --paper:#fffdf9; --panel:#faf7f1; --dark:#1c1813; --green:#2f6b45; }
    * { box-sizing:border-box; }
    body { margin:0; padding:28px; background:#f4eee5; color:var(--ink); font-family:Manrope,Arial,sans-serif; }
    .receipt { max-width:900px; margin:0 auto; padding:34px; background:var(--paper); border-top:7px solid var(--gold); box-shadow:0 24px 60px rgba(28,24,19,.12); }
    .hero { display:grid; grid-template-columns:1fr auto; gap:24px; padding:28px; border-radius:16px; background:var(--dark); color:#fffaf0; }
    .brand,.label { color:var(--gold); font-size:12px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; }
    h1 { margin:12px 0 0; font-family:Georgia,serif; font-size:clamp(26px,5vw,42px); }
    .amount { text-align:right; }
    .paid { display:inline-flex; padding:7px 14px; border-radius:999px; background:var(--green); font-size:12px; font-weight:800; letter-spacing:.14em; }
    .amount strong { display:block; margin-top:24px; color:#fff; font-family:Georgia,serif; font-size:36px; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; margin-top:18px; }
    .grid.details { grid-template-columns:repeat(3,minmax(0,1fr)); }
    .card,.note,.summary { padding:18px; border:1px solid var(--line); border-radius:14px; background:var(--panel); overflow-wrap:anywhere; }
    .card strong { display:block; margin-top:8px; line-height:1.35; }
    .note { margin-top:18px; color:var(--copy); line-height:1.7; }
    .summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; margin-top:18px; }
    .summary strong { display:block; margin-top:8px; font-size:18px; }
    footer { display:flex; justify-content:space-between; gap:20px; margin-top:26px; padding-top:18px; border-top:1px solid var(--line); color:var(--copy); font-size:14px; }
    @media (max-width:720px) { body{padding:0}.receipt{padding:18px}.hero,.grid,.grid.details,.summary{grid-template-columns:1fr}.amount{text-align:left}.amount strong{margin-top:14px}footer{display:grid} }
    @media print { body{padding:0;background:#fff}.receipt{max-width:none;box-shadow:none} }
  </style>
</head>
<body>
  <main class="receipt">
    <header class="hero">
      <div><div class="brand">${escapeHtml(safeText(company.name, "Golden Brick Construction"))}</div><h1>Payment Receipt<br>${escapeHtml(safeText(receipt.number, "Receipt pending"))}</h1></div>
      <div class="amount"><span class="paid">PAID</span><strong>${escapeHtml(formatCurrency(receipt.amount))}</strong></div>
    </header>
    <section class="grid">
      <div class="card"><span class="label">Received from</span><strong>${escapeHtml(safeText(client.name, "Client"))}</strong></div>
      <div class="card"><span class="label">Project address</span><strong>${escapeHtml(safeText(project.address, "To be confirmed"))}</strong></div>
    </section>
    <section class="grid details">${details.map(([label,value])=>`<div class="card"><span class="label">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</section>
    <section class="note"><span class="label">Payment note</span><p>${escapeHtml(safeText(receipt.note, "Payment received and applied to the Golden Brick project shown above."))}</p></section>
    <section class="summary">${summary.map(([label,value])=>`<div><span class="label">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</section>
    <footer><div><strong>${escapeHtml(safeText(company.name, "Golden Brick Construction"))}</strong><br>${escapeHtml(safeText(company.email))} | ${escapeHtml(safeText(company.phone))}</div><div>Receipt issued for client records.</div></footer>
  </main>
</body>
</html>`;
}
