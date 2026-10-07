const THEME = {
  gold: [197, 160, 89],
  goldDeep: [113, 83, 34],
  ink: [24, 20, 15],
  body: [74, 68, 60],
  muted: [115, 106, 94],
  line: [224, 216, 202],
  lineStrong: [198, 181, 150],
  paper: [255, 255, 255],
  warm: [249, 247, 243],
  warmStrong: [243, 238, 229],
  dark: [25, 22, 17],
  white: [255, 252, 247],
};

const PAGE = {
  left: 50,
  right: 50,
  top: 62,
  bottom: 58,
};

function safeString(value) {
  return String(value || "").trim();
}

function formatCurrency(value) {
  const number = Number(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
}

function setFont(
  doc,
  {
    family = "helvetica",
    style = "normal",
    size = 10,
    color = THEME.body,
  } = {},
) {
  doc.setFont(family, style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

function wrappedLines(
  doc,
  value,
  width,
  {
    family = "helvetica",
    style = "normal",
    size = 10,
    preserveLineBreaks = true,
  } = {},
) {
  const text = safeString(value);
  if (!text) return [];

  setFont(doc, { family, style, size });
  if (!preserveLineBreaks) {
    return doc.splitTextToSize(text.replace(/\s+/g, " "), width);
  }

  return text.split(/\r?\n/).reduce((lines, paragraph) => {
    const cleanParagraph = paragraph.trim();
    if (!cleanParagraph) {
      if (lines.length && lines.at(-1) !== "") {
        lines.push("");
      }
      return lines;
    }

    lines.push(...doc.splitTextToSize(cleanParagraph, width));
    return lines;
  }, []);
}

function drawLines(
  doc,
  lines,
  x,
  top,
  {
    family = "helvetica",
    style = "normal",
    size = 10,
    color = THEME.body,
    lineHeight = 14,
    align = "left",
  } = {},
) {
  if (!lines.length) return 0;

  setFont(doc, { family, style, size, color });
  doc.text(lines, x, top + size, {
    align,
    lineHeightFactor: lineHeight / size,
  });
  return lines.length * lineHeight;
}

function pageWidth(doc) {
  return doc.internal.pageSize.getWidth();
}

function pageHeight(doc) {
  return doc.internal.pageSize.getHeight();
}

function contentBottom(doc) {
  return pageHeight(doc) - PAGE.bottom;
}

function drawTopBar(doc) {
  doc.setFillColor(...THEME.gold);
  doc.rect(0, 0, pageWidth(doc), 8, "F");
}

function drawBrickMark(doc, x, y, scale = 0.31) {
  const bricks = [
    [44, 1, 32, 14],
    [24, 22, 32, 14],
    [64, 22, 32, 14],
    [4, 43, 32, 14],
    [44, 43, 32, 14],
    [84, 43, 32, 14],
  ];

  doc.setFillColor(...THEME.gold);
  bricks.forEach(([brickX, brickY, width, height]) => {
    doc.roundedRect(
      x + brickX * scale,
      y + brickY * scale,
      width * scale,
      height * scale,
      0.8,
      0.8,
      "F",
    );
  });
}

function drawLogo(doc, x, y) {
  drawBrickMark(doc, x, y + 2);
  const wordmarkX = x + 44;

  setFont(doc, {
    family: "times",
    style: "bold",
    size: 17,
    color: THEME.gold,
  });
  doc.text("GOLDEN BRICK", wordmarkX, y + 17);

  setFont(doc, {
    family: "helvetica",
    style: "bold",
    size: 6.8,
    color: THEME.ink,
  });
  doc.text("CONSTRUCTION", wordmarkX + 34, y + 29);

  doc.setDrawColor(...THEME.gold);
  doc.setLineWidth(0.9);
  doc.line(wordmarkX, y + 26, wordmarkX + 25, y + 26);
  doc.line(wordmarkX + 114, y + 26, wordmarkX + 139, y + 26);
}

function createCursor(doc) {
  return {
    left: PAGE.left,
    right: pageWidth(doc) - PAGE.right,
    width: pageWidth(doc) - PAGE.left - PAGE.right,
    y: PAGE.top,
    pageLabel: "Estimate",
  };
}

function startContinuationPage(doc, cursor, label = "Estimate continued") {
  doc.addPage();
  drawTopBar(doc);

  setFont(doc, {
    family: "helvetica",
    style: "bold",
    size: 7.5,
    color: THEME.ink,
  });
  doc.text("GOLDEN BRICK CONSTRUCTION", cursor.left, 32);

  setFont(doc, {
    family: "helvetica",
    style: "bold",
    size: 7.5,
    color: THEME.goldDeep,
  });
  doc.text(String(label || "Estimate").toUpperCase(), cursor.right, 32, {
    align: "right",
  });

  doc.setDrawColor(...THEME.line);
  doc.setLineWidth(0.7);
  doc.line(cursor.left, 43, cursor.right, 43);
  cursor.y = PAGE.top;
  cursor.pageLabel = label;
}

function ensureSpace(doc, cursor, requiredHeight, label = cursor.pageLabel) {
  if (cursor.y + requiredHeight <= contentBottom(doc)) {
    return false;
  }
  startContinuationPage(doc, cursor, label);
  return true;
}

function drawFooter(doc, company) {
  const count = doc.internal.getNumberOfPages();
  const width = pageWidth(doc);
  const height = pageHeight(doc);
  const left = PAGE.left;
  const right = width - PAGE.right;
  const y = height - 31;

  for (let pageNumber = 1; pageNumber <= count; pageNumber += 1) {
    doc.setPage(pageNumber);

    if (pageNumber > 1) {
      drawTopBar(doc);
      setFont(doc, {
        family: "helvetica",
        style: "bold",
        size: 7.5,
        color: THEME.ink,
      });
      doc.text(
        safeString(company.name).toUpperCase() ||
          "GOLDEN BRICK CONSTRUCTION",
        left,
        32,
      );
    }

    doc.setDrawColor(...THEME.line);
    doc.setLineWidth(0.7);
    doc.line(left, y - 14, right, y - 14);

    setFont(doc, {
      family: "helvetica",
      style: "bold",
      size: 8,
      color: THEME.ink,
    });
    doc.text(safeString(company.name) || "Golden Brick Construction", left, y);

    setFont(doc, {
      family: "helvetica",
      style: "normal",
      size: 8,
      color: THEME.muted,
    });
    doc.text(`Estimate | ${pageNumber} of ${count}`, right, y, {
      align: "right",
    });
  }
}

function displayTitle(value) {
  return (
    safeString(value)
      .replace(/^golden brick estimate for\s+/i, "")
      .replace(/^estimate for\s+/i, "")
      .trim() || "Project estimate"
  );
}

function drawCoverFacts(doc, cursor, items) {
  const gap = 20;
  const columnWidth = (cursor.width - gap * (items.length - 1)) / items.length;
  const measured = items.map((item) => {
    const lines = wrappedLines(doc, item.value, columnWidth, {
      style: "bold",
      size: 10.5,
    });
    return { ...item, lines };
  });
  const height = Math.max(
    57,
    ...measured.map((item) => 28 + item.lines.length * 14),
  );

  doc.setDrawColor(...THEME.lineStrong);
  doc.setLineWidth(0.8);
  doc.line(cursor.left, cursor.y, cursor.right, cursor.y);

  measured.forEach((item, index) => {
    const x = cursor.left + index * (columnWidth + gap);
    setFont(doc, {
      family: "helvetica",
      style: "bold",
      size: 7.5,
      color: THEME.goldDeep,
    });
    doc.text(String(item.label || "").toUpperCase(), x, cursor.y + 18);
    drawLines(doc, item.lines, x, cursor.y + 27, {
      style: "bold",
      size: 10.5,
      lineHeight: 14,
      color: THEME.ink,
    });

    if (index > 0) {
      const dividerX = x - gap / 2;
      doc.setDrawColor(...THEME.line);
      doc.line(dividerX, cursor.y + 14, dividerX, cursor.y + height - 12);
    }
  });

  doc.setDrawColor(...THEME.line);
  doc.line(cursor.left, cursor.y + height, cursor.right, cursor.y + height);
  cursor.y += height;
}

function drawSectionHeading(
  doc,
  cursor,
  {
    kicker = "",
    title,
    description = "",
    keepWith = 0,
    label = title,
  },
) {
  const titleLines = wrappedLines(doc, title, cursor.width, {
    family: "times",
    style: "bold",
    size: 19,
  });
  const descriptionLines = wrappedLines(doc, description, cursor.width, {
    size: 9.5,
  });
  const height =
    (kicker ? 15 : 0) +
    titleLines.length * 23 +
    (descriptionLines.length ? 5 + descriptionLines.length * 13 : 0) +
    18;

  ensureSpace(doc, cursor, height + keepWith, label);

  if (kicker) {
    setFont(doc, {
      family: "helvetica",
      style: "bold",
      size: 7.5,
      color: THEME.goldDeep,
    });
    doc.text(String(kicker).toUpperCase(), cursor.left, cursor.y);
    cursor.y += 15;
  }

  cursor.y += drawLines(doc, titleLines, cursor.left, cursor.y, {
    family: "times",
    style: "bold",
    size: 19,
    lineHeight: 23,
    color: THEME.ink,
  });

  if (descriptionLines.length) {
    cursor.y += 5;
    cursor.y += drawLines(doc, descriptionLines, cursor.left, cursor.y, {
      size: 9.5,
      lineHeight: 13,
      color: THEME.muted,
    });
  }

  cursor.y += 18;
}

function drawFlowingText(
  doc,
  cursor,
  value,
  {
    width = cursor.width,
    x = cursor.left,
    family = "helvetica",
    style = "normal",
    size = 10,
    lineHeight = 14,
    color = THEME.body,
    gapAfter = 12,
    label = cursor.pageLabel,
  } = {},
) {
  const lines = wrappedLines(doc, value, width, {
    family,
    style,
    size,
  });
  if (!lines.length) {
    cursor.y += gapAfter;
    return;
  }

  let remaining = [...lines];
  while (remaining.length) {
    const available = Math.floor(
      (contentBottom(doc) - cursor.y - (remaining.length <= 1 ? gapAfter : 0)) /
        lineHeight,
    );
    if (available < 1) {
      startContinuationPage(doc, cursor, label);
      continue;
    }

    const chunk = remaining.splice(0, available);
    cursor.y += drawLines(doc, chunk, x, cursor.y, {
      family,
      style,
      size,
      lineHeight,
      color,
    });

    if (remaining.length) {
      startContinuationPage(doc, cursor, label);
    }
  }

  cursor.y += gapAfter;
}

function drawCover(doc, cursor, data) {
  drawTopBar(doc);
  drawLogo(doc, cursor.left, 42);

  const contactX = cursor.right;
  setFont(doc, {
    family: "helvetica",
    style: "bold",
    size: 8,
    color: THEME.ink,
  });
  doc.text(safeString(data.company.email), contactX, 54, { align: "right" });
  setFont(doc, {
    family: "helvetica",
    style: "normal",
    size: 8,
    color: THEME.muted,
  });
  doc.text(safeString(data.company.phone), contactX, 68, { align: "right" });
  doc.text(
    `PA HIC ${safeString(data.company.paRegistrationNumber)}`,
    contactX,
    82,
    { align: "right" },
  );

  cursor.y = 126;
  setFont(doc, {
    family: "helvetica",
    style: "bold",
    size: 8,
    color: THEME.goldDeep,
  });
  doc.text("PROJECT ESTIMATE", cursor.left, cursor.y);
  cursor.y += 16;

  const headingLines = wrappedLines(doc, "Project estimate", cursor.width, {
    family: "times",
    style: "bold",
    size: 31,
  });
  cursor.y += drawLines(doc, headingLines, cursor.left, cursor.y, {
    family: "times",
    style: "bold",
    size: 31,
    lineHeight: 34,
    color: THEME.ink,
  });

  const titleLines = wrappedLines(doc, displayTitle(data.title), 360, {
    family: "helvetica",
    style: "bold",
    size: 14,
  });
  cursor.y += 8;
  cursor.y += drawLines(doc, titleLines, cursor.left, cursor.y, {
    family: "helvetica",
    style: "bold",
    size: 14,
    lineHeight: 18,
    color: THEME.body,
  });
  cursor.y += 22;

  const totalHeight = 76;
  doc.setFillColor(...THEME.dark);
  doc.roundedRect(
    cursor.left,
    cursor.y,
    cursor.width,
    totalHeight,
    7,
    7,
    "F",
  );
  setFont(doc, {
    family: "helvetica",
    style: "bold",
    size: 8,
    color: THEME.gold,
  });
  doc.text("ESTIMATED PROJECT TOTAL", cursor.left + 18, cursor.y + 27);
  setFont(doc, {
    family: "times",
    style: "bold",
    size: 27,
    color: THEME.white,
  });
  doc.text(
    formatCurrency(data.subtotal),
    cursor.right - 18,
    cursor.y + 49,
    { align: "right" },
  );
  cursor.y += totalHeight + 24;

  drawCoverFacts(doc, cursor, [
    { label: "Prepared for", value: data.preparedFor },
    { label: "Prepared", value: data.preparedDate },
    { label: "Project", value: data.projectAddress },
  ]);

  cursor.y += 16;
  setFont(doc, {
    family: "helvetica",
    style: "bold",
    size: 7.5,
    color: THEME.goldDeep,
  });
  doc.text("PROJECT TYPE", cursor.left, cursor.y);
  setFont(doc, {
    family: "helvetica",
    style: "bold",
    size: 10.5,
    color: THEME.ink,
  });
  doc.text(
    safeString(data.projectType) || "General scope",
    cursor.left + 91,
    cursor.y,
  );
  cursor.y += 31;

  drawSectionHeading(doc, cursor, {
    kicker: "01",
    title: "Project brief",
    description: "The current scope and pricing direction for this property.",
    keepWith: 34,
    label: "Project brief",
  });

  const overview = Array.isArray(data.overviewBlocks)
    ? data.overviewBlocks
    : [];
  if (!overview.length) {
    drawFlowingText(doc, cursor, "Project details will be confirmed during review.", {
      size: 10,
      lineHeight: 14,
      gapAfter: 0,
      label: "Project brief",
    });
  } else {
    overview.forEach((paragraph, index) => {
      drawFlowingText(doc, cursor, paragraph, {
        size: 10,
        lineHeight: 14,
        gapAfter: index === overview.length - 1 ? 0 : 9,
        label: "Project brief",
      });
    });
  }
}

function drawScopeColumns(doc, cursor, continued = false) {
  doc.setDrawColor(...THEME.lineStrong);
  doc.setLineWidth(0.8);
  doc.line(cursor.left, cursor.y, cursor.right, cursor.y);
  cursor.y += 16;

  setFont(doc, {
    family: "helvetica",
    style: "bold",
    size: 8,
    color: THEME.goldDeep,
  });
  doc.text(continued ? "SCOPE CONTINUED" : "SCOPE", cursor.left, cursor.y);
  doc.text("INVESTMENT", cursor.right, cursor.y, { align: "right" });
  cursor.y += 11;
  doc.setDrawColor(...THEME.line);
  doc.line(cursor.left, cursor.y, cursor.right, cursor.y);
  cursor.y += 10;
}

function drawScopeItem(doc, cursor, item, itemIndex) {
  const numberWidth = 28;
  const amountWidth = 102;
  const columnGap = 12;
  const textX = cursor.left + numberWidth + columnGap;
  const textWidth =
    cursor.width - numberWidth - amountWidth - columnGap * 2;
  const amountX = cursor.right - 12;
  const titleLineHeight = 14;
  const bodyLineHeight = 13;
  const titleLines = wrappedLines(
    doc,
    safeString(item.label) || "Scope item",
    textWidth,
    { style: "bold", size: 10.5 },
  );
  const descriptionLines = wrappedLines(
    doc,
    safeString(item.description) || "Scope to be confirmed.",
    textWidth,
    { size: 9.5 },
  );
  let remaining = [...descriptionLines];
  let firstSegment = true;

  while (firstSegment || remaining.length) {
    const segmentTitleLines = firstSegment
      ? titleLines
      : wrappedLines(
          doc,
          `${safeString(item.label) || "Scope item"} - continued`,
          textWidth,
          { style: "bold", size: 10.5 },
        );
    const headingHeight = 18 + segmentTitleLines.length * titleLineHeight + 5;
    const minimumHeight = headingHeight + bodyLineHeight + 16;

    if (cursor.y + minimumHeight > contentBottom(doc)) {
      startContinuationPage(doc, cursor, "Scope continued");
      drawScopeColumns(doc, cursor, true);
    }

    const availableBodyLines = Math.max(
      1,
      Math.floor(
        (contentBottom(doc) - cursor.y - headingHeight - 16) / bodyLineHeight,
      ),
    );
    const chunk = remaining.splice(0, availableBodyLines);
    const segmentHeight =
      headingHeight + Math.max(chunk.length, 1) * bodyLineHeight + 16;

    doc.setFillColor(
      ...(itemIndex % 2 === 0 ? THEME.warm : THEME.paper),
    );
    doc.rect(cursor.left, cursor.y, cursor.width, segmentHeight, "F");

    setFont(doc, {
      family: "times",
      style: "bold",
      size: 12,
      color: THEME.gold,
    });
    doc.text(
      String(itemIndex + 1).padStart(2, "0"),
      cursor.left + 10,
      cursor.y + 21,
    );

    drawLines(doc, segmentTitleLines, textX, cursor.y + 9, {
      style: "bold",
      size: 10.5,
      lineHeight: titleLineHeight,
      color: THEME.ink,
    });

    if (firstSegment) {
      setFont(doc, {
        family: "helvetica",
        style: "bold",
        size: 11.5,
        color: THEME.ink,
      });
      doc.text(
        formatCurrency(item.amount),
        amountX,
        cursor.y + 21,
        { align: "right" },
      );
    }

    if (chunk.length) {
      drawLines(
        doc,
        chunk,
        textX,
        cursor.y + 12 + segmentTitleLines.length * titleLineHeight + 4,
        {
          size: 9.5,
          lineHeight: bodyLineHeight,
          color: THEME.body,
        },
      );
    }

    cursor.y += segmentHeight;
    doc.setDrawColor(...THEME.line);
    doc.line(cursor.left, cursor.y, cursor.right, cursor.y);
    cursor.y += 8;
    firstSegment = false;

    if (remaining.length) {
      startContinuationPage(doc, cursor, "Scope continued");
      drawScopeColumns(doc, cursor, true);
    }
  }
}

function drawTotalBand(doc, cursor, subtotal) {
  ensureSpace(doc, cursor, 72, "Scope and pricing");
  const height = 58;
  doc.setFillColor(...THEME.dark);
  doc.roundedRect(cursor.left, cursor.y, cursor.width, height, 6, 6, "F");

  setFont(doc, {
    family: "helvetica",
    style: "bold",
    size: 8,
    color: THEME.gold,
  });
  doc.text("ESTIMATED PROJECT TOTAL", cursor.left + 16, cursor.y + 24);

  setFont(doc, {
    family: "times",
    style: "bold",
    size: 23,
    color: THEME.white,
  });
  doc.text(formatCurrency(subtotal), cursor.right - 16, cursor.y + 38, {
    align: "right",
  });
  cursor.y += height + 26;
}

function drawFactGrid(doc, cursor, items, label) {
  const gap = 0;
  const columnWidth = (cursor.width - gap * (items.length - 1)) / items.length;
  const prepared = items.map((item) => ({
    ...item,
    lines: wrappedLines(doc, item.value, columnWidth - 28, {
      style: "bold",
      size: 10.2,
    }),
  }));
  const height = Math.max(
    64,
    ...prepared.map((item) => 31 + item.lines.length * 14),
  );

  ensureSpace(doc, cursor, height, label);
  doc.setFillColor(...THEME.warmStrong);
  doc.rect(cursor.left, cursor.y, cursor.width, height, "F");

  prepared.forEach((item, index) => {
    const x = cursor.left + index * columnWidth;
    if (index > 0) {
      doc.setDrawColor(...THEME.lineStrong);
      doc.line(x, cursor.y + 12, x, cursor.y + height - 12);
    }

    setFont(doc, {
      family: "helvetica",
      style: "bold",
      size: 7.2,
      color: THEME.goldDeep,
    });
    doc.text(String(item.label || "").toUpperCase(), x + 14, cursor.y + 18);
    drawLines(doc, item.lines, x + 14, cursor.y + 28, {
      style: "bold",
      size: 10.2,
      lineHeight: 14,
      color: THEME.ink,
    });
  });

  cursor.y += height + 18;
}

function drawLabeledDetail(doc, cursor, item, label) {
  const labelWidth = 130;
  const gap = 18;
  const valueX = cursor.left + labelWidth + gap;
  const valueWidth = cursor.width - labelWidth - gap;
  const valueLines = wrappedLines(doc, item.value, valueWidth, {
    size: 9.5,
  });
  const height = Math.max(46, 22 + valueLines.length * 13);

  ensureSpace(doc, cursor, height, label);
  doc.setDrawColor(...THEME.line);
  doc.line(cursor.left, cursor.y, cursor.right, cursor.y);

  setFont(doc, {
    family: "helvetica",
    style: "bold",
    size: 7.5,
    color: THEME.goldDeep,
  });
  doc.text(String(item.label || "").toUpperCase(), cursor.left, cursor.y + 19);

  drawLines(doc, valueLines, valueX, cursor.y + 8, {
    size: 9.5,
    lineHeight: 13,
    color: THEME.body,
  });
  cursor.y += height;
}

function drawNumberedTerm(doc, cursor, term, index) {
  const numberWidth = 34;
  const gap = 12;
  const textX = cursor.left + numberWidth + gap;
  const textWidth = cursor.width - numberWidth - gap;
  const lineHeight = 13;
  let remaining = wrappedLines(doc, term, textWidth, {
    size: 9.3,
  });
  let firstSegment = true;

  while (remaining.length) {
    if (cursor.y + 42 > contentBottom(doc)) {
      startContinuationPage(doc, cursor, "Standard terms continued");
    }

    const availableLines = Math.max(
      1,
      Math.floor((contentBottom(doc) - cursor.y - 20) / lineHeight),
    );
    const chunk = remaining.splice(0, availableLines);
    const height = Math.max(43, 20 + chunk.length * lineHeight);

    doc.setDrawColor(...THEME.line);
    doc.line(cursor.left, cursor.y, cursor.right, cursor.y);

    setFont(doc, {
      family: "times",
      style: "bold",
      size: 11.5,
      color: THEME.gold,
    });
    doc.text(
      firstSegment
        ? String(index + 1).padStart(2, "0")
        : `${String(index + 1).padStart(2, "0")}C`,
      cursor.left,
      cursor.y + 21,
    );
    drawLines(doc, chunk, textX, cursor.y + 8, {
      size: 9.3,
      lineHeight,
      color: THEME.body,
    });
    cursor.y += height;
    firstSegment = false;

    if (remaining.length) {
      startContinuationPage(doc, cursor, "Standard terms continued");
    }
  }
}

function drawNextStep(doc, cursor, nextStep) {
  const copyLines = wrappedLines(doc, nextStep, cursor.width - 142, {
    style: "bold",
    size: 10.2,
  });
  const height = Math.max(78, 35 + copyLines.length * 14);
  ensureSpace(doc, cursor, height, "Next step");

  doc.setFillColor(...THEME.dark);
  doc.roundedRect(cursor.left, cursor.y, cursor.width, height, 7, 7, "F");

  setFont(doc, {
    family: "helvetica",
    style: "bold",
    size: 8,
    color: THEME.gold,
  });
  doc.text("NEXT STEP", cursor.left + 18, cursor.y + 25);

  drawLines(doc, copyLines, cursor.left + 126, cursor.y + 14, {
    style: "bold",
    size: 10.2,
    lineHeight: 14,
    color: THEME.white,
  });
  cursor.y += height;
}

export function buildPolishedEstimatePdf(doc, data = {}) {
  const company = data.company || {};
  const cursor = createCursor(doc);
  const lineItems =
    Array.isArray(data.lineItems) && data.lineItems.length
      ? data.lineItems
      : [
          {
            label: "Scope pending",
            description: "Scope and pricing will be confirmed during review.",
            amount: 0,
          },
        ];
  const standardTerms = Array.isArray(data.standardTerms)
    ? data.standardTerms.filter(Boolean)
    : [];
  const projectAssumptions = Array.isArray(data.projectAssumptions)
    ? data.projectAssumptions.filter(Boolean)
    : [];

  doc.setProperties({
    title: safeString(data.title) || "Golden Brick project estimate",
    subject: `${safeString(company.name) || "Golden Brick Construction"} estimate`,
    author: safeString(company.name) || "Golden Brick Construction",
    creator: safeString(company.name) || "Golden Brick Construction",
  });

  drawCover(doc, cursor, {
    ...data,
    company,
  });

  startContinuationPage(doc, cursor, "Scope and pricing");
  drawSectionHeading(doc, cursor, {
    kicker: "02",
    title: "Scope and pricing",
    description:
      "A clear breakdown of the work discussed and the current estimated investment.",
    keepWith: 70,
    label: "Scope and pricing",
  });
  drawScopeColumns(doc, cursor, false);
  lineItems.forEach((item, index) => {
    drawScopeItem(doc, cursor, item, index);
  });
  drawTotalBand(doc, cursor, data.subtotal);

  drawSectionHeading(doc, cursor, {
    kicker: "03",
    title: "Agreement details",
    description:
      "Planning information and contractor disclosures tied to this estimate.",
    keepWith: 64,
    label: "Agreement details",
  });
  drawFactGrid(
    doc,
    cursor,
    Array.isArray(data.agreementFacts) ? data.agreementFacts : [],
    "Agreement details",
  );

  const agreementNotes = Array.isArray(data.agreementNotes)
    ? data.agreementNotes
    : [];
  agreementNotes.forEach((item) => {
    drawLabeledDetail(doc, cursor, item, "Agreement details");
  });
  cursor.y += 18;

  drawSectionHeading(doc, cursor, {
    kicker: "04",
    title: "Standard terms",
    description:
      "The baseline conditions that support pricing, scheduling, and project coordination.",
    keepWith: 45,
    label: "Standard terms",
  });
  standardTerms.forEach((term, index) => {
    drawNumberedTerm(doc, cursor, term, index);
  });
  cursor.y += 22;

  const notesCopy = projectAssumptions.length
    ? projectAssumptions.join("\n")
    : "No project-specific notes or exclusions are listed.";
  const firstNotesLines = wrappedLines(doc, notesCopy, cursor.width, {
    size: 9.8,
  }).slice(0, 3);
  drawSectionHeading(doc, cursor, {
    kicker: "05",
    title: "Project notes and exclusions",
    description:
      "Project-specific assumptions, selections, or exclusions recorded with this estimate.",
    keepWith: Math.max(38, firstNotesLines.length * 14),
    label: "Project notes",
  });
  if (projectAssumptions.length) {
    projectAssumptions.forEach((item, index) => {
      drawFlowingText(doc, cursor, `${String(index + 1).padStart(2, "0")}  ${item}`, {
        size: 9.8,
        lineHeight: 14,
        gapAfter: 9,
        label: "Project notes",
      });
    });
  } else {
    drawFlowingText(doc, cursor, notesCopy, {
      size: 9.8,
      lineHeight: 14,
      gapAfter: 22,
      label: "Project notes",
    });
  }

  drawNextStep(
    doc,
    cursor,
    safeString(data.nextStep) ||
      "Review the scope and let Golden Brick know what should be revised before approval.",
  );

  drawFooter(doc, company);
}
