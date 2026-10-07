"use strict";

const crypto = require("node:crypto");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const {
  defineJsonSecret,
  defineString,
} = require("firebase-functions/params");

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

const GOOGLE_BUSINESS_OAUTH = defineJsonSecret("GOOGLE_BUSINESS_OAUTH");
const GOOGLE_BUSINESS_ACCOUNT_ID = defineString(
  "GOOGLE_BUSINESS_ACCOUNT_ID",
  { default: "" },
);
const GOOGLE_BUSINESS_LOCATION_ID = defineString(
  "GOOGLE_BUSINESS_LOCATION_ID",
  { default: "" },
);
const GOOGLE_BUSINESS_PROFILE_URL = defineString(
  "GOOGLE_BUSINESS_PROFILE_URL",
  { default: "" },
);

const REGION = "us-central1";
const TIME_ZONE = "America/New_York";
const CACHE_DOCUMENT = db
  .collection("publicIntegrations")
  .doc("googleBusinessReviews");
const SNAPSHOT_COLLECTION = db.collection("googleReviewSnapshots");
const REVIEW_PAGE_SIZE = 50;
const MAX_REVIEW_PAGES = 100;
const CACHE_LIFETIME_MS = 28 * 24 * 60 * 60 * 1000;
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const REFRESH_LEASE_MS = 5 * 60 * 1000;
const TOKEN_TIMEOUT_MS = 12_000;
const API_TIMEOUT_MS = 18_000;
const PUBLIC_MAX_PAGE_SIZE = 24;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const rateLimitBuckets = new Map();

function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function exactString(value) {
  return typeof value === "string" ? value : "";
}

function safeHttpsUrl(value) {
  const raw = safeString(value);
  if (!raw) return "";

  try {
    const url = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
    return url.protocol === "https:" ? url.toString() : "";
  } catch (_error) {
    return "";
  }
}

function timestampDate(value) {
  if (!value) return null;
  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parameterValue(parameter) {
  try {
    return safeString(parameter.value());
  } catch (_error) {
    return "";
  }
}

function cleanResourceId(value, prefix) {
  return safeString(value)
    .replace(new RegExp(`^${prefix}/`, "i"), "")
    .replaceAll("/", "");
}

function integrationConfig() {
  const accountId = cleanResourceId(
    GOOGLE_BUSINESS_ACCOUNT_ID.value(),
    "accounts",
  );
  const locationId = cleanResourceId(
    GOOGLE_BUSINESS_LOCATION_ID.value(),
    "locations",
  );
  const profileUrl = safeHttpsUrl(GOOGLE_BUSINESS_PROFILE_URL.value());

  if (!accountId || !locationId || !profileUrl) {
    const error = new Error(
      "Google Business Profile account, location, and profile URL configuration is incomplete.",
    );
    error.code = "google_business_config_missing";
    throw error;
  }

  return {
    accountId,
    locationId,
    parent: `accounts/${accountId}/locations/${locationId}`,
    profileUrl,
  };
}

function oauthConfig() {
  let config = {};
  try {
    config = GOOGLE_BUSINESS_OAUTH.value() || {};
  } catch (_error) {
    config = {};
  }

  const clientId = safeString(config.clientId);
  const clientSecret = safeString(config.clientSecret);
  const refreshToken = safeString(config.refreshToken);

  if (!clientId || !clientSecret || !refreshToken) {
    const error = new Error(
      "Google Business Profile OAuth credentials are incomplete.",
    );
    error.code = "google_business_oauth_missing";
    throw error;
  }

  return { clientId, clientSecret, refreshToken };
}

function externalError(code, status) {
  const error = new Error("Google Business Profile request failed.");
  error.code = code;
  error.status = status;
  return error;
}

async function fetchJson(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = {};

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (_error) {
        throw externalError("google_business_invalid_json", response.status);
      }
    }

    if (!response.ok) {
      throw externalError(
        `google_business_http_${response.status}`,
        response.status,
      );
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw externalError("google_business_timeout", 504);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function accessToken() {
  const oauth = oauthConfig();
  const body = new URLSearchParams({
    client_id: oauth.clientId,
    client_secret: oauth.clientSecret,
    refresh_token: oauth.refreshToken,
    grant_type: "refresh_token",
  });
  const payload = await fetchJson(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
    TOKEN_TIMEOUT_MS,
  );
  const token = safeString(payload.access_token);

  if (!token) {
    throw externalError("google_business_token_missing", 502);
  }

  return token;
}

function starRatingNumber(value) {
  const ratings = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 5) {
    return numeric;
  }
  return ratings[safeString(value).toUpperCase()] || 0;
}

function reviewDocumentId(review, rank) {
  const sourceId =
    safeString(review?.reviewId) ||
    safeString(review?.name).split("/").pop() ||
    `${rank}-${exactString(review?.createTime)}`;
  return crypto.createHash("sha256").update(sourceId).digest("hex");
}

function publicReview(review, rank, expiresAt) {
  const rating = starRatingNumber(review?.starRating);
  const reviewer = review?.reviewer || {};

  if (!rating) {
    return null;
  }

  return {
    id: reviewDocumentId(review, rank),
    rank,
    rating,
    text: exactString(review?.comment),
    reviewerDisplayName: exactString(reviewer.displayName),
    reviewerProfilePhotoUrl: safeHttpsUrl(reviewer.profilePhotoUrl),
    createTime: exactString(review?.createTime),
    updateTime: exactString(review?.updateTime),
    expiresAt,
  };
}

async function listGoogleReviews() {
  const config = integrationConfig();
  const token = await accessToken();
  const reviews = [];
  let averageRating = null;
  let totalReviewCount = null;
  let nextPageToken = "";
  let pageCount = 0;

  do {
    const url = new URL(
      `https://mybusiness.googleapis.com/v4/${config.parent}/reviews`,
    );
    url.searchParams.set("pageSize", String(REVIEW_PAGE_SIZE));
    url.searchParams.set("orderBy", "updateTime desc");
    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken);
    }

    const payload = await fetchJson(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "X-GOOG-API-FORMAT-VERSION": "2",
      },
    });

    if (averageRating === null && Number.isFinite(Number(payload.averageRating))) {
      averageRating = Number(payload.averageRating);
    }
    if (
      totalReviewCount === null &&
      Number.isInteger(Number(payload.totalReviewCount))
    ) {
      totalReviewCount = Number(payload.totalReviewCount);
    }

    if (Array.isArray(payload.reviews)) {
      reviews.push(...payload.reviews);
    }

    nextPageToken = safeString(payload.nextPageToken);
    pageCount += 1;
    if (pageCount >= MAX_REVIEW_PAGES && nextPageToken) {
      throw externalError("google_business_pagination_limit", 502);
    }
  } while (nextPageToken);

  return {
    source: "google_business_profile",
    profileUrl: config.profileUrl,
    averageRating:
      averageRating === null ? 0 : Number(averageRating.toFixed(1)),
    totalReviewCount:
      totalReviewCount === null ? reviews.length : totalReviewCount,
    reviews,
  };
}

async function commitOperations(operations) {
  for (let index = 0; index < operations.length; index += 400) {
    const batch = db.batch();
    operations.slice(index, index + 400).forEach((operation) => {
      if (operation.type === "set") {
        batch.set(operation.ref, operation.data);
      } else {
        batch.delete(operation.ref);
      }
    });
    await batch.commit();
  }
}

async function deleteSnapshot(snapshotId) {
  const cleanSnapshotId = safeString(snapshotId);
  if (!cleanSnapshotId) return;

  const snapshotRef = SNAPSHOT_COLLECTION.doc(cleanSnapshotId);
  const items = await snapshotRef.collection("items").get();
  const operations = items.docs.map((documentSnapshot) => ({
    type: "delete",
    ref: documentSnapshot.ref,
  }));
  operations.push({ type: "delete", ref: snapshotRef });
  await commitOperations(operations);
}

async function cleanupInactiveSnapshots(activeSnapshotId) {
  const snapshots = await SNAPSHOT_COLLECTION.get();
  const inactiveSnapshotIds = snapshots.docs
    .map((documentSnapshot) => documentSnapshot.id)
    .filter((snapshotId) => snapshotId !== safeString(activeSnapshotId));

  for (const snapshotId of inactiveSnapshotIds) {
    await deleteSnapshot(snapshotId);
  }
}

async function acquireRefreshLease() {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + REFRESH_LEASE_MS);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(CACHE_DOCUMENT);
    const currentLease = timestampDate(snapshot.data()?.refreshLeaseUntil);
    if (currentLease && currentLease.getTime() > now.getTime()) {
      return false;
    }

    transaction.set(
      CACHE_DOCUMENT,
      {
        status: "refreshing",
        refreshLeaseUntil: Timestamp.fromDate(leaseUntil),
        refreshStartedAt: Timestamp.fromDate(now),
      },
      { merge: true },
    );
    return true;
  });
}

async function releaseFailedLease(error) {
  await CACHE_DOCUMENT.set(
    {
      status: "error",
      lastErrorAt: FieldValue.serverTimestamp(),
      lastErrorCode: safeString(error?.code) || "google_business_refresh_failed",
      refreshLeaseUntil: FieldValue.delete(),
    },
    { merge: true },
  );
}

async function purgeExpiredCache() {
  const metadataSnapshot = await CACHE_DOCUMENT.get();
  if (!metadataSnapshot.exists) return false;

  const metadata = metadataSnapshot.data() || {};
  const expiresAt = timestampDate(metadata.expiresAt);
  if (!expiresAt || expiresAt.getTime() > Date.now()) {
    return false;
  }

  await deleteSnapshot(metadata.activeSnapshotId);
  await CACHE_DOCUMENT.set(
    {
      status: "unavailable",
      activeSnapshotId: FieldValue.delete(),
      averageRating: FieldValue.delete(),
      totalReviewCount: FieldValue.delete(),
      cachedReviewCount: FieldValue.delete(),
      fetchedAt: FieldValue.delete(),
      expiresAt: FieldValue.delete(),
      nextRefreshAt: FieldValue.delete(),
      refreshLeaseUntil: FieldValue.delete(),
      expiredContentPurgedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return true;
}

async function refreshReviewCache() {
  const leaseAcquired = await acquireRefreshLease();
  if (!leaseAcquired) {
    logger.info("Google Business Profile review refresh already in progress.");
    return { refreshed: false, reason: "lease_active" };
  }

  const now = new Date();
  const fetchedAt = Timestamp.fromDate(now);
  const expiresAt = Timestamp.fromDate(
    new Date(now.getTime() + CACHE_LIFETIME_MS),
  );
  const nextRefreshAt = Timestamp.fromDate(
    new Date(now.getTime() + REFRESH_INTERVAL_MS),
  );
  const snapshotId = `${now.getTime()}-${crypto.randomBytes(5).toString("hex")}`;
  const snapshotRef = SNAPSHOT_COLLECTION.doc(snapshotId);

  try {
    const payload = await listGoogleReviews();
    const reviews = payload.reviews
      .map((review, rank) => publicReview(review, rank, expiresAt))
      .filter(Boolean);

    await snapshotRef.set({
      status: "building",
      source: payload.source,
      fetchedAt,
      expiresAt,
      reviewCount: reviews.length,
    });

    await commitOperations(
      reviews.map((review) => ({
        type: "set",
        ref: snapshotRef.collection("items").doc(review.id),
        data: review,
      })),
    );

    await db.runTransaction(async (transaction) => {
      transaction.set(
        snapshotRef,
        {
          status: "ready",
          publishedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      transaction.set(
        CACHE_DOCUMENT,
        {
          status: "ready",
          source: payload.source,
          profileUrl: payload.profileUrl,
          averageRating: payload.averageRating,
          totalReviewCount: payload.totalReviewCount,
          cachedReviewCount: reviews.length,
          activeSnapshotId: snapshotId,
          fetchedAt,
          expiresAt,
          nextRefreshAt,
          refreshLeaseUntil: FieldValue.delete(),
          lastErrorAt: FieldValue.delete(),
          lastErrorCode: FieldValue.delete(),
        },
        { merge: true },
      );
    });

    await cleanupInactiveSnapshots(snapshotId).catch((error) => {
      logger.warn("Inactive Google review snapshot cleanup failed.", {
        code: safeString(error?.code) || "snapshot_cleanup_failed",
      });
    });

    logger.info("Google Business Profile reviews refreshed.", {
      cachedReviewCount: reviews.length,
      totalReviewCount: payload.totalReviewCount,
    });
    return { refreshed: true, cachedReviewCount: reviews.length };
  } catch (error) {
    await deleteSnapshot(snapshotId).catch(() => {});
    await releaseFailedLease(error);
    await purgeExpiredCache().catch(() => {});
    logger.error("Google Business Profile review refresh failed.", {
      code: safeString(error?.code) || "google_business_refresh_failed",
      status: Number(error?.status) || 500,
    });
    throw error;
  }
}

function publicProfileUrl(metadata = {}) {
  return (
    safeHttpsUrl(metadata.profileUrl) ||
    safeHttpsUrl(parameterValue(GOOGLE_BUSINESS_PROFILE_URL))
  );
}

function requestRateLimitKey(request) {
  const forwarded = safeString(request.get("x-forwarded-for"))
    .split(",")[0]
    .trim();
  const source = forwarded || safeString(request.ip) || "unknown";
  return crypto.createHash("sha256").update(source).digest("hex").slice(0, 24);
}

function requestAllowed(request) {
  const now = Date.now();
  const key = requestRateLimitKey(request);
  const existing = rateLimitBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  existing.count += 1;
  if (rateLimitBuckets.size > 2_000) {
    for (const [bucketKey, bucket] of rateLimitBuckets.entries()) {
      if (bucket.resetAt <= now) {
        rateLimitBuckets.delete(bucketKey);
      }
    }
  }
  return existing.count <= RATE_LIMIT_MAX_REQUESTS;
}

function publicPageSize(request) {
  const requested = Number.parseInt(request.query.limit, 10);
  if (!Number.isFinite(requested)) return 6;
  return Math.max(1, Math.min(PUBLIC_MAX_PAGE_SIZE, requested));
}

function publicCursor(request) {
  const requested = Number.parseInt(request.query.cursor, 10);
  return Number.isInteger(requested) && requested >= 0 ? requested : null;
}

function serializeTimestamp(value) {
  return timestampDate(value)?.toISOString() || null;
}

function serializeReview(documentSnapshot) {
  const review = documentSnapshot.data() || {};
  return {
    id: safeString(documentSnapshot.id),
    rating: Number(review.rating) || 0,
    text: exactString(review.text),
    reviewerDisplayName: exactString(review.reviewerDisplayName),
    reviewerProfilePhotoUrl: safeHttpsUrl(review.reviewerProfilePhotoUrl),
    createTime: exactString(review.createTime),
    updateTime: exactString(review.updateTime),
  };
}

function applyPublicHeaders(response, cacheable = false) {
  response.set("Content-Type", "application/json; charset=utf-8");
  response.set("X-Content-Type-Options", "nosniff");
  response.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.set(
    "Cache-Control",
    cacheable
      ? "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
      : "no-store, max-age=0",
  );
}

function unavailablePayload(metadata = {}) {
  return {
    ok: false,
    available: false,
    source: "google_business_profile",
    profileUrl: publicProfileUrl(metadata),
    message:
      "Recent Google reviews are temporarily unavailable. Reviews can still be read directly on Google.",
    reviews: [],
    nextCursor: null,
  };
}

exports.refreshGoogleReviews = onSchedule(
  {
    schedule: "17 4 * * *",
    timeZone: TIME_ZONE,
    region: REGION,
    timeoutSeconds: 180,
    memory: "256MiB",
    retryCount: 2,
    maxRetrySeconds: 3_600,
    secrets: [GOOGLE_BUSINESS_OAUTH],
  },
  async () => {
    await refreshReviewCache();
  },
);

exports.publicGoogleReviews = onRequest(
  {
    region: REGION,
    timeoutSeconds: 20,
    memory: "256MiB",
    maxInstances: 5,
  },
  async (request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) {
      applyPublicHeaders(response);
      response.set("Allow", "GET, HEAD");
      response.status(405).json({ ok: false, message: "Method not allowed." });
      return;
    }

    if (!requestAllowed(request)) {
      applyPublicHeaders(response);
      response.set("Retry-After", "60");
      response.status(429).json({
        ok: false,
        message: "Too many review requests. Please try again shortly.",
      });
      return;
    }

    try {
      const metadataSnapshot = await CACHE_DOCUMENT.get();
      const metadata = metadataSnapshot.exists
        ? metadataSnapshot.data() || {}
        : {};
      const expiresAt = timestampDate(metadata.expiresAt);
      const hasValidCache = Boolean(
        metadata.status !== "unavailable" &&
          metadata.activeSnapshotId &&
          expiresAt &&
          expiresAt.getTime() > Date.now(),
      );

      if (!hasValidCache) {
        if (expiresAt && expiresAt.getTime() <= Date.now()) {
          await purgeExpiredCache();
        }
        applyPublicHeaders(response);
        response.status(503).json(unavailablePayload(metadata));
        return;
      }

      const limit = publicPageSize(request);
      const cursor = publicCursor(request);
      let query = SNAPSHOT_COLLECTION.doc(metadata.activeSnapshotId)
        .collection("items")
        .orderBy("rank", "asc");
      if (cursor !== null) {
        query = query.startAfter(cursor);
      }

      const itemSnapshot = await query.limit(limit + 1).get();
      const documents = itemSnapshot.docs.slice(0, limit);
      const hasMore = itemSnapshot.docs.length > limit;
      const lastRank = documents.length
        ? Number(documents[documents.length - 1].data()?.rank)
        : null;
      const payload = {
        ok: true,
        available: true,
        source: "google_business_profile",
        profileUrl: publicProfileUrl(metadata),
        averageRating: Number(metadata.averageRating) || 0,
        totalReviewCount: Number(metadata.totalReviewCount) || 0,
        fetchedAt: serializeTimestamp(metadata.fetchedAt),
        expiresAt: serializeTimestamp(metadata.expiresAt),
        reviews: documents.map(serializeReview),
        nextCursor: hasMore && Number.isInteger(lastRank) ? lastRank : null,
      };

      applyPublicHeaders(response, true);
      if (request.method === "HEAD") {
        response.status(200).end();
        return;
      }
      response.status(200).json(payload);
    } catch (error) {
      logger.error("Public Google review endpoint failed.", {
        code: safeString(error?.code) || "public_google_reviews_failed",
      });
      applyPublicHeaders(response);
      response.status(503).json(unavailablePayload());
    }
  },
);
