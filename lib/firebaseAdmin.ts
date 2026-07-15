import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";

type ServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function normalizePrivateKey(key: string) {
  const trimmed = key.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
  return trimmed.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}

function loadServiceAccount(): ServiceAccount {
  const jsonValue = process.env.FIREBASE_SERVICE_ACCOUNT;
  const base64Value = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (jsonValue) {
    const parsed = JSON.parse(jsonValue);
    return {
      projectId: parsed.project_id || parsed.projectId,
      clientEmail: parsed.client_email || parsed.clientEmail,
      privateKey: normalizePrivateKey(
        parsed.private_key || parsed.privateKey || ""
      ),
    };
  }

  if (base64Value) {
    const parsed = JSON.parse(
      Buffer.from(base64Value, "base64").toString("utf-8")
    );
    return {
      projectId: parsed.project_id || parsed.projectId,
      clientEmail: parsed.client_email || parsed.clientEmail,
      privateKey: normalizePrivateKey(
        parsed.private_key || parsed.privateKey || ""
      ),
    };
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    };
  }

  throw new Error("Missing Firebase service account credentials.");
}

const DEFAULT_STORAGE_BUCKET = "taskmanager-4b024.firebasestorage.app";

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const serviceAccount = loadServiceAccount();

  return initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET,
  });
}

export function getAdminMessaging() {
  const app = getAdminApp();

  return getMessaging(app);
}

export function getAdminStorageBucket() {
  const app = getAdminApp();
  return getStorage(app).bucket(process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET);
}
