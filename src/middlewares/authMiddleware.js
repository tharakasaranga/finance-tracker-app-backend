const https = require("https");
const crypto = require("crypto");
const User = require("../models/User");
const { getFirebaseAdmin } = require("../config/firebaseAdmin");

const FIREBASE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const FIREBASE_CERT_CACHE_TTL_MS = 60 * 60 * 1000;

let cachedFirebaseCerts = null;
let cachedFirebaseCertsExpiresAt = 0;

const sanitizeEnvValue = (value) => {
  if (!value || typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

const getFirebaseProjectId = () => {
  const projectId = sanitizeEnvValue(process.env.FIREBASE_PROJECT_ID);

  if (!projectId) {
    throw new Error(
      "FIREBASE_CONFIG_ERROR: Set FIREBASE_PROJECT_ID in backend/.env.",
    );
  }

  return projectId;
};

const base64UrlDecode = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  return Buffer.from(padded, "base64");
};

const fetchFirebaseCerts = () => {
  return new Promise((resolve, reject) => {
    https
      .get(FIREBASE_CERTS_URL, (res) => {
        if (res.statusCode !== 200) {
          reject(
            new Error(
              `FIREBASE_TOKEN_ERROR: Failed to fetch Firebase public certificates (${res.statusCode}).`,
            ),
          );
          return;
        }

        let responseBody = "";

        res.on("data", (chunk) => {
          responseBody += chunk;
        });

        res.on("end", () => {
          try {
            resolve(JSON.parse(responseBody));
          } catch (error) {
            reject(
              new Error(
                "FIREBASE_TOKEN_ERROR: Failed to parse Firebase public certificates.",
              ),
            );
          }
        });
      })
      .on("error", () => {
        reject(
          new Error(
            "FIREBASE_TOKEN_ERROR: Unable to reach Firebase public certificates.",
          ),
        );
      });
  });
};

const getFirebaseCerts = async () => {
  if (cachedFirebaseCerts && Date.now() < cachedFirebaseCertsExpiresAt) {
    return cachedFirebaseCerts;
  }

  const certs = await fetchFirebaseCerts();

  cachedFirebaseCerts = certs;
  cachedFirebaseCertsExpiresAt = Date.now() + FIREBASE_CERT_CACHE_TTL_MS;

  return certs;
};

const verifyFirebaseToken = async (token) => {
  try {
    const admin = getFirebaseAdmin();
    return await admin.auth().verifyIdToken(token, true);
  } catch (_adminError) {}

  const tokenParts = token.split(".");

  if (tokenParts.length !== 3) {
    throw new Error("FIREBASE_TOKEN_ERROR: Token format is invalid.");
  }

  const [headerPart, payloadPart, signaturePart] = tokenParts;
  const header = JSON.parse(base64UrlDecode(headerPart).toString("utf8"));
  const payload = JSON.parse(base64UrlDecode(payloadPart).toString("utf8"));

  const projectId = getFirebaseProjectId();

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("FIREBASE_TOKEN_ERROR: Token headers are invalid.");
  }

  if (
    payload.aud !== projectId ||
    payload.iss !== `https://securetoken.google.com/${projectId}`
  ) {
    throw new Error("FIREBASE_TOKEN_ERROR: Token audience is invalid.");
  }

  if (payload.exp && payload.exp * 1000 <= Date.now()) {
    throw new Error("FIREBASE_TOKEN_ERROR: Token has expired.");
  }

  const certs = await getFirebaseCerts();
  const certificate = certs[header.kid];

  if (!certificate) {
    throw new Error("FIREBASE_TOKEN_ERROR: Token certificate not found.");
  }

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${headerPart}.${payloadPart}`);
  verifier.end();

  const signature = base64UrlDecode(signaturePart);

  if (!verifier.verify(certificate, signature)) {
    throw new Error("FIREBASE_TOKEN_ERROR: Token signature is invalid.");
  }

  return payload;
};

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const decodedToken = await verifyFirebaseToken(token);
    const firebaseUid =
      decodedToken.uid || decodedToken.user_id || decodedToken.sub;

    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    let user = await User.findOne({ firebaseUid });

    if (!user) {
      user = await User.create({
        firebaseUid,
        name: decodedToken.name || "User",
        email: decodedToken.email || `${firebaseUid}@firebase.local`,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.message && error.message.startsWith("FIREBASE_CONFIG_ERROR:")) {
      return res.status(500).json({
        success: false,
        message: error.message.replace("FIREBASE_CONFIG_ERROR: ", ""),
      });
    }

    if (error.message && error.message.startsWith("FIREBASE_TOKEN_ERROR:")) {
      return res.status(401).json({
        success: false,
        message: error.message.replace("FIREBASE_TOKEN_ERROR: ", ""),
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = { protect };
