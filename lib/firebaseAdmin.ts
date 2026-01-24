import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

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

export function getAdminMessaging() {
  const serviceAccount = loadServiceAccount();

  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert(serviceAccount),
        });

  return getMessaging(app);
}
