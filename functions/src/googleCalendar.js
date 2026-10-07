"use strict";

const crypto = require("node:crypto");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

const GOOGLE_CALENDAR_CLIENT_ID = defineSecret("GOOGLE_CALENDAR_CLIENT_ID");
const GOOGLE_CALENDAR_CLIENT_SECRET = defineSecret(
  "GOOGLE_CALENDAR_CLIENT_SECRET",
);
const GOOGLE_CALENDAR_TOKEN_KEY = defineSecret("GOOGLE_CALENDAR_TOKEN_KEY");
const GOOGLE_CALENDAR_REDIRECT_URI = defineString(
  "GOOGLE_CALENDAR_REDIRECT_URI",
  {
    default:
      "https://golden-brick-construction.web.app/api/staff/google-calendar/callback",
  },
);

const REGION = "us-central1";
const DEFAULT_TIME_ZONE = "America/New_York";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const STAFF_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitiseEmailKey(email) {
  return safeString(email).toLowerCase().replaceAll("/", "_");
}

function applyCors(response) {
  Object.entries(STAFF_HEADERS).forEach(([key, value]) => {
    response.set(key, value);
  });
}

function respondJson(response, status, payload) {
  response.status(status).json(payload);
}

function errorStatus(error, fallback = 500) {
  return Number(error?.status) || fallback;
}

function httpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function timestampDate(value) {
  if (!value) return null;
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function bearerToken(request) {
  const authorization = safeString(request.get("Authorization"));
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}

async function verifyStaffRequest(request) {
  const token = bearerToken(request);
  if (!token) {
    throw httpError("Sign in to connect Google Calendar.", 401);
  }

  const decoded = await admin.auth().verifyIdToken(token);
  const userSnap = await db.collection("users").doc(decoded.uid).get();
  if (userSnap.exists && userSnap.data().active === true) {
    return {
      uid: decoded.uid,
      email: safeString(decoded.email).toLowerCase(),
      profile: userSnap.data(),
    };
  }

  const email = safeString(decoded.email).toLowerCase();
  const allowedSnap = email
    ? await db.collection("allowedStaff").doc(sanitiseEmailKey(email)).get()
    : null;
  if (!allowedSnap?.exists || allowedSnap.data().active !== true) {
    throw httpError("This staff account is not active.", 403);
  }

  return { uid: decoded.uid, email, profile: allowedSnap.data() };
}

function tokenEncryptionKey() {
  const secret = safeString(GOOGLE_CALENDAR_TOKEN_KEY.value());
  if (!secret) {
    throw httpError("Google Calendar token encryption is not configured.", 503);
  }
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptToken(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", tokenEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);
  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: ciphertext.toString("base64"),
  };
}

function decryptToken(payload = {}) {
  if (
    payload.algorithm !== "aes-256-gcm" ||
    !payload.iv ||
    !payload.tag ||
    !payload.data
  ) {
    throw httpError("Stored Google Calendar authorization is invalid.", 503);
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    tokenEncryptionKey(),
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

async function exchangeAuthorizationCode(code) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CALENDAR_CLIENT_ID.value(),
      client_secret: GOOGLE_CALENDAR_CLIENT_SECRET.value(),
      redirect_uri: GOOGLE_CALENDAR_REDIRECT_URI.value(),
      grant_type: "authorization_code",
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw httpError(
      safeString(payload.error_description) ||
        "Google Calendar authorization could not be completed.",
      400,
    );
  }
  return payload;
}

async function refreshAccessToken(connection) {
  const refreshToken = decryptToken(connection.refreshToken);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CALENDAR_CLIENT_ID.value(),
      client_secret: GOOGLE_CALENDAR_CLIENT_SECRET.value(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    const error = httpError(
      safeString(payload.error_description) ||
        "Google Calendar needs to be reconnected.",
      401,
    );
    error.code = safeString(payload.error);
    throw error;
  }
  return payload.access_token;
}

async function loadConnection(uid) {
  if (!uid) return null;
  const snapshot = await db.collection("googleCalendarConnections").doc(uid).get();
  if (!snapshot.exists || snapshot.data().status !== "connected") {
    return null;
  }
  return { id: snapshot.id, ...snapshot.data() };
}

async function calendarApiRequest(
  connection,
  path,
  { method = "GET", body = null, allowMissing = false } = {},
) {
  const accessToken = await refreshAccessToken(connection);
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (allowMissing && (response.status === 404 || response.status === 410)) {
    return null;
  }

  const payload = response.status === 204
    ? null
    : await response.json().catch(() => ({}));
  if (!response.ok) {
    throw httpError(
      safeString(payload?.error?.message) || "Google Calendar could not be updated.",
      response.status,
    );
  }
  return payload;
}

function calendarPath(connection, eventId = "") {
  const calendarId = encodeURIComponent(connection.calendarId || "primary");
  const eventSuffix = eventId ? `/${encodeURIComponent(eventId)}` : "";
  return `/calendars/${calendarId}/events${eventSuffix}`;
}

async function deleteGoogleEvent(connection, eventId) {
  if (!connection || !eventId) return;
  await calendarApiRequest(connection, calendarPath(connection, eventId), {
    method: "DELETE",
    allowMissing: true,
  });
}

function fingerprint(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function dateTimeShape(date, timeZone = DEFAULT_TIME_ZONE) {
  return {
    dateTime: date.toISOString(),
    timeZone: timeZone || DEFAULT_TIME_ZONE,
  };
}

function dateOnlyInTimeZone(date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function addDays(date, dayCount) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + dayCount);
  return next;
}

async function projectContext(projectId) {
  if (!projectId) return null;
  const snapshot = await db.collection("projects").doc(projectId).get();
  return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
}

async function taskGoogleEvent(taskId, task, connection) {
  const dueAt = timestampDate(task.dueAt);
  if (!dueAt) return null;
  const endAt = new Date(dueAt.getTime() + 30 * 60 * 1000);
  const project = await projectContext(safeString(task.projectId));
  const linkedLines = [
    safeString(task.description),
    project?.projectAddress ? `Project: ${project.projectAddress}` : "",
    safeString(task.leadId) ? `Lead ID: ${safeString(task.leadId)}` : "",
    safeString(task.customerId)
      ? `Customer ID: ${safeString(task.customerId)}`
      : "",
    `CRM task: ${taskId}`,
  ].filter(Boolean);

  return {
    summary: safeString(task.title) || "Golden Brick follow-up",
    description: linkedLines.join("\n\n"),
    location: safeString(project?.projectAddress),
    start: dateTimeShape(dueAt, connection.timeZone),
    end: dateTimeShape(endAt, connection.timeZone),
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 30 }],
    },
    extendedProperties: {
      private: { crmRecordType: "task", crmRecordId: taskId },
    },
  };
}

async function calendarGoogleEvent(eventId, event, connection) {
  const startAt = timestampDate(event.startAt || event.eventDate);
  if (!startAt) return null;
  const project = await projectContext(safeString(event.projectId));
  const timeZone = connection.timeZone || DEFAULT_TIME_ZONE;
  const endAt = timestampDate(event.endAt) || new Date(startAt.getTime() + 60 * 60 * 1000);
  const allDay = event.allDay === true;
  const allDayStartDate = dateOnlyInTimeZone(startAt, timeZone);
  const candidateAllDayEndDate = dateOnlyInTimeZone(endAt, timeZone);
  const allDayEndDate = candidateAllDayEndDate > allDayStartDate
    ? candidateAllDayEndDate
    : dateOnlyInTimeZone(addDays(startAt, 1), timeZone);

  return {
    summary: safeString(event.title || event.clientTitle) || "Golden Brick event",
    description: [
      safeString(event.internalNote || event.clientNote),
      project?.projectAddress ? `Project: ${project.projectAddress}` : "",
      `CRM calendar event: ${eventId}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    location: safeString(project?.projectAddress),
    start: allDay
      ? { date: allDayStartDate }
      : dateTimeShape(startAt, timeZone),
    end: allDay
      ? { date: allDayEndDate }
      : dateTimeShape(endAt, timeZone),
    reminders: { useDefault: true },
    extendedProperties: {
      private: { crmRecordType: "calendarEvent", crmRecordId: eventId },
    },
  };
}

async function markConnectionError(uid, error) {
  if (!uid) return;
  await db
    .collection("googleCalendarConnections")
    .doc(uid)
    .set(
      {
        status: errorStatus(error) === 401 ? "needs_reconnect" : "connected",
        lastError: safeString(error?.message) || "Calendar sync failed.",
        lastErrorAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

async function upsertTaskEvent(taskId, task) {
  const linkRef = db.collection("googleCalendarTaskLinks").doc(taskId);
  const linkSnap = await linkRef.get();
  const link = linkSnap.exists ? linkSnap.data() : null;
  const assignedUid = safeString(task?.assignedToUid);
  const dueAt = timestampDate(task?.dueAt);
  const shouldExist =
    Boolean(task) &&
    Boolean(assignedUid) &&
    Boolean(dueAt) &&
    safeString(task.status || "open") !== "completed";

  if (link?.eventId && (!shouldExist || link.staffUid !== assignedUid)) {
    const oldConnection = await loadConnection(link.staffUid);
    if (oldConnection) {
      await deleteGoogleEvent(oldConnection, link.eventId).catch((error) =>
        logger.warn("Old task calendar event could not be removed.", {
          taskId,
          error: error?.message || String(error),
        }),
      );
    }
    await linkRef.delete();
  }

  if (!shouldExist) return;

  const connection = await loadConnection(assignedUid);
  if (!connection) {
    await linkRef.set(
      {
        taskId,
        staffUid: assignedUid,
        status: "not_connected",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  const resource = await taskGoogleEvent(taskId, task, connection);
  const nextFingerprint = fingerprint(resource);
  const currentLinkSnap = await linkRef.get();
  const currentLink = currentLinkSnap.exists ? currentLinkSnap.data() : null;
  if (
    currentLink?.eventId &&
    currentLink.staffUid === assignedUid &&
    currentLink.fingerprint === nextFingerprint
  ) {
    return;
  }

  try {
    let result = currentLink?.eventId && currentLink.staffUid === assignedUid
      ? await calendarApiRequest(
          connection,
          calendarPath(connection, currentLink.eventId),
          { method: "PATCH", body: resource, allowMissing: true },
        )
      : null;
    if (!result) {
      result = await calendarApiRequest(connection, calendarPath(connection), {
          method: "POST",
          body: resource,
        });
    }

    await linkRef.set(
      {
        taskId,
        staffUid: assignedUid,
        eventId: safeString(result?.id) || currentLink?.eventId || "",
        htmlLink: safeString(result?.htmlLink),
        fingerprint: nextFingerprint,
        status: "synced",
        lastSyncedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await db.collection("googleCalendarConnections").doc(assignedUid).set(
      {
        lastSyncAt: FieldValue.serverTimestamp(),
        lastError: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    await linkRef.set(
      {
        taskId,
        staffUid: assignedUid,
        status: "error",
        error: safeString(error?.message) || "Calendar sync failed.",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await markConnectionError(assignedUid, error);
    logger.error("Task Google Calendar sync failed.", {
      taskId,
      staffUid: assignedUid,
      error: error?.message || String(error),
    });
  }
}

function calendarLinkId(eventId, uid) {
  return `${eventId}_${uid}`;
}

async function removeCalendarEventLink(eventId, uid) {
  const linkRef = db
    .collection("googleCalendarEventLinks")
    .doc(calendarLinkId(eventId, uid));
  const linkSnap = await linkRef.get();
  if (!linkSnap.exists) return;
  const link = linkSnap.data();
  const connection = await loadConnection(uid);
  if (connection && link.eventId) {
    await deleteGoogleEvent(connection, link.eventId).catch((error) =>
      logger.warn("Calendar event could not be removed from Google.", {
        eventId,
        uid,
        error: error?.message || String(error),
      }),
    );
  }
  await linkRef.delete();
}

async function upsertCalendarEventForUser(eventId, event, uid) {
  const linkRef = db
    .collection("googleCalendarEventLinks")
    .doc(calendarLinkId(eventId, uid));
  const connection = await loadConnection(uid);
  if (!connection) {
    await linkRef.set(
      {
        calendarEventId: eventId,
        staffUid: uid,
        status: "not_connected",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  const resource = await calendarGoogleEvent(eventId, event, connection);
  if (!resource) return;
  const nextFingerprint = fingerprint(resource);
  const linkSnap = await linkRef.get();
  const link = linkSnap.exists ? linkSnap.data() : null;
  if (link?.eventId && link.fingerprint === nextFingerprint) return;

  try {
    let result = link?.eventId
      ? await calendarApiRequest(connection, calendarPath(connection, link.eventId), {
          method: "PATCH",
          body: resource,
          allowMissing: true,
        })
      : null;
    if (!result) {
      result = await calendarApiRequest(connection, calendarPath(connection), {
          method: "POST",
          body: resource,
        });
    }
    await linkRef.set(
      {
        calendarEventId: eventId,
        staffUid: uid,
        eventId: safeString(result?.id) || link?.eventId || "",
        htmlLink: safeString(result?.htmlLink),
        fingerprint: nextFingerprint,
        status: "synced",
        lastSyncedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    await linkRef.set(
      {
        calendarEventId: eventId,
        staffUid: uid,
        status: "error",
        error: safeString(error?.message) || "Calendar sync failed.",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await markConnectionError(uid, error);
    logger.error("CRM calendar event Google sync failed.", {
      eventId,
      staffUid: uid,
      error: error?.message || String(error),
    });
  }
}

async function syncCalendarEvent(eventId, before, after) {
  const beforeUids = new Set(Array.isArray(before?.assignedStaffUids) ? before.assignedStaffUids : []);
  const afterUids = new Set(Array.isArray(after?.assignedStaffUids) ? after.assignedStaffUids : []);
  const shouldExist =
    Boolean(after) &&
    !after.archivedAt &&
    safeString(after.status || "scheduled") !== "completed" &&
    Boolean(timestampDate(after.startAt || after.eventDate));

  await Promise.all(
    [...beforeUids]
      .filter((uid) => !shouldExist || !afterUids.has(uid))
      .map((uid) => removeCalendarEventLink(eventId, uid)),
  );
  if (!shouldExist) return;
  await Promise.all(
    [...afterUids].filter(Boolean).map((uid) =>
      upsertCalendarEventForUser(eventId, after, uid),
    ),
  );
}

async function syncExistingForUser(uid) {
  const [taskSnapshot, eventSnapshot] = await Promise.all([
    db.collection("tasks").where("assignedToUid", "==", uid).limit(200).get(),
    db
      .collection("calendarEvents")
      .where("assignedStaffUids", "array-contains", uid)
      .limit(200)
      .get(),
  ]);
  const tasks = taskSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((task) => task.status !== "completed" && timestampDate(task.dueAt));
  const events = eventSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter(
      (event) =>
        !event.archivedAt &&
        event.status !== "completed" &&
        timestampDate(event.startAt || event.eventDate),
    );
  for (const task of tasks) {
    await upsertTaskEvent(task.id, task);
  }
  for (const event of events) {
    await upsertCalendarEventForUser(event.id, event, uid);
  }
}

function staffRedirect(query = {}) {
  const url = new URL("https://golden-brick-construction.web.app/staff/");
  Object.entries(query).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

exports.googleCalendarConnection = onRequest(
  {
    region: REGION,
    invoker: "public",
    timeoutSeconds: 300,
    cors: true,
    secrets: [
      GOOGLE_CALENDAR_CLIENT_ID,
      GOOGLE_CALENDAR_CLIENT_SECRET,
      GOOGLE_CALENDAR_TOKEN_KEY,
    ],
  },
  async (request, response) => {
    applyCors(response);
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }
    if (request.method !== "POST") {
      response.status(405).send("Method not allowed.");
      return;
    }

    try {
      const staff = await verifyStaffRequest(request);
      const action = safeString(request.body?.action || "status");
      const connectionRef = db.collection("googleCalendarConnections").doc(staff.uid);
      const connectionSnap = await connectionRef.get();
      const connection = connectionSnap.exists ? connectionSnap.data() : null;

      if (action === "status") {
        respondJson(response, 200, {
          ok: true,
          connected: connection?.status === "connected",
          status: connection?.status || "not_connected",
          email: safeString(connection?.email || staff.email),
          timeZone: safeString(connection?.timeZone || DEFAULT_TIME_ZONE),
          lastSyncAt: timestampDate(connection?.lastSyncAt)?.toISOString() || null,
          lastError: safeString(connection?.lastError),
        });
        return;
      }

      if (action === "begin") {
        const stateId = crypto.randomBytes(32).toString("hex");
        await db.collection("googleCalendarOAuthStates").doc(stateId).set({
          uid: staff.uid,
          email: staff.email,
          expiresAt: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
          createdAt: FieldValue.serverTimestamp(),
        });
        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.search = new URLSearchParams({
          client_id: GOOGLE_CALENDAR_CLIENT_ID.value(),
          redirect_uri: GOOGLE_CALENDAR_REDIRECT_URI.value(),
          response_type: "code",
          scope: CALENDAR_SCOPE,
          access_type: "offline",
          include_granted_scopes: "true",
          prompt: "consent",
          state: stateId,
          login_hint: staff.email,
        }).toString();
        respondJson(response, 200, { ok: true, authUrl: authUrl.toString() });
        return;
      }

      if (action === "disconnect") {
        if (connection?.refreshToken) {
          const token = decryptToken(connection.refreshToken);
          await fetch(
            `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
            { method: "POST" },
          ).catch(() => null);
        }
        await connectionRef.delete();
        respondJson(response, 200, { ok: true, connected: false });
        return;
      }

      throw httpError("Unknown Google Calendar action.", 400);
    } catch (error) {
      logger.error("Google Calendar connection request failed.", error);
      respondJson(response, errorStatus(error), {
        ok: false,
        message: error?.message || "Google Calendar could not be updated.",
      });
    }
  },
);

exports.googleCalendarCallback = onRequest(
  {
    region: REGION,
    invoker: "public",
    timeoutSeconds: 300,
    secrets: [
      GOOGLE_CALENDAR_CLIENT_ID,
      GOOGLE_CALENDAR_CLIENT_SECRET,
      GOOGLE_CALENDAR_TOKEN_KEY,
    ],
  },
  async (request, response) => {
    const stateId = safeString(request.query?.state);
    const code = safeString(request.query?.code);
    const oauthError = safeString(request.query?.error);
    if (!stateId || !code || oauthError) {
      response.redirect(staffRedirect({ googleCalendar: "cancelled" }));
      return;
    }

    const stateRef = db.collection("googleCalendarOAuthStates").doc(stateId);
    try {
      const stateSnap = await stateRef.get();
      if (!stateSnap.exists) {
        throw httpError("This Calendar connection request has expired.", 400);
      }
      const stateData = stateSnap.data();
      const expiresAt = timestampDate(stateData.expiresAt);
      if (!expiresAt || expiresAt.getTime() < Date.now()) {
        throw httpError("This Calendar connection request has expired.", 400);
      }

      const tokenPayload = await exchangeAuthorizationCode(code);
      const connectionRef = db
        .collection("googleCalendarConnections")
        .doc(stateData.uid);
      const existingSnap = await connectionRef.get();
      const existing = existingSnap.exists ? existingSnap.data() : {};
      const refreshToken = tokenPayload.refresh_token
        ? encryptToken(tokenPayload.refresh_token)
        : existing.refreshToken;
      if (!refreshToken) {
        throw httpError("Google did not return long-term Calendar access.", 400);
      }

      await connectionRef.set(
        {
          uid: stateData.uid,
          email: safeString(stateData.email),
          calendarId: "primary",
          timeZone: DEFAULT_TIME_ZONE,
          status: "connected",
          refreshToken,
          scope: safeString(tokenPayload.scope) || CALENDAR_SCOPE,
          connectedAt: existing.connectedAt || FieldValue.serverTimestamp(),
          lastError: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      await stateRef.delete();
      await syncExistingForUser(stateData.uid);
      response.redirect(staffRedirect({ googleCalendar: "connected" }));
    } catch (error) {
      logger.error("Google Calendar OAuth callback failed.", error);
      await stateRef.delete().catch(() => null);
      response.redirect(staffRedirect({ googleCalendar: "error" }));
    }
  },
);

exports.syncTaskToGoogleCalendar = onDocumentWritten(
  {
    region: REGION,
    document: "tasks/{taskId}",
    secrets: [
      GOOGLE_CALENDAR_CLIENT_ID,
      GOOGLE_CALENDAR_CLIENT_SECRET,
      GOOGLE_CALENDAR_TOKEN_KEY,
    ],
  },
  async (event) => {
    const after = event.data.after.exists ? event.data.after.data() : null;
    await upsertTaskEvent(event.params.taskId, after);
  },
);

exports.syncCalendarEventToGoogleCalendar = onDocumentWritten(
  {
    region: REGION,
    document: "calendarEvents/{eventId}",
    secrets: [
      GOOGLE_CALENDAR_CLIENT_ID,
      GOOGLE_CALENDAR_CLIENT_SECRET,
      GOOGLE_CALENDAR_TOKEN_KEY,
    ],
  },
  async (event) => {
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after = event.data.after.exists ? event.data.after.data() : null;
    await syncCalendarEvent(event.params.eventId, before, after);
  },
);
