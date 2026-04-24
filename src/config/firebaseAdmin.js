const admin = require("firebase-admin");

const buildConfigError = (message) => {
  return new Error(`FIREBASE_CONFIG_ERROR: ${message}`);
};

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

const getServiceAccountFromEnv = () => {
  const projectId = sanitizeEnvValue(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = sanitizeEnvValue(process.env.FIREBASE_CLIENT_EMAIL);
  const rawPrivateKey = sanitizeEnvValue(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw buildConfigError(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in backend/.env.",
    );
  }

  if (rawPrivateKey.includes("YOUR_KEY_HERE")) {
    throw buildConfigError(
      "FIREBASE_PRIVATE_KEY still contains placeholder text. Paste the real private_key from your Firebase service account JSON.",
    );
  }

  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

  if (
    !privateKey.includes("BEGIN PRIVATE KEY") ||
    !privateKey.includes("END PRIVATE KEY")
  ) {
    throw buildConfigError(
      "FIREBASE_PRIVATE_KEY is not valid PEM content. It must include BEGIN PRIVATE KEY and END PRIVATE KEY lines.",
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
};

const getFirebaseAdmin = () => {
  if (admin.apps.length) {
    return admin;
  }

  const serviceAccount = getServiceAccountFromEnv();

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin;
};

module.exports = { getFirebaseAdmin };
