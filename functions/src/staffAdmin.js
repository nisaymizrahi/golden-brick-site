"use strict";

const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const { onRequest } = require("firebase-functions/v2/https");

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function applyCors(response) {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
}

function httpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function sanitiseStaffKey(value) {
  return safeString(value).toLowerCase().replaceAll("/", "_");
}

async function verifyAdminRequest(request) {
  const authorization = safeString(request.get("Authorization"));
  if (!authorization.startsWith("Bearer ")) {
    throw httpError("Sign in as an administrator.", 401);
  }
  const decoded = await admin
    .auth()
    .verifyIdToken(authorization.slice("Bearer ".length).trim());
  const userSnap = await db.collection("users").doc(decoded.uid).get();
  if (
    !userSnap.exists ||
    userSnap.data().active !== true ||
    userSnap.data().role !== "admin"
  ) {
    throw httpError("Only active administrators can delete staff access.", 403);
  }
  return decoded;
}

exports.deleteStaffAccess = onRequest(
  { region: "us-central1", invoker: "public", cors: true },
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
      const adminUser = await verifyAdminRequest(request);
      const staffKey = sanitiseStaffKey(request.body?.staffKey);
      if (!staffKey) {
        throw httpError("Select an employee to delete.", 400);
      }

      const staffRef = db.collection("allowedStaff").doc(staffKey);
      const staffSnap = await staffRef.get();
      if (!staffSnap.exists) {
        throw httpError("This employee access record no longer exists.", 404);
      }
      const staff = staffSnap.data();
      const targetUid = safeString(staff.uid);
      if (targetUid && targetUid === adminUser.uid) {
        throw httpError("You cannot delete your own administrator access.", 400);
      }

      if (staff.role === "admin" && staff.active === true) {
        const adminSnapshot = await db
          .collection("allowedStaff")
          .where("role", "==", "admin")
          .get();
        const activeAdminCount = adminSnapshot.docs.filter(
          (document) => document.data().active === true
        ).length;
        if (activeAdminCount <= 1) {
          throw httpError("Keep at least one active administrator.", 400);
        }
      }

      const batch = db.batch();
      batch.delete(staffRef);
      if (targetUid) {
        batch.delete(db.collection("googleCalendarConnections").doc(targetUid));
        batch.set(
          db.collection("users").doc(targetUid),
          {
            active: false,
            staffAccessDeleted: true,
            staffAccessDeletedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
      await batch.commit();

      if (targetUid) {
        try {
          await admin.auth().setCustomUserClaims(targetUid, {
            role: staff.role === "admin" ? "admin" : "employee",
            staff: false,
          });
          await admin.auth().revokeRefreshTokens(targetUid);
        } catch (error) {
          if (error?.code !== "auth/user-not-found") {
            throw error;
          }
        }
      }

      response.status(200).json({
        ok: true,
        deletedStaffKey: staffKey,
        deletedUid: targetUid || null,
      });
    } catch (error) {
      logger.error("Staff access deletion failed.", error);
      response.status(Number(error?.status) || 500).json({
        ok: false,
        message: error?.message || "Staff access could not be deleted.",
      });
    }
  },
);
