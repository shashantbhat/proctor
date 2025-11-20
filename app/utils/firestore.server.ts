import type { App } from "firebase-admin/app";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

declare global {
  // allow attaching firebase admin app to global to avoid re-initialization in dev/hot-reload
  // eslint-disable-next-line no-var
  var __FIREBASE_ADMIN__: App | undefined;
}

let app: App;
if (!global.__FIREBASE_ADMIN__) {
  app = initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY!)),
  });
  global.__FIREBASE_ADMIN__ = app;
} else {
  app = global.__FIREBASE_ADMIN__!;
}

export const firestore = getFirestore(app);